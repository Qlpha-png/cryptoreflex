/**
 * Programmatic SEO helpers — Cryptoreflex
 * --------------------------------------
 * Source unique de vérité pour les routes générées dynamiquement :
 *   - /avis/[slug]                       (15 fiches plateformes)
 *   - /comparatif/[slug]                 (50 duels priorisés)
 *   - /cryptos/[slug]                    (50 fiches crypto)
 *   - /cryptos/[slug]/acheter-en-france  (50 guides transactionnels)
 *   - /staking/[slug]                    (20 pages staking)
 *
 * Règles :
 *   - Tout slug est en kebab-case ASCII (compatible URL & Next.js).
 *   - Les listes ci-dessous servent à la fois `generateStaticParams`
 *     ET `app/sitemap.ts`. Pas de duplication ailleurs.
 */

import topCryptosData from "@/data/top-cryptos.json";
import hiddenGemsData from "@/data/hidden-gems.json";
import { getAllPlatforms, type Platform } from "@/lib/platforms";

/* =====================================================================
 * 1. PLATEFORMES — /avis/[slug]
 * =====================================================================
 *
 * Les pages avis utilisent les `id` déjà présents dans data/platforms.json.
 * On expose 15 slugs (les 9 actuels + 6 cibles à ajouter au prochain run
 * éditorial). Les slugs absents de platforms.json font notFound() — c'est
 * voulu, on ne génère pas de pages thin sans data.
 */

export const REVIEW_SLUGS = [
  // Originaux (11)
  "coinbase",
  "binance",
  "bitpanda",
  "kraken",
  "bitget",
  "trade-republic",
  "coinhouse",
  "bitstack",
  "swissborg",
  "bybit",
  "revolut",
  // Hardware wallets (à ajouter dans platforms.json — listés ici pour pipeline)
  "ledger",
  "trezor",
  // FIX 2026-05-02 #13 — extension catalogue (user "trouve autant que possible
  // autorisé en France"). 13 nouvelles plateformes ajoutées via script (vague
  // 1+2). REVIEW_SLUGS étendu pour activer la génération sitemap + page
  // /avis/<slug> automatique. Source de vérité = data/platforms.json.
  "okx",
  "crypto-com",
  "gemini",
  "bitstamp",
  "bitvavo",
  "etoro",
  "paymium",
  "deblock",
  "nexo",
  "moonpay",
  "n26-crypto",
  "21bitcoin",
  "wirex",
  "young-platform",
  "paypal-crypto",
  "bitfinex",
  "bsdex",
  "plus500",
  "anycoin-direct",
  "trading212",
  "stackin",
  "just-mining",
  "feel-mining",
  // legacy
  "n26",
] as const;

export type ReviewSlug = (typeof REVIEW_SLUGS)[number];

/** Renvoie les slugs effectivement publiables (avec data). */
export function getPublishableReviewSlugs(): string[] {
  const ids = new Set(getAllPlatforms().map((p) => p.id));
  return REVIEW_SLUGS.filter((slug) => ids.has(slug));
}

/* =====================================================================
 * 2. COMPARATIFS — /comparatif/[slug]
 * =====================================================================
 *
 * Slug = `${a}-vs-${b}` où a < b alphabétiquement (canonique unique).
 * Les 50 combinaisons listées ici sont issues du keyword research :
 * intent transactionnelle forte (volumes Ahrefs/SEMrush > 100/mo en FR)
 * et/ou opportunité concurrentielle (KD < 25).
 *
 * Note : on n'expose JAMAIS les deux orderings (binance-vs-coinbase ET
 * coinbase-vs-binance). La canonical est l'ordre alphabétique. Si le user
 * arrive sur l'ordre inverse, on peut redirect dans middleware (out of scope).
 */

interface ComparisonSeed {
  /** ids tels qu'ils apparaissent (ou apparaîtront) dans platforms.json */
  a: string;
  b: string;
  /** Volume mensuel estimé FR (Ahrefs, avril 2026) — sert au prioritization */
  monthlyVolumeFr: number;
  /** Difficulté SEO 0-100 — sert au prioritization */
  difficulty: number;
  /** Bucket d'intent — sert au templating */
  bucket: "exchange-vs-exchange" | "broker-vs-broker" | "wallet-vs-wallet" | "exchange-vs-broker" | "fr-vs-international";
}

