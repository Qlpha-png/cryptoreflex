/**
 * Reprise du relais CoinMarketCap après la 2e vérification (06/10/2026) :
 *  - quota CMC borné PAR CONSTRUCTION même dans unstable_cache (mémoire par URL + promesse partagée, plafonds de
 *    l'instance, aucun appel pendant `next build`) : appels réseau COMPTÉS sur des recalculs répétés ;
 *  - disjoncteurs par usage branchés au bon endroit (mutations N1, N2) ;
 *  - rapprochement nom + symbole : ambigu refusé (N3), jamais d'id en double ;
 *  - relevé ancien signalé sur l'accueil (N4) et jamais repris par le brief quotidien (N5) ;
 *  - CMC jamais « guéri » par une fiche absente de la table ; cache ticker de secours jamais servi comme actuel ;
 *  - attribution réelle sur la fiche, le comparateur, le convertisseur et le graphique.
 * Aucun appel réseau réel : fetch est simulé ; unstable_cache est remplacé par l'identité (= recalcul à chaque appel,
 * le pire cas pour le quota).
 */
import fs from "node:fs";
import path from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import cmcMapJson from "@/data/cmc-id-map.json";
import { activerKvTest, desactiverKvTest, kvR1Simule } from "../helpers/r1-simule";

vi.mock("next/cache", () => ({
  unstable_cache: <T extends (...args: unknown[]) => unknown>(fn: T): T => fn,
  revalidateTag: vi.fn(),
}));
const tk = vi.hoisted(() => ({
  value: { record: {} as Record<string, unknown>, source: "none", isStale: false, fetchedAt: null as string | null },
}));
// 08/10/2026 (lot Z2) : sans relevé imposé par le test, la lecture passe par le KV simulé du robot R1.
vi.mock("@/lib/kv-ticker", async (importOriginal) => {
  const orig = await importOriginal<typeof import("@/lib/kv-ticker")>();
  return {
    ...orig,
    readTickerCache: async (now?: number) => (tk.value.source === "none" ? orig.readTickerCache(now) : tk.value),
  };
});

const ROOT = path.resolve(__dirname, "../..");
const read = (p: string) => fs.readFileSync(path.join(ROOT, p), "utf8");
const MAP = (cmcMapJson as { map: Record<string, { id: number; symbol: string }> }).map;
const EXCLUS = (cmcMapJson as { exclus: string[] }).exclus;
const KEY = "cle-factice-de-test";
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

let urls: string[] = [];
function mockFetch(handler: (url: string) => Response | Promise<Response>) {
  urls = [];
  globalThis.fetch = vi.fn(async (input: string | URL | Request) => {
    const u = String(input);
    // lecture gratuite du compteur de la clé (garde-fou du mois) : ni comptée, ni passée au simulateur
    if (u.includes("/v1/key/info")) return new Response("{}", { status: 404 });
    // 08/10/2026 (lot Z2) : lecture du KV écrit par le robot R1 (simulé à partir des réponses CMC du test), non comptée
    const kv = await kvR1Simule(u, handler);
    if (kv) return kv;
    urls.push(u);
    return handler(u);
  }) as unknown as typeof fetch;
}
const count = (part: string) => urls.filter((u) => u.includes(part)).length;

