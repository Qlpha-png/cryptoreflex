/**
 * lib/kv-ticker.ts — KV du marché : bandeau (top 100), instantané de secours et métriques globales.
 *
 * 08/10/2026 (lot Z2) — ÉCRIVAIN UNIQUE : le robot R1 (app/api/cron/refresh-ticker-prices, Vercel Cron toutes les 10 min)
 * écrit, en UNE SEULE commande MSET :
 *   - `cg-ticker-prices:v1`        le top 100 (CoinMarketCap, CoinGecko seulement si CMC échoue), avec l'heure du relevé ;
 *   - `price-source:top-snapshot`  l'instantané de secours (même relevé : fin du doublon D9, update-static-prices supprimé) ;
 *   - `marche:global:v1`           les métriques globales (capitalisation totale, dominances), au premier passage de
 *                                  chaque heure seulement (1 crédit CMC).
 * Les pages LISENT ces clés (aucun appel CoinMarketCap depuis une page).
 *
 * MSET n'a pas d'expiration : la fraîcheur se juge sur l'heure du relevé écrite dans chaque valeur, plus sur la durée
 * de vie de la clé. Bandeau « live » jusqu'à 12 min, « stale » (affiché avec son heure) jusqu'à 6 h, ignoré au-delà ;
 * instantané de secours ignoré au-delà de 24 h ; métriques globales ignorées au-delà de 3 h.
 * La clé `cg-ticker-prices:stale:v1` n'est plus écrite ; elle est encore lue en secours tant qu'une ancienne valeur
 * (avec son ancienne durée de vie de 6 h) existe.
 */

import { isKvCircuitOpen, kvRestCall, kvRestConfig } from "@/lib/kv";

export const KV_TICKER_TAG = "kv-ticker-prices";
export const KV_TICKER_LIVE_REVALIDATE_S = 300;
export const KV_TICKER_STALE_REVALIDATE_S = 3600;

export const KV_TICKER_LIVE_KEY = "cg-ticker-prices:v1";
export const KV_TICKER_STALE_KEY = "cg-ticker-prices:stale:v1";
export const KV_MARCHE_SNAPSHOT_KEY = "price-source:top-snapshot";
export const KV_MARCHE_GLOBAL_KEY = "marche:global:v1";

/** « Live » : relevé de 12 min au plus (cron toutes les 10 min + 2 min de marge). */
export const KV_TICKER_LIVE_TTL_SECONDS = 720;
/** Au-delà de 6 h, le relevé du bandeau n'est plus servi du tout. */
export const KV_TICKER_STALE_TTL_SECONDS = 21600;
/** Instantané de secours : 24 h au plus. */
export const KV_MARCHE_SNAPSHOT_MAX_AGE_S = 24 * 3600;
/** Métriques globales : 3 h au plus (écrites une fois par heure). */
export const KV_MARCHE_GLOBAL_MAX_AGE_S = 3 * 3600;

/** Les métriques globales ne sont relevées qu'au premier passage de chaque heure (cron toutes les 10 min). */
export function shouldRefreshGlobal(now: Date = new Date()): boolean {
  return now.getUTCMinutes() < 10;
}

/** Source réellement utilisée par R1 pour le relevé. */
export type TickerSourceName = "coinmarketcap" | "coingecko";

export interface TickerEntry {
  id: string;
  symbol: string;
  name: string;
  image: string;
  price: number;
  change24h: number;
  marketCap: number;
  /** 08/10/2026 (lot Z2) : champs fournis par CoinMarketCap dans le même appel (absents des anciens relevés). */
  rank?: number | null;
  volume24h?: number | null;
  change1h?: number | null;
  change7d?: number | null;
  circulatingSupply?: number | null;
  /** Ligne du classement qui n'a pas de fiche sur le site (id « cmc-<n> ») : jamais de lien de fiche. */
  unlinked?: boolean;
}

export type TickerRecord = Record<string, TickerEntry>;

/** Taux de change utilisé pour l'euro (lib/fx.ts : BCE, sinon secours daté). */
export interface TickerFx {
  eurPerUsd: number;
  date: string;
  source: "bce" | "binance" | "secours";
}

export interface TickerCachePayload {
  prices: TickerRecord;
  /** ISO 8601 : heure du relevé (réponse de la source). */
  fetchedAt: string;
  /** Source réellement utilisée (absente des relevés d'avant le lot Z2, tous venus de CoinGecko). */
  source?: TickerSourceName;
  fx?: TickerFx;
}

export interface TickerCacheReadResult {
  /** Empty record si pas de cache disponible. */
  record: TickerRecord;
  /** "live" = relevé de 12 min au plus, "stale" = relevé de 12 min à 6 h, "none" = aucun relevé utilisable. */
  source: "live" | "stale" | "none";
  isStale: boolean;
  /** ISO 8601 du relevé. Null si ancien format KV ou source "none". */
  fetchedAt: string | null;
  /** Source réelle du relevé (coingecko pour les relevés d'avant le lot Z2), null si aucun relevé. */
  provider: TickerSourceName | null;
  fx: TickerFx | null;
}

