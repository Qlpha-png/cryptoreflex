/**
 * Helpers TypeScript pour `data/fiscal-tools.json`.
 *
 * Lecture seule depuis disque (Server Component friendly, ISR compatible).
 * Aucune dépendance runtime — pur module pour pouvoir l'utiliser à la
 * fois côté Server Component (page comparatif) et Client Component (cards).
 */

import fiscalToolsData from "@/data/fiscal-tools.json";
import type {
  FiscalTool,
  FiscalToolPlan,
  FiscalToolsData,
} from "@/lib/fiscal-tools-types";

const data = fiscalToolsData as unknown as FiscalToolsData;

/* -------------------------------------------------------------------------- */
/*  Lecture                                                                   */
/* -------------------------------------------------------------------------- */

/** Tous les outils, triés par score décroissant (recommandé en tête). */
export function getAllFiscalTools(): FiscalTool[] {
  return [...data.tools].sort((a, b) => {
    // L'outil "recommended" passe toujours en premier, puis tri par score.
    if (a.recommended && !b.recommended) return -1;
    if (!a.recommended && b.recommended) return 1;
    return b.score - a.score;
  });
}

/** Récupère un outil par son id (kebab-case), ou null si absent. */
export function getFiscalToolById(id: string): FiscalTool | null {
  return data.tools.find((t) => t.id === id) ?? null;
}

/**
 * Renvoie l'outil marqué `recommended: true` (Waltio par défaut).
 * Si aucun outil n'est marqué (incohérence data), fallback sur le 1er du tri.
 */
export function getRecommendedFiscalTool(): FiscalTool {
  const recommended = data.tools.find((t) => t.recommended);
  if (recommended) return recommended;
  // Fallback défensif — ne devrait jamais arriver si fiscal-tools.json est valide.
  const fallback = getAllFiscalTools()[0];
  if (!fallback) {
    throw new Error("fiscal-tools.json est vide — impossible de trouver un outil recommandé.");
  }
  return fallback;
}

/**
 * Renvoie tous les outils dont au moins un palier payant est ≤ maxEur.
 * Utile pour proposer une sélection "petit budget" sur les pages SEO.
 */
export function getFiscalToolsByPriceRange(maxEur: number): FiscalTool[] {
  return getAllFiscalTools().filter((tool) =>
    tool.plansEur.some((plan) => plan.priceEur > 0 && plan.priceEur <= maxEur),
  );
}

/* -------------------------------------------------------------------------- */
/*  Helpers de présentation                                                   */
/* -------------------------------------------------------------------------- */

/**
 * Renvoie le palier le moins cher (hors gratuit) de l'outil.
 * Fallback sur le free tier si aucun plan payant.
 */
export function getCheapestPaidPlan(tool: FiscalTool): FiscalToolPlan {
  const paid = tool.plansEur.filter((p) => p.priceEur > 0);
  if (paid.length === 0) return tool.plansEur[0];
  return paid.reduce((min, plan) =>
    plan.priceEur < min.priceEur ? plan : min,
  );
}

/** Formatage du prix annuel "à partir de" pour les cards. */
export function formatStartingPrice(tool: FiscalTool): string {
  const cheapest = getCheapestPaidPlan(tool);
  if (cheapest.priceEur === 0) return "Gratuit";
  return `dès ${cheapest.priceEur.toLocaleString("fr-FR")} €/an`;
}
