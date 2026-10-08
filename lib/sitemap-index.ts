/**
 * lib/sitemap-index.ts — /sitemap-index.xml (lot fraîcheur A, 08/10/2026, audit n° 47).
 *
 * Avant : chaque plan enfant portait <lastmod> = l'heure de génération de l'index (new Date()), qui changeait à chaque
 * régénération et apprenait à Google à ignorer nos dates. Désormais : <lastmod> = date RÉELLE de l'entrée la plus récente
 * du plan enfant, et AUCUNE balise <lastmod> quand on ne la connaît pas (balise facultative dans le protocole).
 */
import { latestIso } from "@/lib/data-dates";

export interface SitemapIndexChild {
  loc: string;
  /** date réelle du changement le plus récent du plan enfant, null = inconnue (balise omise) */
  lastmod: string | null;
}

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export function xmlSitemapIndex(children: ReadonlyArray<SitemapIndexChild>): string {
  const items = children
    .map((c) => `  <sitemap>\n    <loc>${esc(c.loc)}</loc>\n${c.lastmod ? `    <lastmod>${esc(c.lastmod)}</lastmod>\n` : ""}  </sitemap>`)
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${items}\n</sitemapindex>\n`;
}

/** Date la plus récente des entrées d'un plan (MetadataRoute.Sitemap : lastModified Date ou chaîne, souvent absent). */
export function lastmodOfEntries(entries: ReadonlyArray<{ lastModified?: string | Date | null }>): string | null {
  return latestIso(entries.map((e) => (e.lastModified instanceof Date ? (Number.isFinite(e.lastModified.getTime()) ? e.lastModified.toISOString() : null) : e.lastModified ?? null)));
}

/** Plan des actus Google News : actus des 2 derniers jours seulement (même filtre que /sitemap-news.xml). */
export function lastmodOfNewsSitemap(news: ReadonlyArray<{ date: string }>, nowMs: number): string | null {
  const cutoff = nowMs - 2 * 24 * 60 * 60 * 1000;
  return latestIso(news.filter((n) => Number.isFinite(Date.parse(n.date)) && Date.parse(n.date) >= cutoff).map((n) => n.date));
}

/** Plan des articles + actus (/sitemap-articles.xml) : même champ que ses <lastmod> (lastUpdated ?? date, puis date). */
export function lastmodOfArticlesSitemap(
  articles: ReadonlyArray<{ date: string; lastUpdated?: string | null }>,
  news: ReadonlyArray<{ date: string }>,
): string | null {
  return latestIso([...articles.map((a) => a.lastUpdated ?? a.date), ...news.map((n) => n.date)]);
}
