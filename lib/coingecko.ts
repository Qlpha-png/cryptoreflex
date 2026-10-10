import { unstable_cache } from "next/cache";
// 06/10/2026 — imports de TYPES seulement (effacés à la compilation) : les modules de sources
// (CoinMarketCap, table de priorités, relais) sont chargés dynamiquement dans les fonctions serveur,
// pour ne rien ajouter au code envoyé au navigateur par les composants clients qui importent ce fichier.
import type { SourceName } from "@/lib/data-sources/priorities";
import type { FieldSources } from "@/lib/data-sources/market-fields";

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
  /** Heure ISO RÉELLE du relevé de ce prix (cache KV : fetchedAt du cron ; cascade : heure de la réponse de la place de
      marché ; CoinGecko : last_updated). Absente si inconnue. 08/10/2026 (lot fraîcheur A) : /api/prices en tire son
      `updatedAt` au lieu de l'heure de la réponse. */
  fetchedAt?: string;
  /** 08/10/2026 (lot Z2) : source réelle du prix (« coinmarketcap » quand il vient du relevé du robot R1). */
  source?: SourceName;
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
  // OPTIM 2026-05-10 — KV-back pour ticker home + autocomplete + portfolio.
  // Le cron refresh-ticker-prices stocke top 50 en KV toutes les 10 min.
  // Si tous les ids demandés sont en KV → 0 fetch live, ~50ms via Upstash.
  // Couvre 99% des hits ticker home (DEFAULT_COINS = top 6).
  //
  // FIX 2026-05-14 (Phase 2) — Pattern live + stale via lib/kv-ticker.
  // GH Actions cron `*/10 * * * *` ignore largement la fréquence (gaps
  // observés 65-246 min), donc fallback `cg-ticker-prices:stale:v1`
  // (TTL 6 h) couvre les périodes où le live est expiré.
  try {
    const { readTickerCache } = await import("@/lib/kv-ticker");
    const { record: cached, fetchedAt: tickerAt, provider } = await readTickerCache();
    if (Object.keys(cached).length > 0) {
      // Vérif : tous les ids demandés sont en KV (live ou stale)
      const allCached = ids.every((id) => cached[id]);
      if (allCached) {
        return ids.map((id) => {
          const c = cached[id];
          return {
            id: c.id as CoinId,
            symbol: c.symbol,
            name: c.name,
            price: c.price,
            change24h: c.change24h,
            marketCap: c.marketCap,
            image: c.image,
            ...(tickerAt ? { fetchedAt: tickerAt } : {}),
            ...(provider ? { source: provider } : {}),
          };
        });
      }
    }
  } catch {
    // KV indispo → fallback cascade live ci-dessous
  }

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
        // heure du relevé seulement pour un vrai prix (le secours « prix indisponible » porte l'heure de l'échec)
        ...(s.priceUsd > 0 && s.fetchedAt ? { fetchedAt: s.fetchedAt } : {}),
        ...(s.priceUsd > 0 && s.sources?.price ? { source: s.sources.price } : {}),
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
      last_updated?: string;
    }>;

    return json.map((c) => ({
      id: c.id,
      symbol: (COIN_META[c.id]?.symbol ?? c.symbol).toUpperCase(),
      name: COIN_META[c.id]?.name ?? c.name,
      price: c.current_price,
      change24h: c.price_change_percentage_24h ?? 0,
      marketCap: c.market_cap,
      image: c.image,
      ...(c.last_updated ? { fetchedAt: c.last_updated } : {}),
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
          ...(s.fetchedAt ? { fetchedAt: s.fetchedAt } : {}), // allWithPrice : tous ont un vrai prix ici
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
      last_updated?: string;
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
      ...(c.last_updated ? { fetchedAt: c.last_updated } : {}),
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
  if (!value || !Number.isFinite(value)) return "—";
  // FR-FR + suffixe « $ » (cohérent avec formatCompactUsd « X Md $ »). Décimales
  // adaptatives : 0 ≥1000, 2 ≥1, 4 ≥0,01, 8 sinon → un prix sub-cent (memecoin
  // à 0,0000045 $) ne s'affiche JAMAIS « 0,00 $ » (= faux/gratuit).
  const abs = Math.abs(value);
  const maxFrac = abs >= 1000 ? 0 : abs >= 1 ? 2 : abs >= 0.01 ? 4 : 8;
  return `${value.toLocaleString("fr-FR", { maximumFractionDigits: maxFrac })} $`;
}

export function formatPct(value: number): string {
  if (!Number.isFinite(value)) return "—";
  const sign = value >= 0 ? "+" : "";
  // FR-FR : virgule décimale + espace avant % (« +1,68 % », pas « +1.68% »).
  return `${sign}${value.toLocaleString("fr-FR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}\u00a0%`;
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
  /** 06/10/2026 — source réelle (« coinmarketcap », « coingecko » ou « top-sum ») pour l'attribution. */
  source?: SourceName;
  /** 08/10/2026 (lot Z2) — heure de la donnée (relevé du robot R1 pour CoinMarketCap). */
  asOf?: string;
}

/**
 * 08/10/2026 (lot Z2) — métriques globales écrites par le robot R1 (KV marche:global:v1, réponse « global-metrics » de
 * CoinMarketCap, une fois par heure). AUCUN appel CoinMarketCap depuis une page : c'est la MÊME valeur (capitalisation
 * totale, dominances) sur l'accueil, /marche et le bandeau. Absente ou de plus de 3 h → null (relais suivant).
 */
async function _globalFromKv(): Promise<GlobalMetrics | null> {
  const { readMarcheGlobal } = await import("@/lib/kv-ticker");
  const g = await readMarcheGlobal();
  if (!g) return null;
  return {
    totalMarketCapUsd: g.totalMarketCapUsd,
    totalVolume24hUsd: g.totalVolume24hUsd,
    btcDominance: g.btcDominance,
    ethDominance: g.ethDominance,
    marketCapChange24h: g.marketCapChange24h,
    activeCryptos: g.activeCryptos,
    asOf: g.asOf,
  };
}

async function _fetchGlobalMetrics(): Promise<GlobalMetrics | null> {
  // Ordre de DATA_PRIORITIES.global : relevé CoinMarketCap du robot R1 (KV) → CoinGecko /global → somme du top 200.
  // Relais automatique + disjoncteur ; tout en panne → null comme avant.
  const [{ resolveWithRelay }] = await Promise.all([import("@/lib/data-sources/resolve")]);
  const r = await resolveWithRelay<GlobalMetrics>(
    "global",
    {
      coinmarketcap: _globalFromKv,
      coingecko: _fetchGlobalFromCoingecko,
      "top-sum": _fetchGlobalFromTopSum,
    },
    {
      label: "métriques globales",
      channels: { coingecko: "coingecko-cle" },
      validate: (g) =>
        !(g.totalMarketCapUsd > 0) ? "capitalisation totale ≤ 0"
        : !(g.btcDominance > 0 && g.btcDominance < 100) ? "dominance BTC hors de ]0 ; 100["
        : !(g.ethDominance >= 0 && g.ethDominance < 100) ? "dominance ETH hors de [0 ; 100["
        : null,
    },
  );
  return r ? { ...r.value, source: r.source } : null;
}

/** BATCH 51 — métriques recalculées sur le top 200 (dernier relais). Lève une erreur si moins de 50 lignes. */
async function _fetchGlobalFromTopSum(): Promise<GlobalMetrics | null> {
  const { getTopMarket } = await import("@/lib/price-source");
  const top200 = await getTopMarket(200);
  if (top200.length < 50) throw new Error(`top 200 incomplet (${top200.length} lignes)`);
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

/** CoinGecko /global (avec la clé Demo si présente). Lève une erreur sur réponse non 200. */
async function _fetchGlobalFromCoingecko(): Promise<GlobalMetrics | null> {
  // FIX P0 2026-05-06 — timeout 8s
  const res = await fetch(`${COINGECKO_BASE}/global`, {
    next: { revalidate: 1800, tags: [CG_TAGS.global] },
    headers: cgHeaders(),
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = await res.json();
  const d = json?.data;
  if (!d?.total_market_cap?.usd) throw new Error("réponse incomplète");
  return {
    totalMarketCapUsd: d.total_market_cap.usd,
    totalVolume24hUsd: d.total_volume.usd,
    btcDominance: d.market_cap_percentage.btc,
    ethDominance: d.market_cap_percentage.eth,
    marketCapChange24h: d.market_cap_change_percentage_24h_usd,
    activeCryptos: d.active_cryptocurrencies,
  };
}

/**
 * 07/10/2026 — l'échec n'est plus mis en cache. Pendant `next build`, CoinMarketCap est coupé (cmcEnabled) et
 * CoinGecko répond 429 : la v1 gardait ce null 30 min, et /marche perdait ses 4 cartes après chaque déploiement.
 * Comme pour le top du marché, l'appel mis en cache LÈVE quand toutes les sources tombent : unstable_cache sert alors
 * le dernier relevé réussi (ou rien), et la première régénération à l'exécution passe par CoinMarketCap.
 */
const _cachedGlobalMetrics = unstable_cache(
  async (): Promise<GlobalMetrics> => {
    const g = await _fetchGlobalMetrics();
    if (!g) throw new Error("métriques globales : aucune source disponible");
    return g;
  },
  // v2 : la clé v1 contenait des null mis en cache pendant les builds.
  ["coingecko-global-v3"],
  // BATCH 50 — 300s -> 1800s (30 min)
  { revalidate: 1800, tags: [CG_TAGS.global] }
);

/** Dernier relevé réussi de CETTE instance (si le Data Cache lui-même ne répond pas). */
let _lastGlobalMetrics: GlobalMetrics | null = null;

export async function fetchGlobalMetrics(): Promise<GlobalMetrics | null> {
  try {
    _lastGlobalMetrics = await _cachedGlobalMetrics();
  } catch {
    // toutes les sources en panne et aucun relevé dans le Data Cache : dernier relevé de l'instance, sinon rien
  }
  return _lastGlobalMetrics;
}

export interface FearGreedData {
  value: number; // 0-100
  classification: string; // "Extreme Fear" | "Fear" | "Neutral" | "Greed" | "Extreme Greed"
  timestamp: string;
  /**
   * BATCH 29C — delta vs hier. Permet d'afficher "+3 vs hier" comme signal
   * de momentum. Null si la valeur d'hier est indisponible.
   */
  deltaVsYesterday?: number | null;
  /** 06/10/2026 — source réelle (« alternative-me » ou « coinmarketcap »). */
  source?: SourceName;
}

const FEAR_GREED_FR: Record<string, string> = {
  "Extreme Fear": "Peur extrême",
  Fear: "Peur",
  Neutral: "Neutre",
  Greed: "Cupidité",
  "Extreme Greed": "Cupidité extrême",
};

/**
 * Indice peur & avidité : alternative.me seul (DATA_PRIORITIES.fearGreed). `source` indique l'origine réelle.
 */
export async function fetchFearGreed(): Promise<FearGreedData | null> {
  // 08/10/2026 (lot Z2) : plus de relais CoinMarketCap depuis une page (lib/coinmarketcap.ts réservé aux robots).
  const { resolveWithRelay } = await import("@/lib/data-sources/resolve");
  const r = await resolveWithRelay<FearGreedData>(
    "fearGreed",
    {
      "alternative-me": _fetchFearGreedAlternative,
    },
    {
      label: "peur & avidité",
      validate: (d) => (Number.isFinite(d.value) && d.value >= 0 && d.value <= 100 ? null : `valeur hors de [0 ; 100] (${d.value})`),
    },
  );
  return r ? { ...r.value, source: r.source } : null;
}

async function _fetchFearGreedAlternative(): Promise<FearGreedData | null> {
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
  /** 06/10/2026 — source réelle de chaque champ (attribution, components/home/market-source.ts). */
  sources?: FieldSources;
  /** 06/10/2026 — heure du relevé servi (Data Cache) ; `stale` = relevé de plus de 45 min, « cours non à jour ». */
  asOf?: string;
  stale?: boolean;
}

/**
 * 06/10/2026 — ordre de DATA_PRIORITIES.topMarket : CoinMarketCap (classement de 200 en cache 15 min) →
 * CoinGecko /coins/markets (clé Demo, disjoncteur « coingecko-cle ») → agrégateur maison. Quand CMC fournit la
 * liste, CoinGecko sert de COMPLÉMENT (courbe 7 j, ATH, logo, capitalisation quand CMC la met à 0), avec le même
 * appel et le même cache qu'avant.
 * Ids (correctif du vérificateur) : une ligne CMC prend l'id du site par la table vérifiée (data/cmc-id-map.json) ;
 * sinon l'id CoinGecko de l'UNIQUE ligne du complément qui a exactement le même nom et le même symbole ; sinon
 * « cmc-<n> », qui n'ouvre aucune fiche et ne reçoit aucun complément. Jamais le slug CMC.
 * Tuiles : une ligne sans capitalisation (> 0) est écartée (jamais de tuile à 0) ; un logo vide est complété par le
 * logo local de l'id (lib/crypto-logos.ts), jamais par symbole (homonymes).
 */
/**
 * 08/10/2026 (lot Z2) — top N lu dans le relevé du robot R1 (KV, CoinMarketCap top 100). AUCUN appel CoinMarketCap
 * depuis une page. Relevé absent, venu de CoinGecko (CMC en panne) ou de plus de 3 h → null (relais suivant).
 * `asOf` = heure du relevé, gardée par _cachedFetchTopMarket (et non l'heure du rendu).
 */
async function _topFromKv(limit: number, unlinkedPrefix: string): Promise<{ rows: MarketCoin[]; asOf: string } | null> {
  const { readTickerCache } = await import("@/lib/kv-ticker");
  const t = await readTickerCache();
  if (t.source === "none" || t.provider !== "coinmarketcap" || !t.fetchedAt) return null;
  if (!(Date.now() - Date.parse(t.fetchedAt) < TOP_MARKET_STALE_AFTER_MS)) return null;
  const rows = Object.values(t.record)
    .filter((e) => e.price > 0)
    .sort((a, b) => (a.rank ?? Infinity) - (b.rank ?? Infinity))
    .slice(0, limit);
  if (rows.length === 0) return null;
  return { asOf: t.fetchedAt, rows: rows.map((q) => ({
    id: q.unlinked && !q.id.startsWith(unlinkedPrefix) ? `${unlinkedPrefix}${q.id}` : q.id,
    symbol: q.symbol,
    name: q.name,
    image: q.image ?? "",
    currentPrice: q.price,
    marketCap: q.marketCap ?? 0,
    marketCapRank: q.rank ?? 0,
    totalVolume: q.volume24h ?? 0,
    priceChange1h: q.change1h ?? null,
    priceChange24h: q.change24h ?? 0,
    priceChange7d: q.change7d ?? null,
    sparkline7d: [],
    circulatingSupply: q.circulatingSupply ?? 0,
    ath: 0,
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
  })) };
}

/** Top N + heure du relevé quand il vient du KV de R1 (null sinon : l'heure de la réponse est retenue). */
async function _fetchTopMarket(limit: number): Promise<{ coins: MarketCoin[]; asOf: string | null }> {
  const [{ resolveWithRelay }, { checkList }, health, cmc] = await Promise.all([
    import("@/lib/data-sources/resolve"),
    import("@/lib/data-sources/sanity"),
    import("@/lib/data-sources/health"),
    import("@/lib/coinmarketcap"),
  ]);
  const minRows = Math.min(limit, 10);
  const toCheck = (list: MarketCoin[]) =>
    list.map((c) => ({ priceUsd: c.currentPrice, marketCap: c.marketCap, change24h: c.priceChange24h, symbol: c.symbol }));
  let kvAsOf: string | null = null;
  const r = await resolveWithRelay<MarketCoin[]>(
    "topMarket",
    {
      coinmarketcap: async () => {
        const kv = await _topFromKv(limit, cmc.CMC_UNLINKED_PREFIX);
        kvAsOf = kv?.asOf ?? null;
        return kv?.rows ?? null;
      },
      coingecko: () => _fetchTopMarketCoingecko(limit),
      aggregator: () => _fetchTopMarketAggregator(limit),
    },
    {
      label: `top ${limit}`,
      validate: (list) => checkList(toCheck(list), minRows).reason,
      channels: { coingecko: health.CHANNELS.coingeckoKey },
    },
  );
  if (!r) return { coins: [], asOf: null };
  let rows = r.value.filter((c) => c.currentPrice > 0);
  if (r.source === "coinmarketcap") rows = await _complementCmcRows(rows, limit, cmc.CMC_UNLINKED_PREFIX);
  return { coins: await _finishTopRows(rows), asOf: r.source === "coinmarketcap" ? kvAsOf : null };
}

/** Clé de rapprochement STRICTE nom + symbole (casse ignorée, rien d'autre). */
const _nameSymbolKey = (name: string, symbol: string) => `${name.trim().toLowerCase()}|${symbol.trim().toUpperCase()}`;

/**
 * Complément CoinGecko des lignes CMC (même appel /coins/markets et même cache qu'avant, disjoncteur
 * « coingecko-cle »). Si CoinGecko est en panne ou mis de côté : courbes 7 j des lignes AVEC fiche via les
 * instantanés de l'agrégateur (klines Binance), comme l'ancien secours.
 */
async function _complementCmcRows(rows: MarketCoin[], limit: number, unlinkedPrefix: string): Promise<MarketCoin[]> {
  const health = await import("@/lib/data-sources/health");
  const channel = health.CHANNELS.coingeckoKey;
  let cg: MarketCoin[] = [];
  if (health.isAvailable(channel)) {
    try {
      cg = await _fetchTopMarketCoingecko(limit);
      health.recordSuccess(channel);
    } catch (err) {
      health.recordFailure(channel, `complément top ${limit} : ${err instanceof Error ? err.message : "erreur"}`);
    }
  }
  if (cg.length > 0) {
    const byId = new Map(cg.map((c) => [c.id, c]));
    // null = plusieurs lignes CoinGecko avec le même nom et le même symbole → aucun rapprochement.
    const byNameSymbol = new Map<string, MarketCoin | null>();
    for (const c of cg) {
      const k = _nameSymbolKey(c.name, c.symbol);
      byNameSymbol.set(k, byNameSymbol.has(k) ? null : c);
    }
    // Ids déjà portés par une ligne : un rapprochement nom + symbole ne peut JAMAIS les reprendre (id en double).
    const taken = new Set(rows.filter((c) => !c.id.startsWith(unlinkedPrefix)).map((c) => c.id));
    return rows.map((c) => {
      let row = c;
      if (c.id.startsWith(unlinkedPrefix)) {
        const m = byNameSymbol.get(_nameSymbolKey(c.name, c.symbol));
        // sans correspondance exacte, unique et libre : affichée sans lien de fiche ni complément
        if (!m || taken.has(m.id)) return c;
        taken.add(m.id);
        row = { ...c, id: m.id };
      }
      const g = byId.get(row.id);
      if (!g) return row;
      const sources: FieldSources = { ...row.sources };
      if (g.sparkline7d.length) sources.sparkline7d = "coingecko";
      if (g.ath > 0) sources.ath = "coingecko";
      const fillCap = !(row.marketCap > 0) && g.marketCap > 0;
      if (fillCap) {
        sources.marketCap = "coingecko";
        sources.circulatingSupply = "coingecko";
      }
      return {
        ...row,
        image: g.image || row.image,
        sparkline7d: g.sparkline7d.length ? g.sparkline7d : row.sparkline7d,
        ath: g.ath || row.ath,
        marketCap: fillCap ? g.marketCap : row.marketCap,
        circulatingSupply: fillCap ? g.circulatingSupply : row.circulatingSupply,
        sources,
      };
    });
  }
  try {
    const { getPriceSnapshot } = await import("@/lib/price-source");
    return await Promise.all(
      rows.map(async (c) => {
        if (c.id.startsWith(unlinkedPrefix)) return c;
        const snap = await getPriceSnapshot(c.id).catch(() => null);
        const spark = snap?.sparkline7d ?? [];
        return spark.length > 1 ? { ...c, sparkline7d: spark, sources: { ...c.sources, sparkline7d: "binance-klines" as SourceName } } : c;
      }),
    );
  } catch {
    return rows;
  }
}

/** Jamais de tuile à 0 : lignes sans capitalisation écartées, logo vide complété par le logo local de l'id. */
async function _finishTopRows(rows: MarketCoin[]): Promise<MarketCoin[]> {
  const { getCryptoLogo } = await import("@/lib/crypto-logos");
  return rows
    .filter((c) => c.currentPrice > 0 && c.marketCap > 0)
    .map((c) => (c.image ? c : { ...c, image: getCryptoLogo(c.id) ?? "" }));
}

/** Ancienne voie principale CoinGecko /coins/markets (clé Demo si présente). Lève une erreur si non 200. */
async function _fetchTopMarketCoingecko(limit: number): Promise<MarketCoin[]> {
  // BATCH 51 — Migration aggregator maison. CoinCap retourne deja le top
  // par market cap, on l'utilise en priorite. Fallback CoinGecko si vide.
  // INVERSION 2026-06-12 — depuis que COINGECKO_API_KEY existe, l'appel
  // direct CoinGecko (1 requête = prix + sparkline 7j + variations + ATH
  // réels) est STRICTEMENT meilleur que la voie aggregator (1+N requêtes,
  // sparklines via Binance — bloqué depuis les IP Vercel → le hero Pouls
  // ne recevait jamais la vraie courbe en prod). Aggregator = secours.
  const url = `${COINGECKO_BASE}/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=${limit}&page=1&sparkline=true&price_change_percentage=1h,24h,7d`;
  {
    // FIX P0 2026-05-06 — timeout 8s
    const res = await fetch(url, {
      // OPTIM 2026-05-10 — TTL 600s → 1800s (10min → 30min). Top market
      // change rarement (rang stable, prix accessoire vu Binance live).
      next: { revalidate: 1800, tags: [CG_TAGS.market] },
      headers: cgHeaders(),
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
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
      sources: {
        price: "coingecko",
        change1h: "coingecko",
        change24h: "coingecko",
        change7d: "coingecko",
        marketCap: "coingecko",
        rank: "coingecko",
        circulatingSupply: "coingecko",
        volume24h: "coingecko",
        sparkline7d: "coingecko",
      },
    }));
  }
}

/** SECOURS — aggregator maison (prix corrects mais sans sparkline/1h). Lève une erreur si la liste est trop courte. */
async function _fetchTopMarketAggregator(limit: number): Promise<MarketCoin[]> {
  {
    const { getTopMarket } = await import("@/lib/price-source");
    const top = await getTopMarket(limit);
    if (top.length < Math.min(limit, 10)) throw new Error(`liste trop courte (${top.length})`);
    {
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
            sources: {
              ...(c.sources ?? {}),
              ...(snap?.sparkline7d?.length ? { sparkline7d: "binance-klines" as SourceName } : {}),
            },
          };
        }),
      );
      return enriched;
    }
  }
  // aggregator down aussi : la relance lève une erreur, resolveWithRelay rend null → [] et le wrapper
  // fetchTopMarket sert le dernier relevé réussi avec son heure (jamais de prix figés), sinon une liste vide.
}

