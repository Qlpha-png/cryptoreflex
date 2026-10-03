/**
 * Fiscalité crypto France 2026 — calculs par régime fiscal
 * --------------------------------------------------------
 * Module dédié au Calculateur fiscalité (lead magnet outil) :
 *   /outils/calculateur-fiscalite
 *
 * Différent de `lib/tax-fr.ts` qui calcule la PV selon la formule officielle
 * 150 VH bis (prorata du portefeuille). Ici, on raisonne sur des totaux
 * agrégés (cessions / achats / frais) — modèle plus simple et adapté à un
 * choix de régime (PFU / Barème / BIC).
 *
 * Régimes couverts :
 *   - PFU 31,4 % (par défaut, particulier occasionnel)
 *       12,8 % IR + 18,6 % prélèvements sociaux
 *   - Barème progressif IR (option) : TMI utilisateur + 18,6 % PS
 *   - BIC professionnel (trading habituel) : TMI + 18,6 % PS + cotisations
 *     URSSAF (~22 % du bénéfice net) — estimation simplifiée.
 *
 * Seuil d'exonération 2026 : si total des cessions ≤ 305 €/an, pas d'impôt.
 * Référence : article 150 VH bis du CGI + BOI-RPPM-PVBMC-30-30.
 *
 * /!\ Ces calculs sont indicatifs. Pour un avis personnalisé, consulter
 * un expert-comptable (cas DeFi, staking, NFT, mining, lending).
 */

/* -------------------------------------------------------------------------- */
/*  Constantes — taux 2026                                                    */
/* -------------------------------------------------------------------------- */

/** Seuil d'exonération annuel : si total cessions ≤ 305 €, pas d'imposition. */
export const SEUIL_EXONERATION_EUR = 305;

/** Taux IR forfaitaire (PFU). */
export const TAUX_IR_PFU = 0.128;

/**
 * Taux des prélèvements sociaux (CSG/CRDS) — applicable PFU et Barème.
 * 18,6 % depuis le 1er janvier 2026 : la LFSS 2026 a relevé la CSG sur les
 * revenus du capital de 9,2 % à 10,6 % (+1,4 pt). Était 17,2 % jusqu'aux
 * gains réalisés en 2025. Source : impots.gouv.fr (nouveautés revenus 2025).
 */
export const TAUX_PS = 0.186;

/** Taux global PFU (flat tax) = 31,4 % depuis 2026. */
export const TAUX_PFU = TAUX_IR_PFU + TAUX_PS; // 0.314

/** Taux estimé des cotisations sociales TNS (URSSAF) en BIC. */
export const TAUX_COTISATIONS_BIC = 0.22;

/** Tranches marginales d'imposition 2026 (barème IR). */
/* 0 % inclus : étudiants et petits revenus, le public qui gagne le plus à l'option barème (case 3CN) */
export const TMI_VALUES = [0, 0.11, 0.30, 0.41, 0.45] as const;
export type TmiRate = (typeof TMI_VALUES)[number];

/* -------------------------------------------------------------------------- */
/*  Types                                                                     */
/* -------------------------------------------------------------------------- */

/** Régime fiscal applicable au calcul. */
export type Regime = "pfu" | "bareme" | "bic";

export interface FiscaliteInput {
  /** Total des cessions de l'année (ventes crypto en €, lignes 213). */
  totalCessions: number;
  /**
   * Prix total d'acquisition du portefeuille (€, ligne 220, net des fractions déjà
   * imputées — ligne 223). Si tout le portefeuille a été vendu, c'est la somme des achats.
   */
  totalAchats: number;
  /** Frais de cession (€, lignes 214) : déduits du premier terme seulement, jamais du quotient. */
  fraisCourtage: number;
  /**
   * Valeur globale du portefeuille au moment de la cession (€, ligne 212), part vendue
   * comprise. Facultatif : absent ou ≤ cessions → tout le portefeuille est réputé vendu
   * (fraction imputée = tout le prix d'acquisition). Audit 03/10/2026 : sans ce champ, le
   * calcul « cessions − achats » sous-estimait lourdement la plus-value d'une vente partielle.
   */
  valeurPortefeuille?: number;
  /** Régime fiscal choisi. */
  regime: Regime;
  /**
   * Tranche marginale d'imposition (TMI) — requise pour Barème et BIC.
   * Ignorée en PFU. Valeurs : 0.11, 0.30, 0.41, 0.45.
   */
  tmi?: TmiRate;
  /**
   * Déficits reportables des années antérieures (€) — RÉGIME BIC UNIQUEMENT.
   * Pour un particulier (PFU ou barème, art. 150 VH bis), la moins-value d'une année
   * ne se reporte jamais sur les suivantes : la valeur est IGNORÉE hors BIC.
   * Audit 03/10/2026 : ce champ faisait baisser l'impôt d'un particulier (−628 € dans
   * l'exemple testé). Soustrait de la base imposable en BIC (positif = déficit reporté).
   */
  reportablePrevious?: number;
}

