/**
 * lib/api-keys/ip-pre-rl.ts — Rate limit IP-based PRE-bcrypt (S-1).
 *
 * Pourquoi : un attaquant qui ne connaît pas une clé valide peut bombarder
 * `/api/v1/me/*` avec des `cr_sk_xxx` random. Chaque tentative coûte 1 scrypt
 * (~250 ms CPU). À 100 r/s c'est 25 s CPU/s = saturation.
 *
 * Mitigation : on bloque par IP AVANT toute vérif crypto. Quota généreux (60 r/min/IP)
 * pour ne pas pénaliser les clients légitimes en burst, mais qui coupe net
 * une attaque brute-force.
 *
 * Ce limiter ne remplace pas le rate limit par tier (lib/api-keys/rate-limit.ts) ;
 * il s'applique en plus, en amont.
 */

import { createRateLimiter } from "@/lib/rate-limit";

const PRE_AUTH_LIMIT_PER_MIN = 60;

const preAuthLimiter = createRateLimiter({
  limit: PRE_AUTH_LIMIT_PER_MIN,
  windowMs: 60 * 1000,
  key: "b2b-preauth",
});

/**
 * Vérifie le quota IP avant lookup clé. Retourne `{ ok: true }` ou
 * `{ ok: false, retryAfter }`.
 */
export async function checkPreAuthIpQuota(
  ip: string | null,
): Promise<{ ok: true } | { ok: false; retryAfter: number }> {
  // Si on n'a pas d'IP (ne devrait pas arriver via Vercel), on est permissif
  // mais on log : signal d'environnement bizarre.
  if (!ip) {
    console.warn("[api-keys/ip-pre-rl] missing IP, allowing");
    return { ok: true };
  }
  return preAuthLimiter(ip);
}
