/**
 * lib/historical-prices.ts — chaîne des sources (05/10/2026).
 *
 * Production du 05/10 : api.binance.com répondait 451 au build (États-Unis) et ne répondait plus depuis la région cdg1,
 * CryptoCompare renvoyait 401 à chaque appel (offre gratuite fermée le 21/05/2026), et le convertisseur rejetait le cache
 * KV (marqué « static ») → CoinGecko simple/price à chaque taux, 714 refus 429 en une heure. On vérifie :
 *  - Binance passe par data-api.binance.vision (klines ET taux EUR/USDT) ;
 *  - sans CRYPTOCOMPARE_API_KEY, aucun appel CryptoCompare ; avec la clé, en-tête « Apikey » envoyé ;
 *  - une paire non listée sur Binance (400) passe à la source suivante sans avertissement ;
 *  - le convertisseur prend le prix de la cascade des places de marché et refuse le filet « static ».
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("next/cache", () => ({
  unstable_cache: <T extends (...args: unknown[]) => unknown>(fn: T): T => fn,
  revalidateTag: vi.fn(),
  revalidatePath: vi.fn(),
}));

const C = vi.hoisted(() => ({
  cascade: null as null | { data: { priceUsd: number }; source: string },
  cascadeCalls: [] as Array<{ coingeckoId: string; symbol: string }>,
}));
vi.mock("@/lib/price-providers", () => ({
  fetchPriceCascade: vi.fn(async (meta: { coingeckoId: string; symbol: string }) => {
    C.cascadeCalls.push(meta);
    return C.cascade;
  }),
}));
import { FX_BCE } from "@/lib/fx-bce";
vi.mock("@/lib/fx", () => ({
  fiatPerUsd: vi.fn(async () => ({ usd: 1, eur: 0.9, gbp: 0.75, chf: 0.8, date: "2026-10-05", source: "bce" })),
}));

const realFetch = globalThis.fetch;
const realKey = process.env.CRYPTOCOMPARE_API_KEY;
let urls: string[] = [];
let headersByUrl = new Map<string, Record<string, string>>();

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
/** n bougies quotidiennes dont la dernière date de `endAgoMs` (0 = aujourd'hui) */
const klines = (n: number, endAgoMs = 0) =>
  Array.from({ length: n }, (_, i) => [Date.now() - endAgoMs - (n - 1 - i) * 86_400_000, "1", "1", "1", String(100 + i), "0", 0, "0"]);
const ccDays = (n: number) => ({
  Response: "Success",
  Data: { Data: Array.from({ length: n }, (_, i) => ({ time: 1_790_000_000 + i * 86_400, close: 50 + i })) },
});
const cgChart = (n: number) => ({ prices: Array.from({ length: n }, (_, i) => [Date.UTC(2026, 8, 1) + i * 86_400_000, 10 + i]) });

/** route chaque URL vers une réponse ; mémorise les URL et en-têtes demandés */
function mockFetch(route: (u: string) => Response) {
  globalThis.fetch = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
    const u = String(input);
    urls.push(u);
    headersByUrl.set(u, (init?.headers ?? {}) as Record<string, string>);
    return route(u);
  }) as unknown as typeof fetch;
}

beforeEach(() => {
  vi.resetModules();
  urls = [];
  headersByUrl = new Map();
  C.cascade = null;
  C.cascadeCalls = [];
  delete process.env.CRYPTOCOMPARE_API_KEY;
});
afterEach(() => {
  globalThis.fetch = realFetch;
  vi.restoreAllMocks();
  if (realKey === undefined) delete process.env.CRYPTOCOMPARE_API_KEY;
  else process.env.CRYPTOCOMPARE_API_KEY = realKey;
});

