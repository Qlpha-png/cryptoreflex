import type { Metadata } from "next";
import Link from "next/link";
import { Newspaper, Info, ExternalLink } from "lucide-react";

import { BRAND } from "@/lib/brand";
import { getAggregatedNews, type NewsItem } from "@/lib/news-aggregator";
import { RSS_SOURCES } from "@/lib/rss";
import {
  breadcrumbSchema,
  graphSchema,
  type JsonLd,
} from "@/lib/schema";
import StructuredData from "@/components/StructuredData";
import NewsCard from "@/components/NewsCard";

/**
 * /actualites — Hub d'actualités crypto FR (agrégateur RSS).
 *
 * Server Component, ISR 1800s (30 min). Les flux RSS sont récupérés en
 * parallèle, dédupliqués et triés par `getAggregatedNews()`.
 *
 * Compliance :
 *  - Aucun article réhébergé : titre + extrait court (≤ 140 chars) + lien
 *    externe `rel="noopener nofollow"` (cf. NewsCard).
 *  - Disclaimer visible (hero + footer) précisant la nature agrégée du flux.
 *  - Pas de noindex : la page est éditoriale (curation + organisation),
 *    mais les liens externes sont nofollow pour ne pas envoyer de jus SEO.
 *
 * SEO :
 *  - Metadata + canonical + OG.
 *  - JSON-LD `ItemList` recensant les news (chaque item pointe vers l'URL
 *    canonique externe). Indexable.
 *  - JSON-LD `BreadcrumbList`.
 */

export const revalidate = 1800;

const PAGE_PATH = "/actualites";
const PAGE_URL = `${BRAND.url}${PAGE_PATH}`;
const PAGE_TITLE = "Actualités crypto FR — agrégées en temps réel";
const PAGE_DESCRIPTION =
  "Toutes les dernières actualités crypto françaises agrégées depuis Cryptoast, Journal du Coin, Cryptonaute et plus encore. Mis à jour toutes les 30 minutes.";

export const metadata: Metadata = {
  title: PAGE_TITLE,
  description: PAGE_DESCRIPTION,
  alternates: { canonical: PAGE_URL },
  openGraph: {
    title: PAGE_TITLE,
    description: PAGE_DESCRIPTION,
    url: PAGE_URL,
    type: "website",
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
    "agrégateur crypto",
    "cryptoast",
    "journal du coin",
    "cryptonaute",
  ],
  robots: { index: true, follow: true },
};

interface PageProps {
  searchParams?: { source?: string };
}

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

function buildItemListSchema(items: NewsItem[]): JsonLd {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Actualités crypto FR — agrégateur Cryptoreflex",
    description:
      "Liste agrégée des derniers articles publiés par les principaux médias crypto français.",
    numberOfItems: items.length,
    itemListOrder: "https://schema.org/ItemListOrderDescending",
    itemListElement: items.map((it, idx) => ({
      "@type": "ListItem",
      position: idx + 1,
      url: it.link,
      name: it.title,
    })),
  };
}

/* -------------------------------------------------------------------------- */
/* Page                                                                       */
/* -------------------------------------------------------------------------- */

