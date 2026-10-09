# Mission « correcteur » — corriger ce que la sentinelle voit

Objectif : corriger, dans le dépôt, les défauts de la sentinelle qui relèvent du code, du contenu ou des données. Le plan
du jour (`usine/.sortie/plan.md`) a déjà rejoué le contrôle léger et ne te transmet QUE les défauts qui peuvent venir du
dépôt (les défauts d'infrastructure — quota, robots, services tiers — sont traités ailleurs et ne sont pas ton affaire).

## Étapes

1. Lis le plan. Chaque défaut listé « à corriger » est à toi ; chaque défaut « à classer » est à juger : dépôt ou non.
   Si le plan dit « rien à corriger », écris `Aucune modification`.
2. Reproduis localement quand c'est possible : `node scripts/freshness-check.mjs`, `node scripts/health-check.mjs`,
   `npm run audit:quality`, les tests concernés. Un défaut non reproduit reste listé « non reproduit ».
3. Corrige à la racine, minimalement, avec un test quand c'est du code (`lib/`, `app/`) ; jamais en masquant ou en
   assouplissant le contrôle.
4. Contrôles : `npx vitest run` sur les tests concernés (ou `npm test` si tu touches `lib/`), `npx tsc --noEmit` si tu
   touches du TypeScript, `node scripts/content-gate.mjs --dirs=content/articles` si tu touches `content/`.
5. `Risque : relecture` dès que tu touches du code, une donnée ou un fait ; `Risque : auto` seulement pour une coquille
   ou une typographie dans un contenu.
6. Résumé : pour chaque défaut du plan, une ligne « [zone] message — statut (corrigé / hors dépôt / non reproduit) —
   fichier — explication ». Aucun chiffre d'infrastructure dans le résumé (règle 8).
