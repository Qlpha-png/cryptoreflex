import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  Activity,
  Flame,
  TrendingUp,
  TrendingDown,
  Sparkles,
} from "lucide-react";

import { BRAND } from "@/lib/brand";
import StructuredData from "@/components/StructuredData";
import {
  breadcrumbSchema,
  graphSchema,
  type JsonLd,
} from "@/lib/schema";

/**
 * /marche — Hub Marché (P0-5 audit-back-live-final).
 *
 * Server Component statique. Trois sous-pages live (Heatmap, Fear & Greed,
 * Gainers/Losers) sont déjà publiées sur des routes dédiées — on les
 * "remonte" ici dans une page-mère pour donner une porte d'entrée SEO et
 * un parcours UX cohérent ("Marché" devient un nom de section, pas une
 * collection d'URLs orphelines).
 */

export const revalidate = 3600;

const PAGE_PATH = "/marche";
const PAGE_URL = `${BRAND.url}${PAGE_PATH}`;
const TITLE = "Marché crypto en direct — Heatmap, Fear & Greed, Gainers/Losers";
const DESCRIPTION =
  "Tableau de bord du marché crypto temps réel : heatmap top 100, indice Fear & Greed, plus gros gagnants/perdants 24h. Données CoinGecko et alternative.me, mises à jour toutes les 2 minutes.";

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
    "marché crypto temps réel",
    "heatmap crypto",
    "fear and greed crypto",
    "gainers losers crypto",
    "cours crypto live",
  ],
};

interface HubCard {
  href: string;
  title: string;
  description: string;
  bullet: string;
  icon: typeof Activity;
  accent: string;
}

const CARDS: HubCard[] = [
  {
    href: "/marche/heatmap",
    title: "Heatmap top 100",
    description:
      "Carte de chaleur interactive : qui monte, qui chute, en un coup d'œil. Vert/rouge proportionnel à la variation 24h, taille proportionnelle à la cap.",
    bullet: "Mis à jour toutes les 2 minutes",
    icon: Activity,
    accent: "from-emerald-500/20 to-teal-500/20 border-emerald-500/30",
  },
  {
    href: "/marche/fear-greed",
    title: "Indice Fear & Greed",
    description:
      "Indicateur agrégé (alternative.me) qui mesure le sentiment de marché : peur extrême ↔ avidité extrême. Souvent utile en contre-tendance.",
    bullet: "Score 0-100, mis à jour quotidien",
    icon: Flame,
    accent: "from-orange-500/20 to-rose-500/20 border-orange-500/30",
  },
  {
    href: "/marche/gainers-losers",
    title: "Gainers & Losers 24h",
    description:
      "Top 10 plus gros gagnants et top 10 plus gros perdants sur 24h dans le top 250 par cap. Filtres pour exclure les très petites cap.",
    bullet: "Top 10 + Top 10, mis à jour 2 min",
    icon: TrendingUp,
    accent: "from-cyan-500/20 to-blue-500/20 border-cyan-500/30",
  },
];

export default function MarcheHubPage() {
  // Schema.org : CollectionPage + Breadcrumb.
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
      numberOfItems: CARDS.length,
      itemListElement: CARDS.map((c, idx) => ({
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

      <section className="py-12 sm:py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <nav aria-label="Fil d'Ariane" className="text-xs text-muted">
            <Link href="/" className="hover:text-fg">
              Accueil
            </Link>
            <span className="mx-2">/</span>
            <span className="text-fg/80">Marché</span>
          </nav>

          {/* Header */}
          <header className="mt-6 max-w-3xl">
            <span className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary-glow">
              <Sparkles className="h-3.5 w-3.5" />
              Données live CoinGecko
            </span>
            <h1 className="mt-4 text-4xl font-extrabold tracking-tight sm:text-5xl">
              Marché crypto <span className="gradient-text">en direct</span>
            </h1>
            <p className="mt-3 text-lg text-fg/70">
              Trois outils visuels pour prendre la température du marché en
              moins de 30 secondes : la heatmap pour la vision globale, le Fear
              &amp; Greed pour le sentiment, et les gainers/losers pour repérer
              les rotations sectorielles.
            </p>
          </header>

          {/* Cards */}
          <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-4">
            {CARDS.map((c) => {
              const Icon = c.icon;
              return (
                <Link
                  key={c.href}
                  href={c.href}
                  className={`group relative overflow-hidden rounded-2xl border bg-gradient-to-br ${c.accent} p-6 transition-all hover:translate-y-[-2px] hover:border-primary/50 flex flex-col`}
                >
                  <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-background/40 border border-border text-fg">
                    <Icon className="h-6 w-6" />
                  </div>
                  <h2 className="mt-5 text-xl font-bold text-fg">{c.title}</h2>
                  <p className="mt-2 text-sm text-fg/70 flex-1">
                    {c.description}
                  </p>
                  <div className="mt-4 text-[11px] uppercase tracking-wider text-muted font-semibold">
                    {c.bullet}
                  </div>
                  <div className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-primary-soft group-hover:text-primary">
                    Ouvrir
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                  </div>
                </Link>
              );
            })}
          </div>

          {/* Mini-explainer "Comment lire le marché" */}
          <aside className="mt-16 grid grid-cols-1 lg:grid-cols-2 gap-6">
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
