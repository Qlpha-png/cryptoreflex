import { avecTypo } from "@/components/ui/Typo";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { typoFr } from "@/lib/typo-fr";
import { ArrowRight } from "lucide-react";

import {
  getArticleBySlug,
  getArticleSlugs,
  getRelatedArticles,
} from "@/lib/mdx";
import MdxContent from "@/components/MdxContent";
import TrustBox from "@/components/ui/TrustBox";
import Callout from "@/components/mdx/Callout";
import { typesRemuneres, sourcesOfficielles } from "@/lib/article-confiance";
import { getAffiliationKind, isPaidLink, lignesRemuneration } from "@/lib/partnerships";
import { findLessonBySlug, getTrack } from "@/lib/academy-tracks";
import { RISK } from "@/lib/risk-text";
import { derniereModification } from "@/lib/article-dates";
import CorrectionNotice from "@/components/CorrectionNotice";
import StructuredData from "@/components/StructuredData";
import NewsletterInline from "@/components/NewsletterInline";
import ArticleToc from "@/components/blog/ArticleToc";
import RelatedPagesNav from "@/components/RelatedPagesNav";
import MobileStickyCTA from "@/components/MobileStickyCTA";
import { getAllPlatforms, isAvailableFr } from "@/lib/platforms";
import { BRAND } from "@/lib/brand";
import { withHreflang } from "@/lib/seo-alternates";
import { stripBrandSuffix } from "@/lib/seo-title";
import { articleSchema, graphSchema, organizationSchema, generateSpeakableSchema } from "@/lib/schema";
import {
  authorPersonSchema,
  getAuthorByIdOrDefault,
  articleAuthorId,
} from "@/lib/authors";
import { fitDescription, fitTitle } from "@/lib/seo-text";
import Breadcrumbs from "@/components/Breadcrumbs";

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

// FIX SEO 2026-05-05 — Bloquer les slugs hors generateStaticParams au niveau
// routing. Avant : `/blog/article-qui-existe-pas` retournait HTTP 200 +
// page "Article introuvable" (mauvais pour SEO + UX). Cause : avec
// dynamicParams=true par défaut + ISR, notFound() est rendu mais Next.js
// servait souvent en 200 au lieu de 404. dynamicParams=false force un vrai
// 404 native pour tout slug hors la liste pré-générée → meilleur signal Google
// (canonical pages vs pages d'erreur), nettoie la Search Console, et améliore
// l'expérience utilisateur.
export const dynamicParams = false;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const article = await getArticleBySlug(params.slug);
  if (!article) return { title: "Article introuvable" };

  const url = `${BRAND.url}/blog/${article.slug}`;
  const author = getAuthorByIdOrDefault(articleAuthorId(article.author));

  // AUDIT 2026-05-03 — preference metaTitle/metaDescription pour SERP (<60/<155
  // chars) avec fallback titre/description complet pour le rendu page.
  // stripBrandSuffix : le template root ajoute déjà « | Cryptoreflex ».
  const seoTitle = stripBrandSuffix(article.metaTitle || article.title);
  const seoDescription = article.metaDescription || article.description;
  // og:image fallback sur l'OG image dynamique generee par Next.js
  // (/blog/[slug]/opengraph-image) si pas de cover MDX explicite.
  const ogImageUrl = article.cover || `${url}/opengraph-image`;

  return {
    // Titre ≤ 65 caractères, suffixe « | Cryptoreflex » seulement s'il tient, raccourci proprement sinon
    // (lib/seo-text.ts, audit du 05/10/2026 : 4 articles dépassaient encore 70 caractères).
    title: fitTitle(seoTitle),
    description: fitDescription(seoDescription),
    keywords: article.keywords,
    alternates: withHreflang(url),
    authors: [{ name: author.name, url: `/auteur/${author.id}` }],
    openGraph: {
      type: "article",
      url,
      title: seoTitle,
      description: seoDescription,
      publishedTime: article.date,
      modifiedTime: derniereModification(article),
      authors: [`/auteur/${author.id}`],
      tags: article.keywords,
      siteName: BRAND.name,
      locale: "fr_FR",
      images: [{ url: ogImageUrl, width: 1200, height: 630, alt: article.title }],
    },
    twitter: {
      card: "summary_large_image",
      title: seoTitle,
      description: seoDescription,
      images: [ogImageUrl],
    },
  };
}

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                   */
/* -------------------------------------------------------------------------- */

