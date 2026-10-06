/**
 * Source réelle des cours affichés sur l'accueil (06/10/2026, audit licences : l'attribution est obligatoire là où
 * les données s'affichent, et la source citée doit être celle qui a VRAIMENT servi).
 *
 * Depuis le relais CoinMarketCap (06/10/2026), chaque ligne de fetchTopMarket (lib/coingecko.ts) porte le champ
 * `sources` (source réelle de chaque champ : « coinmarketcap », « coingecko », « binance »…) et l'heure du relevé
 * (`asOf`, `stale` au-delà de 45 min). On LIT ces champs : plus aucune déduction d'après la forme des données
 * (l'ancienne règle « variation 1 h non nulle → CoinGecko » aurait étiqueté CoinGecko des cours CoinMarketCap).
 * Correcteur final (06/10/2026) : le navigateur remplace ensuite ces cours par le flux public de Binance
 * (lib/hooks/useLivePrices.ts, voie 0), puis par /api/prices en cas de panne ; le libellé le dit.
 */

import type { SourceName } from "@/lib/data-sources/priorities";
import { SOURCE_INFO, formatAsOf, sourceInfo, sourcesUsed } from "@/lib/data-sources/attribution";

export interface MarketSource {
  /** Source qui a donné le plus de prix au chargement. */
  primary: SourceName;
  /** Autres sources de prix présentes dans la liste. */
  others: SourceName[];
  /** Heure du relevé servi (ISO) et relevé ancien (« cours non à jour »). */
  asOf: string | null;
  stale: boolean;
}

export interface MarketShape {
  sources?: Partial<Record<string, SourceName>> | null;
  asOf?: string;
  stale?: boolean;
}

export function detectMarketSource(market: readonly MarketShape[]): MarketSource | null {
  if (market.length === 0) return null;
  const used = sourcesUsed(market, ["price"]);
  // Aucune source déclarée : on ne cite rien plutôt qu'une source fausse.
  if (used.length === 0) return null;
  const withAge = market.find((c) => typeof c.asOf === "string");
  return {
    primary: used[0],
    others: used.slice(1),
    asOf: withAge?.asOf ?? null,
    stale: market.some((c) => c.stale === true),
  };
}

export interface SourceLabel {
  /** Texte avant le lien (ou texte complet s'il n'y a pas de lien). */
  text: string;
  link: { label: string; href: string } | null;
  /** Précision affichée après le lien. */
  note: string | null;
}

export function priceSourceLabel(source: MarketSource | null): SourceLabel | null {
  if (source === null) return null;
  const info = sourceInfo(source.primary) ?? SOURCE_INFO.static;
  const base = "Cours : flux public de Binance dans votre navigateur ; au chargement :";
  const others = source.others.map((s) => SOURCE_INFO[s]?.label ?? s);
  const parts: string[] = [];
  if (others.length > 0) parts.push(`et ${others.join(", ")}`);
  if (source.stale && source.asOf) parts.push(`— dernier relevé le ${formatAsOf(source.asOf)} (cours non à jour)`);
  else parts.push("(relais automatique en cas de panne)");
  return {
    text: info.href ? base : `${base} ${info.label}`,
    link: info.href ? { label: info.label, href: info.href } : null,
    note: parts.join(" "),
  };
}
