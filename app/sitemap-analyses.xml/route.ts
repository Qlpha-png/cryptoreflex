/**
 * /sitemap-analyses.xml — plan des analyses techniques (lot L2 du regroupement, 08/10/2026) : le hub + les 5 pages
 * vivantes, et rien d'autre (les adresses datées redirigées n'y sont jamais). lastmod = horodatage RÉEL du dernier
 * calcul réussi de chaque page ; hub = le plus récent des 5. Déclaré dans /sitemap-index.xml.
 */
import { entreesPlanAnalyses, xmlPlanAnalyses } from "@/lib/analyses-plan";

export const dynamic = "force-static";

export function GET(): Response {
  return new Response(xmlPlanAnalyses(entreesPlanAnalyses()), {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
