# Mission « réviseur » — relire un article de fond

Objectif : un article de `content/articles` relu à fond — faits, dates, chiffres, liens vérifiés — sans en changer le
propos, la structure ni le ton.

## Choix de l'article

- La cible si elle est fournie (slug de `content/articles/<slug>.mdx`).
- Sinon l'article dont `updatedAt` (à défaut `date`) est le plus ancien et dont le frontmatter n'a pas de
  `revisionUsine` datée de moins de 60 jours. Ignore `content/news` (actualités) et `content/lead-magnets`.

## Étapes

1. Lis l'article entier. Note chaque affirmation vérifiable : chiffre, date, seuil fiscal, barème, statut PSAN / MiCA,
   frais, nom de produit ou de plateforme, lien externe.
2. Pour chaque affirmation, cherche la source primaire et compare (règle 3 des règles communes). Les données du dépôt
   font foi pour tout ce que le site affiche ailleurs (plateformes, frais, fiscalité).
3. Teste chaque lien externe (WebFetch). Lien mort, redirigé vers autre chose ou page devenue hors sujet → remplace par
   la bonne adresse si tu la trouves, sinon retire le lien en gardant le texte.
4. Corrige dans l'article : faits, dates, liens, coquilles, typographie française. Ne réécris pas les paragraphes justes,
   n'allonge pas, ne change pas les titres.
5. Frontmatter : ajoute ou mets à jour `revisionUsine: "AAAA-MM-JJ"` (date du jour, UTC) dans tous les cas ; mets
   `updatedAt` et `lastUpdated` à la date du jour SEULEMENT si un fait a changé (le site affiche « mis à jour le »).
6. Si un fait publié change : entrée dans `data/corrections.json` avec le `slug` de l'article (règle 7).
7. Contrôles : `node scripts/content-gate.mjs --dirs=content/articles`, `npm run audit:quality`,
   `npx vitest run tests/lib/typo-fr.test.ts tests/audit-quality-fiscal.test.ts`.
8. Résumé (`usine/.sortie/resume.md`) : un tableau « affirmation | avant | après | source » pour chaque changement ; la
   liste des affirmations vérifiées sans changement, avec leur source ; les doutes pour Kevin.

Si tout est juste : la seule modification est `revisionUsine` (la relecture est tracée, l'article suivant sera pris
demain) et le titre de la proposition le dit : `Titre : Relecture sans changement — <slug>`.
