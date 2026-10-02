/**
 * Interrupteur Reflex Cards (sans données : importable partout, y compris côté client).
 *
 * Actif en préproduction Vercel pour la recette ; en production seulement si
 * NEXT_PUBLIC_REFLEX_CARDS_ENABLED=true. Coupé : pages /cartes en 404, encarts et
 * liens masqués, hors sitemap.
 *
 * Uniquement des variables NEXT_PUBLIC_*, figées au build et identiques côté serveur et
 * navigateur : aucun écart d'hydratation possible dans la Navbar ou la barre d'onglets.
 * NEXT_PUBLIC_VERCEL_ENV est fourni par Vercel au build et à l'exécution (production, preview).
 */
export function isReflexCardsEnabled(): boolean {
  return process.env.NEXT_PUBLIC_REFLEX_CARDS_ENABLED === "true" || process.env.NEXT_PUBLIC_VERCEL_ENV === "preview";
}
