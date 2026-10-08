/**
 * lib/price-source.ts — BATCH 50 (2026-05-03).
 *
 * AGGREGATOR DE PRIX MAISON — alternative gratuite illimitee a CoinGecko
 * dont le free plan (10K req/mois) a ete epuise.
 *
 * Architecture en cascade fallback :
 *   1. Binance public REST  — gratuit illimite (1200 req/min/IP), couvre
 *      ~600 paires USDT (= 90% du top 100 crypto). Pas de cle requise.
 *   2. CoinCap.io v2        — gratuit (200 req/min sans cle), top 1500.
 *      Couvre les coins absents de Binance.
 *   3. Static fallback      — dataset hardcode du dernier snapshot.
 *      Garantit que le site ne casse jamais. Visible "donnees du XX/XX".
 *
 * Aucune dependance : fetch natif Node 20+. Pas de cle API necessaire.
 *
 * Usage :
 *   import { getPriceSnapshot, getTopMarket } from "@/lib/price-source";
 *   const btc = await getPriceSnapshot("bitcoin");  // => { priceUsd, ... }
 *   const top = await getTopMarket(20);              // => Top 20 par market cap
 *
 * Cache strategy :
 *   - Cache Vercel ISR via fetch next.revalidate (300s pour prix, 1800s
 *     pour donnees lourdes). Resilience automatique.
 *   - Cache key par source : "ps:binance:btc", "ps:coincap:bitcoin"
 *
 * Couverture vs CoinGecko :
 *   ✅ Prix USD/EUR temps reel
 *   ✅ Variation 24h, 7d (calc derive si pas dispo)
 *   ✅ Volume 24h
 *   ✅ Market cap (price × supply)
 *   ✅ Sparkline 7d (Binance klines 1h × 168)
 *   ✅ Top market par cap
 *   ⚠️  ATH/ATL : approximation via Binance klines max ou static fallback
 *   ⚠️  Logos : on garde notre propre source (cryptologos.cc + assets.coingecko.com cache)
 */

import { unstable_cache } from "next/cache";
import { applySymbolOverride } from "@/lib/symbol-overrides";
import { readMarcheSnapshot, readTickerCache, type TickerEntry } from "@/lib/kv-ticker";

// PHASE 2 — Provider Pattern registry. La cascade live (Binance, Kraken,
// Coinbase, KuCoin, DexScreener, CryptoCompare, CoinGecko, Static) est
// maintenant orchestrate via lib/price-providers/. SKIP_DEXSCREENER set
// (ambiguity OM/MANTRA) est encapsule dans dexscreenerProvider.canHandle().
// Anciens imports directs supprimes (deplaces dans les providers individuels).
import {
  fetchPriceCascade,
  estimateMarketCap,
  type CryptoMeta,
} from "@/lib/price-providers";
// 06/10/2026 — priorité PAR TYPE DE DONNÉE (table unique lib/data-sources/priorities.ts) + relais + disjoncteur.
import { coingeckoSimplePrice } from "@/lib/price-providers/coingecko";
// 08/10/2026 (lot Z2) : plus aucun appel CoinMarketCap ici (lib/coinmarketcap.ts réservé aux robots) ; les données CMC
// viennent du relevé du robot R1 écrit dans le KV (lib/kv-ticker.ts). getCmcEntry = table locale, sans réseau.
import { getCmcEntry } from "@/lib/coinmarketcap";
import { resolveMarketFields, type FieldSources, type LiveQuote, type MarketFieldDeps } from "@/lib/data-sources/market-fields";
import { resolveWithRelay } from "@/lib/data-sources/resolve";
import { checkList } from "@/lib/data-sources/sanity";
import type { SourceName } from "@/lib/data-sources/priorities";
import { CHANNELS } from "@/lib/data-sources/health";

// Data JSON editoriales (top-cryptos + hidden-gems) — single source of truth
// pour le mapping coingeckoId -> {symbol, name}. Importe statiquement pour
// que le lookup soit synchrone au boot et bundle correctement par Next.js.
import topCryptosData from "@/data/top-cryptos.json";
import hiddenGemsData from "@/data/hidden-gems.json";

interface DataEntry {
  id?: string;
  coingeckoId: string;
  symbol: string;
  name: string;
}

const DATA_META_LOOKUP: Record<string, { symbol: string; name: string }> = (() => {
  const all: DataEntry[] = [
    ...((topCryptosData as { topCryptos?: DataEntry[] }).topCryptos ?? []),
    ...((hiddenGemsData as { hiddenGems?: DataEntry[] }).hiddenGems ?? []),
  ];
  const map: Record<string, { symbol: string; name: string }> = {};
  for (const e of all) {
    if (e.coingeckoId && e.symbol && e.name) {
      map[e.coingeckoId] = { symbol: e.symbol.toUpperCase(), name: e.name };
    }
  }
  return map;
})();

