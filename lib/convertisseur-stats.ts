/**
 * lib/convertisseur-stats.ts — contenu chiffré des pages /convertisseur/[pair] (lot 2b « pages maigres », 04/10/2026).
 *
 * Tout est calculé à partir de données réelles déjà disponibles côté serveur :
 *  - le taux du moment (fetchConversionRate) → grille « combien valent 1, 5, 10… X en Y » dans les deux sens ;
 *  - les séries quotidiennes en euros (fetchHistoricalPrices, 365 jours) → taux moyen 7 j / 30 j / 1 an, plus haut et
 *    plus bas sur un an avec leur date, variation 30 j et 1 an.
 * Les séries sont en EUR : une paire se calcule donc exactement quand ses deux côtés sont des cryptos ou l'euro.
 * Les autres devises (USD, USDT, GBP, CHF) ne reçoivent pas de bloc historique : on n'invente pas de taux de change.
 * Fonctions pures, testées dans tests/lib/convertisseur-stats.test.ts.
 */
import type { HistoricalPoint } from "@/lib/historical-prices";
import { FX_BCE } from "@/lib/fx-bce";

export type PairKind = "crypto-fiat" | "fiat-crypto" | "crypto-crypto" | "fiat-fiat";
const FIATS = new Set(["eur", "usd", "gbp", "chf"]);
/** stablecoins dollar : traités comme une monnaie fiduciaire pour les textes, jamais pour l'historique en euros */
const DOLLAR_PEGS = new Set(["usdt", "usdc", "dai"]);

export const isFiatLike = (s: string): boolean => FIATS.has(s.toLowerCase()) || DOLLAR_PEGS.has(s.toLowerCase());

export function pairKind(from: string, to: string): PairKind {
  const f = isFiatLike(from), t = isFiatLike(to);
  if (f && t) return "fiat-fiat";
  if (f) return "fiat-crypto";
  if (t) return "crypto-fiat";
  return "crypto-crypto";
}

/** l'historique en euros est exact pour l'euro lui-même et pour toute crypto ; faux pour les autres devises */
export const historySupported = (s: string): boolean => s.toLowerCase() === "eur" || !isFiatLike(s);

/**
 * Monnaies « fiduciaires » du convertisseur et leur prix en euros : taux de référence de la BCE (data/fx-bce.json, robot R6,
 * lot Z4 ; lib/fx-bce.ts). Avant le 05/10/2026 : taux figés de mai (1 USD = 0,92 €) ; avant le 10/10/2026 : taux de secours en dur.
 */
export const FIAT_EUR_PRICE: Record<string, number> = {
  eur: 1, usd: FX_BCE.eur, usdt: FX_BCE.eur, usdc: FX_BCE.eur, dai: FX_BCE.eur,
  gbp: FX_BCE.eur / FX_BCE.gbp, chf: FX_BCE.eur / FX_BCE.chf,
};

/** Taux de repli `from`/`to` à partir des derniers prix en euros connus (null = inconnu) */
export function fallbackRate(fromEur: number | null | undefined, toEur: number | null | undefined): number | null {
  if (fromEur == null || toEur == null || !(fromEur > 0) || !(toEur > 0)) return null;
  return fromEur / toEur;
}

/** dernier prix d'une série (null si vide) */
export const lastPrice = (pts: HistoricalPoint[] | null | undefined): number | null => {
  if (!pts?.length) return null;
  const p = pts[pts.length - 1].price;
  return Number.isFinite(p) && p > 0 ? p : null;
};

/** Montants de la grille de conversion (sens direct) */
export const GRID_AMOUNTS = [1, 5, 10, 50, 100, 500, 1000, 10000] as const;

export interface GridRow {
  amount: number;
  value: number;
}

/** « combien valent N `from` en `to` » pour chaque montant de la grille ; vide sans taux */
export function conversionGrid(rate: number | null | undefined, amounts: readonly number[] = GRID_AMOUNTS): GridRow[] {
  if (rate == null || !Number.isFinite(rate) || rate <= 0) return [];
  return amounts.map((amount) => ({ amount, value: amount * rate }));
}

/** Format d'un montant converti : précision adaptée à l'ordre de grandeur, séparateurs français */
export function formatConverted(v: number | null | undefined): string {
  if (v == null || !Number.isFinite(v)) return "—";
  const abs = Math.abs(v);
  const maxFrac = abs >= 1000 ? 0 : abs >= 1 ? 2 : abs >= 0.01 ? 4 : abs >= 0.0001 ? 6 : 8;
  return nbsp(v.toLocaleString("fr-FR", { maximumFractionDigits: maxFrac, minimumFractionDigits: abs >= 1000 ? 0 : Math.min(2, maxFrac) }));
}

/** fr-FR sépare les milliers par une espace fine insécable (U+202F) que certaines polices rendent mal : espace insécable classique */
const nbsp = (s: string): string => s.replace(/ /g, " ");

/** Format d'un montant de la grille (1, 5, 10 000…) */
export const formatAmount = (n: number): string => nbsp(n.toLocaleString("fr-FR"));

/* ---------- séries et statistiques ---------- */

const DAY = 86_400_000;
const dayKey = (t: number): number => Math.floor(t / DAY);

