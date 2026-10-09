/**
 * lib/usine/etat.ts — lecteur d'état de l'Usine, côté serveur (09/10/2026). Lu par app/admin/usine/page.tsx.
 *
 * Sources, toutes facultatives (une source absente donne « non mesuré », jamais un chiffre supposé) :
 *  - API GitHub (dépôt public Qlpha-png/cryptoreflex) : passages des workflows et pull requests des agents IA.
 *    Jeton GITHUB_GARDIEN_TOKEN s'il existe (5 000 requêtes/h), sinon lecture anonyme (60/h) : UN appel groupé pour
 *    100 passages, mis en cache 2 min par Next, plus un appel par workflow absent de la liste (hebdomadaires), 15 min.
 *  - KV (Upstash) : traces « dernier passage + résultat » des tâches Vercel, demandes du Gardien, résumés de la
 *    sentinelle. UNE commande MGET par lecture (quota Upstash épargné).
 *  - Fichiers du dépôt : actualités, articles, analyses techniques, journal des corrections, chiffres du site.
 *  - CoinMarketCap : bilan du budget (0 crédit, compteur officiel partagé avec le garde-fou).
 * Aucun secret, aucune donnée personnelle dans l'état renvoyé.
 */
import { promises as fs } from "node:fs";
import path from "node:path";
import { CRON_TRACE_KEYS } from "@/lib/cron-trace";
import { DEPOT_ROBOTS, ROBOTS_GARDIEN, cleTraceGardien } from "@/lib/gardien";
import { cmcBudgetReport } from "@/lib/coinmarketcap";
import { getKv } from "@/lib/kv";
import { lireTraceR1 } from "@/lib/marche-robot";
import siteCounts from "@/data/site-counts.json";
import micaAuto from "@/data/veille/mica-auto.json";
import { ATELIERS, CLES_KV_USINE, MISSIONS, POSTES, PREFIXE_BRANCHE_IA, workflowsDuRegistre } from "@/scripts/lib/usine-registre.mjs";
import { bilanIdees, candidatsSeo, choisirArticleAReviser, classerDefauts, ficheArticle, validerRegistreIdees } from "@/scripts/lib/usine-plan.mjs";
import {
  chaineDuJour,
  compterProduction,
  dateFrontmatter,
  dateNomFichier,
  jugerPoste,
  normaliserRun,
  regrouperRuns,
  verdictGlobal,
} from "@/scripts/lib/usine-etat.mjs";
import type {
  AgentEnDirect,
  AnalyseTechnique,
  Atelier,
  BudgetCmc,
  EtatUsine,
  Idee,
  Jugement,
  LigneChaine,
  Mission,
  PlanDuJour,
  Poste,
  Production,
  PullRequestUsine,
  ResumeSentinelle,
  Run,
  TraceGardeFou,
  Verdict,
} from "./types";

export const POSTES_USINE = POSTES as unknown as readonly Poste[];
export const ATELIERS_USINE = ATELIERS as unknown as readonly Atelier[];
export const MISSIONS_USINE = MISSIONS as unknown as readonly Mission[];

const API = "https://api.github.com";
const DELAI_GITHUB_MS = 8_000;
const RACINE = process.cwd();
const HEURE = 3_600_000;

/* ------------------------------------------------------------------ GitHub */

function entetesGitHub(avecJeton: boolean): Record<string, string> {
  const h: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": "cryptoreflex-usine",
  };
  const jeton = process.env.GITHUB_GARDIEN_TOKEN;
  if (avecJeton && jeton) h.Authorization = `Bearer ${jeton}`;
  return h;
}

