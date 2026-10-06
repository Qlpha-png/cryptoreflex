/**
 * lib/data-sources/cross-check.ts — Contrôle croisé ÉCONOME des prix du top 20 (06/10/2026).
 *
 * - Au plus 1 fois par heure et par instance (mémoire du processus, aucune écriture KV).
 * - Compare, pour chaque crypto du top 20 : CoinMarketCap (classement déjà en cache → 0 crédit de plus) et les
 *   places de marché sans clé ni quota (Binance data-api, Kraken, Coinbase, KuCoin).
 * - Seuils : 1 % (0,5 % pour les stablecoins) d'écart à la MÉDIANE, avec au moins 3 prix pour trancher.
 *   Une cotation CMC de plus de 10 min n'est pas comparée (elle serait en retard, pas fausse).
 * - Une source qui s'écarte est journalisée « [cross-check] … » et mise de côté 1 h POUR CETTE crypto seulement
 *   (lib/data-sources/health.ts → markSuspect) : la source suivante de la table prend le relais.
 */

import { markSuspect } from "./health";
import { isStablecoin } from "./sanity";
import type { SourceName } from "./priorities";

export const CROSS_CHECK = {
  INTERVAL_MS: 60 * 60_000,
  TOP_N: 20,
  THRESHOLD: 0.01,
  STABLE_THRESHOLD: 0.005,
  MAX_AGGREGATOR_AGE_MS: 10 * 60_000,
  MIN_PRICES: 3,
} as const;

export interface CrossCheckCoin {
  id: string;
  symbol: string;
  name: string;
}

export interface PricePoint {
  source: SourceName;
  price: number;
  /** Date de la cotation (agrégateurs) : au-delà de MAX_AGGREGATOR_AGE_MS, le point est ignoré. */
  quotedAt?: string | null;
}

export interface CrossCheckDivergence {
  id: string;
  symbol: string;
  source: SourceName;
  price: number;
  median: number;
  gapPct: number;
  thresholdPct: number;
}

export interface CrossCheckReport {
  at: string;
  compared: number;
  tooOld: number;
  divergences: CrossCheckDivergence[];
}

export interface CrossCheckDeps {
  /** Top 20 à contrôler. */
  coins: () => Promise<CrossCheckCoin[]>;
  /** Prix de chaque source pour une crypto. */
  prices: (coin: CrossCheckCoin) => Promise<PricePoint[]>;
  now?: number;
}

let lastRunAt = 0;
let running = false;

function median(values: number[]): number {
  const s = [...values].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

export async function runCrossCheck(deps: CrossCheckDeps): Promise<CrossCheckReport> {
  const now = deps.now ?? Date.now();
  const coins = (await deps.coins()).slice(0, CROSS_CHECK.TOP_N);
  const report: CrossCheckReport = { at: new Date(now).toISOString(), compared: 0, tooOld: 0, divergences: [] };
  for (const coin of coins) {
    let points: PricePoint[] = [];
    try {
      points = await deps.prices(coin);
    } catch {
      continue;
    }
    points = points.filter((p) => {
      if (!(Number.isFinite(p.price) && p.price > 0)) return false;
      if (p.quotedAt) {
        const age = now - Date.parse(p.quotedAt);
        if (Number.isFinite(age) && age > CROSS_CHECK.MAX_AGGREGATOR_AGE_MS) {
          report.tooOld++;
          return false;
        }
      }
      return true;
    });
    if (points.length < CROSS_CHECK.MIN_PRICES) continue;
    report.compared++;
    const med = median(points.map((p) => p.price));
    const threshold = isStablecoin(coin.symbol) ? CROSS_CHECK.STABLE_THRESHOLD : CROSS_CHECK.THRESHOLD;
    for (const p of points) {
      const gap = Math.abs(p.price / med - 1);
      if (gap > threshold) {
        const d: CrossCheckDivergence = {
          id: coin.id,
          symbol: coin.symbol,
          source: p.source,
          price: p.price,
          median: med,
          gapPct: Math.round(gap * 10_000) / 100,
          thresholdPct: threshold * 100,
        };
        report.divergences.push(d);
        markSuspect(p.source, coin.id, `écart ${d.gapPct} % à la médiane`, now);
        // eslint-disable-next-line no-console
        console.warn(
          `[cross-check] ${coin.symbol} (${coin.id}) : ${p.source} à ${p.price} s'écarte de ${d.gapPct} % de la médiane ${med} (${points.length} sources, seuil ${d.thresholdPct} %) → mise de côté 1 h pour cette crypto`,
        );
      }
    }
  }
  return report;
}

/** Lance le contrôle si la dernière exécution (dans cette instance) date de plus d'une heure. Jamais bloquant. */
export async function maybeRunCrossCheck(deps: CrossCheckDeps): Promise<CrossCheckReport | null> {
  const now = deps.now ?? Date.now();
  if (running || now - lastRunAt < CROSS_CHECK.INTERVAL_MS) return null;
  running = true;
  lastRunAt = now;
  try {
    return await runCrossCheck({ ...deps, now });
  } catch {
    return null;
  } finally {
    running = false;
  }
}

/** Tests uniquement. */
export function __resetCrossCheckForTests(): void {
  lastRunAt = 0;
  running = false;
}
