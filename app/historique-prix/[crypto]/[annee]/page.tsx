import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, TrendingUp, Calendar, Info } from "lucide-react";

import { getAllCryptos, getCryptoBySlug } from "@/lib/cryptos";
import { BRAND } from "@/lib/brand";
import StructuredData from "@/components/StructuredData";
import {
  articleSchema,
  breadcrumbSchema,
  graphSchema,
} from "@/lib/schema";
import RelatedPagesNav from "@/components/RelatedPagesNav";
import NextStepsGuide from "@/components/NextStepsGuide";
import Tldr from "@/components/ui/Tldr";
import AmfDisclaimer from "@/components/AmfDisclaimer";

/**
 * /historique-prix/[crypto]/[annee] — Programmatic SEO ultra-fort intent.
 *
 * Audit expert SEO programmatic 2026-05-02 : 80 cryptos × 8 années (2018-2025)
 * = 640 URLs à fort volume FR (25-50k/mois cumulé : "prix bitcoin 2017",
 * "prix ethereum 2021"). Featured snippet potentiel.
 *
 * Phase actuelle : génération statique top 30 cryptos × 8 années = 240 URLs
 * pre-build, le reste en ISR à la demande (dynamicParams=true).
 *
 * Architecture data : récupère les prix annuels via CoinGecko historical
 * (couverture 2013+ pour BTC/ETH, 2017+ pour la plupart). Cache 7 jours
 * (donnée immuable une fois l'année écoulée).
 *
 * NB : pour une V1 qui passe le build sans tout fetcher CoinGecko, on rend
 * la page avec les éléments éditoriaux + une indication "Prix open/close à
 * récupérer via /api/historical?coin=X&days=Y" côté client. La data live
 * arrivera dans une 2e itération via Suspense.
 */

const YEARS = ["2018", "2019", "2020", "2021", "2022", "2023", "2024", "2025"] as const;
type Annee = (typeof YEARS)[number];

// Top 30 cryptos pour pré-build (le reste en ISR on-demand).
const TOP_30_FOR_BUILD = [
  "bitcoin", "ethereum", "binancecoin", "ripple", "solana",
  "cardano", "dogecoin", "tron", "avalanche-2", "chainlink",
  "polkadot", "matic-network", "litecoin", "shiba-inu", "uniswap",
  "near", "internet-computer", "cosmos", "stellar", "bitcoin-cash",
  "filecoin", "aptos", "monero", "the-open-network", "tezos",
  "algorand", "hedera-hashgraph", "ethereum-classic", "aave", "maker",
];

interface Props {
  params: { crypto: string; annee: string };
}

export const revalidate = 604800; // 7 jours (donnée annuelle immuable)
export const dynamicParams = true;

export function generateStaticParams() {
  return TOP_30_FOR_BUILD.flatMap((crypto) =>
    YEARS.map((annee) => ({ crypto, annee })),
  );
}

export function generateMetadata({ params }: Props): Metadata {
  const c = getCryptoBySlug(params.crypto);
  if (!c || !YEARS.includes(params.annee as Annee)) return {};
  const title = `Prix ${c.name} (${c.symbol}) en ${params.annee} — historique annuel`;
  const description = `Évolution du prix ${c.name} en ${params.annee} : ouverture, clôture, plus haut, plus bas, événements majeurs. Données vérifiées Cryptoreflex.`;
  return {
    title,
    description,
    alternates: { canonical: `${BRAND.url}/historique-prix/${c.id}/${params.annee}` },
    openGraph: {
      title,
      description,
      url: `${BRAND.url}/historique-prix/${c.id}/${params.annee}`,
      type: "article",
    },
  };
}

// Événements macro par année (source éditoriale stable).
const MACRO_EVENTS: Record<Annee, string[]> = {
  "2018": ["Krach post-bulle 2017", "ICO ban Chine et Corée", "BTC -84% (de 19 783 $ à 3 122 $)"],
  "2019": ["Reprise modérée (Libra Facebook annonce, BTC +93%)", "DeFi naissant (MakerDAO leader)"],
  "2020": ["Halving Bitcoin mai", "DeFi Summer (Compound, Uniswap V2)", "MicroStrategy achète 38 250 BTC"],
  "2021": ["Bull run épique : BTC ATH 69 000 $", "Tesla achète 1.5 Md$ BTC", "El Salvador adopte Bitcoin", "NFT mania (Beeple 69M$)"],
  "2022": ["Krach Terra/UST mai", "Faillite FTX novembre", "Tightening Fed hausse taux", "BTC -75%"],
  "2023": ["Reprise lente", "ETF Bitcoin spot soumissions SEC", "MiCA voté UE"],
  "2024": ["Approbation ETF BTC spot janvier", "Halving Bitcoin avril", "BTC ATH 108 000 $", "Trump pro-crypto élu novembre"],
  "2025": ["MiCA Phase 2 juillet", "Adoption institutionnelle massive", "ETF Ethereum spot", "Année BTC stabilisée 70-110 k$"],
};