export interface FiscaliteResult {
  /** Régime utilisé pour le calcul (echo de l'input). */
  regime: Regime;
  /** Plus-value brute = (cessions − frais de cession) − fraction du prix d'acquisition imputée. */
  plusValueBrute: number;
  /** Fraction du prix total d'acquisition imputée à ces cessions (= 223 × 217 / 212). */
  fractionAcquisition: number;
  /** Part du portefeuille cédée (cessions / valeur globale), 1 si tout vendu. */
  partCedee: number;
  /** "prorata" si une valeur globale > cessions a été fournie, sinon "tout_vendu". */
  methode: "prorata" | "tout_vendu";
  /** Plus-value nette imposable = brute − reports. */
  plusValueNette: number;
  /** Vrai si exonéré (total cessions ≤ 305 €). */
  exonere: boolean;
  /** Vrai si moins-value (PV nette ≤ 0). */
  deficit: boolean;
  /** Part IR (impôt sur le revenu). */
  montantIR: number;
  /** Part prélèvements sociaux (18,6 %). */
  montantPS: number;
  /** Cotisations sociales URSSAF (BIC uniquement). */
  cotisationsSociales: number;
  /** Impôt total = IR + PS + cotisations. */
  impotTotal: number;
  /** Net après impôt = PV nette − impôt total. */
  netApresImpot: number;
  /** Taux effectif global (impôt total / PV nette), 0 si PV ≤ 0. */
  tauxEffectif: number;
}

/* -------------------------------------------------------------------------- */
/*  Helpers internes                                                          */
/* -------------------------------------------------------------------------- */

/** Sanitize : nombre fini ≥ 0, sinon 0. */
function safePositive(n: number | undefined): number {
  if (typeof n !== "number" || !Number.isFinite(n) || n < 0) return 0;
  return n;
}

/**
 * Calcule la plus-value nette imposable commune à tous les régimes.
 *
 *   PV brute = cessions − achats − frais
 *   PV nette = PV brute − reports antérieurs (si fournis)
 *
 * Les reports sont en pratique limités au PFU/Barème pour les pros — on les
 * autorise quand même côté input pour rester souple. Si la PV devient
 * négative (déficit), on la conserve telle quelle dans le résultat (la
 * fonction tax-* filtrera par max(0, .) pour ne pas générer d'impôt).
 */
function computeNetPlusValue(input: FiscaliteInput): {
  plusValueBrute: number;
  plusValueNette: number;
  fractionAcquisition: number;
  partCedee: number;
  methode: "prorata" | "tout_vendu";
} {
  const cessions = safePositive(input.totalCessions);
  const achats = safePositive(input.totalAchats);
  const frais = safePositive(input.fraisCourtage);
  const valeur = safePositive(input.valeurPortefeuille);
  /* report de déficit : seulement en BIC (jamais pour un particulier, art. 150 VH bis) */
  const reports = input.regime === "bic" ? safePositive(input.reportablePrevious) : 0;

  /* Formule du 2086 (l. 224 = l. 218 − l. 223 × l. 217 / l. 212) appliquée aux totaux :
     le quotient se calcule sur le prix de cession BRUT ; les frais ne touchent que le 1er terme. */
  const prorata = valeur > cessions && cessions > 0;
  const partCedee = prorata ? cessions / valeur : 1;
  const fractionAcquisition = achats * partCedee;
  const brute = cessions - frais - fractionAcquisition;
  const nette = brute - reports;
  return {
    plusValueBrute: brute,
    plusValueNette: nette,
    fractionAcquisition,
    partCedee,
    methode: prorata ? "prorata" : "tout_vendu",
  };
}

