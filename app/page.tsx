/**
 * Accueil — refonte du 05/10/2026 (Kev, 04/10 : « un accueil propre, joli et simple, qui redirige proprement et
 * facilement, qu'un enfant de 8 ans trouve toutes les informations qu'il souhaite, tout bien rangé et automatisé »).
 *
 * Mesuré avant : 22 écrans sur téléphone, 17 sur ordinateur, 14 blocs, « newsletter » ×7.
 * Maintenant, dans l'ordre : bandeau marché en direct → promesse (Hero, la courbe du Bitcoin) → « Que voulez-vous
 * faire ? » (4 portes) → le marché aujourd'hui (cours en direct + 3 actus) → confiance en une ligne → newsletter,
 * une seule fois. Chiffres : STATS (data/site-counts.json, recalculé automatiquement). Retirés de l'accueil (rien
 * n'est supprimé du dépôt) : défilé des régulateurs, grande réassurance, onglets d'ancres, grandes cartes top 10,
 * carrousel du blog, grille académie, doublons outils et quiz, « Avant de partir », bouton collant mobile.
 */
import { avecTypo } from "@/components/ui/Typo";
import type { Metadata } from "next";
import dynamic from "next/dynamic";

import { fetchTopMarket, fetchGlobalMetrics, fetchFearGreed, type CoinId, type CoinPrice } from "@/lib/coingecko";
import TickerTape, { type TickerCoin } from "@/components/TickerTape";
import Hero from "@/components/Hero";
import HomeDoors from "@/components/home/HomeDoors";
import HomeMarketToday from "@/components/home/HomeMarketToday";
import HomeTrustLine from "@/components/home/HomeTrustLine";
import { detectMarketSource } from "@/components/home/market-source";
import StructuredData from "@/components/StructuredData";
import { BRAND, STATS } from "@/lib/brand";
import { withHreflang } from "@/lib/seo-alternates";
import { graphSchema, topPlatformsItemListSchema } from "@/lib/schema";

// Formulaire en bas de page, hors de l'écran initial : chargé après coup (aucun impact SEO).
const NewsletterCapture = dynamic(() => import("@/components/NewsletterCapture"), {
  ssr: false,
  loading: () => <div aria-hidden="true" className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8" style={{ minHeight: 320 }} />,
});

// Prix du bandeau et des 5 cours : rafraîchis côté navigateur (useLivePrices) ; le HTML peut dater d'une heure.
export const revalidate = 3600;

const TITLE = "Crypto France : plateformes, fiches et impôts | Cryptoreflex";
const DESCRIPTION = `Comparez les ${STATS.platforms} plateformes autorisées en France, ${STATS.cryptos.toLocaleString("fr-FR")} fiches crypto, calcul de l'impôt et formulaire 2086, jeu de cartes. Gratuit, méthode publique.`;

export const metadata: Metadata = {
  title: { absolute: TITLE },
  description: DESCRIPTION,
  alternates: withHreflang(BRAND.url),
  openGraph: {
    url: BRAND.url,
    title: TITLE,
    description: DESCRIPTION,
    images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: "Cryptoreflex — la crypto en France, simple et vérifiée" }],
  },
  twitter: { title: TITLE, description: DESCRIPTION },
};

async function HomePage() {
  // Un seul appel « top 20 » sert au bandeau, à la courbe du Hero et aux 5 cours (quota CoinGecko).
  const [market, globalMetrics, fearGreed] = await Promise.all([fetchTopMarket(20), fetchGlobalMetrics(), fetchFearGreed()]);
  const tickerCoins: TickerCoin[] = market.slice(0, 8).map((m) => ({
    id: m.id,
    symbol: m.symbol,
    name: m.name,
    image: m.image,
    price: m.currentPrice,
    change24h: m.priceChange24h,
  }));
  const prices: CoinPrice[] = market.slice(0, 6).map((m) => ({
    id: m.id as CoinId,
    symbol: m.symbol,
    name: m.name,
    price: m.currentPrice,
    change24h: m.priceChange24h,
    marketCap: m.marketCap,
    image: m.image,
  }));
  const heroSparklines: Record<string, number[]> = {};
  for (const c of market) {
    if (c.id === "bitcoin" || c.id === "ethereum" || c.id === "solana") heroSparklines[c.id] = c.sparkline7d ?? [];
  }

  // Source réelle des cours, LUE dans le champ `sources` de chaque ligne (CoinMarketCap, CoinGecko, places de
  // marché…) avec l'heure du relevé : attribution affichée à côté des prix (06/10/2026).
  const priceSource = detectMarketSource(market);

  // Données structurées : les 3 plateformes affichées dans la porte « Acheter » (autorisées en France uniquement).
  const homeSchema = graphSchema([topPlatformsItemListSchema(3)]);

  return (
    <>
      <StructuredData data={homeSchema} id="home-graph" />
      <TickerTape
        coins={tickerCoins}
        globalMetrics={
          globalMetrics
            ? { mcapUsd: globalMetrics.totalMarketCapUsd, mcapChange24h: globalMetrics.marketCapChange24h, btcDominance: globalMetrics.btcDominance }
            : null
        }
        fearGreed={fearGreed ? { value: fearGreed.value, label: fearGreed.classification, source: fearGreed.source ?? null, date: fearGreed.timestamp } : null}
        priceSource={priceSource}
      />
      {/* Heure RÉELLE du relevé servi (Data Cache), pas l'heure du rendu : un dernier relevé ancien n'est pas « en direct ». */}
      <Hero prices={prices} sparklines={heroSparklines} updatedAt={market[0]?.asOf} fearGreed={fearGreed?.value ?? null} />
      <HomeDoors />
      <HomeMarketToday market={market} priceSource={priceSource} />
      <HomeTrustLine />
      {/* une seule newsletter sur l'accueil (le formulaire porte son titre et l'ancre #newsletter) */}
      <NewsletterCapture />
    </>
  );
}

export default avecTypo(HomePage);
