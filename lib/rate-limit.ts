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

import { getKv, isKvCircuitOpen, KvUnavailableError, kvRestConfig, noteKvError, recordKvUsage } from "@/lib/kv";

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
  /** compteur partagé entre lambdas (KV) pour ce limiteur seulement, même sans RATE_LIMIT_USE_KV (faible volume) */
  forceKv?: boolean;
}

interface Entry {
  count: number;
  resetAt: number;
}

/* -------------------------------------------------------------------------- */
/*  Fallback in-memory (legacy behavior, utilisé quand KV mocked)             */
/* -------------------------------------------------------------------------- */

/**
 * 06/10/2026 — limiteur mémoire de l'instance, à FENÊTRE GLISSANTE (compteur pondéré : fenêtre précédente × part
 * restante + fenêtre courante), BORNÉ en taille. C'est le limiteur par défaut de toutes les routes (RATE_LIMIT_USE_KV
 * absente en production) et le REPLI des limiteurs KV quand le KV est saturé ou en panne (au lieu de tout laisser passer).
 * Taille bornée : au-delà de MEMORY_MAX_KEYS adresses par espace, les moins récemment vues sont oubliées (une rafale
 * d'adresses uniques ne fait pas gonfler la mémoire de la lambda).
 */
interface SlidingEntry {
  prevCount: number;
  currCount: number;
  currStart: number;
}

export const MEMORY_MAX_KEYS = 10_000;

/** Stores in-memory partagés par namespace (dans le même process). */
const _memoryStores = new Map<string, Map<string, SlidingEntry>>();

export function memoryRateLimit(
  namespace: string,
  ip: string,
  limit: number,
  windowMs: number,
  now: number = Date.now(),
): RateLimitResult {
  let store = _memoryStores.get(namespace);
  if (!store) {
    store = new Map<string, SlidingEntry>();
    _memoryStores.set(namespace, store);
  }

  const windowStart = Math.floor(now / windowMs) * windowMs;
  const entry = store.get(ip) ?? { prevCount: 0, currCount: 0, currStart: windowStart };
  if (entry.currStart !== windowStart) {
    entry.prevCount = windowStart - entry.currStart === windowMs ? entry.currCount : 0;
    entry.currCount = 0;
    entry.currStart = windowStart;
  }
  // ré-insertion : l'ordre de la Map devient l'ordre « moins récemment vu d'abord »
  store.delete(ip);
  store.set(ip, entry);
  while (store.size > MEMORY_MAX_KEYS) {
    const oldest = store.keys().next().value as string | undefined;
    if (oldest === undefined) break;
    store.delete(oldest);
  }

  const elapsed = now - windowStart;
  const weight = 1 - elapsed / windowMs;
  const estimate = entry.prevCount * weight + entry.currCount;
  if (estimate >= limit) {
    // attente jusqu'à ce que l'estimation repasse sous la limite
    let waitMs = windowStart + windowMs - now;
    if (entry.currCount < limit && entry.prevCount > 0) {
      waitMs = Math.min(waitMs, windowMs * (1 - (limit - entry.currCount) / entry.prevCount) - elapsed);
    }
    return { ok: false, retryAfter: Math.max(1, Math.ceil(waitMs / 1000)) };
  }

  entry.currCount += 1;
  return { ok: true };
}