function formatFrenchDate(iso: string): string {
  // FIX B cohérence dates (2026-05-09) — uniformisation DD/MM/YYYY sur tout
  // le site (avant : "DD mois YYYY" en français long, incohérent avec les
  // fiches crypto et le calculateur).
  return new Date(iso).toLocaleDateString("fr-FR");
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

async function BlogArticlePage({ params }: Props) {
  const article = await getArticleBySlug(params.slug);
  if (!article) notFound();

  const author = getAuthorByIdOrDefault(articleAuthorId(article.author));
  const related = await getRelatedArticles(article.slug, 3);

  // Maillage bidirectionnel : si cet article est une leçon de l'académie, on
  // renvoie vers le parcours complet (le parcours, lui, pointe déjà vers les fiches).
  const academyLesson = findLessonBySlug(article.slug);
  const academyTrack = academyLesson ? getTrack(academyLesson.trackId) : null;

  // Étude #9 ETUDE-2026-05-02 : enrichissement schema.org pour ce template.
  // - Article schema : déjà présent (titre, auteur, date, etc.)
  // - SpeakableSpecification : NEW. Permet à Google Assistant / Alexa / Siri
  //   de lire à voix haute le H1 + les paragraphes [data-speakable] (voice search,
  //   featured snippets vocaux, +10-20% CTR estimé sur les recherches conversationnelles).
  // - Breadcrumb : déjà présent.
  // - Pas de FAQPage ici car le frontmatter MDX actuel n'a pas de
  //   `quickAnswerQuestion` — à réintroduire si on étend le contrat data.
  // Date de dernière modification RÉELLE (frontmatter + corrections publiées) : en-tête, encadré, JSON-LD et Open Graph la partagent.
  const derniere = derniereModification(article);
  const articleJsonLd = articleSchema({
    slug: article.slug,
    title: article.title,
    description: article.description,
    excerpt: article.description,
    category: article.category,
    tags: article.keywords,
    date: article.date,
    dateModified: derniere,
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
    const allPlatforms = getAllPlatforms().filter(isAvailableFr);
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

  // Lot B4 — encadré de confiance : ce que la page affiche réellement, lu dans l'article (lib/article-confiance.ts) :
  //  · types de liens rémunérés = ceux du texte MDX + celui du bouton collant mobile s'il en affiche un ;
  //  · sources = celles du frontmatter, sinon les sites officiels déjà cités dans le texte (rien d'inventé).
  const typesLiens = typesRemuneres(article.content);
  if (stickyPlatform && isPaidLink(stickyPlatform.id, stickyPlatform.affiliateUrl)) {
    const k = getAffiliationKind(stickyPlatform.id);
    if (k) typesLiens.add(k);
  }
  const lignesRemu = lignesRemuneration(typesLiens);
  const sourcesFront = article.sources && article.sources.length > 0 ? article.sources : null;
  const sourcesAffichees = sourcesFront ?? sourcesOfficielles(article.content);
  const sourcesTitre = sourcesFront ? "Sources" : "Textes officiels cités";
  const lecture = /lecture/i.test(article.readTime) ? article.readTime : `${article.readTime} de lecture`;

  return (
    <>
      <StructuredData data={schemas} id="article-graph" />

      <article className="py-10 sm:py-14">
        <div className="mx-auto max-w-[70rem] px-4 sm:px-6 lg:px-8">
          <Breadcrumbs chemin={`/blog/${article.slug}`} label={article.title} compactMobile />

          {/* Mise en page (maquette C+) : sommaire collant à gauche dès 64 em, colonne de lecture de 34 em à droite.
              Ronde 1 du jury B4 : le point de rupture est en em (il suit la taille de texte du visiteur) et la mise en page
              est un « flex-wrap » dont la colonne de lecture garde au moins 36 rem : à 200 % la colonne ne s'effondre plus
              (elle passe en pleine largeur, sommaire en accordéon), avant : 240 px soit 12 signes par ligne.
              FIX RESPONSIVE 2026-05-02 #6 : `min-w-0` sur les enfants (une table large ou un long titre ne gonfle pas la
              colonne, le défilement local des tableaux reste actif). */}
          <div className="mt-8 flex flex-wrap justify-center gap-x-14 gap-y-0">
            <aside className="hidden min-w-0 [@media(min-width:64em)]:block [@media(min-width:64em)]:flex-[0_1_16rem]">
              <ArticleToc slug={article.slug} minHeadings={3} variante="bureau" />
            </aside>

            <div className="w-full min-w-0 max-w-[42.5rem] flex-[1_1_36rem]">
              {/* En-tête (maquette) : surtitre catégorie · temps de lecture, filet or, titre, chapô, signature. Le dégradé
                  `gradient` du frontmatter n'est plus lu et l'image de couverture décorative est retirée (la page garde
                  son og:image dans les métadonnées). */}
              <header>
                <p className="flex flex-wrap items-center gap-x-3 text-base font-semibold text-primary">
                  <span>{article.category}</span>
                  <span aria-hidden="true" className="-mx-1 hidden font-normal text-fg-4 sm:inline">
                    ·
                  </span>
                  <span className="font-normal text-muted">{lecture}</span>
                </p>
                <span aria-hidden="true" className="mt-3 block h-[3px] w-16 rounded-full bg-link-line" />

                <h1 className="mt-5 text-[2.5rem] font-medium leading-[1.08] tracking-[-0.02em] text-fg md:text-[3.25rem]">
                  {typoFr(article.title)}
                </h1>

                <p className="lead mt-5 max-w-[34em] text-[1.25rem] leading-normal text-fg-2">{typoFr(article.description)}</p>

                <div className="mt-6">
                  <TrustBox
                    variante="ligne"
                    auteur={articleAuthorId(article.author)}
                    publieLe={article.date}
                    misAJourLe={derniere}
                  />
                </div>
              </header>

              {/* Sommaire sur petit écran (et texte agrandi) : APRÈS l'en-tête, dans un repère de navigation. Sa place est
                  réservée (accordéon fermé 54 px + marge 24 px) : aucun décalage de mise en page au chargement. */}
              <div className="mt-6 min-h-[78px] [@media(min-width:64em)]:hidden">
                <ArticleToc slug={article.slug} minHeadings={3} variante="mobile" />
              </div>

              {/* Avertissement unique (ronde 1 du jury) : le risque, une fois, en tête, avec la phrase de lib/risk-text.ts.
                  Plus d'« Avertissement — comparatif » en fin d'article : il parlait de comparatif et d'une absence de surcoût
                  sur des articles qui n'en sont pas ; la rémunération est dite par l'encadré de confiance, une seule fois. */}
              <Callout type="danger" title="Avertissement">
                {RISK.short}
              </Callout>

              {/* Maillage fiscal (reprise B3a) : chaque article de fiscalité mène au hub des outils pour déclarer */}
              {article.category?.trim().toLowerCase() === "fiscalité" && (
                <p className="mt-6 max-w-none rounded-xl border border-border bg-surface p-4 text-base text-fg-2">
                  <strong className="text-fg">Passer à la déclaration : </strong>
                  <Link href="/impots" className="font-semibold text-fg underline decoration-link-line decoration-2 underline-offset-[0.28em] hover:decoration-[3px]">
                    les outils gratuits pour calculer, remplir le Cerfa 2086 et le 3916-bis
                  </Link>
                  , étape par étape.
                </p>
              )}

              {/* Contenu MDX — split ~60% pour insérer la NewsletterInline */}
              <div className="mt-10">
                <MdxContent source={contentHead} />
              </div>

              {/* NewsletterInline — encart au cœur de l'article (P1-9). Composant et texte uniques (lot B4). */}
              <div className="my-10">
                <NewsletterInline source="blog-cta" />
              </div>

              {contentTail && (
                <div>
                  <MdxContent source={contentTail} />
                </div>
              )}

              {/* « Corrigé le … » (06/10/2026) : corrections publiées dans data/corrections.json pour ce slug ;
                  ne rend rien si l'article n'a aucune correction. Avant la signature, comme le promet /charte. */}
              <CorrectionNotice slug={article.slug} />

              {/* Fin d'article sobre (ronde 1 du jury) : encadré de confiance (sources comprises), puis la suite de lecture. */}
              <TrustBox
                variante="complet"
                auteur={articleAuthorId(article.author)}
                publieLe={article.date}
                misAJourLe={derniere}
                remuneration={lignesRemu}
                sources={sourcesAffichees}
                sourcesTitre={sourcesTitre}
                retour={{ href: "/blog", label: "Tous les articles" }}
              />

              {/* Maillage académie : cet article est une leçon d'un parcours */}
              {academyTrack && (
                <Callout type="info" title="À savoir">
                  Cet article est une leçon du parcours <strong>{academyTrack.title}</strong> de l&apos;académie, avec
                  progression suivie et quiz de validation.{" "}
                  <Link
                    href={`/academie/${academyTrack.id}`}
                    className="text-link underline decoration-link-line decoration-2 underline-offset-[0.28em] hover:text-link-hover hover:decoration-[3px]"
                  >
                    Suivre le parcours
                  </Link>
                </Callout>
              )}

              {/* Articles similaires : cartes de texte (le dégradé du frontmatter n'est plus lu, plus d'image décorative) */}
              {related.length > 0 && (
                <section className="mt-16">
                  <h2 className="text-2xl font-medium tracking-tight text-fg sm:text-[1.75rem]">Articles similaires</h2>
                  <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2">
                    {related.map((r) => (
                      <Link
                        key={r.slug}
                        href={`/blog/${r.slug}`}
                        className="group block rounded-2xl border border-border bg-surface p-5 shadow-e1 transition hover:-translate-y-0.5 hover:border-border-strong hover:shadow-e2 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-focus"
                      >
                        <p className="text-base text-muted">
                          {r.readTime} · {formatFrenchDate(r.date)}
                        </p>
                        <h3 className="mt-1 text-lg font-semibold leading-snug text-fg group-hover:underline group-hover:decoration-link-line group-hover:decoration-2 group-hover:underline-offset-[0.28em]">
                          {r.title}
                        </h3>
                        <p className="mt-2 text-base leading-relaxed text-fg-2">{r.description}</p>
                      </Link>
                    ))}
                  </div>

                  <p className="mt-6">
                    <Link
                      href="/blog"
                      className="inline-flex items-center gap-2 text-base font-semibold text-link underline decoration-link-line decoration-2 underline-offset-[0.28em] hover:text-link-hover hover:decoration-[3px]"
                    >
                      Voir tous les articles
                      <ArrowRight className="h-4 w-4" aria-hidden="true" />
                    </Link>
                  </p>
                </section>
              )}

              {/* Une seule suite, issue du graphe de maillage curaté (lib/internal-link-graph.ts). « Articles récents »,
                  « Voir aussi » (RelatedEntities) et « Prochaines étapes » (NextStepsGuide, 2e carte newsletter) ne sont plus
                  rendus dans le gabarit d'article : 6 blocs de liens après l'encadré de confiance (ronde 1 du jury). */}
              <RelatedPagesNav
                currentPath={`/blog/${article.slug}`}
                limit={4}
                variant="default"
                title="Allez plus loin"
              />
            </div>
          </div>
        </div>
      </article>

      {/* Sticky CTA mobile (intent commercial uniquement).
          FIX #5 audit conversion 2026-04-26 : sur articles "acheter X", on
          expose une CTA affilié persistante mobile. Pas affichée sur articles
          informationnels (réglementation, sécurité…) pour ne pas saouler. */}
      {isTransactionalArticle && stickyPlatform && (
        <MobileStickyCTA
          platformId={stickyPlatform.id}
          title={stickyPlatform.name}
          label={`Aller sur ${stickyPlatform.name}`}
          href={stickyPlatform.affiliateUrl}
          surface="blog-transactional"
        />
      )}
    </>
  );
}

export default avecTypo(BlogArticlePage, { riche: true });
