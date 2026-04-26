import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import dynamic from "next/dynamic";
import { ArrowRight, Calendar, ExternalLink, ShoppingBag } from "lucide-react";

import { getTAArticleBySlug, getTASlugs, getAllTASummaries } from "@/lib/ta-mdx";
import { BRAND } from "@/lib/brand";
import {
  breadcrumbSchema,
  generateSpeakableSchema,
  organizationSchema,
  graphSchema,
} from "@/lib/schema";
import StructuredData from "@/components/StructuredData";
import MdxContent from "@/components/MdxContent";
import TrendBadge from "@/components/ta/TrendBadge";
import IndicatorsTable from "@/components/ta/IndicatorsTable";
import SupportResistanceList from "@/components/ta/SupportResistanceList";

// PriceChart : Client Component (fetch /api/historical au mount).
// Lazy-load pour ne pas casser le SSR ni alourdir le bundle initial.
// Pattern identique à app/cryptos/[slug]/page.tsx.
const PriceChart = dynamic(
  () => import("@/components/crypto-detail/PriceChart"),
  {
    loading: () => (
      <div
        className="h-64 animate-pulse rounded-2xl bg-elevated/40"
        aria-label="Chargement du graphique de prix"
      />
    ),
    ssr: false,
  },
);

/* -------------------------------------------------------------------------- */
/*  Static generation                                                         */
/* -------------------------------------------------------------------------- */

export const revalidate = 3600;

interface Props {
  params: { slug: string };
}

export async function generateStaticParams() {
  const slugs = await getTASlugs();
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const article = await getTAArticleBySlug(params.slug);
  if (!article) return {};
  return {
    title: article.title,
    description: article.description,
    alternates: {
      canonical: `${BRAND.url}/analyses-techniques/${article.slug}`,
    },
    openGraph: {
      title: article.title,
      description: article.description,
      url: `${BRAND.url}/analyses-techniques/${article.slug}`,
      type: "article",
      publishedTime: article.date,
    },
  };
}

/* -------------------------------------------------------------------------- */
/*  Page                                                                      */
/* -------------------------------------------------------------------------- */

