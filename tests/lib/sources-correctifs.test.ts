/**
 * Correctifs du vérificateur (06/10/2026, verdict NO-GO du relais CoinMarketCap) :
 *  (a) un disjoncteur PAR USAGE (CoinGecko public ≠ CoinGecko avec clé), rejets propres à une crypto non comptés,
 *      CoinGecko appelé seulement pour les champs que CMC n'a pas donnés ;
 *  (b) jamais d'id CMC (slug) pour une ligne du top : table vérifiée, sinon nom + symbole exacts, sinon « cmc-<n> » ;
 *  (c) attribution lue dans le champ `sources` (plus de « CoinGecko » en dur) ;
 *  (d) plus de filet figé (prix de mai 2026) : dernier relevé avec son heure, sinon liste vide ;
 *  (e) pas de tuile à capitalisation 0 ni de logo vide quand un logo local existe ;
 *  (f) semi-ouvert : un essai raté remet de côté, un essai perdu (> 30 s) est remplacé ; contrôle croisé hors build.
 * Les mutations A à G du vérificateur font chacune échouer au moins un test de ce fichier ou de sources-relais.test.ts
 * (rejouées dans une copie jetable : scratchpad/verif-cmc/mutations-correctifs.mjs).
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
// 08/10/2026 (lot Z2) : le cache ticker (KV) est celui du robot R1 simulé (tests/helpers/r1-simule.ts) : les réponses
// CMC du test deviennent le relevé écrit par R1 ; sans réponse CMC, aucun relevé et l'instantané passe par la cascade.

const ROOT = path.resolve(__dirname, "../..");
const read = (p: string) => fs.readFileSync(path.join(ROOT, p), "utf8");
const MAP = (cmcMapJson as { map: Record<string, { id: number; symbol: string }> }).map;
const KEY = "cle-factice-de-test";
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

let urls: string[] = [];
function mockFetch(handler: (url: string) => Response | Promise<Response>) {
  urls = [];
  globalThis.fetch = vi.fn(async (input: string | URL | Request) => {
    const u = String(input);
    // 08/10/2026 (lot Z2) : lecture du KV écrit par le robot R1 (simulé à partir des réponses CMC du test), non comptée
    const kv = await kvR1Simule(u, handler);
    if (kv) return kv;
    urls.push(u);
    return handler(u);
  }) as unknown as typeof fetch;
}

function cmcRow(id: number, symbol: string, name: string, slug: string, price: number, marketCap?: number) {
  const supply = 1_000_000;
  return {
    id,
    name,
    symbol,
    slug,
    cmc_rank: 1,
    circulating_supply: supply,
    last_updated: new Date().toISOString(),
    quote: { USD: { price, volume_24h: 1e6, percent_change_1h: 0.1, percent_change_24h: 1, percent_change_7d: 2, market_cap: marketCap ?? price * supply } },
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
/** 12 premières fiches de la table (ids réels), en lignes CMC et en lignes CoinGecko (mêmes ids, mêmes symboles). */
const MAPPED = Object.entries(MAP).slice(0, 12);
const cmcMapped = () => MAPPED.map(([, e], i) => cmcRow(e.id, e.symbol, e.symbol, `slug-${e.id}`, 10 + i));
const cgMapped = () => MAPPED.map(([site, e], i) => cgRow(site, e.symbol, e.symbol, 10 + i));
const cgOthers = (n: number) => Array.from({ length: n }, (_, i) => cgRow(`autre-${i}`, `AUT${i}`, `Autre ${i}`, 5 + i));
const listing = (data: unknown[]) => json({ status: { error_code: 0 }, data });

const realFetch = globalThis.fetch;
beforeEach(() => {
  vi.resetModules();
  activerKvTest();
  delete process.env.CMC_API_KEY;
  delete process.env.NEXT_PHASE;
  vi.spyOn(console, "warn").mockImplementation(() => undefined);
});
afterEach(() => {
  globalThis.fetch = realFetch;
  desactiverKvTest();
  delete process.env.CMC_API_KEY;
  delete process.env.NEXT_PHASE;
  vi.restoreAllMocks();
});

