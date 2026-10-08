/**
 * Tests unitaires lib/price-providers/index.ts (cascade orchestrator).
 *
 * Strategie : on mock chaque provider via vi.mock() pour controler ce qu'il
 * retourne, puis on valide :
 *  - Ordre de cascade (priority croissante)
 *  - Skip via canHandle()
 *  - Provider qui throw isole (cascade continue)
 *  - estimateMarketCap derive du STATIC_FALLBACK
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/cache", () => ({
  unstable_cache: <T extends (...args: unknown[]) => unknown>(fn: T): T => fn,
  revalidateTag: vi.fn(),
}));

beforeEach(() => {
  vi.resetModules();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("price-providers cascade", () => {
  it("itere les providers dans l'ordre de la table unique (lot Z2 : relevé CMC en tête, Binance gardé, Coinbase et KuCoin retirés)", async () => {
    // l'ordre vient de DATA_PRIORITIES.price (lib/data-sources/priorities.ts).
    const mod = await import("@/lib/price-providers");
    const sorted = mod.cascadeOrder();
    expect(sorted.map((p) => p.name)).toEqual(["coinmarketcap", "binance", "kraken", "coingecko", "dexscreener", "cryptocompare", "static"]);
  });

  it("estimateMarketCap derive du STATIC_FALLBACK supply", async () => {
    const { estimateMarketCap } = await import("@/lib/price-providers");
    // bitcoin static : marketCap=1.55T, priceUsd=78500 → supply ≈ 19.74M
    // Si live priceUsd = 100000, expected marketCap ≈ 19.74M × 100000 = 1.974T
    const mcap = estimateMarketCap("bitcoin", 100000);
    expect(mcap).toBeCloseTo(1_974_522_292_993, -8); // tolerance 1e8
    // Crypto inconnue → 0
    expect(estimateMarketCap("unknown-coin-xyz", 1)).toBe(0);
  });

  it("staticProvider canHandle retourne true seulement si dans STATIC_FALLBACK", async () => {
    const { PROVIDERS } = await import("@/lib/price-providers");
    const sp = PROVIDERS.find((p) => p.name === "static")!;
    expect(sp.canHandle({ coingeckoId: "bitcoin", symbol: "BTC", name: "Bitcoin" })).toBe(true);
    expect(sp.canHandle({ coingeckoId: "mantra", symbol: "OM", name: "MANTRA" })).toBe(true);
    expect(sp.canHandle({ coingeckoId: "unknown-xyz", symbol: "XYZ", name: "X" })).toBe(false);
  });

  it("dexscreenerProvider skip mantra (ambiguity OM/MANTRA)", async () => {
    const { PROVIDERS } = await import("@/lib/price-providers");
    const ds = PROVIDERS.find((p) => p.name === "dexscreener")!;
    expect(ds.canHandle({ coingeckoId: "mantra", symbol: "OM", name: "MANTRA" })).toBe(false);
    expect(ds.canHandle({ coingeckoId: "bitcoin", symbol: "BTC", name: "Bitcoin" })).toBe(true);
  });

  it("binanceProvider canHandle skip si coingeckoId hors mapping", async () => {
    const { PROVIDERS } = await import("@/lib/price-providers");
    const bp = PROVIDERS.find((p) => p.name === "binance")!;
    expect(bp.canHandle({ coingeckoId: "bitcoin", symbol: "BTC", name: "Bitcoin" })).toBe(true);
    expect(bp.canHandle({ coingeckoId: "obscure-token-xyz", symbol: "XYZ", name: "X" })).toBe(false);
  });

  it("staticProvider.fetch ne renvoie JAMAIS un prix figé (audit 2026-10-03)", async () => {
    // La table statique date de mai 2026 : un prix figé affiché comme un
    // cours courant est un chiffre faux. Le provider garde canHandle
    // (supply pour estimateMarketCap) mais ne fournit plus de prix.
    const { PROVIDERS, STATIC_FALLBACK } = await import("@/lib/price-providers");
    const sp = PROVIDERS.find((p) => p.name === "static")!;
    expect(STATIC_FALLBACK["bitcoin"].priceUsd).toBeGreaterThan(0);
    const result = await sp.fetch({ coingeckoId: "bitcoin", symbol: "BTC", name: "Bitcoin" });
    expect(result).toBeNull();
  });

  it("fetchPriceCascade ne retombe pas sur le prix statique quand le live échoue", async () => {
    const { fetchPriceCascade, PROVIDERS } = await import("@/lib/price-providers");
    const spies = PROVIDERS.filter((p) => p.name !== "static").map((p) =>
      vi.spyOn(p, "fetch").mockResolvedValue(null),
    );
    try {
      const r = await fetchPriceCascade({ coingeckoId: "bitcoin", symbol: "BTC", name: "Bitcoin" });
      expect(r).toBeNull();
    } finally {
      spies.forEach((s) => s.mockRestore());
    }
  });

  it("staticProvider.fetch retourne null pour coingeckoId inconnu", async () => {
    const { PROVIDERS } = await import("@/lib/price-providers");
    const sp = PROVIDERS.find((p) => p.name === "static")!;
    const result = await sp.fetch({ coingeckoId: "unknown-xyz", symbol: "XYZ", name: "X" });
    expect(result).toBeNull();
  });

  it("STATIC_FALLBACK contient `mantra` (NEW OM Mantra Chain)", async () => {
    const { STATIC_FALLBACK } = await import("@/lib/price-providers");
    expect(STATIC_FALLBACK["mantra"]).toBeDefined();
    expect(STATIC_FALLBACK["mantra"].priceUsd).toBeGreaterThan(0);
    // Pas de "mantra-dao" : c'est l'OLD ERC-20 mort.
    expect(STATIC_FALLBACK["mantra-dao"]).toBeUndefined();
  });

  it("binanceProvider : data-api.binance.vision, et refus d'une paire retirée au ticker figé (05/10/2026)", async () => {
    const realFetch = globalThis.fetch;
    const urls: string[] = [];
    let closeTime = Date.now() - 60_000;
    globalThis.fetch = vi.fn(async (input: string | URL | Request) => {
      const u = String(input);
      urls.push(u);
      const body = u.includes("/ticker/24hr")
        ? { symbol: "XMRUSDT", lastPrice: "118.70", priceChangePercent: "0", volume: "0", quoteVolume: "0", openPrice: "118.70", closeTime }
        : [];
      return new Response(JSON.stringify(body), { status: 200, headers: { "content-type": "application/json" } });
    }) as unknown as typeof fetch;
    try {
      const { PROVIDERS } = await import("@/lib/price-providers");
      const bp = PROVIDERS.find((p) => p.name === "binance")!;
      const meta = { coingeckoId: "monero", symbol: "XMR", name: "Monero" };
      expect((await bp.fetch(meta))?.priceUsd).toBe(118.7); // ticker frais : accepté
      expect(urls.every((u) => u.startsWith("https://data-api.binance.vision/api/v3/"))).toBe(true);
      closeTime = Date.UTC(2026, 8, 9); // dernier échange le 09/09/2026 : paire retirée
      expect(await bp.fetch(meta)).toBeNull();
    } finally {
      globalThis.fetch = realFetch;
    }
  });
});
