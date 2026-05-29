import type { Metadata } from "next";
import Link from "next/link";
import { Newspaper, Info, ChevronLeft, ChevronRight, ArrowRight } from "lucide-react";

import { BRAND } from "@/lib/brand";
import { withHreflang } from "@/lib/seo-alternates";
import { formatRelativeFr } from "@/lib/news-aggregator";
import {
  getAllNewsSummaries,
  getNewsCountsByCategory,
} from "@/lib/news-mdx";
import {
  categoryFromSlug,
  NEWS_CATEGORY_LABELS,
  NEWS_CATEGORY_SLUGS,
  type NewsCategory,
  type NewsSummary,
} from "@/lib/news-types";
import {
  breadcrumbSchema,
  graphSchema,
  websiteSchema,
  type JsonLd,
} from "@/lib/schema";
import StructuredData from "@/components/StructuredData";
import NewsCard from "@/components/news/NewsCard";
import NewsFilters from "@/components/news/NewsFilters";
import BriefHero from "@/components/news/BriefHero";

/**
 * /actualites — Hub d'actualités crypto FR (news Cryptoreflex réécrites).
 *
 * Server Component, ISR 600s (10 min). Lit `content/news/*.mdx`, applique le
 * filtre catégorie depuis querystring, pagine 20 par page.
 *
 * SEO :
 *  - h1, meta, OG, twitter, hreflang fr-FR, canonical
 *  - JSON-LD WebSite + BreadcrumbList + ItemList des news visibles
 *  - URLs paginées exposent rel=prev/next via Link headers metadata.other
 *
 * Compliance YMYL :
 *  - Disclaimer en pied de page rappelant la nature pédagogique
 *  - Source citée pour chaque card (badge + URL externe sur la fiche détail)
 */

// ISR : la page est régénérée toutes les 600s, mais reste dynamique pour
// supporter les `searchParams` (filtre catégorie + pagination) sans blacklister
// les variantes du cache statique.
export const revalidate = 600;

const PAGE_PATH = "/actualites";
const PAGE_URL = `${BRAND.url}${PAGE_PATH}`;
const PAGE_SIZE = 20;
// BATCH 60#2 (2026-05-04) — retire 'Cryptoreflex' du title : layout root applique
// deja template '%s | Cryptoreflex' -> sinon doublon 'Cryptoreflex | Cryptoreflex'
// dans <title> + onglet navigateur + SERP.
const PAGE_TITLE = "Actualités crypto FR — analyses & decryptages 2026";
const PAGE_DESCRIPTION =
  "Toutes les actualités crypto françaises décryptées par Cryptoreflex : marché, régulation MiCA, technologie blockchain et plateformes. Mises à jour quotidiennement.";

export const metadata: Metadata = {
  title: PAGE_TITLE,
  description: PAGE_DESCRIPTION,
  alternates: withHreflang(PAGE_URL),
  openGraph: {
    title: PAGE_TITLE,
    description: PAGE_DESCRIPTION,
    url: PAGE_URL,
    type: "website",
    locale: "fr_FR",
    siteName: BRAND.name,
  },
  twitter: {
    card: "summary_large_image",
    title: PAGE_TITLE,
    description: PAGE_DESCRIPTION,
  },
  keywords: [
    "actualités crypto",
    "news crypto fr",
    "actualité bitcoin",
    "actualité ethereum",
    "régulation MiCA",
    "ETF Bitcoin",
    "Cryptoreflex",
  ],
  robots: { index: true, follow: true },
};

interface PageProps {
  searchParams?: { categorie?: string; page?: string };
}

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

function buildItemListSchema(items: NewsSummary[]): JsonLd {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Actualités crypto Cryptoreflex",
    description:
      "Liste des dernières analyses publiées par Cryptoreflex sur l'actualité crypto francophone.",
    numberOfItems: items.length,
    itemListOrder: "https://schema.org/ItemListOrderDescending",
    itemListElement: items.map((it, idx) => ({
      "@type": "ListItem",
      position: idx + 1,
      url: `${BRAND.url}/actualites/${it.slug}`,
      name: it.title,
    })),
  };
}

function parsePage(raw: string | undefined): number {
  const n = parseInt(String(raw ?? "1"), 10);
  if (!Number.isFinite(n) || n < 1) return 1;
  return Math.min(n, 999); // cap defensif
}

/* -------------------------------------------------------------------------- */
/* Page                                                                       */
/* -------------------------------------------------------------------------- */

