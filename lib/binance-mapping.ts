/**
 * lib/binance-mapping.ts — Mapping coingeckoId ↔ Binance spot symbol.
 *
 * Source de vérité pour la route SSE `/api/prices/stream` (Edge runtime).
 *
 * Stratégie : on mappe vers `<BASE>USDT` (paire spot la plus liquide pour
 * la plupart des cryptos top 100). Quelques exceptions :
 *  - USDT : pas de paire USDT/USDT → exclu (il VAUT 1 USD par déf.).
 *  - USDC : USDCUSDT existe et reste très proche de 1 → inclus pour
 *    cohérence d'affichage.
 *  - Tokens non listés Binance (hidden gems exotiques) → simplement absents
 *    du map → silencieusement drop par la route SSE.
 *
 * Ce module est volontairement isolé de `lib/coingecko.ts` (qui dépend de
 * `next/cache` non Edge-friendly) pour rester importable depuis l'Edge route.
 */

// Note volontaire : on n'importe PAS `COIN_IDS` depuis `lib/historical-prices`
// pour éviter de tirer dans le bundle Edge tout le module (qui contient des
// helpers fetch + `unstable_cache`). On duplique les ids ici (~40 entrées,
// trivial à maintenir, cf. _COIN_ID_REFERENCE plus bas).
//
// Si tu ajoutes une crypto à `lib/historical-prices.COIN_IDS`, ajoute-la
// aussi à `COINGECKO_TO_BINANCE` ci-dessous (sinon elle ne stream pas en SSE,
// elle reste accessible via `/api/prices` REST).

/**
 * Mapping coingeckoId → Binance spot symbol.
 *
 * Couvre :
 *  - DEFAULT_COINS du ticker (top 6).
 *  - COIN_IDS (lib/historical-prices, ~40 cryptos usuelles).
 *  - Top 10 (data/top-cryptos) cohérent.
 *
 * Note : `usd-coin` mappe vers USDCUSDT (même si proche de 1, on récupère
 * un vrai prix Binance plutôt que de hardcoder).
 */
export const COINGECKO_TO_BINANCE: Record<string, string> = {
  bitcoin: "BTCUSDT",
  ethereum: "ETHUSDT",
  solana: "SOLUSDT",
  binancecoin: "BNBUSDT",
  ripple: "XRPUSDT",
  cardano: "ADAUSDT",
  // tether: pas de paire USDT/USDT (par déf. = 1 USD).
  "usd-coin": "USDCUSDT",
  dogecoin: "DOGEUSDT",
  tron: "TRXUSDT",
  "the-open-network": "TONUSDT",
  "matic-network": "POLUSDT", // MATIC a été renamé POL en 2024 sur Binance
  polkadot: "DOTUSDT",
  "avalanche-2": "AVAXUSDT",
  chainlink: "LINKUSDT",
  litecoin: "LTCUSDT",
  "shiba-inu": "SHIBUSDT",
  "bitcoin-cash": "BCHUSDT",
  near: "NEARUSDT",
  uniswap: "UNIUSDT",
  aptos: "APTUSDT",
  "internet-computer": "ICPUSDT",
  "ethereum-classic": "ETCUSDT",
  cosmos: "ATOMUSDT",
  stellar: "XLMUSDT",
  arbitrum: "ARBUSDT",
  optimism: "OPUSDT",
  sui: "SUIUSDT",
  "hedera-hashgraph": "HBARUSDT",
  filecoin: "FILUSDT",
  aave: "AAVEUSDT",
  maker: "MKRUSDT",
  "lido-dao": "LDOUSDT",
  pepe: "PEPEUSDT",
  dogwifcoin: "WIFUSDT",
  monero: "XMRUSDT",
  algorand: "ALGOUSDT",
  tezos: "XTZUSDT",
  "injective-protocol": "INJUSDT",
  celestia: "TIAUSDT",
  starknet: "STRKUSDT",
};

/**
 * Référence des coingeckoId attendus depuis `lib/historical-prices.COIN_IDS`.
 * Tenu à jour manuellement (cf. note d'import en tête de fichier). Tout id
 * listé ici ET absent de `COINGECKO_TO_BINANCE` = silencieusement non-streamé.
 *
 * `tether` est volontairement absent (pas de paire USDT/USDT côté Binance).
 */
const _COIN_ID_REFERENCE = [
  "bitcoin",
  "ethereum",
  "solana",
  "binancecoin",
  "ripple",
  "cardano",
  "tether",
  "usd-coin",
  "dogecoin",
  "tron",
  "the-open-network",
  "matic-network",
  "polkadot",
  "avalanche-2",
  "chainlink",
  "litecoin",
  "shiba-inu",
  "bitcoin-cash",
  "near",
  "uniswap",
  "aptos",
  "internet-computer",
  "ethereum-classic",
  "cosmos",
  "stellar",
  "arbitrum",
  "optimism",
  "sui",
  "hedera-hashgraph",
  "filecoin",
  "aave",
  "maker",
  "lido-dao",
  "pepe",
  "dogwifcoin",
  "monero",
  "algorand",
  "tezos",
  "injective-protocol",
  "celestia",
  "starknet",
] as const;
// On référence pour empêcher tree-shake du tableau (et garder la doc visible).
export type _KnownCoinId = (typeof _COIN_ID_REFERENCE)[number];

/** Index inverse : Binance symbol → coingeckoId (utilisé par la route SSE). */
export const BINANCE_TO_COINGECKO: Record<string, string> = Object.fromEntries(
  Object.entries(COINGECKO_TO_BINANCE).map(([cg, bn]) => [bn, cg]),
);

/**
 * Whitelist des coingeckoId acceptés par `/api/prices/stream`. On accepte
 * uniquement ce qui a un mapping Binance — les autres ids (hidden gems
 * non listées, fiats…) doivent retomber sur `/api/prices` REST classique.
 */
export const ALLOWED_PRICE_STREAM_IDS: ReadonlySet<string> = new Set(
  Object.keys(COINGECKO_TO_BINANCE),
);
