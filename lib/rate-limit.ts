/**
 * lib/rate-limit.ts — Rate limiter in-memory factorisé pour les routes API.
 *
 * Pattern fixed-window simple :
 *   - Une `Map<ip, { count, resetAt }>` par limiter (chaque appel à
 *     `createRateLimiter()` crée son propre store isolé).
 *   - Quand la fenêtre expire (`now > resetAt`), on reset à 1.
 *   - GC opportuniste : si la map dépasse 5000 entrées, on purge les expirées.
 *
 * Limitations connues (acceptables V1, à upgrader vers Upstash Redis quand le
 * trafic > ~100 req/s ou quand on passe à plusieurs instances Vercel) :
 *   - Non-distribué : chaque instance lambda Vercel a son propre compteur.
 *     Concrètement, le vrai plafond observé peut être N × `limit` (N instances).
 *   - Non-persistant : un cold-start réinitialise le compteur. Pas critique
 *     pour de la défense anti-burst, problématique si on veut des quotas
 *     stricts à la journée.
 *   - Edge runtime : la `Map` survit entre invocations sur la même instance,
 *     mais pas entre régions edge. Idem que ci-dessus, c'est de la défense
 *     opportuniste, pas un quota strict.
 *
 * Usage :
 *
 *   import { createRateLimiter } from "@/lib/rate-limit";
 *   import { getClientIp } from "@/lib/ip";
 *
 *   const limiter = createRateLimiter({ limit: 30, windowMs: 60_000 });
 *
 *   export async function GET(req: Request) {
 *     const rl = limiter(getClientIp(req));
 *     if (!rl.ok) {
 *       return new Response("Too many requests", {
 *         status: 429,
 *         headers: { "Retry-After": String(rl.retryAfter) },
 *       });
 *     }
 *     // ... handler logic
 *   }
 */

export interface RateLimitOk {
  ok: true;
}

export interface RateLimitDenied {
  ok: false;
  /** Secondes avant le reset de la fenêtre. */
  retryAfter: number;
}

export type RateLimitResult = RateLimitOk | RateLimitDenied;

export interface RateLimiterOptions {
  /** Nombre max de requêtes autorisées par fenêtre, par clé. */
  limit: number;
  /** Durée de la fenêtre en millisecondes. */
  windowMs: number;
}

interface Entry {
  count: number;
  resetAt: number;
}

/**
 * Crée un rate limiter isolé (chaque appel produit son propre store).
 * Le limiter retourné est une fonction `(ip: string) => RateLimitResult`.
 */
export function createRateLimiter(opts: RateLimiterOptions): (ip: string) => RateLimitResult {
  const { limit, windowMs } = opts;
  const store = new Map<string, Entry>();

  return function rateLimit(ip: string): RateLimitResult {
    const now = Date.now();

    // GC opportuniste : si la map gonfle (bot scan, etc.), on purge les expirées.
    if (store.size > 5000) {
      for (const [k, v] of store.entries()) {
        if (v.resetAt < now) store.delete(k);
      }
    }

    const entry = store.get(ip);
    if (!entry || entry.resetAt < now) {
      store.set(ip, { count: 1, resetAt: now + windowMs });
      return { ok: true };
    }

    if (entry.count >= limit) {
      return { ok: false, retryAfter: Math.max(1, Math.ceil((entry.resetAt - now) / 1000)) };
    }

    entry.count += 1;
    return { ok: true };
  };
}
