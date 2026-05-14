/**
 * lib/kv-ticker.ts
 *
 * Helper centralisé pour la lecture/écriture du cache KV des prix ticker top 50.
 *
 * Pourquoi un helper dédié (2026-05-14) :
 *   Le cron `refresh-ticker-prices` est censé tourner toutes les 10 min via
 *   GitHub Actions schedule, mais en pratique GH Actions free tier ignore
 *   largement cette fréquence (audit `gh run list` confirme gaps observés
 *   65-246 min entre runs réelles).
 *
 *   Conséquence : avec une seule clé KV TTL court (12 min), le ticker est
 *   vide >90% du temps → cascade live (Binance/Kraken/...) déclenchée à
 *   chaque hit /api/prices, dégradant perf et risquant rate-limit/ban.
 *
 *   Solution : pattern live + stale.
 *     - `cg-ticker-prices:v1`        TTL 12 min  → considéré "live"
 *     - `cg-ticker-prices:stale:v1`  TTL 6 h     → fallback acceptable
 *
 *   Le cron écrit les 2 simultanément. Les readers tentent live d'abord,
 *   tombent sur stale si live expiré, et déclenchent la cascade live
 *   uniquement si même stale est absent (cold start).
 *
 *   La clé `cg-ticker-prices:v1` est conservée en compat avec le code
 *   existant : tous les readers actuels la lisent déjà, on ne casse rien.
 */

export const KV_TICKER_LIVE_KEY = "cg-ticker-prices:v1";
export const KV_TICKER_STALE_KEY = "cg-ticker-prices:stale:v1";

// TTL live = 12 min, aligné sur cron toutes les 10 min (cron + 2 min marge).
export const KV_TICKER_LIVE_TTL_SECONDS = 720;

// TTL stale = 6 h, couvre largement les gaps réels GH Actions schedule
// (max ~4 h observés via `gh run list`).
export const KV_TICKER_STALE_TTL_SECONDS = 21600;

export interface TickerEntry {
  id: string;
  symbol: string;
  name: string;
  image: string;
  price: number;
  change24h: number;
  marketCap: number;
}

export type TickerRecord = Record<string, TickerEntry>;

/**
 * Format de payload stocké en KV (depuis 2026-05-14 wrap fetchedAt).
 *
 * Le wrapper ajoute `fetchedAt` ISO 8601 pour que l'UI puisse afficher
 * un badge "Prix indicatif — mise à jour à HH:MM" quand les données sont
 * stale (cf. `lib/kv-ticker.readTickerCache().isStale`).
 *
 * Backward compat : si KV contient l'ancien format `Record<string, TickerEntry>`
 * direct (sans wrapper), `readTickerCache()` le détecte et retourne
 * `fetchedAt: null`. Le cron écrit toujours le nouveau format wrap.
 */
export interface TickerCachePayload {
  prices: TickerRecord;
  /** ISO 8601 timestamp de la dernière fetch CoinGecko. */
  fetchedAt: string;
}

export interface TickerCacheReadResult {
  /** Empty record si pas de cache disponible (live ni stale). */
  record: TickerRecord;
  /** "live" = lu depuis live key, "stale" = lu depuis stale key, "none" = aucun cache. */
  source: "live" | "stale" | "none";
  /** True si le résultat vient du fallback stale (peut afficher badge "non temps réel" côté UI si pertinent). */
  isStale: boolean;
  /** ISO 8601 timestamp de la dernière fetch CG. Null si ancien format KV ou source "none". */
  fetchedAt: string | null;
}

interface UpstashGetResponse {
  result?: string | null;
}

/**
 * Normalise un payload KV potentiellement legacy (Record direct) ou nouveau
 * (TickerCachePayload wrap). Retourne `{ prices, fetchedAt }`.
 */
function normalizePayload(
  raw: unknown,
): { prices: TickerRecord; fetchedAt: string | null } | null {
  if (!raw || typeof raw !== "object") return null;

  // Nouveau format : { prices: {...}, fetchedAt: "..." }
  if ("prices" in raw && typeof (raw as { prices?: unknown }).prices === "object") {
    const payload = raw as Partial<TickerCachePayload>;
    if (payload.prices && Object.keys(payload.prices).length > 0) {
      return {
        prices: payload.prices,
        fetchedAt: typeof payload.fetchedAt === "string" ? payload.fetchedAt : null,
      };
    }
    return null;
  }

  // Ancien format : Record<string, TickerEntry> direct (sans wrapper)
  const direct = raw as TickerRecord;
  if (Object.keys(direct).length > 0) {
    return { prices: direct, fetchedAt: null };
  }

  return null;
}

/**
 * Lit `KV_TICKER_LIVE_KEY` puis fallback `KV_TICKER_STALE_KEY`.
 *
 * - Retourne `{ record: {}, source: "none", isStale: false }` si KV non configuré
 *   ou si les 2 clés sont vides.
 * - Aucune exception levée : KV indispo = source "none" (le caller décide
 *   du fallback cascade live ou downgrade UX).
 */