/**
 * Série du taux `from`/`to` au pas quotidien à partir des séries en euros de chaque côté (null = euro, taux 1).
 * On garde le dernier point de chaque jour UTC ; un jour n'apparaît que si les deux côtés le couvrent.
 */
export function ratioSeries(fromEur: HistoricalPoint[] | null, toEur: HistoricalPoint[] | null): HistoricalPoint[] {
  if (!fromEur && !toEur) return [];
  const byDay = (pts: HistoricalPoint[]): Map<number, number> => {
    const m = new Map<number, number>();
    for (const p of pts) if (Number.isFinite(p.price) && p.price > 0) m.set(dayKey(p.t), p.price);
    return m;
  };
  const f = fromEur ? byDay(fromEur) : null;
  const t = toEur ? byDay(toEur) : null;
  const days = [...(f ?? t)!.keys()].filter((d) => (!f || f.has(d)) && (!t || t.has(d))).sort((a, b) => a - b);
  return days.map((d) => ({ t: d * DAY, price: (f ? f.get(d)! : 1) / (t ? t.get(d)! : 1) }));
}

export interface RateStats {
  /** dernier taux de la série et sa date */
  last: number;
  lastAt: number;
  /** moyennes sur les 7, 30 et 365 derniers jours couverts (null si moins de la moitié des jours est couverte) */
  avg7: number | null;
  avg30: number | null;
  avg365: number | null;
  /** extrêmes sur la période couverte, avec leur date */
  min: number;
  minAt: number;
  max: number;
  maxAt: number;
  /** variations en % (arrondies à l'unité), null si la période n'est pas couverte */
  chg30: number | null;
  chg365: number | null;
  /** nombre de jours couverts et date du premier point */
  days: number;
  firstAt: number;
}

const mean = (xs: number[]): number => xs.reduce((s, x) => s + x, 0) / xs.length;

/** Statistiques d'une série quotidienne (au moins 30 jours) ; null sinon */
export function rateStats(series: HistoricalPoint[]): RateStats | null {
  const s = series.filter((p) => Number.isFinite(p.price) && p.price > 0).sort((a, b) => a.t - b.t);
  if (s.length < 30) return null;
  const last = s[s.length - 1];
  const window = (n: number): HistoricalPoint[] => s.filter((p) => p.t >= last.t - (n - 1) * DAY);
  const avg = (n: number): number | null => { const w = window(n); return w.length >= n / 2 ? mean(w.map((p) => p.price)) : null; };
  const chg = (n: number): number | null => {
    const w = window(n);
    if (w.length < n / 2) return null;
    const first = w[0];
    /* la fenêtre doit vraiment remonter à ~n jours : sinon (série courte) pas de variation annoncée */
    if (last.t - first.t < (n - 1) * DAY * 0.8) return null;
    return Math.round((last.price / first.price - 1) * 100);
  };
  let min = s[0], max = s[0];
  for (const p of s) { if (p.price < min.price) min = p; if (p.price > max.price) max = p; }
  return {
    last: last.price, lastAt: last.t,
    avg7: avg(7), avg30: avg(30), avg365: avg(365),
    min: min.price, minAt: min.t, max: max.price, maxAt: max.t,
    chg30: chg(30), chg365: chg(365),
    days: s.length, firstAt: s[0].t,
  };
}

/** « 12 mars 2026 » */
export const formatDay = (t: number): string => new Date(t).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });

/** « +12 % » / « −8 % » */
export function signedPct(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return "—";
  if (n === 0) return "0 %";
  return `${n > 0 ? "+" : "−"}${Math.abs(n)} %`;
}

/** À quoi sert cette conversion : texte déterministe selon le type de paire (jamais un chiffre inventé) */
export function pairUseText(kind: PairKind, fromName: string, toName: string, fromUp: string, toUp: string): string {
  switch (kind) {
    case "crypto-fiat":
      return `Convertir des ${fromName} en ${toName} sert d'abord à valoriser ce que vous détenez : combien valent vos ${fromUp} aujourd'hui, quel montant vous récupéreriez en vendant, et quelle valeur déclarer (la plus-value se calcule à partir du prix de cession en euros). C'est aussi le réflexe avant un retrait vers votre compte bancaire.`;
    case "fiat-crypto":
      return `Convertir des ${fromName} en ${toName} répond à la question inverse : avec un budget donné en ${fromUp}, combien de ${toUp} obtient-on au taux du marché ? Utile avant un premier achat, pour fixer un montant d'investissement programmé (DCA) ou pour vérifier le prix affiché par une plateforme, frais compris.`;
    case "crypto-crypto":
      return `Convertir des ${fromName} en ${toName} sert à comparer deux cryptos entre elles sans passer par l'euro : combien de ${toUp} vaut un ${fromUp}, et comment ce rapport évolue. C'est le taux qu'il faut regarder avant un échange direct (swap) ou pour arbitrer entre les deux dans un portefeuille.`;
    default:
      return `Convertir des ${fromName} en ${toName} donne un repère de change entre deux monnaies : pratique pour comparer des prix de plateformes affichés dans des devises différentes.`;
  }
}
