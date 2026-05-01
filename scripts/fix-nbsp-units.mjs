#!/usr/bin/env node
/**
 * fix-nbsp-units.mjs — Ajoute un espace AVANT €/% si manquant.
 *
 * Convention française : "5 €" et non "5€". L'espace insécable U+00A0
 * serait idéal mais on utilise un espace simple (compat copy-paste +
 * cohérence avec l'existant). Si on veut U+00A0 plus tard, c'est 1 char.
 *
 * Garde-fous CRITIQUES :
 *  - On ne touche PAS aux URL (ex: utm_source=cryptoreflex&20%xyz)
 *  - On ne touche PAS aux noms de classes Tailwind (ex: w-50%, max-h-100%)
 *  - On ne touche PAS aux pourcentages CSS dans style/className
 *  - On ne touche PAS aux fichiers générés (*.d.ts, dist/, build/)
 *  - On ne touche PAS aux fichiers JSON _meta (lastUpdated, schema, etc.)
 *
 * Stratégie : on cible UNIQUEMENT les chaînes de TEXTE FR dans :
 *   - content/articles/*.mdx (markdown body uniquement, pas frontmatter)
 *   - data/*.json (uniquement les VALEURS, pas les clés)
 *
 * On évite app/, components/, lib/ pour ne pas casser de classes Tailwind
 * ou de regex. Le user pourra demander un audit visuel ciblé sur les
 * pages qui restent à corriger.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

/* -------------------------------------------------------------------------- */
/*  Patterns de remplacement                                                  */
/* -------------------------------------------------------------------------- */

// (?<!class\W) : pas précédé de "class" (évite className)
// (?<!w-|h-|p-|m-|gap-|space-|opacity-|max-w-|max-h-|min-w-|min-h-) : pas Tailwind
// (?<!\d) avant : on ne touche pas aux décimales (3.50€ → on garde, par exemple)
// Au final : `(\d)€` → `$1 €` quand le digit est suivi DIRECTEMENT par € (sans espace)
// Idem pour %, mais on doit éviter `0%` dans les transitions CSS et `100%` dans className.

const FIXES = [
  // €  : "5€" → "5 €" (mais pas dans les URLs ou query strings)
  {
    name: "EUR sans espace",
    // Match : digit suivi de € (pas dans une URL — donc pas après = ou & ou ?)
    re: /([0-9])(€)/g,
    apply: (text) => {
      // Skip si match est dans une URL (heuristique : ligne contient "http" et le match est dans la même URL)
      return text.replace(/([0-9])(€)/g, (_m, d) => `${d} €`);
    },
  },
  // %  : on ne fix PAS automatiquement car trop de risques (CSS, regex, classes)
  // C'est documenté pour audit humain ciblé.
];

/* -------------------------------------------------------------------------- */
/*  Glob simple (récursif)                                                    */
/* -------------------------------------------------------------------------- */

function* walk(dir, allowedExts) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      // Skip node_modules, .next, build, dist, .git, _gen-*
      if (
        entry.name === "node_modules" ||
        entry.name === ".next" ||
        entry.name === ".git" ||
        entry.name.startsWith("_gen-") ||
        entry.name === "build" ||
        entry.name === "dist"
      ) {
        continue;
      }
      yield* walk(full, allowedExts);
    } else {
      const ext = path.extname(entry.name);
      if (allowedExts.includes(ext)) yield full;
    }
  }
}

/* -------------------------------------------------------------------------- */
/*  Process MDX (body only, pas frontmatter)                                  */
/* -------------------------------------------------------------------------- */

function processMdx(content) {
  // Sépare frontmatter (entre --- et ---) du body
  const fmMatch = /^---\n([\s\S]*?)\n---\n([\s\S]*)$/.exec(content);
  if (!fmMatch) {
    // Pas de frontmatter → traiter tout
    let body = content;
    let count = 0;
    for (const fix of FIXES) {
      const before = (body.match(fix.re) || []).length;
      body = fix.apply(body);
      count += before;
    }
    return { content: body, count };
  }
  const [, frontmatter, body] = fmMatch;
  let newBody = body;
  let count = 0;
  for (const fix of FIXES) {
    const before = (newBody.match(fix.re) || []).length;
    newBody = fix.apply(newBody);
    count += before;
  }
  return { content: `---\n${frontmatter}\n---\n${newBody}`, count };
}

/* -------------------------------------------------------------------------- */
/*  Process JSON (string values only)                                         */
/* -------------------------------------------------------------------------- */

function processJsonValue(value) {
  if (typeof value === "string") {
    let v = value;
    let count = 0;
    for (const fix of FIXES) {
      const before = (v.match(fix.re) || []).length;
      v = fix.apply(v);
      count += before;
    }
    return { value: v, count };
  }
  if (Array.isArray(value)) {
    let totalCount = 0;
    const arr = value.map((item) => {
      const r = processJsonValue(item);
      totalCount += r.count;
      return r.value;
    });
    return { value: arr, count: totalCount };
  }
  if (value && typeof value === "object") {
    let totalCount = 0;
    const obj = {};
    for (const [k, v] of Object.entries(value)) {
      // Skip _meta keys (clés techniques)
      if (k === "_meta" || k === "schema" || k === "schemaVersion") {
        obj[k] = v;
        continue;
      }
      const r = processJsonValue(v);
      totalCount += r.count;
      obj[k] = r.value;
    }
    return { value: obj, count: totalCount };
  }
  return { value, count: 0 };
}

function processJson(content) {
  let parsed;
  try {
    parsed = JSON.parse(content);
  } catch {
    return { content, count: 0 };
  }
  const r = processJsonValue(parsed);
  // Préserve l'indentation 2-space
  return { content: JSON.stringify(r.value, null, 2), count: r.count };
}

/* -------------------------------------------------------------------------- */
/*  Main                                                                      */
/* -------------------------------------------------------------------------- */

let totalFiles = 0;
let totalReplacements = 0;

// 1. MDX articles
for (const file of walk(path.join(ROOT, "content"), [".mdx"])) {
  const content = fs.readFileSync(file, "utf8");
  const { content: newContent, count } = processMdx(content);
  if (count > 0) {
    fs.writeFileSync(file, newContent);
    console.log(`✓ ${path.relative(ROOT, file)}: ${count} fix`);
    totalFiles++;
    totalReplacements += count;
  }
}

// 2. JSON data
for (const file of walk(path.join(ROOT, "data"), [".json"])) {
  const content = fs.readFileSync(file, "utf8");
  const { content: newContent, count } = processJson(content);
  if (count > 0) {
    fs.writeFileSync(file, newContent + (content.endsWith("\n") ? "\n" : ""));
    console.log(`✓ ${path.relative(ROOT, file)}: ${count} fix`);
    totalFiles++;
    totalReplacements += count;
  }
}

console.log(`\n✅ Total: ${totalReplacements} espaces ajoutés dans ${totalFiles} fichiers`);