/** Tests : vide les compteurs mémoire. */
export function resetMemoryRateLimitForTests(): void {
  _memoryStores.clear();
  _fallbackCounterStore = null;
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
    // 06/10/2026 : panne ou quota KV épuisé → REPLI sur le limiteur mémoire de l'instance (moins strict car non
    // partagé entre lambdas, mais plus jamais « tout passe »).
    if (!(err instanceof KvUnavailableError)) {
      console.warn(
        "[rate-limit] KV indisponible, repli mémoire :",
        err instanceof Error ? err.message.slice(0, 200) : String(err),
      );
    }
    return memoryRateLimit(namespace, ip, limit, windowMs);
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
    // OPTIM 2026-05-11 — FORCE IN-MEMORY pour économiser 2K-10K KV commands/jour
    // (chaque rate-limit hit = 1 GET + 1 SET KV).
    //
    // ⚠️ LIMITE 2026-06-14 (prod = Vercel serverless, plus Coolify mono-container) :
    // chaque invocation lambda a SA propre Map → le compteur N'EST PAS partagé
    // entre instances. Le rate-limit ne tient donc que dans une même lambda
    // chaude ; un attaquant réparti sur plusieurs lambdas voit des compteurs
    // distincts. Acceptable comme anti-burst best-effort, MAIS pour un vrai
    // rate-limit distribué (brute-force login, DoS scrypt) il faut un store
    // partagé : provisionner Upstash KV (KV_REST_API_URL/TOKEN) puis set
    // RATE_LIMIT_USE_KV=true. Sans KV provisionné, RATE_LIMIT_USE_KV=true
    // retombe en mocked→memory (voir plus bas), donc inutile seul.
    //
    // Pour réactiver KV (multi-lambda distribué) : provisionner Upstash + set RATE_LIMIT_USE_KV=true
    /* forceKv : compteur partagé entre lambdas pour CE limiteur seulement (faible volume, ex. demandes d'ami Reflex Cards) */
    if (!opts.forceKv && process.env.RATE_LIMIT_USE_KV !== "true") {
      return memoryRateLimit(namespace, ip, limit, windowMs);
    }
    const kv = getKv();
    if (kv.mocked || isKvCircuitOpen()) {
      return memoryRateLimit(namespace, ip, limit, windowMs);
    }
    return kvRateLimit(namespace, ip, limit, windowMs);
  };
}

/* -------------------------------------------------------------------------- */
/*  Limite par DESTINATAIRE (anti « email bombing »)                          */
/* -------------------------------------------------------------------------- */

/**
 * AUDIT SÉCURITÉ 2026-10-02 — les limites par IP ne suffisent pas : un
 * attaquant réparti sur N IP pouvait faire envoyer par NOTRE domaine (Resend)
 * des dizaines de magic links / emails de confirmation à une même victime
 * (harcèlement + réputation d'envoi du domaine). On compte donc aussi par
 * ADRESSE destinataire, sur une fenêtre fixe (24 h typiquement).
 *
 * Stockage :
 *  - KV Upstash configuré (KV_REST_API_URL/TOKEN) → compteur PARTAGÉ entre
 *    lambdas, atomique : transaction `SET key 0 EX ttl NX` + `INCR key`
 *    (le TTL est posé à la création uniquement → fenêtre fixe, qu'un
 *    attaquant ne peut pas prolonger en insistant).
 *  - Sinon → Map en mémoire (dev / preview, non distribuée).
 *  - Panne KV ou quota épuisé → repli sur un compteur mémoire de l'instance
 *    (06/10/2026 ; avant : fail-open, tout passait). Les limites restent
 *    tenues par instance ; un utilisateur légitime n'est pas plus bloqué.
 *
 * Note : le contrat `KvClient` (lib/kv.ts) n'expose pas INCR ; on parle
 * directement à l'API REST Upstash (même URL/token que lib/kv.ts) plutôt
 * que d'émuler avec un GET + SET non atomique.
 *
 * Vie privée : la clé KV contient un hash SHA-256 tronqué de l'adresse
 * canonisée, jamais l'adresse en clair.
 */

/** Compteur atomique. `incr` renvoie la valeur APRÈS incrément ; TTL posé à la création. */
export interface CounterStore {
  incr(key: string, ttlSec: number): Promise<number>;
}

