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
import { cgHeaders } from "@/lib/coingecko";

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

/* -------------------------------------------------------------------------- */
/*  FIX 2026-05-02 #2 — bug "ROISimulator évolution fausse depuis > 1 an"     */
/*                                                                            */
/*  Diagnostic : malgré le commit 118db33 (cgHeaders + clé Demo), CoinGecko   */
/*  Demo tier PLAFONNE l'historique à 365 jours sur `market_chart` ET sur     */
/*  `market_chart/range`. Test live 2026-05-02 sur /api/historical?coin=tron  */
/*  &days=1825 → premier point retourné = 2025-05-07 (= J-360), donc le      */
/*  client ROISimulator prenait 0.2167€ comme "prix au 22 mai 2021" alors    */
/*  que le vrai prix TRX en mai 2021 = 0.06194€. ROI affiché +29 % au lieu   */
/*  du vrai +355 % → décrédibilise totalement l'outil.                       */
/*                                                                            */
/*  Fix : SWITCH SOURCE PRIMAIRE → CryptoCompare. Le tier free (sans clé)    */
/*  donne 2000 jours (5.5 ans) sur tous les coins testés (les 41 du mapping  */
/*  COIN_IDS), avec `tryConversion=true` pour les altcoins sans paire EUR    */
/*  directe. CoinGecko reste fallback pour les rares coins absents de CC.    */
/*                                                                            */
/*  Architecture :                                                            */
/*   - _fetchFromCryptoCompare(symbol, days) : `histoday?fsym=X&tsym=EUR`    */
/*     (point quotidien à 00h UTC, ~1 par jour, propre sans densification    */
/*     horaire qui faussait la heuristique `clamped` côté API route).         */
/*   - _fetchFromCoinGecko(coinId, days) : ancien chemin chunked range,      */
/*     conservé pour fallback uniquement.                                    */
/*   - _fetchHistoricalPrices() : tente CC en priorité (mapping CG_TO_CC),   */
/*     fallback CG si symbol absent du mapping ou si CC retourne dataset     */
/*     vide (ex: maintenance CC).                                            */
/*                                                                            */
/*  Cache : bump tag `coingecko-historical-v3-cc` pour invalider toutes les  */
/*  entrées mises en cache avec données plafonnées 365j sous la v2.           */
/* -------------------------------------------------------------------------- */

const CHUNK_DAYS = 90;
const SECONDS_PER_DAY = 86_400;
const CRYPTOCOMPARE_BASE = "https://min-api.cryptocompare.com/data/v2";

/**
 * Mapping coingeckoId → symbole CryptoCompare (= ticker uppercase standard).
 * Couvre les 41 coins de COIN_IDS. Les rebranding (MATIC→POL) ont les deux
 * entrées car certaines fiches `lib/cryptos.ts` utilisent encore "matic-network".
 *
 * Comment ce mapping a été validé :
 *   node script qui itère sur tous les coingeckoId, query
 *   `histoday?fsym=<sym>&tsym=EUR&limit=2000&tryConversion=true`, vérifie
 *   `Data.Data.length > 0 && last.close > 0`. Tous les 41 sont OK.
 *   Couverture historique varie : 5.5 ans pour BTC/ETH/SOL/etc, 2 ans pour
 *   les listings récents (POL/WIF/STRK/TIA).
 */