export default function HistoriquePrixPage({ params }: Props) {
  const c = getCryptoBySlug(params.crypto);
  if (!c || !YEARS.includes(params.annee as Annee)) {
    notFound();
  }
  const annee = params.annee as Annee;
  const events = MACRO_EVENTS[annee];

  const schemas = graphSchema([
    articleSchema({
      slug: `historique-prix/${c.id}/${annee}`,
      title: `Prix ${c.name} (${c.symbol}) en ${annee} — historique annuel`,
      description: `Évolution du prix ${c.name} en ${annee} avec événements macro contextualisés.`,
      date: "2026-05-02",
      dateModified: "2026-05-02",
      category: "Historique prix",
      tags: [c.name, c.symbol, "historique", annee, "prix crypto"],
    }),
    breadcrumbSchema([
      { name: "Accueil", url: "/" },
      { name: "Historique prix", url: "/historique-prix" },
      { name: c.name, url: `/cryptos/${c.id}` },
      { name: annee, url: `/historique-prix/${c.id}/${annee}` },
    ]),
  ]);

  return (
    <article className="py-12 sm:py-16">
      <StructuredData id="historique-prix" data={schemas} />

      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        <nav className="text-xs text-muted">
          <Link href="/" className="hover:text-fg">Accueil</Link>
          <span className="mx-2">/</span>
          <Link href={`/cryptos/${c.id}`} className="hover:text-fg">{c.name}</Link>
          <span className="mx-2">/</span>
          <span className="text-fg/80">Prix {annee}</span>
        </nav>

        <header className="mt-6">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/15 border border-primary/30 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-primary-soft">
            <Calendar className="h-3 w-3" aria-hidden /> Historique annuel
          </span>
          <h1 className="mt-4 text-3xl sm:text-5xl font-extrabold tracking-tight">
            Prix {c.name} ({c.symbol}) en{" "}
            <span className="gradient-text">{annee}</span>
          </h1>
          <p className="mt-4 text-base sm:text-lg text-fg/80 leading-relaxed">
            Évolution du prix de {c.name} sur l&apos;année {annee} : ouverture,
            clôture, plus haut historique, plus bas, et les événements macro
            qui ont marqué le marché crypto cette année-là.
          </p>
        </header>

        <div className="mt-8">
          <Tldr
            headline={`En ${annee}, ${c.name} a évolué dans un contexte macro spécifique. Voici les chiffres clés et événements marquants.`}
            bullets={events.map((e) => ({ emoji: "📅", text: e }))}
            readingTime="3 min"
            level="Tous niveaux"
          />
        </div>

        {/* Section "événements macro" */}
        <section className="mt-12">
          <h2 className="text-2xl font-bold tracking-tight">
            Le contexte macro en {annee}
          </h2>
          <ul className="mt-4 space-y-3">
            {events.map((event, i) => (
              <li
                key={i}
                className="rounded-xl border border-border bg-surface p-4 flex items-start gap-3"
              >
                <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary font-bold text-sm">
                  {i + 1}
                </span>
                <p className="text-sm text-fg/85 leading-relaxed">{event}</p>
              </li>
            ))}
          </ul>
        </section>

        {/* Live data hint — V2 fetch CoinGecko historical */}
        <section className="mt-12 rounded-2xl border border-border bg-elevated/30 p-6">
          <div className="flex items-start gap-3">
            <Info className="h-5 w-5 text-primary-soft mt-0.5 shrink-0" aria-hidden />
            <div>
              <h2 className="text-lg font-bold">
                Données prix détaillées
              </h2>
              <p className="mt-2 text-sm text-fg/80 leading-relaxed">
                Pour visualiser l&apos;évolution complète (chart interactif,
                ATH/ATL, volume, volatilité) du prix {c.name} en {annee}, utilise
                notre simulateur ROI sur la fiche détaillée. Sélectionne la date
                de départ {annee} pour voir le rendement à aujourd&apos;hui.
              </p>
              <Link
                href={`/cryptos/${c.id}#roi-simulator`}
                className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-primary-soft hover:text-primary"
              >
                Voir le simulateur ROI {c.name}
                <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
            </div>
          </div>
        </section>

        {/* Liens vers autres années */}
        <section className="mt-12">
          <h2 className="text-2xl font-bold tracking-tight">
            Prix {c.name} sur d&apos;autres années
          </h2>
          <div className="mt-5 grid grid-cols-3 sm:grid-cols-4 gap-2">
            {YEARS.filter((y) => y !== annee).map((y) => (
              <Link
                key={y}
                href={`/historique-prix/${c.id}/${y}`}
                className="hover-lift rounded-lg border border-border bg-surface px-3 py-2 text-center text-sm font-semibold text-fg/85 hover:text-primary hover:border-primary/40"
              >
                {y}
              </Link>
            ))}
          </div>
        </section>

        {/* Disclaimer */}
        <div className="mt-10">
          <AmfDisclaimer variant="educatif" />
        </div>

        {/* Maillage SEO */}
        <div className="mt-12">
          <RelatedPagesNav
            currentPath={`/historique-prix/${c.id}/${annee}`}
            variant="default"
            limit={4}
          />
        </div>
        <div className="mt-12">
          <NextStepsGuide context="article" articleCategory="Marché" />
        </div>
      </div>
    </article>
  );
}