/* -------------------------------------------------------------------------- */
/*  Instantané de secours (KV) — écrit par le robot R1 seulement               */
/* -------------------------------------------------------------------------- */
/*
 * 08/10/2026 (lot Z2) : l'instantané `price-source:top-snapshot` est écrit par le robot R1 (refresh-ticker-prices),
 * dans la même commande MSET que le bandeau. L'ancien cron horaire update-static-prices et le rafraîchissement en
 * arrière-plan déclenché par la lecture (doublon D9) sont supprimés : cette fonction ne fait plus que LIRE (≤ 24 h).
 */
async function _readKvSnapshot(): Promise<{
  snapshot: Record<string, { priceUsd: number; change24h: number; marketCap: number; volume24h: number }>;
  /** Heure du relevé de R1 (ISO). Reprise Z2 : gardée pour ne jamais horodater ce secours « maintenant ». */
  updatedAt: string;
} | null> {
  try {
    const s = await readMarcheSnapshot();
    if (!s?.snapshot || typeof s.updatedAt !== "string" || !Number.isFinite(Date.parse(s.updatedAt))) return null;
    return { snapshot: s.snapshot, updatedAt: s.updatedAt };
  } catch {
    return null;
  }
}

/* -------------------------------------------------------------------------- */
/*  Types                                                                     */
/* -------------------------------------------------------------------------- */

export type PriceSource =
  | "binance"
  | "kraken"
  | "coinbase"
  | "kucoin"
  | "coinmarketcap"
  | "dexscreener"
  | "cryptocompare"
  | "coingecko"
  // "coincap" : legacy alias kept for backward-compat (snapshot caches
  // pre-refactor stockaient "coincap" alors que la source etait deja
  // CoinGecko). Nouveau nom canonique = "coingecko".
  | "coincap"
  | "static";

export interface PriceSnapshot {
  /** Notre slug interne (= coingeckoId pour compatibilite). */
  id: string;
  symbol: string;
  name: string;
  /** Prix en USD. 0 si fallback echec. */
  priceUsd: number;
  /** Variation % sur 24h. */
  change24h: number;
  /** Variation % sur 7d. Null si non dispo (CoinCap n'expose pas direct). */
  change7d: number | null;
  /** Volume 24h en USD. */
  volume24h: number;
  /** Market cap en USD (price × circulating supply). */
  marketCap: number;
  /** Sparkline 168 points (1 par heure sur 7j). Vide si non dispo. */
  sparkline7d: number[];
  /** Source de la donnee (pour debug + bandeau frontend). */
  source: PriceSource;
  /** ISO timestamp du fetch. */
  fetchedAt: string;
  /** 06/10/2026 — variation 1 h (CoinMarketCap, sinon CoinGecko). Absente/null si non fournie. */
  change1h?: number | null;
  /** 06/10/2026 — rang par capitalisation et offre en circulation, si une source les fournit. */
  marketCapRank?: number;
  circulatingSupply?: number | null;
  /**
   * 06/10/2026 — SOURCE RÉELLE DE CHAQUE CHAMP, à lire pour l'attribution (« coinmarketcap », « coingecko »,
   * « kraken », « binance-klines », « estimate »…). `source` ci-dessus reste le champ historique (prix).
   */
  sources?: FieldSources;
}

export interface TopMarketCoin extends PriceSnapshot {
  marketCapRank: number;
  /** URL logo (CoinGecko CDN cache ou cryptologos.cc fallback). */
  image: string;
}

/* -------------------------------------------------------------------------- */
/*  Helpers actifs                                                            */
/* -------------------------------------------------------------------------- */
/* Phase 2 cleanup (cycle 8) : _binanceTicker + _binanceKlines + interface    */
/* BinanceTicker24h ont ete supprimes — la logique Binance est maintenant     */
/* dans lib/price-providers/binance.ts. Seul _calcChange7d reste utilise par  */
/* _getPriceSnapshotInner pour deriver le change7d des sparkline retournes    */
/* par binanceProvider.                                                       */

/**
 * Calcul change7d a partir des klines : (close[end] - close[start]) / close[start] × 100
 */
function _calcChange7d(sparkline: number[]): number | null {
  if (sparkline.length < 2) return null;
  const first = sparkline[0];
  const last = sparkline[sparkline.length - 1];
  if (!first || !last) return null;
  return ((last - first) / first) * 100;
}

/* -------------------------------------------------------------------------- */
/*  Source #2 — CoinGecko (gratuit Demo, ~30 req/min sans cle)                */
/* -------------------------------------------------------------------------- */
/* FIX 2026-05-08 — CoinCap.io v2 a ete arrete (DNS not resolved, dig         */
/* api.coincap.io renvoie NXDOMAIN). v3 demande une API key. On bascule       */
/* sur CoinGecko free Demo qui retourne le meme dataset (price, change24h,    */
/* market cap, volume) avec un endpoint batch /simple/price tres leger.       */
/* Cache Next.js 5min via unstable_cache → ~20 req/min meme sur 100 cryptos.  */
/* Quota Binance reste prioritaire (Source #1) tant qu'il marche, donc en    */
/* pratique CoinGecko ne kicke que pour les ~10 cryptos hors Binance OU       */
/* quand Hetzner DE est rate-limite par Binance (HTTP 429). Surveiller via    */
/* Sentry les `[price-source] coingecko fetch failed`.                        */

