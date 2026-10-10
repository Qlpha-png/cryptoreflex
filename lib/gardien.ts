/**
 * lib/gardien.ts — robots GitHub lancés par l'horloge Vercel (« gardien »).
 *
 * Constat du 07/10/2026 : GitHub saute la plupart des horaires « schedule » (sur 50 h : sentinelle 9 passages
 * programmés sur ~50, veille officielle 1, audit navigateur 1). L'horloge de Vercel (offre Pro, précise à la minute)
 * appelle /api/cron/gardien/<clé>, qui demande à GitHub de lancer le robot (API « workflow_dispatch »).
 *
 * TABLE UNIQUE : vercel.json (crons) et tests/lib/gardien.test.ts en dépendent. Les horaires « schedule » de GitHub
 * restent dans les workflows comme filet (un lancement en double est sans danger : voir le test).
 *
 * Horaires en UTC (l'horloge Vercel ne connaît que l'UTC).
 */

export interface RobotGardien {
  /** Clé de l'adresse /api/cron/gardien/<clé> (minuscules, chiffres, tirets). */
  cle: string;
  /** Fichier du workflow dans .github/workflows/. */
  workflow: string;
  /** Entrées envoyées au workflow : uniquement des entrées déclarées dans son « workflow_dispatch » (sinon GitHub refuse),
   *  valeurs « true »/« false » pour une entrée booléenne (les workflows comparent à true ET à 'true'). */
  inputs: Readonly<Record<string, string>>;
  /** Horaire cron UTC (format vercel.json). */
  horaire: string;
  description: string;
}

/** Dépôt public dont les robots sont lancés. */
export const DEPOT_ROBOTS = "Qlpha-png/cryptoreflex";
/** Branche sur laquelle les robots sont lancés. */
export const BRANCHE_ROBOTS = "main";

export const ROBOTS_GARDIEN: readonly RobotGardien[] = [
  {
    cle: "sentinelle-leger",
    workflow: "sentinelle.yml",
    inputs: { full: "false" },
    horaire: "17 * * * *",
    description: "Sentinelle, contrôle léger toutes les heures (pages clés, chiffres, fraîcheur, prix, robots).",
  },
  {
    cle: "sentinelle-complet",
    workflow: "sentinelle.yml",
    inputs: { full: "true" },
    horaire: "35 5 * * *",
    description: "Sentinelle, contrôle complet chaque nuit (Cerfa 2086, liens partenaires, plans du site, recomptage).",
  },
  {
    cle: "veille-officielle",
    workflow: "veille-officielle.yml",
    // AUCUNE entrée : « enregistrer » et « detail » gardent leur valeur par défaut (faux, typée par GitHub). Jamais
    // « enregistrer » automatiquement : une nouvelle référence n'est acceptée qu'après relecture.
    inputs: {},
    horaire: "40 4 * * *",
    description: "Veille officielle : Légifrance, BOFiP, registre MiCA, grilles de frais.",
  },
  {
    cle: "audit-navigateur",
    workflow: "audit-navigateur.yml",
    inputs: {},
    horaire: "10 3 * * *",
    description: "Audit navigateur de nuit (parcours d'outils, listes déroulantes, pages sur téléphone et ordinateur).",
  },
  {
    cle: "daily-content",
    workflow: "daily-content.yml",
    // Filet : cron-job.org lance déjà la publication à 04 h 30 UTC (constaté du 02 au 07/10/2026) ; à 04 h 45, le
    // workflow ne fait rien si la publication du jour a déjà réussi (sinon il la lance).
    inputs: { filet: "true" },
    horaire: "45 4 * * *",
    description: "Publication du jour (actus + analyses techniques), lancement de secours si cron-job.org n'a rien fait.",
  },
  {
    cle: "refresh-static-details-kv",
    workflow: "refresh-static-details-kv.yml",
    inputs: {},
    horaire: "0 */6 * * *",
    description: "Détails des fiches (ATH, ATL, offre, mini-graphique) écrits depuis GitHub, 4 fois par jour.",
  },
  {
    cle: "refresh-prices-db",
    workflow: "refresh-prices-db.yml",
    inputs: {},
    horaire: "0 8,14,20 * * *",
    description: "Prix, capitalisation et rang des fiches dans la base, 3 fois par jour.",
  },
  {
    cle: "health-check",
    workflow: "health-check.yml",
    inputs: {},
    horaire: "15 */6 * * *",
    description: "Contrôle de santé (adresses clés, plans du site, fraîcheur des actus), toutes les 6 heures.",
  },
  {
    cle: "freshness-check",
    workflow: "freshness-check.yml",
    inputs: {},
    horaire: "0 9 * * *",
    description: "Contrôle de fraîcheur des actus et analyses techniques, chaque jour.",
  },
  {
    cle: "weekly-blog",
    workflow: "weekly-blog.yml",
    // aucune entrée (dry_run reste faux) ; le workflow ne publie rien si un article de la semaine est déjà sorti
    // depuis moins de 5 jours (garde anti-doublon : le filet « schedule » de GitHub peut aussi le lancer)
    inputs: {},
    horaire: "0 8 * * 6",
    description: "Article long de la semaine, le samedi.",
  },
  // weekly-events retiré le 08/10/2026 (lot fraîcheur A, reprise I7) : lancement manuel seulement, en attendant la
  // décision de Kev sur CoinMarketCal (sans clé, il était rouge chaque lundi).
  {
    cle: "refresh-fomc",
    workflow: "refresh-fomc.yml",
    // 08/10/2026 (lot fraîcheur A) : calendrier officiel de la Fed → bloc FOMC de lib/events-seed.ts ; commit seulement si
    // les réunions changent, rouge si la page change de structure.
    inputs: {},
    horaire: "20 6 * * 1",
    description: "Réunions FOMC relues sur le calendrier officiel de la Fed, le lundi.",
  },
  {
    cle: "fiches-liens",
    workflow: "fiches-liens.yml",
    // 10/10/2026 (lot Z3) : robot de nuit « fiches sans défaut » (liens internes et sortants, NaN, prix à 0, h1, JSON-LD) ;
    // une requête par seconde, résultat commité dans data/fiches/defauts.json, lu au rendu (lib/liens-morts.ts).
    inputs: {},
    horaire: "40 3 * * *",
    description: "Fiches sans défaut : liens internes et sortants, textes cassés, prix à 0, h1, données structurées, chaque nuit.",
  },
  {
    cle: "fx-bce",
    workflow: "fx-bce.yml",
    // 10/10/2026 (lot Z4, robot R6) : taux de référence de la BCE → data/fx-bce.json (commit seulement si la valeur change) ;
    // jours ouvrés à 15 h 35 UTC, après la publication de la BCE (vers 16 h, heure de Francfort ; 15 h UTC en hiver).
    inputs: {},
    horaire: "35 15 * * 1-5",
    description: "Taux de change de référence de la BCE (euro, dollar, livre, franc suisse), chaque jour ouvré.",
  },
];

/** Robot de la table, ou undefined si la clé est inconnue. */
export function robotGardien(cle: string): RobotGardien | undefined {
  return ROBOTS_GARDIEN.find((r) => r.cle === cle);
}

/** Adresse appelée par l'horloge Vercel pour ce robot. */
export function cheminGardien(cle: string): string {
  return `/api/cron/gardien/${cle}`;
}

/** Clé KV de la dernière demande de lancement d'un robot. */
export function cleTraceGardien(cle: string): string {
  return `gardien:dernier:${cle}`;
}
