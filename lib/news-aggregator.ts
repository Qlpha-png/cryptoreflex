/**
 * News aggregator — agrège les flux RSS curatés (lib/rss.ts), trie par date
 * desc, dédoublonne par lien et limite au top N (30 par défaut).
 *
 * Cache `unstable_cache` 30 min, tag `news-aggregated` — invalidable depuis
 * un endpoint cron (V2) via `revalidateTag("news-aggregated")`.
 */
import { unstable_cache } from "next/cache";
import { fetchRssFeed, RSS_SOURCES, type RssItem } from "@/lib/rss";

export interface NewsItem extends RssItem {
  /** Slug stable de la source (ex "cryptoast") — utilisé pour le filtre UI. */
  brand: string;
}

export const NEWS_TAG = "news-aggregated" as const;

/** Lookup map source affichée → brand slug (pour la NewsItem). */
const BRAND_BY_NAME: Map<string, string> = new Map(
  RSS_SOURCES.map((s) => [s.name, s.brand])
);

async function _getAggregatedNews(limit = 30): Promise<NewsItem[]> {
  // Fetch parallèle de toutes les sources — chaque source est déjà tolérante
  // à l'erreur (retourne `[]` en failover) donc Promise.all ne rejette pas.
  const results = await Promise.all(
    RSS_SOURCES.map((s) => fetchRssFeed(s.url, s.name))
  );

  const merged: NewsItem[] = results.flatMap((items, idx) => {
    const src = RSS_SOURCES[idx];
    return items.map((it) => ({
      ...it,
      brand: BRAND_BY_NAME.get(src.name) ?? src.brand,
    }));
  });

  // Dédoublonnage par lien canonique — certaines sources républient
  // ponctuellement les mêmes URLs (sponso etc.).
  const seen = new Set<string>();
  const deduped: NewsItem[] = [];
  for (const item of merged) {
    const key = item.link.split("?")[0].replace(/\/$/, "");
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(item);
  }

  // Tri date desc — items sans pubDate valide partent en fin de liste.
  deduped.sort((a, b) => {
    const ta = a.pubDate ? Date.parse(a.pubDate) : 0;
    const tb = b.pubDate ? Date.parse(b.pubDate) : 0;
    return tb - ta;
  });

  return deduped.slice(0, limit);
}

/**
 * API publique cachée. `limit` 30 par défaut — la page `/actualites` consomme
 * la totalité, le bandeau home n'en consomme que 3.
 */
export const getAggregatedNews = (limit = 30) =>
  unstable_cache(
    async () => _getAggregatedNews(limit),
    ["news-aggregated", String(limit)],
    { revalidate: 1800, tags: [NEWS_TAG] }
  )();

/* -------------------------------------------------------------------------- */
/* Helpers UI                                                                 */
/* -------------------------------------------------------------------------- */

/**
 * Format relatif FR ("il y a 2 h", "il y a 3 jours", "12 mars 2026").
 * Au-delà de 7 jours on bascule sur un format absolu pour rester stable
 * d'une heure à l'autre (et compatible SSR).
 */
export function formatRelativeFr(iso: string, now: number = Date.now()): string {
  if (!iso) return "";
  const then = Date.parse(iso);
  if (Number.isNaN(then)) return "";

  const diffSec = Math.max(1, Math.round((now - then) / 1000));
  const rtf = new Intl.RelativeTimeFormat("fr-FR", { numeric: "auto" });

  if (diffSec < 60)            return rtf.format(-diffSec, "second");
  const diffMin = Math.round(diffSec / 60);
  if (diffMin < 60)            return rtf.format(-diffMin, "minute");
  const diffH = Math.round(diffMin / 60);
  if (diffH < 24)              return rtf.format(-diffH, "hour");
  const diffD = Math.round(diffH / 24);
  if (diffD < 7)               return rtf.format(-diffD, "day");

  return new Date(then).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
