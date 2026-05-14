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

export interface TickerCacheReadResult {
  /** Empty record si pas de cache disponible (live ni stale). */
  record: TickerRecord;
  /** "live" = lu depuis live key, "stale" = lu depuis stale key, "none" = aucun cache. */
  source: "live" | "stale" | "none";
  /** True si le résultat vient du fallback stale (peut afficher badge "non temps réel" côté UI si pertinent). */
  isStale: boolean;
}

interface UpstashGetResponse {
  result?: string | null;
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
    return { record: {}, source: "none", isStale: false };
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
        const parsed = JSON.parse(data.result) as TickerRecord;
        if (Object.keys(parsed).length > 0) {
          return { record: parsed, source: "live", isStale: false };
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
        const parsed = JSON.parse(data.result) as TickerRecord;
        if (Object.keys(parsed).length > 0) {
          return { record: parsed, source: "stale", isStale: true };
        }
      }
    }
  } catch {
    // Continue vers source "none"
  }

  return { record: {}, source: "none", isStale: false };
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
): Promise<UpstashSetResult & { live: boolean; stale: boolean }> {
  const kvUrl = process.env.KV_REST_API_URL;
  const kvToken = process.env.KV_REST_API_TOKEN;

  if (!kvUrl || !kvToken) {
    return { ok: false, live: false, stale: false };
  }

  const baseUrl = kvUrl.replace(/\/$/, "");
  const headers = {
    Authorization: `Bearer ${kvToken}`,
    "Content-Type": "application/json",
  };

  const body = JSON.stringify(record);

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

  return { ok: liveOk && staleOk, live: liveOk, stale: staleOk };
}
