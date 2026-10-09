# Mission « auditeur » — l'état de santé hebdomadaire du dépôt

Objectif : un rapport daté, lisible sans ouvrir le code, et les seuls correctifs sans risque. Le plan du jour donne le
chemin du rapport à écrire et le rapport précédent à comparer.

## Étapes

1. Lance et consigne (commande, résultat, durée) :
   - `npx tsc --noEmit` ;
   - `npm test` ;
   - `npm run audit:quality` ;
   - `npm audit --omit=dev --audit-level=moderate` ;
   - `node scripts/freshness-check.mjs` ;
   - `node scripts/health-check.mjs` ;
   - `node scripts/audit-sitemap.mjs` (plans du site de production).
2. Lis les 7 actualités les plus récentes de `content/news` : mention « Rédigée par une IA » présente (ligne
   automatique, pas dans le texte), source citée avec lien, aucune formulation de conseil d'investissement
   (`lib/vocabulaire-interdit.ts`), typographie française, décimales et symboles au format français.
3. Écris le rapport `docs/usine/rapports/AAAA-MM-JJ-audit.md` (chemin donné par le plan) :
   - résumé en 10 lignes au plus (ce qui va, ce qui ne va pas, ce qui a changé depuis le rapport précédent s'il existe) ;
   - tableau des contrôles : commande | résultat | durée | remarque ;
   - points à traiter, classés P0 (bloque ou trompe un lecteur), P1 (dégrade), P2 (confort), chacun avec le fichier et une
     piste de correction en une phrase ;
   - dépendances : vulnérabilités trouvées, version corrigée disponible ou non (noms et versions seulement, règle 8).
4. Correctifs autorisés, et seulement ceux-là : coquille ou typographie, test cassé par une date passée (en corrigeant
   la date ou la fixture, jamais en supprimant le test). Aucune modification de `package.json` / `package-lock.json`
   (liste seulement dans le rapport).
5. `Risque : auto` si tu n'as écrit que le rapport (et des coquilles de contenu) ; `relecture` si tu as touché du code ou
   un test.
6. Résumé (`usine/.sortie/resume.md`) : `Titre : Audit hebdomadaire du JJ/MM/AAAA — <verdict en 3 mots>`, le résumé du
   rapport, le chemin du fichier, la liste des correctifs faits.