/** Store mémoire (fallback dev / preview, ou tests). */
export function createMemoryCounterStore(now: () => number = Date.now): CounterStore {
  const store = new Map<string, Entry>();
  return {
    async incr(key: string, ttlSec: number): Promise<number> {
      const t = now();
      // GC opportuniste (même logique que memoryRateLimit).
      if (store.size > 5000) {
        for (const [k, v] of store.entries()) {
          if (v.resetAt <= t) store.delete(k);
        }
        // borne dure (06/10/2026) : les plus anciennes entrées d'abord
        for (const k of store.keys()) {
          if (store.size <= MEMORY_MAX_KEYS) break;
          store.delete(k);
        }
      }
      const entry = store.get(key);
      if (!entry || entry.resetAt <= t) {
        store.set(key, { count: 1, resetAt: t + ttlSec * 1000 });
        return 1;
      }
      entry.count += 1;
      return entry.count;
    },
  };
}

/**
 * Store Upstash (REST, endpoint transactionnel `/multi-exec`).
 * Réponse attendue : `[{ result: "OK" | null }, { result: <n> }]`.
 */
export function createUpstashCounterStore(
  url: string,
  token: string,
  fetchImpl: typeof fetch = fetch,
): CounterStore {
  const base = url.replace(/\/$/, "");
  return {
    async incr(key: string, ttlSec: number): Promise<number> {
      if (isKvCircuitOpen()) throw new KvUnavailableError();
      const res = await fetchImpl(`${base}/multi-exec`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          accept: "application/json",
        },
        body: JSON.stringify([
          ["SET", key, "0", "EX", String(Math.max(1, Math.ceil(ttlSec))), "NX"],
          ["INCR", key],
        ]),
        cache: "no-store",
        signal: AbortSignal.timeout(3000),
      });
      const text = await res.text().catch(() => "");
      recordKvUsage({ commands: 2, bytes: text.length });
      if (!res.ok) {
        noteKvError(text);
        throw new Error(`[rate-limit] Upstash multi-exec ${res.status}`);
      }
      let json: unknown = null;
      try {
        json = JSON.parse(text) as unknown;
      } catch {
        /* réponse illisible : traitée comme inattendue ci-dessous */
      }
      if (json && typeof json === "object" && !Array.isArray(json) && typeof (json as { error?: unknown }).error === "string") {
        noteKvError((json as { error: string }).error);
      }
      const incr = Array.isArray(json) ? (json[1] as { result?: unknown; error?: unknown } | undefined) : undefined;
      if (Array.isArray(json)) {
        for (const r of json as { error?: unknown }[]) if (typeof r?.error === "string") noteKvError(r.error);
      }
      if (!incr || incr.error || typeof incr.result !== "number") {
        throw new Error("[rate-limit] réponse multi-exec inattendue");
      }
      return incr.result;
    },
  };
}

let _defaultCounterStore: CounterStore | null = null;
/** Repli mémoire des compteurs par destinataire quand le KV est en panne ou saturé (une seule Map par instance). */
let _fallbackCounterStore: CounterStore | null = null;
function getFallbackCounterStore(): CounterStore {
  return (_fallbackCounterStore ??= createMemoryCounterStore());
}

/** KV configuré → Upstash ; sinon mémoire. Singleton (compteurs partagés entre routes). */
function getDefaultCounterStore(): CounterStore {
  if (_defaultCounterStore) return _defaultCounterStore;
  const cfg = kvRestConfig();
  _defaultCounterStore =
    cfg && !getKv().mocked
      ? createUpstashCounterStore(cfg.url, cfg.token)
      : createMemoryCounterStore();
  return _defaultCounterStore;
}

/**
 * Forme canonique d'une adresse POUR LE COMPTAGE uniquement (jamais pour
 * l'envoi) : minuscules, sous-adresse « +tag » retirée, points ignorés chez
 * Gmail. Sans ça, `victime+1@gmail.com`, `vic.time@gmail.com`… auraient
 * chacune leur compteur alors qu'elles arrivent dans la même boîte.
 */
export function canonicalEmailForLimit(email: string): string {
  const norm = email.trim().toLowerCase();
  const at = norm.lastIndexOf("@");
  if (at <= 0) return norm;
  let local = norm.slice(0, at);
  let domain = norm.slice(at + 1);
  const plus = local.indexOf("+");
  if (plus > 0) local = local.slice(0, plus);
  if (domain === "googlemail.com") domain = "gmail.com";
  if (domain === "gmail.com") local = local.replace(/\./g, "");
  return `${local}@${domain}`;
}

