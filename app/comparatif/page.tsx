import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  Trophy,
  Sparkles,
  TrendingUp,
} from "lucide-react";

import { getPlatformById } from "@/lib/platforms";
import {
  getPublishableComparisons,
  type ComparisonSpec,
} from "@/lib/programmatic";
import { BRAND } from "@/lib/brand";
import StructuredData from "@/components/StructuredData";
import {
  breadcrumbSchema,
  graphSchema,
  type JsonLd,
} from "@/lib/schema";

/**
 * /comparatif — Hub des duels plateformes (P0-5 audit-back-live-final).
 *
 * Server Component. Liste les 36+ comparatifs publiables, regroupés par
 * "bucket" (exchange-vs-exchange, broker-vs-broker, etc.) — c'est la
 * structure naturelle pour qu'un visiteur comparant deux exchanges trouve
 * sa paire en un coup d'œil.
 *
 * Tri intra-bucket : par priority décroissante (volume mensuel / difficulté).
 *
 * SEO : page indexable, canonical, breadcrumb, Schema.org CollectionPage +
 * ItemList des duels.
 */

export const revalidate = 86400;

const PAGE_PATH = "/comparatif";
const PAGE_URL = `${BRAND.url}${PAGE_PATH}`;
const TITLE =
  "Comparatifs plateformes crypto 2026 — Coinbase vs Binance, Kraken vs Bitpanda…";
const DESCRIPTION =
  "Tous nos comparatifs binaires des plateformes crypto disponibles en France : Coinbase vs Binance, Ledger vs Trezor, Bitpanda vs Trade Republic, OKX vs Binance, et 30+ autres duels. Frais, sécurité, MiCA, verdict.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: PAGE_URL },
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
    "comparatif plateforme crypto",
    "Coinbase vs Binance",
    "Ledger vs Trezor",
    "meilleur exchange france",
    "comparatif crypto MiCA",
  ],
};

/* -------------------------------------------------------------------------- */
/*  Buckets — labels & ordre d'affichage                                       */
/* -------------------------------------------------------------------------- */

const BUCKET_ORDER: Array<ComparisonSpec["bucket"]> = [
  "exchange-vs-exchange",
  "broker-vs-broker",
  "exchange-vs-broker",
  "wallet-vs-wallet",
  "fr-vs-international",
];

const BUCKET_LABELS: Record<ComparisonSpec["bucket"], string> = {
  "exchange-vs-exchange": "Exchange vs Exchange",
  "broker-vs-broker": "Broker vs Broker",
  "exchange-vs-broker": "Exchange vs Broker",
  "wallet-vs-wallet": "Hardware wallets",
  "fr-vs-international": "Acteur FR vs International",
};

const BUCKET_DESCRIPTIONS: Record<ComparisonSpec["bucket"], string> = {
  "exchange-vs-exchange":
    "Duels entre exchanges purs : frais spot, profondeur de carnet, catalogue.",
  "broker-vs-broker":
    "Duels entre brokers / banques crypto : UX simplifiée, achat instantané, support FR.",
  "exchange-vs-broker":
    "Quand on hésite entre un exchange (frais bas, plus technique) et un broker (UX simple, plus cher).",
  "wallet-vs-wallet":
    "Duels entre hardware wallets pour la conservation cold storage à long terme.",
  "fr-vs-international":
    "Acteur français (Coinhouse, Bitstack…) vs international (Coinbase, Binance, Bitpanda…).",
};

/* -------------------------------------------------------------------------- */
/*  Page                                                                      */
/* -------------------------------------------------------------------------- */

