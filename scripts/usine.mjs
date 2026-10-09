#!/usr/bin/env node
/**
 * scripts/usine.mjs — L'Usine en ligne de commande (09/10/2026) : le même registre et la même logique que le tableau de
 * bord /admin/usine, pour Kevin et pour les agents locaux (Hermes, Claude) qui veulent savoir où en est la production.
 *
 * Usage : node scripts/usine.mjs [--json] [--jours=14] [--atelier=actualiser|entretenir|proteger|ameliorer]
 * Variables facultatives (sans elles, on fait avec ce qui est lisible) :
 *  - GITHUB_GARDIEN_TOKEN ou GITHUB_TOKEN : 5 000 lectures GitHub par heure au lieu de 60 (dépôt public) ;
 *  - KV_REST_API_URL / KV_REST_API_TOKEN : traces des tâches Vercel, demandes du Gardien, résumés de la sentinelle.
 * Aucun secret n'est affiché ; aucune écriture nulle part. Code de sortie : 0 (vert / orange), 1 (rouge).
 */
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ATELIERS, CLES_KV_USINE, POSTES, PREFIXE_BRANCHE_IA, workflowsDuRegistre } from "./lib/usine-registre.mjs";
import {
  STATUTS,
  chaineDuJour,
  compterProduction,
  dateFrontmatter,
  dateHeureParis,
  dateNomFichier,
  heureParis,
  jugerPoste,
  normaliserRun,
  regrouperRuns,
  verdictGlobal,
} from "./lib/usine-etat.mjs";
import { bilanIdees, candidatsSeo, choisirArticleAReviser, ficheArticle } from "./lib/usine-plan.mjs";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const DEPOT = "Qlpha-png/cryptoreflex";
const JSON_SORTIE = process.argv.includes("--json");
const JOURS = Number(process.argv.find((a) => a.startsWith("--jours="))?.slice(8) || 14) || 14;
const ATELIER = process.argv.find((a) => a.startsWith("--atelier="))?.slice(10) || null;
const now = Date.now();

/* ------------------------------------------------------------------ GitHub */
const jeton = process.env.GITHUB_GARDIEN_TOKEN || process.env.GITHUB_TOKEN || "";
const entetes = { Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28", "User-Agent": "cryptoreflex-usine-cli", ...(jeton ? { Authorization: `Bearer ${jeton}` } : {}) };
async function github(chemin) {
  try {
    const r = await fetch(`https://api.github.com/repos/${DEPOT}${chemin}`, { headers: entetes, signal: AbortSignal.timeout(15_000) });
    if (!r.ok) return null;
    return await r.json();
  } catch {
    return null;
  }
}
async function lireRuns() {
  const page = await github("/actions/runs?per_page=100");
  if (!page) return { runs: [], parWorkflow: new Map(), disponible: false };
  const runs = (page.workflow_runs ?? []).map(normaliserRun).filter(Boolean);
  const parWorkflow = regrouperRuns(runs);
  for (const w of workflowsDuRegistre().filter((x) => !parWorkflow.has(x))) {
    const extra = await github(`/actions/workflows/${encodeURIComponent(w)}/runs?per_page=3`);
    for (const raw of extra?.workflow_runs ?? []) {
      const r = normaliserRun(raw);
      if (!r) continue;
      if (!parWorkflow.has(r.workflow)) parWorkflow.set(r.workflow, []);
      parWorkflow.get(r.workflow).push(r);
      runs.push(r);
    }
  }
  for (const l of parWorkflow.values()) l.sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at));
  return { runs, parWorkflow, disponible: true };
}
async function lirePrs() {
  const [ouvertes, fermees] = await Promise.all([github("/pulls?state=open&per_page=50"), github("/pulls?state=closed&sort=updated&direction=desc&per_page=40")]);
  const usine = (p) => (p.head?.ref ?? "").startsWith(PREFIXE_BRANCHE_IA);
  return { ouvertes: (ouvertes ?? []).filter(usine), fusionnees: (fermees ?? []).filter((p) => usine(p) && p.merged_at) };
}

