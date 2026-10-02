/**
 * lib/historique-prix.ts — source unique du cluster /historique-prix.
 *
 *  - HIST_YEARS : années servies par /historique-prix/[crypto]/[annee]
 *    (generateStaticParams, sitemap, hub). Miroir de HIST_YEARS dans
 *    lib/seo-redirects.cjs (redirection /historique-prix/<id> → dernière année),
 *    égalité vérifiée par tests/lib/seo-redirects.test.ts.
 *  - HIST_HUB_CRYPTOS : sélection éditoriale du hub /historique-prix, en ids
 *    ÉDITORIAUX (ceux qu'accepte la route détail). Avant 2026-10-02 le hub liait
 *    des ids CoinGecko (binancecoin, ripple, avalanche-2…) → 81 liens en 404.
 */

import { getCryptoBySlug, type AnyCrypto } from "@/lib/cryptos";

export const HIST_YEARS = ["2018", "2019", "2020", "2021", "2022", "2023", "2024", "2025", "2026"] as const;
export type HistYear = (typeof HIST_YEARS)[number];

/** Dernière année servie (cible de /historique-prix/<id>). */
export const HIST_LATEST_YEAR: HistYear = HIST_YEARS[HIST_YEARS.length - 1];

/** Année mise en avant sur le hub (dernière année civile complète). */
export const HIST_FEATURED_YEAR: HistYear = "2025";

export function isHistYear(y: string): y is HistYear {
  return (HIST_YEARS as readonly string[]).includes(y);
}

/** Années où la crypto existait (les années antérieures sont noindex côté page). */
export function getHistYearsFor(c: Pick<AnyCrypto, "yearCreated">): HistYear[] {
  return HIST_YEARS.filter((y) => Number(y) >= c.yearCreated);
}

export interface HistHubEntry {
  /** Id éditorial (data/top-cryptos.json, data/hidden-gems.json). */
  id: string;
  tagline: string;
}

/**
 * Sélection du hub (ordre = affichage). Ethereum Classic retiré : pas de fiche
 * éditoriale, donc pas de page /historique-prix/ethereum-classic/<année>.
 */
const HUB_SELECTION: HistHubEntry[] = [
  { id: "bitcoin", tagline: "L'actif crypto historique, réserve de valeur numérique" },
  { id: "ethereum", tagline: "Smart contracts, DeFi, NFT — n°2 mondial" },
  { id: "bnb", tagline: "Token de l'écosystème Binance + BNB Chain" },
  { id: "xrp", tagline: "Paiements transfrontaliers, partenariats banques" },
  { id: "solana", tagline: "L1 ultra-rapide, écosystème DeFi et NFT" },
  { id: "cardano", tagline: "PoS académique, gouvernance décentralisée" },
  { id: "dogecoin", tagline: "Le memecoin originel, paiements P2P" },
  { id: "tron", tagline: "Blockchain content + USDT majoritairement émis ici" },
  { id: "avalanche", tagline: "L1 sub-second finality, subnets enterprise" },
  { id: "chainlink", tagline: "Oracles décentralisés, RWA tokenization" },
  { id: "polkadot", tagline: "Multi-chain interoperability, parachains" },
  { id: "polygon", tagline: "Layer 2 Ethereum, zkEVM" },
  { id: "litecoin", tagline: "Argent digital, transactions rapides BTC-like" },
  { id: "shiba-inu", tagline: "Memecoin avec écosystème Shibarium L2" },
  { id: "uniswap", tagline: "DEX leader, AMM automatisé sur Ethereum" },
  { id: "near-protocol", tagline: "Sharding natif, AI on-chain" },
  { id: "internet-computer", tagline: "Web hébergé en blockchain (DFINITY)" },
  { id: "cosmos", tagline: "Internet of blockchains, IBC interopérabilité" },
  { id: "stellar", tagline: "Paiements transfrontaliers low-cost, banques émergentes" },
  { id: "bitcoin-cash", tagline: "Hard fork Bitcoin 2017, blocs plus larges" },
  { id: "filecoin", tagline: "Stockage décentralisé IPFS-incentivé" },
  { id: "aptos", tagline: "L1 Move-based ex-Meta Diem" },
  { id: "monero", tagline: "Cryptomonnaie privacy par défaut, ring signatures" },
  { id: "toncoin", tagline: "Blockchain Telegram, mass-market wallet" },
  { id: "tezos", tagline: "On-chain governance, NFT artistique français" },
  { id: "algorand", tagline: "Pure PoS, finality 4s, RWA institutional" },
  { id: "hedera", tagline: "Hashgraph DAG, governance Council Fortune 500" },
  { id: "aave", tagline: "Money market DeFi leader, V3 multi-chain" },
  { id: "sky-maker", tagline: "Émetteur DAI, gouvernance protocole RWA" },
];

/** Entrées du hub résolues (les ids sans fiche éditoriale sont écartés). */
export function getHistHubCryptos(): Array<HistHubEntry & { crypto: AnyCrypto }> {
  return HUB_SELECTION.flatMap((e) => {
    const crypto = getCryptoBySlug(e.id);
    return crypto ? [{ ...e, crypto }] : [];
  });
}

/** Ids bruts de la sélection (pour les tests). */
export const HIST_HUB_IDS: readonly string[] = HUB_SELECTION.map((e) => e.id);
