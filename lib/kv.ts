/**
 * lib/kv.ts — Wrapper minimal Upstash KV (REST) avec fallback "mocked".
 *
 * Pourquoi pas `@upstash/redis` ?
 *  - Lib externe = +60 KB bundle, surface d'attaque, et compat edge parfois floue
 *    selon la version. Upstash expose une REST API ultra-simple ; un `fetch`
 *    natif fait largement le job ici (CRUD + listes simples).
 *
 * Mode `mocked` :
 *  - Si KV_REST_API_URL ou KV_REST_API_TOKEN manquent au boot, on log UNE FOIS
 *    un warning et on bascule sur une Map en mémoire.
 *  - Conséquences attendues :
 *      * Les alertes créées en mode mocked sont perdues à chaque redéploiement /
 *        cold-start. C'est acceptable en dev / preview ; en prod on suppose que
 *        les env vars sont configurées.
 *      * Le cron `evaluateAndFire()` n'aura rien à faire (Map vide après cold).
 *  - Le pattern est volontairement aligné avec `lib/newsletter.ts` (mocked Beehiiv) :
 *    "best effort", on ne casse jamais l'UX.
 *
 * 06/10/2026 — quota Upstash épuisé (« ERR This database has reached current Fixed plan limits ») :
 *  - DISJONCTEUR : toute réponse Upstash qui signale un quota épuisé ouvre le disjoncteur de l'instance pendant 1 h.
 *    Pendant ce temps, aucune commande n'est envoyée : les appels lèvent `KvUnavailableError` tout de suite (même
 *    contrat qu'une panne Upstash, que tous les appelants gèrent déjà) au lieu de réessayer en boucle.
 *  - BUDGET : chaque instance compte ses commandes et octets ; au-delà d'un seuil par heure, une ligne « [kv-budget] »
 *    est journalisée (une fois par heure et par instance).
 *  - PREVIEW : les déploiements Preview de Vercel (VERCEL_ENV=preview) et `next dev` n'utilisent plus le KV de
 *    production (mode simulé), sauf KV_ALLOW_NON_PROD=1. KV_DISABLED=1 coupe le KV partout (mode simulé).
 *
 * Doc API REST Upstash : https://docs.upstash.com/redis/features/restapi
 */

/** Options de lecture : `revalidate` = lecture compatible avec le pré-rendu Next (cache de données revalidé toutes les
 *  N secondes) au lieu de `no-store`, qui rend dynamique toute page qui l'appelle (soft-404 /cartes/<id>, 04/10/2026).
 *  `tags` : étiquettes du cache de données (invalidation par revalidateTag après écriture). */
export interface KvReadOpts {
  revalidate?: number;
  tags?: string[];
}

export interface KvClient {
  get<T = unknown>(key: string, opts?: KvReadOpts): Promise<T | null>;
  /** Lecture groupée : UNE commande (MGET) pour N clés ; null pour chaque clé absente. */
  mget<T = unknown>(keys: string[]): Promise<(T | null)[]>;
  set(key: string, value: unknown, opts?: { ex?: number }): Promise<void>;
  /** Écriture groupée : UNE commande (MSET), sans expiration. */
  mset(entries: Record<string, unknown>): Promise<void>;
  del(key: string): Promise<void>;
  /** Incrémente un compteur entier (créé à 1 s'il n'existe pas) ; `ttlSeconds` pose/renouvelle l'expiration. */
  incr(key: string, ttlSeconds?: number): Promise<number>;
  lrange<T = unknown>(key: string, start: number, end: number): Promise<T[]>;
  lpush(key: string, value: unknown): Promise<number>;
  lrem(key: string, count: number, value: unknown): Promise<number>;
  /** Ne garde que les éléments [start, stop] de la liste (UNE commande, au lieu de LRANGE + LREM un par un). */
  ltrim(key: string, start: number, stop: number): Promise<void>;
  /**
   * Liste les clés correspondant à un pattern glob (ex: "alerts:by-id:*").
   * En mocked, scanne la Map en mémoire. En prod, utilise Upstash KEYS (OK
   * tant que volumétrie < ~10k ; au-delà, prévoir SCAN cursor).
   */
  keys(pattern: string): Promise<string[]>;
  /** Indique si on est en mode mocked — utile pour court-circuiter certaines opés coûteuses. */
  readonly mocked: boolean;
}

/* -------------------------------------------------------------------------- */
/*  Configuration REST (partagée avec les modules qui appellent Upstash en direct) */
/* -------------------------------------------------------------------------- */

