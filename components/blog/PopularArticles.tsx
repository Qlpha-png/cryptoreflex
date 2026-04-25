import Link from "next/link";
import { Clock, Flame } from "lucide-react";
import { getAllArticleSummaries } from "@/lib/mdx";

/**
 * PopularArticles — sidebar "Articles populaires" (P1-9).
 *
 * V1 : "populaires" = proxy par les 5 articles les plus récents (date desc).
 * Quand on aura le tracking lecture (V2), on switchera sur un store réel.
 *
 * Server Component : aucune interactivité, lecture cachée 1h via lib/mdx.
 * Sticky sur lg+ pour rester visible pendant la lecture, statique sur mobile
 * pour ne pas obstruer le contenu.
 */

interface Props {
  /** Slug à exclure (l'article courant). */
  excludeSlug?: string;
  /** Nombre d'articles affichés. Défaut 5. */
  limit?: number;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default async function PopularArticles({
  excludeSlug,
  limit = 5,
}: Props) {
  const all = await getAllArticleSummaries();
  // `getAllArticleSummaries` est déjà trié date desc côté lib.
  const list = all
    .filter((a) => (excludeSlug ? a.slug !== excludeSlug : true))
    .slice(0, limit);

  if (list.length === 0) return null;

  return (
    <aside
      aria-labelledby="popular-articles-title"
      className="rounded-2xl border border-border bg-surface p-5"
    >
      <h2
        id="popular-articles-title"
        className="text-sm font-bold uppercase tracking-wider text-fg flex items-center gap-2"
      >
        <Flame className="h-4 w-4 text-primary" aria-hidden="true" />
        Articles populaires
      </h2>

      <ol className="mt-4 space-y-3">
        {list.map((a, i) => (
          <li key={a.slug}>
            <Link
              href={`/blog/${a.slug}`}
              className="group block rounded-lg p-2 -m-2 hover:bg-elevated/40 transition-colors
                         focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
            >
              <div className="flex items-start gap-3">
                <span
                  aria-hidden="true"
                  className="shrink-0 inline-flex h-6 w-6 items-center justify-center rounded-md bg-primary/10 text-[11px] font-bold font-mono text-primary"
                >
                  {i + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <h3 className="text-sm font-semibold text-fg leading-snug group-hover:text-primary-glow line-clamp-2">
                    {a.title}
                  </h3>
                  <div className="mt-1 flex items-center gap-2 text-[11px] text-muted">
                    <span className="inline-flex items-center gap-0.5">
                      <Clock className="h-3 w-3" aria-hidden="true" />
                      {a.readTime}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span>{formatDate(a.date)}</span>
                  </div>
                </div>
              </div>
            </Link>
          </li>
        ))}
      </ol>
    </aside>
  );
}
