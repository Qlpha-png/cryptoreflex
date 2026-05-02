import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  ShieldCheck,
  Star,
  Filter,
  Building2,
  Wallet,
  Sparkles,
} from "lucide-react";

import { getAllPlatforms, type Platform } from "@/lib/platforms";
import { getPublishableReviewSlugs } from "@/lib/programmatic";
import { BRAND } from "@/lib/brand";
import StructuredData from "@/components/StructuredData";
import {
  breadcrumbSchema,
  graphSchema,
  type JsonLd,
} from "@/lib/schema";

/**
 * /avis — Hub des avis plateformes (P0-5 audit-back-live-final).
 *
 * Server Component : tout est rendu côté serveur (les data sont statiques,
 * pas besoin d'interactivité). On expose la liste complète des plateformes
 * publiables (intersection REVIEW_SLUGS ∩ data/platforms.json) avec un tri
 * par score global décroissant et trois filtres visuels par catégorie.
 *
 * SEO : page indexable, canonical, breadcrumb, Schema.org CollectionPage +
 * ItemList des plateformes.
 */

export const revalidate = 86400;

const PAGE_PATH = "/avis";
const PAGE_URL = `${BRAND.url}${PAGE_PATH}`;
const TITLE = "Avis plateformes crypto — comparatif 2026 (Coinbase, Binance, Kraken…)";
const DESCRIPTION =
  "Tous nos avis détaillés sur les plateformes crypto disponibles en France : Coinbase, Binance, Kraken, Bitpanda, Bitget, Trade Republic… Frais, sécurité, conformité MiCA, support FR. Mis à jour avril 2026.";

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
    "avis plateforme crypto",
    "meilleur exchange crypto france",
    "comparatif crypto MiCA",
    "Coinbase avis",
    "Binance avis",
    "Kraken avis",
    "Bitpanda avis",
  ],
};

/* -------------------------------------------------------------------------- */
/*  Catégories visuelles — pour les "filtres" (statiques car SSR-only).       */
/* -------------------------------------------------------------------------- */

const CATEGORY_LABELS: Record<Platform["category"], string> = {
  exchange: "Exchanges",
  broker: "Brokers / banques crypto",
  wallet: "Hardware wallets",
};

const CATEGORY_ICONS: Record<Platform["category"], typeof Building2> = {
  exchange: Building2,
  broker: Wallet,
  wallet: ShieldCheck,
};

/* -------------------------------------------------------------------------- */
/*  Page                                                                      */
/* -------------------------------------------------------------------------- */

