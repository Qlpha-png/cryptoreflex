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
  /* trim : une valeur saisie avec un retour à la ligne (« true\n ») allume quand même le jeu */
  return process.env.NEXT_PUBLIC_REFLEX_CARDS_ENABLED?.trim() === "true" || process.env.NEXT_PUBLIC_VERCEL_ENV === "preview";
}

/**
 * Comptes joueurs (phase B, SERVEUR uniquement) — REFLEX_CARDS_ACCOUNTS :
 *  - « true »  : la partie de chacun vit sur le serveur (invité ou compte) ;
 *  - « essai » : routes /api/cartes actives, mais le jeu ne s'en sert qu'avec ?comptes=essai (recette en production) ;
 *  - absent    : routes en 404, le jeu garde sa partie dans le navigateur (bêta).
 */
export function reflexAccountsMode(): "on" | "essai" | "off" {
  const v = process.env.REFLEX_CARDS_ACCOUNTS?.trim();
  return v === "true" ? "on" : v === "essai" ? "essai" : "off";
}
