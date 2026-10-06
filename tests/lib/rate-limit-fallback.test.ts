/**
 * lib/rate-limit.ts — 06/10/2026 : limiteur mémoire à fenêtre glissante, borné en taille, et repli mémoire quand le
 * KV est saturé (avant : « fail-open », tout passait). fetch simulé, aucun appel réseau.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createRateLimiter, memoryRateLimit, MEMORY_MAX_KEYS, resetMemoryRateLimitForTests } from "@/lib/rate-limit";
import { isKvCircuitOpen, resetKvGuardsForTests } from "@/lib/kv";

const QUOTA = "ERR This database has reached current Fixed plan limits. Please upgrade manually or enable auto upgrade on Upstash Console.";

beforeEach(() => {
  resetMemoryRateLimitForTests();
  resetKvGuardsForTests();
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  resetKvGuardsForTests();
});

describe("memoryRateLimit : fenêtre glissante", () => {
  const W = 60_000;
  const t0 = 1_000 * W; // début de fenêtre aligné

  it("autorise `limit` requêtes puis refuse dans la même fenêtre", () => {
    for (let i = 0; i < 3; i++) expect(memoryRateLimit("t", "1.1.1.1", 3, W, t0 + i).ok).toBe(true);
    const r = memoryRateLimit("t", "1.1.1.1", 3, W, t0 + 10);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.retryAfter).toBeGreaterThanOrEqual(1);
  });

  it("glissante : juste après le changement de fenêtre, la fenêtre précédente pèse encore (pas de rafale double)", () => {
    for (let i = 0; i < 3; i++) memoryRateLimit("t", "2.2.2.2", 3, W, t0 + 50_000 + i);
    // fenêtre suivante, 1 s après : la précédente pèse 98,3 % → 3 × 0,983 = 2,95 < 3 → une seule requête passe
    expect(memoryRateLimit("t", "2.2.2.2", 3, W, t0 + W + 1_000).ok).toBe(true);
    expect(memoryRateLimit("t", "2.2.2.2", 3, W, t0 + W + 1_001).ok).toBe(false);
    // à mi-fenêtre : 3 × 0,5 + 1 = 2,5 < 3 → une de plus passe
    expect(memoryRateLimit("t", "2.2.2.2", 3, W, t0 + W + 30_000).ok).toBe(true);
    expect(memoryRateLimit("t", "2.2.2.2", 3, W, t0 + W + 30_001).ok).toBe(false);
    // deux fenêtres plus tard : tout est oublié
    expect(memoryRateLimit("t", "2.2.2.2", 3, W, t0 + 3 * W).ok).toBe(true);
  });

  it("espaces de noms isolés", () => {
    expect(memoryRateLimit("a", "3.3.3.3", 1, W, t0).ok).toBe(true);
    expect(memoryRateLimit("a", "3.3.3.3", 1, W, t0 + 1).ok).toBe(false);
    expect(memoryRateLimit("b", "3.3.3.3", 1, W, t0 + 2).ok).toBe(true);
  });

  it("borné en taille : au-delà de MEMORY_MAX_KEYS adresses, les plus anciennes sont oubliées", () => {
    expect(memoryRateLimit("borne", "premiere", 1, W, t0).ok).toBe(true);
    expect(memoryRateLimit("borne", "premiere", 1, W, t0 + 1).ok).toBe(false);
    for (let i = 0; i < MEMORY_MAX_KEYS; i++) memoryRateLimit("borne", `ip-${i}`, 1, W, t0 + 2);
    // « premiere » a été évincée (la moins récemment vue) : son compteur repart de zéro
    expect(memoryRateLimit("borne", "premiere", 1, W, t0 + 3).ok).toBe(true);
    // une adresse récente, elle, est toujours comptée
    expect(memoryRateLimit("borne", `ip-${MEMORY_MAX_KEYS - 1}`, 1, W, t0 + 4).ok).toBe(false);
  });
});

describe("createRateLimiter forceKv (amis/social Reflex Cards) avec KV saturé : repli mémoire", () => {
  it("1 seule commande envoyée (refusée), disjoncteur ouvert, puis limite tenue en mémoire sans KV", async () => {
    vi.stubEnv("KV_REST_API_URL", "https://kv.test");
    vi.stubEnv("KV_REST_API_TOKEN", "jeton-de-test");
    vi.stubEnv("VERCEL_ENV", "production");
    resetKvGuardsForTests();
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const f = vi.fn(async () => new Response(JSON.stringify({ error: QUOTA }), { status: 400 }));
    vi.stubGlobal("fetch", f);

    const limiter = createRateLimiter({ limit: 3, windowMs: 60_000, key: "amis-test", forceKv: true });
    const results = [];
    for (let i = 0; i < 6; i++) results.push((await limiter("9.9.9.9")).ok);
    expect(results).toEqual([true, true, true, false, false, false]); // avant : 6 × true (fail-open)
    expect(f).toHaveBeenCalledTimes(1);
    expect(isKvCircuitOpen()).toBe(true);
  });

  it("KV sain : GET + SET par appel (comportement inchangé)", async () => {
    vi.stubEnv("KV_REST_API_URL", "https://kv.test");
    vi.stubEnv("KV_REST_API_TOKEN", "jeton-de-test");
    vi.stubEnv("VERCEL_ENV", "production");
    resetKvGuardsForTests();
    const store = new Map<string, string>();
    const f = vi.fn(async (url: string, init: RequestInit = {}) => {
      if (init.method === "POST") {
        const [, k, v] = JSON.parse(String(init.body)) as string[];
        store.set(k, v);
        return new Response(JSON.stringify({ result: "OK" }));
      }
      const key = decodeURIComponent(url.split("/").pop() ?? "");
      return new Response(JSON.stringify({ result: store.get(key) ?? null }));
    });
    vi.stubGlobal("fetch", f);
    const limiter = createRateLimiter({ limit: 2, windowMs: 60_000, key: "social-test", forceKv: true });
    expect((await limiter("8.8.8.8")).ok).toBe(true);
    expect((await limiter("8.8.8.8")).ok).toBe(true);
    expect((await limiter("8.8.8.8")).ok).toBe(false);
    expect(f).toHaveBeenCalledTimes(5); // 2 × (GET + SET) + 1 GET refusé
  });

  it("limiteur par défaut (sans forceKv) : mémoire, zéro commande KV", async () => {
    const f = vi.fn();
    vi.stubGlobal("fetch", f);
    const limiter = createRateLimiter({ limit: 1, windowMs: 60_000, key: "form-test" });
    expect((await limiter("7.7.7.7")).ok).toBe(true);
    expect((await limiter("7.7.7.7")).ok).toBe(false);
    expect(f).not.toHaveBeenCalled();
  });
});