/** GET sur le dépôt des robots, cache de données Next (revalidate), null en cas d'échec (jamais d'exception). */
async function lireGitHub<T>(chemin: string, revalidate: number): Promise<T | null> {
  const url = `${API}/repos/${DEPOT_ROBOTS}${chemin}`;
  const tenter = async (avecJeton: boolean): Promise<Response | null> => {
    try {
      return await fetch(url, { headers: entetesGitHub(avecJeton), next: { revalidate }, signal: AbortSignal.timeout(DELAI_GITHUB_MS) });
    } catch {
      return null;
    }
  };
  let res = await tenter(true);
  // jeton à grain fin sans ce droit (401/403) : le dépôt est public, on relit sans jeton
  if (res && (res.status === 401 || res.status === 403) && process.env.GITHUB_GARDIEN_TOKEN) res = await tenter(false);
  if (!res || !res.ok) return null;
  try {
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

interface ReponseRuns {
  workflow_runs?: unknown[];
}

async function lireRuns(): Promise<{ runs: Run[]; parWorkflow: Map<string, Run[]>; disponible: boolean }> {
  const page = await lireGitHub<ReponseRuns>("/actions/runs?per_page=100", 120);
  if (!page) return { runs: [], parWorkflow: new Map(), disponible: false };
  const runs = (page.workflow_runs ?? []).map((r) => normaliserRun(r) as Run | null).filter((r): r is Run => !!r);
  const parWorkflow = regrouperRuns(runs) as Map<string, Run[]>;
  // workflows hebdomadaires ou rares, absents des 100 derniers passages : un appel chacun, mis en cache 15 min
  const absents = (workflowsDuRegistre() as string[]).filter((w) => !parWorkflow.has(w));
  const complements = await Promise.all(absents.map((w) => lireGitHub<ReponseRuns>(`/actions/workflows/${encodeURIComponent(w)}/runs?per_page=3`, 900)));
  for (const c of complements) {
    const extra = (c?.workflow_runs ?? []).map((r) => normaliserRun(r) as Run | null).filter((r): r is Run => !!r);
    for (const r of extra) {
      if (!parWorkflow.has(r.workflow)) parWorkflow.set(r.workflow, []);
      parWorkflow.get(r.workflow)!.push(r);
      runs.push(r);
    }
  }
  for (const liste of parWorkflow.values()) liste.sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at));
  runs.sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at));
  return { runs, parWorkflow, disponible: true };
}

interface PrBrute {
  number: number;
  title: string;
  html_url: string;
  created_at: string;
  merged_at: string | null;
  state: string;
  head?: { ref?: string };
}

function versPr(p: PrBrute): PullRequestUsine {
  const branche = p.head?.ref ?? "";
  const mission = branche.startsWith(PREFIXE_BRANCHE_IA) ? branche.slice(PREFIXE_BRANCHE_IA.length).split("-")[0] || null : null;
  const etiquette: PullRequestUsine["etiquette"] = /\[prête\]/i.test(p.title) ? "prete" : /\[à relire\]/i.test(p.title) ? "relire" : null;
  return {
    numero: p.number,
    titre: p.title,
    url: p.html_url,
    branche,
    mission,
    creeLe: p.created_at,
    fusionneLe: p.merged_at,
    etat: p.merged_at ? "fusionnee" : p.state === "open" ? "ouverte" : "fermee",
    etiquette,
  };
}

async function lirePrs(): Promise<{ ouvertes: PullRequestUsine[]; fusionnees: PullRequestUsine[] }> {
  const [ouvertes, fermees] = await Promise.all([
    lireGitHub<PrBrute[]>("/pulls?state=open&per_page=50", 180),
    lireGitHub<PrBrute[]>("/pulls?state=closed&sort=updated&direction=desc&per_page=40", 600),
  ]);
  const estUsine = (p: PrBrute) => (p.head?.ref ?? "").startsWith(PREFIXE_BRANCHE_IA);
  return {
    ouvertes: (ouvertes ?? []).filter(estUsine).map(versPr),
    fusionnees: (fermees ?? []).filter((p) => estUsine(p) && p.merged_at).map(versPr),
  };
}

interface JobBrut {
  name: string;
  status: string;
  started_at?: string | null;
  steps?: { name: string; status: string; number: number }[];
}

/** Étape courante des passages d'agents EN COURS (au plus 5 passages, 30 s de cache) : « voir les agents travailler ». */
async function lireAgentsEnDirect(runs: Run[]): Promise<AgentEnDirect[]> {
  const enCours = runs.filter((r) => r.status !== "completed" && /^usine-/.test(r.workflow)).slice(0, 5);
  const reponses = await Promise.all(enCours.map((r) => lireGitHub<{ jobs?: JobBrut[] }>(`/actions/runs/${r.id}/jobs?per_page=10`, 30)));
  const out: AgentEnDirect[] = [];
  enCours.forEach((run, i) => {
    const jobs = reponses[i]?.jobs ?? [];
    const job = jobs.find((j) => j.status === "in_progress") ?? jobs[jobs.length - 1];
    if (!job) {
      out.push({ run, job: "en attente d'un exécuteur", etape: null, numero: 0, total: 0, depuis: null });
      return;
    }
    const steps = job.steps ?? [];
    const courante = steps.find((s) => s.status === "in_progress") ?? [...steps].reverse().find((s) => s.status === "completed") ?? null;
    out.push({ run, job: job.name, etape: courante?.name ?? null, numero: courante?.number ?? 0, total: steps.length, depuis: job.started_at ?? null });
  });
  return out;
}