export default function ComparatifHubPage() {
  const all = getPublishableComparisons();

  // Regroupement par bucket.
  const byBucket = new Map<ComparisonSpec["bucket"], ComparisonSpec[]>();
  for (const c of all) {
    const arr = byBucket.get(c.bucket) ?? [];
    arr.push(c);
    byBucket.set(c.bucket, arr);
  }
  // Tri intra-bucket par priority (volume / difficulté).
  for (const arr of byBucket.values()) {
    arr.sort((a, b) => b.priority - a.priority);
  }

  // Top 6 globaux pour la "rangée mise en avant".
  const top6 = [...all].sort((a, b) => b.priority - a.priority).slice(0, 6);

  // Schema.org : CollectionPage + ItemList + Breadcrumb.
  const itemListSchema: JsonLd = {
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
      numberOfItems: all.length,
      itemListOrder: "https://schema.org/ItemListOrderDescending",
      itemListElement: all.map((c, idx) => ({
        "@type": "ListItem",
        position: idx + 1,
        url: `${BRAND.url}/comparatif/${c.slug}`,
        name: comparisonTitle(c),
      })),
    },
  };

  const breadcrumbs = breadcrumbSchema([
    { name: "Accueil", url: "/" },
    { name: "Comparatifs", url: PAGE_PATH },
  ]);

  const schema = graphSchema([itemListSchema, breadcrumbs]);

  return (
    <>
      <StructuredData data={schema} id="comparatif-hub" />

      <section className="py-12 sm:py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <nav aria-label="Fil d'Ariane" className="text-xs text-muted">
            <Link href="/" className="hover:text-fg">
              Accueil
            </Link>
            <span className="mx-2">/</span>
            <span className="text-fg/80">Comparatifs</span>
          </nav>

          {/* Header */}
          <header className="mt-6 max-w-3xl">
            <span className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary-glow">
              <Sparkles className="h-3.5 w-3.5" />
              {all.length} duels disponibles
            </span>
            <h1 className="mt-4 text-4xl font-extrabold tracking-tight sm:text-5xl">
              Comparatifs <span className="gradient-text">plateformes crypto</span>
            </h1>
            <p className="mt-3 text-lg text-fg/70">
              Tu hésites entre deux plateformes ? Choisis ton duel. Chaque
              comparatif détaille frais, sécurité, support FR, conformité MiCA
              et bonus, avec un verdict tranché à la fin.
            </p>
          </header>

          {/* Top 6 mis en avant */}
          <section className="mt-12">
            <header className="flex items-center gap-3 mb-6">
              <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-amber-400/10 border border-amber-400/30 text-amber-300">
                <TrendingUp className="h-5 w-5" />
              </div>
              <h2 className="text-2xl font-bold tracking-tight">
                Les comparatifs les plus consultés
              </h2>
            </header>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {top6.map((c) => (
                <ComparisonCard key={c.slug} comparison={c} highlight />
              ))}
            </div>
          </section>

          {/* Buckets */}
          <div className="mt-16 space-y-16">
            {BUCKET_ORDER.map((bucket) => {
              const list = byBucket.get(bucket) ?? [];
              if (list.length === 0) return null;
              return (
                <section key={bucket} id={bucket}>
                  <header className="mb-6">
                    <div className="flex items-center gap-3">
                      <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 border border-primary/20 text-primary-soft">
                        <Trophy className="h-5 w-5" />
                      </div>
                      <h2 className="text-2xl font-bold tracking-tight">
                        {BUCKET_LABELS[bucket]}
                        <span className="ml-2 text-sm font-normal text-muted">
                          ({list.length})
                        </span>
                      </h2>
                    </div>
                    <p className="mt-2 text-sm text-fg/70 max-w-3xl">
                      {BUCKET_DESCRIPTIONS[bucket]}
                    </p>
                  </header>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {list.map((c) => (
                      <ComparisonCard key={c.slug} comparison={c} />
                    ))}
                  </div>
                </section>
              );
            })}
          </div>
        </div>
      </section>
    </>
  );
}

/* -------------------------------------------------------------------------- */
/*  Helpers & sub-components                                                  */
/* -------------------------------------------------------------------------- */

function comparisonTitle(c: ComparisonSpec): string {
  const a = getPlatformById(c.a);
  const b = getPlatformById(c.b);
  const aName = a?.name ?? c.a;
  const bName = b?.name ?? c.b;
  return `${aName} vs ${bName}`;
}

function ComparisonCard({
  comparison,
  highlight = false,
}: {
  comparison: ComparisonSpec;
  highlight?: boolean;
}) {
  const a = getPlatformById(comparison.a);
  const b = getPlatformById(comparison.b);
  const aName = a?.name ?? comparison.a;
  const bName = b?.name ?? comparison.b;

  return (
    <Link
      href={`/comparatif/${comparison.slug}`}
      className={`group rounded-2xl border bg-surface p-4 transition-colors flex items-center justify-between gap-3 ${
        highlight
          ? "border-primary/30 hover:border-primary/60 bg-primary/5"
          : "border-border hover:border-primary/40"
      }`}
    >
      <div className="min-w-0 flex-1">
        <div className="font-bold text-fg truncate">
          {aName} <span className="text-muted">vs</span> {bName}
        </div>
        <div className="mt-1 text-[11px] text-muted">
          {BUCKET_LABELS[comparison.bucket]}
        </div>
      </div>
      <ArrowRight className="h-4 w-4 text-primary-soft shrink-0 transition-transform group-hover:translate-x-0.5" />
    </Link>
  );
}
