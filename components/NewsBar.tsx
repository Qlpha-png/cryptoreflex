import { Newspaper, ChevronRight } from "lucide-react";
import Link from "next/link";
import { getAggregatedNews } from "@/lib/news-aggregator";
import NewsBarRotator from "@/components/NewsBarRotator";

/**
 * NewsBar — bandeau "actualités fraîches" affiché sur la home.
 *
 * Architecture :
 *  - Server Component (ce fichier) : fetch RSS + SSR HTML initial.
 *  - Délégue le rendu interactif (rotation 5s + fade) à <NewsBarRotator>
 *    qui est un Client Component léger.
 *
 * Pourquoi cette séparation ?
 *  - Audit Block 1 RE-AUDIT 26/04/2026 (Agent dynamism +0.3) : la rotation
 *    automatique d'1 item à la fois (toutes les 5s) renforce la sensation
 *    "ça vient de tomber, c'est temps réel" — pattern Bloomberg / Reuters.
 *  - Le SSR garde l'item #0 visible immédiatement (0 hydration mismatch,
 *    0 LCP impact, 0 CLS). Le rotator prend la main au mount.
 *
 * Failover :
 *  - Si aucun item, on ne rend rien plutôt qu'un bandeau vide.
 */
export default async function NewsBar() {
  // 5 items au lieu de 3 pour donner plus de matière à la rotation.
  const news = await getAggregatedNews(5);
  if (!news || news.length === 0) return null;

  return (
    <section
      role="region"
      aria-label="Dernières actualités externes"
      className="border-b border-border/60 bg-elevated/40"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-2.5 flex items-center gap-3">
        <span className="hidden sm:inline-flex items-center gap-1.5 shrink-0 text-[10px] font-semibold uppercase tracking-wider text-primary-soft">
          <Newspaper className="h-3 w-3" aria-hidden="true" />
          News FR
        </span>
        {/* NewsBarRotator : rotation 5s + fade, SSR-safe (premier item visible
            sans JS). Audit content : text-fg/60 au lieu de text-muted/70 pour
            contraste WCAG AA sur fond elevated (4.7:1 → 7.2:1). */}
        <NewsBarRotator news={news} />
        <Link
          href="/actualites"
          className="hidden md:inline-flex items-center gap-1 shrink-0 text-[11px] font-semibold text-primary-soft hover:text-primary-glow transition-colors min-h-[36px]"
        >
          Voir tout
          <ChevronRight className="h-3 w-3" aria-hidden="true" />
        </Link>
      </div>
    </section>
  );
}
