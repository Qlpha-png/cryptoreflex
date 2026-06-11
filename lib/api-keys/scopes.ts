/**
 * lib/api-keys/scopes.ts — Définition canonique des scopes B2B.
 *
 * Les scopes sont la frontière de sécurité entre une clé et les endpoints
 * qu'elle peut appeler. Inspirés du modèle Stripe (granulaire). Stockés
 * sous forme de array JSONB dans `api_keys.scopes`.
 *
 * Règles :
 *   - `admin:*` est un wildcard qui couvre TOUS les autres scopes (réservé
 *     aux comptes admin Cryptoreflex / partenaires).
 *   - Les autres scopes sont stricts : pas de wildcard implicite. `user:*`
 *     ne donne pas accès à `webhooks:manage`.
 *   - Un endpoint déclare le scope requis. Le middleware compare.
 */

import type { ApiKeyScope, ApiKeyTier } from "./types";

/** Tous les scopes valides, ordre d'affichage suggéré dans le dashboard. */
export const ALL_SCOPES: readonly ApiKeyScope[] = [
  "public:read",
  "user:portfolio:read",
  "user:portfolio:write",
  "user:trades:read",
  "user:trades:write",
  "user:alerts:read",
  "user:alerts:write",
  "webhooks:manage",
  "historical:read",
  "admin:*",
] as const;

/** Description française pédagogue de chaque scope (UI dashboard). */
export const SCOPE_LABELS: Record<ApiKeyScope, string> = {
  "public:read":
    "Lire les données publiques (plateformes, scores PSAN, top cryptos) avec rate limit étendu.",
  "user:portfolio:read":
    "Lire votre portfolio agrégé (positions, PMP, plus-values réalisées).",
  "user:portfolio:write":
    "Recalculer ton portfolio (force resync depuis tes exchanges).",
  "user:trades:read": "Lire votre historique de trades.",
  "user:trades:write": "Ajouter ou supprimer des trades manuels.",
  "user:alerts:read": "Lire tes alertes prix.",
  "user:alerts:write": "Créer, modifier, supprimer vos alertes.",
  "webhooks:manage":
    "Gérer vos webhooks (créer, modifier, supprimer, tester).",
  "historical:read":
    "Accéder aux séries historiques étendues (24 mois platformes, breakdown scores).",
  "admin:*":
    "Accès complet (réservé partenaires Cryptoreflex, jamais distribué publiquement).",
};

/** Scopes activés par défaut à la création d'une clé selon le tier. */
export const DEFAULT_SCOPES_BY_TIER: Record<ApiKeyTier, ApiKeyScope[]> = {
  sandbox: ["public:read", "user:portfolio:read"],
  b2b_starter: [
    "public:read",
    "user:portfolio:read",
    "user:trades:read",
    "user:alerts:read",
    "webhooks:manage",
  ],
  b2b_pro: [
    "public:read",
    "user:portfolio:read",
    "user:portfolio:write",
    "user:trades:read",
    "user:trades:write",
    "user:alerts:read",
    "user:alerts:write",
    "webhooks:manage",
    "historical:read",
  ],
  b2b_enterprise: [
    "public:read",
    "user:portfolio:read",
    "user:portfolio:write",
    "user:trades:read",
    "user:trades:write",
    "user:alerts:read",
    "user:alerts:write",
    "webhooks:manage",
    "historical:read",
  ],
};

/**
 * Scopes interdits par tier — sécurité défense en profondeur.
 * `admin:*` n'est attribuable que via service_role (admin dashboard), pas via
 * Stripe Checkout. Le tier `b2b_enterprise` ne donne PAS automatiquement admin.
 */
export const FORBIDDEN_SCOPES_BY_TIER: Record<ApiKeyTier, ApiKeyScope[]> = {
  sandbox: ["admin:*", "user:portfolio:write", "user:trades:write", "user:alerts:write"],
  b2b_starter: ["admin:*"],
  b2b_pro: ["admin:*"],
  b2b_enterprise: ["admin:*"],
};

/**
 * Vérifie qu'une clé possède le scope requis pour appeler un endpoint.
 * `admin:*` est un wildcard qui couvre tous les autres scopes.
 */
export function hasScope(
  keyScopes: readonly ApiKeyScope[],
  required: ApiKeyScope,
): boolean {
  if (keyScopes.includes("admin:*")) return true;
  return keyScopes.includes(required);
}

/**
 * Vérifie qu'une clé possède TOUS les scopes requis. Pour les endpoints qui
 * nécessitent plusieurs scopes (rare, ex export complet user).
 */
export function hasAllScopes(
  keyScopes: readonly ApiKeyScope[],
  required: readonly ApiKeyScope[],
): boolean {
  if (keyScopes.includes("admin:*")) return true;
  return required.every((s) => keyScopes.includes(s));
}

/**
 * Sanitize : retire les scopes invalides et applique les forbidden par tier.
 * Utilisé à la création d'une clé pour empêcher un user de demander un scope
 * non autorisé pour son tier.
 */
export function sanitizeScopes(
  requested: readonly string[],
  tier: ApiKeyTier,
): ApiKeyScope[] {
  const valid = requested.filter((s): s is ApiKeyScope =>
    (ALL_SCOPES as readonly string[]).includes(s),
  );
  const forbidden = FORBIDDEN_SCOPES_BY_TIER[tier];
  return valid.filter((s) => !forbidden.includes(s));
}
