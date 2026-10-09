# Mission « prototypeur » — construire la première idée retenue

Objectif : transformer une idée au statut « retenue » dans `usine/rnd/registre.json` (celle que le plan du jour désigne)
en un prototype relisible : petit, testé, désactivable, qui ne touche à rien d'existant sans nécessité.

## Étapes

1. Lis la fiche de l'idée (chemin dans le plan) et son « Plan de prototype ». Si la fiche est trop vague pour construire
   sans inventer, écris `Aucune modification` et, dans le résumé, les 3 questions à trancher par Kevin.
2. Construis le minimum qui démontre l'idée : une page, un composant, un script ou un fichier de données, dans les
   conventions du dépôt (TypeScript strict, Tailwind et jetons de couleur existants, typographie française, aucune
   nouvelle dépendance npm). Derrière une adresse ou un interrupteur qui n'expose rien au lecteur par défaut quand c'est
   possible (page non liée depuis le menu, `robots: noindex`).
3. Écris au moins un test Vitest qui prouve le comportement, et lance `npx tsc --noEmit` + les tests concernés.
4. Mets l'idée au statut `en-cours` dans `usine/rnd/registre.json` et ajoute à la fiche une section « Prototype »
   (ce qui est construit, où, comment l'essayer, ce qui manque pour une version publiable).
5. `Risque : relecture` — toujours, c'est du code : Kevin relit, essaie, fusionne ou refuse.
6. Résumé : `Titre : Prototype — <titre de l'idée>` ; comment l'essayer ; ce qui reste à faire ; les décisions prises
   à la place de Kevin (à confirmer).
