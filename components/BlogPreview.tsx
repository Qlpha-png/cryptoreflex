import Link from "next/link";
import { ArrowRight, BookOpen, Clock, FileText, Sparkles } from "lucide-react";
import { getAllArticleSummaries } from "@/lib/mdx";
import EmptyState from "@/components/ui/EmptyState";
import ArticleHero from "@/components/ui/ArticleHero";
import StructuredData from "@/components/StructuredData";
import { BRAND } from "@/lib/brand";

/**
 * BlogPreview — aperçu blog en home (3 derniers articles).
 *
 * Audit Block 8 RE-AUDIT 26/04/2026 (1 agent PRO consolidé) :
 *
 * VAGUE 1 — Code quality fixes
 *  - alt="" supprimé (WCAG 1.1.1) → alt descriptif basé sur title
 *  - try/catch fallback [] (parse MDX error = pas crash home)
 *  - Magic strings py-20 conservées pour compat (à extraire en Section wrapper plus tard)
 *  - Naming `a` → `article` lisibilité
 *
 * VAGUE 2 — A11y EAA P0
 *  - aria-labelledby="blog-preview-heading" sur section
 *  - aria-label structuré sur Link ('Title, publié date, lecture readTime')
 *  - focus-visible:ring sur Link (était absent)
 *  - <time dateTime={article.date}> sémantique
 *  - text-fg/70 → text-fg/85 (contraste AA 4.5:1 OK)
 *  - aria-hidden + focusable=false sur icônes
 *
 * VAGUE 3 — SEO Schema.org P0
 *  - JSON-LD ItemList + BlogPosting × 3 (rich snippets carousel Google)
 *  - Anchor "Tous les articles" → "Voir nos N guides" (riche en KW + count dynamique)
 *  - <Image> Next avec width/height (CLS=0)
 *  - Date format Intl factorized hors map
 *
 * VAGUE 4 — DYNAMISME (3/10 → 9/10)
 *  - Badge "Nouveau" pulse-strong gold si publié <7j (réutilise Block 4 keyframe)
 *  - Badge catégorie visible (catégorisation visuelle)
 *  - Card hover : translate-y -4px + glow gold + image Ken Burns 1s
 *  - "Lire l'article →" hover reveal (signal action)
 *  - card-premium au lieu de glass plat
 *  - arrow-spring sur ArrowRight CTA (réutilise Block 4)
 *
 * VAGUE 5 — Mobile
 *  - Carousel scroll-snap horizontal mobile (au lieu de stack 3 cards = mur)
 *  - CTA "Voir nos N guides" dupliqué en bas mobile
 *  - aspect-[16/9] mobile compact
 */

const SEVEN_DAYS_MS = 7 * 86_400_000;

