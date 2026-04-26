import Link from "next/link";
import { ArrowRight, BookOpen, Clock, FileText } from "lucide-react";
import { getAllArticleSummaries } from "@/lib/mdx";
import EmptyState from "@/components/ui/EmptyState";

/**
 * Aperçu blog en home — sert les 3 articles les plus récents lus depuis MDX
 * (cf. `lib/mdx.ts`). Server Component async : aucun JS client, valeurs
 * fraîches au build (cache `unstable_cache`, revalidate horaire).
 */
export default async function BlogPreview() {
  const articles = (await getAllArticleSummaries()).slice(0, 3);

  if (articles.length === 0) {
    return (
      <section className="py-20 sm:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <EmptyState
            icon={<FileText className="h-6 w-6" aria-hidden="true" />}
            title="Pas encore d'articles publiés"
            description="On prépare nos premiers guides — abonne-toi à la newsletter pour être prévenu dès la sortie."
            cta={{ label: "S'abonner à la newsletter", href: "#newsletter" }}
            secondaryCta={{ label: "Voir les outils", href: "/outils" }}
          />
        </div>
      </section>
    );
  }

  return (
    <section className="py-20 sm:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-10 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary-glow">
              <BookOpen className="h-3.5 w-3.5" />
              Blog & Guides
            </span>
            <h2 className="mt-4 text-3xl font-extrabold tracking-tight sm:text-4xl">
              Apprenez la crypto,{" "}
              <span className="gradient-text">étape par étape</span>
            </h2>
          </div>
          <Link href="/blog" className="btn-ghost self-start py-2.5 text-sm">
            Tous les articles
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {articles.map((a) => (
            <Link
              key={a.slug}
              href={`/blog/${a.slug}`}
              className="group glass overflow-hidden rounded-2xl transition-transform hover:translate-y-[-2px]"
            >
              {/* Hero = OG image dynamique du slug — embarque titre/cat/auteur.
                  Cf. components/blog/BlogIndexClient.tsx pour le pattern complet. */}
              <div
                className={`relative h-40 overflow-hidden bg-gradient-to-br ${a.gradient}`}
              >
                <img
                  src={`/blog/${a.slug}/opengraph-image`}
                  alt=""
                  loading="lazy"
                  decoding="async"
                  className="absolute inset-0 h-full w-full object-cover"
                />
                <span className="absolute left-3 top-3 z-10 rounded-full bg-background/80 px-2.5 py-1 text-xs font-semibold backdrop-blur">
                  {a.category}
                </span>
              </div>
              <div className="p-5">
                <h3 className="text-lg font-semibold text-fg transition-colors group-hover:text-primary-glow">
                  {a.title}
                </h3>
                <p className="mt-2 line-clamp-3 text-sm text-fg/70">
                  {a.description}
                </p>
                <div className="mt-4 flex items-center gap-3 text-xs text-muted">
                  <span className="inline-flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" />
                    {a.readTime}
                  </span>
                  <span>·</span>
                  <span>
                    {new Date(a.date).toLocaleDateString("fr-FR", {
                      day: "2-digit",
                      month: "long",
                      year: "numeric",
                    })}
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
