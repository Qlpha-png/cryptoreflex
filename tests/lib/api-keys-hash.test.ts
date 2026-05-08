/**
 * Tests unitaires `lib/api-keys/hash.ts` — scrypt + pepper hashing des secrets.
 *
 * Garantit :
 *   - hashSecret produit un format `scrypt$N$r$p$salt$key`
 *   - verifySecret roundtrip
 *   - rotation de pepper (multi-pepper env)
 *   - sel unique à chaque hash (pas de hash déterministe)
 *   - rejette un hash mal formé / un secret faux
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("hashSecret + verifySecret", () => {
  beforeEach(async () => {
    // Pepper de test stable. Module re-importé pour avoir la nouvelle env.
    vi.stubEnv("API_KEY_PEPPER", "test-pepper-1");
    vi.resetModules();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("hash produit un format scrypt$N$r$p$salt$key", async () => {
    const { hashSecret } = await import("@/lib/api-keys/hash");
    const hash = await hashSecret("my-secret");
    const parts = hash.split("$");
    expect(parts[0]).toBe("scrypt");
    expect(Number(parts[1])).toBeGreaterThan(0);
    expect(parts.length).toBe(6);
  });

  it("verify accepte le secret correct", async () => {
    const { hashSecret, verifySecret } = await import("@/lib/api-keys/hash");
    const hash = await hashSecret("my-secret");
    const v = await verifySecret("my-secret", hash);
    expect(v.ok).toBe(true);
    expect(v.peppered_with).toBe(0);
  });

  it("verify rejette un secret faux", async () => {
    const { hashSecret, verifySecret } = await import("@/lib/api-keys/hash");
    const hash = await hashSecret("my-secret");
    const v = await verifySecret("not-the-secret", hash);
    expect(v.ok).toBe(false);
  });

  it("hash deux fois le même secret produit deux hashes différents (sel)", async () => {
    const { hashSecret } = await import("@/lib/api-keys/hash");
    const a = await hashSecret("same");
    const b = await hashSecret("same");
    expect(a).not.toBe(b);
  });

  it("verify rejette un hash mal formé", async () => {
    const { verifySecret } = await import("@/lib/api-keys/hash");
    expect((await verifySecret("any", "garbage")).ok).toBe(false);
    expect((await verifySecret("any", "")).ok).toBe(false);
    expect((await verifySecret("any", "scrypt$abc$def")).ok).toBe(false);
  });
}, 60_000);

describe("pepper rotation (multi-pepper env)", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("verify accepte un hash signé avec un ancien pepper après rotation", async () => {
    // Étape 1 : hash avec pepper A
    vi.stubEnv("API_KEY_PEPPER", "pepperA");
    vi.resetModules();
    const { hashSecret } = await import("@/lib/api-keys/hash");
    const hashA = await hashSecret("client-secret");

    // Étape 2 : rotation → nouveau pepper en tête, ancien conservé
    vi.stubEnv("API_KEY_PEPPER", "pepperB,pepperA");
    vi.resetModules();
    const { verifySecret } = await import("@/lib/api-keys/hash");
    const v = await verifySecret("client-secret", hashA);
    expect(v.ok).toBe(true);
    // peppered_with > 0 = signal pour re-hash en background
    expect(v.peppered_with).toBe(1);
  });

  it("après rotation, les nouveaux hashes utilisent le pepper courant (peppered_with=0)", async () => {
    vi.stubEnv("API_KEY_PEPPER", "pepperB,pepperA");
    vi.resetModules();
    const { hashSecret, verifySecret } = await import("@/lib/api-keys/hash");
    const newHash = await hashSecret("fresh-secret");
    const v = await verifySecret("fresh-secret", newHash);
    expect(v.ok).toBe(true);
    expect(v.peppered_with).toBe(0);
  });

  it("verify rejette si le pepper utilisé à l'écriture est purgé", async () => {
    vi.stubEnv("API_KEY_PEPPER", "pepperOld");
    vi.resetModules();
    const { hashSecret } = await import("@/lib/api-keys/hash");
    const hashOld = await hashSecret("legacy-secret");

    // Pepper rotaté SANS conserver l'ancien → la verif doit échouer
    vi.stubEnv("API_KEY_PEPPER", "pepperNew");
    vi.resetModules();
    const { verifySecret } = await import("@/lib/api-keys/hash");
    const v = await verifySecret("legacy-secret", hashOld);
    expect(v.ok).toBe(false);
  });
}, 60_000);
