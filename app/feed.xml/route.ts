/**
 * GET /feed.xml — flux RSS 2.0 du site : articles du blog + actualités, 50 entrées, du plus récent au plus ancien.
 *
 * Audit 03/10/2026 : aucun flux n'existait. Un flux sert aux lecteurs (Feedly, Inoreader…), aux agrégateurs crypto
 * francophones et aux moteurs (Bing découvre vite les nouvelles adresses par ce canal). Régénéré toutes les heures.
 */

import { getAllArticleSummaries } from "@/lib/mdx";
import { getAllNewsSummaries } from "@/lib/news-mdx";
import { BRAND } from "@/lib/brand";

export const revalidate = 3600;

const esc = (s: string): string =>
  String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

type Item = { title: string; link: string; description: string; date: Date; category: string; guid: string };

export async function GET(): Promise<Response> {
  const [articles, news] = await Promise.all([
    getAllArticleSummaries().catch(() => []),
    getAllNewsSummaries().catch(() => []),
  ]);
  const items: Item[] = [];
  for (const a of articles) {
    const d = new Date(a.lastUpdated || a.date);
    if (!a.slug || Number.isNaN(d.getTime())) continue;
    items.push({ title: a.title, link: `${BRAND.url}/blog/${a.slug}`, description: a.description, date: d, category: a.category || "Guide", guid: `${BRAND.url}/blog/${a.slug}` });
  }
  for (const n of news as Array<{ slug?: string; title: string; description: string; date?: string; pubDate?: string; category?: string }>) {
    const d = new Date(n.date || n.pubDate || "");
    if (!n.slug || Number.isNaN(d.getTime())) continue;
    items.push({ title: n.title, link: `${BRAND.url}/actualites/${n.slug}`, description: n.description, date: d, category: n.category ? `Actualité · ${n.category}` : "Actualité", guid: `${BRAND.url}/actualites/${n.slug}` });
  }
  items.sort((x, y) => y.date.getTime() - x.date.getTime());
  const top = items.slice(0, 50);
  const lastBuild = (top[0]?.date ?? new Date()).toUTCString();
  const xml =
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">\n<channel>\n` +
    `<title>${esc(BRAND.name)} — guides et actualités crypto</title>\n` +
    `<link>${BRAND.url}</link>\n` +
    `<description>${esc("Guides, comparatifs, fiscalité et actualités crypto en français, par Cryptoreflex.")}</description>\n` +
    `<language>fr-FR</language>\n` +
    `<lastBuildDate>${lastBuild}</lastBuildDate>\n` +
    `<atom:link href="${BRAND.url}/feed.xml" rel="self" type="application/rss+xml"/>\n` +
    top
      .map(
        (it) =>
          `<item>\n<title>${esc(it.title)}</title>\n<link>${esc(it.link)}</link>\n<guid isPermaLink="true">${esc(it.guid)}</guid>\n` +
          `<pubDate>${it.date.toUTCString()}</pubDate>\n<category>${esc(it.category)}</category>\n<description>${esc(it.description)}</description>\n</item>`,
      )
      .join("\n") +
    `\n</channel>\n</rss>\n`;
  return new Response(xml, {
    headers: { "Content-Type": "application/rss+xml; charset=utf-8", "Cache-Control": "public, max-age=0, s-maxage=3600, stale-while-revalidate=86400" },
  });
}
