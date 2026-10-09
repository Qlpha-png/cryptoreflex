#!/usr/bin/env node
/**
 * scripts/usine-plan.mjs — écrit le PLAN DU JOUR d'une mission de l'Usine (09/10/2026) : usine/.sortie/plan.md, lu par
 * l'agent avant tout travail. Déterministe : la cible vient des fichiers du dépôt (scripts/lib/usine-plan.mjs), pas de
 * l'agent. Pour le correcteur, rejoue le contrôle léger de la sentinelle ici (sortie : un décompte), et ne met dans le
 * plan que les défauts qui relèvent du dépôt — jamais les chiffres d'infrastructure (dépôt public = journaux publics).
 *
 * Usage : node scripts/usine-plan.mjs --mission=<reviseur|correcteur|seo|auditeur|chercheur|prototypeur> [--cible=…]
 *         [--sortie=usine/.sortie/plan.md] [--json]
 * Sorties GitHub (GITHUB_OUTPUT) : cible, titre.
 */
import { spawnSync } from "node:child_process";
import { appendFileSync, existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { classerDefauts, ficheArticle, lireRapportSentinelle, planifier } from "./lib/usine-plan.mjs";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const arg = (n) => process.argv.find((a) => a.startsWith(`--${n}=`))?.slice(n.length + 3);
const MISSION = arg("mission") || "";
const CIBLE = arg("cible") || "";
const SORTIE = arg("sortie") || "usine/.sortie/plan.md";
const JSON_OUT = process.argv.includes("--json");
const SITE = process.env.SENTINELLE_SITE || "https://www.cryptoreflex.fr";
const now = Date.now();

if (!MISSION) {
  console.error("usage : node scripts/usine-plan.mjs --mission=<mission> [--cible=…]");
  process.exit(2);
}

const lireFiches = () => {
  const dir = path.join(ROOT, "content", "articles");
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((f) => /\.mdx?$/.test(f))
    .map((f) => ficheArticle(f.replace(/\.mdx?$/, ""), readFileSync(path.join(dir, f), "utf8")));
};
const lireIdees = () => {
  try {
    return JSON.parse(readFileSync(path.join(ROOT, "usine", "rnd", "registre.json"), "utf8")).idees ?? [];
  } catch {
    return [];
  }
};
const lireRapports = () => {
  const dir = path.join(ROOT, "docs", "usine", "rapports");
  return existsSync(dir) ? readdirSync(dir).filter((f) => /^\d{4}-\d{2}-\d{2}-audit\.md$/.test(f)) : [];
};

const donnees = { cible: CIBLE };
if (MISSION === "reviseur" || MISSION === "seo") donnees.fiches = lireFiches();
if (MISSION === "auditeur") donnees.rapportsPrecedents = lireRapports();
if (MISSION === "chercheur" || MISSION === "prototypeur") donnees.idees = lireIdees();
if (MISSION === "correcteur") {
  // contrôle léger de la sentinelle : rapport dans le dossier de sortie (jamais commité), sortie standard = décompte
  mkdirSync(path.dirname(path.join(ROOT, SORTIE)), { recursive: true });
  const rapport = path.join(ROOT, path.dirname(SORTIE), "sentinelle-report.md");
  const r = spawnSync(process.execPath, ["scripts/sentinelle.mjs", `--site=${SITE}`], {
    cwd: ROOT,
    env: { ...process.env, SENTINELLE_REPORT: rapport },
    encoding: "utf8",
    timeout: 20 * 60_000,
  });
  if (r.stdout) process.stdout.write(`[sentinelle] ${r.stdout.trim()}\n`);
  const lignes = existsSync(rapport) ? lireRapportSentinelle(readFileSync(rapport, "utf8")) : [];
  const { depot, horsDepot, autres } = classerDefauts(lignes.filter((l) => l.niveau === "fail"));
  // les défauts hors dépôt (quota, robots, prix…) restent dans l'artefact : ils ne vont ni dans le plan ni dans la PR
  donnees.defauts = [...depot, ...autres];
  process.stdout.write(`[plan] défauts : ${depot.length} du dépôt, ${autres.length} à classer, ${horsDepot.length} hors dépôt (non transmis à l'agent)\n`);
}

const plan = planifier(MISSION, donnees, now);
const fichier = path.join(ROOT, SORTIE);
mkdirSync(path.dirname(fichier), { recursive: true });
writeFileSync(fichier, plan.lignes.join("\n") + "\n");
if (process.env.GITHUB_OUTPUT) {
  appendFileSync(process.env.GITHUB_OUTPUT, `cible=${(plan.cible ?? "").replace(/\n/g, " ")}\n`);
  appendFileSync(process.env.GITHUB_OUTPUT, `titre=${plan.titre.replace(/\n/g, " ").slice(0, 110)}\n`);
}
if (JSON_OUT) process.stdout.write(JSON.stringify({ mission: plan.mission, cible: plan.cible, titre: plan.titre, fichier: SORTIE }, null, 2) + "\n");
else process.stdout.write(`[plan] ${plan.titre} → ${SORTIE}\n`);
