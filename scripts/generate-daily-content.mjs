#!/usr/bin/env node
/**
 * scripts/generate-daily-content.mjs
 *
 * Script Node CLI standalone qui génère le contenu quotidien du site :
 *   - jusqu'à 3 nouvelles MDX dans content/news/
 *   - la mise à jour des 5 analyses techniques vivantes : data/analyses-techniques/<slug>.json (aucun fichier daté)
 *
 * Conçu pour être exécuté via GitHub Actions (filesystem accessible) plutôt
 * que via Vercel Lambda (read-only). Une fois les fichiers écrits, le workflow
 * GH Actions commit + push sur main, ce qui déclenche un redeploy Vercel.
 *
 * Usage local :
 *   node scripts/generate-daily-content.mjs
 *   node scripts/generate-daily-content.mjs --seulement=analyses   (analyses techniques seules : lecture publique Kraken)
 *
 * Usage CI (GH Actions, voir .github/workflows/daily-content.yml) :
 *   npm run generate:daily
 *
 * Pourquoi .mjs et pas .ts ?
 *   - Pas de build step nécessaire (Node 20+ supporte ESM nativement)
 *   - Évite la dépendance ts-node / tsx en CI
 *   - Les libs Next.js (next/cache, etc.) ne sont pas importables hors runtime
 *     Next, donc on duplique la logique métier ici (déterministe, peu de code).
 *
 * Stratégie d'idempotence : chaque actu MDX dont le slug existe déjà est sautée ; l'analyse du jour d'une crypto
 * remplace celle du même jour. Le script peut donc être relancé manuellement sans dégât.
 */

import { promises as fs } from "node:fs";
import path from "node:path";
import { callLLMRewriter } from "./lib/llm-rewriter.mjs";
import { fetchAndStorePhoto } from "./lib/news-image.mjs";
import { generateAnalyses } from "./lib/analyses-techniques.mjs";

/* -------------------------------------------------------------------------- */
/*  Configuration                                                             */
/* -------------------------------------------------------------------------- */

const REPO_ROOT = path.resolve(process.cwd());
const NEWS_DIR = path.join(REPO_ROOT, "content", "news");
const TA_DATA_DIR = path.join(REPO_ROOT, "data", "analyses-techniques");
const TODAY = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
const ONLY = process.argv.find((a) => a.startsWith("--seulement="))?.slice("--seulement=".length) ?? "";

// Flux RSS sources. fr.cointelegraph (410) et cryptoslate (403) sont morts —
// remplacés par des feeds fiables (le rewriter Sonnet traduit l'EN en FR).
// Le moteur skip proprement toute source qui échoue (log [fetch-rss-fail]).
const RSS_SOURCES = [
  { name: "Decrypt", url: "https://decrypt.co/feed" },
  { name: "Cointelegraph", url: "https://cointelegraph.com/rss" },
  { name: "CoinDesk", url: "https://www.coindesk.com/arc/outboundfeeds/rss/" },
  { name: "Cryptoast", url: "https://cryptoast.fr/feed/" },
  { name: "Journal du Coin", url: "https://www.journalducoin.com/feed/" },
];

const NEWS_KEYWORDS = [
  "bitcoin", "btc", "ethereum", "eth", "solana", "sol",
  "mica", "regulation", "régulation", "france", "etf", "halving",
  "stablecoin", "usdc", "usdt", "platform", "plateforme", "exchange",
  "binance", "coinbase", "kraken", "bitpanda", "ledger",
];

/* Termes crypto « forts » : au moins un doit figurer dans le TITRE source pour qu'une actu
   soit retenue (« france » ou « platform » seuls ne suffisent pas). */
const NEWS_STRONG_KEYWORDS = [
  "bitcoin", "btc", "ethereum", "eth", "solana", "sol", "xrp", "crypto", "cryptos", "cryptocurrency",
  "cryptomonnaie", "cryptomonnaies", "blockchain", "stablecoin", "stablecoins", "usdc", "usdt", "mica",
  "defi", "token", "tokens", "altcoin", "altcoins", "halving", "etf", "binance", "coinbase", "kraken",
  "bitpanda", "ledger", "exchange", "wallet", "nft", "web3", "tether", "circle", "ripple", "cardano",
  "memecoin", "staking", "l2", "layer 2", "layer-2", "rollup",
];

const MAX_NEWS_PER_RUN = 3;

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                   */
/* -------------------------------------------------------------------------- */

/**
 * Slugify FR : ASCII kebab-case sans accent, < 80 chars.
 */
