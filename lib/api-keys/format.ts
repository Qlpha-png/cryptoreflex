/**
 * lib/api-keys/format.ts — Génération + parsing des tokens B2B (modèle Stripe).
 *
 * Format final :
 *   cr_sk_live_<keyId>_<secret>   (clé secrète, partagée 1× au user)
 *   cr_pk_live_<keyId>            (clé publique, lookup index dans DB)
 *
 * - `live` ou `test` (sandbox) — préfixe d'environnement
 * - `keyId` : 12 caractères Crockford base32 (charset 32 chars, exclut I/L/O)
 * - `secret` : 48 caractères même charset (~240 bits d'entropie effective)
 *
 * Rationale du choix :
 *   - Le préfixe `cr_sk_` permet aux secret-scanners (GitHub Push Protection,
 *     Truffleog) de détecter une fuite. Pattern documenté dans la doc dev.
 *   - `keyId` permet le lookup O(1) via `SELECT WHERE public_key = ...` sans
 *     scanner toute la table à chaque appel.
 *   - 256 bits d'entropie sur le `secret` largement supra ANSSI (>= 128 bits).
 *
 * Tout est fait avec `node:crypto` standard (no deps externes).
 */

import { randomBytes, createHash } from "node:crypto";

const ENV_PREFIX = {
  sandbox: "test",
  live: "live",
} as const;

export type ApiKeyEnv = keyof typeof ENV_PREFIX;

/** Charset Crockford base32 — pas de I/L/O/0/1, casse-insensible. */
const CROCKFORD = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";

/** Encode des bytes en Crockford base32 sans padding. */
function encodeCrockford(buf: Buffer, length: number): string {
  // Conversion bit à bit (5 bits par caractère).
  const bits: number[] = [];
  for (const byte of buf) {
    for (let i = 7; i >= 0; i--) bits.push((byte >> i) & 1);
  }
  let out = "";
  for (let i = 0; i < bits.length; i += 5) {
    const slice = bits.slice(i, i + 5);
    if (slice.length < 5) break;
    let v = 0;
    for (const b of slice) v = (v << 1) | b;
    out += CROCKFORD[v];
    if (out.length === length) break;
  }
  return out;
}

/** Génère une nouvelle paire (publique, secrète, secret raw). Single source of truth. */
export function generateApiKeyPair(env: ApiKeyEnv = "live"): {
  public_key: string;
  secret_raw: string;
  secret_prefix: string;
  key_id: string;
} {
  const envSlug = ENV_PREFIX[env];
  // 12 chars * 5 bits = 60 bits — assez pour ne jamais collisionner sur N <= 10M clés.
  const keyId = encodeCrockford(randomBytes(8), 12);
  // 48 chars * 5 bits = 240 bits d'entropie effective (256 bits raw → 240 utilisables).
  const secret = encodeCrockford(randomBytes(32), 48);
  const public_key = `cr_pk_${envSlug}_${keyId}`;
  const secret_raw = `cr_sk_${envSlug}_${keyId}_${secret}`;
  // Préfixe affiché en UI après affichage initial : `cr_sk_live_a3f9k2…`
  const secret_prefix = `cr_sk_${envSlug}_${keyId.slice(0, 6)}…`;
  return { public_key, secret_raw, secret_prefix, key_id: keyId };
}

/**
 * Parse un Bearer token brut → composantes. Retourne null si format invalide.
 *
 * Strict :
 *   - 4 segments séparés par `_` après le prefix `cr_sk_`
 *   - env ∈ {live, test}
 *   - keyId 12 chars Crockford
 *   - secret 48 chars Crockford
 *
 * Note : on N'AUTHENTIFIE PAS ici, on parse uniquement.
 */
export function parseSecretKey(raw: string): {
  env: ApiKeyEnv;
  key_id: string;
  secret: string;
  public_key: string;
} | null {
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim();
  if (!trimmed.startsWith("cr_sk_")) return null;

  // Format attendu : cr_sk_<env>_<keyId>_<secret>
  // .split('_') → ['cr', 'sk', env, keyId, secret]
  const parts = trimmed.split("_");
  if (parts.length !== 5) return null;
  const [, , envSlug, keyId, secret] = parts;
  if (envSlug !== "live" && envSlug !== "test") return null;
  if (!isCrockford(keyId, 12)) return null;
  if (!isCrockford(secret, 48)) return null;
  const env: ApiKeyEnv = envSlug === "live" ? "live" : "sandbox";
  return {
    env,
    key_id: keyId,
    secret,
    public_key: `cr_pk_${envSlug}_${keyId}`,
  };
}

/** Vérifie que le string n'utilise que le charset Crockford et a la bonne longueur. */
function isCrockford(s: string, expectedLength: number): boolean {
  if (s.length !== expectedLength) return false;
  for (const c of s.toUpperCase()) {
    if (!CROCKFORD.includes(c)) return false;
  }
  return true;
}

/**
 * SHA-256 lookup hash — utilisé en complément de bcrypt pour rate-limiter par
 * token (sans exposer le secret). Pas un substitut au bcrypt sur secret_hash.
 */
export function fingerprintSecret(secret: string): string {
  return createHash("sha256").update(secret).digest("hex").slice(0, 16);
}

/**
 * Extrait le Bearer token de l'header Authorization. Tolérant aux variantes
 * de casse, refuse les tokens vides.
 */
export function extractBearerToken(authHeader: string | null): string | null {
  if (!authHeader) return null;
  const match = /^Bearer\s+(.+)$/i.exec(authHeader.trim());
  if (!match) return null;
  const token = match[1].trim();
  return token.length > 0 ? token : null;
}
