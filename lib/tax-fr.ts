/**
 * Fiscalité crypto France — calculs officiels 2026
 * ---------------------------------------------------
 * Référence : article 150 VH bis du CGI (Code Général des Impôts).
 * Régime PFU ("flat tax") = 30 % au total :
 *   - 12,8 % au titre de l'impôt sur le revenu (IR)
 *   - 17,2 % au titre des prélèvements sociaux (PS)
 *
 * Périmètre : cessions à titre onéreux d'actifs numériques par un particulier
 * dans le cadre d'une gestion non professionnelle (occasionnel).
 *
 * Important :
 *   - Les cessions crypto ↔ crypto sont neutres fiscalement (pas d'imposition).
 *   - Seules les conversions crypto → monnaie ayant cours légal (€/$) ou
 *     crypto → bien/service sont taxables.
 *   - Abattement de 305 € : si le total des cessions de l'année est
 *     inférieur ou égal à 305 €, la plus-value est exonérée.
 *   - Une moins-value (déficit) n'est PAS reportable sur les années suivantes
 *     pour les particuliers (uniquement imputable sur les plus-values de
 *     même nature de la même année). Cf. BOI-RPPM-PVBMC-30-30.
 *
 * Avertissement : ce module fournit un calcul indicatif. Il ne se substitue
 * pas à un expert-comptable ni à l'administration fiscale.
 */

/** Seuil d'exonération : si total des cessions <= 305 €, pas d'imposition. */
export const SEUIL_EXONERATION_EUR = 305;

/** Taux de l'impôt sur le revenu (PFU). */
export const TAUX_IR = 0.128;

/** Taux des prélèvements sociaux. */
export const TAUX_PS = 0.172;

/** Taux global de la flat tax (PFU). */
export const TAUX_FLAT_TAX = TAUX_IR + TAUX_PS; // 0.30

export interface PlusValueInput {
  /** Montant de la cession (vente) en euros. */
  montantVente: number;
  /** Prix total d'acquisition de tout le portefeuille (somme des achats), en euros. */
  acquisitionsTotales: number;
  /** Valeur globale du portefeuille au moment de la cession, en euros. */
  valeurPortefeuille: number;
  /**
   * Total annuel des cessions (toutes ventes confondues), en euros.
   * Sert à appliquer le seuil d'exonération de 305 €.
   * Si non fourni, on utilise montantVente.
   */
  totalCessionsAnnee?: number;
}

export interface PlusValueResult {
  /** Plus-value (positive) ou moins-value (négative) imposable, en euros. */
  plusValue: number;
  /** Prix d'acquisition imputable à cette cession (formule 150 VH bis). */
  prixAcquisitionImpute: number;
  /** Vrai si la cession bénéficie de l'exonération <= 305 €. */
  exonere: boolean;
  /** Vrai si le résultat est un déficit (moins-value). */
  deficit: boolean;
}

export interface FlatTaxResult {
  /** Plus-value imposable utilisée pour le calcul. */
  baseImposable: number;
  /** Part IR (12,8 %). */
  montantIR: number;
  /** Part prélèvements sociaux (17,2 %). */
  montantPS: number;
  /** Total flat tax (30 %). */
  totalFlatTax: number;
  /** Net après impôt = plus-value - flat tax. */
  netApresImpot: number;
}

/**
 * Calcule la plus-value imposable selon l'article 150 VH bis du CGI.
 *
 * Formule officielle :
 *   plus_value = montant_vente − (acquisitions_totales × montant_vente / valeur_portefeuille)
 *
 * Le second terme représente le prix d'acquisition imputable à la cession,
 * proportionnel à la part du portefeuille cédée.
 */
export function calculatePlusValue(input: PlusValueInput): PlusValueResult {
  const { montantVente, acquisitionsTotales, valeurPortefeuille } = input;
  const totalCessions = input.totalCessionsAnnee ?? montantVente;

  // Garde-fous : entrées invalides
  if (
    !Number.isFinite(montantVente) ||
    !Number.isFinite(acquisitionsTotales) ||
    !Number.isFinite(valeurPortefeuille) ||
    valeurPortefeuille <= 0 ||
    montantVente <= 0
  ) {
    return {
      plusValue: 0,
      prixAcquisitionImpute: 0,
      exonere: false,
      deficit: false,
    };
  }

  // Exonération : si le total des cessions de l'année <= 305 €
  if (totalCessions <= SEUIL_EXONERATION_EUR) {
    const prixAcquisitionImpute =
      (acquisitionsTotales * montantVente) / valeurPortefeuille;
    return {
      plusValue: 0,
      prixAcquisitionImpute,
      exonere: true,
      deficit: false,
    };
  }

  const prixAcquisitionImpute =
    (acquisitionsTotales * montantVente) / valeurPortefeuille;
  const plusValue = montantVente - prixAcquisitionImpute;

  return {
    plusValue,
    prixAcquisitionImpute,
    exonere: false,
    deficit: plusValue < 0,
  };
}