describe("(a) disjoncteur par usage", () => {
  it("3 refus du /simple/price PUBLIC ne coupent pas /coins/markets (clé) : le top reste en direct", async () => {
    mockFetch((u) =>
      u.includes("/simple/price") ? json({ status: { error_code: 429 } }, 429) : u.includes("/coins/markets") ? json(cgOthers(20)) : json({}, 404),
    );
    const { fetchPriceCascade, PROVIDERS } = await import("@/lib/price-providers");
    for (const p of PROVIDERS) if (p.name !== "coingecko") vi.spyOn(p, "fetch").mockResolvedValue(null);
    for (const [id, symbol] of [["bitcoin", "BTC"], ["ethereum", "ETH"], ["solana", "SOL"]]) {
      expect(await fetchPriceCascade({ coingeckoId: id, symbol, name: id })).toBeNull();
    }
    const h = await import("@/lib/data-sources/health");
    expect(h.healthSnapshot()["coingecko-public"]?.open).toBe(true);
    const { fetchTopMarket } = await import("@/lib/coingecko");
    const top = await fetchTopMarket(20);
    expect(urls.some((u) => u.includes("/coins/markets"))).toBe(true);
    expect(top.length).toBe(20);
    expect(top[0].id).toBe("autre-0");
    // Servi par /coins/markets lui-même (variation 1 h, courbe CoinGecko), pas par l'agrégateur de secours.
    expect(top[0].priceChange1h).toBe(0.5);
    expect(top[0].sources?.sparkline7d).toBe("coingecko");
    expect(top.some((c) => c.currentPrice === 63662)).toBe(false); // jamais le prix figé de mai 2026
    expect(h.healthSnapshot()["coingecko-cle"]?.open ?? false).toBe(false);
  });

  it("donnée rejetée pour UNE crypto : la source entière n'est pas mise de côté ; liste incohérente : échec compté", async () => {
    const { trySource } = await import("@/lib/data-sources/resolve");
    const h = await import("@/lib/data-sources/health");
    for (let i = 0; i < 5; i++) {
      await trySource("coinmarketcap", async () => ({ x: 1 }), { subjectId: "bitcoin", validate: () => "écart au prix en direct" });
    }
    expect(h.isAvailable("coinmarketcap")).toBe(true);
    for (let i = 0; i < 3; i++) await trySource("coinmarketcap", async () => ({ x: 1 }), { validate: () => "liste incohérente" });
    expect(h.isAvailable("coinmarketcap")).toBe(false);
  });

  it("CMC suffit → CoinGecko jamais appelé, même si CMC ne donne ni rang ni offre (CoinGecko ne les fournit pas)", async () => {
    const { resolveMarketFields } = await import("@/lib/data-sources/market-fields");
    const { COINGECKO_SIMPLE_FIELDS } = await import("@/lib/price-source");
    expect([...COINGECKO_SIMPLE_FIELDS].sort()).toEqual(["change24h", "marketCap", "volume24h"]);
    const cg = vi.fn(async () => ({ priceUsd: 60_000, marketCap: 1, volume24h: 1, change24h: 1 }));
    const { sources } = await resolveMarketFields(
      { coingeckoId: "bitcoin", symbol: "BTC", name: "Bitcoin" },
      { source: "binance", priceUsd: 60_000, data: { priceUsd: 60_000, change24h: 2, volume24h: 10 } },
      {
        cmc: async () => ({ priceUsd: 60_010, change1h: 0.1, change24h: 1.9, change7d: 3, marketCap: 1.2e12, volume24h: 4e10 }),
        coingecko: cg,
        coverage: { coingecko: COINGECKO_SIMPLE_FIELDS },
      },
    );
    expect(cg).not.toHaveBeenCalled();
    expect(sources.marketCap).toBe("coinmarketcap");
  });

  it("source suspecte pour une crypto (contrôle croisé) : sautée dans les champs d'ensemble de cette crypto", async () => {
    const h = await import("@/lib/data-sources/health");
    h.markSuspect("coinmarketcap", "bitcoin", "test");
    const { resolveMarketFields } = await import("@/lib/data-sources/market-fields");
    const cmc = vi.fn(async () => ({ priceUsd: 60_000, marketCap: 1.2e12, volume24h: 1, change24h: 1 }));
    const { sources } = await resolveMarketFields(
      { coingeckoId: "bitcoin", symbol: "BTC", name: "Bitcoin" },
      { source: "kraken", priceUsd: 60_000, data: { priceUsd: 60_000, change24h: 2, volume24h: 10 } },
      { cmc, coingecko: async () => ({ priceUsd: 60_000, marketCap: 1.1e12, volume24h: 2, change24h: 2 }) },
    );
    expect(cmc).not.toHaveBeenCalled();
    expect(sources.marketCap).toBe("coingecko");
  });
});

