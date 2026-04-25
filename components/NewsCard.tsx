import { ExternalLink } from "lucide-react";
import type { NewsItem } from "@/lib/news-aggregator";
import { formatRelativeFr } from "@/lib/news-aggregator";

/**
 * NewsCard — carte compacte d'un article RSS agrégé.
 *
 * Comportement :
 *  - Lien externe `target="_blank"` + `rel="noopener nofollow"` (compliance :
 *    on n'envoie pas de jus SEO vers les concurrents, et `noopener` limite la
 *    fuite `window.opener`).
 *  - Badge source coloré par marque (cohérence visuelle avec les chips filtre).
 *  - Date relative ("il y a 2 h") en bas.
 *  - Titre h3 cliquable, hover lift + ring focus visible.
 *
 * Server Component pur (zéro état). La couleur du badge est dérivée
 * statiquement de `brand` — pas besoin d'interactivité.
 */

interface Props {
  item: NewsItem;
}

/** Styles tailwind pré-générés par marque (évite la classe dynamique non purgée). */
const BRAND_BADGE: Record<string, string> = {
  cryptoast:     "bg-amber-500/15 text-amber-200 ring-amber-500/30",
  jdc:           "bg-orange-500/15 text-orange-200 ring-orange-500/30",
  cryptonaute:   "bg-sky-500/15 text-sky-200 ring-sky-500/30",
  "coin-academy":"bg-fuchsia-500/15 text-fuchsia-200 ring-fuchsia-500/30",
  cryptoactu:    "bg-emerald-500/15 text-emerald-200 ring-emerald-500/30",
};

const DEFAULT_BADGE = "bg-muted/15 text-muted ring-border";

export default function NewsCard({ item }: Props) {
  const badgeClasses = BRAND_BADGE[item.brand] ?? DEFAULT_BADGE;
  const relDate = formatRelativeFr(item.pubDate);

  return (
    <article
      className="group relative flex h-full flex-col gap-3 rounded-2xl border border-border bg-surface p-5
                 transition-all duration-fast hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-e2"
    >
      {/* Header : badge source + date relative */}
      <div className="flex items-center justify-between gap-3">
        <span
          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-semibold
                      uppercase tracking-wider ring-1 ${badgeClasses}`}
        >
          {item.source}
        </span>
        {relDate && (
          <time
            dateTime={item.pubDate}
            className="text-[11px] font-mono text-muted/80"
          >
            {relDate}
          </time>
        )}
      </div>

      {/* Titre cliquable — link externe nofollow */}
      <h3 className="text-base font-semibold leading-snug text-fg">
        <a
          href={item.link}
          target="_blank"
          rel="noopener nofollow"
          className="after:absolute after:inset-0 after:content-['']
                     focus:outline-none focus-visible:ring-2 focus-visible:ring-primary
                     focus-visible:ring-offset-2 focus-visible:ring-offset-surface
                     rounded group-hover:text-primary-soft transition-colors"
        >
          {item.title}
        </a>
      </h3>

      {/* Extrait — coupé à 140 chars dans le parser */}
      {item.description && (
        <p className="text-sm leading-relaxed text-muted line-clamp-3">
          {item.description}
        </p>
      )}

      {/* Footer : flèche externe (visuelle, le clic est sur le titre) */}
      <div className="mt-auto flex items-center gap-1.5 pt-1 text-[11px] font-medium text-muted/80">
        <ExternalLink className="h-3 w-3" aria-hidden="true" />
        <span>Lire sur {item.source}</span>
      </div>
    </article>
  );
}
