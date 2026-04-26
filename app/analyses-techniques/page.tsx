import type { Metadata } from "next";
import { Activity } from "lucide-react";

import { getAllTASummaries } from "@/lib/ta-mdx";
import { BRAND } from "@/lib/brand";
import StructuredData from "@/components/StructuredData";
import AnalysesIndexClient from "@/components/ta/AnalysesIndexClient";

/**
 * /analyses-techniques — index des analyses TA quotidiennes BTC/ETH/SOL/XRP/ADA.
 *
 * Architecture :
 *  - Server Component (ISR 1800s = 30min, alignée avec la cadence du cron 1×/jour
 *    avec marge pour propagation cache après revalidateTag).
 *  - Lit content/analyses-tech/*.mdx via lib/ta-mdx (cache 60s + tag).
 *  - Délègue le rendu interactif (filtre crypto + pagination 20/page) à
 *    AnalysesIndexClient. Le HTML initial inclut toutes les cartes du premier
 *    page filter ALL → bots SEO crawlent tout au-dessus du fold.
 *
 * SEO :
 *  - JSON-LD ItemList (CollectionPage) avec les analyses du jour.
 *  - Canonical /analyses-techniques.
 *  - Title focus mot-clé "analyse technique crypto quotidienne".
 */

export const revalidate = 1800; // 30 min ISR

// Audit SEO 26-04 — title raccourci de 67 → 56 chars (≤ 60 cible Google SERP).
// Mot-clé principal "Analyses techniques crypto" + tickers majeurs en tête.
export const metadata: Metadata = {
  title: "Analyses techniques crypto BTC, ETH, SOL — Cryptoreflex",
  description:
    "Analyses techniques quotidiennes des principales cryptos : RSI, MACD, moyennes mobiles, supports/résistances, scénarios. Mises à jour automatiques sur Cryptoreflex.",
  alternates: { canonical: "/analyses-techniques" },
  openGraph: {
    title: "Analyses techniques crypto quotidiennes",
    description:
      "Indicateurs RSI, MACD, MA50/MA200, niveaux clés et scénarios pour BTC, ETH, SOL, XRP, ADA. Mises à jour automatiques.",
    url: `${BRAND.url}/analyses-techniques`,
    type: "website",
  },
};

export default async function AnalysesTechniquesPage() {
  const articles = await getAllTASummaries();

  // JSON-LD ItemList — top 20 analyses (ordre d'affichage initial, filtre ALL).
  const itemListSchema = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Analyses techniques crypto quotidiennes",
    description:
      "Analyses techniques quotidiennes des cryptos majeures (BTC, ETH, SOL, XRP, ADA) avec RSI, MACD, MA, supports et résistances.",
    numberOfItems: articles.length,
    itemListOrder: "https://schema.org/ItemListOrderDescending",
    itemListElement: articles.slice(0, 20).map((a, idx) => ({
      "@type": "ListItem",
      position: idx + 1,
      url: `${BRAND.url}/analyses-techniques/${a.slug}`,
      name: a.title,
    })),
  };

  return (
    <>
      <StructuredData data={itemListSchema} id="ta-itemlist" />

      <section className="py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="max-w-3xl">
            <span className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary-glow">
              <Activity className="h-3.5 w-3.5" />
              Analyses techniques
            </span>
            <h1 className="mt-4 text-4xl font-extrabold tracking-tight sm:text-5xl">
              Analyses techniques{" "}
              <span className="gradient-text">crypto quotidiennes</span>
            </h1>
            <p className="mt-3 text-fg/70">
              Indicateurs RSI, MACD, moyennes mobiles, bandes de Bollinger,
              niveaux clés et scénarios — calculés automatiquement chaque jour
              pour les 5 principales cryptos par capitalisation. Lecture facile,
              transparence des méthodes.
            </p>
            <p className="mt-2 text-xs text-muted">
              Cette analyse n'est pas un conseil d'investissement. La crypto est
              volatile : fais tes propres recherches.
            </p>
          </div>

          {/* Tabs + cartes + pagination — tout client-side */}
          <AnalysesIndexClient articles={articles} />
        </div>
      </section>
    </>
  );
}
