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
 * 08/10/2026 (lot fraîcheur A, audit n° 47) : <lastmod> = date RÉELLE de l'entrée la plus récente de chaque plan enfant,
 * omis quand elle est inconnue (avant : l'heure de génération de l'index sur les 3 premiers plans).
 *
 * Doc : https://www.sitemaps.org/protocol.html#index
 */

import { BRAND } from "@/lib/brand";
import { dernierCalculGlobal } from "@/lib/analyses-techniques";
import { getAllArticleSummaries } from "@/lib/mdx";
import { getAllNewsSummaries } from "@/lib/news-mdx";
import { lastmodOfArticlesSitemap, lastmodOfEntries, lastmodOfNewsSitemap, xmlSitemapIndex } from "@/lib/sitemap-index";
import sitemap from "@/app/sitemap";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || BRAND.url;

export const dynamic = "force-static";
export const revalidate = 3600; // 1h — même rythme que /sitemap.xml

export async function GET(): Promise<Response> {
  const [principal, articles, news] = await Promise.all([
    // le plan principal lui-même (mêmes entrées que /sitemap.xml) ; en cas d'échec : balise omise, jamais « maintenant »
    sitemap().then(lastmodOfEntries).catch((e: unknown) => {
      console.warn("[sitemap-index] plan principal illisible : lastmod omis", e instanceof Error ? e.message : e);
      return null;
    }),
    getAllArticleSummaries().catch(() => null),
    getAllNewsSummaries().catch(() => null),
  ]);

  // Liste exhaustive des sitemaps enfants. Pour ajouter un nouveau type
  // (ex : sitemap-videos.xml), créer la route puis l'ajouter ici.
  const xml = xmlSitemapIndex([
    { loc: `${SITE_URL}/sitemap.xml`, lastmod: principal },
    // filtre « 2 derniers jours » identique à /sitemap-news.xml (Date.now() sert de borne, pas de date publiée)
    { loc: `${SITE_URL}/sitemap-news.xml`, lastmod: news ? lastmodOfNewsSitemap(news, Date.now()) : null },
    { loc: `${SITE_URL}/sitemap-articles.xml`, lastmod: articles && news ? lastmodOfArticlesSitemap(articles, news) : null },
    // Lot L2 (08/10/2026) : hub + 5 analyses vivantes ; lastmod = vrai horodatage du dernier calcul réussi.
    { loc: `${SITE_URL}/sitemap-analyses.xml`, lastmod: dernierCalculGlobal() ?? null },
  ]);

  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
