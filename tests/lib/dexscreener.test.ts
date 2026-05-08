/**
 * Tests unitaires lib/dexscreener.ts.
 *
 * Strategy de mocking : on stub global.fetch pour simuler les reponses
 * DexScreener (search + tokens endpoints). On valide le filtrage strict
 * (symbol exact + liquidity >= 1000) et le tri par liquidity desc.
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

function mockFetchOnce(response: { ok: boolean; status?: number; body: unknown }): typeof global.fetch {
  return vi.fn(async () => ({
    ok: response.ok,
    status: response.status ?? (response.ok ? 200 : 500),
    json: async () => response.body,
  })) as unknown as typeof global.fetch;
}

describe("dexscreener getDexScreenerPrice", () => {
  it("retourne le pair le plus liquide pour OM (filtrage strict baseSymbol)", async () => {
    global.fetch = mockFetchOnce({
      ok: true,
      body: {
        pairs: [
          // Pair MANTRADAO (faux match — symbol different)
          {
            chainId: "ethereum",
            baseToken: { symbol: "MANTRADAO" },
            priceUsd: "0.99",
            liquidity: { usd: 50000 },
            volume: { h24: 10000 },
            priceChange: { h24: 5 },
            pairAddress: "0xfake",
          },
          // Pair OM faible liquidite (skip car liquidity < 1000)
          {
            chainId: "bsc",
            baseToken: { symbol: "OM" },
            priceUsd: "0.5",
            liquidity: { usd: 500 },
            volume: { h24: 100 },
            priceChange: { h24: 0 },
            pairAddress: "0xdust",
          },
          // Pair OM legitime liquide moyen
          {
            chainId: "ethereum",
            baseToken: { symbol: "OM" },
            priceUsd: "0.6083",
            liquidity: { usd: 25000 },
            volume: { h24: 12500 },
            priceChange: { h24: -2.5 },
            pairAddress: "0xeth",
          },
          // Pair OM le plus liquide → doit gagner
          {
            chainId: "ethereum",
            baseToken: { symbol: "OM" },
            priceUsd: "0.6100",
            liquidity: { usd: 75000 },
            volume: { h24: 30000 },
            priceChange: { h24: -2 },
            pairAddress: "0xbest",
          },
        ],
      },
    });
    const { getDexScreenerPrice } = await import("@/lib/dexscreener");
    const result = await getDexScreenerPrice("OM");
    expect(result?.priceUsd).toBe(0.61);
    expect(result?.pairAddress).toBe("0xbest");
    expect(result?.liquidityUsd).toBe(75000);
    expect(result?.change24h).toBe(-2);
  });

  it("retourne null si aucun pair ne matche le symbol exactement", async () => {
    global.fetch = mockFetchOnce({
      ok: true,
      body: {
        pairs: [
          {
            chainId: "ethereum",
            baseToken: { symbol: "OMNIBUS" },
            priceUsd: "1.5",
            liquidity: { usd: 10000 },
          },
          {
            chainId: "bsc",
            baseToken: { symbol: "OMG" },
            priceUsd: "0.3",
            liquidity: { usd: 5000 },
          },
        ],
      },
    });
    const { getDexScreenerPrice } = await import("@/lib/dexscreener");
    const result = await getDexScreenerPrice("OM");
    expect(result).toBeNull();
  });

  it("retourne null si la reponse est vide", async () => {
    global.fetch = mockFetchOnce({ ok: true, body: { pairs: [] } });
    const { getDexScreenerPrice } = await import("@/lib/dexscreener");
    const result = await getDexScreenerPrice("FAKETOKEN");
    expect(result).toBeNull();
  });

  it("retourne null si HTTP 5xx", async () => {
    global.fetch = mockFetchOnce({ ok: false, status: 503, body: {} });
    const { getDexScreenerPrice } = await import("@/lib/dexscreener");
    const result = await getDexScreenerPrice("BTC");
    expect(result).toBeNull();
  });

  it("ignore les pairs sans priceUsd ou avec priceUsd <= 0", async () => {
    global.fetch = mockFetchOnce({
      ok: true,
      body: {
        pairs: [
          {
            baseToken: { symbol: "X" },
            priceUsd: "0",
            liquidity: { usd: 50000 },
          },
          {
            baseToken: { symbol: "X" },
            // priceUsd absent
            liquidity: { usd: 30000 },
          },
        ],
      },
    });
    const { getDexScreenerPrice } = await import("@/lib/dexscreener");
    const result = await getDexScreenerPrice("X");
    expect(result).toBeNull();
  });

  it("trie par liquidity desc meme avec ordre inverse en input", async () => {
    global.fetch = mockFetchOnce({
      ok: true,
      body: {
        pairs: [
          {
            baseToken: { symbol: "PEPE" },
            priceUsd: "0.000010",
            liquidity: { usd: 10000 },
            volume: { h24: 1000 },
            priceChange: { h24: 1 },
            pairAddress: "0xlow",
            chainId: "ethereum",
          },
          {
            baseToken: { symbol: "PEPE" },
            priceUsd: "0.000012",
            liquidity: { usd: 1000000 },
            volume: { h24: 5000000 },
            priceChange: { h24: -3 },
            pairAddress: "0xhigh",
            chainId: "ethereum",
          },
          {
            baseToken: { symbol: "PEPE" },
            priceUsd: "0.000011",
            liquidity: { usd: 50000 },
            volume: { h24: 25000 },
            priceChange: { h24: -1 },
            pairAddress: "0xmid",
            chainId: "ethereum",
          },
        ],
      },
    });
    const { getDexScreenerPrice } = await import("@/lib/dexscreener");
    const result = await getDexScreenerPrice("PEPE");
    expect(result?.pairAddress).toBe("0xhigh");
    expect(result?.liquidityUsd).toBe(1000000);
  });

  it("retourne null pour un symbol vide", async () => {
    const { getDexScreenerPrice } = await import("@/lib/dexscreener");
    const result = await getDexScreenerPrice("");
    expect(result).toBeNull();
  });

  it("est case-insensitive (om == OM)", async () => {
    global.fetch = mockFetchOnce({
      ok: true,
      body: {
        pairs: [
          {
            baseToken: { symbol: "OM" },
            priceUsd: "0.6",
            liquidity: { usd: 5000 },
            volume: { h24: 1000 },
            priceChange: { h24: 0 },
            pairAddress: "0xa",
            chainId: "ethereum",
          },
        ],
      },
    });
    const { getDexScreenerPrice } = await import("@/lib/dexscreener");
    const result = await getDexScreenerPrice("om");
    expect(result?.priceUsd).toBe(0.6);
  });
});

describe("dexscreener getDexScreenerByContract", () => {
  it("retourne le pair de la chain demandee si dispo", async () => {
    global.fetch = mockFetchOnce({
      ok: true,
      body: {
        pairs: [
          {
            chainId: "bsc",
            baseToken: { symbol: "OM" },
            priceUsd: "0.59",
            liquidity: { usd: 20000 },
            volume: { h24: 8000 },
            priceChange: { h24: -3 },
            pairAddress: "0xbsc",
          },
          {
            chainId: "ethereum",
            baseToken: { symbol: "OM" },
            priceUsd: "0.61",
            liquidity: { usd: 75000 },
            volume: { h24: 30000 },
            priceChange: { h24: -2 },
            pairAddress: "0xeth",
          },
        ],
      },
    });
    const { getDexScreenerByContract } = await import("@/lib/dexscreener");
    const result = await getDexScreenerByContract(
      "ethereum",
      "0x3593D125a4f7849a1B059E64F4517A86Dd60c95d",
    );
    expect(result?.pairAddress).toBe("0xeth");
    expect(result?.chainId).toBe("ethereum");
  });

  it("retourne null si aucun pair n'a de prix valide", async () => {
    global.fetch = mockFetchOnce({
      ok: true,
      body: { pairs: [{ chainId: "ethereum", priceUsd: "0", liquidity: { usd: 5000 } }] },
    });
    const { getDexScreenerByContract } = await import("@/lib/dexscreener");
    const result = await getDexScreenerByContract("ethereum", "0xfake");
    expect(result).toBeNull();
  });
});
