/**
 * lib/scoring.ts — Source of truth unique pour le scoring des plateformes.
 *
 * Pourquoi ce fichier :
 * Avant le 26/04/2026, le scoring était dispersé :
 *  - data/platforms.json contenait `scoring.global` figé à la main (souvent
 *    incohérent avec les sous-notes : Bitpanda Frais 3.0 + Sécurité 4.7 ...
 *    annoncé global 4.3 mais calculé à la main, jamais re-vérifié).
 *  - app/methodologie/page.tsx promet 6 critères dont un « Catalogue & services »
 *    pondéré 10 % — mais le critère catalogue était totalement absent du JSON.
 *  - Conséquence : la note globale affichée ne respectait PAS la formule
 *    publique. Casse de confiance + risque AMF/DDPP (information trompeuse).
 *
 * Ce fichier centralise :
 *  1. Les 6 poids officiels (mêmes que `app/methodologie/page.tsx`).
 *  2. La fonction `computeGlobalScore()` qui calcule la moyenne pondérée.
 *  3. La fonction `computeCatalogueScore()` qui dérive le score catalogue
 *     de manière 100 % déterministe à partir des données brutes (totalCount,
 *     staking, payment methods, category broker multi-asset).
 *  4. Une fonction `validateScoring()` à appeler dans les tests/CI pour
 *     s'assurer que `scoring.global` du JSON ≈ moyenne pondérée des sous-notes.
 *
 * Toute page qui affiche un score DOIT importer depuis ici. Ne jamais hardcoder
 * un score global dans le JSON sans le régénérer via `scripts/compute-platform-scores.mjs`.
 */

// ─── Poids officiels (cf. /methodologie) ────────────────────────────────────
//
// Total = 100 %. Si tu changes ces valeurs, change AUSSI :
//  - app/methodologie/page.tsx (tableau CRITERIA)
//  - data/platforms.json (relancer scripts/compute-platform-scores.mjs)
//  - tests/lib/scoring.test.ts (snapshot)

export const SCORING_WEIGHTS = {
  fees: 0.20,
  security: 0.25,
  mica: 0.20,
  ux: 0.15,
  support: 0.10,
  catalogue: 0.10,
} as const;

export type ScoringCriterion = keyof typeof SCORING_WEIGHTS;

/** Vérification compile-time : les poids somment bien à 1.00. */
const _WEIGHT_TOTAL = Object.values(SCORING_WEIGHTS).reduce((a, b) => a + b, 0);
if (Math.abs(_WEIGHT_TOTAL - 1) > 1e-9) {
  // Erreur de configuration. On lève à l'import pour détecter au build.
  throw new Error(
    `lib/scoring.ts: poids invalides, total=${_WEIGHT_TOTAL} (attendu 1.0)`,
  );
}

// ─── Types des sous-notes ───────────────────────────────────────────────────

/** Forme attendue dans `data/platforms.json` pour le bloc `scoring`. */
export interface PlatformScoring {
  global: number;
  fees: number;
  security: number;
  ux: number;
  support: number;
  mica: number;
  catalogue: number;
}

// ─── Calcul du score global pondéré ─────────────────────────────────────────

/**
 * Calcule le score global pondéré 0–5 à partir des 6 sous-notes.
 *
 * Formule : Σ (sous-note × poids), arrondi à 1 décimale.
 *
 * Exemple Bitpanda :
 *   computeGlobalScore({ fees: 3.0, security: 4.7, mica: 4.9, ux: 4.6,
 *                        support: 4.2, catalogue: 4.5 }) = 4.3
 */
export function computeGlobalScore(
  sub: Omit<PlatformScoring, "global">,
): number {
  const raw =
    sub.fees * SCORING_WEIGHTS.fees +
    sub.security * SCORING_WEIGHTS.security +
    sub.mica * SCORING_WEIGHTS.mica +
    sub.ux * SCORING_WEIGHTS.ux +
    sub.support * SCORING_WEIGHTS.support +
    sub.catalogue * SCORING_WEIGHTS.catalogue;
  return Math.round(raw * 10) / 10;
}

// ─── Dérivation du score Catalogue & services ───────────────────────────────

/**
 * Inputs nécessaires pour calculer le score `catalogue` de façon déterministe.
 * Tout ce dont la fonction a besoin doit déjà exister dans data/platforms.json.
 * Pas de jugement de valeur arbitraire — uniquement des dimensions vérifiables.
 */
