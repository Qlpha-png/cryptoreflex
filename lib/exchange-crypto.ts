/**
 * lib/exchange-crypto.ts — Chiffrement AES-256-GCM des API keys exchange.
 *
 * Étude #4 ETUDE-AMELIORATIONS-2026-05-02 — sync API exchanges read-only.
 *
 * SÉCURITÉ :
 *  - AES-256-GCM (authentifié, anti-tampering : si l'attacker modifie 1 byte
 *    du ciphertext en DB, le decrypt échoue avec une exception).
 *  - IV 12 bytes random par chiffrement (pas de réutilisation, mandatory GCM).
 *  - Authentication tag 16 bytes (intégrité garantie).
 *  - Format string stocké : `iv_hex:authTag_hex:ciphertext_hex` (3 parts).
 *
 * Clé maître :
 *  - `EXCHANGE_ENCRYPTION_KEY` env var Vercel (32 bytes hex = 64 chars).
 *  - Générer une fois : `node -e "console.log(crypto.randomBytes(32).toString('hex'))"`.
 *  - Si la clé maître fuit → toutes les API keys utilisateurs sont compromises.
 *    Stockage Vercel `Sensitive` obligatoire, jamais commit en clair.
 *  - Rotation : impossible sans re-encrypter toutes les rows. Documenté.
 *
 * Threat model :
 *  - DB dump fuité (Supabase compromis) → API keys illisibles sans la clé maître Vercel.
 *  - Vercel env var fuité (rare, isolé Sensitive) → API keys déchiffrables.
 *    Mitigation : restreindre les permissions API key chez Binance à READ-ONLY
 *    UNIQUEMENT. Le pire d'une fuite = l'attacker voit les balances.
 *  - Code injection serveur → l'attacker peut lire la clé maître au runtime.
 *    Mitigation : audit des deps + Sentry monitoring runtime errors.
 */

import "server-only";
import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
} from "node:crypto";

const ALGO = "aes-256-gcm";
const IV_LEN = 12; // GCM standard
const KEY_LEN = 32; // 256 bits

function getMasterKey(): Buffer {
  const hex = process.env.EXCHANGE_ENCRYPTION_KEY;
  if (!hex) {
    throw new Error(
      "[exchange-crypto] EXCHANGE_ENCRYPTION_KEY env var manquante. " +
        "Générer une clé : `node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\"` puis la coller dans Vercel.",
    );
  }
  if (hex.length !== KEY_LEN * 2) {
    throw new Error(
      `[exchange-crypto] EXCHANGE_ENCRYPTION_KEY doit faire ${KEY_LEN * 2} chars hex (${KEY_LEN} bytes), reçu ${hex.length}.`,
    );
  }
  return Buffer.from(hex, "hex");
}

/**
 * Chiffre une string en AES-256-GCM. Retourne une string `iv:tag:cipher` hex.
 * Lance si la clé maître est absente ou mal formée.
 */
export function encryptSecret(plaintext: string): string {
  if (!plaintext) throw new Error("[exchange-crypto] plaintext vide");
  const key = getMasterKey();
  const iv = randomBytes(IV_LEN);
  const cipher = createCipheriv(ALGO, key, iv);
  const ciphertext = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return `${iv.toString("hex")}:${tag.toString("hex")}:${ciphertext.toString("hex")}`;
}

/**
 * Déchiffre un payload AES-256-GCM. Lance si la clé maître ne match pas
 * (= protection automatique anti-tampering grâce au tag GCM).
 */
export function decryptSecret(payload: string): string {
  if (!payload) throw new Error("[exchange-crypto] payload vide");
  const parts = payload.split(":");
  if (parts.length !== 3) {
    throw new Error("[exchange-crypto] format invalide (attendu iv:tag:cipher)");
  }
  const [ivHex, tagHex, ctHex] = parts;
  const key = getMasterKey();
  const iv = Buffer.from(ivHex, "hex");
  const tag = Buffer.from(tagHex, "hex");
  const ct = Buffer.from(ctHex, "hex");
  const decipher = createDecipheriv(ALGO, key, iv);
  decipher.setAuthTag(tag);
  const plaintext = Buffer.concat([decipher.update(ct), decipher.final()]);
  return plaintext.toString("utf8");
}

/**
 * Helper : vérifie que la config est OK (env var présente + bon format).
 * Utilisé par les routes API au boot pour fail fast au lieu de crash random.
 */
export function isExchangeCryptoReady(): boolean {
  try {
    getMasterKey();
    return true;
  } catch {
    return false;
  }
}
