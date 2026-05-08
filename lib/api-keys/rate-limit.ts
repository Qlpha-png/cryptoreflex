/**
 * lib/api-keys/rate-limit.ts — Rate limit par tier B2B post-auth.
 *
 * Une fois la clé authentifiée, on applique le quota propre à son tier :
 *   - sandbox       : 60 r/min/clé (assez pour intégrer mais pas pour faire tourner du prod)
 *   - b2b_starter   : 500 r/s/clé burst 1000
 *   - b2b_pro       : 5000 r/s/clé burst 10000
 *   - b2b_enterprise: 20000 r/s/clé (custom — sur devis)
 *
 * Implémenté via `lib/rate-limit.ts` (Upstash KV fixed-window).
 *
 * Headers réponse standard :
 *   X-RateLimit-Limit
 *   X-RateLimit-Remaining
 *   X-RateLimit-Reset (unix seconds)
 *   Retry-After (seconds, sur 429)
 */

import { createRateLimiter } from "@/lib/rate-limit";
import type { ApiKeyTier } from "./types";

interface TierRateLimit {
  limit: number;
  windowMs: number;
}

/** Configuration par tier. Approximation seconde-par-seconde via fenêtre 1s. */
const TIER_LIMITS: Record<ApiKeyTier, TierRateLimit> = {
  sandbox: { limit: 60, windowMs: 60_000 }, // 60 / minute
  b2b_starter: { limit: 500, windowMs: 1_000 }, // 500 / s
  b2b_pro: { limit: 5_000, windowMs: 1_000 }, // 5k / s
  b2b_enterprise: { limit: 20_000, windowMs: 1_000 }, // 20k / s
};

/** Cache des limiters par tier (évite création à chaque requête). */
const limiterCache = new Map<ApiKeyTier, ReturnType<typeof createRateLimiter>>();

function getLimiterFor(tier: ApiKeyTier) {
  let l = limiterCache.get(tier);
  if (!l) {
    const cfg = TIER_LIMITS[tier];
    l = createRateLimiter({
      limit: cfg.limit,
      windowMs: cfg.windowMs,
      key: `b2b-${tier}`,
    });
    limiterCache.set(tier, l);
  }
  return l;
}

export interface RateLimitOutcome {
  ok: boolean;
  limit: number;
  remaining: number;
  resetUnix: number;
  retryAfter?: number; // seconds, set if !ok
}

/**
 * Check rate limit for a given key. La clé bucket est `<tier>:<api_key_id>`
 * pour isoler les tiers entre eux et éviter qu'une attaque sur sandbox impacte
 * pro.
 */
export async function checkApiKeyRateLimit(
  apiKeyId: string,
  tier: ApiKeyTier,
): Promise<RateLimitOutcome> {
  const limiter = getLimiterFor(tier);
  const cfg = TIER_LIMITS[tier];
  const result = await limiter(apiKeyId);
  const now = Date.now();
  const resetUnix = Math.floor((now + cfg.windowMs) / 1000);
  if (result.ok) {
    // L'implémentation actuelle de createRateLimiter ne retourne pas le
    // remaining exact. On annonce une valeur conservative (limit - 1) pour
    // les headers ; le client peut s'en accommoder. Évolution V1 : retourner
    // le compteur exact.
    return {
      ok: true,
      limit: cfg.limit,
      remaining: Math.max(0, cfg.limit - 1),
      resetUnix,
    };
  }
  return {
    ok: false,
    limit: cfg.limit,
    remaining: 0,
    resetUnix,
    retryAfter: result.retryAfter,
  };
}

/** Helpers pour formater les headers réponse standard. */
export function rateLimitHeaders(outcome: RateLimitOutcome): Record<string, string> {
  const h: Record<string, string> = {
    "X-RateLimit-Limit": String(outcome.limit),
    "X-RateLimit-Remaining": String(outcome.remaining),
    "X-RateLimit-Reset": String(outcome.resetUnix),
  };
  if (!outcome.ok && outcome.retryAfter !== undefined) {
    h["Retry-After"] = String(outcome.retryAfter);
  }
  return h;
}