/* ------------------------------------------------------------------ KV */

function clesKv(): string[] {
  return [
    ...ROBOTS_GARDIEN.map((r) => cleTraceGardien(r.cle)),
    ...Object.values(CRON_TRACE_KEYS),
    "cron:orchestrator:last",
    "cron:evaluate-alerts:last",
    CLES_KV_USINE.sentinelleDernier,
    CLES_KV_USINE.sentinelleComplet,
    "usine:garde-fou:dernier",
  ];
}

function traceGardeFou(v: unknown): TraceGardeFou | null {
  if (!v || typeof v !== "object") return null;
  const o = v as Record<string, unknown>;
  if (typeof o.at !== "string" || (o.action !== "revert" && o.action !== "rien")) return null;
  return {
    at: o.at,
    action: o.action,
    simulation: typeof o.simulation === "boolean" ? o.simulation : undefined,
    sha: typeof o.sha === "string" ? o.sha : undefined,
    message: typeof o.message === "string" ? o.message : undefined,
    raisons: Array.isArray(o.raisons) ? o.raisons.map(String) : undefined,
    raison: typeof o.raison === "string" ? o.raison : undefined,
    pousse: typeof o.pousse === "boolean" ? o.pousse : undefined,
    erreur: typeof o.erreur === "string" ? o.erreur : undefined,
  };
}

async function lireTraces(): Promise<{ traces: Record<string, unknown>; disponible: boolean }> {
  const kv = getKv();
  if (kv.mocked) return { traces: {}, disponible: false };
  const cles = clesKv();
  try {
    const valeurs = await kv.mget<unknown>(cles);
    const traces: Record<string, unknown> = {};
    cles.forEach((k, i) => {
      if (valeurs[i] != null) traces[k] = valeurs[i];
    });
    return { traces, disponible: true };
  } catch {
    return { traces: {}, disponible: false };
  }
}

function resumeSentinelle(v: unknown): ResumeSentinelle | null {
  if (!v || typeof v !== "object") return null;
  const o = v as Record<string, unknown>;
  if (typeof o.at !== "string") return null;
  const liste = (x: unknown) =>
    Array.isArray(x) ? x.filter((e) => e && typeof e === "object").map((e) => ({ area: String((e as { area?: unknown }).area ?? ""), msg: String((e as { msg?: unknown }).msg ?? "") })) : [];
  return {
    at: o.at,
    full: o.full === true,
    fails: Number(o.fails ?? 0) || 0,
    warns: Number(o.warns ?? 0) || 0,
    oks: Number(o.oks ?? 0) || 0,
    defauts: liste(o.defauts),
    surveiller: liste(o.surveiller),
    reparations: o.reparations && typeof o.reparations === "object" ? (o.reparations as ResumeSentinelle["reparations"]) : undefined,
    fraicheur: o.fraicheur && typeof o.fraicheur === "object" ? (o.fraicheur as ResumeSentinelle["fraicheur"]) : undefined,
    consommation: o.consommation && typeof o.consommation === "object" ? (o.consommation as ResumeSentinelle["consommation"]) : undefined,
    tailleBase: o.tailleBase && typeof o.tailleBase === "object" ? (o.tailleBase as ResumeSentinelle["tailleBase"]) : undefined,
  };
}

/* ------------------------------------------------------------------ fichiers du dépôt */

async function lireDebut(fichier: string, octets = 2048): Promise<string> {
  const fh = await fs.open(fichier, "r");
  try {
    const buf = Buffer.alloc(octets);
    const { bytesRead } = await fh.read(buf, 0, octets, 0);
    return buf.subarray(0, bytesRead).toString("utf8");
  } finally {
    await fh.close();
  }
}

async function listerMdx(dossier: string): Promise<string[]> {
  try {
    return (await fs.readdir(dossier)).filter((f) => f.endsWith(".mdx") || f.endsWith(".md"));
  } catch {
    return [];
  }
}

