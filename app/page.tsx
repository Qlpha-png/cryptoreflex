// Refonte 26/04/2026 - 3-5 catégories pour réduire la charge cognitive utilisateur (feedback : "tout est trop sur le home page")
import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  Lightbulb,
  Newspaper,
  Target,
  Wrench,
} from "lucide-react";

import { fetchPrices, fetchTopMarket } from "@/lib/coingecko";
import GlobalMetricsBar from "@/components/GlobalMetricsBar";
import Hero from "@/components/Hero";
import PriceTicker from "@/components/PriceTicker";
import ReassuranceSection from "@/components/ReassuranceSection";
import NewsletterCapture from "@/components/NewsletterCapture";
import MarketTable from "@/components/MarketTable";
import BeginnerJourney from "@/components/BeginnerJourney";
import Top10CryptosSection from "@/components/Top10CryptosSection";
import PlatformsSection from "@/components/PlatformsSection";
import BlogPreview from "@/components/BlogPreview";
import ToolsTeaser from "@/components/ToolsTeaser";
import NewsTickerServer from "@/components/NewsTickerServer";
import NewsBar from "@/components/NewsBar";
import StructuredData from "@/components/StructuredData";
import { BRAND } from "@/lib/brand";
import {
  breadcrumbSchema,
  graphSchema,
  organizationSchema,
  topPlatformsItemListSchema,
  websiteSchema,
} from "@/lib/schema";

export const revalidate = 60;

/**
 * Métadonnées de la home — canonical explicite (P0-3 audit-back-live-final).
 *
 * Pourquoi un canonical explicite alors que la home est implicitement la racine ?
 * Sans canonical déclaré, Google peut considérer le `?utm_source=…` ou les
 * variantes apex/www comme des duplicates, et choisir une version arbitraire.
 * Le canonical absolu (BRAND.url, déjà en `www.`) verrouille la version
 * canonique pour tous les crawlers.
 */
export const metadata: Metadata = {
  description:
    "Comparateur crypto FR : Coinbase, Binance, Bitpanda, Kraken… Frais, sécurité, MiCA. Guides débutants, calculateurs gratuits, fiscalité française.",
  alternates: { canonical: BRAND.url },
  openGraph: {
    url: BRAND.url,
    description:
      "Compare les meilleures plateformes crypto régulées MiCA en France. Guides débutants, calculateurs frais/fiscalité, alertes prix gratuites.",
  },
};

/**
 * En-tête de catégorie réutilisable. Sert de "respiration" entre les blocs et
 * structure la page en 4 grandes sections sémantiques (H2). UX : un visiteur
 * doit pouvoir scanner la page en lisant uniquement les titres de catégorie.
 */
function CategoryHeader({
  Icon,
  eyebrow,
  title,
  intro,
  ctaHref,
  ctaLabel,
}: {
  Icon: typeof Target;
  eyebrow: string;
  title: string;
  intro: string;
  ctaHref?: string;
  ctaLabel?: string;
}) {
  return (
    <header className="mx-auto max-w-7xl px-4 pb-2 pt-16 sm:px-6 sm:pt-20 lg:px-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="max-w-2xl">
          <span className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary-glow">
            <Icon className="h-3.5 w-3.5" aria-hidden="true" />
            {eyebrow}
          </span>
          <h2 className="mt-4 text-3xl font-extrabold tracking-tight sm:text-4xl">
            {title}
          </h2>
          <p className="mt-3 text-base text-fg/70 sm:text-lg">{intro}</p>
        </div>
        {ctaHref && ctaLabel ? (
          <Link href={ctaHref} className="btn-ghost self-start py-2.5 text-sm">
            {ctaLabel}
            <ArrowRight className="h-4 w-4" />
          </Link>
        ) : null}
      </div>
    </header>
  );
}

/**
 * Séparateur visuel léger entre catégories — gradient gold subtil pour rester
 * dans la palette dark + or sans alourdir le rendu mobile (1 div, no JS).
 */
function CategoryDivider() {
  return (
    <div className="mx-auto my-2 h-px max-w-7xl bg-gradient-to-r from-transparent via-primary/20 to-transparent" />
  );
}

