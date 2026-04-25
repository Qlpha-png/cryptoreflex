/**
 * Historical price helpers — CoinGecko market_chart endpoint.
 *
 * Utilisé par :
 *   - DcaSimulator (backtest 1-5 ans)
 *   - Converter (taux temps réel + freshness timestamp)
 *
 * Cache : unstable_cache (App Router) → 1 h, evict tag "coingecko-historical".
 * Fallback : tableau vide pour ne jamais casser le rendu si l'API rate-limit.
 */

import { unstable_cache } from "next/cache";

const COINGECKO_BASE = "https://api.coingecko.com/api/v3";

/**
 * Mapping symbole → CoinGecko id.
 * 40 cryptos couvrant : top 20 marketcap + L2/L1 émergents + memecoins + DeFi.
 * Cohérent avec `lib/programmatic.ts:ALL_CRYPTOS` pour le maillage interne.
 */
export const COIN_IDS: Record<string, string> = {
  // Top 10 marketcap
  btc: "bitcoin",
  eth: "ethereum",
  sol: "solana",
  bnb: "binancecoin",
  xrp: "ripple",
  ada: "cardano",
  usdt: "tether",
  usdc: "usd-coin",
  doge: "dogecoin",
  trx: "tron",
  // Top 11-25
  ton: "the-open-network",
  matic: "matic-network",
  dot: "polkadot",
  avax: "avalanche-2",
  link: "chainlink",
  ltc: "litecoin",
  shib: "shiba-inu",
  bch: "bitcoin-cash",
  near: "near",
  uni: "uniswap",
  apt: "aptos",
  icp: "internet-computer",
  etc: "ethereum-classic",
  atom: "cosmos",
  xlm: "stellar",
  // L2 + nouveaux
  arb: "arbitrum",
  op: "optimism",
  sui: "sui",
  hbar: "hedera-hashgraph",
  fil: "filecoin",
  // DeFi blue chips
  aave: "aave",
  mkr: "maker",
  ldo: "lido-dao",
  // Memecoins (volume FR fort)
  pepe: "pepe",
  wif: "dogwifcoin",
  // Privacy / autres
  xmr: "monero",
  algo: "algorand",
  xtz: "tezos",
  // Emerging
  inj: "injective-protocol",
  tia: "celestia",
  strk: "starknet",
};

/**
 * Fiats supportés. EUR + USD historique ; ajout 2026 GBP/CHF pour SEO Suisse / UK.
 * On reste minimal pour ne pas exploser les combinaisons (40 × 5 fiats = trop).
 */
export const FIAT_CODES = ["eur", "usd", "gbp", "chf"] as const;
export type FiatCode = (typeof FIAT_CODES)[number];

export const CRYPTO_SYMBOLS = Object.keys(COIN_IDS);

/** Symbole → libellé long pour SEO/UI. */
export const COIN_NAMES: Record<string, string> = {
  btc: "Bitcoin",
  eth: "Ethereum",
  sol: "Solana",
  bnb: "BNB",
  xrp: "XRP",
  ada: "Cardano",
  usdt: "Tether",
  usdc: "USD Coin",
  doge: "Dogecoin",
  trx: "TRON",
  ton: "Toncoin",
  matic: "Polygon",
  dot: "Polkadot",
  avax: "Avalanche",
  link: "Chainlink",
  ltc: "Litecoin",
  shib: "Shiba Inu",
  bch: "Bitcoin Cash",
  near: "NEAR Protocol",
  uni: "Uniswap",
  apt: "Aptos",
  icp: "Internet Computer",
  etc: "Ethereum Classic",
  atom: "Cosmos",
  xlm: "Stellar",
  arb: "Arbitrum",
  op: "Optimism",
  sui: "Sui",
  hbar: "Hedera",
  fil: "Filecoin",
  aave: "Aave",
  mkr: "Maker",
  ldo: "Lido DAO",
  pepe: "Pepe",
  wif: "dogwifhat",
  xmr: "Monero",
  algo: "Algorand",
  xtz: "Tezos",
  inj: "Injective",
  tia: "Celestia",
  strk: "Starknet",
  eur: "Euro",
  usd: "Dollar US",
  gbp: "Livre sterling",
  chf: "Franc suisse",
};

/* -------------------------------------------------------------------------- */
/*  Historical prices (DCA backtest)                                          */
/* -------------------------------------------------------------------------- */

export interface HistoricalPoint {
  /** timestamp en ms */
  t: number;
  /** prix en EUR */
  price: number;
}

/**
 * Récupère N jours d'historique (close quotidien) en EUR pour un coinId CoinGecko.
 * `days` peut aller jusqu'à 1825 (5 ans) sur le free tier — au-delà CoinGecko renvoie 401.
 */
