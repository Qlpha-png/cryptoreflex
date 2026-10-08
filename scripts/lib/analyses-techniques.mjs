/**
 * scripts/lib/analyses-techniques.mjs — robot des analyses techniques (lot L1 du regroupement, 08/10/2026).
 *
 * Une page vivante par crypto (/analyses-techniques/<slug>) lit data/analyses-techniques/<slug>.json. Le robot met ce
 * fichier à jour chaque jour ; il n'écrit plus AUCUN fichier daté (les 368 analyses MDX ont été importées dans
 * `history`, puis supprimées).
 *
 * Données : cours de CLÔTURE journaliers en euros, bougies terminées seulement (la bougie du jour en cours est écartée :
 * deux passages le même jour donnent les mêmes chiffres). Source principale : API publique de Kraken (OHLC quotidien,
 * 720 bougies, plateforme autorisée en France, euros natifs) ; repli : data-api.binance.vision (paires EUR). Une source
 * qui échoue ou renvoie moins de 201 clôtures passe la main à la suivante ; si les deux échouent, le fichier n'est pas
 * touché (la page affiche le bandeau « donnée ancienne » après 36 h). Reprise L2 du 08/10/2026 : repli CoinGecko RETIRÉ
 * (l'offre Demo n'a pas de licence commerciale : le site et son CSV auraient republié ses données).
 *
 * Calculs (valeurs brutes stockées, arrondi à l'affichage seulement) : RSI de Wilder sur 14 jours, moyennes
 * arithmétiques 50 et 200 jours, volatilité 30 jours (écart-type des rendements logarithmiques quotidiens, annualisé
 * sur 365 jours), tendance selon la règle historique du robot (detectTrend), écrite dans les données.
 *
 * Règles : idempotent (même jour UTC = l'entrée du jour est remplacée) ; une crypto en échec n'est PAS touchée (son
 * `calculatedAt` reste ancien, la page affiche alors le bandeau « donnée ancienne » après 36 h) ; écriture atomique.
 * Le robot n'écrit aucun mot : tout le texte est dans le gabarit de la page.
 */

import { promises as fs } from "node:fs";
import path from "node:path";

export const TA_CRYPTOS = [
  { slug: "bitcoin", symbol: "BTC", name: "Bitcoin", kraken: "XBTEUR", binance: "BTCEUR", coingeckoId: "bitcoin" },
  { slug: "ethereum", symbol: "ETH", name: "Ethereum", kraken: "ETHEUR", binance: "ETHEUR", coingeckoId: "ethereum" },
  { slug: "solana", symbol: "SOL", name: "Solana", kraken: "SOLEUR", binance: "SOLEUR", coingeckoId: "solana" },
  { slug: "xrp", symbol: "XRP", name: "XRP", kraken: "XRPEUR", binance: "XRPEUR", coingeckoId: "ripple" },
  { slug: "cardano", symbol: "ADA", name: "Cardano", kraken: "ADAEUR", binance: "ADAEUR", coingeckoId: "cardano" },
];

export const TREND_RULE =
  "haussière si le cours est au-dessus de la moyenne 50 jours et celle-ci au-dessus de la moyenne 200 jours ; baissière si le cours est en dessous de la moyenne 50 jours et celle-ci en dessous de la moyenne 200 jours ; neutre sinon";

export const SOURCES = {
  kraken: { label: "Kraken (API publique)" },
  "binance-data-api": { label: "Binance (données publiques de marché)" },
};

const MIN_CLOSES = 201; // MA200 + au moins une variation
const isoDay = (ms) => new Date(ms).toISOString().slice(0, 10);

/* -------------------------------------------------------------------------- */
/*  Calculs                                                                   */
/* -------------------------------------------------------------------------- */

