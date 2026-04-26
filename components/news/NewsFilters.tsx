import Link from "next/link";
import {
  NEWS_CATEGORIES,
  NEWS_CATEGORY_LABELS,
  NEWS_CATEGORY_SLUGS,
  type NewsCategory,
} from "@/lib/news-types";

/**
 * NewsFilters — onglets de filtrage par catégorie pour /actualites.
 *
 * Server Component pur (zéro JS client) — la sélection se fait via querystring
 * `?categorie=...` consommée par la page Server Component qui re-rend.
 *
 * a11y : groupe d'onglets avec aria-label, état actif via aria-current.
 */

interface Props {
  /** Catégorie active (slug) ou null si "Toutes". */
  active: NewsCategory | null;
  /** Compteur d'items par catégorie (pour les badges). */
  counts: Record<NewsCategory, number>;
  /** Total de news (pour le badge "Toutes"). */
  total: number;
  /** Path de base de la page, par défaut /actualites. */
  basePath?: string;
}

export default function NewsFilters({
  active,
  counts,
  total,
  basePath = "/actualites",
}: Props) {
  return (
    <nav
      role="navigation"
      aria-label="Filtrer les actualités par catégorie"
      className="flex flex-wrap gap-2"
    >
      <FilterChip
        href={basePath}
        label="Toutes"
        count={total}
        isActive={active === null}
      />
      {NEWS_CATEGORIES.map((cat) => {
        const slug = NEWS_CATEGORY_SLUGS[cat];
        const count = counts[cat] ?? 0;
        return (
          <FilterChip
            key={cat}
            href={`${basePath}?categorie=${slug}`}
            label={NEWS_CATEGORY_LABELS[cat]}
            count={count}
            isActive={active === cat}
          />
        );
      })}
    </nav>
  );
}

/* -------------------------------------------------------------------------- */

function FilterChip({
  href,
  label,
  count,
  isActive,
}: {
  href: string;
  label: string;
  count: number;
  isActive: boolean;
}) {
  return (
    <Link
      href={href}
      scroll={false}
      aria-current={isActive ? "page" : undefined}
      className={`inline-flex items-center rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors
                  ${
                    isActive
                      ? "border-primary bg-primary/15 text-primary-glow"
                      : "border-border bg-surface text-fg/70 hover:border-primary/40 hover:text-fg"
                  }`}
    >
      {label}
      <span className="ml-1.5 text-xs text-muted">({count})</span>
    </Link>
  );
}
