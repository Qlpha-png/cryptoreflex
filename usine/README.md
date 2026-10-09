# L'Usine Cryptoreflex

> Kev, 09/10/2026 : « une vraie usine autonome d'agents pour le site, qui actualise, entretient, protège, améliore… un
> système avec une application où je vois comment ça avance et la production. »

L'Usine est la couche qui unifie tout ce qui tourne sans toi sur cryptoreflex.fr : les **robots** (scripts déterministes
lancés par l'horloge Vercel et GitHub Actions), les **gardes-fous** (règles intégrées à la chaîne) et les **agents IA**
(missions Claude Code qui proposent des améliorations en pull request). Et son **application** : `/admin/usine`.

```
                          ┌──────────────────────────────────────────────────────────┐
  Horloge Vercel  ──────▶ │  GARDIEN  (/api/cron/gardien/<robot> → GitHub dispatch)  │
  cron-job.org   ──────▶  └──────────────────────────────────────────────────────────┘
                                   │                       │                     │
                        ┌──────────▼─────────┐  ┌──────────▼─────────┐  ┌────────▼──────────┐
                        │ ACTUALISER         │  │ ENTRETENIR         │  │ PROTÉGER          │
                        │ publication du jour│  │ sentinelle (h+17)  │  │ veille officielle │
                        │ article de semaine │  │ santé, fraîcheur   │  │ garde-fou contenus│
                        │ cours R1/R2/R3     │  │ audit navigateur   │  │ frein du mois     │
                        │ orchestrateur, FOMC│  │ alertes, rappels   │  │ 51 familles       │
                        └──────────┬─────────┘  └──────────┬─────────┘  └────────┬──────────┘
                                   │                       │                     │
                                   ▼                       ▼                     ▼
                        main (commits des robots)   KV (traces, résumés)   tickets privés
                                   │                       │
                        ┌──────────▼───────────────────────▼─────────┐     ┌──────────────────────┐
                        │ AMÉLIORER (agents IA, interrupteur USINE_IA)│ ──▶ │ pull requests        │ ──▶ Kevin relit
                        │ réviseur · correcteur · SEO · auditeur      │     │ « Usine IA — … »     │     et fusionne
                        └─────────────────────────────────────────────┘     └──────────────────────┘
                                   │
                        ┌──────────▼──────────────────────────────────────────────────────────────┐
                        │ /admin/usine — salle de contrôle (verdict, chaîne du jour, ateliers,     │
                        │ production 14 j, sentinelle, budget, PR à relire, journal) · npm run usine│
                        └─────────────────────────────────────────────────────────────────────────┘
```

## Les fichiers

| Fichier | Rôle |
|---|---|
| `scripts/lib/usine-registre.mjs` | **Table unique** des postes (30 au 09/10/2026, 5 ateliers) : atelier, genre, moteur, workflow ou trace KV, horaire, cadence, délai maximal, ce que le poste produit. |
| `scripts/lib/usine-etat.mjs` | Logique pure : verdict d'un poste (à l'heure / en retard / en échec / en veille…), chaîne du jour (cron UTC → heures de Paris), production par jour, verdict global. |
| `lib/usine/etat.ts` | Lecteur d'état côté site : API GitHub (passages, pull requests), KV (traces, résumés de la sentinelle), fichiers du dépôt (actus, articles, analyses, corrections), budget CoinMarketCap. |
| `app/admin/usine/page.tsx` | L'application : un écran, relu toutes les 60 s. Réservé aux administrateurs (`ADMIN_EMAILS`), 404 sinon. |
| `app/admin/usine/actions.ts` | Bouton « Lancer maintenant » : demande à GitHub de lancer un workflow avec les entrées sûres du Gardien (jeton `GITHUB_GARDIEN_TOKEN`). |
| `scripts/usine.mjs` | La même vue en ligne de commande : `npm run usine` (`--json`, `--jours=30`, `--atelier=proteger`). Sortie 1 si l'usine est rouge. |
| `scripts/lib/usine-plan.mjs`, `scripts/usine-plan.mjs` | Plan du jour déterministe : cible de chaque mission, écrite dans `usine/.sortie/plan.md` avant l'agent ; registre R&D (validation, bilan). |
| `scripts/lib/usine-risque.mjs`, `scripts/usine-risque.mjs` | Classement du risque d'une proposition : « prête » (aucun fait touché) ou « à relire ». |
| `scripts/lib/usine-garde-fou.mjs`, `scripts/usine-garde-fou.mjs`, `.github/workflows/usine-garde-fou.yml` | Garde-fou de dégradation : recommande (et, en un clic, exécute) le retour arrière d'une fusion de l'Usine suivie d'un défaut de contenu. |
| `app/admin/usine/app.webmanifest/route.ts`, `components/admin/usine/UsineChrome.tsx` | L'application installable (fenêtre autonome). |
| `usine/rnd/` | Le laboratoire R&D : registre des idées et fiches. |
| `tests/lib/usine-autonomie.test.ts` | Plan, classement du risque, décision de retour arrière, workflows de l'autonomie. |
| `.github/workflows/usine-agent.yml` | Mécanique commune des agents IA (garde, Claude Code, garde-fou, tests, commit, PR). |
| `.github/workflows/usine-{reviseur,correcteur,seo,auditeur,chercheur,prototypeur}.yml` | Un horaire par agent ; lancement manuel possible avec une cible. |
| `usine/missions/_commun.md` + `<mission>.md` | Les consignes lues par l'agent : règles communes obligatoires, puis la mission. Modifie-les pour changer le comportement d'un agent, sans toucher aux workflows. |
| `docs/usine/rapports/` | Rapports datés de l'agent auditeur. |
| `tests/lib/usine.test.ts` | Cohérence registre ↔ Gardien ↔ `vercel.json` ↔ workflows ; logique pure ; garde-fous des workflows IA. |

