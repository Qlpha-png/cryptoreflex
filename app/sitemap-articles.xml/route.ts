/**
 * /sitemap-articles.xml — Sitemap dédié aux articles éditoriaux (blog + news).
 * Les leçons de l'académie n'y figurent plus (canonical → /blog), ni les analyses
 * techniques (08/10/2026 : /sitemap-analyses.xml).
 *
 * Pourquoi un sitemap dédié ?
 *  - Crawl-budget : Google priorise différemment articles vs pages outils.
 *  - Permet de signaler `<image:image>` pour chaque article (cover) → éligible
 *    Google Images carousel pour les requêtes informationnelles.
 *  - `<lastmod>` granulaire = signal de fraîcheur précis (vs `now` global).
 *
 * À cumuler avec /sitemap.xml (qui contient encore TOUT pour rétrocompat) —
 * mais à terme on pourra retirer les articles du sitemap.xml principal.
 *
 * Doc images : https://developers.google.com/search/docs/crawling-indexing/sitemaps/image-sitemaps
 */

import { getAllArticleSummaries } from "@/lib/mdx";
import { getAllNewsSummaries } from "@/lib/news-mdx";
import { BRAND } from "@/lib/brand";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || BRAND.url;

export const dynamic = "force-static";
export const revalidate = 600; // 10 min — tolère un léger délai post-publication

function xmlEscape(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

interface Entry {
  loc: string;
  lastmod: string;
  changefreq: "daily" | "weekly" | "monthly";
  priority: number;
  imageLoc?: string;
  imageTitle?: string;
}

export async function GET(): Promise<Response> {
  /* ------------------------------------------------------------------ */
  /*  1. Blog articles                                                  */
  /* ------------------------------------------------------------------ */
  const blogArticles = await getAllArticleSummaries();
  const blogEntries: Entry[] = blogArticles.map((a) => ({
    loc: `${SITE_URL}/blog/${a.slug}`,
    lastmod: new Date(a.lastUpdated ?? a.date).toISOString(),
    changefreq: "monthly",
    priority: 0.7,
    imageLoc: a.cover ? `${SITE_URL}${a.cover}` : undefined,
    imageTitle: a.title,
  }));

  /* ------------------------------------------------------------------ */
  /*  2. News                                                           */
  /* ------------------------------------------------------------------ */
  const newsItems = await getAllNewsSummaries();
  const newsEntries: Entry[] = newsItems.map((n) => ({
    loc: `${SITE_URL}/actualites/${n.slug}`,
    lastmod: new Date(n.date).toISOString(),
    changefreq: "monthly",
    priority: 0.6,
    imageLoc: n.image ? `${SITE_URL}${n.image}` : undefined,
    imageTitle: n.title,
  }));

  /* ------------------------------------------------------------------ */
  /*  3. Analyses TA — RETIRÉES le 08/10/2026 (lot L2 du regroupement)   */
  /* ------------------------------------------------------------------ */
  // Les 368 analyses datées sont devenues 5 pages vivantes : elles ne sont listées que dans /sitemap-analyses.xml
  // (les anciennes adresses répondent 301 et ne doivent plus être soumises).

  /* ------------------------------------------------------------------ */
  /*  4. Académie (leçons) — RETIRÉES le 2026-10-02 (audit SEO)         */
  /* ------------------------------------------------------------------ */
  // /academie/<parcours>/<slug> sert le même MDX que /blog/<slug> et déclare
  // un canonical vers /blog/<slug> (déjà listé en 1.) : soumettre ces ~120
  // doublons envoyait un signal contradictoire (« URL soumise non canonique »).

  const allEntries = [...blogEntries, ...newsEntries];

  const items = allEntries
    .map((e) => {
      const imgBlock = e.imageLoc
        ? `    <image:image>
      <image:loc>${xmlEscape(e.imageLoc)}</image:loc>
      <image:title>${xmlEscape(e.imageTitle ?? "")}</image:title>
    </image:image>\n`
        : "";

      return `  <url>
    <loc>${xmlEscape(e.loc)}</loc>
    <lastmod>${e.lastmod}</lastmod>
    <changefreq>${e.changefreq}</changefreq>
    <priority>${e.priority}</priority>
${imgBlock}  </url>`;
    })
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
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