export default async function HomePage() {
  // Parallélise prix top 6 (ticker) et top 20 (table + sparklines BTC/ETH/SOL pour Hero).
  // Les deux passent par unstable_cache ; aucune sur-requête.
  const [prices, market] = await Promise.all([fetchPrices(), fetchTopMarket(20)]);

  // Extrait les sparklines 7j pour BTC / ETH / SOL afin de les injecter dans le Hero.
  const heroSparklines: Record<string, number[]> = {};
  for (const c of market) {
    if (c.id === "bitcoin" || c.id === "ethereum" || c.id === "solana") {
      heroSparklines[c.id] = c.sparkline7d ?? [];
    }
  }

  // Date "MAJ" affichée dans le widget — ISO du build/refresh courant.
  const updatedAt = new Date().toISOString();

  /*
   * JSON-LD home : @graph contenant 4 entités liées par @id :
   *  - Organization (Knowledge Panel + logo Google Search)
   *  - WebSite + SearchAction (Sitelinks Search Box éligible)
   *  - ItemList des Top 6 plateformes (rich result Carousel possible)
   *  - BreadcrumbList minimal (navigation SERP)
   */
  const homeSchema = graphSchema([
    organizationSchema(),
    websiteSchema(),
    topPlatformsItemListSchema(6),
    breadcrumbSchema([{ name: "Accueil", url: "/" }]),
  ]);

  return (
    <>
      <StructuredData data={homeSchema} id="home-graph" />

      {/* ──────────────────────────────────────────────────────────────────
          BLOC HERO — contexte marché + promesse + 1 CTA fort.
          Bandeaux fins (metrics / news / ticker) empilés au-dessus du Hero
          pour densifier la perception "site vivant" sans tuer le LCP.
         ────────────────────────────────────────────────────────────────── */}
      <GlobalMetricsBar />
      <NewsBar />
      <PriceTicker initial={prices} />
      <NewsTickerServer />
      <Hero
        prices={prices}
        sparklines={heroSparklines}
        updatedAt={updatedAt}
      />
      <ReassuranceSection />

      {/* ──────────────────────────────────────────────────────────────────
          CATÉGORIE 1 — DÉMARRER MAINTENANT
          Pour qui n'a jamais acheté de crypto. On ramène le parcours
          débutant juste après le Hero : c'est le chemin de plus haute
          intention pour le persona principal (FR débutant post-MiCA).
         ────────────────────────────────────────────────────────────────── */}
      <section aria-labelledby="cat-demarrer">
        <CategoryHeader
          Icon={Target}
          eyebrow="Étape 1"
          title="Démarrer maintenant"
          intro="Tu n'as jamais acheté de crypto ? Suis le parcours en 4 étapes — comprendre, choisir, sécuriser, acheter."
        />
        <h2 id="cat-demarrer" className="sr-only">
          Démarrer maintenant
        </h2>
        <BeginnerJourney />
      </section>

      <CategoryDivider />

      {/* ──────────────────────────────────────────────────────────────────
          CATÉGORIE 2 — COMPARER LES PLATEFORMES
          Cible principale de conversion affiliation. On garde Platforms
          (cards complètes) + un teaser MarketTable plus bas pour ne pas
          surcharger le scroll mobile.
         ────────────────────────────────────────────────────────────────── */}
      <section aria-labelledby="cat-comparer">
        <CategoryHeader
          Icon={BarChart3}
          eyebrow="Étape 2"
          title="Comparer les plateformes"
          intro="Frais, sécurité, conformité MiCA : sélectionne l'exchange régulé qui correspond à ton profil."
          ctaHref="/comparatif"
          ctaLabel="Comparateur complet"
        />
        <h2 id="cat-comparer" className="sr-only">
          Comparer les plateformes
        </h2>
        <PlatformsSection />
      </section>

      <CategoryDivider />

      {/* ──────────────────────────────────────────────────────────────────
          CATÉGORIE 3 — APPRENDRE
          Top cryptos expliquées + 3 derniers articles blog. Le composant
          Top10 reste le même (filtres internes), mais on le positionne
          comme "ressource d'apprentissage" et plus comme un classement
          standalone — meilleure cohérence narrative.
         ────────────────────────────────────────────────────────────────── */}
      <section aria-labelledby="cat-apprendre">
        <CategoryHeader
          Icon={Lightbulb}
          eyebrow="Étape 3"
          title="Apprendre la crypto"
          intro="Les cryptos qui comptent, expliquées simplement, et nos guides pour ne pas faire les erreurs classiques de débutant."
          ctaHref="/cryptos"
          ctaLabel="Toutes les cryptos"
        />
        <h2 id="cat-apprendre" className="sr-only">
          Apprendre la crypto
        </h2>
        <Top10CryptosSection />
        <BlogPreview />
      </section>

      <CategoryDivider />

      {/* ──────────────────────────────────────────────────────────────────
          CATÉGORIE 4 — OUTILS & MARCHÉ
          Tableau de marché + outils gratuits regroupés. Le marché live
          est désormais positionné en "ressource pratique" (et non comme
          un mur de données en milieu de page).
         ────────────────────────────────────────────────────────────────── */}
      <section aria-labelledby="cat-outils">
        <CategoryHeader
          Icon={Wrench}
          eyebrow="Étape 4"
          title="Outils & marché live"
          intro="Calculateurs, simulateurs, convertisseur, et le tableau des prix — tout est gratuit, sans inscription."
          ctaHref="/outils"
          ctaLabel="Tous les outils"
        />
        <h2 id="cat-outils" className="sr-only">
          Outils et marché
        </h2>
        <ToolsTeaser />
        <MarketTable limit={10} />
      </section>

      <CategoryDivider />

      {/* ──────────────────────────────────────────────────────────────────
          CATÉGORIE 5 — RESTER INFORMÉ
          Newsletter + rappel actualités. Ferme la page par un CTA
          d'engagement long-terme plutôt que par une accumulation de
          contenu — meilleure conversion newsletter en bas de funnel.

          Note 26/04/2026 : HiddenGemsSection retirée de la home (jugée
          trop bruyante pour un débutant). Reste accessible via /cryptos.
          WhyTrustUs retiré de la home également : redondant avec
          ReassuranceSection juste après le Hero.
         ────────────────────────────────────────────────────────────────── */}
      <section aria-labelledby="cat-informe">
        <CategoryHeader
          Icon={Newspaper}
          eyebrow="Étape 5"
          title="Rester informé"
          intro="Une newsletter par semaine — les actus crypto FR qui comptent vraiment, sans hype ni shilling."
        />
        <h2 id="cat-informe" className="sr-only">
          Rester informé
        </h2>
        <NewsletterCapture />
      </section>
    </>
  );
}
