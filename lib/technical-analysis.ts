/**
 * lib/technical-analysis.ts — Calculs purs d'indicateurs techniques.
 *
 * Toutes les fonctions sont :
 *  - 100% pures (aucun side effect, aucun fetch)
 *  - typées strictement
 *  - testables unitairement
 *  - défensives sur les inputs (length insuffisante → renvoie une valeur safe)
 *
 * Conventions :
 *  - `prices` = série temporelle de close quotidien, ordre chronologique
 *    (plus ancien en index 0, plus récent en dernier index).
 *  - Périodes par défaut alignées avec les pratiques TA standard (RSI=14,
 *    MACD=12/26/9, Bollinger=20/2).
 *
 * Source de vérité mathématique :
 *  - RSI : Wilder's smoothing (J. Welles Wilder, "New Concepts in Technical
 *    Trading Systems", 1978). Validation : RSI ∈ [0,100], 50 = équilibre,
 *    >70 = surachat, <30 = survente.
 *  - MACD : EMA12 - EMA26, signal = EMA9 du MACD, histogram = MACD - signal.
 *  - Bollinger : MA20 ± k×std(20).
 *  - Volatilité : std des returns log × √252 (annualisation TA standard).
 */

import type {
  BollingerValue,
  Indicators,
  Levels,
  MACDValue,
  Trend,
} from "./ta-types";

/* -------------------------------------------------------------------------- */
/*  Helpers internes                                                          */
/* -------------------------------------------------------------------------- */

/** Moyenne arithmétique simple. */
function mean(values: number[]): number {
  if (values.length === 0) return 0;
  let sum = 0;
  for (const v of values) sum += v;
  return sum / values.length;
}

/** Écart-type population (n, pas n-1) — convention TA pour Bollinger/Vol. */
function stdDev(values: number[]): number {
  if (values.length === 0) return 0;
  const m = mean(values);
  let sumSq = 0;
  for (const v of values) {
    const d = v - m;
    sumSq += d * d;
  }
  return Math.sqrt(sumSq / values.length);
}

