/**
 * lib/crypto-logos.ts — Source de vérité pour les URLs de logos crypto.
 *
 * Stratégie :
 *  - On hardcode les URLs CoinGecko CDN (stables, jamais renommées) pour les
 *    cryptos qu'on cite éditorialement (top 10 + hidden gems + cryptos
 *    fréquemment mentionnées dans whereToBuy / portfolios).
 *  - Si une crypto n'a pas d'URL ici, le composant <CryptoLogo /> tombera
 *    proprement sur un placeholder gradient + initiales (UX dégradée mais
 *    pas cassée).
 *  - Toutes les URLs sont déjà whitelistées dans next.config.js (assets.coingecko.com).
 *
 * Format CoinGecko : `https://assets.coingecko.com/coins/images/{id}/large/{filename}.png`
 * Le `id` numérique est interne CoinGecko et stable (= identifiant primary key).
 */

/* -------------------------------------------------------------------------- */
/*  CoinGecko ID → URL logo (large 256×256)                                   */
/* -------------------------------------------------------------------------- */

export const CRYPTO_LOGOS: Record<string, string> = {
  bitcoin: "https://assets.coingecko.com/coins/images/1/large/bitcoin.png",
  ethereum: "https://assets.coingecko.com/coins/images/279/large/ethereum.png",
  tether: "https://assets.coingecko.com/coins/images/325/large/Tether.png",
  ripple: "https://assets.coingecko.com/coins/images/44/large/xrp-symbol-white-128.png",
  binancecoin: "https://assets.coingecko.com/coins/images/825/large/bnb-icon2_2x.png",
  solana: "https://assets.coingecko.com/coins/images/4128/large/solana.png",
  "usd-coin": "https://assets.coingecko.com/coins/images/6319/large/usdc.png",
  // Bug UX 26-04 — l'utilisateur a remonté que le logo CoinGecko de Cardano
  // (PNG bleu avec motif "vague") ressemble à un globe terrestre à petite taille
  // (~32-40 px en card). On bascule sur cryptologos.cc qui sert le SVG officiel
  // IOHK avec un meilleur contraste / lisibilité. CDN déjà whitelisté dans
  // next.config.js (img-src + remotePatterns).
  cardano: "https://cryptologos.cc/logos/cardano-ada-logo.svg",
  dogecoin: "https://assets.coingecko.com/coins/images/5/large/dogecoin.png",
  tron: "https://assets.coingecko.com/coins/images/1094/large/tron-logo.png",
  "avalanche-2": "https://assets.coingecko.com/coins/images/12559/large/Avalanche_Circle_RedWhite_Trans.png",
  chainlink: "https://assets.coingecko.com/coins/images/877/large/chainlink-new-logo.png",
  polkadot: "https://assets.coingecko.com/coins/images/12171/large/polkadot.png",
  "matic-network": "https://assets.coingecko.com/coins/images/4713/large/polygon.png",
  "shiba-inu": "https://assets.coingecko.com/coins/images/11939/large/shiba.png",
  "the-open-network": "https://assets.coingecko.com/coins/images/17980/large/ton_symbol.png",
  litecoin: "https://assets.coingecko.com/coins/images/2/large/litecoin.png",
  "bitcoin-cash": "https://assets.coingecko.com/coins/images/780/large/bitcoin-cash-circle.png",
  uniswap: "https://assets.coingecko.com/coins/images/12504/large/uniswap-logo.png",
  stellar: "https://assets.coingecko.com/coins/images/100/large/Stellar_symbol_black_RGB.png",
  monero: "https://assets.coingecko.com/coins/images/69/large/monero_logo.png",
  "ethereum-classic": "https://assets.coingecko.com/coins/images/453/large/ethereum-classic-logo.png",
  cosmos: "https://assets.coingecko.com/coins/images/1481/large/cosmos_hub.png",
  filecoin: "https://assets.coingecko.com/coins/images/12817/large/filecoin.png",
  near: "https://assets.coingecko.com/coins/images/10365/large/near.jpg",
  "hedera-hashgraph": "https://assets.coingecko.com/coins/images/3688/large/hbar.png",
  "internet-computer": "https://assets.coingecko.com/coins/images/14495/large/Internet_Computer_logo.png",
  arbitrum: "https://assets.coingecko.com/coins/images/16547/large/arb.jpg",
  optimism: "https://assets.coingecko.com/coins/images/25244/large/Optimism.png",
  vechain: "https://assets.coingecko.com/coins/images/1167/large/VET_Token_Icon.png",
  algorand: "https://assets.coingecko.com/coins/images/4380/large/download.png",
  pepe: "https://assets.coingecko.com/coins/images/29850/large/pepe-token.jpeg",
  bonk: "https://assets.coingecko.com/coins/images/28600/large/bonk.jpg",
  "render-token": "https://assets.coingecko.com/coins/images/11636/large/rndr.png",
  "injective-protocol": "https://assets.coingecko.com/coins/images/12882/large/Secondary_Symbol.png",
  "immutable-x": "https://assets.coingecko.com/coins/images/17233/large/immutableX-symbol-BLK-RGB.png",
  "the-graph": "https://assets.coingecko.com/coins/images/13397/large/Graph_Token.png",
  fantom: "https://assets.coingecko.com/coins/images/4001/large/Fantom_round.png",
  aave: "https://assets.coingecko.com/coins/images/12645/large/aave-token-round.png",
  maker: "https://assets.coingecko.com/coins/images/1364/large/Mark_Maker.png",
  // Hidden gems & altcoins fréquemment cités
  sui: "https://assets.coingecko.com/coins/images/26375/large/sui-ocean-square.png",
  aptos: "https://assets.coingecko.com/coins/images/26455/large/aptos_round.png",
  sei: "https://assets.coingecko.com/coins/images/28205/large/Sei_Logo_-_Transparent.png",
  celestia: "https://assets.coingecko.com/coins/images/31967/large/tia.jpg",
  "kaspa": "https://assets.coingecko.com/coins/images/25751/large/kaspa-icon-exchanges.png",
  "starknet": "https://assets.coingecko.com/coins/images/26433/large/starknet.png",
  "worldcoin-wld": "https://assets.coingecko.com/coins/images/31069/large/worldcoin.jpeg",
  "dydx-chain": "https://assets.coingecko.com/coins/images/32594/large/dydx.png",
  "mantle": "https://assets.coingecko.com/coins/images/30980/large/Mantle-Logo-mark.png",
};