## Les quatre ateliers

- **Actualiser** — publication du jour (actus + 5 analyses techniques), article de la semaine, cours (R1 toutes les 10 min,
  R2 en base 3 fois par jour, R3 détails des fiches 4 fois par jour), orchestrateur du matin, calendrier FOMC.
- **Entretenir** — sentinelle (légère toutes les heures, complète la nuit), contrôle de santé, contrôle de fraîcheur,
  audit navigateur de nuit, alertes de prix, rappels du jeu, série d'e-mails, tests de bout en bout.
- **Protéger** — veille officielle (Légifrance, BOFiP, ESMA, frais), Gardien, garde-fou des contenus, frein du mois,
  fraîcheur des 51 familles, réparations sans IA.
- **Améliorer** — les quatre agents IA de maintenance, le classement du risque, le garde-fou de dégradation.
- **Recherche & développement** — l'agent chercheur et l'agent prototypeur (voir « Le laboratoire R&D »).

Un poste est **à l'heure** quand son dernier passage a réussi depuis moins que son délai maximal (`ageMaxH`), **en
retard** au-delà, **en échec** si le dernier passage achevé a échoué, **en veille** (agent) si son dernier passage a été
sauté par l'interrupteur. Le verdict global est **rouge** dès qu'un robot est en échec ou que la sentinelle voit un défaut,
**orange** sur un retard, **vert** sinon. Les agents en veille ne pèsent pas.

## L'application sur le bureau

Depuis Chrome ou Edge, connecté en administrateur, ouvrir `/admin/usine` puis menu → **Installer l'application**
(manifeste `/admin/usine/app.webmanifest`). L'Usine s'ouvre dans sa propre fenêtre, sans l'en-tête ni le pied du
site, et se relit toutes les 60 secondes. La même vue existe en terminal : `npm run usine`.

## Le processus (ligne de production) et la ligne de gestion

1. **Plan du jour** — calculé par le dépôt, jamais par l'agent (`scripts/usine-plan.mjs`, `scripts/lib/usine-plan.mjs`) :
   l'article le plus ancien sans relecture depuis 60 jours, le lot SEO (10 pages au plus, hors de 110-160 caractères de
   description, titre > 65, sans lien vers un hub), les défauts de la sentinelle qui relèvent du dépôt, l'idée R&D retenue.
   Le tableau de bord affiche ce plan dans « À faire ».
2. **Travail** — l'agent Claude Code lit les règles communes, sa mission et le plan, travaille avec des outils bornés
   (aucune commande git). « Agents au travail, en direct » montre l'étape courante de chaque passage.
3. **Classement du risque** (`scripts/lib/usine-risque.mjs`) — « prête » seulement si la proposition ne touche aucun
   fait : fichiers de la liste blanche (articles, actus, rapports, fiches R&D), aucun chiffre, date, €, % ni lien
   externe ajouté dans un corps d'article, frontmatter limité aux champs sans fait, pas de journal des corrections.
   Au moindre doute : « à relire ». L'agent déclare aussi `Risque : auto | relecture` ; le plus prudent gagne.
4. **Contrôles** — garde-fou des contenus, audit de qualité, types, tests unitaires ; puis le **build complet** du site
   pour une proposition « prête ». Un contrôle rouge rétrograde en « à relire ».
5. **Proposition** — le workflow ouvre la pull request « Usine IA — [prête] … » ou « [à relire] … », avec le résumé de
   l'agent, le classement et les contrôles. **Tu fusionnes** : bouton « Fusionner » dans l'application (jeton du
   Gardien avec le droit « Pull requests » en écriture) ou sur GitHub.