describe("(f) semi-ouvert", () => {
  it("un essai raté remet de côté 5 min ; un essai sans réponse depuis plus de 30 s est remplacé", async () => {
    const h = await import("@/lib/data-sources/health");
    const ch = "coinmarketcap";
    const t0 = 2_000_000;
    for (let i = 0; i < 3; i++) h.recordFailure(ch, "HTTP 429", { now: t0 + i });
    const t1 = t0 + 5 * 60_000 + 10;
    expect(h.isAvailable(ch, t1)).toBe(true); // essai
    h.recordFailure(ch, "HTTP 429", { now: t1 + 1 }); // essai raté
    expect(h.isAvailable(ch, t1 + 2)).toBe(false);
    expect(h.isAvailable(ch, t1 + 4 * 60_000)).toBe(false); // toujours de côté (pas seulement « essai en cours »)
    const t2 = t1 + 1 + 5 * 60_000 + 10;
    expect(h.isAvailable(ch, t2)).toBe(true); // nouvel essai
    expect(h.isAvailable(ch, t2 + 1_000)).toBe(false); // essai en cours
    expect(h.isAvailable(ch, t2 + 31_000)).toBe(true); // essai perdu : délai de garde
  });

  it("contrôle croisé jamais lancé pendant la construction du site (et aucun appel CMC pendant `next build`)", async () => {
    process.env.CMC_API_KEY = KEY;
    process.env.NEXT_PHASE = "phase-production-build";
    mockFetch((u) =>
      u.includes("/listings/latest") ? listing(cmcMapped()) : u.includes("/coins/markets") ? json(cgOthers(12)) : json({}, 404),
    );
    const { getTopMarket } = await import("@/lib/price-source");
    expect((await getTopMarket(12)).length).toBe(12);
    expect(urls.filter((u) => u.includes("coinmarketcap.com"))).toEqual([]);
    await new Promise((r) => setTimeout(r, 100));
    expect(urls.filter((u) => /binance\.vision|kraken\.com|coinbase\.com|kucoin\.com/.test(u))).toEqual([]);
  });
});

describe("(b) ids des lignes du top CMC", () => {
  it("table → id du site + complément CoinGecko ; sans table : nom + symbole exacts, sinon « cmc-<n> » sans complément", async () => {
    process.env.CMC_API_KEY = KEY;
    // Ligne sans correspondance dont le slug CMC coïncide avec l'id CoinGecko d'une AUTRE crypto.
    const collision = cmcRow(900_001, "TONX", "Toncoin X", "autre-0", 3);
    // Ligne sans correspondance qui a exactement le nom et le symbole d'une ligne CoinGecko.
    const exacte = cmcRow(900_002, "EXC", "Exact Coin", "exact-coin-cmc", 4);
    mockFetch((u) =>
      u.includes("/listings/latest")
        ? listing([...cmcMapped(), collision, exacte])
        : u.includes("/coins/markets")
          ? json([...cgMapped(), ...cgOthers(3), cgRow("exact-coin", "EXC", "Exact Coin", 4)])
          : json({}, 404),
    );
    const { fetchTopMarket } = await import("@/lib/coingecko");
    const top = await fetchTopMarket(20);
    const [firstSite] = MAPPED[0];
    const first = top.find((c) => c.id === firstSite)!;
    expect(first.sources?.price).toBe("coinmarketcap");
    // Complément CoinGecko (courbe, ATH, logo) sur les lignes rattachées.
    expect(first.sparkline7d).toEqual([1, 2, 3]);
    expect(first.ath).toBe(99);
    expect(first.image).toBe(`https://example.test/${firstSite}.png`);
    expect(first.sources?.sparkline7d).toBe("coingecko");
    const col = top.find((c) => c.symbol === "TONX")!;
    expect(col.id).toBe("cmc-900001");
    expect(col.sparkline7d).toEqual([]);
    expect(col.image).toBe("");
    expect(top.find((c) => c.symbol === "EXC")?.id).toBe("exact-coin");
    expect(top.some((c) => c.id === "autre-0" || c.id === "exact-coin-cmc")).toBe(false);
  });

  it("getTopMarket (ids d'autocomplétion, liste blanche, cron) : lignes sans id du site écartées", async () => {
    process.env.CMC_API_KEY = KEY;
    mockFetch((u) => (u.includes("/listings/latest") ? listing([...cmcMapped(), cmcRow(900_003, "ZZZ", "Zzz", "zzz", 1)]) : json({}, 404)));
    const { getTopMarket } = await import("@/lib/price-source");
    const ids = (await getTopMarket(20)).map((c) => c.id);
    expect(ids).toEqual(MAPPED.map(([site]) => site));
  });
});

