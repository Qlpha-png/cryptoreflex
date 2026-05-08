/**
 * Tests unitaires `lib/api-keys/format.ts` — génération + parsing tokens B2B.
 *
 * Garantit la stabilité du format `cr_sk_<env>_<keyId>_<secret>` qui est le
 * contrat avec les clients (impossible à changer rétroactivement).
 */

import { describe, expect, it } from "vitest";
import {
  extractBearerToken,
  fingerprintSecret,
  generateApiKeyPair,
  parseSecretKey,
} from "@/lib/api-keys/format";

describe("generateApiKeyPair", () => {
  it("génère une paire valide en mode live", () => {
    const pair = generateApiKeyPair("live");
    expect(pair.public_key).toMatch(/^cr_pk_live_[A-Z0-9]{12}$/);
    expect(pair.secret_raw).toMatch(/^cr_sk_live_[A-Z0-9]{12}_[A-Z0-9]{48}$/);
    expect(pair.secret_prefix.startsWith("cr_sk_live_")).toBe(true);
    expect(pair.key_id).toHaveLength(12);
  });

  it("génère une paire valide en mode sandbox (test)", () => {
    const pair = generateApiKeyPair("sandbox");
    expect(pair.public_key).toMatch(/^cr_pk_test_[A-Z0-9]{12}$/);
    expect(pair.secret_raw).toMatch(/^cr_sk_test_[A-Z0-9]{12}_[A-Z0-9]{48}$/);
  });

  it("alpha clé ID et secret cohérents (parse round-trip)", () => {
    const pair = generateApiKeyPair("live");
    const parsed = parseSecretKey(pair.secret_raw);
    expect(parsed).not.toBeNull();
    expect(parsed!.public_key).toBe(pair.public_key);
    expect(parsed!.key_id).toBe(pair.key_id);
    expect(parsed!.env).toBe("live");
  });

  it("`pair.secret` matche `parseSecretKey(pair.secret_raw).secret` (anti-régression bug 2026-05-08)", () => {
    // Bug critique : à la création on doit hasher `pair.secret`, pas `pair.secret_raw`.
    // À la vérification, `parseSecretKey(rawHeader).secret` retourne EXACTEMENT
    // les 48 chars Crockford. Si on hash autre chose à la création, mismatch
    // silencieux → toute clé créée via dashboard échoue à l'auth.
    for (let i = 0; i < 20; i++) {
      const pair = generateApiKeyPair("live");
      const parsed = parseSecretKey(pair.secret_raw);
      expect(parsed).not.toBeNull();
      expect(parsed!.secret).toBe(pair.secret);
      expect(pair.secret).toHaveLength(48);
    }
  });

  it("génère des clés différentes à chaque appel (entropie)", () => {
    const a = generateApiKeyPair("live");
    const b = generateApiKeyPair("live");
    expect(a.public_key).not.toBe(b.public_key);
    expect(a.secret_raw).not.toBe(b.secret_raw);
  });

  it("n'utilise jamais I, L, O (Crockford 32 chars)", () => {
    // Crockford base32 standard exclut I, L, O (confondus avec 1, 1, 0).
    // Conserve 0 et 1 (lisibles en monospace). Source de vérité :
    // https://www.crockford.com/base32.html
    for (let i = 0; i < 50; i++) {
      const pair = generateApiKeyPair("live");
      // Le préfixe `cr_sk_live_` contient les lettres permises ; on teste
      // uniquement les segments de payload (keyId + secret).
      const parts = pair.secret_raw.split("_");
      const keyId = parts[3];
      const secret = parts[4];
      expect(keyId).not.toMatch(/[ILO]/);
      expect(secret).not.toMatch(/[ILO]/);
    }
  });
});

describe("parseSecretKey", () => {
  it("parse un token valide live", () => {
    const pair = generateApiKeyPair("live");
    const parsed = parseSecretKey(pair.secret_raw);
    expect(parsed).not.toBeNull();
    expect(parsed!.env).toBe("live");
    expect(parsed!.key_id).toBe(pair.key_id);
    expect(parsed!.secret).toHaveLength(48);
  });

  it("parse un token valide sandbox", () => {
    const pair = generateApiKeyPair("sandbox");
    const parsed = parseSecretKey(pair.secret_raw);
    expect(parsed).not.toBeNull();
    expect(parsed!.env).toBe("sandbox");
  });

  it("rejette une string vide", () => {
    expect(parseSecretKey("")).toBeNull();
  });

  it("rejette un token sans préfixe cr_sk_", () => {
    expect(parseSecretKey("sk_live_ABC123_DEF456")).toBeNull();
    expect(parseSecretKey("Bearer cr_sk_live_X_Y")).toBeNull();
  });

  it("rejette un token avec env invalide", () => {
    expect(
      parseSecretKey("cr_sk_prod_ABCDEFGHIJK2_ABCDEFGHIJK2ABCDEFGHIJK2ABCDEFGHIJK2ABCDEFGHIJ"),
    ).toBeNull();
  });

  it("rejette un keyId trop court", () => {
    expect(
      parseSecretKey("cr_sk_live_ABC_ABCDEFGHIJK2ABCDEFGHIJK2ABCDEFGHIJK2ABCDEFGHIJ"),
    ).toBeNull();
  });

  it("rejette un secret trop court", () => {
    expect(parseSecretKey("cr_sk_live_ABCDEFGHIJK2_ABCDEF")).toBeNull();
  });

  it("rejette un token avec caractères Crockford interdits (I, L, O, 0, 1)", () => {
    // Construire un token qui passerait la longueur mais a un I dans le secret.
    const bad = "cr_sk_live_ABCDEFGHIJK2_IIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIII";
    expect(parseSecretKey(bad)).toBeNull();
  });
});

describe("extractBearerToken", () => {
  it("extrait un token Bearer valide", () => {
    expect(extractBearerToken("Bearer abc123")).toBe("abc123");
    expect(extractBearerToken("bearer ABC")).toBe("ABC"); // casse-insensible
  });

  it("trim les espaces autour du token", () => {
    expect(extractBearerToken("Bearer   abc123  ")).toBe("abc123");
  });

  it("retourne null si header absent ou invalide", () => {
    expect(extractBearerToken(null)).toBeNull();
    expect(extractBearerToken("")).toBeNull();
    expect(extractBearerToken("Basic abc")).toBeNull();
    expect(extractBearerToken("Bearer ")).toBeNull();
  });
});

describe("fingerprintSecret", () => {
  it("retourne 16 chars hex stable", () => {
    const fp = fingerprintSecret("test-secret");
    expect(fp).toMatch(/^[0-9a-f]{16}$/);
    expect(fingerprintSecret("test-secret")).toBe(fp);
  });

  it("change si le secret change", () => {
    expect(fingerprintSecret("a")).not.toBe(fingerprintSecret("b"));
  });
});
