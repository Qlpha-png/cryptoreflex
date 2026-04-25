import type { Metadata } from "next";
import Link from "next/link";
import { Flame, Info } from "lucide-react";

import { fetchTopMarket } from "@/lib/coingecko";
import { getCryptoSlugs } from "@/lib/cryptos";
import { BRAND } from "@/lib/brand";
import {
  breadcrumbSchema,
  graphSchema,
  type JsonLd,
} from "@/lib/schema";

import StructuredData from "@/components/StructuredData";
import Heatmap from "@/components/Heatmap";
import HeatmapEmpty from "./HeatmapEmpty";

/**
 * /marche/heatmap — Heatmap top 100 cryptos style CoinMarketCap / TradingView.
 *
 * Server Component, ISR 2 min : la page rend la grille colorée sans JS
 * pour le contenu initial. Toute l'interaction (filtres, tooltip, navigation
 * clavier) vit dans <Heatmap /> côté client.
 *
 * Différenciation vs concurrents FR (Cryptoast / JDC / CryptoActu) : aucun
 * d'eux n'expose une heatmap visuelle. C'est un asset SEO + visuel fort.
 */

export const revalidate = 120;

const PAGE_URL = `${BRAND.url}/marche/heatmap`;

export const metadata: Metadata = {
  title: "Heatmap crypto temps réel — Top 100 marché 2026",
  description:
    "Visualisez en un coup d'œil les variations 24h du top 100 crypto. Heatmap interactive, vert/rouge, mise à jour toutes les 2 minutes via CoinGecko. 100 % gratuit.",
  alternates: { canonical: PAGE_URL },
  openGraph: {
    title: "Heatmap crypto temps réel — Top 100",
    description:
      "Heatmap visuelle des 100 plus grosses cryptos : qui monte, qui chute en un coup d'œil.",
    url: PAGE_URL,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Heatmap crypto temps réel — Top 100",
    description:
      "Heatmap visuelle des 100 plus grosses cryptos : qui monte, qui chute.",
  },
  keywords: [
    "heatmap crypto",
    "carte chaleur crypto",
    "top 100 crypto",
    "marché crypto temps réel",
    "variations crypto",
  ],
};

const webPageSchema: JsonLd = {
  "@context": "https://schema.org",
  "@type": "WebPage",
  "@id": `${PAGE_URL}#webpage`,
  name: "Heatmap crypto temps réel — Top 100 marché",
  description:
    "Heatmap interactive du top 100 cryptos par capitalisation, colorée selon les variations sur 24h.",
  url: PAGE_URL,
  inLanguage: "fr-FR",
  isPartOf: { "@id": `${BRAND.url}/#website` },
  about: {
    "@type": "Thing",
    name: "Marché des cryptomonnaies",
  },
  primaryImageOfPage: {
    "@type": "ImageObject",
    url: `${BRAND.url}/og-image.png`,
  },
  datePublished: "2026-04-25",
  dateModified: new Date().toISOString().slice(0, 10),
};

export default async function HeatmapPage() {
  // Fetch top 100 — fetchTopMarket renvoie au max ce que CoinGecko fournit.
  // Si > 100 (paranoïa future), on slice ; si < 100, on rend ce qu'on a.
  const all = await fetchTopMarket(100);
  const coins = all.slice(0, 100);

  const internalSlugs = getCryptoSlugs();

  const schemas = graphSchema([
    webPageSchema,
    breadcrumbSchema([
      { name: "Accueil", url: "/" },
      { name: "Marché", url: "/marche/heatmap" },
      { name: "Heatmap", url: "/marche/heatmap" },
    ]),
  ]);

  return (
    <article className="py-10 sm:py-14">
      <StructuredData data={schemas} id="heatmap-page" />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Breadcrumb */}
        <nav className="text-xs text-muted" aria-label="Fil d'Ariane">
          <Link href="/" className="hover:text-fg">
            Accueil
          </Link>
          <span className="mx-2">/</span>
          <span className="text-fg/80">Heatmap marché</span>
        </nav>

        {/* Header */}
        <header className="mt-6 mb-8">
          <span className="badge-info">
            <Flame className="h-3.5 w-3.5" aria-hidden="true" />
            Marché en direct
          </span>
          <h1 className="mt-3 text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight leading-tight">
            Heatmap crypto{" "}
            <span className="gradient-text">top 100</span>
          </h1>
          <p className="mt-3 text-base text-muted max-w-2xl">
            Visualisez en un coup d'œil quelles cryptos montent ou chutent
            aujourd'hui. Carrés colorés vert (hausse) / rouge (baisse), classés
            par capitalisation. Données CoinGecko, rafraîchies toutes les 2 min.
          </p>
        </header>

        {coins.length === 0 ? (
          <HeatmapEmpty />
        ) : (
          <Heatmap coins={coins} internalSlugs={internalSlugs} />
        )}

        {/* PEDAGOGY — comment lire la heatmap (SEO + UX) */}
        <section className="mt-12 rounded-2xl border border-border bg-surface p-6">
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight flex items-center gap-2">
            <Info className="h-5 w-5 text-primary" aria-hidden="true" />
            Comment lire cette heatmap ?
          </h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <h3 className="text-sm font-semibold text-fg">Couleurs</h3>
              <p className="mt-1 text-sm text-fg/80 leading-relaxed">
                Chaque carré est coloré selon la variation sur la période
                sélectionnée (24h par défaut). Vert vif = forte hausse (+5 % et
                plus), rouge vif = forte baisse (-5 % et plus). Les nuances
                intermédiaires marquent les variations modérées.
              </p>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-fg">Ordre des cryptos</h3>
              <p className="mt-1 text-sm text-fg/80 leading-relaxed">
                Les cellules sont rangées par capitalisation décroissante. Bitcoin
                en haut à gauche, puis Ethereum, etc. Cliquez sur une crypto pour
                ouvrir sa fiche complète (uniquement pour les cryptos disposant
                d'une analyse Cryptoreflex).
              </p>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-fg">Filtres disponibles</h3>
              <p className="mt-1 text-sm text-fg/80 leading-relaxed">
                Basculez entre <strong>Top 50</strong> et <strong>Top 100</strong>
                {" "}pour ajuster la densité. Changez la période entre 1 h, 24 h
                et 7 j pour voir les tendances courtes ou hebdomadaires.
              </p>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-fg">Limites</h3>
              <p className="mt-1 text-sm text-fg/80 leading-relaxed">
                La heatmap est un outil de lecture rapide, pas un signal d'achat
                ou de vente. Une crypto verte aujourd'hui peut être rouge demain.
                Pour une analyse approfondie, consultez la{" "}
                <Link href="/" className="underline hover:text-fg">
                  table marché complète
                </Link>{" "}
                ou nos{" "}
                <Link href="/blog" className="underline hover:text-fg">
                  guides éducatifs
                </Link>
                .
              </p>
            </div>
          </div>
        </section>

        {/* MENTIONS */}
        <p className="mt-8 text-[11px] text-muted leading-relaxed">
          Données de marché fournies par CoinGecko (cache serveur 2 min). Cette
          page est purement informative et ne constitue pas un conseil en
          investissement. Investir dans les cryptomonnaies comporte un risque de
          perte en capital. Voir notre{" "}
          <Link href="/methodologie" className="underline hover:text-fg">
            méthodologie
          </Link>
          .
        </p>
      </div>
    </article>
  );
}