describe("(d) plus de filet figé, (e) pas de tuile à 0", () => {
  it("sans relevé → liste vide ; après un relevé → ce relevé avec son heure, « stale » au-delà de 3 h (délai normal de régénération)", async () => {
    mockFetch(() => {
      throw new TypeError("fetch failed");
    });
    const cg = await import("@/lib/coingecko");
    expect(await cg.fetchTopMarket(20)).toEqual([]);
    mockFetch((u) => (u.includes("/coins/markets") ? json(cgOthers(20)) : json({}, 404)));
    const ok = await cg.fetchTopMarket(20);
    expect(ok.length).toBe(20);
    expect(ok[0].stale).toBe(false);
    expect(typeof ok[0].asOf).toBe("string");
    mockFetch(() => {
      throw new TypeError("fetch failed");
    });
    const again = await cg.fetchTopMarket(20);
    expect(again.map((c) => c.id)).toEqual(ok.map((c) => c.id));
    expect(again[0].asOf).toBe(ok[0].asOf);
    expect(again[0].stale).toBe(false);
    // Délai normal (cache 30 min + page régénérée chaque heure) : un relevé de 1 h 30 n'est PAS « non à jour ».
    const normal = Date.parse(ok[0].asOf!) + 90 * 60_000;
    vi.spyOn(Date, "now").mockReturnValue(normal);
    expect((await cg.fetchTopMarket(20))[0].stale).toBe(false);
    const later = Date.parse(ok[0].asOf!) + 3 * 60 * 60_000 + 60_000;
    vi.spyOn(Date, "now").mockReturnValue(later);
    const old = await cg.fetchTopMarket(20);
    expect(old[0].stale).toBe(true);
    expect(read("lib/coingecko.ts")).not.toMatch(/STATIC_TOP_MARKET_FALLBACK\s*:|currentPrice:\s*63662/);
  });

  it("ligne sans capitalisation écartée (jamais de tuile à 0) ; logo vide complété par le logo local de l'id", async () => {
    process.env.CMC_API_KEY = KEY;
    const sansCap = cmcRow(900_004, "NOCAP", "No Cap", "no-cap", 2, 0);
    const btc = cmcRow(1, "BTC", "Bitcoin", "bitcoin", 60_000);
    mockFetch((u) =>
      u.includes("/listings/latest") ? listing([btc, ...cmcMapped(), sansCap]) : u.includes("/coins/markets") ? json(cgOthers(5)) : json({}, 404),
    );
    const { fetchTopMarket } = await import("@/lib/coingecko");
    const { getCryptoLogo } = await import("@/lib/crypto-logos");
    const top = await fetchTopMarket(20);
    expect(top.some((c) => c.symbol === "NOCAP")).toBe(false);
    expect(top.every((c) => c.marketCap > 0)).toBe(true);
    const b = top.find((c) => c.id === "bitcoin")!;
    expect(b.image).toBe(getCryptoLogo("bitcoin"));
    expect(b.image).not.toBe("");
  });
});

