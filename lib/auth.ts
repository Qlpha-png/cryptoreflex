/**
 * lib/auth.ts — Helpers d'authentification pour les routes serveur.
 *
 * Centralise la vérification du Bearer token utilisé par tous les crons et
 * endpoints admin (revalidate, etc.). Évite la duplication du pattern
 * `if (auth !== expected)` sur ~7 routes — et surtout corrige une faille
 * timing-attack : la comparaison `===` sur deux strings fuit la longueur du
 * préfixe commun via le timing CPU. En théorie un attaquant patient (et avec
 * un canal de mesure stable) peut deviner le secret octet par octet.
 *
 * Concrètement sur Vercel le bruit réseau noie la fuite, mais la mitigation
 * est triviale (`crypto.timingSafeEqual`) — autant le faire correctement.
 *
 * Usage :
 *
 *   import { verifyBearer } from "@/lib/auth";
 *
 *   if (!verifyBearer(req, process.env.CRON_SECRET)) {
 *     return NextResponse.json({ error: "Not found" }, { status: 404 });
 *   }
 */

import { timingSafeEqual } from "node:crypto";

/**
 * Vérifie un Bearer token en temps constant pour éviter les timing attacks.
 *
 * Comportement :
 *  - `secret` absent (undefined / vide) → renvoie `true` (mode dev sans secret).
 *    Le caller est libre de logger un warn pour signaler l'absence.
 *  - `secret` présent → compare octet à octet le header `Authorization` au
 *    pattern `Bearer <secret>`. Toute différence (longueur ou contenu) = false.
 *
 * Note : `timingSafeEqual` throw si les deux Buffer ont des longueurs
 * différentes. On gère ça par un check explicite en amont qui sort en `false`,
 * ce qui est volontairement constant côté caller (toujours `false` rapide,
 * pas d'exception à catcher).
 *
 * @param req — la requête entrante (Request standard ou NextRequest)
 * @param secret — la valeur attendue après "Bearer " (typiquement `process.env.CRON_SECRET`)
 * @returns `true` si autorisé, `false` sinon
 */
export function verifyBearer(req: Request, secret: string | undefined): boolean {
  if (!secret) return true; // mode dev sans secret
  const auth = req.headers.get("authorization") ?? "";
  const expected = `Bearer ${secret}`;
  // Longueurs différentes → reject sans appeler timingSafeEqual (qui throw).
  if (auth.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(auth), Buffer.from(expected));
}
