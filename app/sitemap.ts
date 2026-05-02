import type { MetadataRoute } from "next";
import { getAllArticleSummaries } from "@/lib/mdx";
import { BRAND } from "@/lib/brand";
import { getAllProgrammaticRoutes } from "@/lib/programmatic";
import { getAllCryptoComparisonSlugs } from "@/lib/crypto-comparisons";
import {
  getComparerPairRoutes,
  getAcheterRoutes,
} from "@/lib/programmatic-pages";
import { getAllAuthors } from "@/lib/authors";
import { TOP_PAIRS } from "@/lib/historical-prices";
import { GLOSSARY_TERMS } from "@/lib/glossary";
import { ALL_LISTICLES } from "@/lib/listicles";
// Piliers V2 (26-04) : News auto, Analyses TA auto, Académie certifiante.
import { getAllNewsSummaries } from "@/lib/news-mdx";
import { getAllTASummaries } from "@/lib/ta-mdx";
import { TRACKS, getAllAcademyArticleSlugs } from "@/lib/academy-tracks";
import { partners as affiliatePartners } from "@/data/partners";
import { getAllPlatforms } from "@/lib/platforms";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || BRAND.url;

// ISR sitemap (étude #12 ETUDE-2026-05-02) : régénéré max 1×/heure côté Edge,
// au lieu d'être généré à chaque hit Googlebot. Avec 1035+ URLs programmatiques,
// chaque génération coûte ~50-100ms — inutile de payer ça pour chaque crawler.
export const revalidate = 3600;

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
    // Fix audit SEO 01/05/2026 — `/partenariats` a été 301 vers `/sponsoring`.
    // Le retirer du sitemap évite que Google crawle un redirect inutile et
    // signale "Submitted URL has redirect" en Search Console.
    // Vitrine partenaires affiliés (3 marques curées) + détail par slug.
    // Priority 0.85 (vitrine principale revenue-driving) — détails 0.8.
    { url: `${SITE_URL}/partenaires`, lastModified: now, changeFrequency: "weekly", priority: 0.85 },
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
    // Fix audit SEO 01/05/2026 — `/affiliations` a été 301 vers `/transparence`.
    // Retirer du sitemap pour éviter un redirect inutile dans Google Search Console.
    // Page de transparence (loi Influenceurs juin 2023 + DGCCRF) — liste
    // exhaustive des partenariats actifs, statut MiCA et rémunération perçue.
    { url: `${SITE_URL}/transparence`, lastModified: now, changeFrequency: "monthly", priority: 0.5 },
    { url: `${SITE_URL}/mentions-legales`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
    { url: `${SITE_URL}/confidentialite`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
    { url: `${SITE_URL}/cgv-abonnement`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
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
    // Programmatic SEO — /comparer (cryptos vs cryptos, 105 paires top 15)
    // Différencié de /comparatif (plateformes) et /cryptos/comparer (dynamique).
    { url: `${SITE_URL}/comparer`, lastModified: now, changeFrequency: "weekly", priority: 0.75 },
    { url: `${SITE_URL}/wizard/premier-achat`, lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    // Alertes prix par email — page outil, à indexer (potentiel "alerte prix bitcoin", etc.)
    { url: `${SITE_URL}/alertes`, lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    // Phase 3 / A5 — landing widgets embeddables + page ressources libres
    // (linkable assets pour générer des backlinks organiques sans démarchage).
    // Les routes /embed/* restent volontairement HORS sitemap (noindex).
    { url: `${SITE_URL}/embeds`, lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    { url: `${SITE_URL}/ressources-libres`, lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    // FIX 2026-05-02 #11 — TIER 3 features (audit consolidé 6 experts).
    // 5 nouvelles pages : 4 outils + 1 landing Wrapped.
    { url: `${SITE_URL}/outils/yield-stablecoins`, lastModified: now, changeFrequency: "weekly", priority: 0.8 },
    { url: `${SITE_URL}/outils/tax-loss-harvesting`, lastModified: now, changeFrequency: "monthly", priority: 0.75 },
    { url: `${SITE_URL}/outils/fiscal-copilot`, lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    { url: `${SITE_URL}/outils/wallet-connect`, lastModified: now, changeFrequency: "monthly", priority: 0.65 },
    { url: `${SITE_URL}/crypto-wrapped`, lastModified: now, changeFrequency: "monthly", priority: 0.6 },
    // FIX 2026-05-02 #20 — TIER 1+2 nouvelles pages (audit 9 experts).
    // Pro+ landing + Pack Déclaration one-shot + 2 patterns SEO programmatic
    // (historique-prix x 240 URLs prebuild, alternative-a x 34 URLs).
    { url: `${SITE_URL}/pro-plus`, lastModified: now, changeFrequency: "monthly", priority: 0.85 },
    { url: `${SITE_URL}/pack-declaration-crypto-2026`, lastModified: now, changeFrequency: "weekly", priority: 0.9 },
    // FIX 2026-05-02 #21+22 (audit 9 experts, BATCH 7+8+9) — innovation features
    // landings (waitlist) + WOW landings + Conditions Générales d'Utilisation.
    { url: `${SITE_URL}/outils/whale-radar`, lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    { url: `${SITE_URL}/outils/phishing-checker`, lastModified: now, changeFrequency: "monthly", priority: 0.75 },
    { url: `${SITE_URL}/outils/allocator-ia`, lastModified: now, changeFrequency: "monthly", priority: 0.75 },
    { url: `${SITE_URL}/outils/gas-tracker-fr`, lastModified: now, changeFrequency: "weekly", priority: 0.7 },
    { url: `${SITE_URL}/outils/export-expert-comptable`, lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: `${SITE_URL}/outils/crypto-license`, lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    { url: `${SITE_URL}/outils/succession-crypto`, lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    { url: `${SITE_URL}/outils/dca-lab`, lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    { url: `${SITE_URL}/cgu`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
    // Académie : page indexable, mise à jour ~hebdomadaire (ajout de leçons V2+)
    { url: `${SITE_URL}/academie`, lastModified: now, changeFrequency: "weekly", priority: 0.8 },
    // Fix audit SEO 30/04/2026 — /portefeuille retiré du sitemap car
    // disallow dans robots.txt (cohérence stricte : disallow > sitemap pour
    // Google, mais une URL sitemap ignorée envoie un signal de pollution).
    // Le PageRank passe quand même via les liens internes du Footer/Navbar.
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
   * 1quater. Pages partenaires affiliés (revenue-driving long-form reviews)
   * ---------------------------------------------------------------- */
  const partnerRoutes: MetadataRoute.Sitemap = affiliatePartners.map((p) => ({
    url: `${SITE_URL}/partenaires/${p.slug}`,
    lastModified: now,
    changeFrequency: "weekly" as const,
    priority: 0.8,
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
   * 3bis. Programmatic crypto-vs-crypto (105 paires top 15)
   *      Différencié de /comparatif (plateformes) & /cryptos/comparer (dyn).
   * ---------------------------------------------------------------- */
  const cryptoComparisonRoutes: MetadataRoute.Sitemap = getAllCryptoComparisonSlugs().map(
    (slug) => ({
      url: `${SITE_URL}/comparer/${slug}`,
      lastModified: now,
      changeFrequency: "monthly" as const,
      priority: 0.65,
    }),
  );

  /* ----------------------------------------------------------------
   * 3ter. Programmatic SEO massif (proposition #8 ETUDE-2026-05-02) :
   *       /comparer/[a]/[b]      → 435 paires top 30 cryptos
   *       /acheter/[crypto]/[pays] → 600 (100 cryptos × 6 pays FR-speaking)
   *       Source : lib/programmatic-pages.ts.
   *
   *       Volume total ajouté : ~1035 URLs. Le sitemap reste largement sous
   *       la limite Google (50k URLs) — pas besoin de splitter en sous-sitemaps.
   * ---------------------------------------------------------------- */
  const comparerPairRoutes: MetadataRoute.Sitemap = getComparerPairRoutes().map((r) => ({
    url: `${SITE_URL}${r.path}`,
    lastModified: now,
    changeFrequency: r.changeFrequency,
    priority: r.priority,
  }));
  const acheterRoutes: MetadataRoute.Sitemap = getAcheterRoutes().map((r) => ({
    url: `${SITE_URL}${r.path}`,
    lastModified: now,
    changeFrequency: r.changeFrequency,
    priority: r.priority,
  }));

  /* ----------------------------------------------------------------
   * 3quater. Programmatic SEO BATCH 7 (audit 9 experts 2026-05-02) :
   *          /alternative-a/[plateforme]   → 1 URL/plateforme
   *          /historique-prix/[crypto]/[annee] → top 30 cryptos × 8 années
   * ---------------------------------------------------------------- */
  const alternativeRoutes: MetadataRoute.Sitemap = getAllPlatforms().map((p) => ({
    url: `${SITE_URL}/alternative-a/${p.id}`,
    lastModified: now,
    changeFrequency: "monthly" as const,
    priority: 0.7,
  }));

  // 30 cryptos × 8 années = 240 URLs prebuild ; le reste en ISR on-demand.
  const HIST_TOP_30 = [
    "bitcoin", "ethereum", "binancecoin", "ripple", "solana",
    "cardano", "dogecoin", "tron", "avalanche-2", "chainlink",
    "polkadot", "matic-network", "litecoin", "shiba-inu", "uniswap",
    "near", "internet-computer", "cosmos", "stellar", "bitcoin-cash",
    "filecoin", "aptos", "monero", "the-open-network", "tezos",
    "algorand", "hedera-hashgraph", "ethereum-classic", "aave", "maker",
  ];
  const HIST_YEARS = ["2018", "2019", "2020", "2021", "2022", "2023", "2024", "2025"];
  const historiquePrixRoutes: MetadataRoute.Sitemap = HIST_TOP_30.flatMap((crypto) =>
    HIST_YEARS.map((annee) => ({
      url: `${SITE_URL}/historique-prix/${crypto}/${annee}`,
      lastModified: now,
      changeFrequency: "yearly" as const,
      priority: 0.55,
    })),
  );

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
    ...partnerRoutes,
    ...listicleRoutes,
    ...glossaryRoutes,
    ...articleRoutes,
    ...authorRoutes,
    ...programmaticRoutes,
    ...cryptoComparisonRoutes,
    ...comparerPairRoutes,
    ...acheterRoutes,
    ...alternativeRoutes,
    ...historiquePrixRoutes,
    ...converterPairRoutes,
    ...newsRoutes,
    ...taRoutes,
    ...academyTrackRoutes,
    ...academyLessonRoutes,
  ];
}
