/**
 * /analyses-techniques/<crypto>/historique.csv — archive complète des calculs publiés (lot L2, 08/10/2026).
 * Statique (5 fichiers, reconstruits à chaque déploiement) ; « ; » et décimales à virgule pour un tableur en français.
 */
import { TA_SLUGS, csvHistorique, getAnalyse } from "@/lib/analyses-techniques";

export const dynamic = "force-static";
export const dynamicParams = false;

export function generateStaticParams() {
  return TA_SLUGS.map((slug) => ({ slug }));
}

export function GET(_req: Request, { params }: { params: { slug: string } }): Response {
  const a = getAnalyse(params.slug);
  if (!a) return new Response("Introuvable", { status: 404 });
  return new Response(csvHistorique(a), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `inline; filename="analyse-technique-${a.slug}-historique.csv"`,
      "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
      "X-Robots-Tag": "noindex",
    },
  });
}