/* ------------------------------------------------------------------ KV */
async function lireTraces() {
  const url = process.env.KV_REST_API_URL?.replace(/\/$/, "");
  const token = process.env.KV_REST_API_TOKEN;
  if (!url || !token) return { traces: {}, disponible: false };
  const cles = [
    ...POSTES.map((p) => p.traceKv).filter(Boolean),
    ...POSTES.flatMap((p) => p.gardien ?? []).map((c) => `gardien:dernier:${c}`),
    CLES_KV_USINE.sentinelleDernier,
    CLES_KV_USINE.sentinelleComplet,
  ];
  try {
    const r = await fetch(url, { method: "POST", headers: { Authorization: `Bearer ${token}`, "content-type": "application/json" }, body: JSON.stringify(["MGET", ...cles]), signal: AbortSignal.timeout(10_000) });
    const j = await r.json();
    if (!r.ok || j.error || !Array.isArray(j.result)) return { traces: {}, disponible: false };
    const traces = {};
    cles.forEach((k, i) => {
      const v = j.result[i];
      if (v == null) return;
      try {
        traces[k] = typeof v === "string" ? JSON.parse(v) : v;
      } catch {
        traces[k] = v;
      }
    });
    return { traces, disponible: true };
  } catch {
    return { traces: {}, disponible: false };
  }
}

/* ------------------------------------------------------------------ fichiers */
function lireLocal() {
  const lister = (d) => {
    try {
      return readdirSync(path.join(ROOT, d));
    } catch {
      return [];
    }
  };
  const actus = lister("content/news").map(dateNomFichier).filter(Boolean);
  const fiches = lister("content/articles")
    .filter((f) => /\.mdx?$/.test(f))
    .map((f) => ficheArticle(f.replace(/\.mdx?$/, ""), readFileSync(path.join(ROOT, "content/articles", f), "utf8")));
  const articles = fiches.map((f) => f.date ?? dateFrontmatter("")).filter(Boolean);
  let idees = [];
  try {
    idees = JSON.parse(readFileSync(path.join(ROOT, "usine/rnd/registre.json"), "utf8")).idees ?? [];
  } catch {
    /* registre absent */
  }
  const analyses = lister("data/analyses-techniques")
    .filter((f) => f.endsWith(".json"))
    .map((f) => {
      try {
        const j = JSON.parse(readFileSync(path.join(ROOT, "data/analyses-techniques", f), "utf8"));
        return { slug: j.slug ?? f.replace(/\.json$/, ""), calculeeLe: j.latest?.calculatedAt ?? null };
      } catch {
        return { slug: f, calculeeLe: null };
      }
    });
  let corrections = [];
  try {
    corrections = (JSON.parse(readFileSync(path.join(ROOT, "data/corrections.json"), "utf8")).corrections ?? []).map((c) => c.date).filter(Boolean);
  } catch {
    /* journal absent */
  }
  return { actus, articles, fiches, idees, analyses, corrections };
}

/* ------------------------------------------------------------------ exécution */
const [gh, prs, kv] = await Promise.all([lireRuns(), lirePrs(), lireTraces()]);
const local = lireLocal();
const ctx = { runsParWorkflow: gh.parWorkflow, traces: kv.traces, now, githubDisponible: gh.disponible, kvDisponible: kv.disponible };
const postes = ATELIER ? POSTES.filter((p) => p.atelier === ATELIER) : POSTES;
const juges = postes.map((p) => jugerPoste(p, ctx));
const sentinelle = kv.traces[CLES_KV_USINE.sentinelleDernier] ?? null;
const verdict = verdictGlobal(juges, sentinelle);
const chaine = chaineDuJour(postes, ctx);
const production = compterProduction(
  { actus: local.actus, analyses: local.analyses.map((a) => a.calculeeLe).filter(Boolean), articles: local.articles, corrections: local.corrections, prs: prs.fusionnees.map((p) => p.merged_at) },
  now,
  JOURS,
);

if (JSON_SORTIE) {
  const sortie = {
    genereLe: new Date(now).toISOString(),
    sources: { github: gh.disponible, kv: kv.disponible },
    verdict,
    postes: juges.map((j) => ({ id: j.poste.id, atelier: j.poste.atelier, genre: j.poste.genre, statut: j.statut, raison: j.raison, dernier: j.dernier?.html_url ?? j.dernier?.at ?? null })),
    chaine: chaine.lignes,
    production,
    prs: { ouvertes: prs.ouvertes.map((p) => ({ numero: p.number, titre: p.title, url: p.html_url })), fusionnees: prs.fusionnees.map((p) => ({ numero: p.number, titre: p.title, url: p.html_url, le: p.merged_at })) },
    sentinelle: sentinelle ? { at: sentinelle.at, full: sentinelle.full, fails: sentinelle.fails, warns: sentinelle.warns, oks: sentinelle.oks } : null,
  };
  process.stdout.write(JSON.stringify(sortie, null, 2) + "\n");
  process.exit(verdict.niveau === "rouge" ? 1 : 0);
}

