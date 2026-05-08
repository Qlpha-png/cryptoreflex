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
  it("itere les providers par priority croissante (Binance prioritaire)", async () => {
    const mod = await import("@/lib/price-providers");
    const sorted = [...mod.PROVIDERS].sort((a, b) => a.priority - b.priority);
    expect(sorted[0].name).toBe("binance");
    expect(sorted[1].name).toBe("kraken");
    expect(sorted[2].name).toBe("coinbase");
    expect(sorted[3].name).toBe("kucoin");
    expect(sorted[4].name).toBe("dexscreener");
    expect(sorted[5].name).toBe("cryptocompare");
    expect(sorted[6].name).toBe("coingecko");
    expect(sorted[sorted.length - 1].name).toBe("static");
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

  it("staticProvider.fetch retourne STATIC_FALLBACK[id]", async () => {
    const { PROVIDERS, STATIC_FALLBACK } = await import("@/lib/price-providers");
    const sp = PROVIDERS.find((p) => p.name === "static")!;
    const result = await sp.fetch({ coingeckoId: "bitcoin", symbol: "BTC", name: "Bitcoin" });
    expect(result).not.toBeNull();
    expect(result?.priceUsd).toBe(STATIC_FALLBACK["bitcoin"].priceUsd);
    expect(result?.marketCap).toBe(STATIC_FALLBACK["bitcoin"].marketCap);
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
});
