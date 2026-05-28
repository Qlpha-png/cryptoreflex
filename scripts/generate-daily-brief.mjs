#!/usr/bin/env node
/**
 * scripts/generate-daily-brief.mjs
 *
 * Génère LE brief crypto quotidien (option A) : UN seul article éditorial FR
 * de qualité qui synthétise les 3-5 actus crypto majeures du jour.
 *
 *   - Récupère les news via RSS (CoinTelegraph FR, Decrypt, CryptoSlate)
 *   - Sélectionne les plus pertinentes (mots-clés FR/crypto + récence)
 *   - Récupère le CONTENU réel de chaque source (anti-hallucination)
 *   - Demande au LLM un brief structuré "rédacteur en chef Cryptoreflex"
 *     (chapô + 1 section par actu + à surveiller + disclaimer), 100% FR,
 *     analyse + angle France (MiCA, fiscalité), sources créditées + liens
 *   - Écrit content/news/<date>-brief-crypto-du-jour.mdx
 *
 * Qualité > quantité : 1 page/jour à forte valeur (vs 10 coquilles).
 * Anti scaled-content abuse Google + 0 risque copyright (analyse originale,
 * sources créditées, pas de copie).
 *
 * Activation : OPENROUTER_API_KEY requis. Sans clé → exit 0 sans rien écrire
 * (pas de coquille). Test local : node --env-file=.env.local <ce script>.
 *
 * Usage CI : .github/workflows/daily-content.yml (step dédié).
 */

import { promises as fs } from "node:fs";
import path from "node:path";
import { fetchArticleText } from "./lib/source-fetcher.mjs";

const REPO_ROOT = path.resolve(process.cwd());
const NEWS_DIR = path.join(REPO_ROOT, "content", "news");
const TODAY = new Date().toISOString().slice(0, 10);

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const OPENROUTER_MODEL = process.env.LLM_MODEL || "anthropic/claude-3.5-sonnet";
const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";
const ANTHROPIC_MODEL = process.env.LLM_MODEL_ANTHROPIC || "claude-sonnet-4-6";
const MAX_TOKENS = 5000;
const TEMPERATURE = 0.5;
const LLM_TIMEOUT_MS = 120_000;

const RSS_SOURCES = [
  { name: "CoinTelegraph FR", url: "https://fr.cointelegraph.com/rss" },
  { name: "Decrypt", url: "https://decrypt.co/feed" },
  { name: "CryptoSlate", url: "https://cryptoslate.com/feed/" },
];

const NEWS_KEYWORDS = [
  "bitcoin", "btc", "ethereum", "eth", "solana", "sol", "xrp", "bnb",
  "mica", "regulation", "régulation", "amf", "france", "europe", "ue",
  "etf", "halving", "stablecoin", "usdc", "usdt", "defi", "staking",
  "binance", "coinbase", "kraken", "bitpanda", "ledger", "sec", "fed",
];

const SELECT_COUNT = 5;

/* -------------------------------------------------------------------------- */
/*  RSS (parser maison, zéro dépendance)                                      */
/* -------------------------------------------------------------------------- */

async function fetchRss(url) {
  const ctrl = new AbortController();
  const tid = setTimeout(() => ctrl.abort(), 8000);
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: { "User-Agent": "Cryptoreflex-DailyBot/1.0" },
    });
    if (!res.ok) throw new Error(`${url} → ${res.status}`);
    return await res.text();
  } finally {
    clearTimeout(tid);
  }
}

