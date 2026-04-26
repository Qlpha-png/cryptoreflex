/**
 * scripts/lib/llm-rewriter.mjs
 *
 * Wrapper LLM optionnel pour réécrire les news crypto en articles éditoriaux
 * de qualité (800-1200 mots, FR, sourcés, structurés).
 *
 * - Fournisseur : OpenRouter (https://openrouter.ai/api/v1/chat/completions)
 * - Modèle par défaut : anthropic/claude-3-haiku (rapide, ~0.001$/news)
 * - Fallback : si l'appel échoue (timeout, JSON malformé, quota), throw → le
 *   caller redescend sur le rewriter déterministe (fallback transparent).
 *
 * Activation : définir OPENROUTER_API_KEY en env.
 * Override modèle : LLM_MODEL=openai/gpt-4o-mini (par exemple).
 *
 * Coût mensuel estimé : 10 news/jour × 30 jours × ~0.001$/news ≈ 0.30 $/mois.
 */

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const DEFAULT_MODEL = process.env.LLM_MODEL || "anthropic/claude-3-haiku";
const MAX_TOKENS = 1500;
const TEMPERATURE = 0.4;
const TIMEOUT_MS = 30_000;

/**
 * Tarification OpenRouter (USD / 1M tokens) — chiffres indicatifs avril 2026.
 * Sert uniquement au log de coût ; n'impacte pas le comportement.
 */
const PRICING = {
  "anthropic/claude-3-haiku":   { input: 0.25, output: 1.25 },
  "anthropic/claude-3.5-haiku": { input: 1.00, output: 5.00 },
  "openai/gpt-4o-mini":         { input: 0.15, output: 0.60 },
  "openai/gpt-4o":              { input: 2.50, output: 10.00 },
  "google/gemini-flash-1.5":    { input: 0.075, output: 0.30 },
};

const SYSTEM_PROMPT = `Tu es journaliste crypto français, expert MiCA et fiscalité. Tu rédiges pour Cryptoreflex.fr (audience FR débutants/intermédiaires).

RÈGLES :
- 100% français (accents corrects, tutoiement)
- Style pédagogique sans jargon non expliqué
- Pas de promesse d'enrichissement, pas de "gain garanti"
- Disclaimer YMYL OBLIGATOIRE en fin
- Source citée avec lien
- 800-1200 mots, structure H2/H3 logique
- SEO long-tail (réutilise mots-clés du sujet original)

FORMAT OUTPUT JSON STRICT :
{
  "title": "Titre Cryptoreflex (≤90 chars)",
  "description": "Meta SEO (≤160 chars)",
  "category": "Marché|Régulation|Technologie|Plateformes",
  "body": "Body MDX avec H2/H3, callouts, internal links"
}

Le champ "body" doit :
- Commencer directement par un H2 (## Titre)
- Inclure 3 à 5 sections H2/H3 logiquement enchaînées
- Citer la source originale avec lien Markdown
- Inclure 2-3 liens internes vers /blog/... (ex: /blog/mica-phase-2-juillet-2026-ce-qui-change)
- Terminer par un <Callout type="warning" title="Avertissement">...</Callout> avec disclaimer YMYL
- NE PAS inclure de frontmatter YAML (le script s'en charge)
- NE PAS inclure de H1 (## c'est la racine)

Réponds UNIQUEMENT avec un objet JSON valide, sans texte autour, sans \`\`\`json wrapper.`;

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
  const inputCost = ((usage.prompt_tokens || 0) / 1_000_000) * p.input;
  const outputCost = ((usage.completion_tokens || 0) / 1_000_000) * p.output;
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
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error("OPENROUTER_API_KEY not set");

  const model = opts.model || DEFAULT_MODEL;
  const slug = opts.slug || "(unknown)";

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
        "X-Title": "Cryptoreflex Daily Content",
      },
      body: JSON.stringify({
        model,
        max_tokens: MAX_TOKENS,
        temperature: TEMPERATURE,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: buildUserPrompt(raw) },
        ],
        // Force JSON output sur les modèles qui supportent (OpenAI, Anthropic récents).
        // Si le modèle ne supporte pas, OpenRouter ignore silencieusement.
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

  const parsed = validateLLMOutput(extractJson(content));

  const usage = data.usage || {};
  const totalTokens = (usage.prompt_tokens || 0) + (usage.completion_tokens || 0);
  const cost = estimateCost(model, usage);

  console.log(
    `[rewrite-llm] tokens=${totalTokens} cost=$${cost.toFixed(4)} model=${model.split("/")[1] || model} slug=${slug}`
  );

  parsed._llm = {
    model,
    tokens: totalTokens,
    cost,
    promptTokens: usage.prompt_tokens || 0,
    completionTokens: usage.completion_tokens || 0,
  };
  return parsed;
}
