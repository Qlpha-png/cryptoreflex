import type { Metadata } from "next";

import { fetchPrices, fetchTopMarket } from "@/lib/coingecko";
import GlobalMetricsBar from "@/components/GlobalMetricsBar";
import Hero from "@/components/Hero";
import PriceTicker from "@/components/PriceTicker";
import ReassuranceSection from "@/components/ReassuranceSection";
import WhyTrustUs from "@/components/WhyTrustUs";
import NewsletterCapture from "@/components/NewsletterCapture";
import MarketTable from "@/components/MarketTable";
import BeginnerJourney from "@/components/BeginnerJourney";
import Top10CryptosSection from "@/components/Top10CryptosSection";
import HiddenGemsSection from "@/components/HiddenGemsSection";
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
/**
 * Description home — surcharge le fallback générique de layout.tsx.
 *
 * Format optimisé SERP (≤ 160 chars + keywords primaires + CTA implicite) :
 *  - "comparateur" + "crypto" + "France" → query intent matching
 *  - "MiCA" + "AMF" → trust signal + filter MiCA-aware audience
 *  - "guides + outils gratuits" → value prop scanable
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
   *
   * Pourquoi `topPlatformsItemListSchema` sur la home ?
   * Audit SEO Cryptoreflex 2026-04 : la fonction existait dans lib/schema.ts
   * mais n'était jamais injectée. Google peut désormais afficher un Carousel
   * "Top plateformes crypto" directement dans les SERP, taggé avec aggregateRating
   * pour chaque plateforme — gros boost CTR sur la requête "meilleur exchange crypto".
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

      {/* 1. Données globales du marché — contexte instantané */}
      <GlobalMetricsBar />

      {/* 1bis. Bandeau news externes (RSS FR, top 3) — densifie la perception
              "site vivant" sans impacter le LCP du Hero (statique, no JS,
              quelques px de hauteur). */}
      <NewsBar />

      {/* 2. Ticker des prix live */}
      <PriceTicker initial={prices} />

      {/* 2bis. News ticker — 5 derniers articles (densifie la perception "site vivant").
              Placé après PriceTicker / avant Hero pour stacker avec les bandeaux
              déjà fins au-dessus du Hero, sans impacter le LCP du Hero (qui
              tient le H1 et l'image principale). */}
      <NewsTickerServer />

      {/* 3. Hero — promesse + 1 CTA fort + live widget BTC/ETH/SOL */}
      <Hero
        prices={prices}
        sparklines={heroSparklines}
        updatedAt={updatedAt}
      />

      {/* 4. Réassurance bandeau (métriques, régulateurs, presse) */}
      <ReassuranceSection />

      {/* 5. Pourquoi nous croire — 3 cartes détaillables */}
      <WhyTrustUs />

      {/* 6. Newsletter — placée après la wave de réassurance pour maximiser le opt-in */}
      <NewsletterCapture />

      {/* 7. Tableau des marchés */}
      <MarketTable limit={20} />

      {/* 8. Parcours débutant — capture les visiteurs qui ne savent pas par où commencer */}
      <BeginnerJourney />

      {/* 9. Top 10 cryptos */}
      <Top10CryptosSection />

      {/* 10. Plateformes (cible principale de conversion affiliation) */}
      <PlatformsSection />

      {/* 11. Hidden gems */}
      <HiddenGemsSection />

      {/* 12. Aperçu blog */}
      <BlogPreview />

      {/* 13. Teaser outils */}
      <ToolsTeaser />

      {/* 14. Footer rendu par le layout */}
    </>
  );
}