/** ⚠️ Source : keyword research consolidé Cryptoreflex (avril 2026). */
const RAW_COMPARISONS: ComparisonSeed[] = [
  // ── Top tier : volumes > 1k/mois ──────────────────────────────────
  { a: "binance", b: "coinbase", monthlyVolumeFr: 2400, difficulty: 38, bucket: "exchange-vs-exchange" },
  { a: "binance", b: "kraken", monthlyVolumeFr: 1300, difficulty: 32, bucket: "exchange-vs-exchange" },
  { a: "coinbase", b: "kraken", monthlyVolumeFr: 1100, difficulty: 30, bucket: "exchange-vs-exchange" },
  { a: "binance", b: "bitpanda", monthlyVolumeFr: 880, difficulty: 28, bucket: "exchange-vs-broker" },
  { a: "bitpanda", b: "trade-republic", monthlyVolumeFr: 720, difficulty: 25, bucket: "broker-vs-broker" },
  { a: "ledger", b: "trezor", monthlyVolumeFr: 1900, difficulty: 35, bucket: "wallet-vs-wallet" },
  { a: "binance", b: "bitget", monthlyVolumeFr: 590, difficulty: 22, bucket: "exchange-vs-exchange" },
  { a: "coinbase", b: "trade-republic", monthlyVolumeFr: 480, difficulty: 24, bucket: "exchange-vs-broker" },
  { a: "bitpanda", b: "coinbase", monthlyVolumeFr: 430, difficulty: 26, bucket: "exchange-vs-broker" },
  { a: "coinhouse", b: "bitpanda", monthlyVolumeFr: 320, difficulty: 18, bucket: "fr-vs-international" },

  // ── Mid tier : volumes 100-1000/mois, KD bas ─────────────────────
  { a: "bitstack", b: "coinhouse", monthlyVolumeFr: 290, difficulty: 14, bucket: "fr-vs-international" },
  { a: "bitpanda", b: "bitstack", monthlyVolumeFr: 260, difficulty: 16, bucket: "broker-vs-broker" },
  { a: "kraken", b: "bitpanda", monthlyVolumeFr: 240, difficulty: 22, bucket: "exchange-vs-broker" },
  { a: "binance", b: "swissborg", monthlyVolumeFr: 230, difficulty: 20, bucket: "exchange-vs-broker" },
  { a: "swissborg", b: "trade-republic", monthlyVolumeFr: 210, difficulty: 18, bucket: "broker-vs-broker" },
  { a: "coinhouse", b: "coinbase", monthlyVolumeFr: 200, difficulty: 19, bucket: "fr-vs-international" },
  { a: "bitget", b: "bitpanda", monthlyVolumeFr: 190, difficulty: 17, bucket: "exchange-vs-broker" },
  { a: "kraken", b: "coinhouse", monthlyVolumeFr: 180, difficulty: 16, bucket: "fr-vs-international" },
  { a: "okx", b: "binance", monthlyVolumeFr: 1050, difficulty: 28, bucket: "exchange-vs-exchange" },
  { a: "coinbase", b: "etoro", monthlyVolumeFr: 410, difficulty: 26, bucket: "exchange-vs-broker" },
  { a: "binance", b: "etoro", monthlyVolumeFr: 380, difficulty: 25, bucket: "exchange-vs-broker" },
  { a: "etoro", b: "trade-republic", monthlyVolumeFr: 330, difficulty: 22, bucket: "broker-vs-broker" },
  { a: "revolut", b: "trade-republic", monthlyVolumeFr: 540, difficulty: 28, bucket: "broker-vs-broker" },
  { a: "binance", b: "revolut", monthlyVolumeFr: 470, difficulty: 26, bucket: "exchange-vs-broker" },
  { a: "coinbase", b: "revolut", monthlyVolumeFr: 360, difficulty: 24, bucket: "exchange-vs-broker" },
  { a: "n26", b: "revolut", monthlyVolumeFr: 720, difficulty: 30, bucket: "broker-vs-broker" },
  { a: "bitpanda", b: "revolut", monthlyVolumeFr: 290, difficulty: 22, bucket: "broker-vs-broker" },
  { a: "bitstack", b: "trade-republic", monthlyVolumeFr: 170, difficulty: 14, bucket: "broker-vs-broker" },
  { a: "bitstack", b: "revolut", monthlyVolumeFr: 150, difficulty: 13, bucket: "broker-vs-broker" },
  { a: "bitstack", b: "binance", monthlyVolumeFr: 140, difficulty: 14, bucket: "exchange-vs-broker" },
  { a: "bitstack", b: "coinbase", monthlyVolumeFr: 130, difficulty: 14, bucket: "exchange-vs-broker" },
  { a: "swissborg", b: "bitpanda", monthlyVolumeFr: 200, difficulty: 16, bucket: "broker-vs-broker" },
  { a: "swissborg", b: "coinbase", monthlyVolumeFr: 180, difficulty: 17, bucket: "exchange-vs-broker" },
  { a: "swissborg", b: "kraken", monthlyVolumeFr: 130, difficulty: 15, bucket: "exchange-vs-broker" },
  { a: "kraken", b: "trade-republic", monthlyVolumeFr: 220, difficulty: 20, bucket: "exchange-vs-broker" },
  { a: "bitget", b: "kraken", monthlyVolumeFr: 160, difficulty: 16, bucket: "exchange-vs-exchange" },
  { a: "bitget", b: "okx", monthlyVolumeFr: 380, difficulty: 22, bucket: "exchange-vs-exchange" },
  { a: "binance", b: "trade-republic", monthlyVolumeFr: 510, difficulty: 26, bucket: "exchange-vs-broker" },
  { a: "coinhouse", b: "trade-republic", monthlyVolumeFr: 140, difficulty: 14, bucket: "fr-vs-international" },
  { a: "coinhouse", b: "binance", monthlyVolumeFr: 230, difficulty: 18, bucket: "fr-vs-international" },

  // ── Long tail : volumes 50-150/mois, KD très bas (quick wins) ────
  { a: "bitstack", b: "bitpanda", monthlyVolumeFr: 110, difficulty: 12, bucket: "broker-vs-broker" },
  { a: "bitstack", b: "swissborg", monthlyVolumeFr: 90, difficulty: 11, bucket: "broker-vs-broker" },
  { a: "bitstack", b: "n26", monthlyVolumeFr: 80, difficulty: 10, bucket: "broker-vs-broker" },
  { a: "coinhouse", b: "swissborg", monthlyVolumeFr: 70, difficulty: 11, bucket: "fr-vs-international" },
  { a: "coinhouse", b: "kraken", monthlyVolumeFr: 110, difficulty: 14, bucket: "fr-vs-international" },
  { a: "coinhouse", b: "bitstack", monthlyVolumeFr: 95, difficulty: 12, bucket: "fr-vs-international" },
  { a: "okx", b: "coinbase", monthlyVolumeFr: 320, difficulty: 23, bucket: "exchange-vs-exchange" },
  { a: "okx", b: "kraken", monthlyVolumeFr: 180, difficulty: 19, bucket: "exchange-vs-exchange" },
  { a: "n26", b: "trade-republic", monthlyVolumeFr: 290, difficulty: 22, bucket: "broker-vs-broker" },
  { a: "n26", b: "bitpanda", monthlyVolumeFr: 130, difficulty: 16, bucket: "broker-vs-broker" },
];

