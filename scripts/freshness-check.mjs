#!/usr/bin/env node
/**
 * scripts/freshness-check.mjs
 *
 * Vérifie que le contenu auto-généré (news + analyses-tech) reste frais.
 *
 * Sans ce check, un échec silencieux du workflow daily-content peut passer
 * inaperçu pendant des jours -> chute de fraîcheur SEO + chute de trafic.
 *
 * Threshold (FRESHNESS_THRESHOLDS) :
 *   - news : ≥ 5 fichiers des 7 derniers jours
 *   - analyses-tech : ≥ 5 fichiers des 7 derniers jours
 *
 * Convention de nommage : `YYYY-MM-DD-slug.mdx` (date ISO en préfixe).
 *
 * Usage :
 *   node scripts/freshness-check.mjs
 *
 * Exit codes :
 *   0 = OK
 *   1 = stale (au moins une catégorie sous le seuil)
 */

import { readdir } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const REPO_ROOT = join(__dirname, "..");

/** @type {Record<string,{path:string, threshold:number, label:string}>} */
const FRESHNESS_THRESHOLDS = {
  news: {
    path: join(REPO_ROOT, "content", "news"),
    threshold: 5,
    label: "news",
  },
  analysesTech: {
    path: join(REPO_ROOT, "content", "analyses-tech"),
    threshold: 5,
    label: "analyses-tech",
  },
};

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

/* -------------------------------------------------------------------------- */
/*  Main                                                                      */
/* -------------------------------------------------------------------------- */

async function main() {
  console.log(`[freshness] Starting freshness-check at ${new Date().toISOString()}`);
  console.log(`[freshness] Window: ${WINDOW_DAYS} days`);
  console.log("---");

  const failures = [];
  const summaries = [];

  for (const [_key, cfg] of Object.entries(FRESHNESS_THRESHOLDS)) {
    const { recent, all, errored } = await countRecentFiles(cfg.path, WINDOW_DAYS);
    const ok = !errored && recent.length >= cfg.threshold;
    console.log(
      `[freshness-${cfg.label}] path=${cfg.path} recent=${recent.length} threshold=${cfg.threshold} totalFiles=${all} ok=${ok}` +
        (errored ? ` errored="${errored}"` : "")
    );
    if (recent.length > 0) {
      console.log(`[freshness-${cfg.label}] recent files (last ${WINDOW_DAYS}d):`);
      for (const f of recent.slice().sort()) {
        console.log(`    - ${f}`);
      }
    }
    summaries.push({ label: cfg.label, recent: recent.length, threshold: cfg.threshold, total: all, ok });
    if (!ok) {
      failures.push({
        label: cfg.label,
        path: cfg.path,
        recent: recent.length,
        threshold: cfg.threshold,
        reason: errored ?? `only ${recent.length} files in last ${WINDOW_DAYS}d (need ≥ ${cfg.threshold})`,
      });
    }
  }

  console.log("---");
  console.log(`[freshness] Summary:`);
  for (const s of summaries) {
    console.log(`  - ${s.label}: ${s.recent}/${s.threshold} (${s.ok ? "OK" : "STALE"}) — total ${s.total} files`);
  }

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
