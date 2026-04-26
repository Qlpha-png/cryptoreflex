/**
 * /sitemap-index.xml — Sitemap index pointant vers tous les sitemaps secondaires.
 *
 * Pourquoi un sitemap index ?
 *  - Sépare les types de contenu (statique vs news vs articles) → Google peut
 *    crawler chaque section à la fréquence appropriée.
 *  - Le sitemap-news.xml a un format spécifique (Google News namespace) qui
 *    ne peut PAS coexister avec un sitemap classique → impose la séparation.
 *  - Préserve la limite de 50k URLs / 50 MB par sitemap (on en est loin mais
 *    architecture future-proof pour quand /actualites passera à 1k+ news/an).
 *
 * Le sitemap principal `/sitemap.xml` (généré par `app/sitemap.ts`) reste
 * déclaré ici comme un sitemap parmi les autres. Le robots.txt référence
 * `/sitemap-index.xml` (point d'entrée unique pour les crawlers).
 *
 * Doc : https://www.sitemaps.org/protocol.html#index
 */

import { BRAND } from "@/lib/brand";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || BRAND.url;

export const dynamic = "force-static";
export const revalidate = 3600; // 1h — changements rares (ajout d'un nouveau type de sitemap)

export async function GET(): Promise<Response> {
  const now = new Date().toISOString();

  // Liste exhaustive des sitemaps enfants. Pour ajouter un nouveau type
  // (ex : sitemap-videos.xml), créer la route puis l'ajouter ici.
  const sitemaps = [
    { loc: `${SITE_URL}/sitemap.xml`, lastmod: now },
    { loc: `${SITE_URL}/sitemap-news.xml`, lastmod: now },
    { loc: `${SITE_URL}/sitemap-articles.xml`, lastmod: now },
  ];

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${sitemaps
  .map(
    (s) => `  <sitemap>
    <loc>${s.loc}</loc>
    <lastmod>${s.lastmod}</lastmod>
  </sitemap>`,
  )
  .join("\n")}
</sitemapindex>
`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
