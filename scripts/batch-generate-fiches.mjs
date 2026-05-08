#!/usr/bin/env node
/**
 * scripts/batch-generate-fiches.mjs
 *
 * Phase 1 SCALING — generation auto en lot des fiches T3.
 *
 * Pipeline :
 *  1. Fetch top N cryptos depuis CoinGecko /coins/markets (par market cap)
 *  2. Skip celles deja en DB (idempotent — resumable apres crash)
 *  3. Pour chaque crypto restante :
 *     a. Fetch CoinGecko overview + DefiLlama
 *     b. Build prompt + call OpenRouter (Sonnet 4.5)
 *     c. Normalize + validate output
 *     d. Upsert dans Supabase via service role
 *  4. Progress log + cost tracker + retry transitoire
 *
 * Pre-requis ENV :
 *  - OPENROUTER_API_KEY (LLM call)
 *  - NEXT_PUBLIC_SUPABASE_URL
 *  - SUPABASE_SERVICE_ROLE_KEY
 *
 * Args :
 *  --count N         : nb cryptos a traiter (defaut 100)
 *  --start-rank N    : rank de depart (defaut 1)
 *  --skip-existing   : skip les coingeckoIds deja en DB (defaut true)
 *  --no-skip-existing: re-genere tout, meme si en DB
 *  --dry-run         : preview sans appel LLM (gratuit, test)
 *  --rate-limit-ms N : delay entre fetchs (defaut 6000ms)
 *
 * Cout estime : ~$0.09 par fiche
 *  - 100 fiches  : ~$9    (10 min)
 *  - 1 000 fiches : ~$90   (~2-3h)
 *  - 10 000 fiches : ~$900  (~16-25h selon rate limit)
 *
 * Usage :
 *  node scripts/batch-generate-fiches.mjs --count=10 --dry-run    # test
 *  node scripts/batch-generate-fiches.mjs --count=100             # 100 cryptos
 *  node scripts/batch-generate-fiches.mjs --count=1000 --start-rank=1
 */

import { createClient } from "@supabase/supabase-js";

const args = process.argv.slice(2);
const getArg = (name, defaultVal) => {
  const m = args.find((a) => a.startsWith(`--${name}=`));
  if (m) return m.split("=")[1];
  return args.includes(`--${name}`) ? true : defaultVal;
};

const COUNT = parseInt(getArg("count", "100"), 10);
const START_RANK = parseInt(getArg("start-rank", "1"), 10);
const SKIP_EXISTING = !args.includes("--no-skip-existing");
const DRY_RUN = args.includes("--dry-run");
const RATE_LIMIT_MS = parseInt(getArg("rate-limit-ms", "6000"), 10);

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const DEFAULT_MODEL = process.env.LLM_MODEL || "anthropic/claude-sonnet-4.5";

const PRICING = {
  "anthropic/claude-sonnet-4.5": { input: 3.0, output: 15.0 },
  "anthropic/claude-sonnet-4.6": { input: 3.0, output: 15.0 },
  "anthropic/claude-haiku-4.5": { input: 1.0, output: 5.0 },
};

/* -------------------------------------------------------------------------- */
/*  Reuse helpers from generate-fiche-crypto.mjs (inlined for portability)    */
/* -------------------------------------------------------------------------- */

async function fetchCoinGeckoOverview(coingeckoId) {
  const url = `https://api.coingecko.com/api/v3/coins/${coingeckoId}?localization=false&tickers=false&market_data=true&community_data=true&developer_data=true&sparkline=false`;
  const ctrl = new AbortController();
  const tid = setTimeout(() => ctrl.abort(), 15_000);
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: { Accept: "application/json", "User-Agent": "cryptoreflex-batch/1.0" },
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  } finally {
    clearTimeout(tid);
  }
}

