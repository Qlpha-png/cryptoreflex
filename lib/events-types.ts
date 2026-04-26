/**
 * lib/events-types.ts — Types partagés du module Calendrier crypto (pilier 4).
 *
 * Distinct de `lib/events.ts` (legacy "evergreen" basé sur data/events.json).
 * Ce module sert le nouveau pilier `/calendrier` qui mixe seed + API tierce
 * (CoinMarketCal) et offre filtres + grille mensuelle + ItemList JSON-LD.
 *
 * Les deux modules co-existent volontairement :
 *  - `lib/events.ts` : evergreen, refresh trimestriel manuel, surface SEO existante.
 *  - `lib/events-fetcher.ts` (+ ce fichier) : pilier 4 avec data dynamique.
 *
 * Si plus tard on veut consolider, exposer un mapper `legacy → CryptoEvent` dans
 * `lib/events-fetcher.ts` (la `EventCategory` du nouveau module est un super-set).
 */

/* -------------------------------------------------------------------------- */
/* Catégories                                                                 */
/* -------------------------------------------------------------------------- */

/**
 * Catégorie d'événement. On utilise des string-literals plutôt qu'un `enum` :
 *  - Tree-shakable (un enum TS génère un objet runtime).
 *  - Sérialisable JSON sans transformation (pas de `EventCategory.Halving`).
 *  - Plus facile à filtrer côté client (comparaison `===` direct).
 */
export type EventCategory =
  | "Halving"
  | "FOMC"
  | "ETF"
  | "Listing"
  | "Update"
  | "Conference"
  | "Hard Fork"
  | "Token Unlock";

/** Liste figée — sert à itérer dans les filtres (chips). */
export const EVENT_CATEGORIES: readonly EventCategory[] = [
  "Halving",
  "FOMC",
  "ETF",
  "Listing",
  "Update",
  "Conference",
  "Hard Fork",
  "Token Unlock",
] as const;

/** Description française courte (tooltip / aria-label sur les chips). */
export const CATEGORY_DESCRIPTION: Record<EventCategory, string> = {
  Halving: "Réduction de l'émission monétaire d'un protocole PoW (Bitcoin, Litecoin…).",
  FOMC: "Réunion du Federal Open Market Committee — décision de taux de la Fed.",
  ETF: "Décision d'autorisation d'un ETF spot (SEC, AMF…).",
  Listing: "Cotation d'un nouveau token sur une plateforme majeure.",
  Update: "Mise à jour réseau (mainnet, soft fork, EIP).",
  Conference: "Événement professionnel ou communautaire majeur.",
  "Hard Fork": "Modification incompatible du protocole (chain split possible).",
  "Token Unlock": "Déblocage massif de tokens en circulation (impact prix).",
};

/**
 * Classes Tailwind purge-safe par catégorie (bg + text + ring).
 * On les déclare en strings entières pour que le scanner Tailwind les détecte.
 */
export const CATEGORY_BADGE: Record<EventCategory, string> = {
  Halving: "bg-amber-500/15 text-amber-200 ring-amber-500/30",
  FOMC: "bg-sky-500/15 text-sky-200 ring-sky-500/30",
  ETF: "bg-emerald-500/15 text-emerald-200 ring-emerald-500/30",
  Listing: "bg-fuchsia-500/15 text-fuchsia-200 ring-fuchsia-500/30",
  Update: "bg-indigo-500/15 text-indigo-200 ring-indigo-500/30",
  Conference: "bg-cyan-500/15 text-cyan-200 ring-cyan-500/30",
  "Hard Fork": "bg-rose-500/15 text-rose-200 ring-rose-500/30",
  "Token Unlock": "bg-violet-500/15 text-violet-200 ring-violet-500/30",
};

/* -------------------------------------------------------------------------- */
/* Importance                                                                 */
/* -------------------------------------------------------------------------- */

/**
 * Importance d'un événement pour un investisseur retail :
 *  - 1 : mineur (info de contexte)
 *  - 2 : significatif (à surveiller)
 *  - 3 : majeur (impact marché probable)
 */
export type Importance = 1 | 2 | 3;

export const IMPORTANCE_LABEL: Record<Importance, string> = {
  1: "Mineur",
  2: "Significatif",
  3: "Majeur",
};

/** Couleur dot/badge alignée avec le design system. */
export const IMPORTANCE_COLOR: Record<Importance, string> = {
  1: "bg-slate-300",
  2: "bg-amber-500",
  3: "bg-amber-400",
};

/** Couleur de bordure / ring pour cards. */
export const IMPORTANCE_RING: Record<Importance, string> = {
  1: "ring-slate-400/20",
  2: "ring-amber-500/30",
  3: "ring-amber-400/50",
};

/* -------------------------------------------------------------------------- */
/* Modèle Event                                                               */
/* -------------------------------------------------------------------------- */

export interface CryptoEvent {
  /** Identifiant stable (slug + date) — utilisé comme `key` React et `@id` JSON-LD. */
  id: string;
  /** Titre court FR (utilisé en H3 et listes). */
  title: string;
  /**
   * Date ISO `YYYY-MM-DD`. On évite Date pour rester JSON-sérialisable
   * (passe Server → Client sans hydratation cassée par les TZ).
   */
  date: string;
  /** Symbole crypto principal concerné (BTC, ETH, SOL…) ou "MARCHÉ" pour FOMC. */
  crypto: string;
  category: EventCategory;
  /** Source primaire (Fed, SEC, équipe projet…) — affiché dans le badge "via". */
  source: string;
  /** URL vers la source officielle (rendu en `rel="nofollow noopener"`). */
  sourceUrl: string;
  /** Description 1-2 phrases. Pas de Markdown ni HTML — texte brut. */
  description: string;
  importance: Importance;
}

/* -------------------------------------------------------------------------- */
/* Filtres UI                                                                 */
/* -------------------------------------------------------------------------- */

export type PeriodFilter = "all" | "7d" | "30d";

export interface EventsFilterState {
  /** Liste de symboles crypto sélectionnés (vide = tous). */
  cryptos: string[];
  /** Catégories sélectionnées (vide = toutes). */
  categories: EventCategory[];
  /** Importance minimale (1 = aucun filtre, 3 = uniquement majeurs). */
  minImportance: Importance;
  /** Période visible. */
  period: PeriodFilter;
}

export const DEFAULT_FILTERS: EventsFilterState = {
  cryptos: [],
  categories: [],
  minImportance: 1,
  period: "all",
};
