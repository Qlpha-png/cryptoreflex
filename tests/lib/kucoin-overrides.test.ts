/**
 * Tests unitaires lib/kucoin.ts + lib/symbol-overrides.ts.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/cache", () => ({
  unstable_cache: <T extends (...args: unknown[]) => unknown>(fn: T): T => fn,
  revalidateTag: vi.fn(),
}));

const ORIGINAL_FETCH = global.fetch;

beforeEach(() => {
  vi.resetModules();
});

afterEach(() => {
  global.fetch = ORIGINAL_FETCH;
});

function mockFetchSequence(responses: Array<{ ok: boolean; status?: number; body: unknown }>): typeof global.fetch {
  let i = 0;
  return vi.fn(async () => {
    const r = responses[i] ?? responses[responses.length - 1];
    i++;
    return {
      ok: r.ok,
      status: r.status ?? (r.ok ? 200 : 500),
      json: async () => r.body,
    };
  }) as unknown as typeof global.fetch;
}

describe("symbol-overrides", () => {
  it("traduit render-token en RENDER (rename 2024)", async () => {
    const { applySymbolOverride } = await import("@/lib/symbol-overrides");
    expect(applySymbolOverride("render-token", "RNDR")).toBe("RENDER");
  });

  it("retourne le symbol initial si pas d'override", async () => {
    const { applySymbolOverride } = await import("@/lib/symbol-overrides");
    expect(applySymbolOverride("bitcoin", "BTC")).toBe("BTC");
  });

  it("expose la liste des ids overrides pour audit", async () => {
    const { OVERRIDDEN_IDS } = await import("@/lib/symbol-overrides");
    expect(OVERRIDDEN_IDS).toContain("render-token");
  });
});

describe("kucoin getKuCoinPrice", () => {
  it("retourne le prix pour BTC-USDT", async () => {
    global.fetch = mockFetchSequence([
      {
        ok: true,
        body: {
          code: "200000",
          data: {
            last: "80000",
            changeRate: "-0.0123", // -1.23%
            vol: "100",
            volValue: "8000000",
          },
        },
      },
    ]);
    const { getKuCoinPrice } = await import("@/lib/kucoin");
    const result = await getKuCoinPrice("BTC");
    expect(result?.priceUsd).toBe(80000);
    expect(result?.change24h).toBeCloseTo(-1.23, 2);
    expect(result?.volume24h).toBe(8000000);
  });

  it("essaie USDC si USDT echoue", async () => {
    global.fetch = mockFetchSequence([
      { ok: true, body: { code: "400100", msg: "symbol not exists" } }, // BTC-USDT fail
      {
        ok: true,
        body: {
          code: "200000",
          data: { last: "80000", changeRate: "0", volValue: "1000" },
        },
      },
    ]);
    const { getKuCoinPrice } = await import("@/lib/kucoin");
    const result = await getKuCoinPrice("BTC");
    expect(result?.priceUsd).toBe(80000);
  });

  it("retourne null si KuCoin renvoie code !== 200000", async () => {
    global.fetch = mockFetchSequence([
      { ok: true, body: { code: "400100", msg: "symbol not found" } },
      { ok: true, body: { code: "400100", msg: "symbol not found" } },
    ]);
    const { getKuCoinPrice } = await import("@/lib/kucoin");
    const result = await getKuCoinPrice("UNKNOWN_SYMBOL");
    expect(result).toBeNull();
  });

  it("convertit changeRate ratio en %", async () => {
    global.fetch = mockFetchSequence([
      {
        ok: true,
        body: {
          code: "200000",
          data: { last: "100", changeRate: "0.0834", volValue: "1000" },
        },
      },
    ]);
    const { getKuCoinPrice } = await import("@/lib/kucoin");
    const result = await getKuCoinPrice("ANY");
    // 0.0834 * 100 = 8.34%
    expect(result?.change24h).toBeCloseTo(8.34, 2);
  });
});
