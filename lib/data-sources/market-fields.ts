/**
 * lib/data-sources/market-fields.ts — Données d'ensemble d'une crypto, champ par champ (06/10/2026).
 *
 * Le PRIX vient de la cascade des places de marché (lib/price-providers). Les autres champs suivent leur propre
 * ordre dans DATA_PRIORITIES (variations, capitalisation, rang, offre, volume) : CoinMarketCap Basic d'abord,
 * CoinGecko en relais, puis les valeurs de la place de marché, l'estimation et CryptoCompare (comme avant).
 * Chaque source n'est appelée qu'une fois (paresseusement) et seulement si un champ en a besoin.
 * Chaque champ renvoie la source RÉELLEMENT utilisée (attribution exacte).
 */

import { DATA_PRIORITIES, type DataKind, type SourceName } from "./priorities";
import { trySource } from "./resolve";
import type { HealthChannel } from "./health";
import { checkQuote } from "./sanity";
import type { CryptoMeta, ProviderPriceData } from "@/lib/price-providers/types";

export interface MarketFields {
  change1h: number | null;
  change24h: number | null;
  change7d: number | null;
  marketCap: number | null;
  rank: number | null;
  circulatingSupply: number | null;
  volume24h: number | null;
}

export type MarketFieldKey = keyof MarketFields;

/** Source réelle de chaque donnée affichée (à lire pour l'attribution : « Données : CoinMarketCap », etc.). */
export type FieldSources = Partial<Record<MarketFieldKey | "price" | "sparkline7d" | "ath", SourceName>>;

const FIELD_KIND: Record<MarketFieldKey, DataKind> = {
  change1h: "change1h",
  change24h: "change24h",
  change7d: "change7d",
  marketCap: "marketCap",
  rank: "rank",
  circulatingSupply: "supply",
  volume24h: "volume24h",
};

type SourceRecord = Partial<MarketFields> & { priceUsd?: number | null };

export interface LiveQuote {
  /** Source qui a donné le prix (binance, kraken, coinmarketcap, coingecko…). */
  source: SourceName;
  priceUsd: number;
  data: Partial<ProviderPriceData>;
  /** Variation 7 j calculée sur les klines (Binance), si disponible. */
  change7dFromKlines?: number | null;
}

/** Fonctions d'appel injectables (tests). */
export interface MarketFieldDeps {
  cmc?: (id: string) => Promise<SourceRecord | null>;
  coingecko?: (id: string) => Promise<SourceRecord | null>;
  estimate?: (id: string, priceUsd: number) => number;
  cryptocompare?: (id: string) => Promise<number | null>;
  /**
   * Champs que chaque source sait fournir. Une source n'est appelée que pour un champ qu'elle couvre ET qui manque
   * encore : quand CMC a tout donné, CoinGecko n'est pas appelé du tout (06/10/2026, correctif du vérificateur).
   */
  coverage?: Partial<Record<SourceName, readonly MarketFieldKey[]>>;
  /** Disjoncteur (usage) de chaque source, ex. coingecko → « coingecko-public » (/simple/price sans clé). */
  channels?: Partial<Record<SourceName, HealthChannel>>;
}

function valid(field: MarketFieldKey, v: unknown): v is number {
  if (typeof v !== "number" || !Number.isFinite(v)) return false;
  if (field === "marketCap" || field === "circulatingSupply" || field === "volume24h" || field === "rank") return v > 0;
  return true;
}

const AGGREGATORS: ReadonlySet<SourceName> = new Set(["coinmarketcap", "coingecko"]);

export async function resolveMarketFields(
  meta: CryptoMeta,
  live: LiveQuote,
  deps: MarketFieldDeps = {},
): Promise<{ fields: MarketFields; sources: FieldSources }> {
  const id = meta.coingeckoId;

  // Valeurs de la place de marché (ou de l'agrégateur) qui a donné le prix.
  const exchangeRecord: SourceRecord = {
    change24h: live.data.change24h ?? null,
    volume24h: live.data.volume24h ?? null,
    marketCap: live.data.marketCap ?? null,
    change7d: live.change7dFromKlines ?? live.data.change7d ?? null,
    change1h: live.data.change1h ?? null,
    circulatingSupply: live.data.circulatingSupply ?? null,
    rank: live.data.rank ?? null,
  };

  const fetchers: Partial<Record<SourceName, () => Promise<SourceRecord | null>>> = {
    exchange: async () => exchangeRecord,
  };
  if (live.source === "coinmarketcap") fetchers.coinmarketcap = async () => ({ ...exchangeRecord, priceUsd: live.priceUsd });
  else if (deps.cmc) {
    const cmc = deps.cmc;
    fetchers.coinmarketcap = () => cmc(id);
  }
  if (live.source === "coingecko") fetchers.coingecko = async () => ({ ...exchangeRecord, priceUsd: live.priceUsd });
  else if (deps.coingecko) {
    const cg = deps.coingecko;
    fetchers.coingecko = () => cg(id);
  }
  if (deps.estimate) {
    const est = deps.estimate;
    fetchers.estimate = async () => ({ marketCap: est(id, live.priceUsd) || null });
  }
  if (deps.cryptocompare && live.source !== "static" && live.source !== "cryptocompare") {
    const cc = deps.cryptocompare;
    fetchers.cryptocompare = async () => ({ marketCap: await cc(id) });
  }

  // Chaque source : appelée au plus une fois, contrôlée (cohérence + écart au prix en direct), santé suivie.
  const cache = new Map<SourceName, Promise<SourceRecord | null>>();
  const recordOf = (source: SourceName): Promise<SourceRecord | null> => {
    const hit = cache.get(source);
    if (hit) return hit;
    const fn = fetchers[source];
    const p: Promise<SourceRecord | null> = !fn
      ? Promise.resolve(null)
      : AGGREGATORS.has(source) && source !== live.source
        ? trySource(source, fn, {
            channel: deps.channels?.[source] ?? source,
            label: id,
            subjectId: id,
            validate: (rec) =>
              checkQuote({ ...rec, priceUsd: rec.priceUsd ?? live.priceUsd, symbol: meta.symbol }, { livePriceUsd: live.priceUsd }),
          }).then((r) => (r && "value" in r ? r.value : null))
        : fn().catch(() => null);
    cache.set(source, p);
    return p;
  };

  // La source qui a donné le prix compte comme « exchange » ; on attribue son vrai nom.
  const realName = (source: SourceName): SourceName => (source === "exchange" ? live.source : source);

  const fields: MarketFields = {
    change1h: null,
    change24h: null,
    change7d: null,
    marketCap: null,
    rank: null,
    circulatingSupply: null,
    volume24h: null,
  };
  const sources: FieldSources = { price: live.source };

  for (const field of Object.keys(FIELD_KIND) as MarketFieldKey[]) {
    for (const source of DATA_PRIORITIES[FIELD_KIND[field]]) {
      if (!fetchers[source]) continue;
      const covers = source === live.source ? undefined : deps.coverage?.[source];
      if (covers && !covers.includes(field)) continue; // la source ne fournit pas ce champ : inutile de l'appeler
      const rec = await recordOf(source);
      const v = rec?.[field];
      if (valid(field, v)) {
        fields[field] = v;
        sources[field] = realName(source);
        break;
      }
    }
  }
  if (exchangeRecord.change7d != null && sources.change7d === live.source && live.change7dFromKlines != null) {
    sources.change7d = "binance-klines";
  }
  return { fields, sources };
}
