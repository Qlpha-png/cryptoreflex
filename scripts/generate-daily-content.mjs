#!/usr/bin/env node
/**
 * scripts/generate-daily-content.mjs
 *
 * Script Node CLI standalone qui génère le contenu quotidien du site :
 *   - 5-10 nouvelles MDX dans content/news/
 *   - 5 analyses techniques MDX dans content/analyses-tech/
 *
 * Conçu pour être exécuté via GitHub Actions (filesystem accessible) plutôt
 * que via Vercel Lambda (read-only). Une fois les fichiers écrits, le workflow
 * GH Actions commit + push sur main, ce qui déclenche un redeploy Vercel.
 *
 * Usage local :
 *   node scripts/generate-daily-content.mjs
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
 * Stratégie d'idempotence : chaque fichier MDX dont le slug existe déjà est
 * skippé. Le script peut donc être relancé manuellement sans dégât.
 */

import { promises as fs } from "node:fs";
import path from "node:path";
import { callLLMRewriter } from "./lib/llm-rewriter.mjs";

/* -------------------------------------------------------------------------- */
/*  Configuration                                                             */
/* -------------------------------------------------------------------------- */

const REPO_ROOT = path.resolve(process.cwd());
const NEWS_DIR = path.join(REPO_ROOT, "content", "news");
const TA_DIR = path.join(REPO_ROOT, "content", "analyses-tech");
const TODAY = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

const TA_CRYPTOS = [
  { symbol: "BTC", name: "Bitcoin", coingeckoId: "bitcoin", slug: "bitcoin" },
  { symbol: "ETH", name: "Ethereum", coingeckoId: "ethereum", slug: "ethereum" },
  { symbol: "SOL", name: "Solana", coingeckoId: "solana", slug: "solana" },
  { symbol: "XRP", name: "XRP", coingeckoId: "ripple", slug: "xrp" },
  { symbol: "ADA", name: "Cardano", coingeckoId: "cardano", slug: "cardano" },
];

const RSS_SOURCES = [
  { name: "CoinTelegraph FR", url: "https://fr.cointelegraph.com/rss" },
  { name: "Decrypt", url: "https://decrypt.co/feed" },
  { name: "CryptoSlate", url: "https://cryptoslate.com/feed/" },
];

const NEWS_KEYWORDS = [
  "bitcoin", "btc", "ethereum", "eth", "solana", "sol",
  "mica", "regulation", "régulation", "france", "etf", "halving",
  "stablecoin", "usdc", "usdt", "platform", "plateforme", "exchange",
  "binance", "coinbase", "kraken", "bitpanda", "ledger",
];

const MAX_NEWS_PER_RUN = 10;

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                   */
/* -------------------------------------------------------------------------- */

/**
 * Slugify FR : ASCII kebab-case sans accent, < 80 chars.
 */