function parseRssItems(xml) {
  const items = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/g;
  let m;
  while ((m = itemRegex.exec(xml)) && items.length < 40) {
    const block = m[1];
    const pick = (tag) =>
      (block.match(new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`)) || [, ""])[1]
        .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/, "$1")
        .replace(/<[^>]+>/g, "")
        .trim();
    const title = pick("title");
    const link = pick("link");
    const description = pick("description");
    const pubDate = pick("pubDate");
    if (title && link) items.push({ title, link, description, pubDate });
  }
  return items;
}

async function fetchAllNews() {
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
      console.log(`[rss] ${source.name} → ${items.length} items`);
    } catch (err) {
      console.warn(`[rss-fail] ${source.name}: ${err.message}`);
    }
  }
  // Dédoublonne par lien.
  const seen = new Set();
  return all.filter((it) => (seen.has(it.link) ? false : (seen.add(it.link), true)));
}

/** Récence : timestamp pubDate (fallback 0). */
function pubTs(it) {
  const t = Date.parse(it.pubDate || "");
  return Number.isFinite(t) ? t : 0;
}

/** Sélectionne les top N news (score = pertinence mots-clés + récence). */
function selectTop(items, n) {
  const now = Date.now();
  const scored = items.map((it) => {
    const kw = it.matchedKeywords.length;
    const ageH = Math.max(0, (now - pubTs(it)) / 3_600_000);
    const recency = ageH < 36 ? (36 - ageH) / 36 : 0; // bonus si < 36h
    return { it, score: kw + recency * 2 };
  });
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, n).map((s) => s.it);
}

/* -------------------------------------------------------------------------- */
/*  LLM (OpenRouter)                                                          */
/* -------------------------------------------------------------------------- */

const SYSTEM_PROMPT = `Tu es le rédacteur en chef crypto de Cryptoreflex.fr (média FR pour investisseurs particuliers, débutants à intermédiaires). Tu rédiges LE brief quotidien : une synthèse éditoriale des actualités crypto majeures du jour.

LIGNE ÉDITORIALE
- 100% français, accents corrects, tutoiement, ton de journaliste pro mais accessible (pédagogue, sharp, sans hype ni jargon non expliqué).
- Angle FRANCE systématique : impact pour l'investisseur français, rappels MiCA / fiscalité (PFU, déclaration) quand c'est pertinent.
- EXACTITUDE FISCALE OBLIGATOIRE : le PFU (flat tax) sur les plus-values crypto est de 31,4 % depuis le 1er janvier 2026 (12,8 % d'impôt sur le revenu + 18,6 % de prélèvements sociaux). N'écris JAMAIS "30 %" comme taux courant (c'était l'ancien taux jusqu'aux gains 2025). N'invente aucun autre chiffre fiscal : si tu n'es pas sûr, reste général.
- Honnête : pas de promesse de gain, pas de "to the moon". Si une info est incertaine, tu le dis.
- Tu ANALYSES et SYNTHÉTISES les faits fournis — tu ne recopies jamais le texte source. Tu cites chaque source avec un lien.

STRUCTURE DU BRIEF (body MDX)
1. Un chapô d'intro (2-3 phrases) qui plante l'ambiance du marché du jour.
2. Une section "## " par actu majeure (titre accrocheur FR), 2-3 paragraphes chacune : le fait, le contexte, "ce que ça change pour toi". Termine chaque section par la source en lien : *Source : [Nom](url)*.
3. Une section finale "## À surveiller" (2-4 puces).
4. Un <Callout type="warning" title="Avertissement"> de disclaimer YMYL (risque de perte en capital, pas un conseil en investissement).

CONTRAINTES
- 1000-1400 mots.
- Commence le body directement par le chapô (PAS de H1, le titre est géré à part).
- NE PAS inventer de chiffres : utilise uniquement les faits des sources fournies. Si un chiffre n'est pas dans les sources, ne le cite pas.

FORMAT OUTPUT — JSON STRICT, rien autour :
{
  "title": "Titre du brief (≤90 chars, format: 'Brief crypto du <date> : <accroche>')",
  "description": "Meta SEO ≤160 chars",
  "body": "Body MDX complet"
}`;

function buildUserPrompt(date, newsList) {
  const blocks = newsList
    .map((n, i) => {
      const content = n.fullText || n.description || "(contenu non récupéré)";
      return `### Actu ${i + 1}
- Titre source : ${n.title}
- Source : ${n.source}
- URL : ${n.sourceUrl}
- Contenu (matière factuelle, à analyser et reformuler — NE PAS recopier) :
${content}`;
    })
    .join("\n\n");

  return `Date du jour : ${date}.

Voici les ${newsList.length} actualités crypto majeures du jour (matière factuelle issue des sources). Rédige LE brief quotidien Cryptoreflex en suivant strictement la ligne éditoriale et la structure.

${blocks}

Réponds UNIQUEMENT avec le JSON strict demandé.`;
}

function extractJson(raw) {
  if (typeof raw !== "string") throw new Error("LLM response not a string");
  let s = raw.trim().replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/\s*```$/i, "").trim();
  const a = s.indexOf("{");
  const b = s.lastIndexOf("}");
  if (a === -1 || b <= a) throw new Error("No JSON object in LLM response");
  return JSON.parse(s.slice(a, b + 1));
}

/** Appel API Anthropic (Messages) via fetch — zéro dépendance. */
async function callAnthropicRaw(system, user) {
  const ctrl = new AbortController();
  const tid = setTimeout(() => ctrl.abort(), LLM_TIMEOUT_MS);
  let res;
  try {
    res = await fetch(ANTHROPIC_URL, {
      method: "POST",
      signal: ctrl.signal,
      headers: {
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: ANTHROPIC_MODEL,
        max_tokens: MAX_TOKENS,
        temperature: TEMPERATURE,
        system,
        messages: [{ role: "user", content: user }],
      }),
    });
  } finally {
    clearTimeout(tid);
  }
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throw new Error(`Anthropic ${res.status}: ${t.slice(0, 200)}`);
  }
  const data = await res.json();
  const text = Array.isArray(data?.content)
    ? data.content.filter((b) => b.type === "text").map((b) => b.text).join("")
    : "";
  if (!text) throw new Error("Anthropic: no text content");
  if (data.stop_reason === "max_tokens") {
    throw new Error("Anthropic: réponse tronquée (max_tokens) — augmenter MAX_TOKENS");
  }
  return text;
}

/** Appel API OpenRouter (chat/completions) via fetch. */
async function callOpenRouterRaw(system, user) {
  const ctrl = new AbortController();
  const tid = setTimeout(() => ctrl.abort(), LLM_TIMEOUT_MS);
  let res;
  try {
    res = await fetch(OPENROUTER_URL, {
      method: "POST",
      signal: ctrl.signal,
      headers: {
        Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://www.cryptoreflex.fr",
        "X-Title": "Cryptoreflex Daily Brief",
      },
      body: JSON.stringify({
        model: OPENROUTER_MODEL,
        max_tokens: MAX_TOKENS,
        temperature: TEMPERATURE,
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
        response_format: { type: "json_object" },
      }),
    });
  } finally {
    clearTimeout(tid);
  }
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throw new Error(`OpenRouter ${res.status}: ${t.slice(0, 200)}`);
  }
  const data = await res.json();
  const content = data?.choices?.[0]?.message?.content;
  if (!content) throw new Error("OpenRouter: no content");
  return content;
}

/**
 * Dispatcher LLM : priorité à Anthropic (clé existante Kev), fallback
 * OpenRouter. Valide la sortie JSON ({title, description, body}).
 */
async function callBriefLLM(date, newsList) {
  const system = SYSTEM_PROMPT;
  const user = buildUserPrompt(date, newsList);

  let content;
  let provider;
  if (process.env.ANTHROPIC_API_KEY) {
    provider = `anthropic/${ANTHROPIC_MODEL}`;
    content = await callAnthropicRaw(system, user);
  } else if (process.env.OPENROUTER_API_KEY) {
    provider = `openrouter/${OPENROUTER_MODEL}`;
    content = await callOpenRouterRaw(system, user);
  } else {
    throw new Error("No LLM key (ANTHROPIC_API_KEY or OPENROUTER_API_KEY)");
  }

  const parsed = extractJson(content);
  for (const k of ["title", "description", "body"]) {
    if (typeof parsed[k] !== "string" || !parsed[k].trim()) {
      throw new Error(`LLM output missing field: ${k}`);
    }
  }
  if (parsed.body.length < 800) throw new Error(`Brief body too short: ${parsed.body.length}`);
  console.log(`[brief-llm] provider=${provider} body=${parsed.body.length} chars`);
  return parsed;
}

/* -------------------------------------------------------------------------- */
/*  MDX                                                                       */
/* -------------------------------------------------------------------------- */

function yamlString(s) {
  return String(s).replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

function buildMdx({ title, description, body }, sources) {
  const dateFr = new Date(TODAY).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
  const sourcesYaml = sources.map((s) => `  - "${yamlString(s)}"`).join("\n");
  const fm = `---
title: "${yamlString(title)}"
description: "${yamlString(description)}"
date: "${TODAY}"
category: "Marché"
source: "Cryptoreflex"
isBrief: true
author: "La rédaction Cryptoreflex"
image: "/og-default.png"
keywords:
  - "actualité crypto"
  - "brief crypto"
  - "crypto france ${TODAY.slice(0, 4)}"
sources:
${sourcesYaml}
---`;
  void dateFr;
  return `${fm}\n\n${body}\n`;
}

/* -------------------------------------------------------------------------- */
/*  Main                                                                      */
/* -------------------------------------------------------------------------- */

async function main() {
  console.log(`\n=== Brief crypto quotidien — ${TODAY} ===`);

  if (!process.env.ANTHROPIC_API_KEY && !process.env.OPENROUTER_API_KEY) {
    console.log("[brief] Aucune clé LLM (ANTHROPIC_API_KEY / OPENROUTER_API_KEY) → skip (aucune coquille générée).");
    process.exit(0);
  }

  await fs.mkdir(NEWS_DIR, { recursive: true });
  const slug = `${TODAY}-brief-crypto-du-jour`;
  const filePath = path.join(NEWS_DIR, `${slug}.mdx`);

  // Idempotence : si le brief du jour existe déjà, on skip.
  try {
    await fs.access(filePath);
    console.log(`[brief] ${slug} existe déjà → skip.`);
    process.exit(0);
  } catch { /* on génère */ }

  const allNews = await fetchAllNews();
  console.log(`[brief] ${allNews.length} news pertinentes`);
  if (allNews.length < 2) {
    console.log("[brief] Pas assez de news → skip.");
    process.exit(0);
  }

  const top = selectTop(allNews, SELECT_COUNT);
  console.log(`[brief] ${top.length} news sélectionnées :`);
  top.forEach((n, i) => console.log(`  ${i + 1}. [${n.source}] ${n.title}`));

  // Récupère le contenu réel de chaque source (anti-hallucination).
  for (const n of top) {
    n.fullText = await fetchArticleText(n.sourceUrl);
    console.log(`  → ${n.fullText ? `${n.fullText.length} chars` : "contenu non récupéré (fallback extrait RSS)"} — ${n.title.slice(0, 50)}`);
  }

  const out = await callBriefLLM(TODAY, top);
  const sources = top.map((n) => `${n.source} — ${n.sourceUrl}`);
  const mdx = buildMdx(out, sources);

  await fs.writeFile(filePath, mdx, "utf8");
  console.log(`\n[brief] ✅ Écrit : content/news/${slug}.mdx`);
  console.log(`[brief] Titre : ${out.title}`);
  console.log(`[brief] ${out.body.length} chars de body`);
}

main().catch((err) => {
  console.error(`[brief] ERREUR : ${err.message}`);
  process.exit(1);
});