function cmcRow(id: number, symbol: string, name: string, slug: string, price: number) {
  return {
    id,
    name,
    symbol,
    slug,
    cmc_rank: 1,
    circulating_supply: 1_000_000,
    last_updated: new Date().toISOString(),
    quote: { USD: { price, volume_24h: 1e6, percent_change_1h: 0.1, percent_change_24h: 1, percent_change_7d: 2, market_cap: price * 1_000_000 } },
  };
}
function cgRow(id: string, symbol: string, name: string, price: number) {
  return {
    id,
    symbol: symbol.toLowerCase(),
    name,
    image: `https://example.test/${id}.png`,
    current_price: price,
    market_cap: price * 1000,
    market_cap_rank: 1,
    total_volume: 100,
    price_change_percentage_24h: 1,
    price_change_percentage_1h_in_currency: 0.5,
    price_change_percentage_24h_in_currency: 1,
    price_change_percentage_7d_in_currency: 3,
    sparkline_in_7d: { price: [1, 2, 3] },
    circulating_supply: 1000,
    ath: 99,
  };
}
const MAPPED = Object.entries(MAP).slice(0, 12);
const cmcMapped = () => MAPPED.map(([, e], i) => cmcRow(e.id, e.symbol, e.symbol, `slug-${e.id}`, 10 + i));
const cgMapped = () => MAPPED.map(([site, e], i) => cgRow(site, e.symbol, e.symbol, 10 + i));
const cgOthers = (n: number) => Array.from({ length: n }, (_, i) => cgRow(`autre-${i}`, `AUT${i}`, `Autre ${i}`, 5 + i));
const listing = (data: unknown[], credits?: number) =>
  json({ status: { error_code: 0, ...(credits !== undefined ? { credit_count: credits } : {}) }, data });

/** Places de marché simulées : Binance donne le prix de TOUTES les fiches, les autres rien. */
async function stubExchanges(prices: Record<string, number> = {}) {
  const { PROVIDERS } = await import("@/lib/price-providers");
  for (const p of PROVIDERS) {
    // lot Z2 : « coinmarketcap » n'est pas une place de marché (il lit le relevé du robot R1) : laissé tel quel
    if (p.name === "coinmarketcap") continue;
    vi.spyOn(p, "canHandle").mockReturnValue(true);
    vi.spyOn(p, "fetch").mockImplementation(async (meta: { coingeckoId: string }) =>
      p.name === "binance" ? { priceUsd: prices[meta.coingeckoId] ?? 10, change24h: 1, volume24h: 5 } : null,
    );
  }
}

const realFetch = globalThis.fetch;
beforeEach(() => {
  vi.resetModules();
  activerKvTest();
  delete process.env.CMC_API_KEY;
  delete process.env.NEXT_PHASE;
  tk.value = { record: {}, source: "none", isStale: false, fetchedAt: null };
  vi.spyOn(console, "warn").mockImplementation(() => undefined);
});
afterEach(() => {
  globalThis.fetch = realFetch;
  desactiverKvTest();
  delete process.env.CMC_API_KEY;
  delete process.env.NEXT_PHASE;
  vi.restoreAllMocks();
});

