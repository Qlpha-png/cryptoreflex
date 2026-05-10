import { unstable_cache } from "next/cache";

export type CoinId = "bitcoin" | "ethereum" | "solana" | "binancecoin" | "ripple" | "cardano";

/**
 * Type permissif pour les coingeckoId au-delà du top 6 (utilisé pour TA_CRYPTOS,
 * analyses techniques, market table top 50, etc.). Audit 26/04/2026 : extension
 * du catalogue à 50 cryptos sans toucher au typage strict de fetchPrices().
 *
 * Format : kebab-case lowercase, identique à `id` dans CoinGecko API
 * (ex: "shiba-inu", "the-open-network", "matic-network").
 */
export type CoinGeckoId = string;

/**
 * Cache tags pour revalidation ciblée via revalidateTag().
 * - "coingecko:prices"  → fetchPrices (top 6 ticker)
 * - "coingecko:market"  → fetchTopMarket (top 20 table)
 * - "coingecko:global"  → fetchGlobalMetrics (KPIs)
 *
 * Tag granulaire (proposition #12 ETUDE-2026-05-02) :
 * - `coingecko:crypto:<id>` (ex: "coingecko:crypto:bitcoin") via cgCryptoTag()
 *   → permet d'invalider UNE fiche détail sans busser tout `coingecko:market`.
 *   Émis par fetchCoinDetail() + utilisé par /api/revalidate?tag=coingecko:crypto:<id>.
 */
export const CG_TAGS = {
  prices: "coingecko:prices",
  market: "coingecko:market",
  global: "coingecko:global",
} as const;

/**
 * Construit le tag granulaire d'une fiche crypto unique pour revalidation
 * ciblée via `revalidateTag()` ou `/api/revalidate?tag=...`.
 *
 * Format : `coingecko:crypto:<coingeckoId>` (kebab-case, lowercase).
 * Exemple : `cgCryptoTag("bitcoin")` → `"coingecko:crypto:bitcoin"`.
 */
export function cgCryptoTag(coingeckoId: string): string {
  return `coingecko:crypto:${coingeckoId}`;
}

export interface CoinPrice {
  id: CoinId;
  symbol: string;
  name: string;
  price: number;
  change24h: number;
  marketCap: number;
  image: string;
  /** Sparkline 7j (168 points horaires CoinGecko) — UNIQUEMENT renseigné si
      la fonction `fetchPricesWithSparkline()` est utilisée. Sinon vide. */
  sparkline7d?: number[];
}

const COINGECKO_BASE = "https://api.coingecko.com/api/v3";

/**
 * Headers à envoyer à CoinGecko :
 *  - Si COINGECKO_API_KEY est défini → on utilise le tier Demo (gratuit, 30 req/min,
 *    bien plus stable que le free tier qui rate-limit à ~5-15 req/min sans clé).
 *  - Sinon → free tier (instable avec 100 cryptos en parallèle).
 *
 * Documentation : https://docs.coingecko.com/reference/setting-up-your-api-key
 */
export function cgHeaders(): Record<string, string> {
  const headers: Record<string, string> = { accept: "application/json" };
  const key = process.env.COINGECKO_API_KEY;
  if (key) headers["x-cg-demo-api-key"] = key;
  return headers;
}

/**
 * Wrapper fetch avec retry exponentiel sur 429 (rate-limit).
 * Évite de cacher des null après un seul échec rate-limit.
 *
 * Stratégie : 1 retry après 1.5s, puis 1 retry après 4s, puis abandon.
 * Total max 5.5s — acceptable pour un Server Component qui SSR la page.
 */
async function fetchWithRetry(
  url: string,
  init: RequestInit & { next?: { revalidate?: number; tags?: string[] } },
  maxRetries = 2,
): Promise<Response> {
  const delays = [1500, 4000];
  let lastResponse: Response | null = null;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      // FIX P0 2026-05-06 — timeout 8s NEUF par tentative (AbortSignal.timeout
      // est consumé après le 1er fire, donc impératif de le recréer à chaque
      // attempt sinon retries échoueraient avec AbortError). Sans timeout, un
      // fetch hang bloquait jusqu'au timeout Vercel (60s) en consommant un slot
      // d'invocation Edge entier.
      const res = await fetch(url, {
        ...init,
        signal: init.signal ?? AbortSignal.timeout(8000),
      });
      if (res.ok) return res;
      if (res.status !== 429 && res.status !== 503) return res; // non-recoverable
      lastResponse = res;
    } catch {
      // Timeout/network error → on traite comme retryable
      lastResponse = new Response(null, { status: 599 });
    }
    if (attempt < maxRetries) {
      await new Promise((r) => setTimeout(r, delays[attempt] ?? 4000));
    }
  }
  return lastResponse ?? new Response(null, { status: 599 });
}

const COIN_META: Record<CoinId, { symbol: string; name: string }> = {
  bitcoin: { symbol: "BTC", name: "Bitcoin" },
  ethereum: { symbol: "ETH", name: "Ethereum" },
  solana: { symbol: "SOL", name: "Solana" },
  binancecoin: { symbol: "BNB", name: "BNB" },
  ripple: { symbol: "XRP", name: "XRP" },
  cardano: { symbol: "ADA", name: "Cardano" },
};

export const DEFAULT_COINS: CoinId[] = [
  "bitcoin",
  "ethereum",
  "solana",
  "binancecoin",
  "ripple",
  "cardano",
];

/**
 * Hydration batchée market_cap manquant via CoinGecko free.
 *
 * Pourquoi : `getPriceSnapshot()` cascade Binance/Kraken/Coinbase/KuCoin
 * qui ne renvoient QUE price + volume24h, pas marketCap. Résultat sans
 * hydrate : ticker home + autocomplete affichent marketCap=0 pour les
 * cryptos non-CoinGecko (havven=Synthetix, dai, kaspa, ethena, gala...).
 *
 * Strategie : 1 seul appel groupé `/coins/markets?ids=a,b,c` à CG free
 * (50/min sans cap mensuel) pour TOUS les ids manquants. Cache 1h via
 * unstable_cache pour éviter de bombarder CG si plusieurs callers
 * passent les mêmes ids dans la fenêtre.
 *
 * Trade-off : +1 fetch CG par minute max (cache 1h + ticker poll 30s).
 * Acceptable vs marketCap=0 visible sur ~33 fiches du ticker.
 */
const _hydrateMarketCapsBatch = unstable_cache(
  async (missingIds: string[]): Promise<Record<string, { marketCap: number; image: string }>> => {
    if (missingIds.length === 0) return {};
    try {
      const url = `${COINGECKO_BASE}/coins/markets?vs_currency=usd&ids=${missingIds.join(
        ","
      )}&order=market_cap_desc&per_page=${missingIds.length}&page=1&sparkline=false`;
      const res = await fetch(url, {
        signal: AbortSignal.timeout(8000),
        next: { revalidate: 3600, tags: [CG_TAGS.prices] },
      });
      if (!res.ok) return {};
      const json = (await res.json()) as Array<{
        id: string;
        market_cap: number | null;
        image: string | null;
      }>;
      const out: Record<string, { marketCap: number; image: string }> = {};
      for (const c of json) {
        out[c.id] = { marketCap: c.market_cap ?? 0, image: c.image ?? "" };
      }
      return out;
    } catch {
      return {};
    }
  },
  ["cg-hydrate-marketcaps-v1"],
  { revalidate: 3600, tags: [CG_TAGS.prices] },
);

