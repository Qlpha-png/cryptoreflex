/**
 * lib/auth-tokens.ts — Tokens HMAC pour les actions one-click depuis email.
 *
 * Usage typé : un lien `/api/newsletter/unsubscribe?email=foo@bar&token=xxx`
 * peut être validé sans état serveur (KV / DB) : on signe l'email avec un
 * secret côté serveur, le token devient le proof of possession.
 *
 * Pattern HMAC-SHA256 + base64url (URL-safe, pas besoin d'encodeURIComponent).
 * Salt par namespace ("unsubscribe") pour empêcher la réutilisation d'un token
 * généré pour un autre usage (ex: token de désinscription utilisé comme magic
 * link de connexion → pas possible, namespace différent).
 *
 * Pourquoi pas un JWT ?
 *  - Overkill : on n'a pas de claims, juste "cet email est légitimement
 *    autorisé à se désinscrire".
 *  - Pas de TTL nécessaire (un lien d'unsubscribe doit rester valide
 *    indéfiniment — tant que l'utilisateur veut se désinscrire, il doit pouvoir).
 *  - HMAC = 32 octets = base64url ~43 chars, plus court qu'un JWT (~150).
 *
 * Secret : `UNSUBSCRIBE_SECRET` en priorité, fallback `CRON_SECRET` pour ne
 * pas avoir à provisionner une 2e env var en MVP. À séparer plus tard si on
 * veut rotater l'un sans casser l'autre.
 */

import { createHmac, timingSafeEqual } from "node:crypto";

/** Namespace pour éviter qu'un token signé pour X soit réutilisé pour Y. */
const UNSUBSCRIBE_NAMESPACE = "unsubscribe";

/**
 * Récupère le secret de signature.
 * En dev (les deux env absentes) on utilise une chaîne fixe — le token sera
 * stable mais évidemment non-secret. C'est OK : en dev on n'envoie pas de vrais
 * emails, et l'endpoint /api/newsletter/unsubscribe vit sur localhost.
 */
function getSecret(): string {
  return (
    process.env.UNSUBSCRIBE_SECRET ??
    process.env.CRON_SECRET ??
    "dev-only-unsubscribe-secret-do-not-use-in-prod"
  );
}

/**
 * Encode un Buffer en base64url (RFC 4648 §5) — URL-safe sans padding.
 * Plus court et plus sûr en query string que base64 standard (`+`/`/`/`=`).
 */
function base64url(buf: Buffer): string {
  return buf.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

/**
 * Génère un token HMAC SHA-256 pour un email donné.
 * Le token n'a pas d'expiration — l'usage est "one-click unsubscribe", on veut
 * que le lien reste fonctionnel des mois après l'envoi de l'email.
 *
 * @param email — adresse email cible (normalisée en minuscules en interne)
 * @returns base64url string (~43 chars)
 */
export function generateUnsubscribeToken(email: string): string {
  const normalized = email.trim().toLowerCase();
  const payload = `${UNSUBSCRIBE_NAMESPACE}:${normalized}`;
  const hmac = createHmac("sha256", getSecret()).update(payload).digest();
  return base64url(hmac);
}

/**
 * Vérifie qu'un token est valide pour l'email donné, en temps constant.
 *
 * Implémentation : on regénère le token attendu et on compare via
 * `timingSafeEqual`. Toute fuite de timing serait limitée à la longueur (qui
 * est constante = 32 octets pour SHA-256), donc inexploitable.
 *
 * @returns `true` si le token correspond, `false` sinon (longueurs différentes,
 *          email vide, signature invalide).
 */
export function verifyUnsubscribeToken(email: string, token: string): boolean {
  if (!email || !token) return false;
  let expected: string;
  try {
    expected = generateUnsubscribeToken(email);
  } catch {
    return false;
  }
  // Buffer.from accepte n'importe quelle string — on compare bien à longueur égale.
  const a = Buffer.from(token);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  try {
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}