6. **Déploiement et vérification** — Vercel déploie `main`, la sentinelle contrôle la production juste après. Si elle
   voit un défaut de contenu alors qu'une fusion de l'Usine date de moins de 6 h, le **garde-fou de dégradation**
   (`usine-garde-fou.yml`, `scripts/lib/usine-garde-fou.mjs`) recommande un retour arrière ; un clic (« Retour
   arrière » dans l'application, ou le workflow à la main, simulation décochée) annule la fusion et redéploie l'état
   précédent. Un défaut d'infrastructure (quota, robot, prix) ne déclenche rien.

## Le laboratoire R&D

Voir `usine/rnd/README.md`. L'agent **chercheur** (jeudi) écrit 1 à 3 fiches d'idées sourcées (lecteurs,
réglementation, concurrents, outils, qualité) dans `usine/rnd/idees/` et les inscrit au registre ; la proposition
est « prête » (des documents, rien sur le site). Tu passes une idée en `retenue` dans `usine/rnd/registre.json` ;
l'agent **prototypeur** (mercredi, ou tout de suite depuis l'application) la construit en pull request « à relire ».

## Les agents IA : comment ça marche, combien ça coûte, comment les arrêter

### Mécanique (un passage)

1. **Garde** : plafond quotidien tous agents confondus `USINE_IA_MAX_PAR_JOUR` (4 par défaut) ; le secret
   `ANTHROPIC_API_KEY` doit exister (c'est déjà celui de la publication du jour). Les horaires tournent par défaut ;
   la variable de dépôt `USINE_IA` = `off` les coupe (les passages sont « sautés », zéro coût).
2. **Plan du jour** écrit par le dépôt, puis **branche** `usine/<mission>-<date>-<n°>` depuis `main`. L'agent Claude
   Code lit `usine/missions/_commun.md`, sa mission et le plan, et travaille avec des outils **bornés** : lecture,
   édition, recherche web, tests, scripts de contrôle. Ni `git`, ni `gh`, ni build, ni script qui écrit en base.
3. Le **workflow** (pas l'agent) classe le risque, passe les contrôles (et le build pour une proposition sans fait),
   commite, pousse la branche et ouvre la pull request **« Usine IA — [prête|à relire] … »** avec
   `usine/.sortie/resume.md` comme corps. La sortie de l'agent est jointe au passage (14 jours).
4. **Rien n'est écrit sur `main` par un agent.** Tu fusionnes (un clic) ou tu refuses. Un agent en échec est « à
   surveiller » pour la sentinelle (jamais un défaut du site, jamais rejoué automatiquement).

### Les quatre missions

| Agent | Quand (UTC) | Ce qu'il propose |
|---|---|---|
| Réviseur d'articles | lundi → samedi, 05 h 20 | l'article de fond le plus ancien relu : faits, dates, liens vérifiés avec sources ; `revisionUsine` dans le frontmatter ; journal des corrections tenu |
| Correcteur | chaque jour, 06 h 15 (après la sentinelle complète) | rejoue le contrôle léger, corrige dans le dépôt ce qui peut l'être, classe le reste (hors dépôt / non reproduit) |
| SEO | mardi, 06 h 00 | titres, descriptions, liens internes, structure de 10 pages au plus, sans toucher aux faits |
| Auditeur | dimanche, 06 h 00 | `docs/usine/rapports/AAAA-MM-JJ-audit.md` (tsc, tests, qualité, `npm audit`, fraîcheur, santé, actus relues) + correctifs sans risque |
| Chercheur R&D | jeudi, 07 h 00 | 1 à 3 fiches d'idées sourcées dans `usine/rnd/idees/` + registre |
| Prototypeur R&D | mercredi, 07 h 00 | prototype testé de la première idée retenue, toujours « à relire » |

Lancement manuel à tout moment : GitHub → Actions → « Usine IA — … » → Run workflow (cible facultative : slug, chemin,
texte d'un défaut), ou le bouton « Lancer maintenant » de `/admin/usine`.

### Arrêter, régler

Sur GitHub : **Settings → Secrets and variables → Actions → Variables** :

| Variable | Valeur | Effet |
|---|---|---|
| `USINE_IA` | `off` | coupe les horaires de tous les agents (absente : ils tournent) ; un lancement manuel marche toujours |
| `USINE_IA_MAX_PAR_JOUR` | `4` (défaut) | plafond de passages d'agents achevés par jour UTC |
| `USINE_IA_MODELE` | `claude-opus-5-5` (défaut) | modèle Claude des agents (`claude-sonnet-5-5` pour un coût moindre) |

Le workflow utilise l'action officielle `anthropics/claude-code-action@v1` avec le jeton GitHub du passage. Si l'action
exige l'application GitHub « Claude » (message d'erreur sur le jeton), installe-la sur le dépôt :
https://github.com/apps/claude/installations/select_target — elle ne change rien au reste.

### Ordre de grandeur du coût

Un passage lit les règles, quelques fichiers, fait des recherches web et des tests : de l'ordre de **0,5 à 3 €**
(`claude-opus-5-5`, 4 $ / 20 $ par million de jetons ; moitié moins en Sonnet). Avec les six horaires et le plafond
de 4 par jour : **au plus ~10 passages par semaine** (plus le build complet pour les propositions « prêtes »), soit
grosso modo 5 à 30 € par mois. Le plafond quotidien et
`--max-turns 80` bornent le pire cas ; la sentinelle complète compte déjà les exécutions GitHub du mois.

## Le tableau de bord `/admin/usine`

- **Verdict** (vert / orange / rouge) + le dernier passage de la sentinelle (défauts, à surveiller, réussis).
- **Indicateurs** : actus publiées 7 j, analyses calculées 7 j, articles 30 j, postes à l'heure, PR d'agents ouvertes,
  budget CoinMarketCap.
- **Chaîne de production du jour** : chaque poste à horaire, à l'heure de Paris, fait / manqué / attendu / en veille,
  avec le lien du passage.
- **Les 4 ateliers**, poste par poste : statut, raison, ce que le poste produit, dernier passage, bouton « Lancer ».
- **Production des 14 derniers jours** : actus, analyses, articles, corrections, PR IA fusionnées, jour par jour.
- **Protection** : défauts et points à surveiller de la sentinelle, état des 51 familles, taille de la base,
  consommation du mois (CoinMarketCap, Supabase, GitHub Actions…), frein du mois.
- **Agents IA** : PR à relire, PR fusionnées récemment, missions.
- **Journal** des 40 derniers passages GitHub.

Sources et leur état sont affichés en haut de page (GitHub, KV, CoinMarketCap, jeton du Gardien). Une source absente
donne « non mesuré », jamais un chiffre supposé.

### Ce que la sentinelle écrit pour l'Usine

À chaque passage, `scripts/sentinelle.mjs` écrit dans le KV `usine:sentinelle:dernier` (3 jours) — comptes, défauts,
points à surveiller, réparations décidées — et, la nuit, `usine:sentinelle:complet` (8 jours) avec l'état des 51
familles, la consommation du mois et la taille de la base. Mêmes textes que le ticket privé : sans secret ni donnée
personnelle. Une commande `SET` par passage.

## Ajouter un poste

1. Une entrée dans `scripts/lib/usine-registre.mjs` (atelier, genre, `workflow` ou `traceKv`, `horaire`, `ageMaxH`,
   `produit`, `description`). Pour un robot lancé par le Gardien : `gardien: ["<clé>"]` (la clé de `lib/gardien.ts`).
2. `npx vitest run tests/lib/usine.test.ts` : le test vérifie que le workflow existe, que la clé du Gardien est connue,
   que l'horaire est un cron valide, que chaque tâche de `vercel.json` a son poste.
3. Rien d'autre : le tableau de bord et la ligne de commande lisent le registre.

## Ajouter une mission d'agent

1. `usine/missions/<id>.md` (objectif, choix de la cible, étapes, contrôles, résumé attendu).
2. Un workflow `.github/workflows/usine-<id>.yml` copié d'un existant (horaire, `mission: <id>`).
3. L'identifiant dans `MISSIONS` et un poste `usine-<id>` dans le registre ; l'option dans `workflow_dispatch.inputs.mission`
   de `usine-agent.yml`.
4. `npx vitest run tests/lib/usine.test.ts`.

## Variables d'environnement (site)

| Variable | Où | Rôle |
|---|---|---|
| `GITHUB_GARDIEN_TOKEN` | Vercel | déjà utilisé par le Gardien ; sert aussi à lire les passages (5 000/h), à lancer un poste, à fusionner une proposition (droit « Pull requests » en écriture) et à lancer le retour arrière depuis l'application. Absent : lecture anonyme (60/h), boutons désactivés. |
| `KV_REST_API_URL` / `KV_REST_API_TOKEN` | Vercel, GitHub | traces des tâches Vercel et résumés de la sentinelle. |
| `CMC_API_KEY` | Vercel | budget CoinMarketCap en direct. |
| `ANTHROPIC_API_KEY` | GitHub (secret) | les agents IA (déjà là pour la publication du jour). |
