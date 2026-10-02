/**
 * lib/correlation.ts — Statistical helpers for crypto pair pages.
 *
 * Pearson correlation coefficient + 7d sparkline correlation between two
 * coins. Used by /vs/[a]/[b] to surface a real signal ("BTC and ETH bouge à
 * 0.92 sur 7j") instead of a hallucinated one.
 *
 * Implementation notes :
 *   - Pearson is computed inline (no SciPy dep needed for a 168-points series)
 *   - Series are aligned by truncating to min length (rare drift on fresh
 *     tokens with < 168 hourly points).
 *   - PERF 2026-10-02 — pure function over the sparklines the page ALREADY
 *     has (fetchCoinDetailDaily). The former `getPairCorrelation7d`
 *     (unstable_cache per pair) re-fetched both coin details inside the cache
 *     callback, where Next 14 forces every nested fetch/cache to no-store:
 *     a second, uncached network chain on every new pair (+1 Data Cache write
 *     per pair). Removed.
 */

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
 * Corrélation 7j entre deux sparklines horaires (mêmes règles que l'ancien
 * `getPairCorrelation7d`, sans aucun appel réseau).
 *
 * Renvoie `null` si une série manque ou compte moins de 24 points, ou si la
 * corrélation est indéfinie (variance nulle).
 */
export function correlationFromSparklines(
  sparklineA: number[] | null | undefined,
  sparklineB: number[] | null | undefined,
): number | null {
  const sa = sparklineA ?? [];
  const sb = sparklineB ?? [];
  if (sa.length < 24 || sb.length < 24) return null;
  // Aligne les longueurs en tronquant à la plus courte (rare drift sur tokens
  // récents qui ont moins de 168 points horaires).
  const len = Math.min(sa.length, sb.length);
  const r = pearsonCorrelation(sa.slice(0, len), sb.slice(0, len));
  if (Number.isNaN(r)) return null;
  return r;
}