/** FNV-1a 32 bits → 8 hex. Non cryptographique : corrélation de logs seulement. */
function fnv1a32(input: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, "0");
}

/** SHA-256 hex tronqué (Web Crypto : compatible runtime Node ET Edge). */
async function sha256Hex(input: string, len = 32): Promise<string> {
  const subtle = globalThis.crypto?.subtle;
  if (!subtle) return fnv1a32(input); // ne devrait pas arriver (Node ≥ 20 / Edge)
  const digest = await subtle.digest("SHA-256", new TextEncoder().encode(input));
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
    .slice(0, len);
}

export interface RecipientLimiterOptions {
  /** Nombre max d'emails par adresse et par fenêtre. */
  limit: number;
  /** Fenêtre FIXE en secondes (démarre au 1er envoi). */
  windowSec: number;
  /** Namespace : plusieurs routes peuvent partager le même seau (ex. "auth-email"). */
  key: string;
  /** Injection pour les tests ; défaut = KV si configuré, sinon mémoire. */
  store?: CounterStore;
}

/**
 * Crée un limiteur par adresse destinataire.
 * Usage : `const rl = await limiter(email); if (!rl.ok) → 429 / envoi sauté.`
 * Chaque appel COMPTE une tentative (même refusée) : à appeler juste avant
 * un envoi d'email, après validation de l'adresse.
 */
export function createRecipientLimiter(
  opts: RecipientLimiterOptions,
): (email: string) => Promise<RateLimitResult> {
  const { limit, windowSec, key } = opts;
  return async function recipientLimit(email: string): Promise<RateLimitResult> {
    const verdict = (count: number): RateLimitResult =>
      // TTL restant inconnu sans RTT supplémentaire : borne haute = fenêtre.
      count > limit ? { ok: false, retryAfter: windowSec } : { ok: true };
    let counterKey: string | null = null;
    try {
      const store = opts.store ?? getDefaultCounterStore();
      counterKey = `rl:rcpt:${key}:${await sha256Hex(canonicalEmailForLimit(email))}`;
      return verdict(await store.incr(counterKey, windowSec));
    } catch (err) {
      // 06/10/2026 : plus de « fail-open » — repli sur un compteur mémoire de l'instance (KV saturé ou en panne).
      if (!(err instanceof KvUnavailableError)) {
        console.warn(
          `[rate-limit] compteur destinataire "${key}" indisponible, repli mémoire :`,
          err instanceof Error ? err.message : String(err),
        );
      }
      try {
        counterKey ??= `rl:rcpt:${key}:${await sha256Hex(canonicalEmailForLimit(email))}`;
        return verdict(await getFallbackCounterStore().incr(counterKey, windowSec));
      } catch {
        return { ok: true }; // ne peut arriver qu'en cas de bug de hachage : on ne bloque jamais une connexion
      }
    }
  };
}

/**
 * Seau PARTAGÉ des emails d'authentification (magic link, confirmation
 * d'inscription, reset mot de passe) : 5 / adresse / 24 h, toutes routes
 * confondues. 5 (et non 3) pour qu'un utilisateur légitime multi-appareils
 * ne soit pas bloqué ; le mot de passe reste utilisable si le seau est plein.
 */
export const authEmailRecipientLimiter = createRecipientLimiter({
  limit: 5,
  windowSec: 24 * 3600,
  key: "auth-email",
});

/**
 * Masque une adresse pour les logs : domaine + hash court (corrélation entre
 * lignes de log sans exposer l'adresse). Ex : `***@gmail.com#1a2b3c4d`.
 */
export function maskEmailForLog(email: unknown): string {
  if (typeof email !== "string" || !email) return "(email absent)";
  const norm = email.trim().toLowerCase();
  const at = norm.lastIndexOf("@");
  const domain = at >= 0 ? norm.slice(at + 1, at + 1 + 64) : "";
  return `***@${domain || "?"}#${fnv1a32(norm)}`;
}
