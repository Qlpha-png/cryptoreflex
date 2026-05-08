/**
 * lib/dexscreener.ts — Source de prix DexScreener (DEX aggregator universel).
 *
 * Pourquoi DexScreener comme Source #5 (avant CryptoCompare/CoinGecko) :
 *  - Couvre TOUTES les cryptos echangees on-chain (ETH, SOL, BSC, Polygon,
 *    Avalanche, Base, Arbitrum, etc.) — donc 500K+ tokens y compris ceux
 *    delisted des CEX (OM/MANTRA, Luna Classic, etc.).
 *  - Public API gratuit illimite, no key requise.
 *  - Geo-OK depuis Hetzner DE (valide via /api/diag-dex le 2026-05-08).
 *  - Architecture pensee scalabilite : un jour pour accueillir TOUTES les
 *    cryptos existantes, on peut ne PAS lister sur CEX et retomber ici.
 *
 * Endpoint : https://api.dexscreener.com/latest/dex/search?q=SYMBOL
 * Filtrage : on garde le pair avec baseToken.symbol EXACTEMENT == symbol
 * cherche, puis on trie par liquidity.usd desc et prend le pair le plus liquide
 * (= prix de marche le plus representatif).
 *
 * Note 24h change : DexScreener expose priceChange.h24 (en %, deja format %).
 * Pas de conversion necessaire (contrairement a KuCoin qui renvoie un ratio).
 */

import { unstable_cache } from "next/cache";

export interface DexScreenerPriceData {
  priceUsd: number;
  change24h: number;
  volume24h: number;
  liquidityUsd: number;
  pairAddress: string;
  chainId: string;
  fetchedAt: string;
}

interface DexScreenerPair {
  chainId?: string;
  dexId?: string;
  pairAddress?: string;
  baseToken?: {
    address?: string;
    name?: string;
    symbol?: string;
  };
  quoteToken?: {
    address?: string;
    symbol?: string;
  };
  priceUsd?: string;
  volume?: { h24?: number };
  priceChange?: { h24?: number };
  liquidity?: { usd?: number };
  /** Market cap calcule par DexScreener (priceUsd * circulating supply). */
  marketCap?: number;
  /** Fully diluted valuation = priceUsd * total supply. */
  fdv?: number;
}

/**
 * FIX 2026-05-08 cycle 5 — heuristic anti-fake pair (wash trading,
 * liquidity gonflee artificiellement). Audit OM/MANTRA a montre que
 * DexScreener tri par liquidity desc tombe sur des pairs Solana avec
 * "liquidity $5.9B" alors que le mcap total = $52M. Ces pairs sont :
 *  - Soit du wash trading (volume artificiel)
 *  - Soit des pairs avec tokens locked (liquidity factice non tradee)
 *
 * Trois signaux convergents = pair fake :
 *  1. liquidity > marketCap × 2  (un pair ne peut pas avoir > 2x le mcap)
 *  2. volume24h < liquidity / 1000 (locked, pas de trading reel)
 *  3. liquidity > $100M ET volume < $100k (cap absolu)
 *
 * Si UN des 3 critere est viole → pair rejetee. Approche conservatrice :
 * mieux vaut perdre un pair legit que retourner un prix fake.
 */
function _isPairTrustworthy(pair: DexScreenerPair): boolean {
  const liq = pair.liquidity?.usd ?? 0;
  const vol24 = pair.volume?.h24 ?? 0;
  const mcap = pair.marketCap ?? pair.fdv ?? 0;

  // Critere #1 : liquidity vs marketCap (le plus fort signal anti-fake)
  if (mcap > 0 && liq > mcap * 2) {
    return false;
  }

  // Critere #2 : ratio volume / liquidity (pair locked sans trading)
  if (liq > 10_000 && vol24 < liq / 1000) {
    return false;
  }

  // Critere #3 : cap absolu liquidity sans volume proportionnel
  if (liq > 100_000_000 && vol24 < 100_000) {
    return false;
  }

  return true;
}

interface DexScreenerSearchResponse {
  schemaVersion?: string;
  pairs?: DexScreenerPair[];
}

/**
 * Cherche un token sur DexScreener via /search?q=SYMBOL et retourne
 * le pair le plus liquide dont baseToken.symbol === symbol.
 *
 * Filtrage strict pour eviter les false positives :
 *  - baseToken.symbol doit matcher exactement (case-insensitive)
 *  - priceUsd > 0
 *  - liquidity.usd >= 1000 (skip les pairs rugpulled / dust)
 *
 * Retourne null si aucun pair valide trouve (le caller cascade sur la
 * source suivante).
 */
