/**
 * lib/historical-ohlc.ts — accès à l'OHLC annuel pré-généré (data/historical-ohlc.json).
 *
 * Source : klines mensuelles Binance agrégées par année (USD), via
 * scripts/generate-historical-ohlc.mjs. Snapshot statique committé → lecture
 * SYNCHRONE (zéro I/O réseau au build), donc compatible avec le prerender des
 * 900 pages /historique-prix (dynamicParams=false) sans coût ni risque.
 *
 * Pour rafraîchir (notamment l'année en cours) : relancer le script + commit.
 */
import ohlcRaw from "@/data/historical-ohlc.json";

export interface YearOhlc {
  /** ouverture (1er prix de l'année, USD) */
  o: number;
  /** clôture (dernier prix de l'année, USD) */
  c: number;
  /** plus haut de l'année (USD) */
  h: number;
  /** plus bas de l'année (USD) */
  l: number;
  /** variation sur l'année en % (clôture / ouverture - 1) */
  chg: number;
  /** nombre de mois couverts (12 = année pleine ; < 12 = listing en cours d'année ou année partielle) */
  m: number;
  /** volume échangé sur l'année (USDT, arrondi) — absent sur les anciens instantanés */
  q?: number;
  /** bougies mensuelles (ordre chronologique) — absentes sur les anciens instantanés */
  months?: MonthOhlc[];
}

/** une bougie mensuelle Binance (USD) */
export interface MonthOhlc {
  /** mois 1-12 */
  n: number;
  o: number;
  c: number;
  h: number;
  l: number;
  /** variation ouverture→clôture du mois, % entier */
  chg: number;
  /** volume échangé dans le mois (USDT, arrondi) */
  q: number;
}

interface CoinOhlc {
  source: string;
  currency: string;
  years: Record<string, YearOhlc>;
}

const DATA = (ohlcRaw as { data: Record<string, CoinOhlc> }).data;

/** Date de génération du relevé (meta._generatedAt, « AAAA-MM-JJ ») : dernier point possible de l'année en cours.
 *  null si absente. 08/10/2026 (lot fraîcheur A) : affichée à la place de « données mises à jour mensuellement »,
 *  promesse qu'aucun robot ne tenait (script lancé à la main). */
export const OHLC_GENERATED_AT: string | null = (() => {
  const v = (ohlcRaw as { meta?: { _generatedAt?: unknown } }).meta?._generatedAt;
  return typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null;
})();

const has = (obj: object, key: string) => Object.prototype.hasOwnProperty.call(obj, key);

/** Retourne l'OHLC annuel d'une crypto (par son id) pour une année, ou null. */
export function getYearOhlc(cryptoId: string, year: string | number): YearOhlc | null {
  if (!has(DATA, cryptoId)) return null; // garde anti-prototype (constructor, etc.)
  const coin = DATA[cryptoId];
  const key = String(year);
  return has(coin.years, key) ? coin.years[key] : null;
}

/** Source + devise pour l'affichage ("Binance" / "USD"). */
export function getOhlcMeta(cryptoId: string): { source: string; currency: string } | null {
  if (!has(DATA, cryptoId)) return null;
  const coin = DATA[cryptoId];
  return { source: coin.source, currency: coin.currency };
}

/** Formate un prix USD avec une précision adaptée à son ordre de grandeur. */
export function formatOhlcPrice(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return "—";
  let maxFrac: number;
  if (n >= 1000) maxFrac = 0;
  else if (n >= 1) maxFrac = 2;
  else if (n >= 0.01) maxFrac = 4;
  else maxFrac = 8;
  return `${n.toLocaleString("fr-FR", { maximumFractionDigits: maxFrac })} $`;
}

/* ---------- détail mensuel (04/10/2026, lot 2b « pages maigres ») ---------- */
export const MONTHS_FR = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"] as const;

/** Les bougies mensuelles d'une année, triées (vide si l'instantané ne les a pas). */
export function getYearMonths(cryptoId: string, year: string | number): MonthOhlc[] {
  const y = getYearOhlc(cryptoId, year);
  if (!y?.months?.length) return [];
  return [...y.months].filter((m) => m.n >= 1 && m.n <= 12).sort((a, b) => a.n - b.n);
}

export interface YearStats {
  /** meilleur et pire mois (variation ouverture→clôture) */
  best: MonthOhlc;
  worst: MonthOhlc;
  /** mois en hausse / en baisse (variation nulle = ni l'un ni l'autre) */
  up: number;
  down: number;
  /** amplitude plus bas → plus haut de l'année, % entier */
  amplitude: number;
  /** repli maximal depuis un sommet au cours de l'année (plus bas d'un mois / plus haut atteint avant), % entier négatif ou 0 */
  maxDrawdown: number;
  /** volume cumulé (USDT), null si inconnu */
  volume: number | null;
}

/** Statistiques dérivées des bougies mensuelles ; null sans détail mensuel. */
export function yearStats(y: YearOhlc | null | undefined): YearStats | null {
  const months = y?.months?.length ? [...y.months].sort((a, b) => a.n - b.n) : [];
  if (!y || months.length === 0) return null;
  let best = months[0], worst = months[0], up = 0, down = 0;
  for (const m of months) {
    if (m.chg > best.chg) best = m;
    if (m.chg < worst.chg) worst = m;
    if (m.chg > 0) up++; else if (m.chg < 0) down++;
  }
  let peak = months[0].o, dd = 0;
  for (const m of months) {
    peak = Math.max(peak, m.h);
    if (peak > 0) dd = Math.min(dd, m.l / peak - 1);
  }
  const amplitude = y.l > 0 ? Math.round((y.h / y.l - 1) * 100) : 0;
  const volume = typeof y.q === "number" && y.q > 0 ? y.q : months.every((m) => m.q > 0) ? months.reduce((s, m) => s + m.q, 0) : null;
  return { best, worst, up, down, amplitude, maxDrawdown: Math.round(dd * 100), volume };
}

/** « +12 % » / « −8 % » (signe typographique), « 0 % » */
export function formatSignedPct(n: number): string {
  if (!Number.isFinite(n) || n === 0) return "0 %";
  return `${n > 0 ? "+" : "−"}${Math.abs(n)} %`;
}

/** Montant en dollars compact : 1,2 Md $, 350 M $, 4,8 k $ */
export function formatCompactUsd(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n) || n <= 0) return "—";
  const f = (v: number) => new Intl.NumberFormat("fr-FR", { maximumFractionDigits: v < 10 ? 1 : 0 }).format(v).replace(/ /g, " ");
  if (n >= 1e12) return `${f(n / 1e12)} Bn $`;
  if (n >= 1e9) return `${f(n / 1e9)} Md $`;
  if (n >= 1e6) return `${f(n / 1e6)} M $`;
  if (n >= 1e3) return `${f(n / 1e3)} k $`;
  return `${f(n)} $`;
}
