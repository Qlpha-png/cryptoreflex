/**
 * Lot Z2 (08/10/2026) — écrivain unique du marché.
 *  1. R1 : CoinMarketCap top 100 en USD, CoinGecko SEULEMENT si CMC échoue, euro au taux de lib/fx.ts, bandeau +
 *     instantané + global en UNE commande MSET ; update-static-prices supprimé (doublon D9).
 *  2. Pages : aucun appel CoinMarketCap (lecture du KV de R1), une seule capitalisation globale et dominance.
 *  3. Chaîne des cours affichés : CMC/KV en tête, Binance gardé (flux du navigateur intact), Coinbase et KuCoin retirés.
 *  4. Budget : plan des robots ≤ 250 crédits/jour.
 */
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import cmcMapJson from "@/data/cmc-id-map.json";
import { activerKvTest, desactiverKvTest, kvR1Simule, KV_TEST_URL } from "../helpers/r1-simule";

vi.mock("next/cache", () => ({
  unstable_cache: <T extends (...args: unknown[]) => unknown>(fn: T): T => fn,
  revalidateTag: vi.fn(),
}));

const RACINE = path.resolve(__dirname, "../..");
const lire = (p: string) => readFileSync(path.join(RACINE, p), "utf8");
const MAP = (cmcMapJson as { map: Record<string, { id: number; symbol: string }> }).map;
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

function fichiers(dir: string, out: string[] = []): string[] {
  for (const f of readdirSync(dir)) {
    const p = path.join(dir, f);
    if (statSync(p).isDirectory()) {
      if (f !== "node_modules" && f !== ".next") fichiers(p, out);
    } else if (/\.(ts|tsx|mjs|js)$/.test(f)) out.push(p);
  }
  return out;
}
const rel = (f: string) => path.relative(RACINE, f).replace(/\\/g, "/");

/** 100 lignes CMC valides : BTC (1) et ETH (1027) en tête avec leur dominance, puis des fiches de la table. */
function cmcTop100() {
  const autres = Object.entries(MAP).filter(([site]) => site !== "bitcoin" && site !== "ethereum").slice(0, 98);
  const lignes = [
    { id: 1, symbol: "BTC", price: 60_000, supply: 19.9e6, dom: 58.1 },
    { id: 1027, symbol: "ETH", price: 2_500, supply: 120e6, dom: 12.2 },
    ...autres.map(([, e], i) => ({ id: e.id, symbol: e.symbol, price: 10 + i, supply: 1e6, dom: 0.01 })),
  ];
  return lignes.map((l, i) => ({
    id: l.id,
    name: l.symbol,
    symbol: l.symbol,
    slug: `slug-${l.id}`,
    cmc_rank: i + 1,
    circulating_supply: l.supply,
    last_updated: new Date().toISOString(),
    quote: { USD: { price: l.price, volume_24h: 1e6, percent_change_1h: 0.1, percent_change_24h: 1, percent_change_7d: 2, market_cap: l.price * l.supply, market_cap_dominance: l.dom } },
  }));
}
const cmcGlobal = () => ({
  status: { error_code: 0, credit_count: 1 },
  data: {
    btc_dominance: 58.1,
    eth_dominance: 12.2,
    active_cryptocurrencies: 9000,
    last_updated: new Date().toISOString(),
    quote: { USD: { total_market_cap: 2.06e12, total_volume_24h: 1.1e11, total_market_cap_yesterday_percentage_change: 0.7 } },
  },
});
const cgTop = () =>
  Array.from({ length: 60 }, (_, i) => ({ id: `cg-${i}`, symbol: `c${i}`, name: `Coin ${i}`, image: "", current_price: 5 + i, market_cap: (5 + i) * 1e6, market_cap_rank: i + 1, total_volume: 1, price_change_percentage_24h: 1 }));

const realFetch = globalThis.fetch;
beforeEach(() => {
  vi.resetModules();
  vi.spyOn(console, "warn").mockImplementation(() => undefined);
});
afterEach(() => {
  globalThis.fetch = realFetch;
  desactiverKvTest();
  delete process.env.CMC_API_KEY;
  vi.restoreAllMocks();
});