describe("quota CMC borné même dans unstable_cache (appels réseau comptés)", () => {
  it("instantanés recalculés en boucle (12 fiches × 5 tours, en parallèle) : relevé R1 lu dans le KV, 0 appel CMC", async () => {
    process.env.CMC_API_KEY = KEY;
    mockFetch((u) => (u.includes("/listings/latest") ? listing(cmcMapped()) : json({}, 404)));
    // Prix des places de marché = prix CMC (sinon le garde-fou « écart > 25 % » écarterait CMC, à raison).
    await stubExchanges(Object.fromEntries(MAPPED.map(([site], i) => [site, 10 + i])));
    const { getPriceSnapshot } = await import("@/lib/price-source");
    const ids = MAPPED.map(([site]) => site);
    for (let round = 0; round < 5; round++) {
      const snaps = await Promise.all(ids.map((id) => getPriceSnapshot(id)));
      expect(snaps.every((s) => s.sources?.marketCap === "coinmarketcap")).toBe(true);
    }
    // lot Z2 : les pages ne consomment plus aucun crédit (lib/coinmarketcap.ts réservé aux robots)
    expect(count("coinmarketcap.com")).toBe(0);
  });

  it("100 cotations simultanées : 1 seul appel réseau (promesse partagée)", async () => {
    process.env.CMC_API_KEY = KEY;
    const hundred = Object.entries(MAP).slice(0, 100);
    mockFetch((u) =>
      u.includes("/listings/latest") ? listing(hundred.map(([, e], i) => cmcRow(e.id, e.symbol, e.symbol, `s-${e.id}`, 1 + i))) : json({}, 404),
    );
    const cmc = await import("@/lib/coinmarketcap");
    const quotes = await Promise.all(hundred.map(([site]) => cmc.cmcQuoteForSite(site)));
    expect(quotes.filter(Boolean).length).toBe(100);
    expect(urls.length).toBe(1);
  });

  it("plafond de l'instance : au-delà de 200 crédits sur 24 h, plus aucun appel (relais)", async () => {
    process.env.CMC_API_KEY = KEY;
    mockFetch((u) => (u.includes("/listings/latest") ? listing(cmcMapped(), 10) : json({}, 404)));
    const cmc = await import("@/lib/coinmarketcap");
    expect(cmc.CMC_INSTANCE_LIMITS.dailyCredits).toBe(200);
    const t0 = Date.now();
    const nowSpy = vi.spyOn(Date, "now");
    const errors: string[] = [];
    for (let i = 0; i < 40; i++) {
      nowSpy.mockReturnValue(t0 + i * 1_801_000); // chaque tour dépasse la période de 30 min
      await cmc.cmcListingsTop().catch((e: Error) => errors.push(e.message));
    }
    expect(count("/listings/latest")).toBe(20); // 20 × 10 crédits = 200
    expect(errors.length).toBe(20);
    expect(errors[0]).toMatch(/budget de l'instance atteint/);
    expect(cmc.cmcInstanceCredits24h(t0 + 39 * 1_801_000)).toBe(200);
    const b = cmc.cmcMaxMonthlyCredits();
    expect(b.total).toBeLessThanOrEqual(cmc.CMC_INSTANCE_LIMITS.dailyCredits * 30);
    expect(b.share).toBeLessThanOrEqual(0.7);
  });

  it("erreur resservie 60 s sans nouvel appel, puis nouvel essai", async () => {
    process.env.CMC_API_KEY = KEY;
    mockFetch(() => json({ status: { error_code: 1008 } }, 429));
    const cmc = await import("@/lib/coinmarketcap");
    const t0 = Date.now();
    const nowSpy = vi.spyOn(Date, "now").mockReturnValue(t0);
    for (let i = 0; i < 5; i++) await cmc.cmcListingsTop().catch(() => null);
    expect(urls.length).toBe(1);
    nowSpy.mockReturnValue(t0 + 61_000);
    await cmc.cmcListingsTop().catch(() => null);
    expect(urls.length).toBe(2);
  });

  it("débit borné par construction : rafale d'erreurs sur toutes les URL possibles → au plus 1 appel réseau par URL et par minute", async () => {
    process.env.CMC_API_KEY = KEY;
    mockFetch(() => json({ status: { error_code: 1008 } }, 429));
    const cmc = await import("@/lib/coinmarketcap");
    const t0 = Date.now();
    const nowSpy = vi.spyOn(Date, "now");
    for (let s = 0; s < 60; s += 5) {
      nowSpy.mockReturnValue(t0 + s * 1000);
      await Promise.all([
        cmc.cmcListingsTop().catch(() => null),
        cmc.cmcGlobalMetrics().catch(() => null),
        cmc.cmcFearGreed().catch(() => null),
        ...cmc.CMC_CHUNKS.map((_, i) => cmc.cmcQuotesChunk(i).catch(() => null)),
      ]);
    }
    expect(cmc.CMC_CHUNKS.length + 3).toBeLessThanOrEqual(12); // 1 classement + 1 global + 1 peur & avidité + lots de 100
    expect(urls.length).toBe(cmc.CMC_CHUNKS.length + 3);
    expect(new Set(urls).size).toBe(urls.length);
  });

  it("pendant `next build` : aucun appel CMC (top, global, instantané)", async () => {
    process.env.CMC_API_KEY = KEY;
    process.env.NEXT_PHASE = "phase-production-build";
    mockFetch((u) => (u.includes("/coins/markets") ? json(cgOthers(20)) : json({}, 404)));
    await stubExchanges();
    const { getTopMarket, getPriceSnapshot } = await import("@/lib/price-source");
    const { fetchTopMarket, fetchGlobalMetrics } = await import("@/lib/coingecko");
    await getTopMarket(20);
    await fetchTopMarket(20);
    await fetchGlobalMetrics().catch(() => null);
    await getPriceSnapshot(MAPPED[0][0]);
    expect(urls.filter((u) => u.includes("coinmarketcap.com"))).toEqual([]);
  });
});

describe("disjoncteurs par usage branchés au bon endroit", () => {
  it("N1 — public mis de côté : le complément CoinGecko du top CMC (clé) passe quand même", async () => {
    process.env.CMC_API_KEY = KEY;
    const h = await import("@/lib/data-sources/health");
    for (let i = 0; i < 3; i++) h.recordFailure("coingecko-public", "HTTP 429");
    expect(h.isAvailable("coingecko-public")).toBe(false);
    mockFetch((u) => (u.includes("/listings/latest") ? listing(cmcMapped()) : u.includes("/coins/markets") ? json(cgMapped()) : json({}, 404)));
    const { fetchTopMarket } = await import("@/lib/coingecko");
    const top = await fetchTopMarket(20);
    const first = top.find((c) => c.id === MAPPED[0][0])!;
    expect(first.sources?.price).toBe("coinmarketcap");
    expect(first.sparkline7d).toEqual([1, 2, 3]);
    expect(first.sources?.sparkline7d).toBe("coingecko");
  });

  it("N2 — public mis de côté : getTopMarket (/coins/markets avec clé) reste servi par CoinGecko", async () => {
    const h = await import("@/lib/data-sources/health");
    for (let i = 0; i < 3; i++) h.recordFailure("coingecko-public", "HTTP 429");
    mockFetch((u) => (u.includes("/coins/markets") ? json(cgOthers(20)) : json({}, 404)));
    const { getTopMarket } = await import("@/lib/price-source");
    const top = await getTopMarket(20);
    expect(top.length).toBe(20);
    expect(top[0].sources?.price).toBe("coingecko");
  });
});

describe("rapprochement nom + symbole des lignes CMC sans table", () => {
  it("N3 — deux lignes CoinGecko de même nom et même symbole : aucun rapprochement (« cmc-<n> »)", async () => {
    process.env.CMC_API_KEY = KEY;
    const dup = cmcRow(900_020, "DUP", "Dup Coin", "dup-coin", 2);
    mockFetch((u) =>
      u.includes("/listings/latest")
        ? listing([...cmcMapped(), dup])
        : u.includes("/coins/markets")
          ? json([...cgMapped(), cgRow("dup-a", "DUP", "Dup Coin", 2), cgRow("dup-b", "DUP", "Dup Coin", 2.1)])
          : json({}, 404),
    );
    const { fetchTopMarket } = await import("@/lib/coingecko");
    const top = await fetchTopMarket(20);
    const row = top.find((c) => c.symbol === "DUP")!;
    expect(row.id).toBe("cmc-900020");
    expect(top.some((c) => c.id === "dup-a" || c.id === "dup-b")).toBe(false);
  });

  it("jamais d'id en double : une ligne sans table ne reprend pas l'id d'une ligne déjà rattachée", async () => {
    process.env.CMC_API_KEY = KEY;
    const [site, e] = MAPPED[0];
    // Même nom et même symbole que la 1re ligne rattachée (dont le complément CoinGecko porte l'id `site`).
    const homonyme = cmcRow(900_021, e.symbol, e.symbol, "homonyme-cmc", 3);
    mockFetch((u) =>
      u.includes("/listings/latest") ? listing([...cmcMapped(), homonyme]) : u.includes("/coins/markets") ? json(cgMapped()) : json({}, 404),
    );
    const { fetchTopMarket } = await import("@/lib/coingecko");
    const top = await fetchTopMarket(20);
    const ids = top.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.filter((id) => id === site).length).toBe(1);
    expect(ids).toContain("cmc-900021");
  });
});

