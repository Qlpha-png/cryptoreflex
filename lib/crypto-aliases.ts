/**
 * Map des aliases coingeckoId → vrai coingeckoId.
 * Utilisé pour résoudre les hallucinations LLM dans les fiches generated.
 * Fix audit 2026-05-09 : 62% des competitors links pointaient vers des IDs morts.
 */
export const COINGECKO_ID_ALIASES: Record<string, string> = {
  // Renommages historiques CoinGecko
  // Polygon : fiche éditoriale « polygon » (POL) ; l'ancien identifiant CoinGecko matic-network y mène.
  "polygon-pos": "polygon",
  lido: "lido-dao",
  render: "render-token",
  "render-network": "render-token",
  usdc: "usd-coin",
  centrifuge: "centrifuge-2",
  // 05/10/2026 : sens corrigé — la fiche Stacks est publiée sous l'identifiant CoinGecko « blockstack » (/cryptos/stacks
  // n'existe pas ; l'ancien alias blockstack → stacks rendait le lien mort).
  stacks: "blockstack",
  "stacks-blockchain": "blockstack",
  "wrapped-bitcoin": "wrapped-bitcoin", // existe mais pas en DB → sera laissé text
  "staked-ether": "staked-ether", // N'existe pas → text only
  // Erreurs courantes LLM
  bnb: "binancecoin",
  matic: "polygon",
  link: "chainlink",
  // relevés par l'audit du 05/10/2026 (« concurrents directs » des fiches IA)
  shib: "shiba-inu",
  usdt: "tether",
  ton: "toncoin",
  "the-open-network": "toncoin",
  "stellar-lumens": "stellar",
  paxg: "pax-gold",
  "paxos-gold": "pax-gold",
  ondo: "ondo-finance",
  "ethena-ena": "ethena",
  "lido-finance": "lido-dao",
  "pendle-finance": "pendle",
  "artificial-superintelligence-alliance": "fetch-ai",
  "matic-network": "polygon",
  // Plus à découvrir au fur et à mesure (un lien n'est rendu que si la fiche existe : lib/crypto-links.ts)
};

/**
 * Liste blacklist : services NON cryptos hallucinés (services centralisés, exchanges traditionnels, etc.)
 * Si competitor.coingeckoId est dans cette liste, ne JAMAIS rendre de lien.
 */
export const NON_CRYPTO_SERVICES = new Set([
  "spotify", "metamask", "phantom", "glassnode-studio", "glassnode",
  "chainalysis", "nansen", "santiment", "dune-analytics", "coinbase", // exchange centralisé non-coin
  "binance-coin", // alias erroné de "binancecoin"
  "kraken", "bitstamp", "bybit",
  "ledger", "trezor",
  "youtube", "twitter", "discord",
]);

export function resolveCoingeckoId(rawId: string): string | null {
  if (!rawId) return null;
  const lower = rawId.toLowerCase().trim();
  if (NON_CRYPTO_SERVICES.has(lower)) return null;
  return COINGECKO_ID_ALIASES[lower] ?? lower;
}
