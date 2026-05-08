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
// Cycle 23 : filtre quality score (1000 meilleurs et fiables).
// Si --min-quality=N, skip les cryptos avec qualityScore < N.
// Default 0 = pas de filtre (backward compat).
const MIN_QUALITY = parseInt(getArg("min-quality", "0"), 10);
// Cycle 24 : regen ciblée — bypass start-rank + count + skip-existing pour
// régénérer une liste précise de coingeckoIds (audit règle des 3 sub-100%).
// Format : --coingecko-ids=bitcoin,ethereum,solana (CSV).
// Quand actif : MIN_QUALITY ignoré, SKIP_EXISTING ignoré (force overwrite).
const COINGECKO_IDS_RAW = getArg("coingecko-ids", "");
const COINGECKO_IDS = (typeof COINGECKO_IDS_RAW === "string" && COINGECKO_IDS_RAW.length > 0)
  ? COINGECKO_IDS_RAW.split(",").map((s) => s.trim()).filter(Boolean)
  : [];
// Cycle 25 : mode "scan + rerank par quality_score" — fetch un large range
// (ex 5000 cryptos), calcule quality_score pour TOUTES, trie desc, garde les
// top N. Aligné sur le brief "1000 meilleurs et fiables" : le rank market_cap
// seul ne suffit pas (cryptos rank 351-1000 ont quality très variable).
//
//   --scan-window=N : fetch les N cryptos top market_cap depuis CoinGecko
//                     (default 0 = mode classique start_rank+count).
//   --top-quality=M : après scan, garde les M cryptos avec le plus haut
//                     quality_score (et passe l'audit min_quality si fourni).
//
// Quand actif, START_RANK et COUNT sont ignorés. SKIP_EXISTING reste actif
// (par défaut). Le scan utilise CoinGecko /coins/markets paginé (250 perPage).
const SCAN_WINDOW = parseInt(getArg("scan-window", "0"), 10);
const TOP_QUALITY = parseInt(getArg("top-quality", "0"), 10);

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const DEFAULT_MODEL = process.env.LLM_MODEL || "anthropic/claude-sonnet-4.5";

const PRICING = {
  "anthropic/claude-sonnet-4.5": { input: 3.0, output: 15.0 },
  "anthropic/claude-sonnet-4.6": { input: 3.0, output: 15.0 },
  "anthropic/claude-haiku-4.5": { input: 1.0, output: 5.0 },
  // Modeles :free OpenRouter (souvent rate-limited upstream — non fiables)
  "meta-llama/llama-3.3-70b-instruct:free": { input: 0, output: 0 },
  "qwen/qwen3-next-80b-a3b-instruct:free": { input: 0, output: 0 },
  "z-ai/glm-4.5-air:free": { input: 0, output: 0 },
  "deepseek/deepseek-r1:free": { input: 0, output: 0 },
  // Gemini API direct (Google AI Studio) — 1500 req/jour Flash gratuit, stable.
  "google/gemini-2.5-flash": { input: 0, output: 0 },
  "google/gemini-1.5-flash": { input: 0, output: 0 },
  "google/gemini-1.5-pro": { input: 0, output: 0 },
};

function isGeminiModel(model) {
  return typeof model === "string" && model.startsWith("google/gemini-");
}

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

async function fetchCoinGeckoMarketChart(coingeckoId) {
  try {
    const ctrl = new AbortController();
    const tid = setTimeout(() => ctrl.abort(), 10_000);
    const url = `https://api.coingecko.com/api/v3/coins/${coingeckoId}/market_chart?vs_currency=usd&days=90&interval=daily`;
    const res = await fetch(url, { signal: ctrl.signal, headers: { Accept: "application/json" } });
    clearTimeout(tid);
    if (!res.ok) return null;
    const data = await res.json();
    const prices = (data.prices ?? []).map((p) => p[1]);
    if (prices.length < 7) return null;
    const max = Math.max(...prices);
    const min = Math.min(...prices);
    const last = prices[prices.length - 1];
    const drawdown = max > 0 ? ((max - min) / max) * 100 : 0;
    const recoverFromMin = min > 0 ? ((last - min) / min) * 100 : 0;
    const bigMoves = [];
    for (let i = 1; i < prices.length; i++) {
      const change = ((prices[i] - prices[i - 1]) / prices[i - 1]) * 100;
      if (Math.abs(change) >= 10) {
        const ts = data.prices[i][0];
        bigMoves.push({ date: new Date(ts).toISOString().slice(0, 10), changePct: change.toFixed(1) });
      }
    }
    return {
      max90d: max,
      min90d: min,
      drawdown90dPct: drawdown.toFixed(1),
      recoveryFromMin90dPct: recoverFromMin.toFixed(1),
      bigMoves90d: bigMoves.slice(0, 5),
    };
  } catch {
    return null;
  }
}

