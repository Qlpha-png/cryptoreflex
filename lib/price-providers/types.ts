/**
 * lib/price-providers/types.ts — Contrat Provider Pattern.
 *
 * Phase 2 Architecture (audit regle des 3 cycle 4 — apres validation
 * DexScreener Source #5 le 2026-05-08).
 *
 * OBJECTIF : structure extensible pour accueillir un jour TOUTES les
 * cryptos existantes. Au lieu d'une cascade hardcodee dans
 * price-source.ts, chaque source = 1 module qui implemente PriceProvider.
 * La cascade itere un registry trie par priorite.
 *
 * AJOUTER UNE NOUVELLE SOURCE :
 *   1. Cree lib/price-providers/foo.ts implementant PriceProvider
 *   2. Importe + push dans lib/price-providers/index.ts PROVIDERS array
 *   3. Done — la cascade et les types se mettent a jour automatiquement.
 *
 * CRYPTO META : permet a chaque provider de decider s'il peut handler ce
 * coin (ex: DexScreener acceptera tous les coins avec un onchain contract,
 * Binance acceptera ceux dans COINGECKO_TO_BINANCE, etc.).
 */

/**
 * Metadonnees d'une crypto au moment du fetch — issue de DATA_META_LOOKUP
 * (data/top-cryptos.json + hidden-gems.json) + extensions futures.
 */
export interface CryptoMeta {
  /** Notre slug interne = coingeckoId pour compat. */
  coingeckoId: string;
  /** Symbol canonique uppercase (apres applySymbolOverride). */
  symbol: string;
  /** Nom humain. */
  name: string;
  /**
   * Mapping multi-chain pour les sources onchain (DexScreener, Uniswap,
   * etc.). Key = chainId (ethereum/bsc/solana/...), value = contract addr.
   * Optionnel : si absent, DexScreener fait un search par symbol.
   * Phase 3 : alimente depuis data JSON enrichi.
   */
  chains?: Record<string, string>;
  /** Rank market cap (optionnel, pour heuristics futures). */
  rank?: number;
}

/**
 * Snapshot de prix retourne par un provider — sous-set de PriceSnapshot
 * (price-source.ts) car le market cap + sparkline sont calcules en aval
 * a partir de STATIC_FALLBACK supply pour rester coherent cross-providers.
 */
export interface ProviderPriceData {
  priceUsd: number;
  change24h: number;
  /** Volume 24h USD. 0 si non dispo. */
  volume24h: number;
  /** Sparkline 7d horaire — uniquement Binance. Vide ailleurs. */
  sparkline7d?: number[];
  /** Source-specific metadata (debug, audit). */
  meta?: Record<string, unknown>;
}

/**
 * Identifiant de source — chaque provider expose son name pour le
 * champ PriceSnapshot.source (visible debug + frontend bandeau).
 */
export type PriceProviderName =
  | "binance"
  | "kraken"
  | "coinbase"
  | "kucoin"
  | "dexscreener"
  | "cryptocompare"
  | "coingecko"
  | "static";

/**
 * Contrat qu'implemente chaque provider.
 *
 * priority : ordre d'invocation dans la cascade (plus petit = essaye en
 * premier). Convention : Binance=10, Kraken=20, Coinbase=30, KuCoin=40,
 * DexScreener=50, CryptoCompare=60, CoinGecko=70, Static=99.
 *
 * canHandle : skip-rapide pour eviter un fetch inutile. Ex: KrakenProvider
 * peut retourner false si symbol n'est pas dans son mapping interne.
 *
 * fetch : retourne null si pas de prix valide → cascade continue. Throw
 * uniquement en cas de bug critique (laisser remonter pour debug Sentry).
 */
export interface PriceProvider {
  readonly name: PriceProviderName;
  readonly priority: number;
  canHandle(meta: CryptoMeta): boolean;
  fetch(meta: CryptoMeta): Promise<ProviderPriceData | null>;
}
