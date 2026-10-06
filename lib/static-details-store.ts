/**
 * lib/static-details-store.ts — lecture des détails CoinGecko des fiches (ATH, ATL, offre, mini-graphique 7 jours)
 * découpés en 32 seaux KV (06/10/2026).
 *
 * Avant : une seule clé `cg-static-details:v1` de 3,1 Mo, relue dans Upstash à CHAQUE rendu de fiche (le cache de
 * données refuse les éléments de plus de 2 Mo) : 95 à 97 % de la bande passante Upstash, quota épuisé le 06/10/2026.
 * Maintenant :
 *  - 32 seaux `cg-static-details:v2:bNN` d'environ 100 Ko (crypto → seau FNV-1a(id) % 32) ;
 *  - lecture d'un seau via le cache de données de Vercel (revalidation 6 h + étiquette `kv-static-details`, invalidée
 *    par l'écrivain après chaque écriture) : le KV n'est relu qu'au plus 4 fois par jour et par seau, plus une fois
 *    après chaque écriture ;
 *  - mémoire de l'instance 10 min (et requêtes simultanées fusionnées) : les builds et les rafales de rendus ne
 *    relisent pas le cache à chaque fiche ;
 *  - disjoncteur de lib/kv.ts : quota épuisé → aucune lecture, repli de l'appelant.
 * Écrivain unique : scripts/populate-all-cryptos-kv.mjs (GitHub, toutes les 6 h), une seule commande MSET.
 *
 * RÈGLE : même calcul de seau que scripts/lib/static-details-buckets.mjs (test : tests/lib/static-details-store.test.ts).
 */
import { getKv, isKvCircuitOpen, kvRestCall, kvRestConfig } from "@/lib/kv";

export const STATIC_DETAILS_BUCKETS = 32;
export const STATIC_DETAILS_PREFIX = "cg-static-details:v2";
export const STATIC_DETAILS_META_KEY = `${STATIC_DETAILS_PREFIX}:meta`;
export const STATIC_DETAILS_TAG = "kv-static-details";
/** Revalidation du cache de données : 6 h (l'écrivain tourne toutes les 6 h et invalide l'étiquette après écriture). */
export const STATIC_DETAILS_REVALIDATE_S = 21_600;
/** Au-delà de 48 h, un seau est considéré comme absent (écrivain en panne) : l'appelant passe à son repli. */
export const STATIC_DETAILS_MAX_AGE_MS = 48 * 3_600_000;
const MEMORY_TTL_MS = 10 * 60_000;
/** Seau absent ou KV indisponible : on ne réessaie pas avant 60 s sur cette instance. */
const MISS_MEMORY_TTL_MS = 60_000;

export interface StaticBucket<T = unknown> {
  v: 2;
  fetchedAt: string;
  rows: Record<string, T>;
}

