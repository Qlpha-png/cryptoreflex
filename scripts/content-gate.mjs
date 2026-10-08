#!/usr/bin/env node
/**
 * scripts/content-gate.mjs — contrôle des contenus générés AVANT publication (actus du robot quotidien ; échec si une
 * analyse technique datée réapparaît dans content/analyses-tech/, voir étape 0).
 *
 * Audit du 05/10/2026 : le garde-fou fiscal (scripts/audit-quality.mjs --fiscal-only) bloquait TOUTE la publication du jour dès
 * qu'UN article généré contenait une formulation fiscale à risque (y compris un faux positif) : 0 actu publiée jusqu'à
 * l'intervention de la routine du matin, qui ne tourne que si l'ordinateur de Kev est allumé. Désormais :
 *   1. les décimales à l'anglaise des NOUVEAUX articles sont mises au format français (« 2.5 % » → « 2,5 % ») ;
 *   2. le garde-fou fiscal est lancé ; un NOUVEL article fautif est écarté (fichier et image supprimés), les autres partent ;
 *   3. si un article DÉJÀ publié est en faute, ou si l'écart ne suffit pas, l'étape échoue (blocage, comme avant).
 * Sortie GitHub : dropped=<nombre>, dropped_list=<fichiers>, fixed=<nombre de fichiers reformatés>.
 *
 * Usage : node scripts/content-gate.mjs [--dirs=content/articles]   (défaut : actus et leurs images)
 */
import { spawnSync, execSync } from "node:child_process";
import { readFileSync, writeFileSync, existsSync, unlinkSync, appendFileSync, readdirSync } from "node:fs";

const DIRS = (process.argv.find((a) => a.startsWith("--dirs="))?.slice(7).split(",").filter(Boolean)) || ["content/news", "public/news-covers"];
const out = (k, v) => { if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `${k}=${v}\n`); };

/* ---------- 0. plus AUCUNE analyse technique datée (lot L1 du regroupement, 08/10/2026) ----------
   Les analyses sont 5 pages vivantes (data/analyses-techniques/*.json) ; les 368 anciennes adresses datées répondent
   301. Un fichier qui réapparaîtrait dans content/analyses-tech/ (ancien robot réactivé, script oublié) recréerait une
   page datée par jour : blocage avant tout commit. */
const TA_DATEES = "content/analyses-tech";
const reapparues = existsSync(TA_DATEES) ? readdirSync(TA_DATEES).filter((f) => !f.startsWith(".")) : [];
if (reapparues.length) {
  console.error(`✗ ${reapparues.length} fichier(s) dans ${TA_DATEES}/ (${reapparues.slice(0, 5).join(", ")}) : les analyses datées sont supprimées depuis le 08/10/2026 → publication bloquée.`);
  out("dropped", 0);
  process.exit(1);
}

/* fichiers nouveaux (non suivis) écrits par le générateur */
const newFiles = () =>
  execSync(`git status --porcelain --untracked-files=all -- ${DIRS.join(" ")}`, { encoding: "utf8" })
    .split("\n").filter((l) => l.startsWith("?? ")).map((l) => l.slice(3).trim().replace(/^"|"$/g, ""));

/* ---------- 1. décimales au format français (même règle que lib/fr-accents.ts corrigerDecimales) ---------- */
const UNIT = String.raw`\s?(?:%|×|x\b|\/\s?\d|€|\$|M\$|Mds?\b|Mrds?\b|[MkKB]\b|Bn\b|minutes?\b|min\b|secondes?\b|s\b|ans?\b|années?\b|jours?\b|j\b|h\b|heures?\b|fois\b|ms\b|gwei\b|sats?\b|[A-Z]{2,6}\b)`;
const RE_DEC = new RegExp(
  String.raw`(?<![\p{L}\d.,_/])(?<!(?:Web|web|version|Version|DeFi|GameFi|Ethereum|Bitcoin|Uniswap|ERC|BEP)\s?)(?:(?<=\$)(\d+)\.(\d+)(?!\.\d)|(\d+)\.(\d+)(?!\.\d)(?=${UNIT}))`,
  "gu",
);
const frDecimals = (t) => t.replace(RE_DEC, (_m, a, b, c, d) => (a !== undefined ? `${a},${b}` : `${c},${d}`));
let fixed = 0;
for (const f of newFiles().filter((f) => /\.mdx?$/.test(f))) {
  const src = readFileSync(f, "utf8");
  const m = /^---\n[\s\S]*?\n---\n/.exec(src); // l'en-tête (prix, RSI…) reste en nombres JSON
  const head = m ? m[0] : "", body = src.slice(head.length);
  // les liens et le code ne sont pas touchés : on ne convertit que hors (…) d'un lien markdown et hors `code`
  const conv = body.replace(/(`[^`]*`|\]\([^)]*\))|([^`\]]+)/g, (all, keep, text) => (keep ? keep : frDecimals(text)));
  if (conv !== body) { writeFileSync(f, head + conv); fixed++; console.log(`[format] décimales françaises : ${f}`); }
}
out("fixed", fixed);

/* ---------- 2. garde-fou fiscal, avec écart des nouveaux articles fautifs ---------- */
const audit = () => {
  const r = spawnSync(process.execPath, ["scripts/audit-quality.mjs", "--fiscal-only", "--json"], { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
  try { return JSON.parse(r.stdout).errors ?? []; } catch { console.error(r.stdout, r.stderr); throw new Error("sortie du garde-fou illisible"); }
};
let errors = audit();
const dropped = [];
if (errors.length) {
  const fresh = new Set(newFiles());
  const bad = [...new Set(errors.map((e) => e.path))];
  const old = bad.filter((p) => !fresh.has(p));
  for (const e of errors) console.log(`✗ [${e.rule ?? e.id}] ${e.path} — ${e.label ?? ""}`);
  if (old.length) {
    console.error(`\nArticle(s) DÉJÀ publié(s) en faute : ${old.join(", ")} → publication bloquée (à corriger à la main).`);
    out("dropped", 0);
    process.exit(1);
  }
  for (const p of bad) {
    const src = readFileSync(p, "utf8");
    const img = /^image:\s*"?(\/news-covers\/[^"\n]+)"?/m.exec(src)?.[1];
    unlinkSync(p);
    if (img && existsSync("public" + img)) unlinkSync("public" + img);
    dropped.push(p);
    console.log(`[écarté] ${p}${img ? " (+ image)" : ""}`);
  }
  errors = audit();
  if (errors.length) {
    console.error("Le garde-fou échoue encore après l'écart des nouveaux articles fautifs → publication bloquée.");
    out("dropped", dropped.length);
    process.exit(1);
  }
}
out("dropped", dropped.length);
out("dropped_list", dropped.join(" "));
console.log(`\n✓ contrôle des contenus : ${fixed} fichier(s) reformaté(s), ${dropped.length} article(s) écarté(s) par le garde-fou fiscal.`);
