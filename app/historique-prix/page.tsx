import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, TrendingUp, Calendar } from "lucide-react";
import { BRAND } from "@/lib/brand";
import { breadcrumbSchema, graphSchema } from "@/lib/schema";
import StructuredData from "@/components/StructuredData";
import { withHreflang } from "@/lib/seo-alternates";
import {
  HIST_FEATURED_YEAR,
  HIST_YEARS,
  getHistHubCryptos,
  getHistYearsFor,
} from "@/lib/historique-prix";

/**
 * /historique-prix — HUB INDEX (BATCH 44b — création post-audit maillage SEO).
 *
 * Avant : 240 URLs `/historique-prix/[crypto]/[annee]` orphelines (sitemap-only,
 * aucun lien navigationnel humain). Crawl Google passait sans transmettre
 * de PageRank entre la home et ces 240 pages.
 *
 * Après : page hub qui liste les 30 cryptos suivies × 8 années (2018-2025) =
 * 240 entrées navigables. Chaque crypto pointe vers son année la plus récente
 * + raccourcis vers chaque année. Le crawler/utilisateur peut atteindre
 * n'importe quelle URL en 2 clics depuis la home (Footer "Apprendre" →
 * /historique-prix → /historique-prix/{crypto}/{year}).
 *
 * SEO : title + description optimisés long-tail "historique prix crypto",
 * BreadcrumbList schema, ItemList implicite via les liens H3.
 */

// FIX 2026-10-02 (audit SEO) — le hub liait des ids CoinGecko (binancecoin,
// ripple, avalanche-2, the-open-network, hedera-hashgraph, near, maker,
// matic-network, ethereum-classic) alors que la route détail n'accepte que les
// ids éditoriaux → 81 liens en 404. Sélection + années désormais dans
// lib/historique-prix.ts (ids éditoriaux, années filtrées sur l'existence du
// projet : on ne lie plus les pages « avant lancement », noindex).
// Lien principal = HIST_FEATURED_YEAR (2025, dernière année complète) ; 2026 et
// les années antérieures en raccourcis.
const HUB = getHistHubCryptos();
const FIRST_YEAR = HIST_YEARS[0];
const LAST_YEAR = HIST_YEARS[HIST_YEARS.length - 1];
const PAGE_COUNT = HUB.reduce((n, e) => n + getHistYearsFor(e.crypto).length, 0);

const PAGE_TITLE = `Historique prix crypto par année (${FIRST_YEAR}-${LAST_YEAR})`;
const PAGE_DESCRIPTION = `Évolution annuelle de ${HUB.length} cryptomonnaies majeures : Bitcoin, Ethereum, Solana, BNB et plus. Prix d'ouverture, ATH, ATL, performance % par année.`;

export const metadata: Metadata = {
  title: PAGE_TITLE,
  description: PAGE_DESCRIPTION,
  alternates: withHreflang(`${BRAND.url}/historique-prix`),
  openGraph: {
    title: PAGE_TITLE,
    description: PAGE_DESCRIPTION,
    url: `${BRAND.url}/historique-prix`,
    type: "website",
  },
};

export const revalidate = 86400;

export default function HistoriquePrixHub() {
  const schema = graphSchema([
    breadcrumbSchema([
      { name: "Accueil", url: "/" },
      { name: "Historique prix crypto", url: "/historique-prix" },
    ]),
  ]);

  return (
    <article className="py-12 sm:py-16">
      <StructuredData id="historique-prix-hub" data={schema} />
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Hero */}
        <header className="text-center mb-12">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/5 px-3 py-1 text-[10px] font-mono font-bold text-primary uppercase tracking-wider mb-4">
            <Calendar className="h-3 w-3" aria-hidden="true" />
            {PAGE_COUNT} pages historiques
          </span>
          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-fg leading-tight">
            Historique des prix crypto{" "}
            <span className="gradient-text">par année</span>
          </h1>
          <p className="mt-4 text-base sm:text-lg text-fg/75 max-w-2xl mx-auto leading-relaxed">
            {HUB.length} cryptomonnaies analysées, année par année ({FIRST_YEAR}-{LAST_YEAR}).
            Prix d&apos;ouverture, ATH, ATL, performance % et événements marquants.
          </p>
        </header>

        {/* Liste des cryptos */}
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {HUB.map(({ id, tagline, crypto: c }) => {
            const years = getHistYearsFor(c);
            // Années décroissantes, sans l'année mise en avant (lien principal).
            const otherYears = [...years].reverse().filter((y) => y !== HIST_FEATURED_YEAR);
            return (
            <li key={id}>
              <article className="group rounded-2xl border border-border bg-elevated/40 p-5 hover:border-primary/40 hover:bg-elevated transition-colors h-full flex flex-col">
                <header className="flex items-baseline justify-between gap-2 mb-2">
                  <h2 className="text-base font-bold text-fg">
                    {c.name}{" "}
                    <span className="text-xs font-mono text-muted">
                      {c.symbol}
                    </span>
                  </h2>
                  <TrendingUp className="h-4 w-4 text-primary-soft shrink-0" aria-hidden="true" />
                </header>
                <p className="text-xs text-muted leading-relaxed mb-4 flex-1">
                  {tagline}
                </p>
                {/* Lien principal vers la dernière année complète */}
                {years.includes(HIST_FEATURED_YEAR) && (
                  <Link
                    href={`/historique-prix/${id}/${HIST_FEATURED_YEAR}`}
                    className="inline-flex items-center gap-1 text-sm font-semibold text-primary-soft hover:text-primary mb-3 group-hover:gap-2 transition-all"
                    aria-label={`Voir l'historique de prix ${c.name} en ${HIST_FEATURED_YEAR}`}
                  >
                    Historique {HIST_FEATURED_YEAR}
                    <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                  </Link>
                )}
                {/* Liens années secondaires (années d'existence du projet) */}
                <ul className="flex flex-wrap gap-1.5">
                  {otherYears.map((year) => (
                    <li key={year}>
                      <Link
                        href={`/historique-prix/${id}/${year}`}
                        className="inline-block rounded-md border border-border bg-background/60 px-2 py-0.5 text-[11px] font-mono text-fg/75 hover:border-primary/50 hover:text-primary transition-colors"
                        aria-label={`Historique ${c.name} ${year}`}
                      >
                        {year}
                      </Link>
                    </li>
                  ))}
                </ul>
              </article>
            </li>
            );
          })}
        </ul>

        {/* Cross-links vers les autres hubs */}
        <section className="mt-16 rounded-2xl border border-border bg-surface/40 p-6 text-center">
          <h2 className="text-lg font-bold text-fg mb-3">
            Vous cherchez autre chose ?
          </h2>
          <p className="text-sm text-muted mb-4 max-w-xl mx-auto">
            Cryptoreflex couvre aussi les fiches détaillées par crypto, les
            comparatifs côte à côte, et les outils d&apos;analyse.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Link href="/cryptos" className="btn-ghost text-sm">
              Les 780 fiches crypto
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
            <Link href="/comparer" className="btn-ghost text-sm">
              Comparer 2 cryptos
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
            <Link href="/outils/simulateur-dca" className="btn-ghost text-sm">
              Simuler un DCA
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
        </section>
      </div>
    </article>
  );
}