async function fetchDefiLlama(coingeckoId, name) {
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
      const normalized = (s) => String(s ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");
      const found = chains.find(
        (c) =>
          c.gecko_id === coingeckoId ||
          normalized(c.name) === normalized(name) ||
          normalized(c.tokenSymbol) === normalized(name),
      );
      if (found) {
        return { type: "chain", tvl: found.tvl ?? 0, chainName: found.name, tokenSymbol: found.tokenSymbol };
      }
    }
  } catch {
    /* continue */
  }
  for (const slug of [coingeckoId, coingeckoId.replace(/-/g, "")]) {
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
            tvl: Array.isArray(data.tvl) ? data.tvl[data.tvl.length - 1]?.totalLiquidityUSD ?? 0 : data.tvl ?? 0,
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

function compactRawData(coingeckoId, cg, llama) {
  if (!cg) return { coingeckoId, missing: "coingecko data unavailable" };
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

const SYSTEM_PROMPT = `Tu es analyste crypto senior pour Cryptoreflex.fr (audience FR debutants/intermediaires).
Mission : rediger une fiche d'analyse complete et structuree d'une crypto, qualite editoriale humaine, basee sur les donnees factuelles fournies.

REGLES STRICTES :
- 100% francais, accents corrects (a e e e c o u i)
- TUTOIEMENT OBLIGATOIRE : utilise toujours "tu/te/toi/ton/tes" pour t'adresser au lecteur. JAMAIS "vous" ni "on" impersonnel. Exemples : "tu peux acheter", "ton portefeuille".
- Aucun jargon non explique
- Factuel, neutre, pedagogique. Aucune promesse d'enrichissement, aucun FOMO
- Si donnee manquante : dis-le explicitement plutot qu'inventer
- DATE CUTOFF : base TOUTES tes affirmations factuelles UNIQUEMENT sur les data fournies. N'invente AUCUNE actualite. Si pas d'info : "a verifier sur sources externes".
- LIENS academy/ : privilegie type="external" (whitepaper, docs, github, explorers). Max 1 lien type="academy" generique (ex: /academy/fiscalite-crypto-france) si pertinent.

OUTPUT FORMAT JSON STRICT (toutes les listes doivent etre des arrays []) :
{
  "tldr": "3 phrases ultra-concises",
  "thesis": "200-400 mots",
  "howItWorks": "300-500 mots",
  "tokenomics": "300-500 mots",
  "metrics": { "narrative": "150-250 mots", "keyFigures": [{"label":"...","value":"..."}] },
  "scores": {
    "decentralization": {"score": 0-100, "rationale": "..."},
    "complianceFrEu": {"score": 0-100, "rationale": "..."},
    "technicalMaturity": {"score": 0-100, "rationale": "..."},
    "communityHealth": {"score": 0-100, "rationale": "..."},
    "overall": {"score": 0-100, "rationale": "..."}
  },
  "competitors": [{"coingeckoId":"...","name":"...","differentiator":"..."}],
  "moats": [{"type":"network_effect|tech_edge|team|brand|other","description":"..."}],
  "risks": [{"category":"technical|regulatory|market|team|adoption","severity":"low|medium|high|critical","description":"..."}],
  "frEuStatus": "200-300 mots — PSAN, MiCA, fiscalite",
  "furtherReading": [{"type":"academy|external","title":"...","url_or_slug":"..."}],
  "recentNews": "100-200 mots",
  "disclaimer": "Avertissement YMYL standard",
  "factCheckNotes": "Liste des points a verifier humainement"
}

Reponds UNIQUEMENT avec un objet JSON valide.`;

function buildUserPrompt(rawData) {
  return `Voici les donnees factuelles d'une crypto a analyser. Genere la fiche structuree complete.

# Identite
- coingeckoId : ${rawData.coingeckoId}
- Symbol : ${rawData.symbol ?? "?"}
- Name : ${rawData.name ?? "?"}
- Categories : ${(rawData.categories ?? []).join(", ") || "?"}
- Description (EN) : ${rawData.description_en?.slice(0, 800) ?? "?"}

# Liens
- Homepage : ${rawData.homepage ?? "?"}
- Whitepaper : ${rawData.whitepaper ?? "?"}
- GitHub : ${(rawData.repos ?? []).join(", ") || "?"}
- Twitter : ${rawData.twitter ?? "?"}

# Marche
- Prix : ${rawData.market?.priceUsd ?? "?"} USD
- Market cap : ${rawData.market?.marketCapUsd ?? "?"} USD (rank #${rawData.rank ?? "?"})
- FDV : ${rawData.market?.fdvUsd ?? "?"} USD
- Volume 24h : ${rawData.market?.volume24hUsd ?? "?"} USD
- ATH : ${rawData.market?.ath ?? "?"} USD (${rawData.market?.athDate ?? "?"})
- ATL : ${rawData.market?.atl ?? "?"} USD (${rawData.market?.atlDate ?? "?"})
- Variations 24h/7d/30d/1y : ${rawData.market?.change24h ?? "?"}% / ${rawData.market?.change7d ?? "?"}% / ${rawData.market?.change30d ?? "?"}% / ${rawData.market?.change1y ?? "?"}%

# Supply
- Circulating : ${rawData.supply?.circulating ?? "?"} / Total : ${rawData.supply?.total ?? "?"} / Max : ${rawData.supply?.max ?? "uncapped"}

# Dev (4 dernieres semaines)
- Stars : ${rawData.devActivity?.stars ?? "?"} / Forks : ${rawData.devActivity?.forks ?? "?"} / Contributeurs : ${rawData.devActivity?.contributors ?? "?"} / Commits : ${rawData.devActivity?.commitsLast4Weeks ?? "?"}

# Communaute
- Twitter : ${rawData.social?.twitterFollowers ?? "?"} / Reddit : ${rawData.social?.redditSubscribers ?? "?"}

# Contracts deployes
${
  Object.entries(rawData.contracts ?? {})
    .filter(([k, v]) => v && k)
    .slice(0, 8)
    .map(([chain, addr]) => `- ${chain}: ${addr}`)
    .join("\n") || "- (token natif)"
}

# DefiLlama
${
  rawData.defiLlama
    ? rawData.defiLlama.type === "chain"
      ? `- Chain : ${rawData.defiLlama.chainName} TVL $${(rawData.defiLlama.tvl ?? 0).toLocaleString()}`
      : `- Protocol : ${rawData.defiLlama.slug ?? rawData.defiLlama.category} TVL $${(rawData.defiLlama.tvl ?? 0).toLocaleString()}`
    : "- (non-DeFi ou non-indexe)"
}

Genere la fiche JSON complete. Utilise "a verifier" pour donnees incertaines.`;
}

function extractJson(raw) {
  if (typeof raw !== "string") throw new Error("LLM response not a string");
  let cleaned = raw.trim().replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/\s*```$/i, "").trim();
  const first = cleaned.indexOf("{");
  const last = cleaned.lastIndexOf("}");
  if (first === -1 || last === -1) throw new Error("No JSON found");
  return JSON.parse(cleaned.slice(first, last + 1));
}

function estimateCost(model, usage) {
  const p = PRICING[model];
  if (!p || !usage) return 0;
  return ((usage.prompt_tokens || 0) / 1_000_000) * p.input + ((usage.completion_tokens || 0) / 1_000_000) * p.output;
}

async function callLLM(rawData) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error("OPENROUTER_API_KEY not set");
  const ctrl = new AbortController();
  const tid = setTimeout(() => ctrl.abort(), 180_000);
  try {
    const res = await fetch(OPENROUTER_URL, {
      method: "POST",
      signal: ctrl.signal,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://www.cryptoreflex.fr",
        "X-Title": "Cryptoreflex Batch Pipeline",
      },
      body: JSON.stringify({
        model: DEFAULT_MODEL,
        max_tokens: 8000,
        temperature: 0.4,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: buildUserPrompt(rawData) },
        ],
        response_format: { type: "json_object" },
      }),
    });
    if (!res.ok) {
      const errText = await res.text().catch(() => "(no body)");
      throw new Error(`OpenRouter ${res.status}: ${errText.slice(0, 200)}`);
    }
    const data = await res.json();
    const content = data?.choices?.[0]?.message?.content;
    if (!content) throw new Error("Empty content");
    const parsed = extractJson(content);
    const usage = data.usage || {};
    return {
      parsed,
      tokensTotal: (usage.prompt_tokens || 0) + (usage.completion_tokens || 0),
      cost: estimateCost(DEFAULT_MODEL, usage),
    };
  } finally {
    clearTimeout(tid);
  }
}

function normalizeParsed(parsed) {
  if (!parsed || typeof parsed !== "object") return parsed;
  for (const key of ["competitors", "moats", "risks", "furtherReading"]) {
    const v = parsed[key];
    if (v && !Array.isArray(v) && typeof v === "object") parsed[key] = Object.values(v);
  }
  if (parsed.metrics?.keyFigures && !Array.isArray(parsed.metrics.keyFigures) && typeof parsed.metrics.keyFigures === "object") {
    parsed.metrics.keyFigures = Object.values(parsed.metrics.keyFigures);
  }
  return parsed;
}

/* -------------------------------------------------------------------------- */
/*  Top market cryptos via CoinGecko                                          */
/* -------------------------------------------------------------------------- */

async function fetchTopCryptos(count, startRank) {
  const cryptos = [];
  const perPage = 250;
  const startPage = Math.floor((startRank - 1) / perPage) + 1;
  const totalPages = Math.ceil((startRank + count - 1) / perPage);
  for (let page = startPage; page <= totalPages; page++) {
    const url = `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=${perPage}&page=${page}&sparkline=false`;
    const res = await fetch(url, { headers: { Accept: "application/json" } });
    if (!res.ok) {
      console.warn(`[batch] CoinGecko page ${page} failed: ${res.status}`);
      continue;
    }
    const data = await res.json();
    cryptos.push(...data);
    await new Promise((r) => setTimeout(r, 1500)); // respect rate limit
  }
  // Filter [startRank, startRank+count)
  return cryptos.filter((c) => c.market_cap_rank >= startRank && c.market_cap_rank < startRank + count);
}

/* -------------------------------------------------------------------------- */
/*  Main                                                                      */
/* -------------------------------------------------------------------------- */

async function main() {
  console.log(`\n=== Batch generate fiches T3${DRY_RUN ? " (DRY RUN)" : ""} ===`);
  console.log(`  count        : ${COUNT}`);
  console.log(`  start-rank   : ${START_RANK}`);
  console.log(`  skip-existing: ${SKIP_EXISTING}`);
  console.log(`  rate-limit   : ${RATE_LIMIT_MS}ms`);
  console.log(`  model        : ${DEFAULT_MODEL}\n`);

  const supaUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supaKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!DRY_RUN && (!supaUrl || !supaKey)) {
    console.error("❌ SUPABASE env vars required (or use --dry-run)");
    process.exit(1);
  }
  const sb = !DRY_RUN ? createClient(supaUrl, supaKey, { auth: { persistSession: false } }) : null;

  // Step 1 : fetch top cryptos
  console.log("[1/3] Fetching top cryptos from CoinGecko...");
  const topCryptos = await fetchTopCryptos(COUNT, START_RANK);
  console.log(`  ✓ ${topCryptos.length} cryptos in target range`);

  // Step 2 : filter existing
  let toProcess = topCryptos;
  if (sb && SKIP_EXISTING) {
    const ids = topCryptos.map((c) => c.id);
    const { data: existing } = await sb.from("cryptos").select("coingecko_id").in("coingecko_id", ids);
    const existingSet = new Set((existing ?? []).map((r) => r.coingecko_id));
    toProcess = topCryptos.filter((c) => !existingSet.has(c.id));
    console.log(`  ✓ ${existingSet.size} skipped (already in DB), ${toProcess.length} to process`);
  }

  if (toProcess.length === 0) {
    console.log("✓ Nothing to process. Exiting.");
    return;
  }

  // Step 3 : process loop
  console.log(`\n[2/3] Processing ${toProcess.length} cryptos (rate-limit ${RATE_LIMIT_MS}ms)...`);
  let success = 0;
  let failed = 0;
  let totalCost = 0;
  let totalTokens = 0;
  const errors = [];

  for (let i = 0; i < toProcess.length; i++) {
    const c = toProcess[i];
    const startTs = Date.now();
    try {
      const cg = await fetchCoinGeckoOverview(c.id);
      if (!cg) {
        failed++;
        errors.push({ id: c.id, error: "coingecko fetch failed" });
        console.log(`  [${i + 1}/${toProcess.length}] ❌ ${c.id} — coingecko fetch failed`);
        continue;
      }
      const llama = await fetchDefiLlama(c.id, cg.name);
      const rawData = compactRawData(c.id, cg, llama);

      if (DRY_RUN) {
        console.log(`  [${i + 1}/${toProcess.length}] DRY ${c.id} (${rawData.symbol}) — ${rawData.market?.priceUsd}`);
        await new Promise((r) => setTimeout(r, 200));
        continue;
      }

      const llmResult = await callLLM(rawData);
      normalizeParsed(llmResult.parsed);
      totalCost += llmResult.cost;
      totalTokens += llmResult.tokensTotal;

      // Map vers DB row
      const row = {
        coingecko_id: rawData.coingeckoId,
        slug: rawData.coingeckoId,
        symbol: rawData.symbol,
        name: rawData.name,
        genesis_date: rawData.genesisDate || null,
        categories: rawData.categories || [],
        homepage_url: rawData.homepage || null,
        whitepaper_url: rawData.whitepaper || null,
        github_repos: rawData.repos || [],
        twitter_handle: rawData.twitter || null,
        chains: rawData.contracts || {},
        raw_data_snapshot: rawData,
        llm_content: llmResult.parsed,
        market_cap_rank: cg.market_cap_rank ?? null,
        market_cap_usd: rawData.market?.marketCapUsd ?? null,
        price_usd: rawData.market?.priceUsd ?? null,
        score_decentralization: llmResult.parsed?.scores?.decentralization?.score ?? null,
        score_compliance_fr_eu: llmResult.parsed?.scores?.complianceFrEu?.score ?? null,
        score_technical_maturity: llmResult.parsed?.scores?.technicalMaturity?.score ?? null,
        score_community_health: llmResult.parsed?.scores?.communityHealth?.score ?? null,
        score_overall: llmResult.parsed?.scores?.overall?.score ?? null,
        quality_tier: "T3",
        llm_model: DEFAULT_MODEL,
        llm_tokens_total: llmResult.tokensTotal,
        llm_cost_usd: llmResult.cost,
        source: "llm-pipeline",
        is_published: true,
        published_at: new Date().toISOString(),
        last_refreshed_at: new Date().toISOString(),
        needs_review: false,
      };

      const { error } = await sb.from("cryptos").upsert(row, { onConflict: "coingecko_id" });
      if (error) {
        failed++;
        errors.push({ id: c.id, error: error.message });
        console.log(`  [${i + 1}/${toProcess.length}] ❌ ${c.id} — DB error: ${error.message}`);
      } else {
        success++;
        const elapsed = Math.round((Date.now() - startTs) / 1000);
        console.log(
          `  [${i + 1}/${toProcess.length}] ✓ ${c.id} (${rawData.symbol}) — ${elapsed}s, $${llmResult.cost.toFixed(4)}, score=${row.score_overall ?? "?"}`,
        );
      }
    } catch (err) {
      failed++;
      const msg = err instanceof Error ? err.message : "unknown";
      errors.push({ id: c.id, error: msg });
      console.log(`  [${i + 1}/${toProcess.length}] ❌ ${c.id} — ${msg}`);
    }

    // Rate limit between cryptos (CoinGecko free tier + LLM cost spread)
    if (i < toProcess.length - 1) {
      await new Promise((r) => setTimeout(r, RATE_LIMIT_MS));
    }
  }

  // Step 4 : summary
  console.log(`\n[3/3] === DONE ===`);
  console.log(`  Success      : ${success}`);
  console.log(`  Failed       : ${failed}`);
  console.log(`  Total cost   : $${totalCost.toFixed(4)}`);
  console.log(`  Total tokens : ${totalTokens.toLocaleString()}`);
  if (errors.length > 0) {
    console.log(`\n  --- Errors ---`);
    errors.slice(0, 20).forEach((e) => console.log(`  - ${e.id}: ${e.error}`));
    if (errors.length > 20) console.log(`  ... and ${errors.length - 20} more`);
  }
}

main().catch((err) => {
  console.error("\n❌ Batch error:", err.message);
  console.error(err.stack);
  process.exit(1);
});
