import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Clock, Calendar } from "lucide-react";

import {
  getArticleBySlug,
  getArticleSlugs,
  getRelatedArticles,
} from "@/lib/mdx";
import MdxContent from "@/components/MdxContent";
import AuthorCard from "@/components/AuthorCard";
import AmfDisclaimer from "@/components/AmfDisclaimer";
import StructuredData from "@/components/StructuredData";
import NewsletterInline from "@/components/NewsletterInline";
import PopularArticles from "@/components/blog/PopularArticles";
import ArticleToc from "@/components/blog/ArticleToc";
import RelatedPagesNav from "@/components/RelatedPagesNav";
import RelatedEntities from "@/components/RelatedEntities";
import MobileStickyCTA from "@/components/MobileStickyCTA";
import NextStepsGuide from "@/components/NextStepsGuide";
import ArticleHero from "@/components/ui/ArticleHero";
import { getAllPlatforms } from "@/lib/platforms";
import { BRAND } from "@/lib/brand";
import {
  articleSchema,
  breadcrumbSchema,
  graphSchema,
  organizationSchema,
  generateSpeakableSchema,
} from "@/lib/schema";
import {
  authorPersonSchema,
  getAuthorByIdOrDefault,
} from "@/lib/authors";

interface Props {
  params: { slug: string };
}

/* -------------------------------------------------------------------------- */
/*  Static generation                                                         */
/* -------------------------------------------------------------------------- */

export async function generateStaticParams() {
  const slugs = await getArticleSlugs();
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const article = await getArticleBySlug(params.slug);
  if (!article) return { title: "Article introuvable" };

  const url = `${BRAND.url}/blog/${article.slug}`;
  const author = getAuthorByIdOrDefault(article.author);

  return {
    title: article.title,
    description: article.description,
    keywords: article.keywords,
    alternates: { canonical: url },
    authors: [{ name: author.name, url: `/auteur/${author.id}` }],
    openGraph: {
      type: "article",
      url,
      title: article.title,
      description: article.description,
      publishedTime: article.date,
      modifiedTime: article.lastUpdated,
      authors: [`/auteur/${author.id}`],
      tags: article.keywords,
      siteName: BRAND.name,
      locale: "fr_FR",
      images: article.cover ? [{ url: article.cover }] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title: article.title,
      description: article.description,
    },
  };
}

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                   */
/* -------------------------------------------------------------------------- */