function slugify(input) {
  return String(input)
    // Anti-réputation : retire les entités HTML (&#39; → « 39 » dans l'URL) et
    // la vulgarité éventuelle du titre source RSS, pour ne JAMAIS publier un slug
    // grossier (cas vu le 2026-05-31 : « ...full-of-shit... » dans l'URL).
    .replace(/&#?[a-z0-9]+;/gi, " ")
    .replace(/\b(?:shit|fuck|bitch|cunt|asshole|bastard|dick|slut|whore)\b/gi, " ")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 70);
}

/**
 * Échappe les caractères YAML problématiques (apostrophes, deux-points, dièses).
 */
function yamlString(s) {
  return s.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

/**
 * Détecte la catégorie de la news depuis le titre + extrait.
 */
function inferCategory(text) {
  const lower = text.toLowerCase();
  if (/(mica|regulation|régulation|amf|esma|sec|psan|casp|loi|ban)/i.test(lower)) {
    return "Régulation";
  }
  if (/(layer.?2|rollup|fork|protocol|dapp|defi|smart contract|consensus|wallet)/i.test(lower)) {
    return "Technologie";
  }
  if (/(binance|coinbase|kraken|bitpanda|bitstack|ledger|trezor|exchange|plateforme)/i.test(lower)) {
    return "Plateformes";
  }
  return "Marché";
}

/* -------------------------------------------------------------------------- */
/*  RSS Fetcher (parser maison, zéro dépendance)                              */
/* -------------------------------------------------------------------------- */

const MAX_RSS_BYTES = 5 * 1024 * 1024; // 5 MB

async function fetchRss(url) {
  const ctrl = new AbortController();
  const tid = setTimeout(() => ctrl.abort(), 8000);
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: { "User-Agent": "Cryptoreflex-DailyBot/1.0" },
    });
    if (!res.ok) throw new Error(`${url} → ${res.status}`);
    const cl = res.headers.get("content-length");
    if (cl && parseInt(cl, 10) > MAX_RSS_BYTES) {
      throw new Error(`RSS too large: ${cl}`);
    }
    const text = await res.text();
    if (text.length > MAX_RSS_BYTES) throw new Error(`RSS body too large`);
    return text;
  } finally {
    clearTimeout(tid);
  }
}

/* Entités HTML des flux RSS (« MiCA&#39;s » restait tel quel dans originalTitle — audit 03/10/2026) */
function decodeHtmlEntities(s) {
  const named = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", rsquo: "’", lsquo: "‘", rdquo: "”", ldquo: "“", hellip: "…", ndash: "–", mdash: "—" };
  return String(s)
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&([a-z]+);/gi, (m, n) => named[n.toLowerCase()] ?? m);
}