/** Relevé du top mis en cache (Data Cache de Next), avec son heure. */
export interface TopMarketEntry {
  coins: MarketCoin[];
  fetchedAt: string;
}

/**
 * 06/10/2026 — PLUS DE FILET FIGÉ (l'ancien STATIC_TOP_MARKET_FALLBACK affichait des prix de mai 2026 comme cours
 * actuels). Si toutes les sources tombent, l'appel mis en cache LÈVE une erreur : unstable_cache ne garde jamais
 * l'échec et continue de servir le DERNIER RELEVÉ RÉUSSI (stale-while-revalidate du Data Cache, partagé entre
 * instances ; Next 14.2 garde l'entrée périmée quand la revalidation échoue). fetchTopMarket marque alors ce relevé
 * « stale » avec son heure. Sans aucun relevé : liste vide, et chaque page masque le bloc (« momentanément
 * indisponibles »). Aucune écriture KV.
 */
const _cachedFetchTopMarket = unstable_cache(
  async (limit = 20): Promise<TopMarketEntry> => {
    const { coins, asOf } = await _fetchTopMarket(limit);
    if (coins.length === 0) throw new Error(`top ${limit} : aucune source disponible`);
    // 08/10/2026 (lot Z2) : heure du relevé du robot R1 quand le top vient du KV, sinon heure de la réponse.
    return { coins, fetchedAt: asOf ?? new Date().toISOString() };
  },
  // v4 (lot Z2) : top lu dans le relevé CoinMarketCap du robot R1 (KV) au lieu d'un appel CMC.
  ["top-market-v4"],
  // 08/10/2026 (lot Z2) : 600 s (le KV est réécrit toutes les 10 min ; plus aucun crédit CMC consommé ici).
  { revalidate: 600, tags: [CG_TAGS.market] }
);