const NONE: TickerCacheReadResult = { record: {}, source: "none", isStale: false, fetchedAt: null, provider: null, fx: null };

function normalizePayload(raw: unknown): { prices: TickerRecord; fetchedAt: string | null; provider: TickerSourceName; fx: TickerFx | null } | null {
  if (!raw || typeof raw !== "object") return null;
  if ("prices" in raw && typeof (raw as { prices?: unknown }).prices === "object") {
    const payload = raw as Partial<TickerCachePayload>;
    if (payload.prices && Object.keys(payload.prices).length > 0) {
      return {
        prices: payload.prices,
        fetchedAt: typeof payload.fetchedAt === "string" ? payload.fetchedAt : null,
        provider: payload.source === "coinmarketcap" ? "coinmarketcap" : "coingecko",
        fx: payload.fx && typeof payload.fx.eurPerUsd === "number" ? payload.fx : null,
      };
    }
    return null;
  }
  // Ancien format : Record<string, TickerEntry> direct (sans wrapper)
  const direct = raw as TickerRecord;
  if (Object.keys(direct).length > 0) return { prices: direct, fetchedAt: null, provider: "coingecko", fx: null };
  return null;
}

/** Âge en secondes d'une heure ISO (null si illisible). */
function ageSeconds(iso: string | null, now: number): number | null {
  if (!iso) return null;
  const t = Date.parse(iso);
  return Number.isFinite(t) ? Math.max(0, (now - t) / 1000) : null;
}

/** Classement pur (testé) d'un relevé lu : live ≤ 12 min, stale ≤ 6 h, sinon inutilisable. Sans heure : live (ancien format). */
export function classifyTickerAge(fetchedAt: string | null, now: number = Date.now()): "live" | "stale" | "none" {
  const age = ageSeconds(fetchedAt, now);
  if (age === null) return fetchedAt ? "none" : "live";
  if (age <= KV_TICKER_LIVE_TTL_SECONDS) return "live";
  if (age <= KV_TICKER_STALE_TTL_SECONDS) return "stale";
  return "none";
}

const restHeaders = (token: string) => ({ Authorization: `Bearer ${token}`, accept: "application/json" });

