/**
 * scripts/lib/usine-registre.mjs — L'USINE : registre unique des postes de production de cryptoreflex.fr (09/10/2026).
 *
 * Demande de Kev : « une vraie usine autonome d'agents pour le site, qui actualise, entretient, protège, améliore,
 * avec une application où je vois comment ça avance et la production ».
 *
 * Un POSTE = un robot (script déterministe), un agent IA (mission relue par Kevin en pull request) ou un garde-fou
 * (règle intégrée à la chaîne). Chaque poste appartient à un ATELIER : Actualiser, Entretenir, Protéger, Améliorer.
 * Ce fichier est la table unique lue par :
 *  - le tableau de bord /admin/usine (lib/usine/etat.ts) ;
 *  - la ligne de commande `npm run usine` (scripts/usine.mjs) ;
 *  - les tests tests/lib/usine.test.ts (cohérence avec lib/gardien.ts, vercel.json et .github/workflows/).
 * Zéro dépendance (Node 20 et bundle Next). Aucun secret, aucune adresse privée.
 *
 * Champs d'un poste :
 *  - id            : clé stable (minuscules, chiffres, tirets) ;
 *  - nom           : libellé affiché ;
 *  - atelier       : actualiser | entretenir | proteger | ameliorer ;
 *  - genre         : robot | agent-ia | garde-fou ;
 *  - moteur        : github (workflow GitHub Actions) | vercel (tâche Vercel Cron) | integre (règle dans la chaîne) ;
 *  - workflow      : fichier .github/workflows/<workflow> (lecture des passages par l'API GitHub) ;
 *  - gardien       : clés de lib/gardien.ts (l'horloge Vercel lance ce workflow) ;
 *  - traceKv       : clé KV « dernier passage + résultat » (lib/cron-trace.ts et tâches Vercel) ;
 *  - lecture       : façon de juger un garde-fou (frein-r1, sentinelle-complet, gardien-traces) ;
 *  - horaire       : cron UTC à 5 champs, pour la chaîne du jour (facultatif) ;
 *  - cadence       : texte lisible ; declencheur : qui lance le poste ;
 *  - ageMaxH       : âge maximal du dernier passage réussi (au-delà : « en retard ») ;
 *  - produit       : ce que le poste fabrique ; description : à quoi il sert ;
 *  - mission       : nom du fichier usine/missions/<mission>.md (agents IA) ;
 *  - echecSignifie : libellé d'un passage en échec quand il veut dire autre chose qu'une panne (veille : écart détecté) ;
 *  - lancable      : faux pour un poste qu'on ne lance pas à la main depuis le tableau de bord.
 */

export const ATELIERS = [
  {
    id: "actualiser",
    nom: "Actualiser",
    description: "Ce qui alimente le site chaque jour : actualités, analyses techniques, cours, détails des fiches, agenda.",
  },
  {
    id: "entretenir",
    nom: "Entretenir",
    description: "Ce qui vérifie que tout tourne : sentinelle, contrôles de santé et de fraîcheur, audit navigateur, alertes.",
  },
  {
    id: "proteger",
    nom: "Protéger",
    description: "Ce qui empêche une erreur de sortir : veille des sources officielles, garde-fous de publication, budgets, fraîcheur des 51 familles.",
  },
  {
    id: "ameliorer",
    nom: "Améliorer",
    description: "Les agents IA : chaque passage suit un plan du jour calculé par le dépôt et finit par une pull request étiquetée « prête » (aucun fait touché, contrôles et build au vert) ou « à relire ». Kevin fusionne ; rien ne part en ligne sans lui.",
  },
  {
    id: "rnd",
    nom: "Recherche & développement",
    description: "Le laboratoire : un agent chercheur propose chaque semaine des idées argumentées et sourcées (usine/rnd), Kevin retient ou écarte, un agent prototypeur construit l'idée retenue en pull request relue.",
  },
];