interface Fiche {
  slug: string;
  titre: string;
  description: string;
  date: string | null;
  updatedAt: string | null;
  revisionUsine: string | null;
  seoUsine: string | null;
  liensInternes: string[];
  liensExternes: string[];
}

interface ProductionLocale {
  actus: string[];
  articles: string[];
  fiches: Fiche[];
  analyses: AnalyseTechnique[];
  corrections: string[];
  rnd: { idees: Idee[]; erreurs: string[] };
}

async function lireProductionLocale(now: number): Promise<ProductionLocale> {
  const [fichiersActus, fichiersArticles, fichiersAnalyses, corrections] = await Promise.all([
    listerMdx(path.join(RACINE, "content", "news")),
    listerMdx(path.join(RACINE, "content", "articles")),
    fs.readdir(path.join(RACINE, "data", "analyses-techniques")).catch(() => [] as string[]),
    fs
      .readFile(path.join(RACINE, "data", "corrections.json"), "utf8")
      .then((t) => (JSON.parse(t) as { corrections?: { date?: string }[] }).corrections ?? [])
      .catch(() => [] as { date?: string }[]),
  ]);
  const actus = fichiersActus.map((f) => dateNomFichier(f) as string | null).filter((d): d is string => !!d);
  // articles : fiche complète (frontmatter + liens), la même lecture que le plan du jour des agents
  const fiches = (
    await Promise.all(
      fichiersArticles.map(async (f) => {
        try {
          return ficheArticle(f.replace(/\.mdx?$/, ""), await fs.readFile(path.join(RACINE, "content", "articles", f), "utf8")) as Fiche;
        } catch {
          return null;
        }
      }),
    )
  ).filter((f): f is Fiche => !!f);
  const articles = fiches.map((f) => f.date ?? dateFrontmatter("")).filter((d): d is string => !!d);
  let rnd: ProductionLocale["rnd"] = { idees: [], erreurs: [] };
  try {
    const reg = JSON.parse(await fs.readFile(path.join(RACINE, "usine", "rnd", "registre.json"), "utf8")) as { idees?: Idee[] };
    rnd = { idees: Array.isArray(reg.idees) ? reg.idees : [], erreurs: validerRegistreIdees(reg) as string[] };
  } catch (err) {
    rnd = { idees: [], erreurs: [`registre illisible (${err instanceof Error ? err.message.slice(0, 80) : "?"})`] };
  }
  const analyses: AnalyseTechnique[] = (
    await Promise.all(
      fichiersAnalyses
        .filter((f) => f.endsWith(".json"))
        .map(async (f) => {
          try {
            const j = JSON.parse(await fs.readFile(path.join(RACINE, "data", "analyses-techniques", f), "utf8")) as {
              slug?: string;
              latest?: { calculatedAt?: string; sourceLabel?: string; source?: string };
            };
            const calculeeLe = typeof j.latest?.calculatedAt === "string" ? j.latest.calculatedAt : null;
            const t = calculeeLe ? Date.parse(calculeeLe) : NaN;
            return {
              slug: j.slug ?? f.replace(/\.json$/, ""),
              calculeeLe,
              source: j.latest?.sourceLabel ?? j.latest?.source ?? null,
              ageH: Number.isFinite(t) ? (now - t) / HEURE : null,
            };
          } catch {
            return { slug: f.replace(/\.json$/, ""), calculeeLe: null, source: null, ageH: null };
          }
        }),
    )
  ).sort((a, b) => a.slug.localeCompare(b.slug));
  return {
    actus,
    articles,
    fiches,
    analyses,
    corrections: corrections.map((c) => c.date ?? "").filter(Boolean),
    rnd,
  };
}

/** Plan du jour, identique à celui que scripts/usine-plan.mjs écrit pour les agents. */
function planDuJour(local: ProductionLocale, sentinelle: ResumeSentinelle | null, now: number): PlanDuJour {
  const choisi = choisirArticleAReviser(local.fiches, now) as Fiche | null;
  const lot = candidatsSeo(local.fiches, now) as { slug: string; titre: string; defauts: string[] }[];
  const classes = classerDefauts(sentinelle?.defauts ?? []) as { depot: { area: string; msg: string }[]; horsDepot: unknown[]; autres: { area: string; msg: string }[] };
  const bilan = bilanIdees({ idees: local.rnd.idees }) as { total: number; parStatut: Record<string, number>; retenues: Idee[]; recentes: Idee[] };
  return {
    reviseur: choisi ? { slug: choisi.slug, titre: choisi.titre, updatedAt: choisi.updatedAt, revisionUsine: choisi.revisionUsine } : null,
    seo: lot,
    correcteur: { depot: classes.depot, horsDepot: classes.horsDepot.length, autres: classes.autres },
    rnd: { ...bilan, erreurs: local.rnd.erreurs },
  };
}

