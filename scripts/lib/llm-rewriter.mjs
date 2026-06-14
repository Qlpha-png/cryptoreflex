/**
 * scripts/lib/llm-rewriter.mjs
 *
 * Wrapper LLM pour réécrire les news crypto en articles éditoriaux de
 * qualité journaliste (700-1100 mots, FR, sourcés, structurés).
 *
 * - Fournisseur : API Anthropic directe (https://api.anthropic.com/v1/messages)
 * - Modèle par défaut : claude-sonnet-4-6 (qualité éditoriale)
 * - Fallback : si l'appel échoue (timeout, JSON malformé, quota), throw → le
 *   caller redescend sur le rewriter déterministe (fallback transparent).
 *
 * Activation : définir ANTHROPIC_API_KEY en env.
 * Override modèle : LLM_MODEL=claude-haiku-4-5 (par exemple).
 *
 * Coût indicatif : 1 article/jour Sonnet ≈ 0,02-0,03 $/article.
 */

const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";
const ANTHROPIC_VERSION = "2023-06-01";
const DEFAULT_MODEL = process.env.LLM_MODEL || "claude-sonnet-4-6";
const MAX_TOKENS = 3500;
const TEMPERATURE = 0.5;
const TIMEOUT_MS = 60_000;

/**
 * Tarification Anthropic (USD / 1M tokens) — indicatif 2026.
 * Sert uniquement au log de coût ; n'impacte pas le comportement.
 */
const PRICING = {
  "claude-sonnet-4-6": { input: 3.0, output: 15.0 },
  "claude-haiku-4-5": { input: 1.0, output: 5.0 },
};

import { FISCAL_GUARDRAILS } from "./fiscal-guardrails.mjs";

const SYSTEM_PROMPT = `Tu es journaliste crypto pour Cryptoreflex.fr — un média français indépendant et sérieux, spécialisé crypto, dans l'esprit des Échos ou de Décrypte. Audience : investisseurs particuliers français, débutants à intermédiaires.

LIGNE ÉDITORIALE (non négociable) :
- 100 % français impeccable. Typographie française : espace insécable avant : ; ! ? et %, guillemets « », tiret cadratin — pour les incises, montants « 12 000 € ». Tutoiement.
- Journalisme factuel : tu rapportes, tu expliques, tu mets en perspective. Aucune hype, aucune promesse de gain, JAMAIS de conseil en investissement.
- Angle français systématique : qu'est-ce que ça change pour un investisseur en France ? (régulation MiCA, fiscalité, AMF, DGFiP).
- Neutralité : tu exposes les faits et les points de vue sans prendre parti.

INTERDITS ABSOLUS :
- Plagiat : tu paraphrases et analyses, tu ne recopies jamais la source.
- Inventer un chiffre, une citation ou une date absents de la source : si l'info n'est pas dans la source, reste qualitatif.
${FISCAL_GUARDRAILS}

FORMAT OUTPUT — JSON STRICT (rien autour, pas de balises code) :
{
  "title": "Titre journalistique, accrocheur mais factuel (≤ 90 caractères)",
  "description": "Chapô / meta SEO (≤ 160 caractères)",
  "category": "Marché|Régulation|Technologie|Plateformes",
  "body": "Corps MDX"
}

Le "body" doit :
- Faire 700 à 1100 mots, commencer DIRECTEMENT par un chapô (1 paragraphe d'accroche qui résume l'essentiel), puis 3 à 5 sections ## (H2).
- Suivre la pyramide inversée : l'essentiel d'abord (quoi / qui / quand), puis le contexte, puis l'analyse « ce que ça change concrètement pour toi ».
- Citer la source originale avec un lien Markdown.
- Inclure 2-3 liens internes pertinents (parmi la liste fournie dans le message).
- Se TERMINER par : <Callout type="warning" title="Avertissement">…</Callout> rappelant que ce n'est pas un conseil en investissement (volatilité, risque de perte en capital).
- NE PAS inclure de frontmatter YAML (le script s'en charge), NE PAS inclure de titre H1.

Réponds UNIQUEMENT avec l'objet JSON valide, sans aucun texte autour.`;

/**
 * Liste des slugs internes pertinents que le LLM peut citer en internal links.
 * Sert de hint dans le prompt utilisateur pour ancrer le cluster topology.
 */
const INTERNAL_LINKS_HINTS = {
  "Marché": [
    "/blog/bitcoin-guide-complet-debutant-2026",
    "/blog/etf-bitcoin-spot-europe-2026-arbitrage",
    "/blog/trader-vs-dca-vs-hodl",
  ],
  "Régulation": [
    "/blog/mica-phase-2-juillet-2026-ce-qui-change",
    "/blog/psan-vs-casp-statut-mica-plateformes-crypto",
    "/blog/comment-declarer-crypto-impots-2026-guide-complet",
  ],
  "Technologie": [
    "/blog/qu-est-ce-que-la-blockchain-guide-ultra-simple-2026",
    "/blog/layer-2-ethereum-qu-est-ce-pourquoi-crucial-2026",
    "/blog/proof-of-stake-vs-proof-of-work-difference-5-minutes",
  ],
  "Plateformes": [
    "/blog/meilleure-plateforme-crypto-debutant-france-2026",
    "/blog/plateformes-crypto-risque-mica-phase-2-alternatives",
    "/blog/alternative-binance-france-post-mica",
  ],
};

