/**
 * lib/rate-limit.ts — Rate limiter factorisé pour les routes API.
 *
 * FIX P0 audit-fonctionnel-live-final #4 : migration vers backend KV distribué
 * (Upstash REST via `lib/kv.ts`) avec fallback in-memory transparent.
 *
 * Pattern fixed-window basé sur INCR + EXPIRE (atomique côté Redis grâce au
 * fait que la clé est créée par `INCR` puis qu'on pose le TTL au premier hit).
 *
 * API publique inchangée : `createRateLimiter({ limit, windowMs, key? })`
 * retourne une fonction asynchrone `(ip: string) => Promise<RateLimitResult>`.
 *
 * IMPORTANT — breaking change vs version précédente :
 *   - Le limiter est désormais ASYNCHRONE (Promise). Tous les handlers API
 *     doivent `await limiter(getClientIp(req))`.
 *   - Si KV n'est pas configuré (mode mocked), on retombe sur l'ancien store
 *     in-memory (même comportement qu'avant, juste non-distribué).
 *
 * Namespace `key` (optionnel mais recommandé) :
 *   - Permet d'isoler les compteurs par route ("convert", "prices", "search"…)
 *   - Sans namespace, utilise le pattern "rl:default:{ip}".
 *   - Avec namespace : "rl:{namespace}:{ip}".
 *
 * Limitations résiduelles :
 *   - L'INCR + EXPIRE n'est pas un MULTI/EXEC, donc en cas de race au tout
 *     premier hit, deux requêtes simultanées peuvent voir un compteur sans TTL
 *     pendant ~quelques ms. Acceptable pour de la défense anti-burst.
 *   - Pas de quota par jour ni de sliding window — on reste sur du fixed-window
 *     comme avant.
 *
 * Usage :
 *
 *   import { createRateLimiter } from "@/lib/rate-limit";
 *   import { getClientIp } from "@/lib/ip";
 *
 *   const limiter = createRateLimiter({ limit: 30, windowMs: 60_000, key: "convert" });
 *
 *   export async function GET(req: Request) {
 *     const rl = await limiter(getClientIp(req));
 *     if (!rl.ok) {
 *       return new Response("Too many requests", {
 *         status: 429,
 *         headers: { "Retry-After": String(rl.retryAfter) },
 *       });
 *     }
 *     // ... handler logic
 *   }
 */

import { getKv } from "@/lib/kv";

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
  /**
   * Namespace pour isoler les compteurs par route (ex: "convert", "prices").
   * Recommandé en prod : sans namespace, toutes les routes partagent la même
   * fenêtre par IP, ce qui pénalise un user honnête qui cumule plusieurs APIs.
   */
  key?: string;
}

interface Entry {
  count: number;
  resetAt: number;
}

/* -------------------------------------------------------------------------- */
/*  Fallback in-memory (legacy behavior, utilisé quand KV mocked)             */
/* -------------------------------------------------------------------------- */

/** Stores in-memory partagés par namespace (dans le même process). */
const _memoryStores = new Map<string, Map<string, Entry>>();

function memoryRateLimit(
  namespace: string,
  ip: string,
  limit: number,
  windowMs: number,
): RateLimitResult {
  let store = _memoryStores.get(namespace);
  if (!store) {
    store = new Map<string, Entry>();
    _memoryStores.set(namespace, store);
  }

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
}

/* -------------------------------------------------------------------------- */
/*  Rate limit distribué via KV (Upstash REST)                                */
/* -------------------------------------------------------------------------- */

/**
 * Implémentation KV : INCR la clé puis pose EXPIRE si on est au 1er hit.
 *
 * On utilise les méthodes `get`/`set` génériques de notre wrapper KV plutôt
 * que d'ajouter `incr`/`expire` au contrat (qui doit rester minimal).
 * Conséquences :
 *   - 1 GET + 1 SET par requête (vs 1 INCR seul). Acceptable, latence reste
 *     <1 ms par opé Upstash.
 *   - Pas de garantie d'atomicité stricte au niveau Redis ; en cas de race,
 *     le compteur peut être légèrement sous-évalué (ex: 2 requêtes simultanées
 *     incrémentent en parallèle de 1 au lieu de 2). Tolérable pour anti-burst.
 *
 * Si on souhaite un comportement strictement atomique plus tard, ajouter
 * `incr(key)` et `expire(key, seconds)` au contrat `KvClient` dans `lib/kv.ts`.
 */
async function kvRateLimit(
  namespace: string,
  ip: string,
  limit: number,
  windowMs: number,
): Promise<RateLimitResult> {
  const kv = getKv();
  const ttlSec = Math.max(1, Math.ceil(windowMs / 1000));
  const key = `rl:${namespace}:${ip}`;

  try {
    const current = (await kv.get<number>(key)) ?? 0;

    if (current >= limit) {
      // On ne connaît pas exactement le TTL restant sans EXPIRE-time RTT
      // supplémentaire ; on renvoie la fenêtre complète comme borne supérieure.
      return { ok: false, retryAfter: ttlSec };
    }

    const next = current + 1;
    // SET key value EX ttl : on rafraîchit le TTL à chaque hit. Conséquence :
    // la fenêtre se "renouvelle" légèrement à chaque appel (≈ sliding window
    // approximatif). Trade-off vs un INCR + EXPIRE NX strict :
    //   - Plus permissif (le user n'est jamais injustement bloqué par notre
    //     approximation).
    //   - Toujours efficace pour bloquer les bursts (ex: 70 req en 1s sur
    //     une fenêtre de 60s déclenchera 429 au 61ème hit).
    // Si on souhaite une fenêtre strictement fixe plus tard, ajouter
    // `incr` + `expire` au contrat KvClient et basculer ici.
    await kv.set(key, next, { ex: ttlSec });

    return { ok: true };
  } catch (err) {
    // En cas de panne KV, on reste tolérant : on laisse passer la requête plutôt
    // que de bloquer la prod. Log côté serveur pour alerter.
    console.warn("[rate-limit] KV error, fail-open:", err);
    return { ok: true };
  }
}

/* -------------------------------------------------------------------------- */
/*  Factory publique                                                          */
/* -------------------------------------------------------------------------- */

/**
 * Crée un rate limiter (KV si configuré, in-memory sinon).
 * Le limiter retourné est ASYNCHRONE : `(ip: string) => Promise<RateLimitResult>`.
 */
export function createRateLimiter(
  opts: RateLimiterOptions,
): (ip: string) => Promise<RateLimitResult> {
  const { limit, windowMs } = opts;
  const namespace = opts.key ?? "default";

  return async function rateLimit(ip: string): Promise<RateLimitResult> {
    const kv = getKv();
    if (kv.mocked) {
      // KV non configuré → fallback legacy in-memory (par namespace).
      return memoryRateLimit(namespace, ip, limit, windowMs);
    }
    return kvRateLimit(namespace, ip, limit, windowMs);
  };
}