interface CoinCapAsset {
  id: string;
  rank: string;
  symbol: string;
  name: string;
  supply: string;
  marketCapUsd: string;
  volumeUsd24Hr: string;
  priceUsd: string;
  changePercent24Hr: string;
}

/* Phase 2 cleanup (cycle 8) : interface CoingeckoSimplePrice + _coincapAsset
 * supprimes — la logique CoinGecko /simple/price est maintenant dans
 * lib/price-providers/coingecko.ts. _coincapTop reste utilise par
 * _getTopMarket (different endpoint /coins/markets, top par market cap). */

/**
 * Fetch le top N par market cap via /coins/markets (1 hop pour 250 max).
 * Ordre par market_cap_desc identique a CoinCap top.
 */
async function _coincapTop(limit: number): Promise<CoinCapAsset[]> {
  try {
    const cap = Math.min(Math.max(1, limit), 250);
    const url = `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=${cap}&page=1&sparkline=false&price_change_percentage=24h`;
    // FIX AUDIT 2026-06-11 — cette voie PRIMAIRE appelait CoinGecko SANS
    // la clé API : sur Vercel, l'IP de sortie est partagée entre des
    // milliers de sites → 429 quasi permanent → fallback statique (6
    // coins, prix périmés) servi aux pages marché. cgHeaders() ajoute
    // x-cg-demo-api-key (quota par clé, pas par IP) dès que
    // COINGECKO_API_KEY est définie.
    const { cgHeaders } = await import("@/lib/coingecko");
    const res = await fetch(url, {
      next: { revalidate: 600 },
      signal: AbortSignal.timeout(7000),
      headers: cgHeaders(),
    });
    if (!res.ok) return [];
    const data = (await res.json()) as Array<{
      id: string;
      symbol: string;
      name: string;
      current_price?: number;
      market_cap?: number;
      total_volume?: number;
      price_change_percentage_24h?: number;
      circulating_supply?: number;
      market_cap_rank?: number;
    }>;
    if (!Array.isArray(data)) return [];
    return data.map((c, idx) => ({
      id: c.id,
      rank: String(c.market_cap_rank ?? idx + 1),
      symbol: (c.symbol ?? "").toUpperCase(),
      name: c.name ?? c.id,
      supply: String(c.circulating_supply ?? 0),
      marketCapUsd: String(c.market_cap ?? 0),
      volumeUsd24Hr: String(c.total_volume ?? 0),
      priceUsd: String(c.current_price ?? 0),
      changePercent24Hr: String(c.price_change_percentage_24h ?? 0),
    }));
  } catch {
    return [];
  }
}

/* -------------------------------------------------------------------------- */
/*  Source #3 — (supprimée le 2026-10-03)                                     */
/* -------------------------------------------------------------------------- */
// La table de prix figés de mai 2026 (BTC 63 662 $, ETH 1 667 $…) a été
// retirée : ses valeurs arrivaient en production affichées comme un cours
// courant dès que la cascade live échouait. Règle du site : aucun chiffre
// faux. Derniers filets : relevé KV du bandeau (robot R1, 6 h au plus) et instantané KV
// (même robot, 24 h au plus) ; sinon priceUsd 0 → « Prix indisponible ».
// Le supply servant à estimer les capitalisations reste dans
// lib/price-providers/static.ts (STATIC_FALLBACK, jamais affiché).

