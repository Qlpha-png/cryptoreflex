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
}

interface CoinOhlc {
  source: string;
  currency: string;
  years: Record<string, YearOhlc>;
}

const DATA = (ohlcRaw as { data: Record<string, CoinOhlc> }).data;

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