/** Arrondit à `decimals` décimales (anti flottants moches). */
function round(value: number, decimals = 4): number {
  if (!Number.isFinite(value)) return 0;
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

/* -------------------------------------------------------------------------- */
/*  RSI — Wilder's smoothing                                                  */
/* -------------------------------------------------------------------------- */

/**
 * Calcule le Relative Strength Index (RSI) avec lissage Wilder.
 *
 * Algorithme :
 *   1. Calcule les gains/pertes successifs (Δ = price[i] - price[i-1]).
 *   2. Moyenne initiale (sur les `period` premiers Δ) : SMA des gains, SMA des pertes.
 *   3. Pour chaque Δ suivant : avgGain = (avgGain*(p-1) + currentGain) / p
 *                              avgLoss = (avgLoss*(p-1) + currentLoss) / p
 *   4. RS = avgGain / avgLoss ; RSI = 100 - 100 / (1+RS).
 *
 * Cas limites :
 *  - Si avgLoss === 0 → RSI = 100 (pas de baisse, surachat extrême).
 *  - Si avgGain === 0 → RSI = 0 (pas de hausse, survente extrême).
 *  - Si `prices.length < period+1` → renvoie 50 (neutre, faute de signal).
 *
 * @param prices Série de prix close (chronologique).
 * @param period Période par défaut 14 (standard Wilder).
 * @returns RSI ∈ [0, 100], arrondi 2 décimales.
 */
export function calcRSI(prices: number[], period = 14): number {
  if (prices.length < period + 1) return 50;

  let avgGain = 0;
  let avgLoss = 0;

  // 1. Initialisation : SMA des `period` premiers gains/pertes.
  for (let i = 1; i <= period; i++) {
    const diff = prices[i]! - prices[i - 1]!;
    if (diff >= 0) avgGain += diff;
    else avgLoss -= diff; // |Δ|
  }
  avgGain /= period;
  avgLoss /= period;

  // 2. Smoothing Wilder pour le reste.
  for (let i = period + 1; i < prices.length; i++) {
    const diff = prices[i]! - prices[i - 1]!;
    const gain = diff > 0 ? diff : 0;
    const loss = diff < 0 ? -diff : 0;
    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;
  }

  if (avgLoss === 0) return avgGain === 0 ? 50 : 100;
  if (avgGain === 0) return 0;

  const rs = avgGain / avgLoss;
  const rsi = 100 - 100 / (1 + rs);
  return round(rsi, 2);
}

/* -------------------------------------------------------------------------- */
/*  Moyennes mobiles                                                          */
/* -------------------------------------------------------------------------- */

/**
 * Moyenne mobile simple (SMA) sur les `period` derniers points.
 * Si `prices.length < period`, on retombe sur la moyenne globale (mieux que 0).
 *
 * @returns valeur SMA arrondie 4 décimales.
 */
export function calcMA(prices: number[], period: number): number {
  if (prices.length === 0 || period <= 0) return 0;
  const slice = prices.length < period ? prices : prices.slice(-period);
  return round(mean(slice), 4);
}

/**
 * Moyenne mobile exponentielle (EMA).
 *
 * Algorithme :
 *   k = 2 / (period + 1) (smoothing factor)
 *   EMA[0] = SMA(prices[0..period-1]) (graine)
 *   EMA[t] = price[t] × k + EMA[t-1] × (1-k)
 *
 * Comparé à la SMA, l'EMA pondère davantage les points récents → plus réactive.
 *
 * @returns dernière EMA arrondie 4 décimales.
 */
export function calcEMA(prices: number[], period: number): number {
  if (prices.length === 0 || period <= 0) return 0;
  if (prices.length < period) return round(mean(prices), 4);

  const k = 2 / (period + 1);
  // Graine : SMA des `period` premiers points.
  let ema = mean(prices.slice(0, period));
  for (let i = period; i < prices.length; i++) {
    ema = prices[i]! * k + ema * (1 - k);
  }
  return round(ema, 4);
}

/**
 * Variante interne : retourne TOUTE la série EMA (utile pour calculer
 * EMA9(MACD) par-dessus la série MACD).
 */
function calcEMASeries(prices: number[], period: number): number[] {
  if (prices.length === 0 || period <= 0) return [];
  if (prices.length < period) {
    // Pas assez de données → série dégénérée (1 point = moyenne).
    return [mean(prices)];
  }
  const k = 2 / (period + 1);
  const out: number[] = [];
  let ema = mean(prices.slice(0, period));
  out.push(ema);
  for (let i = period; i < prices.length; i++) {
    ema = prices[i]! * k + ema * (1 - k);
    out.push(ema);
  }
  return out;
}

/* -------------------------------------------------------------------------- */
/*  MACD                                                                      */
/* -------------------------------------------------------------------------- */

/**
 * Calcule le MACD (Moving Average Convergence Divergence).
 *
 * Composants standards :
 *  - MACD line = EMA(12) - EMA(26)
 *  - Signal     = EMA(9) du MACD line
 *  - Histogram  = MACD - Signal
 *
 * Lecture :
 *  - histogram > 0 ET croissant → momentum haussier.
 *  - histogram < 0 ET décroissant → momentum baissier.
 *  - Croisement MACD/Signal = signal classique d'entrée/sortie.
 *
 * Si `prices.length < 26+9` → renvoie zéros (pas assez de signal).
 *
 * @returns { macd, signal, histogram } arrondis 4 décimales.
 */
export function calcMACD(prices: number[]): MACDValue {
  if (prices.length < 26) {
    return { macd: 0, signal: 0, histogram: 0 };
  }

  // Pour calculer Signal = EMA9(MACD), il faut une SÉRIE de MACD,
  // pas juste la dernière valeur. On reconstruit MACD[t] pour t allant
  // de l'index 26 à la fin.
  const ema12Series = calcEMASeries(prices, 12);
  const ema26Series = calcEMASeries(prices, 26);

  // Aligner les deux séries : ema12 a (length - 12 + 1) points,
  // ema26 a (length - 26 + 1) points. On aligne par la fin (offset).
  const offset = ema12Series.length - ema26Series.length;
  const macdSeries: number[] = [];
  for (let i = 0; i < ema26Series.length; i++) {
    macdSeries.push(ema12Series[i + offset]! - ema26Series[i]!);
  }

  const macd = macdSeries[macdSeries.length - 1] ?? 0;

  // Signal : EMA9 du MACD série. Si trop court, utilise SMA fallback.
  const signal =
    macdSeries.length >= 9
      ? calcEMA(macdSeries, 9)
      : mean(macdSeries);

  return {
    macd: round(macd, 4),
    signal: round(signal, 4),
    histogram: round(macd - signal, 4),
  };
}

/* -------------------------------------------------------------------------- */
/*  Bollinger Bands                                                           */
/* -------------------------------------------------------------------------- */

/**
 * Bandes de Bollinger : MA(period) ± k × stdDev(period).
 *
 * Lecture :
 *  - Prix touche bande supérieure → tension haussière (souvent retracement).
 *  - Prix touche bande inférieure → tension baissière (souvent rebond).
 *  - Largeur (upper-lower) faible = consolidation, gros mouvement à venir.
 *
 * Si `prices.length < period` → utilise toute la série disponible.
 *
 * @returns { upper, middle, lower } arrondis 4 décimales.
 */
export function calcBollinger(
  prices: number[],
  period = 20,
  k = 2,
): BollingerValue {
  if (prices.length === 0) return { upper: 0, middle: 0, lower: 0 };

  const slice = prices.length < period ? prices : prices.slice(-period);
  const middle = mean(slice);
  const sd = stdDev(slice);

  return {
    upper: round(middle + k * sd, 4),
    middle: round(middle, 4),
    lower: round(middle - k * sd, 4),
  };
}

/* -------------------------------------------------------------------------- */
/*  Détection de tendance                                                     */
/* -------------------------------------------------------------------------- */

/**
 * Détecte la tendance macro à partir de :
 *   1. Position MA50 vs MA200 (Golden Cross / Death Cross).
 *   2. Slope de la MA50 sur les 20 dernières périodes.
 *
 * Règles :
 *  - bullish si MA50 > MA200 ET slope MA50 > 0.5% sur 20j.
 *  - bearish si MA50 < MA200 ET slope MA50 < -0.5% sur 20j.
 *  - neutral sinon (cross récent, slope plat, données insuffisantes).
 *
 * Si la série est trop courte (< 200 points), on retombe sur MA50 vs MA20
 * comme proxy faible — utile pour ne jamais renvoyer "neutral" par défaut
 * sur des cryptos jeunes mais clairement directionnelles.
 */
export function detectTrend(prices: number[]): Trend {
  if (prices.length < 50) return "neutral";

  const ma50 = calcMA(prices, 50);

  // Cas dégradé : pas 200 points → on compare MA50 vs MA20.
  if (prices.length < 200) {
    const ma20 = calcMA(prices, 20);
    if (ma50 > ma20 * 1.01) return "bullish";
    if (ma50 < ma20 * 0.99) return "bearish";
    return "neutral";
  }

  const ma200 = calcMA(prices, 200);

  // Slope MA50 = (MA50_now - MA50_il_y_a_20j) / MA50_il_y_a_20j.
  const ma50Past = calcMA(prices.slice(0, prices.length - 20), 50);
  const slopePct =
    ma50Past === 0 ? 0 : (ma50 - ma50Past) / ma50Past;

  const aboveLong = ma50 > ma200;
  const belowLong = ma50 < ma200;

  if (aboveLong && slopePct > 0.005) return "bullish";
  if (belowLong && slopePct < -0.005) return "bearish";
  return "neutral";
}

/* -------------------------------------------------------------------------- */
/*  Supports & Résistances (pivots highs/lows)                                */
/* -------------------------------------------------------------------------- */

/**
 * Détecte supports et résistances par pivots locaux.
 *
 * Algorithme :
 *  1. Pour chaque point i ∈ [w, n-w[, on regarde une fenêtre de ±w.
 *  2. Si prices[i] = max local sur la fenêtre → résistance.
 *  3. Si prices[i] = min local sur la fenêtre → support.
 *  4. On dédoublonne les niveaux trop proches (< 0.5%).
 *  5. On garde les `depth` derniers points (plus récents = plus pertinents).
 *  6. On limite à 5 supports + 5 résistances pour rester lisible.
 *
 * Sortie triée :
 *  - supports : du plus haut (plus proche du prix actuel) au plus bas.
 *  - resistances : du plus bas (plus proche) au plus haut.
 *
 * @param prices série chronologique
 * @param depth nombre de points récents à analyser (défaut 50)
 */
export function findSupportResistance(
  prices: number[],
  depth = 50,
): Levels {
  if (prices.length < 5) return { supports: [], resistances: [] };

  // On limite la profondeur d'analyse aux `depth` derniers jours.
  const series = prices.slice(-depth);
  const w = 2; // fenêtre pivot ±2 points (5 jours total)

  const supports: number[] = [];
  const resistances: number[] = [];

  for (let i = w; i < series.length - w; i++) {
    const window = series.slice(i - w, i + w + 1);
    const center = series[i]!;
    const max = Math.max(...window);
    const min = Math.min(...window);
    if (center === max && center !== min) resistances.push(center);
    if (center === min && center !== max) supports.push(center);
  }

  // Dédoublonnage : si deux niveaux sont à < 0.5% l'un de l'autre, on garde le plus récent.
  function dedupe(arr: number[]): number[] {
    const sorted = [...arr].sort((a, b) => a - b);
    const out: number[] = [];
    for (const v of sorted) {
      const last = out[out.length - 1];
      if (last === undefined || Math.abs(v - last) / last > 0.005) {
        out.push(v);
      }
    }
    return out;
  }

  const cleanSupports = dedupe(supports);
  const cleanResistances = dedupe(resistances);

  // Tri final orienté UI : supports décroissants (plus proche du prix d'abord),
  // résistances croissantes (plus proche du prix d'abord).
  // On limite à 5/5 pour ne pas surcharger.
  return {
    supports: cleanSupports.sort((a, b) => b - a).slice(0, 5),
    resistances: cleanResistances.sort((a, b) => a - b).slice(0, 5),
  };
}

/* -------------------------------------------------------------------------- */
/*  Volatilité annualisée                                                     */
/* -------------------------------------------------------------------------- */

/**
 * Volatilité annualisée (%) calculée sur les returns log des `period` dernières
 * périodes, multiplié par √252 (jours de bourse / convention finance).
 *
 * Pour la crypto qui trade 24/7, on pourrait utiliser √365 — on garde √252
 * pour l'homogénéité avec les outils TradFi (TradingView, Binance).
 *
 * Formule :
 *   r[i] = ln(price[i] / price[i-1])
 *   σ_period = stdDev(r)
 *   σ_annualisée = σ_period × √252 × 100
 *
 * @param prices série chronologique
 * @param period nombre de returns à utiliser (défaut 14)
 * @returns volatilité annualisée en %, arrondie 2 décimales.
 */
export function calcVolatility(prices: number[], period = 14): number {
  if (prices.length < period + 1) return 0;

  const slice = prices.slice(-(period + 1));
  const returns: number[] = [];
  for (let i = 1; i < slice.length; i++) {
    const prev = slice[i - 1]!;
    const curr = slice[i]!;
    if (prev > 0 && curr > 0) {
      returns.push(Math.log(curr / prev));
    }
  }

  if (returns.length === 0) return 0;

  const sigma = stdDev(returns);
  const annualized = sigma * Math.sqrt(252) * 100;
  return round(annualized, 2);
}

/* -------------------------------------------------------------------------- */
/*  Helper agrégation                                                         */
/* -------------------------------------------------------------------------- */

/**
 * Calcule l'ensemble des indicateurs en une passe — utilisé par le cron pour
 * éviter la duplication de logique dans chaque appel.
 */
export function calcAllIndicators(prices: number[]): Indicators {
  return {
    rsi: calcRSI(prices, 14),
    ma50: calcMA(prices, 50),
    ma200: calcMA(prices, 200),
    ema12: calcEMA(prices, 12),
    ema26: calcEMA(prices, 26),
    macd: calcMACD(prices),
    bollinger: calcBollinger(prices, 20, 2),
  };
}
