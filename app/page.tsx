// Refonte 26/04/2026 - 3-5 catégories pour réduire la charge cognitive utilisateur (feedback : "tout est trop sur le home page")
import type { Metadata } from "next";
import dynamic from "next/dynamic";
import Link from "next/link";
import {
  ArrowRight,
  Coins,
  GraduationCap,
  Mail,
  Newspaper,
  Target,
  Wrench,
} from "lucide-react";

import { fetchTopMarket, type CoinId, type CoinPrice } from "@/lib/coingecko";
import GlobalMetricsBar from "@/components/GlobalMetricsBar";
import Hero from "@/components/Hero";
// PriceTicker retiré BATCH 35d (user "enlève ça") — doublon avec MarketTable + /marche
import ReassuranceSection from "@/components/ReassuranceSection";
// BATCH 41a — wire Reveal scroll fade-up sur sections home (composant
// existait mais jamais utilisé). Pattern Anthropic/Linear : sections
// apparaissent en fade-up quand 15% visible viewport.
import Reveal from "@/components/ui/Reveal";
// BATCH 41b — bandeau régulateurs/sources qui défilent (Stripe Press
// pattern). Comble la zone morte entre Hero et Reassurance.
import TrustMarquee from "@/components/TrustMarquee";
// MarketTable retiré BATCH 36 (audit Bug Hunter : import inutilisé, jamais rendu)
// BeginnerJourney retiré 30/05/2026 (feedback Kev « range la home ») — doublon
// du parcours « Débutant » de l'Académie. Remplacé par AcademyHomeTeaser, qui
// pointe vers /academie. Composant conservé dans components/ pour réutilisation.
import AcademyHomeTeaser from "@/components/AcademyHomeTeaser";
import StartHere from "@/components/StartHere";
import Top10CryptosSection from "@/components/Top10CryptosSection";
import PlatformsSection from "@/components/PlatformsSection";
// BATCH 26 — PlatformsMarquee retiré de la home (doublon). Composant
// conservé dans components/ pour réutilisation future ailleurs.
import BlogPreview from "@/components/BlogPreview";
import ToolsTeaser from "@/components/ToolsTeaser";
// NewsTickerServer retiré le 26/04 (doublon avec NewsBar — feedback user "mal agencé")
import QuizPromo from "@/components/QuizPromo";
// NewsBar retiré BATCH 35d (user "enlève ça") — doublon avec /actualites + CryptoNewsAggregator par fiche
import TodaysNewsAndEvents from "@/components/TodaysNewsAndEvents";
import NextStepsGuide from "@/components/NextStepsGuide";
import StructuredData from "@/components/StructuredData";