async function _fetchHistoricalPrices(
  coinId: string,
  days: number
): Promise<HistoricalPoint[]> {
  const url = `${COINGECKO_BASE}/coins/${coinId}/market_chart?vs_currency=eur&days=${days}&interval=daily`;
  try {
    const res = await fetch(url, {
      headers: { accept: "application/json" },
      // unstable_cache gère la couche externe ; on coupe le cache fetch interne.
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`CoinGecko ${coinId} ${days}d → ${res.status}`);
    const json = (await res.json()) as { prices: [number, number][] };
    return (json.prices ?? []).map(([t, price]) => ({ t, price }));
  } catch (err) {
    console.warn("[historical-prices] fetch failed:", err);
    return [];
  }
}

/**
 * Wrapper caché 1 h — clé = coinId + days.
 * Tag "coingecko-historical" pour invalidation manuelle si besoin.
 */
export const fetchHistoricalPrices = unstable_cache(
  _fetchHistoricalPrices,
  ["coingecko-historical"],
  { revalidate: 3600, tags: ["coingecko-historical"] }
);

/* -------------------------------------------------------------------------- */
/*  Conversion temps réel (Converter)                                         */
/* -------------------------------------------------------------------------- */

export interface SimplePrice {
  /** prix de 1 unité de `from` exprimé dans `to` */
  rate: number;
  /** ISO timestamp dernière maj côté CoinGecko */
  lastUpdated: string;
}

/**
 * Renvoie le taux 1 `from` → `to`, où `from`/`to` peuvent être crypto OU fiat (eur/usd).
 *
 * Stratégie :
 *   - si les deux sont fiat → 1:1 (cas extrême non utilisé en UI)
 *   - si l'un est fiat → /simple/price direct
 *   - cross-crypto → on calcule via EUR (USD aussi possible)
 *
 * Cache 60 s (les conversions doivent rester fraîches).
 */
async function _fetchConversionRate(
  from: string,
  to: string
): Promise<SimplePrice | null> {
  const fromLower = from.toLowerCase();
  const toLower = to.toLowerCase();

  // Identité
  if (fromLower === toLower) {
    return { rate: 1, lastUpdated: new Date().toISOString() };
  }

  const isFiat = (s: string) => (FIAT_CODES as readonly string[]).includes(s);

  // Helper pour /simple/price
  const fetchSimple = async (
    ids: string[],
    vs: string
  ): Promise<Record<string, { [k: string]: number; last_updated_at: number }> | null> => {
    const url = `${COINGECKO_BASE}/simple/price?ids=${ids.join(
      ","
    )}&vs_currencies=${vs}&include_last_updated_at=true`;
    try {
      const res = await fetch(url, {
        headers: { accept: "application/json" },
        cache: "no-store",
      });
      if (!res.ok) throw new Error(`simple/price ${res.status}`);
      return (await res.json()) as any;
    } catch (err) {
      console.warn("[historical-prices] simple/price failed:", err);
      return null;
    }
  };

  try {
    // Crypto → Fiat
    if (!isFiat(fromLower) && isFiat(toLower)) {
      const id = COIN_IDS[fromLower];
      if (!id) return null;
      const json = await fetchSimple([id], toLower);
      const point = json?.[id];
      if (!point) return null;
      return {
        rate: point[toLower],
        lastUpdated: new Date((point.last_updated_at ?? Date.now() / 1000) * 1000).toISOString(),
      };
    }

    // Fiat → Crypto (inverse du précédent)
    if (isFiat(fromLower) && !isFiat(toLower)) {
      const id = COIN_IDS[toLower];
      if (!id) return null;
      const json = await fetchSimple([id], fromLower);
      const point = json?.[id];
      if (!point || !point[fromLower]) return null;
      return {
        rate: 1 / point[fromLower],
        lastUpdated: new Date((point.last_updated_at ?? Date.now() / 1000) * 1000).toISOString(),
      };
    }

    // Cross-crypto → on passe par EUR
    if (!isFiat(fromLower) && !isFiat(toLower)) {
      const idFrom = COIN_IDS[fromLower];
      const idTo = COIN_IDS[toLower];
      if (!idFrom || !idTo) return null;
      const json = await fetchSimple([idFrom, idTo], "eur");
      const a = json?.[idFrom];
      const b = json?.[idTo];
      if (!a || !b || !b.eur) return null;
      const ts = Math.max(a.last_updated_at ?? 0, b.last_updated_at ?? 0) || Date.now() / 1000;
      return {
        rate: a.eur / b.eur,
        lastUpdated: new Date(ts * 1000).toISOString(),
      };
    }

    // Fiat → Fiat (rare ; on renvoie null pour forcer EUR/USD via API dédiée éventuelle)
    return { rate: 1, lastUpdated: new Date().toISOString() };
  } catch (err) {
    console.warn("[historical-prices] rate failed:", err);
    return null;
  }
}

export const fetchConversionRate = unstable_cache(
  _fetchConversionRate,
  ["coingecko-rate"],
  { revalidate: 60, tags: ["coingecko-rate"] }
);

/* -------------------------------------------------------------------------- */
/*  Top 30 paires SEO programmatic                                            */
/* -------------------------------------------------------------------------- */

/**
 * Liste programmatique 200 paires SEO — extension du convertisseur.
 *
 * Stratégie de coverage :
 *  1. Toutes les cryptos majeures → EUR (intent FR principal)
 *  2. Top 25 cryptos → USD (intent international)
 *  3. EUR/GBP/CHF/USD → top 5 cryptos (intent achat depuis fiat)
 *  4. Cross-crypto majeures (BTC↔X, ETH↔X, USDT↔X)
 *  5. Memecoins/L2 spécifiques (volume long-tail FR)
 *
 * Construction algorithmique pour éviter les erreurs de saisie + faciliter
 * l'extension (ajouter une crypto à `COIN_IDS` propage automatiquement).
 */

// 1. Toutes les cryptos vers EUR (40 paires)
const _CRYPTO_TO_EUR: Array<{ from: string; to: string }> = Object.keys(COIN_IDS).map(
  (sym) => ({ from: sym, to: "eur" })
);

// 2. Top 25 cryptos vers USD (25 paires)
const _TOP_25_SYMBOLS = [
  "btc", "eth", "sol", "bnb", "xrp", "ada", "usdt", "usdc", "doge", "trx",
  "ton", "matic", "dot", "avax", "link", "ltc", "shib", "bch", "near", "uni",
  "apt", "atom", "arb", "op", "sui",
];
const _CRYPTO_TO_USD: Array<{ from: string; to: string }> = _TOP_25_SYMBOLS.map((sym) => ({
  from: sym,
  to: "usd",
}));

// 3. Fiat → Crypto top 8 (intent "acheter X avec EUR/GBP/CHF") — 32 paires
const _FIAT_TO_CRYPTO_TOP = ["btc", "eth", "sol", "xrp", "ada", "doge", "bnb", "dot"];
const _FIAT_TO_CRYPTO: Array<{ from: string; to: string }> = ([
  "eur",
  "usd",
  "gbp",
  "chf",
] as const).flatMap((fiat) =>
  _FIAT_TO_CRYPTO_TOP.map((c) => ({ from: fiat, to: c }))
);

// 4. Cross-crypto BTC↔X (top 15 vs BTC) — 30 paires
const _BTC_PAIRS_TARGETS = [
  "eth", "sol", "bnb", "xrp", "ada", "doge", "matic", "dot", "avax", "link",
  "ltc", "trx", "atom", "uni", "near",
];
const _BTC_PAIRS: Array<{ from: string; to: string }> = _BTC_PAIRS_TARGETS.flatMap((c) => [
  { from: "btc", to: c },
  { from: c, to: "btc" },
]);

// 5. ETH↔X (top 10) — 20 paires
const _ETH_PAIRS_TARGETS = [
  "sol", "matic", "avax", "link", "uni", "arb", "op", "atom", "near", "doge",
];
const _ETH_PAIRS: Array<{ from: string; to: string }> = _ETH_PAIRS_TARGETS.flatMap((c) => [
  { from: "eth", to: c },
  { from: c, to: "eth" },
]);

// 6. USDT pairs (10 paires) — intent stablecoin trading
const _USDT_PAIRS_TARGETS = ["btc", "eth", "sol", "bnb", "xrp", "doge", "matic", "avax", "link", "shib"];
const _USDT_PAIRS: Array<{ from: string; to: string }> = _USDT_PAIRS_TARGETS.map((c) => ({
  from: c,
  to: "usdt",
}));

// 7. Fiat-to-fiat (1 paire emblématique)
const _FIAT_TO_FIAT: Array<{ from: string; to: string }> = [
  { from: "eur", to: "usd" },
  { from: "usd", to: "eur" },
];

// Concaténation + déduplication finale (clé = `${from}-${to}`)
const _ALL_PAIRS: Array<{ from: string; to: string }> = [
  ..._CRYPTO_TO_EUR,
  ..._CRYPTO_TO_USD,
  ..._FIAT_TO_CRYPTO,
  ..._BTC_PAIRS,
  ..._ETH_PAIRS,
  ..._USDT_PAIRS,
  ..._FIAT_TO_FIAT,
];

const _seen = new Set<string>();
export const TOP_PAIRS: Array<{ from: string; to: string }> = _ALL_PAIRS.filter((p) => {
  const key = `${p.from}-${p.to}`;
  if (_seen.has(key)) return false;
  if (p.from === p.to) return false; // pas de paire identique
  _seen.add(key);
  return true;
});

/**
 * Total : ~159 paires uniques (selon dédoublonnage).
 * Toutes pré-rendues au build via `app/convertisseur/[pair]/generateStaticParams`,
 * tous indexées dans `app/sitemap.ts`.
 */