/** Missions des agents IA (fichiers usine/missions/<id>.md, workflows .github/workflows/usine-<id>.yml). */
export const MISSIONS = [
  { id: "reviseur", nom: "Réviseur d'articles", resume: "relit l'article le plus ancien : faits, dates, liens, sources ; corrige et journalise" },
  { id: "correcteur", nom: "Correcteur de la sentinelle", resume: "rejoue le contrôle léger de la sentinelle et corrige dans le code ce qui peut l'être" },
  { id: "seo", nom: "Optimiseur SEO", resume: "titres, descriptions, liens internes et données structurées d'un lot de pages" },
  { id: "auditeur", nom: "Auditeur hebdomadaire", resume: "lint, tests, audit de qualité, dépendances vulnérables ; rapport daté dans docs/usine/rapports" },
  { id: "chercheur", nom: "Chercheur R&D", resume: "veille lecteurs, réglementation, concurrents, outils ; 1 à 3 fiches d'idées sourcées au registre usine/rnd" },
  { id: "prototypeur", nom: "Prototypeur R&D", resume: "construit la première idée retenue en prototype testé, toujours relu" },
];

const SEMAINE_H = 8 * 24 + 12;

/** @type {ReadonlyArray<Record<string, unknown>>} */
export const POSTES = [
  /* ------------------------------------------------------------------ Actualiser */
  {
    id: "daily-content",
    nom: "Publication du jour",
    atelier: "actualiser",
    genre: "robot",
    moteur: "github",
    workflow: "daily-content.yml",
    gardien: ["daily-content"],
    horaire: "30 4 * * *",
    cadence: "chaque jour vers 6 h 30 (Paris)",
    declencheur: "cron-job.org à 04 h 30 UTC, filet du Gardien à 04 h 45",
    ageMaxH: 30,
    produit: "jusqu'à 3 actualités rédigées par IA + 5 analyses techniques (BTC, ETH, SOL, XRP, ADA)",
    description: "Lit les flux sources, réécrit en français (mention « Rédigée par une IA »), passe le garde-fou fiscal, commite sur main, avertit Google et Bing.",
  },
  {
    id: "weekly-blog",
    nom: "Article de la semaine",
    atelier: "actualiser",
    genre: "robot",
    moteur: "github",
    workflow: "weekly-blog.yml",
    gardien: ["weekly-blog"],
    horaire: "0 8 * * 6",
    cadence: "le samedi matin",
    declencheur: "Gardien (horloge Vercel) ; filet GitHub",
    ageMaxH: SEMAINE_H,
    produit: "1 article de fond (content/articles) signé de la rédaction",
    description: "Prend le sujet suivant du calendrier éditorial, rédige, passe le garde-fou, publie sur main (garde anti-doublon de 5 jours).",
  },
  {
    id: "refresh-ticker-prices",
    nom: "Cours du marché (R1)",
    atelier: "actualiser",
    genre: "robot",
    moteur: "vercel",
    traceKv: "cron:refresh-ticker-prices:last",
    horaire: "*/10 * * * *",
    cadence: "toutes les 10 min",
    declencheur: "Vercel Cron",
    ageMaxH: 1,
    produit: "cours du top 100, instantané de secours, capitalisation et dominance (une seule commande KV)",
    description: "Écrivain unique des cours (CoinMarketCap, relais CoinGecko). Porte le frein du mois : plus lent si le budget projette au-delà de 90 %, jamais coupé.",
  },
  {
    id: "refresh-prices-db",
    nom: "Prix des fiches en base (R2)",
    atelier: "actualiser",
    genre: "robot",
    moteur: "github",
    workflow: "refresh-prices-db.yml",
    gardien: ["refresh-prices-db"],
    horaire: "0 8,14,20 * * *",
    cadence: "3 fois par jour",
    declencheur: "Gardien (horloge Vercel) ; filet GitHub",
    ageMaxH: 16,
    produit: "prix, capitalisation, rang, volume, offre et variations de toutes les fiches (Supabase) + points de l'archive des cours",
    description: "Lot Z3 : CoinMarketCap par identifiant (lots de 100), DexScreener par adresse de contrat, repli CoinGecko si CoinMarketCap échoue ; rouge sous 95 % des fiches appariées ; le site masque tout cours de plus de 48 h.",
  },
  {
    id: "cmc-id-map",
    nom: "Table CoinMarketCap des fiches",
    atelier: "actualiser",
    genre: "robot",
    moteur: "github",
    workflow: "cmc-id-map.yml",
    horaire: "30 8 1 * *",
    cadence: "chaque mois (le 1er)",
    declencheur: "horaire GitHub",
    ageMaxH: 32 * 24,
    produit: "data/cmc-id-map.json : identifiant CoinMarketCap de chaque fiche (symbole + nom + prix à ± 5 %)",
    description: "Reprise Z3 : reconstruit la table lue par R2 (≈ 8 crédits par mois, refus si le frein du mois est actif) ; jamais de table à moins de 90 % des correspondances actuelles.",
  },
  {
    id: "refresh-static-details-kv",
    nom: "Détails des fiches (R3)",
    atelier: "actualiser",
    genre: "robot",
    moteur: "github",
    workflow: "refresh-static-details-kv.yml",
    gardien: ["refresh-static-details-kv"],
    horaire: "0 */6 * * *",
    cadence: "4 fois par jour",
    declencheur: "Gardien (horloge Vercel) ; filet GitHub",
    ageMaxH: 16,
    produit: "ATH, ATL, offre, mini-graphique 7 j des fiches (32 seaux KV)",
    description: "Écrit depuis GitHub pour épargner les fonctions Vercel et le quota Upstash.",
  },
  {
    id: "daily-orchestrator",
    nom: "Orchestrateur quotidien",
    atelier: "actualiser",
    genre: "robot",
    moteur: "vercel",
    traceKv: "cron:orchestrator:last",
    horaire: "0 7 * * *",
    cadence: "chaque jour à 7 h UTC",
    declencheur: "Vercel Cron ; secours par la sentinelle après 27 h sans passage",
    ageMaxH: 27,
    produit: "bandeau, santé des fiches, alertes, série d'e-mails fiscalité, agenda, IndexNow (prix en base : robot R2 depuis le lot Z3)",
    description: "Enchaîne les sous-tâches du matin, chacune bornée à 90 s ; un échec n'arrête pas la chaîne.",
  },
  {
    id: "refresh-fomc",
    nom: "Calendrier officiel (Fed, BCE, halving)",
    atelier: "actualiser",
    genre: "robot",
    moteur: "github",
    workflow: "refresh-fomc.yml",
    gardien: ["refresh-fomc"],
    horaire: "20 6 * * 1",
    cadence: "le lundi",
    declencheur: "Gardien (horloge Vercel) ; filet GitHub",
    ageMaxH: SEMAINE_H,
    produit: "réunions de la Fed (bloc FOMC de lib/events-seed.ts), décisions de la BCE et prochain halving en fourchette (data/calendrier-officiel.json)",
    description: "Relit les calendriers officiels de la Fed et de la BCE et la hauteur de bloc (mempool.space, recoupée avec blockstream.info) ; rouge si une page change de structure ou si un contrôle échoue (anciennes données gardées).",
  },
  {
    id: "fx-bce",
    nom: "Taux de change BCE",
    atelier: "actualiser",
    genre: "robot",
    moteur: "github",
    workflow: "fx-bce.yml",
    gardien: ["fx-bce"],
    horaire: "35 15 * * 1-5",
    cadence: "chaque jour ouvré à 15 h 35 UTC",
    declencheur: "Gardien (horloge Vercel) ; filet GitHub",
    ageMaxH: 80,
    produit: "data/fx-bce.json : taux de référence de la BCE (commit seulement si la valeur change), lu partout où un prix en dollars est converti en euros",
    description: "Lot Z4 (R6) : rouge si la BCE est injoignable ou change de format ; publication de plus de 4 jours ouvrés ou variation de 3 % ou plus = valeurs précédentes gardées et ticket privé.",
  },
  {
    id: "weekly-events",
    nom: "Agenda crypto (CoinMarketCal)",
    atelier: "actualiser",
    genre: "robot",
    moteur: "github",
    workflow: "weekly-events.yml",
    cadence: "en pause (manuel)",
    declencheur: "lancement manuel seulement, en attendant la décision sur CoinMarketCal",
    produit: "événements à venir (data/events.json)",
    description: "Retiré du Gardien le 08/10/2026 : sans clé, il était rouge chaque lundi.",
  },

  /* ------------------------------------------------------------------ Entretenir */
  {
    id: "sentinelle",
    nom: "Sentinelle",
    atelier: "entretenir",
    genre: "robot",
    moteur: "github",
    workflow: "sentinelle.yml",
    gardien: ["sentinelle-leger", "sentinelle-complet"],
    lecture: "sentinelle-dernier",
    horaire: "35 5 * * *",
    cadence: "léger toutes les heures (h + 17), complet chaque nuit à 5 h 35 UTC",
    declencheur: "Gardien (horloge Vercel), après chaque déploiement, après la publication du jour",
    ageMaxH: 3,
    produit: "verdict ✅/⚠️/❌, ticket privé dédoublonné, réparations sans IA, recomptage des chiffres",
    description: "Pages clés, chiffres, fraîcheur, prix contre Kraken, robots, jeu, quota ; la nuit : Cerfa 2086, partenaires, plans du site, 51 familles, consommation du mois.",
  },
  {
    id: "health-check",
    nom: "Contrôle de santé",
    atelier: "entretenir",
    genre: "robot",
    moteur: "github",
    workflow: "health-check.yml",
    gardien: ["health-check"],
    horaire: "15 */6 * * *",
    cadence: "toutes les 6 h",
    declencheur: "Gardien (horloge Vercel) ; filet GitHub",
    ageMaxH: 16,
    produit: "6 adresses clés en 200, bons types de contenu, dernière actu de moins de 3 jours",
    description: "Contrôle rapide et sans dépendance ; ticket privé en cas d'échec.",
  },
  {
    id: "freshness-check",
    nom: "Contrôle de fraîcheur",
    atelier: "entretenir",
    genre: "robot",
    moteur: "github",
    workflow: "freshness-check.yml",
    gardien: ["freshness-check"],
    horaire: "0 9 * * *",
    cadence: "chaque jour à 9 h UTC",
    declencheur: "Gardien (horloge Vercel) ; filet GitHub",
    ageMaxH: 40,
    produit: "au moins 5 actus sur 7 jours, 5 analyses techniques calculées depuis moins de 48 h",
    description: "Détecte un robot de contenu silencieusement en panne avant la chute de fraîcheur SEO.",
  },
  {
    id: "audit-navigateur",
    nom: "Audit navigateur de nuit",
    atelier: "entretenir",
    genre: "robot",
    moteur: "github",
    workflow: "audit-navigateur.yml",
    gardien: ["audit-navigateur"],
    horaire: "10 3 * * *",
    cadence: "chaque nuit",
    declencheur: "Gardien (horloge Vercel) ; filet GitHub",
    ageMaxH: 32,
    produit: "parcours des outils, listes déroulantes, pages sur téléphone et ordinateur (Playwright)",
    description: "Reproduit ce qu'un visiteur fait ; ticket privé avec captures si un parcours casse.",
  },
  {
    id: "fiches-liens",
    nom: "Fiches sans défaut",
    atelier: "entretenir",
    genre: "robot",
    moteur: "github",
    workflow: "fiches-liens.yml",
    gardien: ["fiches-liens"],
    horaire: "40 3 * * *",
    cadence: "chaque nuit",
    declencheur: "Gardien (horloge Vercel) ; filet GitHub",
    ageMaxH: 32,
    produit: "data/fiches/defauts.json : liens internes et sortants de toutes les fiches, textes cassés, prix à 0, h1, JSON-LD",
    description: "Lot Z3 : un lien sortant mort deux nuits de suite est retiré des fiches jusqu'à guérison ; un lien interne mort ouvre un ticket privé et rend le robot rouge. Une requête par seconde.",
  },
  {
    id: "evaluate-alerts",
    nom: "Alertes de prix",
    atelier: "entretenir",
    genre: "robot",
    moteur: "vercel",
    traceKv: "cron:evaluate-alerts:last",
    horaire: "*/15 * * * *",
    cadence: "toutes les 15 min (trace horaire)",
    declencheur: "Vercel Cron",
    ageMaxH: 1.5,
    produit: "alertes de prix des membres évaluées et envoyées",
    description: "Compare les seuils des membres aux cours ; la trace n'est écrite qu'une fois par heure (quota Upstash).",
  },
  {
    id: "streak-reminders",
    nom: "Rappels de série (jeu)",
    atelier: "entretenir",
    genre: "robot",
    moteur: "vercel",
    traceKv: "cron:streak-reminders:last",
    horaire: "0 19 * * *",
    cadence: "chaque jour à 19 h UTC",
    declencheur: "Vercel Cron",
    ageMaxH: 30,
    produit: "notifications push aux joueurs de Reflex Cards",
    description: "Rappelle la série en cours avant minuit ; trace « dernier passage + résultat ».",
  },
  {
    id: "email-series-fiscalite",
    nom: "Série d'e-mails fiscalité",
    atelier: "entretenir",
    genre: "robot",
    moteur: "vercel",
    traceKv: "cron:email-series-fiscalite:last",
    cadence: "chaque jour (dans l'orchestrateur)",
    declencheur: "Orchestrateur quotidien",
    ageMaxH: 30,
    produit: "e-mails J2, J5, J9, J14 aux lecteurs du guide fiscal",
    description: "Suite du guide PDF ; trace lue par la sentinelle.",
  },
  {
    id: "e2e",
    nom: "Tests de bout en bout",
    atelier: "entretenir",
    genre: "robot",
    moteur: "github",
    workflow: "e2e.yml",
    cadence: "à chaque pull request",
    declencheur: "GitHub (pull_request) ou manuel",
    produit: "parcours critiques vérifiés avant fusion (newsletter, connexion, Cerfa, alertes…)",
    description: "Playwright sur un build complet ; rapport joint au passage en cas d'échec.",
    lancable: false,
  },

  /* ------------------------------------------------------------------ Protéger */
  {
    id: "veille-officielle",
    nom: "Veille officielle",
    atelier: "proteger",
    genre: "robot",
    moteur: "github",
    workflow: "veille-officielle.yml",
    gardien: ["veille-officielle"],
    horaire: "40 4 * * *",
    cadence: "chaque nuit",
    declencheur: "Gardien (horloge Vercel, jamais « enregistrer ») ; filet GitHub",
    ageMaxH: 30,
    /* un passage « en échec » de ce robot signifie : une source officielle a changé (ticket privé à relire), pas une panne */
    echecSignifie: "écart détecté sur une source officielle (ticket privé à relire)",
    produit: "Légifrance, BOFiP, impots.gouv, registre MiCA de l'ESMA, listes blanche et noire de l'AMF (lot Z4), grilles de frais relus ; date du contrôle MiCA et de la liste blanche AMF publiées",
    description: "Un changement de source = ticket privé ; une nouvelle référence n'est acceptée qu'après relecture humaine.",
  },
  {
    id: "gardien",
    nom: "Gardien (horloge Vercel → GitHub)",
    atelier: "proteger",
    genre: "garde-fou",
    moteur: "vercel",
    lecture: "gardien-traces",
    cadence: "à chaque horaire de la table lib/gardien.ts",
    declencheur: "Vercel Cron (précis à la minute)",
    produit: "lancements des robots GitHub demandés à l'heure (GitHub saute la plupart de ses horaires)",
    description: "Chaque demande laisse une trace KV ; une demande refusée (jeton, GitHub) se voit ici.",
  },
  {
    id: "content-gate",
    nom: "Garde-fou de publication",
    atelier: "proteger",
    genre: "garde-fou",
    moteur: "integre",
    cadence: "avant chaque publication automatique",
    declencheur: "étape des workflows de contenu",
    produit: "décimales au format français, règle fiscale respectée, article fautif écarté avant commit",
    description: "scripts/content-gate.mjs : bloquant si un article déjà publié est en faute ; un nouvel article fautif est écarté, les autres passent.",
  },
  {
    id: "frein-budget",
    nom: "Frein du mois (budget CoinMarketCap)",
    atelier: "proteger",
    genre: "garde-fou",
    moteur: "vercel",
    lecture: "frein-r1",
    cadence: "à chaque relevé des cours",
    declencheur: "robot R1",
    produit: "0 € de dépassement, site jamais coupé : rythme ralenti au-delà de 90 % de projection, normal sous 75 %",
    description: "Règle unique scripts/lib/budget-mois.mjs ; état lu dans la trace de R1.",
  },
  {
    id: "fraicheur-51",
    nom: "Fraîcheur des 51 familles de données",
    atelier: "proteger",
    genre: "garde-fou",
    moteur: "github",
    lecture: "sentinelle-complet",
    cadence: "chaque nuit (sentinelle complète)",
    declencheur: "sentinelle complète",
    produit: "chaque famille (cours, fiches, registres, lois…) jugée ✅ / ⚠️ / ❌ sur sa VRAIE date",
    description: "data/fraicheur/registre.json : une famille ❌ ouvre un ticket dédoublonné ; état hebdomadaire le dimanche.",
  },
  {
    id: "reparations-auto",
    nom: "Réparations sans IA",
    atelier: "proteger",
    genre: "garde-fou",
    moteur: "github",
    lecture: "sentinelle-dernier",
    cadence: "à chaque passage de la sentinelle",
    declencheur: "sentinelle",
    produit: "publication du jour relancée (≤ 3 par jour), orchestrateur de secours (≤ 1 par 20 h), robot en échec rejoué (1 fois)",
    description: "Décisions prises par scripts/sentinelle.mjs, exécutées par le workflow, sans jeton supplémentaire.",
  },

  /* ------------------------------------------------------------------ Améliorer (agents IA) */
  {
    id: "usine-reviseur",
    nom: "Agent réviseur d'articles",
    atelier: "ameliorer",
    genre: "agent-ia",
    moteur: "github",
    workflow: "usine-reviseur.yml",
    mission: "reviseur",
    horaire: "20 5 * * 1-6",
    cadence: "du lundi au samedi (USINE_IA=off pour couper)",
    declencheur: "horaire GitHub ou lancement manuel",
    ageMaxH: 30,
    produit: "1 pull request : un article relu, faits et dates vérifiés avec sources, journal des corrections tenu",
    description: "Plan du jour : l'article le plus ancien sans relecture depuis 60 jours ; mission usine/missions/reviseur.md ; n'écrit jamais sur main.",
  },
  {
    id: "usine-correcteur",
    nom: "Agent correcteur",
    atelier: "ameliorer",
    genre: "agent-ia",
    moteur: "github",
    workflow: "usine-correcteur.yml",
    mission: "correcteur",
    horaire: "15 6 * * *",
    cadence: "chaque matin après la sentinelle complète (USINE_IA=off pour couper)",
    declencheur: "horaire GitHub ou lancement manuel",
    ageMaxH: 30,
    produit: "1 pull request : correctifs des défauts de la sentinelle qui relèvent du code ou du contenu",
    description: "Rejoue le contrôle léger, lit le rapport, corrige ce qui est corrigeable, explique le reste.",
  },
  {
    id: "usine-seo",
    nom: "Agent SEO",
    atelier: "ameliorer",
    genre: "agent-ia",
    moteur: "github",
    workflow: "usine-seo.yml",
    mission: "seo",
    horaire: "0 6 * * 2",
    cadence: "le mardi (USINE_IA=off pour couper)",
    declencheur: "horaire GitHub ou lancement manuel",
    ageMaxH: SEMAINE_H,
    produit: "1 pull request : titres, descriptions, liens internes et données structurées d'un lot de pages",
    description: "Lot borné (10 pages au plus), sans toucher aux faits ni aux chiffres.",
  },
  {
    id: "usine-auditeur",
    nom: "Agent auditeur",
    atelier: "ameliorer",
    genre: "agent-ia",
    moteur: "github",
    workflow: "usine-auditeur.yml",
    mission: "auditeur",
    horaire: "0 6 * * 0",
    cadence: "le dimanche (USINE_IA=off pour couper)",
    declencheur: "horaire GitHub ou lancement manuel",
    ageMaxH: SEMAINE_H,
    produit: "1 pull request : rapport d'audit daté (lint, tests, qualité, dépendances) et correctifs sans risque",
    description: "Rapport dans docs/usine/rapports/AAAA-MM-JJ-audit.md, lisible sans ouvrir le code.",
  },
  {
    id: "classement-risque",
    nom: "Classement du risque et contrôles",
    atelier: "ameliorer",
    genre: "garde-fou",
    moteur: "github",
    cadence: "à chaque proposition d'agent",
    declencheur: "workflow usine-agent.yml, après le travail de l'agent",
    produit: "étiquette « prête » (aucun fait touché : texte, SEO, liens internes, rapport, idée ; garde-fou des contenus, qualité, types, tests ET build au vert) ou « à relire »",
    description: "scripts/lib/usine-risque.mjs : liste blanche de fichiers, aucun chiffre, date, €, % ni lien externe ajouté dans un corps d'article, journal des corrections = relecture. Au moindre doute, relecture.",
  },
  {
    id: "retour-arriere",
    nom: "Garde-fou de dégradation",
    atelier: "ameliorer",
    genre: "garde-fou",
    moteur: "github",
    workflow: "usine-garde-fou.yml",
    lecture: "garde-fou-kv",
    cadence: "après chaque sentinelle en échec",
    declencheur: "workflow_run de la sentinelle ; retour arrière en un clic (lancement manuel, simulation décochée)",
    produit: "recommandation de retour arrière quand un défaut de contenu suit une fusion de l'Usine de moins de 6 h ; annulation (git revert) si Kevin la lance",
    description: "scripts/lib/usine-garde-fou.mjs : seuls les commits « usine(… » récents, non annulés, sont candidats ; un défaut d'infrastructure ne déclenche rien.",
  },

  /* ------------------------------------------------------------------ Recherche & développement */
  {
    id: "usine-chercheur",
    nom: "Agent chercheur R&D",
    atelier: "rnd",
    genre: "agent-ia",
    moteur: "github",
    workflow: "usine-chercheur.yml",
    mission: "chercheur",
    horaire: "0 7 * * 4",
    cadence: "le jeudi (USINE_IA=off pour couper)",
    declencheur: "horaire GitHub ou lancement manuel (thème en cible)",
    ageMaxH: SEMAINE_H,
    produit: "1 pull request « prête » : 1 à 3 fiches d'idées sourcées dans usine/rnd/idees + registre à jour",
    description: "Lecteurs, réglementation, concurrents, outils, qualité : chaque fiche porte preuves, impact, effort, risques et plan de prototype.",
  },
  {
    id: "usine-prototypeur",
    nom: "Agent prototypeur R&D",
    atelier: "rnd",
    genre: "agent-ia",
    moteur: "github",
    workflow: "usine-prototypeur.yml",
    mission: "prototypeur",
    horaire: "0 7 * * 3",
    cadence: "le mercredi (USINE_IA=off pour couper)",
    declencheur: "horaire GitHub ou lancement manuel (identifiant d'idée en cible)",
    ageMaxH: SEMAINE_H,
    produit: "1 pull request « à relire » : prototype testé de la première idée retenue, idée passée en « en-cours »",
    description: "Petit, testé, désactivable ; toujours relu par Kevin (c'est du code).",
  },
];

/** Poste par identifiant, ou undefined. */
export function posteParId(id) {
  return POSTES.find((p) => p.id === id);
}

/** Postes d'un atelier, dans l'ordre du registre. */
export function postesParAtelier(atelierId) {
  return POSTES.filter((p) => p.atelier === atelierId);
}

/** Un poste se lance à la main s'il a un workflow GitHub et n'est pas explicitement exclu. */
export function estLancable(poste) {
  return Boolean(poste && poste.workflow && poste.lancable !== false && poste.genre !== "garde-fou");
}

/** Workflows GitHub connus du registre (fichiers, dédoublonnés). */
export function workflowsDuRegistre() {
  return [...new Set(POSTES.map((p) => p.workflow).filter(Boolean))];
}

/** Clés KV lues par le tableau de bord : traces des tâches Vercel + résumés de la sentinelle. */
export const CLES_KV_USINE = {
  sentinelleDernier: "usine:sentinelle:dernier",
  sentinelleComplet: "usine:sentinelle:complet",
};

/** Préfixe des branches et des titres de pull request des agents IA. */
export const PREFIXE_BRANCHE_IA = "usine/";
export const PREFIXE_TITRE_IA = "Usine IA —";