function parseRssItems(xml) {
  const items = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/g;
  let m;
  while ((m = itemRegex.exec(xml)) && items.length < 50) {
    const block = m[1];
    const title = decodeHtmlEntities((block.match(/<title>([\s\S]*?)<\/title>/) || [, ""])[1]
      .replace(/<!\[CDATA\[(.*?)\]\]>/s, "$1")
      .trim());
    // Certains flux (Cointelegraph) mettent le lien dans un CDATA : sans ce nettoyage, la page publiée liait
    // « /%3C![CDATA[https://…]]> » (404). On garde seulement une vraie adresse http(s).
    const link = decodeHtmlEntities((block.match(/<link>([\s\S]*?)<\/link>/) || [, ""])[1]
      .replace(/<!\[CDATA\[(.*?)\]\]>/s, "$1")
      .trim());
    if (!/^https?:\/\//i.test(link)) continue;
    const description = (block.match(/<description>([\s\S]*?)<\/description>/) || [, ""])[1]
      .replace(/<!\[CDATA\[(.*?)\]\]>/s, "$1")
      .replace(/<[^>]+>/g, "")
      .trim();
    const pubDate = (block.match(/<pubDate>([\s\S]*?)<\/pubDate>/) || [, ""])[1].trim();
    if (title && link) {
      items.push({ title, link, description, pubDate });
    }
  }
  return items;
}

async function fetchNewsRaw() {
  const all = [];
  for (const source of RSS_SOURCES) {
    try {
      const xml = await fetchRss(source.url);
      const items = parseRssItems(xml);
      for (const it of items) {
        /* Pertinence (audit 03/10/2026) : mots ENTIERS (« eth » ne doit plus matcher « method »,
           ni « sol » « sold »), et au moins un terme crypto FORT dans le TITRE source. Les actus
           d'IA pure (OpenAI, Anthropic…) passaient grâce à « eth » dans « whether ». */
        const titleLc = it.title.toLowerCase();
        const text = `${it.title} ${it.description}`.toLowerCase();
        const hasWord = (hay, k) => new RegExp(`(^|[^\\p{L}\\p{N}])${k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?=$|[^\\p{L}\\p{N}])`, "iu").test(hay);
        const matched = NEWS_KEYWORDS.filter((k) => hasWord(text, k));
        const strongInTitle = NEWS_STRONG_KEYWORDS.some((k) => hasWord(titleLc, k));
        if (matched.length >= 1 && strongInTitle) {
          all.push({ ...it, source: source.name, sourceUrl: it.link, matchedKeywords: matched });
        }
      }
      console.log(`[fetch-rss] ${source.name} → ${items.length} items`);
    } catch (err) {
      console.warn(`[fetch-rss-fail] ${source.name}: ${err.message}`);
    }
  }
  // Dédoublonne par link
  const seen = new Set();
  const uniq = all.filter((it) => {
    if (seen.has(it.link)) return false;
    seen.add(it.link);
    return true;
  });
  /* Audit 03/10/2026 : 117 actus sur 123 venaient de Decrypt — premier flux de la liste, ses items remplissaient toujours
     les 3 places du jour. Tour de rôle entre sources (chaque flux garde son ordre, du plus récent au plus ancien), les
     sources francophones d'abord : le lecteur est français. */
  const order = ["Cryptoast", "Journal du Coin", "Decrypt", "Cointelegraph", "CoinDesk"];
  const bySource = new Map(order.map((n) => [n, []]));
  for (const it of uniq) {
    if (!bySource.has(it.source)) bySource.set(it.source, []);
    bySource.get(it.source).push(it);
  }
  const lists = [...bySource.values()].filter((l) => l.length);
  const mixed = [];
  for (let i = 0; lists.some((l) => i < l.length); i++) for (const l of lists) if (i < l.length) mixed.push(l[i]);
  return mixed;
}

/* -------------------------------------------------------------------------- */
/*  News Rewriter                                                             */
/* -------------------------------------------------------------------------- */

const RELATED_LINKS = {
  "Marché": [
    { slug: "bitcoin-guide-complet-debutant-2026", label: "Bitcoin : guide complet débutant" },
    { slug: "etf-bitcoin-spot-europe-2026-arbitrage", label: "ETF Bitcoin spot en Europe" },
    { slug: "trader-vs-dca-vs-hodl", label: "Trader vs DCA vs HODL" },
  ],
  "Régulation": [
    { slug: "mica-phase-2-juillet-2026-ce-qui-change", label: "MiCA Phase 2 : ce qui change" },
    { slug: "psan-vs-casp-statut-mica-plateformes-crypto", label: "PSAN vs CASP" },
    { slug: "comment-declarer-crypto-impots-2026-guide-complet", label: "Comment déclarer ses cryptos" },
  ],
  Technologie: [
    { slug: "qu-est-ce-que-la-blockchain-guide-ultra-simple-2026", label: "Blockchain expliquée" },
    { slug: "layer-2-ethereum-qu-est-ce-pourquoi-crucial-2026", label: "Layer 2 Ethereum" },
    { slug: "proof-of-stake-vs-proof-of-work-difference-5-minutes", label: "PoS vs PoW" },
  ],
  Plateformes: [
    { slug: "meilleure-plateforme-crypto-debutant-france-2026", label: "Meilleure plateforme débutant" },
    { slug: "plateformes-crypto-risque-mica-phase-2-alternatives", label: "Plateformes à risque MiCA" },
    { slug: "alternative-binance-france-post-mica", label: "Alternatives Binance MiCA" },
  ],
};

/**
 * Heuristique langue : compare marqueurs FR vs EN explicites. Les loanwords
 * crypto neutres (bitcoin, halving, usdc, etc.) sont ignorés. Un titre est
 * EN seulement si markersEN >= 2 ET markersEN > markersFR — sinon les
 * titres FR avec termes crypto anglais étaient faux-positifs (signalé
 * utilisateur 26/04/2026 quand le rewriter déterministe sortait des titres
 * EN bruts en prod).
 */
function looksEnglish(text) {
  if (!text) return false;
  const words = text
    .toLowerCase()
    .replace(/[^\p{L}\s]/gu, " ")
    .split(/\s+/)
    .filter((w) => w.length >= 2);
  if (words.length < 4) return false;

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
  return englishCount >= 2 && englishCount > frenchCount;
}

/**
 * Génère un titre 100 % FR depuis catégorie + mots-clés détectés.
 * Utilisé quand le titre source est en anglais ET qu'on est en fallback
 * déterministe (LLM indisponible).
 */
function generateFrenchTitle(raw, category) {
  const date = new Date(TODAY).toLocaleDateString("fr-FR", { day: "numeric", month: "long" });
  const kw = (raw.matchedKeywords || []).slice(0, 2).filter(Boolean);

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
  // Choix déterministe basé sur la longueur du title source (pas de Math.random pour reproductibilité tests)
  const idx = (raw.title?.length || 0) % list.length;
  let t = list[idx];
  const suffix = " — analyse Cryptoreflex";
  if (t.length + suffix.length > 110) t = t.slice(0, 110 - suffix.length - 3) + "...";
  return t + suffix;
}

function rewriteTitle(rawTitle, raw, category) {
  let t = (rawTitle || "")
    .replace(/^[\s—–\-•]+/, "")
    .replace(/\s*[–—|]\s*(CoinTelegraph|Decrypt|CryptoSlate).*$/i, "")
    .replace(/^(BREAKING|JUST IN|UPDATE|EXCLUSIVE)\s*[:\-–]\s*/i, "")
    .replace(/^[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]\s*/u, "")
    .trim();

  // Si la source est en anglais, on remplace par un titre FR généré
  // (sans LLM on ne peut pas traduire fidèlement — mieux vaut un titre
  // générique 100 % FR qu'un titre EN qui décrédibilise le site).
  if (looksEnglish(t) && raw && category) {
    return generateFrenchTitle(raw, category);
  }

  if (!t) t = "Actualité crypto";
  t = t.charAt(0).toUpperCase() + t.slice(1);
  const suffix = " — analyse Cryptoreflex";
  if (t.length + suffix.length > 110) t = t.slice(0, 110 - suffix.length - 3) + "...";
  return t + suffix;
}

/**
 * Construit le frontmatter MDX commun (utilisé par les 2 rewriters).
 * Centralisé ici pour garantir un format identique LLM ↔ déterministe.
 */
function buildFrontmatter({ title, description, category, raw, photo }) {
  const imageLines = photo
    ? `\nimage: "${yamlString(photo.url)}"\nimageCredit: "${yamlString(photo.credit)}"\nimageCreditUrl: "${yamlString(photo.creditUrl)}"`
    : "";
  return `---
title: "${yamlString(title)}"
description: "${yamlString(description)}"
date: "${TODAY}"
category: "${category}"
source: "${yamlString(raw.source)}"
sourceUrl: "${yamlString(raw.sourceUrl)}"
originalTitle: "${yamlString(raw.title)}"
author: "Cryptoreflex"${imageLines}
keywords:
${raw.matchedKeywords.slice(0, 5).map((k) => `  - "${k}"`).join("\n")}
---`;
}

/**
 * Rewriter déterministe : templates statiques, ~600 mots, qualité éditoriale
 * basique. Utilisé en fallback si l'API LLM est absente ou KO.
 */
function rewriteNewsDeterministic(raw) {
  const fullText = `${raw.title} ${raw.description}`;
  const category = inferCategory(fullText);
  // 26/04/2026 fix : rewriteTitle reçoit maintenant raw + category pour pouvoir
  // générer un titre FR si la source est en anglais (cas Decrypt / CoinDesk EN).
  const title = rewriteTitle(raw.title, raw, category);
  const slugBase = slugify(raw.title);
  const slug = `${TODAY}-${slugBase}`;

  // Description toujours FR (avant on pastait raw.title qui pouvait être EN).
  const dateFr = new Date(TODAY).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
  const description = `Actualité ${category.toLowerCase()} crypto du ${dateFr} — analyse Cryptoreflex pour les investisseurs français. Source originale : ${raw.source}.`.slice(0, 160);

  const links = RELATED_LINKS[category] ?? RELATED_LINKS["Marché"];
  const linksMd = links.slice(0, 4).map((l) => `- [${l.label}](/blog/${l.slug})`).join("\n");

  // 26/04/2026 fix : on ne paste plus raw.description (souvent en anglais).
  // Le body est 100% FR avec un lien vers la source pour le détail original.
  const body = `## Ce qu'il s'est passé

Une actualité crypto vient d'être publiée par **${raw.source}** le ${dateFr}, classée dans la catégorie « ${category} » par notre système d'analyse automatique.

> Le détail factuel complet est disponible sur la source originale ci-dessous. Cet article fournit un éclairage Cryptoreflex pour les investisseurs francophones.

## Pourquoi ça nous concerne en France

Cette actualité s'inscrit dans le contexte plus large du marché crypto français en 2026, particulièrement marqué par :

- L'application de **MiCA Phase 2** (1er juillet 2026) qui redéfinit les règles d'opération des plateformes en zone UE.
- La collecte des données des clients des plateformes de l'UE au titre de la **directive DAC8** (depuis le 1er janvier 2026, premier échange avec la DGFiP au plus tard le 30 septembre 2027).
- L'évolution de la fiscalité crypto (PFU de 31,4 % depuis l'imposition des revenus 2025, formulaire 2086, déclaration 3916-bis).

Les actualités de la catégorie « ${category} » impactent directement les choix de plateforme, de produits financiers et de stratégie fiscale des investisseurs français.

## Les points-clés à retenir

- **Catégorie** : ${category}
- **Source** : ${raw.source}
- **Mots-clés détectés** : ${(raw.matchedKeywords || []).slice(0, 4).join(", ") || "aucun mot-clé spécifique"}
- **Date de publication** : ${dateFr}

## Pour aller plus loin sur Cryptoreflex

${linksMd}

---

> **Source originale** : [${raw.source}](${raw.sourceUrl}) — lien direct vers l'article publié par la source. La traduction et l'analyse française détaillée seront ajoutées prochainement (rewriter LLM en cours d'optimisation).

<Callout type="warning" title="Avertissement">
Cet article est une synthèse automatique à but informatif. Il ne constitue **pas un conseil en investissement**. Les cryptoactifs sont des actifs volatils : tu peux perdre tout ou partie de ton capital. Vérifie toujours les informations à la source avant toute décision.
</Callout>
`;

  const frontmatter = buildFrontmatter({ title, description, category, raw });
  return { slug, frontmatter, body };
}

/**
 * Rewriter LLM : appelle OpenRouter (Claude Haiku par défaut), parse le JSON
 * structuré, et reconstruit la même forme { slug, frontmatter, body } que
 * le rewriter déterministe pour ne pas casser le pipeline d'écriture fichier.
 */
async function rewriteNewsWithLLM(raw) {
  const slugBase = slugify(raw.title);
  const slug = `${TODAY}-${slugBase}`;

  const llmOut = await callLLMRewriter(raw, { slug });

  // Vraie photo pertinente (recherche pro). Non bloquant : si KO, la cover OG
  // dynamique sert de repli au rendu.
  const photo = await fetchAndStorePhoto({
    title: llmOut.title,
    category: llmOut.category,
    keywords: raw.matchedKeywords,
    slug,
  }).catch(() => null);

  const frontmatter = buildFrontmatter({
    title: llmOut.title,
    description: llmOut.description,
    category: llmOut.category,
    raw,
    photo,
  });

  return { slug, frontmatter, body: llmOut.body };
}

/**
 * Dispatcher principal — politique « que du pro » : on ne publie QUE des
 * articles rédigés par le LLM (Anthropic Sonnet). En cas d'échec (clé absente,
 * quota, JSON KO), on LÈVE → la boucle d'appel saute l'article au lieu
 * d'écrire une coquille vide. Plus jamais de stub déterministe publié.
 */
async function rewriteNews(raw) {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error("ANTHROPIC_API_KEY absente — génération LLM requise (pas de stub)");
  }
  return await rewriteNewsWithLLM(raw);
}