/** FNV-1a 32 bits — identique à scripts/lib/static-details-buckets.mjs. */
function fnv1a32(input: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

export function bucketOf(id: string): number {
  return fnv1a32(String(id)) % STATIC_DETAILS_BUCKETS;
}

export function bucketKey(i: number): string {
  return `${STATIC_DETAILS_PREFIX}:b${String(i).padStart(2, "0")}`;
}

/** Valide un seau lu dans le KV (chaîne JSON) ; null s'il est illisible ou trop vieux. */
export function parseBucket<T>(raw: unknown, now: number = Date.now()): StaticBucket<T> | null {
  if (typeof raw !== "string" || !raw) return null;
  try {
    const b = JSON.parse(raw) as Partial<StaticBucket<T>>;
    if (!b || b.v !== 2 || !b.rows || typeof b.rows !== "object" || typeof b.fetchedAt !== "string") return null;
    const t = Date.parse(b.fetchedAt);
    if (!Number.isFinite(t) || now - t > STATIC_DETAILS_MAX_AGE_MS) return null;
    return b as StaticBucket<T>;
  } catch {
    return null;
  }
}

const _mem = new Map<number, { at: number; value: StaticBucket | null }>();
const _inflight = new Map<number, Promise<StaticBucket | null>>();

/** Tests : oublie la mémoire de l'instance. */
export function resetStaticDetailsMemoryForTests(): void {
  _mem.clear();
  _inflight.clear();
}

/** Lit un seau (mémoire de l'instance → cache de données Vercel → KV). null = absent, trop vieux ou KV indisponible. */
export async function readStaticBucket<T = unknown>(i: number, now: number = Date.now()): Promise<StaticBucket<T> | null> {
  const m = _mem.get(i);
  if (m && now - m.at < (m.value ? MEMORY_TTL_MS : MISS_MEMORY_TTL_MS)) return m.value as StaticBucket<T> | null;
  const pending = _inflight.get(i);
  if (pending) return pending as Promise<StaticBucket<T> | null>;

  const run = (async (): Promise<StaticBucket | null> => {
    const cfg = kvRestConfig();
    let value: StaticBucket | null = null;
    if (cfg && !isKvCircuitOpen(now)) {
      try {
        const raw = await kvRestCall<string | null>(
          `${cfg.url}/get/${encodeURIComponent(bucketKey(i))}`,
          {
            headers: { Authorization: `Bearer ${cfg.token}`, accept: "application/json" },
            signal: AbortSignal.timeout(5000),
            next: { revalidate: STATIC_DETAILS_REVALIDATE_S, tags: [STATIC_DETAILS_TAG] },
          },
          { cached: true },
        );
        value = parseBucket(raw, now);
      } catch {
        value = null; // KV indisponible ou disjoncteur : repli de l'appelant
      }
    }
    _mem.set(i, { at: now, value });
    return value;
  })();
  _inflight.set(i, run);
  try {
    return (await run) as StaticBucket<T> | null;
  } finally {
    _inflight.delete(i);
  }
}

/**
 * Pour une fiche : `{ [id]: ligne }` si le seau la contient, `{}` si le seau existe sans elle (crypto hors lot :
 * l'appelant passe à son repli par crypto), sinon le résultat de `legacy()` (seau absent ou KV indisponible).
 * Remplace, dans lib/coingecko.ts, l'appel direct au lot de 3,1 Mo.
 */
export async function staticDetailsBatchFor<T>(
  id: string,
  legacy: () => Promise<Record<string, T>>,
): Promise<Record<string, T>> {
  const b = await readStaticBucket<T>(bucketOf(id));
  if (b) {
    const row = b.rows[id];
    return row ? { [id]: row } : {};
  }
  return legacy();
}

/** Lignes des ids demandés (seuls leurs seaux sont lus). `available` = tous les seaux lus. */
export async function readStaticDetailsFor<T = unknown>(
  ids: string[],
): Promise<{ rows: Record<string, T>; available: boolean }> {
  const idx = [...new Set(ids.map(bucketOf))];
  const buckets = await Promise.all(idx.map((i) => readStaticBucket<T>(i)));
  const rows: Record<string, T> = {};
  for (const id of ids) {
    const b = buckets[idx.indexOf(bucketOf(id))];
    const row = b?.rows[id];
    if (row) rows[id] = row;
  }
  return { rows, available: buckets.every(Boolean) };
}

/** Une seule ligne (null si absente ou KV indisponible). */
export async function readStaticDetailFor<T = unknown>(id: string): Promise<T | null> {
  return (await readStaticBucket<T>(bucketOf(id)))?.rows[id] ?? null;
}

/** Tout le lot (API v1 movers) : 32 seaux, chacun en cache. `available` = au moins un seau lu. */
export async function readAllStaticDetails<T = unknown>(): Promise<{ rows: Record<string, T>; available: boolean }> {
  const buckets = await Promise.all(Array.from({ length: STATIC_DETAILS_BUCKETS }, (_, i) => readStaticBucket<T>(i)));
  const rows: Record<string, T> = {};
  for (const b of buckets) if (b) Object.assign(rows, b.rows);
  return { rows, available: buckets.some(Boolean) };
}

/** Les 32 seaux + meta, prêts pour UNE commande MSET. */
export function buildBucketEntries<T>(record: Record<string, T>, fetchedAt: string): Record<string, unknown> {
  const entries: Record<string, unknown> = {};
  for (let i = 0; i < STATIC_DETAILS_BUCKETS; i++) entries[bucketKey(i)] = { v: 2, fetchedAt, rows: {} as Record<string, T> };
  for (const [id, row] of Object.entries(record)) {
    (entries[bucketKey(bucketOf(id))] as StaticBucket<T>).rows[id] = row;
  }
  entries[STATIC_DETAILS_META_KEY] = { v: 2, fetchedAt, count: Object.keys(record).length, buckets: STATIC_DETAILS_BUCKETS };
  return entries;
}

/** Écriture (route manuelle /api/cron/refresh-static-details) : une seule commande MSET. L'appelant invalide l'étiquette. */
export async function writeStaticDetailsBuckets<T>(record: Record<string, T>, fetchedAt = new Date().toISOString()): Promise<void> {
  await getKv().mset(buildBucketEntries(record, fetchedAt));
  _mem.clear();
}