function formatDateFr(iso: string): string {
  return new Date(iso + "T00:00:00Z").toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

function formatPrice(value: number): string {
  if (!Number.isFinite(value) || value === 0) return "—";
  if (value >= 1000) return value.toLocaleString("en-US", { maximumFractionDigits: 0 });
  if (value >= 1) return value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return value.toLocaleString("en-US", { minimumFractionDigits: 4, maximumFractionDigits: 4 });
}

function formatPct(value: number): string {
  if (!Number.isFinite(value)) return "—";
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(2)}%`;
}

export default async function TAArticlePage({ params }: Props) {
  const article = await getTAArticleBySlug(params.slug);
  if (!article) notFound();

  // "Autres analyses du jour" : même date, autres symboles.
  const all = await getAllTASummaries();
  const others = all
    .filter((a) => a.date === article.date && a.slug !== article.slug)
    .slice(0, 4);

  /* ---- JSON-LD ---------------------------------------------------------- */
  // Article (avec sous-typage AnalysisNewsArticle dans additionalType pour
  // signaler la nature analytique au crawler — Schema.org n'a pas de type
  // dédié "AnalysisNewsArticle", on utilise Article + additionalType).
  const articleLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: article.title,
    description: article.description,
    datePublished: article.date,
    dateModified: article.date,
    author: { "@type": "Organization", name: BRAND.name, url: BRAND.url },
    publisher: {
      "@type": "Organization",
      name: BRAND.name,
      url: BRAND.url,
      logo: { "@type": "ImageObject", url: `${BRAND.url}/api/logo` },
    },
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": `${BRAND.url}/analyses-techniques/${article.slug}`,
    },
    image: [article.image ? `${BRAND.url}${article.image}` : `${BRAND.url}/og-default.png`],
    articleSection: "Analyse technique",
    additionalType: "https://schema.org/AnalysisNewsArticle",
    inLanguage: "fr-FR",
    isAccessibleForFree: true,
    keywords: `${article.symbol}, ${article.name}, analyse technique, RSI, MACD, ${article.trend}`,
    about: {
      "@type": "Thing",
      name: `${article.name} (${article.symbol})`,
    },
    speakable: generateSpeakableSchema(),
  };

  const breadcrumbs = breadcrumbSchema([
    { name: "Accueil", url: "/" },
    { name: "Analyses techniques", url: "/analyses-techniques" },
    { name: `${article.symbol} — ${formatDateFr(article.date)}`, url: `/analyses-techniques/${article.slug}` },
  ]);

  const changeColor =
    article.change24h > 0 ? "text-emerald-400" : article.change24h < 0 ? "text-rose-400" : "text-muted";

  return (
    <>
      <StructuredData data={[articleLd, breadcrumbs]} id="ta-article" />

      <article className="py-12 sm:py-16">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          {/* Breadcrumb */}
          <nav aria-label="Fil d'Ariane" className="mb-4 text-xs text-muted">
            <Link href="/" className="hover:text-fg">Accueil</Link>
            <span className="mx-1">/</span>
            <Link href="/analyses-techniques" className="hover:text-fg">Analyses techniques</Link>
            <span className="mx-1">/</span>
            <span className="text-fg/80">{article.symbol}</span>
          </nav>

          {/* Header */}
          <header className="mb-8">
            <div className="flex items-center gap-3 mb-3">
              {article.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={article.image}
                  alt=""
                  className="h-10 w-10 rounded-full bg-elevated"
                  loading="eager"
                />
              ) : (
                <div className="h-10 w-10 rounded-full bg-elevated grid place-items-center text-xs font-bold text-primary">
                  {article.symbol.slice(0, 3)}
                </div>
              )}
              <div>
                <div className="text-xs uppercase tracking-wide text-muted font-mono">{article.symbol}</div>
                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                  {article.name} — Analyse technique
                </h1>
              </div>
            </div>

            <div className="flex items-center flex-wrap gap-3 text-sm">
              <TrendBadge trend={article.trend} size="md" />
              <span className="inline-flex items-center gap-1.5 text-muted">
                <Calendar className="h-3.5 w-3.5" aria-hidden="true" />
                {formatDateFr(article.date)}
              </span>
              <span className="font-mono text-fg/80">
                {formatPrice(article.currentPrice)} ${" "}
                <span className={`ml-1 font-semibold ${changeColor}`}>
                  {formatPct(article.change24h)}
                </span>
              </span>
            </div>
          </header>

          {/* Price chart en haut (lazy / no-SSR) */}
          <div className="mb-8">
            <PriceChart
              coingeckoId={article.coingeckoId}
              currency="usd"
              cryptoName={article.name}
            />
          </div>

          {/* CTAs en haut — affordance immédiate */}
          <div className="mb-10 flex flex-col sm:flex-row gap-3">
            <Link
              href={`/cryptos/${article.cryptoSlug}`}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-surface px-4 py-2.5 text-sm font-semibold text-fg hover:border-primary/40 transition-colors"
            >
              <ExternalLink className="h-4 w-4" aria-hidden="true" />
              Voir la fiche {article.name}
            </Link>
            <Link
              href="/comparatif"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-background hover:bg-primary-glow transition-colors"
            >
              <ShoppingBag className="h-4 w-4" aria-hidden="true" />
              Acheter {article.symbol} sur une plateforme régulée
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>

          {/* Indicateurs visuels (composants) — rendus en haut pour un aperçu rapide */}
          {article.indicators && (
            <div className="mb-8">
              <IndicatorsTable
                indicators={article.indicators}
                currentPrice={article.currentPrice}
              />
            </div>
          )}

          {article.levels && (
            <div className="mb-10">
              <SupportResistanceList
                levels={article.levels}
                currentPrice={article.currentPrice}
                limit={3}
              />
            </div>
          )}

          {/* Body MDX */}
          <MdxContent source={article.content} />

          {/* CTA bas — re-engagement */}
          <div className="mt-12 rounded-2xl border border-primary/20 bg-primary/5 p-6">
            <h2 className="text-lg font-bold mb-2">
              Prêt à passer de l'analyse à l'action ?
            </h2>
            <p className="text-sm text-fg/70 mb-4">
              Comparez les plateformes régulées MiCA pour acheter {article.name} en France
              en quelques minutes (frais, sécurité, ergonomie).
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <Link
                href="/comparatif"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-background hover:bg-primary-glow transition-colors"
              >
                Voir le comparatif des plateformes
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
              <Link
                href={`/cryptos/${article.cryptoSlug}`}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-surface px-4 py-2.5 text-sm font-semibold text-fg hover:border-primary/40 transition-colors"
              >
                Tout savoir sur {article.name}
              </Link>
            </div>
          </div>

          {/* Autres analyses du jour */}
          {others.length > 0 && (
            <section className="mt-12">
              <h2 className="text-lg font-bold mb-4">
                Autres analyses du{" "}
                <span className="gradient-text">{formatDateFr(article.date)}</span>
              </h2>
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {others.map((o) => (
                  <li key={o.slug}>
                    <Link
                      href={`/analyses-techniques/${o.slug}`}
                      className="flex items-center gap-3 rounded-xl border border-border bg-surface p-3 hover:border-primary/40 transition-colors"
                    >
                      {o.image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={o.image} alt="" className="h-8 w-8 rounded-full bg-elevated" loading="lazy" />
                      ) : (
                        <div className="h-8 w-8 rounded-full bg-elevated grid place-items-center text-[11px] font-bold text-primary">
                          {o.symbol.slice(0, 3)}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold truncate">{o.name}</div>
                        <div className="text-[11px] text-muted font-mono">
                          {formatPrice(o.currentPrice)} $ · RSI {o.rsi.toFixed(1)}
                        </div>
                      </div>
                      <TrendBadge trend={o.trend} size="sm" iconOnly />
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      </article>
    </>
  );
}