async function fetchGitHubStats(repoUrl) {
  if (!repoUrl || !repoUrl.includes("github.com")) return null;
  const match = repoUrl.match(/github\.com\/([^/]+)\/([^/?#]+)/);
  if (!match) return null;
  const [, owner, repo] = match;
  try {
    const ctrl = new AbortController();
    const tid = setTimeout(() => ctrl.abort(), 10_000);
    const headers = { Accept: "application/vnd.github+json", "User-Agent": "cryptoreflex-fiche/1.0" };
    const [repoRes, releasesRes] = await Promise.all([
      fetch(`https://api.github.com/repos/${owner}/${repo}`, { signal: ctrl.signal, headers }),
      fetch(`https://api.github.com/repos/${owner}/${repo}/releases?per_page=5`, { signal: ctrl.signal, headers }),
    ]);
    clearTimeout(tid);
    const repoData = repoRes.ok ? await repoRes.json() : null;
    const releases = releasesRes.ok ? await releasesRes.json() : [];
    return {
      defaultBranch: repoData?.default_branch,
      pushedAt: repoData?.pushed_at,
      openIssues: repoData?.open_issues_count,
      license: repoData?.license?.spdx_id,
      latestRelease: Array.isArray(releases) && releases[0]
        ? {
            tag: releases[0].tag_name,
            publishedAt: releases[0].published_at,
            isPrerelease: releases[0].prerelease,
          }
        : null,
      recentReleases: Array.isArray(releases)
        ? releases.slice(0, 5).map((r) => ({ tag: r.tag_name, date: r.published_at?.slice(0, 10) }))
        : [],
    };
  } catch {
    return null;
  }
}

async function fetchCoinGeckoStatusUpdates(coingeckoId) {
  try {
    const ctrl = new AbortController();
    const tid = setTimeout(() => ctrl.abort(), 8_000);
    const url = `https://api.coingecko.com/api/v3/coins/${coingeckoId}/status_updates?per_page=10`;
    const res = await fetch(url, { signal: ctrl.signal, headers: { Accept: "application/json" } });
    clearTimeout(tid);
    if (!res.ok) return null;
    const data = await res.json();
    const updates = (data.status_updates ?? []).slice(0, 10).map((u) => ({
      date: u.created_at?.slice(0, 10),
      category: u.category,
      title: (u.description ?? "").slice(0, 200),
    }));
    return updates.length > 0 ? updates : null;
  } catch {
    return null;
  }
}

async function fetchDefiLlamaProtocolDetails(slug) {
  if (!slug) return null;
  try {
    const ctrl = new AbortController();
    const tid = setTimeout(() => ctrl.abort(), 8_000);
    const res = await fetch(`https://api.llama.fi/protocol/${slug}`, {
      signal: ctrl.signal,
      headers: { Accept: "application/json" },
    });
    clearTimeout(tid);
    if (!res.ok) return null;
    const data = await res.json();
    return {
      audits: data.audits,
      audit_links: data.audit_links ?? [],
      audit_note: data.audit_note,
      hacks: Array.isArray(data.hacks) ? data.hacks.map((h) => ({
        date: h.date,
        amount: h.amount,
        techniques: h.techniques,
      })) : [],
      methodology: (data.methodology ?? "").slice(0, 300),
      twitter: data.twitter,
      mcap: data.mcap,
    };
  } catch {
    return null;
  }
}

function computeQualityScore(rawData) {
  let score = 0;
  const reasons = [];
  const genesis = rawData.genesisDate;
  if (genesis) {
    const ageYears = (Date.now() - new Date(genesis).getTime()) / (365.25 * 24 * 3600 * 1000);
    if (ageYears >= 5) { score += 15; reasons.push(`age=${ageYears.toFixed(1)}y(+15)`); }
    else if (ageYears >= 2) { score += 10; reasons.push(`age=${ageYears.toFixed(1)}y(+10)`); }
    else if (ageYears >= 1) { score += 5; reasons.push(`age=${ageYears.toFixed(1)}y(+5)`); }
  }
  const vol24 = rawData.market?.volume24hUsd ?? 0;
  if (vol24 >= 10_000_000) { score += 15; reasons.push("vol24>$10M(+15)"); }
  else if (vol24 >= 1_000_000) { score += 10; reasons.push("vol24>$1M(+10)"); }
  else if (vol24 >= 100_000) { score += 5; reasons.push("vol24>$100K(+5)"); }
  const ghPush = rawData.githubStats?.pushedAt;
  if (ghPush) {
    const daysSince = (Date.now() - new Date(ghPush).getTime()) / (24 * 3600 * 1000);
    if (daysSince <= 30) { score += 15; reasons.push("gh_active30d(+15)"); }
    else if (daysSince <= 90) { score += 10; reasons.push("gh_active90d(+10)"); }
    else if (daysSince <= 365) { score += 5; reasons.push("gh_active1y(+5)"); }
  }
  const auditTier = rawData.defiLlamaDetails?.audits;
  const auditLinks = rawData.defiLlamaDetails?.audit_links?.length ?? 0;
  if (auditTier === "2") { score += 20; reasons.push("audit_tier2(+20)"); }
  else if (auditTier === "1") { score += 12; reasons.push("audit_tier1(+12)"); }
  else if (auditLinks > 0) { score += 8; reasons.push(`audit_links×${auditLinks}(+8)`); }
  const rank = rawData.rank;
  if (rank && rank <= 100) { score += 15; reasons.push(`rank<=100(+15)`); }
  else if (rank && rank <= 300) { score += 8; reasons.push(`rank<=300(+8)`); }
  const categories = (rawData.categories ?? []).join("|").toLowerCase();
  if (categories.includes("layer 1") || categories.includes("proof of work")) {
    score += 10; reasons.push("L1/PoW(+10)");
  } else if (categories.includes("layer 2") || categories.includes("proof of stake")) {
    score += 7; reasons.push("L2/PoS(+7)");
  }
  if (rank && rank <= 50) { score += 10; reasons.push(`top50(+10)`); }
  else if (rank && rank <= 200) { score += 5; reasons.push(`top200(+5)`); }
  return { score: Math.min(100, score), reasons };
}

async function fetchAdditional(rawData) {
  const repoUrl = rawData.repos?.[0];
  const llamaSlug = rawData.defiLlama?.slug ?? rawData.coingeckoId;
  const [marketChart, github, statusUpdates, llamaDetails] = await Promise.all([
    fetchCoinGeckoMarketChart(rawData.coingeckoId),
    repoUrl ? fetchGitHubStats(repoUrl) : Promise.resolve(null),
    fetchCoinGeckoStatusUpdates(rawData.coingeckoId),
    fetchDefiLlamaProtocolDetails(llamaSlug),
  ]);
  rawData.marketChart90d = marketChart;
  rawData.githubStats = github;
  rawData.statusUpdates = statusUpdates;
  rawData.defiLlamaDetails = llamaDetails;
  rawData.qualityScore = computeQualityScore(rawData);
  return rawData;
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

/* -------------------------------------------------------------------------- */
/*  Audit règle des 3 (cycle 17 propagé du single fiche script)              */
/* -------------------------------------------------------------------------- */

function countMatches(text, regex) {
  if (!text || typeof text !== "string") return 0;
  const matches = text.match(regex);
  return matches ? matches.length : 0;
}

function auditRegleDes3(parsed, rawData) {
  const issues = [];
  const c = parsed ?? {};
  const name = rawData?.name ?? "";
  const symbol = rawData?.symbol ?? "";
  const corpus = [
    c.tldr ?? "",
    c.thesis ?? "",
    c.howItWorks ?? "",
    c.tokenomics ?? "",
    c.metrics?.narrative ?? "",
    c.frEuStatus ?? "",
  ].join("\n\n");

  const tuCount = countMatches(corpus, /\b(tu|te|toi|ton|tes|t')\b/gi);
  const vousCount = countMatches(corpus, /\b(vous|votre|vos)\b/gi);
  const tutoiementScore = Math.min(100, Math.max(0, tuCount * 5 - vousCount * 10));
  if (tuCount < 5) issues.push(`tutoiement insuffisant (${tuCount}/5)`);
  if (vousCount > 2) issues.push(`vouvoiement (${vousCount})`);

  // Bug fix 2026-05-08 : escape regex special chars dans name/symbol pour
  // gérer correctement les noms type "币安人生 (BinanceLife)" ou
  // "Tradable NA Rent Financing Platform SSTN" (acronyme + chars CJK +
  // parenthèses). Avant : regex invalide → 0 match silencieux → faux
  // negative "name mentions (0/3)". Après : escape avec \W+ entre tokens
  // pour tolérer les variations de ponctuation/espace.
  const escapeRe = (s) => String(s || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  // Pour les noms multi-mots (>3 mots), on tolère 2 mots significatifs au lieu
  // du nom complet (ex: "Tradable NA Rent Financing Platform SSTN" → cherche
  // "Tradable" OU "SSTN" qui apparaît partout).
  // Pour les noms CJK avec translittération latine entre parenthèses
  // (ex: "币安人生 (BinanceLife)") → on split aussi sur la ponctuation pour
  // extraire le nom latin qui apparaîtra dans le corpus français.
  const nameTokens = String(name || "")
    .split(/[\s()[\],\/\-]+/) // split sur whitespace + ponctuation usuelle
    .filter((t) => t.length >= 4)
    .map(escapeRe);
  const nameRegexes = [];
  if (nameTokens.length > 0) {
    // Premier token : le name "principal"
    nameRegexes.push(new RegExp(`\\b${nameTokens[0]}\\b`, "gi"));
    // Si nom long, ajouter le dernier token (souvent l'acronyme/symbol-like)
    if (nameTokens.length > 1 && nameTokens[nameTokens.length - 1] !== nameTokens[0]) {
      nameRegexes.push(new RegExp(`\\b${nameTokens[nameTokens.length - 1]}\\b`, "gi"));
    }
  }
  const symbolEsc = escapeRe(symbol);
  const symbolMatches = symbolEsc
    ? countMatches(corpus, new RegExp(`\\b${symbolEsc}\\b`, "gi"))
    : 0;
  const nameMatches = nameRegexes.reduce(
    (acc, re) => acc + countMatches(corpus, re),
    0,
  );
  const nameSymbolMentions = symbolMatches + nameMatches;
  const numberMentions = countMatches(
    corpus,
    /\$[\d.,]+\s?(?:[BKMbillionsmillemilliers]+)?|\d+[.,]?\d*\s?%|\d+[.,]?\d*\s?(?:M|B|k|TPS|tx)/g,
  );
  const personalizationScore = Math.min(
    100,
    Math.round((nameSymbolMentions / 3) * 30 + (numberMentions / 10) * 70),
  );
  if (nameSymbolMentions < 3) issues.push(`name mentions (${nameSymbolMentions}/3)`);
  if (numberMentions < 5) issues.push(`chiffres specifiques (${numberMentions}/5)`);

  const wordCount = (s) => (s ? s.split(/\s+/).filter(Boolean).length : 0);
  const wThesis = wordCount(c.thesis);
  const wHow = wordCount(c.howItWorks);
  const wTok = wordCount(c.tokenomics);
  const wFR = wordCount(c.frEuStatus);
  const risksCategories = new Set(
    (Array.isArray(c.risks) ? c.risks : []).map((r) => r?.category).filter(Boolean),
  ).size;
  const competitorsCount = Array.isArray(c.competitors) ? c.competitors.length : 0;
  let depthChecks = 0;
  const depthTotal = 6;
  if (wThesis >= 150) depthChecks++;
  else issues.push(`thesis (${wThesis}/150)`);
  if (wHow >= 200) depthChecks++;
  else issues.push(`howItWorks (${wHow}/200)`);
  if (wTok >= 200) depthChecks++;
  else issues.push(`tokenomics (${wTok}/200)`);
  if (wFR >= 150) depthChecks++;
  else issues.push(`frEuStatus (${wFR}/150)`);
  if (risksCategories >= 3) depthChecks++;
  else issues.push(`risks categs (${risksCategories}/3)`);
  if (competitorsCount >= 3) depthChecks++;
  else issues.push(`competitors (${competitorsCount}/3)`);
  const depthScore = Math.round((depthChecks / depthTotal) * 100);

  const overall = Math.round(
    tutoiementScore * 0.3 + personalizationScore * 0.35 + depthScore * 0.35,
  );
  const passed =
    overall >= 70 && tutoiementScore >= 50 && personalizationScore >= 60 && depthScore >= 70;

  return { overall, passed, breakdown: { tutoiementScore, personalizationScore, depthScore, tuCount, nameSymbolMentions, numberMentions, wThesis, wHow, wTok, wFR }, issues };
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
- TUTOIEMENT OBLIGATOIRE PARTOUT : utilise "tu/te/toi/ton/tes" dans CHAQUE section longue (thesis, howItWorks, tokenomics, frEuStatus, disclaimer). JAMAIS "vous" ni "on" impersonnel. Minimum 5 occurrences "tu/te/toi/ton/tes" dans le corps de la fiche. Exemples : "Si tu detiens du SOL...", "Pour staker tes tokens...", "Tu dois etre conscient que...", "Si tu es resident fiscal francais...".
- Aucun jargon non explique
- Factuel, neutre, pedagogique. Aucune promesse d'enrichissement, aucun FOMO
- Si donnee manquante : dis-le explicitement plutot qu'inventer
- DATE CUTOFF : base TOUTES tes affirmations factuelles UNIQUEMENT sur les data fournies. N'invente AUCUNE actualite. Si pas d'info : "a verifier sur sources externes".
- LIENS academy/ : privilegie type="external" (whitepaper, docs, github, explorers). Max 1 lien type="academy" generique (ex: /academy/fiscalite-crypto-france) si pertinent.

OUTPUT FORMAT JSON STRICT (toutes les listes doivent etre des arrays []) :
{
  "tldr": "3 phrases ultra-concises",
  "thesis": "220-400 mots OBLIGATOIRE (min 220 mots reels — sinon REJET). Utilise 'tu' au moins 2x.",
  "howItWorks": "350-500 mots OBLIGATOIRE (min 350 mots — sinon REJET). Utilise 'tu' au moins 2x. Decris l'architecture technique, le consensus, les acteurs.",
  "tokenomics": "350-500 mots OBLIGATOIRE (min 350 mots — sinon REJET). Utilise 'tu' au moins 2x ('si tu detiens', 'tes tokens'). Supply totale, distribution, vesting, burn, staking yield si applicable.",
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
  "frEuStatus": "200-300 mots OBLIGATOIRE (min 200 mots). Utilise 'tu' systematiquement ('si tu es resident', 'tu peux acheter', 'tu dois declarer'). PSAN, MiCA, Cerfa 2086.",
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

# Historique 90 jours (vraies donnees market chart)
${
  rawData.marketChart90d
    ? `- Max 90j : $${rawData.marketChart90d.max90d?.toFixed(4)} / Min 90j : $${rawData.marketChart90d.min90d?.toFixed(4)}
- Drawdown max : -${rawData.marketChart90d.drawdown90dPct}% (max → min)
- Recovery from min : +${rawData.marketChart90d.recoveryFromMin90dPct}%
- Mouvements > 10% sur 1 jour : ${
        rawData.marketChart90d.bigMoves90d?.length
          ? rawData.marketChart90d.bigMoves90d.map((m) => `${m.date} (${m.changePct}%)`).join(", ")
          : "(aucun)"
      }`
    : "- (chart 90j indisponible)"
}

# Annonces officielles recentes (CoinGecko status_updates)
${
  rawData.statusUpdates && rawData.statusUpdates.length > 0
    ? rawData.statusUpdates
        .slice(0, 8)
        .map((u) => `- ${u.date} [${u.category ?? "?"}] : ${u.title}`)
        .join("\n")
    : "- (aucune annonce officielle recente disponible)"
}

# DefiLlama details (audits / hacks history)
${
  rawData.defiLlamaDetails
    ? `- Audit tier : ${rawData.defiLlamaDetails.audits ?? "?"} (${rawData.defiLlamaDetails.audit_links?.length ?? 0} reports)
- Audit note : ${rawData.defiLlamaDetails.audit_note ?? "(aucune)"}
- Hacks : ${
        rawData.defiLlamaDetails.hacks?.length
          ? rawData.defiLlamaDetails.hacks.map((h) => `${h.date} (~$${h.amount?.toLocaleString() ?? "?"})`).join("; ")
          : "(aucun)"
      }`
    : "- (DefiLlama details indisponibles)"
}

# Quality score Cryptoreflex (audit fiabilite pre-LLM)
- Score : ${rawData.qualityScore?.score ?? "?"}/100
- Reasons : ${(rawData.qualityScore?.reasons ?? []).join(", ") || "(aucun)"}

# Stats GitHub (vraies recherches)
${
  rawData.githubStats
    ? `- Last push : ${rawData.githubStats.pushedAt?.slice(0, 10) ?? "?"} / License : ${rawData.githubStats.license ?? "?"}
- Open issues : ${rawData.githubStats.openIssues ?? "?"}
- Latest release : ${
        rawData.githubStats.latestRelease
          ? `${rawData.githubStats.latestRelease.tag} (${rawData.githubStats.latestRelease.publishedAt?.slice(0, 10)})`
          : "(aucune)"
      }
- Recent releases : ${
        rawData.githubStats.recentReleases?.length
          ? rawData.githubStats.recentReleases.map((r) => `${r.tag} (${r.date})`).join(", ")
          : "(aucune)"
      }`
    : "- (GitHub indisponible)"
}

Genere la fiche JSON complete et PERSONNALISEE avec ces donnees specifiques.
Audit regle des 3 strict : tutoiement min 5x dans le corps, chiffres specifiques de cette crypto, sections completes (thesis 200+, howItWorks 300+, tokenomics 300+, frEuStatus 200+).
Utilise "a verifier" pour donnees incertaines plutot qu'inventer.`;
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

async function callGeminiAPI(rawData) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY not set");
  // Cycle 25 fix : si DEFAULT_MODEL n'est pas un modèle Gemini (cas du
  // fallback Haiku→Gemini), on force `gemini-2.5-flash` (gratuit, qualité
  // décente). Avant : DEFAULT_MODEL.replace(/^google\//, "") laissait
  // `anthropic/claude-haiku-4.5` intact → URL Gemini /models/anthropic/...
  // → 404. Le fallback ne servait à rien.
  const geminiModelId = isGeminiModel(DEFAULT_MODEL)
    ? DEFAULT_MODEL.replace(/^google\//, "")
    : "gemini-2.5-flash";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${geminiModelId}:generateContent?key=${apiKey}`;
  const ctrl = new AbortController();
  const tid = setTimeout(() => ctrl.abort(), 180_000);
  try {
    const res = await fetch(url, {
      method: "POST",
      signal: ctrl.signal,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
        contents: [{ role: "user", parts: [{ text: buildUserPrompt(rawData) }] }],
        generationConfig: {
          temperature: 0.4,
          maxOutputTokens: 8000,
          responseMimeType: "application/json",
        },
      }),
    });
    if (!res.ok) {
      const errText = await res.text().catch(() => "(no body)");
      throw new Error(`Gemini ${res.status}: ${errText.slice(0, 300)}`);
    }
    const data = await res.json();
    const content = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!content) throw new Error(`Gemini empty content (finishReason=${data?.candidates?.[0]?.finishReason ?? "?"})`);
    const parsed = extractJson(content);
    const usage = data.usageMetadata || {};
    const tokensTotal = (usage.promptTokenCount || 0) + (usage.candidatesTokenCount || 0);
    return { parsed, tokensTotal, cost: 0 }; // Gemini Free Tier
  } finally {
    clearTimeout(tid);
  }
}

// Cycle 25 : fallback Gemini quand OpenRouter renvoie 403/429 (key limit hit
// ou rate limit). Évite que tout le batch fail si la clé OpenRouter est
// momentanément capped. Gemini Flash gratuit (1500 req/jour) sert de filet
// de sécurité — qualité légèrement inférieure à Haiku 4.5 mais largement
// suffisante pour ne pas perdre les fiches.
//
// Comportement :
//   - DEFAULT_MODEL = haiku/sonnet → tente OpenRouter d'abord
//   - Si 403 (limit) ou 429 (rate) → retombe sur Gemini si GEMINI_API_KEY présent
//   - Si 5xx → relance OpenRouter une fois (transient)
//   - Sinon throw normalement
async function callLLM(rawData) {
  if (isGeminiModel(DEFAULT_MODEL)) {
    return callGeminiAPI(rawData);
  }
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    // OpenRouter absent mais Gemini configuré → fallback direct
    if (process.env.GEMINI_API_KEY) {
      console.warn("[callLLM] OPENROUTER_API_KEY absent, fallback Gemini");
      return callGeminiAPI(rawData);
    }
    throw new Error("OPENROUTER_API_KEY not set");
  }
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
      // Cycle 25 : 403 = key limit / 429 = rate limit → fallback Gemini
      if ((res.status === 403 || res.status === 429) && process.env.GEMINI_API_KEY) {
        console.warn(`[callLLM] OpenRouter ${res.status} (${errText.slice(0, 80)}), fallback Gemini for ${rawData.coingeckoId || "?"}`);
        return callGeminiAPI(rawData);
      }
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

  // Step 1 : fetch top cryptos OU liste explicite (regen ciblée) OU scan window
  let topCryptos;
  if (COINGECKO_IDS.length > 0) {
    console.log(`[1/3] Targeted regen of ${COINGECKO_IDS.length} coingecko_ids (skip rank/quality filters)...`);
    topCryptos = [];
    for (let i = 0; i < COINGECKO_IDS.length; i += 250) {
      const chunk = COINGECKO_IDS.slice(i, i + 250);
      const url = `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=${chunk.join(",")}&per_page=250&page=1&sparkline=false`;
      const res = await fetch(url, { headers: { Accept: "application/json" } });
      if (!res.ok) {
        console.warn(`  ⚠️ CoinGecko fetch failed for chunk ${i}-${i+chunk.length}: ${res.status}`);
        continue;
      }
      const data = await res.json();
      topCryptos.push(...data);
      await new Promise((r) => setTimeout(r, 1500));
    }
    console.log(`  ✓ ${topCryptos.length}/${COINGECKO_IDS.length} cryptos found via CoinGecko`);
  } else if (SCAN_WINDOW > 0 && TOP_QUALITY > 0) {
    // Cycle 25 : mode scan + rerank par quality_score
    // Étape 1a : fetch SCAN_WINDOW cryptos (paginé via fetchTopCryptos)
    console.log(`[1/3] Scan window ${SCAN_WINDOW} cryptos → rerank by quality_score → keep top ${TOP_QUALITY}...`);
    topCryptos = await fetchTopCryptos(SCAN_WINDOW, 1);
    console.log(`  ✓ ${topCryptos.length} cryptos fetched`);
    // Étape 1b : skip celles déjà en DB (early skip — économise les fetch overview)
    if (sb && SKIP_EXISTING) {
      const ids = topCryptos.map((c) => c.id);
      // Chunked SELECT (Supabase limite ~1000 ids par .in())
      const existingIds = new Set();
      for (let i = 0; i < ids.length; i += 500) {
        const chunk = ids.slice(i, i + 500);
        const { data: existing } = await sb.from("cryptos").select("coingecko_id").in("coingecko_id", chunk);
        for (const r of existing ?? []) existingIds.add(r.coingecko_id);
      }
      const before = topCryptos.length;
      topCryptos = topCryptos.filter((c) => !existingIds.has(c.id));
      console.log(`  ✓ ${existingIds.size} déjà en DB skipped, ${topCryptos.length}/${before} candidats restants`);
    }
    // Étape 1c : compute quality_score pour CHAQUE crypto (fetch overview minimal)
    console.log(`  ⏳ Scoring quality des ${topCryptos.length} candidats (peut prendre quelques minutes)...`);
    const scored = [];
    for (let i = 0; i < topCryptos.length; i++) {
      const c = topCryptos[i];
      try {
        const cg = await fetchCoinGeckoOverview(c.id);
        if (!cg) continue;
        const llama = await fetchDefiLlama(c.id, cg.name);
        const rawData = compactRawData(c.id, cg, llama);
        await fetchAdditional(rawData);
        const score = rawData.qualityScore?.score ?? 0;
        scored.push({ c, rawData, score });
        if ((i + 1) % 25 === 0) console.log(`    [scoring ${i+1}/${topCryptos.length}] avg quality so far: ${(scored.reduce((s,x) => s+x.score, 0)/scored.length).toFixed(1)}`);
      } catch (e) {
        console.warn(`    ⚠️ ${c.id} scoring fail: ${e.message?.slice(0, 80)}`);
      }
      // Rate limit doux pour le scan : 1.5s entre chaque (CoinGecko free tier 30 r/min)
      await new Promise((r) => setTimeout(r, 1500));
    }
    // Étape 1d : trier desc par score, prendre top TOP_QUALITY
    scored.sort((a, b) => b.score - a.score);
    const top = scored.slice(0, TOP_QUALITY);
    console.log(`  ✓ scoring fini, top ${top.length} sélectionnés (score min: ${top[top.length-1]?.score}, max: ${top[0]?.score})`);
    // Replace topCryptos par les coingecko-list AVEC rawData pré-calculé pour skip ré-fetch
    topCryptos = top.map((x) => ({ ...x.c, _preloadedRawData: x.rawData }));
  } else {
    console.log("[1/3] Fetching top cryptos from CoinGecko...");
    topCryptos = await fetchTopCryptos(COUNT, START_RANK);
    console.log(`  ✓ ${topCryptos.length} cryptos in target range`);
  }

  // Step 2 : filter existing
  // - regen ciblée (COINGECKO_IDS) : skip (on veut overwrite)
  // - scan-window : déjà fait en step 1b, skip
  // - mode classique : filter existing
  let toProcess = topCryptos;
  if (sb && SKIP_EXISTING && COINGECKO_IDS.length === 0 && !(SCAN_WINDOW > 0 && TOP_QUALITY > 0)) {
    const ids = topCryptos.map((c) => c.id);
    const { data: existing } = await sb.from("cryptos").select("coingecko_id").in("coingecko_id", ids);
    const existingSet = new Set((existing ?? []).map((r) => r.coingecko_id));
    toProcess = topCryptos.filter((c) => !existingSet.has(c.id));
    console.log(`  ✓ ${existingSet.size} skipped (already in DB), ${toProcess.length} to process`);
  } else if (COINGECKO_IDS.length > 0) {
    console.log(`  ✓ regen ciblée : ${toProcess.length} fiches à overwriter (upsert)`);
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
      let rawData;
      // Cycle 25 : en mode scan-window, rawData est déjà calculé pendant le
      // scoring (étape 1c). On évite un re-fetch inutile.
      if (c._preloadedRawData) {
        rawData = c._preloadedRawData;
      } else {
        const cg = await fetchCoinGeckoOverview(c.id);
        if (!cg) {
          failed++;
          errors.push({ id: c.id, error: "coingecko fetch failed" });
          console.log(`  [${i + 1}/${toProcess.length}] ❌ ${c.id} — coingecko fetch failed`);
          continue;
        }
        const llama = await fetchDefiLlama(c.id, cg.name);
        rawData = compactRawData(c.id, cg, llama);
        // Cycles 16+19 : enrichissement vraies recherches + quality_score
        await fetchAdditional(rawData);
      }

      // Cycle 23 : skip cryptos sous quality threshold (1000 meilleurs filter).
      // Cycle 24 : en mode regen ciblée, on bypass ce filter — l'utilisateur a
      // explicitement demandé ces ids (ex: pour fixer les fiches sub-100%).
      if (
        COINGECKO_IDS.length === 0 &&
        MIN_QUALITY > 0 &&
        (rawData.qualityScore?.score ?? 0) < MIN_QUALITY
      ) {
        console.log(`  [${i + 1}/${toProcess.length}] ⊘ ${c.id} skipped (quality=${rawData.qualityScore?.score}/100 < min ${MIN_QUALITY})`);
        continue;
      }

      if (DRY_RUN) {
        console.log(`  [${i + 1}/${toProcess.length}] DRY ${c.id} (${rawData.symbol}) — quality=${rawData.qualityScore?.score}/100, price=${rawData.market?.priceUsd}`);
        await new Promise((r) => setTimeout(r, 200));
        continue;
      }

      const llmResult = await callLLM(rawData);
      normalizeParsed(llmResult.parsed);
      // Cycle 17 propage : audit regle des 3 par fiche
      const audit = auditRegleDes3(llmResult.parsed, rawData);
      totalCost += llmResult.cost;
      totalTokens += llmResult.tokensTotal;

      // Embed audit dans llm_content sub-key pour pas casser schema
      const llmContentWithAudit = { ...llmResult.parsed, _audit: audit };

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
        llm_content: llmContentWithAudit,
        market_cap_rank: cg.market_cap_rank ?? null,
        market_cap_usd: rawData.market?.marketCapUsd ?? null,
        price_usd: rawData.market?.priceUsd ?? null,
        score_decentralization: llmResult.parsed?.scores?.decentralization?.score ?? null,
        score_compliance_fr_eu: llmResult.parsed?.scores?.complianceFrEu?.score ?? null,
        score_technical_maturity: llmResult.parsed?.scores?.technicalMaturity?.score ?? null,
        score_community_health: llmResult.parsed?.scores?.communityHealth?.score ?? null,
        score_overall: llmResult.parsed?.scores?.overall?.score ?? null,
        // fact_check_score recoit l'audit qualite editorial overall (0-100)
        fact_check_score: audit.overall,
        quality_tier: "T3",
        llm_model: DEFAULT_MODEL,
        llm_tokens_total: llmResult.tokensTotal,
        llm_cost_usd: llmResult.cost,
        source: "llm-pipeline",
        is_published: true,
        published_at: new Date().toISOString(),
        last_refreshed_at: new Date().toISOString(),
        // needs_review = true si audit FAIL → flag pour review humaine
        needs_review: !audit.passed,
      };

      const { error } = await sb.from("cryptos").upsert(row, { onConflict: "coingecko_id" });
      if (error) {
        failed++;
        errors.push({ id: c.id, error: error.message });
        console.log(`  [${i + 1}/${toProcess.length}] ❌ ${c.id} — DB error: ${error.message}`);
      } else {
        success++;
        const elapsed = Math.round((Date.now() - startTs) / 1000);
        const auditMark = audit.passed ? "✓" : "⚠";
        console.log(
          `  [${i + 1}/${toProcess.length}] ✓ ${c.id} (${rawData.symbol}) — ${elapsed}s, $${llmResult.cost.toFixed(4)}, score=${row.score_overall ?? "?"}, audit=${audit.overall}/100 ${auditMark}`,
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