/* -------------------------------------------------------------------------- */
/*  Generate news                                                             */
/* -------------------------------------------------------------------------- */

async function generateNews() {
  console.log(`\n=== Génération NEWS pour ${TODAY} ===`);
  await fs.mkdir(NEWS_DIR, { recursive: true });

  const raws = await fetchNewsRaw();
  console.log(`[news] ${raws.length} items pertinents trouvés`);

  let created = 0, skipped = 0, errors = 0;

  /* Audit 2026-10-02 : la même info, restée plusieurs jours dans un flux RSS, était republiée chaque jour
     (23 doublons sur 137 news). On saute toute source déjà traitée, QUELLE QUE SOIT sa date : on compare la
     partie du nom de fichier après la date (slug du titre source). */
  const existingSources = new Set(
    (await fs.readdir(NEWS_DIR)).filter((f) => f.endsWith(".mdx")).map((f) => f.replace(/^\d{4}-\d{2}-\d{2}-/, "").replace(/\.mdx$/, "")),
  );

  for (const raw of raws) {
    if (created >= MAX_NEWS_PER_RUN) break;
    try {
      if (existingSources.has(slugify(raw.title))) {
        skipped++;
        continue;
      }
      // Pré-check d'existence basé sur le slug du titre brut, AVANT l'appel LLM
      // (économise un appel API ~2s + ~0.001$ si le slug du jour existe déjà).
      const slugPreview = `${TODAY}-${slugify(raw.title)}`;
      const previewPath = path.join(NEWS_DIR, `${slugPreview}.mdx`);
      try {
        await fs.access(previewPath);
        skipped++;
        continue;
      } catch { /* not exists, on génère */ }

      const { slug, frontmatter, body } = await rewriteNews(raw);
      const filePath = path.join(NEWS_DIR, `${slug}.mdx`);

      // Re-check (sécurité si LLM produit un slug différent — improbable car
      // basé sur le titre brut, mais on garde l'idempotence).
      try {
        await fs.access(filePath);
        skipped++;
        continue;
      } catch { /* not exists */ }

      await fs.writeFile(filePath, `${frontmatter}\n\n${body}\n`, "utf8");
      created++;
      console.log(`[news-create] ${slug}`);
    } catch (err) {
      errors++;
      console.error(`[news-error] ${err.message}`);
    }
  }

  console.log(`\n[news] DONE — created=${created} skipped=${skipped} errors=${errors}`);
  return { created, skipped, errors };
}

