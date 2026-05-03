import type { Metadata } from "next";
import Link from "next/link";
import { Newspaper, Info, ChevronLeft, ChevronRight } from "lucide-react";

import { BRAND } from "@/lib/brand";
import { withHreflang } from "@/lib/seo-alternates";
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

  // 3) Pagination
  const page = parsePage(searchParams?.page);
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const start = (safePage - 1) * PAGE_SIZE;
  const visible = filtered.slice(start, start + PAGE_SIZE);

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
            Actualités Cryptoreflex
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

        {/* FILTRES CATÉGORIES */}
        <div className="mt-2 mb-8">
          <NewsFilters
            active={activeCategory}
            counts={counts}
            total={all.length}
            basePath={PAGE_PATH}
          />
        </div>

        {/* GRID */}
        {visible.length === 0 ? (
          <div className="rounded-2xl border border-border bg-surface p-10 text-center">
            <Newspaper className="mx-auto mb-3 h-8 w-8 text-muted" aria-hidden="true" />
            <p className="text-fg/70">
              Aucune actualité disponible{activeCategory ? ` dans la catégorie ${NEWS_CATEGORY_LABELS[activeCategory]}` : ""}{" "}
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
            {visible.map((news) => (
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
