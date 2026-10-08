/**
 * lib/marche-robot.ts — robot R1 « refresh-ticker-prices » (08/10/2026, lot Z2), appelé par
 * app/api/cron/refresh-ticker-prices (Vercel Cron toutes les 10 min).
 *
 * Écrivain UNIQUE des cours du top 100, de l'instantané de secours et des métriques globales :
 *  1. CoinMarketCap `listings/latest?limit=100&convert=USD` (1 crédit ; Basic = une seule devise par appel) ;
 *     CoinGecko /coins/markets SEULEMENT si CoinMarketCap échoue (clé absente, garde-fou du budget, panne) ;
 *  2. l'euro : taux de lib/fx.ts (BCE, sinon secours daté), écrit avec le relevé (« converti au taux du JJ/MM ») ;
 *  3. métriques globales CMC (1 crédit) au premier passage de chaque heure : UNE capitalisation totale et UNE dominance
 *     pour tout le site (accueil, /marche, bandeau) ;
 *  4. une seule commande MSET (bandeau + instantané de secours + global) puis la trace « dernier passage + résultat ».
 * Budget : 144 + 24 (+ 1 orchestrateur) crédits par jour, voir CMC_ROBOT_PLAN (lib/coinmarketcap.ts).
 */

import {
  CMC_UNLINKED_PREFIX,
  cmcEnabled,
  cmcGlobalMetrics,
  cmcListingsTop,
  cmcRowsWithSiteIds,
  type CmcTopRow,
} from "@/lib/coinmarketcap";
import { getCryptoLogo } from "@/lib/crypto-logos";
import { fiatPerUsd } from "@/lib/fx";
import {
  shouldRefreshGlobal,
  writeMarcheMset,
  type MarcheGlobal,
  type TickerCachePayload,
  type TickerEntry,
  type TickerFx,
  type TickerRecord,
  type TickerSourceName,
} from "@/lib/kv-ticker";

export const MARCHE_TOP_N = 100;
/** En dessous, le relevé est jugé incomplet et la source suivante est essayée. */
export const MARCHE_MIN_ROWS = 50;

const COINGECKO_MARKETS_URL = `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=${MARCHE_TOP_N}&page=1&sparkline=false&price_change_percentage=24h`;

/** Lignes CMC → bandeau. Une ligne sans fiche garde un id « cmc-<n> » (affichable, jamais liée). */
export function tickerFromCmc(rows: readonly CmcTopRow[]): TickerRecord {
  const out: TickerRecord = {};
  for (const r of rows) {
    if (!(r.priceUsd > 0)) continue;
    const id = r.siteId ?? `${CMC_UNLINKED_PREFIX}${r.cmcId}`;
    if (out[id]) continue;
    const e: TickerEntry = {
      id,
      symbol: r.symbol,
      name: r.name,
      image: r.siteId ? getCryptoLogo(r.siteId) ?? "" : "",
      price: r.priceUsd,
      change24h: r.change24h ?? 0,
      marketCap: r.marketCap ?? 0,
      rank: r.rank,
      volume24h: r.volume24h,
      change1h: r.change1h,
      change7d: r.change7d,
      circulatingSupply: r.circulatingSupply,
    };
    if (!r.siteId) e.unlinked = true;
    out[id] = e;
  }
  return out;
}

interface CGRow {
  id: string;
  symbol: string;
  name: string;
  image?: string;
  current_price?: number;
  market_cap?: number;
  market_cap_rank?: number;
  total_volume?: number;
  price_change_percentage_24h?: number;
  circulating_supply?: number;
}

export function tickerFromCoingecko(rows: readonly CGRow[]): TickerRecord {
  const out: TickerRecord = {};
  for (const c of rows) {
    if (!c?.id || !((c.current_price ?? 0) > 0)) continue;
    out[c.id] = {
      id: c.id,
      symbol: (c.symbol ?? "").toUpperCase(),
      name: c.name ?? c.id,
      image: c.image ?? "",
      price: c.current_price ?? 0,
      change24h: c.price_change_percentage_24h ?? 0,
      marketCap: c.market_cap ?? 0,
      rank: c.market_cap_rank ?? null,
      volume24h: c.total_volume ?? null,
      circulatingSupply: c.circulating_supply ?? null,
    };
  }
  return out;
}

