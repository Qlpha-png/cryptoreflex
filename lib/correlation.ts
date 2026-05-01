/**
 * lib/correlation.ts — Statistical helpers for crypto pair pages.
 *
 * Pearson correlation coefficient + cached 7d sparkline correlation between
 * any two CoinGecko IDs. Used by /comparer/[a]/[b] to surface a real signal
 * ("BTC and ETH bouge à 0.92 sur 7j") instead of a hallucinated one.
 *
 * Implementation notes :
 *   - Pearson is computed inline (no SciPy dep needed for a 168-points series)
 *   - We call CoinGecko `/coins/markets?sparkline=true` for both coins in
 *     parallel and align series by truncating to min length (rare drift on
 *     fresh tokens with < 168 hourly points).
 *   - Result is cached 1h via `unstable_cache` to stay under the 30 req/min
 *     CoinGecko Demo tier with 435 pages × 2 coins = 870 lookups per build.
 */

import { unstable_cache } from "next/cache";
import { fetchCoinDetail } from "@/lib/coingecko";

/**
 * Pearson correlation coefficient between two equal-length numeric series.
 *
 * Returns a number in [-1, 1]. Returns NaN if :
 *   - series have different lengths
 *   - series have less than 2 valid points
 *   - one series has zero variance (flat line, undefined correlation)
 *
 * Formula (textbook) :
 *   r = Σ((xi - x̄)(yi - ȳ)) / √(Σ(xi - x̄)² · Σ(yi - ȳ)²)
 */
export function pearsonCorrelation(a: number[], b: number[]): number {
  if (!Array.isArray(a) || !Array.isArray(b)) return NaN;
  if (a.length !== b.length || a.length < 2) return NaN;

  const n = a.length;
  let sumA = 0;
  let sumB = 0;
  for (let i = 0; i < n; i++) {
    sumA += a[i];
    sumB += b[i];
  }
  const meanA = sumA / n;
  const meanB = sumB / n;

  let num = 0;
  let denomA = 0;
  let denomB = 0;
  for (let i = 0; i < n; i++) {
    const da = a[i] - meanA;
    const db = b[i] - meanB;
    num += da * db;
    denomA += da * da;
    denomB += db * db;
  }
  const denom = Math.sqrt(denomA * denomB);
  if (denom === 0) return NaN;
  const r = num / denom;
  // Clamp to handle floating-point overshoot like 1.0000000002.
  if (r > 1) return 1;
  if (r < -1) return -1;
  return r;
}

/**
 * Verdict humain pour une corrélation Pearson sur 7j.
 *
 * Seuils issus de la pratique financière courante (pas du purement académique
 * 0.5 / 0.7 / 0.9 — on raisonne en allocation portefeuille).
 */
export function describeCorrelation(r: number): string {
  if (Number.isNaN(r)) return "Donnée non disponible";
  const abs = Math.abs(r);
  const sign = r >= 0 ? "positive" : "négative";
  if (abs >= 0.85) return `Corrélation ${sign} très forte (${r.toFixed(2)})`;
  if (abs >= 0.6) return `Corrélation ${sign} forte (${r.toFixed(2)})`;
  if (abs >= 0.3) return `Corrélation ${sign} modérée (${r.toFixed(2)})`;
  if (abs >= 0.1) return `Corrélation ${sign} faible (${r.toFixed(2)})`;
  return `Quasi indépendantes (${r.toFixed(2)})`;
}

/**
 * Récupère la corrélation 7j (sparkline horaire CoinGecko) entre 2 cryptos.
 *
 * Renvoie `null` si l'une des deux séries est vide / API down.
 *
 * Cache 1h pour rester sous les 30 req/min CoinGecko Demo (435 paires × 2
 * coins = 870 fetchs au pire ; en pratique, fetchCoinDetail est déjà caché
 * 5 min côté coingecko.ts donc on profite de son tag invalidation).
 */
async function _getPairCorrelation7d(
  coingeckoIdA: string,
  coingeckoIdB: string,
): Promise<number | null> {
  const [a, b] = await Promise.all([
    fetchCoinDetail(coingeckoIdA),
    fetchCoinDetail(coingeckoIdB),
  ]);
  if (!a || !b) return null;
  const sa = a.sparkline7d ?? [];
  const sb = b.sparkline7d ?? [];
  if (sa.length < 24 || sb.length < 24) return null;
  // Aligne les longueurs en tronquant à la plus courte (rare drift sur tokens
  // récents qui ont moins de 168 points horaires).
  const len = Math.min(sa.length, sb.length);
  const r = pearsonCorrelation(sa.slice(0, len), sb.slice(0, len));
  if (Number.isNaN(r)) return null;
  return r;
}

export const getPairCorrelation7d = unstable_cache(
  _getPairCorrelation7d,
  ["pair-correlation-7d-v1"],
  { revalidate: 3600, tags: ["coingecko:market"] },
);
