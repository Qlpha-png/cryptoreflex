/**
 * Interrupteur Reflex Cards (sans données : importable partout, y compris côté client).
 *
 * Actif en préproduction Vercel pour la recette ; en production seulement si
 * NEXT_PUBLIC_REFLEX_CARDS_ENABLED=true. Coupé : pages /cartes en 404, encarts et
 * liens masqués, hors sitemap.
 */
export function isReflexCardsEnabled(): boolean {
  return (
    process.env.NEXT_PUBLIC_REFLEX_CARDS_ENABLED === "true" ||
    process.env.VERCEL_ENV === "preview" ||
    process.env.NEXT_PUBLIC_VERCEL_ENV === "preview"
  );
}
