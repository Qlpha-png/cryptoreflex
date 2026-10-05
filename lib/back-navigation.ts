/**
 * lib/back-navigation.ts — calcul du parent du bouton « Retour » global
 * (components/BackButton.tsx). Logique pure, testée dans
 * tests/lib/back-navigation.test.ts.
 *
 * FIX 2026-05-02 #7 (audit 404 ultra-exhaustif) — 94 % des 404 du site (1217
 * émissions de liens cassés) venaient du bouton Retour : le calcul naïf « strip
 * dernier segment » générait des URLs inexistantes pour les routes nested-only.
 * Ces routes intermédiaires n'ont aucun `page.tsx` : on renvoie vers le hub
 * valide le plus proche.
 *
 * 2026-10-02 (audit SEO) — ajouts : /historique-prix/[crypto]/[annee] (le parent
 * /historique-prix/<crypto> n'est pas une page), /lp/* (pas de /lp), /wizard/*
 * (/wizard redirige vers le wizard lui-même → boucle), preview-pdf du
 * calculateur fiscal. tests/lib/back-navigation.test.ts parcourt TOUTES les
 * routes de app/ et échoue si un parent n'est pas une page.
 *
 * Source unique de vérité — toute nouvelle route nested-only SANS page
 * intermédiaire doit être ajoutée ici, sinon le bouton Retour émet un 404.
 */

export const NESTED_ONLY_HUBS: ReadonlyArray<{ pattern: RegExp; hub: string }> = [
  // /acheter/[crypto]/[pays] → /acheter (hub list pays × crypto)
  { pattern: /^\/acheter\/[^/]+\/[^/]+$/, hub: "/acheter" },
  // /vs/[a]/[b] → /comparer (hub comparatifs crypto)
  { pattern: /^\/vs\/[^/]+\/[^/]+$/, hub: "/comparer" },
  // /convertisseur/[pair] → /outils/convertisseur (hub outil)
  { pattern: /^\/convertisseur\/[^/]+$/, hub: "/outils/convertisseur" },
  // /auteur/[slug] → /a-propos (les auteurs sont listés dans À propos)
  { pattern: /^\/auteur\/[^/]+$/, hub: "/a-propos" },
  // /comparer/[a]/[b] → /comparer (au cas où, pattern similaire à /vs)
  { pattern: /^\/comparer\/[^/]+\/[^/]+$/, hub: "/comparer" },
  // /historique-prix/[crypto]/[annee] → /historique-prix (pas de page /historique-prix/[crypto])
  { pattern: /^\/historique-prix\/[^/]+\/[^/]+$/, hub: "/historique-prix" },
  // /lp/[campagne] → / (aucune page /lp)
  { pattern: /^\/lp\/[^/]+$/, hub: "/" },
  // /wizard/[parcours] → /outils (/wizard redirige vers /wizard/premier-achat)
  { pattern: /^\/wizard\/[^/]+$/, hub: "/outils" },
  // 05/10/2026 : la fiche Stacks est publiée sous « blockstack » (/cryptos/stacks redirige) → pas de détour par la redirection
  { pattern: /^\/cryptos\/stacks\/acheter-en-france$/, hub: "/cryptos/blockstack" },
  // /outils/calculateur-fiscalite/preview-pdf/[sessionId] → l'outil (pas de page preview-pdf)
  {
    pattern: /^\/outils\/calculateur-fiscalite\/preview-pdf\/[^/]+$/,
    hub: "/outils/calculateur-fiscalite",
  },
];

/**
 * Parent d'un pathname, en respectant les routes nested-only.
 * 1. Match dans NESTED_ONLY_HUBS (whitelist explicite).
 * 2. Sinon, « strip dernier segment » classique.
 * 3. Racine d'un segment → "/".
 */
export function computeParentPath(pathname: string): string {
  const clean = pathname.length > 1 ? pathname.replace(/\/+$/, "") : pathname;
  for (const { pattern, hub } of NESTED_ONLY_HUBS) {
    if (pattern.test(clean)) return hub;
  }
  const segments = clean.split("/").filter(Boolean);
  return segments.length > 1 ? "/" + segments.slice(0, -1).join("/") : "/";
}
