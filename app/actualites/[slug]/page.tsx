import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ExternalLink, ChevronLeft } from "lucide-react";

import { BRAND } from "@/lib/brand";
import {
  getNewsBySlug,
  getNewsSlugs,
  getRelatedNews,
} from "@/lib/news-mdx";
import {
  NEWS_CATEGORY_LABELS,
  NEWS_CATEGORY_SLUGS,
} from "@/lib/news-types";
import {
  breadcrumbSchema,
  graphSchema,
  organizationSchema,
  generateSpeakableSchema,
  type JsonLd,
} from "@/lib/schema";
import { formatRelativeFr } from "@/lib/news-aggregator";
import StructuredData from "@/components/StructuredData";
import MdxContent from "@/components/MdxContent";
import RelatedNews from "@/components/news/RelatedNews";
import NewsletterInline from "@/components/NewsletterInline";
import RelatedPagesNav from "@/components/RelatedPagesNav";

/**
 * /actualites/[slug] — Page détail d'une analyse Cryptoreflex.
 *
 * Server Component, ISR (re-build à la prochaine requête après cache miss).
 *
 * Compose :
 *  - Breadcrumb Accueil > Actualités > [Catégorie] > [titre]
 *  - Header : badge catégorie + titre h1 + meta (date, source)
 *  - Body MDX rendu via <MdxContent>
 *  - Bloc source citée + lien externe nofollow noopener
 *  - Newsletter CTA inline (lead magnet)
 *  - Articles liés (3, même catégorie)
 *  - JSON-LD NewsArticle + BreadcrumbList + Organization
 */

export const revalidate = 600;

interface PageProps {
  params: { slug: string };
}

/* -------------------------------------------------------------------------- */
/*  Static params + metadata                                                  */
/* -------------------------------------------------------------------------- */

export async function generateStaticParams(): Promise<{ slug: string }[]> {
  const slugs = await getNewsSlugs();
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const news = await getNewsBySlug(params.slug);
  if (!news) {
    return {
      title: "Actualité introuvable — Cryptoreflex",
      robots: { index: false, follow: false },
    };
  }

  const url = `${BRAND.url}/actualites/${news.slug}`;
  const ogImage = news.image ?? `${BRAND.url}/og-image.png`;

  return {
    title: news.title,
    description: news.description,
    alternates: {
      canonical: url,
      languages: { "fr-FR": url, "x-default": url },
    },
    openGraph: {
      title: news.title,
      description: news.description,
      url,
      type: "article",
      locale: "fr_FR",
      siteName: BRAND.name,
      images: [{ url: ogImage, width: 1200, height: 630 }],
      publishedTime: news.date,
      authors: [news.author ?? "Cryptoreflex"],
      section: NEWS_CATEGORY_LABELS[news.category],
    },
    twitter: {
      card: "summary_large_image",
      title: news.title,
      description: news.description,
      images: [ogImage],
    },
    keywords: news.keywords,
    robots: { index: true, follow: true },
  };
}

/* -------------------------------------------------------------------------- */
/*  Page                                                                      */
/* -------------------------------------------------------------------------- */

