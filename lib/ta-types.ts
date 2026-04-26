/**
 * lib/ta-types.ts — Types partagés pour la section Analyses Techniques.
 *
 * Source unique pour :
 *   - lib/technical-analysis.ts (calculs purs)
 *   - lib/ta-article-generator.ts (génération MDX)
 *   - app/analyses-techniques/* (pages)
 *   - components/ta/* (UI)
 *   - app/api/cron/generate-ta (cron quotidien)
 *
 * Convention : aucun import runtime ici (types only) pour rester
 * gratuit en bundle (élidé au compile).
 */

/* -------------------------------------------------------------------------- */
/*  Tendance                                                                  */
/* -------------------------------------------------------------------------- */

/** Direction macro déduite des moyennes mobiles + slope. */
export type Trend = "bullish" | "bearish" | "neutral";

/** Libellés FR pour l'UI (badges, intros d'articles). */
export const TREND_LABEL_FR: Record<Trend, string> = {
  bullish: "Haussier",
  bearish: "Baissier",
  neutral: "Neutre",
};

/* -------------------------------------------------------------------------- */
/*  Indicateurs techniques                                                    */
/* -------------------------------------------------------------------------- */

/** Sortie du MACD : ligne MACD, ligne signal, histogramme (MACD-signal). */
export interface MACDValue {
  macd: number;
  signal: number;
  histogram: number;
}

/** Bandes de Bollinger (haute, médiane=MA, basse). */
export interface BollingerValue {
  upper: number;
  middle: number;
  lower: number;
}

/**
 * Bloc d'indicateurs courants utilisés dans toutes les analyses.
 * Les nombres sont arrondis côté générateur (4 décimales max) pour la lisibilité.
 */
export interface Indicators {
  /** Relative Strength Index (Wilder's smoothing) ∈ [0,100]. */
  rsi: number;
  /** Moyenne mobile simple 50 périodes. */
  ma50: number;
  /** Moyenne mobile simple 200 périodes. */
  ma200: number;
  /** EMA 12 (composant rapide du MACD). */
  ema12: number;
  /** EMA 26 (composant lent du MACD). */
  ema26: number;
  /** MACD complet (line + signal + histogram). */
  macd: MACDValue;
  /** Bandes de Bollinger 20-période, k=2. */
  bollinger: BollingerValue;
}

/* -------------------------------------------------------------------------- */
/*  Niveaux clés (supports / résistances)                                     */
/* -------------------------------------------------------------------------- */

/** Liste de prix supports + résistances détectés par pivots highs/lows. */
export interface Levels {
  /** Triés du plus proche du prix actuel au plus éloigné (en bas). */
  supports: number[];
  /** Triés du plus proche du prix actuel au plus éloigné (en haut). */
  resistances: number[];
}

/* -------------------------------------------------------------------------- */
/*  Données complètes pour générer un article                                 */
/* -------------------------------------------------------------------------- */

/**
 * Snapshot d'une crypto à un instant T, suffisant pour générer un article TA.
 *
 * `volatility` est exprimée en pourcentage annualisé (ex: 65.4 = 65.4%/an).
 * `change24h` est en pourcentage signé (ex: -2.34).
 */
export interface TAData {
  /** Symbole UPPERCASE (BTC, ETH…). */
  symbol: string;
  /** Nom long (Bitcoin, Ethereum…). */
  name: string;
  /** Slug `/cryptos/[slug]` correspondant (lien interne). */
  slug: string;
  /** Prix actuel en USD. */
  price: number;
  /** Variation 24h en pourcentage (signé). */
  change24h: number;
  /** Volume 24h en USD (peut être 0 si non dispo). */
  volume24h?: number;
  /** Bloc d'indicateurs calculés. */
  indicators: Indicators;
  /** Tendance macro déduite. */
  trend: Trend;
  /** Supports/résistances. */
  levels: Levels;
  /** Volatilité annualisée (%). */
  volatility: number;
  /** Image / logo (chemin /logos/btc.svg ou URL CoinGecko). */
  image?: string;
}