/**
 * Implementation interne de fetchPrices — wrappée par unstable_cache plus bas.
 */
async function _fetchPrices(ids: CoinId[]): Promise<CoinPrice[]> {
  // BATCH 51 (2026-05-03) URGENT — Migration CoinGecko -> aggregator
  // maison (Binance + CoinCap + static). User feedback : "fais ce que
  // fais coingecko pour nous meme tout simplement". On essaie d'abord
  // notre price-source.ts (gratuit illimite). Fallback CoinGecko apres.
  try {
    const { getPriceSnapshot } = await import("@/lib/price-source");
    const snapshots = await Promise.all(ids.map((id) => getPriceSnapshot(id)));

    // FIX 2026-05-10 — Hydratation marketCap manquant pour ticker home +
    // autocomplete. Sans ça, les cryptos servies par Binance/Kraken (qui
    // n'ont pas marketCap) renvoyaient marketCap=0 dans /api/prices.
    // On collecte les ids missing et on fait 1 seul fetch groupé CG free.
    const missingMcap = snapshots
      .filter((s) => s.priceUsd > 0 && s.marketCap <= 0 && s.source !== "static")
      .map((s) => s.id);
    const hydrate =
      missingMcap.length > 0
        ? await _hydrateMarketCapsBatch(missingMcap)
        : {};

    // FIX 2026-05-08 — REGRESSION : "allWithPrice" tombait sur le fallback
    // CoinGecko (qui 429 + crashait sur COIN_META[id].symbol) si UNE SEULE
    // crypto avait priceUsd=0 (ex: frax-share absent de toutes les sources).
    // Resultat : /api/prices?ids=hivemapper,bittensor,... → 500 sur 8/10 chunks
    // de l'audit verify-100-prices-prod.mjs.
    //
    // Strategie revue : on retourne TOUJOURS les snapshots de price-source
    // (qui inclut deja le static fallback en dernier recours dans la cascade),
    // meme si un coin a priceUsd=0. C'est mieux que CoinGecko 429.
    // Affichage UI : prix 0 affiche "—" via CryptoLogo / formatUsd helpers,
    // donc degradation gracieuse plutot que crash 500.
    return snapshots.map((s) => {
      const h = hydrate[s.id];
      return {
        id: s.id as CoinId,
        symbol: s.symbol,
        name: s.name,
        price: s.priceUsd,
        change24h: s.change24h,
        marketCap: s.marketCap > 0 ? s.marketCap : h?.marketCap ?? 0,
        // BUG FIX 2026-05-03 — image vide car CryptoLogo composant fait
        // un lookup intelligent via lib/crypto-logos.ts (CoinGecko CDN
        // cache hardcode + fallback initiales). URL CoinCap CDN 404 sur
        // les coins exotiques = broken image icon visible.
        // FIX 2026-05-10 — si on a hydraté via CG, on garde son image CDN.
        image: h?.image ?? "",
      };
    });
  } catch {
    // price-source unavailable (cas extreme : import.meta crash, KV down) →
    // fallback CoinGecko ci-dessous. Comme CoinGecko est lui-meme 429,
    // on tombera dans le catch final qui retourne ids.map() avec price=0.
  }

  const url = `${COINGECKO_BASE}/coins/markets?vs_currency=usd&ids=${ids.join(
    ","
  )}&order=market_cap_desc&per_page=${ids.length}&page=1&sparkline=false&price_change_percentage=24h`;

  try {
    // FIX P0 2026-05-06 — timeout 8s sur fetch CoinGecko (avant : aucun).
    const res = await fetch(url, {
      // Cache long (free plan epuise) — n'est plus la source primaire
      next: { revalidate: 300, tags: [CG_TAGS.prices] },
      headers: cgHeaders(),
      signal: AbortSignal.timeout(8000),
    });

    if (!res.ok) {
      throw new Error(`CoinGecko responded ${res.status}`);
    }

    const json = (await res.json()) as Array<{
      id: CoinId;
      symbol: string;
      name: string;
      current_price: number;
      price_change_percentage_24h: number;
      market_cap: number;
      image: string;
    }>;

    return json.map((c) => ({
      id: c.id,
      symbol: (COIN_META[c.id]?.symbol ?? c.symbol).toUpperCase(),
      name: COIN_META[c.id]?.name ?? c.name,
      price: c.current_price,
      change24h: c.price_change_percentage_24h ?? 0,
      marketCap: c.market_cap,
      image: c.image,
    }));
  } catch {
    // Graceful fallback so the site still renders if the API is rate-limited.
    // FIX 2026-05-08 — BUG production : COIN_META[id] est undefined pour
    // les ~60 cryptos hidden-gems qui ne sont pas dans le mapping legacy
    // (limite au top 30). Resultat : `COIN_META[id].symbol` crashait avec
    // TypeError → /api/prices 500 sur 80% des chunks dans verify-100-prices.
    // Fallback derivé de l'id si meta absente (suffit pour rendu degrade).
    return ids.map((id) => {
      const meta = COIN_META[id];
      return {
        id,
        symbol: meta?.symbol ?? id.toUpperCase().slice(0, 6),
        name: meta?.name ?? id.charAt(0).toUpperCase() + id.slice(1),
        price: 0,
        change24h: 0,
        marketCap: 0,
        image: "",
      };
    });
  }
}

/**
 * Fetch live prices via la cascade price-source.ts.
 *
 * FIX 2026-05-08 — DOUBLE CACHE RACE FIXED : auparavant cette fonction etait
 * wrappee dans unstable_cache(fetchPrices, [...]) avec cache key derive des
 * `ids` array. Resultat : un meme `/api/prices?ids=BTC,ETH,...,BITTENSOR`
 * (50 ids) avait une cache key differente d'un `/api/prices?ids=BITTENSOR`
 * (1 id), donc 2 reponses divergentes pour la meme crypto pendant 5 min
 * apres une fenetre d'erreur.
 *
 * Solution : supprimer le top-level cache. La fonction _fetchPrices appelle
 * deja `getPriceSnapshot(id)` qui est cached PER-CRYPTO via unstable_cache
 * dans price-source.ts. Donc la deduplication marche au niveau atomique
 * (1 fetch par crypto / 5min) sans creer de cache key compose qui peut
 * etre stale.
 *
 * Trade-off : Request Memoization (1 call par requete pour le meme set
 * d'ids) est perdu, mais on garde la deduplication serveur globale via
 * getPriceSnapshot cache. Latence supplementaire ~0ms (cache hit en
 * memoire process).
 */
export const fetchPrices = async (ids: CoinId[] = DEFAULT_COINS) => _fetchPrices(ids);

