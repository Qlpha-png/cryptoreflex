/**
 * lib/limits.ts — Limites Free vs Pro pour les features client (portfolio,
 * watchlist, alertes).
 *
 * Source unique de vérité pour les limites par plan, utilisée :
 *  - côté client (composants PortfolioView, WatchlistButton, AlertsManager)
 *    via /api/me pour récupérer le plan + appliquer la limite.
 *  - côté serveur (route /api/alerts) pour gater le nombre d'alertes par
 *    email/user avant insertion en DB.
 *
 * Pourquoi ce fichier (audit cohérence 30/04/2026) :
 *  La page /pro promet "portfolio illimité, alertes illimitées, watchlist
 *  illimitée" mais le code livrait les MÊMES limites à tout le monde
 *  (MAX_HOLDINGS=30 hardcodé, MAX_WATCHLIST=10 hardcodé, etc.). Conséquence :
 *  un user qui paye Pro ne débloquait rien → fausse promesse PAYANTE = risque
 *  L121-2 + obligation de remboursement automatique.
 *
 *  Maintenant : ces helpers retournent une limite différente selon le plan,
 *  et les composants/routes lisent CELLE-LÀ au lieu d'une constante hardcodée.
 *
 * Limites choisies :
 *  - Free  : portfolio 10, alertes 3, watchlist 10  (raisonnable pour découvrir)
 *  - Pro   : portfolio "illimité" = 500 (anti-DoS localStorage), alertes 100,
 *            watchlist 200 (seuils techniquement supportables)
 *
 * Note importante sur la sécurité du gating :
 *  - Portfolio + Watchlist sont stockés en localStorage côté CLIENT.
 *    Le gate est donc UX seulement — un user technique peut éditer son
 *    storage et ajouter au-delà de la limite. Pour un vrai gate, il
 *    faudrait migrer ces données vers Supabase (RLS par user). Acceptable
 *    aujourd'hui car (a) le user qui contourne reste un user payant et
 *    (b) ce ne sont pas des fonctionnalités à risque de fraude.
 *  - Alertes sont stockées côté SERVEUR (Supabase). Le gate sur la route
 *    /api/alerts est un VRAI gate : on lit le plan via la session ou via
 *    la table users.email → plan, puis on refuse l'insertion au-delà.
 */

import type { Plan } from "@/lib/auth";

/**
 * Limites Free (plan gratuit + utilisateurs non-authentifiés).
 *
 * Modifier ces valeurs IMPACTE la copy de /pro qui annonce "vs 10 en Free".
 * Garde la cohérence wording <-> code.
 */
export const FREE_LIMITS = {
  portfolio: 10,
  alerts: 3,
  watchlist: 10,
} as const;

/**
 * Limites Pro (Soutien Mensuel + Soutien Annuel).
 *
 * "Illimité" est borné techniquement pour éviter les abus (DoS localStorage,
 * spam d'alertes email). Les valeurs sont volontairement très hautes pour
 * que l'utilisateur perçoive l'illimité (un retail crypto FR moyen a ~5-15
 * positions, rarement >50).
 */
export const PRO_LIMITS = {
  portfolio: 500,
  alerts: 100,
  watchlist: 200,
} as const;

export interface FeatureLimits {
  portfolio: number;
  alerts: number;
  watchlist: number;
}

/**
 * Retourne les limites applicables au plan donné.
 *
 * @param plan Plan actif de l'utilisateur (`free` par défaut si null/undefined).
 */
export function getLimits(plan: Plan | null | undefined): FeatureLimits {
  if (plan === "pro_monthly" || plan === "pro_annual") {
    return { ...PRO_LIMITS };
  }
  return { ...FREE_LIMITS };
}

/**
 * Indique si la limite donnée doit être affichée comme "illimité" dans l'UI
 * (toute valeur >= 100 est considérée comme illimitée pour l'utilisateur
 * final — au-delà de cette borne il ne touchera jamais le plafond).
 */
export function isUnlimited(limit: number): boolean {
  return limit >= 100;
}

/** Affichage UI : "10" en Free, "Illimité" en Pro. */
export function formatLimit(limit: number): string {
  return isUnlimited(limit) ? "Illimité" : String(limit);
}
