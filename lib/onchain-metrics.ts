/**
 * lib/onchain-metrics.ts — Métriques on-chain live pour les fiches /cryptos/[slug].
 *
 * Aggregateur best-effort multi-sources :
 *   - DeFiLlama (https://api.llama.fi/protocol/{slug}) : TVL + variation 7j.
 *     Disponible uniquement pour ~30 protocoles DeFi (DEX, lending, LSDfi, ...).
 *   - CoinGecko `/coins/{id}` : holders count (rare, dépend de la chaîne),
 *     market cap dominance, FDV.
 *
 * Contrat fort :
 *   - **Aucune throw** : toutes les erreurs sont attrapées, on log via
 *     console.error et on retourne null OU des champs partiellement remplis.
 *   - Cache 1h via `unstable_cache` (tag "onchain") — partagé entre composants
 *     et entre requêtes. Revalidation ciblée possible via revalidateTag("onchain").
 *
 * Si AUCUNE source ne répond, retourne null pour permettre au composant de ne
 * rien afficher (vs un bloc vide "no data" qui dégrade la fiche).
 */

import { unstable_cache } from "next/cache";

/* -------------------------------------------------------------------------- */
/*  Types                                                                     */
/* -------------------------------------------------------------------------- */

export interface OnChainMetrics {
  /** Total Value Locked en USD (DeFiLlama). Présent uniquement pour protocoles DeFi. */
  tvlUSD?: number;
  /** Variation TVL sur 7 jours en pourcentage (DeFiLlama). */
  tvlChange7d?: number;
  /** Adresses actives sur 24h (rare, source variable). */
  activeAddresses24h?: number;
  /** Nombre de transactions sur 24h. */
  txCount24h?: number;
  /** Variation du tx count 24h vs J-1 en pourcentage. */
  txCount24hChange?: number;
  /** Nombre total de holders (CoinGecko, dépend de la chaîne). */
  holdersCount?: number;
  /** Pourcentage du supply détenu par le top 10 holders. */
  holdersTop10Pct?: number;
  /** Dominance dans la market cap globale crypto, en pourcentage. */
  marketCapDominance?: number;
  /** Fully Diluted Valuation en USD. */
  fdv?: number;
  /** Commits GitHub sur 30 derniers jours. */
  githubCommits30d?: number;
  /** ISO timestamp de dernière mise à jour effective. */
  lastUpdate: string;
}

/* -------------------------------------------------------------------------- */
/*  Mapping CoinGecko ID → DeFiLlama slug                                     */
/* -------------------------------------------------------------------------- */

/**
 * Slugs DeFiLlama (https://api.llama.fi/protocol/{slug}) pour les ~30 protocoles
 * DeFi présents dans le catalogue. Tout coingeckoId absent ici sera ignoré côté
 * DeFiLlama (mais peut quand même retourner d'autres champs via CoinGecko).
 *
 * Vérifier régulièrement : DeFiLlama peut renommer un slug suite à un fork ou
 * un re-listing. En cas de 404, le fetch est silencieux et le champ TVL absent.
 */
const DEFILLAMA_SLUGS: Readonly<Record<string, string>> = {
  // DEX
  uniswap: "uniswap",
  "curve-dao-token": "curve-dex",
  "jupiter-exchange-solana": "jupiter-aggregator",
  raydium: "raydium",
  "1inch": "1inch-network",
  "aerodrome-finance": "aerodrome-v1",
  hyperliquid: "hyperliquid",
  "dydx-chain": "dydx-v4",
  gmx: "gmx",
  "pyth-network": "pyth-network",

  // Lending
  aave: "aave",
  "compound-governance-token": "compound-finance",
  maker: "makerdao",

  // LSD / restaking
  "lido-dao": "lido",
  "rocket-pool": "rocket-pool",
  eigenlayer: "eigenlayer",

  // Yield
  pendle: "pendle",
  "convex-finance": "convex-finance",
  "frax-share": "frax",
  ethena: "ethena",

  // L2 / infra
  arbitrum: "arbitrum-bridge",
  optimism: "optimism-bridge",
  starknet: "starknet-bridge",
  "polygon-ecosystem-token": "polygon",

  // Synthetic
  havven: "synthetix",

  // Real World Assets
  "ondo-finance": "ondo-finance",

  // Liquid staking ETH
  // (déjà couverts via lido-dao, rocket-pool)

  // Bridges / cross-chain
  // (couvert via les bridges officiels arbitrum/optimism/starknet)
};

/* -------------------------------------------------------------------------- */
/*  Sous-fetchers (chacun fail-safe, retourne Partial<OnChainMetrics>)        */
/* -------------------------------------------------------------------------- */

interface DefiLlamaProtocol {
  tvl?: number | Array<{ date: number; totalLiquidityUSD: number }>;
  currentChainTvls?: Record<string, number>;
  chainTvls?: Record<string, { tvl?: Array<{ date: number; totalLiquidityUSD: number }> }>;
  change_1d?: number;
  change_7d?: number;
}