const COIN_META: Record<string, { symbol: string; name: string }> = {
  bitcoin:    { symbol: "BTC", name: "Bitcoin" },
  ethereum:   { symbol: "ETH", name: "Ethereum" },
  ripple:     { symbol: "XRP", name: "XRP" },
  binancecoin:{ symbol: "BNB", name: "BNB" },
  solana:     { symbol: "SOL", name: "Solana" },
  cardano:    { symbol: "ADA", name: "Cardano" },
  dogecoin:   { symbol: "DOGE",name: "Dogecoin" },
  tron:       { symbol: "TRX", name: "TRON" },
  "avalanche-2": { symbol: "AVAX", name: "Avalanche" },
  chainlink:  { symbol: "LINK",name: "Chainlink" },
  polkadot:   { symbol: "DOT", name: "Polkadot" },
  "matic-network": { symbol: "MATIC", name: "Polygon" },
  "the-open-network": { symbol: "TON", name: "Toncoin" },
  "shiba-inu": { symbol: "SHIB", name: "Shiba Inu" },
  litecoin:   { symbol: "LTC", name: "Litecoin" },
  "bitcoin-cash": { symbol: "BCH", name: "Bitcoin Cash" },
  near:       { symbol: "NEAR", name: "NEAR" },
  uniswap:    { symbol: "UNI", name: "Uniswap" },
  aptos:      { symbol: "APT", name: "Aptos" },
  "internet-computer": { symbol: "ICP", name: "Internet Computer" },
  "ethereum-classic": { symbol: "ETC", name: "Ethereum Classic" },
  cosmos:     { symbol: "ATOM",name: "Cosmos" },
  stellar:    { symbol: "XLM", name: "Stellar" },
  filecoin:   { symbol: "FIL", name: "Filecoin" },
  monero:     { symbol: "XMR", name: "Monero" },
  algorand:   { symbol: "ALGO",name: "Algorand" },
  tezos:      { symbol: "XTZ", name: "Tezos" },
  "hedera-hashgraph": { symbol: "HBAR", name: "Hedera" },
  aave:       { symbol: "AAVE",name: "Aave" },
  maker:      { symbol: "MKR", name: "Maker" },
  sui:        { symbol: "SUI", name: "Sui" },
  arbitrum:   { symbol: "ARB", name: "Arbitrum" },
  optimism:   { symbol: "OP",  name: "Optimism" },
  tether:     { symbol: "USDT",name: "Tether" },
  "usd-coin": { symbol: "USDC",name: "USD Coin" },
};

/* -------------------------------------------------------------------------- */
/*  06/10/2026 — sources des champs d'ensemble (table lib/data-sources)       */
/* -------------------------------------------------------------------------- */

/** Ligne CoinMarketCap du relevé R1 (KV) en champs de marché, ou null. */
function _cmcFieldsFromTicker(e: TickerEntry | undefined) {
  if (!e || e.unlinked || !(e.price > 0)) return null;
  return {
    priceUsd: e.price,
    change1h: e.change1h ?? null,
    change24h: e.change24h,
    change7d: e.change7d ?? null,
    marketCap: e.marketCap > 0 ? e.marketCap : null,
    rank: e.rank ?? null,
    circulatingSupply: e.circulatingSupply ?? null,
    volume24h: e.volume24h ?? null,
  };
}

/**
 * Appels utilisés par resolveMarketFields. 08/10/2026 (lot Z2) : « cmc » = relevé CoinMarketCap du robot R1 LU dans le
 * KV (top 100, 12 min au plus) ; aucune requête vers CoinMarketCap. Fiche hors du relevé : CMC n'est pas une source.
 */
function _marketFieldDeps(coingeckoId: string): MarketFieldDeps {
  return {
    // Fiche absente de la table : CMC n'est PAS une source pour elle (aucun « succès » à vide qui refermerait le
    // disjoncteur semi-ouvert sans rien avoir vérifié). getCmcEntry = lecture de data/cmc-id-map.json, sans réseau.
    cmc: getCmcEntry(coingeckoId)
      ? async (id: string) => {
          const t = await readTickerCache();
          return t.source === "live" && t.provider === "coinmarketcap" ? _cmcFieldsFromTicker(t.record[id]) : null;
        }
      : undefined,
    // Même URL que le fournisseur CoinGecko de la cascade (cache Next partagé), délai réduit à 3 s.
    // /simple/price SANS clé : disjoncteur propre (« coingecko-public »), jamais partagé avec /coins/markets
    // (clé Demo). Appelé seulement pour les champs qu'il fournit et que CMC n'a pas donnés.
    coingecko: async (id: string) => {
      const e = await coingeckoSimplePrice(id, 3000);
      return e && typeof e.usd === "number" && e.usd > 0
        ? { priceUsd: e.usd, marketCap: e.usd_market_cap ?? null, volume24h: e.usd_24h_vol ?? null, change24h: e.usd_24h_change ?? null }
        : null;
    },
    estimate: estimateMarketCap,
    cryptocompare: async (id: string) => {
      const { getCryptoComparePriceByCoingeckoId } = await import("@/lib/cryptocompare");
      const cc = await getCryptoComparePriceByCoingeckoId(id);
      return cc && cc.marketCap > 0 ? cc.marketCap : null;
    },
    coverage: { coingecko: COINGECKO_SIMPLE_FIELDS },
    channels: { coingecko: CHANNELS.coingeckoPublic },
  };
}

/** Champs que /simple/price renvoie (prix, capitalisation, volume, variation 24 h) : rien d'autre ne l'appelle. */
export const COINGECKO_SIMPLE_FIELDS = ["marketCap", "volume24h", "change24h"] as const;