export interface ComparisonSpec {
  slug: string;
  a: string;
  b: string;
  monthlyVolumeFr: number;
  difficulty: number;
  bucket: ComparisonSeed["bucket"];
  /** Score = volume / (1 + difficulty/10), pour prioriser le crawl/sitemap */
  priority: number;
}

function canonicalPair(a: string, b: string): [string, string] {
  return a < b ? [a, b] : [b, a];
}

export function buildComparisonSlug(a: string, b: string): string {
  const [x, y] = canonicalPair(a, b);
  return `${x}-vs-${y}`;
}

export function parseComparisonSlug(slug: string): { a: string; b: string } | null {
  const m = slug.match(/^([a-z0-9-]+)-vs-([a-z0-9-]+)$/);
  if (!m) return null;
  const [a, b] = canonicalPair(m[1], m[2]);
  return { a, b };
}

/** Liste canonique, dédupliquée, triée par priorité décroissante. */
export const COMPARISONS: ComparisonSpec[] = (() => {
  const seen = new Set<string>();
  const out: ComparisonSpec[] = [];
  for (const seed of RAW_COMPARISONS) {
    const slug = buildComparisonSlug(seed.a, seed.b);
    if (seen.has(slug)) continue;
    seen.add(slug);
    const [a, b] = canonicalPair(seed.a, seed.b);
    out.push({
      slug,
      a,
      b,
      monthlyVolumeFr: seed.monthlyVolumeFr,
      difficulty: seed.difficulty,
      bucket: seed.bucket,
      priority: Math.round((seed.monthlyVolumeFr / (1 + seed.difficulty / 10)) * 10) / 10,
    });
  }
  return out.sort((x, y) => y.priority - x.priority);
})();

