import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import type { NewsSummary } from "@/lib/news-types";
import { NEWS_CATEGORY_LABELS, NEWS_CATEGORY_SLUGS } from "@/lib/news-types";
import { formatRelativeFr } from "@/lib/news-aggregator";
import ArticleHero from "@/components/ui/ArticleHero";

/**
 * NewsCard (pilier news MDX) — carte d'une news Cryptoreflex réécrite.
 *
 * Distincte de `components/NewsCard.tsx` (legacy, qui renvoie sur un lien
 * EXTERNE). Ici, la carte renvoie sur une page interne `/actualites/[slug]`
 * (Server Component, ISR, JSON-LD NewsArticle complet).
 *
 * Visuel : image en haut (ou gradient fallback), badge catégorie coloré,
 * titre h3, source + date relative.
 *
 * Server Component pur — zéro état, zéro interactivité.
 */

interface Props {
  news: NewsSummary;
}

/** Couleurs Tailwind par catégorie — pré-générées (purge-safe). */
const CATEGORY_BADGE: Record<string, string> = {
  Marche:      "bg-amber-500/15 text-amber-200 ring-amber-500/30",
  Regulation:  "bg-rose-500/15 text-rose-200 ring-rose-500/30",
  Technologie: "bg-cyan-500/15 text-cyan-200 ring-cyan-500/30",
  Plateformes: "bg-fuchsia-500/15 text-fuchsia-200 ring-fuchsia-500/30",
};

/** Gradient cover fallback si image absente. */
const CATEGORY_GRADIENT: Record<string, string> = {
  Marche:      "from-amber-500/40 to-orange-600/40",
  Regulation:  "from-rose-500/40 to-pink-600/40",
  Technologie: "from-cyan-500/40 to-blue-600/40",
  Plateformes: "from-fuchsia-500/40 to-purple-600/40",
};

export default function NewsCard({ news }: Props) {
  const badgeClasses = CATEGORY_BADGE[news.category] ?? "bg-muted/15 text-muted ring-border";
  const gradient = CATEGORY_GRADIENT[news.category] ?? "from-amber-500/40 to-orange-600/40";
  const relDate = formatRelativeFr(news.date);
  const catLabel = NEWS_CATEGORY_LABELS[news.category];

  return (
    <article
      className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-elevated
                 transition-all duration-fast hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-e2"
    >
      {/* Cover. Si la news a une `image` non-default, on l'utilise (sponso/featured).
          Sinon : ArticleHero CSS-only (avant on chargeait /opengraph-image
          dynamique qui retourne HTTP 500 en prod côté serverless). */}
      {news.image && news.image !== "/og-default.png" ? (
        <div className={`relative aspect-[16/9] overflow-hidden bg-gradient-to-br ${gradient}`}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={news.image}
            alt=""
            loading="lazy"
            decoding="async"
            className="h-full w-full object-cover transition-transform duration-slow group-hover:scale-[1.03]"
          />
          <span
            className={`absolute left-3 top-3 inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px]
                        font-semibold uppercase tracking-wider ring-1 backdrop-blur-sm ${badgeClasses}`}
          >
            {catLabel}
          </span>
        </div>
      ) : (
        <ArticleHero
          category={catLabel}
          title={news.title}
          gradient={gradient}
          height="aspect-[16/9]"
        />
      )}

      {/* Content */}
      <div className="flex flex-1 flex-col gap-3 p-5">
        {/* Header : source + date */}
        <div className="flex items-center justify-between gap-2 text-[11px] text-muted">
          <span className="font-semibold text-fg/80">{news.source}</span>
          {relDate && (
            <time dateTime={news.date} className="font-mono">
              {relDate}
            </time>
          )}
        </div>

        {/* Titre */}
        <h3 className="text-base font-semibold leading-snug text-fg">
          <Link
            href={`/actualites/${news.slug}`}
            className="after:absolute after:inset-0 after:content-['']
                       focus:outline-none focus-visible:ring-2 focus-visible:ring-primary
                       focus-visible:ring-offset-2 focus-visible:ring-offset-elevated rounded
                       group-hover:text-primary-soft transition-colors"
          >
            {news.title}
          </Link>
        </h3>

        {/* Description courte */}
        {news.description && (
          <p className="text-sm leading-relaxed text-muted line-clamp-3">
            {news.description}
          </p>
        )}

        {/* CTA visuel (le clic est sur le titre) */}
        <div className="mt-auto flex items-center gap-1.5 pt-1 text-[11px] font-medium text-primary-soft">
          Lire l'analyse
          <ArrowUpRight className="h-3 w-3" aria-hidden="true" />
        </div>
      </div>
    </article>
  );
}

/** Helper exporté : URL canonique d'une news. Utile pour les liens internes. */
export function newsUrl(slug: string): string {
  return `/actualites/${slug}`;
}

/** Helper exporté : URL filtrée par catégorie. */
export function categoryUrl(category: string): string {
  const slug = NEWS_CATEGORY_SLUGS[category as keyof typeof NEWS_CATEGORY_SLUGS];
  return slug ? `/actualites?categorie=${slug}` : "/actualites";
}
