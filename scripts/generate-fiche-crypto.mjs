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

// Pricing aligne sur generate-weekly-article.mjs + modeles :free OpenRouter
// + Gemini API direct (Google AI Studio, 1500 req/jour gratuites Flash).
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
  // Format : "google/gemini-..." pour distinguer du provider.
  "google/gemini-2.5-flash": { input: 0, output: 0 },
  "google/gemini-1.5-flash": { input: 0, output: 0 },
  "google/gemini-1.5-pro": { input: 0, output: 0 }, // 50 req/jour gratuit
};

/**
 * Detecte si le model est Gemini (route via Google AI Studio API direct au
 * lieu d'OpenRouter). Gemini API key = GEMINI_API_KEY env var.
 */
function isGeminiModel(model) {
  return typeof model === "string" && model.startsWith("google/gemini-");
}

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
 * Fetch CoinGecko market chart (90j) — vraie recherche : volatility, drawdowns,
 * vrais events historiques (crashes, pumps). Sert pour donner contexte LLM.
 */
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
    // Stats extraites pour le prompt : volatility, max/min 90d, big move events
    const max = Math.max(...prices);
    const min = Math.min(...prices);
    const last = prices[prices.length - 1];
    const drawdown = max > 0 ? ((max - min) / max) * 100 : 0;
    const recoverFromMin = min > 0 ? ((last - min) / min) * 100 : 0;
    // Detect big moves : days avec |change| > 10%
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
      bigMoves90d: bigMoves.slice(0, 5), // top 5 gros mouvements
    };
  } catch {
    return null;
  }
}

/**
 * Fetch GitHub repo stats (1er repo de la liste) — vraie recherche : releases
 * recentes, derniers commits, contributors. Sert a evaluer dev activity reelle.
 */