describe("(c) attribution lue dans `sources`", () => {
  it("fiche : la capitalisation CMC de l'instantané n'est jamais écrasée par CoinGecko ; sinon CoinGecko comble", async () => {
    const { _mergeSnapFields } = await import("@/lib/coingecko");
    const r = _mergeSnapFields(
      { marketCap: 100, priceUsd: 1, marketCapRank: 5, circulatingSupply: 100, sources: { marketCap: "coinmarketcap", rank: "coinmarketcap", circulatingSupply: "coinmarketcap" } },
      { marketCap: 200, rank: 7, supply: 200 },
      "coingecko",
    );
    expect(r).toMatchObject({ marketCap: 100, marketCapRank: 5, circulatingSupply: 100 });
    expect(r.sources.marketCap).toBe("coinmarketcap");
    const r2 = _mergeSnapFields({ marketCap: 100, priceUsd: 1, sources: { marketCap: "estimate" } }, { marketCap: 200, rank: 7, supply: 200 }, "coingecko");
    expect(r2.marketCap).toBe(200);
    expect(r2.sources.marketCap).toBe("coingecko");
  });

  it("instantané : courbe 7 j et variation 7 j des klines Binance attribuées « binance-klines », pas « coingecko »", async () => {
    mockFetch(() => json({}, 404));
    const { PROVIDERS } = await import("@/lib/price-providers");
    for (const p of PROVIDERS) {
      vi.spyOn(p, "fetch").mockResolvedValue(p.name === "binance" ? { priceUsd: 60_000, change24h: 1, volume24h: 5, sparkline7d: [1, 2, 3, 4] } : null);
    }
    const { getPriceSnapshot } = await import("@/lib/price-source");
    const s = await getPriceSnapshot("bitcoin");
    expect(s.source).toBe("binance");
    expect(s.sources?.sparkline7d).toBe("binance-klines");
    expect(s.sources?.change7d).toBe("binance-klines");
  });

  it("ligne d'attribution : sources réelles avec leur lien, heure du dernier relevé ; plus de CoinGecko en dur", async () => {
    const { default: DataSourceLine } = await import("@/components/DataSourceLine");
    const html = renderToStaticMarkup(
      createElement(DataSourceLine, { items: [{ sources: { price: "coinmarketcap", sparkline7d: "coingecko" } }, { sources: { price: "coinmarketcap" } }] }),
    );
    expect(html).toContain('href="https://coinmarketcap.com/"');
    expect(html.indexOf("CoinMarketCap")).toBeLessThan(html.indexOf("CoinGecko"));
    const stale = renderToStaticMarkup(
      createElement(DataSourceLine, { items: [{ sources: { price: "coinmarketcap" }, asOf: "2026-10-06T19:40:00.000Z", stale: true }] }),
    );
    expect(stale).toMatch(/dernier relevé le 6 octobre à 21:40 \(cours non à jour\)/);
    for (const f of ["components/MarketTableClient.tsx", "components/Heatmap.tsx", "components/LiveHeatmap.tsx", "components/home/market-source.ts"]) {
      expect(read(f), f).not.toMatch(/coingecko\.com/i);
    }
    expect(read("components/MarketTableClient.tsx")).not.toMatch(/via CoinGecko/);
    const { default: FearGreedSource } = await import("@/components/FearGreedSource");
    expect(renderToStaticMarkup(createElement(FearGreedSource, { source: "coinmarketcap" }))).toContain("coinmarketcap.com/charts/fear-and-greed-index");
    expect(renderToStaticMarkup(createElement(FearGreedSource, {}))).toContain("alternative.me");
  });
});

describe("garde-fous du complément CoinGecko (mutations V2b, V2c, V2e du 2e vérificateur)", () => {
  it("V2b : une ligne CMC hors table n'est rattachée que par nom ET symbole exacts (même nom, autre symbole → aucun lien)", async () => {
    process.env.CMC_API_KEY = KEY;
    const orpheline = cmcRow(900_101, "FOO", "Foo Token", "foo-token", 3);
    mockFetch((u) =>
      u.includes("/listings/latest")
        ? listing([...cmcMapped(), orpheline])
        : u.includes("/coins/markets")
          ? json([...cgMapped(), cgRow("foo-homonyme", "FOOX", "Foo Token", 3)])
          : json({}, 404),
    );
    const cg = await import("@/lib/coingecko");
    const top = await cg.fetchTopMarket(20);
    expect(top.some((c) => c.id === "foo-homonyme")).toBe(false);
  });

  it("V2b (témoin) : même nom ET même symbole, unique → rattachée à la fiche CoinGecko", async () => {
    process.env.CMC_API_KEY = KEY;
    const orpheline = cmcRow(900_102, "BAR", "Bar Coin", "bar-coin", 4);
    mockFetch((u) =>
      u.includes("/listings/latest")
        ? listing([...cmcMapped(), orpheline])
        : u.includes("/coins/markets")
          ? json([...cgMapped(), cgRow("bar-coin-cg", "BAR", "Bar Coin", 4)])
          : json({}, 404),
    );
    const cg = await import("@/lib/coingecko");
    expect((await cg.fetchTopMarket(20)).some((c) => c.id === "bar-coin-cg")).toBe(true);
  });

  it("V2c + V2e : capitalisation absente chez CMC → comblée par CoinGecko, attribuée à coingecko, et la ligne reste dans le top", async () => {
    process.env.CMC_API_KEY = KEY;
    const [site, e] = MAPPED[0];
    const rows = cmcMapped();
    rows[0] = cmcRow(e.id, e.symbol, e.symbol, `slug-${e.id}`, 10, 0);
    mockFetch((u) => (u.includes("/listings/latest") ? listing(rows) : u.includes("/coins/markets") ? json(cgMapped()) : json({}, 404)));
    const cg = await import("@/lib/coingecko");
    const row = (await cg.fetchTopMarket(20)).find((c) => c.id === site);
    expect(row, "la ligne à capitalisation CMC nulle doit être comblée, pas disparaître").toBeDefined();
    expect(row!.marketCap).toBeGreaterThan(0);
    expect(row!.sources?.marketCap).toBe("coingecko");
  });
});