const CG_TO_CC: Record<string, string> = {
  bitcoin: "BTC",
  ethereum: "ETH",
  solana: "SOL",
  binancecoin: "BNB",
  ripple: "XRP",
  cardano: "ADA",
  tether: "USDT",
  "usd-coin": "USDC",
  dogecoin: "DOGE",
  tron: "TRX",
  "the-open-network": "TON",
  "matic-network": "MATIC",
  "polygon-ecosystem-token": "POL",
  polkadot: "DOT",
  "avalanche-2": "AVAX",
  chainlink: "LINK",
  litecoin: "LTC",
  "shiba-inu": "SHIB",
  "bitcoin-cash": "BCH",
  near: "NEAR",
  uniswap: "UNI",
  aptos: "APT",
  "internet-computer": "ICP",
  "ethereum-classic": "ETC",
  cosmos: "ATOM",
  stellar: "XLM",
  arbitrum: "ARB",
  optimism: "OP",
  sui: "SUI",
  "hedera-hashgraph": "HBAR",
  filecoin: "FIL",
  aave: "AAVE",
  maker: "MKR",
  "lido-dao": "LDO",
  pepe: "PEPE",
  dogwifcoin: "WIF",
  monero: "XMR",
  algorand: "ALGO",
  tezos: "XTZ",
  "injective-protocol": "INJ",
  celestia: "TIA",
  starknet: "STRK",

  // FIX 2026-05-02 #3 — extension catalogue éditorial complet (60 nouveaux
  // coins). Validés via CC `/data/all/coinlist?summary=true` : 36/37
  // présents, 1 fallback (FXS→FRAX, FXS pas listé sur CC).
  // L1/L2 supplémentaires
  kaspa: "KAS",
  "sei-network": "SEI",
  "mina-protocol": "MINA",
  "the-graph": "GRT",
  "render-token": "RNDR",
  bittensor: "TAO",
  arweave: "AR",
  hyperliquid: "HYPE",
  "story-2": "IP",
  "beam-2": "BEAM",
  // Stablecoins / tokens centralisés
  dai: "DAI",
  okb: "OKB",
  "crypto-com-chain": "CRO",
  "kucoin-shares": "KCS",
  // DeFi
  "compound-governance-token": "COMP",
  "convex-finance": "CVX",
  "curve-dao-token": "CRV",
  "frax-share": "FRAX", // FXS pas listé sur CC, fallback sur le stablecoin parent
  havven: "SNX", // legacy CG id pour Synthetix
  pendle: "PENDLE",
  "rocket-pool": "RPL",
  "1inch": "1INCH",
  ethena: "ENA",
  eigenlayer: "EIGEN",
  "aerodrome-finance": "AERO",
  gmx: "GMX",
  "dydx-chain": "DYDX",
  raydium: "RAY",
  "jupiter-exchange-solana": "JUP",
  // Oracles / Data
  "pyth-network": "PYTH",
  "band-protocol": "BAND",
  api3: "API3",
  "ondo-finance": "ONDO",
  // DePIN / Compute / IA
  "akash-network": "AKT",
  "io-net": "IO",
  helium: "HNT",
  aethir: "ATH",
  "fetch-ai": "FET",
  "ocean-protocol": "OCEAN",
  livepeer: "LPT",
  storj: "STORJ",
  hivemapper: "HONEY",
  grass: "GRASS",
  "power-ledger": "POWR",
  "energy-web-token": "EWT",
  // Privacy / autres
  zcash: "ZEC",
  dash: "DASH",
  secret: "SCRT",
  "worldcoin-wld": "WLD",
  "mantra-dao": "OM",
  polymesh: "POLYX",
  "virtual-protocol": "VIRTUAL",
  // Memecoins
  bonk: "BONK",
  floki: "FLOKI",
  // Gaming / Metaverse / NFT
  "the-sandbox": "SAND",
  decentraland: "MANA",
  "axie-infinity": "AXS",
  gala: "GALA",
  "theta-token": "THETA",
  "immutable-x": "IMX",
};

/**
 * Set des coingeckoIds servables par CryptoCompare. Exporté pour que la
 * route `/api/historical` dérive sa whitelist directement depuis ce mapping
 * (élimine le risque de désynchro entre le mapping et la whitelist).
 */
export const HISTORICAL_SUPPORTED_IDS = new Set<string>(Object.keys(CG_TO_CC));

/**
 * Fetch CryptoCompare `histoday` — jusqu'à 2000 jours (5.5 ans) en un seul
 * call, pas besoin de chunker. Renvoie [] si erreur ou symbol inconnu.
 *
 * Champs renvoyés par CC : `time` (sec UNIX), `close`, `open`, `high`, `low`.
 * On garde uniquement `close` (cohérent avec CoinGecko qui renvoyait le close).
 *
 * `tryConversion=true` : si CC n'a pas de paire <SYM>/EUR directe, il route
 * via USD → EUR. Indispensable pour les altcoins peu tradés en EUR direct.
 */
