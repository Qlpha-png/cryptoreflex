/**
 * lib/stablecoin-yields.ts — Comparateur APY stablecoins (USDC / USDT / EURC)
 *
 * KILLER FEATURE 2026-05-02 (audit innovation expert) — répond à la question
 * #1 du débutant FR : "Où placer ma trésorerie en stable ?"
 *
 * Données : APY observés (avril 2026) sur les plateformes régulées MiCA + 2-3
 * acteurs internationaux référence. Mises à jour MANUELLEMENT (vs scraping
 * automatique) pour rester sous le seuil "comparateur d'investissements
 * réglementés AMF" qui exigerait un statut CIF — le scraping live pousserait
 * au-delà du purement éditorial.
 *
 * Refresh cadence : édité hebdo via PR. Le composant `<StablecoinYieldsTable>`
 * affiche `lastUpdated` pour transparence.
 *
 * Pourquoi pas live ? Trade Republic / Crypto.com / Binance Earn ne publient
 * pas leurs APY via API publique stable. Les afficher à la milliseconde près
 * créerait un faux signal de précision dans un produit volatile par nature
 * (les APY varient au jour le jour selon utilization rate).
 */

export interface StablecoinYield {
  /** Identifiant plateforme (matche `lib/platforms.ts:Platform.id` quand applicable). */
  platformId: string;
  /** Nom affiché. */
  platformName: string;
  /** Régulation en France/UE : "MiCA" | "PSAN" | "Hors UE". */
  regulation: "MiCA" | "PSAN" | "Hors UE";
  /** Stablecoin proposé. */
  stablecoin: "USDC" | "USDT" | "EURC" | "DAI";
  /** APY net observé (post-frais plateforme, hors fiscalité). */
  apyMin: number;
  /** Maximum de l'APY (range si applicable, sinon = apyMin). */
  apyMax: number;
  /** Lock-up minimum en jours (0 = liquide instant). */
  lockUpDays: number;
  /** Type de produit : "Earn" (centralisé) / "DeFi" / "Staking" / "Liquidity". */
  productType: "Earn" | "DeFi" | "Staking" | "Liquidity";
  /** Risque (1 = très faible / 5 = très élevé). */
  risk: 1 | 2 | 3 | 4 | 5;
  /** Notes éditoriales (max 100 chars). */
  notes?: string;
  /** Lien d'inscription (affiliation si applicable). */
  url: string;
  /** True si lien d'affiliation (affichage transparence). */
  isAffiliate?: boolean;
}

/**
 * Données YIELD avril 2026.
 *
 * Sources :
 *  - Sites officiels des plateformes (sections Earn / Yield / Stake)
 *  - Vérification croisée DefiLlama pour les yields DeFi
 *  - Test live avec compte de tracking interne (montant 100€)
 *
 * À NE PAS interpréter comme un conseil en investissement (cf. AMF).
 */
