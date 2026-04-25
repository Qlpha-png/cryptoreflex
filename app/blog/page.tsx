import type { Metadata } from "next";
import Link from "next/link";
import { Clock, BookOpen } from "lucide-react";
import { ARTICLES } from "@/components/BlogPreview";

export const metadata: Metadata = {
  title: "Blog & guides crypto",
  description:
    "Guides clairs pour débuter dans la crypto : Bitcoin, wallets, fiscalité, sécurité et plus encore.",
};

export default function BlogIndexPage() {
  return (
    <section className="py-16 sm:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl">
          <span className="inline-flex items-center gap-2 rounded-full border border-accent-pink/30 bg-accent-pink/10 px-3 py-1 text-xs font-semibold text-accent-pink">
            <BookOpen className="h-3.5 w-3.5" />
            Blog
          </span>
          <h1 className="mt-4 text-4xl sm:text-5xl font-extrabold tracking-tight">
            Tous les <span className="gradient-text">guides crypto</span>
          </h1>
          <p className="mt-3 text-white/70">
            Articles écrits pour rendre la crypto accessible — du tout débutant à
            l'investisseur intermédiaire.
          </p>
        </div>

        <div className="mt-10 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {ARTICLES.map((a) => (
            <Link
              key={a.slug}
              href={`/blog/${a.slug}`}
              className="group glass rounded-2xl overflow-hidden hover:translate-y-[-2px] transition-transform"
            >
              <div className={`relative h-40 bg-gradient-to-br ${a.gradient}`}>
                <div className="absolute inset-0 bg-grid opacity-30" />
                <span className="absolute top-3 left-3 rounded-full bg-background/70 backdrop-blur px-2.5 py-1 text-xs font-semibold">
                  {a.category}
                </span>
              </div>
              <div className="p-5">
                <h2 className="font-semibold text-lg text-white group-hover:text-primary-glow transition-colors">
                  {a.title}
                </h2>
                <p className="mt-2 text-sm text-white/70 line-clamp-3">{a.excerpt}</p>
                <div className="mt-4 flex items-center gap-3 text-xs text-muted">
                  <span className="inline-flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" />
                    {a.readTime}
                  </span>
                  <span>•</span>
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