function formatFrenchDate(iso: string): string {
  return new Date(iso).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

/**
 * FIX #2 audit conversion 2026-04-26 — mappe la `category` éditoriale d'un
 * article vers un `context` consommé par <NewsletterInline /> pour servir un
 * copy ciblé (ex: catégorie "Fiscalité" → copy "Optimise ta fisca crypto 2026").
 *
 * Categories libres autorisées dans le frontmatter MDX → match insensible à la
 * casse + tolérant aux accents. Si aucun match → return undefined (le copy
 * "blog-cta" générique reste appliqué).
 */
function categoryToNewsletterContext(
  category?: string,
):
  | "fiscalite"
  | "securite"
  | "trading"
  | "debutant"
  | "actualites"
  | "defi"
  | "regulation"
  | undefined {
  if (!category) return undefined;
  const c = category
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
  if (c.includes("fisc") || c.includes("impot") || c.includes("tax"))
    return "fiscalite";
  if (
    c.includes("secur") ||
    c.includes("scam") ||
    c.includes("arnaque") ||
    c.includes("wallet") ||
    c.includes("hack")
  )
    return "securite";
  if (c.includes("trading") || c.includes("analyse")) return "trading";
  if (
    c.includes("debut") ||
    c.includes("guide") ||
    c.includes("comprendre") ||
    c.includes("acheter") ||
    c.includes("apprend")
  )
    return "debutant";
  if (c.includes("defi") || c.includes("staking") || c.includes("yield"))
    return "defi";
  if (
    c.includes("regul") ||
    c.includes("mica") ||
    c.includes("amf") ||
    c.includes("psan") ||
    c.includes("loi")
  )
    return "regulation";
  if (c.includes("actu") || c.includes("news") || c.includes("marche"))
    return "actualites";
  return undefined;
}

/**
 * Découpe le contenu MDX en deux parties (~60/40) sur une frontière propre
 * de paragraphe (`\n\n`). Renvoie [head, tail].
 *
 * Pourquoi ~60% ? Le visiteur a déjà lu suffisamment pour percevoir la valeur
 * (intent confirmé). Le placement après une frontière `\n\n` évite de couper
 * un bloc MDX (heading, code fence, FAQ component…). Si la coupe tombe à
 * l'intérieur d'un bloc spécial, on fallback en bas de l'article.
 *
 * Limite : on n'introspecte pas le DOM rendu — on coupe sur la string brute.
 * Suffisant pour les articles standards (text-heavy). Les articles très
 * structurés (tables/FAQ) recevront NewsletterInline en bas via le fallback.
 */
function splitContentForInlineCta(
  source: string,
  ratio = 0.6
): [string, string] {
  if (!source || source.length < 600) return [source, ""];

  const target = Math.floor(source.length * ratio);
  // Cherche la frontière `\n\n` la plus proche AVANT la cible (jamais après,
  // pour ne pas placer la CTA trop bas si l'article est court).
  let split = source.lastIndexOf("\n\n", target);

  // Garde-fous : si la coupe est avant 30% (paragraphe trop long en début),
  // on cherche après. Sinon trop déséquilibré.
  if (split < source.length * 0.3) {
    const after = source.indexOf("\n\n", target);
    if (after > -1 && after < source.length * 0.85) {
      split = after;
    }
  }

  if (split < 0 || split > source.length * 0.9) {
    return [source, ""];
  }

  const head = source.slice(0, split).trim();
  const tail = source.slice(split).trim();
  // Si l'une des moitiés est vide, on ne split pas (CTA en bas seulement).
  if (!head || !tail) return [source, ""];
  return [head, tail];
}

/* -------------------------------------------------------------------------- */
/*  Page                                                                      */
/* -------------------------------------------------------------------------- */

export default async function BlogArticlePage({ params }: Props) {
  const article = await getArticleBySlug(params.slug);
  if (!article) notFound();

  const author = getAuthorByIdOrDefault(article.author);
  const related = await getRelatedArticles(article.slug, 3);

  // Étude #9 ETUDE-2026-05-02 : enrichissement schema.org pour ce template.
  // - Article schema : déjà présent (titre, auteur, date, etc.)
  // - SpeakableSpecification : NEW. Permet à Google Assistant / Alexa / Siri
  //   de lire à voix haute le H1 + les paragraphes [data-speakable] (voice search,
  //   featured snippets vocaux, +10-20% CTR estimé sur les recherches conversationnelles).
  // - Breadcrumb : déjà présent.
  // - Pas de FAQPage ici car le frontmatter MDX actuel n'a pas de
  //   `quickAnswerQuestion` — à réintroduire si on étend le contrat data.
  const articleJsonLd = articleSchema({
    slug: article.slug,
    title: article.title,
    description: article.description,
    excerpt: article.description,
    category: article.category,
    tags: article.keywords,
    date: article.date,
    dateModified: article.lastUpdated,
    readTime: article.readTime,
    cover: article.cover,
    author: author.name,
  }) as Record<string, unknown>;
  // Inject speakable directement dans l'objet Article (pattern Google
  // recommandé : pas un node JSON-LD séparé mais une propriété de l'Article).
  articleJsonLd.speakable = generateSpeakableSchema();

  const schemas = graphSchema([
    organizationSchema(),
    authorPersonSchema(author),
    articleJsonLd,
    breadcrumbSchema([
      { name: "Accueil", url: "/" },
      { name: "Blog", url: "/blog" },
      { name: article.title, url: `/blog/${article.slug}` },
    ]),
  ]);

  // Split MDX pour insérer la NewsletterInline ~60% (P1-9).
  const [contentHead, contentTail] = splitContentForInlineCta(article.content);

  // FIX #5 audit conversion 2026-04-26 — détection intent commercial pour
  // afficher un MobileStickyCTA d'affiliation. Heuristique :
  //  - slug commence par "acheter-" OU contient "ou-acheter"
  //  - OU 1er keyword contient "acheter"
  // Si match, on cherche la 1re plateforme connue mentionnée dans le titre/desc
  // ou on retombe sur la mieux notée (Coinbase / Bitpanda) en MiCA-compliant.
  const isTransactionalArticle =
    /^acheter-/.test(article.slug) ||
    /ou-acheter/.test(article.slug) ||
    article.keywords.some((k) => /acheter/i.test(k));

  let stickyPlatform: ReturnType<typeof getAllPlatforms>[number] | undefined;
  if (isTransactionalArticle) {
    const allPlatforms = getAllPlatforms();
    const haystack = `${article.title} ${article.description}`.toLowerCase();
    stickyPlatform = allPlatforms.find((p) =>
      haystack.includes(p.name.toLowerCase()),
    );
    if (!stickyPlatform) {
      // Fallback : meilleure plateforme MiCA-compliant par score global.
      stickyPlatform = allPlatforms
        .filter((p) => p.mica.micaCompliant)
        .sort((a, b) => b.scoring.global - a.scoring.global)[0];
    }
  }

  return (
    <>
      <StructuredData data={schemas} id="article-graph" />

      <article className="py-12 sm:py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {/* Layout : article principal + sidebar (lg+) */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-10 lg:gap-12">
            <div className="lg:col-span-2 max-w-3xl mx-auto lg:mx-0">
              {/* Retour */}
              <Link
                href="/blog"
                className="inline-flex items-center gap-2 text-sm text-muted hover:text-fg
                           focus:outline-none focus-visible:underline rounded"
              >
                <ArrowLeft className="h-4 w-4" />
                Retour au blog
              </Link>

              {/* Header */}
              <header className="mt-6">
                <div className="flex flex-wrap items-center gap-3 text-xs">
                  <span className="rounded-full bg-elevated px-2.5 py-1 font-semibold text-fg/80">
                    {article.category}
                  </span>
                  <span className="inline-flex items-center gap-1 text-muted">
                    <Clock className="h-3.5 w-3.5" />
                    {article.readTime}
                  </span>
                  <span className="inline-flex items-center gap-1 text-muted">
                    <Calendar className="h-3.5 w-3.5" />
                    {formatFrenchDate(article.date)}
                  </span>
                  {article.lastUpdated &&
                    article.lastUpdated !== article.date && (
                      <span className="text-muted">
                        MAJ {formatFrenchDate(article.lastUpdated)}
                      </span>
                    )}
                </div>

                <h1 className="mt-4 text-4xl font-extrabold tracking-tight leading-tight sm:text-5xl">
                  {article.title}
                </h1>

                <p className="mt-4 text-lg text-fg/70">{article.description}</p>

                {/* Hero header CSS-only — robuste, jamais cassé.
                    Avant on chargeait `/blog/[slug]/opengraph-image` qui
                    retourne HTTP 500 en prod (fs MDX en serverless), l'article
                    affichait un cadre vide. ArticleHero rend gradient +
                    icône catégorie + watermark, immédiat. */}
                <div className="mt-8 rounded-2xl overflow-hidden">
                  <ArticleHero
                    category={article.category}
                    title={article.title}
                    gradient={article.gradient}
                    height="h-48 sm:h-64"
                  />
                </div>

                <div className="mt-6">
                  <AuthorCard
                    authorId={article.author}
                    variant="compact"
                    date={article.date}
                    dateModified={article.lastUpdated}
                    readTime={article.readTime}
                  />
                </div>
              </header>

              {/* Disclaimer AMF haut */}
              <div className="mt-8">
                <AmfDisclaimer variant="educatif" compact />
              </div>

              {/* Contenu MDX — split ~60% pour insérer la NewsletterInline */}
              <div className="mt-10">
                <MdxContent source={contentHead} />
              </div>

              {/* NewsletterInline — encart au cœur de l'article (P1-9).
                  FIX #2 audit conversion 2026-04-26 : on passe `context` mappé
                  depuis la catégorie d'article. Le copy générique reste fallback
                  si la catégorie ne matche aucun preset. Les overrides
                  title/subtitle ne sont plus passés explicitement pour laisser
                  le contexte ciblé prendre le dessus. */}
              <div className="my-10">
                <NewsletterInline
                  source="blog-cta"
                  context={categoryToNewsletterContext(article.category)}
                />
              </div>

              {contentTail && (
                <div>
                  <MdxContent source={contentTail} />
                </div>
              )}

              {/* Disclaimer AMF complet */}
              <div className="mt-12">
                <AmfDisclaimer variant="comparatif" />
              </div>

              {/* Author full */}
              <AuthorCard authorId={article.author} variant="full" />

              {/* Articles similaires */}
              {related.length > 0 && (
                <section className="mt-16">
                  <h2 className="text-2xl font-bold tracking-tight text-fg">
                    Articles similaires
                  </h2>
                  <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2">
                    {related.map((r) => (
                      <Link
                        key={r.slug}
                        href={`/blog/${r.slug}`}
                        className="group glass overflow-hidden rounded-2xl transition-transform hover:translate-y-[-2px]
                                   focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                      >
                        <div
                          className={`relative h-32 bg-gradient-to-br ${r.gradient}`}
                        >
                          <div className="absolute inset-0 bg-grid opacity-30" />
                          <span className="absolute left-3 top-3 rounded-full bg-background/70 px-2.5 py-1 text-xs font-semibold backdrop-blur">
                            {r.category}
                          </span>
                        </div>
                        <div className="p-4">
                          <h3 className="font-semibold text-fg group-hover:text-primary-glow">
                            {r.title}
                          </h3>
                          <p className="mt-1 text-xs text-muted">
                            {r.readTime} · {formatFrenchDate(r.date)}
                          </p>
                        </div>
                      </Link>
                    ))}
                  </div>

                  <div className="mt-8 text-center">
                    <Link
                      href="/blog"
                      className="inline-flex items-center gap-2 text-sm font-semibold text-primary-glow hover:underline"
                    >
                      Voir tous les articles
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </div>
                </section>
              )}

              {/* "Voir aussi" entity-driven — cryptos / plateformes / outils
                  / termes mentionnés dans le texte de l'article. Complémentaire
                  du graphe cluster (RelatedPagesNav) : ce bloc-ci est dérivé
                  data, l'autre est curaté humainement. */}
              <RelatedEntities text={article.content} limit={6} />

              {/* Maillage interne — cluster sémantique du graphe */}
              <RelatedPagesNav
                currentPath={`/blog/${article.slug}`}
                limit={4}
                variant="default"
              />
            </div>

            {/* Sidebar — TOC sticky + Articles populaires.
                FIX #3 audit conversion 2026-04-26 : ArticleToc ajouté en
                premier (au-dessus du fold sidebar) pour donner une vue
                d'ensemble de l'article + progress bar haut de page. */}
            <aside className="lg:col-span-1">
              <div className="space-y-8">
                <ArticleToc slug={article.slug} minHeadings={3} />
                <div className="lg:sticky lg:top-24">
                  <PopularArticles excludeSlug={article.slug} limit={5} />
                </div>
              </div>
            </aside>
          </div>
        </div>
      </article>

      {/* Next Steps Guide — main tenue : 3 prochaines étapes contextuelles
          selon la catégorie de l'article (fiscalité, sécurité, débutant…). */}
      <NextStepsGuide context="article" articleCategory={article.category} />

      {/* Sticky CTA mobile (intent commercial uniquement).
          FIX #5 audit conversion 2026-04-26 : sur articles "acheter X", on
          expose une CTA affilié persistante mobile. Pas affichée sur articles
          informationnels (réglementation, sécurité…) pour ne pas saouler. */}
      {isTransactionalArticle && stickyPlatform && (
        <MobileStickyCTA
          platformId={stickyPlatform.id}
          title={`Recommandé : ${stickyPlatform.name}`}
          label={`Aller sur ${stickyPlatform.name}`}
          href={stickyPlatform.affiliateUrl}
          surface="blog-transactional"
        />
      )}
    </>
  );
}
