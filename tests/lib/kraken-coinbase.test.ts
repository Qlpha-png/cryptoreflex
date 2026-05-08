/**
 * Tests unitaires lib/kraken.ts + lib/coinbase.ts.
 *
 * Critique : ces 2 sources couvrent 93+79=union 94/100 cryptos du site
 * (audit 2026-05-08 .lh-audits/audit-multi-exchange.mjs). Si elles se
 * cassent, on tombe sur CryptoCompare (rate-limited sans cle) puis static.
 *
 * On teste :
 *  - Parsing des reponses API gratuites (no key)
 *  - Cascade try multiple pair candidates (USD, USDT, USDC)
 *  - Mapping symbols speciaux Kraken (BTC -> XBT, DOGE -> XDG)
 *  - Resilience aux erreurs reseau / 4xx / parse fail
 *  - Cas null retourne quand aucune paire ne match
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

describe("kraken getKrakenPrice", () => {
  it("retourne le prix pour bitcoin (mappe XBTUSD)", async () => {
    global.fetch = mockFetchSequence([
      {
        ok: true,
        body: {
          error: [],
          result: {
            XXBTZUSD: {
              c: ["80000.5", "0.001"],
              o: "81000.0",
              v: ["100", "200"],
            },
          },
        },
      },
    ]);
    const { getKrakenPrice } = await import("@/lib/kraken");
    const result = await getKrakenPrice("bitcoin", "BTC");
    expect(result?.priceUsd).toBe(80000.5);
    // change24h = (80000.5 - 81000) / 81000 * 100 = -1.234
    expect(result?.change24h).toBeCloseTo(-1.234, 2);
  });

  it("retourne null si Kraken renvoie une erreur", async () => {
    global.fetch = mockFetchSequence([
      { ok: true, body: { error: ["EQuery:Unknown asset pair"], result: {} } },
      { ok: true, body: { error: ["EQuery:Unknown asset pair"], result: {} } },
      { ok: true, body: { error: ["EQuery:Unknown asset pair"], result: {} } },
    ]);
    const { getKrakenPrice } = await import("@/lib/kraken");
    const result = await getKrakenPrice("unknown-coin", "ZZZZZ");
    expect(result).toBeNull();
  });

  it("essaie USDT si USD echoue", async () => {
    global.fetch = mockFetchSequence([
      { ok: true, body: { error: ["EQuery:Unknown asset pair"], result: {} } }, // USD fail
      {
        ok: true,
        body: {
          error: [],
          result: { ETHUSDT: { c: ["2300", "1"], o: "2350", v: ["10", "20"] } },
        },
      },
    ]);
    const { getKrakenPrice } = await import("@/lib/kraken");
    const result = await getKrakenPrice("ethereum", "ETH");
    expect(result?.priceUsd).toBe(2300);
  });

  it("retourne null si HTTP 5xx", async () => {
    global.fetch = mockFetchSequence([
      { ok: false, status: 500, body: {} },
      { ok: false, status: 500, body: {} },
      { ok: false, status: 500, body: {} },
    ]);
    const { getKrakenPrice } = await import("@/lib/kraken");
    const result = await getKrakenPrice("bitcoin", "BTC");
    expect(result).toBeNull();
  });
});

describe("coinbase getCoinbasePrice", () => {
  it("retourne le prix pour BTC (BTC-USD)", async () => {
    global.fetch = mockFetchSequence([
      { ok: true, body: { price: "80100.50", volume: "1234.5" } }, // ticker
      { ok: true, body: { open: "81000", last: "80100.50", volume: "1234.5" } }, // stats
    ]);
    const { getCoinbasePrice } = await import("@/lib/coinbase");
    const result = await getCoinbasePrice("BTC");
    expect(result?.priceUsd).toBe(80100.5);
    // change24h = (80100.50 - 81000) / 81000 * 100 = -1.111
    expect(result?.change24h).toBeCloseTo(-1.111, 2);
  });

  it("retourne null si pas de paire match", async () => {
    global.fetch = mockFetchSequence([
      { ok: false, status: 404, body: {} }, // BTC-USD fail
      { ok: false, status: 404, body: {} }, // stats fail
      { ok: false, status: 404, body: {} }, // BTC-USDT fail
      { ok: false, status: 404, body: {} },
      { ok: false, status: 404, body: {} }, // BTC-USDC fail
      { ok: false, status: 404, body: {} },
    ]);
    const { getCoinbasePrice } = await import("@/lib/coinbase");
    const result = await getCoinbasePrice("UNKNOWN_TOKEN_XYZ");
    expect(result).toBeNull();
  });

  it("essaie USDT si USD fail", async () => {
    global.fetch = mockFetchSequence([
      { ok: false, status: 404, body: {} }, // ETH-USD ticker fail
      { ok: false, status: 404, body: {} }, // stats fail
      { ok: true, body: { price: "2280", volume: "100" } }, // ETH-USDT ticker OK
      { ok: true, body: { open: "2300", last: "2280", volume: "100" } },
    ]);
    const { getCoinbasePrice } = await import("@/lib/coinbase");
    const result = await getCoinbasePrice("ETH");
    expect(result?.priceUsd).toBe(2280);
  });

  it("garde change24h=0 si stats endpoint fail", async () => {
    global.fetch = mockFetchSequence([
      { ok: true, body: { price: "80000", volume: "1" } }, // ticker OK
      { ok: false, status: 500, body: {} }, // stats fail
    ]);
    const { getCoinbasePrice } = await import("@/lib/coinbase");
    const result = await getCoinbasePrice("BTC");
    expect(result?.priceUsd).toBe(80000);
    expect(result?.change24h).toBe(0);
  });
});