/* -------------------------------------------------------------------------- */
/*  Frontmatter d'un article TA (subset normalisé)                            */
/* -------------------------------------------------------------------------- */

/**
 * Frontmatter YAML écrit en haut des fichiers `content/analyses-tech/*.mdx`.
 * Tous les champs sont des chaînes pour rester safe-YAML (pas de
 * sérialisation d'objet — on transporte les données via le body MDX).
 */
export interface TAFrontmatter {
  title: string;
  description: string;
  /** ISO date YYYY-MM-DD. */
  date: string;
  /** Symbole UPPERCASE. */
  symbol: string;
  /** Nom long. */
  name: string;
  /** Slug crypto pour CTA "Voir la fiche". */
  cryptoSlug: string;
  /** Coingecko ID (utile pour le PriceChart). */
  coingeckoId: string;
  /** Prix actuel arrondi (USD). */
  currentPrice: number;
  /** Tendance déduite. */
  trend: Trend;
  /** RSI arrondi 1 décimale. */
  rsi: number;
  /** Variation 24h en %. */
  change24h: number;
  /** Volatilité annualisée %. */
  volatility: number;
  /** Image / logo (chemin local OU URL). */
  image?: string;
}

/**
 * Article TA complet (frontmatter + body MDX + slug fichier).
 *
 * Note : on persiste aussi `indicators` et `levels` dans le frontmatter via
 * la propriété `payload` ci-dessous, pour pouvoir rendre les composants
 * visuels (<IndicatorsTable />, <SupportResistanceList />) sans recalculer.
 */
export interface TAArticle {
  frontmatter: TAFrontmatter;
  body: string;
  /** Slug fichier sans extension : YYYY-MM-DD-symbol-analyse-technique. */
  slug: string;
  /** Payload complet stocké en YAML pour la page détail. */
  payload: TAPayload;
}

/** Payload sérialisé en frontmatter pour les composants visuels. */
export interface TAPayload {
  indicators: Indicators;
  levels: Levels;
}

/* -------------------------------------------------------------------------- */
/*  Cron : top 5 cryptos couvertes                                            */
/* -------------------------------------------------------------------------- */

/**
 * Top 5 cryptos couvertes par les analyses techniques quotidiennes.
 * Cohérent avec `lib/coingecko.ts:DEFAULT_COINS` (BNB exclu — pas de mass-market FR).
 */
export interface TACryptoMeta {
  symbol: string;
  name: string;
  /** Slug `/cryptos/[id]`. */
  slug: string;
  /** Coingecko id pour fetch prices. */
  coingeckoId: string;
  /** Image locale dans /public/logos/ ou fallback string vide. */
  image: string;
}

/**
 * Liste des cryptos pour analyses techniques quotidiennes.
 *
 * Audit 26/04/2026 (user request "50 cryptos catalogue dynamique vraie source de
 * savoir") : étendu de 12 -> 50 cryptos couvrant le top 50 market cap.
 *
 * Catégorisation :
 *  - Layer 1 majeurs : BTC, ETH, BNB, SOL, ADA, AVAX, DOT, NEAR, ATOM, etc.
 *  - Stablecoins : USDT, USDC, DAI
 *  - DeFi blue chips : UNI, AAVE, MKR, LDO, COMP, CRV
 *  - Memecoins : DOGE, SHIB, PEPE
 *  - Layer 2 / scaling : MATIC, ARB, OP, IMX, MNT
 *  - Wrapped : WBTC
 *  - Forks : LTC, BCH, ETC
 *  - Storage / oracles / infra : FIL, LINK, GRT, AR
 *  - Web3 / gaming : SAND, AXS, FLOW, MANA
 *  - Privacy : XMR, ZEC
 *  - Asia-prominent : TON, KAS, RUNE, OKB, CRO
 *
 * Notes techniques :
 *  - coingeckoId = id officiel API CoinGecko (ne pas inventer, vérifier sur api.coingecko.com)
 *  - logos : si SVG absent dans /public/logos/, CryptoLogo fallback gradient gold
 *  - cron generate-ta peut échantillonner (10/jour rotation) si quota CG limité
 *  - filtres AnalysesIndexClient sont DYNAMIQUES depuis articles présents,
 *    affichent uniquement les symbols qui ont au moins 1 analyse générée
 */
