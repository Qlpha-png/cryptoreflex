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
 * Audit 26/04/2026 (user request "plus de crypto") : étendu de 5 -> 12 cryptos.
 *  - 5 originales : BTC ETH SOL XRP ADA
 *  - 7 nouvelles : BNB DOGE AVAX DOT MATIC LINK TRX
 *
 * Note : les nouveaux logos sont résolus via CryptoLogo (fallback gradient gold
 * + initiales si pas de SVG officiel dans /public/logos/). Pour ajouter un
 * vrai SVG officiel, déposer le fichier dans /public/logos/{symbol-lower}.svg.
 */
export const TA_CRYPTOS: TACryptoMeta[] = [
  { symbol: "BTC", name: "Bitcoin", slug: "bitcoin", coingeckoId: "bitcoin", image: "/logos/bitcoin.svg" },
  { symbol: "ETH", name: "Ethereum", slug: "ethereum", coingeckoId: "ethereum", image: "/logos/ethereum.svg" },
  { symbol: "SOL", name: "Solana", slug: "solana", coingeckoId: "solana", image: "/logos/solana.svg" },
  { symbol: "XRP", name: "XRP", slug: "xrp", coingeckoId: "ripple", image: "/logos/xrp.svg" },
  { symbol: "ADA", name: "Cardano", slug: "cardano", coingeckoId: "cardano", image: "/logos/cardano.svg" },
  { symbol: "BNB", name: "BNB", slug: "bnb", coingeckoId: "binancecoin", image: "/logos/bnb.svg" },
  { symbol: "DOGE", name: "Dogecoin", slug: "dogecoin", coingeckoId: "dogecoin", image: "/logos/dogecoin.svg" },
  { symbol: "AVAX", name: "Avalanche", slug: "avalanche", coingeckoId: "avalanche-2", image: "/logos/avalanche.svg" },
  { symbol: "DOT", name: "Polkadot", slug: "polkadot", coingeckoId: "polkadot", image: "/logos/polkadot.svg" },
  { symbol: "MATIC", name: "Polygon", slug: "polygon", coingeckoId: "matic-network", image: "/logos/polygon.svg" },
  { symbol: "LINK", name: "Chainlink", slug: "chainlink", coingeckoId: "chainlink", image: "/logos/chainlink.svg" },
  { symbol: "TRX", name: "TRON", slug: "tron", coingeckoId: "tron", image: "/logos/tron.svg" },
];
