#!/usr/bin/env node
/**
 * scripts/generate-fiche-crypto.mjs
 *
 * Phase 3 PROTOTYPE — pipeline de generation auto de fiches crypto T3.
 * Audit regle des 3 cycle 9 — POC pour valider la qualite editoriale du
 * LLM AVANT d'investir dans la migration DB Supabase.
 *
 * Pipeline :
 *  1. Fetch raw data depuis CoinGecko (overview, market, dev stats)
 *  2. Fetch DefiLlama (TVL si applicable)
 *  3. Build prompt structure 12 sections (schema fiche profonde)
 *  4. Call OpenRouter (Claude Sonnet 4.6)
 *  5. Valide JSON output (structure complete, mots min)
 *  6. Ecrit content/cryptos-fiches/{slug}.json + preview .md
 *  7. Log tokens + cout
 *
 * Pre-requis : OPENROUTER_API_KEY en env. Sans cle, dry-run mode (fetch
 * data + build prompt mais skip LLM call → pour valider la structure).
 *
 * Usage local :
 *   OPENROUTER_API_KEY=sk-or-... node scripts/generate-fiche-crypto.mjs solana
 *   node scripts/generate-fiche-crypto.mjs solana --dry-run
 *
 * Cout estime : ~$0.05 par fiche (4K tokens output × $15/M = $0.06).
 * 10K fiches = ~$600 one-shot. Refresh hebdo = ~$150/mois (mass).
 */

import { promises as fs } from "node:fs";
import path from "node:path";

/* -------------------------------------------------------------------------- */
/*  Configuration                                                             */
/* -------------------------------------------------------------------------- */

const REPO_ROOT = path.resolve(process.cwd());
const OUTPUT_DIR = path.join(REPO_ROOT, "content", "cryptos-fiches");
const PREVIEW_DIR = path.join(REPO_ROOT, "content", "cryptos-fiches", "preview");

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const DEFAULT_MODEL = process.env.LLM_MODEL || "anthropic/claude-sonnet-4.5";
const MAX_TOKENS = 8000;
const TEMPERATURE = 0.4; // Plus factuel que weekly-article (0.5)
const TIMEOUT_MS = 180_000; // 3 min — fiche profonde > article hebdo

// Pricing aligne sur generate-weekly-article.mjs.
const PRICING = {
  "anthropic/claude-sonnet-4.5": { input: 3.0, output: 15.0 },
  "anthropic/claude-sonnet-4.6": { input: 3.0, output: 15.0 },
  "anthropic/claude-haiku-4.5": { input: 1.0, output: 5.0 },
};

/* -------------------------------------------------------------------------- */
/*  Fetchers raw data                                                         */
/* -------------------------------------------------------------------------- */

/**
 * Fetch overview CoinGecko : tokenomics, supply, links, audit info.
 * Endpoint : /coins/{id} (no key needed, free tier).
 */
async function fetchCoinGeckoOverview(coingeckoId) {
  const url = `https://api.coingecko.com/api/v3/coins/${coingeckoId}?localization=false&tickers=false&market_data=true&community_data=true&developer_data=true&sparkline=false`;
  const ctrl = new AbortController();
  const tid = setTimeout(() => ctrl.abort(), 15_000);
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: { Accept: "application/json", "User-Agent": "cryptoreflex-fiche-pipeline/1.0" },
    });
    if (!res.ok) {
      console.warn(`[fetcher] CoinGecko ${res.status} for ${coingeckoId}`);
      return null;
    }
    return await res.json();
  } catch (err) {
    console.warn(`[fetcher] CoinGecko error for ${coingeckoId}:`, err.message);
    return null;
  } finally {
    clearTimeout(tid);
  }
}

/**
 * Fetch DefiLlama TVL (chain L1/L2 OU protocol DeFi). Best-effort.
 * Pour Solana/ETH/etc → endpoint /chains retourne TVL totale de la chain.
 * Pour Aave/Uniswap → endpoint /protocol/{slug}.
 */
