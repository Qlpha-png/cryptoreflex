import type { MetadataRoute } from "next";
import { getAllArticleSummaries } from "@/lib/mdx";
import { BRAND } from "@/lib/brand";
import { getAllProgrammaticRoutes } from "@/lib/programmatic";
import { getAllAuthors } from "@/lib/authors";
import { TOP_PAIRS } from "@/lib/historical-prices";
import { GLOSSARY_TERMS } from "@/lib/glossary";
import { ALL_LISTICLES } from "@/lib/listicles";
// Piliers V2 (26-04) : News auto, Analyses TA auto, Académie certifiante.
import { getAllNewsSummaries } from "@/lib/news-mdx";
import { getAllTASummaries } from "@/lib/ta-mdx";
import { TRACKS, getAllAcademyArticleSlugs } from "@/lib/academy-tracks";

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
    // NOTE — /calendrier-crypto (legacy) supprimé du sitemap : redirige 301
    // vers /calendrier (cf. next.config.js, audit SEO 26-04 CRIT-3).
    { url: `${SITE_URL}/outils`, lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    // Phase 3 / Agent A4 — page hub /ressources (lead magnets PDF + outils + blog).
    // Priority 0.7 (~ /outils) car page de conversion newsletter via lead magnet gating.
    { url: `${SITE_URL}/ressources`, lastModified: now, changeFrequency: "weekly", priority: 0.7 },
    { url: `${SITE_URL}/outils/simulateur-dca`, lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    { url: `${SITE_URL}/outils/convertisseur`, lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    // P1 #1 roadmap : LE outil viral (Cryptoast top 3 Google sur "fiscalité crypto").
    // Priority 0.85 supérieur aux autres outils car lead magnet principal.
    { url: `${SITE_URL}/outils/calculateur-fiscalite`, lastModified: now, changeFrequency: "monthly", priority: 0.85 },
    // Phase 3 / Agent A1 — page comparative outils fiscaux (Waltio recommandé).
    // Cluster fiscalité : co-positionnement avec /outils/calculateur-fiscalite.
    { url: `${SITE_URL}/outils/declaration-fiscale-crypto`, lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    // Vérificateur MiCA : trafic stratégique sur "plateforme MiCA conforme" + redirige vers /comparatif.
    { url: `${SITE_URL}/outils/verificateur-mica`, lastModified: now, changeFrequency: "weekly", priority: 0.75 },
    // Whitepaper TL;DR : outil expérimental, priorité standard.
    { url: `${SITE_URL}/outils/whitepaper-tldr`, lastModified: now, changeFrequency: "monthly", priority: 0.6 },
    // Pilier 5 (V2) — 3 nouveaux outils interactifs ajoutés le 26-04-2026.
    { url: `${SITE_URL}/outils/glossaire-crypto`, lastModified: now, changeFrequency: "weekly", priority: 0.7 },
    { url: `${SITE_URL}/outils/calculateur-roi-crypto`, lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: `${SITE_URL}/outils/portfolio-tracker`, lastModified: now, changeFrequency: "monthly", priority: 0.75 },
    // Pilier "Innovation features killer" (26-04-2026) — 3 outils différenciants
    // qui n'existent pas chez les concurrents FR (Cryptoast, JDC).
    { url: `${SITE_URL}/outils/calculateur-apy-staking`, lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    { url: `${SITE_URL}/outils/simulateur-halving-bitcoin`, lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    { url: `${SITE_URL}/outils/comparateur-personnalise`, lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    // Piliers V2 (26-04) : pages-mère pour News auto, Analyses TA auto, Calendrier événements.
    { url: `${SITE_URL}/analyses-techniques`, lastModified: now, changeFrequency: "daily", priority: 0.8 },
    { url: `${SITE_URL}/calendrier`, lastModified: now, changeFrequency: "weekly", priority: 0.7 },
    { url: `${SITE_URL}/partenariats`, lastModified: now, changeFrequency: "monthly", priority: 0.5 },
    // Pages business / monétisation (M+4-6 plan 2026)
    { url: `${SITE_URL}/pro`, lastModified: now, changeFrequency: "weekly", priority: 0.85 },
    { url: `${SITE_URL}/ambassadeurs`, lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    { url: `${SITE_URL}/sponsoring`, lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    { url: `${SITE_URL}/contact`, lastModified: now, changeFrequency: "monthly", priority: 0.5 },
    { url: `${SITE_URL}/methodologie`, lastModified: now, changeFrequency: "monthly", priority: 0.5 },
    { url: `${SITE_URL}/a-propos`, lastModified: now, changeFrequency: "monthly", priority: 0.6 },
    // Dashboard public d'impact (audit Trust 26-04 "idée killer") — V1 statique,
    // V2 juin 2026 = compteurs live via webhook Beehiiv + partenaires affil.
    { url: `${SITE_URL}/impact`, lastModified: now, changeFrequency: "weekly", priority: 0.7 },
    { url: `${SITE_URL}/affiliations`, lastModified: now, changeFrequency: "monthly", priority: 0.4 },
    // Page de transparence (loi Influenceurs juin 2023 + DGCCRF) — liste
    // exhaustive des partenariats actifs, statut MiCA et rémunération perçue.
    { url: `${SITE_URL}/transparence`, lastModified: now, changeFrequency: "monthly", priority: 0.5 },
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
    // Quiz "Trouve ton exchange en 60 sec" (P0-différenciation : aucun concurrent FR
    // n'a de quiz interactif). Lead magnet ultra-converting → priority 0.85, weekly.
    { url: `${SITE_URL}/quiz/trouve-ton-exchange`, lastModified: now, changeFrequency: "weekly", priority: 0.85 },
    { url: `${SITE_URL}/cryptos`, lastModified: now, changeFrequency: "weekly", priority: 0.7 },
    { url: `${SITE_URL}/wizard/premier-achat`, lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    // Alertes prix par email — page outil, à indexer (potentiel "alerte prix bitcoin", etc.)
    { url: `${SITE_URL}/alertes`, lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    // Phase 3 / A5 — landing widgets embeddables + page ressources libres
    // (linkable assets pour générer des backlinks organiques sans démarchage).
    // Les routes /embed/* restent volontairement HORS sitemap (noindex).
    { url: `${SITE_URL}/embeds`, lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    { url: `${SITE_URL}/ressources-libres`, lastModified: now, changeFrequency: "monthly", priority: 0.7 },
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

  /* ----------------------------------------------------------------
   * 5. Piliers V2 — News, Analyses TA, Académie (parcours + leçons)
   *
   * NOTE — `lastModified` utilise la VRAIE date de publication de l'article
   * (frontmatter `date`) plutôt que `now`. Sinon Google reçoit un signal
   * "tout a bougé hier" alors que les news de la semaine dernière n'ont pas
   * été touchées → cannibalise le freshness signal des nouveaux articles.
   * ---------------------------------------------------------------- */
  const newsSummaries = await getAllNewsSummaries();
  const newsRoutes: MetadataRoute.Sitemap = newsSummaries.map((n) => ({
    url: `${SITE_URL}/actualites/${n.slug}`,
    lastModified: new Date(n.date),
    changeFrequency: "monthly" as const,
    priority: 0.5,
  }));

  const taSummaries = await getAllTASummaries();
  const taRoutes: MetadataRoute.Sitemap = taSummaries.map((a) => ({
    url: `${SITE_URL}/analyses-techniques/${a.slug}`,
    lastModified: new Date(a.date),
    changeFrequency: "weekly" as const,
    priority: 0.6,
  }));

  // Académie : 3 routes parcours + N routes leçons (1 par couple track × article).
  const academyTrackRoutes: MetadataRoute.Sitemap = TRACKS.map((t) => ({
    url: `${SITE_URL}/academie/${t.id}`,
    lastModified: now,
    changeFrequency: "weekly" as const,
    priority: 0.75,
  }));
  const academyLessonRoutes: MetadataRoute.Sitemap = TRACKS.flatMap((track) =>
    track.lessons.map((lesson) => ({
      url: `${SITE_URL}/academie/${track.id}/${lesson.articleSlug}`,
      lastModified: now,
      changeFrequency: "monthly" as const,
      priority: 0.6,
    })),
  );

  return [
    ...staticRoutes,
    ...listicleRoutes,
    ...glossaryRoutes,
    ...articleRoutes,
    ...authorRoutes,
    ...programmaticRoutes,
    ...converterPairRoutes,
    ...newsRoutes,
    ...taRoutes,
    ...academyTrackRoutes,
    ...academyLessonRoutes,
  ];
}