/* -------------------------------------------------------------------------- */
/*  Analyses techniques : 5 fichiers de données, plus aucun MDX daté          */
/* -------------------------------------------------------------------------- */

/* Lot L1 du regroupement (08/10/2026) : le robot met à jour data/analyses-techniques/<slug>.json (cours de clôture en
   euros, Kraken puis replis) au lieu d'écrire content/analyses-tech/AAAA-MM-JJ-<sym>-analyse-technique.mdx. Le calcul,
   les sources et les règles (idempotence, échec = fichier intact) sont dans scripts/lib/analyses-techniques.mjs. */
async function generateTA() {
  console.log(`\n=== Calcul des ANALYSES TECHNIQUES pour ${TODAY} ===`);
  const res = await generateAnalyses({ dir: TA_DATA_DIR });
  console.log(`\n[ta] DONE — updated=${res.updated} errors=${res.errors}`);
  return { created: res.updated, skipped: 0, errors: res.errors };
}

/* -------------------------------------------------------------------------- */
/*  Main                                                                      */
/* -------------------------------------------------------------------------- */

(async () => {
  console.log(`\n========================================`);
  console.log(`  Cryptoreflex daily content generator`);
  console.log(`  Date: ${TODAY}`);
  console.log(`========================================`);

  const newsRes = ONLY === "analyses" ? { created: 0, skipped: 0, errors: 0 } : await generateNews();
  const taRes = ONLY === "actus" ? { created: 0, skipped: 0, errors: 0 } : await generateTA();

  const totalCreated = newsRes.created + taRes.created;
  console.log(`\n=== TOTAL ===`);
  console.log(`Created: ${totalCreated}`);
  console.log(`Skipped: ${newsRes.skipped + taRes.skipped}`);
  console.log(`Errors:  ${newsRes.errors + taRes.errors}`);

  // Exit 0 (best effort : les analyses techniques créées doivent être committées), mais les compteurs sont
  // publiés pour le workflow : son dernier step ÉCHOUE si aucune news n'a pu être créée alors que des
  // tentatives ont échoué (audit 2026-10-02 : crédit Anthropic épuisé = 0 news du 14/07 au 02/10/2026, sans
  // aucune alerte, car ce script sortait toujours en 0).
  if (process.env.GITHUB_OUTPUT) {
    await fs.appendFile(process.env.GITHUB_OUTPUT, `news_created=${newsRes.created}
news_errors=${newsRes.errors}
news_skipped=${newsRes.skipped}
ta_updated=${taRes.created}
ta_errors=${taRes.errors}
`);
  }
  if (newsRes.created === 0 && newsRes.errors > 0) {
    console.error(`[ALERTE] 0 news créée, ${newsRes.errors} échec(s) : vérifier ANTHROPIC_API_KEY (clé et crédit).`);
  }
  process.exit(0);
})().catch((err) => {
  console.error(`[FATAL] ${err.message}`);
  process.exit(1);
});
