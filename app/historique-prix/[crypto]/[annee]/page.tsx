import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, TrendingUp, Calendar, Info } from "lucide-react";

import { getAllCryptos, getCryptoBySlug, type AnyCrypto } from "@/lib/cryptos";
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
import { withHreflang } from "@/lib/seo-alternates";

/**
 * /historique-prix/[crypto]/[annee] — Programmatic SEO ultra-fort intent.
 *
 * Audit expert SEO programmatic 2026-05-02 : 80 cryptos × 9 années (2018-2026)
 * = 720 URLs à fort volume FR (25-50k/mois cumulé : "prix bitcoin 2017",
 * "prix ethereum 2021"). Featured snippet potentiel.
 *
 * Phase actuelle : génération statique top 10 cryptos × 9 années = 90 URLs
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

// FIX 2026-05-09 — Ajout 2026 (annee courante en cours, mai 2026).
// Couvre les recherches "prix bitcoin 2026" deja actives. L'annee 2025
// reste la plus pertinente fiscalement (declaration faite en mai 2026).
const YEARS = ["2018", "2019", "2020", "2021", "2022", "2023", "2024", "2025", "2026"] as const;
type Annee = (typeof YEARS)[number];

interface Props {
  params: { crypto: string; annee: string };
}

export const revalidate = 604800; // 7 jours (donnée annuelle immuable)
// 2026-06-13 — HARD 404 sur params invalides (fix soft-404 SEO). Page
// synchrone (aucun fetch réseau au build) → on liste TOUS les couples
// valides (100 cryptos × 9 années) et on passe dynamicParams=false : un
// (crypto, année) hors-liste renvoie un vrai 404 au lieu du soft-200 de
// notFound() sous ISR. Build mesuré OK (page légère, sans I/O).
export const dynamicParams = false;

export function generateStaticParams() {
  return getAllCryptos().flatMap((c) =>
    YEARS.map((annee) => ({ crypto: c.id, annee })),
  );
}

export function generateMetadata({ params }: Props): Metadata {
  const c = getCryptoBySlug(params.crypto);
  if (!c || !YEARS.includes(params.annee as Annee))
    return { robots: { index: false, follow: false } };
  const annee = params.annee as Annee;
  // FIX 2026-06-13 — (a) ne plus PROMETTRE des prix OHLC (ouverture/clôture/
  // haut/bas) que la page ne rend pas encore, ni « Données vérifiées » : c'est
  // une promesse non tenue (règle éditoriale #1). (b) noindex les couples où la
  // crypto n'existait pas encore : page garantie vide → on la retire de l'index
  // (mais follow) pour ne pas gâcher le budget de crawl ni diluer le cluster.
  const didNotExist = Number(annee) < c.yearCreated;
  const title = didNotExist
    ? `${c.name} (${c.symbol}) en ${annee} : avant son lancement`
    : `Prix ${c.name} (${c.symbol}) en ${annee}`;
  const description = didNotExist
    ? `${c.name} (${c.symbol}) a été lancé en ${c.yearCreated} : le projet n'existait pas encore en ${annee}, il n'y a donc pas de prix de marché.`
    : `${c.name} (${c.symbol}) en ${annee} : contexte macro du marché crypto, événements marquants et repères pour situer le projet cette année-là.`;
  return {
    title,
    description,
    ...(didNotExist ? { robots: { index: false, follow: true } } : {}),
    alternates: withHreflang(`${BRAND.url}/historique-prix/${c.id}/${annee}`),
    openGraph: {
      title,
      description,
      url: `${BRAND.url}/historique-prix/${c.id}/${annee}`,
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
  "2026": ["MiCA Phase 2 enforcement (ESMA, Q2)", "Cycle post-halving en cours", "Tokenisation RWA accélérée (Ondo, BlackRock BUIDL)", "Année partielle — données mises à jour mensuellement"],
};

// Intro data-derivée, unique par couple (crypto, année). 100 % calculée à
// partir des champs locaux (yearCreated, category) — aucune donnée inventée.
// Le cas "n'existait pas encore" est un vrai signal utile (et explique
// pourquoi certaines années n'ont pas de prix de marché).
function firstSentence(s?: string): string {
  if (!s) return "";
  const cut = s.split(". ")[0].trim();
  return cut.replace(/\.?$/, ".");
}

function buildIntro(c: AnyCrypto, annee: Annee): string {
  const y = Number(annee);
  const age = y - c.yearCreated;
  const cat = c.category.toLowerCase();
  if (age < 0) {
    return `Important : ${c.name} (${c.symbol}) n'existait pas encore en ${annee} — le projet a été lancé en ${c.yearCreated}. Il n'y a donc pas de prix de marché pour cette année-là. Pour suivre son parcours réel, commencez à son année de lancement.`;
  }
  // Phrase descriptive propre à la crypto (champ `what`, commun top10/gems) :
  // c'est ce qui casse la quasi-duplication entre deux cryptos d'une même année.
  const desc = `${c.name} (${c.symbol}) — ${cat}. ${firstSentence(c.what)}`;
  if (age === 0) {
    return `${annee} est l'année de lancement de ${c.name}. ${desc} Les premiers prix de marché apparaissent cette année-là : volatilité élevée et faible profondeur de marché sont typiques d'un actif naissant.`;
  }
  return `En ${annee}, ${c.name} avait ${age} an${age > 1 ? "s" : ""} d'existence (lancé en ${c.yearCreated}). ${desc} On replace ci-dessous le projet dans le contexte macro du marché crypto de l'année.`;
}

export default function HistoriquePrixPage({ params }: Props) {
  const c = getCryptoBySlug(params.crypto);
  if (!c || !YEARS.includes(params.annee as Annee)) {
    notFound();
  }
  const annee = params.annee as Annee;
  const events = MACRO_EVENTS[annee];
  // FIX 2026-06-13 — quand la crypto n'existait pas encore cette année-là, le
  // corps ne doit pas affirmer qu'elle « a évolué » (contradiction avec l'intro).
  const didNotExist = Number(annee) < c.yearCreated;

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
        <nav aria-label="Fil d'Ariane" className="text-xs text-muted">
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
            {didNotExist ? <>{c.name} ({c.symbol}) en{" "}</> : <>Prix {c.name} ({c.symbol}) en{" "}</>}
            <span className="gradient-text">{annee}</span>
          </h1>
          <p className="mt-4 text-base sm:text-lg text-fg/80 leading-relaxed">
            {didNotExist ? (
              <>
                {c.name} ({c.symbol}) a été lancé en {c.yearCreated} : en {annee}
                {" "}le projet n&apos;existait pas encore, il n&apos;y a donc pas de
                prix de marché. Ci-dessous, des repères macro du marché crypto de l&apos;année.
              </>
            ) : (
              <>
                {c.name} sur l&apos;année {annee} : le contexte macro du marché
                crypto, les événements marquants et des repères pour situer le
                projet cette année-là.
              </>
            )}
          </p>
          <p className="mt-3 text-base text-fg/75 leading-relaxed max-w-3xl">
            {buildIntro(c, annee)}
          </p>
        </header>

        <div className="mt-8">
          <Tldr
            headline={
              didNotExist
                ? `${c.name} a été lancé en ${c.yearCreated} ; ${annee} précède son existence — repères macro du marché crypto ci-dessous.`
                : `En ${annee}, ${c.name} a évolué dans un contexte macro spécifique. Voici les événements marquants et les repères de l'année.`
            }
            bullets={events.map((e) => ({ emoji: "📅", text: e }))}
            readingTime="3 min"
            level="Tous niveaux"
          />
        </div>

        {/* Section "événements macro" */}
        <section className="mt-12">
          <h2 className="text-2xl font-bold tracking-tight">
            {didNotExist ? `Le marché crypto en ${annee}` : `Le contexte macro en ${annee}`}
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
          {/* FIX 2026-06-13 — attribution source des chiffres macro (E-E-A-T). */}
          <p className="mt-3 text-xs text-muted">
            Repères issus de l&apos;historique public du marché crypto, vérifiés
            éditorialement et à recouper avant toute décision. Les chiffres (ATH,
            variations annuelles) sont donnés à titre indicatif.
          </p>
        </section>

        {/* Live data hint — V2 fetch CoinGecko historical */}
        <section className="mt-12 rounded-2xl border border-border bg-elevated/30 p-6">
          <div className="flex items-start gap-3">
            <Info className="h-5 w-5 text-primary-soft mt-0.5 shrink-0" aria-hidden />
            <div>
              <h2 className="text-lg font-bold">
                {didNotExist ? `${c.name} avant son lancement` : "Données prix détaillées"}
              </h2>
              <p className="mt-2 text-sm text-fg/80 leading-relaxed">
                {didNotExist ? (
                  <>
                    {c.name} n&apos;existait pas encore en {annee} (lancé en {c.yearCreated}).
                    Pour suivre son parcours réel, commencez à son année de lancement
                    sur la fiche détaillée.
                  </>
                ) : (
                  <>
                    Pour visualiser l&apos;évolution complète (chart interactif,
                    ATH/ATL, volume, volatilité) du prix {c.name} en {annee}, utilisez
                    notre simulateur ROI sur la fiche détaillée. Sélectionnez la date
                    de départ {annee} pour voir le rendement à aujourd&apos;hui.
                  </>
                )}
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
