/**
 * lib/data-sources/priorities.ts — TABLE UNIQUE des priorités par type de donnée (06/10/2026).
 *
 * Règle du propriétaire : la meilleure source GRATUITE passe en premier, les autres restent en relais.
 * 08/10/2026 (lot Z2, décisions de Kev) : CoinMarketCap écrit les chiffres (robot R1), Binance reste, Coinbase et KuCoin
 * sortent de la chaîne des cours affichés. Ordre initial issu de l'étude mesurée du 06/10/2026
 * (sources-gratuites.md : couverture des 779 fiches, latence, quotas et droit d'usage lus sur les pages officielles).
 *
 * Pour réordonner une donnée : modifier SEULEMENT la liste ci-dessous. Chaque appelant ne fournit que les
 * sources qu'il sait interroger ; une source listée sans fonction d'appel est simplement ignorée.
 *
 * Sources « pseudo » (pas des API) :
 *  - "exchange"   : la valeur renvoyée par la place de marché qui a donné le prix (variation 24 h, volume d'UNE place,
 *                   variation 7 j calculée sur les klines Binance).
 *  - "estimate"   : capitalisation estimée = offre figée de mai 2026 × prix en direct (lib/price-providers/static.ts).
 *                   Gardée en tout dernier recours pour ne rien changer quand tout est en panne.
 *  - "aggregator" : le top reconstruit par l'agrégateur maison (lib/price-source.ts → getTopMarket + instantanés).
 *  - "top-sum"    : métriques globales recalculées en sommant le top 200.
 */

export type SourceName =
  | "binance"
  | "kraken"
  | "coinbase"
  | "kucoin"
  | "coinmarketcap"
  | "coingecko"
  | "dexscreener"
  | "cryptocompare"
  | "coinpaprika"
  | "alternative-me"
  | "binance-klines"
  | "exchange"
  | "estimate"
  | "aggregator"
  | "top-sum"
  | "static";

export type DataKind =
  | "price"
  | "change1h"
  | "change24h"
  | "change7d"
  | "marketCap"
  | "rank"
  | "supply"
  | "volume24h"
  | "topMarket"
  | "global"
  | "history"
  | "sparkline"
  | "ath"
  | "logo"
  | "fearGreed";

export const DATA_PRIORITIES: Readonly<Record<DataKind, readonly SourceName[]>> = {
  // Prix affichés (08/10/2026, lot Z2, décisions de Kev) : d'abord le relevé CoinMarketCap du robot R1 (KV, top 100,
  // AUCUN appel CMC depuis une page), puis Binance (gardé, comme son flux en direct du navigateur), Kraken, CoinGecko,
  // DexScreener, CryptoCompare (inactif sans clé payante) et le fournisseur statique (aucun prix depuis le 03/10/2026).
  // Coinbase (« usage personnel ») et KuCoin sont retirés de la chaîne des cours affichés.
  price: ["coinmarketcap", "binance", "kraken", "coingecko", "dexscreener", "cryptocompare", "static"],
  // Variations : CMC donne 1 h, 24 h et 7 j dans le même appel (lot de 100 = 1 crédit).
  change1h: ["coinmarketcap", "coingecko"],
  change24h: ["coinmarketcap", "coingecko", "exchange"],
  change7d: ["coinmarketcap", "coingecko", "exchange"],
  // Capitalisation / rang / offre : CMC (quota + licence commerciale), CoinGecko comble les trous (CMC met 0 quand
  // l'offre n'est pas vérifiée ; self_reported_market_cap n'est JAMAIS lu), puis CoinPaprika (fiches détaillées).
  marketCap: ["coinmarketcap", "coingecko", "coinpaprika", "exchange", "estimate", "cryptocompare"],
  rank: ["coinmarketcap", "coingecko", "coinpaprika"],
  supply: ["coinmarketcap", "coingecko", "coinpaprika"],
  // Volume : agrégé (CEX + DEX) plutôt que celui d'une seule place de marché.
  volume24h: ["coinmarketcap", "coingecko", "exchange"],
  // Top N (accueil, /marche, heatmap, screener) : relevé CoinMarketCap du robot R1 (KV), puis CoinGecko, puis agrégateur.
  topMarket: ["coinmarketcap", "coingecko", "aggregator"],
  // Métriques globales : relevé « global-metrics » de CoinMarketCap écrit par R1 (KV, 1 fois par heure), puis
  // CoinGecko /global, puis la somme du top 200. Une seule valeur pour tout le site.
  global: ["coinmarketcap", "coingecko", "top-sum"],
  // Inchangés par ce lot (déjà dans le bon ordre dans leur fichier) — listés ici pour que la table reste complète :
  history: ["binance-klines", "cryptocompare", "coingecko"], // lib/historical-prices.ts
  sparkline: ["binance-klines", "coingecko"], // lib/price-providers/binance.ts puis sparkline_in_7d
  ath: ["coingecko", "coinpaprika"], // lib/coingecko.ts fetchCoinDetail
  logo: ["static"], // URL figées (lib/crypto-logos.ts), aucun appel API par affichage
  // Peur & avidité : alternative.me seul (08/10/2026, lot Z2 : plus de relais CoinMarketCap depuis une page).
  fearGreed: ["alternative-me"],
};

/** Position d'une source pour une donnée (Infinity si absente). */
export function priorityIndex(kind: DataKind, source: SourceName): number {
  const i = DATA_PRIORITIES[kind].indexOf(source);
  return i === -1 ? Number.POSITIVE_INFINITY : i;
}
