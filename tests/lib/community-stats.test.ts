/**
 * Tests unitaires lib/community-stats.ts — robustesse au build.
 *
 * Garanties à protéger (audit Kev Phase 4 — 19/05/2026) :
 *   - getCommunityStatsSafe NE THROW JAMAIS, quel que soit l'état Supabase / KV.
 *   - Si Supabase indispo (null client) → fallback `earlyAccess:true`.
 *   - Si query Supabase retourne une erreur → fallback `earlyAccess:true`.
 *   - Si timeout dépassé → fallback (jamais bloquer un render SSG).
 *   - Aucun secret n'est jamais loggé / inclus dans le payload de retour.
 *
 * Le module ne doit JAMAIS faire crasher le build SSG, sinon on retombe
 * dans l'incident Phase 3 (build fail 297/1191 pages Coolify).
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/* -------------------------------------------------------------------------- */
/*  Mocks : on intercepte les deps externes pour rester pur (vitest 'node')   */
/* -------------------------------------------------------------------------- */

// Variables locales pour piloter le comportement des mocks par test.
let supabaseClientResult: unknown = null;
let kvKeysResult: string[] | Error = [];

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServiceRoleClient: () => supabaseClientResult,
}));

vi.mock("@/lib/kv", () => ({
  getKv: () => ({
    keys: async (_pattern: string) => {
      if (kvKeysResult instanceof Error) throw kvKeysResult;
      return kvKeysResult;
    },
  }),
}));

/* -------------------------------------------------------------------------- */
/*  Helpers de construction du fake client Supabase                            */
/* -------------------------------------------------------------------------- */

interface FakeQueryResult {
  count: number | null;
  error: { message: string } | null;
}

function makeFakeSupabaseClient(
  proResult: FakeQueryResult,
  newProResult: FakeQueryResult,
) {
  // Le code lib chaîne `.from().select().in().or()` pour proCount, et
  // `.from().select().in().gte()` pour newProThisMonth. Les méthodes
  // intermédiaires retournent un thenable qui résout à `proResult`/`newProResult`
  // selon que `.gte` a été appelée ou non.
  let calls = 0;
  const makeChain = (final: FakeQueryResult) => {
    const chain = {
      select: () => chain,
      in: () => chain,
      or: () => Promise.resolve(final),
      gte: () => Promise.resolve(final),
    };
    return chain;
  };
  return {
    from: () => {
      calls++;
      return calls === 1 ? makeChain(proResult) : makeChain(newProResult);
    },
  };
}

/* -------------------------------------------------------------------------- */
/*  Tests                                                                     */
/* -------------------------------------------------------------------------- */

// Import APRÈS les vi.mock pour que les mocks soient pris en compte.
async function importLib() {
  // Reset modules pour que vi.mock soit appliqué fraîchement à chaque suite.
  vi.resetModules();
  return await import("@/lib/community-stats");
}

let consoleWarnSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  // Silencer console.warn pour ne pas polluer la sortie test.
  consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
});

afterEach(() => {
  consoleWarnSpy.mockRestore();
  supabaseClientResult = null;
  kvKeysResult = [];
});

describe("buildFallbackStats", () => {
  it("retourne la shape complète avec earlyAccess + fallback à true", async () => {
    const { buildFallbackStats } = await importLib();
    const stats = buildFallbackStats();
    expect(stats.proCount).toBe(0);
    expect(stats.newProThisMonth).toBe(0);
    expect(stats.alertsTriggered7d).toBe(0);
    expect(stats.fallback).toBe(true);
    expect(stats.earlyAccess).toBe(true);
    expect(typeof stats.generatedAt).toBe("string");
    expect(new Date(stats.generatedAt).toString()).not.toBe("Invalid Date");
  });
});

describe("getCommunityStatsSafe — Supabase indisponible", () => {
  it("retourne fallback si createSupabaseServiceRoleClient retourne null (env manquante)", async () => {
    supabaseClientResult = null;
    const { getCommunityStatsSafe } = await importLib();
    const stats = await getCommunityStatsSafe();
    expect(stats.fallback).toBe(true);
    expect(stats.earlyAccess).toBe(true);
    expect(stats.proCount).toBe(0);
  });

  it("retourne fallback si query Supabase retourne une erreur (RLS, etc.)", async () => {
    supabaseClientResult = makeFakeSupabaseClient(
      { count: null, error: { message: "RLS denied" } },
      { count: null, error: null },
    );
    const { getCommunityStatsSafe } = await importLib();
    const stats = await getCommunityStatsSafe();
    expect(stats.fallback).toBe(true);
    expect(stats.earlyAccess).toBe(true);
  });

  it("retourne fallback si .from() throw (Supabase totalement down)", async () => {
    supabaseClientResult = {
      from: () => {
        throw new Error("Network unreachable");
      },
    };
    const { getCommunityStatsSafe } = await importLib();
    const stats = await getCommunityStatsSafe();
    expect(stats.fallback).toBe(true);
    expect(stats.earlyAccess).toBe(true);
  });
});