/** Contrôle croisé (≤ 1/h/instance) : top 20 CMC (déjà en cache) contre les places de marché sans quota. */
function _triggerCrossCheck(top: readonly TopMarketCoin[]): void {
  // Jamais pendant la construction du site (next build) : ce contrôle n'a de sens qu'au service des pages.
  if (process.env.NEXT_PHASE === "phase-production-build") return;
  void (async () => {
    const [{ maybeRunCrossCheck }, { PROVIDERS }] = await Promise.all([
      import("@/lib/data-sources/cross-check"),
      import("@/lib/price-providers"),
    ]);
    // 08/10/2026 (lot Z2) : Coinbase et KuCoin ne servent plus de témoins ; le relevé CMC vient du KV du robot R1.
    const exchanges = PROVIDERS.filter((p) => ["binance", "kraken"].includes(p.name));
    let cmcQuotedAt = new Map<string, { price: number; quotedAt: string | null }>();
    await maybeRunCrossCheck({
      coins: async () => {
        const t = await readTickerCache();
        if (t.source === "live" && t.provider === "coinmarketcap") {
          const rows = Object.values(t.record)
            .filter((e) => !e.unlinked && e.price > 0)
            .sort((a, b) => (a.rank ?? Infinity) - (b.rank ?? Infinity))
            .slice(0, 20);
          cmcQuotedAt = new Map(rows.map((e) => [e.id, { price: e.price, quotedAt: t.fetchedAt }]));
          return rows.map((e) => ({ id: e.id, symbol: e.symbol, name: e.name }));
        }
        return top.slice(0, 20).map((c) => ({ id: c.id, symbol: c.symbol, name: c.name }));
      },
      prices: async (coin) => {
        const meta: CryptoMeta = { coingeckoId: coin.id, symbol: applySymbolOverride(coin.id, coin.symbol), name: coin.name };
        const points = await Promise.all(
          exchanges.map(async (p) => {
            if (!p.canHandle(meta)) return null;
            const d = await p.fetch(meta).catch(() => null);
            return d && d.priceUsd > 0 ? { source: p.name as SourceName, price: d.priceUsd } : null;
          }),
        );
        const cmc = cmcQuotedAt.get(coin.id);
        return [
          ...points.filter((x): x is { source: SourceName; price: number } => x !== null),
          ...(cmc ? [{ source: "coinmarketcap" as SourceName, price: cmc.price, quotedAt: cmc.quotedAt }] : []),
        ];
      },
    });
  })().catch(() => undefined);
}

/* -------------------------------------------------------------------------- */
/*  Public API                                                                */
/* -------------------------------------------------------------------------- */

/**
 * Recupere un snapshot de prix complet pour une crypto.
 *
 * Cascade :
 *   1. Binance (gratuit illimite) si paire USDT existe
 *   2. CoinCap (gratuit) sinon
 *   3. Static fallback (dataset local) en dernier recours
 *
 * Toujours retourne un snapshot valide (jamais null), avec source="static"
 * si tout echoue. Garantit que le site ne casse jamais.
 */
async function _getPriceSnapshot(coingeckoId: string): Promise<PriceSnapshot> {
  try {
    return await _getPriceSnapshotInner(coingeckoId);
  } catch (err) {
    // FIX 2026-05-08 — guard global : peu importe l'erreur (timeout, parse,
    // import.meta crash, etc.), on retourne TOUJOURS un PriceSnapshot
    // valide pour ne pas faire crasher la chaine d'appel (notamment
    // /api/prices qui retournait 500 a cause de exceptions remontees ici).
    // eslint-disable-next-line no-console
    console.warn(
      `[price-source] _getPriceSnapshot fatal error for "${coingeckoId}":`,
      err instanceof Error ? err.message : "unknown",
    );
    const meta = COIN_META[coingeckoId] ?? {
      symbol: coingeckoId.toUpperCase().slice(0, 6),
      name: coingeckoId.charAt(0).toUpperCase() + coingeckoId.slice(1),
    };
    // AUDIT 2026-10-03 — plus de prix figé de mai ici : priceUsd 0, le
    // front affiche « — » / « Prix indisponible » (aucun chiffre faux).
    return {
      id: coingeckoId,
      symbol: meta.symbol,
      name: meta.name,
      priceUsd: 0,
      change24h: 0,
      change7d: null,
      volume24h: 0,
      marketCap: 0,
      sparkline7d: [],
      source: "static",
      fetchedAt: new Date().toISOString(),
    };
  }
}