/** RSI de Wilder (lissage exponentiel 1/période), sur toute la série fournie. Valeur brute, non arrondie. */
export function rsiWilder(closes, period = 14) {
  if (closes.length < period + 1) throw new Error(`RSI : ${closes.length} clôtures, ${period + 1} au moins`);
  let gains = 0;
  let losses = 0;
  for (let i = 1; i <= period; i++) {
    const d = closes[i] - closes[i - 1];
    if (d > 0) gains += d;
    else losses -= d;
  }
  let avgGain = gains / period;
  let avgLoss = losses / period;
  for (let i = period + 1; i < closes.length; i++) {
    const d = closes[i] - closes[i - 1];
    avgGain = (avgGain * (period - 1) + (d > 0 ? d : 0)) / period;
    avgLoss = (avgLoss * (period - 1) + (d < 0 ? -d : 0)) / period;
  }
  if (avgLoss === 0) return 100;
  return 100 - 100 / (1 + avgGain / avgLoss);
}

/** Moyenne arithmétique des `period` dernières clôtures. */
export function sma(closes, period) {
  if (closes.length < period) throw new Error(`MA${period} : ${closes.length} clôtures`);
  let s = 0;
  for (let i = closes.length - period; i < closes.length; i++) s += closes[i];
  return s / period;
}

/** Volatilité sur `days` jours, en % : écart-type (échantillon) des rendements logarithmiques quotidiens × √365 × 100. */
export function volatility(closes, days = 30) {
  if (closes.length < days + 1) throw new Error(`volatilité : ${closes.length} clôtures`);
  const r = [];
  for (let i = closes.length - days; i < closes.length; i++) r.push(Math.log(closes[i] / closes[i - 1]));
  const mean = r.reduce((s, x) => s + x, 0) / r.length;
  const variance = r.reduce((s, x) => s + (x - mean) ** 2, 0) / (r.length - 1);
  return Math.sqrt(variance) * Math.sqrt(365) * 100;
}

/** Règle historique du robot (detectTrend), au féminin (« tendance calculée »). */
export function trendOf(price, ma50, ma200) {
  if (ma50 > ma200 && price > ma50) return "haussière";
  if (ma50 < ma200 && price < ma50) return "baissière";
  return "neutre";
}

/** Indicateurs d'une série de clôtures journalières terminées ({ date, close }[], ordre chronologique). */
export function computeIndicators(series) {
  if (series.length < MIN_CLOSES) throw new Error(`historique trop court : ${series.length} clôtures (${MIN_CLOSES} au moins)`);
  const closes = series.map((p) => p.close);
  const price = closes[closes.length - 1];
  const ma50 = sma(closes, 50);
  const ma200 = sma(closes, 200);
  return {
    closeDate: series[series.length - 1].date,
    price,
    change24h: (price / closes[closes.length - 2] - 1) * 100,
    rsi14: rsiWilder(closes, 14),
    ma50,
    ma200,
    vol30: volatility(closes, 30),
    trend: trendOf(price, ma50, ma200),
    closes30: closes.slice(-30),
  };
}

/* -------------------------------------------------------------------------- */
/*  Sources (bougies journalières TERMINÉES uniquement)                        */
/* -------------------------------------------------------------------------- */

function cleanSeries(points) {
  const byDay = new Map();
  for (const p of points) if (Number.isFinite(p.close) && p.close > 0) byDay.set(p.date, p.close);
  return [...byDay.entries()].sort((a, b) => (a[0] < b[0] ? -1 : 1)).map(([date, close]) => ({ date, close }));
}

/** Nouvelles tentatives sur une coupure réseau, un 429 ou un 5xx (08/10/2026 : un « fetch failed » isolé sur Kraken faisait
 *  passer le bitcoin sur le repli, et deux passages du même jour n'auraient plus eu la même source). Réglable pour les tests. */
export const RETRY = { attempts: 3, delayMs: 2000 };

