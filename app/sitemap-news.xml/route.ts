/**
 * /sitemap-news.xml — Sitemap dédié Google News.
 *
 * Format spécifique : namespace `news:publication` + restriction stricte aux
 * articles publiés dans les **2 derniers jours** (Google News ignore au-delà).
 *
 * Pourquoi un sitemap séparé ?
 *  - Google News a des contraintes différentes du sitemap classique :
 *    fréquence de crawl ultra-rapide, format restreint, max 1000 URLs.
 *  - Mélanger news et evergreen dans le même sitemap pollue le crawl.
 *
 * Éligibilité Google News : il faut d'abord soumettre le site dans Google
 * Publisher Center (https://publishercenter.google.com/). Tant que ce n'est
 * pas fait, ce sitemap reste valide mais ne sert que pour Bing News +
 * crawlers tiers (Yandex News, etc.).
 *
 * Doc : https://developers.google.com/search/docs/crawling-indexing/sitemaps/news-sitemap
 */

import { getAllNewsSummaries } from "@/lib/news-mdx";
import { BRAND } from "@/lib/brand";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || BRAND.url;

export const dynamic = "force-dynamic"; // News volatiles, pas de cache statique
export const revalidate = 600; // 10 min, cohérent avec ISR /actualites

/**
 * Échappe les caractères XML interdits dans les valeurs (titres, descriptions).
 * Critique : un seul `&` non-échappé = sitemap invalide rejet 100% par Google.
 */
function xmlEscape(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export async function GET(): Promise<Response> {
  const news = await getAllNewsSummaries();

  // Google News ignore les articles > 2 jours → on filtre côté serveur pour
  // garder un sitemap court et frais. La constante 2 est un standard Google.
  const TWO_DAYS_MS = 2 * 24 * 60 * 60 * 1000;
  const cutoff = Date.now() - TWO_DAYS_MS;

  const recentNews = news.filter((n) => {
    const ts = new Date(n.date).getTime();
    return Number.isFinite(ts) && ts >= cutoff;
  });

  const items = recentNews
    .map((n) => {
      const url = `${SITE_URL}/actualites/${n.slug}`;
      // `publication_date` doit être au format ISO 8601 — n.date est "YYYY-MM-DD"
      // ou ISO complet. On normalise.
      const pubDate = new Date(n.date).toISOString();

      // BLOCK 11 fix (Agent /actualites audit P1) : ajout <lastmod> standard
      // sitemap. Google News pondère freshness via <news:publication_date>,
      // mais Bing News + crawlers tiers (Yandex News) lisent <lastmod>. Sans
      // ce signal, fraîcheur sous-estimée hors écosystème Google.
      return `  <url>
    <loc>${xmlEscape(url)}</loc>
    <lastmod>${pubDate}</lastmod>
    <news:news>
      <news:publication>
        <news:name>${xmlEscape(BRAND.name)}</news:name>
        <news:language>fr</news:language>
      </news:publication>
      <news:publication_date>${pubDate}</news:publication_date>
      <news:title>${xmlEscape(n.title)}</news:title>
${n.keywords && n.keywords.length > 0 ? `      <news:keywords>${xmlEscape(n.keywords.join(", "))}</news:keywords>\n` : ""}    </news:news>
  </url>`;
    })
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">
${items}
</urlset>
`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, s-maxage=600, stale-while-revalidate=3600",
    },
  });
}