async function fetchDefiLlama(coingeckoId: string): Promise<Partial<OnChainMetrics>> {
  const slug = DEFILLAMA_SLUGS[coingeckoId];
  if (!slug) return {};

  try {
    const res = await fetch(`https://api.llama.fi/protocol/${slug}`, {
      next: { revalidate: 3600, tags: ["onchain"] },
      headers: { accept: "application/json" },
    });
    if (!res.ok) return {};
    const json = (await res.json()) as DefiLlamaProtocol;

    // Sum currentChainTvls (préféré, plus précis), sinon dernier point de la
    // série tvl globale. DeFiLlama renvoie parfois un nombre direct, parfois
    // une série temporelle — on couvre les deux cas.
    let tvlUSD: number | undefined;
    if (json.currentChainTvls && typeof json.currentChainTvls === "object") {
      const sum = Object.values(json.currentChainTvls)
        .filter((v): v is number => typeof v === "number" && Number.isFinite(v))
        .reduce((acc, v) => acc + v, 0);
      if (sum > 0) tvlUSD = sum;
    }
    if (tvlUSD === undefined && Array.isArray(json.tvl) && json.tvl.length > 0) {
      const last = json.tvl[json.tvl.length - 1];
      if (last && typeof last.totalLiquidityUSD === "number") tvlUSD = last.totalLiquidityUSD;
    }
    if (tvlUSD === undefined && typeof json.tvl === "number") {
      tvlUSD = json.tvl;
    }

    const tvlChange7d =
      typeof json.change_7d === "number" && Number.isFinite(json.change_7d)
        ? json.change_7d
        : undefined;

    const out: Partial<OnChainMetrics> = {};
    if (tvlUSD !== undefined) out.tvlUSD = tvlUSD;
    if (tvlChange7d !== undefined) out.tvlChange7d = tvlChange7d;
    return out;
  } catch (err) {
    console.error("[onchain-metrics] DeFiLlama error:", err);
    return {};
  }
}

interface CoinGeckoCoin {
  market_data?: {
    market_cap?: { usd?: number };
    fully_diluted_valuation?: { usd?: number };
    market_cap_change_percentage_24h?: number;
  };
  market_cap_rank?: number;
  community_data?: {
    twitter_followers?: number;
  };
  developer_data?: {
    commit_count_4_weeks?: number;
  };
  last_updated?: string;
}

interface CoinGeckoGlobal {
  data?: { total_market_cap?: { usd?: number } };
}

async function fetchCoinGeckoMetrics(
  coingeckoId: string,
): Promise<Partial<OnChainMetrics>> {
  try {
    // /coins/{id} en parallèle de /global pour calculer la dominance.
    const [coinRes, globalRes] = await Promise.all([
      fetch(
        `https://api.coingecko.com/api/v3/coins/${encodeURIComponent(
          coingeckoId,
        )}?localization=false&tickers=false&market_data=true&community_data=false&developer_data=true&sparkline=false`,
        {
          next: { revalidate: 3600, tags: ["onchain"] },
          headers: { accept: "application/json" },
        },
      ),
      fetch("https://api.coingecko.com/api/v3/global", {
        next: { revalidate: 3600, tags: ["onchain"] },
        headers: { accept: "application/json" },
      }),
    ]);

    const out: Partial<OnChainMetrics> = {};

    if (coinRes.ok) {
      const coin = (await coinRes.json()) as CoinGeckoCoin;
      const fdv = coin.market_data?.fully_diluted_valuation?.usd;
      if (typeof fdv === "number" && Number.isFinite(fdv) && fdv > 0) {
        out.fdv = fdv;
      }
      const commits = coin.developer_data?.commit_count_4_weeks;
      if (typeof commits === "number" && Number.isFinite(commits) && commits >= 0) {
        out.githubCommits30d = commits;
      }

      // Dominance = market_cap / total_market_cap_usd × 100.
      const mcap = coin.market_data?.market_cap?.usd;
      if (typeof mcap === "number" && Number.isFinite(mcap) && mcap > 0 && globalRes.ok) {
        const globalJson = (await globalRes.json()) as CoinGeckoGlobal;
        const totalMcap = globalJson.data?.total_market_cap?.usd;
        if (typeof totalMcap === "number" && totalMcap > 0) {
          out.marketCapDominance = (mcap / totalMcap) * 100;
        }
      }
    }

    return out;
  } catch (err) {
    console.error("[onchain-metrics] CoinGecko error:", err);
    return {};
  }
}

/* -------------------------------------------------------------------------- */
/*  Aggregateur principal                                                     */
/* -------------------------------------------------------------------------- */

async function _fetchOnChainMetrics(
  coingeckoId: string,
): Promise<OnChainMetrics | null> {
  try {
    const [defi, cg] = await Promise.all([
      fetchDefiLlama(coingeckoId),
      fetchCoinGeckoMetrics(coingeckoId),
    ]);

    const merged: OnChainMetrics = {
      ...defi,
      ...cg,
      lastUpdate: new Date().toISOString(),
    };

    // Si aucun champ utile n'est rempli, retourne null pour que le composant
    // ne s'affiche pas du tout (UX > bloc vide).
    const meaningfulKeys: Array<keyof OnChainMetrics> = [
      "tvlUSD",
      "tvlChange7d",
      "activeAddresses24h",
      "txCount24h",
      "txCount24hChange",
      "holdersCount",
      "holdersTop10Pct",
      "marketCapDominance",
      "fdv",
      "githubCommits30d",
    ];
    const hasAny = meaningfulKeys.some((k) => merged[k] !== undefined);
    if (!hasAny) return null;

    return merged;
  } catch (err) {
    console.error("[onchain-metrics] aggregator error:", err);
    return null;
  }
}

/**
 * Fetch des métriques on-chain pour une crypto (cache 1h, tag "onchain").
 * Ne throw jamais. Retourne null si aucune source disponible.
 */
export const fetchOnChainMetrics = unstable_cache(
  async (coingeckoId: string) => _fetchOnChainMetrics(coingeckoId),
  ["onchain-metrics-v1"],
  { revalidate: 3600, tags: ["onchain"] },
);
