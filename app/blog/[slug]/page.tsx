import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Clock } from "lucide-react";
import { ARTICLES } from "@/components/BlogPreview";

interface Props {
  params: { slug: string };
}

export function generateStaticParams() {
  return ARTICLES.map((a) => ({ slug: a.slug }));
}

export function generateMetadata({ params }: Props): Metadata {
  const article = ARTICLES.find((a) => a.slug === params.slug);
  if (!article) return {};
  return {
    title: article.title,
    description: article.excerpt,
  };
}

export default function BlogArticlePage({ params }: Props) {
  const article = ARTICLES.find((a) => a.slug === params.slug);
  if (!article) notFound();

  return (
    <article className="py-16 sm:py-20">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <Link
          href="/blog"
          className="inline-flex items-center gap-2 text-sm text-muted hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Retour au blog
        </Link>

        <div className="mt-6 flex items-center gap-3 text-xs">
          <span className="rounded-full bg-elevated px-2.5 py-1 font-semibold text-white/80">
            {article.category}
          </span>
          <span className="inline-flex items-center gap-1 text-muted">
            <Clock className="h-3.5 w-3.5" />
            {article.readTime}
          </span>
          <span className="text-muted">
            {new Date(article.date).toLocaleDateString("fr-FR", {
              day: "2-digit",
              month: "long",
              year: "numeric",
            })}
          </span>
        </div>

        <h1 className="mt-4 text-4xl sm:text-5xl font-extrabold tracking-tight leading-tight">
          {article.title}
        </h1>

        <p className="mt-4 text-lg text-white/70">{article.excerpt}</p>

        <div className={`mt-8 h-48 rounded-2xl bg-gradient-to-br ${article.gradient} relative overflow-hidden`}>
          <div className="absolute inset-0 bg-grid opacity-30" />
        </div>

        <div className="prose prose-invert max-w-none mt-10 space-y-4 text-white/80 leading-relaxed">
          <p>
            <em>Article en cours de rédaction.</em> Cette page sert de gabarit — remplace
            ce contenu par ton article réel (Markdown ou MDX recommandé).
          </p>
          <p>
            En attendant, jette un œil à la <Link href="/#plateformes" className="text-primary-glow hover:underline">section plateformes</Link> pour
            choisir où acheter, ou utilise le <Link href="/outils" className="text-primary-glow hover:underline">calculateur de profits</Link>.
          </p>
        </div>
      </div>
    </article>
  );
}
