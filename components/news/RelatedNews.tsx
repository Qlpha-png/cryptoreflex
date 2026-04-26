import Link from "next/link";
import { ArrowRight, Newspaper } from "lucide-react";
import type { NewsSummary } from "@/lib/news-types";
import { NEWS_CATEGORY_LABELS } from "@/lib/news-types";
import { formatRelativeFr } from "@/lib/news-aggregator";

/**
 * RelatedNews — bloc "Articles liés" en bas d'une page /actualites/[slug].
 *
 * Affiche jusqu'à 3 news, en priorité de la même catégorie. Server Component
 * pur. Les liens sont internes (pas d'externe → pas de nofollow ici).
 *
 * Si pas d'items → on rend un message neutre + lien vers le hub.
 */

interface Props {
  /** Articles à afficher (typiquement 3). */
  items: NewsSummary[];
  /** Slug de l'article courant — exclu du rendu (defensif, le caller le fait déjà). */
  excludeSlug?: string;
}

export default function RelatedNews({ items, excludeSlug }: Props) {
  const filtered = excludeSlug
    ? items.filter((n) => n.slug !== excludeSlug)
    : items;

  return (
    <section
      aria-labelledby="related-news-heading"
      className="mt-12 rounded-2xl border border-border bg-elevated/40 p-6 sm:p-8"
    >
      <header className="mb-6 flex items-center justify-between gap-4">
        <h2
          id="related-news-heading"
          className="flex items-center gap-2 text-xl font-bold text-fg"
        >
          <Newspaper className="h-5 w-5 text-primary" aria-hidden="true" />
          À lire aussi
        </h2>
        <Link
          href="/actualites"
          className="hidden sm:inline-flex items-center gap-1 text-sm font-semibold text-primary-soft hover:text-primary-glow transition-colors"
        >
          Toutes les actualités
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </header>

      {filtered.length === 0 ? (
        <p className="text-sm text-muted">
          Aucune actualité connexe pour l'instant.{" "}
          <Link
            href="/actualites"
            className="text-primary-glow hover:underline"
          >
            Voir toutes les actualités
          </Link>
          .
        </p>
      ) : (
        <ul role="list" className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {filtered.slice(0, 3).map((news) => (
            <li key={news.slug} className="list-none">
              <RelatedCard news={news} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/* -------------------------------------------------------------------------- */

function RelatedCard({ news }: { news: NewsSummary }) {
  const relDate = formatRelativeFr(news.date);
  const catLabel = NEWS_CATEGORY_LABELS[news.category];

  return (
    <article className="group relative flex h-full flex-col gap-2 rounded-xl border border-border bg-surface p-4 transition-colors hover:border-primary/40">
      <span className="inline-flex w-fit items-center rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-primary-glow ring-1 ring-primary/20">
        {catLabel}
      </span>
      <h3 className="text-sm font-semibold leading-snug text-fg">
        <Link
          href={`/actualites/${news.slug}`}
          className="after:absolute after:inset-0 after:content-['']
                     focus:outline-none focus-visible:ring-2 focus-visible:ring-primary
                     focus-visible:ring-offset-2 focus-visible:ring-offset-surface
                     rounded group-hover:text-primary-soft transition-colors"
        >
          {news.title}
        </Link>
      </h3>
      <div className="mt-auto flex items-center justify-between gap-2 pt-2 text-[11px] text-muted">
        <span className="font-medium text-fg/70">{news.source}</span>
        {relDate && (
          <time dateTime={news.date} className="font-mono">
            {relDate}
          </time>
        )}
      </div>
    </article>
  );
}
