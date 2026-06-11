import type { Metadata } from "next";
import Link from "next/link";

import { BRAND } from "@/lib/brand";
import StructuredData from "@/components/StructuredData";
import { breadcrumbSchema, graphSchema, type JsonLd } from "@/lib/schema";
import { withHreflang } from "@/lib/seo-alternates";
import { fetchTopMarket } from "@/lib/coingecko";
import { getCryptoSlugs } from "@/lib/cryptos";
import CryptoScreener from "@/components/CryptoScreener";
import EmptyState from "@/components/ui/EmptyState";

/**
 * /marche/screener — screener top 100 (DA Obsidian sprint 2b).
 *
 * Table marché dense triable avec sparklines 7j. Vue "pro" de la section
 * Marché, complémentaire de la heatmap (visuelle) et du navigateur
 * /cryptos (éditorial, 780 fiches).
 */

export const revalidate = 120;

const PAGE_PATH = "/marche/screener";
const PAGE_URL = `${BRAND.url}${PAGE_PATH}`;
const TITLE = "Screener crypto — top 100 triable en direct";
const DESCRIPTION =
  "Screener du top 100 crypto par capitalisation : prix, variations 1h/24h/7j, market cap, volume et sparkline 7 jours. Tri par colonne, recherche instantanée. Données CoinGecko.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: withHreflang(PAGE_URL),
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: PAGE_URL,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
  },
  keywords: [
    "screener crypto",
    "top 100 crypto",
    "classement crypto market cap",
    "prix crypto temps réel",
    "volume crypto 24h",
  ],
};

export default async function ScreenerPage() {
  const coins = await fetchTopMarket(100);
  const internalSlugs = getCryptoSlugs();

  const webPage: JsonLd = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "@id": `${PAGE_URL}#webpage`,
    url: PAGE_URL,
    name: TITLE,
    description: DESCRIPTION,
    inLanguage: "fr-FR",
    isPartOf: { "@id": `${BRAND.url}/#website` },
  };

  const schema = graphSchema([
    webPage,
    breadcrumbSchema([
      { name: "Accueil", url: "/" },
      { name: "Marché", url: "/marche" },
      { name: "Screener", url: PAGE_PATH },
    ]),
  ]);

  return (
    <article className="py-10 sm:py-14">
      <StructuredData data={schema} id="screener-page" />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <nav aria-label="Fil d'Ariane" className="text-xs text-muted">
          <Link href="/" className="hover:text-fg">
            Accueil
          </Link>
          <span className="mx-2">/</span>
          <Link href="/marche" className="hover:text-fg">
            Marché
          </Link>
          <span className="mx-2">/</span>
          <span className="text-fg/80">Screener</span>
        </nav>

        <header className="mt-4 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
              Screener <span className="gradient-text">top 100</span>
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-fg/70">
              Triez le top 100 par n'importe quelle colonne, filtrez par nom,
              repérez les tendances 7 jours d'un coup d'œil. Les cryptos avec
              une fiche Cryptoreflex sont cliquables.
            </p>
          </div>
          <span className="live-dot inline-flex items-center text-xs font-semibold text-success-fg">
            Mis à jour toutes les 2 min
          </span>
        </header>

        <div className="mt-8">
          {coins.length > 0 ? (
            <CryptoScreener coins={coins} internalSlugs={internalSlugs} />
          ) : (
            <EmptyState
              title="Données marché momentanément indisponibles"
              description="CoinGecko ne répond pas. Réessayez dans quelques instants — la page se met à jour automatiquement toutes les 2 minutes."
            />
          )}
        </div>

        <p className="mt-6 text-xs text-muted">
          Données CoinGecko, rafraîchies toutes les 2 minutes. Les variations
          1h/7j peuvent être momentanément indisponibles pour certains actifs.
          Aucune donnée de cette page ne constitue un conseil en
          investissement.
        </p>
      </div>
    </article>
  );
}
