#!/usr/bin/env node
/**
 * scripts/usine-risque.mjs — classe la proposition INDEXÉE (git add) d'un agent : « auto » (fusion automatique possible)
 * ou « relecture » (Kevin relit). Règles : scripts/lib/usine-risque.mjs. Lit aussi la ligne « Risque : auto|relecture »
 * du résumé de l'agent (une demande de relecture est toujours respectée).
 *
 * Usage : node scripts/usine-risque.mjs [--mission=<m>] [--resume=usine/.sortie/resume.md] [--json]
 * Sorties GitHub (GITHUB_OUTPUT) : verdict, raisons, fichiers. Code de sortie : toujours 0 (le verdict est une donnée).
 */
import { execFileSync } from "node:child_process";
import { appendFileSync, existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { classerProposition } from "./lib/usine-risque.mjs";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const arg = (n) => process.argv.find((a) => a.startsWith(`--${n}=`))?.slice(n.length + 3);
const MISSION = arg("mission") || "";
const RESUME = arg("resume") || "usine/.sortie/resume.md";
const JSON_OUT = process.argv.includes("--json");
/** Missions dont la production est toujours relue (code, prototypes). */
const RELECTURE_OBLIGATOIRE = ["prototypeur"];

const git = (...a) => execFileSync("git", a, { cwd: ROOT, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
const fichiers = git("diff", "--staged", "--name-status", "-M")
  .split("\n")
  .filter(Boolean)
  .map((l) => {
    const [statut, ...reste] = l.split("\t");
    const chemin = reste[reste.length - 1];
    let patch = "";
    try {
      patch = git("diff", "--staged", "--", chemin);
    } catch {
      patch = "";
    }
    const abs = path.join(ROOT, chemin);
    const apres = statut[0] !== "D" && existsSync(abs) ? readFileSync(abs, "utf8") : "";
    return { chemin, statut: statut[0], patch, apres };
  });

let declaration = null;
if (existsSync(path.join(ROOT, RESUME))) {
  const m = /^Risque\s*:\s*(auto|relecture)/im.exec(readFileSync(path.join(ROOT, RESUME), "utf8"));
  if (m) declaration = m[1].toLowerCase();
}

const verdict = classerProposition(fichiers, { missionRelectureObligatoire: RELECTURE_OBLIGATOIRE.includes(MISSION), declaration });
if (process.env.GITHUB_OUTPUT) {
  appendFileSync(process.env.GITHUB_OUTPUT, `verdict=${verdict.verdict}\n`);
  appendFileSync(process.env.GITHUB_OUTPUT, `fichiers=${verdict.fichiers}\n`);
  appendFileSync(process.env.GITHUB_OUTPUT, `raisons=${verdict.raisons.join(" ; ").replace(/\n/g, " ").slice(0, 2000)}\n`);
}
if (JSON_OUT) process.stdout.write(JSON.stringify(verdict, null, 2) + "\n");
else {
  process.stdout.write(`[risque] ${verdict.verdict} (${verdict.fichiers} fichier(s))\n`);
  for (const r of verdict.raisons) process.stdout.write(`  - ${r}\n`);
}
