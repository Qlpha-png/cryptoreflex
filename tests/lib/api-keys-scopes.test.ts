/**
 * Tests unitaires `lib/api-keys/scopes.ts` — frontière de sécurité B2B.
 *
 * Ces tests sont CRITIQUES : une régression = un endpoint accessible sans le
 * scope requis = leak de données utilisateur.
 */

import { describe, expect, it } from "vitest";
import {
  ALL_SCOPES,
  DEFAULT_SCOPES_BY_TIER,
  FORBIDDEN_SCOPES_BY_TIER,
  hasAllScopes,
  hasScope,
  sanitizeScopes,
} from "@/lib/api-keys/scopes";

describe("hasScope", () => {
  it("accepte un scope explicite présent", () => {
    expect(hasScope(["public:read", "user:portfolio:read"], "user:portfolio:read")).toBe(true);
  });

  it("rejette un scope absent", () => {
    expect(hasScope(["public:read"], "user:portfolio:read")).toBe(false);
  });

  it("admin:* est un wildcard universel", () => {
    expect(hasScope(["admin:*"], "user:portfolio:read")).toBe(true);
    expect(hasScope(["admin:*"], "webhooks:manage")).toBe(true);
    expect(hasScope(["admin:*"], "historical:read")).toBe(true);
  });

  it("user:portfolio:read NE donne PAS user:portfolio:write", () => {
    expect(hasScope(["user:portfolio:read"], "user:portfolio:write")).toBe(false);
  });

  it("user:* sans suffixe explicite ne couvre pas le sub-scope", () => {
    // admin:* est le seul wildcard. user:* n'existe pas.
    expect(hasScope([], "user:portfolio:read")).toBe(false);
  });
});

describe("hasAllScopes", () => {
  it("accepte si tous les scopes requis sont présents", () => {
    expect(
      hasAllScopes(
        ["public:read", "user:portfolio:read", "user:trades:read"],
        ["user:portfolio:read", "user:trades:read"],
      ),
    ).toBe(true);
  });

  it("rejette si UN scope est absent", () => {
    expect(
      hasAllScopes(["public:read", "user:portfolio:read"], [
        "user:portfolio:read",
        "user:trades:read",
      ]),
    ).toBe(false);
  });

  it("admin:* satisfait toujours", () => {
    expect(hasAllScopes(["admin:*"], ["user:trades:write", "webhooks:manage"])).toBe(true);
  });

  it("liste vide de requirements = toujours true", () => {
    expect(hasAllScopes([], [])).toBe(true);
  });
});

describe("DEFAULT_SCOPES_BY_TIER", () => {
  it("sandbox a des scopes restreints (lecture only)", () => {
    const s = DEFAULT_SCOPES_BY_TIER.sandbox;
    expect(s).toContain("public:read");
    expect(s).toContain("user:portfolio:read");
    expect(s).not.toContain("user:portfolio:write");
    expect(s).not.toContain("user:trades:write");
    expect(s).not.toContain("admin:*");
  });

  it("b2b_starter inclut webhooks:manage mais pas historical:read", () => {
    const s = DEFAULT_SCOPES_BY_TIER.b2b_starter;
    expect(s).toContain("webhooks:manage");
    expect(s).not.toContain("historical:read");
    expect(s).not.toContain("admin:*");
  });

  it("b2b_pro inclut historical:read", () => {
    const s = DEFAULT_SCOPES_BY_TIER.b2b_pro;
    expect(s).toContain("historical:read");
    expect(s).toContain("user:trades:write");
    expect(s).not.toContain("admin:*");
  });

  it("b2b_enterprise n'inclut PAS admin:* par défaut", () => {
    const s = DEFAULT_SCOPES_BY_TIER.b2b_enterprise;
    expect(s).not.toContain("admin:*");
  });
});

describe("FORBIDDEN_SCOPES_BY_TIER", () => {
  it("sandbox interdit toute écriture user:* + admin:*", () => {
    const f = FORBIDDEN_SCOPES_BY_TIER.sandbox;
    expect(f).toContain("admin:*");
    expect(f).toContain("user:portfolio:write");
    expect(f).toContain("user:trades:write");
    expect(f).toContain("user:alerts:write");
  });

  it("tous les tiers interdisent admin:* (jamais via subscription Stripe)", () => {
    expect(FORBIDDEN_SCOPES_BY_TIER.sandbox).toContain("admin:*");
    expect(FORBIDDEN_SCOPES_BY_TIER.b2b_starter).toContain("admin:*");
    expect(FORBIDDEN_SCOPES_BY_TIER.b2b_pro).toContain("admin:*");
    expect(FORBIDDEN_SCOPES_BY_TIER.b2b_enterprise).toContain("admin:*");
  });
});

describe("sanitizeScopes", () => {
  it("retire les scopes invalides", () => {
    const out = sanitizeScopes(["public:read", "fake:scope", "user:portfolio:read"], "b2b_pro");
    expect(out).toEqual(["public:read", "user:portfolio:read"]);
  });

  it("retire les scopes interdits par tier (sandbox)", () => {
    const out = sanitizeScopes(
      ["public:read", "user:trades:write", "admin:*"],
      "sandbox",
    );
    expect(out).toEqual(["public:read"]);
  });

  it("conserve l'ordre demandé", () => {
    const out = sanitizeScopes(
      ["user:portfolio:read", "public:read", "user:trades:read"],
      "b2b_pro",
    );
    expect(out).toEqual(["user:portfolio:read", "public:read", "user:trades:read"]);
  });

  it("ne dédoublonne pas (caller's responsibility)", () => {
    const out = sanitizeScopes(["public:read", "public:read"], "b2b_pro");
    expect(out).toEqual(["public:read", "public:read"]);
  });
});

describe("ALL_SCOPES inventory", () => {
  it("contient les 10 scopes documentés (incl admin:*)", () => {
    expect(ALL_SCOPES.length).toBe(10);
  });

  it("admin:* en dernier (convention)", () => {
    expect(ALL_SCOPES[ALL_SCOPES.length - 1]).toBe("admin:*");
  });
});