describe("historique : chaîne des sources", () => {
  it("Binance passe par data-api.binance.vision (bougies), jamais par api.binance.com ; euros au taux BCE (data/fx-bce.json), plus aucun appel EURUSDT", async () => {
    mockFetch((u) => {
      if (u.includes("/klines")) return json(klines(40));
      if (u.includes("EURUSDT")) return json({ price: "1.10" });
      return json({}, 404);
    });
    const { fetchHistoricalPrices } = await import("@/lib/historical-prices");
    const pts = await fetchHistoricalPrices("bitcoin", 365);
    expect(pts.length).toBe(40);
    expect(urls.some((u) => u.startsWith("https://data-api.binance.vision/api/v3/klines?symbol=BTCUSDT"))).toBe(true);
    expect(urls.some((u) => u.includes("EURUSDT"))).toBe(false); // lot Z4 : taux BCE du fichier, plus de cours de stablecoin
    expect(urls.some((u) => u.includes("api.binance.com"))).toBe(false);
    expect(pts.at(-1)!.price).toBeCloseTo(139 * FX_BCE.eur, 6); // clôture USDT convertie au taux BCE
  });

  it("sans CRYPTOCOMPARE_API_KEY : aucun appel CryptoCompare, repli direct sur CoinGecko", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    mockFetch((u) => {
      if (u.includes("binance")) return json({ code: 0, msg: "restricted location" }, 451);
      if (u.includes("api.coingecko.com")) return json(cgChart(60));
      return json({}, 404);
    });
    const { fetchHistoricalPrices } = await import("@/lib/historical-prices");
    const pts = await fetchHistoricalPrices("shiba-inu", 365);
    expect(pts.length).toBe(60);
    expect(urls.some((u) => u.includes("cryptocompare"))).toBe(false);
    expect(warn.mock.calls.some((c) => /CryptoCompare failed|CC returned/.test(String(c[0])))).toBe(false);
  });

  it("avec la clé : CryptoCompare est interrogé avec l'en-tête Apikey et sert la série", async () => {
    process.env.CRYPTOCOMPARE_API_KEY = "cle-de-test";
    vi.spyOn(console, "warn").mockImplementation(() => {});
    mockFetch((u) => {
      if (u.includes("binance")) return json({}, 451);
      if (u.includes("min-api.cryptocompare.com")) return json(ccDays(45));
      return json({}, 404);
    });
    const { fetchHistoricalPrices } = await import("@/lib/historical-prices");
    const pts = await fetchHistoricalPrices("shiba-inu", 365);
    expect(pts.length).toBe(45);
    const ccUrl = urls.find((u) => u.includes("min-api.cryptocompare.com"))!;
    expect(ccUrl).toContain("fsym=SHIB");
    expect(headersByUrl.get(ccUrl)?.authorization).toBe("Apikey cle-de-test");
    expect(urls.some((u) => u.includes("api.coingecko.com"))).toBe(false);
  });

  it("paire non listée sur Binance (400) : source suivante, sans avertissement « Binance failed »", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    mockFetch((u) => {
      if (u.includes("/klines")) return json({ code: -1121, msg: "Invalid symbol." }, 400);
      if (u.includes("api.coingecko.com")) return json(cgChart(31));
      return json({}, 404);
    });
    const { fetchHistoricalPrices } = await import("@/lib/historical-prices");
    const pts = await fetchHistoricalPrices("monero", 365);
    expect(pts.length).toBe(31);
    expect(warn.mock.calls.some((c) => /Binance failed/.test(String(c[0])))).toBe(false);
  });
});

