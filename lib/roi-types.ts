/**
 * Types du calculateur ROI / Plus-value (Pilier 5).
 *
 * Pure types — aucun import runtime, safe pour Server Components et Client.
 */

/** Entrée utilisateur du calculateur ROI. */
export interface ROIInput {
  /** Prix unitaire d'achat (€). Doit être > 0. */
  buyPrice: number;
  /** Prix unitaire de vente (€). Doit être > 0. */
  sellPrice: number;
  /** Quantité de coins achetée (et revendue). Doit être > 0. */
  quantity: number;
  /** Frais d'achat en pourcentage (ex: 0.5 pour 0,5 %). >= 0. */
  buyFeeRate: number;
  /** Frais de vente en pourcentage (ex: 0.5 pour 0,5 %). >= 0. */
  sellFeeRate: number;
}

/** Résultat calculé du ROI. */
export interface ROIResult {
  /** Investissement initial : quantity * buyPrice. */
  investmentInitial: number;
  /** Valeur finale brute : quantity * sellPrice. */
  valueFinal: number;
  /** Plus-value avant frais : valueFinal - investmentInitial. */
  profitGross: number;
  /** Plus-value après frais d'achat ET de vente. */
  profitNet: number;
  /** ROI net en pourcentage : profitNet / investmentInitial * 100. */
  roiPercent: number;
  /** Total des frais payés (achat + vente). */
  totalFees: number;
  /**
   * Impôt français estimé (PFU 30 %) sur la plus-value nette.
   * 0 si plus-value <= seuil 305 € OU si plus-value <= 0.
   * Ne tient pas compte du barème progressif ni des situations BIC.
   */
  taxFr: number;
  /** Indique si l'entrée a été rejetée (valeurs invalides). */
  invalid: boolean;
  /** Message d'erreur lisible si invalid = true. */
  error?: string;
}

/** Constantes fiscales France 2026 utilisées par le calculateur. */
export const ROI_TAX_CONSTANTS = {
  /** Seuil annuel d'exonération sur les cessions (Cerfa 2086). */
  TAX_FREE_THRESHOLD_EUR: 305,
  /** PFU = 12,8 % IR + 17,2 % prélèvements sociaux = 30 %. */
  PFU_RATE: 0.3,
} as const;