async function fetchDefiLlama(coingeckoId, name) {
  // Tentative 1 : si c'est une chain (L1/L2), match via endpoint /chains.
  try {
    const ctrl = new AbortController();
    const tid = setTimeout(() => ctrl.abort(), 8_000);
    const res = await fetch("https://api.llama.fi/v2/chains", {
      signal: ctrl.signal,
      headers: { Accept: "application/json" },
    });
    clearTimeout(tid);
    if (res.ok) {
      const chains = await res.json();
      // Match par gecko_id (DefiLlama l'expose) puis par name normalise.
      const normalized = (s) => String(s ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");
      const found = chains.find(
        (c) =>
          c.gecko_id === coingeckoId ||
          normalized(c.name) === normalized(name) ||
          normalized(c.tokenSymbol) === normalized(name),
      );
      if (found) {
        return {
          type: "chain",
          tvl: found.tvl ?? 0,
          chainName: found.name,
          tokenSymbol: found.tokenSymbol,
        };
      }
    }
  } catch {
    /* continue */
  }

  // Tentative 2 : protocol DeFi (Aave, Uniswap, Lido, etc.).
  const candidates = [coingeckoId, coingeckoId.replace(/-/g, ""), coingeckoId.replace(/-finance|-protocol|-network/g, "")];
  for (const slug of candidates) {
    try {
      const ctrl = new AbortController();
      const tid = setTimeout(() => ctrl.abort(), 8_000);
      const res = await fetch(`https://api.llama.fi/protocol/${slug}`, {
        signal: ctrl.signal,
        headers: { Accept: "application/json" },
      });
      clearTimeout(tid);
      if (res.ok) {
        const data = await res.json();
        if (data && data.tvl !== undefined) {
          return {
            type: "protocol",
            tvl: Array.isArray(data.tvl)
              ? data.tvl[data.tvl.length - 1]?.totalLiquidityUSD ?? 0
              : data.tvl ?? 0,
            category: data.category,
            chains: data.chains,
            audits: data.audits,
            slug: data.slug,
          };
        }
      }
    } catch {
      /* continue */
    }
  }
  return null;
}

/**
 * Synthese raw data en un objet compact pour prompt.
 * Strip les noise (markets list 100+ items, ticker arrays, etc.).
 */
function compactRawData(coingeckoId, cg, llama) {
  if (!cg) {
    return { coingeckoId, missing: "coingecko data unavailable" };
  }
  const md = cg.market_data ?? {};
  const dev = cg.developer_data ?? {};
  const com = cg.community_data ?? {};
  return {
    coingeckoId: cg.id ?? coingeckoId,
    symbol: (cg.symbol ?? "").toUpperCase(),
    name: cg.name,
    genesisDate: cg.genesis_date,
    categories: cg.categories,
    description_en: (cg.description?.en ?? "").slice(0, 1500),
    homepage: cg.links?.homepage?.find((u) => u && u.length > 0) ?? null,
    // CoinGecko whitepaper field varie : parfois string, parfois objet, parfois array.
    // Normalise en string url plate.
    whitepaper: (() => {
      const w = cg.links?.whitepaper;
      if (!w) return null;
      if (typeof w === "string") return w;
      if (Array.isArray(w)) return w.find((s) => typeof s === "string" && s.startsWith("http")) ?? null;
      if (typeof w === "object") {
        const vals = Object.values(w).filter((v) => typeof v === "string" && v.startsWith("http"));
        return vals[0] ?? null;
      }
      return null;
    })(),
    repos: (cg.links?.repos_url?.github ?? []).slice(0, 3),
    twitter: cg.links?.twitter_screen_name,
    market: {
      priceUsd: md.current_price?.usd ?? null,
      marketCapUsd: md.market_cap?.usd ?? null,
      fdvUsd: md.fully_diluted_valuation?.usd ?? null,
      volume24hUsd: md.total_volume?.usd ?? null,
      ath: md.ath?.usd ?? null,
      athDate: md.ath_date?.usd,
      atl: md.atl?.usd ?? null,
      atlDate: md.atl_date?.usd,
      change24h: md.price_change_percentage_24h ?? null,
      change7d: md.price_change_percentage_7d ?? null,
      change30d: md.price_change_percentage_30d ?? null,
      change1y: md.price_change_percentage_1y ?? null,
    },
    supply: {
      circulating: md.circulating_supply ?? null,
      total: md.total_supply ?? null,
      max: md.max_supply ?? null,
    },
    rank: cg.market_cap_rank,
    devActivity: {
      stars: dev.stars ?? null,
      forks: dev.forks ?? null,
      contributors: dev.pull_request_contributors ?? null,
      commitsLast4Weeks: dev.commit_count_4_weeks ?? null,
      issuesClosedLast4Weeks: dev.closed_issues ?? null,
    },
    social: {
      twitterFollowers: com.twitter_followers ?? null,
      redditSubscribers: com.reddit_subscribers ?? null,
    },
    contracts: cg.platforms ?? {},
    defiLlama: llama,
  };
}

/* -------------------------------------------------------------------------- */
/*  Prompt builder (schema fiche profonde 12 sections)                       */
/* -------------------------------------------------------------------------- */

const SYSTEM_PROMPT = `Tu es analyste crypto senior pour Cryptoreflex.fr (audience FR debutants/intermediaires).
Mission : rediger une fiche d'analyse complete et structuree d'une crypto, qualite editoriale humaine, basee sur les donnees factuelles fournies.

REGLES STRICTES :
- 100% francais, accents corrects (a e e e c o u i)
- TUTOIEMENT OBLIGATOIRE : utilise toujours "tu/te/toi/ton/tes" pour t'adresser au lecteur.
  JAMAIS "vous" ni "on" impersonnel. C'est la voix Cryptoreflex.
  Exemples : "tu peux acheter SOL", "ton portefeuille", "ce que tu dois savoir".
- Aucun jargon non explique (definir les termes techniques en parentheses)
- Factuel, neutre, pedagogique. Aucune promesse d'enrichissement, aucun FOMO
- Disclaimer YMYL en fin (champ "disclaimer" du JSON)
- Cite les chiffres factuels (prix, mcap, supply) issus des donnees fournies
- Si une donnee est manquante ou incertaine, dis-le explicitement plutot qu'inventer
- Pour les sections subjectives (thesis, moats, risks), reste prudent et nuance
- DATE CUTOFF : base TOUTES tes affirmations factuelles UNIQUEMENT sur les donnees
  fournies dans le user prompt. N'invente AUCUNE actualite recente, dates, ou
  evenement qui ne serait pas explicitement dans les data. Si pas d'info sur un
  point, ecris "a verifier sur sources externes" plutot qu'inventer.
- LIENS academy/ : pour furtherReading, ne PAS inventer de slugs Cryptoreflex
  (type "/academy/proof-of-history" si pas dans la liste connue). Privilegie
  type="external" avec liens officiels (whitepaper, docs, explorateurs blocs,
  github). Tu peux utiliser au max 1 lien type="academy" generique du genre
  "/academy/fiscalite-crypto-france" si fiscalite mentionnee, ou rien.

OUTPUT FORMAT JSON STRICT :
{
  "tldr": "3 phrases ultra-concises (max 280 caracteres total) — l'essentiel pour comprendre le projet en 30s",
  "thesis": "200-400 mots — Pourquoi ce projet existe, qu'est-ce qu'il resout, sa proposition de valeur unique. Pedagogique, sans jargon.",
  "howItWorks": "300-500 mots — Comment ca marche techniquement, accessible debutant. Consensus, architecture, innovations cles.",
  "tokenomics": "300-500 mots — Supply, distribution, vesting, utilite du token, mecanismes inflation/burn. Cite les chiffres factuels.",
  "metrics": {
    "narrative": "150-250 mots — Lecture commentee des metriques live (prix, mcap, ATH/ATL, evolution 24h/7d/30d/1y). Met en perspective sans speculation.",
    "keyFigures": [
      {"label": "Prix actuel", "value": "$X.XX"},
      {"label": "Market cap", "value": "$X.XB"},
      {"label": "Supply circulant", "value": "X tokens"},
      {"label": "ATH", "value": "$X.XX (date)"},
      {"label": "Performance 1 an", "value": "+/-X%"}
    ]
  },
  "scores": {
    "decentralization": {"score": 0-100, "rationale": "30-60 mots de justification"},
    "complianceFrEu": {"score": 0-100, "rationale": "30-60 mots — PSAN, MiCA, exchanges FR disponibles"},
    "technicalMaturity": {"score": 0-100, "rationale": "30-60 mots — audits, age, incidents historiques, github"},
    "communityHealth": {"score": 0-100, "rationale": "30-60 mots — engagement organique, dev contribs"},
    "overall": {"score": 0-100, "rationale": "40-80 mots — synthese composite ponderee"}
  },
  "competitors": [
    {"coingeckoId": "slug-coingecko", "name": "Nom", "differentiator": "30-50 mots — Comment ce concurrent se differencie"}
  ],
  "moats": [
    {"type": "network_effect|tech_edge|team|brand|other", "description": "30-60 mots"}
  ],
  "risks": [
    {"category": "technical|regulatory|market|team|adoption", "severity": "low|medium|high|critical", "description": "40-80 mots"}
  ],
  "frEuStatus": "200-300 mots — Statut FR/EU specifique : disponible sur quels exchanges PSAN ? Conformite MiCA ? Implications fiscales (Cerfa 2086) ? Particularites legales pour residents FR.",
  "furtherReading": [
    {"type": "academy|external", "title": "Titre", "url_or_slug": "/academy/slug ou https://..."}
  ],
  "recentNews": "100-200 mots — Synthese factuelle des actus recentes notables (hard forks, partnerships, listings, incidents) si connu. Si pas de donnee fiable, dire 'a verifier sur sources externes'.",
  "disclaimer": "Avertissement YMYL standard : informatif uniquement, pas conseil investissement, risques crypto",
  "factCheckNotes": "50-100 mots — Liste les points qui necessiteraient verification humaine avant publication (donnees incertaines, infos a sourcer, claims a valider)"
}

Reponds UNIQUEMENT avec un objet JSON valide, sans texte autour, sans \`\`\`json wrapper.`;

function buildUserPrompt(rawData) {
  return `Voici les donnees factuelles d'une crypto a analyser. Genere la fiche structuree complete en suivant le schema JSON impose.

# Identite
- coingeckoId : ${rawData.coingeckoId}
- Symbol : ${rawData.symbol ?? "?"}
- Name : ${rawData.name ?? "?"}
- Genesis : ${rawData.genesisDate ?? "?"}
- Categories CoinGecko : ${(rawData.categories ?? []).join(", ") || "?"}
- Description officielle (EN, brut) : ${rawData.description_en?.slice(0, 800) ?? "?"}

# Liens
- Homepage : ${rawData.homepage ?? "?"}
- Whitepaper : ${rawData.whitepaper ?? "?"}
- GitHub repos : ${(rawData.repos ?? []).join(", ") || "?"}
- Twitter : ${rawData.twitter ?? "?"}

# Marche live
- Prix : ${rawData.market?.priceUsd ?? "?"} USD
- Market cap : ${rawData.market?.marketCapUsd ?? "?"} USD (rank #${rawData.rank ?? "?"})
- FDV : ${rawData.market?.fdvUsd ?? "?"} USD
- Volume 24h : ${rawData.market?.volume24hUsd ?? "?"} USD
- ATH : ${rawData.market?.ath ?? "?"} USD (${rawData.market?.athDate ?? "?"})
- ATL : ${rawData.market?.atl ?? "?"} USD (${rawData.market?.atlDate ?? "?"})
- Variation 24h : ${rawData.market?.change24h ?? "?"} %
- Variation 7d : ${rawData.market?.change7d ?? "?"} %
- Variation 30d : ${rawData.market?.change30d ?? "?"} %
- Variation 1y : ${rawData.market?.change1y ?? "?"} %

# Supply
- Circulating : ${rawData.supply?.circulating ?? "?"}
- Total : ${rawData.supply?.total ?? "?"}
- Max : ${rawData.supply?.max ?? "uncapped"}

# Activite developpeur (4 dernieres semaines)
- Github stars : ${rawData.devActivity?.stars ?? "?"}
- Forks : ${rawData.devActivity?.forks ?? "?"}
- Contributeurs PR : ${rawData.devActivity?.contributors ?? "?"}
- Commits : ${rawData.devActivity?.commitsLast4Weeks ?? "?"}
- Issues fermees : ${rawData.devActivity?.issuesClosedLast4Weeks ?? "?"}

# Communaute
- Followers Twitter : ${rawData.social?.twitterFollowers ?? "?"}
- Reddit subscribers : ${rawData.social?.redditSubscribers ?? "?"}

# Smart contracts deployes (chains)
${
  Object.entries(rawData.contracts ?? {})
    .filter(([k, v]) => v && k)
    .map(([chain, addr]) => `- ${chain}: ${addr}`)
    .join("\n") || "- (token natif, pas de contract address)"
}

# DefiLlama (chain L1/L2 ou protocol DeFi)
${
  rawData.defiLlama
    ? rawData.defiLlama.type === "chain"
      ? `- Type : Chain (L1/L2)\n- TVL : $${(rawData.defiLlama.tvl ?? 0).toLocaleString()}\n- Chain name : ${rawData.defiLlama.chainName}`
      : `- Type : Protocol DeFi\n- TVL : $${(rawData.defiLlama.tvl ?? 0).toLocaleString()}\n- Category : ${rawData.defiLlama.category ?? "?"}\n- Chains : ${(rawData.defiLlama.chains ?? []).join(", ") || "?"}\n- Audits : ${rawData.defiLlama.audits ?? "?"}`
    : "- (pas de presence DefiLlama detectee — token non-DeFi ou non-indexe)"
}

# Mission
Genere la fiche complete en JSON strict. Exigences :
1. Toutes les sections du schema sont remplies (utilise "a verifier" pour les sections incertaines, ne PAS inventer)
2. Les chiffres dans "metrics.keyFigures" sont issus des donnees ci-dessus formatees joliment ($1.5B, 12.5M tokens, etc.)
3. Les scores ont chacun une rationale courte basee sur des criteres objectifs
4. Les concurrents listes existent reellement (utilise des coingeckoId connus)
5. Les risques couvrent au moins 3 categories distinctes
6. Le frEuStatus est specifique et concret (PSAN exchanges, MiCA, fiscalite FR)

Reponds UNIQUEMENT avec le JSON strict. Aucun texte avant ou apres.`;
}

/* -------------------------------------------------------------------------- */
/*  LLM call                                                                  */
/* -------------------------------------------------------------------------- */

function extractJson(raw) {
  if (typeof raw !== "string") throw new Error("LLM response not a string");
  let cleaned = raw
    .trim()
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

async function callLLM(rawData) {
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
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://www.cryptoreflex.fr",
        "X-Title": "Cryptoreflex Fiche Pipeline",
      },
      body: JSON.stringify({
        model,
        max_tokens: MAX_TOKENS,
        temperature: TEMPERATURE,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: buildUserPrompt(rawData) },
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
    `[llm] tokens=${totalTokens} (in=${usage.prompt_tokens || 0} out=${usage.completion_tokens || 0}) cost=$${cost.toFixed(4)} model=${model.split("/").pop()}`,
  );

  return { parsed, model, tokens: totalTokens, cost };
}

/* -------------------------------------------------------------------------- */
/*  Validation                                                                */
/* -------------------------------------------------------------------------- */

function validate(parsed) {
  const errors = [];
  const requiredTopLevel = [
    "tldr",
    "thesis",
    "howItWorks",
    "tokenomics",
    "metrics",
    "scores",
    "competitors",
    "moats",
    "risks",
    "frEuStatus",
    "furtherReading",
    "recentNews",
    "disclaimer",
    "factCheckNotes",
  ];
  for (const k of requiredTopLevel) {
    if (parsed[k] === undefined || parsed[k] === null || parsed[k] === "") {
      errors.push(`missing field: ${k}`);
    }
  }

  if (parsed.scores) {
    const requiredScores = ["decentralization", "complianceFrEu", "technicalMaturity", "communityHealth", "overall"];
    for (const k of requiredScores) {
      const s = parsed.scores[k];
      if (!s || typeof s.score !== "number" || s.score < 0 || s.score > 100) {
        errors.push(`scores.${k}.score must be 0-100 number`);
      }
      if (!s?.rationale) errors.push(`scores.${k}.rationale missing`);
    }
  }

  if (!Array.isArray(parsed.competitors) || parsed.competitors.length < 1) {
    errors.push("competitors must have ≥1 entries");
  }
  if (!Array.isArray(parsed.moats) || parsed.moats.length < 1) {
    errors.push("moats must have ≥1 entries");
  }
  if (!Array.isArray(parsed.risks) || parsed.risks.length < 3) {
    errors.push("risks must have ≥3 entries");
  }

  return { ok: errors.length === 0, errors };
}

/* -------------------------------------------------------------------------- */
/*  Output writers                                                            */
/* -------------------------------------------------------------------------- */

async function ensureDir(dir) {
  await fs.mkdir(dir, { recursive: true });
}

async function writeFiche(coingeckoId, rawData, parsed, llmInfo) {
  await ensureDir(OUTPUT_DIR);
  await ensureDir(PREVIEW_DIR);

  const fiche = {
    schemaVersion: "1.0",
    generatedAt: new Date().toISOString(),
    qualityTier: "T3",
    coingeckoId,
    symbol: rawData.symbol,
    name: rawData.name,
    rawDataSnapshot: rawData,
    llmContent: parsed,
    pipeline: {
      model: llmInfo?.model ?? "dry-run",
      tokensTotal: llmInfo?.tokens ?? 0,
      costUsd: llmInfo?.cost ?? 0,
    },
  };

  const jsonPath = path.join(OUTPUT_DIR, `${coingeckoId}.json`);
  await fs.writeFile(jsonPath, JSON.stringify(fiche, null, 2), "utf8");

  // Preview Markdown lisible humain pour eval qualite.
  const md = renderPreviewMarkdown(fiche);
  const mdPath = path.join(PREVIEW_DIR, `${coingeckoId}.md`);
  await fs.writeFile(mdPath, md, "utf8");

  return { jsonPath, mdPath };
}

function renderPreviewMarkdown(fiche) {
  const c = fiche.llmContent ?? {};
  const lines = [
    `# ${fiche.name ?? fiche.coingeckoId} (${fiche.symbol ?? "?"})`,
    ``,
    `> _Fiche generee automatiquement le ${fiche.generatedAt} — Tier ${fiche.qualityTier} (${fiche.pipeline.model})_`,
    ``,
    `## ⚡ TL;DR`,
    c.tldr ?? "(missing)",
    ``,
    `## 🎯 La these`,
    c.thesis ?? "(missing)",
    ``,
    `## 🛠️ Comment ça marche`,
    c.howItWorks ?? "(missing)",
    ``,
    `## 💰 Tokenomics`,
    c.tokenomics ?? "(missing)",
    ``,
    `## 📊 Métriques`,
    c.metrics?.narrative ?? "(missing)",
    ``,
    ...(c.metrics?.keyFigures ?? []).map((kf) => `- **${kf.label}** : ${kf.value}`),
    ``,
    `## 🏆 Scores Cryptoreflex`,
    ...Object.entries(c.scores ?? {}).map(
      ([k, v]) => `- **${k}** : ${v?.score ?? "?"}/100 — ${v?.rationale ?? ""}`,
    ),
    ``,
    `## ⚔️ Concurrents directs`,
    ...((c.competitors ?? []).map(
      (cc) => `- **${cc.name}** (${cc.coingeckoId}) — ${cc.differentiator}`,
    ) ?? []),
    ``,
    `## 🛡️ Moats`,
    ...((c.moats ?? []).map((m) => `- **[${m.type}]** ${m.description}`) ?? []),
    ``,
    `## ⚠️ Risques`,
    ...((c.risks ?? []).map(
      (r) => `- **[${r.category} / ${r.severity}]** ${r.description}`,
    ) ?? []),
    ``,
    `## 🇫🇷 Statut FR/EU`,
    c.frEuStatus ?? "(missing)",
    ``,
    `## 🎓 Pour aller plus loin`,
    ...((c.furtherReading ?? []).map((r) => `- [${r.title}](${r.url_or_slug})`) ?? []),
    ``,
    `## 📰 Actu récente`,
    c.recentNews ?? "(missing)",
    ``,
    `## ℹ️ Disclaimer`,
    c.disclaimer ?? "(missing)",
    ``,
    `## 🔍 Notes fact-check (review humaine)`,
    c.factCheckNotes ?? "(missing)",
    ``,
    `---`,
    ``,
    `_Pipeline cost : $${fiche.pipeline.costUsd.toFixed(4)} (${fiche.pipeline.tokensTotal} tokens)_`,
  ];
  return lines.join("\n");
}

/* -------------------------------------------------------------------------- */
/*  Main                                                                      */
/* -------------------------------------------------------------------------- */

async function main() {
  const args = process.argv.slice(2);
  const coingeckoId = args.find((a) => !a.startsWith("--"));
  const dryRun = args.includes("--dry-run");

  if (!coingeckoId) {
    console.error("Usage: node scripts/generate-fiche-crypto.mjs <coingeckoId> [--dry-run]");
    console.error("Example: node scripts/generate-fiche-crypto.mjs solana");
    process.exit(1);
  }

  console.log(`\n=== Pipeline fiche crypto ${coingeckoId}${dryRun ? " (DRY RUN)" : ""} ===\n`);

  // Step 1 — fetch raw data
  console.log("[1/4] Fetching CoinGecko overview...");
  const cg = await fetchCoinGeckoOverview(coingeckoId);
  if (!cg) {
    console.error(`❌ CoinGecko data unavailable for ${coingeckoId}. Aborting.`);
    process.exit(2);
  }
  console.log(`  ✓ ${cg.name} (${cg.symbol?.toUpperCase()}) — rank #${cg.market_cap_rank ?? "?"}`);

  console.log("[2/4] Fetching DefiLlama (best-effort)...");
  const llama = await fetchDefiLlama(coingeckoId, cg.name);
  console.log(
    llama
      ? `  ✓ ${llama.type} TVL: $${(llama.tvl ?? 0).toLocaleString()} (${llama.chainName ?? llama.slug})`
      : "  ⊘ no DefiLlama match",
  );

  const rawData = compactRawData(coingeckoId, cg, llama);

  if (dryRun) {
    console.log("\n[DRY RUN] Skipping LLM call. Prompt preview:\n");
    console.log("=".repeat(80));
    console.log(buildUserPrompt(rawData).slice(0, 2000));
    console.log("=".repeat(80));
    console.log(`\nFull prompt length: ${buildUserPrompt(rawData).length} chars`);
    console.log(`System prompt length: ${SYSTEM_PROMPT.length} chars`);
    await writeFiche(coingeckoId, rawData, null, null);
    console.log(`\n✓ Raw data snapshot saved to content/cryptos-fiches/${coingeckoId}.json`);
    return;
  }

  // Step 3 — LLM call
  console.log("[3/4] Calling LLM (this may take 30-90s)...");
  const llmInfo = await callLLM(rawData);

  // Step 4 — validate + write
  console.log("[4/4] Validating + writing output...");
  const v = validate(llmInfo.parsed);
  if (!v.ok) {
    console.warn(`⚠️  Validation issues (will still write for review):`);
    v.errors.forEach((e) => console.warn(`  - ${e}`));
  }

  const { jsonPath, mdPath } = await writeFiche(coingeckoId, rawData, llmInfo.parsed, llmInfo);
  console.log(`\n✓ JSON : ${jsonPath}`);
  console.log(`✓ Preview MD : ${mdPath}`);
  console.log(`✓ Cost : $${llmInfo.cost.toFixed(4)} (${llmInfo.tokens} tokens)`);
  console.log(`✓ Validation : ${v.ok ? "PASS" : `FAIL (${v.errors.length} issues — review preview .md)`}`);
}

main().catch((err) => {
  console.error("\n❌ Pipeline error:", err.message);
  console.error(err.stack);
  process.exit(1);
});