/**
 * URL et jeton REST du KV, ou null si le KV n'est pas configuré ou ne doit pas être utilisé ici :
 *  - KV_DISABLED=1 (interrupteur manuel, toutes plateformes) ;
 *  - déploiement Preview de Vercel (VERCEL_ENV=preview) ou `next dev` (NODE_ENV=development) : ils partageaient la base
 *    de production et consommaient son quota (inventaire du 06/10/2026), sauf KV_ALLOW_NON_PROD=1.
 * Aucune autre condition : en production (VERCEL_ENV=production, ou variable absente) le comportement est inchangé.
 */
export function kvRestConfig(env: NodeJS.ProcessEnv = process.env): { url: string; token: string } | null {
  const url = env.KV_REST_API_URL;
  const token = env.KV_REST_API_TOKEN;
  if (!url || !token) return null;
  if (env.KV_DISABLED === "1") return null;
  if (env.KV_ALLOW_NON_PROD !== "1" && (env.VERCEL_ENV === "preview" || env.NODE_ENV === "development")) return null;
  return { url: url.replace(/\/$/, ""), token };
}

/* -------------------------------------------------------------------------- */
/*  Disjoncteur (quota Upstash épuisé) + compteur de budget par instance      */
/* -------------------------------------------------------------------------- */

/** Messages Upstash d'un quota épuisé (bande passante/stockage d'une offre « Fixed », commandes de l'offre gratuite). */
// « quota exceeded » seul est exclu : « ERR DB capacity quota exceeded » (stockage plein) laisse les LECTURES servies.
export const KV_QUOTA_ERROR_RE =
  /plan limits|max requests limit|max daily request limit|max monthly request|request limit exceeded|bandwidth/i;
/** Durée d'ouverture du disjoncteur : 1 h (le quota ne revient pas avant la remise à zéro mensuelle). */
export const KV_CIRCUIT_OPEN_MS = 60 * 60_000;

/** Levée quand le disjoncteur est ouvert : aucune commande n'a été envoyée. */
export class KvUnavailableError extends Error {
  constructor(message = "[kv] disjoncteur ouvert (quota Upstash épuisé) : commande non envoyée") {
    super(message);
    this.name = "KvUnavailableError";
  }
}

let _circuit: { openUntil: number; reason: string } | null = null;

export function isKvCircuitOpen(now: number = Date.now()): boolean {
  if (!_circuit) return false;
  if (now >= _circuit.openUntil) {
    _circuit = null;
    return false;
  }
  return true;
}

export function kvCircuitState(): { openUntil: number; reason: string } | null {
  return _circuit ? { ..._circuit } : null;
}

export function tripKvCircuit(reason: string, now: number = Date.now(), ms: number = KV_CIRCUIT_OPEN_MS): void {
  const wasOpen = isKvCircuitOpen(now);
  _circuit = { openUntil: now + ms, reason: reason.slice(0, 160) };
  if (!wasOpen) {
    console.warn(
      `[kv-budget] disjoncteur ouvert pour ${Math.round(ms / 60_000)} min sur cette instance (mode sans KV) : ${_circuit.reason}`,
    );
  }
}

/** Si `text` (corps ou champ `error` d'une réponse Upstash) signale un quota épuisé, ouvre le disjoncteur. */
export function noteKvError(text: string, now: number = Date.now()): boolean {
  if (!text || !KV_QUOTA_ERROR_RE.test(text)) return false;
  tripKvCircuit(text, now);
  return true;
}

const BUDGET_WINDOW_MS = 60 * 60_000;

interface KvBudget {
  windowStart: number;
  /** commandes envoyées à coup sûr (no-store, écritures) */
  commands: number;
  bytes: number;
  /** lectures avec revalidate : servies par le cache de données de Vercel OU envoyées (majorant) */
  cachedReads: number;
  cachedBytes: number;
  warned: boolean;
}

const freshBudget = (now: number): KvBudget => ({
  windowStart: now,
  commands: 0,
  bytes: 0,
  cachedReads: 0,
  cachedBytes: 0,
  warned: false,
});
let _budget: KvBudget = freshBudget(Date.now());

/** Seuils par instance et par heure (réglables par variables d'environnement). */
export function kvBudgetThresholds(env: NodeJS.ProcessEnv = process.env): { commands: number; bytes: number; cachedBytes: number } {
  const commands = Number(env.KV_BUDGET_WARN_COMMANDS) > 0 ? Number(env.KV_BUDGET_WARN_COMMANDS) : 600;
  const mb = Number(env.KV_BUDGET_WARN_MB) > 0 ? Number(env.KV_BUDGET_WARN_MB) : 20;
  return { commands, bytes: mb * 1_000_000, cachedBytes: 5 * mb * 1_000_000 };
}