export default async function ActualitesPage({ searchParams }: PageProps) {
  const all = await getAggregatedNews(30);

  // Filtre source — on accepte uniquement les brands connus pour éviter
  // l'open-redirect cosmétique sur le titre du H1.
  const validBrands = new Set(RSS_SOURCES.map((s) => s.brand));
  const activeBrand = searchParams?.source && validBrands.has(searchParams.source)
    ? searchParams.source
    : null;
  const filtered = activeBrand ? all.filter((n) => n.brand === activeBrand) : all;

  const counts: Record<string, number> = {};
  for (const it of all) counts[it.brand] = (counts[it.brand] ?? 0) + 1;

  const schemas = graphSchema([
    breadcrumbSchema([
      { name: "Accueil", url: "/" },
      { name: "Actualités", url: PAGE_PATH },
    ]),
    buildItemListSchema(filtered),
  ]);

  return (
    <section className="py-12 sm:py-16">
      <StructuredData data={schemas} id="actualites-page" />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Breadcrumb */}
        <nav className="text-xs text-muted" aria-label="Fil d'Ariane">
          <Link href="/" className="hover:text-fg">Accueil</Link>
          <span className="mx-2" aria-hidden="true">/</span>
          <span className="text-fg/80">Actualités</span>
        </nav>

        {/* HERO */}
        <header className="mt-6 mb-8 max-w-3xl">
          <span className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary-glow">
            <Newspaper className="h-3.5 w-3.5" aria-hidden="true" />
            Actualités crypto FR
          </span>
          <h1 className="mt-4 text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight leading-tight">
            Actualités crypto françaises{" "}
            <span className="gradient-text">en temps réel</span>
          </h1>
          <p className="mt-3 text-base sm:text-lg text-muted leading-relaxed">
            Cryptoreflex agrège les titres publics depuis les flux RSS officiels
            de {RSS_SOURCES.map((s) => s.name).join(", ")}. Pour lire l'article
            complet, clique sur le titre — tu seras dirigé vers la source.
          </p>

          {/* Avertissement */}
          <p
            role="note"
            className="mt-4 flex items-start gap-2 rounded-xl border border-info/30 bg-info/5 p-3 text-xs leading-relaxed text-info-fg"
          >
            <Info className="h-4 w-4 shrink-0 mt-0.5" aria-hidden="true" />
            <span>
              Les liens ci-dessous pointent vers les sites des éditeurs originaux.
              Cryptoreflex n'héberge ni ne reformule les articles : seuls le titre,
              un extrait court et la source sont reproduits, conformément aux
              usages d'agrégation (Google News, Feedly).
            </span>
          </p>
        </header>

        {/* FILTRES SOURCE */}
        <nav
          aria-label="Filtrer par source"
          className="mt-2 mb-8 flex flex-wrap gap-2"
        >
          <Link
            href={PAGE_PATH}
            scroll={false}
            className={`rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors ${
              !activeBrand
                ? "border-primary bg-primary/15 text-primary-glow"
                : "border-border bg-surface text-fg/70 hover:border-primary/40 hover:text-fg"
            }`}
          >
            Toutes
            <span className="ml-1.5 text-xs text-muted">({all.length})</span>
          </Link>
          {RSS_SOURCES.map((s) => {
            const count = counts[s.brand] ?? 0;
            if (count === 0) return null;
            const isActive = activeBrand === s.brand;
            return (
              <Link
                key={s.brand}
                href={`${PAGE_PATH}?source=${encodeURIComponent(s.brand)}`}
                scroll={false}
                className={`rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors ${
                  isActive
                    ? "border-primary bg-primary/15 text-primary-glow"
                    : "border-border bg-surface text-fg/70 hover:border-primary/40 hover:text-fg"
                }`}
              >
                {s.name}
                <span className="ml-1.5 text-xs text-muted">({count})</span>
              </Link>
            );
          })}
        </nav>

        {/* GRID */}
        {filtered.length === 0 ? (
          <div className="rounded-2xl border border-border bg-surface p-10 text-center">
            <p className="text-fg/70">
              Aucune actualité disponible pour le moment. Les flux RSS sont
              peut-être temporairement indisponibles — réessaie dans quelques
              minutes.
            </p>
            <Link
              href={PAGE_PATH}
              className="mt-4 inline-block text-sm font-semibold text-primary-glow hover:underline"
            >
              Réinitialiser le filtre
            </Link>
          </div>
        ) : (
          <ul
            role="list"
            className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3"
          >
            {filtered.map((item) => (
              <li key={`${item.brand}-${item.link}`} className="list-none">
                <NewsCard item={item} />
              </li>
            ))}
          </ul>
        )}

        {/* FOOTER DISCLAIMER */}
        <footer className="mt-14 space-y-3 rounded-2xl border border-border bg-surface/60 p-5 text-xs text-muted leading-relaxed">
          <p>
            <strong className="text-fg/85">Crédits éditoriaux</strong> —{" "}
            Cryptoreflex n'est affilié à aucun de ces médias. Les titres et
            extraits restent la propriété de leurs auteurs respectifs :
            {" "}
            {RSS_SOURCES.map((s, i) => (
              <span key={s.brand}>
                {i > 0 && ", "}©{s.name}
              </span>
            ))}
            .
          </p>
          <p>
            <strong className="text-fg/85">Mise à jour</strong> — la liste est
            actualisée toutes les 30 minutes via les flux RSS publics. Si une
            source est temporairement indisponible, ses articles disparaissent
            de la page le temps qu'elle revienne en ligne.
          </p>
          <p className="flex items-center gap-1.5">
            <ExternalLink className="h-3 w-3" aria-hidden="true" />
            Tous les liens externes ouvrent dans un nouvel onglet
            (`rel="noopener nofollow"`).
          </p>
        </footer>
      </div>
    </section>
  );
}