export async function readTickerCache(): Promise<TickerCacheReadResult> {
  const kvUrl = process.env.KV_REST_API_URL;
  const kvToken = process.env.KV_REST_API_TOKEN;

  if (!kvUrl || !kvToken) {
    return { record: {}, source: "none", isStale: false, fetchedAt: null };
  }

  const baseUrl = kvUrl.replace(/\/$/, "");
  const headers = {
    Authorization: `Bearer ${kvToken}`,
    accept: "application/json",
  };

  // 1. Try live (TTL 12 min, chaud après chaque run cron)
  try {
    const liveRes = await fetch(
      `${baseUrl}/get/${encodeURIComponent(KV_TICKER_LIVE_KEY)}`,
      {
        headers,
        signal: AbortSignal.timeout(2500),
        next: { revalidate: 30, tags: ["kv-ticker-prices"] },
      },
    );
    if (liveRes.ok) {
      const data = (await liveRes.json()) as UpstashGetResponse;
      if (typeof data.result === "string" && data.result.length > 0) {
        const normalized = normalizePayload(JSON.parse(data.result));
        if (normalized) {
          return {
            record: normalized.prices,
            source: "live",
            isStale: false,
            fetchedAt: normalized.fetchedAt,
          };
        }
      }
    }
  } catch {
    // Continue vers stale
  }

  // 2. Fallback stale (TTL 6 h, couvre gaps GH Actions cron)
  try {
    const staleRes = await fetch(
      `${baseUrl}/get/${encodeURIComponent(KV_TICKER_STALE_KEY)}`,
      {
        headers,
        signal: AbortSignal.timeout(2500),
        next: { revalidate: 60, tags: ["kv-ticker-prices"] },
      },
    );
    if (staleRes.ok) {
      const data = (await staleRes.json()) as UpstashGetResponse;
      if (typeof data.result === "string" && data.result.length > 0) {
        const normalized = normalizePayload(JSON.parse(data.result));
        if (normalized) {
          return {
            record: normalized.prices,
            source: "stale",
            isStale: true,
            fetchedAt: normalized.fetchedAt,
          };
        }
      }
    }
  } catch {
    // Continue vers source "none"
  }

  return { record: {}, source: "none", isStale: false, fetchedAt: null };
}

interface UpstashSetResult {
  ok: boolean;
}

/**
 * Écrit le record en KV sous les 2 clés simultanément (live + stale).
 *
 * - live TTL 12 min (chaud)
 * - stale TTL 6 h (fallback)
 *
 * Retourne le statut succès/échec par clé pour observabilité.
 * Aucune exception : si KV non configuré, retourne `{ live: false, stale: false }`.
 */
export async function writeTickerCacheBoth(
  record: TickerRecord,
): Promise<UpstashSetResult & { live: boolean; stale: boolean; fetchedAt: string }> {
  const kvUrl = process.env.KV_REST_API_URL;
  const kvToken = process.env.KV_REST_API_TOKEN;
  const fetchedAt = new Date().toISOString();

  if (!kvUrl || !kvToken) {
    return { ok: false, live: false, stale: false, fetchedAt };
  }

  const baseUrl = kvUrl.replace(/\/$/, "");
  const headers = {
    Authorization: `Bearer ${kvToken}`,
    "Content-Type": "application/json",
  };

  // Wrap dans TickerCachePayload pour stocker fetchedAt + permettre UI badge stale.
  const payload: TickerCachePayload = { prices: record, fetchedAt };
  const body = JSON.stringify(payload);

  const writeOne = async (key: string, ttl: number): Promise<boolean> => {
    try {
      const res = await fetch(
        `${baseUrl}/set/${encodeURIComponent(key)}?ex=${ttl}`,
        {
          method: "POST",
          headers,
          body,
          signal: AbortSignal.timeout(5000),
        },
      );
      return res.ok;
    } catch {
      return false;
    }
  };

  // Écrit en parallèle les 2 clés. Si live échoue mais stale réussit (ou vice-versa),
  // on a quand même un fallback partiel.
  const [liveOk, staleOk] = await Promise.all([
    writeOne(KV_TICKER_LIVE_KEY, KV_TICKER_LIVE_TTL_SECONDS),
    writeOne(KV_TICKER_STALE_KEY, KV_TICKER_STALE_TTL_SECONDS),
  ]);

  return { ok: liveOk && staleOk, live: liveOk, stale: staleOk, fetchedAt };
}

/**
 * Calcule l'âge des données ticker en millisecondes.
 * Retourne `null` si `fetchedAt` est absent (ancien format KV ou source "none").
 */
export function getTickerAgeMs(fetchedAt: string | null): number | null {
  if (!fetchedAt) return null;
  const parsed = Date.parse(fetchedAt);
  if (Number.isNaN(parsed)) return null;
  return Math.max(0, Date.now() - parsed);
}

/**
 * Catégorise le niveau de fraîcheur pour décider du badge UI affiché.
 *
 * - "fresh" : < 12 min (couvert par TTL live, données récentes du cron)
 * - "indicative" : 12 min - 2 h (stale mais raisonnable, badge discret)
 * - "delayed" : 2 h - 6 h (stale long, badge explicite "données retardées")
 * - "unknown" : pas de fetchedAt (ancien format KV ou source "none")
 */
export type TickerFreshness = "fresh" | "indicative" | "delayed" | "unknown";

export function classifyTickerFreshness(
  fetchedAt: string | null,
): TickerFreshness {
  const age = getTickerAgeMs(fetchedAt);
  if (age === null) return "unknown";
  if (age < 12 * 60 * 1000) return "fresh";
  if (age < 2 * 60 * 60 * 1000) return "indicative";
  return "delayed";
}