async function readRaw(key: string, revalidate: number): Promise<unknown> {
  const cfg = kvRestConfig();
  if (!cfg || isKvCircuitOpen()) return null;
  try {
    const raw = await kvRestCall<string | null>(
      `${cfg.url}/get/${encodeURIComponent(key)}`,
      { headers: restHeaders(cfg.token), signal: AbortSignal.timeout(2500), next: { revalidate, tags: [KV_TICKER_TAG] } },
      { cached: true },
    );
    return typeof raw === "string" && raw.length > 0 ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/**
 * Lit le relevé du bandeau (top 100). La clé live n'expire plus (MSET) : son âge décide de « live » ou « stale ».
 * Aucune exception : KV indisponible = source "none" (l'appelant passe à sa cascade).
 */
export async function readTickerCache(now: number = Date.now()): Promise<TickerCacheReadResult> {
  const cfg = kvRestConfig();
  if (!cfg || isKvCircuitOpen()) return NONE;
  const live = normalizePayload(await readRaw(KV_TICKER_LIVE_KEY, KV_TICKER_LIVE_REVALIDATE_S));
  if (live) {
    const cls = classifyTickerAge(live.fetchedAt, now);
    if (cls !== "none") {
      return { record: live.prices, source: cls, isStale: cls === "stale", fetchedAt: live.fetchedAt, provider: live.provider, fx: live.fx };
    }
  }
  // Ancienne clé stale (TTL 6 h posé avant le lot Z2), lue seulement si la clé live manque ou est trop vieille.
  if (isKvCircuitOpen()) return NONE;
  const stale = normalizePayload(await readRaw(KV_TICKER_STALE_KEY, KV_TICKER_STALE_REVALIDATE_S));
  if (stale) {
    const cls = classifyTickerAge(stale.fetchedAt, now);
    if (cls !== "none") return { record: stale.prices, source: "stale", isStale: true, fetchedAt: stale.fetchedAt, provider: stale.provider, fx: stale.fx };
  }
  return NONE;
}

/* -------------------------------------------------------------------------- */
/*  Instantané de secours et métriques globales                               */
/* -------------------------------------------------------------------------- */

export interface MarcheSnapshotEntry {
  priceUsd: number;
  change24h: number;
  marketCap: number;
  volume24h: number;
}

export interface MarcheSnapshotPayload {
  snapshot: Record<string, MarcheSnapshotEntry>;
  updatedAt: string;
  sourceCount: number;
  source?: TickerSourceName;
}

/** Métriques globales du marché, écrites par R1 depuis la réponse « global-metrics » de CoinMarketCap. */
export interface MarcheGlobal {
  totalMarketCapUsd: number;
  totalVolume24hUsd: number;
  btcDominance: number;
  ethDominance: number;
  marketCapChange24h: number;
  activeCryptos: number;
  /** ISO : heure de la donnée (last_updated de CMC, sinon heure de la réponse). */
  asOf: string;
  source: "coinmarketcap";
}

/** Instantané de secours (≤ 24 h), ou null. */
export async function readMarcheSnapshot(now: number = Date.now()): Promise<MarcheSnapshotPayload | null> {
  const raw = (await readRaw(KV_MARCHE_SNAPSHOT_KEY, KV_TICKER_STALE_REVALIDATE_S)) as MarcheSnapshotPayload | null;
  if (!raw || typeof raw !== "object" || !raw.snapshot) return null;
  const age = ageSeconds(raw.updatedAt ?? null, now);
  return age !== null && age <= KV_MARCHE_SNAPSHOT_MAX_AGE_S ? raw : null;
}

/** Métriques globales écrites par R1 (≤ 3 h), ou null. */
export async function readMarcheGlobal(now: number = Date.now()): Promise<MarcheGlobal | null> {
  const raw = (await readRaw(KV_MARCHE_GLOBAL_KEY, KV_TICKER_LIVE_REVALIDATE_S)) as MarcheGlobal | null;
  if (!raw || typeof raw !== "object" || !(raw.totalMarketCapUsd > 0)) return null;
  const age = ageSeconds(raw.asOf ?? null, now);
  return age !== null && age <= KV_MARCHE_GLOBAL_MAX_AGE_S ? raw : null;
}

/* -------------------------------------------------------------------------- */
/*  Écriture (R1 seulement)                                                   */
/* -------------------------------------------------------------------------- */

/** Instantané de secours tiré du même relevé que le bandeau (lignes avec fiche seulement). */
export function snapshotFromTicker(payload: TickerCachePayload): MarcheSnapshotPayload {
  const snapshot: Record<string, MarcheSnapshotEntry> = {};
  for (const e of Object.values(payload.prices)) {
    if (e.unlinked || !(e.price > 0)) continue;
    snapshot[e.id] = { priceUsd: e.price, change24h: e.change24h, marketCap: e.marketCap, volume24h: e.volume24h ?? 0 };
  }
  return { snapshot, updatedAt: payload.fetchedAt, sourceCount: Object.keys(snapshot).length, ...(payload.source ? { source: payload.source } : {}) };
}

/** Corps de la commande MSET unique (testé) : bandeau + instantané, + métriques globales si relevées. */
export function buildMarcheMset(payload: TickerCachePayload, global: MarcheGlobal | null): string[] {
  const body = ["MSET", KV_TICKER_LIVE_KEY, JSON.stringify(payload), KV_MARCHE_SNAPSHOT_KEY, JSON.stringify(snapshotFromTicker(payload))];
  if (global) body.push(KV_MARCHE_GLOBAL_KEY, JSON.stringify(global));
  return body;
}

/** Écrit le relevé en UNE commande MSET. Aucune exception : KV absent, en panne ou plein → { ok: false }. */
export async function writeMarcheMset(payload: TickerCachePayload, global: MarcheGlobal | null): Promise<{ ok: boolean; keys: number }> {
  const cfg = kvRestConfig();
  const body = buildMarcheMset(payload, global);
  const keys = (body.length - 1) / 2;
  if (!cfg) return { ok: false, keys };
  try {
    await kvRestCall(cfg.url.replace(/\/$/, ""), {
      method: "POST",
      headers: { Authorization: `Bearer ${cfg.token}`, "Content-Type": "application/json", accept: "application/json" },
      body: JSON.stringify(body),
      cache: "no-store",
      signal: AbortSignal.timeout(5000),
    });
    return { ok: true, keys };
  } catch {
    return { ok: false, keys };
  }
}

/* -------------------------------------------------------------------------- */
/*  Fraîcheur (badges)                                                        */
/* -------------------------------------------------------------------------- */

export function getTickerAgeMs(fetchedAt: string | null): number | null {
  if (!fetchedAt) return null;
  const parsed = Date.parse(fetchedAt);
  if (Number.isNaN(parsed)) return null;
  return Math.max(0, Date.now() - parsed);
}

/**
 * - "fresh" : < 12 min · "indicative" : 12 min - 2 h · "delayed" : au-delà · "unknown" : pas d'heure
 */
export type TickerFreshness = "fresh" | "indicative" | "delayed" | "unknown";

export function classifyTickerFreshness(fetchedAt: string | null): TickerFreshness {
  const age = getTickerAgeMs(fetchedAt);
  if (age === null) return "unknown";
  if (age < 12 * 60 * 1000) return "fresh";
  if (age < 2 * 60 * 60 * 1000) return "indicative";
  return "delayed";
}
