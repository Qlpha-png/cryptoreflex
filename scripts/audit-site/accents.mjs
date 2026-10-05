#!/usr/bin/env node
/**
 * scripts/audit-site/accents.mjs — mots français écrits sans accent dans les TEXTES AFFICHÉS (chaînes et texte JSX
 * des pages et composants ; commentaires exclus). Exemple relevé le 05/10/2026 : « 779 cryptos analysees ».
 * Usage : node scripts/audit-site/accents.mjs  (sortie : fichier:ligne — mot — extrait)
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = new URL("../../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
// mots fréquents dont la forme sans accent n'existe pas en français (ou presque jamais dans un texte du site)
const WORDS = [
  "analysees", "analyses?e", "editoriale", "editoriales", "editorial", "categorie", "categories", "donnees", "donnee",
  "verifie", "verifiee", "verifiees", "verifier", "verification", "detaille", "detaillee", "methode",
  "methodologie", "strategie", "strategies", "securite", "securise", "securisee", "telecharger", "telechargement", "reponse",
  "reponses", "deja", "apres", "tres", "etre", "fevrier", "aout", "decembre", "regle", "regles", "regulation", "periode",
  "premiere", "derniere", "deuxieme", "troisieme", "interet", "interets", "frequence", "experience", "reference",
  "references", "evenement", "evenements", "depot", "depots", "elevee", "eleves", "reel", "reelle", "reels",
  "reelles", "creer", "cree", "creee", "generer", "genere", "generee", "fiscalite", "legal(?:e|es)?ment",
  "francaise", "francaises", "economie", "economies", "selectionne", "selectionnee", "selection(?:ne|nee)s?", "etape",
  "etapes", "equipe", "equipes", "acceder", "accede", "succes", "proteger", "protege", "risquee", "eviter", "evite",
  "repondre", "precise", "precision", "prealable", "complete", "completee", "mis a jour", "a jour", "a la",
  "agreee", "agreees", "agree", "deconnexion", "connectee", "televerser", "recu", "recus", "recue",
];
const RE = new RegExp(`(?<![\\p{L}\\-/_.])(${WORDS.join("|")})(?![\\p{L}\\-_])`, "giu");

const files = [];
const walk = (d) => {
  for (const e of readdirSync(d)) {
    const p = join(d, e);
    if (e === "node_modules" || e.startsWith(".")) continue;
    if (statSync(p).isDirectory()) {
      if (e === "api") continue;
      walk(p);
    } else if (/\.tsx$/.test(e)) files.push(p);
  }
};
walk(join(ROOT, "app"));
walk(join(ROOT, "components"));

const hits = [];
for (const f of files) {
  let src = readFileSync(f, "utf8");
  // retire commentaires (bloc, ligne, JSX) en gardant les sauts de ligne pour les numéros
  src = src
    .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, " "))
    .replace(/(^|[^:"'`\\])\/\/[^\n]*/g, (m, a) => a + " ".repeat(m.length - a.length));
  const lines = src.split("\n");
  lines.forEach((line, i) => {
    // ne regarder que les chaînes ("…", '…', `…`) et le texte entre balises
    const texts = [...line.matchAll(/"([^"\n]{3,})"|'([^'\n]{3,})'|`([^`\n]{3,})`|>([^<>{}\n]{3,})</g)].map((m) => m[1] ?? m[2] ?? m[3] ?? m[4]);
    for (const t of texts) {
      if (/^[\w./:@#?&=%-]+$/.test(t)) continue; // identifiants, chemins, classes
      if (/className|^\s*[a-z-]+\s*:\s|^(?:[a-z0-9-]+\s)+[a-z0-9-]+$/.test(t) && !/[A-ZÀ-Ü]/.test(t[0] ?? "")) continue; // classes Tailwind
      for (const m of t.matchAll(RE)) hits.push(`${relative(ROOT, f)}:${i + 1} — ${m[1]} — ${t.trim().slice(0, 110)}`);
    }
  });
}
console.log(hits.length ? hits.join("\n") : "aucun mot sans accent trouvé");
console.log(`\n${hits.length} occurrence(s) dans ${files.length} fichiers`);