/**
 * Calcule la flat tax (PFU 30 %) sur une plus-value.
 * Si la plus-value est négative ou nulle, retourne 0 d'impôt.
 */
export function calculateFlatTax(plusValue: number): FlatTaxResult {
  const base = Math.max(0, plusValue);
  const montantIR = base * TAUX_IR;
  const montantPS = base * TAUX_PS;
  const totalFlatTax = montantIR + montantPS;
  return {
    baseImposable: base,
    montantIR,
    montantPS,
    totalFlatTax,
    netApresImpot: plusValue - totalFlatTax,
  };
}

/** Formate un montant en euros (locale fr-FR). */
export function formatEur(value: number, options?: { decimals?: number }): string {
  if (!Number.isFinite(value)) return "—";
  return value.toLocaleString("fr-FR", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: options?.decimals ?? 2,
    maximumFractionDigits: options?.decimals ?? 2,
  });
}

/* ------------------------------------------------------------------ */
/* Tests unitaires (à exécuter avec Vitest/Jest)                       */
/* ------------------------------------------------------------------ */
/*
import { describe, it, expect } from "vitest";
import {
  calculatePlusValue,
  calculateFlatTax,
  formatEur,
  SEUIL_EXONERATION_EUR,
  TAUX_FLAT_TAX,
} from "./tax-fr";

describe("calculatePlusValue", () => {
  it("calcule la plus-value selon la formule 150 VH bis", () => {
    // Cas type : 5 000 € investis, portefeuille 10 000 €, vente 4 000 €
    // prix_acq_impute = 5000 × 4000 / 10000 = 2000
    // plus_value = 4000 − 2000 = 2000
    const r = calculatePlusValue({
      montantVente: 4000,
      acquisitionsTotales: 5000,
      valeurPortefeuille: 10000,
    });
    expect(r.plusValue).toBe(2000);
    expect(r.prixAcquisitionImpute).toBe(2000);
    expect(r.exonere).toBe(false);
    expect(r.deficit).toBe(false);
  });

  it("détecte une moins-value", () => {
    // 10 000 € investis, portefeuille 8 000 €, vente 4 000 €
    // prix_acq_impute = 10000 × 4000 / 8000 = 5000
    // plus_value = 4000 − 5000 = −1000
    const r = calculatePlusValue({
      montantVente: 4000,
      acquisitionsTotales: 10000,
      valeurPortefeuille: 8000,
    });
    expect(r.plusValue).toBe(-1000);
    expect(r.deficit).toBe(true);
  });

  it("applique l'exonération <= 305 €", () => {
    const r = calculatePlusValue({
      montantVente: 200,
      acquisitionsTotales: 100,
      valeurPortefeuille: 500,
    });
    expect(r.exonere).toBe(true);
    expect(r.plusValue).toBe(0);
  });

  it("retourne 0 si valeur de portefeuille invalide", () => {
    const r = calculatePlusValue({
      montantVente: 1000,
      acquisitionsTotales: 500,
      valeurPortefeuille: 0,
    });
    expect(r.plusValue).toBe(0);
  });
});

describe("calculateFlatTax", () => {
  it("applique 30 % sur une plus-value positive", () => {
    const r = calculateFlatTax(1000);
    expect(r.montantIR).toBeCloseTo(128);
    expect(r.montantPS).toBeCloseTo(172);
    expect(r.totalFlatTax).toBeCloseTo(300);
    expect(r.netApresImpot).toBeCloseTo(700);
  });

  it("retourne 0 d'impôt sur une moins-value", () => {
    const r = calculateFlatTax(-500);
    expect(r.totalFlatTax).toBe(0);
    expect(r.baseImposable).toBe(0);
  });
});

describe("formatEur", () => {
  it("formate au format français", () => {
    expect(formatEur(1234.56)).toMatch(/1\s?234,56\s?€/);
  });
  it("gère les valeurs non finies", () => {
    expect(formatEur(NaN)).toBe("—");
  });
});

describe("constantes", () => {
  it("PFU = 30 %", () => {
    expect(TAUX_FLAT_TAX).toBeCloseTo(0.30);
  });
  it("seuil exonération = 305 €", () => {
    expect(SEUIL_EXONERATION_EUR).toBe(305);
  });
});
*/
