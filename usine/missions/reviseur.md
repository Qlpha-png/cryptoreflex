# Mission « réviseur » — relire un article de fond

Objectif : l'article désigné par le plan du jour relu à fond — faits, dates, chiffres, liens vérifiés — sans en changer
le propos, la structure ni le ton.

## Étapes

1. Lis `usine/.sortie/plan.md` : il nomme l'article (`content/articles/<slug>.mdx`) et liste ses liens externes.
   Ignore `content/news` et `content/lead-magnets`.
2. Lis l'article entier. Note chaque affirmation vérifiable : chiffre, date, seuil fiscal, barème, statut PSAN / MiCA,
   frais, nom de produit ou de plateforme, lien externe.
3. Pour chaque affirmation, cherche la source primaire et compare (règle 3 des règles communes). Les données du dépôt
   font foi pour tout ce que le site affiche ailleurs (plateformes, frais, fiscalité).
4. Teste chaque lien externe (WebFetch). Lien mort, redirigé vers autre chose ou page devenue hors sujet → remplace par
   la bonne adresse si tu la trouves, sinon retire le lien en gardant le texte.
5. Corrige dans l'article : faits, dates, liens, coquilles, typographie française. Ne réécris pas les paragraphes justes,
   n'allonge pas, ne change pas les titres.
6. Frontmatter : ajoute ou mets à jour `revisionUsine: "AAAA-MM-JJ"` (date du jour, UTC) dans tous les cas ; mets
   `updatedAt` et `lastUpdated` à la date du jour SEULEMENT si un fait a changé (le site affiche « mis à jour le »).
7. Si un fait publié change : entrée dans `data/corrections.json` avec le `slug` de l'article (règle 7) et
   `Risque : relecture`. Si tu n'as touché qu'à des coquilles, à la typographie, à des liens morts ou au frontmatter de
   relecture : `Risque : auto`.
8. Contrôles : `node scripts/content-gate.mjs --dirs=content/articles`, `npm run audit:quality`,
   `npx vitest run tests/lib/typo-fr.test.ts tests/audit-quality-fiscal.test.ts`.
9. Résumé (`usine/.sortie/resume.md`) : un tableau « affirmation | avant | après | source » pour chaque changement ; la
   liste des affirmations vérifiées sans changement, avec leur source ; les doutes pour Kevin.

Si tout est juste : la seule modification est `revisionUsine` (la relecture est tracée, l'article suivant sera pris
demain), `Risque : auto`, et le titre le dit : `Titre : Relecture sans changement — <slug>`.