async function fetchGitHubStats(repoUrl) {
  if (!repoUrl || !repoUrl.includes("github.com")) return null;
  // Extract owner/repo from URL
  const match = repoUrl.match(/github\.com\/([^/]+)\/([^/?#]+)/);
  if (!match) return null;
  const [, owner, repo] = match;
  try {
    const ctrl = new AbortController();
    const tid = setTimeout(() => ctrl.abort(), 10_000);
    // GitHub public API (no auth — 60 req/h limit, OK pour pipeline)
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
    // Phase enrichissement : ajoutes par fetchAdditional() apres compactRawData
    marketChart90d: null,
    githubStats: null,
  };
}

/**
 * Enrichit rawData avec les vraies recherches externes (vrai contenu personnalise).
 * Lance en parallele pour minimiser la latence.
 */
async function fetchAdditional(rawData) {
  const repoUrl = rawData.repos?.[0];
  const [marketChart, github] = await Promise.all([
    fetchCoinGeckoMarketChart(rawData.coingeckoId),
    repoUrl ? fetchGitHubStats(repoUrl) : Promise.resolve(null),
  ]);
  rawData.marketChart90d = marketChart;
  rawData.githubStats = github;
  return rawData;
}

/* -------------------------------------------------------------------------- */
/*  Prompt builder (schema fiche profonde 12 sections)                       */
/* -------------------------------------------------------------------------- */

const SYSTEM_PROMPT = `Tu es analyste crypto senior pour Cryptoreflex.fr (audience FR debutants/intermediaires).
Mission : rediger une fiche d'analyse complete et structuree d'une crypto, qualite editoriale humaine, basee sur les donnees factuelles fournies.

REGLES STRICTES :
- 100% francais, accents corrects (a e e e c o u i)
- TUTOIEMENT OBLIGATOIRE PARTOUT : utilise "tu/te/toi/ton/tes" dans CHAQUE section
  (thesis, howItWorks, tokenomics, metrics narrative, risks, frEuStatus, disclaimer).
  JAMAIS "vous" ni "on" impersonnel. JAMAIS "les utilisateurs", privilégie "tu" / "les détenteurs comme toi".
  Minimum 5 occurrences "tu/te/toi/ton/tes" dans le corps de la fiche.
  Exemples obligatoires :
    - "Si tu détiens du SOL..." (pas "Les détenteurs de SOL...")
    - "Tu dois être conscient que..." (pas "Il faut être conscient...")
    - "Pour staker tes SOL, tu peux utiliser..."
    - "Voici ce que tu dois savoir sur les frais..."
    - "Si tu es résident fiscal français..."
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
  "thesis": "200-400 mots OBLIGATOIRE (minimum 200 mots reels — n'envoie pas de thesis plus courte). Pourquoi ce projet existe, qu'est-ce qu'il resout, sa proposition de valeur unique. Pedagogique, sans jargon. Utilise 'tu' au moins 1x pour parler au lecteur.",
  "howItWorks": "300-500 mots OBLIGATOIRE (minimum 300 mots). Comment ca marche techniquement, accessible debutant. Consensus, architecture, innovations cles. Utilise 'tu' au moins 1x.",
  "tokenomics": "300-500 mots OBLIGATOIRE (minimum 300 mots). Supply, distribution, vesting, utilite du token, mecanismes inflation/burn. Cite les chiffres factuels. Utilise 'tu' au moins 1x ('si tu detiens', 'tes tokens').",
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
  "frEuStatus": "200-300 mots OBLIGATOIRE (minimum 200 mots). Statut FR/EU specifique. Utilise 'tu' systematiquement ('si tu es resident fiscal', 'tu peux acheter', 'tu dois declarer'). Mentionne PSAN exchanges, MiCA, Cerfa 2086, particularites legales FR.",
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

# Historique 90 jours (donnees CoinGecko market chart)
${
  rawData.marketChart90d
    ? `- Max 90j : $${rawData.marketChart90d.max90d?.toFixed(4)}
- Min 90j : $${rawData.marketChart90d.min90d?.toFixed(4)}
- Drawdown max : -${rawData.marketChart90d.drawdown90dPct}% (max → min)
- Recovery from min : +${rawData.marketChart90d.recoveryFromMin90dPct}%
- Mouvements > 10% sur 1 jour (top 5) : ${
        rawData.marketChart90d.bigMoves90d?.length
          ? rawData.marketChart90d.bigMoves90d.map((m) => `${m.date} (${m.changePct}%)`).join(", ")
          : "(aucun)"
      }`
    : "- (donnees market chart 90j non disponibles)"
}

# Stats GitHub (premier repo officiel)
${
  rawData.githubStats
    ? `- Default branch : ${rawData.githubStats.defaultBranch ?? "?"}
- License : ${rawData.githubStats.license ?? "?"}
- Issues ouverts : ${rawData.githubStats.openIssues ?? "?"}
- Dernier push : ${rawData.githubStats.pushedAt?.slice(0, 10) ?? "?"}
- Derniere release : ${
        rawData.githubStats.latestRelease
          ? `${rawData.githubStats.latestRelease.tag} (${rawData.githubStats.latestRelease.publishedAt?.slice(0, 10)}, prerelease=${rawData.githubStats.latestRelease.isPrerelease})`
          : "(aucune)"
      }
- Recent releases : ${
        rawData.githubStats.recentReleases?.length
          ? rawData.githubStats.recentReleases.map((r) => `${r.tag} (${r.date})`).join(", ")
          : "(aucune)"
      }`
    : "- (stats GitHub indisponibles ou pas de repo officiel)"
}

# Mission — fiche personnalisee avec vraies recherches
Genere la fiche complete en JSON strict. Exigences (audit regle des 3 par fiche) :
1. **Personnalisation** : utilise les chiffres SPECIFIQUES de cette crypto (genesis date, ATH date, drawdown 90j, releases recentes, etc.). PROSCRIRE les phrases generiques copiables d'une fiche a l'autre.
2. **Factualite** : tous les chiffres dans "metrics.keyFigures" doivent matcher les data ci-dessus. Pas d'arrondi excessif (\$88.65 pas \$88).
3. **Profondeur** :
   - thesis = pourquoi CETTE crypto specifiquement existe (pas "cryptos en general")
   - howItWorks = mention le consensus, le hardware specifique, les innovations propres
   - tokenomics = chiffres reels du supply, distribution, vesting si connu
   - risks = au moins 3 categories distinctes ET specifiques (pas "marche volatile" generique)
4. **Si manque de data** : ecris "a verifier sur sources externes" plutot qu'inventer.
5. **frEuStatus** = PSAN exchanges, MiCA, Cerfa 2086, particularites FR. Concret.
6. **factCheckNotes** = liste les claims qui necessitent verification humaine.

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

/**
 * Call Gemini API directement (Google AI Studio).
 * Endpoint : POST https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent
 * Format Google native (system_instruction + contents + generationConfig).
 */
async function callGeminiAPI(rawData, modelName) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY not set");

  // "google/gemini-2.5-flash" -> "gemini-2.5-flash"
  const geminiModelId = modelName.replace(/^google\//, "");
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${geminiModelId}:generateContent?key=${apiKey}`;

  const ctrl = new AbortController();
  const tid = setTimeout(() => ctrl.abort(), TIMEOUT_MS);

  let res;
  try {
    res = await fetch(url, {
      method: "POST",
      signal: ctrl.signal,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
        contents: [{ role: "user", parts: [{ text: buildUserPrompt(rawData) }] }],
        generationConfig: {
          temperature: TEMPERATURE,
          maxOutputTokens: MAX_TOKENS,
          responseMimeType: "application/json",
        },
      }),
    });
  } finally {
    clearTimeout(tid);
  }

  if (!res.ok) {
    const errText = await res.text().catch(() => "(no body)");
    throw new Error(`Gemini ${res.status}: ${errText.slice(0, 300)}`);
  }

  const data = await res.json();
  const candidate = data?.candidates?.[0];
  const content = candidate?.content?.parts?.[0]?.text;
  if (!content) {
    throw new Error(
      `Gemini empty response (finishReason=${candidate?.finishReason ?? "?"})`,
    );
  }

  const parsed = extractJson(content);
  const usage = data.usageMetadata || {};
  const promptTokens = usage.promptTokenCount || 0;
  const completionTokens = usage.candidatesTokenCount || 0;
  const totalTokens = promptTokens + completionTokens;
  const cost = 0; // Gemini Free Tier

  console.log(
    `[llm] gemini tokens=${totalTokens} (in=${promptTokens} out=${completionTokens}) cost=$0 model=${geminiModelId}`,
  );

  return { parsed, model: modelName, tokens: totalTokens, cost };
}

