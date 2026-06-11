import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  Activity,
  Flame,
  ListFilter,
  TrendingUp,
  TrendingDown,
} from "lucide-react";

import { BRAND } from "@/lib/brand";
import StructuredData from "@/components/StructuredData";
import {
  breadcrumbSchema,
  graphSchema,
  type JsonLd,
} from "@/lib/schema";
import { withHreflang } from "@/lib/seo-alternates";
import {
  fetchTopMarket,
  fetchGlobalMetrics,
  fetchFearGreed,
  formatCompactUsd,
} from "@/lib/coingecko";
import { getCryptoSlugs } from "@/lib/cryptos";
import LiveHeatmap from "@/components/LiveHeatmap";
import FearGreedGauge from "@/components/FearGreedGauge";
import GainerLoserList from "@/components/GainerLoserList";

/**
 * /marche — DASHBOARD marché (DA Obsidian sprint 2, 2026-06-11).
 *
 * Avant : page-hub statique avec 3 cards de LIENS vers les sous-pages
 * (heatmap, fear-greed, gainers-losers) — aucune donnée affichée, alors
 * que les composants live existaient. Un site crypto dont la page
 * "Marché" ne montre pas le marché…
 *
 * Après : les données VIVENT sur cette page (heatmap top 60 live, jauge
 * F&G, top movers, stats globales), les sous-pages restent les vues
 * "plein écran" détaillées (et gardent leur SEO dédié — les liens
 * internes sont conservés).
 */

// QUOTA VERCEL 2026-06-11 — revalidate allongé (ISR writes 409K/200K Hobby) :
// le HTML seed peut dater, les données fraîches arrivent côté client.
export const revalidate = 900;

const PAGE_PATH = "/marche";
const PAGE_URL = `${BRAND.url}${PAGE_PATH}`;
const TITLE = "Marché crypto en direct — Heatmap, Fear & Greed, Gainers/Losers";
const DESCRIPTION =
  "Tableau de bord du marché crypto temps réel : heatmap top 60, indice Fear & Greed, plus gros gagnants/perdants 24h, market cap globale et dominance BTC. Données CoinGecko et alternative.me.";

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
    "marché crypto temps réel",
    "heatmap crypto",
    "fear and greed crypto",
    "gainers losers crypto",
    "cours crypto live",
  ],
};

const SUBPAGES = [
  {
    href: "/marche/screener",
    title: "Screener top 100",
    description: "Table triable : prix, 24h/7j, cap, volume, sparklines.",
    icon: ListFilter,
  },
  {
    href: "/marche/heatmap",
    title: "Heatmap plein écran",
    description: "Top 100 complet, périodes 1h/24h/7j.",
    icon: Activity,
  },
  {
    href: "/marche/fear-greed",
    title: "Fear & Greed détaillé",
    description: "Historique, méthodologie, lecture contrarienne.",
    icon: Flame,
  },
  {
    href: "/marche/gainers-losers",
    title: "Gainers & Losers complets",
    description: "Top 10 + top 10 sur le top 250, filtres par cap.",
    icon: TrendingUp,
  },
] as const;