async function releverCoingecko(fetchImpl: typeof fetch): Promise<TickerRecord> {
  const res = await fetchImpl(COINGECKO_MARKETS_URL, { cache: "no-store", signal: AbortSignal.timeout(15_000) });
  if (!res.ok) throw new Error(`CoinGecko HTTP ${res.status}`);
  const json = (await res.json()) as unknown;
  if (!Array.isArray(json)) throw new Error("CoinGecko : réponse illisible");
  return tickerFromCoingecko(json as CGRow[]);
}

function globalFromCmc(g: Awaited<ReturnType<typeof cmcGlobalMetrics>>, at: Date): MarcheGlobal | null {
  if (!g || !(g.totalMarketCapUsd > 0) || !(g.btcDominance > 0 && g.btcDominance < 100)) return null;
  return {
    totalMarketCapUsd: g.totalMarketCapUsd,
    totalVolume24hUsd: g.totalVolume24hUsd,
    btcDominance: g.btcDominance,
    ethDominance: g.ethDominance,
    marketCapChange24h: g.marketCapChange24h,
    activeCryptos: g.activeCryptos,
    asOf: g.lastUpdated && Number.isFinite(Date.parse(g.lastUpdated)) ? new Date(g.lastUpdated).toISOString() : at.toISOString(),
    source: "coinmarketcap",
  };
}

export interface ReleveMarche {
  ok: boolean;
  source: TickerSourceName | null;
  count: number;
  global: boolean;
  /** Raison courte de l'échec de CoinMarketCap quand CoinGecko a pris le relais (jamais de secret). */
  cmcErreur?: string;
  raison?: string;
  fetchedAt?: string;
  fx?: TickerFx;
}

/**
 * Un passage de R1. `forceGlobal` (?global=1) relève les métriques globales hors du premier passage de l'heure.
 * Ne lève jamais.
 */
export async function releverMarche(opts: { now?: () => Date; forceGlobal?: boolean; fetchImpl?: typeof fetch } = {}): Promise<ReleveMarche> {
  const now = opts.now ?? (() => new Date());
  const fetchImpl = opts.fetchImpl ?? fetch;
  let record: TickerRecord = {};
  let source: TickerSourceName | null = null;
  let cmcErreur: string | undefined;

  if (cmcEnabled()) {
    try {
      const rows = cmcRowsWithSiteIds(await cmcListingsTop()).slice(0, MARCHE_TOP_N);
      const r = tickerFromCmc(rows);
      if (Object.keys(r).length >= MARCHE_MIN_ROWS) {
        record = r;
        source = "coinmarketcap";
      } else cmcErreur = `classement incomplet (${Object.keys(r).length} lignes)`;
    } catch (e) {
      cmcErreur = (e instanceof Error ? e.message : "erreur").slice(0, 120);
    }
  } else cmcErreur = "clé CoinMarketCap absente";

  if (!source) {
    try {
      const r = await releverCoingecko(fetchImpl);
      if (Object.keys(r).length >= MARCHE_MIN_ROWS) {
        record = r;
        source = "coingecko";
      }
    } catch {
      /* rien d'autre : aucun basculement vers une source non prévue */
    }
  }
  if (!source) return { ok: false, source: null, count: 0, global: false, cmcErreur, raison: "aucune source n'a rendu le top 100" };

  // heure du relevé : prise juste après la réponse de la source
  const releve = now();
  const fx = await fiatPerUsd();
  const tickerFx: TickerFx = { eurPerUsd: fx.eur, date: fx.date, source: fx.source };

  let global: MarcheGlobal | null = null;
  if (source === "coinmarketcap" && (opts.forceGlobal || shouldRefreshGlobal(releve))) {
    global = globalFromCmc(await cmcGlobalMetrics().catch(() => null), releve);
  }

  const payload: TickerCachePayload = { prices: record, fetchedAt: releve.toISOString(), source, fx: tickerFx };
  const w = await writeMarcheMset(payload, global);
  const count = Object.keys(record).length;
  if (!w.ok) return { ok: false, source, count, global: false, cmcErreur, raison: "écriture KV refusée (MSET)", fetchedAt: payload.fetchedAt, fx: tickerFx };
  return { ok: true, source, count, global: global !== null, ...(source !== "coinmarketcap" ? { cmcErreur } : {}), fetchedAt: payload.fetchedAt, fx: tickerFx };
}