export interface CatalogueInputs {
  /** Nombre total de cryptos listées sur la plateforme. */
  totalCryptos: number;
  /** Le staking est-il proposé directement sur la plateforme ? */
  stakingAvailable: boolean;
  /** Nombre de méthodes de dépôt distinctes (CB, SEPA, Apple Pay…). */
  paymentMethodsCount: number;
  /**
   * Catégorie de l'acteur — un broker multi-actifs (Bitpanda, Trade Republic)
   * a un avantage légitime sur "catalogue & services" car il propose actions /
   * ETF / métaux en plus de la crypto. On limite ce bonus aux brokers connus
   * pour ne pas gonfler artificiellement les exchanges.
   */
  isMultiAssetBroker: boolean;
}

/**
 * Calcule le score catalogue 0–5 à partir d'inputs vérifiables.
 *
 * Barème (publié sur /methodologie pour transparence) :
 *
 * Base — courbe sur le nombre de cryptos listées :
 *   ≤ 30   : 2.5  (catalogue très étroit, ex Bitstack)
 *   ≤ 100  : 3.0–3.5
 *   ≤ 300  : 3.5–4.3
 *   ≤ 500  : 4.3–4.7
 *   ≤ 700  : 4.7–4.9
 *   > 700  : 5.0
 *
 * Bonus additifs (cap final à 5.0) :
 *   + 0.3 si staking disponible
 *   + 0.2 si ≥ 5 méthodes de paiement
 *   + 0.3 si broker multi-actifs (actions / ETF / métaux)
 */
export function computeCatalogueScore(inp: CatalogueInputs): number {
  // Base : courbe sur le nombre de cryptos.
  let base: number;
  const n = Math.max(0, inp.totalCryptos);

  if (n <= 30) {
    base = 2.5;
  } else if (n <= 100) {
    base = 3.0 + ((n - 30) / 70) * 0.5; // 3.0 → 3.5
  } else if (n <= 300) {
    base = 3.5 + ((n - 100) / 200) * 0.8; // 3.5 → 4.3
  } else if (n <= 500) {
    base = 4.3 + ((n - 300) / 200) * 0.4; // 4.3 → 4.7
  } else if (n <= 700) {
    base = 4.7 + ((n - 500) / 200) * 0.2; // 4.7 → 4.9
  } else {
    base = 5.0;
  }

  // Bonus additifs.
  let bonus = 0;
  if (inp.stakingAvailable) bonus += 0.3;
  if (inp.paymentMethodsCount >= 5) bonus += 0.2;
  if (inp.isMultiAssetBroker) bonus += 0.3;

  const total = Math.min(5, base + bonus);
  return Math.round(total * 10) / 10;
}

// ─── Validation des données ─────────────────────────────────────────────────

/**
 * Vérifie qu'une plateforme respecte la formule publique.
 *
 * Tolérance ±0.05 (les notes affichées sont arrondies à 1 décimale).
 *
 * Lever une erreur si une note diverge — utilisé en CI/test pour empêcher
 * un drift entre data/platforms.json et la méthodologie publiée.
 */
export function validateScoring(
  platformId: string,
  scoring: PlatformScoring,
): void {
  const expected = computeGlobalScore(scoring);
  const drift = Math.abs(scoring.global - expected);
  if (drift > 0.05) {
    throw new Error(
      `[scoring] ${platformId}: global=${scoring.global} mais formule donne ${expected} ` +
        `(drift=${drift.toFixed(3)}). Lance scripts/compute-platform-scores.mjs.`,
    );
  }
}

/**
 * Liste des IDs de plateformes considérées comme brokers multi-actifs.
 * Utilisée par scripts/compute-platform-scores.mjs.
 *
 * Ajouter ici un id seulement si la plateforme propose officiellement
 * actions, ETF ou métaux précieux EN PLUS de la crypto.
 */
export const MULTI_ASSET_BROKER_IDS: ReadonlySet<string> = new Set([
  "bitpanda", // crypto + actions + ETF + métaux
  "trade-republic", // actions + ETF + crypto (broker FR/DE)
  "revolut", // actions US + crypto + métaux
  "swissborg", // crypto + EarnApp (yield products)
]);
