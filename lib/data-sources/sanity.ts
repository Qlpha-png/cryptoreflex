/**
 * lib/data-sources/sanity.ts — Contrôles de cohérence avant d'accepter une donnée (06/10/2026).
 *
 * Une donnée aberrante est traitée comme une panne : la source suivante de la table prend le relais.
 * Les bornes sont volontairement larges (elles visent les données cassées : prix nul, homonyme, unité fausse),
 * pas les vrais mouvements de marché.
 */

export const SANITY = {
  /** capitalisation ÷ prix doit retomber sur l'offre en circulation à ±5 % près. */
  SUPPLY_TOLERANCE: 0.05,
  /** Écart maximal toléré entre le prix d'un agrégateur et le prix en direct de la place de marché (homonymes). */
  MAX_PRICE_GAP_VS_LIVE: 0.25,
  /** Bande d'un stablecoin : hors de [0,5 ; 1,5] $, la donnée est jugée cassée (un vrai décrochage reste visible). */
  STABLE_MIN: 0.5,
  STABLE_MAX: 1.5,
  // Bornes hautes très larges : un micro-jeton peut faire ×20 en un jour sur un DEX (vrai mouvement, pas une
  // donnée cassée). On ne rejette que l'absurde (≥ ×1 000 en 24 h), le non-numérique et ≤ −100 %.
  CHANGE_1H_MAX: 10_000,
  CHANGE_24H_MAX: 100_000,
  CHANGE_7D_MAX: 1_000_000,
} as const;

const STABLE_SYMBOLS: ReadonlySet<string> = new Set([
  "USDT", "USDC", "DAI", "FDUSD", "TUSD", "USDS", "PYUSD", "USDE", "USD1", "RLUSD", "USDD", "GHO", "USDP",
  "BUSD", "LUSD", "CRVUSD", "USDG",
]);

/** Stablecoins indexés sur le dollar (seuil du contrôle croisé : 0,5 % au lieu de 1 %). */
export function isStablecoin(symbol: string | undefined | null): boolean {
  return !!symbol && STABLE_SYMBOLS.has(symbol.toUpperCase());
}

export interface QuoteCheckInput {
  priceUsd?: number | null;
  marketCap?: number | null;
  circulatingSupply?: number | null;
  change1h?: number | null;
  change24h?: number | null;
  change7d?: number | null;
  volume24h?: number | null;
  symbol?: string | null;
}

const finite = (n: unknown): n is number => typeof n === "number" && Number.isFinite(n);

function checkChange(v: number | null | undefined, max: number, label: string): string | null {
  if (v == null) return null;
  if (!finite(v)) return `${label} non numérique`;
  if (v <= -100 || v > max) return `${label} invraisemblable (${v})`;
  return null;
}

/** Renvoie la raison du rejet, ou null si la cotation est cohérente. */
export function checkQuote(q: QuoteCheckInput, opts: { livePriceUsd?: number | null } = {}): string | null {
  if (!finite(q.priceUsd) || q.priceUsd <= 0) return "prix absent ou ≤ 0";
  if (isStablecoin(q.symbol) && (q.priceUsd < SANITY.STABLE_MIN || q.priceUsd > SANITY.STABLE_MAX)) {
    return `stablecoin hors bande (${q.priceUsd})`;
  }
  if (q.marketCap != null && (!finite(q.marketCap) || q.marketCap < 0)) return "capitalisation invalide";
  if (q.volume24h != null && (!finite(q.volume24h) || q.volume24h < 0)) return "volume invalide";
  if (finite(q.marketCap) && q.marketCap > 0 && finite(q.circulatingSupply) && q.circulatingSupply > 0) {
    const implied = q.marketCap / q.priceUsd;
    if (Math.abs(implied / q.circulatingSupply - 1) > SANITY.SUPPLY_TOLERANCE) {
      return "capitalisation ÷ prix ≠ offre en circulation";
    }
  }
  const ch =
    checkChange(q.change1h, SANITY.CHANGE_1H_MAX, "variation 1 h") ??
    checkChange(q.change24h, SANITY.CHANGE_24H_MAX, "variation 24 h") ??
    checkChange(q.change7d, SANITY.CHANGE_7D_MAX, "variation 7 j");
  if (ch) return ch;
  if (finite(opts.livePriceUsd) && opts.livePriceUsd > 0) {
    const gap = Math.abs(q.priceUsd / opts.livePriceUsd - 1);
    if (gap > SANITY.MAX_PRICE_GAP_VS_LIVE) {
      return `prix éloigné de ${Math.round(gap * 100)} % du prix en direct (homonyme probable)`;
    }
  }
  return null;
}

/** Contrôle d'une liste (top N) : assez de lignes, et au moins 90 % de lignes cohérentes. */
export function checkList<T extends QuoteCheckInput>(
  rows: readonly T[],
  minRows: number,
): { ok: T[]; reason: string | null } {
  const ok = rows.filter((r) => checkQuote(r) === null);
  if (ok.length < minRows) return { ok, reason: `liste trop courte (${ok.length}/${minRows} lignes valides)` };
  if (rows.length > 0 && ok.length / rows.length < 0.9) {
    return { ok, reason: `${rows.length - ok.length}/${rows.length} lignes incohérentes` };
  }
  return { ok, reason: null };
}
