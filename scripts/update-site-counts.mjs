#!/usr/bin/env node
/**
 * scripts/update-site-counts.mjs — recompte les vrais chiffres du site et met à jour data/site-counts.json.
 *
 * Le calcul vit dans lib/site-counts-compute.ts (modules du site, alias « @/ ») ; il est exécuté par vitest
 * (tests/lib/site-counts.test.ts en mode UPDATE_SITE_COUNTS=1), qui résout ces chemins. Lancé chaque nuit
 * par la sentinelle (GitHub Actions), qui commite le fichier s'il a changé.
 * Usage : node scripts/update-site-counts.mjs
 */
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const r = spawnSync("npx", ["vitest", "run", "tests/lib/site-counts.test.ts"], {
  cwd: ROOT,
  env: { ...process.env, UPDATE_SITE_COUNTS: "1" },
  stdio: "inherit",
  shell: process.platform === "win32",
});
if (r.status !== 0) {
  console.error("[site-counts] échec du recomptage");
  process.exit(r.status ?? 1);
}
console.log(readFileSync(path.join(ROOT, "data", "site-counts.json"), "utf8"));