async function _getPriceSnapshotInner(coingeckoId: string): Promise<PriceSnapshot> {
  // OPTIM 2026-05-10 — KV ticker (top 50) read en PRIORITÉ avant cascade.
  // Évite hits Binance/Kraken/etc pour les top 50 cryptos (90% du trafic).
  //
  // FIX 2026-05-14 (Phase 2) — Pattern live + stale via lib/kv-ticker.
  // GH Actions cron `*/10 * * * *` ignore largement la fréquence ; le
  // fallback stale (TTL 6 h) couvre les gaps. Le flag `isStale` n'est
  // pas exposé dans PriceSnapshot pour ne pas casser le contrat existant,
  // mais source reste "static" pour signaler que ce n'est pas un live exchange.
  try {
    const { record: cached, isStale, fetchedAt: tickerAt, provider } = await readTickerCache();
    // 06/10/2026 — un relevé de plus de 12 min n'est jamais servi comme cours actuel : on passe à la cascade
    // en direct. Le relevé en direct garde l'heure du cron (et non « maintenant »).
    const entry = isStale ? undefined : cached[coingeckoId];
    if (entry && !entry.unlinked && entry.price > 0) {
      // 08/10/2026 (lot Z2) — source réelle du relevé du robot R1 : CoinMarketCap (top 100, tous les champs dans le même
      // appel), ou CoinGecko quand CMC a échoué. Les champs manquants suivent la table de priorités.
      const liveSource: SourceName = provider === "coinmarketcap" ? "coinmarketcap" : "coingecko";
      const { fields, sources } = await resolveMarketFields(
        { coingeckoId, symbol: entry.symbol, name: entry.name },
        {
          source: liveSource,
          priceUsd: entry.price,
          data: {
            change24h: entry.change24h,
            marketCap: entry.marketCap,
            volume24h: entry.volume24h ?? 0,
            change1h: entry.change1h ?? null,
            change7d: entry.change7d ?? null,
            circulatingSupply: entry.circulatingSupply ?? null,
            rank: entry.rank ?? null,
          },
        },
        _marketFieldDeps(coingeckoId),
      ).catch(() => ({ fields: null, sources: { price: liveSource } }));
      return {
        id: coingeckoId,
        symbol: entry.symbol,
        name: entry.name,
        priceUsd: entry.price,
        change24h: fields?.change24h ?? entry.change24h,
        change7d: fields?.change7d ?? null,
        volume24h: fields?.volume24h ?? entry.volume24h ?? 0,
        marketCap: fields?.marketCap ?? entry.marketCap,
        sparkline7d: [],
        // 08/10/2026 (lot Z2) : source réelle du relevé (avant : « static », qui faisait citer « dernier relevé enregistré »)
        source: liveSource,
        fetchedAt: tickerAt ?? new Date().toISOString(),
        change1h: fields?.change1h ?? null,
        ...(fields?.rank ? { marketCapRank: fields.rank } : {}),
        circulatingSupply: fields?.circulatingSupply ?? null,
        sources,
      };
    }
  } catch {
    // KV indispo → fallback cascade live ci-dessous
  }

  // PHASE 2 PROVIDER PATTERN (cycle 7) — la cascade resiliente est
  // maintenant dans lib/price-providers/index.ts. Chaque source = 1 fichier
  // qui implemente PriceProvider. Ajout d'une nouvelle source = 1 ligne
  // dans PROVIDERS array. Architecture pensee scalabilite "toutes les
  // cryptos existantes" un jour.
  //
  // Le code historique inline (Binance + Kraken + Coinbase + KuCoin +
  // DexScreener + CryptoCompare + CoinGecko + Static, ~250 lignes
  // dupliquees pour estimation marketCap) a ete remplace par un seul
  // appel a fetchPriceCascade(meta) qui itere les providers tries par
  // priority croissante.
  //
  // FIX 2026-05-08 (audit regle des 3) — single source of truth pour le
  // mapping coingeckoId -> {symbol, name} : data JSON editoriales en
  // priorite, COIN_META legacy en fallback, derive intelligent en
  // dernier recours.
  const dataMeta =
    DATA_META_LOOKUP[coingeckoId] ??
    COIN_META[coingeckoId] ?? {
      symbol: coingeckoId.split("-")[0].toUpperCase().slice(0, 8),
      name:
        coingeckoId.charAt(0).toUpperCase() + coingeckoId.slice(1).replace(/-/g, " "),
    };
  // Symbol overrides (ex: render-token -> RENDER apres rename 2024).
  // Applique avant l'iteration des providers pour que tous recoivent le
  // bon symbol exchange.
  const exchangeSymbol = applySymbolOverride(coingeckoId, dataMeta.symbol);
  const fetchedAt = new Date().toISOString();
  const cryptoMeta: CryptoMeta = {
    coingeckoId,
    symbol: exchangeSymbol,
    name: dataMeta.name,
    // Phase 3 hook : `chains` mapping injecte ici quand data JSON sera
    // enrichi avec les contracts onchain (ETH/SOL/BSC/...). Pour l'instant
    // undefined → DexScreenerProvider tombe sur le search par symbol.
  };

  const cascadeResult = await fetchPriceCascade(cryptoMeta);
  if (cascadeResult) {
    const { data, source } = cascadeResult;
    const sparkline = data.sparkline7d ?? [];
    // 06/10/2026 — champs d'ensemble résolus champ par champ selon DATA_PRIORITIES : CMC → CoinGecko → valeurs
    // de la place de marché → estimation (offre figée de mai 2026) → CryptoCompare. Quand tout est en panne, on
    // retombe exactement sur l'ancien calcul (place de marché, estimation, CryptoCompare).
    const live: LiveQuote = {
      source: source as SourceName,
      priceUsd: data.priceUsd,
      data,
      change7dFromKlines: sparkline.length > 1 ? _calcChange7d(sparkline) : null,
    };
    const { fields, sources } = await resolveMarketFields(cryptoMeta, live, _marketFieldDeps(coingeckoId));
    return {
      id: coingeckoId,
      symbol: dataMeta.symbol,
      name: dataMeta.name,
      priceUsd: data.priceUsd,
      change24h: fields.change24h ?? data.change24h,
      change7d: fields.change7d,
      volume24h: fields.volume24h ?? data.volume24h,
      marketCap: fields.marketCap ?? 0,
      sparkline7d: sparkline,
      source,
      // Reprise Z2 : le fournisseur coinmarketcap LIT le relevé de R1 (≤ 12 min) : son heure, pas celle du rendu.
      fetchedAt: typeof data.meta?.releveLe === "string" ? data.meta.releveLe : fetchedAt,
      change1h: fields.change1h,
      ...(fields.rank ? { marketCapRank: fields.rank } : {}),
      circulatingSupply: fields.circulatingSupply,
      sources: { ...sources, ...(sparkline.length > 1 ? { sparkline7d: "binance-klines" as SourceName } : {}) },
    };
  }
  // Cascade exhausted (coingeckoId pas dans STATIC_FALLBACK ni couvert
  // par aucune source live). On essaie le KV snapshot (auto-update via
  // cron) avant de retourner un snapshot degrade priceUsd=0.
  // Reprise Z2 : fetchedAt = heure du relevé de R1 (jusqu'à 24 h), jamais l'heure du rendu ; source « static » =
  // relevé non à jour (attribution « dernier relevé enregistré », lib/data-sources/attribution.ts).
  const kvSnapshot = await _readKvSnapshot();
  const kvEntry = kvSnapshot?.snapshot[coingeckoId];
  if (kvSnapshot && kvEntry) {
    return {
      id: coingeckoId,
      symbol: dataMeta.symbol,
      name: dataMeta.name,
      priceUsd: kvEntry.priceUsd,
      change24h: kvEntry.change24h,
      change7d: null,
      volume24h: kvEntry.volume24h,
      marketCap: kvEntry.marketCap,
      sparkline7d: [],
      source: "static",
      fetchedAt: kvSnapshot.updatedAt,
      sources: { price: "static" },
    };
  }

  // Snapshot ultime degrade : priceUsd=0 (frontend affiche "—").
  return {
    id: coingeckoId,
    symbol: dataMeta.symbol,
    name: dataMeta.name,
    priceUsd: 0,
    change24h: 0,
    change7d: null,
    volume24h: 0,
    marketCap: 0,
    sparkline7d: [],
    source: "static",
    fetchedAt,
  };
}