/**
 * Variante de `_fetchPrices` qui inclut sparkline7d (168 points horaires).
 * Cache key séparée pour ne pas polluer le cache "light" — surcoût payload
 * ~1 KB/coin, mais permet d'afficher des sparklines live dans les vues
 * Portfolio / Watchlist sans charger un endpoint séparé.
 *
 * Acceptee aussi des coingeckoId hors top 6 (string permissive) pour
 * couvrir le cas Portfolio / Watchlist multi-cryptos.
 */
async function _fetchPricesWithSparkline(
  ids: string[]
): Promise<CoinPrice[]> {
  // BATCH 53 #3 — Migration vers price-source aggregator. Le sparkline 7d
  // est genere par Binance klines 1h × 168 (deja code dans _binanceKlines).
  // Avantage : 0 cout CoinGecko sur Portfolio/Watchlist, sparklines fresh
  // sans rate limit.
  try {
    const { getPriceSnapshot } = await import("@/lib/price-source");
    const snapshots = await Promise.all(ids.map((id) => getPriceSnapshot(id)));
    const allWithPrice = snapshots.every((s) => s.priceUsd > 0);
    if (allWithPrice) {
      // FIX 2026-05-10 — Hydratation marketCap (idem _fetchPrices) pour
      // Portfolio/Watchlist qui affichaient marketCap=0 sur les coins
      // servis par Binance/Kraken sans marketCap.
      const missingMcap = snapshots
        .filter((s) => s.marketCap <= 0 && s.source !== "static")
        .map((s) => s.id);
      const hydrate =
        missingMcap.length > 0
          ? await _hydrateMarketCapsBatch(missingMcap)
          : {};
      return snapshots.map((s) => {
        const h = hydrate[s.id];
        return {
          id: s.id as CoinId,
          symbol: s.symbol,
          name: s.name,
          price: s.priceUsd,
          change24h: s.change24h,
          marketCap: s.marketCap > 0 ? s.marketCap : h?.marketCap ?? 0,
          image: h?.image ?? "",
          sparkline7d: s.sparkline7d, // 168 pts via Binance klines (vide si static)
        };
      });
    }
  } catch {
    // Aggregator KO -> fallback CoinGecko ci-dessous
  }

  const url = `${COINGECKO_BASE}/coins/markets?vs_currency=usd&ids=${ids.join(
    ","
  )}&order=market_cap_desc&per_page=${ids.length}&page=1&sparkline=true&price_change_percentage=24h`;
  try {
    const res = await fetchWithRetry(url, {
      // Cache long (free plan epuise) — fallback ultime
      next: { revalidate: 600, tags: [CG_TAGS.prices] },
      headers: cgHeaders(),
    });
    if (!res.ok) throw new Error(`CoinGecko prices+spk ${res.status}`);
    const json = (await res.json()) as Array<{
      id: string;
      symbol: string;
      name: string;
      current_price: number;
      price_change_percentage_24h: number;
      market_cap: number;
      image: string;
      sparkline_in_7d: { price: number[] };
    }>;
    return json.map((c) => ({
      id: c.id as CoinId,
      symbol: (COIN_META[c.id as CoinId]?.symbol ?? c.symbol).toUpperCase(),
      name: COIN_META[c.id as CoinId]?.name ?? c.name,
      price: c.current_price,
      change24h: c.price_change_percentage_24h ?? 0,
      marketCap: c.market_cap,
      image: c.image,
      sparkline7d: c.sparkline_in_7d?.price ?? [],
    }));
  } catch {
    // Graceful : retourne des entries vides plutôt que crasher
    return ids.map((id) => ({
      id: id as CoinId,
      symbol: COIN_META[id as CoinId]?.symbol ?? id.toUpperCase(),
      name: COIN_META[id as CoinId]?.name ?? id,
      price: 0,
      change24h: 0,
      marketCap: 0,
      image: "",
      sparkline7d: [],
    }));
  }
}

export const fetchPricesWithSparkline = unstable_cache(
  async (ids: string[]) => _fetchPricesWithSparkline(ids),
  ["coingecko-prices-sparkline-v2"],
  // BATCH 50 — 60s -> 600s (10 min)
  { revalidate: 600, tags: [CG_TAGS.prices] }
);

export function formatUsd(value: number): string {
  if (!value) return "—";
  if (value >= 1000) {
    return value.toLocaleString("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    });
  }
  return value.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  });
}

export function formatPct(value: number): string {
  const sign = value >= 0 ? "+" : "";
  return `${sign}${value.toFixed(2)}%`;
}

/* ============================================================
 * Métriques globales du marché crypto (style CoinMarketCap)
 * ============================================================ */

export interface GlobalMetrics {
  totalMarketCapUsd: number;
  totalVolume24hUsd: number;
  btcDominance: number;
  ethDominance: number;
  marketCapChange24h: number;
  activeCryptos: number;
}

