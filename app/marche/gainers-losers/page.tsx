import type { Metadata } from "next";
import Link from "next/link";
import { TrendingUp, TrendingDown, Activity, Flame, ArrowRight, Info } from "lucide-react";

import { fetchTopMarket } from "@/lib/coingecko";
import { getCryptoSlugs } from "@/lib/cryptos";
import { BRAND } from "@/lib/brand";
import {
  breadcrumbSchema,
  graphSchema,
  type JsonLd,
} from "@/lib/schema";

import StructuredData from "@/components/StructuredData";
import GainerLoserList from "@/components/GainerLoserList";
import EmptyState from "@/components/ui/EmptyState";

/**
 * /marche/gainers-losers — Top gainers / losers du marché crypto sur 24h.
 *
 * Server Component, ISR 5 min : on fetch le top 100 puis on trie côté serveur
 * pour produire deux listes (gainers desc, losers asc).
 *
 * SEO : ranks "top gainers crypto", "top losers crypto", "qui monte aujourd'hui".
 */

export const revalidate = 300; // 5 min

const PAGE_URL = `${BRAND.url}/marche/gainers-losers`;
const LIMIT_PER_LIST = 10;

export const metadata: Metadata = {
  title: "Top Gainers & Losers crypto 24h — Qui monte, qui chute aujourd'hui",
  description:
    "Top 10 cryptos qui montent et top 10 qui chutent sur 24h. Données CoinGecko mises à jour toutes les 5 minutes. Identifie les mouvements forts du marché en un coup d'œil.",
  alternates: { canonical: PAGE_URL },
  openGraph: {
    title: "Top Gainers & Losers crypto — 24h",
    description:
      "Les cryptos qui ont le plus monté et chuté sur les dernières 24 heures.",
    url: PAGE_URL,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Top Gainers & Losers crypto — 24h",
    description:
      "Les cryptos qui ont le plus monté et chuté sur les dernières 24 heures.",
  },
  keywords: [
    "top gainers crypto",
    "top losers crypto",
    "biggest crypto gainers",
    "qui monte crypto",
    "qui chute crypto",
    "crypto pump dump 24h",
  ],
};