async function getJson(fetchImpl, url, label) {
  for (let i = 1; ; i++) {
    let res;
    try {
      res = await fetchImpl(url, { headers: { "User-Agent": "Cryptoreflex-DailyBot/1.0" }, signal: AbortSignal.timeout(15000) });
    } catch (e) {
      if (i < RETRY.attempts) { await new Promise((r) => setTimeout(r, RETRY.delayMs * i)); continue; }
      throw new Error(`${label} : ${e.message}`);
    }
    if (res.ok) return res.json();
    if ((res.status === 429 || res.status >= 500) && i < RETRY.attempts) { await new Promise((r) => setTimeout(r, RETRY.delayMs * i)); continue; }
    throw new Error(`${label} → ${res.status}`);
  }
}

/** Kraken OHLC (interval=1440) : [time (s, début de la bougie), open, high, low, close, vwap, volume, count]. */
export async function krakenDaily(crypto, { fetchImpl = fetch, nowMs = Date.now() } = {}) {
  const j = await getJson(fetchImpl, `https://api.kraken.com/0/public/OHLC?pair=${crypto.kraken}&interval=1440`, `Kraken ${crypto.kraken}`);
  if (Array.isArray(j?.error) && j.error.length) throw new Error(`Kraken ${crypto.kraken} : ${j.error.join(", ")}`);
  const key = Object.keys(j?.result ?? {}).find((k) => k !== "last");
  const rows = key ? j.result[key] : null;
  if (!Array.isArray(rows)) throw new Error(`Kraken ${crypto.kraken} : réponse sans bougies`);
  return cleanSeries(
    rows.filter((r) => (Number(r[0]) + 86_400) * 1000 <= nowMs).map((r) => ({ date: isoDay(Number(r[0]) * 1000), close: parseFloat(r[4]) })),
  );
}

/** Binance (data-api.binance.vision) klines 1d : [openTime (ms), open, high, low, close, volume, closeTime (ms), …]. */
export async function binanceDaily(crypto, { fetchImpl = fetch, nowMs = Date.now() } = {}) {
  const rows = await getJson(
    fetchImpl,
    `https://data-api.binance.vision/api/v3/klines?symbol=${crypto.binance}&interval=1d&limit=1000`,
    `Binance ${crypto.binance}`,
  );
  if (!Array.isArray(rows)) throw new Error(`Binance ${crypto.binance} : réponse invalide`);
  return cleanSeries(rows.filter((k) => Number(k[6]) < nowMs).map((k) => ({ date: isoDay(Number(k[0])), close: parseFloat(k[4]) })));
}

/** Chaîne des sources, dans l'ordre. Pas de CoinGecko (licence : voir l'en-tête). */
export const SOURCE_CHAIN = [
  { id: "kraken", pair: (c) => c.kraken, fetchSeries: krakenDaily },
  { id: "binance-data-api", pair: (c) => c.binance, fetchSeries: binanceDaily },
];

/** Série + indicateurs depuis la première source qui répond avec assez de clôtures. Lève si toutes échouent. */
export async function fetchIndicators(crypto, { fetchImpl = fetch, nowMs = Date.now(), log = console } = {}) {
  const errors = [];
  for (const s of SOURCE_CHAIN) {
    try {
      const series = await s.fetchSeries(crypto, { fetchImpl, nowMs });
      const ind = computeIndicators(series);
      return { source: s.id, pair: s.pair(crypto), ...ind };
    } catch (e) {
      errors.push(`${s.id} : ${e.message}`);
      log.warn?.(`[ta-source] ${crypto.symbol} ${s.id} : ${e.message}`);
    }
  }
  throw new Error(`toutes les sources ont échoué (${errors.join(" ; ")})`);
}

/* -------------------------------------------------------------------------- */
/*  Fichier de données                                                         */
/* -------------------------------------------------------------------------- */