/**
 * Détermine si la situation est exonérée (seuil 305 € cumulés / an).
 * Le seuil porte sur le total des prix de cession NETS de frais (lignes 218,
 * additionnées en ligne 51 du formulaire 2086), pas sur la plus-value.
 */
function isExoneree(input: FiscaliteInput): boolean {
  const net = safePositive(input.totalCessions) - safePositive(input.fraisCourtage);
  return net <= SEUIL_EXONERATION_EUR;
}

/**
 * Construit un résultat "vide" (exonéré ou déficit) — base imposable nulle,
 * aucun impôt dû. Conserve la PV brute/nette pour affichage.
 */
function emptyResult(
  regime: Regime,
  calc: ReturnType<typeof computeNetPlusValue>,
  flags: { exonere: boolean; deficit: boolean },
): FiscaliteResult {
  const { plusValueBrute, plusValueNette } = calc;
  return {
    regime,
    plusValueBrute,
    plusValueNette,
    fractionAcquisition: calc.fractionAcquisition,
    partCedee: calc.partCedee,
    methode: calc.methode,
    exonere: flags.exonere,
    deficit: flags.deficit,
    montantIR: 0,
    montantPS: 0,
    cotisationsSociales: 0,
    impotTotal: 0,
    netApresImpot: Math.max(0, plusValueNette),
    tauxEffectif: 0,
  };
}

/* -------------------------------------------------------------------------- */
/*  Calculs par régime                                                        */
/* -------------------------------------------------------------------------- */

/**
 * PFU 31,4 % (flat tax) — régime par défaut du particulier en gestion non
 * professionnelle. 12,8 % IR + 18,6 % PS appliqués à la PV nette.
 *
 *   Si total cessions ≤ 305 € : exonération totale.
 *   Si PV nette ≤ 0 : pas d'impôt (moins-value, déficit).
 */
export function computeTaxPFU(input: FiscaliteInput): FiscaliteResult {
  const calc = computeNetPlusValue(input);
  const { plusValueBrute, plusValueNette } = calc;

  if (isExoneree(input)) {
    return emptyResult("pfu", calc, {
      exonere: true,
      deficit: false,
    });
  }
  if (plusValueNette <= 0) {
    return emptyResult("pfu", calc, {
      exonere: false,
      deficit: true,
    });
  }

  const montantIR = plusValueNette * TAUX_IR_PFU;
  const montantPS = plusValueNette * TAUX_PS;
  const impotTotal = montantIR + montantPS;
  return {
    regime: "pfu",
    plusValueBrute,
    plusValueNette,
    fractionAcquisition: calc.fractionAcquisition,
    partCedee: calc.partCedee,
    methode: calc.methode,
    exonere: false,
    deficit: false,
    montantIR,
    montantPS,
    cotisationsSociales: 0,
    impotTotal,
    netApresImpot: plusValueNette - impotTotal,
    tauxEffectif: impotTotal / plusValueNette,
  };
}

/**
 * Barème progressif IR (option globale annuelle). TMI fournie par l'utilisateur
 * (11/30/41/45 %) + 18,6 % PS sur la totalité de la PV.
 *
 * Hypothèse simplificatrice : on applique la TMI directement à la PV (pas de
 * recalcul du barème complet par tranche, qui nécessiterait le revenu global
 * du foyer). C'est suffisant pour une estimation marginal — c'est précisément
 * ce que l'utilisateur veut comparer avec le PFU.
 */
export function computeTaxBareme(
  input: FiscaliteInput,
  tmi: TmiRate,
): FiscaliteResult {
  const calc = computeNetPlusValue(input);
  const { plusValueBrute, plusValueNette } = calc;

  if (isExoneree(input)) {
    return emptyResult("bareme", calc, {
      exonere: true,
      deficit: false,
    });
  }
  if (plusValueNette <= 0) {
    return emptyResult("bareme", calc, {
      exonere: false,
      deficit: true,
    });
  }

  const montantIR = plusValueNette * tmi;
  const montantPS = plusValueNette * TAUX_PS;
  const impotTotal = montantIR + montantPS;
  return {
    regime: "bareme",
    plusValueBrute,
    plusValueNette,
    fractionAcquisition: calc.fractionAcquisition,
    partCedee: calc.partCedee,
    methode: calc.methode,
    exonere: false,
    deficit: false,
    montantIR,
    montantPS,
    cotisationsSociales: 0,
    impotTotal,
    netApresImpot: plusValueNette - impotTotal,
    tauxEffectif: impotTotal / plusValueNette,
  };
}