/* ------------------------------------------------------------------ budget */

async function lireBudget(): Promise<{ budget: BudgetCmc; disponible: boolean }> {
  try {
    const [bilan, trace] = await Promise.all([cmcBudgetReport(), lireTraceR1().catch(() => null)]);
    const frein = trace?.frein
      ? { etat: trace.frein, raison: trace.freinRaison ?? null, projectionPct: trace.projectionPct ?? null, dernierReleve: trace.at ?? null }
      : null;
    if (!bilan.lu) return { budget: { lu: false, raison: bilan.raison, frein }, disponible: false };
    return {
      budget: {
        lu: true,
        niveau: bilan.niveau,
        mode: bilan.mode,
        moisUtilises: bilan.moisUtilises,
        moisPlafond: bilan.moisPlafond,
        besoinFinDeMois: bilan.besoinFinDeMois,
        epuisementPrevu: bilan.epuisementPrevu,
        frein,
      },
      disponible: true,
    };
  } catch (e) {
    return { budget: { lu: false, raison: e instanceof Error ? e.message.slice(0, 120) : "lecture impossible", frein: null }, disponible: false };
  }
}

/* ------------------------------------------------------------------ état complet */

export async function lireEtatUsine(now: number = Date.now()): Promise<EtatUsine> {
  const [github, prs, kv, local, budget] = await Promise.all([lireRuns(), lirePrs(), lireTraces(), lireProductionLocale(now), lireBudget()]);
  const enDirect = github.disponible ? await lireAgentsEnDirect(github.runs) : [];
  const ctx = { runsParWorkflow: github.parWorkflow, traces: kv.traces, now, githubDisponible: github.disponible, kvDisponible: kv.disponible };
  const jugements = POSTES_USINE.map((p) => jugerPoste(p, ctx) as Jugement);
  const dernier = resumeSentinelle(kv.traces[CLES_KV_USINE.sentinelleDernier]);
  const complet = resumeSentinelle(kv.traces[CLES_KV_USINE.sentinelleComplet]);
  const verdict = verdictGlobal(jugements, dernier) as Verdict;
  const chaine = chaineDuJour(POSTES_USINE, ctx) as { lignes: LigneChaine[]; continus: Poste[] };
  const production = compterProduction(
    {
      actus: local.actus,
      analyses: local.analyses.map((a) => a.calculeeLe).filter((d): d is string => !!d),
      articles: local.articles,
      corrections: local.corrections,
      prs: prs.fusionnees.map((p) => p.fusionneLe).filter((d): d is string => !!d),
    },
    now,
    14,
  ) as Production;
  const derniereActu = local.actus.length ? [...local.actus].sort().pop() ?? null : null;
  const compteurs: Record<string, number | string> = {};
  for (const [k, v] of Object.entries(siteCounts as Record<string, unknown>)) {
    if (k.startsWith("_")) continue;
    if (typeof v === "number" || typeof v === "string") compteurs[k] = v;
  }
  return {
    genereLe: new Date(now).toISOString(),
    sources: { github: github.disponible, kv: kv.disponible, cmc: budget.disponible, jetonGardien: Boolean(process.env.GITHUB_GARDIEN_TOKEN) },
    ateliers: [...ATELIERS_USINE],
    missions: [...MISSIONS_USINE],
    jugements,
    verdict,
    chaine,
    production,
    analyses: local.analyses,
    derniereActu,
    compteurs,
    micaControle: typeof (micaAuto as { controle?: unknown }).controle === "string" ? (micaAuto as { controle: string }).controle : null,
    sentinelle: { dernier, complet },
    budget: budget.budget,
    prs,
    enDirect,
    plan: planDuJour(local, dernier, now),
    gardeFou: traceGardeFou(kv.traces["usine:garde-fou:dernier"]),
    journal: github.runs.slice(0, 40),
  };
}
