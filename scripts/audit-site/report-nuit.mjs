#!/usr/bin/env node
/**
 * scripts/audit-site/report-nuit.mjs — rassemble les résultats de l'audit navigateur de nuit (tools.mjs, dropdowns.mjs,
 * browser.mjs, lancés contre la production par .github/workflows/audit-navigateur.yml) en un rapport Markdown.
 * Chaque défaut est une ligne « - ❌ [rubrique] … » (même format que la sentinelle). Code de sortie 1 s'il y en a.
 * Usage : node scripts/audit-site/report-nuit.mjs --dir=audit-nuit --out=audit-nuit-report.md
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const arg = (k, d) => (process.argv.find((a) => a.startsWith(`--${k}=`)) ?? `--${k}=${d}`).split("=").slice(1).join("=");
const DIR = arg("dir", "audit-nuit");
const OUT = arg("out", "audit-nuit-report.md");
const read = (f) => (existsSync(join(DIR, f)) ? JSON.parse(readFileSync(join(DIR, f), "utf8")) : null);

const lines = [];
const defects = [];
const add = (area, text) => defects.push(`- ❌ [${area}] ${text}`);

const tools = read("tools/resultats.json");
if (!tools) add("outils", "résultats absents (le script n'a pas tourné)");
else {
  const ko = tools.report.filter((r) => !r.ok);
  lines.push(`Parcours d'outils : ${tools.report.length - ko.length}/${tools.report.length} sans défaut.`);
  for (const r of ko) add("outils", `${r.name} — ${r.checks.filter((c) => !c.ok).map((c) => c.label).join(" ; ")}`);
}

const dd = read("dropdowns.json");
if (!dd) add("menus", "résultats absents");
else {
  lines.push(`Listes déroulantes : ${dd.opened} ouvertes sur ${dd.pages} pages.`);
  for (const p of dd.problems) add("menus", `${p.path} — « ${p.trigger} » : ${p.detail}`);
}

const br = read("browser/resultats.json");
if (!br) add("navigateur", "résultats absents");
else {
  lines.push(`Navigateur réel : ${br.results.length} passages (téléphone et ordinateur).`);
  // regroupe les problèmes identiques (même type + même détail) pour un rapport lisible
  const groups = new Map();
  for (const p of br.problems) {
    const k = `${p.type} — ${String(p.detail).slice(0, 140)}`;
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k).push(p.at);
  }
  for (const [k, ats] of groups) add("navigateur", `${k} (${ats.length} × ; ex. ${ats.slice(0, 2).join(", ")})`);
}

const report = [`## Audit navigateur de nuit — ${new Date().toISOString().slice(0, 10)}`, "", ...lines, "", defects.length ? "### Défauts" : "Aucun défaut.", ...defects.slice(0, 80)];
if (defects.length > 80) report.push(`… et ${defects.length - 80} autres (voir les fichiers de l'exécution).`);
writeFileSync(OUT, report.join("\n") + "\n");
console.log(report.join("\n"));
process.exit(defects.length ? 1 : 0);
