import type { MetadataRoute } from "next";
import { getAllArticleSummaries } from "@/lib/mdx";
import { BRAND } from "@/lib/brand";
import { getAllProgrammaticRoutes } from "@/lib/programmatic";
import { getAllAuthors } from "@/lib/authors";
import { TOP_PAIRS } from "@/lib/historical-prices";
import { GLOSSARY_TERMS } from "@/lib/glossary";
import { ALL_LISTICLES } from "@/lib/listicles";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || BRAND.url;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  /* ----------------------------------------------------------------
   * 1. Routes statiques éditoriales
   * ---------------------------------------------------------------- */
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}/`, lastModified: now, changeFrequency: "daily", priority: 1 },
    { url: `${SITE_URL}/blog`, lastModified: now, changeFrequency: "weekly", priority: 0.8 },
    { url: `${SITE_URL}/actualites`, lastModified: now, changeFrequency: "daily", priority: 0.8 },
    { url: `${SITE_URL}/calendrier-crypto`, lastModified: now, changeFrequency: "weekly", priority: 0.7 },
    { url: `${SITE_URL}/outils`, lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    { url: `${SITE_URL}/outils/simulateur-dca`, lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    { url: `${SITE_URL}/outils/convertisseur`, lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    // P1 #1 roadmap : LE outil viral (Cryptoast top 3 Google sur "fiscalité crypto").
    // Priority 0.85 supérieur aux autres outils car lead magnet principal.
    { url: `${SITE_URL}/outils/calculateur-fiscalite`, lastModified: now, changeFrequency: "monthly", priority: 0.85 },
    // Vérificateur MiCA : trafic stratégique sur "plateforme MiCA conforme" + redirige vers /comparatif.
    { url: `${SITE_URL}/outils/verificateur-mica`, lastModified: now, changeFrequency: "weekly", priority: 0.75 },
    // Whitepaper TL;DR : outil expérimental, priorité standard.
    { url: `${SITE_URL}/outils/whitepaper-tldr`, lastModified: now, changeFrequency: "monthly", priority: 0.6 },
    { url: `${SITE_URL}/partenariats`, lastModified: now, changeFrequency: "monthly", priority: 0.5 },
    // Pages business / monétisation (M+4-6 plan 2026)
    { url: `${SITE_URL}/pro`, lastModified: now, changeFrequency: "weekly", priority: 0.85 },
    { url: `${SITE_URL}/ambassadeurs`, lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    { url: `${SITE_URL}/sponsoring`, lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    { url: `${SITE_URL}/contact`, lastModified: now, changeFrequency: "monthly", priority: 0.5 },
    { url: `${SITE_URL}/methodologie`, lastModified: now, changeFrequency: "monthly", priority: 0.5 },
    { url: `${SITE_URL}/a-propos`, lastModified: now, changeFrequency: "monthly", priority: 0.6 },
    { url: `${SITE_URL}/affiliations`, lastModified: now, changeFrequency: "monthly", priority: 0.4 },
    { url: `${SITE_URL}/mentions-legales`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
    { url: `${SITE_URL}/confidentialite`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
    { url: `${SITE_URL}/top`, lastModified: now, changeFrequency: "weekly", priority: 0.7 },
    { url: `${SITE_URL}/staking`, lastModified: now, changeFrequency: "weekly", priority: 0.7 },
    { url: `${SITE_URL}/glossaire`, lastModified: now, changeFrequency: "monthly", priority: 0.6 },
    // Hubs (P0-5) — pages-mère qui regroupent les sous-routes existantes.
    { url: `${SITE_URL}/avis`, lastModified: now, changeFrequency: "weekly", priority: 0.85 },
    { url: `${SITE_URL}/comparatif`, lastModified: now, changeFrequency: "weekly", priority: 0.85 },
    { url: `${SITE_URL}/marche`, lastModified: now, changeFrequency: "daily", priority: 0.8 },
    { url: `${SITE_URL}/quiz`, lastModified: now, changeFrequency: "monthly", priority: 0.75 },
    { url: `${SITE_URL}/marche/heatmap`, lastModified: now, changeFrequency: "daily", priority: 0.7 },
    { url: `${SITE_URL}/marche/fear-greed`, lastModified: now, changeFrequency: "daily", priority: 0.6 },
    { url: `${SITE_URL}/marche/gainers-losers`, lastModified: now, changeFrequency: "daily", priority: 0.6 },
    { url: `${SITE_URL}/halving-bitcoin`, lastModified: now, changeFrequency: "weekly", priority: 0.65 },
    { url: `${SITE_URL}/quiz/plateforme`, lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    { url: `${SITE_URL}/quiz/crypto`, lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    { url: `${SITE_URL}/cryptos`, lastModified: now, changeFrequency: "weekly", priority: 0.7 },
    { url: `${SITE_URL}/wizard/premier-achat`, lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    // Alertes prix par email — page outil, à indexer (potentiel "alerte prix bitcoin", etc.)
    { url: `${SITE_URL}/alertes`, lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    // Académie : page indexable, mise à jour ~hebdomadaire (ajout de leçons V2+)
    { url: `${SITE_URL}/academie`, lastModified: now, changeFrequency: "weekly", priority: 0.8 },
    // Portefeuille : noindex côté metadata (page perso) mais on l'inclut pour
    // la découvrabilité interne / surface PageRank côté footer
    { url: `${SITE_URL}/portefeuille`, lastModified: now, changeFrequency: "monthly", priority: 0.5 },
  ];

  /* ----------------------------------------------------------------
   * 1bis. Top X listicles
   * ---------------------------------------------------------------- */
  const listicleRoutes: MetadataRoute.Sitemap = ALL_LISTICLES.map((l) => ({
    url: `${SITE_URL}/top/${l.slug}`,
    lastModified: now,
    changeFrequency: "weekly" as const,
    priority: 0.75,
  }));

  /* ----------------------------------------------------------------
   * 1ter. Glossaire (pages individuelles)
   * ---------------------------------------------------------------- */
  const glossaryRoutes: MetadataRoute.Sitemap = GLOSSARY_TERMS.map((t) => ({
    url: `${SITE_URL}/glossaire/${t.id}`,
    lastModified: now,
    changeFrequency: "monthly" as const,
    priority: 0.5,
  }));

  /* ----------------------------------------------------------------
   * 2. Articles de blog
   * ---------------------------------------------------------------- */
  const articles = await getAllArticleSummaries();
  const articleRoutes: MetadataRoute.Sitemap = articles.map((a) => ({
    url: `${SITE_URL}/blog/${a.slug}`,
    lastModified: new Date(a.lastUpdated ?? a.date),
    changeFrequency: "monthly" as const,
    priority: 0.6,
  }));

  /* ----------------------------------------------------------------
   * 2bis. Pages auteur (E-E-A-T)
   * ---------------------------------------------------------------- */
  const authorRoutes: MetadataRoute.Sitemap = getAllAuthors().map((a) => ({
    url: `${SITE_URL}/auteur/${a.id}`,
    lastModified: now,
    changeFrequency: "monthly" as const,
    priority: 0.5,
  }));

  /* ----------------------------------------------------------------
   * 3. Routes programmatiques
   *    /avis/[slug], /comparatif/[slug], /cryptos/[slug],
   *    /cryptos/[slug]/acheter-en-france, /staking/[slug]
   *    Source unique de vérité : lib/programmatic.ts
   * ---------------------------------------------------------------- */
  const programmaticRoutes: MetadataRoute.Sitemap = getAllProgrammaticRoutes().map((r) => ({
    url: `${SITE_URL}${r.path}`,
    lastModified: now,
    changeFrequency: r.changeFrequency,
    priority: r.priority,
  }));

  /* ----------------------------------------------------------------
   * 4. Pages convertisseur SEO programmatic (top 30 pairs)
   * ---------------------------------------------------------------- */
  const converterPairRoutes: MetadataRoute.Sitemap = TOP_PAIRS.map(({ from, to }) => ({
    url: `${SITE_URL}/convertisseur/${from}-${to}`,
    lastModified: now,
    changeFrequency: "daily" as const,
    priority: 0.5,
  }));

  return [
    ...staticRoutes,
    ...listicleRoutes,
    ...glossaryRoutes,
    ...articleRoutes,
    ...authorRoutes,
    ...programmaticRoutes,
    ...converterPairRoutes,
  ];
}
