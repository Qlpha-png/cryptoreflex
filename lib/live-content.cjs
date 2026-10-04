/**
 * lib/live-content.cjs — liste des actus et analyses techniques EN LIGNE, calculée à chaque build.
 *
 * Pourquoi (audit Google du 04/10/2026) : la Search Console voyait encore 78 anciennes adresses en 404
 * (actus et analyses de mai supprimées, hors de lib/news-removed-slugs.json). Une redirection posée dans
 * une page servie en cache répond 200 + meta refresh en production (ce n'est pas une redirection pour
 * Google) : il faut un vrai 308, donc le middleware. Le middleware (Edge) ne peut pas lire content/ :
 * next.config.js appelle ce module au build et lui transmet les listes via `env` (valeurs inlinées dans
 * le bundle). Chaque déploiement (dont ceux du robot d'actus) recalcule la liste : une actu publiée est
 * toujours dedans, une actu supprimée en sort et son adresse est redirigée automatiquement.
 *
 * Sécurité : le middleware ne redirige que des adresses DATÉES de plus de 3 jours absentes de la liste,
 * et ne fait rien si la liste est absente ou anormalement courte (voir middleware.ts).
 */

"use strict";

const fs = require("fs");
const path = require("path");

const SLUG_RE = /^[a-z0-9][a-z0-9-]*$/;

/** Slugs d'un dossier de contenu : nom de fichier + `slug:` du frontmatter s'il existe (les deux, par prudence). */
function liveSlugs(dir) {
  const abs = path.isAbsolute(dir) ? dir : path.join(__dirname, "..", dir);
  let files = [];
  try {
    files = fs.readdirSync(abs);
  } catch {
    return [];
  }
  const out = new Set();
  for (const f of files) {
    if (!/\.mdx?$/.test(f)) continue;
    const base = f.replace(/\.mdx?$/, "");
    if (SLUG_RE.test(base)) out.add(base);
    try {
      const head = fs.readFileSync(path.join(abs, f), "utf8").slice(0, 4000);
      const fm = head.startsWith("---") ? head.slice(3, head.indexOf("\n---", 3) > 0 ? head.indexOf("\n---", 3) : 4000) : "";
      const m = fm.match(/^slug:\s*["']?([^"'\r\n]+?)["']?\s*$/m);
      if (m && SLUG_RE.test(m[1].trim())) out.add(m[1].trim());
    } catch {
      /* fichier illisible : le nom de fichier suffit */
    }
  }
  return [...out].sort();
}

function liveContent() {
  return {
    news: liveSlugs("content/news"),
    ta: liveSlugs("content/analyses-tech"),
  };
}

module.exports = { liveSlugs, liveContent };