export default async function MarcheDashboardPage() {
  // 3 endpoints distincts (markets / global / alternative.me) — pas de
  // doublon de quota. Chaque fetch a son propre fallback null/[] : le
  // dashboard dégrade par bloc au lieu de tomber entier.
  const [all, globalMetrics, fearGreed] = await Promise.all([
    fetchTopMarket(100),
    fetchGlobalMetrics(),
    fetchFearGreed(),
  ]);

  const heatmapCoins = all.slice(0, 60);
  const internalSlugs = getCryptoSlugs();

  // Top movers dérivés du même fetch (zéro appel en plus). Les stablecoins
  // s'auto-excluent (variation ~0 % → jamais dans un top 5 trié).
  const sorted = [...all].sort((a, b) => b.priceChange24h - a.priceChange24h);
  // AUDIT 2026-06-11 — en dégradation (fallback 6 coins), slice(0,5) et
  // slice(-5) se chevauchaient : les mêmes cryptos dans les 2 colonnes.
  const gainers = sorted.slice(0, 5);
  const losers =
    sorted.length >= 10 ? sorted.slice(-5).reverse() : [];

  const collectionSchema: JsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "@id": `${PAGE_URL}#collection`,
    url: PAGE_URL,
    name: TITLE,
    description: DESCRIPTION,
    inLanguage: "fr-FR",
    isPartOf: { "@id": `${BRAND.url}/#website` },
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: SUBPAGES.length,
      itemListElement: SUBPAGES.map((c, idx) => ({
        "@type": "ListItem",
        position: idx + 1,
        url: `${BRAND.url}${c.href}`,
        name: c.title,
      })),
    },
  };

  const breadcrumbs = breadcrumbSchema([
    { name: "Accueil", url: "/" },
    { name: "Marché", url: PAGE_PATH },
  ]);

  const schema = graphSchema([collectionSchema, breadcrumbs]);

  return (
    <>
      <StructuredData data={schema} id="marche-hub" />

      <section className="py-10 sm:py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <nav aria-label="Fil d'Ariane" className="text-xs text-muted">
            <Link href="/" className="hover:text-fg">
              Accueil
            </Link>
            <span className="mx-2">/</span>
            <span className="text-fg/80">Marché</span>
          </nav>

          {/* Header compact — le dashboard prime sur le discours */}
          <header className="mt-4 flex flex-wrap items-end justify-between gap-4">
            <div>
              <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
                Marché crypto <span className="gradient-text">en direct</span>
              </h1>
              <p className="mt-2 max-w-2xl text-sm text-fg/70">
                La température du marché en 30 secondes : vision globale,
                sentiment, rotations.
              </p>
            </div>
            <span className="live-dot inline-flex items-center text-xs font-semibold text-success-fg">
              Données live CoinGecko
            </span>
          </header>

          {/* ── Stats globales — glass cards, chiffres terminal ── */}
          {globalMetrics && (
            <dl className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
              <StatCard
                label="Market cap globale"
                value={formatCompactUsd(globalMetrics.totalMarketCapUsd)}
                delta={globalMetrics.marketCapChange24h}
              />
              <StatCard
                label="Volume 24h"
                value={formatCompactUsd(globalMetrics.totalVolume24hUsd)}
              />
              <StatCard
                label="Dominance BTC"
                value={`${globalMetrics.btcDominance.toFixed(1)}%`}
                ice
              />
              <StatCard
                label="Dominance ETH"
                value={`${globalMetrics.ethDominance.toFixed(1)}%`}
                ice
              />
            </dl>
          )}

          {/* ── Heatmap inline top 60 ── */}
          <div className="mt-10">
            <LiveHeatmap
              coins={heatmapCoins}
              internalSlugs={internalSlugs}
              heading="Heatmap top 60 — variation 24h"
            />
            <div className="mt-3 text-right">
              <Link
                href="/marche/heatmap"
                className="inline-flex items-center gap-1 text-sm font-semibold text-primary-soft hover:text-primary"
              >
                Heatmap plein écran (top 100)
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>

          {/* ── Sentiment + Top movers ── */}
          <div className="mt-12 grid grid-cols-1 gap-6 lg:grid-cols-[1fr_1.4fr]">
            <div className="glass-card rounded-2xl p-6">
              <h2 className="text-lg font-bold text-fg">
                Sentiment du marché
              </h2>
              {fearGreed ? (
                <>
                  <div className="mt-4 flex justify-center">
                    <FearGreedGauge
                      value={fearGreed.value}
                      classification={fearGreed.classification}
                      size={260}
                    />
                  </div>
                  {typeof fearGreed.deltaVsYesterday === "number" && (
                    <p className="mt-2 text-center text-xs text-muted">
                      {fearGreed.deltaVsYesterday >= 0 ? "+" : ""}
                      {fearGreed.deltaVsYesterday} point
                      {Math.abs(fearGreed.deltaVsYesterday) > 1 ? "s" : ""} vs
                      hier
                    </p>
                  )}
                </>
              ) : (
                <p className="mt-4 text-sm text-muted">
                  Indice momentanément indisponible (source alternative.me).
                </p>
              )}
              <div className="mt-4 text-right">
                <Link
                  href="/marche/fear-greed"
                  className="inline-flex items-center gap-1 text-sm font-semibold text-primary-soft hover:text-primary"
                >
                  Analyse complète
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>

            <div className="glass-card rounded-2xl p-6">
              <h2 className="text-lg font-bold text-fg">Top movers 24h</h2>
              <div className="mt-4 grid grid-cols-1 gap-6 sm:grid-cols-2">
                <GainerLoserList
                  coins={gainers}
                  variant="gainers"
                  title="Gagnants"
                  internalSlugs={internalSlugs}
                />
                <GainerLoserList
                  coins={losers}
                  variant="losers"
                  title="Perdants"
                  internalSlugs={internalSlugs}
                />
              </div>
              <div className="mt-4 text-right">
                <Link
                  href="/marche/gainers-losers"
                  className="inline-flex items-center gap-1 text-sm font-semibold text-primary-soft hover:text-primary"
                >
                  Top 10 complet
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          </div>

          {/* ── Sous-pages (vues plein écran) — maillage interne conservé ── */}
          <nav aria-label="Vues détaillées du marché" className="mt-12">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4">
              {SUBPAGES.map((c) => {
                const Icon = c.icon;
                return (
                  <Link
                    key={c.href}
                    href={c.href}
                    className="hover-lift group flex items-center gap-3 rounded-xl border border-border bg-surface/60 p-4"
                  >
                    <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-background/40 border border-border text-fg">
                      <Icon className="h-5 w-5" aria-hidden="true" />
                    </span>
                    <span>
                      <span className="block text-sm font-bold text-fg group-hover:text-primary-soft">
                        {c.title}
                      </span>
                      <span className="block text-xs text-muted">
                        {c.description}
                      </span>
                    </span>
                  </Link>
                );
              })}
            </div>
          </nav>

          {/* Mini-explainer "Comment lire le marché" — pédagogie conservée */}
          <aside className="mt-12 grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="rounded-2xl border border-border bg-surface p-6">
              <div className="flex items-center gap-2 text-fg font-bold">
                <TrendingUp className="h-4 w-4 text-accent-green" />
                Comment lire la heatmap
              </div>
              <p className="mt-2 text-sm text-fg/70">
                Plus la case est grande, plus la cap est importante. Plus la
                couleur tire vers le vert, plus la performance 24h est positive.
                Une mer de rouge sur le top 100 = correction généralisée ; un
                damier vert/rouge = rotation sectorielle (alts qui pompent
                pendant que BTC corrige, par exemple).
              </p>
            </div>
            <div className="rounded-2xl border border-border bg-surface p-6">
              <div className="flex items-center gap-2 text-fg font-bold">
                <TrendingDown className="h-4 w-4 text-accent-rose" />
                Le piège du Fear & Greed
              </div>
              <p className="mt-2 text-sm text-fg/70">
                L'indice est utile en extrême : "Extreme Fear" (&lt;25) coïncide
                souvent avec des creux de cycle ; "Extreme Greed" (&gt;75) avec
                des sommets. Entre les deux (zone neutre 40-60), il a peu de
                valeur signal — c'est le bruit du marché.
              </p>
            </div>
          </aside>
        </div>
      </section>
    </>
  );
}

/* StatCard — chiffre global en verre, style terminal */
function StatCard({
  label,
  value,
  delta,
  ice = false,
}: {
  label: string;
  value: string;
  delta?: number;
  ice?: boolean;
}) {
  return (
    <div className="glass-card rounded-xl p-4">
      <dt className="text-[11px] uppercase tracking-wider text-muted font-semibold">
        {label}
      </dt>
      <dd className="mt-1 flex items-baseline gap-2">
        <span
          className={`num-data text-xl font-bold ${ice ? "text-ice-fg" : "text-fg"}`}
        >
          {value}
        </span>
        {typeof delta === "number" && (
          <span
            className={`num-data text-xs ${
              delta >= 0 ? "text-success-fg" : "text-danger-fg"
            }`}
          >
            <span aria-hidden="true">{delta >= 0 ? "▲" : "▼"}</span>
            <span className="sr-only">
              {delta >= 0 ? "Hausse de" : "Baisse de"}
            </span>{" "}
            {Math.abs(delta).toFixed(2)}%
          </span>
        )}
      </dd>
    </div>
  );
}
