/**
 * lib/abtest-experiments.ts — catalogue UI des expériences A/B vague 2026-05.
 *
 * Pourquoi ce module séparé de `lib/abtest.ts` ?
 *  - `lib/abtest.ts` est le moteur bas-niveau (cookie, tirage, exposure POST,
 *    whitelist serveur). Il ne connaît que `id` + `variants` + `weights`.
 *  - Ici on stocke les métadonnées UI : description humaine, métriques de
 *    conversion attendues, wording exact des variants. Données utilisées par
 *    le dashboard /admin/abtest et par les composants frontend.
 *  - Évite de polluer le moteur avec du copy textuel non-structurel et garde
 *    l'API publique stable (`EXPERIMENTS` reste un Record<id, {variants, …}>).
 *
 * Convention :
 *  - Le `control` est toujours en première position des `variants`.
 *  - `metrics[0]` = métrique primaire (celle qu'on optimise).
 *  - Les `variants` listés ici doivent matcher exactement ceux déclarés dans
 *    `EXPERIMENTS` côté `lib/abtest.ts` (validation runtime serveur sinon).
 */

export interface ExperimentMeta {
  id: string;
  description: string;
  /** Variants ordonnés (control en premier). */
  variants: readonly string[];
  /** Métriques trackées via `trackVariantConversion(id, variant, metric)`.
   *  Première = métrique primaire pour calcul d'uplift et de p-value. */
  metrics: readonly string[];
}

export const EXPERIMENT_METADATA: Record<string, ExperimentMeta> = {
  hero_headline_v1: {
    id: "hero_headline_v1",
    description: "Test headline Hero homepage (control vs preuve sociale vs vitesse).",
    variants: ["control", "social-proof", "speed"] as const,
    metrics: ["click_pro_cta", "scroll_50", "newsletter_signup"] as const,
  },
  pricing_display_v1: {
    id: "pricing_display_v1",
    description: "Test affichage prix Soutien (mensuel vs annuel upfront vs frame café).",
    variants: ["monthly", "annual-upfront", "cafe-frame"] as const,
    metrics: ["click_checkout", "checkout_complete"] as const,
  },
  askai_cta_v1: {
    id: "askai_cta_v1",
    description: "Test CTA Soutien sur lock AskAI (control vs discount vs trial).",
    variants: ["control", "discount", "trial"] as const,
    metrics: ["click_pro_cta", "checkout_complete"] as const,
  },
};

/** Helper typed accès lecture seule. Renvoie undefined pour expé inconnue. */
export function getExperimentMeta(id: string): ExperimentMeta | undefined {
  return EXPERIMENT_METADATA[id];
}

/** Liste ordonnée pour itération dashboard. */
export const EXPERIMENT_LIST: ExperimentMeta[] = Object.values(EXPERIMENT_METADATA);