/** Construit le fichier mis à jour (pur) : `latest` remplacé, ligne du jour remplacée ou ajoutée, historique trié (récent d'abord). */
export function mergeAnalysis(existing, crypto, ind, now) {
  const date = isoDay(now.getTime());
  const calculatedAt = now.toISOString().replace(/\.\d{3}Z$/, "Z");
  const latest = {
    date,
    calculatedAt,
    currency: "EUR",
    source: ind.source,
    sourceLabel: SOURCES[ind.source]?.label ?? ind.source,
    pair: ind.pair,
    closeDate: ind.closeDate,
    price: ind.price,
    change24h: ind.change24h,
    rsi14: ind.rsi14,
    ma50: ind.ma50,
    ma200: ind.ma200,
    vol30: ind.vol30,
    trend: ind.trend,
    trendRule: TREND_RULE,
    closes30: ind.closes30,
  };
  const row = {
    date,
    currency: "EUR",
    price: ind.price,
    rsi14: ind.rsi14,
    ma50: ind.ma50,
    ma200: ind.ma200,
    vol30: ind.vol30,
    trend: ind.trend,
    origin: "publié",
    source: ind.source,
    // reprise L2 : la ligne porte sa paire, sa date de clôture et son heure de calcul (CSV, colonne « Clôture du »)
    pair: ind.pair,
    closeDate: ind.closeDate,
    calculatedAt,
  };
  const history = (existing?.history ?? []).filter((h) => h.date !== date);
  history.push(row);
  history.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
  return { slug: crypto.slug, symbol: crypto.symbol, name: crypto.name, latest, history };
}

/** Sérialisation stable : une ligne d'historique par ligne de fichier (un calcul par jour = une ligne de diff). */
export function serializeAnalysis(a) {
  const head = { slug: a.slug, symbol: a.symbol, name: a.name, latest: a.latest };
  const json = JSON.stringify(head, null, 2);
  const rows = (a.history ?? []).map((h) => `    ${JSON.stringify(h)}`).join(",\n");
  return `${json.slice(0, -2)},\n  "history": ${rows ? `[\n${rows}\n  ]` : "[]"}\n}\n`;
}

async function readJson(file) {
  try {
    return JSON.parse(await fs.readFile(file, "utf8"));
  } catch (e) {
    if (e.code === "ENOENT") return null;
    throw e;
  }
}

async function writeAtomic(file, text) {
  const tmp = `${file}.${process.pid}.tmp`;
  await fs.writeFile(tmp, text, "utf8");
  await fs.rename(tmp, file);
}

/**
 * Met à jour le fichier d'une crypto. En cas d'échec (source, calcul, lecture), le fichier n'est pas touché et l'erreur remonte.
 * @param {{ slug: string, symbol: string, name: string, kraken: string, binance: string, coingeckoId: string }} crypto
 * @param {{ dir: string, fetchImpl?: typeof fetch, now?: Date, log?: Console }} opts
 */
export async function updateAnalysis(crypto, { dir, fetchImpl = fetch, now = new Date(), log = console }) {
  const file = path.join(dir, `${crypto.slug}.json`);
  const existing = await readJson(file); // un fichier illisible lève AVANT tout appel réseau : il reste tel quel
  const ind = await fetchIndicators(crypto, { fetchImpl, nowMs: now.getTime(), log });
  const next = mergeAnalysis(existing, crypto, ind, now);
  await writeAtomic(file, serializeAnalysis(next));
  return next;
}

/**
 * Les 5 cryptos ; compteurs pour le workflow.
 * @param {{ dir: string, fetchImpl?: typeof fetch, now?: Date, log?: Console, cryptos?: typeof TA_CRYPTOS }} opts
 */
export async function generateAnalyses({ dir, fetchImpl = fetch, now = new Date(), log = console, cryptos = TA_CRYPTOS }) {
  await fs.mkdir(dir, { recursive: true });
  let updated = 0;
  let errors = 0;
  for (const crypto of cryptos) {
    try {
      const a = await updateAnalysis(crypto, { dir, fetchImpl, now, log });
      updated++;
      log.log?.(`[ta-update] ${crypto.slug} : ${a.latest.source} ${a.latest.pair}, clôture du ${a.latest.closeDate}`);
    } catch (e) {
      errors++;
      log.error?.(`[ta-error] ${crypto.symbol} : ${e.message} (fichier inchangé)`);
    }
  }
  return { updated, errors };
}