describe("relevé ancien : signalé, jamais présenté comme actuel", () => {
  it("N4 — accueil : un relevé « stale » est signalé avec son heure (« cours non à jour »)", async () => {
    const { detectMarketSource, priceSourceLabel } = await import("@/components/home/market-source");
    const asOf = "2026-10-06T19:40:00.000Z";
    const src = detectMarketSource([{ sources: { price: "coinmarketcap" }, asOf, stale: true }]);
    expect(src?.stale).toBe(true);
    expect(src?.primary).toBe("coinmarketcap");
    expect(priceSourceLabel(src)?.note).toMatch(/dernier relevé le 6 octobre à 21:40 \(cours non à jour\)/);
    const live = detectMarketSource([{ sources: { price: "coinmarketcap" }, asOf, stale: false }]);
    expect(live?.stale).toBe(false);
  });

  it("N5 — brief quotidien : relevé ancien écarté (aide testée + branchement de la route)", async () => {
    mockFetch((u) => (u.includes("/coins/markets") ? json(cgOthers(20)) : json({}, 404)));
    const cg = await import("@/lib/coingecko");
    expect((await cg.fetchFreshTopMarket(20)).length).toBe(20);
    mockFetch(() => {
      throw new TypeError("fetch failed");
    });
    vi.spyOn(Date, "now").mockReturnValue(Date.now() + 3 * 60 * 60_000 + 60_000);
    expect((await cg.fetchTopMarket(20)).every((c) => c.stale === true)).toBe(true);
    expect(await cg.fetchFreshTopMarket(20)).toEqual([]);
    const route = read("app/api/cron/daily-brief/route.ts");
    expect(route).toMatch(/await fetchFreshTopMarket\(\d+\)/);
    expect(route).not.toMatch(/\bfetchTopMarket\(/);
  });

  it("cache ticker de SECOURS (jusqu'à 6 h) jamais servi comme cours actuel ; cache en direct daté du cron", async () => {
    mockFetch(() => json({}, 404));
    await stubExchanges();
    const entry = { symbol: "BTC", name: "Bitcoin", price: 50_000, change24h: 1, marketCap: 1e12 };
    tk.value = { record: { bitcoin: entry }, source: "stale", isStale: true, fetchedAt: "2026-10-06T10:00:00.000Z" };
    const { getPriceSnapshot } = await import("@/lib/price-source");
    const s = await getPriceSnapshot("bitcoin");
    expect(s.priceUsd).toBe(10); // place de marché en direct, pas le relevé de secours
    expect(s.source).toBe("binance");
    tk.value = { record: { bitcoin: entry }, source: "live", isStale: false, fetchedAt: "2026-10-06T21:30:00.000Z" };
    const live = await getPriceSnapshot("bitcoin");
    expect(live.priceUsd).toBe(50_000);
    expect(live.fetchedAt).toBe("2026-10-06T21:30:00.000Z");
  });
});

describe("semi-ouvert : jamais refermé sans vérification", () => {
  it("fiche absente de la table : aucun essai CMC consommé, la panne reste connue", async () => {
    process.env.CMC_API_KEY = KEY;
    mockFetch(() => json({}, 404));
    await stubExchanges();
    const h = await import("@/lib/data-sources/health");
    const t0 = Date.now();
    for (let i = 0; i < 3; i++) h.recordFailure("coinmarketcap", "HTTP 500", { now: t0 + i });
    vi.spyOn(Date, "now").mockReturnValue(t0 + 5 * 60_000 + 1_000); // mise de côté terminée
    const { getPriceSnapshot } = await import("@/lib/price-source");
    const exclu = EXCLUS.find((id) => !Object.prototype.hasOwnProperty.call(MAP, id))!;
    await getPriceSnapshot(exclu);
    expect(urls.filter((u) => u.includes("coinmarketcap.com"))).toEqual([]);
    expect(h.healthSnapshot()["coinmarketcap"]?.lastReason).toBe("HTTP 500");
  });
});

describe("attribution réelle (fiche, comparateur, convertisseur, graphique)", () => {
  it("comparateur : la capitalisation cite sa source réelle", async () => {
    const { fieldSourcesLabel } = await import("@/lib/data-sources/attribution");
    expect(fieldSourcesLabel([{ sources: { marketCap: "coinmarketcap", price: "binance" } }, { sources: { marketCap: "coingecko" } }, { sources: null }], "marketCap")).toBe(
      "CoinMarketCap, CoinGecko",
    );
    expect(fieldSourcesLabel([{ sources: { price: "binance" } }], "marketCap")).toBe("");
    const v = read("components/cryptos/CompareVerdict.tsx");
    expect(v).not.toMatch(/capitalisation CoinGecko/);
    expect(v).toMatch(/fieldSourcesLabel\(details\.map\(\(d\) => \(\{ sources: d\?\.sources \?\? null \}\)\), "marketCap"\)/);
  });

  it("bandeau ATH et convertisseur : sources réelles, plus de « (CoinGecko) » en dur", async () => {
    const { default: Ath } = await import("@/components/crypto-detail/AthAlertBanner");
    const props = { cryptoName: "Bitcoin", symbol: "BTC", currentPrice: 99, ath: 100 };
    const both = renderToStaticMarkup(createElement(Ath, { ...props, priceSource: "binance", athSource: "coingecko" }));
    // Typographie française au rendu (lot B1-bis) : espaces insécables devant « : ; », comparées ici comme des espaces simples.
    expect(both.replace(/[  ]/g, " ")).toContain("prix : Binance ; sommet : CoinGecko");
    const none = renderToStaticMarkup(createElement(Ath, props));
    expect(none).not.toMatch(/CoinGecko/);
    const { default: Pair } = await import("@/components/crypto-detail/PairConverter");
    const pair = renderToStaticMarkup(createElement(Pair, { symbol: "BTC", name: "Bitcoin", priceUsd: 60_000, priceSource: "coinmarketcap" }));
    expect(pair).toContain("prix indicatif (CoinMarketCap)");
    expect(renderToStaticMarkup(createElement(Pair, { symbol: "BTC", name: "Bitcoin", priceUsd: 60_000 }))).not.toMatch(/CoinGecko/);
    const page = read("app/cryptos/[slug]/page.tsx");
    expect(page).toMatch(/priceSource=\{detail\.sources\?\.price \?\? null\}\s+athSource=\{detail\.sources\?\.ath \?\? null\}/);
    expect(page).toMatch(/usdToEur=\{fx\.eur\}\s+priceSource=\{detail\.sources\?\.price \?\? null\}/);
  });

  it("graphique : la route renvoie la source de la série et le composant la cite ; fiche : rang et capitalisation", () => {
    const chart = read("components/crypto-detail/PriceChart.tsx");
    expect(chart).not.toMatch(/Données : CoinGecko/);
    expect(chart).toMatch(/setSeriesSource\(data\.source \?\? null\)/);
    const route = read("app/api/historical/route.ts");
    expect(route).toMatch(/const \{ points, source \} = await fetchHistoricalSeries\(coin, days\)/);
    expect(route).toMatch(/\n\s+source,\n/);
    const hist = read("lib/historical-prices.ts");
    for (const s of ["binance-klines", "cryptocompare", "coingecko"]) expect(hist).toContain(`source: "${s}"`);
    const hero = read("components/crypto-detail/CryptoHero.tsx");
    expect(hero).toMatch(/rank: detail\.sources\.rank/);
    expect(hero).toMatch(/marketCap: detail\.sources\.marketCap/);
    // Accueil : une ligne CMC sans fiche (« cmc-<n> ») n'est jamais un des 5 liens de cours.
    expect(read("components/home/HomeMarketToday.tsx")).toMatch(/market\.filter\(\(m\) => !m\.id\.startsWith\("cmc-"\)\)\.slice\(0, 5\)/);
  });
});
