/**
 * lib/data-sources/attribution.ts — Attribution des données affichées (06/10/2026).
 *
 * Règle : la source citée est celle qui a VRAIMENT servi, lue dans le champ `sources` des données
 * (PriceSnapshot.sources, MarketCoin.sources, CoinDetail.sources…), avec le lien de cette source.
 * Jamais de « CoinGecko » écrit en dur. Module pur, sans appel réseau : utilisable côté navigateur.
 */

import type { SourceName } from "./priorities";

export interface SourceInfo {
  label: string;
  href: string | null;
}

export const SOURCE_INFO: Readonly<Record<SourceName, SourceInfo>> = {
  coinmarketcap: { label: "CoinMarketCap", href: "https://coinmarketcap.com/" },
  coingecko: { label: "CoinGecko", href: "https://www.coingecko.com/" },
  binance: { label: "Binance", href: "https://www.binance.com/" },
  "binance-klines": { label: "Binance", href: "https://www.binance.com/" },
  kraken: { label: "Kraken", href: "https://www.kraken.com/" },
  coinbase: { label: "Coinbase", href: "https://www.coinbase.com/" },
  kucoin: { label: "KuCoin", href: "https://www.kucoin.com/" },
  dexscreener: { label: "DEX Screener", href: "https://dexscreener.com/" },
  cryptocompare: { label: "CryptoCompare", href: "https://www.cryptocompare.com/" },
  coinpaprika: { label: "CoinPaprika", href: "https://coinpaprika.com/" },
  "alternative-me": { label: "alternative.me", href: "https://alternative.me/crypto/fear-and-greed-index/" },
  estimate: { label: "estimation Cryptoreflex", href: null },
  aggregator: { label: "places de marché", href: null },
  "top-sum": { label: "calcul Cryptoreflex", href: null },
  exchange: { label: "place de marché", href: null },
  static: { label: "dernier relevé enregistré", href: null },
};

/** Lien de la page peur & avidité de chaque source possible. */
export const FEAR_GREED_INFO: Readonly<Partial<Record<SourceName, SourceInfo>>> = {
  "alternative-me": SOURCE_INFO["alternative-me"],
  coinmarketcap: { label: "CoinMarketCap", href: "https://coinmarketcap.com/charts/fear-and-greed-index/" },
};

export function sourceInfo(source: SourceName | null | undefined): SourceInfo | null {
  return source && Object.prototype.hasOwnProperty.call(SOURCE_INFO, source) ? SOURCE_INFO[source] : null;
}

type WithSources = { sources?: Partial<Record<string, SourceName>> | null };

/**
 * Sources réellement utilisées par une liste, de la plus utilisée à la moins utilisée, sans doublon de libellé
 * (binance et binance-klines = « Binance »). `fields` limite aux champs voulus (par défaut : tous).
 */
export function sourcesUsed(items: readonly WithSources[], fields?: readonly string[]): SourceName[] {
  const count = new Map<SourceName, number>();
  for (const it of items) {
    const s = it.sources;
    if (!s) continue;
    for (const [field, src] of Object.entries(s)) {
      if (!src || (fields && !fields.includes(field))) continue;
      count.set(src, (count.get(src) ?? 0) + 1);
    }
  }
  const ordered = [...count.entries()].sort((a, b) => b[1] - a[1]).map(([s]) => s);
  const seen = new Set<string>();
  return ordered.filter((s) => {
    const label = SOURCE_INFO[s]?.label ?? s;
    if (seen.has(label)) return false;
    seen.add(label);
    return true;
  });
}

/** Libellés des sources réelles d'UN champ (ex. « CoinMarketCap, CoinGecko » pour marketCap) ; "" si aucune. */
export function fieldSourcesLabel(items: readonly WithSources[], field: string): string {
  return sourcesUsed(items, [field])
    .map((s) => SOURCE_INFO[s]?.label ?? s)
    .join(", ");
}

/**
 * 08/10/2026 (lot Z2) — heure d'un relevé pour « Cours : CoinMarketCap, relevé à HH:MM » : « 21:40 » le jour même
 * (heure de Paris), sinon « le 6 octobre à 21:40 ». "" si l'heure est illisible.
 */
export function formatReleve(iso: string, now: number = Date.now()): string {
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return "";
  const jour = (t: Date) => t.toLocaleDateString("fr-FR", { timeZone: "Europe/Paris" });
  const heure = d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Paris" });
  return jour(d) === jour(new Date(now)) ? `à ${heure}` : `le ${formatAsOf(iso)}`;
}

/**
 * Texte « Cours : CoinMarketCap, relevé à 21:40 » à partir des lignes réellement servies (source du champ `price`, heure
 * `asOf`). "" sans source connue : rien n'est affiché plutôt qu'un libellé deviné.
 */
export function coursSourceTexte(
  items: readonly (WithSources & { asOf?: string })[],
  now: number = Date.now(),
  prefixe = "Cours :",
): string {
  const labels = sourcesUsed(items, ["price"]).map((s) => SOURCE_INFO[s]?.label ?? s);
  if (labels.length === 0) return "";
  const asOf = items.find((c) => typeof c.asOf === "string")?.asOf;
  const heure = asOf ? formatReleve(asOf, now) : "";
  return `${prefixe} ${labels.join(", ")}${heure ? `, relevé ${heure}` : ""}`;
}

/** « 6 octobre à 21:40 » (heure de Paris). */
export function formatAsOf(iso: string): string {
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return "";
  return d.toLocaleString("fr-FR", { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Paris" });
}
