/**
 * lib/fx.ts — taux de change (unités de devise pour 1 dollar), côté serveur.
 *
 * Audit du 05/10/2026 : plusieurs écrans convertissaient avec un taux figé en mai (1 USD = 0,92 €).
 * Lot Z4 (10/10/2026) : la production servait encore un taux de secours en dur (BCE du 02/10/2026), Frankfurter et
 * Binance échouant depuis Vercel. Désormais, le taux vient UNIQUEMENT de data/fx-bce.json, écrit chaque jour ouvré par
 * le robot R6 (.github/workflows/fx-bce.yml) depuis la publication officielle de la BCE : aucun appel réseau au rendu,
 * plus de Frankfurter ni de Binance (licence exclue, S26). Voir lib/fx-bce.ts.
 */
import { FX_BCE, type FiatPerUsd } from "@/lib/fx-bce";

export type { FiatPerUsd } from "@/lib/fx-bce";

/** Taux BCE en vigueur (signature asynchrone gardée pour les appelants ; jamais d'exception). */
export async function fiatPerUsd(): Promise<FiatPerUsd> {
  return FX_BCE;
}

/** Prix en euros d'une unité de devise ou de stablecoin dollar (convertisseur). */
export function eurPerUnit(fx: FiatPerUsd): Record<string, number> {
  return { eur: 1, usd: fx.eur, usdt: fx.eur, usdc: fx.eur, dai: fx.eur, gbp: fx.eur / fx.gbp, chf: fx.eur / fx.chf };
}