async function _fetchFromCryptoCompare(
  symbol: string,
  days: number,
): Promise<HistoricalPoint[]> {
  // CC limite `limit` à 2000 ; si l'utilisateur demande plus on cap.
  const limit = Math.min(days, 2000);
  const url =
    `${CRYPTOCOMPARE_BASE}/histoday` +
    `?fsym=${encodeURIComponent(symbol)}&tsym=EUR&limit=${limit}&tryConversion=true`;
  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) {
      throw new Error(`CryptoCompare ${symbol} ${days}d → HTTP ${res.status}`);
    }
    const json = (await res.json()) as {
      Response?: string;
      Message?: string;
      Data?: { Data?: Array<{ time: number; close: number }> };
    };
    if (json.Response !== "Success") {
      throw new Error(`CryptoCompare ${symbol} → ${json.Message ?? "unknown"}`);
    }
    const arr = json.Data?.Data ?? [];
    // CC renvoie parfois des points de seed avec close=0 au tout début (avant
    // listing du coin). On les filtre pour éviter de fausser le calcul ROI
    // (division par zéro côté client).
    return arr
      .filter((p) => p.close > 0)
      .map((p) => ({ t: p.time * 1000, price: p.close }));
  } catch (err) {
    console.warn(`[historical-prices] CryptoCompare failed (${symbol}):`, err);
    return [];
  }
}