export function getComparison(slug: string): ComparisonSpec | undefined {
  return COMPARISONS.find((c) => c.slug === slug);
}

/** Comparatifs où LES DEUX plateformes existent dans platforms.json. */
export function getPublishableComparisons(): ComparisonSpec[] {
  const ids = new Set(getAllPlatforms().map((p) => p.id));
  return COMPARISONS.filter((c) => ids.has(c.a) && ids.has(c.b));
}

/** Pour une plateforme donnée, suggère N comparatifs pertinents (liens internes). */
export function getRelatedComparisons(platformId: string, limit = 4): ComparisonSpec[] {
  return COMPARISONS.filter((c) => c.a === platformId || c.b === platformId).slice(0, limit);
}

/* =====================================================================
 * 3. CRYPTOS — /cryptos/[slug] et /cryptos/[slug]/acheter-en-france
 * =====================================================================
 *
 * Source : top-cryptos.json (10) + hidden-gems.json (10) + extension de
 * 30 ids supplémentaires alimentés par CoinGecko top-50 (sans data
 * éditoriale propre, on génère un template hybride avec données live).
 */

export interface CryptoMeta {
  id: string;          // slug interne (kebab-case)
  coingeckoId: string; // id CoinGecko
  symbol: string;
  name: string;
  /** Si true, on a du contenu éditorial maison (top-cryptos ou hidden-gems). */
  hasEditorial: boolean;
}

const TOP_CRYPTOS = (topCryptosData as { topCryptos: Array<{ id: string; coingeckoId: string; symbol: string; name: string }> }).topCryptos;
const HIDDEN_GEMS = (hiddenGemsData as { hiddenGems: Array<{ id: string; coingeckoId: string; symbol: string; name: string }> }).hiddenGems;