async function _fetchGlobalMetrics(): Promise<GlobalMetrics | null> {
  // BATCH 51 — Migration : on derive les metriques globales depuis le top
  // 200 CoinCap (gratuit illimite) au lieu de CoinGecko /global. Total
  // market cap = somme des market caps. BTC dominance = btc.marketCap /
  // total. Approximation : le top 200 represente >97% de la capitalisation
  // totale (longue queue negligeable). Fallback CoinGecko ci-dessous.
  try {
    const { getTopMarket } = await import("@/lib/price-source");
    const top200 = await getTopMarket(200);
    if (top200.length >= 50) {
      const totalMarketCap = top200.reduce((sum, c) => sum + (c.marketCap || 0), 0);
      const totalVolume = top200.reduce((sum, c) => sum + (c.volume24h || 0), 0);
      const btc = top200.find((c) => c.symbol === "BTC");
      const eth = top200.find((c) => c.symbol === "ETH");
      // change24h pondere = somme(change × marketCap) / totalMarketCap
      const weightedChange =
        totalMarketCap > 0
          ? top200.reduce((sum, c) => sum + (c.change24h || 0) * (c.marketCap || 0), 0) / totalMarketCap
          : 0;
      return {
        totalMarketCapUsd: totalMarketCap,
        totalVolume24hUsd: totalVolume,
        btcDominance: btc && totalMarketCap > 0 ? (btc.marketCap / totalMarketCap) * 100 : 0,
        ethDominance: eth && totalMarketCap > 0 ? (eth.marketCap / totalMarketCap) * 100 : 0,
        marketCapChange24h: weightedChange,
        activeCryptos: top200.length, // approximation — on a 1500+ via CoinCap mais on tronque
      };
    }
  } catch {
    // Fallback CoinGecko
  }

  try {
    // FIX P0 2026-05-06 — timeout 8s
    const res = await fetch(`${COINGECKO_BASE}/global`, {
      next: { revalidate: 1800, tags: [CG_TAGS.global] },
      headers: cgHeaders(),
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) throw new Error(`CoinGecko global ${res.status}`);
    const json = await res.json();
    const d = json.data;
    return {
      totalMarketCapUsd: d.total_market_cap.usd,
      totalVolume24hUsd: d.total_volume.usd,
      btcDominance: d.market_cap_percentage.btc,
      ethDominance: d.market_cap_percentage.eth,
      marketCapChange24h: d.market_cap_change_percentage_24h_usd,
      activeCryptos: d.active_cryptocurrencies,
    };
  } catch {
    return null;
  }
}

export const fetchGlobalMetrics = unstable_cache(
  _fetchGlobalMetrics,
  ["coingecko-global-v1"],
  // BATCH 50 — 300s -> 1800s (30 min)
  { revalidate: 1800, tags: [CG_TAGS.global] }
);

export interface FearGreedData {
  value: number; // 0-100
  classification: string; // "Extreme Fear" | "Fear" | "Neutral" | "Greed" | "Extreme Greed"
  timestamp: string;
  /**
   * BATCH 29C — delta vs hier. Permet d'afficher "+3 vs hier" comme signal
   * de momentum. Null si la valeur d'hier est indisponible.
   */
  deltaVsYesterday?: number | null;
}

const FEAR_GREED_FR: Record<string, string> = {
  "Extreme Fear": "Peur extrême",
  Fear: "Peur",
  Neutral: "Neutre",
  Greed: "Cupidité",
  "Extreme Greed": "Cupidité extrême",
};

export async function fetchFearGreed(): Promise<FearGreedData | null> {
  try {
    // BATCH 29C — fetch limit=2 pour récupérer aujourd'hui + hier en 1 call.
    // Permet d'afficher le delta sentiment sans coût supplémentaire.
    // FIX P0 2026-05-06 — timeout 4s (alternative.me souvent rapide).
    const res = await fetch("https://api.alternative.me/fng/?limit=2", {
      next: { revalidate: 3600 },
      signal: AbortSignal.timeout(4000),
    });
    if (!res.ok) return null;
    const json = await res.json();
    const today = json?.data?.[0];
    const yesterday = json?.data?.[1];
    if (!today) return null;
    const todayValue = parseInt(today.value, 10);
    const yesterdayValue = yesterday ? parseInt(yesterday.value, 10) : null;
    return {
      value: todayValue,
      classification: FEAR_GREED_FR[today.value_classification] || today.value_classification,
      timestamp: new Date(parseInt(today.timestamp, 10) * 1000).toISOString(),
      deltaVsYesterday:
        yesterdayValue !== null && Number.isFinite(yesterdayValue)
          ? todayValue - yesterdayValue
          : null,
    };
  } catch {
    return null;
  }
}

/* ============================================================
 * Top N cryptos par market cap (pour MarketTable)
 * ============================================================ */

export interface MarketCoin {
  id: string;
  symbol: string;
  name: string;
  image: string;
  currentPrice: number;
  marketCap: number;
  marketCapRank: number;
  totalVolume: number;
  priceChange1h: number | null;
  priceChange24h: number;
  priceChange7d: number | null;
  sparkline7d: number[];
  circulatingSupply: number;
  ath: number;
}

async function _fetchTopMarket(limit: number): Promise<MarketCoin[]> {
  // BATCH 51 — Migration aggregator maison. CoinCap retourne deja le top
  // par market cap, on l'utilise en priorite. Fallback CoinGecko si vide.
  try {
    const { getTopMarket } = await import("@/lib/price-source");
    const top = await getTopMarket(limit);
    if (top.length >= Math.min(limit, 10)) {
      // CoinCap n'expose pas sparkline 7d ni change 1h. On enrichit
      // optionnellement avec Binance klines (en parallele, best-effort).
      const { getPriceSnapshot } = await import("@/lib/price-source");
      const enriched = await Promise.all(
        top.map(async (c) => {
          const snap = await getPriceSnapshot(c.id).catch(() => null);
          return {
            id: c.id,
            symbol: c.symbol,
            name: c.name,
            image: c.image,
            currentPrice: c.priceUsd,
            marketCap: c.marketCap,
            marketCapRank: c.marketCapRank,
            totalVolume: c.volume24h,
            priceChange1h: null, // pas dispo via price-source pour l'instant
            priceChange24h: c.change24h,
            priceChange7d: snap?.change7d ?? null,
            sparkline7d: snap?.sparkline7d ?? [],
            circulatingSupply: c.marketCap > 0 && c.priceUsd > 0 ? c.marketCap / c.priceUsd : 0,
            ath: 0, // approximation : nous n'avons pas l'ATH historique
          };
        }),
      );
      return enriched;
    }
  } catch {
    // price-source unavailable, fallback CoinGecko
  }

  const url = `${COINGECKO_BASE}/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=${limit}&page=1&sparkline=true&price_change_percentage=1h,24h,7d`;
  try {
    // FIX P0 2026-05-06 — timeout 8s
    const res = await fetch(url, {
      // Fallback ultime CoinGecko — cache long (free plan epuise)
      next: { revalidate: 600, tags: [CG_TAGS.market] },
      headers: cgHeaders(),
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) throw new Error(`CoinGecko markets ${res.status}`);
    const json = (await res.json()) as Array<{
      id: string;
      symbol: string;
      name: string;
      image: string;
      current_price: number;
      market_cap: number;
      market_cap_rank: number;
      total_volume: number;
      price_change_percentage_1h_in_currency: number | null;
      price_change_percentage_24h_in_currency: number;
      price_change_percentage_7d_in_currency: number | null;
      sparkline_in_7d: { price: number[] };
      circulating_supply: number;
      ath: number;
    }>;
    return json.map((c) => ({
      id: c.id,
      symbol: c.symbol.toUpperCase(),
      name: c.name,
      image: c.image,
      currentPrice: c.current_price,
      marketCap: c.market_cap,
      marketCapRank: c.market_cap_rank,
      totalVolume: c.total_volume,
      priceChange1h: c.price_change_percentage_1h_in_currency,
      priceChange24h: c.price_change_percentage_24h_in_currency,
      priceChange7d: c.price_change_percentage_7d_in_currency,
      sparkline7d: c.sparkline_in_7d?.price ?? [],
      circulatingSupply: c.circulating_supply,
      ath: c.ath,
    }));
  } catch {
    return [];
  }
}

/**
 * BATCH 29 — fix bug "widget LIVE vide" (user feedback "rien de dynamique").
 * Avant : `_fetchTopMarket` retournait `[]` en cas d'échec → mis en cache 120s
 * → 2 min de hero LIVE vide pour tous les visiteurs. Désastre UX.
 *
 * Après : si la fonction retourne un array vide (échec ou rate-limit), on
 * NE CACHE PAS et on retente au prochain hit. Le hero affiche un fallback
 * statique en attendant (cf. STATIC_TOP_MARKET_FALLBACK).
 */
const _cachedFetchTopMarket = unstable_cache(
  async (limit = 20) => _fetchTopMarket(limit),
  ["coingecko-top-market-v2"],
  // BATCH 50 — 120s -> 600s (10 min). Reduction x5 consumption.
  { revalidate: 600, tags: [CG_TAGS.market] }
);

export async function fetchTopMarket(limit = 20): Promise<MarketCoin[]> {
  const cached = await _cachedFetchTopMarket(limit);
  if (cached.length > 0) return cached;
  // Cache miss + API failure → bypass the cache by returning the static
  // fallback. Le wrapper SSR Hero détectera `length === 0` (technique :
  // notre fallback a length > 0 donc on couvre).
  return STATIC_TOP_MARKET_FALLBACK.slice(0, limit);
}

/**
 * Snapshot statique des top 6 cryptos — fallback ULTIME quand CoinGecko ET
 * notre aggregator (Binance + CoinCap) sont tous down/rate-limited.
 *
 * FIX P2 2026-05-06 — DÉDUP avec lib/price-source.ts STATIC_FALLBACK.
 * Avant : 6 coins dupliqués avec prix obsolètes (BTC=95000) incohérents
 * avec price-source.ts (BTC=78500). 2 sources de vérité = bugs visuels
 * possibles si l'utilisateur voit BTC=95k sur le hero et BTC=78.5k sur
 * sa fiche bitcoin (les 2 fallbacks ne s'aligneront jamais).
 *
 * Maintenant : prix alignés sur price-source.ts (mai 2026). Idéalement,
 * on devrait dériver ce fallback runtime depuis price-source.STATIC_FALLBACK
 * (single source of truth) ; à faire dans BATCH 52 (auto-update via KV
 * snapshot du dernier fetch réussi). Pour l'instant : alignement manuel.
 */
const STATIC_TOP_MARKET_FALLBACK: MarketCoin[] = [
  {
    id: "bitcoin",
    symbol: "BTC",
    name: "Bitcoin",
    image: "https://assets.coingecko.com/coins/images/1/large/bitcoin.png",
    currentPrice: 78500,
    marketCap: 1550000000000,
    marketCapRank: 1,
    totalVolume: 35000000000,
    priceChange1h: 0,
    priceChange24h: 0,
    priceChange7d: 0,
    sparkline7d: [],
    circulatingSupply: 19800000,
    ath: 108786,
  },
  {
    id: "ethereum",
    symbol: "ETH",
    name: "Ethereum",
    image: "https://assets.coingecko.com/coins/images/279/large/ethereum.png",
    currentPrice: 2320,
    marketCap: 280000000000,
    marketCapRank: 2,
    totalVolume: 18000000000,
    priceChange1h: 0,
    priceChange24h: 0,
    priceChange7d: 0,
    sparkline7d: [],
    circulatingSupply: 121000000,
    ath: 4878,
  },
  {
    id: "tether",
    symbol: "USDT",
    name: "Tether",
    image: "https://assets.coingecko.com/coins/images/325/large/Tether.png",
    currentPrice: 1.0,
    marketCap: 120000000000,
    marketCapRank: 3,
    totalVolume: 50000000000,
    priceChange1h: 0,
    priceChange24h: 0,
    priceChange7d: 0,
    sparkline7d: [],
    circulatingSupply: 120000000000,
    ath: 1.32,
  },
  {
    id: "binancecoin",
    symbol: "BNB",
    name: "BNB",
    image: "https://assets.coingecko.com/coins/images/825/large/bnb-icon2_2x.png",
    currentPrice: 600,
    marketCap: 90000000000,
    marketCapRank: 4,
    totalVolume: 1800000000,
    priceChange1h: 0,
    priceChange24h: 0,
    priceChange7d: 0,
    sparkline7d: [],
    circulatingSupply: 145000000,
    ath: 788,
  },
  {
    id: "solana",
    symbol: "SOL",
    name: "Solana",
    image: "https://assets.coingecko.com/coins/images/4128/large/solana.png",
    currentPrice: 145,
    marketCap: 68000000000,
    marketCapRank: 5,
    totalVolume: 3000000000,
    priceChange1h: 0,
    priceChange24h: 0,
    priceChange7d: 0,
    sparkline7d: [],
    circulatingSupply: 470000000,
    ath: 295,
  },
  {
    id: "ripple",
    symbol: "XRP",
    name: "XRP",
    image: "https://assets.coingecko.com/coins/images/44/large/xrp-symbol-white-128.png",
    currentPrice: 0.62,
    marketCap: 34000000000,
    marketCapRank: 6,
    totalVolume: 2500000000,
    priceChange1h: 0,
    priceChange24h: 0,
    priceChange7d: 0,
    sparkline7d: [],
    circulatingSupply: 57000000000,
    ath: 3.84,
  },
];

export function formatCompactUsd(value: number): string {
  if (!value) return "—";
  // Audit Block 1 26/04/2026 (Agent copy + GlobalMetricsBar) : audience FR,
  // donc formatage FR ("3,2 Bn $" au lieu de "$3.2T") + virgule décimale.
  // Le suffixe Bn (milliards) est plus parlant que T (trillion en US).
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "USD",
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}

/* ============================================================
 * Détail d'une coin (pour pages /cryptos/[slug])
 * ============================================================ */

export interface CoinDetail {
  id: string;
  symbol: string;
  name: string;
  image: string;
  currentPrice: number;
  priceChange24h: number;
  priceChange7d: number | null;
  marketCap: number;
  marketCapRank: number;
  totalVolume: number;
  circulatingSupply: number;
  totalSupply: number | null;
  maxSupply: number | null;
  ath: number;
  athDate: string | null;
  atl: number;
  atlDate: string | null;
  sparkline7d: number[];
}

/**
 * Shape interne CG /coins/markets (pour batch + per-id fallback).
 */
interface CGMarketsRow {
  id: string;
  symbol: string;
  name: string;
  image: string;
  market_cap: number | null;
  market_cap_rank: number | null;
  circulating_supply: number | null;
  total_supply: number | null;
  max_supply: number | null;
  ath: number | null;
  ath_date: string | null;
  atl: number | null;
  atl_date: string | null;
  sparkline_in_7d?: { price: number[] };
}

/**
 * BATCHED HYDRATE (FIX 2026-05-10 v7) — fetch 1 fois /coins/markets pour
 * les 100 IDs statiques en lot, cached 30min via unstable_cache.
 *
 * Pourquoi : les versions précédentes (v3-v6) faisaient 1 fetch CG par
 * crypto, ce qui saturait CG free 50/min lors de cold-start (100 fiches
 * crawlées simultanément). Résultat audit v6 : 0/100 ATH, 0/100 ATL.
 *
 * Nouvelle approche : 1 fetch CG /coins/markets?ids=ID1,ID2,...,ID100&per_page=100
 * couvre TOUS les détails statiques en 1 round-trip atomique. Cache 30min
 * → 2 fetch CG/heure au lieu de 100+. Sous le 50/min CG free trivialement.
 *
 * Ne couvre PAS les fiches LLM (~680) — celles-ci ont leur propre fallback
 * per-id dans _fetchCoinDetail (cache no-store + unstable_cache 30min).
 */
/**
 * KV key où le cron /api/cron/refresh-static-details stocke le batch
 * des 100 fiches statiques. Lu en priorité par _fetchCoinDetail avant
 * tout fallback CG live (qui est rate-limited en pratique).
 */
export const KV_STATIC_DETAILS_KEY = "cg-static-details:v1";

async function _fetchStaticDetailsBatch(): Promise<Record<string, CGMarketsRow>> {
  // FIX 2026-05-10 v10 — RETURN RECORD AU LIEU DE MAP : `unstable_cache`
  // sérialise via JSON, et Map devient `{}` à la lecture (audit v9 :
  // ath=14/100 alors que warmup Synthetix marchait — la 1re call avait
  // la Map en mémoire vivante, les 99 suivantes lisaient le cache JSON
  // qui était un objet vide). Record<string, ...> est nativement JSON.
  //
  // FIX 2026-05-10 v11 — TENTATIVE KV EN PREMIER. Le serveur Coolify
  // est régulièrement IP-banni par CG free (autres workloads spam CG
  // au point qu'on hit 429 sur curl direct depuis le container). Le
  // cron `refresh-static-details` pré-charge KV à fréquence basse
  // (4×/jour suffit pour ATH/ATL qui bougent peu). Lecture KV → cache
  // mémoire 30min → 0 fetch CG live nécessaire dans 99% des cas.
  try {
    const { getKv } = await import("@/lib/kv");
    const kv = getKv();
    if (!kv.mocked) {
      const cached = await kv.get<Record<string, CGMarketsRow>>(
        KV_STATIC_DETAILS_KEY,
      );
      if (cached && Object.keys(cached).length > 0) {
        return cached;
      }
    }
  } catch {
    // KV indispo → fallback CG live ci-dessous
  }

  // Lazy import pour éviter cycle de dépendance avec lib/cryptos.ts
  const [topData, gemsData] = await Promise.all([
    import("@/data/top-cryptos.json"),
    import("@/data/hidden-gems.json"),
  ]);
  const ids: string[] = [
    ...((topData as { default?: { topCryptos?: Array<{ coingeckoId: string }> } }).default?.topCryptos ?? []),
    ...((gemsData as { default?: { hiddenGems?: Array<{ coingeckoId: string }> } }).default?.hiddenGems ?? []),
  ]
    .map((c) => c.coingeckoId)
    .filter(Boolean);

  if (ids.length === 0) throw new Error("CG_BATCH_NO_IDS");

  const url = `${COINGECKO_BASE}/coins/markets?vs_currency=usd&ids=${ids.join(
    ",",
  )}&order=market_cap_desc&per_page=${Math.min(ids.length, 250)}&page=1&sparkline=true&price_change_percentage=24h,7d`;

  // FIX 2026-05-10 v8 — pas d'option `cache` ici : Next.js interdit
  // `cache: "no-store"` à l'intérieur d'un `unstable_cache` wrapper
  // (erreur "Dynamic server usage"). Le wrapper externe gère le cache
  // 30min, et Next ne cache que les responses 200 OK par défaut donc
  // les 429 transients ne sont pas empoisonnants.
  //
  // FIX 2026-05-10 v9 — THROW sur échec au lieu de return empty Map.
  // Audit v8 montrait ath=40/100 alors que CG était dispo : la map vide
  // était cachée 30min par unstable_cache, donc toutes les fiches
  // tombaient sur fallback per-id pendant 30min → spam CG → 429.
  // Solution : throw pour bypass cache, le caller catch et fallback.
  const res = await fetch(url, {
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) {
    throw new Error(`CG_BATCH_${res.status}`);
  }
  const json = (await res.json()) as CGMarketsRow[];
  const record: Record<string, CGMarketsRow> = {};
  for (const c of json) {
    if (c?.id) record[c.id] = c;
  }
  if (Object.keys(record).length === 0) {
    // Empty result = CG returned 200 but no data (rare). Throw to avoid
    // caching an empty record, which would force fallback per-id for 30min.
    throw new Error("CG_BATCH_EMPTY");
  }
  return record;
}

// FIX 2026-05-10 v12 — RETIRE unstable_cache wrapper.
// Symptôme : audit v11 montrait ath=63/100 alors que KV était bien
// peuplé (99/100 entries). Cause : `_fetchStaticDetailsBatch` THROW
// quand KV vide ET CG 429 (cas du cold start initial). `unstable_cache`
// cache aussi les throws pendant 30min → batch toujours vide même
// après peuplement KV.
//
// Solution : appel direct sans wrapper. Le KV read est ultra-rapide
// (~50ms via Upstash REST), pas besoin de cache mémoire process.
// Bénéfices : zéro empoisonnement cache, lecture KV à chaque request
// = données toujours fraîches dès le 1er hit après cron passage.
const _hydrateStaticDetailsBatch = _fetchStaticDetailsBatch;

async function _fetchCoinDetail(coingeckoId: string): Promise<CoinDetail | null> {
  // FIX 2026-05-06 BUILD PERF — Skip CoinGecko fallback au build-time.
  // Symptôme : `next build` SSG 100 fiches /cryptos/[slug] en parallèle ;
  // les coins absents de notre price-source (render-token, the-graph, etc.)
  // tombent sur CoinGecko free tier qui rate-limit après ~15 req/min.
  // Le retry exponentiel boucle 5.5s × 100 coins = build qui prend 13 min
  // avec des centaines de "429 (after retry)" dans les logs.
  //
  // Solution : au build (NEXT_PHASE === 'phase-production-build'), on
  // retourne null immédiatement pour les coins non couverts par
  // price-source. La page rendra avec les meta statiques (lib/crypto-static.ts)
  // et ISR hydratera les données dynamiques au premier request user. Côut
  // user : aucun (les fiches sont déjà cached à la 2e visite). Gain CI :
  // build 13 min → ~3 min.
  const isBuildPhase = process.env.NEXT_PHASE === "phase-production-build";

  // BATCH 51 — Migration price-source pour les 100 fiches /cryptos/[slug].
  // Avant : appel CoinGecko coins/markets pour CHAQUE fiche = 100+ calls
  // par jour minimum. Maintenant : Binance ticker + klines (gratuit
  // illimite). Fallback CoinGecko uniquement pour les coins absents
  // de Binance (rare pour le top 100 traite par notre site).
  try {
    const { getPriceSnapshot } = await import("@/lib/price-source");
    const snap = await getPriceSnapshot(coingeckoId);
    // BUG FIX 2026-05-03 audit live — accept TOUTE source avec priceUsd>0,
    // y compris static fallback. Avant : on skippait static et tombait sur
    // CoinGecko (epuise) -> "—" affiche sur la fiche. Le static fallback
    // contient des prix recents (snapshot manuel top 10), bien meilleur
    // qu'un null. Si CoinGecko aussi vide -> seulement la on retourne null.
    if (snap.priceUsd > 0) {
      // FIX 2026-05-10 P0 — Hydration CoinGecko pour snapshots de providers
      // non-CoinGecko (Binance/Kraken/Coinbase/KuCoin/DexScreener) qui ne
      // renvoient QUE price + volume (pas marketCap, supply, ATH, ATL,
      // sparkline). Sans hydration : 15 fiches affichent marketCap=0,
      // 100% des fiches ATH/ATL="—", 65 fiches sparkline vide.
      // Cache 30min sur l'hydrate, try/catch silencieux : si CG fail, on
      // retombe sur le snapshot bare (pas pire qu'avant).
      // FIX 2026-05-10 v3 — hydrate dès que marketCap manquant, peu importe
      // la source. Avant : on skippait si source === "coingecko" mais
      // /simple/price renvoie source=coingecko SANS marketCap (33 fiches
      // affectées : dai, ethena, gala, kaspa, io-net, immutable, ...).
      // Static fallback exclu car marketCap dérivé localement (déjà bon).
      //
      // FIX 2026-05-10 v5 (USER FEEDBACK Bonk avec ATH/ATL/sparkline manquants) —
      // suppression de la condition `snap.marketCap <= 0`. Raison : depuis
      // commit f2ba1d0 (hydrate L2 CryptoCompare batch dans price-source.ts),
      // le snap a marketCap > 0 grâce au batch CC, donc cette condition
      // n'était plus jamais vraie → 100/100 fiches sans ATH/ATL/sparkline7d
      // hydrate. Solution : hydrate TOUJOURS (sauf static/build), le cache
      // unstable_cache 30min limite à 1 fetch CG/crypto/30min = ~3.3/min en
      // moyenne pour 100 fiches simultanées (sous CG free 50/min limit).
      const needsHydration = snap.source !== "static" && !isBuildPhase;
      if (needsHydration) {
        // FIX 2026-05-10 v7 (BATCHED HYDRATE) — Audit v5 montrait 24/100 ATH OK,
        // v6 (cache:no-store) a chuté à 0/100 (race condition saturation CG).
        // Vraie solution : 1 SEUL fetch CG /coins/markets pour les 100 IDs
        // statiques d'un coup, cached 30min via unstable_cache externe.
        // Bénéfices : 2 fetch CG/heure au lieu de 100+, couverture 100%
        // atomique, zéro race condition, sous le 50/min CG free trivialement.
        //
        // FIX v9 : try/catch car _fetchStaticDetailsBatch throw maintenant
        // sur échec (bypass cache empty). Si throw → batchDetails reste
        // empty → fallback per-id en aval comme avant.
        // FIX v10 : Record au lieu de Map (Map non-JSON-sérialisable
        // casse le cache unstable_cache).
        let batchDetails: Record<string, CGMarketsRow> = {};
        try {
          batchDetails = await _hydrateStaticDetailsBatch();
        } catch {
          // CG batch failed — fallback per-id below
        }
        const c = batchDetails[coingeckoId];
        if (c) {
          return {
            id: c.id,
            symbol: c.symbol.toUpperCase(),
            name: c.name,
            image: c.image,
            currentPrice: snap.priceUsd, // garde le live du provider rapide
            priceChange24h: snap.change24h,
            priceChange7d: snap.change7d,
            marketCap: c.market_cap ?? 0,
            marketCapRank: c.market_cap_rank ?? 0,
            totalVolume: snap.volume24h,
            circulatingSupply: c.circulating_supply ?? 0,
            totalSupply: c.total_supply,
            maxSupply: c.max_supply,
            ath: c.ath ?? 0,
            athDate: c.ath_date,
            atl: c.atl ?? 0,
            atlDate: c.atl_date,
            sparkline7d: snap.sparkline7d?.length
              ? snap.sparkline7d
              : (c.sparkline_in_7d?.price ?? []),
          };
        }

        // Fallback per-id pour les IDs LLM (pas dans le batch statique).
        // FIX v8 — pas d'option cache ici : Next.js interdit cache:"no-store"
        // dans unstable_cache wrapper (erreur Dynamic server usage). Le
        // wrapper extérieur (getCachedCoinDetailFn 30min) gère le cache.
        const tryFetch = async (
          url: string,
          headers?: Record<string, string>,
        ): Promise<unknown> => {
          try {
            const r = await fetchWithRetry(url, {
              ...(headers ? { headers } : {}),
            });
            return r.ok ? await r.json() : null;
          } catch {
            return null;
          }
        };

        const cgUrl = `${COINGECKO_BASE}/coins/markets?vs_currency=usd&ids=${coingeckoId}&order=market_cap_desc&per_page=1&page=1&sparkline=true&price_change_percentage=24h,7d`;
        const cgData = (await tryFetch(cgUrl)) as Array<{
          id: string;
          symbol: string;
          name: string;
          image: string;
          market_cap: number | null;
          market_cap_rank: number | null;
          circulating_supply: number | null;
          total_supply: number | null;
          max_supply: number | null;
          ath: number | null;
          ath_date: string | null;
          atl: number | null;
          atl_date: string | null;
          sparkline_in_7d?: { price: number[] };
        }> | null;

        const cFb = cgData?.[0];
        if (cFb) {
          return {
            id: cFb.id,
            symbol: cFb.symbol.toUpperCase(),
            name: cFb.name,
            image: cFb.image,
            currentPrice: snap.priceUsd,
            priceChange24h: snap.change24h,
            priceChange7d: snap.change7d,
            marketCap: cFb.market_cap ?? 0,
            marketCapRank: cFb.market_cap_rank ?? 0,
            totalVolume: snap.volume24h,
            circulatingSupply: cFb.circulating_supply ?? 0,
            totalSupply: cFb.total_supply,
            maxSupply: cFb.max_supply,
            ath: cFb.ath ?? 0,
            athDate: cFb.ath_date,
            atl: cFb.atl ?? 0,
            atlDate: cFb.atl_date,
            sparkline7d: snap.sparkline7d?.length
              ? snap.sparkline7d
              : (cFb.sparkline_in_7d?.price ?? []),
          };
        }

        // 2. Fallback CoinPaprika — free 25K/mois sans key, sans rate limit minute.
        // Endpoint : /tickers/{coin_id} mais leurs IDs sont différents (ex: snx-synthetix).
        // On utilise /search?q={coingeckoId} d'abord pour trouver le coin_id.
        // Pragmatique : on récupère juste market_cap + supply + ATH/ATL.
        try {
          const search = (await tryFetch(
            `https://api.coinpaprika.com/v1/search?q=${snap.symbol}&c=currencies&limit=1`,
          )) as { currencies?: Array<{ id: string }> } | null;
          const cpId = search?.currencies?.[0]?.id;
          if (cpId) {
            const ticker = (await tryFetch(
              `https://api.coinpaprika.com/v1/tickers/${cpId}`,
            )) as {
              quotes?: { USD?: { market_cap?: number; ath_price?: number } };
              circulating_supply?: number;
              total_supply?: number;
              max_supply?: number;
              rank?: number;
            } | null;
            if (ticker?.quotes?.USD?.market_cap) {
              return {
                id: coingeckoId,
                symbol: snap.symbol,
                name: snap.name,
                image: "",
                currentPrice: snap.priceUsd,
                priceChange24h: snap.change24h,
                priceChange7d: snap.change7d,
                marketCap: ticker.quotes.USD.market_cap,
                marketCapRank: ticker.rank ?? 0,
                totalVolume: snap.volume24h,
                circulatingSupply: ticker.circulating_supply ?? 0,
                totalSupply: ticker.total_supply ?? null,
                maxSupply: ticker.max_supply ?? null,
                ath: ticker.quotes.USD.ath_price ?? 0,
                athDate: null,
                atl: 0,
                atlDate: null,
                sparkline7d: snap.sparkline7d ?? [],
              };
            }
          }
        } catch {
          /* fall-through to bare snapshot below */
        }
      }
      return {
        id: snap.id,
        symbol: snap.symbol,
        name: snap.name,
        // BUG FIX 2026-05-03 — image vide (CryptoLogo lookup local)
        image: "",
        currentPrice: snap.priceUsd,
        priceChange24h: snap.change24h,
        priceChange7d: snap.change7d,
        marketCap: snap.marketCap,
        marketCapRank: 0, // approximation — non critique sur fiche detail
        totalVolume: snap.volume24h,
        circulatingSupply: snap.marketCap > 0 && snap.priceUsd > 0 ? snap.marketCap / snap.priceUsd : 0,
        totalSupply: null,
        maxSupply: null,
        ath: 0,
        athDate: null,
        atl: 0,
        atlDate: null,
        sparkline7d: snap.sparkline7d,
      };
    }
    // Sinon (source=static = Binance + CoinCap ont fail), on tente
    // CoinGecko en fallback ultime.
  } catch {
    // Aggregator indisponible, fallback CoinGecko
  }

  // FIX 2026-05-06 — au build, on skip CoinGecko fallback. ISR hydratera.
  if (isBuildPhase) return null;

  // Endpoint /coins/markets en single-id : permet d'obtenir sparkline 7d + variations
  // sans payer le coût d'/coins/{id}/market_chart (10 000 datapoints).
  const url = `${COINGECKO_BASE}/coins/markets?vs_currency=usd&ids=${coingeckoId}&order=market_cap_desc&per_page=1&page=1&sparkline=true&price_change_percentage=24h,7d`;
  try {
    // Fix bug 2026-05-01 user feedback : "toutes les cryptos affichent —"
    // Cause : free tier CoinGecko (5-15 req/min) hit rate-limit avec 100 cryptos
    // → fetch retournait null, mis en cache 5 min, page cassée 5 min.
    // Solution : retry exponentiel sur 429 + headers x-cg-demo-api-key si défini
    // + bypass cache du `null` (cf. wrapper fetchCoinDetail plus bas).
    const res = await fetchWithRetry(url, {
      // BATCH 50 — 300s -> 1800s (30 min). Avec 100 fiches /cryptos/[slug]
      // sur free plan = consumption insoutenable. 30min reste acceptable
      // pour des donnees enrichies (ATH, supply) qui bougent rarement.
      next: { revalidate: 1800, tags: [cgCryptoTag(coingeckoId), CG_TAGS.market] },
      headers: cgHeaders(),
    });
    if (!res.ok) {
      console.warn(`[coingecko] fetchCoinDetail ${coingeckoId} → ${res.status} (after retry)`);
      throw new Error(`CoinGecko detail ${res.status}`);
    }
    const json = (await res.json()) as Array<{
      id: string;
      symbol: string;
      name: string;
      image: string;
      current_price: number;
      price_change_percentage_24h: number;
      price_change_percentage_7d_in_currency: number | null;
      market_cap: number;
      market_cap_rank: number;
      total_volume: number;
      circulating_supply: number;
      total_supply: number | null;
      max_supply: number | null;
      ath: number;
      ath_date: string | null;
      atl: number;
      atl_date: string | null;
      sparkline_in_7d: { price: number[] };
    }>;
    const c = json?.[0];
    if (!c) return null;
    return {
      id: c.id,
      symbol: c.symbol.toUpperCase(),
      name: c.name,
      image: c.image,
      currentPrice: c.current_price,
      priceChange24h: c.price_change_percentage_24h ?? 0,
      priceChange7d: c.price_change_percentage_7d_in_currency,
      marketCap: c.market_cap,
      marketCapRank: c.market_cap_rank,
      totalVolume: c.total_volume,
      circulatingSupply: c.circulating_supply,
      totalSupply: c.total_supply,
      maxSupply: c.max_supply,
      ath: c.ath,
      athDate: c.ath_date,
      atl: c.atl,
      atlDate: c.atl_date,
      sparkline7d: c.sparkline_in_7d?.price ?? [],
    };
  } catch {
    return null;
  }
}

/**
 * Détail enrichi d'une crypto (prix, sparkline 7j, supply, ATH/ATL).
 *
 * Cache stratégie 2-tiers (fix bug "toutes cryptos affichent —" 2026-05-01) :
 *  - Si data valide → cache 5 min (revalidate via tags si on touche au contenu)
 *  - Si null (rate-limit ou erreur API) → on NE CACHE PAS et on re-tente à
 *    chaque requête. Le retry exponentiel dans `_fetchCoinDetail` aura déjà
 *    fait 2 tentatives ; si toujours null, on accepte le coût d'un re-fetch
 *    plutôt que de bloquer 100 fiches pendant 5 min.
 *
 * Implémentation : on enveloppe le résultat caché dans un signal de version.
 * Si version=null on bypass le cache au prochain appel.
 *
 * Tag granulaire (#12 ETUDE-2026-05-02) : on attache un tag par-id
 * `coingecko:crypto:<id>` au wrapper `unstable_cache` ET au `fetch()` interne
 * pour que `revalidateTag("coingecko:crypto:bitcoin")` invalide les deux
 * couches d'un coup. La key cache reste partagée (clé `coingeckoId` en arg)
 * mais on fabrique un wrapper-par-id à la volée pour pouvoir injecter le tag
 * granulaire dans `unstable_cache.tags` (qui est statique par déclaration).
 */
const _coinDetailCacheRegistry = new Map<
  string,
  (id: string) => Promise<CoinDetail>
>();

function getCachedCoinDetailFn(
  coingeckoId: string,
): (id: string) => Promise<CoinDetail> {
  const existing = _coinDetailCacheRegistry.get(coingeckoId);
  if (existing) return existing;
  const fn = unstable_cache(
    async (id: string) => {
      const result = await _fetchCoinDetail(id);
      // Si null, on lève pour forcer Next à NE PAS cacher (un throw dans
      // unstable_cache propage l'erreur et invalide le cache pour cet appel).
      if (!result) {
        throw new Error("CG_FETCH_RETURNED_NULL");
      }
      return result;
    },
    // BUMP v2 → v3 — invalide tous les caches CoinDetail empoisonnés par
    // les itérations v3-v11 qui retournaient bare snapshots avec ATH=0.
    ["coingecko-coin-detail-v3", coingeckoId],
    // BATCH 50 — 300s -> 1800s (30 min)
    { revalidate: 1800, tags: [cgCryptoTag(coingeckoId), CG_TAGS.market] },
  );
  _coinDetailCacheRegistry.set(coingeckoId, fn);
  return fn;
}

export async function fetchCoinDetail(coingeckoId: string): Promise<CoinDetail | null> {
  try {
    const cachedFn = getCachedCoinDetailFn(coingeckoId);
    return await cachedFn(coingeckoId);
  } catch (err) {
    // Fallback : un dernier appel direct sans cache, pour qu'au moins la page
    // suivante puisse essayer de re-fetch fresh. Si ça échoue aussi → null.
    if (err instanceof Error && err.message === "CG_FETCH_RETURNED_NULL") {
      return null;
    }
    return _fetchCoinDetail(coingeckoId);
  }
}

/** Format compact pour les supplies (ex: 19.7M, 120B). */
export function formatCompactNumber(value: number | null | undefined): string {
  if (!value && value !== 0) return "—";
  return new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 2,
  }).format(value);
}