/**
 * BIC professionnel (trading habituel / activité régulière).
 *
 * On considère le bénéfice net (= PV nette) comme un revenu professionnel :
 *   - imposé à la TMI du foyer (IR au barème)
 *   - + 18,6 % PS
 *   - + ~22 % cotisations sociales TNS (URSSAF micro-BIC ou TNS classique)
 *
 * Le seuil 305 € ne s'applique PAS au BIC (régime pro). On garde la possibilité
 * d'un déficit (moins-value) sans impôt, mais en BIC celui-ci est en principe
 * imputable et reportable — non modélisé ici.
 */
export function computeTaxBIC(
  input: FiscaliteInput,
  tmi: TmiRate,
): FiscaliteResult {
  const calc = computeNetPlusValue(input);
  const { plusValueBrute, plusValueNette } = calc;

  if (plusValueNette <= 0) {
    return emptyResult("bic", calc, {
      exonere: false,
      deficit: true,
    });
  }

  const montantIR = plusValueNette * tmi;
  const montantPS = plusValueNette * TAUX_PS;
  const cotisationsSociales = plusValueNette * TAUX_COTISATIONS_BIC;
  const impotTotal = montantIR + montantPS + cotisationsSociales;
  return {
    regime: "bic",
    plusValueBrute,
    plusValueNette,
    fractionAcquisition: calc.fractionAcquisition,
    partCedee: calc.partCedee,
    methode: calc.methode,
    exonere: false,
    deficit: false,
    montantIR,
    montantPS,
    cotisationsSociales,
    impotTotal,
    netApresImpot: plusValueNette - impotTotal,
    tauxEffectif: impotTotal / plusValueNette,
  };
}

/**
 * Dispatcher unique selon le régime — utile dans le composant pour ne pas
 * dupliquer la logique de switch côté UI.
 *
 * Pour Barème/BIC sans TMI fournie, on retombe sur la TMI 30 % par défaut
 * (médiane représentative pour ne pas afficher un résultat absurde).
 */
export function computeTax(input: FiscaliteInput): FiscaliteResult {
  const fallbackTmi: TmiRate = 0.30;
  const tmi: TmiRate = (input.tmi ?? fallbackTmi) as TmiRate;
  switch (input.regime) {
    case "pfu":
      return computeTaxPFU(input);
    case "bareme":
      return computeTaxBareme(input, tmi);
    case "bic":
      return computeTaxBIC(input, tmi);
    default:
      // Garde-fou : régime inconnu → comportement PFU
      return computeTaxPFU(input);
  }
}

/* -------------------------------------------------------------------------- */
/*  Formatters                                                                */
/* -------------------------------------------------------------------------- */

/** Formate un montant € en locale fr-FR. */
export function formatEuro(value: number, decimals = 2): string {
  if (!Number.isFinite(value)) return "—";
  // Séparateur de milliers : espace insécable classique plutôt que l'espace fine
  // (U+202F) d'Intl, quasi invisible dans la police d'affichage (« 5636,30 € »).
  return value
    .toLocaleString("fr-FR", {
      style: "currency",
      currency: "EUR",
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    })
    .replace(/ /g, " ");
}

/** Formate un pourcentage (0.30 → "30 %"). */
export function formatPercent(value: number, decimals = 1): string {
  if (!Number.isFinite(value)) return "—";
  return `${(value * 100).toLocaleString("fr-FR", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })} %`;
}

/** Libellé humain d'un régime fiscal. */
export function regimeLabel(regime: Regime): string {
  switch (regime) {
    case "pfu":
      return "PFU 31,4 % (flat tax)";
    case "bareme":
      return "Barème progressif IR";
    case "bic":
      return "BIC professionnel";
  }
}
