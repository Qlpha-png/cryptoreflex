/**
 * lib/api-keys/hash.ts — Hashing scrypt + pepper pour les secrets API B2B.
 *
 * Pourquoi scrypt et pas bcrypt :
 *   - scrypt est dans `node:crypto` standard depuis Node 10. Aucune dépendance
 *     externe (pas de `bcryptjs`, pas de build natif). Recommandé OWASP +
 *     ANSSI au même titre que bcrypt / argon2.
 *   - Memory-hard (résistant ASIC/GPU) — bcrypt ne l'est pas.
 *   - Fonctionne sur Vercel Node runtime sans souci.
 *
 * Paramètres :
 *   - N=16384 (2^14), r=8, p=1 — preset OWASP "Sensitive applications"
 *   - keylen=64 bytes (512 bits)
 *   - sel=16 bytes random par hash
 *   - pepper côté serveur (env `API_KEY_PEPPER`) ajouté au secret avant hash
 *
 * Format stocké en DB (`api_keys.secret_hash`) :
 *   `scrypt$N$r$p$<saltHex>$<derivedKeyHex>`
 *
 * Pepper rotation :
 *   - `API_KEY_PEPPER` accepte une liste séparée par virgule : `"current,old1"`.
 *   - À l'écriture, on utilise le premier (current).
 *   - À la vérification, on essaie toutes les versions jusqu'à match.
 *   - Permet de tourner le pepper sans invalider les clés existantes.
 */

import { randomBytes, scrypt as scryptCb, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scrypt = promisify(scryptCb) as (
  password: string | Buffer,
  salt: string | Buffer,
  keylen: number,
  options?: { N?: number; r?: number; p?: number; maxmem?: number },
) => Promise<Buffer>;

const SCRYPT_N = 16384; // 2^14
const SCRYPT_R = 8;
const SCRYPT_P = 1;
const SCRYPT_KEYLEN = 64;
const SCRYPT_SALT_BYTES = 16;
// maxmem doit être > 128 * N * r (sinon scrypt jette). On donne ample.
const SCRYPT_MAXMEM = 64 * 1024 * 1024; // 64 MB

function getPeppers(): string[] {
  const raw = process.env.API_KEY_PEPPER || "";
  const peppers = raw
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean);
  if (peppers.length === 0) {
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        "[api-keys/hash] API_KEY_PEPPER manquant en production. " +
          "Configurer dans Vercel ENV (openssl rand -hex 32).",
      );
    }
    console.warn(
      "[api-keys/hash] API_KEY_PEPPER absent en dev — pepper factice utilisé. " +
        "En prod cela jettera.",
    );
    return ["dev-only-pepper-not-for-prod-7d4f8a"];
  }
  return peppers;
}

function encodeHash(salt: Buffer, derived: Buffer): string {
  return [
    "scrypt",
    SCRYPT_N.toString(),
    SCRYPT_R.toString(),
    SCRYPT_P.toString(),
    salt.toString("hex"),
    derived.toString("hex"),
  ].join("$");
}

function decodeHash(stored: string): {
  N: number;
  r: number;
  p: number;
  salt: Buffer;
  derived: Buffer;
} | null {
  const parts = stored.split("$");
  if (parts.length !== 6 || parts[0] !== "scrypt") return null;
  const N = Number(parts[1]);
  const r = Number(parts[2]);
  const p = Number(parts[3]);
  if (!Number.isFinite(N) || !Number.isFinite(r) || !Number.isFinite(p)) return null;
  try {
    const salt = Buffer.from(parts[4], "hex");
    const derived = Buffer.from(parts[5], "hex");
    if (salt.length === 0 || derived.length === 0) return null;
    return { N, r, p, salt, derived };
  } catch {
    return null;
  }
}

/**
 * Hash un secret B2B (cr_sk_xxx). Stocké tel quel dans `api_keys.secret_hash`.
 */
export async function hashSecret(secret: string): Promise<string> {
  const peppers = getPeppers();
  const peppered = peppers[0] + secret;
  const salt = randomBytes(SCRYPT_SALT_BYTES);
  const derived = await scrypt(peppered, salt, SCRYPT_KEYLEN, {
    N: SCRYPT_N,
    r: SCRYPT_R,
    p: SCRYPT_P,
    maxmem: SCRYPT_MAXMEM,
  });
  return encodeHash(salt, derived);
}

/**
 * Vérifie un secret contre le hash stocké. Constant-time via timingSafeEqual.
 * Tolérant à la rotation de pepper : essaie toutes les versions jusqu'à match.
 *
 * @returns `{ ok: true, peppered_with: 0 }` si la version actuelle matche,
 *          `{ ok: true, peppered_with: N>0 }` si une ancienne version matche
 *          (signal pour re-hash automatique en V2),
 *          `{ ok: false }` si aucune ne matche.
 */
export async function verifySecret(
  secret: string,
  stored: string,
): Promise<{ ok: boolean; peppered_with?: number }> {
  const decoded = decodeHash(stored);
  if (!decoded) return { ok: false };
  const peppers = getPeppers();
  for (let i = 0; i < peppers.length; i++) {
    const peppered = peppers[i] + secret;
    const derived = await scrypt(peppered, decoded.salt, decoded.derived.length, {
      N: decoded.N,
      r: decoded.r,
      p: decoded.p,
      maxmem: SCRYPT_MAXMEM,
    });
    if (
      derived.length === decoded.derived.length &&
      timingSafeEqual(derived, decoded.derived)
    ) {
      return { ok: true, peppered_with: i };
    }
  }
  return { ok: false };
}

/** Webhook secrets — même schéma. */
export const hashWebhookSecret = hashSecret;
export const verifyWebhookSecret = verifySecret;
