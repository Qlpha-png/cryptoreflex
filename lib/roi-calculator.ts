/**
 * Calculateur ROI / Plus-value crypto — fonction pure (Pilier 5).
 *
 * Exclu : barème progressif, BIC pro, abattement durée de détention
 * (non applicable aux crypto-actifs en France hors BIC). Pour le détail
 * complet, l'utilisateur est redirigé vers /outils/calculateur-fiscalite.
 */

import {
  ROI_TAX_CONSTANTS,
  type ROIInput,
  type ROIResult,
} from "@/lib/roi-types";

/**
 * Calcule le ROI net + impôt français estimé sur une opération crypto.
 *
 * Étapes :
 *  1. Validation : tous les prix > 0, quantité > 0, fees >= 0.
 *  2. Investissement initial = quantity × buyPrice.
 *  3. Frais d'achat = investissement × buyFeeRate / 100.
 *  4. Valeur finale brute = quantity × sellPrice.
 *  5. Frais de vente = valeur finale × sellFeeRate / 100.
 *  6. Plus-value nette = valueFinal - investissement - totalFees.
 *  7. ROI % = profitNet / investissement × 100.
 *  8. Impôt FR = profitNet × 30 % si profitNet > 305 € (PFU), sinon 0.
 *
 * @example
 * calculateROI({ buyPrice: 100, sellPrice: 200, quantity: 1, buyFeeRate: 0.5, sellFeeRate: 0.5 })
 * // → investmentInitial: 100, valueFinal: 200, profitGross: 100,
 * //   totalFees: 0.5 + 1 = 1.5, profitNet: ~98.5, roiPercent: ~98.5 %,
 * //   taxFr: 0 (98.5 <= 305 → exonéré)
 *
 * @example
 * calculateROI({ buyPrice: 100, sellPrice: 200, quantity: 5, buyFeeRate: 0.5, sellFeeRate: 0.5 })
 * // → invest: 500, valueFinal: 1000, profitGross: 500, totalFees: 7.5,
 * //   profitNet: 492.5, roi: 98.5 %, taxFr: 147.75 € (492.5 × 0.3)
 */
export function calculateROI(input: ROIInput): ROIResult {
  const { buyPrice, sellPrice, quantity, buyFeeRate, sellFeeRate } = input;

  // ---- 1. Validation défensive ----
  if (
    !Number.isFinite(buyPrice) ||
    !Number.isFinite(sellPrice) ||
    !Number.isFinite(quantity) ||
    !Number.isFinite(buyFeeRate) ||
    !Number.isFinite(sellFeeRate)
  ) {
    return emptyResult("Toutes les valeurs doivent être numériques.");
  }
  if (buyPrice <= 0 || sellPrice <= 0) {
    return emptyResult("Les prix d'achat et de vente doivent être supérieurs à 0.");
  }
  if (quantity <= 0) {
    return emptyResult("La quantité doit être supérieure à 0.");
  }
  if (buyFeeRate < 0 || sellFeeRate < 0) {
    return emptyResult("Les frais ne peuvent pas être négatifs.");
  }

  // ---- 2. Calculs ----
  const investmentInitial = quantity * buyPrice;
  const buyFees = (investmentInitial * buyFeeRate) / 100;
  const valueFinal = quantity * sellPrice;
  const sellFees = (valueFinal * sellFeeRate) / 100;
  const totalFees = buyFees + sellFees;

  const profitGross = valueFinal - investmentInitial;
  const profitNet = profitGross - totalFees;

  const roiPercent =
    investmentInitial > 0 ? (profitNet / investmentInitial) * 100 : 0;

  // ---- 3. Impôt français (PFU 30 %, seuil 305 €) ----
  const { TAX_FREE_THRESHOLD_EUR, PFU_RATE } = ROI_TAX_CONSTANTS;
  const taxFr =
    profitNet > TAX_FREE_THRESHOLD_EUR ? profitNet * PFU_RATE : 0;

  return {
    investmentInitial: round2(investmentInitial),
    valueFinal: round2(valueFinal),
    profitGross: round2(profitGross),
    profitNet: round2(profitNet),
    roiPercent: round2(roiPercent),
    totalFees: round2(totalFees),
    taxFr: round2(taxFr),
    invalid: false,
  };
}

/** Arrondi à 2 décimales (centimes). */
function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/** Résultat vide pour les inputs invalides. */
function emptyResult(error: string): ROIResult {
  return {
    investmentInitial: 0,
    valueFinal: 0,
    profitGross: 0,
    profitNet: 0,
    roiPercent: 0,
    totalFees: 0,
    taxFr: 0,
    invalid: true,
    error,
  };
}

/**
 * Formatage standardisé en euros (FR), 2 décimales.
 * Utilisé par le composant client pour l'affichage.
 */
export function formatEur(value: number): string {
  if (!Number.isFinite(value)) return "—";
  return value.toLocaleString("fr-FR", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/** Formatage pourcentage signé (ex: "+98.50 %", "-12.34 %"). */
export function formatPctSigned(value: number): string {
  if (!Number.isFinite(value)) return "—";
  const sign = value >= 0 ? "+" : "";
  return `${sign}${value.toFixed(2)} %`;
}