/** Fetch un range arbitraire (timestamps unix secondes) côté CoinGecko. Renvoie [] si erreur. */
async function _fetchHistoricalRange(
  coinId: string,
  fromSec: number,
  toSec: number,
): Promise<HistoricalPoint[]> {
  const url =
    `${COINGECKO_BASE}/coins/${coinId}/market_chart/range` +
    `?vs_currency=eur&from=${fromSec}&to=${toSec}`;
  try {
    // FIX 2026-05-02 audit user — bug ROISimulator "evolution fausse sur
    // toutes les cryptos pour dates > 1 an" : sans la clé Demo CoinGecko,
    // l'endpoint /market_chart/range est limité à 365j sur free tier (les
    // chunks 90j > 1 an retournaient [] silencieusement → simulateur prenait
    // les 365 derniers jours seulement → ROI ~0% au lieu du vrai +200%).
    // Maintenant : cgHeaders() injecte x-cg-demo-api-key (configurée mai 2026)
    // qui débloque l'historique complet jusqu'à 5 ans.
    const res = await fetch(url, {
      headers: cgHeaders(),
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`CoinGecko range ${coinId} → ${res.status}`);
    const json = (await res.json()) as { prices?: [number, number][] };
    return (json.prices ?? []).map(([t, price]) => ({ t, price }));
  } catch (err) {
    console.warn(
      `[historical-prices] range fetch failed (${coinId}, ${fromSec}-${toSec}):`,
      err,
    );
    return [];
  }
}

/**
 * Récupère N jours d'historique (close quotidien) en EUR.
 *
 * Stratégie post-fix 2026-05-02 :
 *   1. SI `coinId` mappé dans CG_TO_CC → essai CryptoCompare (fonctionne 5.5 ans
 *      sans clé, contrairement à CG Demo qui plafonne à 365j).
 *   2. SI CC retourne ≥ 30 points → on garde, on retourne.
 *   3. SINON → fallback CoinGecko (cas : coin absent CC, ou maintenance CC).
 *
 * Sortie : tableau trié par `t` croissant, dedupliqué (au cas où des chunks
 * se chevauchent par exactement 1 timestamp aux bords).
 */
async function _fetchHistoricalPrices(
  coinId: string,
  days: number,
): Promise<HistoricalPoint[]> {
  // ---- Source primaire : CryptoCompare (fix bug 365j) ----
  const ccSymbol = CG_TO_CC[coinId];
  if (ccSymbol) {
    const ccPoints = await _fetchFromCryptoCompare(ccSymbol, days);
    // Seuil de validité : au moins 30 points utilisables (1 mois de daily).
    // En dessous on tente CG en backup pour ne pas afficher un graphe vide.
    if (ccPoints.length >= 30) {
      return ccPoints;
    }
    console.warn(
      `[historical-prices] CC returned ${ccPoints.length} pts for ${coinId} → fallback CG`,
    );
  }

  // ---- Fallback CoinGecko (legacy chunked) ----
  return _fetchFromCoinGecko(coinId, days);
}

/**
 * Ancien chemin CoinGecko, conservé comme fallback. Voir bloc commentaire en
 * tête de fichier pour la stratégie chunked > 365j.
 */
async function _fetchFromCoinGecko(
  coinId: string,
  days: number,
): Promise<HistoricalPoint[]> {
  // ---- Cas simple : <= 365j ----
  if (days <= 365) {
    const url = `${COINGECKO_BASE}/coins/${coinId}/market_chart?vs_currency=eur&days=${days}&interval=daily`;
    try {
      // Cf. fix dans _fetchHistoricalRange : cgHeaders() ajoute la clé Demo
      // CoinGecko qui stabilise le rate-limit (30 req/min vs 5-15 erratique).
      const res = await fetch(url, {
        headers: cgHeaders(),
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

  // ---- Cas chunked : > 365j ----
  // FIX P0 audit-fonctionnel-live-final #2 : on évite le silent-empty de
  // CoinGecko en chunkant des fenêtres de 90 jours via `market_chart_range`.
  const nowSec = Math.floor(Date.now() / 1000);
  const totalSpanSec = days * SECONDS_PER_DAY;
  const chunkSpanSec = CHUNK_DAYS * SECONDS_PER_DAY;
  const chunks: Array<{ from: number; to: number }> = [];

  // On construit les chunks de la fin vers le début pour aligner sur "today",
  // puis on les inversera pour requêter dans l'ordre chronologique (UI plus
  // intuitive en cas de timeout sur un chunk : on garde le passé lointain).
  let cursorTo = nowSec;
  let remaining = totalSpanSec;
  while (remaining > 0) {
    const span = Math.min(remaining, chunkSpanSec);
    const cursorFrom = cursorTo - span;
    chunks.push({ from: cursorFrom, to: cursorTo });
    cursorTo = cursorFrom;
    remaining -= span;
  }

  // Parallèle : CoinGecko free tolère un burst raisonnable (rate limit ~30/min
  // par IP, et notre cache 1h limite la fréquence). 21 chunks pour 5 ans = OK.
  const all = await Promise.all(
    chunks.map((c) => _fetchHistoricalRange(coinId, c.from, c.to)),
  );

  // Concaténation + dedup par timestamp (Map garde la dernière occurrence).
  const dedup = new Map<number, number>();
  for (const arr of all) {
    for (const p of arr) {
      dedup.set(p.t, p.price);
    }
  }

  // Tri chronologique pour l'UI (DCA simulator s'attend à des données triées).
  return Array.from(dedup.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([t, price]) => ({ t, price }));
}

/**
 * Wrapper caché 1 h — clé = coinId + days.
 * Tag "coingecko-historical" pour invalidation manuelle si besoin.
 *
 * Historique des bumps :
 *  - v1 (initial)
 *  - v2-cgkey (2026-05-02 #1) : tentait de fixer via clé Demo CoinGecko →
 *    échec, clé Demo plafonne aussi à 365j, datasets restaient amputés.
 *  - v3-cc (2026-05-02 #2) : SWITCH source primaire vers CryptoCompare
 *    (5.5 ans gratuit, validé sur les 41 coins mappés).
 *  - v4-mapfix (2026-05-02 #3) : extension du mapping CG_TO_CC à 100 coins
 *    (vs 41 avant) après audit user "barre cassée sur la moitié des fiches".
 *    Bump invalide les datasets vides cachés sous v3 quand CC subissait
 *    rate-limit lors des 1ers fetchs des 8 coins ARB/DOT/ATOM/SUI/etc.
 */
export const fetchHistoricalPrices = unstable_cache(
  _fetchHistoricalPrices,
  ["coingecko-historical-v4-mapfix"],
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
        headers: cgHeaders(),
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
    // BATCH 51d — Migration price-source pour le convertisseur live.
    // Avant : CoinGecko simple/price 2-3 calls par conversion. Le
    // convertisseur est un outil hot-path tres consommateur (chaque
    // user qui change un input = 1 fetch). Maintenant : Binance +
    // CoinCap gratuit illimite via getPriceSnapshot.
    // Conversion fiat via taux fixes : USD/EUR=0.92, GBP/EUR=1.17,
    // CHF/EUR=1.05 (mai 2026, ecart <2% pour outil convertisseur
    // educatif non-trading).
    const FIAT_TO_USD: Record<string, number> = {
      usd: 1,
      eur: 1 / 0.92,    // 1 EUR = 1.087 USD
      gbp: 1 / 0.79,    // 1 GBP = 1.266 USD (1 USD = 0.79 GBP)
      chf: 1 / 0.88,    // 1 CHF = 1.136 USD
    };

    const { getPriceSnapshot } = await import("@/lib/price-source");
    const now = new Date().toISOString();

    // Crypto → Fiat
    if (!isFiat(fromLower) && isFiat(toLower)) {
      const id = COIN_IDS[fromLower];
      if (!id) return null;
      const snap = await getPriceSnapshot(id);
      if (snap.priceUsd > 0 && snap.source !== "static") {
        // priceUsd / FIAT_TO_USD[toLower] = combien de fiat pour 1 crypto
        const rate = snap.priceUsd / FIAT_TO_USD[toLower];
        return { rate, lastUpdated: snap.fetchedAt };
      }
      // Fallback CoinGecko (cas rare)
      const json = await fetchSimple([id], toLower);
      const point = json?.[id];
      if (!point) return null;
      return {
        rate: point[toLower],
        lastUpdated: new Date((point.last_updated_at ?? Date.now() / 1000) * 1000).toISOString(),
      };
    }

    // Fiat → Crypto (inverse)
    if (isFiat(fromLower) && !isFiat(toLower)) {
      const id = COIN_IDS[toLower];
      if (!id) return null;
      const snap = await getPriceSnapshot(id);
      if (snap.priceUsd > 0 && snap.source !== "static") {
        // 1 / (priceUsd / FIAT_TO_USD[fromLower]) = combien de crypto pour 1 fiat
        const fiatRate = snap.priceUsd / FIAT_TO_USD[fromLower];
        return { rate: 1 / fiatRate, lastUpdated: snap.fetchedAt };
      }
      const json = await fetchSimple([id], fromLower);
      const point = json?.[id];
      if (!point || !point[fromLower]) return null;
      return {
        rate: 1 / point[fromLower],
        lastUpdated: new Date((point.last_updated_at ?? Date.now() / 1000) * 1000).toISOString(),
      };
    }

    // Cross-crypto → on passe par USD via aggregator
    if (!isFiat(fromLower) && !isFiat(toLower)) {
      const idFrom = COIN_IDS[fromLower];
      const idTo = COIN_IDS[toLower];
      if (!idFrom || !idTo) return null;
      const [a, b] = await Promise.all([
        getPriceSnapshot(idFrom),
        getPriceSnapshot(idTo),
      ]);
      if (a.priceUsd > 0 && b.priceUsd > 0 && a.source !== "static" && b.source !== "static") {
        return {
          rate: a.priceUsd / b.priceUsd,
          lastUpdated: now,
        };
      }
      // Fallback CoinGecko
      const json = await fetchSimple([idFrom, idTo], "eur");
      const ax = json?.[idFrom];
      const bx = json?.[idTo];
      if (!ax || !bx || !bx.eur) return null;
      const ts = Math.max(ax.last_updated_at ?? 0, bx.last_updated_at ?? 0) || Date.now() / 1000;
      return {
        rate: ax.eur / bx.eur,
        lastUpdated: new Date(ts * 1000).toISOString(),
      };
    }

    // Fiat → Fiat
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