export default async function GainersLosersPage() {
  // On récupère 100 cryptos pour avoir une base assez large pour identifier
  // les vrais leaders (les très petites caps en absolu peuvent générer du bruit).
  const all = await fetchTopMarket(100);
  const internalSlugs = getCryptoSlugs();

  // Filtre légèrement : on ignore les coins sans variation 24h (donnée
  // manquante). On ne filtre PAS sur le market cap pour ne pas masquer
  // un "vrai" mouvement marché.
  const valid = all.filter((c) => Number.isFinite(c.priceChange24h));

  const gainers = [...valid]
    .sort((a, b) => b.priceChange24h - a.priceChange24h)
    .slice(0, LIMIT_PER_LIST);

  const losers = [...valid]
    .sort((a, b) => a.priceChange24h - b.priceChange24h)
    .slice(0, LIMIT_PER_LIST);

  const webPageSchema: JsonLd = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "@id": `${PAGE_URL}#webpage`,
    name: "Top Gainers & Losers crypto — Variations 24h",
    description:
      "Top 10 cryptos en hausse et top 10 cryptos en baisse sur 24h. Source CoinGecko, cache 5 min.",
    url: PAGE_URL,
    inLanguage: "fr-FR",
    isPartOf: { "@id": `${BRAND.url}/#website` },
    about: {
      "@type": "Thing",
      name: "Variations cryptos 24h",
    },
    primaryImageOfPage: {
      "@type": "ImageObject",
      url: `${BRAND.url}/og-image.png`,
    },
    datePublished: "2026-04-25",
    dateModified: new Date().toISOString().slice(0, 10),
  };

  const schemas = graphSchema([
    webPageSchema,
    breadcrumbSchema([
      { name: "Accueil", url: "/" },
      { name: "Marché", url: "/marche/heatmap" },
      { name: "Gainers & Losers", url: "/marche/gainers-losers" },
    ]),
  ]);

  return (
    <article className="py-10 sm:py-14">
      <StructuredData data={schemas} id="gainers-losers-page" />

      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        {/* Breadcrumb */}
        <nav className="text-xs text-muted" aria-label="Fil d'Ariane">
          <Link href="/" className="hover:text-fg">
            Accueil
          </Link>
          <span className="mx-2">/</span>
          <Link href="/marche/heatmap" className="hover:text-fg">
            Marché
          </Link>
          <span className="mx-2">/</span>
          <span className="text-fg/80">Gainers &amp; Losers</span>
        </nav>

        {/* Header */}
        <header className="mt-6 mb-8">
          <span className="badge-info">
            <Flame className="h-3.5 w-3.5" aria-hidden="true" />
            Top mouvements 24h
          </span>
          <h1 className="mt-3 text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight leading-tight">
            Gainers &amp; Losers crypto <span className="gradient-text">— 24h</span>
          </h1>
          <p className="mt-3 text-base text-muted max-w-2xl">
            Les 10 cryptos qui ont le plus monté et les 10 qui ont le plus chuté
            sur les dernières 24 heures, parmi le top 100 par capitalisation.
            Données CoinGecko, rafraîchies toutes les 5 minutes.
          </p>
        </header>

        {gainers.length === 0 && losers.length === 0 ? (
          <EmptyState
            icon={<Activity className="h-6 w-6" aria-hidden="true" />}
            title="Données marché indisponibles"
            description="Notre fournisseur de cours est temporairement injoignable. Réessayez dans quelques minutes."
            cta={{ label: "Réessayer", href: "/marche/gainers-losers" }}
            secondaryCta={{ label: "Voir la heatmap", href: "/marche/heatmap" }}
          />
        ) : (
          <div className="grid gap-6 lg:grid-cols-2">
            <GainerLoserList
              coins={gainers}
              variant="gainers"
              title="Top 10 gainers 24h"
              internalSlugs={internalSlugs}
            />
            <GainerLoserList
              coins={losers}
              variant="losers"
              title="Top 10 losers 24h"
              internalSlugs={internalSlugs}
            />
          </div>
        )}

        {/* Cross-link heatmap */}
        <aside className="mt-10 glass rounded-2xl p-6 sm:p-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-fg">
              Voir l'ensemble du marché en un seul écran
            </h2>
            <p className="mt-1 text-sm text-fg/70">
              La heatmap top 100 affiche toutes les cryptos colorées par variation,
              parfait pour repérer les zones rouges/vertes.
            </p>
          </div>
          <Link href="/marche/heatmap" className="btn-primary shrink-0">
            Voir la heatmap complète
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </aside>

        {/* Pédagogie comment lire */}
        <section className="mt-10 rounded-2xl border border-border bg-surface p-6">
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight flex items-center gap-2">
            <Info className="h-5 w-5 text-primary" aria-hidden="true" />
            Comment interpréter ces listes ?
          </h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <h3 className="text-sm font-semibold text-fg flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-accent-green" aria-hidden="true" />
                Top gainers
              </h3>
              <p className="mt-1 text-sm text-fg/80 leading-relaxed">
                Une crypto qui monte fortement sur 24h n'est pas forcément un
                "bon investissement". Vérifie le volume, la news catalyseur
                (annonce, listing, partenariat), et méfie-toi des pumps
                spéculatifs sans fondamental. Les hausses extrêmes (+50 %, +100 %)
                sur des petites caps sont souvent suivies de retours brutaux.
              </p>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-fg flex items-center gap-2">
                <TrendingDown className="h-4 w-4 text-accent-rose" aria-hidden="true" />
                Top losers
              </h3>
              <p className="mt-1 text-sm text-fg/80 leading-relaxed">
                Une chute violente peut signifier : annonce négative (hack,
                délisting, régulation), prise de profit après pump, ou
                simplement panique du marché. C'est parfois une opportunité
                d'achat — mais souvent un signal qu'il faut attendre que la
                poussière retombe avant d'agir.
              </p>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-fg">Filtre top 100</h3>
              <p className="mt-1 text-sm text-fg/80 leading-relaxed">
                On ne montre que les cryptos appartenant au top 100 par
                capitalisation. Cela exclut les micro-caps trop volatiles
                (souvent +500 %, -90 %) qui faussent la lecture du marché.
              </p>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-fg">Mise à jour</h3>
              <p className="mt-1 text-sm text-fg/80 leading-relaxed">
                Cache serveur de 5 minutes : la donnée n'est pas live à la
                seconde, mais suffisante pour identifier les tendances de
                journée. Pour du vrai temps réel, utilise un terminal pro.
              </p>
            </div>
          </div>
        </section>

        {/* Mentions */}
        <p className="mt-8 text-[11px] text-muted leading-relaxed">
          Données de marché fournies par CoinGecko (cache serveur 5 min). Cette
          page est purement informative et ne constitue pas un conseil en
          investissement. Investir dans les cryptomonnaies comporte un risque
          de perte en capital. Voir notre{" "}
          <Link href="/methodologie" className="underline hover:text-fg">
            méthodologie
          </Link>
          .
        </p>
      </div>
    </article>
  );
}