function buildUserPrompt(raw) {
  const hintsAll = Object.values(INTERNAL_LINKS_HINTS).flat();
  return `Voici une news crypto à réécrire en article éditorial Cryptoreflex.

# Source originale
- Titre : ${raw.title}
- Description : ${raw.description || "(non fournie)"}
- Source : ${raw.source}
- URL source : ${raw.sourceUrl}
- Mots-clés détectés : ${(raw.matchedKeywords || []).slice(0, 6).join(", ")}

# Liens internes disponibles (cite-en 2 ou 3 pertinents au sujet)
${hintsAll.map((s) => `- ${s}`).join("\n")}

# Mission
Rédige un article 800-1200 mots, en français, pédagogique, structuré H2/H3, qui :
1. Reformule la news SANS plagier (paraphrase + analyse)
2. Explique le contexte pour un débutant FR (rappels MiCA / fiscalité si pertinent)
3. Donne un éclairage Cryptoreflex (impact pour l'investisseur français)
4. Cite la source originale avec un lien Markdown
5. Ajoute 2-3 liens internes parmi la liste ci-dessus
6. Termine par un <Callout type="warning"> de disclaimer YMYL

Réponds UNIQUEMENT avec le JSON strict demandé. Aucun texte avant ou après.`;
}

/**
 * Robust JSON extraction : gère le cas où le modèle ajoute du texte autour
 * malgré la consigne (markdown ```json, "Voici la réponse:", etc.).
 */
function extractJson(raw) {
  if (typeof raw !== "string") throw new Error("LLM response not a string");
  // Strip markdown code fences
  let cleaned = raw.trim()
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
  // Si du texte avant {, on extrait du premier { au dernier }
  const first = cleaned.indexOf("{");
  const last = cleaned.lastIndexOf("}");
  if (first === -1 || last === -1 || last <= first) {
    throw new Error("No JSON object found in LLM response");
  }
  cleaned = cleaned.slice(first, last + 1);
  return JSON.parse(cleaned);
}

function validateLLMOutput(parsed) {
  const required = ["title", "description", "category", "body"];
  for (const k of required) {
    if (typeof parsed[k] !== "string" || parsed[k].trim().length === 0) {
      throw new Error(`LLM output missing/empty field: ${k}`);
    }
  }
  const validCategories = ["Marché", "Régulation", "Technologie", "Plateformes"];
  if (!validCategories.includes(parsed.category)) {
    // Auto-coerce sur "Marché" plutôt que throw : la cat est cosmétique.
    parsed.category = "Marché";
  }
  if (parsed.title.length > 110) parsed.title = parsed.title.slice(0, 107) + "...";
  if (parsed.description.length > 160) parsed.description = parsed.description.slice(0, 157) + "...";
  if (parsed.body.length < 500) {
    throw new Error(`LLM body too short: ${parsed.body.length} chars (expected ≥ 500)`);
  }
  return parsed;
}

function estimateCost(model, usage) {
  const p = PRICING[model];
  if (!p || !usage) return 0;
  const inputCost = ((usage.input_tokens || 0) / 1_000_000) * p.input;
  const outputCost = ((usage.output_tokens || 0) / 1_000_000) * p.output;
  return inputCost + outputCost;
}

/**
 * Appel principal. Throw en cas d'échec — le caller (rewriteNews) catch
 * et fallback sur le rewriter déterministe.
 *
 * @param {object} raw - { title, description, source, sourceUrl, matchedKeywords }
 * @param {object} opts - { model, slug } (slug pour log)
 * @returns {Promise<{ title, description, category, body, _llm: { model, tokens, cost } }>}
 */
export async function callLLMRewriter(raw, opts = {}) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY not set");

  const model = opts.model || DEFAULT_MODEL;
  const slug = opts.slug || "(unknown)";

  const ctrl = new AbortController();
  const tid = setTimeout(() => ctrl.abort(), TIMEOUT_MS);

  let res;
  try {
    res = await fetch(ANTHROPIC_URL, {
      method: "POST",
      signal: ctrl.signal,
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": ANTHROPIC_VERSION,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model,
        max_tokens: MAX_TOKENS,
        temperature: TEMPERATURE,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: buildUserPrompt(raw) }],
      }),
    });
  } finally {
    clearTimeout(tid);
  }

  if (!res.ok) {
    const errText = await res.text().catch(() => "(no body)");
    throw new Error(`Anthropic ${res.status}: ${errText.slice(0, 200)}`);
  }

  const data = await res.json();
  const content = Array.isArray(data?.content)
    ? data.content.filter((b) => b.type === "text").map((b) => b.text).join("")
    : null;
  if (!content) throw new Error("Anthropic response has no text content");

  const parsed = validateLLMOutput(extractJson(content));

  const usage = data.usage || {};
  const totalTokens = (usage.input_tokens || 0) + (usage.output_tokens || 0);
  const cost = estimateCost(model, usage);

  console.log(
    `[rewrite-llm] tokens=${totalTokens} cost=$${cost.toFixed(4)} model=${model} slug=${slug}`
  );

  parsed._llm = {
    model,
    tokens: totalTokens,
    cost,
    promptTokens: usage.input_tokens || 0,
    completionTokens: usage.output_tokens || 0,
  };
  return parsed;
}