/**
 * Wrappe avec unstable_cache Next pour deduplication request memoization +
 * cache cross-requete 5 minutes. Reduce les calls Binance/CoinCap.
 */
export const getPriceSnapshot = unstable_cache(
  _getPriceSnapshot,
  // FIX 2026-05-08 — v13 : Phase 2 Provider Pattern. La cascade live
  // est orchestrate via lib/price-providers/. Architecture extensible
  // pour scaler vers "toutes les cryptos existantes" un jour. Bump
  // cache pour invalider tous les snapshots pre-refactor.
  ["price-source-snapshot-v13"],
  { revalidate: 300, tags: ["price-source"] },
);

/**
 * Top market par capitalisation. Utilise CoinCap (qui retourne deja le top
 * tri par market cap) en source principale, fallback Binance pour les prix
 * si CoinCap echoue.
 *
 * Note : on n'utilise PAS Binance pour le top car Binance ne donne pas
 * de market cap (ne connait pas le supply). CoinCap est la bonne source.
 */
async function _getTopMarket(limit: number): Promise<TopMarketCoin[]> {
  // Ordre de DATA_PRIORITIES.topMarket : relevé CoinMarketCap du robot R1 (KV, top 100 ; une demande de 200 reçoit
  // les 100 du relevé) puis CoinGecko /coins/markets.
  const fetchedAt = new Date().toISOString();
  const minRows = Math.min(limit, 10);
  const resolved = await resolveWithRelay<TopMarketCoin[]>(
    "topMarket",
    {
      // 08/10/2026 (lot Z2) : relevé CoinMarketCap du robot R1 LU dans le KV (top 100), aucun appel CMC ici.
      coinmarketcap: async () => {
            const t = await readTickerCache();
            // Reprise Z2 : relevé À JOUR seulement (≤ 12 min). Un relevé « stale » (jusqu'à 6 h) passait pour un succès,
            // bloquait le relais CoinGecko et servait des cours figés horodatés « maintenant » par le suivi de portefeuille.
            if (t.provider !== "coinmarketcap" || t.source !== "live") return null;
            // Lignes SANS id du site écartées : cette liste alimente des ids (autocomplétion, liste blanche du
            // portefeuille) ; un id « cmc-<n> » n'en est jamais un.
            const rows = Object.values(t.record)
              .filter((e) => !e.unlinked && e.price > 0)
              .sort((a, b) => (a.rank ?? Infinity) - (b.rank ?? Infinity))
              .slice(0, limit);
            if (rows.length === 0) return null;
            const at = t.fetchedAt ?? fetchedAt;
            return rows.map((r) => ({
              id: r.id,
              symbol: r.symbol,
              name: r.name,
              priceUsd: r.price,
              change24h: r.change24h ?? 0,
              change7d: r.change7d ?? null,
              volume24h: r.volume24h ?? 0,
              marketCap: r.marketCap ?? 0,
              sparkline7d: [],
              source: "coinmarketcap" as const,
              fetchedAt: at,
              marketCapRank: r.rank ?? 0,
              image: "", // même règle que ci-dessous : CryptoLogo fait la recherche locale (lib/crypto-logos.ts)
              change1h: r.change1h ?? null,
              circulatingSupply: r.circulatingSupply ?? null,
              sources: {
                price: "coinmarketcap",
                change1h: "coinmarketcap",
                change24h: "coinmarketcap",
                change7d: "coinmarketcap",
                marketCap: "coinmarketcap",
                rank: "coinmarketcap",
                circulatingSupply: "coinmarketcap",
                volume24h: "coinmarketcap",
              },
            }));
      },
      coingecko: async () => {
        const rows = await _getTopMarketFromCoingecko(limit, fetchedAt);
        if (rows.length === 0) throw new Error("liste vide ou refusée");
        return rows;
      },
    },
    {
      label: `top ${limit}`,
      validate: (list) => checkList(list, minRows).reason,
      // _coincapTop appelle /coins/markets AVEC la clé Demo : disjoncteur « coingecko-cle ».
      channels: { coingecko: CHANNELS.coingeckoKey },
    },
  );
  if (!resolved) return [];
  const top = checkList(resolved.value, minRows).ok;
  _triggerCrossCheck(top);
  return top;
}

