#!/usr/bin/env node
/**
 * scripts/_clean-english-news.mjs
 *
 * Réécrit les frontmatter title + description des news déjà sur disque qui
 * ont un titre anglais (cas où le rewriter LLM était indisponible au moment
 * de la génération → fallback déterministe a laissé passer de l'EN).
 *
 * Détecte l'anglais via une heuristique simple (cf. generate-daily-content.mjs
 * → looksEnglish()) et remplace par un titre FR généré depuis catégorie +
 * mots-clés. Le `originalTitle` est préservé pour traçabilité.
 *
 * Usage : node scripts/_clean-english-news.mjs [--dry-run]
 */

import { readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const ROOT = path.resolve(import.meta.dirname, "..");
const NEWS_DIR = path.join(ROOT, "content/news");
const DRY = process.argv.includes("--dry-run");

/**
 * Heuristique langue : compte des marqueurs FR vs EN explicites. Les mots
 * crypto neutres (bitcoin, halving, usdc, etc.) sont ignorés. Un titre est
 * considéré EN seulement si markersEN > markersFR (pas juste "ratio absolu",
 * sinon les titres FR avec loanwords crypto sont faux-positifs).
 */
function looksEnglish(text) {
  if (!text) return false;
  const words = text
    .toLowerCase()
    .replace(/[^\p{L}\s]/gu, " ")
    .split(/\s+/)
    .filter((w) => w.length >= 2);
  if (words.length < 4) return false; // trop court pour décider

  const ENGLISH = new Set([
    "the", "and", "for", "with", "from", "that", "this", "have", "has", "are", "was", "were",
    "been", "their", "there", "what", "when", "where", "which", "while", "amid", "across",
    "against", "than", "into", "over", "under", "after", "before", "between", "during",
    "since", "without", "within", "through", "above", "below",
    "his", "her", "our", "its", "out", "off", "any", "all", "some", "many", "most",
    "more", "less", "few", "such", "each", "another", "other", "others",
    "buys", "buy", "sells", "sell", "hit", "hits", "leads", "lead", "push", "contain",
    "exploit", "rates", "rate", "money", "year", "month", "week", "days",
    "billion", "million", "trillion", "founder", "company", "key", "keys", "highest", "lowest",
    "biggest", "smallest", "potential", "analysts", "analyst", "researcher", "researchers",
    "platforms", "platform", "market", "markets", "prediction", "predictions",
    "ban", "bans", "banned", "issue", "issues", "issued", "sweeping",
    "report", "reports", "raises", "raised", "soldier", "blocked", "bets", "case", "ruling",
    "court", "judge", "lawsuit", "sues", "settles", "files", "filing", "approved",
    "denies", "rejected", "agrees", "agree", "sign", "signed", "buying", "selling", "holding",
    "draws", "draw", "drew", "breaks", "broke", "broken", "breaking",
    "see", "seen", "saw", "say", "says", "said", "show", "shows", "shown",
    "set", "sets", "make", "makes", "made", "take", "takes", "took", "give", "gave",
    "want", "wants", "need", "needs", "let", "lets", "get", "gets", "got",
    "find", "finds", "found", "look", "looks", "watch", "watching", "wins", "won",
    "near", "nearer", "nearest", "simplified", "simply",
    "reach", "reaches", "reached", "join", "joins", "joined",
    "launch", "launches", "launched", "release", "released",
    "quantum", "wallet", "wallets", "exchange", "exchanges", "trading", "trade", "trades",
    "trader", "traders", "fund", "funds", "investor", "investors", "investment",
    "regulator", "regulators", "rule", "rules", "policy", "policies",
    "first", "second", "third", "last", "next",
    "january", "february", "march", "april", "may", "june", "july", "august",
    "september", "october", "november", "december",
    "why", "how", "who", "whom", "whose",
    "now", "then", "today", "yesterday", "tomorrow", "soon", "still", "yet",
    "very", "much", "well", "even", "just", "only", "back", "down",
  ]);
  const FRENCH = new Set([
    "le", "la", "les", "des", "un", "une", "et", "ou", "mais", "donc", "car", "ni",
    "est", "sont", "été", "était", "sera", "fait", "faire", "avoir", "être",
    "pour", "par", "sur", "dans", "avec", "sans", "sous", "vers", "chez", "entre",
    "qui", "que", "quoi", "dont", "où", "comment", "pourquoi", "quand", "quel",
    "ce", "cette", "ces", "son", "sa", "ses", "leur", "leurs", "notre", "nos",
    "très", "plus", "moins", "trop", "bien", "mal", "déjà", "encore",
    "jour", "semaine", "mois", "année", "depuis", "après", "avant",
    "marché", "régulation", "fiscalité", "déclaration", "investisseur",
  ]);

  let englishCount = 0;
  let frenchCount = 0;
  for (const w of words) {
    if (ENGLISH.has(w)) englishCount++;
    if (FRENCH.has(w)) frenchCount++;
  }
  // Au moins 2 marqueurs EN ET strictement plus que FR pour considérer EN.
  return englishCount >= 2 && englishCount > frenchCount;
}

function generateFrenchTitle(originalTitle, category, keywords, dateIso) {
  const date = new Date(dateIso).toLocaleDateString("fr-FR", { day: "numeric", month: "long" });
  const kw = (keywords || []).slice(0, 2).filter(Boolean);
  const templates = {
    "Régulation": [
      `Régulation crypto : nouvelle actualité ${kw[0] ? `sur ${kw[0].toUpperCase()}` : "à suivre"} (${date})`,
      `Actualité MiCA et régulation crypto du ${date}${kw[0] ? ` — focus ${kw[0].toUpperCase()}` : ""}`,
    ],
    "Technologie": [
      `Innovation crypto : ${kw[0] ? `mise à jour ${kw[0].toUpperCase()} ` : ""}à connaître (${date})`,
      `Tech crypto du ${date} — actualité ${kw[0] ? kw[0].toUpperCase() : "blockchain"}`,
    ],
    "Plateformes": [
      `Plateformes crypto : ${kw[0] ? `actualité ${kw[0].toUpperCase()} ` : "info marché "}du ${date}`,
      `Mouvements exchanges crypto — ${date}${kw[0] ? ` (${kw[0].toUpperCase()})` : ""}`,
    ],
    "Marché": [
      `Marché crypto du ${date} — ${kw[0] ? `actualité ${kw[0].toUpperCase()}` : "tendances à analyser"}`,
      `Tendances crypto ${date} : ${kw[0] ? `focus ${kw[0].toUpperCase()}` : "panorama du marché"}`,
    ],
  };
  const list = templates[category] || templates["Marché"];
  const idx = (originalTitle?.length || 0) % list.length;
  let t = list[idx];
  const suffix = " — analyse Cryptoreflex";
  if (t.length + suffix.length > 110) t = t.slice(0, 110 - suffix.length - 3) + "...";
  return t + suffix;
}

function parseFrontmatter(raw) {
  // Normalise les fins de ligne (CRLF Windows -> LF) avant parsing.
  const norm = raw.replace(/\r\n/g, "\n");
  const m = norm.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!m) return { meta: null, body: raw, head: "" };
  const headLines = m[1].split("\n");
  const meta = {};
  for (const line of headLines) {
    const kv = line.match(/^(\w+):\s*(.*)$/);
    if (kv) {
      let v = kv[2].trim();
      if (v.startsWith('"') && v.endsWith('"')) v = v.slice(1, -1);
      meta[kv[1]] = v;
    }
  }
  // Détection des arrays simples (keywords / matchedKeywords)
  const kwMatch = m[1].match(/keywords:\n((?:\s+-\s+"[^"]+"\n?)+)/);
  if (kwMatch) {
    meta.keywords = [...kwMatch[1].matchAll(/-\s+"([^"]+)"/g)].map((x) => x[1]);
  }
  // Préserve les fins de ligne d'origine pour ne pas convertir tout le fichier.
  const headOrig = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n/)?.[1] ?? m[1];
  return { meta, body: m[2], head: headOrig };
}

function rebuildFrontmatter(meta, originalHead) {
  // On modifie inline : remplace title et description, conserve le reste.
  let head = originalHead
    .replace(/^title:.*$/m, `title: "${meta.title.replace(/"/g, '\\"')}"`)
    .replace(/^description:.*$/m, `description: "${meta.description.replace(/"/g, '\\"')}"`);
  return `---\n${head}\n---\n`;
}

async function main() {
  const files = await readdir(NEWS_DIR);
  const mdxFiles = files.filter((f) => f.endsWith(".mdx"));
  console.log(`Scan ${mdxFiles.length} news MDX...\n`);

  let fixedCount = 0;
  for (const file of mdxFiles) {
    const fullPath = path.join(NEWS_DIR, file);
    const raw = await readFile(fullPath, "utf-8");
    const { meta, body, head } = parseFrontmatter(raw);
    if (!meta) continue;

    const cleanTitle = (meta.title || "").replace(/\s—\s+analyse Cryptoreflex$/, "");
    if (!looksEnglish(cleanTitle)) continue;

    const newTitle = generateFrenchTitle(
      meta.originalTitle || cleanTitle,
      meta.category,
      meta.keywords || [],
      meta.date,
    );
    const dateFr = new Date(meta.date).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
    const newDescription = `Actualité ${(meta.category || "marché").toLowerCase()} crypto du ${dateFr} — analyse Cryptoreflex pour les investisseurs français. Source : ${meta.source || "—"}.`.slice(0, 160);

    console.log(`[FIX] ${file}`);
    console.log(`  AVANT: ${meta.title}`);
    console.log(`  APRÈS: ${newTitle}\n`);

    if (!DRY) {
      // Rebuild en partant du fichier brut pour préserver le formatage CRLF/LF d'origine.
      const titleEsc = newTitle.replace(/"/g, '\\"');
      const descEsc = newDescription.replace(/"/g, '\\"');
      const updated = raw
        .replace(/^title:.*$/m, `title: "${titleEsc}"`)
        .replace(/^description:.*$/m, `description: "${descEsc}"`);
      await writeFile(fullPath, updated, "utf-8");
    }
    fixedCount++;
  }

  console.log(`\n${fixedCount} news ${DRY ? "détectées" : "corrigées"}.`);
  if (DRY) console.log("(--dry-run : aucune écriture, relance sans le flag pour appliquer)");
}

main().catch((e) => {
  console.error("ERREUR :", e);
  process.exit(1);
});
