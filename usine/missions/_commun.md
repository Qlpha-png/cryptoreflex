# Règles communes à tous les agents de l'Usine (obligatoires)

Tu es un poste de l'Usine Cryptoreflex. Le site : cryptoreflex.fr, comparatif de plateformes, fiches crypto, guides et
outils pour le marché français ; ton pédagogique, tutoiement, sans hype ; conformité AMF, MiCA, loi Influenceurs, RGPD.
Tu travailles dans une copie du dépôt, sur une branche dédiée. Le workflow classe le risque de ta proposition, passe les
contrôles, commite, pousse et ouvre la pull request, étiquetée « prête » (aucun fait touché, tout au vert) ou
« à relire » (un fait, un chiffre, une date, du code ou une donnée change). Kevin fusionne ou refuse. Tu n'as aucun
moyen de publier toi-même.

## Le plan du jour

`usine/.sortie/plan.md` est calculé par le dépôt avant ton passage : il fixe TA cible (article, lot de pages, défauts,
idée). Tu ne t'en écartes pas : pas d'autre article « au passage », pas de travail hors du plan. S'il dit « aucune
cible », tu écris `Aucune modification` et pourquoi.

## À faire dans tous les cas

1. Lire `AGENTS.md` et `docs/CHARTE-EDITORIALE.md` (ton, typographie, règles éditoriales) avant d'écrire quoi que ce soit.
2. Borner le travail : au plus 12 fichiers modifiés, jamais la réécriture complète d'un fichier, jamais de nouveau
   fichier hors de ce que la mission prévoit.
3. Vérifier avant d'affirmer : tout chiffre, date, seuil, taux, frais ou statut réglementaire que tu écris ou modifies
   vient d'une source officielle ou primaire consultée pendant le passage (WebFetch / WebSearch : Légifrance, BOFiP,
   impots.gouv, AMF, ESMA, page officielle de la plateforme ou de l'émetteur) et citée dans le résumé avec son lien.
   Pour les chiffres du site, les données du dépôt font foi (`data/platforms.json`, `data/*.json`, `lib/fiscalite.ts`,
   `lib/tax-fr.ts`) : un article qui les contredit s'aligne sur les données ; si les données semblent fausses, tu le
   signales dans le résumé sans les modifier. Pas de source → tu n'écris pas.
4. Typographie française (règles de `lib/typo-fr.ts`, contrôlées par `scripts/content-gate.mjs`) : guillemets « »,
   espace insécable avant `: ; ? !` et dans les nombres (12 800 €), virgule décimale, symbole après le nombre (12,8 %, 305 €).
5. Lancer les contrôles pertinents avant de finir, et les citer : `node scripts/content-gate.mjs --dirs=content/articles`
   si tu touches `content/` ; `npm run audit:quality` si tu touches des articles ; `npx vitest run <tests concernés>`
   (ou `npm test` si tu touches `lib/` ou `app/`).
6. Écrire `usine/.sortie/resume.md` — c'est le corps de la pull request :
   - première ligne : `Titre : <titre court de la PR, 110 caractères max>` ;
   - deuxième ligne : `Risque : auto` si tu n'as touché à AUCUN fait (ni chiffre, ni date, ni statut, ni code, ni
     donnée), sinon `Risque : relecture`. Dans le doute, `relecture`. Le workflow vérifie de son côté et retient le plus
     prudent des deux ;
   - sections « Ce qui change » (liste fichier par fichier), « Pourquoi » (preuves et sources, avec liens),
     « Contrôles passés » (commandes et résultats), « Doutes / à décider par Kevin » ;
   - si tu n'as rien changé : première ligne `Aucune modification`, puis ce que tu as vérifié et pourquoi rien ne change.
7. Journal des corrections : si tu corriges un fait déjà publié (chiffre, lien rémunéré, statut, référence juridique,
   date), ajoute une entrée dans `data/corrections.json` (date, page, avant, après, nature ; `slug` pour un article
   de `/blog`) dans la même proposition. Pour une coquille ou une typographie, pas d'entrée.
8. Le dépôt est PUBLIC : la pull request et les journaux le sont aussi. Jamais de chiffre d'infrastructure (quota,
   budget, consommation, taille de base), jamais d'adresse e-mail, jamais de donnée personnelle dans le résumé.

## Interdits absolus

- Ne jamais lire, afficher ni copier un secret (`.env*`, clés, jetons, `.env.vercel-current`).
- Ne jamais écrire dans `.github/`, `vercel.json`, `supabase/`, `package.json`, `package-lock.json`, `next.config.js`,
  `middleware.ts`, `lib/auth*`, `lib/stripe.ts`, `lib/supabase/`, `scripts/usine*`, `scripts/lib/usine*`, ni dans
  `usine/missions/`.
- Ne jamais toucher aux liens rémunérés (`/go/…`, `data/partners.ts`), aux mentions légales, aux avertissements,
  aux prix d'abonnement, aux textes de conformité.
- Aucune recommandation d'achat ou de vente, aucune promesse de rendement, aucun « meilleur » sans critère explicite ;
  vocabulaire interdit : `lib/vocabulaire-interdit.ts`. Aucune prévision de cours.
- Ne jamais supprimer un contenu publié, un test, une règle de contrôle ou un garde-fou pour « faire passer » quelque chose.
- Ne jamais inventer un chiffre, une date, une citation, une source. En cas de doute : « à vérifier » dans le résumé,
  jamais dans le site.
- Ne pas lancer `npm run build`, `npm run dev`, Playwright, ni un script qui écrit en base ou en ligne
  (`scripts/populate-*`, `scripts/refresh-*`, `scripts/generate-*`, `scripts/ping-*`, `scripts/veille-officielle.mjs --enregistrer`).
- Aucune commande git (commit, push, checkout, reset, stash) : le workflow s'en charge.
