/**
 * fetchHistoricalPrices — un historique VIDE n'est jamais mis en cache (04/10/2026) : la fonction interne lève quand la
 * série est vide (unstable_cache ne mémorise pas une erreur), la fonction publique rend [] (contrat inchangé).
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const H = vi.hoisted(() => ({ calls: 0, cacheHits: new Map<string, unknown>() }));
/* unstable_cache simulé : mémorise les résultats, jamais les erreurs (comportement Next) */
vi.mock("next/cache", () => ({
  unstable_cache: (fn: (...a: unknown[]) => Promise<unknown>, keys: string[]) => async (...args: unknown[]) => {
    const k = keys.join("|") + "|" + JSON.stringify(args);
    if (H.cacheHits.has(k)) return H.cacheHits.get(k);
    const v = await fn(...args);
    H.cacheHits.set(k, v);
    return v;
  },
  revalidateTag: vi.fn(),
  revalidatePath: vi.fn(),
}));

const realFetch = globalThis.fetch;
beforeEach(() => { H.calls = 0; H.cacheHits.clear(); });
afterEach(() => { globalThis.fetch = realFetch; });

describe("fetchHistoricalPrices et séries vides", () => {
  it("toutes les sources échouent → [] rendu, rien en cache, l'appel suivant réessaie", async () => {
    globalThis.fetch = vi.fn(async () => { H.calls++; return new Response("rate limited", { status: 429 }); }) as unknown as typeof fetch;
    const { fetchHistoricalPrices } = await import("@/lib/historical-prices");
    const a = await fetchHistoricalPrices("bitcoin", 365);
    expect(a).toEqual([]);
    expect(H.cacheHits.size).toBe(0); // le vide n'a pas été mémorisé
    const callsAfterFirst = H.calls;
    expect(callsAfterFirst).toBeGreaterThan(0);
    const b = await fetchHistoricalPrices("bitcoin", 365);
    expect(b).toEqual([]);
    expect(H.calls).toBeGreaterThan(callsAfterFirst); // nouvel essai réseau, pas un vide resservi
  });
  it("une série non vide est mémorisée : le 2e appel ne refait aucune requête", async () => {
    /* bougies se terminant aujourd'hui : une série dont la dernière bougie a plus de 3 jours est refusée (paire retirée) */
    const klines = Array.from({ length: 40 }, (_, i) => [Date.now() - (39 - i) * 86_400_000, "1", "1", "1", String(100 + i), "0", 0, "0"]);
    globalThis.fetch = vi.fn(async (url: string | URL | Request) => {
      H.calls++;
      const u = String(url);
      if (/binance/.test(u) && /klines/.test(u)) return new Response(JSON.stringify(klines), { status: 200, headers: { "content-type": "application/json" } });
      return new Response("{}", { status: 404 });
    }) as unknown as typeof fetch;
    const { fetchHistoricalPrices } = await import("@/lib/historical-prices");
    const a = await fetchHistoricalPrices("bitcoin", 365);
    expect(a.length).toBeGreaterThanOrEqual(30);
    expect(H.cacheHits.size).toBe(1);
    const n = H.calls;
    const b = await fetchHistoricalPrices("bitcoin", 365);
    expect(b.length).toBe(a.length);
    expect(H.calls).toBe(n);
  });
});
