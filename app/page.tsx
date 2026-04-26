// Refonte 26/04/2026 - 3-5 catégories pour réduire la charge cognitive utilisateur (feedback : "tout est trop sur le home page")
import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  Lightbulb,
  Mail,
  Newspaper,
  Target,
  Wrench,
} from "lucide-react";

import { fetchTopMarket, type CoinId, type CoinPrice } from "@/lib/coingecko";
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
import QuizPromo from "@/components/QuizPromo";
import NewsBar from "@/components/NewsBar";
import TodaysNewsAndEvents from "@/components/TodaysNewsAndEvents";
import HomeAnchorNav from "@/components/HomeAnchorNav";
import NextStepsGuide from "@/components/NextStepsGuide";
import StickyMobileCta from "@/components/StickyMobileCta";
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
 *
 * Audit Block 1 RE-AUDIT 26/04/2026 (Agents SEO + A11y, P0 convergence) :
 *  - Avant : id="cat-X" sur la section + un second `<h2 sr-only>` doublon
 *    avec le même texte = NVDA/JAWS lit le titre 2 fois au rotor + saut Hn.
 *  - Fix : id="cat-X" porté DIRECTEMENT par le H2 visible. Les wrappers
 *    `<section aria-labelledby="cat-X">` pointent maintenant correctement
 *    sur le H2 visible (un seul H2 par catégorie, hiérarchie propre).
 */
function CategoryHeader({
  Icon,
  eyebrow,
  title,
  intro,
  ctaHref,
  ctaLabel,
  anchorId,
}: {
  Icon: typeof Target;
  eyebrow: string;
  title: string;
  intro: string;
  ctaHref?: string;
  ctaLabel?: string;
  /** ID porté par le H2 visible (sert d'ancre pour HomeAnchorNav + aria-labelledby). */
  anchorId: string;
}) {
  return (
    <header className="mx-auto max-w-7xl px-4 pb-2 pt-16 sm:px-6 sm:pt-20 lg:px-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="max-w-2xl">
          <span className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary-glow">
            <Icon className="h-3.5 w-3.5" aria-hidden="true" />
            {eyebrow}
          </span>
          <h2
            id={anchorId}
            className="mt-4 text-3xl font-extrabold tracking-tight sm:text-4xl"
          >
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
  // Audit Block 1 RE-AUDIT 26/04/2026 (Agent back) :
  //  - Avant : `Promise.all([fetchPrices(), fetchTopMarket(20)])` =
  //    DOUBLON de quota CoinGecko free tier (30 req/min). fetchTopMarket(20)
  //    contient déjà BTC/ETH/SOL.
  //  - Fix : un seul fetch (top 20), on dérive prices = top 6 pour le ticker
  //    via mapping MarketCoin → CoinPrice (currentPrice → price, etc.).
  //    Économie -50% appels CG, -200ms TTFB cold-start.
  const market = await fetchTopMarket(20);
  const prices: CoinPrice[] = market.slice(0, 6).map((m) => ({
    id: m.id as CoinId,
    symbol: m.symbol,
    name: m.name,
    price: m.currentPrice,
    change24h: m.priceChange24h,
    marketCap: m.marketCap,
    image: m.image,
  }));

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
          Audit Block 1 RE-AUDIT 26/04/2026 (5 agents convergents : Performance,
          Visual, UX, Conversion, Mobile) : le Hero est rendu EN PREMIER pour
          maximiser le LCP (avant : 4 bandeaux empilés au-dessus repoussaient
          le H1 sous le fold mobile, ~340px de chrome avant la promesse).
          Les bandeaux (metrics / news / ticker) viennent APRÈS le Hero, comme
          ressources contextuelles. Réduit -300ms LCP p75 mobile estimé.
         ────────────────────────────────────────────────────────────────── */}
      <Hero
        prices={prices}
        sparklines={heroSparklines}
        updatedAt={updatedAt}
      />
      <ReassuranceSection />
      {/* Bandeaux live data — sous le Hero, en bordure haute des sections
          de contenu. Densifient la perception "site vivant" SANS bloquer
          le LCP du H1 ni écraser le pli mobile. */}
      <GlobalMetricsBar />
      <NewsBar />
      <PriceTicker initial={prices} />
      <NewsTickerServer />

      {/* Sticky in-page nav (chips type onglets) — feedback utilisateur
          26/04/2026 "des onglets pour faire respirer + pas se perdre".
          Permet au visiteur de scroll-to-section direct vs scroller 5 viewports. */}
      <HomeAnchorNav />

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
          anchorId="cat-demarrer"
        />
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
          anchorId="cat-comparer"
        />
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
          anchorId="cat-apprendre"
        />
        <Top10CryptosSection />
        <BlogPreview />
      </section>

      <CategoryDivider />

      {/* ──────────────────────────────────────────────────────────────────
          CATÉGORIE 4 — ACTUALITÉS & CALENDRIER (ajout 26/04/2026)
          Feedback utilisateur "les gens sont pas assez mis au courant des
          news journalières / événements calendrier". On expose les 3 news
          du jour + 3 events à venir, avec pulse rouge "À la une" + compteur
          "X publiées cette semaine" pour donner du dynamisme.
         ────────────────────────────────────────────────────────────────── */}
      <section aria-labelledby="cat-actu">
        <CategoryHeader
          Icon={Newspaper}
          eyebrow="Étape 4"
          title="Actualités & calendrier"
          intro="Les news crypto qui comptent vraiment + les events à ne pas rater (halvings, FOMC, ETF deadlines)."
          anchorId="cat-actu"
        />
        <TodaysNewsAndEvents />
      </section>

      <CategoryDivider />

      {/* ──────────────────────────────────────────────────────────────────
          CATÉGORIE 5 — OUTILS & MARCHÉ
          Tableau de marché + outils gratuits regroupés. Le marché live
          est désormais positionné en "ressource pratique" (et non comme
          un mur de données en milieu de page).
         ────────────────────────────────────────────────────────────────── */}
      <section aria-labelledby="cat-outils">
        <CategoryHeader
          Icon={Wrench}
          eyebrow="Étape 5"
          title="Outils"
          intro="Calculateurs, simulateurs, convertisseur — tout est gratuit, sans inscription, sans email demandé."
          ctaHref="/outils"
          ctaLabel="Tous les outils"
          anchorId="cat-outils"
        />
        <ToolsTeaser />
        {/* QuizPromo : ajout 26/04/2026 — feedback utilisateur "Le quizz et caché
            dur de le trouver il faut une catégorie". On le place dans la cat
            "Outils" car c'est un outil interactif d'aide à la décision. */}
        <QuizPromo />
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
          Icon={Mail}
          eyebrow="Étape 6"
          title="Rester informé"
          intro="Une newsletter par semaine — les actus crypto FR qui comptent vraiment, sans hype ni shilling."
          anchorId="cat-informe"
        />
        <NewsletterCapture />
      </section>

      {/* Guide "main tenue" — feedback utilisateur 26/04/2026 :
          "guider le trafic comme un enfant qu'on tient la main pour
          qu'il visite tout le site". 3 next steps contextuels. */}
      <NextStepsGuide context="homepage" />

      {/* StickyMobileCta — barre CTA flottante mobile au-dessus de
          MobileBottomNav. Audit Block 1 RE-AUDIT (Conversion + Mobile P1) :
          le pouce vit dans la zone "easy" Hoober, +15-22% CTR estimé. Visible
          <lg uniquement, après scroll>400px, disparaît quand on entre dans
          #cat-comparer pour éviter doublon. Dismissible (sessionStorage). */}
      <StickyMobileCta />
    </>
  );
}