/** Cryptos additionnelles (top market cap CoinGecko, sans fiche éditoriale). */
const ADDITIONAL_CRYPTOS: Array<{ id: string; coingeckoId: string; symbol: string; name: string }> = [
  { id: "polkadot", coingeckoId: "polkadot", symbol: "DOT", name: "Polkadot" },
  { id: "litecoin", coingeckoId: "litecoin", symbol: "LTC", name: "Litecoin" },
  { id: "uniswap", coingeckoId: "uniswap", symbol: "UNI", name: "Uniswap" },
  { id: "stellar", coingeckoId: "stellar", symbol: "XLM", name: "Stellar" },
  { id: "monero", coingeckoId: "monero", symbol: "XMR", name: "Monero" },
  { id: "bitcoin-cash", coingeckoId: "bitcoin-cash", symbol: "BCH", name: "Bitcoin Cash" },
  { id: "aptos", coingeckoId: "aptos", symbol: "APT", name: "Aptos" },
  { id: "sui", coingeckoId: "sui", symbol: "SUI", name: "Sui" },
  { id: "internet-computer", coingeckoId: "internet-computer", symbol: "ICP", name: "Internet Computer" },
  { id: "cosmos", coingeckoId: "cosmos", symbol: "ATOM", name: "Cosmos" },
  { id: "ethereum-classic", coingeckoId: "ethereum-classic", symbol: "ETC", name: "Ethereum Classic" },
  { id: "polygon", coingeckoId: "matic-network", symbol: "MATIC", name: "Polygon" },
  { id: "vechain", coingeckoId: "vechain", symbol: "VET", name: "VeChain" },
  { id: "algorand", coingeckoId: "algorand", symbol: "ALGO", name: "Algorand" },
  { id: "tezos", coingeckoId: "tezos", symbol: "XTZ", name: "Tezos" },
  { id: "hedera", coingeckoId: "hedera-hashgraph", symbol: "HBAR", name: "Hedera" },
  { id: "fantom", coingeckoId: "fantom", symbol: "FTM", name: "Fantom" },
  { id: "the-sandbox", coingeckoId: "the-sandbox", symbol: "SAND", name: "The Sandbox" },
  { id: "decentraland", coingeckoId: "decentraland", symbol: "MANA", name: "Decentraland" },
  { id: "aave", coingeckoId: "aave", symbol: "AAVE", name: "Aave" },
  { id: "maker", coingeckoId: "maker", symbol: "MKR", name: "Maker" },
  { id: "lido-dao", coingeckoId: "lido-dao", symbol: "LDO", name: "Lido DAO" },
  { id: "optimism", coingeckoId: "optimism", symbol: "OP", name: "Optimism" },
  { id: "starknet", coingeckoId: "starknet", symbol: "STRK", name: "Starknet" },
  { id: "shiba-inu", coingeckoId: "shiba-inu", symbol: "SHIB", name: "Shiba Inu" },
  { id: "pepe", coingeckoId: "pepe", symbol: "PEPE", name: "Pepe" },
  { id: "stacks", coingeckoId: "blockstack", symbol: "STX", name: "Stacks" },
  { id: "kaspa", coingeckoId: "kaspa", symbol: "KAS", name: "Kaspa" },
  { id: "immutable-x", coingeckoId: "immutable-x", symbol: "IMX", name: "Immutable" },
  { id: "worldcoin", coingeckoId: "worldcoin-wld", symbol: "WLD", name: "Worldcoin" },
];

export const ALL_CRYPTOS: CryptoMeta[] = (() => {
  const seen = new Set<string>();
  const list: CryptoMeta[] = [];
  for (const c of TOP_CRYPTOS) {
    if (seen.has(c.id)) continue;
    seen.add(c.id);
    list.push({ id: c.id, coingeckoId: c.coingeckoId, symbol: c.symbol, name: c.name, hasEditorial: true });
  }
  for (const c of HIDDEN_GEMS) {
    if (seen.has(c.id)) continue;
    seen.add(c.id);
    list.push({ id: c.id, coingeckoId: c.coingeckoId, symbol: c.symbol, name: c.name, hasEditorial: true });
  }
  for (const c of ADDITIONAL_CRYPTOS) {
    if (seen.has(c.id)) continue;
    seen.add(c.id);
    list.push({ id: c.id, coingeckoId: c.coingeckoId, symbol: c.symbol, name: c.name, hasEditorial: false });
  }
  return list;
})();

export function getCrypto(id: string): CryptoMeta | undefined {
  return ALL_CRYPTOS.find((c) => c.id === id);
}

/* =====================================================================
 * 4. STAKING — /staking/[slug]
 * =====================================================================
 *
 * Sous-ensemble : seules les cryptos POS où ≥1 plateforme MiCA propose
 * du staking en France. APY estimés ; à recouper avec les UI exchange.
 */

export interface StakingPair {
  cryptoId: string;
  symbol: string;
  name: string;
  /** Range APY net observé sur les exchanges MiCA (avril 2026). */
  apyMin: number;
  apyMax: number;
  /** Lock-up minimum en jours (0 = liquid staking). */
  lockUpDays: number;
  /** Plateformes (id) qui proposent ce staking en FR. */
  availableOn: string[];
  /** Niveau de risque smart contract / slashing (1 faible → 5 élevé). */
  risk: 1 | 2 | 3 | 4 | 5;
}