describe("1. robot R1 : écrivain unique", () => {
  type Appel = { url: string; init?: RequestInit };
  function simuler(handler: (u: string) => Response): Appel[] {
    const appels: Appel[] = [];
    globalThis.fetch = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
      const url = String(input);
      appels.push({ url, init });
      if (url.startsWith(KV_TEST_URL)) return json({ result: "OK" });
      if (url.includes("/v1/key/info")) return json({}, 404);
      if (url.includes("frankfurter")) return json({ date: "2026-10-08", rates: { EUR: 0.86, GBP: 0.75, CHF: 0.8 } });
      return handler(url);
    }) as unknown as typeof fetch;
    return appels;
  }
  const msets = (appels: Appel[]) =>
    appels.filter((a) => a.url.startsWith(KV_TEST_URL) && a.init?.method === "POST").map((a) => JSON.parse(String(a.init?.body)) as string[]);

  it("CMC sain : top 100 en USD (1 appel, une seule devise), AUCUN appel CoinGecko, UNE commande MSET bandeau + instantané + global", async () => {
    activerKvTest();
    process.env.CMC_API_KEY = "cle-factice-de-test";
    const appels = simuler((u) =>
      u.includes("/listings/latest") ? json({ status: { error_code: 0, credit_count: 1 }, data: cmcTop100() }) : u.includes("/global-metrics/") ? json(cmcGlobal()) : json({}, 404),
    );
    const { releverMarche } = await import("@/lib/marche-robot");
    const r = await releverMarche({ now: () => new Date("2026-10-08T12:00:30Z") });
    expect(r).toMatchObject({ ok: true, source: "coinmarketcap", count: 100, global: true });
    expect(r.fx).toEqual({ eurPerUsd: 0.86, date: "2026-10-08", source: "bce" });
    // le compteur /v1/key/info (0 crédit, garde-fou) n'est pas un appel facturé
    const cmc = appels.filter((a) => a.url.includes("pro-api.coinmarketcap.com") && !a.url.includes("/v1/key/info"));
    expect(cmc.map((a) => a.url.replace(/\?.*/, ""))).toEqual([
      "https://pro-api.coinmarketcap.com/v1/cryptocurrency/listings/latest",
      "https://pro-api.coinmarketcap.com/v1/global-metrics/quotes/latest",
    ]);
    expect(cmc[0].url).toContain("limit=100&convert=USD");
    expect(cmc.every((a) => !/convert=[^&]*,/.test(a.url))).toBe(true);
    expect(appels.some((a) => a.url.includes("api.coingecko.com"))).toBe(false);
    const m = msets(appels);
    expect(m).toHaveLength(1);
    expect(m[0][0]).toBe("MSET");
    expect(m[0].filter((_, i) => i % 2 === 1)).toEqual(["cg-ticker-prices:v1", "price-source:top-snapshot", "marche:global:v1"]);
    const ticker = JSON.parse(m[0][2]);
    expect(ticker).toMatchObject({ source: "coinmarketcap", fetchedAt: "2026-10-08T12:00:30.000Z", fx: { eurPerUsd: 0.86 } });
    expect(ticker.prices.bitcoin).toMatchObject({ price: 60_000, rank: 1, change1h: 0.1, change7d: 2 });
    const snap = JSON.parse(m[0][4]);
    expect(snap.updatedAt).toBe(ticker.fetchedAt);
    expect(snap.snapshot.bitcoin.priceUsd).toBe(60_000);
  });

  it("passage hors du début d'heure : pas de crédit « global », MSET sans la clé globale", async () => {
    activerKvTest();
    process.env.CMC_API_KEY = "cle-factice-de-test";
    const appels = simuler((u) => (u.includes("/listings/latest") ? json({ status: { error_code: 0 }, data: cmcTop100() }) : json({}, 404)));
    const { releverMarche } = await import("@/lib/marche-robot");
    const r = await releverMarche({ now: () => new Date("2026-10-08T12:20:30Z") });
    expect(r).toMatchObject({ ok: true, global: false });
    expect(appels.some((a) => a.url.includes("/global-metrics/"))).toBe(false);
    expect(msets(appels)[0].filter((_, i) => i % 2 === 1)).toEqual(["cg-ticker-prices:v1", "price-source:top-snapshot"]);
  });

  it("CMC en panne : CoinGecko en repli (et seulement alors), source « coingecko » écrite", async () => {
    activerKvTest();
    process.env.CMC_API_KEY = "cle-factice-de-test";
    const appels = simuler((u) => (u.includes("coinmarketcap.com") ? json({}, 500) : u.includes("api.coingecko.com/api/v3/coins/markets") ? json(cgTop()) : json({}, 404)));
    const { releverMarche } = await import("@/lib/marche-robot");
    const r = await releverMarche({ now: () => new Date("2026-10-08T12:00:30Z") });
    expect(r).toMatchObject({ ok: true, source: "coingecko", count: 60, global: false });
    expect(r.cmcErreur).toMatch(/HTTP 500/);
    expect(JSON.parse(msets(appels)[0][2]).source).toBe("coingecko");
  });

  it("aucune source : rien n'est écrit (jamais de prix figé), échec signalé", async () => {
    activerKvTest();
    const appels = simuler(() => json({}, 503));
    const { releverMarche } = await import("@/lib/marche-robot");
    const r = await releverMarche();
    expect(r.ok).toBe(false);
    expect(msets(appels)).toHaveLength(0);
  });

  it("update-static-prices supprimé : plus de cron ni de route ; R1 reste toutes les 10 min", () => {
    const crons = (JSON.parse(lire("vercel.json")) as { crons: { path: string; schedule: string }[] }).crons;
    expect(crons.some((c) => c.path.includes("update-static-prices"))).toBe(false);
    expect(crons.find((c) => c.path === "/api/cron/refresh-ticker-prices")?.schedule).toBe("*/10 * * * *");
    expect(existsSync(path.join(RACINE, "app/api/cron/update-static-prices/route.ts"))).toBe(false);
    // l'instantané n'est plus réécrit en arrière-plan par une lecture (doublon D9)
    expect(lire("lib/price-source.ts")).not.toMatch(/_refreshKvSnapshotIfNotLocked|price-source:refresh-lock/);
  });
});

