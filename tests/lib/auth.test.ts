import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { verifyBearer } from "@/lib/auth";

/**
 * Tests unitaires lib/auth.ts — bearer auth des cron jobs et endpoints internes.
 *
 * Critique car protège tous les /api/cron/* et /api/revalidate. Une régression
 * = endpoints publics ouverts en prod.
 */

function makeReq(authHeader?: string): Request {
  const headers = new Headers();
  if (authHeader) headers.set("authorization", authHeader);
  return new Request("https://example.com/api/test", { headers });
}

describe("verifyBearer", () => {
  afterEach(() => {
    // Restore env + mocks après chaque test
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  describe("avec secret défini", () => {
    it("accepte un Bearer token correct", () => {
      const req = makeReq("Bearer my-secret-123");
      expect(verifyBearer(req, "my-secret-123")).toBe(true);
    });

    it("rejette un Bearer token incorrect", () => {
      const req = makeReq("Bearer wrong-secret");
      expect(verifyBearer(req, "my-secret-123")).toBe(false);
    });

    it("rejette une header missing", () => {
      const req = makeReq();
      expect(verifyBearer(req, "my-secret-123")).toBe(false);
    });

    it("rejette une header sans préfixe Bearer", () => {
      const req = makeReq("my-secret-123");
      expect(verifyBearer(req, "my-secret-123")).toBe(false);
    });

    it("rejette une longueur différente sans crash (timing-safe)", () => {
      const req = makeReq("Bearer short");
      // Ne doit pas throw même si les longueurs diffèrent (timingSafeEqual throw sinon)
      expect(() => verifyBearer(req, "my-much-longer-secret")).not.toThrow();
      expect(verifyBearer(req, "my-much-longer-secret")).toBe(false);
    });
  });

  describe("sans secret (env CRON_SECRET manquant)", () => {
    it("autorise en mode dev (NODE_ENV !== production)", () => {
      vi.stubEnv("NODE_ENV", "development");
      const req = makeReq("Bearer anything");
      expect(verifyBearer(req, undefined)).toBe(true);
    });

    it("autorise en mode test (NODE_ENV !== production)", () => {
      vi.stubEnv("NODE_ENV", "test");
      expect(verifyBearer(makeReq(), undefined)).toBe(true);
    });

    it("REFUSE en production avec log d'erreur (regression test P1 audit)", () => {
      vi.stubEnv("NODE_ENV", "production");
      const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      const req = makeReq("Bearer anything");

      expect(verifyBearer(req, undefined)).toBe(false);
      expect(errorSpy).toHaveBeenCalledWith(
        expect.stringContaining("SECRET MANQUANT"),
      );
    });

    it("REFUSE en production avec secret vide string", () => {
      vi.stubEnv("NODE_ENV", "production");
      vi.spyOn(console, "error").mockImplementation(() => {});
      expect(verifyBearer(makeReq("Bearer x"), "")).toBe(false);
    });
  });

  describe("timing-safe behavior", () => {
    it("compare avec crypto.timingSafeEqual quand longueurs égales", () => {
      // Ce test vérifie qu'on n'utilise pas un === simple (vulnérable au timing).
      // On ne peut pas vérifier directement le timing dans un test unitaire,
      // mais on peut vérifier que la fonction se comporte correctement avec
      // des inputs de même longueur mais valeurs différentes.
      const req = makeReq("Bearer aaaaaaaaaaaaaaaa");
      expect(verifyBearer(req, "bbbbbbbbbbbbbbbb")).toBe(false);
    });
  });
});