export default async function ActualitesPage({ searchParams }: PageProps) {
  // 1) Lecture data
  const [all, counts] = await Promise.all([
    getAllNewsSummaries(),
    getNewsCountsByCategory(),
  ]);

  // 2) Filtre catégorie
  const activeCategory: NewsCategory | null = categoryFromSlug(searchParams?.categorie);
  const filtered = activeCategory
    ? all.filter((n) => n.category === activeCategory)
    : all;

  // 2bis) Brief du jour mis en "une" (page 1, sans filtre catégorie).
  const brief = all.find((n) => n.isBrief) ?? null;
  const page = parsePage(searchParams?.page);
  const showBrief = !activeCategory && page === 1 && brief !== null;

  // 3) Pagination — la grille exclut le brief quand il est affiché en une
  // (évite le doublon). Sur les pages 2+ ou en filtre, il reste listé.
  const listSource =
    showBrief && brief ? filtered.filter((n) => n.slug !== brief.slug) : filtered;
  const totalPages = Math.max(1, Math.ceil(listSource.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const start = (safePage - 1) * PAGE_SIZE;
  const visible = listSource.slice(start, start + PAGE_SIZE);

  // "À la une" : la dernière analyse mise en vedette (grand format), affichée
  // seulement page 1 sans filtre. Le reste passe dans la grille "Dernières
  // analyses". Sur les pages 2+ ou en filtre, tout reste en grille.
  const featured = !activeCategory && safePage === 1 && visible.length > 0 ? visible[0] : null;
  const gridItems = featured ? visible.slice(1) : visible;

  // 4) JSON-LD
  const breadcrumb = breadcrumbSchema([
    { name: "Accueil", url: "/" },
    { name: "Actualités", url: PAGE_PATH },
    ...(activeCategory
      ? [
          {
            name: NEWS_CATEGORY_LABELS[activeCategory],
            url: `${PAGE_PATH}?categorie=${NEWS_CATEGORY_SLUGS[activeCategory]}`,
          },
        ]
      : []),
  ]);
  const schemas = graphSchema([
    websiteSchema(),
    breadcrumb,
    buildItemListSchema(visible),
  ]);

  // 5) Heading dynamique selon catégorie
  const headingSuffix = activeCategory
    ? ` — ${NEWS_CATEGORY_LABELS[activeCategory]}`
    : "";

  return (
    <section className="py-12 sm:py-16">
      <StructuredData data={schemas} id="actualites-list" />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Breadcrumb */}
        <nav className="text-xs text-muted" aria-label="Fil d'Ariane">
          <Link href="/" className="hover:text-fg">Accueil</Link>
          <span className="mx-2" aria-hidden="true">/</span>
          {activeCategory ? (
            <>
              <Link href={PAGE_PATH} className="hover:text-fg">Actualités</Link>
              <span className="mx-2" aria-hidden="true">/</span>
              {/* BLOCK 11 fix (Agent /actualites audit P2) : aria-current="page"
                  sur dernier élément du fil d'Ariane → annonce explicite SR
                  que c'est la page courante (WCAG 2.4.8 Location). */}
              <span className="text-fg/80" aria-current="page">
                {NEWS_CATEGORY_LABELS[activeCategory]}
              </span>
            </>
          ) : (
            <span className="text-fg/80" aria-current="page">Actualités</span>
          )}
        </nav>

        {/* HERO */}
        <header className="mt-6 mb-8 max-w-3xl">
          <span className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary-glow">
            <Newspaper className="h-3.5 w-3.5" aria-hidden="true" />
            Le Journal Cryptoreflex · édition quotidienne
          </span>
          <h1 className="mt-4 text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight leading-tight">
            Actualités crypto françaises{headingSuffix && (
              <>{" "}<span className="gradient-text">{headingSuffix.replace(" — ", "")}</span></>
            )}
            {!headingSuffix && (
              <>{" "}<span className="gradient-text">décryptées</span></>
            )}
          </h1>
          <p className="mt-3 text-base sm:text-lg text-muted leading-relaxed">
            Chaque jour, Cryptoreflex sélectionne et analyse les actualités crypto
            qui comptent pour les investisseurs français : régulation MiCA, marché
            Bitcoin et Ethereum, plateformes agréées, fiscalité.
          </p>

          <p
            role="note"
            className="mt-4 flex items-start gap-2 rounded-xl border border-info/30 bg-info/5 p-3 text-xs leading-relaxed text-info-fg"
          >
            <Info className="h-4 w-4 shrink-0 mt-0.5" aria-hidden="true" />
            <span>
              Les analyses sont rédigées par notre équipe éditoriale à partir de
              sources publiques (médias spécialisés, communiqués officiels).
              Sources citées en bas de chaque article. Ces contenus sont
              informatifs et ne constituent pas un conseil en investissement.
            </span>
          </p>
        </header>

        {/* LA UNE — brief crypto du jour (édito) */}
        {showBrief && brief && (
          <div className="mb-10">
            <BriefHero brief={brief} />
          </div>
        )}

        {/* À LA UNE — dernière analyse en vedette (grand format magazine) */}
        {featured && (
          <section aria-labelledby="featured-h" className="mb-12">
            <h2
              id="featured-h"
              className="mb-4 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-primary-soft"
            >
              <span className="h-px w-6 bg-primary/50" aria-hidden="true" />
              À la une
            </h2>
            <FeaturedNews news={featured} />
          </section>
        )}

        {/* FILTRES CATÉGORIES */}
        <div className="mt-2 mb-6">
          <NewsFilters
            active={activeCategory}
            counts={counts}
            total={all.length}
            basePath={PAGE_PATH}
          />
        </div>

        {/* GRID — dernières analyses */}
        <h2 className="mb-5 text-lg font-bold tracking-tight text-fg sm:text-xl">
          {activeCategory ? NEWS_CATEGORY_LABELS[activeCategory] : "Dernières analyses"}
        </h2>
        {gridItems.length === 0 ? (
          <div className="rounded-2xl border border-border bg-surface p-10 text-center">
            <Newspaper className="mx-auto mb-3 h-8 w-8 text-muted" aria-hidden="true" />
            <p className="text-fg/70">
              Aucune autre actualité disponible{activeCategory ? ` dans la catégorie ${NEWS_CATEGORY_LABELS[activeCategory]}` : ""}{" "}
              pour le moment.
            </p>
            <Link
              href={PAGE_PATH}
              className="mt-4 inline-block text-sm font-semibold text-primary-glow hover:underline"
            >
              Voir toutes les actualités
            </Link>
          </div>
        ) : (
          <ul
            role="list"
            className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3"
          >
            {gridItems.map((news) => (
              <li key={news.slug} className="list-none">
                <NewsCard news={news} />
              </li>
            ))}
          </ul>
        )}

        {/* PAGINATION */}
        {totalPages > 1 && (
          <Pagination
            currentPage={safePage}
            totalPages={totalPages}
            basePath={PAGE_PATH}
            categorySlug={
              activeCategory ? NEWS_CATEGORY_SLUGS[activeCategory] : undefined
            }
          />
        )}

        {/* FOOTER DISCLAIMER YMYL */}
        <footer className="mt-14 space-y-3 rounded-2xl border border-border bg-surface/60 p-5 text-xs text-muted leading-relaxed">
          <p>
            <strong className="text-fg/85">Avertissement</strong> — Les analyses
            publiées sur cette page ont une vocation pédagogique et informative.
            Elles ne constituent pas un conseil en investissement, ni une
            sollicitation à acheter ou vendre des cryptoactifs. Les
            cryptomonnaies sont des actifs volatils : tu peux perdre tout ou
            partie de ton capital. Consulte toujours un conseiller financier
            agréé avant d'engager des fonds.
          </p>
          <p>
            <strong className="text-fg/85">Sources</strong> — Chaque article cite
            la source originale (média ou organisme officiel) avec un lien
            externe (rel="nofollow noopener"). Cryptoreflex ne réhéberge ni ne
            traduit intégralement le contenu : nos analyses sont des reformulations
            originales orientées vers le contexte français (MiCA, fiscalité,
            plateformes agréées).
          </p>
        </footer>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/* Pagination                                                                 */
/* -------------------------------------------------------------------------- */

function Pagination({
  currentPage,
  totalPages,
  basePath,
  categorySlug,
}: {
  currentPage: number;
  totalPages: number;
  basePath: string;
  categorySlug?: string;
}) {
  const buildHref = (p: number): string => {
    const params = new URLSearchParams();
    if (categorySlug) params.set("categorie", categorySlug);
    if (p > 1) params.set("page", String(p));
    const qs = params.toString();
    return qs ? `${basePath}?${qs}` : basePath;
  };

  const prev = currentPage > 1 ? buildHref(currentPage - 1) : null;
  const next = currentPage < totalPages ? buildHref(currentPage + 1) : null;

  return (
    <nav
      role="navigation"
      aria-label="Pagination des actualités"
      className="mt-10 flex items-center justify-between gap-4 border-t border-border pt-6"
    >
      <div className="text-xs text-muted">
        Page <span className="font-mono text-fg/85">{currentPage}</span> sur{" "}
        <span className="font-mono text-fg/85">{totalPages}</span>
      </div>
      <div className="flex items-center gap-2">
        {prev ? (
          <Link
            href={prev}
            rel="prev"
            className="inline-flex items-center gap-1 rounded-lg border border-border bg-surface px-3 py-1.5 text-xs font-semibold text-fg/85 hover:border-primary/40 hover:text-fg transition-colors"
          >
            <ChevronLeft className="h-3.5 w-3.5" aria-hidden="true" />
            Précédent
          </Link>
        ) : (
          <span className="inline-flex items-center gap-1 rounded-lg border border-border/40 bg-surface/40 px-3 py-1.5 text-xs font-semibold text-muted/50">
            <ChevronLeft className="h-3.5 w-3.5" aria-hidden="true" />
            Précédent
          </span>
        )}
        {next ? (
          <Link
            href={next}
            rel="next"
            className="inline-flex items-center gap-1 rounded-lg border border-primary/30 bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary-glow hover:bg-primary/20 transition-colors"
          >
            Suivant
            <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
          </Link>
        ) : (
          <span className="inline-flex items-center gap-1 rounded-lg border border-border/40 bg-surface/40 px-3 py-1.5 text-xs font-semibold text-muted/50">
            Suivant
            <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
          </span>
        )}
      </div>
    </nav>
  );
}

/* -------------------------------------------------------------------------- */
/* À la une — carte vedette grand format (magazine)                           */
/* -------------------------------------------------------------------------- */

const FEATURED_BADGE: Record<string, string> = {
  "Marché": "bg-amber-500/15 text-amber-200 ring-amber-500/30",
  "Régulation": "bg-rose-500/15 text-rose-200 ring-rose-500/30",
  Technologie: "bg-cyan-500/15 text-cyan-200 ring-cyan-500/30",
  Plateformes: "bg-fuchsia-500/15 text-fuchsia-200 ring-fuchsia-500/30",
};

function FeaturedNews({ news }: { news: NewsSummary }) {
  const relDate = formatRelativeFr(news.date);
  const catLabel = NEWS_CATEGORY_LABELS[news.category];
  const badge = FEATURED_BADGE[news.category] ?? "bg-muted/15 text-muted ring-border";

  return (
    <Link
      href={`/actualites/${news.slug}`}
      aria-label={`Lire l'analyse à la une : ${news.title}`}
      className="group relative grid overflow-hidden rounded-3xl border border-border bg-elevated transition-all
                 duration-normal hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-e2 focus:outline-none
                 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2
                 focus-visible:ring-offset-background lg:grid-cols-2"
    >
      <div className="relative aspect-[16/9] overflow-hidden lg:aspect-auto lg:h-full lg:min-h-[300px]">
        <img
          src={news.image || `/actualites/${news.slug}/opengraph-image?v=${news.date}`}
          alt={`Couverture — ${news.title}`}
          className="absolute inset-0 h-full w-full object-cover transition-transform duration-slow group-hover:scale-[1.03]"
          loading="eager"
          decoding="async"
          width={1200}
          height={630}
        />
        <span
          className={`absolute left-4 top-4 z-10 inline-flex items-center rounded-full px-3 py-1 text-[11px]
                      font-semibold uppercase tracking-wider ring-1 backdrop-blur-sm ${badge}`}
        >
          {catLabel}
        </span>
      </div>
      <div className="flex flex-col justify-center gap-4 p-6 sm:p-8 lg:p-10">
        <div className="flex items-center gap-2 text-xs text-muted">
          <span className="font-semibold text-fg/80">{news.source}</span>
          {relDate && (
            <>
              <span aria-hidden="true">·</span>
              <time dateTime={news.date} className="font-mono">
                {relDate}
              </time>
            </>
          )}
        </div>
        <h3 className="font-display text-2xl leading-tight text-fg transition-colors group-hover:text-primary-glow sm:text-3xl">
          {news.title}
        </h3>
        {news.description && (
          <p className="line-clamp-3 text-sm leading-relaxed text-fg/70 sm:text-base">
            {news.description}
          </p>
        )}
        <span className="mt-1 inline-flex items-center gap-1.5 text-sm font-semibold text-primary-soft transition-all group-hover:gap-2.5">
          Lire l'analyse
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </span>
      </div>
    </Link>
  );
}