async function _fetchDexScreenerPrice(
  symbol: string,
): Promise<DexScreenerPriceData | null> {
  const sym = symbol.toUpperCase().trim();
  if (!sym) return null;

  try {
    const url = `https://api.dexscreener.com/latest/dex/search?q=${encodeURIComponent(sym)}`;
    const res = await fetch(url, {
      signal: AbortSignal.timeout(6000),
      headers: {
        Accept: "application/json",
        "User-Agent": "cryptoreflex-aggregator/1.0",
      },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as DexScreenerSearchResponse;
    if (!data.pairs || data.pairs.length === 0) return null;

    // FILTRAGE STRICT — baseToken.symbol matche exactement le symbol
    // recherche. Sans ca on chope des "MANTRADAO", "MAN", "OMG", etc.
    // Ajout cycle 5 : _isPairTrustworthy rejette les pairs wash-traded
    // (audit OM/MANTRA : pairs Solana $5.9B liquidity sur mcap $52M).
    const matching = data.pairs.filter((p) => {
      const baseSym = p.baseToken?.symbol?.toUpperCase().trim();
      const price = parseFloat(p.priceUsd ?? "0");
      const liq = p.liquidity?.usd ?? 0;
      return (
        baseSym === sym && price > 0 && liq >= 1000 && _isPairTrustworthy(p)
      );
    });

    if (matching.length === 0) return null;

    // TRI PAR LIQUIDITY DESC — le pair le plus liquide = prix le plus
    // representatif (moins de slippage, plus de volume reel).
    matching.sort((a, b) => (b.liquidity?.usd ?? 0) - (a.liquidity?.usd ?? 0));
    const best = matching[0];

    const priceUsd = parseFloat(best.priceUsd ?? "0");
    if (!Number.isFinite(priceUsd) || priceUsd <= 0) return null;

    return {
      priceUsd,
      change24h: best.priceChange?.h24 ?? 0,
      volume24h: best.volume?.h24 ?? 0,
      liquidityUsd: best.liquidity?.usd ?? 0,
      pairAddress: best.pairAddress ?? "",
      chainId: best.chainId ?? "unknown",
      fetchedAt: new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

/**
 * Variante : fetch direct par contract address (chain + address).
 * Utile si on veut forcer un pair specifique (ex: OM ERC-20 ancien
 * vs OM Mantra Chain). Pour l'instant on utilise la version search par
 * defaut, mais on expose cette fonction pour Phase 3 (data JSON avec
 * mapping {coingeckoId: {chain, contract}}).
 */
async function _fetchDexScreenerByContract(
  chain: string,
  contractAddress: string,
): Promise<DexScreenerPriceData | null> {
  if (!chain || !contractAddress) return null;
  try {
    const url = `https://api.dexscreener.com/latest/dex/tokens/${contractAddress}`;
    const res = await fetch(url, {
      signal: AbortSignal.timeout(6000),
      headers: {
        Accept: "application/json",
        "User-Agent": "cryptoreflex-aggregator/1.0",
      },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as DexScreenerSearchResponse;
    if (!data.pairs || data.pairs.length === 0) return null;

    // Filtre par chain demande + liquidity >= 1000 + anti-fake.
    const onChain = data.pairs.filter(
      (p) =>
        p.chainId === chain &&
        parseFloat(p.priceUsd ?? "0") > 0 &&
        (p.liquidity?.usd ?? 0) >= 1000 &&
        _isPairTrustworthy(p),
    );
    const fallback =
      onChain.length > 0
        ? onChain
        : data.pairs.filter(
            (p) =>
              parseFloat(p.priceUsd ?? "0") > 0 && _isPairTrustworthy(p),
          );
    if (fallback.length === 0) return null;
    fallback.sort((a, b) => (b.liquidity?.usd ?? 0) - (a.liquidity?.usd ?? 0));
    const best = fallback[0];
    const priceUsd = parseFloat(best.priceUsd ?? "0");
    if (!Number.isFinite(priceUsd) || priceUsd <= 0) return null;
    return {
      priceUsd,
      change24h: best.priceChange?.h24 ?? 0,
      volume24h: best.volume?.h24 ?? 0,
      liquidityUsd: best.liquidity?.usd ?? 0,
      pairAddress: best.pairAddress ?? "",
      chainId: best.chainId ?? chain,
      fetchedAt: new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

// Cache 60s (audit regle des 3 — meme TTL que Kraken/Coinbase/KuCoin pour
// reduire fenetre stuck si DexScreener renvoie 0 transitoire).
export const getDexScreenerPrice = unstable_cache(
  async (symbol: string) => _fetchDexScreenerPrice(symbol),
  ["dexscreener-price-v1"],
  { revalidate: 60, tags: ["price-source", "dexscreener"] },
);

export const getDexScreenerByContract = unstable_cache(
  async (chain: string, contractAddress: string) =>
    _fetchDexScreenerByContract(chain, contractAddress),
  ["dexscreener-contract-v1"],
  { revalidate: 60, tags: ["price-source", "dexscreener"] },
);