function slugify(input) {
  return input
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

function parseRssItems(xml) {
  const items = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/g;
  let m;
  while ((m = itemRegex.exec(xml)) && items.length < 50) {
    const block = m[1];
    const title = (block.match(/<title>([\s\S]*?)<\/title>/) || [, ""])[1]
      .replace(/<!\[CDATA\[(.*?)\]\]>/s, "$1")
      .trim();
    const link = (block.match(/<link>([\s\S]*?)<\/link>/) || [, ""])[1].trim();
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
        const text = `${it.title} ${it.description}`.toLowerCase();
        const matched = NEWS_KEYWORDS.filter((k) => text.includes(k));
        if (matched.length >= 1) {
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
  return all.filter((it) => {
    if (seen.has(it.link)) return false;
    seen.add(it.link);
    return true;
  });
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

function rewriteTitle(rawTitle) {
  let t = rawTitle
    .replace(/^[\s—–\-•]+/, "")
    .replace(/\s*[–—|]\s*(CoinTelegraph|Decrypt|CryptoSlate).*$/i, "")
    .replace(/^(BREAKING|JUST IN|UPDATE|EXCLUSIVE)\s*[:\-–]\s*/i, "")
    .replace(/^[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]\s*/u, "")
    .trim();
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
function buildFrontmatter({ title, description, category, raw }) {
  return `---
title: "${yamlString(title)}"
description: "${yamlString(description)}"
date: "${TODAY}"
category: "${category}"
source: "${yamlString(raw.source)}"
sourceUrl: "${yamlString(raw.sourceUrl)}"
originalTitle: "${yamlString(raw.title)}"
image: "/og-default.png"
author: "Cryptoreflex"
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
  const title = rewriteTitle(raw.title);
  const slugBase = slugify(raw.title);
  const slug = `${TODAY}-${slugBase}`;
  const description = `Analyse Cryptoreflex : ${raw.title.slice(0, 70).replace(/\.+$/, "")}. Décryptage ${category} pour les investisseurs français.`.slice(0, 160);

  const links = RELATED_LINKS[category] ?? RELATED_LINKS["Marché"];
  const linksMd = links.slice(0, 4).map((l) => `- [${l.label}](/blog/${l.slug})`).join("\n");

  const body = `## ${title.replace(" — analyse Cryptoreflex", "")}

${raw.description.slice(0, 250).replace(/[<>]/g, "")}.

## Les faits clés

- **Catégorie** : ${category}
- **Source** : ${raw.source}
- **Mots-clés détectés** : ${raw.matchedKeywords.slice(0, 4).join(", ")}

## Ce qu'il faut retenir

Cette actualité s'inscrit dans le contexte plus large du marché crypto français en 2026, particulièrement marqué par l'application de MiCA Phase 2 (1er juillet 2026) et l'évolution de la fiscalité des actifs numériques.

## Pour aller plus loin

${linksMd}

---

> **Source originale** : [${raw.source}](${raw.sourceUrl}) — communication publique reformulée par Cryptoreflex.

<Callout type="warning" title="Avertissement">
Cet article est une synthèse à but informatif. Il ne constitue **pas un conseil en investissement**. Les cryptoactifs sont des actifs volatils : tu peux perdre tout ou partie de ton capital.
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

  const frontmatter = buildFrontmatter({
    title: llmOut.title,
    description: llmOut.description,
    category: llmOut.category,
    raw,
  });

  return { slug, frontmatter, body: llmOut.body };
}

/**
 * Dispatcher principal. Si OPENROUTER_API_KEY est défini, tente le LLM ;
 * sinon (ou en cas d'erreur LLM), fallback transparent sur le déterministe.
 */
async function rewriteNews(raw) {
  if (process.env.OPENROUTER_API_KEY) {
    try {
      return await rewriteNewsWithLLM(raw);
    } catch (err) {
      console.warn(`[rewrite-llm-fail] ${err.message} — fallback déterministe`);
      return rewriteNewsDeterministic(raw);
    }
  }
  return rewriteNewsDeterministic(raw);
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

  for (const raw of raws) {
    if (created >= MAX_NEWS_PER_RUN) break;
    try {
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
/*  Generate TA (analyses techniques)                                         */
/* -------------------------------------------------------------------------- */

async function fetchHistoricalPrices(coingeckoId, days = 200) {
  const url = `https://api.coingecko.com/api/v3/coins/${coingeckoId}/market_chart?vs_currency=usd&days=${days}&interval=daily`;
  const res = await fetch(url, {
    headers: { "User-Agent": "Cryptoreflex-DailyBot/1.0" },
    signal: AbortSignal.timeout(10000),
  });
  if (!res.ok) throw new Error(`CoinGecko ${coingeckoId} → ${res.status}`);
  const data = await res.json();
  return (data.prices || []).map(([_, p]) => p);
}

async function fetchLivePrice(coingeckoId) {
  const url = `https://api.coingecko.com/api/v3/simple/price?ids=${coingeckoId}&vs_currencies=usd&include_24hr_change=true`;
  const res = await fetch(url, {
    headers: { "User-Agent": "Cryptoreflex-DailyBot/1.0" },
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) throw new Error(`CoinGecko price ${coingeckoId} → ${res.status}`);
  const data = await res.json();
  const obj = data[coingeckoId];
  return { price: obj?.usd ?? 0, change24h: obj?.usd_24h_change ?? 0 };
}

function calcRSI(prices, period = 14) {
  if (prices.length < period + 1) return 50;
  let gains = 0, losses = 0;
  for (let i = 1; i <= period; i++) {
    const diff = prices[i] - prices[i - 1];
    if (diff > 0) gains += diff;
    else losses -= diff;
  }
  let avgGain = gains / period;
  let avgLoss = losses / period;
  for (let i = period + 1; i < prices.length; i++) {
    const diff = prices[i] - prices[i - 1];
    const g = diff > 0 ? diff : 0;
    const l = diff < 0 ? -diff : 0;
    avgGain = (avgGain * (period - 1) + g) / period;
    avgLoss = (avgLoss * (period - 1) + l) / period;
  }
  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return Math.round((100 - 100 / (1 + rs)) * 100) / 100;
}

function calcMA(prices, period) {
  if (prices.length < period) return prices[prices.length - 1] ?? 0;
  const slice = prices.slice(-period);
  return slice.reduce((s, p) => s + p, 0) / period;
}

function detectTrend(prices) {
  const ma50 = calcMA(prices, 50);
  const ma200 = calcMA(prices, 200);
  const last = prices[prices.length - 1];
  if (ma50 > ma200 && last > ma50) return "Haussier";
  if (ma50 < ma200 && last < ma50) return "Baissier";
  return "Neutre";
}

function buildTAArticle(crypto, prices, livePriceUsd, change24h) {
  const rsi = calcRSI(prices);
  const ma50 = Math.round(calcMA(prices, 50) * 100) / 100;
  const ma200 = Math.round(calcMA(prices, 200) * 100) / 100;
  const trend = detectTrend(prices);
  const slug = `${TODAY}-${crypto.symbol.toLowerCase()}-analyse-technique`;
  const price = Math.round(livePriceUsd * 100) / 100;

  const title = `Analyse technique ${crypto.symbol} — ${TODAY}`;
  const description = `Analyse technique ${crypto.name} (${crypto.symbol}) du ${TODAY} : RSI, MA50/MA200, MACD, niveaux clés et scénarios par Cryptoreflex.`;

  const frontmatter = `---
title: "${yamlString(title)}"
description: "${yamlString(description)}"
date: "${TODAY}"
symbol: "${crypto.symbol}"
name: "${crypto.name}"
cryptoSlug: "${crypto.slug}"
coingeckoId: "${crypto.coingeckoId}"
currentPrice: ${price}
trend: "${trend}"
rsi: ${rsi}
change24h: ${change24h.toFixed(2)}
image: "/og-default.png"
author: "Cryptoreflex"
---`;

  const body = `## Situation actuelle

Le ${crypto.name} (${crypto.symbol}) s'échange à **$${price.toLocaleString("fr-FR")}** au ${TODAY}, en variation de **${change24h >= 0 ? "+" : ""}${change24h.toFixed(2)} %** sur 24 heures. La tendance générale est **${trend}**.

## Indicateurs techniques

| Indicateur | Valeur | Lecture |
|---|---|---|
| RSI (14) | ${rsi} | ${rsi > 70 ? "Surachat — risque de correction" : rsi < 30 ? "Survente — rebond possible" : "Zone neutre"} |
| MA 50 | $${ma50.toLocaleString("fr-FR")} | ${price > ma50 ? "Prix au-dessus (signal haussier)" : "Prix en dessous (prudence)"} |
| MA 200 | $${ma200.toLocaleString("fr-FR")} | ${price > ma200 ? "Tendance long terme haussière" : "Tendance long terme baissière"} |

## Scénarios

**Scénario haussier** : franchissement du résistance proche ouvrirait la voie vers une extension de la tendance ${trend.toLowerCase()}.

**Scénario baissier** : cassure du support clé déclencherait une correction vers les zones de support inférieures.

## Pour aller plus loin

- [Fiche ${crypto.name}](/cryptos/${crypto.slug})
- [Heatmap top 100 en temps réel](/marche/heatmap)
- [Comparatif des plateformes pour acheter ${crypto.symbol}](/comparatif)

<Callout type="warning" title="Avertissement">
Cette analyse technique est strictement informative. Elle **ne constitue pas un conseil en investissement**. Les performances passées ne préjugent pas des performances futures.
</Callout>
`;

  return { slug, content: `${frontmatter}\n\n${body}\n` };
}

async function generateTA() {
  console.log(`\n=== Génération ANALYSES TECHNIQUES pour ${TODAY} ===`);
  await fs.mkdir(TA_DIR, { recursive: true });

  let created = 0, skipped = 0, errors = 0;

  for (const crypto of TA_CRYPTOS) {
    const slug = `${TODAY}-${crypto.symbol.toLowerCase()}-analyse-technique`;
    const filePath = path.join(TA_DIR, `${slug}.mdx`);

    try {
      await fs.access(filePath);
      skipped++;
      continue;
    } catch { /* not exists */ }

    try {
      const prices = await fetchHistoricalPrices(crypto.coingeckoId, 200);
      if (prices.length < 50) throw new Error(`historical too short: ${prices.length}`);
      const live = await fetchLivePrice(crypto.coingeckoId);
      const { content } = buildTAArticle(crypto, prices, live.price, live.change24h);
      await fs.writeFile(filePath, content, "utf8");
      created++;
      console.log(`[ta-create] ${slug}`);
      // Rate limit CoinGecko free tier (30 req/min)
      await new Promise((r) => setTimeout(r, 2000));
    } catch (err) {
      errors++;
      console.error(`[ta-error] ${crypto.symbol}: ${err.message}`);
    }
  }

  console.log(`\n[ta] DONE — created=${created} skipped=${skipped} errors=${errors}`);
  return { created, skipped, errors };
}

/* -------------------------------------------------------------------------- */
/*  Main                                                                      */
/* -------------------------------------------------------------------------- */

(async () => {
  console.log(`\n========================================`);
  console.log(`  Cryptoreflex daily content generator`);
  console.log(`  Date: ${TODAY}`);
  console.log(`========================================`);

  const newsRes = await generateNews();
  const taRes = await generateTA();

  const totalCreated = newsRes.created + taRes.created;
  console.log(`\n=== TOTAL ===`);
  console.log(`Created: ${totalCreated}`);
  console.log(`Skipped: ${newsRes.skipped + taRes.skipped}`);
  console.log(`Errors:  ${newsRes.errors + taRes.errors}`);

  // Exit code 0 même si errors > 0 (best effort)
  process.exit(0);
})().catch((err) => {
  console.error(`[FATAL] ${err.message}`);
  process.exit(1);
});