export const STAKING_PAIRS: StakingPair[] = [
  { cryptoId: "ethereum", symbol: "ETH", name: "Ethereum", apyMin: 2.8, apyMax: 4.5, lockUpDays: 0, availableOn: ["coinbase", "kraken", "bitpanda", "binance", "swissborg"], risk: 2 },
  { cryptoId: "solana", symbol: "SOL", name: "Solana", apyMin: 5.5, apyMax: 7.8, lockUpDays: 2, availableOn: ["coinbase", "kraken", "bitpanda", "binance"], risk: 2 },
  { cryptoId: "cardano", symbol: "ADA", name: "Cardano", apyMin: 2.5, apyMax: 4.0, lockUpDays: 0, availableOn: ["coinbase", "kraken", "bitpanda", "binance"], risk: 1 },
  { cryptoId: "polkadot", symbol: "DOT", name: "Polkadot", apyMin: 10.0, apyMax: 14.0, lockUpDays: 28, availableOn: ["kraken", "bitpanda", "binance"], risk: 3 },
  { cryptoId: "cosmos", symbol: "ATOM", name: "Cosmos", apyMin: 11.0, apyMax: 16.0, lockUpDays: 21, availableOn: ["kraken", "bitpanda", "binance"], risk: 3 },
  { cryptoId: "tezos", symbol: "XTZ", name: "Tezos", apyMin: 4.0, apyMax: 6.0, lockUpDays: 0, availableOn: ["coinbase", "kraken", "bitpanda"], risk: 1 },
  { cryptoId: "polygon", symbol: "MATIC", name: "Polygon", apyMin: 3.5, apyMax: 5.5, lockUpDays: 3, availableOn: ["binance", "bitpanda"], risk: 2 },
  { cryptoId: "avalanche", symbol: "AVAX", name: "Avalanche", apyMin: 6.0, apyMax: 8.5, lockUpDays: 14, availableOn: ["binance", "kraken", "coinbase"], risk: 2 },
  { cryptoId: "near-protocol", symbol: "NEAR", name: "NEAR Protocol", apyMin: 8.0, apyMax: 11.0, lockUpDays: 2, availableOn: ["binance", "bitget"], risk: 3 },
  { cryptoId: "celestia", symbol: "TIA", name: "Celestia", apyMin: 12.0, apyMax: 17.0, lockUpDays: 21, availableOn: ["binance", "bitget", "kraken"], risk: 4 },
  { cryptoId: "injective", symbol: "INJ", name: "Injective", apyMin: 10.0, apyMax: 15.0, lockUpDays: 21, availableOn: ["binance", "bitget"], risk: 4 },
  { cryptoId: "algorand", symbol: "ALGO", name: "Algorand", apyMin: 1.5, apyMax: 3.0, lockUpDays: 0, availableOn: ["kraken", "binance"], risk: 1 },
  { cryptoId: "tron", symbol: "TRX", name: "TRON", apyMin: 4.0, apyMax: 6.5, lockUpDays: 14, availableOn: ["binance", "bitpanda"], risk: 3 },
  { cryptoId: "aptos", symbol: "APT", name: "Aptos", apyMin: 6.5, apyMax: 8.0, lockUpDays: 14, availableOn: ["binance", "coinbase"], risk: 3 },
  { cryptoId: "sui", symbol: "SUI", name: "Sui", apyMin: 4.0, apyMax: 6.0, lockUpDays: 1, availableOn: ["binance", "bitget"], risk: 3 },
  { cryptoId: "internet-computer", symbol: "ICP", name: "Internet Computer", apyMin: 7.0, apyMax: 11.0, lockUpDays: 180, availableOn: ["binance", "coinbase"], risk: 3 },
  { cryptoId: "hedera", symbol: "HBAR", name: "Hedera", apyMin: 3.0, apyMax: 5.0, lockUpDays: 0, availableOn: ["binance", "bitpanda"], risk: 2 },
  { cryptoId: "stacks", symbol: "STX", name: "Stacks", apyMin: 6.0, apyMax: 9.0, lockUpDays: 14, availableOn: ["binance", "okx"], risk: 4 },
  { cryptoId: "lido-dao", symbol: "LDO", name: "Lido DAO", apyMin: 1.5, apyMax: 3.0, lockUpDays: 0, availableOn: ["binance", "kraken"], risk: 3 },
  { cryptoId: "mina-protocol", symbol: "MINA", name: "Mina Protocol", apyMin: 8.0, apyMax: 12.0, lockUpDays: 0, availableOn: ["binance", "kraken"], risk: 3 },
];

