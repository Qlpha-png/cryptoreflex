/**
 * lib/usine/types.ts — types TypeScript de l'Usine (09/10/2026). Le registre et la logique pure vivent dans
 * scripts/lib/usine-registre.mjs et scripts/lib/usine-etat.mjs (zéro dépendance, partagés avec la ligne de commande) ;
 * ces types en sont la lecture typée côté site.
 */

export type AtelierId = "actualiser" | "entretenir" | "proteger" | "ameliorer";
export type Genre = "robot" | "agent-ia" | "garde-fou";
export type Moteur = "github" | "vercel" | "integre";
export type Statut = "ok" | "en-cours" | "retard" | "attention" | "echec" | "veille" | "jamais" | "inconnu" | "integre";
export type EtatChaine = "fait" | "echec" | "en-cours" | "attendu" | "manque" | "veille" | "inconnu";

export interface Atelier {
  id: AtelierId;
  nom: string;
  description: string;
}

export interface Mission {
  id: string;
  nom: string;
  resume: string;
}

export interface Poste {
  id: string;
  nom: string;
  atelier: AtelierId;
  genre: Genre;
  moteur: Moteur;
  workflow?: string;
  gardien?: string[];
  traceKv?: string;
  lecture?: "frein-r1" | "sentinelle-complet" | "sentinelle-dernier" | "gardien-traces";
  horaire?: string;
  cadence: string;
  declencheur: string;
  ageMaxH?: number;
  produit: string;
  description: string;
  mission?: string;
  echecSignifie?: string;
  lancable?: boolean;
}

/** Passage GitHub Actions réduit aux champs utiles. */
export interface Run {
  id: number;
  name: string;
  workflow: string;
  titre: string;
  event: string;
  status: string;
  conclusion: string | null;
  created_at: string;
  updated_at: string;
  html_url: string;
  attempt: number;
}

export interface Jugement {
  poste: Poste;
  statut: Statut;
  raison: string;
  dernier: Run | Record<string, unknown> | null;
  ageH: number | null;
}

export interface LigneChaine {
  posteId: string;
  nom: string;
  atelier: AtelierId;
  genre: Genre;
  /** ISO UTC */
  heure: string;
  etat: EtatChaine;
  run: Run | null;
}

export interface LigneProduction {
  jour: string;
  actus: number;
  analyses: number;
  articles: number;
  corrections: number;
  prs: number;
}

export interface Production {
  parJour: LigneProduction[];
  totaux: { j7: Omit<LigneProduction, "jour">; j30: Omit<LigneProduction, "jour"> };
}

export interface PullRequestUsine {
  numero: number;
  titre: string;
  url: string;
  branche: string;
  mission: string | null;
  creeLe: string;
  fusionneLe: string | null;
  etat: "ouverte" | "fusionnee" | "fermee";
}

/** Résumé écrit dans le KV par scripts/sentinelle.mjs (clés usine:sentinelle:dernier / :complet). */
export interface ResumeSentinelle {
  at: string;
  full: boolean;
  fails: number;
  warns: number;
  oks: number;
  defauts: { area: string; msg: string }[];
  surveiller: { area: string; msg: string }[];
  reparations?: { dailyContent?: string | null; orchestrator?: string | null; rerun?: { id: number; name: string }[] };
  fraicheur?: { ok: number; attention: number; defaut: number };
  consommation?: {
    le: string;
    mois: string;
    services: {
      id: string;
      nom: string;
      etat: "ok" | "attention" | "defaut" | "non-mesure";
      icone: string;
      consomme: number | null;
      limite: number | null;
      unite: string | null;
      projection: number | null;
      pct: number | null;
      msg: string;
    }[];
  };
  tailleBase?: { octets: number | null; plafond: number; raison?: string };
}

export interface BudgetCmc {
  lu: boolean;
  raison?: string;
  niveau?: "ok" | "attention" | "alerte";
  mode?: "normal" | "économe" | "arrêt";
  moisUtilises?: number;
  moisPlafond?: number;
  besoinFinDeMois?: number;
  epuisementPrevu?: string | null;
  frein?: { etat: "actif" | "normal"; raison: string | null; projectionPct: number | null; dernierReleve: string | null } | null;
}

export interface AnalyseTechnique {
  slug: string;
  calculeeLe: string | null;
  source: string | null;
  ageH: number | null;
}

export interface Verdict {
  niveau: "vert" | "orange" | "rouge";
  resume: string;
  echecs: number;
  retards: number;
  defauts: number;
  agentsActifs: number;
}

export interface EtatUsine {
  genereLe: string;
  sources: { github: boolean; kv: boolean; cmc: boolean; jetonGardien: boolean };
  ateliers: Atelier[];
  missions: Mission[];
  jugements: Jugement[];
  verdict: Verdict;
  chaine: { lignes: LigneChaine[]; continus: Poste[] };
  production: Production;
  analyses: AnalyseTechnique[];
  derniereActu: string | null;
  compteurs: Record<string, number | string>;
  micaControle: string | null;
  sentinelle: { dernier: ResumeSentinelle | null; complet: ResumeSentinelle | null };
  budget: BudgetCmc;
  prs: { ouvertes: PullRequestUsine[]; fusionnees: PullRequestUsine[] };
  journal: Run[];
}
