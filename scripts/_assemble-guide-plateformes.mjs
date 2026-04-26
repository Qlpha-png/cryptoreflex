// scripts/_assemble-guide-plateformes.mjs
//
// Concatène les 2 parties de la "Bible Plateformes Crypto 2026" en un
// seul fichier source Markdown prêt pour pandoc/Playwright -> PDF.
//
// Source :
//   content/lead-magnets/guide-plateformes-crypto-2026-PART-A.md
//   content/lead-magnets/guide-plateformes-crypto-2026-PART-B.md
//
// Sortie :
//   content/lead-magnets/guide-plateformes-crypto-2026.md
//
// Usage : node scripts/_assemble-guide-plateformes.mjs

import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, "..");

const PART_A = path.join(ROOT, "content/lead-magnets/guide-plateformes-crypto-2026-PART-A.md");
const PART_B = path.join(ROOT, "content/lead-magnets/guide-plateformes-crypto-2026-PART-B.md");
const OUT = path.join(ROOT, "content/lead-magnets/guide-plateformes-crypto-2026.md");

const partA = readFileSync(PART_A, "utf-8").trimEnd();
const partB = readFileSync(PART_B, "utf-8").trimStart();

// Part B commence par "---\n\n## Chapitre 4 (suite)" — on retire la ligne ---
// initiale (qui serait interprétée comme un nouveau frontmatter par pandoc).
const partBCleaned = partB.replace(/^---\s*\n+/, "");

const assembled = partA + "\n\n" + partBCleaned + "\n";

writeFileSync(OUT, assembled, "utf-8");

const lineCount = assembled.split("\n").length;
const wordCount = assembled.split(/\s+/).filter(Boolean).length;
console.log(`Wrote ${OUT}`);
console.log(`  ${lineCount.toLocaleString()} lignes`);
console.log(`  ${wordCount.toLocaleString()} mots`);
console.log(`  ${Math.round(assembled.length / 1024)} KB`);