export default async function NewsDetailPage({ params }: PageProps) {
  const news = await getNewsBySlug(params.slug);
  if (!news) notFound();

  const related = await getRelatedNews(news.slug, 3);
  const catLabel = NEWS_CATEGORY_LABELS[news.category];
  const catSlug = NEWS_CATEGORY_SLUGS[news.category];
  const relDate = formatRelativeFr(news.date);

  // JSON-LD
  const canonicalUrl = `${BRAND.url}/actualites/${news.slug}`;
  const ogImage = news.image ?? `${BRAND.url}/og-image.png`;

  const breadcrumb = breadcrumbSchema([
    { name: "Accueil", url: "/" },
    { name: "Actualités", url: "/actualites" },
    { name: catLabel, url: `/actualites?categorie=${catSlug}` },
    { name: news.title, url: `/actualites/${news.slug}` },
  ]);

  // NewsArticle local — on n'utilise pas `articleSchema()` de lib/schema.ts
  // parce qu'il hardcode `/blog/<slug>`. Pour les news, l'URL canonique est
  // `/actualites/<slug>`. On garde la même structure (mainEntityOfPage,
  // headline, etc.) pour bénéficier de l'éligibilité Google News / Top Stories.
  const newsArticleJsonLd: JsonLd = {
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    mainEntityOfPage: { "@type": "WebPage", "@id": canonicalUrl },
    headline: news.title,
    description: news.description,
    image: [ogImage],
    datePublished: news.date,
    dateModified: news.date,
    author: {
      "@type": "Organization",
      name: news.author ?? "Cryptoreflex",
      url: BRAND.url,
    },
    publisher: {
      "@type": "Organization",
      name: BRAND.name,
      url: BRAND.url,
      logo: {
        "@type": "ImageObject",
        url: `${BRAND.url}/api/logo`,
      },
    },
    inLanguage: "fr-FR",
    articleSection: catLabel,
    keywords: news.keywords?.join(", "),
    url: canonicalUrl,
    dateline: "Paris, France",
    isAccessibleForFree: true,
    speakable: generateSpeakableSchema(),
  };

  const schemas = graphSchema([
    organizationSchema(),
    breadcrumb,
    newsArticleJsonLd,
  ]);

  return (
    <article className="py-10 sm:py-14">
      <StructuredData data={schemas} id="actualites-detail" />

      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        {/* Breadcrumb */}
        <nav className="text-xs text-muted" aria-label="Fil d'Ariane">
          <Link href="/" className="hover:text-fg">Accueil</Link>
          <span className="mx-2" aria-hidden="true">/</span>
          <Link href="/actualites" className="hover:text-fg">Actualités</Link>
          <span className="mx-2" aria-hidden="true">/</span>
          <Link
            href={`/actualites?categorie=${catSlug}`}
            className="hover:text-fg"
          >
            {catLabel}
          </Link>
          <span className="mx-2" aria-hidden="true">/</span>
          <span className="text-fg/80 line-clamp-1">{news.title}</span>
        </nav>

        {/* Back link mobile-friendly */}
        <Link
          href="/actualites"
          className="mt-6 inline-flex items-center gap-1 text-xs font-semibold text-muted hover:text-fg transition-colors"
        >
          <ChevronLeft className="h-3.5 w-3.5" aria-hidden="true" />
          Toutes les actualités
        </Link>

        {/* HEADER */}
        <header className="mt-4 mb-8">
          <div className="flex flex-wrap items-center gap-3">
            <Link
              href={`/actualites?categorie=${catSlug}`}
              className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-primary-glow ring-1 ring-primary/20 hover:bg-primary/20 transition-colors"
            >
              {catLabel}
            </Link>
            <time
              dateTime={news.date}
              className="text-xs font-mono text-muted"
            >
              {new Date(news.date).toLocaleDateString("fr-FR", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
              {relDate && <span className="ml-2 text-muted/60">· {relDate}</span>}
            </time>
          </div>

          <h1 className="mt-4 text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight leading-tight text-fg">
            {news.title}
          </h1>

          <p className="mt-4 text-base sm:text-lg text-muted leading-relaxed">
            {news.description}
          </p>

          {/* Cover image si fournie */}
          {news.image && (
            <div className="mt-6 overflow-hidden rounded-2xl border border-border">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={news.image}
                alt=""
                loading="eager"
                decoding="async"
                className="h-auto w-full object-cover"
              />
            </div>
          )}
        </header>

        {/* BODY MDX */}
        <MdxContent source={news.content} />

        {/* SOURCE CITÉE */}
        <aside
          aria-labelledby="source-heading"
          className="mt-10 rounded-2xl border border-border bg-elevated/40 p-5"
        >
          <h2
            id="source-heading"
            className="text-sm font-semibold text-fg/85"
          >
            Source originale
          </h2>
          <p className="mt-2 text-sm text-muted leading-relaxed">
            Cette analyse s'appuie sur une publication de{" "}
            <strong className="text-fg/85">{news.source}</strong>. Pour lire
            l'article complet (anglais ou français selon le média) :
          </p>
          <a
            href={news.sourceUrl}
            target="_blank"
            rel="noopener nofollow"
            className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-primary-glow hover:underline break-all"
          >
            <ExternalLink className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            {news.sourceUrl}
          </a>
        </aside>

        {/* NEWSLETTER CTA */}
        <div className="mt-10">
          <NewsletterInline source="inline" />
        </div>

        {/* ARTICLES LIÉS */}
        <RelatedNews items={related} excludeSlug={news.slug} />

        {/* Maillage interne — cluster sémantique du graphe */}
        <RelatedPagesNav
          currentPath={`/actualites/${news.slug}`}
          limit={4}
          variant="default"
        />
      </div>
    </article>
  );
}