export default function AvisHubPage() {
  const publishableSlugs = new Set(getPublishableReviewSlugs());
  const all = getAllPlatforms().filter((p) => publishableSlugs.has(p.id));

  // Regroupement par catégorie pour l'affichage en sections.
  const byCategory: Record<Platform["category"], Platform[]> = {
    exchange: [],
    broker: [],
    wallet: [],
  };
  // FIX 2026-05-02 #14 (build error commit 7429696) — defensive check :
  // si une nouvelle plateforme a une `category` inconnue (ex: "earn" sur
  // Nexo avant fix), on la pousse en "broker" plutôt que de crash le
  // prerendering. Le bug initial : `byCategory["earn"].push(p)` sur
  // undefined → "Cannot read properties of undefined (reading 'push')"
  // → build prod en ERROR. Ce filet de sécurité empêche toute future
  // régression similaire (un dev ajoute une catégorie sans toucher au type).
  for (const p of all) {
    const bucket = byCategory[p.category] ?? byCategory.broker;
    bucket.push(p);
  }

  // Schema.org : CollectionPage + ItemList + Breadcrumb (cf. lib/schema.ts).
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
      itemListElement: all.map((p, idx) => ({
        "@type": "ListItem",
        position: idx + 1,
        url: `${BRAND.url}/avis/${p.id}`,
        name: `Avis ${p.name}`,
      })),
    },
  };

  const breadcrumbs = breadcrumbSchema([
    { name: "Accueil", url: "/" },
    { name: "Avis plateformes", url: PAGE_PATH },
  ]);

  const schema = graphSchema([itemListSchema, breadcrumbs]);

  return (
    <>
      <StructuredData data={schema} id="avis-hub" />

      <section className="py-12 sm:py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {/* Breadcrumb visuel */}
          <nav aria-label="Fil d'Ariane" className="text-xs text-muted">
            <Link href="/" className="hover:text-fg">
              Accueil
            </Link>
            <span className="mx-2">/</span>
            <span className="text-fg/80">Avis plateformes</span>
          </nav>

          {/* Header */}
          <header className="mt-6 max-w-3xl">
            <span className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary-glow">
              <Sparkles className="h-3.5 w-3.5" />
              {all.length} plateformes notées
            </span>
            <h1 className="mt-4 text-4xl font-extrabold tracking-tight sm:text-5xl">
              Avis plateformes <span className="gradient-text">crypto</span>
            </h1>
            <p className="mt-3 text-lg text-fg/70">
              Tous les exchanges, brokers et hardware wallets disponibles en
              France, notés sur 6 critères pondérés (frais, sécurité, UX,
              support FR, conformité MiCA, score global). Méthodologie publique,
              vérification mensuelle.
            </p>
          </header>

          {/* Filter strip — statique, SSR-friendly. Liens d'ancres internes. */}
          <div className="mt-8 flex items-center gap-2 flex-wrap">
            <Filter className="h-4 w-4 text-muted" />
            <span className="text-xs text-muted">Filtrer :</span>
            {(Object.keys(byCategory) as Array<Platform["category"]>).map(
              (cat) => {
                const count = byCategory[cat].length;
                if (count === 0) return null;
                return (
                  <a
                    key={cat}
                    href={`#${cat}`}
                    className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1.5 text-xs font-semibold text-muted hover:text-fg hover:border-primary/30 transition-colors"
                  >
                    {CATEGORY_LABELS[cat]}
                    <span className="text-[10px] opacity-70">({count})</span>
                  </a>
                );
              }
            )}
          </div>

          {/* Sections par catégorie */}
          <div className="mt-12 space-y-16">
            {(Object.keys(byCategory) as Array<Platform["category"]>).map(
              (cat) => {
                const list = byCategory[cat];
                if (list.length === 0) return null;
                const Icon = CATEGORY_ICONS[cat];
                return (
                  <section key={cat} id={cat}>
                    <header className="flex items-center gap-3 mb-6">
                      <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 border border-primary/20 text-primary-soft">
                        <Icon className="h-5 w-5" />
                      </div>
                      <h2 className="text-2xl font-bold tracking-tight">
                        {CATEGORY_LABELS[cat]}
                        <span className="ml-2 text-sm font-normal text-muted">
                          ({list.length})
                        </span>
                      </h2>
                    </header>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {list.map((p) => (
                        <ReviewCard key={p.id} platform={p} />
                      ))}
                    </div>
                  </section>
                );
              }
            )}
          </div>

          {/* CTA méthodologie — réassurance E-E-A-T */}
          <aside className="mt-16 rounded-2xl border border-border bg-surface p-6">
            <h2 className="text-lg font-bold text-fg">
              Comment on note les plateformes
            </h2>
            <p className="mt-2 text-sm text-fg/70 max-w-3xl">
              Six critères pondérés, mesurés sur la base de tests réels et de
              données vérifiables (frais affichés, registres AMF/MiCA, audits
              Trustpilot). Aucune note n'est influencée par les commissions
              d'affiliation.
            </p>
            <Link
              href="/methodologie"
              className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-primary-soft hover:text-primary"
            >
              Lire la méthodologie complète
              <ArrowRight className="h-4 w-4" />
            </Link>
          </aside>
        </div>
      </section>
    </>
  );
}

/* -------------------------------------------------------------------------- */
/*  Sub-component                                                             */
/* -------------------------------------------------------------------------- */

function ReviewCard({ platform }: { platform: Platform }) {
  const { id, name, tagline, scoring, mica, badge } = platform;
  return (
    <Link
      href={`/avis/${id}`}
      className="group rounded-2xl border border-border bg-surface p-5 hover:border-primary/40 transition-colors flex flex-col"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          {badge && (
            <span className="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary-soft">
              {badge}
            </span>
          )}
          <h3 className="mt-2 text-lg font-bold text-fg truncate">{name}</h3>
          <div className="mt-1 flex items-center gap-1.5">
            <Star className="h-3.5 w-3.5 fill-primary text-primary" />
            <span className="font-mono text-sm tabular-nums text-fg">
              {scoring.global.toFixed(1)}
              <span className="text-muted">/5</span>
            </span>
          </div>
        </div>
        {mica.micaCompliant && (
          <span
            className="inline-flex items-center gap-1 rounded-md border border-accent-green/30 bg-accent-green/10 px-2 py-0.5 text-[10px] font-semibold text-accent-green shrink-0"
            title="Conforme MiCA"
          >
            <ShieldCheck className="h-3 w-3" />
            MiCA
          </span>
        )}
      </div>

      <p className="mt-3 text-sm text-fg/70 line-clamp-3 flex-1">{tagline}</p>

      <div className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-primary-soft group-hover:text-primary">
        Lire l'avis détaillé
        <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
      </div>
    </Link>
  );
}
