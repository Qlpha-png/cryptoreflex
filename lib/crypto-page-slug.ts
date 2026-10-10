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

/**
 * Fiches EN BASE rattachées à un nouvel identifiant CoinGecko en gardant leur URL publique (colonne slug ≠ coingecko_id).
 * telcoin-2 : nouveau jeton Telcoin (TEL) ; « telcoin » est devenu « Telcoin [OLD] » chez CoinGecko (10/10/2026).
 * Miroir de FICHES_CG_TO_SLUG dans lib/seo-redirects.cjs (308) ; tests/lib/seo-redirects.test.ts vérifie l'égalité.
 */
export const FICHES_CG_TO_SLUG: Readonly<Record<string, string>> = {
  "telcoin-2": "telcoin",
};

/** Id éditorial (ou slug d'une fiche en base) si `idOrCoingeckoId` est un coingeckoId à URL différente, sinon inchangé. */
export function toCryptoPageSlug(idOrCoingeckoId: string): string {
  return EDITORIAL_CG_TO_ID[idOrCoingeckoId] ?? FICHES_CG_TO_SLUG[idOrCoingeckoId] ?? idOrCoingeckoId;
}

/** Chemin canonique de la fiche : `/cryptos/<slug>`. */
export function cryptoPagePath(idOrCoingeckoId: string): string {
  return `/cryptos/${toCryptoPageSlug(idOrCoingeckoId)}`;
}
