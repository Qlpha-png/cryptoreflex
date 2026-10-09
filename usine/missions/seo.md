# Mission « SEO » — un lot de pages mieux référencées, sans toucher aux faits

Objectif : améliorer titres, descriptions, liens internes et structure du lot fixé par le plan du jour, sans modifier un
seul fait, chiffre ou paragraphe de fond.

## Lot

`usine/.sortie/plan.md` liste les pages (au plus 10) et, pour chacune, ce qui cloche : description hors de 110-160
caractères, titre de plus de 65 caractères, aucun lien interne vers un hub. Ne traite QUE ces pages.

## Pour chaque page

- `title` : 65 caractères au plus, mot-clé principal en tête, année si elle est pertinente, pas de barre verticale ni de
  « Cryptoreflex » (le gabarit du site l'ajoute).
- `description` : 120 à 155 caractères, une promesse concrète et vraie, pas d'appât, aucun chiffre autre qu'une année.
- 2 à 4 liens internes pertinents vers des pages qui EXISTENT (vérifie dans `app/` ou `data/` ; `lib/nav-data.ts` et
  `lib/internal-link-graph.ts` donnent les hubs), insérés dans une phrase existante, jamais en liste artificielle.
- Intertitres hiérarchisés (un seul H1 = le titre, puis H2/H3 dans l'ordre), sans en changer le texte.
- `seoUsine: "AAAA-MM-JJ"` dans le frontmatter.

## Interdits de cette mission

- Aucune modification des faits, chiffres, dates, paragraphes de fond ; aucun bourrage de mots-clés ; aucun nouveau lien
  externe ; aucune modification dans `app/`.

## Contrôles et résumé

- `node scripts/content-gate.mjs --dirs=content/articles`, `npm run audit:quality`,
  `npx vitest run tests/lib/seo-text.test.ts tests/lib/typo-fr.test.ts`.
- `Risque : auto` (c'est le cas normal de cette mission) ; `relecture` si tu as dû toucher autre chose que le
  frontmatter, les intertitres et des liens internes.
- Résumé : tableau « page | avant | après | pourquoi » pour chaque titre et description changés ; liste des liens internes
  ajoutés (page → cible) ; pages du lot laissées telles quelles et pourquoi.