describe("historique : paire retirée de Binance", () => {
  it("dernière bougie vieille de 18 mois (XMRUSDT) → série refusée, CoinGecko sert la vraie série", async () => {
    mockFetch((u) => {
      if (u.includes("/klines")) return json(klines(1000, 590 * 86_400_000));
      if (u.includes("EURUSDT")) return json({ price: "1.10" });
      if (u.includes("api.coingecko.com")) return json(cgChart(365));
      return json({}, 404);
    });
    const { fetchHistoricalPrices } = await import("@/lib/historical-prices");
    const pts = await fetchHistoricalPrices("monero", 365);
    expect(pts.length).toBe(365);
    expect(pts.at(-1)!.price).toBe(10 + 364); // la série CoinGecko, pas les bougies Binance de 2024
    expect(urls.filter((u) => u.includes("/klines")).length).toBe(1); // pas de 2e tranche vers le passé
  });

  it("MATIC (migré 1:1 en POL) : l'historique vient de POLUSDT, comme le prix en direct", async () => {
    mockFetch((u) => {
      if (u.includes("/klines")) return json(klines(400));
      if (u.includes("EURUSDT")) return json({ price: "1.10" });
      return json({}, 404);
    });
    const { fetchHistoricalPrices } = await import("@/lib/historical-prices");
    expect((await fetchHistoricalPrices("matic-network", 365)).length).toBe(400);
    expect(urls.some((u) => u.includes("symbol=POLUSDT"))).toBe(true);
    expect(urls.some((u) => u.includes("MATICUSDT"))).toBe(false);
    urls = [];
    expect((await fetchHistoricalPrices("render-token", 365)).length).toBe(400); // RNDR renommé RENDER par Binance
    expect(urls.some((u) => u.includes("symbol=RENDERUSDT"))).toBe(true);
  });

  it("vue 7 jours : dernière bougie horaire de plus de 6 h → refusée aussi", async () => {
    const hourly = Array.from({ length: 168 }, (_, i) => [Date.now() - 8 * 3600_000 - (167 - i) * 3600_000, "1", "1", "1", "5", "0", 0, "0"]);
    mockFetch((u) => {
      if (u.includes("/klines")) return json(hourly);
      if (u.includes("api.coingecko.com")) return json(cgChart(168));
      return json({}, 404);
    });
    const { fetchHistoricalPrices } = await import("@/lib/historical-prices");
    const pts = await fetchHistoricalPrices("maker", 7);
    expect(pts.length).toBe(168);
    expect(urls.some((u) => u.includes("api.coingecko.com"))).toBe(true);
  });
});

describe("convertisseur : taux du moment", () => {
  it("prend le prix de la cascade des places de marché, sans appel CoinGecko", async () => {
    C.cascade = { data: { priceUsd: 60_000 }, source: "binance" };
    mockFetch(() => json({}, 429));
    const { fetchConversionRate } = await import("@/lib/historical-prices");
    const r = await fetchConversionRate("btc", "eur");
    expect(r?.rate).toBeCloseTo(60_000 * 0.9, 6);
    expect(C.cascadeCalls[0]).toMatchObject({ coingeckoId: "bitcoin", symbol: "BTC" });
    expect(urls.some((u) => u.includes("coingecko"))).toBe(false);
  });

  it("entre deux cryptos : rapport des deux prix de la cascade", async () => {
    C.cascade = { data: { priceUsd: 2_000 }, source: "kraken" };
    mockFetch(() => json({}, 429));
    const { fetchConversionRate } = await import("@/lib/historical-prices");
    const r = await fetchConversionRate("eth", "sol");
    expect(r?.rate).toBe(1);
    expect(C.cascadeCalls.map((m) => m.coingeckoId).sort()).toEqual(["ethereum", "solana"]);
  });

  it("refuse le filet « static » (prix figés) et retombe sur CoinGecko simple/price", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    C.cascade = { data: { priceUsd: 78_500 }, source: "static" };
    mockFetch((u) =>
      u.includes("/simple/price") ? json({ bitcoin: { eur: 55_000, last_updated_at: 1_791_200_000 } }) : json({}, 404),
    );
    const { fetchConversionRate } = await import("@/lib/historical-prices");
    const r = await fetchConversionRate("btc", "eur");
    expect(r?.rate).toBe(55_000);
    expect(urls.some((u) => u.includes("/simple/price"))).toBe(true);
  });
});
