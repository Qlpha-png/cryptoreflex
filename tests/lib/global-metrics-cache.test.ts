/**
 * Métriques globales (07/10/2026) : un échec n'est JAMAIS mis en cache. Scénario réel du déploiement A4 : pendant
 * `next build`, CoinMarketCap est coupé et CoinGecko répond 429 → la v1 gardait ce null 30 min et /marche perdait
 * ses 4 cartes. unstable_cache est simulé comme le Data Cache de Next : une valeur rendue est gardée, une erreur levée
 * ne l'est pas, et la valeur gardée est resservie.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const store = vi.hoisted(() => new Map<string, unknown>());
vi.mock("next/cache", () => ({
  unstable_cache:
    <T extends (...args: unknown[]) => Promise<unknown>>(fn: T, keyParts: string[]) =>
    async (...args: unknown[]) => {
      const key = JSON.stringify([keyParts, args]);
      if (store.has(key)) return store.get(key);
      const v = await fn(...args); // une erreur levée remonte sans rien écrire
      store.set(key, v);
      return v;
    },
  revalidateTag: vi.fn(),
}));

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
let urls: string[] = [];
function mockFetch(handler: (url: string) => Response) {
  urls = [];
  globalThis.fetch = vi.fn(async (input: string | URL | Request) => {
    const u = String(input);
    urls.push(u);
    return handler(u);
  }) as unknown as typeof fetch;
}
const cmcGlobal = () =>
  json({
    status: { error_code: 0, credit_count: 1 },
    data: {
      btc_dominance: 57.2,
      eth_dominance: 11.4,
      active_cryptocurrencies: 9000,
      quote: { USD: { total_market_cap: 3.9e12, total_volume_24h: 1.2e11, total_market_cap_yesterday_percentage_change: -0.8 } },
    },
  });

const realFetch = globalThis.fetch;
beforeEach(() => {
  vi.resetModules();
  store.clear();
  process.env.CMC_API_KEY = "cle-factice-de-test";
  vi.spyOn(console, "warn").mockImplementation(() => undefined);
});
afterEach(() => {
  globalThis.fetch = realFetch;
  delete process.env.CMC_API_KEY;
  delete process.env.NEXT_PHASE;
  vi.restoreAllMocks();
});

describe("métriques globales : l'échec du build n'est pas gardé", () => {
  it("build sans source → null ; première régénération à l'exécution → CoinMarketCap (pas le null du build)", async () => {
    const { fetchGlobalMetrics } = await import("@/lib/coingecko");

    process.env.NEXT_PHASE = "phase-production-build";
    mockFetch(() => json({ status: { error_code: 429 } }, 429));
    expect(await fetchGlobalMetrics()).toBeNull();
    expect(urls.some((u) => u.includes("coinmarketcap.com"))).toBe(false);
    expect(store.size).toBe(0);

    delete process.env.NEXT_PHASE;
    mockFetch((u) => (u.includes("/v1/global-metrics/quotes/latest") ? cmcGlobal() : json({}, 404)));
    const g = await fetchGlobalMetrics();
    expect(g?.source).toBe("coinmarketcap");
    expect(g?.totalMarketCapUsd).toBe(3.9e12);
    expect(g?.btcDominance).toBe(57.2);
  });

  it("relevé réussi puis toutes les sources en panne → le relevé réussi reste servi", async () => {
    const { fetchGlobalMetrics } = await import("@/lib/coingecko");
    mockFetch((u) => (u.includes("/v1/global-metrics/quotes/latest") ? cmcGlobal() : json({}, 404)));
    expect((await fetchGlobalMetrics())?.totalMarketCapUsd).toBe(3.9e12);

    mockFetch(() => {
      throw new TypeError("fetch failed");
    });
    expect((await fetchGlobalMetrics())?.totalMarketCapUsd).toBe(3.9e12);
  });
});