describe("2. pages : aucun appel CoinMarketCap, une seule capitalisation globale", () => {
  const RESEAU = /\b(cmcListingsTop|cmcQuotesChunk|cmcQuoteForSite|cmcGlobalMetrics|cmcFearGreed)\b/;
  // lot Z3 (10/10/2026) : le robot des fiches R2 (lots de 100 par identifiant) est un robot, pas une page
  const ROBOTS = new Set(["lib/coinmarketcap.ts", "lib/marche-robot.ts", "app/api/cron/refresh-prices/route.ts"]);

  it("code : les fonctions réseau de lib/coinmarketcap.ts ne sont appelées que par les robots", () => {
    const fautifs: string[] = [];
    for (const dir of ["app", "lib", "components"]) {
      for (const f of fichiers(path.join(RACINE, dir))) {
        const r = rel(f);
        if (ROBOTS.has(r)) continue;
        if (RESEAU.test(readFileSync(f, "utf8"))) fautifs.push(r);
      }
    }
    expect(fautifs).toEqual([]);
  });

  it("code : l'adresse de l'API CoinMarketCap n'apparaît que dans lib/coinmarketcap.ts ; aucun composant n'importe le client", () => {
    const fautifs: string[] = [];
    for (const dir of ["app", "lib", "components"]) {
      for (const f of fichiers(path.join(RACINE, dir))) {
        const r = rel(f);
        const src = readFileSync(f, "utf8");
        if (r !== "lib/coinmarketcap.ts" && src.includes("pro-api.coinmarketcap.com")) fautifs.push(r);
        if (r.startsWith("components/") && src.includes("@/lib/coinmarketcap")) fautifs.push(r);
      }
    }
    expect(fautifs).toEqual([]);
  });

  it("exécution (clé CMC présente) : top 100, top 200, global, peur & avidité, instantané, cascade → 0 appel CMC", async () => {
    activerKvTest();
    process.env.CMC_API_KEY = "cle-factice-de-test";
    const urls: string[] = [];
    const handler = (u: string) =>
      u.includes("/listings/latest") ? json({ status: { error_code: 0 }, data: cmcTop100() }) : u.includes("/global-metrics/") ? json(cmcGlobal()) : u.includes("alternative.me") ? json({ data: [{ value: "60", value_classification: "Greed", timestamp: "1759900000" }] }) : json({}, 404);
    globalThis.fetch = vi.fn(async (input: string | URL | Request) => {
      const u = String(input);
      const kv = await kvR1Simule(u, handler);
      if (kv) return kv;
      urls.push(u);
      return handler(u);
    }) as unknown as typeof fetch;
    const cg = await import("@/lib/coingecko");
    const ps = await import("@/lib/price-source");
    const { fetchPriceCascade } = await import("@/lib/price-providers");
    const top = await cg.fetchTopMarket(100);
    expect(top[0]).toMatchObject({ id: "bitcoin", sources: { price: "coinmarketcap" } });
    expect(top[0].asOf).toEqual(expect.any(String));
    await ps.getTopMarket(200);
    const g = await cg.fetchGlobalMetrics();
    await cg.fetchFearGreed();
    const snap = await ps.getPriceSnapshot("bitcoin");
    expect(snap.sources?.price).toBe("coinmarketcap");
    expect(snap.source).toBe("coinmarketcap");
    await fetchPriceCascade({ coingeckoId: "ethereum", symbol: "ETH", name: "Ethereum" });
    expect(urls.filter((u) => u.includes("coinmarketcap.com"))).toEqual([]);
    // une seule valeur globale (écrite par R1), avec sa source et son heure
    expect(g).toMatchObject({ source: "coinmarketcap", totalMarketCapUsd: 2.06e12, btcDominance: 58.1, ethDominance: 12.2 });
    expect(g?.asOf).toEqual(expect.any(String));
    const g2 = await cg.fetchGlobalMetrics();
    expect([g2?.totalMarketCapUsd, g2?.btcDominance, g2?.ethDominance]).toEqual([g?.totalMarketCapUsd, g?.btcDominance, g?.ethDominance]);
  });

  it("accueil, /marche et bandeau lisent la même fonction (fetchGlobalMetrics) ; aucune autre somme globale dans les pages", () => {
    for (const p of ["app/page.tsx", "app/marche/page.tsx"]) expect(lire(p), p).toMatch(/fetchGlobalMetrics\(\)/);
    const fautifs: string[] = [];
    for (const f of fichiers(path.join(RACINE, "app"))) {
      const src = readFileSync(f, "utf8");
      if (/\/global\b["'`]|global-metrics/.test(src)) fautifs.push(rel(f));
    }
    expect(fautifs).toEqual([]);
  });
});

describe("3. chaîne des cours affichés", () => {
  it("CMC (KV) en tête, Binance gardé, Kraken pour les analyses, Coinbase et KuCoin retirés", async () => {
    const { DATA_PRIORITIES } = await import("@/lib/data-sources/priorities");
    expect(DATA_PRIORITIES.price[0]).toBe("coinmarketcap");
    expect(DATA_PRIORITIES.price).toContain("binance");
    expect(DATA_PRIORITIES.price).not.toContain("coinbase");
    expect(DATA_PRIORITIES.price).not.toContain("kucoin");
    const { PROVIDERS } = await import("@/lib/price-providers");
    expect(PROVIDERS.map((p) => p.name)).not.toEqual(expect.arrayContaining(["coinbase"]));
    expect(PROVIDERS.map((p) => p.name)).not.toEqual(expect.arrayContaining(["kucoin"]));
  });

  it("flux Binance du navigateur, cours serveur Binance, repli des analyses et historique : intacts", () => {
    expect(lire("lib/hooks/useLivePrices.ts")).toContain("data-stream.binance.vision");
    expect(lire("lib/price-providers/binance.ts")).toContain("data-api.binance.vision");
    expect(lire("scripts/lib/analyses-techniques.mjs")).toMatch(/binance/i);
    expect(lire("scripts/lib/analyses-techniques.mjs")).toMatch(/kraken/i);
    expect(lire("lib/historical-prices.ts")).toContain("data-api.binance.vision");
  });

  it("fournisseur « coinmarketcap » : lit le KV de R1 (aucune requête CMC), relevé de plus de 12 min ignoré", async () => {
    activerKvTest();
    const vieux = new Date(Date.now() - 20 * 60_000).toISOString();
    const urls: string[] = [];
    globalThis.fetch = vi.fn(async (input: string | URL | Request) => {
      const u = String(input);
      urls.push(u);
      if (u.startsWith(KV_TEST_URL)) return json({ result: JSON.stringify({ prices: { bitcoin: { id: "bitcoin", symbol: "BTC", name: "Bitcoin", image: "", price: 60_000, change24h: 1, marketCap: 1 } }, fetchedAt: vieux, source: "coinmarketcap" }) });
      return json({}, 404);
    }) as unknown as typeof fetch;
    const { coinmarketcapProvider } = await import("@/lib/price-providers/coinmarketcap");
    expect(await coinmarketcapProvider.fetch({ coingeckoId: "bitcoin", symbol: "BTC", name: "Bitcoin" })).toBeNull();
    expect(urls.some((u) => u.includes("coinmarketcap.com"))).toBe(false);
  });

  it("reprise Z2 : top du marché — un relevé CMC « stale » (2 h) n'est jamais servi ; le relais CoinGecko est tenté", async () => {
    activerKvTest();
    const vieux = new Date(Date.now() - 2 * 3_600_000).toISOString();
    const urls: string[] = [];
    globalThis.fetch = vi.fn(async (input: string | URL | Request) => {
      const u = String(input);
      urls.push(u);
      if (u.startsWith(KV_TEST_URL)) {
        const cle = decodeURIComponent(new URL(u).pathname.split("/")[2] ?? "");
        if (cle === "cg-ticker-prices:v1") {
          const prices = Object.fromEntries(
            Array.from({ length: 30 }, (_, i) => [`coin-${i}`, { id: `coin-${i}`, symbol: `C${i}`, name: `Coin ${i}`, image: "", price: 10 + i, change24h: 1, marketCap: 1e9 - i, rank: i + 1 }]),
          );
          return json({ result: JSON.stringify({ prices, fetchedAt: vieux, source: "coinmarketcap" }) });
        }
        return json({ result: null });
      }
      return json({}, 404);
    }) as unknown as typeof fetch;
    const ps = await import("@/lib/price-source");
    const top = await ps.getTopMarket(20);
    expect(top.filter((c) => c.source === "coinmarketcap")).toEqual([]);
    expect(top).toEqual([]);
    expect(urls.some((u) => u.includes("coingecko"))).toBe(true);
  });

  it("reprise Z2 : instantané de secours — heure du relevé de R1 (jamais l'heure du rendu), source « static »", async () => {
    activerKvTest();
    const releve = new Date(Date.now() - 5 * 3_600_000).toISOString();
    globalThis.fetch = vi.fn(async (input: string | URL | Request) => {
      const u = String(input);
      if (u.startsWith(KV_TEST_URL)) {
        const cle = decodeURIComponent(new URL(u).pathname.split("/")[2] ?? "");
        if (cle === "price-source:top-snapshot") {
          return json({ result: JSON.stringify({ snapshot: { "zz-reprise-z2": { priceUsd: 3.5, change24h: 1, marketCap: 1e6, volume24h: 1e4 } }, updatedAt: releve, sourceCount: 1 }) });
        }
        return json({ result: null });
      }
      return json({}, 404);
    }) as unknown as typeof fetch;
    const ps = await import("@/lib/price-source");
    const snap = await ps.getPriceSnapshot("zz-reprise-z2");
    expect(snap.priceUsd).toBe(3.5);
    expect(snap.source).toBe("static");
    expect(snap.fetchedAt).toBe(releve);
    expect(snap.sources?.price).toBe("static");
  });

  it("reprise Z2 : cascade servie par le fournisseur coinmarketcap → heure du relevé de R1, pas « maintenant »", async () => {
    const src = lire("lib/price-source.ts");
    expect(src).toMatch(/fetchedAt: typeof data\.meta\?\.releveLe === "string" \? data\.meta\.releveLe : fetchedAt/);
    expect(lire("lib/historical-prices.ts")).toMatch(/typeof releveLe === "string" \? releveLe/);
  });

  it("reprise Z2 : plus de « Coinbase », « via l'API CoinGecko », « prix / taux CoinGecko » écrits en dur sur les flux de cours", () => {
    const fichiersCours = [
      "app/alertes/page.tsx",
      "app/outils/convertisseur/page.tsx",
      "app/convertisseur/page.tsx",
      "app/convertisseur/[pair]/page.tsx",
      "app/watchlist/page.tsx",
      "app/portefeuille/page.tsx",
      "app/outils/portfolio-tracker/page.tsx",
      "components/PortfolioTracker.tsx",
      "components/Converter.tsx",
      "app/embed/convertisseur/page.tsx",
      "app/embed/simulateur-dca/page.tsx",
      "app/embeds/page.tsx",
      "app/ressources/page.tsx",
      "app/ressources-libres/page.tsx",
      "lib/schema-tools.ts",
      "lib/search.ts",
      "lib/tools-catalog.ts",
    ];
    for (const p of fichiersCours) {
      const src = lire(p).replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");
      expect(src, p).not.toMatch(/Kraken, Coinbase|API CoinGecko|API publique CoinGecko|prix CoinGecko|taux CoinGecko|live CoinGecko|données CoinGecko|CoinGecko en secours|requêtes\s+publiques CoinGecko/);
    }
  });

  it("attribution : plus de « CoinGecko » / « CoinMarketCap » écrit en dur sur les pages marché, /vs, la fiche et les simulateurs", () => {
    const pages = [
      "app/marche/page.tsx",
      "app/marche/heatmap/page.tsx",
      "app/marche/gainers-losers/page.tsx",
      "app/marche/screener/page.tsx",
      "app/embed/heatmap/page.tsx",
      "app/vs/[a]/[b]/page.tsx",
      "components/DcaSimulator.tsx",
      "components/MiniInvestSimulator.tsx",
      "components/crypto-detail/ROISimulator.tsx",
      "app/outils/simulateur-dca/page.tsx",
    ];
    for (const p of pages) {
      // texte affiché seulement : on retire les commentaires
      const src = lire(p).replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");
      expect(src, p).not.toMatch(/Données[^"\n]*CoinGecko|CoinMarketCap, avec CoinGecko|données CoinGecko|prix CoinGecko|historique CoinGecko|CoinGecko free tier/);
    }
    expect(lire("app/cryptos/[slug]/page.tsx")).not.toContain("plateformes d'échange, CoinMarketCap et CoinGecko");
  });

  it("ligne « Cours : CoinMarketCap, relevé à HH:MM » (heure de Paris) ; rien sans source connue", async () => {
    const { coursSourceTexte, formatReleve } = await import("@/lib/data-sources/attribution");
    const now = Date.parse("2026-10-08T19:50:00Z");
    expect(coursSourceTexte([{ sources: { price: "coinmarketcap" }, asOf: "2026-10-08T19:40:00Z" }], now)).toBe("Cours : CoinMarketCap, relevé à 21:40");
    expect(formatReleve("2026-10-07T19:40:00Z", now)).toBe("le 7 octobre à 21:40");
    expect(coursSourceTexte([{ sources: null }], now)).toBe("");
  });
});

describe("4. budget CoinMarketCap", () => {
  it("R1 + R2 (+ correspondance) : 191 crédits/jour ≤ 250 ; le garde-fou /v1/key/info (mode économe à 80 %) reste", async () => {
    const cmc = await import("@/lib/coinmarketcap");
    const j = cmc.cmcCreditsParJour();
    expect(j.total).toBe(144 + 1 + 24 + 21 + 1);
    expect(j.total).toBeLessThanOrEqual(cmc.CMC_PLAFOND_ROBOTS_JOUR);
    expect(cmc.CMC_PLAFOND_ROBOTS_JOUR).toBe(250);
    // garde-fou : au-delà de 80 % de l'allocation du jour, seuls le classement et le global (R1) passent
    const now = Date.parse("2026-10-08T12:00:00Z");
    // 12 000 crédits restants sur ≈ 23,5 jours → allocation ≈ 510/jour ; 450 = plus de 80 %
    const usage = { dayUsed: 450, monthLeft: 12_000 };
    expect(cmc.cmcBudgetDecision("/v2/cryptocurrency/quotes/latest?id=1", usage, now).ok).toBe(false);
    expect(cmc.cmcBudgetDecision("/v1/cryptocurrency/listings/latest?start=1&limit=100&convert=USD", usage, now).ok).toBe(true);
    expect(lire("lib/coinmarketcap.ts")).toContain("/v1/key/info");
  });
});
