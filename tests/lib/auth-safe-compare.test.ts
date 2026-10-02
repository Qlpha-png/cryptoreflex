/**
 * safeCompare / verifyBearer — comparaison en OCTETS (audit 2026-10-02).
 *
 * Avant : longueur comparée en unités UTF-16 puis timingSafeEqual sur des
 * buffers UTF-8 → un header avec un caractère non-ASCII de même longueur JS
 * faisait throw timingSafeEqual (500 au lieu de 401/404).
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { safeCompare, verifyBearer } from "@/lib/auth";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("safeCompare", () => {
  it("égalité stricte", () => {
    expect(safeCompare("abc123", "abc123")).toBe(true);
    expect(safeCompare("abc123", "abc124")).toBe(false);
    expect(safeCompare("abc", "abc123")).toBe(false);
    expect(safeCompare("", "x")).toBe(false);
  });

  it("même longueur JS mais longueur en octets différente → false, sans exception", () => {
    // "é" = 1 unité UTF-16 mais 2 octets UTF-8.
    expect("secrét".length).toBe("secret".length);
    expect(() => safeCompare("secrét", "secret")).not.toThrow();
    expect(safeCompare("secrét", "secret")).toBe(false);
    expect(safeCompare("😀😀", "abcd")).toBe(false);
  });

  it("gère les secrets non-ASCII identiques", () => {
    expect(safeCompare("clé-ü", "clé-ü")).toBe(true);
  });

  it("types inattendus → false", () => {
    expect(safeCompare(undefined as unknown as string, "x")).toBe(false);
    expect(safeCompare("x", null as unknown as string)).toBe(false);
  });
});

describe("verifyBearer avec header non-ASCII", () => {
  it("renvoie false (pas d'exception) pour un header latin-1 de même longueur", () => {
    // Un header HTTP peut porter des octets 0x80-0xFF (décodés en latin-1).
    const headers = new Headers();
    headers.set("authorization", "Bearer s3crét!");
    const req = new Request("https://example.com/api/cron/x", { headers });
    // Même longueur JS que "Bearer s3cret!" : c'est le cas qui faisait throw.
    expect(req.headers.get("authorization")?.length).toBe("Bearer s3cret!".length);
    expect(() => verifyBearer(req, "s3cret!")).not.toThrow();
    expect(verifyBearer(req, "s3cret!")).toBe(false);
  });

  it("accepte toujours le bon secret", () => {
    const headers = new Headers({ authorization: "Bearer s3cret!" });
    const req = new Request("https://example.com/api/cron/x", { headers });
    expect(verifyBearer(req, "s3cret!")).toBe(true);
  });
});