const feu = { vert: "🟢", orange: "🟠", rouge: "🔴" }[verdict.niveau];
const lignes = [];
lignes.push(`🏭 L'Usine Cryptoreflex — ${dateHeureParis(now)} (Paris)`);
lignes.push(`${feu} ${verdict.resume}.`);
lignes.push(`Sources : GitHub ${gh.disponible ? "✓" : "✗ (indisponible)"} · KV ${kv.disponible ? "✓" : "✗ (KV_REST_API_URL/TOKEN absents)"}${jeton ? "" : " · lecture GitHub anonyme (60/h)"}`);
if (sentinelle) lignes.push(`Sentinelle (${sentinelle.full ? "complet" : "léger"}, ${dateHeureParis(sentinelle.at)}) : ${sentinelle.fails} défaut(s), ${sentinelle.warns} à surveiller, ${sentinelle.oks} réussis.`);
lignes.push("");
for (const a of ATELIERS) {
  const js = juges.filter((j) => j.poste.atelier === a.id);
  if (!js.length) continue;
  lignes.push(`── ${a.nom.toUpperCase()} ──`);
  for (const j of js) {
    const s = STATUTS[j.statut] ?? STATUTS.inconnu;
    const quand = j.dernier?.created_at ? ` [${dateHeureParis(j.dernier.created_at)}]` : j.dernier?.at ? ` [${dateHeureParis(j.dernier.at)}]` : "";
    lignes.push(`  ${s.icone} ${j.poste.nom.padEnd(42)} ${s.libelle.padEnd(20)} ${j.raison}${quand}`);
  }
  lignes.push("");
}
lignes.push("── CHAÎNE DU JOUR (Paris) ──");
const ETATS = { fait: "✅ fait", echec: "❌ échec", "en-cours": "⏳ en cours", attendu: "· attendu", manque: "⚠️ manqué", veille: "💤 veille", inconnu: "❔ non lu" };
for (const l of chaine.lignes) lignes.push(`  ${heureParis(l.heure)}  ${(ETATS[l.etat] ?? l.etat).padEnd(12)} ${l.nom}`);
if (chaine.continus.length) lignes.push(`  en continu : ${chaine.continus.map((p) => p.nom).join(", ")}`);
lignes.push("");
lignes.push(`── PRODUCTION (${JOURS} jours, jours UTC) ──`);
lignes.push("  jour        actus  analyses  articles  corrections  PR IA");
for (const l of production.parJour) lignes.push(`  ${l.jour}  ${String(l.actus).padStart(5)}  ${String(l.analyses).padStart(8)}  ${String(l.articles).padStart(8)}  ${String(l.corrections).padStart(11)}  ${String(l.prs).padStart(5)}`);
const t = production.totaux;
lignes.push(`  7 j : ${t.j7.actus} actus, ${t.j7.analyses} analyses, ${t.j7.articles} articles, ${t.j7.corrections} corrections, ${t.j7.prs} PR IA · 30 j : ${t.j30.actus} actus, ${t.j30.analyses} analyses, ${t.j30.articles} articles`);
lignes.push("");
lignes.push("── PLAN DU JOUR (calculé par le dépôt) ──");
const aReviser = choisirArticleAReviser(local.fiches, now);
lignes.push(`  réviseur : ${aReviser ? `${aReviser.slug} (mis à jour le ${aReviser.updatedAt ?? "?"}${aReviser.revisionUsine ? `, relu le ${aReviser.revisionUsine}` : ", jamais relu par l'Usine"})` : "aucun article candidat"}`);
const lotSeo = candidatsSeo(local.fiches, now);
lignes.push(`  SEO : ${lotSeo.length} page(s)${lotSeo.length ? ` — ${lotSeo.slice(0, 4).map((p) => p.slug).join(", ")}${lotSeo.length > 4 ? "…" : ""}` : ""}`);
const rnd = bilanIdees({ idees: local.idees });
lignes.push(`  R&D : ${rnd.total} idée(s) — ${Object.entries(rnd.parStatut).map(([s, n]) => `${n} ${s}`).join(", ")}`);
lignes.push("");
lignes.push(`── PROPOSITIONS DES AGENTS ── ${prs.ouvertes.length} à décider (${prs.ouvertes.filter((p) => /\[prête\]/i.test(p.title)).length} prête(s)), ${prs.fusionnees.length} fusionnée(s) récemment`);
for (const p of prs.ouvertes) lignes.push(`  📬 #${p.number} ${p.title} — ${p.html_url}`);
for (const p of prs.fusionnees.slice(0, 5)) lignes.push(`  ✔ #${p.number} ${p.title} (${dateHeureParis(p.merged_at)})`);
process.stdout.write(lignes.join("\n") + "\n");
process.exit(verdict.niveau === "rouge" ? 1 : 0);