async function callLLM(rawData) {
  const model = DEFAULT_MODEL;

  // Dispatch selon provider : Gemini direct OU OpenRouter
  if (isGeminiModel(model)) {
    return callGeminiAPI(rawData, model);
  }

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error("OPENROUTER_API_KEY not set");
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
/*  Normalization (LLM tolerance)                                             */
/* -------------------------------------------------------------------------- */

/**
 * Normalise les champs qui DOIVENT etre des arrays mais que le LLM peut
 * parfois retourner comme objets (`{a: {...}, b: {...}}` au lieu de `[...]`).
 * Convertit via Object.values() le cas echeant. Idempotent.
 */
function normalizeParsed(parsed) {
  if (!parsed || typeof parsed !== "object") return parsed;
  for (const key of ["competitors", "moats", "risks", "furtherReading"]) {
    const v = parsed[key];
    if (v && !Array.isArray(v) && typeof v === "object") {
      parsed[key] = Object.values(v);
    }
  }
  // metrics.keyFigures aussi
  if (
    parsed.metrics &&
    parsed.metrics.keyFigures &&
    !Array.isArray(parsed.metrics.keyFigures) &&
    typeof parsed.metrics.keyFigures === "object"
  ) {
    parsed.metrics.keyFigures = Object.values(parsed.metrics.keyFigures);
  }
  return parsed;
}

/* -------------------------------------------------------------------------- */
/*  Audit règle des 3 — validator qualité par fiche (cycle 17)                */
/* -------------------------------------------------------------------------- */

/**
 * Compte les occurrences case-insensitive d'un pattern regex dans un texte.
 */
function countMatches(text, regex) {
  if (!text || typeof text !== "string") return 0;
  const matches = text.match(regex);
  return matches ? matches.length : 0;
}

/**
 * Audit règle des 3 sur une fiche LLM-générée.
 * Retourne un score 0-100 + flags des problèmes détectés.
 *
 * Critère 1 — TUTOIEMENT (voix Cryptoreflex)
 *   - Compte tu/te/toi/ton/tes/tien dans le corps
 *   - Pénalise "vous/votre" (impersonnel)
 *   - Min 5 occurrences tu pour pass
 *
 * Critère 2 — PERSONNALISATION (pas de générique)
 *   - Mentions name/symbol ≥3 dans thesis+howItWorks+tokenomics
 *   - Présence de chiffres spécifiques ($X, X%, XM, XB)
 *   - Mentions de chiffres uniques (drawdown, release tag, etc.)
 *
 * Critère 3 — PROFONDEUR (volume + structure)
 *   - thesis ≥150 mots
 *   - howItWorks ≥200 mots
 *   - tokenomics ≥200 mots
 *   - frEuStatus ≥150 mots
 *   - risks ≥3 catégories distinctes
 *   - competitors ≥3
 */
function auditRegleDes3(parsed, rawData) {
  const issues = [];
  const c = parsed ?? {};
  const name = rawData?.name ?? "";
  const symbol = rawData?.symbol ?? "";

  // Concat des sections texte pour analyses globales
  const corpus = [
    c.tldr ?? "",
    c.thesis ?? "",
    c.howItWorks ?? "",
    c.tokenomics ?? "",
    c.metrics?.narrative ?? "",
    c.frEuStatus ?? "",
  ].join("\n\n");

  // === Critère 1 : Tutoiement ===
  // Match standalone tu/te/toi/ton/tes/t' (avec word boundaries)
  const tuCount = countMatches(corpus, /\b(tu|te|toi|ton|tes|t')\b/gi);
  const vousCount = countMatches(corpus, /\b(vous|votre|vos)\b/gi);
  const tutoiementScore = Math.min(
    100,
    Math.max(0, tuCount * 5 - vousCount * 10),
  );
  if (tuCount < 5) issues.push(`tutoiement insuffisant (${tuCount} occurrences, min 5)`);
  if (vousCount > 2) issues.push(`vouvoiement détecté (${vousCount} occurrences)`);

  // === Critère 2 : Personnalisation ===
  const nameSymbolMentions =
    countMatches(corpus, new RegExp(`\\b${symbol}\\b`, "gi")) +
    countMatches(corpus, new RegExp(`\\b${name}\\b`, "gi"));
  const numberMentions = countMatches(
    corpus,
    /\$[\d.,]+\s?(?:[BKMbillionsmillemilliers]+)?|\d+[.,]?\d*\s?%|\d+[.,]?\d*\s?(?:M|B|k|TPS|tx)/g,
  );
  const personalizationScore = Math.min(
    100,
    Math.round((nameSymbolMentions / 3) * 30 + (numberMentions / 10) * 70),
  );
  if (nameSymbolMentions < 3)
    issues.push(`nom/symbol pas assez mentionnés (${nameSymbolMentions}, min 3)`);
  if (numberMentions < 5)
    issues.push(`chiffres spécifiques insuffisants (${numberMentions}, min 5)`);

  // === Critère 3 : Profondeur ===
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
  let depthTotal = 6;
  if (wThesis >= 150) depthChecks++;
  else issues.push(`thesis trop court (${wThesis} mots, min 150)`);
  if (wHow >= 200) depthChecks++;
  else issues.push(`howItWorks trop court (${wHow} mots, min 200)`);
  if (wTok >= 200) depthChecks++;
  else issues.push(`tokenomics trop court (${wTok} mots, min 200)`);
  if (wFR >= 150) depthChecks++;
  else issues.push(`frEuStatus trop court (${wFR} mots, min 150)`);
  if (risksCategories >= 3) depthChecks++;
  else issues.push(`risks insuffisamment catégorisés (${risksCategories} catégories, min 3)`);
  if (competitorsCount >= 3) depthChecks++;
  else issues.push(`competitors insuffisants (${competitorsCount}, min 3)`);
  const depthScore = Math.round((depthChecks / depthTotal) * 100);

  // === Composite (pondération équilibrée) ===
  const overall = Math.round(
    tutoiementScore * 0.3 + personalizationScore * 0.35 + depthScore * 0.35,
  );
  const passed = overall >= 70 && tutoiementScore >= 50 && personalizationScore >= 60 && depthScore >= 70;

  return {
    overall,
    passed,
    breakdown: {
      tutoiement: { score: tutoiementScore, tuCount, vousCount },
      personalization: { score: personalizationScore, nameSymbolMentions, numberMentions },
      depth: {
        score: depthScore,
        wThesis,
        wHowItWorks: wHow,
        wTokenomics: wTok,
        wFrEuStatus: wFR,
        risksCategories,
        competitorsCount,
      },
    },
    issues,
  };
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
    audit: llmInfo?.audit ?? null,
  };

  const jsonPath = path.join(OUTPUT_DIR, `${coingeckoId}.json`);
  await fs.writeFile(jsonPath, JSON.stringify(fiche, null, 2), "utf8");

  // Preview Markdown lisible humain pour eval qualite.
  const md = renderPreviewMarkdown(fiche);
  const mdPath = path.join(PREVIEW_DIR, `${coingeckoId}.md`);
  await fs.writeFile(mdPath, md, "utf8");

  return { jsonPath, mdPath };
}

/**
 * Coerce vers array. Si l'input est deja un array, retourne tel quel.
 * Si c'est un objet (le LLM peut retourner {key1: {...}, key2: {...}} au lieu
 * d'array), Object.values() pour le convertir. Sinon retourne [].
 */
function asArray(v) {
  if (Array.isArray(v)) return v;
  if (v && typeof v === "object") return Object.values(v);
  return [];
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
    ...asArray(c.competitors).map(
      (cc) => `- **${cc?.name ?? "?"}** (${cc?.coingeckoId ?? "?"}) — ${cc?.differentiator ?? ""}`,
    ),
    ``,
    `## 🛡️ Moats`,
    ...asArray(c.moats).map((m) => `- **[${m?.type ?? "?"}]** ${m?.description ?? ""}`),
    ``,
    `## ⚠️ Risques`,
    ...asArray(c.risks).map(
      (r) => `- **[${r?.category ?? "?"} / ${r?.severity ?? "?"}]** ${r?.description ?? ""}`,
    ),
    ``,
    `## 🇫🇷 Statut FR/EU`,
    c.frEuStatus ?? "(missing)",
    ``,
    `## 🎓 Pour aller plus loin`,
    ...asArray(c.furtherReading).map((r) => `- [${r?.title ?? "?"}](${r?.url_or_slug ?? "#"})`),
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

  console.log("[2.5/4] Enrichissement (vraies recherches : market chart 90j + GitHub stats)...");
  await fetchAdditional(rawData);
  console.log(
    rawData.marketChart90d
      ? `  ✓ Market chart 90j : drawdown ${rawData.marketChart90d.drawdown90dPct}%, ${rawData.marketChart90d.bigMoves90d?.length ?? 0} gros mouvements`
      : "  ⊘ market chart 90j indisponible",
  );
  console.log(
    rawData.githubStats
      ? `  ✓ GitHub : last push ${rawData.githubStats.pushedAt?.slice(0, 10)}, latest release ${rawData.githubStats.latestRelease?.tag ?? "(aucune)"}`
      : "  ⊘ GitHub stats indisponibles",
  );

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

  // Step 4 — normalize + validate + audit règle des 3 + write
  console.log("[4/4] Normalize + validate + audit règle des 3 + write...");
  normalizeParsed(llmInfo.parsed);
  const v = validate(llmInfo.parsed);
  const audit = auditRegleDes3(llmInfo.parsed, rawData);
  console.log(`  audit: overall=${audit.overall}/100 (${audit.passed ? "PASS" : "FAIL"})`);
  console.log(
    `    tutoiement=${audit.breakdown.tutoiement.score} (${audit.breakdown.tutoiement.tuCount} tu, ${audit.breakdown.tutoiement.vousCount} vous)`,
  );
  console.log(
    `    personnalisation=${audit.breakdown.personalization.score} (name×${audit.breakdown.personalization.nameSymbolMentions}, chiffres×${audit.breakdown.personalization.numberMentions})`,
  );
  console.log(`    profondeur=${audit.breakdown.depth.score}`);
  if (audit.issues.length > 0) {
    console.log(`    issues: ${audit.issues.slice(0, 3).join(" | ")}`);
  }
  llmInfo.audit = audit;
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
