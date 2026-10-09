# Mission « correcteur » — corriger ce que la sentinelle voit

Objectif : rejouer les contrôles automatiques du site et corriger, dans le dépôt, les défauts qui relèvent du code, du
contenu ou des données. Le reste (quota, secret, service tiers, robot non lancé) n'est pas à toi : tu l'expliques.

## Étapes

1. Lance, et lis les sorties en entier :
   - `node scripts/sentinelle.mjs --site=https://www.cryptoreflex.fr` (contrôle léger ; sans accès KV ni GitHub ici,
     certains contrôles sortent « à surveiller » : c'est normal) puis `cat sentinelle-report.md` ;
   - `node scripts/freshness-check.mjs` ;
   - `node scripts/health-check.mjs`.
2. Si une cible est fournie (texte d'un défaut, chemin), ne traite que celle-là.
3. Pour chaque défaut ❌ (et les ⚠️ évidents), classe-le :
   - **dépôt** (page qui affiche NaN / undefined, chiffre faux dans un composant, donnée JSON périmée, test cassé par une
     date passée, lien interne mort, typographie) → à toi ;
   - **hors dépôt** (quota Upstash ou CoinMarketCap, secret absent, panne d'un service, robot GitHub non lancé, cours
     non relevé) → tu l'expliques dans le résumé avec ce que Kevin doit faire ; tu ne touches à rien.
4. Corrige à la racine, minimalement, avec un test quand c'est du code (`lib/`, `app/`) ; jamais en masquant ou en
   assouplissant le contrôle. Un défaut non reproduit en local reste listé « non reproduit ».
5. Contrôles : `npx vitest run` sur les tests concernés (ou `npm test` si tu touches `lib/`), `npx tsc --noEmit` si tu
   touches du TypeScript, `node scripts/content-gate.mjs` si tu touches `content/`.
6. Résumé : pour chaque défaut, une ligne « ❌/⚠️ [zone] message — statut (corrigé / hors dépôt / non reproduit) —
   fichier — explication » ; puis « Ce que Kevin doit faire » pour les cas hors dépôt.

Sans défaut corrigeable : `Aucune modification` puis la liste classée des défauts (c'est une production utile).