/**
 * Au-delà, le relevé servi n'est plus « à jour » : il est affiché avec son heure (« cours non à jour »).
 * 3 h et non 45 min (vérification du 06/10/2026) : en marche NORMALE, une page régénérée toutes les heures (accueil,
 * revalidate 3600) reçoit le relevé du cache de 30 min tel qu'il était à la régénération précédente (unstable_cache
 * rend l'entrée périmée et recalcule en arrière-plan) : jusqu'à ~1 h 30 d'âge sans aucune panne. Seul un âge au-delà de
 * ce délai normal (cache 30 min + page 1 h + marge) signale vraiment des sources en panne.
 */
export const TOP_MARKET_STALE_AFTER_MS = 3 * 60 * 60_000;

/** Dernier relevé réussi de CETTE instance (si le Data Cache lui-même ne répond pas). */
const _lastTopMarket = new Map<number, TopMarketEntry>();

export function markTopMarketAge(entry: TopMarketEntry, now: number = Date.now()): MarketCoin[] {
  const age = now - Date.parse(entry.fetchedAt);
  const stale = !(age < TOP_MARKET_STALE_AFTER_MS);
  return entry.coins.map((c) => ({ ...c, asOf: entry.fetchedAt, stale }));
}

export async function fetchTopMarket(limit = 20): Promise<MarketCoin[]> {
  let entry: TopMarketEntry | null = null;
  try {
    entry = await _cachedFetchTopMarket(limit);
  } catch {
    entry = _lastTopMarket.get(limit) ?? null;
  }
  if (!entry || !Array.isArray(entry.coins) || entry.coins.length === 0) return [];
  _lastTopMarket.set(limit, entry);
  return markTopMarketAge(entry);
}