export function getStakingPair(cryptoId: string): StakingPair | undefined {
  return STAKING_PAIRS.find((s) => s.cryptoId === cryptoId);
}

/* =====================================================================
 * 5. UTILS PARTAGÉS
 * =====================================================================
 */

/** Slugifier ASCII → kebab-case (utilisé dans les seeds, pas les routes). */
export function slugify(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

/** Plateformes qui supportent une crypto donnée — pour les CTAs croisés. */
export function getPlatformsSelling(cryptoSymbol: string): Platform[] {
  return getAllPlatforms().filter((p) => {
    // Heuristique : si la plateforme stake la crypto, elle la vend.
    if (p.cryptos.stakingCryptos.includes(cryptoSymbol)) return true;
    // Sinon, on regarde top 4 par catalog size (Binance, Bitpanda, Bitget, Coinbase).
    return ["binance", "bitpanda", "bitget", "coinbase", "kraken"].includes(p.id);
  });
}

/** Récupère la plateforme "best for X" parmi un sous-ensemble de critères. */
export function bestPlatformFor(criterion: "fees" | "security" | "ux" | "support" | "mica"): Platform {
  return getAllPlatforms().reduce((best, p) =>
    p.scoring[criterion] > best.scoring[criterion] ? p : best
  );
}

/* =====================================================================
 * 6. INVENTAIRE GLOBAL — utilisé par sitemap.ts
 * =====================================================================
 */

export interface ProgrammaticRoute {
  path: string;
  changeFrequency: "daily" | "weekly" | "monthly";
  priority: number; // 0-1
}

export function getAllProgrammaticRoutes(): ProgrammaticRoute[] {
  const routes: ProgrammaticRoute[] = [];

  for (const slug of getPublishableReviewSlugs()) {
    routes.push({ path: `/avis/${slug}`, changeFrequency: "weekly", priority: 0.85 });
  }

  for (const c of getPublishableComparisons()) {
    routes.push({ path: `/comparatif/${c.slug}`, changeFrequency: "weekly", priority: 0.75 });
  }

  for (const c of ALL_CRYPTOS) {
    // FIX 2026-05-02 (audit 404 user) : la fiche `/cryptos/[slug]` est
    // limitée aux cryptos avec contenu éditorial (top-cryptos.json +
    // hidden-gems.json). Pour les ADDITIONAL_CRYPTOS sans fiche
    // (ethereum-classic, fantom, immutable-x, maker, stacks, vechain…),
    // la route répond `notFound()` → 6×404 dans Search Console depuis
    // que ces cryptos ont été ajoutées au mapping programmatic. On ne
    // pousse plus que les slugs editorial dans le sitemap pour cette
    // route. /cryptos/[slug]/acheter-en-france reste OK pour tous les
    // ALL_CRYPTOS (page guide d'achat n'a pas besoin de fiche détaillée).
    if (c.hasEditorial) {
      routes.push({ path: `/cryptos/${c.id}`, changeFrequency: "daily", priority: 0.7 });
    }
    routes.push({ path: `/cryptos/${c.id}/acheter-en-france`, changeFrequency: "weekly", priority: 0.7 });
  }

  for (const s of STAKING_PAIRS) {
    routes.push({ path: `/staking/${s.cryptoId}`, changeFrequency: "weekly", priority: 0.65 });
  }

  return routes;
}