/** Compte une commande (ou une lecture en cache) et journalise « [kv-budget] » au premier dépassement de l'heure. */
export function recordKvUsage(u: { commands?: number; bytes?: number; cached?: boolean }, now: number = Date.now()): void {
  if (now - _budget.windowStart >= BUDGET_WINDOW_MS) _budget = freshBudget(now);
  const bytes = Math.max(0, u.bytes ?? 0);
  if (u.cached) {
    _budget.cachedReads += 1;
    _budget.cachedBytes += bytes;
  } else {
    _budget.commands += u.commands ?? 1;
    _budget.bytes += bytes;
  }
  if (_budget.warned) return;
  const t = kvBudgetThresholds();
  if (_budget.commands > t.commands || _budget.bytes > t.bytes || _budget.cachedBytes > t.cachedBytes) {
    _budget.warned = true;
    const mo = (n: number) => (n / 1_000_000).toFixed(1).replace(".", ",");
    console.warn(
      `[kv-budget] instance au-dessus du seuil depuis ${new Date(_budget.windowStart).toISOString()} : ` +
        `${_budget.commands} commandes et ${mo(_budget.bytes)} Mo envoyés, ${_budget.cachedReads} lectures en cache ` +
        `(${mo(_budget.cachedBytes)} Mo au plus) ; seuils par heure : ${t.commands} commandes, ${mo(t.bytes)} Mo, ` +
        `${mo(t.cachedBytes)} Mo en cache`,
    );
  }
}

export function kvBudgetSnapshot(): Readonly<KvBudget> {
  return { ..._budget };
}

/** Tests : remet à zéro le disjoncteur, le budget et le singleton. */
export function resetKvGuardsForTests(): void {
  _circuit = null;
  _budget = freshBudget(Date.now());
  _instance = null;
}

/**
 * Appel REST Upstash commun (client ci-dessous, bandeau, seaux des fiches) : respecte le disjoncteur, compte le budget,
 * ouvre le disjoncteur sur un message de quota. Renvoie `result` ; lève une erreur sur toute réponse en échec.
 */
export async function kvRestCall<T = unknown>(
  input: string,
  init: RequestInit & { next?: { revalidate?: number; tags?: string[] } },
  opts: { cached?: boolean } = {},
): Promise<T> {
  if (isKvCircuitOpen()) throw new KvUnavailableError();
  const res = await fetch(input, init);
  const text = await res.text().catch(() => "");
  recordKvUsage({ bytes: text.length, cached: opts.cached });
  if (!res.ok) {
    noteKvError(text);
    throw new Error(`[kv] Upstash ${res.status} : ${text.slice(0, 200)}`);
  }
  let json: { result?: T; error?: unknown };
  try {
    json = JSON.parse(text) as { result?: T; error?: unknown };
  } catch {
    throw new Error("[kv] réponse Upstash illisible");
  }
  if (typeof json?.error === "string") {
    noteKvError(json.error);
    throw new Error(`[kv] Upstash : ${json.error.slice(0, 200)}`);
  }
  return json.result as T;
}

/* -------------------------------------------------------------------------- */
/*  Implémentation REAL (Upstash REST)                                        */
/* -------------------------------------------------------------------------- */

const parseValue = <T>(v: unknown): T => {
  if (typeof v !== "string") return v as T;
  try {
    return JSON.parse(v) as T;
  } catch {
    // Backward-compat : si la valeur n'est pas du JSON, on retourne la string.
    return v as unknown as T;
  }
};

class RealKvClient implements KvClient {
  readonly mocked = false;
  private readonly base: string;
  private readonly token: string;

  constructor(url: string, token: string) {
    // On normalise pour éviter le double slash si l'utilisateur a copié l'URL avec.
    this.base = url.replace(/\/$/, "");
    this.token = token;
  }

