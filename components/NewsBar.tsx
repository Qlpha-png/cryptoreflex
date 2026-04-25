import Link from "next/link";
import { Newspaper, ChevronRight } from "lucide-react";
import { getAggregatedNews, formatRelativeFr } from "@/lib/news-aggregator";

/**
 * NewsBar — bandeau "actualités fraîches" affiché sur la home, juste avant
 * le hero PriceTicker existant. Server Component pur.
 *
 * Pourquoi à cet emplacement ?
 *   - Statique (pas d'animation), donc pas d'impact LCP : le LCP de la home
 *     reste le H1 du Hero.
 *   - Densifie la perception "site vivant" sans cannibaliser le NewsTicker
 *     (articles internes) qui suit immédiatement après.
 *
 * Failover :
 *   - Si aucun item n'est récupéré (toutes les sources HS), on ne rend rien
 *     plutôt qu'un bandeau vide.
 */
export default async function NewsBar() {
  const news = await getAggregatedNews(3);
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
        <ul
          role="list"
          className="flex-1 flex items-center gap-3 overflow-x-auto scrollbar-thin"
        >
          {news.map((item) => (
            <li key={item.link} className="list-none shrink-0">
              <a
                href={item.link}
                target="_blank"
                rel="noopener nofollow"
                className="group inline-flex items-center gap-2 text-[13px] text-fg/85
                           hover:text-fg transition-colors duration-fast
                           focus:outline-none focus-visible:ring-2 focus-visible:ring-primary
                           focus-visible:ring-offset-2 focus-visible:ring-offset-elevated rounded"
              >
                <span className="text-[10px] uppercase tracking-wider text-muted/80 font-mono shrink-0">
                  {item.source}
                </span>
                <span className="text-fg/85 group-hover:text-fg max-w-[40ch] truncate">
                  {item.title}
                </span>
                <span className="text-[11px] text-muted/70 shrink-0">
                  · {formatRelativeFr(item.pubDate)}
                </span>
              </a>
            </li>
          ))}
        </ul>
        <Link
          href="/actualites"
          className="hidden md:inline-flex items-center gap-1 shrink-0 text-[11px] font-semibold text-primary-soft hover:text-primary-glow transition-colors"
        >
          Voir tout
          <ChevronRight className="h-3 w-3" aria-hidden="true" />
        </Link>
      </div>
    </section>
  );
}