// PERF PHASE 2 — 2026-05-09 — lazy-load des composants client UNIQUEMENT
// rendus sous le fold ou off-screen (mobile/scrolled). Aucun impact SEO :
//  - HomeAnchorNav : chips de nav sticky, JS-only (le scroll-spy + le
//    rendu visuel des chips arrivent après hydration, pas dans le SSR).
//  - NewsletterCapture : tout en bas de page, hors viewport initial.
//  - StickyMobileCta : barre mobile-only qui n'apparaît qu'après >400 px
//    de scroll, jamais dans le viewport initial.
//  - TrustMarquee : bandeau marquee CSS-driven, visuel uniquement.
// Gain estimé : ~30-50 KB JS retiré du first-load chunk + ~15-25 KB de
// RSC payload (les "use client" sortent du flight stream initial).
const HomeAnchorNav = dynamic(() => import("@/components/HomeAnchorNav"), {
  ssr: false,
  loading: () => null,
});
const NewsletterCapture = dynamic(() => import("@/components/NewsletterCapture"), {
  ssr: false,
  loading: () => (
    <div
      aria-hidden="true"
      className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8"
      style={{ minHeight: 320 }}
    />
  ),
});
const StickyMobileCta = dynamic(() => import("@/components/StickyMobileCta"), {
  ssr: false,
  loading: () => null,
});
import { BRAND } from "@/lib/brand";
import { withHreflang } from "@/lib/seo-alternates";
import {
  graphSchema,
  topPlatformsItemListSchema,
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
  // Fix audit SEO 30/04/2026 — avant : pas de `title` exporté ici → la home
  // utilisait le `default` du root layout (« Cryptoreflex — Comparatifs,
  // guides et outils crypto », 51 chars, aucun keyword "France" ni "MiCA").
  // Maintenant : title explicite ciblé sur la requête principale.
  // BATCH 23 SEO P0 #2 — title raccourci à 56 chars (avant 80 chars).
  title: "Crypto France 2026 — 780 cryptos, MiCA, outils IA",
  // BATCH 36 — fix audit SEO P0 : meta description ramenée à 155 chars (avant
  // 289 = tronquée en SERP). Action verb + différenciateur + CTA implicite.
  description:
    "Compare 34 plateformes MiCA, analyse 780 cryptos (score fiabilité), calculez votre fiscalité PFU. 28 outils crypto, méthodologie publique.",
  alternates: withHreflang(BRAND.url),
  openGraph: {
    url: BRAND.url,
    title: "Crypto France 2026 — 780 cryptos, MiCA, outils IA",
    description:
      "L'écosystème crypto français : 34 plateformes MiCA, 780 cryptos analysées, 28 outils (PFU, DCA, fiscalité). Méthode publique.",
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: "Cryptoreflex — Écosystème crypto France 2026",
      },
    ],
  },
  twitter: {
    title: "Crypto France 2026 — 780 cryptos, MiCA, outils IA",
    description:
      "L'écosystème crypto français : 34 plateformes MiCA, 780 cryptos analysées, 28 outils (PFU, DCA, fiscalité).",
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
  variant = "primary",
}: {
  Icon: typeof Target;
  eyebrow: string;
  title: string;
  intro: string;
  ctaHref?: string;
  ctaLabel?: string;
  /** ID porté par le H2 visible (sert d'ancre pour HomeAnchorNav + aria-labelledby). */
  anchorId: string;
  /**
   * Hiérarchie visuelle (audit home 2026-06) :
   *  - "primary"   : section forte (Comparer / Explorer) — H2 large.
   *  - "secondary" : section d'appui (Académie / Outils / Actu / Newsletter) —
   *    H2 plus discret + intro atténuée. Crée 2 niveaux sans refonte graphique.
   */
  variant?: "primary" | "secondary";
}) {
  const isSecondary = variant === "secondary";
  return (
    <header
      className={`mx-auto max-w-7xl px-4 pb-2 sm:px-6 lg:px-8 ${
        isSecondary ? "pt-12 sm:pt-14" : "pt-16 sm:pt-20"
      }`}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="max-w-2xl">
          <span className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary-glow">
            <Icon className="h-3.5 w-3.5" aria-hidden="true" />
            {eyebrow}
          </span>
          <h2
            id={anchorId}
            className={`mt-4 font-extrabold tracking-tight ${
              isSecondary
                ? "text-2xl text-fg/90 sm:text-3xl"
                : "text-3xl sm:text-4xl"
            }`}
          >
            {title}
          </h2>
          <p
            className={`mt-3 ${
              isSecondary
                ? "text-sm text-fg/60 sm:text-base"
                : "text-base text-fg/70 sm:text-lg"
            }`}
          >
            {intro}
          </p>
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
   * BATCH 36 — fix Schema dedup (audit SEO P0) : Organization + WebSite
   * étaient injectés 2× (1× dans layout id="global-graph", 1× ici dans
   * id="home-graph"). graphSchema dedup par @id DANS son array mais pas
   * entre 2 <script> JSON-LD séparés. Risque : Google parse 2 entités
   * concurrentes. Solution : layout = source unique pour Org+WebSite,
   * page home rend uniquement les schemas spécifiques (ItemList).
   * BreadcrumbList minimal 1 item retiré aussi (Google ignore 1-item).
   */
  const homeSchema = graphSchema([
    topPlatformsItemListSchema(6),
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
      {/* BATCH 41b — TrustMarquee : bandeau régulateurs qui défilent
          slowly entre Hero et Reassurance. Comble la zone morte narrative
          + signal "ces 8 sources nous surveillent". Pause au hover. */}
      <TrustMarquee />
      {/* BATCH 41a — Reveal scroll fade-up sur ReassuranceSection (et
          toutes les sections suivantes via Reveal wrapper). Anim subtle :
          opacity 0→1 + translate Y 24px→0, easing emphasized 700ms,
          déclenchée à 15% viewport. prefers-reduced-motion bypass via
          CSS .reveal class (cf. Reveal.tsx + globals.css). */}
      <Reveal>
        <ReassuranceSection />
      </Reveal>
      {/* BATCH 35d — user feedback "enlève ça" sur NewsBar + PriceTicker.
          On garde uniquement GlobalMetricsBar (Market Cap + F&G + dominance)
          qui apporte de la donnée live unique sans répéter ce qui est déjà
          ailleurs (le PriceTicker doublonne avec MarketTable + page /marche
          + le PairConverter sur les fiches crypto ; la NewsBar doublonne
          avec /actualites + le CryptoNewsAggregator par fiche).
          Garde la classe live-market-strip pour conserver le scan line gold. */}
      <aside
        aria-label="Indicateurs de marché crypto"
        className="live-market-strip border-y border-border/50 bg-elevated/20 [&_section]:border-0 [&_section]:bg-transparent"
      >
        <GlobalMetricsBar />
      </aside>

      {/* Sticky in-page nav (chips type onglets) — feedback utilisateur
          26/04/2026 "des onglets pour faire respirer + pas se perdre".
          Permet au visiteur de scroll-to-section direct vs scroller 5 viewports. */}
      <HomeAnchorNav />

      {/* ──────────────────────────────────────────────────────────────────
          ROUTEUR D'INTENTION — « Par où commencer ? » (audit home 2026-06)
          Diagnostic : hiérarchie plate (toutes les sections au même poids).
          Fix : 3 portes (apprendre / comparer / comprendre) EN TÊTE, puis
          hiérarchie à 2 niveaux — Comparer + Explorer en PRIMAIRE, le reste
          (Académie / Outils / Actu / Newsletter) en SECONDAIRE. Server
          Component pur (0 JS) pour protéger le LCP.
         ────────────────────────────────────────────────────────────────── */}
      <StartHere />

      <CategoryDivider />

      {/* ──────────────────────────────────────────────────────────────────
          CATÉGORIE 1 (PRIMAIRE) — COMPARER LES PLATEFORMES
          Cible principale de conversion affiliation. PlatformsSection a déjà
          son propre header interne + CTAs (pas de CategoryHeader ici). */}
      <section id="cat-comparer" aria-label="Comparer les plateformes crypto régulées MiCA">
        <Reveal>
          <PlatformsSection />
        </Reveal>
      </section>

      <CategoryDivider />

      {/* ──────────────────────────────────────────────────────────────────
          CATÉGORIE 2 (PRIMAIRE) — EXPLORER (catalogue cryptos + derniers guides)
         ────────────────────────────────────────────────────────────────── */}
      <section aria-labelledby="cat-cryptos">
        <CategoryHeader
          variant="primary"
          Icon={Coins}
          eyebrow="Explorer"
          title="780 cryptos analysées"
          intro="Le top 10 expliqué simplement, 90 hidden gems avec score de fiabilité et 680 fiches exploratoires. Chaque fiche : à quoi ça sert, les risques, les sources — sans hype."
          ctaHref="/cryptos"
          ctaLabel="Voir les 780 cryptos"
          anchorId="cat-cryptos"
        />
        <Reveal>
          <Top10CryptosSection />
        </Reveal>
        <Reveal delay={120}>
          <BlogPreview />
        </Reveal>
      </section>

      <CategoryDivider />

      {/* ──────────────────────────────────────────────────────────────────
          CATÉGORIE 3 (SECONDAIRE) — ACADÉMIE (teaser uniquement, pas un chantier)
          L'Académie vit dans /academie ; la home n'en garde qu'un teaser + CTA.
         ────────────────────────────────────────────────────────────────── */}
      <section aria-labelledby="cat-academie">
        <CategoryHeader
          variant="secondary"
          Icon={GraduationCap}
          eyebrow="Académie · 100% gratuit"
          title="Apprends la crypto, de zéro à autonome"
          intro="Des parcours structurés — concepts, sécurité, fiscalité française, DeFi — avec quiz de validation. Progression sauvegardée, sans compte ni paywall."
          ctaHref="/academie"
          ctaLabel="Découvrir l'académie"
          anchorId="cat-academie"
        />
        <Reveal>
          <AcademyHomeTeaser />
        </Reveal>
      </section>

      <CategoryDivider />

      {/* ──────────────────────────────────────────────────────────────────
          CATÉGORIE 4 (SECONDAIRE) — OUTILS
         ────────────────────────────────────────────────────────────────── */}
      <section aria-labelledby="cat-outils">
        <CategoryHeader
          variant="secondary"
          Icon={Wrench}
          eyebrow="Outils crypto"
          title="Outils"
          intro="Calculateurs, simulateurs, convertisseur — gratuits, sans inscription ni email demandé."
          ctaHref="/outils"
          ctaLabel="Tous les outils"
          anchorId="cat-outils"
        />
        <Reveal>
          <ToolsTeaser />
        </Reveal>
        <Reveal delay={120}>
          <QuizPromo />
        </Reveal>
      </section>

      <CategoryDivider />

      {/* ──────────────────────────────────────────────────────────────────
          CATÉGORIE 5 (SECONDAIRE) — ACTUALITÉS & CALENDRIER (déplacée plus bas :
          secondaire pour un 1er visiteur, vit en page dédiée /actualites).
         ────────────────────────────────────────────────────────────────── */}
      <section aria-labelledby="cat-actu">
        <CategoryHeader
          variant="secondary"
          Icon={Newspaper}
          eyebrow="Live & frais"
          title="Actualités & calendrier"
          intro="Les news crypto qui comptent vraiment + les events à ne pas rater (halvings, FOMC, ETF deadlines)."
          anchorId="cat-actu"
        />
        <TodaysNewsAndEvents />
      </section>

      <CategoryDivider />

      {/* ──────────────────────────────────────────────────────────────────
          CATÉGORIE 6 (SECONDAIRE) — RESTER INFORMÉ (clôture engagement)
         ────────────────────────────────────────────────────────────────── */}
      <section aria-labelledby="cat-informe">
        <CategoryHeader
          variant="secondary"
          Icon={Mail}
          eyebrow="Newsletter"
          title="Rester informé"
          intro="Le brief crypto FR du matin, en 3 minutes — les actus qui comptent vraiment, sans hype ni shilling."
          anchorId="cat-informe"
        />
        <Reveal>
          <NewsletterCapture />
        </Reveal>
      </section>

      {/* Ressources finales — rôle DISTINCT du routeur d'intention en tête :
          StartHere route par persona (apprendre/comparer/comprendre) ; ici on
          ne re-route pas, on propose les ressources à emporter (PDF, calculateur,
          newsletter). Cf. selectSteps() case "homepage" dans NextStepsGuide. */}
      <NextStepsGuide
        context="homepage"
        title="Avant de partir, garde ça sous la main"
        intro="Les ressources les plus utiles pour aller plus loin — à ton rythme."
      />

      {/* StickyMobileCta — barre CTA flottante mobile au-dessus de
          MobileBottomNav. Audit Block 1 RE-AUDIT (Conversion + Mobile P1) :
          le pouce vit dans la zone "easy" Hoober, +15-22% CTR estimé. Visible
          <lg uniquement, après scroll>400px, disparaît quand on entre dans
          #cat-comparer pour éviter doublon. Dismissible (sessionStorage). */}
      <StickyMobileCta />
    </>
  );
}