export const TA_CRYPTOS: TACryptoMeta[] = [
  // Top 10 market cap
  { symbol: "BTC", name: "Bitcoin", slug: "bitcoin", coingeckoId: "bitcoin", image: "/logos/bitcoin.svg" },
  { symbol: "ETH", name: "Ethereum", slug: "ethereum", coingeckoId: "ethereum", image: "/logos/ethereum.svg" },
  { symbol: "USDT", name: "Tether", slug: "tether", coingeckoId: "tether", image: "/logos/tether.svg" },
  { symbol: "BNB", name: "BNB", slug: "bnb", coingeckoId: "binancecoin", image: "/logos/bnb.svg" },
  { symbol: "SOL", name: "Solana", slug: "solana", coingeckoId: "solana", image: "/logos/solana.svg" },
  { symbol: "USDC", name: "USD Coin", slug: "usdc", coingeckoId: "usd-coin", image: "/logos/usdc.svg" },
  { symbol: "XRP", name: "XRP", slug: "xrp", coingeckoId: "ripple", image: "/logos/xrp.svg" },
  { symbol: "ADA", name: "Cardano", slug: "cardano", coingeckoId: "cardano", image: "/logos/cardano.svg" },
  { symbol: "DOGE", name: "Dogecoin", slug: "dogecoin", coingeckoId: "dogecoin", image: "/logos/dogecoin.svg" },
  { symbol: "AVAX", name: "Avalanche", slug: "avalanche", coingeckoId: "avalanche-2", image: "/logos/avalanche.svg" },
  // Top 20
  { symbol: "TRX", name: "TRON", slug: "tron", coingeckoId: "tron", image: "/logos/tron.svg" },
  { symbol: "SHIB", name: "Shiba Inu", slug: "shiba-inu", coingeckoId: "shiba-inu", image: "/logos/shiba-inu.svg" },
  { symbol: "DOT", name: "Polkadot", slug: "polkadot", coingeckoId: "polkadot", image: "/logos/polkadot.svg" },
  { symbol: "TON", name: "Toncoin", slug: "toncoin", coingeckoId: "the-open-network", image: "/logos/toncoin.svg" },
  { symbol: "LINK", name: "Chainlink", slug: "chainlink", coingeckoId: "chainlink", image: "/logos/chainlink.svg" },
  { symbol: "MATIC", name: "Polygon", slug: "polygon", coingeckoId: "matic-network", image: "/logos/polygon.svg" },
  { symbol: "WBTC", name: "Wrapped Bitcoin", slug: "wbtc", coingeckoId: "wrapped-bitcoin", image: "/logos/wbtc.svg" },
  { symbol: "BCH", name: "Bitcoin Cash", slug: "bitcoin-cash", coingeckoId: "bitcoin-cash", image: "/logos/bitcoin-cash.svg" },
  { symbol: "LTC", name: "Litecoin", slug: "litecoin", coingeckoId: "litecoin", image: "/logos/litecoin.svg" },
  { symbol: "UNI", name: "Uniswap", slug: "uniswap", coingeckoId: "uniswap", image: "/logos/uniswap.svg" },
  // Top 30
  { symbol: "DAI", name: "Dai", slug: "dai", coingeckoId: "dai", image: "/logos/dai.svg" },
  { symbol: "XLM", name: "Stellar", slug: "stellar", coingeckoId: "stellar", image: "/logos/stellar.svg" },
  { symbol: "ICP", name: "Internet Computer", slug: "icp", coingeckoId: "internet-computer", image: "/logos/icp.svg" },
  { symbol: "APT", name: "Aptos", slug: "aptos", coingeckoId: "aptos", image: "/logos/aptos.svg" },
  { symbol: "XMR", name: "Monero", slug: "monero", coingeckoId: "monero", image: "/logos/monero.svg" },
  { symbol: "ATOM", name: "Cosmos", slug: "cosmos", coingeckoId: "cosmos", image: "/logos/cosmos.svg" },
  { symbol: "NEAR", name: "NEAR Protocol", slug: "near", coingeckoId: "near", image: "/logos/near.svg" },
  { symbol: "FIL", name: "Filecoin", slug: "filecoin", coingeckoId: "filecoin", image: "/logos/filecoin.svg" },
  { symbol: "ARB", name: "Arbitrum", slug: "arbitrum", coingeckoId: "arbitrum", image: "/logos/arbitrum.svg" },
  { symbol: "ETC", name: "Ethereum Classic", slug: "ethereum-classic", coingeckoId: "ethereum-classic", image: "/logos/etc.svg" },
  // Top 40
  { symbol: "CRO", name: "Cronos", slug: "cronos", coingeckoId: "crypto-com-chain", image: "/logos/cronos.svg" },
  { symbol: "OP", name: "Optimism", slug: "optimism", coingeckoId: "optimism", image: "/logos/optimism.svg" },
  { symbol: "OKB", name: "OKB", slug: "okb", coingeckoId: "okb", image: "/logos/okb.svg" },
  { symbol: "MKR", name: "Maker", slug: "maker", coingeckoId: "maker", image: "/logos/maker.svg" },
  { symbol: "AAVE", name: "Aave", slug: "aave", coingeckoId: "aave", image: "/logos/aave.svg" },
  { symbol: "VET", name: "VeChain", slug: "vechain", coingeckoId: "vechain", image: "/logos/vechain.svg" },
  { symbol: "HBAR", name: "Hedera", slug: "hedera", coingeckoId: "hedera-hashgraph", image: "/logos/hedera.svg" },
  { symbol: "QNT", name: "Quant", slug: "quant", coingeckoId: "quant-network", image: "/logos/quant.svg" },
  { symbol: "GRT", name: "The Graph", slug: "the-graph", coingeckoId: "the-graph", image: "/logos/the-graph.svg" },
  { symbol: "ALGO", name: "Algorand", slug: "algorand", coingeckoId: "algorand", image: "/logos/algorand.svg" },
  // Top 50
  { symbol: "MNT", name: "Mantle", slug: "mantle", coingeckoId: "mantle", image: "/logos/mantle.svg" },
  { symbol: "IMX", name: "Immutable X", slug: "imx", coingeckoId: "immutable-x", image: "/logos/imx.svg" },
  { symbol: "STX", name: "Stacks", slug: "stacks", coingeckoId: "stacks", image: "/logos/stacks.svg" },
  { symbol: "INJ", name: "Injective", slug: "injective", coingeckoId: "injective-protocol", image: "/logos/injective.svg" },
  { symbol: "LDO", name: "Lido DAO", slug: "lido", coingeckoId: "lido-dao", image: "/logos/lido.svg" },
  { symbol: "FTM", name: "Fantom", slug: "fantom", coingeckoId: "fantom", image: "/logos/fantom.svg" },
  { symbol: "SAND", name: "The Sandbox", slug: "sandbox", coingeckoId: "the-sandbox", image: "/logos/sandbox.svg" },
  { symbol: "AXS", name: "Axie Infinity", slug: "axie-infinity", coingeckoId: "axie-infinity", image: "/logos/axs.svg" },
  { symbol: "FLOW", name: "Flow", slug: "flow", coingeckoId: "flow", image: "/logos/flow.svg" },
  { symbol: "RUNE", name: "THORChain", slug: "thorchain", coingeckoId: "thorchain", image: "/logos/thorchain.svg" },
];