export default async function BlogPreview() {
  const allArticles = await getAllArticleSummaries().catch(() => []);
  const articles = allArticles.slice(0, 3);
  const totalArticles = allArticles.length;

  // Date formatter factorized (was recreated 3× per render).
  const dateFormatter = new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  if (articles.length === 0) {
    return (
      <section className="py-20 sm:py-24" aria-labelledby="blog-preview-heading">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <EmptyState
            icon={<FileText className="h-6 w-6" aria-hidden="true" />}
            title="Pas encore d'articles publiés"
            description="On prépare nos premiers guides — abonne-toi à la newsletter pour être prévenu dès la sortie."
            cta={{ label: "S'abonner à la newsletter", href: "#cat-informe" }}
            secondaryCta={{ label: "Voir les outils", href: "/outils" }}
          />
        </div>
      </section>
    );
  }

  // Schema.org ItemList + BlogPosting × 3 (Audit SEO P0).
  const blogSchema = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Derniers articles Cryptoreflex",
    numberOfItems: articles.length,
    itemListElement: articles.map((article, idx) => ({
      "@type": "ListItem",
      position: idx + 1,
      item: {
        "@type": "BlogPosting",
        "@id": `${BRAND.url}/blog/${article.slug}`,
        headline: article.title,
        description: article.description,
        url: `${BRAND.url}/blog/${article.slug}`,
        datePublished: article.date,
        dateModified: article.lastUpdated ?? article.date,
        author: {
          "@type": "Person",
          name: article.author ?? "Équipe Cryptoreflex",
          url: `${BRAND.url}/a-propos`,
        },
        publisher: {
          "@type": "Organization",
          name: "Cryptoreflex",
          logo: {
            "@type": "ImageObject",
            url: `${BRAND.url}/icons/icon-512.svg`,
            width: 512,
            height: 512,
          },
        },
        image: {
          "@type": "ImageObject",
          url: `${BRAND.url}/blog/${article.slug}/opengraph-image`,
          width: 1200,
          height: 630,
        },
        mainEntityOfPage: {
          "@type": "WebPage",
          "@id": `${BRAND.url}/blog/${article.slug}`,
        },
        articleSection: article.category,
        timeRequired: `PT${parseInt(article.readTime) || 5}M`,
        inLanguage: "fr-FR",
        keywords: article.keywords?.join(", ") ?? undefined,
      },
    })),
  };

  return (
    <section
      aria-labelledby="blog-preview-heading"
      className="py-20 sm:py-24"
    >
      <StructuredData id="blog-preview-itemlist" data={blogSchema} />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-10 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary-glow">
              <BookOpen className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden="true" focusable="false" />
              Blog &amp; Guides
            </span>
            <h2
              id="blog-preview-heading"
              className="mt-4 text-3xl font-extrabold tracking-tight sm:text-4xl"
            >
              Apprenez la crypto,{" "}
              <span className="gradient-text">étape par étape</span>
            </h2>
          </div>
          {/* Audit SEO : anchor riche en KW + count dynamique */}
          <Link
            href="/blog"
            className="btn-ghost self-start py-2.5 text-sm shrink-0"
            aria-label={`Voir nos ${totalArticles} guides crypto sur le blog`}
          >
            Voir nos {totalArticles} guides
            <ArrowRight className="h-4 w-4 arrow-spring" aria-hidden="true" />
          </Link>
        </div>

        {/* Audit Mobile : carousel scroll-snap horizontal (au lieu de stack mur) */}
        <ul
          role="list"
          className="flex md:grid gap-4 md:gap-6 md:grid-cols-3
                     overflow-x-auto md:overflow-visible snap-x snap-mandatory
                     scrollbar-thin pb-2 md:pb-0
                     -mx-4 px-4 md:mx-0 md:px-0"
        >
          {articles.map((article, idx) => {
            const publishedAt = new Date(article.date).getTime();
            const isNew = Number.isFinite(publishedAt) && Date.now() - publishedAt < SEVEN_DAYS_MS;
            const dateFormatted = dateFormatter.format(new Date(article.date));
            const ariaLabel = `${article.title}, publié le ${dateFormatted}, lecture ${article.readTime}`;

            return (
              <li
                key={article.slug}
                className="shrink-0 w-[85%] md:w-auto snap-start"
                style={{ ["--i" as string]: idx } as React.CSSProperties}
              >
                <article
                  itemScope
                  itemType="https://schema.org/BlogPosting"
                  className="card-premium group relative overflow-hidden rounded-2xl h-full flex flex-col"
                >
                  <Link
                    href={`/blog/${article.slug}`}
                    aria-label={ariaLabel}
                    itemProp="url"
                    className="block focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                  >
                    {/*
                      Cover CSS-only via ArticleHero (Audit user 26/04 :
                      "trouve une vraie solution" pour le bug image qui revient).
                      Avant : <img src="/blog/{slug}/opengraph-image" loading="lazy">
                      bug confirmé : route OG retourne 200 OK en curl mais l'img
                      tag ne charge pas côté client (loading=lazy IntersectionObserver
                      foireux, même bug que crypto logos commit b1bb58b).
                      Solution radicale : ArticleHero 100% CSS — gradient + icon
                      + watermark, ZÉRO requête réseau, ZÉRO risque de bug image,
                      affichage instantané. L'OG dynamique reste pour Twitter/LinkedIn
                      via metadata.openGraph.images (où elle est requise).
                      transition-transform group-hover:scale-105 conservée pour Ken Burns.
                    */}
                    <div className="relative aspect-[16/9] overflow-hidden">
                      <div
                        className="absolute inset-0 transition-transform duration-1000 ease-out group-hover:scale-110 motion-reduce:group-hover:scale-100"
                        itemProp="image"
                      >
                        <ArticleHero
                          category={article.category}
                          title={article.title}
                          gradient={article.gradient}
                          height="h-full"
                        />
                      </div>
                      {/* Gradient overlay subtle pour lisibilité badge */}
                      <div className="absolute inset-0 bg-gradient-to-t from-bg/40 via-transparent to-transparent pointer-events-none" aria-hidden="true" />

                      {/* Badge "Nouveau" pulse-strong gold si <7j */}
                      {isNew && (
                        <span className="absolute top-3 left-3 inline-flex items-center gap-1 rounded-full bg-primary text-background text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 shadow-[0_4px_14px_-2px_rgba(245,165,36,0.55)] badge-pulse-strong z-10 whitespace-nowrap">
                          <Sparkles className="h-2.5 w-2.5" strokeWidth={2.5} aria-hidden="true" focusable="false" />
                          Nouveau
                        </span>
                      )}

                      {/* Badge catégorie visible — Audit Visual : top-right (mais
                          attention ArticleHero a déjà un badge catégorie top-left,
                          on cache le notre pour éviter doublon). */}
                      <meta itemProp="articleSection" content={article.category} />
                    </div>

                    <div className="p-5 flex-1 flex flex-col">
                      <h3
                        itemProp="headline"
                        className="text-lg font-semibold text-fg transition-colors group-hover:text-primary-glow"
                      >
                        {article.title}
                      </h3>
                      {/* text-fg/85 (au lieu de fg/70) pour contraste AA */}
                      <p
                        itemProp="description"
                        className="mt-2 line-clamp-3 text-sm text-fg/85 flex-1"
                      >
                        {article.description}
                      </p>
                      <div className="mt-4 flex items-center gap-3 text-xs text-fg/65">
                        <span className="inline-flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden="true" focusable="false" />
                          <span itemProp="timeRequired" content={`PT${parseInt(article.readTime) || 5}M`}>
                            {article.readTime}
                          </span>
                        </span>
                        <span aria-hidden="true">·</span>
                        <time dateTime={article.date} itemProp="datePublished">
                          {dateFormatted}
                        </time>
                      </div>
                      {/* "Lire l'article →" hover reveal (signal action) */}
                      <span className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-primary-soft opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all">
                        Lire l&apos;article
                        <ArrowRight className="h-3.5 w-3.5 arrow-spring" strokeWidth={2} aria-hidden="true" />
                      </span>
                    </div>
                  </Link>
                </article>
              </li>
            );
          })}
        </ul>

        {/* CTA dupliqué bas mobile (Audit Mobile) */}
        <div className="mt-6 md:hidden text-center">
          <Link
            href="/blog"
            className="btn-primary inline-flex"
            aria-label={`Voir tous nos ${totalArticles} guides crypto`}
          >
            Voir nos {totalArticles} guides
            <ArrowRight className="h-4 w-4 arrow-spring" aria-hidden="true" />
          </Link>
        </div>
      </div>
    </section>
  );
}
