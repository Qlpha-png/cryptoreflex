/**
 * lib/crypto-page-slug.ts — slug d'URL canonique d'une fiche /cryptos/<slug>.
 *
 * 28 fiches éditoriales (data/top-cryptos.json + data/hidden-gems.json) ont un
 * id différent de leur coingeckoId (xrp ↔ ripple, bnb ↔ binancecoin…). La
 * forme /cryptos/<coingeckoId> est redirigée en 308 vers /cryptos/<id>
 * (lib/seo-redirects.cjs) : les liens internes doivent viser directement l'id
 * éditorial — sinon chaque clic / crawl passe par une redirection.
 *
 * Usage : tout lien construit à partir d'un id CoinGecko (MarketCoin.id,
 * watchlist, portefeuille, concurrents LLM…) passe par `cryptoPagePath()`.
 *
 * Map EN DUR (et non dérivée des JSON) : ce module est importé par des Client
 * Components ; importer data/*.json embarquerait ~210 Ko dans le bundle client.
 * tests/lib/seo-redirects.test.ts vérifie qu'elle reste identique à la data.
 */

export const EDITORIAL_CG_TO_ID: Readonly<Record<string, string>> = {
  "avalanche-2": "avalanche",
  "beam-2": "beam",
  binancecoin: "bnb",
  "compound-governance-token": "compound",
  "crypto-com-chain": "cronos",
  "curve-dao-token": "curve-dao",
  dogwifcoin: "dogwifhat",
  "dydx-chain": "dydx",
  havven: "synthetix",
  "hedera-hashgraph": "hedera",
  "immutable-x": "immutable",
  "injective-protocol": "injective",
  io: "io-net",
  "jupiter-exchange-solana": "jupiter",
  "kucoin-shares": "kucoin-token",
  maker: "sky-maker",
  near: "near-protocol",
  "polygon-ecosystem-token": "polygon",
  "power-ledger": "powerledger",
  "render-token": "render",
  ripple: "xrp",
  secret: "secret-network",
  "sei-network": "sei",
  "story-2": "story-protocol",
  "the-open-network": "toncoin",
  "theta-token": "theta-network",
  "virtual-protocol": "virtuals-protocol",
  "worldcoin-wld": "worldcoin",
};

/** Id éditorial si `idOrCoingeckoId` est le coingeckoId d'une fiche éditoriale, sinon inchangé. */
export function toCryptoPageSlug(idOrCoingeckoId: string): string {
  return EDITORIAL_CG_TO_ID[idOrCoingeckoId] ?? idOrCoingeckoId;
}

/** Chemin canonique de la fiche : `/cryptos/<slug>`. */
export function cryptoPagePath(idOrCoingeckoId: string): string {
  return `/cryptos/${toCryptoPageSlug(idOrCoingeckoId)}`;
}