/**
 * Top du marché EN DIRECT seulement : un relevé ancien (« stale », > 45 min) est écarté. Pour les écrits datés du
 * jour (brief quotidien) : mieux vaut aucun cours qu'un cours ancien présenté comme actuel.
 */
export async function fetchFreshTopMarket(limit = 20): Promise<MarketCoin[]> {
  return (await fetchTopMarket(limit)).filter((m) => m.stale !== true);
}

/** Tests uniquement. */
export function __resetTopMarketMemoryForTests(): void {
  _lastTopMarket.clear();
}

export function formatCompactUsd(value: number | null | undefined): string {
  // Donnée manquante / nulle / invalide → fallback explicite (pas de "0,0 $US" trompeur)
  if (value == null || !Number.isFinite(value) || value <= 0) return "—";

  // Audit Block 1 26/04/2026 puis fix 19/05/2026 :
  // Intl.NumberFormat fr-FR notation:"compact" produit "1,5 Bn $US" pour 1.5e12.
  // Problème : "Bn" se lit "billion" (= milliard) par 95 % des lecteurs FR,
  // alors qu'ici Intl utilise "Bn" pour 1e12 (échelle longue). Confusion x1000.
  //
  // Fix : formatage custom explicite avec unités françaises sans ambiguïté :
  //   - "k $" pour milliers
  //   - "M $" pour millions
  //   - "Md $" pour milliards (1e9)
  //   - "T $" pour mille milliards / trillions (1e12)
  //
  // Audience FR comprend immédiatement "Md $" = milliards et "T $" = trillions.
  const formatNum = (n: number, digits = 1): string =>
    n.toLocaleString("fr-FR", { maximumFractionDigits: digits, minimumFractionDigits: 0 });

  if (value >= 1e12) return `${formatNum(value / 1e12, 2)} T $`;
  if (value >= 1e9) return `${formatNum(value / 1e9)} Md $`;
  if (value >= 1e6) return `${formatNum(value / 1e6)} M $`;
  if (value >= 1e3) return `${formatNum(value / 1e3)} k $`;
  return `${formatNum(value, 0)} $`;
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
  /**
   * 10/10/2026 (lot Z3) : date du premier point de l'archive maison quand l'ATH/ATL viennent d'elle (R3) ; l'affichage dit
   * alors « Plus haut depuis le JJ/MM/AAAA » au lieu de « sommet historique ». null/absent = source historique.
   */
  athDepuis?: string | null;
  sparkline7d: number[];
  /** 06/10/2026 — source réelle de chaque champ (attribution). */
  sources?: FieldSources;
}

