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

import { isKvCircuitOpen, kvRestCall, kvRestConfig } from "@/lib/kv";

/*
 * 06/10/2026 — quota Upstash épuisé : la lecture « live » est mise en cache 300 s (au lieu de 30 s) et la lecture
 * « stale » 3 600 s (au lieu de 60 s) ; le cron invalide l'étiquette `kv-ticker-prices` après chaque écriture, donc la
 * fraîcheur reste celle du cron (10 min). La clé stale n'est plus écrite qu'une fois par heure (TTL 6 h). Le schedule
 * GitHub en doublon du cron Vercel est retiré (.github/workflows/refresh-ticker-prices.yml). Disjoncteur de lib/kv.ts :
 * quota épuisé → aucune commande, source « none » (l'appelant passe à sa cascade).
 */
export const KV_TICKER_TAG = "kv-ticker-prices";
export const KV_TICKER_LIVE_REVALIDATE_S = 300;
export const KV_TICKER_STALE_REVALIDATE_S = 3600;

/** La clé stale (TTL 6 h) n'est écrite qu'au passage de la première dizaine de minutes de chaque heure (cron toutes les 10 min). */
export function shouldWriteStaleTicker(now: Date = new Date()): boolean {
  return now.getUTCMinutes() < 10;
}

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
  const cfg = kvRestConfig();
  if (!cfg || isKvCircuitOpen()) {
    return { record: {}, source: "none", isStale: false, fetchedAt: null };
  }

  const headers = {
    Authorization: `Bearer ${cfg.token}`,
    accept: "application/json",
  };

  const readKey = async (key: string, revalidate: number) => {
    try {
      const raw = await kvRestCall<string | null>(
        `${cfg.url}/get/${encodeURIComponent(key)}`,
        { headers, signal: AbortSignal.timeout(2500), next: { revalidate, tags: [KV_TICKER_TAG] } },
        { cached: true },
      );
      return typeof raw === "string" && raw.length > 0 ? normalizePayload(JSON.parse(raw)) : null;
    } catch {
      return null;
    }
  };

  // 1. Try live (TTL 12 min, chaud après chaque run cron ; cache 300 s invalidé par le cron)
  const live = await readKey(KV_TICKER_LIVE_KEY, KV_TICKER_LIVE_REVALIDATE_S);
  if (live) {
    return { record: live.prices, source: "live", isStale: false, fetchedAt: live.fetchedAt };
  }

  // 2. Fallback stale (TTL 6 h, écrite 1 fois par heure ; cache 3 600 s invalidé par le cron)
  if (isKvCircuitOpen()) return { record: {}, source: "none", isStale: false, fetchedAt: null };
  const stale = await readKey(KV_TICKER_STALE_KEY, KV_TICKER_STALE_REVALIDATE_S);
  if (stale) {
    return { record: stale.prices, source: "stale", isStale: true, fetchedAt: stale.fetchedAt };
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
  opts: { now?: Date; forceStale?: boolean } = {},
): Promise<UpstashSetResult & { live: boolean; stale: boolean; staleSkipped: boolean; fetchedAt: string }> {
  const cfg = kvRestConfig();
  const now = opts.now ?? new Date();
  const fetchedAt = now.toISOString();
  const writeStale = opts.forceStale === true || shouldWriteStaleTicker(now);

  if (!cfg) {
    return { ok: false, live: false, stale: false, staleSkipped: !writeStale, fetchedAt };
  }

  const baseUrl = cfg.url;
  const headers = {
    Authorization: `Bearer ${cfg.token}`,
    "Content-Type": "application/json",
  };

  // Wrap dans TickerCachePayload pour stocker fetchedAt + permettre UI badge stale.
  const payload: TickerCachePayload = { prices: record, fetchedAt };
  const body = JSON.stringify(payload);

  const writeOne = async (key: string, ttl: number): Promise<boolean> => {
    try {
      await kvRestCall(`${baseUrl}/set/${encodeURIComponent(key)}?ex=${ttl}`, {
        method: "POST",
        headers,
        body,
        cache: "no-store",
        signal: AbortSignal.timeout(5000),
      });
      return true;
    } catch {
      return false; // panne, quota épuisé (disjoncteur ouvert) ou refus
    }
  };

  // Écrit en parallèle les 2 clés. Si live échoue mais stale réussit (ou vice-versa),
  // on a quand même un fallback partiel.
  const [liveOk, staleOk] = await Promise.all([
    writeOne(KV_TICKER_LIVE_KEY, KV_TICKER_LIVE_TTL_SECONDS),
    writeStale ? writeOne(KV_TICKER_STALE_KEY, KV_TICKER_STALE_TTL_SECONDS) : Promise.resolve(false),
  ]);

  return { ok: liveOk && (staleOk || !writeStale), live: liveOk, stale: staleOk, staleSkipped: !writeStale, fetchedAt };
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