/* -------------------------------------------------------------------------- */
/*  Symbol → CoinGecko id (résolution depuis un ticker)                       */
/* -------------------------------------------------------------------------- */

export const SYMBOL_TO_COINGECKO_ID: Record<string, string> = {
  BTC: "bitcoin",
  ETH: "ethereum",
  USDT: "tether",
  XRP: "ripple",
  BNB: "binancecoin",
  SOL: "solana",
  USDC: "usd-coin",
  ADA: "cardano",
  DOGE: "dogecoin",
  TRX: "tron",
  AVAX: "avalanche-2",
  LINK: "chainlink",
  DOT: "polkadot",
  MATIC: "matic-network",
  SHIB: "shiba-inu",
  TON: "the-open-network",
  LTC: "litecoin",
  BCH: "bitcoin-cash",
  UNI: "uniswap",
  XLM: "stellar",
  XMR: "monero",
  ETC: "ethereum-classic",
  ATOM: "cosmos",
  FIL: "filecoin",
  NEAR: "near",
  HBAR: "hedera-hashgraph",
  ICP: "internet-computer",
  ARB: "arbitrum",
  OP: "optimism",
  VET: "vechain",
  ALGO: "algorand",
  PEPE: "pepe",
  BONK: "bonk",
  RNDR: "render-token",
  INJ: "injective-protocol",
  IMX: "immutable-x",
  GRT: "the-graph",
  FTM: "fantom",
  AAVE: "aave",
  MKR: "maker",
  SUI: "sui",
  APT: "aptos",
  SEI: "sei",
  TIA: "celestia",
  KAS: "kaspa",
  STRK: "starknet",
  WLD: "worldcoin-wld",
  DYDX: "dydx-chain",
  MNT: "mantle",
};

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                   */
/* -------------------------------------------------------------------------- */

/**
 * Renvoie l'URL CoinGecko pour un id donné (ex: "bitcoin", "cardano").
 * Tolérant à la casse et aux espaces parasites.
 */
export function getCryptoLogo(id: string): string | undefined {
  if (!id) return undefined;
  return CRYPTO_LOGOS[id.toLowerCase().trim()];
}

/**
 * Renvoie l'URL CoinGecko à partir d'un symbol/ticker (ex: "BTC", "ada").
 * Résout d'abord symbol → coingeckoId, puis lookup dans CRYPTO_LOGOS.
 */
export function getCryptoLogoFromSymbol(symbol: string): string | undefined {
  if (!symbol) return undefined;
  const id = SYMBOL_TO_COINGECKO_ID[symbol.toUpperCase().trim()];
  return id ? getCryptoLogo(id) : undefined;
}

/**
 * Helper polymorphe : essaie successivement
 *   1. URL explicite (passée par l'appelant — typiquement depuis CoinGecko API)
 *   2. coingeckoId mappé (ex: "cardano" → assets.coingecko.com/...)
 *   3. symbol mappé (ex: "ADA" → coingeckoId → URL)
 * Retourne `undefined` si aucune source ne donne quoi que ce soit (le composant
 * fera alors un fallback initiales).
 */
export function resolveCryptoLogo(opts: {
  imageUrl?: string | null;
  coingeckoId?: string | null;
  symbol?: string | null;
}): string | undefined {
  if (opts.imageUrl) return opts.imageUrl;
  if (opts.coingeckoId) {
    const fromId = getCryptoLogo(opts.coingeckoId);
    if (fromId) return fromId;
  }
  if (opts.symbol) {
    const fromSym = getCryptoLogoFromSymbol(opts.symbol);
    if (fromSym) return fromSym;
  }
  return undefined;
}
