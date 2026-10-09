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
| `scripts/lib/usine-registre.mjs` | **Table unique** des postes (26 au 09/10/2026) : atelier, genre, moteur, workflow ou trace KV, horaire, cadence, délai maximal, ce que le poste produit. |
| `scripts/lib/usine-etat.mjs` | Logique pure : verdict d'un poste (à l'heure / en retard / en échec / en veille…), chaîne du jour (cron UTC → heures de Paris), production par jour, verdict global. |
| `lib/usine/etat.ts` | Lecteur d'état côté site : API GitHub (passages, pull requests), KV (traces, résumés de la sentinelle), fichiers du dépôt (actus, articles, analyses, corrections), budget CoinMarketCap. |
| `app/admin/usine/page.tsx` | L'application : un écran, relu toutes les 60 s. Réservé aux administrateurs (`ADMIN_EMAILS`), 404 sinon. |
| `app/admin/usine/actions.ts` | Bouton « Lancer maintenant » : demande à GitHub de lancer un workflow avec les entrées sûres du Gardien (jeton `GITHUB_GARDIEN_TOKEN`). |
| `scripts/usine.mjs` | La même vue en ligne de commande : `npm run usine` (`--json`, `--jours=30`, `--atelier=proteger`). Sortie 1 si l'usine est rouge. |
| `.github/workflows/usine-agent.yml` | Mécanique commune des agents IA (garde, Claude Code, garde-fou, tests, commit, PR). |
| `.github/workflows/usine-{reviseur,correcteur,seo,auditeur}.yml` | Un horaire par agent ; lancement manuel possible avec une cible. |
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
- **Améliorer** — les quatre agents IA. **Éteints par défaut** (voir ci-dessous).

Un poste est **à l'heure** quand son dernier passage a réussi depuis moins que son délai maximal (`ageMaxH`), **en
retard** au-delà, **en échec** si le dernier passage achevé a échoué, **en veille** (agent) si son dernier passage a été
sauté par l'interrupteur. Le verdict global est **rouge** dès qu'un robot est en échec ou que la sentinelle voit un défaut,
**orange** sur un retard, **vert** sinon. Les agents en veille ne pèsent pas.

## Les agents IA : comment ça marche, combien ça coûte, comment l'allumer

### Mécanique (un passage)

1. **Garde** : l'horaire ne lance l'agent que si la variable de dépôt `USINE_IA` vaut `on` (sinon tout le passage est
   « sauté », zéro coût). Plafond quotidien tous agents confondus : `USINE_IA_MAX_PAR_JOUR` (4 par défaut). Le secret
   `ANTHROPIC_API_KEY` doit exister (c'est déjà celui de la publication du jour).
2. **Branche** `usine/<mission>-<date>-<n°>` depuis `main`. L'agent Claude Code lit `usine/missions/_commun.md` puis sa
   mission, et travaille avec des outils **bornés** : lecture, édition, recherche web, tests, scripts de contrôle.
   Ni `git`, ni `gh`, ni build, ni script qui écrit en base.
3. Le **workflow** (pas l'agent) rejoue le garde-fou des contenus (`scripts/content-gate.mjs`) et les tests unitaires,
   commite, pousse la branche et ouvre la pull request **« Usine IA — … »** avec `usine/.sortie/resume.md` comme corps
   (titre, ce qui change, pourquoi, sources, contrôles, doutes). La sortie de l'agent est jointe au passage (14 jours).
4. **Rien n'est écrit sur `main`.** Tu relis, tu fusionnes ou tu refuses. Un agent en échec est « à surveiller » pour la
   sentinelle (jamais un défaut du site, jamais rejoué automatiquement).

### Les quatre missions

| Agent | Quand (UTC) | Ce qu'il propose |
|---|---|---|
| Réviseur d'articles | lundi → samedi, 05 h 20 | l'article de fond le plus ancien relu : faits, dates, liens vérifiés avec sources ; `revisionUsine` dans le frontmatter ; journal des corrections tenu |
| Correcteur | chaque jour, 06 h 15 (après la sentinelle complète) | rejoue le contrôle léger, corrige dans le dépôt ce qui peut l'être, classe le reste (hors dépôt / non reproduit) |
| SEO | mardi, 06 h 00 | titres, descriptions, liens internes, structure de 10 pages au plus, sans toucher aux faits |
| Auditeur | dimanche, 06 h 00 | `docs/usine/rapports/AAAA-MM-JJ-audit.md` (tsc, tests, qualité, `npm audit`, fraîcheur, santé, actus relues) + correctifs sans risque |

Lancement manuel à tout moment : GitHub → Actions → « Usine IA — … » → Run workflow (cible facultative : slug, chemin,
texte d'un défaut), ou le bouton « Lancer maintenant » de `/admin/usine`.

### Allumer

Sur GitHub : **Settings → Secrets and variables → Actions → Variables** :

| Variable | Valeur | Effet |
|---|---|---|
| `USINE_IA` | `on` | les horaires lancent les agents (absente ou autre valeur : en veille) |
| `USINE_IA_MAX_PAR_JOUR` | `4` (défaut) | plafond de passages d'agents achevés par jour UTC |
| `USINE_IA_MODELE` | `claude-opus-5-5` (défaut) | modèle Claude des agents (`claude-sonnet-5-5` pour un coût moindre) |

Le workflow utilise l'action officielle `anthropics/claude-code-action@v1` avec le jeton GitHub du passage. Si l'action
exige l'application GitHub « Claude » (message d'erreur sur le jeton), installe-la sur le dépôt :
https://github.com/apps/claude/installations/select_target — elle ne change rien au reste.

### Ordre de grandeur du coût

Un passage lit les règles, quelques fichiers, fait des recherches web et des tests : de l'ordre de **0,5 à 3 €**
(`claude-opus-5-5`, 4 $ / 20 $ par million de jetons ; moitié moins en Sonnet). Avec les quatre horaires et le plafond
de 4 par jour : **au plus ~8 passages par semaine**, soit grosso modo 5 à 25 € par mois. Le plafond quotidien et
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
| `GITHUB_GARDIEN_TOKEN` | Vercel | déjà utilisé par le Gardien ; sert aussi à lire les passages (5 000/h) et à lancer un poste depuis le tableau de bord. Absent : lecture anonyme (60/h), bouton « Lancer » désactivé. |
| `KV_REST_API_URL` / `KV_REST_API_TOKEN` | Vercel, GitHub | traces des tâches Vercel et résumés de la sentinelle. |
| `CMC_API_KEY` | Vercel | budget CoinMarketCap en direct. |
| `ANTHROPIC_API_KEY` | GitHub (secret) | les agents IA (déjà là pour la publication du jour). |