describe("getCommunityStatsSafe — données réelles", () => {
  it("retourne les vrais chiffres quand Supabase répond OK", async () => {
    supabaseClientResult = makeFakeSupabaseClient(
      { count: 42, error: null },
      { count: 7, error: null },
    );
    const { getCommunityStatsSafe } = await importLib();
    const stats = await getCommunityStatsSafe();
    expect(stats.fallback).toBe(false);
    expect(stats.proCount).toBe(42);
    expect(stats.newProThisMonth).toBe(7);
  });

  it("flag earlyAccess true si tous les chiffres sont à 0 (DB fraîche)", async () => {
    supabaseClientResult = makeFakeSupabaseClient(
      { count: 0, error: null },
      { count: 0, error: null },
    );
    kvKeysResult = []; // 0 alertes
    const { getCommunityStatsSafe } = await importLib();
    const stats = await getCommunityStatsSafe();
    expect(stats.fallback).toBe(false);
    expect(stats.earlyAccess).toBe(true);
  });

  it("earlyAccess reste false dès qu'au moins 1 chiffre > 0", async () => {
    supabaseClientResult = makeFakeSupabaseClient(
      { count: 1, error: null },
      { count: 0, error: null },
    );
    const { getCommunityStatsSafe } = await importLib();
    const stats = await getCommunityStatsSafe();
    expect(stats.earlyAccess).toBe(false);
    expect(stats.proCount).toBe(1);
  });
});

describe("getCommunityStatsSafe — timeout & KV", () => {
  it("retourne fallback si timeout dépassé (build ne se bloque jamais)", async () => {
    // Fake client qui ne résout jamais (simule un Supabase lent).
    supabaseClientResult = {
      from: () => {
        const chain = {
          select: () => chain,
          in: () => chain,
          or: () => new Promise(() => {}),
          gte: () => new Promise(() => {}),
        };
        return chain;
      },
    };
    const { getCommunityStatsSafe } = await importLib();
    const stats = await getCommunityStatsSafe(50); // 50 ms timeout
    expect(stats.fallback).toBe(true);
    expect(stats.earlyAccess).toBe(true);
  });

  it("KV qui throw n'empêche pas le succès Supabase (alerts=0 par fallback interne)", async () => {
    supabaseClientResult = makeFakeSupabaseClient(
      { count: 10, error: null },
      { count: 2, error: null },
    );
    kvKeysResult = new Error("KV unreachable");
    const { getCommunityStatsSafe } = await importLib();
    const stats = await getCommunityStatsSafe();
    expect(stats.fallback).toBe(false);
    expect(stats.proCount).toBe(10);
    expect(stats.alertsTriggered7d).toBe(0);
  });
});

describe("normalizeCommunityStats", () => {
  it("retourne fallback complet pour input non-objet", async () => {
    const { normalizeCommunityStats } = await importLib();
    expect(normalizeCommunityStats(null).fallback).toBe(true);
    expect(normalizeCommunityStats(undefined).fallback).toBe(true);
    expect(normalizeCommunityStats("hello").fallback).toBe(true);
    expect(normalizeCommunityStats(42).fallback).toBe(true);
  });

  it("retourne fallback si chiffres manquants / invalides", async () => {
    const { normalizeCommunityStats } = await importLib();
    const stats = normalizeCommunityStats({ proCount: "not a number" });
    expect(stats.proCount).toBe(0);
    expect(stats.newProThisMonth).toBe(0);
    expect(stats.alertsTriggered7d).toBe(0);
  });

  it("préserve les chiffres valides + flags explicites", async () => {
    const { normalizeCommunityStats } = await importLib();
    const stats = normalizeCommunityStats({
      proCount: 12,
      newProThisMonth: 3,
      alertsTriggered7d: 25,
      fallback: false,
      earlyAccess: false,
      generatedAt: "2026-05-19T18:00:00.000Z",
    });
    expect(stats.proCount).toBe(12);
    expect(stats.newProThisMonth).toBe(3);
    expect(stats.alertsTriggered7d).toBe(25);
    expect(stats.fallback).toBe(false);
    expect(stats.earlyAccess).toBe(false);
    expect(stats.generatedAt).toBe("2026-05-19T18:00:00.000Z");
  });

  it("rejette les chiffres négatifs et non-finis", async () => {
    const { normalizeCommunityStats } = await importLib();
    const stats = normalizeCommunityStats({
      proCount: -10,
      newProThisMonth: NaN,
      alertsTriggered7d: Infinity,
    });
    expect(stats.proCount).toBe(0);
    expect(stats.newProThisMonth).toBe(0);
    expect(stats.alertsTriggered7d).toBe(0);
  });
});
