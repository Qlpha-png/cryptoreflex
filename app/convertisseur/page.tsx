import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, ArrowLeftRight, Globe } from "lucide-react";
import { BRAND } from "@/lib/brand";
import { breadcrumbSchema, graphSchema } from "@/lib/schema";
import StructuredData from "@/components/StructuredData";
import { TOP_PAIRS, COIN_NAMES } from "@/lib/historical-prices";

/**
 * /convertisseur — HUB INDEX (BATCH 44b — création post-audit maillage SEO).
 *
 * Convertisseur paire crypto live. Chaque paire `[from]-[to]` a sa propre
 * page (ex: /convertisseur/btc-eur). Hub navigable pour exposer les ~30
 * paires populaires.
 *
 * Différent de /outils/convertisseur (calculateur multi-cryptos générique).
 */

const PAGE_TITLE = "Convertisseur crypto temps réel — toutes les paires | Cryptoreflex";
const PAGE_DESCRIPTION =
  "Convertis BTC, ETH, SOL, USDT et 12 autres cryptos vers EUR/USD avec les taux CoinGecko temps réel. Toutes les paires populaires en un clic.";

export const metadata: Metadata = {
  title: PAGE_TITLE,
  description: PAGE_DESCRIPTION,
  alternates: { canonical: `${BRAND.url}/convertisseur` },
  openGraph: {
    title: PAGE_TITLE,
    description: PAGE_DESCRIPTION,
    url: `${BRAND.url}/convertisseur`,
    type: "website",
  },
};

export const revalidate = 86400;

// Group pairs by base crypto for visual organization
function groupByFrom(): Record<string, typeof TOP_PAIRS> {
  const groups: Record<string, typeof TOP_PAIRS> = {};
  for (const pair of TOP_PAIRS) {
    const key = pair.from.toUpperCase();
    if (!groups[key]) groups[key] = [];
    groups[key].push(pair);
  }
  return groups;
}

export default function ConvertisseurHub() {
  const groups = groupByFrom();
  const fromKeys = Object.keys(groups).sort();

  const schema = graphSchema([
    breadcrumbSchema([
      { name: "Accueil", url: "/" },
      { name: "Convertisseur crypto", url: "/convertisseur" },
    ]),
  ]);

  return (
    <article className="py-12 sm:py-16">
      <StructuredData id="convertisseur-hub" data={schema} />
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Hero */}
        <header className="text-center mb-12">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-success-border bg-success-soft px-3 py-1 text-[10px] font-mono font-bold text-success-fg uppercase tracking-wider mb-4">
            <Globe className="h-3 w-3" aria-hidden="true" />
            Taux CoinGecko live
          </span>
          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-fg leading-tight">
            Convertisseur{" "}
            <span className="gradient-text">crypto en temps réel</span>
          </h1>
          <p className="mt-4 text-base sm:text-lg text-fg/75 max-w-2xl mx-auto leading-relaxed">
            {TOP_PAIRS.length} paires de conversion populaires.
            BTC, ETH, SOL, USDT, USDC vers EUR ou USD — taux CoinGecko
            mis à jour chaque minute.
          </p>
        </header>

        {/* Grouped pairs */}
        <div className="space-y-8">
          {fromKeys.map((from) => (
            <section key={from} aria-labelledby={`group-${from}`}>
              <h2
                id={`group-${from}`}
                className="text-xl sm:text-2xl font-bold text-fg mb-4 flex items-baseline gap-2"
              >
                <span className="font-mono text-primary-soft">{from}</span>
                <span className="text-sm font-normal text-muted">
                  {COIN_NAMES[from.toLowerCase() as keyof typeof COIN_NAMES] ?? from}
                </span>
              </h2>
              <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {groups[from].map((pair) => {
                  const slug = `${pair.from.toLowerCase()}-${pair.to.toLowerCase()}`;
                  return (
                    <li key={slug}>
                      <Link
                        href={`/convertisseur/${slug}`}
                        className="group flex items-center justify-between gap-2 rounded-lg border border-border bg-surface px-4 py-3 hover:border-primary/40 hover:bg-elevated transition-colors min-h-[44px]"
                        aria-label={`Convertir ${pair.from.toUpperCase()} en ${pair.to.toUpperCase()}`}
                      >
                        <span className="font-mono text-sm font-bold text-fg">
                          {pair.from.toUpperCase()}{" "}
                          <ArrowLeftRight className="inline h-3 w-3 text-muted mx-1" aria-hidden="true" />{" "}
                          {pair.to.toUpperCase()}
                        </span>
                        <ArrowRight
                          className="h-3.5 w-3.5 text-muted shrink-0 group-hover:text-primary group-hover:translate-x-0.5 transition-all"
                          aria-hidden="true"
                        />
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>

        {/* Cross-links */}
        <section className="mt-16 rounded-2xl border border-border bg-surface/40 p-6 text-center">
          <h2 className="text-lg font-bold text-fg mb-3">
            Tu cherches plus que de la conversion ?
          </h2>
          <p className="text-sm text-muted mb-4 max-w-xl mx-auto">
            On a 26 outils crypto gratuits : calculateur fiscalité PFU, simulateur
            DCA backtest 5 ans, glossaire 250+ termes.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Link href="/outils" className="btn-ghost text-sm">
              Tous les outils gratuits
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
            <Link href="/marche" className="btn-ghost text-sm">
              Marché crypto en direct
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
        </section>
      </div>
    </article>
  );
}