  /**
   * Helper : envoie une commande Redis sous forme de tableau de path-segments.
   * Upstash REST accepte aussi un POST avec body JSON ; on choisit GET avec path
   * pour la simplicité (caché par défaut côté CDN — on désactive avec no-store).
   */
  private async exec<T = unknown>(args: (string | number)[], opts?: KvReadOpts): Promise<T> {
    const path = args.map((a) => encodeURIComponent(String(a))).join("/");
    const cached = opts?.revalidate != null;
    return kvRestCall<T>(
      `${this.base}/${path}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${this.token}`,
          accept: "application/json",
        },
        ...(cached
          ? { next: { revalidate: opts!.revalidate, ...(opts?.tags?.length ? { tags: opts.tags } : {}) } }
          : { cache: "no-store" as const }),
        // Timeout dur — KV doit répondre en <300 ms typiquement, 5s = panique.
        signal: AbortSignal.timeout(5000),
      },
      { cached },
    );
  }

  /**
   * Variante POST quand la valeur peut contenir des caractères qui posent
   * problème en path (JSON sérialisés notamment).
   * Body : ["VAL1", "VAL2", ...] format Upstash REST.
   */
  private async execBody<T = unknown>(command: string, args: unknown[]): Promise<T> {
    return kvRestCall<T>(this.base, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.token}`,
        "Content-Type": "application/json",
        accept: "application/json",
      },
      body: JSON.stringify([command, ...args.map((a) => String(a))]),
      cache: "no-store",
      signal: AbortSignal.timeout(5000),
    });
  }

  async get<T = unknown>(key: string, opts?: KvReadOpts): Promise<T | null> {
    const raw = await this.exec<string | null>(["get", key], opts);
    if (raw == null) return null;
    return parseValue<T>(raw);
  }

  async mget<T = unknown>(keys: string[]): Promise<(T | null)[]> {
    if (keys.length === 0) return [];
    const raw = await this.execBody<(string | null)[] | null>("MGET", keys);
    if (!Array.isArray(raw)) return keys.map(() => null);
    return keys.map((_, i) => (raw[i] == null ? null : parseValue<T>(raw[i])));
  }

  async set(key: string, value: unknown, opts?: { ex?: number }): Promise<void> {
    const serialized = typeof value === "string" ? value : JSON.stringify(value);
    if (opts?.ex && opts.ex > 0) {
      await this.execBody("SET", [key, serialized, "EX", opts.ex]);
    } else {
      await this.execBody("SET", [key, serialized]);
    }
  }

  async mset(entries: Record<string, unknown>): Promise<void> {
    const args: unknown[] = [];
    for (const [k, v] of Object.entries(entries)) args.push(k, typeof v === "string" ? v : JSON.stringify(v));
    if (args.length === 0) return;
    await this.execBody("MSET", args);
  }

  async del(key: string): Promise<void> {
    await this.exec(["del", key]);
  }

  async incr(key: string, ttlSeconds?: number): Promise<number> {
    const n = await this.exec<number>(["incr", key]);
    if (ttlSeconds && ttlSeconds > 0) await this.exec(["expire", key, Math.ceil(ttlSeconds)]);
    return n;
  }

  async lrange<T = unknown>(key: string, start: number, end: number): Promise<T[]> {
    const raw = await this.exec<string[] | null>(["lrange", key, start, end]);
    if (!Array.isArray(raw)) return [];
    return raw.map((v) => parseValue<T>(v));
  }

  async lpush(key: string, value: unknown): Promise<number> {
    const serialized = typeof value === "string" ? value : JSON.stringify(value);
    const len = await this.execBody<number>("LPUSH", [key, serialized]);
    return typeof len === "number" ? len : 0;
  }

  async lrem(key: string, count: number, value: unknown): Promise<number> {
    const serialized = typeof value === "string" ? value : JSON.stringify(value);
    const removed = await this.execBody<number>("LREM", [key, count, serialized]);
    return typeof removed === "number" ? removed : 0;
  }

  async ltrim(key: string, start: number, stop: number): Promise<void> {
    await this.exec(["ltrim", key, start, stop]);
  }

  async keys(pattern: string): Promise<string[]> {
    const raw = await this.exec<string[] | null>(["keys", pattern]);
    return Array.isArray(raw) ? raw : [];
  }
}

/* -------------------------------------------------------------------------- */
/*  Implémentation MOCK (Map en mémoire — non distribué, non persistant)      */
/* -------------------------------------------------------------------------- */

let _mockWarned = false;

class MockKvClient implements KvClient {
  readonly mocked = true;
  private readonly store = new Map<string, unknown>();
  /** Listes Redis-like, séparées de `store` car même clé peut être typée différemment. */
  private readonly lists = new Map<string, string[]>();
  /** Expirations en ms (timestamp absolu). */
  private readonly expires = new Map<string, number>();

  constructor() {
    if (!_mockWarned) {
      _mockWarned = true;
      console.warn(
        "[kv] mode mock — KV_REST_API_URL/KV_REST_API_TOKEN absents (ou KV désactivé ici : Preview, next dev, KV_DISABLED). " +
          "Toutes les opérations sont en mémoire (perdues au prochain cold-start).",
      );
    }
  }

  private isExpired(key: string): boolean {
    const ex = this.expires.get(key);
    if (!ex) return false;
    if (ex < Date.now()) {
      this.store.delete(key);
      this.expires.delete(key);
      return true;
    }
    return false;
  }

  async get<T = unknown>(key: string, _opts?: KvReadOpts): Promise<T | null> {
    if (this.isExpired(key)) return null;
    const v = this.store.get(key);
    return v == null ? null : (v as T);
  }

  async mget<T = unknown>(keys: string[]): Promise<(T | null)[]> {
    return Promise.all(keys.map((k) => this.get<T>(k)));
  }

  async set(key: string, value: unknown, opts?: { ex?: number }): Promise<void> {
    this.store.set(key, value);
    if (opts?.ex && opts.ex > 0) {
      this.expires.set(key, Date.now() + opts.ex * 1000);
    } else {
      this.expires.delete(key);
    }
  }

  async mset(entries: Record<string, unknown>): Promise<void> {
    for (const [k, v] of Object.entries(entries)) await this.set(k, v);
  }

  async del(key: string): Promise<void> {
    this.store.delete(key);
    this.expires.delete(key);
    this.lists.delete(key);
  }

  async incr(key: string, ttlSeconds?: number): Promise<number> {
    const cur = await this.get<number>(key);
    const n = (typeof cur === "number" ? cur : 0) + 1;
    await this.set(key, n, ttlSeconds && ttlSeconds > 0 ? { ex: ttlSeconds } : undefined);
    return n;
  }

  async lrange<T = unknown>(key: string, start: number, end: number): Promise<T[]> {
    const arr = this.lists.get(key) ?? [];
    // Redis : end inclusif, -1 = fin
    const realEnd = end < 0 ? arr.length + end : end;
    const slice = arr.slice(start, realEnd + 1);
    return slice.map((v) => parseValue<T>(v));
  }

  async lpush(key: string, value: unknown): Promise<number> {
    const serialized = typeof value === "string" ? value : JSON.stringify(value);
    const arr = this.lists.get(key) ?? [];
    arr.unshift(serialized);
    this.lists.set(key, arr);
    return arr.length;
  }

  async lrem(key: string, count: number, value: unknown): Promise<number> {
    const arr = this.lists.get(key);
    if (!arr) return 0;
    const serialized = typeof value === "string" ? value : JSON.stringify(value);

    let removed = 0;
    // count = 0 → tous ; >0 → depuis tête ; <0 → depuis queue.
    const direction = count < 0 ? -1 : 1;
    const max = count === 0 ? Number.POSITIVE_INFINITY : Math.abs(count);

    if (direction === 1) {
      for (let i = 0; i < arr.length && removed < max; ) {
        if (arr[i] === serialized) {
          arr.splice(i, 1);
          removed++;
        } else {
          i++;
        }
      }
    } else {
      for (let i = arr.length - 1; i >= 0 && removed < max; ) {
        if (arr[i] === serialized) {
          arr.splice(i, 1);
          removed++;
        }
        i--;
      }
    }

    if (arr.length === 0) this.lists.delete(key);
    else this.lists.set(key, arr);
    return removed;
  }

  async ltrim(key: string, start: number, stop: number): Promise<void> {
    const arr = this.lists.get(key);
    if (!arr) return;
    const realStop = stop < 0 ? arr.length + stop : stop;
    const kept = arr.slice(start, realStop + 1);
    if (kept.length === 0) this.lists.delete(key);
    else this.lists.set(key, kept);
  }

  async keys(pattern: string): Promise<string[]> {
    // Conversion glob → regex minimaliste : * → .*, ? → .
    const re = new RegExp(
      "^" + pattern.replace(/[.+^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*").replace(/\?/g, ".") + "$",
    );
    const out: string[] = [];
    for (const k of this.store.keys()) {
      if (!this.isExpired(k) && re.test(k)) out.push(k);
    }
    return out;
  }
}

/* -------------------------------------------------------------------------- */
/*  Factory + singleton                                                       */
/* -------------------------------------------------------------------------- */

let _instance: KvClient | null = null;

/**
 * Renvoie l'instance unique (lazy). Sécurisé pour appel répété.
 */
export function getKv(): KvClient {
  if (_instance) return _instance;

  const cfg = kvRestConfig();
  _instance = cfg ? new RealKvClient(cfg.url, cfg.token) : new MockKvClient();
  return _instance;
}
