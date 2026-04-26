#!/usr/bin/env node
/**
 * scripts/_clean-pdf-tech-leaks.mjs
 *
 * Nettoie les fuites techniques (chemins de fichiers, noms de scripts,
 * jargon dev) dans les 2 sources Markdown du lead magnet "11 plateformes",
 * puis re-assemble. À la suite : relancer build-lead-magnets.mjs pour
 * regénérer le PDF.
 *
 * Pourquoi : feedback utilisateur 26/04/2026 "sur le site et pdf beaucoup
 * de truc comme ça qui veulent pas dire grand chose" + screenshot pointant
 * `data/platforms.json` dans le contenu utilisateur.
 *
 * Usage : node scripts/_clean-pdf-tech-leaks.mjs
 */

import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const TARGETS = [
  "content/lead-magnets/guide-plateformes-crypto-2026-PART-A.md",
  "content/lead-magnets/guide-plateformes-crypto-2026-PART-B.md",
];

// Liste des replacements (regex -> remplacement). Ordre important : les
// plus spécifiques d'abord pour éviter les conflits.
const REPLACEMENTS = [
  // Lignes "Source des données :" entièrement supprimées (internal trace)
  [/\*\*Source des données :\*\*[^\n]*\n?/g, ""],
  [/\(source\s*:\s*`?data\/platforms\.json`?,?\s*formule\s*`?lib\/scoring\.ts`?\)/gi, ""],
  [/\(source\s*:\s*`?app\/methodologie\/page\.tsx`?,\s*`?lib\/scoring\.ts`?\)/gi, ""],
  [/\(source\s*:\s*`?data\/platforms\.json`?,?\s*`?lastIncident:\s*null`?\)/gi, "(aucun)"],
  [/\(source\s*:\s*`?data\/platforms\.json`?\)/gi, ""],
  [/,?\s*source\s*:\s*`?data\/platforms\.json`?/gi, ""],
  [/`?lastUpdated\s+\d{4}-\d{2}-\d{2}`?/g, ""],
  [/,?\s*id\s*`?[a-z-]+`?,\s*lastUpdated\s+\d{4}-\d{2}-\d{2}\.?/gi, "."],

  // Refs de fichiers / dossiers code
  [/`data\/platforms\.json`/g, "notre base de données"],
  [/`lib\/scoring\.ts`/g, "notre formule de calcul"],
  [/`scripts\/compute-platform-scores\.mjs`/g, "notre script de recalcul automatique"],
  [/`app\/methodologie\/page\.tsx`/g, "notre page Méthodologie"],
  [/`tests\/[^`]+`/g, "notre suite de tests"],

  // Constantes / variables code
  [/,?\s*constante\s*`SCORING_WEIGHTS`/g, ""],
  [/`SCORING_WEIGHTS`/g, "les pondérations officielles"],
  [/`micaCompliant`\s*=?\s*`?true`?/g, "MiCA-compliant"],
  [/`atRiskJuly2026`\s*=?\s*`?(true|false)`?/g, "non concernée par le retrait de juillet 2026"],

  // Jargon dev → langue lecteur
  [/code TypeScript/gi, "code source"],
  [/le code TypeScript/gi, "ce calcul"],
  [/lève une erreur en CI/gi, "déclenche une alerte automatique"],
  [/dérive de plus de 0,05 point/gi, "ne correspond pas à la formule à 0,05 point près"],
  [/score stocké dans le JSON/gi, "score affiché"],
  [/du JSON/gi, "des données"],
  [/le JSON/gi, "les données"],

  // Fragments orphelins après nettoyage
  [/Voir la fiche complète sur cryptoreflex\.fr\/avis\/[a-z-]+/g, "Voir la fiche détaillée et toujours à jour sur cryptoreflex.fr"],

  // Espaces multiples créés par les suppressions
  [/  +/g, " "],
  [/\n{3,}/g, "\n\n"],
  // Lignes ne contenant que ponctuation orpheline ("." ou ".") après nettoyage
  [/^\s*\.\s*$/gm, ""],
];

function clean(src) {
  let out = src;
  for (const [re, repl] of REPLACEMENTS) {
    out = out.replace(re, repl);
  }
  return out;
}

let totalReplacements = 0;
for (const rel of TARGETS) {
  const fullPath = path.join(ROOT, rel);
  const src = readFileSync(fullPath, "utf-8");
  const out = clean(src);
  if (out !== src) {
    writeFileSync(fullPath, out, "utf-8");
    const delta = src.length - out.length;
    totalReplacements++;
    console.log(`OK ${rel} — ${delta} chars enlevés`);
  } else {
    console.log(`-- ${rel} — aucun changement`);
  }
}

console.log(`\n${totalReplacements}/${TARGETS.length} fichiers nettoyés.`);
console.log(`\nÉtape suivante :`);
console.log(`  node scripts/_assemble-guide-plateformes.mjs`);
console.log(`  node scripts/build-lead-magnets.mjs guide-plateformes-crypto-2026`);