/**
 * 06/10/2026 — capitalisation, rang et offre d'une fiche selon DATA_PRIORITIES : la valeur de l'instantané
 * gagne quand elle vient de CoinMarketCap (1re source) ; sinon CoinGecko / CoinPaprika (`other`) ; sinon
 * l'instantané (place de marché, estimation). Renvoie aussi la source réelle de chaque champ.
 */
export function _mergeSnapFields(
  snap: {
    marketCap: number;
    priceUsd: number;
    marketCapRank?: number;
    circulatingSupply?: number | null;
    sparkline7d?: number[];
    sources?: FieldSources;
  },
  other: { marketCap?: number | null; rank?: number | null; supply?: number | null } | null,
  otherSource: SourceName | null,
): { marketCap: number; marketCapRank: number; circulatingSupply: number; sources: FieldSources } {
  const sources: FieldSources = { ...(snap.sources ?? {}) };
  const pos = (v: number | null | undefined): v is number => typeof v === "number" && Number.isFinite(v) && v > 0;
  let marketCap = snap.marketCap;
  if (sources.marketCap !== "coinmarketcap" && pos(other?.marketCap) && otherSource) {
    marketCap = other!.marketCap as number;
    sources.marketCap = otherSource;
  }
  let marketCapRank = snap.marketCapRank ?? 0;
  if (sources.rank !== "coinmarketcap" && pos(other?.rank) && otherSource) {
    marketCapRank = other!.rank as number;
    sources.rank = otherSource;
  }
  let circulatingSupply = pos(snap.circulatingSupply)
    ? snap.circulatingSupply
    : snap.marketCap > 0 && snap.priceUsd > 0
      ? snap.marketCap / snap.priceUsd
      : 0;
  if (sources.circulatingSupply !== "coinmarketcap" && pos(other?.supply) && otherSource) {
    circulatingSupply = other!.supply as number;
    sources.circulatingSupply = otherSource;
  }
  if (otherSource) sources.ath = otherSource;
  if (otherSource === "coingecko" && !(snap.sparkline7d && snap.sparkline7d.length > 1)) sources.sparkline7d = "coingecko";
  return { marketCap, marketCapRank, circulatingSupply, sources };
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
  /** Lot Z3 : ATH/ATL lus dans l'archive maison depuis cette date (scripts/lib/archive-cours.mjs). */
  ath_depuis?: string | null;
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
  //
  // FIX 2026-05-10 v16 — INLINE KV fetch SANS `cache: "no-store"` car
  // lib/kv.ts utilise no-store qui force la page SSG à devenir dynamic
  // (erreur "Page changed from static to dynamic at runtime"). Inline
  // sans option cache : Next utilise default caching (acceptable car
  // KV peut servir données fraîches depuis cron 4×/jour, pas critique).
  // 06/10/2026 (chantier « KV un mois ») : PLUS de lecture de la clé v1 (lot unique de 3,1 Mo, ~95 % de la bande
  // passante Upstash, jamais mis en cache car au-dessus de la limite de 2 Mo du cache Vercel). Les fiches lisent les
  // 32 seaux v2 (lib/static-details-store.ts) ; cette fonction n'est plus que le repli CoinGecko en direct quand un
  // seau manque. La clé v1 n'est plus écrite : la relire servirait des données de plus en plus anciennes.

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

/**
 * Options du mode "rapide" (PERF 2026-10-02, pages /vs/[a]/[b]).
 *
 * Le fallback per-id (coin absent du batch KV `cg-static-details:v1`, ex.
 * polymesh) passait par `fetchWithRetry` : 3 tentatives, timeout 8 s chacune,
 * pauses 1,5 s + 4 s sur 429 — CoinGecko free répond 429 depuis les IP
 * Vercel → ~6 s de rendu bloquant à CHAQUE rendu (un 429 n'est jamais mis en
 * cache). En mode rapide : 1 seule tentative, timeout court, aucune pause.
 */
interface CoinDetailFetchOptions {
  fast?: boolean;
}
const FAST_FALLBACK_TIMEOUT_MS = 2500;

async function _fetchCoinDetail(
  coingeckoId: string,
  opts: CoinDetailFetchOptions = {},
): Promise<CoinDetail | null> {
  const fast = opts.fast === true;
  // Retries + timeout appliqués aux fallbacks réseau per-id (CG, CoinPaprika).
  const fallbackRetries = fast ? 0 : 2;
  const fallbackSignal = (): AbortSignal | undefined =>
    fast ? AbortSignal.timeout(FAST_FALLBACK_TIMEOUT_MS) : undefined;
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
      // FIX 2026-05-10 v17 — retire condition `source !== "static"`. Audit
      // v16 : top 10 (bitcoin, eth, bnb, cardano, ...) tous BAD ATH car
      // STATIC_FALLBACK les couvre → snap.source="static" → skip hydrate.
      // Le batch KV contient ATH/ATL pour ces 10 aussi (peuplé par cron),
      // donc on hydrate quand même, ATH/ATL meilleur que rien.
      //
      // FIX 2026-05-10 v18 — retire aussi `!isBuildPhase`. Top 10 est
      // pré-rendered SSG via generateStaticParams → au build time avec
      // isBuildPhase=true, le hydrate était skip → HTML pre-rendered
      // contient ATH=— et persiste jusqu'au prochain bust (rare). Le
      // KV read est ultra-rapide (~50ms × 10 builds = 500ms total),
      // surcoût build négligeable et garantit ATH/ATL au build comme
      // au runtime.
      const needsHydration = true;
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
          batchDetails = await (await import("@/lib/static-details-store")).staticDetailsBatchFor(coingeckoId, _hydrateStaticDetailsBatch); // 06/10/2026 : 32 seaux KV en cache au lieu du lot de 3,1 Mo (lib/static-details-store.ts)
        } catch {
          // CG batch failed — fallback per-id below
        }
        const c = batchDetails[coingeckoId];
        if (c) {
          const fusion = _mergeSnapFields(snap, { marketCap: c.market_cap, rank: c.market_cap_rank, supply: c.circulating_supply }, "coingecko");
          // Reprise Z3 (I1) : ATH/ATL (et courbe 7 j) lus dans l'archive maison (relevés CoinMarketCap, DexScreener, repli
          // CoinGecko mêlés) → aucune attribution à CoinGecko ; l'affichage dit « plus haut depuis le … ».
          if (c.ath_depuis) {
            delete fusion.sources.ath;
            if (!snap.sparkline7d?.length) delete fusion.sources.sparkline7d;
          }
          return {
            id: c.id,
            symbol: c.symbol.toUpperCase(),
            name: c.name,
            image: c.image,
            currentPrice: snap.priceUsd, // garde le live du provider rapide
            priceChange24h: snap.change24h,
            priceChange7d: snap.change7d,
            ...fusion,
            totalVolume: snap.volume24h,
            totalSupply: c.total_supply,
            maxSupply: c.max_supply,
            ath: c.ath ?? 0,
            athDate: c.ath_date,
            athDepuis: c.ath_depuis ?? null,
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
            const signal = fallbackSignal();
            const r = await fetchWithRetry(
              url,
              {
                ...(headers ? { headers } : {}),
                ...(signal ? { signal } : {}),
              },
              fallbackRetries,
            );
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
            ..._mergeSnapFields(snap, { marketCap: cFb.market_cap, rank: cFb.market_cap_rank, supply: cFb.circulating_supply }, "coingecko"),
            totalVolume: snap.volume24h,
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
                ..._mergeSnapFields(snap, { marketCap: ticker.quotes.USD.market_cap, rank: ticker.rank, supply: ticker.circulating_supply }, "coinpaprika"),
                totalVolume: snap.volume24h,
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
      // NOTE 2026-05-10 v19 reverted : fallback DB raw_data_snapshot
      // créait un import cycle (Heatmap client → coingecko → cryptos-db
      // → supabase/server → next/headers). Build webpack failed.
      // Les 31 fiches non-couvertes par KV ni CG retomberont sur bare
      // snapshot (acceptable, dégradation gracieuse pour long-tail).

      return {
        id: snap.id,
        symbol: snap.symbol,
        name: snap.name,
        // BUG FIX 2026-05-03 — image vide (CryptoLogo lookup local)
        image: "",
        currentPrice: snap.priceUsd,
        priceChange24h: snap.change24h,
        priceChange7d: snap.change7d,
        // 06/10/2026 — rang/offre de CoinMarketCap s'il les a fournis (avant : rang 0, offre = cap ÷ prix).
        ..._mergeSnapFields(snap, null, null),
        totalVolume: snap.volume24h,
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
    const fastSignal = fallbackSignal();
    const res = await fetchWithRetry(
      url,
      {
        // BATCH 50 — 300s -> 1800s (30 min). Avec 100 fiches /cryptos/[slug]
        // sur free plan = consumption insoutenable. 30min reste acceptable
        // pour des donnees enrichies (ATH, supply) qui bougent rarement.
        // OPTIM 2026-05-10 — 1800s -> 14400s (30min -> 4h). ATH/ATL bouge
        // ~jamais en 4h, et le cron refresh-static-details (1×/jour) garde
        // KV à jour. Cache 4h = fallback per-id quasi gratuit.
        next: { revalidate: 14400, tags: [cgCryptoTag(coingeckoId), CG_TAGS.market] },
        headers: cgHeaders(),
        ...(fastSignal ? { signal: fastSignal } : {}),
      },
      fallbackRetries,
    );
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
  // FIX 2026-05-10 v14/v15 — bypass getCachedCoinDetailFn (unstable_cache 30min).
  // Symptômes :
  //   - audit étendu v9-v13 : ATH=14-63/100 alors que KV peuplé 99/100
  //   - /api/diag-detail?id=gmx via fetchCoinDetail retourne ath=91.07 OK
  //   - /cryptos/gmx (page SSG) rend ATH=— même après bust path + tag market
  // Cause : le `unstable_cache` cached un OLD bare snapshot (ath=0) au build
  // time (isBuildPhase=true → skip hydrate), et le bust ne propage pas
  // toujours correctement à la page rendue.
  //
  // Solution : appel direct _fetchCoinDetail() sans cache wrapper. Le batch
  // hydrate lit KV (~50ms via Upstash REST), surcoût négligeable. La
  // page elle-même garde son ISR 1h via `export const revalidate = 3600`,
  // donc on ne hit pas KV à chaque request user (juste au revalidate).
  //
  // FIX v15 — wrap in try/catch : sans wrapper unstable_cache, les throws
  // de `_fetchStaticDetailsBatch` (CG_BATCH_429) propageaient jusqu'à
  // la page → 500 Internal Server Error. catch + return null = page
  // affiche fallback "Données indisponibles" au lieu de crasher.
  try {
    return await _fetchCoinDetail(coingeckoId);
  } catch {
    return null;
  }
}

/**
 * Détail crypto mis en cache PAR COIN et PAR JOUR (UTC) — pour les pages de
 * masse à faible fraîcheur requise (/vs/[a]/[b] : 4 950 URLs, revalidate 7 j).
 *
 * PERF 2026-10-02 — cause des rendus /vs à froid de 6-8 s : chaque rendu
 * relançait la chaîne réseau complète de fetchCoinDetail (×4 : 2 directs +
 * 2 dans getPairCorrelation7d, dont les fetchs internes sont forcés no-store
 * par unstable_cache) ; pour un coin absent du batch KV (ex. polymesh) elle
 * finissait sur CoinGecko per-id → 429 → pauses 1,5 s + 4 s, jamais mises en
 * cache. Ici :
 *  - 1 entrée Data Cache par coin et par jour, partagée par ses 99 duels →
 *    au plus ~100 calculs/jour au lieu d'un par rendu ;
 *  - mode `fast` : fallbacks per-id en 1 tentative, timeout 2,5 s ;
 *  - isolation de revalidation : les fetchs/caches internes (KV 60 s,
 *    getPriceSnapshot 300 s…) tournent dans le store copié par
 *    unstable_cache et ne font plus tomber la revalidation ISR de la page
 *    (60 s effectifs jusqu'ici malgré `revalidate = 604800`).
 * `revalidate` de l'entrée = 7 j (≥ celui de /vs : ne l'abaisse pas) ; la
 * fraîcheur vient de la clé jour.
 *
 * Donnée incomplète (null ou market cap ≤ 0 : KV/fournisseurs en panne au
 * moment du calcul) : JAMAIS mise en cache (nouvelle tentative au rendu
 * suivant) et la revalidation ISR de la page appelante est abaissée à
 * DEGRADED_PAGE_REVALIDATE_SEC — sinon un « — » figerait la page 7 jours.
 */
const COIN_DETAIL_DAILY_REVALIDATE_SEC = 604800;
const DEGRADED_PAGE_REVALIDATE_SEC = 3600;

/** Porte le résultat incomplet hors de unstable_cache sans le mettre en cache. */
class IncompleteCoinDetail extends Error {
  constructor(readonly detail: CoinDetail | null) {
    super("COIN_DETAIL_DAILY_INCOMPLETE");
  }
}

const _coinDetailDaily = unstable_cache(
  async (coingeckoId: string, _utcDay: number): Promise<CoinDetail> => {
    const result = await _fetchCoinDetail(coingeckoId, { fast: true });
    // Throw = rien n'est mis en cache → nouvelle tentative au prochain rendu.
    if (!result || !(result.marketCap > 0)) throw new IncompleteCoinDetail(result);
    return result;
  },
  ["coin-detail-daily-v1"],
  { revalidate: COIN_DETAIL_DAILY_REVALIDATE_SEC, tags: ["coin-detail-daily"] },
);

/**
 * Marqueur sans donnée : l'appeler abaisse la revalidation ISR de la route en
 * cours à DEGRADED_PAGE_REVALIDATE_SEC (Next 14 : min des unstable_cache
 * appelés). Utilisé seulement quand la donnée affichée est incomplète.
 */
const _degradedPageMarker = unstable_cache(
  async (): Promise<number> => DEGRADED_PAGE_REVALIDATE_SEC,
  ["coin-detail-degraded-marker-v1"],
  { revalidate: DEGRADED_PAGE_REVALIDATE_SEC },
);

export async function fetchCoinDetailDaily(
  coingeckoId: string,
): Promise<CoinDetail | null> {
  const utcDay = Math.floor(Date.now() / 86_400_000);
  try {
    return await _coinDetailDaily(coingeckoId, utcDay);
  } catch (err) {
    try {
      await _degradedPageMarker();
    } catch {
      /* le marqueur ne doit jamais casser le rendu */
    }
    return err instanceof IncompleteCoinDetail ? err.detail : null;
  }
}

/**
 * Format compact pour les supplies (ex: 19,7 M, 120 Md, 1,5 T).
 *
 * Fix 19/05/2026 : aligné sur formatCompactUsd, on n'utilise plus en-US (qui
 * produit "B" pour milliard — ambigu en FR où "B" se lit aussi billion =
 * mille milliards). On utilise les unités françaises explicites k/M/Md/T.
 */
export function formatCompactNumber(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "—";
  if (value === 0) return "0";
  const abs = Math.abs(value);
  const sign = value < 0 ? "-" : "";
  const fmt = (n: number, digits = 1) =>
    n.toLocaleString("fr-FR", { maximumFractionDigits: digits, minimumFractionDigits: 0 });
  if (abs >= 1e12) return `${sign}${fmt(abs / 1e12, 2)} T`;
  if (abs >= 1e9) return `${sign}${fmt(abs / 1e9)} Md`;
  if (abs >= 1e6) return `${sign}${fmt(abs / 1e6)} M`;
  if (abs >= 1e3) return `${sign}${fmt(abs / 1e3)} k`;
  return `${sign}${fmt(abs, 0)}`;
}
