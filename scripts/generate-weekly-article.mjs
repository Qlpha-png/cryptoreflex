#!/usr/bin/env node
/**
 * scripts/generate-weekly-article.mjs
 *
 * Génération hebdomadaire d'un article SEO long-form (1500-2500 mots) via LLM.
 *
 * Pipeline :
 *  1. Lit le catalogue `scripts/lib/seo-topics-data.mjs` (mirror du .ts).
 *  2. Trie : compétition low first → searchVolume desc.
 *  3. Skip les topics dont le slug existe déjà dans `content/articles/`.
 *  4. Pick le 1er topic restant.
 *  5. Appelle OpenRouter (modèle anthropic/claude-3.5-sonnet par défaut).
 *  6. Valide le JSON retourné (≥ 5 H2, callout YMYL, ≥ 2 internal links, wordCount ≥ 1500).
 *  7. Si validation fail, retry 1 fois avec prompt enrichi.
 *  8. Si succès, écrit `content/articles/{slug}.mdx` avec frontmatter complet.
 *
 * Pré-requis : OPENROUTER_API_KEY en env. Si absent → exit 0 sans rien faire.
 *
 * Usage local :
 *   OPENROUTER_API_KEY=sk-or-... node scripts/generate-weekly-article.mjs
 *
 * Usage CI : voir `.github/workflows/weekly-blog.yml` (cron samedi 8h UTC).
 *
 * Coût mensuel estimé : ~4 articles × ~0.05 $/article = 0.20 $/mois.
 */

import { promises as fs } from "node:fs";
import path from "node:path";
import { SEO_TOPICS, sortTopicsByPriority } from "./lib/seo-topics-data.mjs";

/* -------------------------------------------------------------------------- */
/*  Configuration                                                             */
/* -------------------------------------------------------------------------- */

const REPO_ROOT = path.resolve(process.cwd());
const ARTICLES_DIR = path.join(REPO_ROOT, "content", "articles");
const TODAY = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
// FIX 2026-05-02 — workflow weekly-blog échouait en 6s avec
// `anthropic/claude-3.5-sonnet` : modèle DÉPRÉCIÉ sur OpenRouter (vérifié
// via /api/v1/models, plus dans la liste). Migration vers Claude Sonnet 4.5
// (équivalent qualité, supporté en priorité par OpenRouter en 2026).
// `LLM_MODEL` env override toujours possible si on veut tester un autre.
const DEFAULT_MODEL = process.env.LLM_MODEL || "anthropic/claude-sonnet-4.5";
const MAX_TOKENS = 8000;          // ~6000 mots français max
const TEMPERATURE = 0.5;          // Factuel mais pas robotique
const TIMEOUT_MS = 120_000;       // 2 min (long-form prend du temps)

const MIN_H2_COUNT = 5;
const MIN_INTERNAL_LINKS = 2;
const MIN_WORD_COUNT = 1500;
const MAX_RETRIES = 1;

// Pricing OpenRouter ($/M tokens). Sonnet 4.5/4.6 alignés sur Anthropic
// list price (3 in / 15 out). Haiku 4.5 = 1/5. Garde l'historique 3.5
// (déprécié) pour ne pas crasher l'estimateur si LLM_MODEL=ancien.
const PRICING = {
  "anthropic/claude-sonnet-4.5": { input: 3.00, output: 15.00 },
  "anthropic/claude-sonnet-4.6": { input: 3.00, output: 15.00 },
  "anthropic/claude-haiku-4.5":  { input: 1.00, output: 5.00 },
  "anthropic/claude-3.5-sonnet": { input: 3.00, output: 15.00 },
  "anthropic/claude-3.5-haiku":  { input: 1.00, output: 5.00 },
  "openai/gpt-4o":               { input: 2.50, output: 10.00 },
  "openai/gpt-4o-mini":          { input: 0.15, output: 0.60 },
};

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                   */
/* -------------------------------------------------------------------------- */

