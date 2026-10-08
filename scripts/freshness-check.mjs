#!/usr/bin/env node
/**
 * scripts/freshness-check.mjs
 *
 * Vérifie que le contenu auto-généré reste frais.
 *
 * Sans ce check, un échec silencieux du workflow daily-content peut passer
 * inaperçu pendant des jours -> chute de fraîcheur SEO + chute de trafic.
 *
 * Seuils :
 *   - news : ≥ 5 fichiers des 7 derniers jours (content/news, date ISO en préfixe du nom)
 *   - analyses techniques (lot L2 du 08/10/2026 : 5 pages vivantes, plus de fichiers datés) : chacun des 5 fichiers
 *     data/analyses-techniques/<slug>.json a un dernier calcul réussi (`latest.calculatedAt`) de moins de 48 h
 *     (règle d'alerte de fraîcheur : 2 jours sans calcul réussi pour une crypto).
 *
 * Usage :
 *   node scripts/freshness-check.mjs
 *
 * Exit codes :
 *   0 = OK
 *   1 = stale (au moins une catégorie sous le seuil)
 */

import { readdir, readFile } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const REPO_ROOT = join(__dirname, "..");

const NEWS = { path: join(REPO_ROOT, "content", "news"), threshold: 5, label: "news" };
const TA_DIR = join(REPO_ROOT, "data", "analyses-techniques");
const TA_SLUGS = ["bitcoin", "ethereum", "solana", "xrp", "cardano"];
const TA_MAX_AGE_H = 48;

const WINDOW_DAYS = 7;

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                   */
/* -------------------------------------------------------------------------- */

/**
 * Extrait la date ISO d'un nom de fichier `YYYY-MM-DD-slug.ext`.
 * @param {string} filename
 * @returns {Date|null}
 */
function parseDateFromFilename(filename) {
  const m = filename.match(/^(\d{4}-\d{2}-\d{2})-/);
  if (!m) return null;
  // On utilise UTC pour éviter les surprises de fuseau (les fichiers sont datés en UTC).
  const d = new Date(`${m[1]}T00:00:00Z`);
  if (isNaN(d.getTime())) return null;
  return d;
}

/**
 * @param {string} dirPath
 * @param {number} windowDays
 * @returns {Promise<{recent:string[], all:number, errored?:string}>}
 */
async function countRecentFiles(dirPath, windowDays) {
  let entries;
  try {
    entries = await readdir(dirPath);
  } catch (err) {
    return {
      recent: [],
      all: 0,
      errored: err instanceof Error ? err.message : String(err),
    };
  }
  const cutoffMs = Date.now() - windowDays * 24 * 60 * 60 * 1000;
  const recent = [];
  let all = 0;
  for (const f of entries) {
    if (!f.endsWith(".mdx") && !f.endsWith(".md")) continue;
    all++;
    const d = parseDateFromFilename(f);
    if (d && d.getTime() >= cutoffMs) {
      recent.push(f);
    }
  }
  return { recent, all };
}

/** Âge (h) du dernier calcul réussi de chaque analyse ; une crypto illisible ou trop ancienne est en faute. */
async function checkAnalyses() {
  const stale = [];
  const lines = [];
  for (const slug of TA_SLUGS) {
    try {
      const j = JSON.parse(await readFile(join(TA_DIR, `${slug}.json`), "utf8"));
      const t = Date.parse(j?.latest?.calculatedAt ?? "");
      const h = (Date.now() - t) / 3_600_000;
      const ok = Number.isFinite(h) && h <= TA_MAX_AGE_H;
      lines.push(`    - ${slug} : dernier calcul ${j?.latest?.calculatedAt ?? "absent"} (${Number.isFinite(h) ? Math.round(h) + " h" : "?"}) ${ok ? "OK" : "STALE"}`);
      if (!ok) stale.push(slug);
    } catch (err) {
      lines.push(`    - ${slug} : fichier illisible (${err instanceof Error ? err.message : String(err)})`);
      stale.push(slug);
    }
  }
  return { stale, lines };
}

/* -------------------------------------------------------------------------- */
/*  Main                                                                      */
/* -------------------------------------------------------------------------- */

async function main() {
  console.log(`[freshness] Starting freshness-check at ${new Date().toISOString()}`);
  console.log(`[freshness] Window: ${WINDOW_DAYS} days`);
  console.log("---");

  const failures = [];

  const { recent, all, errored } = await countRecentFiles(NEWS.path, WINDOW_DAYS);
  const newsOk = !errored && recent.length >= NEWS.threshold;
  console.log(
    `[freshness-${NEWS.label}] path=${NEWS.path} recent=${recent.length} threshold=${NEWS.threshold} totalFiles=${all} ok=${newsOk}` +
      (errored ? ` errored="${errored}"` : ""),
  );
  for (const f of recent.slice().sort()) console.log(`    - ${f}`);
  if (!newsOk) {
    failures.push({
      label: NEWS.label,
      path: NEWS.path,
      recent: recent.length,
      threshold: NEWS.threshold,
      reason: errored ?? `only ${recent.length} files in last ${WINDOW_DAYS}d (need ≥ ${NEWS.threshold})`,
    });
  }

  const ta = await checkAnalyses();
  console.log(`[freshness-analyses-techniques] path=${TA_DIR} max=${TA_MAX_AGE_H}h stale=${ta.stale.length}`);
  for (const l of ta.lines) console.log(l);
  if (ta.stale.length) {
    failures.push({
      label: "analyses-techniques",
      path: TA_DIR,
      reason: `dernier calcul de plus de ${TA_MAX_AGE_H} h ou illisible : ${ta.stale.join(", ")}`,
    });
  }

  console.log("---");
  if (failures.length > 0) {
    console.log(`[freshness] FAILURES_JSON=${JSON.stringify(failures)}`);
    console.log(`[freshness] ${failures.length} category/categories STALE.`);
    process.exit(1);
  }

  console.log("[freshness] All categories fresh.");
  process.exit(0);
}

main().catch((err) => {
  console.error("[freshness] Unexpected fatal error:", err);
  process.exit(1);
});
