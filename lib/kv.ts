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
 * Doc API REST Upstash : https://docs.upstash.com/redis/features/restapi
 */

export interface KvClient {
  get<T = unknown>(key: string): Promise<T | null>;
  set(key: string, value: unknown, opts?: { ex?: number }): Promise<void>;
  del(key: string): Promise<void>;
  lrange<T = unknown>(key: string, start: number, end: number): Promise<T[]>;
  lpush(key: string, value: unknown): Promise<number>;
  lrem(key: string, count: number, value: unknown): Promise<number>;
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
/*  Implémentation REAL (Upstash REST)                                        */
/* -------------------------------------------------------------------------- */

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
  private async exec<T = unknown>(args: (string | number)[]): Promise<T> {
    const path = args.map((a) => encodeURIComponent(String(a))).join("/");
    const url = `${this.base}/${path}`;

    const res = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${this.token}`,
        accept: "application/json",
      },
      cache: "no-store",
      // Timeout dur — KV doit répondre en <300 ms typiquement, 5s = panique.
      signal: AbortSignal.timeout(5000),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`[kv] Upstash ${res.status} : ${body.slice(0, 200)}`);
    }

    const json = (await res.json()) as { result: T };
    return json.result;
  }

  /**
   * Variante POST quand la valeur peut contenir des caractères qui posent
   * problème en path (JSON sérialisés notamment).
   * Body : ["VAL1", "VAL2", ...] format Upstash REST.
   */
  private async execBody<T = unknown>(command: string, args: unknown[]): Promise<T> {
    const url = this.base;
    const res = await fetch(url, {
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

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`[kv] Upstash ${res.status} : ${body.slice(0, 200)}`);
    }

    const json = (await res.json()) as { result: T };
    return json.result;
  }

  async get<T = unknown>(key: string): Promise<T | null> {
    const raw = await this.exec<string | null>(["get", key]);
    if (raw == null) return null;
    try {
      return JSON.parse(raw) as T;
    } catch {
      // Backward-compat : si la valeur n'est pas du JSON, on retourne la string.
      return raw as unknown as T;
    }
  }

  async set(key: string, value: unknown, opts?: { ex?: number }): Promise<void> {
    const serialized = typeof value === "string" ? value : JSON.stringify(value);
    if (opts?.ex && opts.ex > 0) {
      await this.execBody("SET", [key, serialized, "EX", opts.ex]);
    } else {
      await this.execBody("SET", [key, serialized]);
    }
  }

  async del(key: string): Promise<void> {
    await this.exec(["del", key]);
  }

  async lrange<T = unknown>(key: string, start: number, end: number): Promise<T[]> {
    const raw = await this.exec<string[] | null>(["lrange", key, start, end]);
    if (!Array.isArray(raw)) return [];
    return raw.map((v) => {
      try {
        return JSON.parse(v) as T;
      } catch {
        return v as unknown as T;
      }
    });
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
        "[kv] mode mock — KV_REST_API_URL/KV_REST_API_TOKEN absents. " +
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

  async get<T = unknown>(key: string): Promise<T | null> {
    if (this.isExpired(key)) return null;
    const v = this.store.get(key);
    return v == null ? null : (v as T);
  }

  async set(key: string, value: unknown, opts?: { ex?: number }): Promise<void> {
    this.store.set(key, value);
    if (opts?.ex && opts.ex > 0) {
      this.expires.set(key, Date.now() + opts.ex * 1000);
    } else {
      this.expires.delete(key);
    }
  }

  async del(key: string): Promise<void> {
    this.store.delete(key);
    this.expires.delete(key);
    this.lists.delete(key);
  }

  async lrange<T = unknown>(key: string, start: number, end: number): Promise<T[]> {
    const arr = this.lists.get(key) ?? [];
    // Redis : end inclusif, -1 = fin
    const realEnd = end < 0 ? arr.length + end : end;
    const slice = arr.slice(start, realEnd + 1);
    return slice.map((v) => {
      try {
        return JSON.parse(v) as T;
      } catch {
        return v as unknown as T;
      }
    });
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

  const url = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;

  if (url && token) {
    _instance = new RealKvClient(url, token);
  } else {
    _instance = new MockKvClient();
  }
  return _instance;
}