/** Ancienne voie principale (CoinGecko /coins/markets via _coincapTop), devenue le relais. */
async function _getTopMarketFromCoingecko(limit: number, fetchedAt: string): Promise<TopMarketCoin[]> {
  const ccTop = await _coincapTop(limit);
  if (ccTop.length > 0) {
    return ccTop.map((c) => ({
      id: c.id,
      symbol: c.symbol.toUpperCase(),
      name: c.name,
      priceUsd: parseFloat(c.priceUsd),
      change24h: parseFloat(c.changePercent24Hr),
      change7d: null,
      volume24h: parseFloat(c.volumeUsd24Hr),
      marketCap: parseFloat(c.marketCapUsd),
      sparkline7d: [],
      source: "coincap",
      fetchedAt,
      marketCapRank: parseInt(c.rank, 10),
      // Logo : on utilise CoinCap CDN (gratuit)
      // BUG FIX 2026-05-03 — NE PAS hardcoder URL CoinCap CDN : couvre
      // mal les coins exotiques (404 -> broken image icon visible). On
      // laisse vide -> CryptoLogo composant fera le lookup intelligent
      // via lib/crypto-logos.ts (CoinGecko CDN cache, fonctionne pour
      // 100% du top 100 + fallback initiales gold pour le reste).
      image: "",
      sources: {
        price: "coingecko",
        change24h: "coingecko",
        marketCap: "coingecko",
        rank: "coingecko",
        volume24h: "coingecko",
      },
    }));
  }
  // AUDIT 2026-10-03 — plus de « fallback ultime » sur la table figée de mai :
  // liste vide. Les appelants gèrent déjà ce cas (lib/coingecko.ts passe à la
  // source suivante ; le robot R1 n'écrit le KV qu'avec au moins 50 lignes).
  return [];
}

/* 05/10/2026 (audit navigateur de nuit) : une liste VIDE (source en panne) était mise en cache 10 minutes, d'où une liste de
   cryptos vide pour tout le monde (suivi de portefeuille : « Aucune crypto trouvée »). unstable_cache ne garde pas un appel qui
   échoue : on lève donc une erreur sur une liste vide, et les appelants reçoivent toujours [] (comportement inchangé). */
const _getTopMarketCached = unstable_cache(
  async (limit: number): Promise<TopMarketCoin[]> => {
    const top = await _getTopMarket(limit);
    if (top.length === 0) throw new Error("price-source : top du marché vide (non mis en cache)");
    return top;
  },
  ["price-source-top-market-v2"],
  { revalidate: 600, tags: ["price-source"] },
);
export const getTopMarket = (limit: number): Promise<TopMarketCoin[]> => _getTopMarketCached(limit).catch(() => [] as TopMarketCoin[]);
