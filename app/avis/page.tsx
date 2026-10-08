import { avecTypoSync } from "@/components/ui/Typo";
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
  Ban,
} from "lucide-react";

import { getAllPlatforms, isAvailableFr, type Platform } from "@/lib/platforms";
import { getPublishableReviewSlugs } from "@/lib/programmatic";
import { BRAND } from "@/lib/brand";
import StructuredData from "@/components/StructuredData";
import { graphSchema, type JsonLd } from "@/lib/schema";
import { withHreflang } from "@/lib/seo-alternates";
import { fitDescription, fitTitle } from "@/lib/seo-text";
import { fmtFr } from "@/lib/format-fr";
import Breadcrumbs from "@/components/Breadcrumbs";

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
const TITLE = "Avis plateformes crypto 2026 : Coinbase, Kraken, Bitpanda…";
const DESCRIPTION =
  "Nos avis détaillés sur les plateformes crypto autorisées en France : Coinbase, Kraken, Bitpanda, Bitstack, Trade Republic… Frais, sécurité, statut MiCA vérifié au registre, support en français.";

export const metadata: Metadata = {
  title: fitTitle(TITLE),
  description: fitDescription(DESCRIPTION),
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
    "avis plateforme crypto",
    "meilleur exchange crypto france",
    "comparatif crypto MiCA",
    "Coinbase avis",
    "Bitstack avis",
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

function AvisHubPage() {
  const publishableSlugs = new Set(getPublishableReviewSlugs());
  // 06/10/2026 : les plateformes non autorisées en France (isAvailableFr) passent après les
  // disponibles (tri stable : l'ordre par score est conservé dans chaque groupe).
  const all = getAllPlatforms()
    .filter((p) => publishableSlugs.has(p.id))
    .sort((a, b) => Number(isAvailableFr(b)) - Number(isAvailableFr(a)));

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

  const schema = graphSchema([itemListSchema]);

  return (
    <>
      <StructuredData data={schema} id="avis-hub" />

      <section className="py-12 sm:py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {/* Breadcrumb visuel */}
          <Breadcrumbs chemin="/avis" />

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
              Les exchanges, brokers et hardware wallets notés sur 6 critères
              pondérés (frais, sécurité, UX, support FR, conformité MiCA, score
              global). Méthodologie publique, vérification mensuelle. Les
              plateformes non autorisées en France sont signalées et classées en
              fin de liste.
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
                    <span className="text-xs opacity-70">({count})</span>
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
                const dispo = list.filter(isAvailableFr);
                const horsFr = list.filter((p) => !isAvailableFr(p));
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

                    {dispo.length > 0 && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {dispo.map((p) => (
                          <ReviewCard key={p.id} platform={p} />
                        ))}
                      </div>
                    )}

                    {/* 06/10/2026 : groupe séparé, après les plateformes disponibles.
                        Jeton danger-fg (#FCA5A5) : red-200 (#FECACA) se lisait presque blanc. */}
                    {horsFr.length > 0 && (
                      <>
                        <h3 className="mt-8 mb-4 flex items-center gap-2 text-sm font-semibold text-danger-fg">
                          <Ban className="h-4 w-4" aria-hidden="true" />
                          Non disponibles en France
                          <span className="font-normal text-muted">
                            ({horsFr.length})
                          </span>
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                          {horsFr.map((p) => (
                            <ReviewCard key={p.id} platform={p} />
                          ))}
                        </div>
                      </>
                    )}
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
            <p className="mt-2 text-sm text-fg/70 max-w-[34em]">
              Six critères pondérés, mesurés sur la base de
              données vérifiables (frais affichés, registres AMF/MiCA, avis
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

function ReviewCardBase({ platform }: { platform: Platform }) {
  const { id, name, tagline, scoring, mica, badge } = platform;
  // 06/10/2026 : plateforme non autorisée en France → badge rouge, et pas de pastille « MiCA »
  // (Gemini reste agréée MiCA à Malte mais a quitté le marché français).
  const available = isAvailableFr(platform);
  return (
    <Link
      href={`/avis/${id}`}
      className={`group rounded-2xl border bg-surface p-5 transition-colors flex flex-col ${
        available ? "border-border hover:border-primary/40" : "border-red-400/30 hover:border-red-400/60"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          {!available ? (
            <span className="inline-flex items-center gap-1 rounded-full border border-red-400/40 bg-red-400/10 px-2 py-0.5 text-xs font-semibold text-red-200">
              <Ban className="h-3 w-3" aria-hidden="true" />
              Non disponible en France
            </span>
          ) : badge && (
            <span className="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-xs font-bold uppercase tracking-wider text-primary-soft">
              {badge}
            </span>
          )}
          <h3 className="mt-2 text-lg font-bold text-fg break-words">{name}</h3>
          <div className="mt-1 flex items-center gap-1.5">
            <Star className="h-3.5 w-3.5 fill-primary text-primary" />
            <span className="font-mono text-sm tabular-nums text-fg">
              {fmtFr(scoring.global, 1)}
              <span className="text-muted">/5</span>
            </span>
          </div>
        </div>
        {available && mica.micaCompliant && (
          <span
            className="inline-flex items-center gap-1 rounded-md border border-accent-green/30 bg-accent-green/10 px-2 py-0.5 text-xs font-semibold text-accent-green shrink-0"
            title="Conforme MiCA"
          >
            <ShieldCheck className="h-3 w-3" />
            MiCA
          </span>
        )}
      </div>

      <p className="mt-3 text-sm text-fg/70 flex-1">{tagline}</p>

      <div className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-primary-soft group-hover:text-primary">
        Lire l'avis détaillé
        <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
      </div>
    </Link>
  );
}

const ReviewCard = avecTypoSync(ReviewCardBase);

export default avecTypoSync(AvisHubPage);