function yamlString(s) {
  return String(s ?? "").replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

function frenchCategoryLabel(cat) {
  const map = {
    fiscalite: "Fiscalité",
    mica: "Régulation MiCA",
    securite: "Sécurité",
    acheter: "Acheter & Plateformes",
    comprendre: "Comprendre",
    marche: "Marché",
  };
  return map[cat] || "Crypto";
}

/**
 * Compte les mots d'un body MDX (strip code blocks, JSX, markdown formatting).
 */
function countWords(body) {
  const stripped = String(body)
    .replace(/```[\s\S]*?```/g, " ")              // code blocks
    .replace(/<[^>]+>/g, " ")                      // JSX/HTML
    .replace(/[#*_~`>|[\](){}]/g, " ")             // markdown
    .replace(/\s+/g, " ")
    .trim();
  if (!stripped) return 0;
  return stripped.split(/\s+/).filter(Boolean).length;
}

function countH2(body) {
  return (String(body).match(/^##\s+\S/gm) || []).length;
}

function countInternalLinks(body, hints) {
  const hintsSet = new Set(hints);
  const matches = String(body).match(/\]\(\/blog\/([a-z0-9\-]+)\)/g) || [];
  let count = 0;
  for (const m of matches) {
    const slug = m.replace(/^\]\(\/blog\//, "").replace(/\)$/, "");
    if (hintsSet.has(slug)) count++;
  }
  return count;
}

function hasYmylCallout(body) {
  // Match <Callout type="warning" ... title="Avertissement"...>...</Callout>
  return /<Callout[^>]*type=["']warning["'][^>]*>[\s\S]{20,}<\/Callout>/.test(String(body));
}

/* -------------------------------------------------------------------------- */
/*  Topic picker                                                              */
/* -------------------------------------------------------------------------- */

async function listExistingSlugs() {
  try {
    const files = await fs.readdir(ARTICLES_DIR);
    return new Set(
      files
        .filter((f) => f.endsWith(".mdx") || f.endsWith(".md"))
        .map((f) => f.replace(/\.mdx?$/, ""))
    );
  } catch {
    return new Set();
  }
}

async function pickNextTopic() {
  const existing = await listExistingSlugs();
  const sorted = sortTopicsByPriority(SEO_TOPICS.filter((t) => !t.disabled));
  for (const topic of sorted) {
    if (!existing.has(topic.slug)) {
      return topic;
    }
  }
  return null;
}

/* -------------------------------------------------------------------------- */
/*  LLM prompt                                                                */
/* -------------------------------------------------------------------------- */

const SYSTEM_PROMPT = `Tu es journaliste expert crypto pour Cryptoreflex.fr (audience FR débutants/intermédiaires).
Mission : rédiger un article SEO long-form de 1500-2500 mots, qualité éditoriale humaine.

RÈGLES STRICTES :
- 100% français, accents corrects (à é è ê ç ô û ï)
- Tutoiement (style Cryptoreflex)
- Aucun jargon non expliqué (toujours définir les termes techniques en parenthèses ou via une mini-définition)
- Disclaimer YMYL OBLIGATOIRE en fin d'article : <Callout type="warning" title="Avertissement">Cet article est purement informatif. Il ne constitue pas un conseil...</Callout>
- Sources légales/officielles citées si applicable (BOFiP, AMF, ESMA, règlement UE 2023/1114, articles du CGI)
- Internal links naturels vers articles existants : utilise les slugs fournis sous forme [Texte ancre](/blog/slug-exact)
- Structure :
  - Intro 100 mots (hook + promesse claire)
  - 5 à 8 H2 (suis l'outline fourni, mais reformule les titres pour qu'ils soient SEO + naturels)
  - H3 sous-sections quand pertinent
  - Tableaux markdown si comparaison (||---||)
  - Encarts <Callout type="info|warning|success" title="..."> aux moments clés
  - Conclusion + CTA vers /outils, /blog ou /comparatif
  - Section FAQ avec 5 questions/réponses à la fin (chaque question en H3)
- Pas de promesse d'enrichissement ("multipliez votre capital", "garantie")
- Pas de pression psychologique (FOMO, urgence)
- Reste factuel, pédagogique, neutre

OUTPUT FORMAT JSON STRICT :
{
  "title": "Titre Cryptoreflex (≤ 90 chars)",
  "description": "Meta SEO (≤ 160 chars)",
  "tags": ["tag1", "tag2", "tag3", "tag4", "tag5"],
  "wordCount": 2150,
  "body": "Body MDX complet avec H2/H3, callouts, internal links, tableaux, FAQ. Ne PAS inclure de frontmatter YAML, ne PAS inclure de H1."
}

Réponds UNIQUEMENT avec un objet JSON valide, sans texte autour, sans \`\`\`json wrapper.`;

function buildUserPrompt(topic, retryHint = null) {
  const baseInstructions = `Voici le brief pour l'article de la semaine.

# Sujet
- Slug cible : ${topic.slug}
- Titre suggéré : ${topic.title}
- Catégorie : ${frenchCategoryLabel(topic.category)}
- Cluster SEO : ${topic.cluster}
- Volume mensuel estimé : ${topic.searchVolumeMo} recherches/mois
- Niveau de compétition : ${topic.competitionLevel}

# Outline imposé (5-8 H2)
${topic.outline.map((h, i) => `${i + 1}. ${h}`).join("\n")}

# Liens internes à insérer (slugs OBLIGATOIRES, exact format /blog/slug)
${topic.internalLinksHints.map((s) => `- /blog/${s}`).join("\n")}

# Mission
Rédige un article 1500-2500 mots, en français, pédagogique, structuré H2/H3, qui :
1. Suit l'outline fourni (tu peux reformuler les titres H2 mais garde le sens et l'ordre)
2. Insère AU MOINS 2 liens internes parmi la liste ci-dessus, sous forme [texte ancre naturel](/blog/slug)
3. Inclut au moins 1 tableau markdown si comparaison pertinente
4. Inclut un encart <Callout type="warning" title="Avertissement"> en fin d'article (disclaimer YMYL)
5. Termine par une section FAQ (H2 "FAQ" + 5 questions en H3)
6. Cite des sources officielles si fiscalité/régulation (BOFiP, AMF, ESMA, règlement UE)`;

  const retrySection = retryHint
    ? `

# IMPORTANT — RETRY
Le dernier essai a échoué pour la raison suivante : "${retryHint}"
Corrige absolument ce point cette fois-ci.`
    : "";

  return baseInstructions + retrySection + `

Réponds UNIQUEMENT avec le JSON strict demandé. Aucun texte avant ou après.`;
}

/* -------------------------------------------------------------------------- */
/*  LLM call                                                                  */
/* -------------------------------------------------------------------------- */

function extractJson(raw) {
  if (typeof raw !== "string") throw new Error("LLM response not a string");
  let cleaned = raw.trim()
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
  const first = cleaned.indexOf("{");
  const last = cleaned.lastIndexOf("}");
  if (first === -1 || last === -1 || last <= first) {
    throw new Error("No JSON object found in LLM response");
  }
  cleaned = cleaned.slice(first, last + 1);
  return JSON.parse(cleaned);
}

function estimateCost(model, usage) {
  const p = PRICING[model];
  if (!p || !usage) return 0;
  const inputCost = ((usage.prompt_tokens || 0) / 1_000_000) * p.input;
  const outputCost = ((usage.completion_tokens || 0) / 1_000_000) * p.output;
  return inputCost + outputCost;
}

async function callLLM(topic, retryHint = null) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error("OPENROUTER_API_KEY not set");

  const model = DEFAULT_MODEL;
  const ctrl = new AbortController();
  const tid = setTimeout(() => ctrl.abort(), TIMEOUT_MS);

  let res;
  try {
    res = await fetch(OPENROUTER_URL, {
      method: "POST",
      signal: ctrl.signal,
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://www.cryptoreflex.fr",
        "X-Title": "Cryptoreflex Weekly Long-form",
      },
      body: JSON.stringify({
        model,
        max_tokens: MAX_TOKENS,
        temperature: TEMPERATURE,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: buildUserPrompt(topic, retryHint) },
        ],
        response_format: { type: "json_object" },
      }),
    });
  } finally {
    clearTimeout(tid);
  }

  if (!res.ok) {
    const errText = await res.text().catch(() => "(no body)");
    throw new Error(`OpenRouter ${res.status}: ${errText.slice(0, 200)}`);
  }

  const data = await res.json();
  const content = data?.choices?.[0]?.message?.content;
  if (!content) throw new Error("OpenRouter response has no content");

  const parsed = extractJson(content);
  const usage = data.usage || {};
  const totalTokens = (usage.prompt_tokens || 0) + (usage.completion_tokens || 0);
  const cost = estimateCost(model, usage);

  console.log(
    `[llm] tokens=${totalTokens} (in=${usage.prompt_tokens || 0} out=${usage.completion_tokens || 0}) cost=$${cost.toFixed(4)} model=${model.split("/").pop()}`
  );

  return { parsed, model, tokens: totalTokens, cost };
}

/* -------------------------------------------------------------------------- */
/*  Validation                                                                */
/* -------------------------------------------------------------------------- */

function validate(parsed, topic) {
  const errors = [];

  // Champs requis
  for (const k of ["title", "description", "tags", "body"]) {
    if (!parsed[k] || (typeof parsed[k] === "string" && parsed[k].trim().length === 0)) {
      errors.push(`Missing or empty field: ${k}`);
    }
  }
  if (!Array.isArray(parsed.tags) || parsed.tags.length < 3) {
    errors.push(`tags must be array of ≥3 strings`);
  }

  if (errors.length > 0) {
    return { ok: false, reason: errors.join(" | ") };
  }

  // Tronque title et description si dépasse
  if (parsed.title.length > 110) parsed.title = parsed.title.slice(0, 107) + "...";
  if (parsed.description.length > 160) parsed.description = parsed.description.slice(0, 157) + "...";

  // Word count
  const wc = countWords(parsed.body);
  parsed._actualWordCount = wc;
  if (wc < MIN_WORD_COUNT) {
    return { ok: false, reason: `wordCount too low: ${wc} (min ${MIN_WORD_COUNT})` };
  }

  // H2 count
  const h2 = countH2(parsed.body);
  parsed._h2Count = h2;
  if (h2 < MIN_H2_COUNT) {
    return { ok: false, reason: `Not enough H2: ${h2} (min ${MIN_H2_COUNT})` };
  }

  // YMYL callout
  if (!hasYmylCallout(parsed.body)) {
    return { ok: false, reason: `Missing YMYL <Callout type="warning"> at end of article` };
  }

  // Internal links (au moins MIN_INTERNAL_LINKS pointant vers les hints)
  const linksOk = countInternalLinks(parsed.body, topic.internalLinksHints);
  parsed._internalLinksFound = linksOk;
  if (linksOk < MIN_INTERNAL_LINKS) {
    return {
      ok: false,
      reason: `Not enough internal links pointing to hints: ${linksOk}/${MIN_INTERNAL_LINKS} (expected slugs: ${topic.internalLinksHints.join(", ")})`,
    };
  }

  return { ok: true };
}

/* -------------------------------------------------------------------------- */
/*  MDX writer                                                                */
/* -------------------------------------------------------------------------- */

function buildMdx(topic, parsed) {
  const tagsYaml = parsed.tags.slice(0, 8).map((t) => `  - "${yamlString(t)}"`).join("\n");
  const keywordsYaml = topic.outline.slice(0, 5).map((o) =>
    `  - "${yamlString(o.toLowerCase().slice(0, 60))}"`
  ).join("\n");

  const frontmatter = `---
title: "${yamlString(parsed.title)}"
slug: "${topic.slug}"
description: "${yamlString(parsed.description)}"
date: "${TODAY}"
publishedAt: "${TODAY}"
updatedAt: "${TODAY}"
lastUpdated: "${TODAY}"
category: "${frenchCategoryLabel(topic.category)}"
cluster: "${topic.cluster}"
author: "Cryptoreflex"
image: "/og-default.png"
readTime: "${Math.max(6, Math.round((parsed._actualWordCount || parsed.wordCount || 1800) / 220))} min"
readingTime: ${Math.max(6, Math.round((parsed._actualWordCount || parsed.wordCount || 1800) / 220))}
wordCount: ${parsed._actualWordCount || parsed.wordCount || 1800}
tags:
${tagsYaml}
keywords:
${keywordsYaml}
type: "guide"
status: "published"
generatedBy: "weekly-llm-${parsed._llmModel || DEFAULT_MODEL}"
---`;

  return `${frontmatter}\n\n${parsed.body.trim()}\n`;
}

async function writeArticle(topic, parsed) {
  await fs.mkdir(ARTICLES_DIR, { recursive: true });
  const filePath = path.join(ARTICLES_DIR, `${topic.slug}.mdx`);
  const content = buildMdx(topic, parsed);
  await fs.writeFile(filePath, content, "utf8");
  return filePath;
}

/* -------------------------------------------------------------------------- */
/*  Main                                                                      */
/* -------------------------------------------------------------------------- */

(async () => {
  console.log(`\n========================================`);
  console.log(`  Cryptoreflex weekly long-form generator`);
  console.log(`  Date: ${TODAY}`);
  console.log(`========================================\n`);

  if (!process.env.OPENROUTER_API_KEY) {
    console.warn("[skip] OPENROUTER_API_KEY required for weekly blog generation. Exiting cleanly.");
    process.exit(0);
  }

  // 1. Pick topic
  const topic = await pickNextTopic();
  if (!topic) {
    console.warn("[skip] No remaining topic in SEO_TOPICS (all already published). Add new topics in lib/seo-keyword-targets.ts + scripts/lib/seo-topics-data.mjs.");
    process.exit(0);
  }

  console.log(`[topic] picked: ${topic.slug}`);
  console.log(`[topic] title: ${topic.title}`);
  console.log(`[topic] category: ${topic.category} | cluster: ${topic.cluster}`);
  console.log(`[topic] volume=${topic.searchVolumeMo}/mo | competition=${topic.competitionLevel}\n`);

  // 2. Generate (with 1 retry)
  let parsed = null;
  let lastReason = null;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      console.log(`[llm] attempt ${attempt + 1}/${MAX_RETRIES + 1}`);
      const llmRes = await callLLM(topic, attempt > 0 ? lastReason : null);
      const candidate = llmRes.parsed;
      candidate._llmModel = llmRes.model;
      candidate._llmTokens = llmRes.tokens;
      candidate._llmCost = llmRes.cost;

      const v = validate(candidate, topic);
      if (v.ok) {
        parsed = candidate;
        console.log(`[validate] OK — wordCount=${candidate._actualWordCount} h2=${candidate._h2Count} internalLinks=${candidate._internalLinksFound}`);
        break;
      } else {
        console.warn(`[validate-fail] ${v.reason}`);
        lastReason = v.reason;
        if (attempt === MAX_RETRIES) {
          throw new Error(`Validation failed after ${MAX_RETRIES + 1} attempts. Last reason: ${v.reason}`);
        }
      }
    } catch (err) {
      console.error(`[llm-error] attempt ${attempt + 1}: ${err.message}`);
      if (attempt === MAX_RETRIES) {
        console.error(`[FATAL] Giving up after ${MAX_RETRIES + 1} attempts.`);
        process.exit(1);
      }
    }
  }

  // 3. Write
  const filePath = await writeArticle(topic, parsed);
  console.log(`\n[write] ${filePath}`);
  console.log(`[done] cost=$${(parsed._llmCost || 0).toFixed(4)} tokens=${parsed._llmTokens || 0}\n`);
  process.exit(0);
})().catch((err) => {
  console.error(`[FATAL] ${err.message}`);
  if (err.stack) console.error(err.stack);
  process.exit(1);
});