export const STABLECOIN_YIELDS: StablecoinYield[] = [
  // === Centralized Earn (CeFi) ===
  {
    platformId: "bitpanda",
    platformName: "Bitpanda",
    regulation: "MiCA",
    stablecoin: "USDC",
    apyMin: 4.5,
    apyMax: 4.5,
    lockUpDays: 0,
    productType: "Earn",
    risk: 2,
    notes: "Liquide, capé à 25k€ par stablecoin. APY fixe.",
    url: "https://www.bitpanda.com/fr",
    isAffiliate: true,
  },
  {
    platformId: "bitpanda",
    platformName: "Bitpanda",
    regulation: "MiCA",
    stablecoin: "USDT",
    apyMin: 4.0,
    apyMax: 4.0,
    lockUpDays: 0,
    productType: "Earn",
    risk: 2,
    url: "https://www.bitpanda.com/fr",
    isAffiliate: true,
  },
  {
    platformId: "bitpanda",
    platformName: "Bitpanda",
    regulation: "MiCA",
    stablecoin: "EURC",
    apyMin: 3.2,
    apyMax: 3.2,
    lockUpDays: 0,
    productType: "Earn",
    risk: 2,
    notes: "EURC = stablecoin EUR émis par Circle, conforme MiCA.",
    url: "https://www.bitpanda.com/fr",
    isAffiliate: true,
  },
  {
    platformId: "coinbase",
    platformName: "Coinbase",
    regulation: "MiCA",
    stablecoin: "USDC",
    apyMin: 4.1,
    apyMax: 4.1,
    lockUpDays: 0,
    productType: "Earn",
    risk: 2,
    notes: "USDC Rewards. Coinbase = émetteur (via Circle).",
    url: "https://www.coinbase.com/fr",
    isAffiliate: true,
  },
  {
    platformId: "kraken",
    platformName: "Kraken",
    regulation: "MiCA",
    stablecoin: "USDC",
    apyMin: 4.5,
    apyMax: 5.5,
    lockUpDays: 0,
    productType: "Earn",
    risk: 2,
    notes: "Tier-based : 25k$ first @ 5.5%, au-delà 4.5%.",
    url: "https://www.kraken.com/fr-fr",
    isAffiliate: true,
  },
  {
    platformId: "kraken",
    platformName: "Kraken",
    regulation: "MiCA",
    stablecoin: "USDT",
    apyMin: 5.0,
    apyMax: 5.0,
    lockUpDays: 0,
    productType: "Earn",
    risk: 2,
    url: "https://www.kraken.com/fr-fr",
    isAffiliate: true,
  },
  {
    platformId: "binance",
    platformName: "Binance Earn",
    regulation: "MiCA",
    stablecoin: "USDC",
    apyMin: 4.0,
    apyMax: 9.5,
    lockUpDays: 0,
    productType: "Earn",
    risk: 3,
    notes: "Flexible 4 % / Locked 30j 9.5 %. APY variable.",
    url: "https://www.binance.com/fr/earn",
    isAffiliate: true,
  },
  {
    platformId: "binance",
    platformName: "Binance Earn",
    regulation: "MiCA",
    stablecoin: "USDT",
    apyMin: 4.5,
    apyMax: 11.0,
    lockUpDays: 0,
    productType: "Earn",
    risk: 3,
    url: "https://www.binance.com/fr/earn",
    isAffiliate: true,
  },
  {
    platformId: "swissborg",
    platformName: "SwissBorg",
    regulation: "MiCA",
    stablecoin: "USDC",
    apyMin: 5.0,
    apyMax: 8.0,
    lockUpDays: 0,
    productType: "Earn",
    risk: 3,
    notes: "Smart Yield — APY tier selon plan Premium.",
    url: "https://swissborg.com/fr",
    isAffiliate: true,
  },
  {
    platformId: "swissborg",
    platformName: "SwissBorg",
    regulation: "MiCA",
    stablecoin: "EURC",
    apyMin: 3.5,
    apyMax: 5.0,
    lockUpDays: 0,
    productType: "Earn",
    risk: 3,
    url: "https://swissborg.com/fr",
    isAffiliate: true,
  },

  // === DeFi (référence — non-MiCA) ===
  {
    platformId: "aave",
    platformName: "Aave V3 (DeFi)",
    regulation: "Hors UE",
    stablecoin: "USDC",
    apyMin: 3.8,
    apyMax: 6.2,
    lockUpDays: 0,
    productType: "DeFi",
    risk: 4,
    notes: "Smart contract risk. Variable selon utilization. EthMainnet.",
    url: "https://app.aave.com/",
  },
  {
    platformId: "aave",
    platformName: "Aave V3 (DeFi)",
    regulation: "Hors UE",
    stablecoin: "DAI",
    apyMin: 4.0,
    apyMax: 7.5,
    lockUpDays: 0,
    productType: "DeFi",
    risk: 4,
    url: "https://app.aave.com/",
  },
  {
    platformId: "compound",
    platformName: "Compound V3",
    regulation: "Hors UE",
    stablecoin: "USDC",
    apyMin: 3.5,
    apyMax: 5.5,
    lockUpDays: 0,
    productType: "DeFi",
    risk: 4,
    url: "https://app.compound.finance/",
  },
];

/** Date de dernière vérification (à bump à chaque édition manuelle). */
export const STABLECOIN_YIELDS_LAST_UPDATED = "2026-05-02";

/**
 * Filtre + tri pour le composant table : récupère les yields d'un stablecoin
 * donné triés par APY desc (meilleur en haut). Si `regulation` est précisé,
 * limite aux plateformes répondant au critère (ex: "MiCA" only pour FR).
 */
export function getYieldsFor(
  stablecoin: StablecoinYield["stablecoin"],
  options: { regulationOnly?: StablecoinYield["regulation"][] } = {},
): StablecoinYield[] {
  const filtered = STABLECOIN_YIELDS.filter((y) => {
    if (y.stablecoin !== stablecoin) return false;
    if (options.regulationOnly && !options.regulationOnly.includes(y.regulation)) {
      return false;
    }
    return true;
  });
  // Tri par APY max descendant (meilleur opportunité en haut), tiebreaker = risk asc
  return filtered.sort((a, b) => {
    if (b.apyMax !== a.apyMax) return b.apyMax - a.apyMax;
    return a.risk - b.risk;
  });
}

/** Liste unique des stablecoins représentés (pour l'UI tabs). */
export function getAvailableStablecoins(): StablecoinYield["stablecoin"][] {
  const set = new Set<StablecoinYield["stablecoin"]>();
  for (const y of STABLECOIN_YIELDS) set.add(y.stablecoin);
  return Array.from(set);
}
