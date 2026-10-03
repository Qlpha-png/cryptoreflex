import type { MetadataRoute } from "next";
import { getAllArticleSummaries } from "@/lib/mdx";
import { BRAND } from "@/lib/brand";
import { getAllProgrammaticRoutes } from "@/lib/programmatic";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";
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
import { TRACKS } from "@/lib/academy-tracks";
import { partners as affiliatePartners } from "@/data/partners";
import { getAllPlatforms, getPlatformById, isAvailableFr } from "@/lib/platforms";
import { EDITORIAL_FICHE_REVIEWED_DATE, getAllCryptos } from "@/lib/cryptos";
import { getHistYearsFor } from "@/lib/historique-prix";
import {
  buildSitemapFilterContext,
  filterSitemapEntries,
  latestDate,
  toLastModified,
} from "@/lib/sitemap-filters";
import { allCards as allReflexCards, isIndexable, isReflexCardsEnabled, isVisible, seasonDay } from "@/lib/reflex-cards/data";
import { applyReleases } from "@/lib/reflex-cards/releases";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || BRAND.url;

// ISR sitemap (étude #12 ETUDE-2026-05-02) : régénéré max 1×/heure côté Edge,
// au lieu d'être généré à chaque hit Googlebot. Avec 1035+ URLs programmatiques,
// chaque génération coûte ~50-100ms — inutile de payer ça pour chaque crawler.
//
// FIX perf 2026-05-09 — `dynamic = "force-static"` ajouté pour aligner avec
// les autres routes sitemap-*.xml (cf. app/sitemap-index.xml/route.ts) et
// supprimer le doublon Cache-Control. Sans ce flag, MetadataRoute traitait la
// route en dynamique (à cause des `await` Supabase), ce qui faisait émettre
// par le framework `Cache-Control: public, max-age=0, must-revalidate` EN PLUS
// du header `s-maxage=3600` défini dans next.config.js -> 2 headers Cache-Control
// contradictoires renvoyés au CDN/navigateur.
export const dynamic = "force-static";
export const revalidate = 3600;

/*
 * AUDIT SEO 2026-10-02 — deux règles pour tout le fichier :
 *
 * 1. `lastModified` = VRAIE date quand la donnée l'a (frontmatter des articles,
 *    lastUpdated du glossaire, date de vérification des frais d'une plateforme,
 *    date de revue éditoriale des fiches, updated_at DB…). Sinon on OMET le
 *    champ (optionnel dans le protocole) au lieu de `new Date()` : un lastmod
 *    « maintenant » sur 7 000 URLs à chaque régénération apprend à Google à
 *    ignorer tous nos lastmod.
 * 2. Uniquement des URLs canoniques, indexables, en 200 : filtre final
 *    lib/sitemap-filters.ts (leçons /academie/* canonicalisées vers /blog,
 *    /cryptos/<id>/acheter-en-france canonicalisées vers /acheter/<id>/fr,
 *    /cryptos/<coingeckoId> redirigées, /lp/* noindex, /pro, /pro-plus,
 *    /cgv-abonnement) + dédoublonnage.
 */

type Entry = MetadataRoute.Sitemap[number];
type ChangeFrequency = NonNullable<Entry["changeFrequency"]>;

function entry(
  path: string,
  changeFrequency: ChangeFrequency,
  priority: number,
  lastModified?: Date,
): Entry {
  return {
    url: `${SITE_URL}${path}`,
    ...(lastModified ? { lastModified } : {}),
    changeFrequency,
    priority,
  };
}

/** Date de dernière vérification des données d'une plateforme (fees.verified.date). */
function platformDate(id: string): Date | undefined {
  return toLastModified(getPlatformById(id)?.fees.verified?.date);
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  // Contenus datés (frontmatter) : servent aussi de lastmod aux hubs qui les listent.
  const articles = await getAllArticleSummaries();
  const newsSummaries = await getAllNewsSummaries();
  const taSummaries = await getAllTASummaries();
  const latestArticle = latestDate(articles.map((a) => a.lastUpdated ?? a.date));
  const latestNews = latestDate(newsSummaries.map((n) => n.date));
  const latestTA = latestDate(taSummaries.map((t) => t.date));
  const latestContent = latestDate(
    [latestArticle, latestNews, latestTA].map((d) => d?.toISOString()),
  );
  const ficheReviewed = toLastModified(EDITORIAL_FICHE_REVIEWED_DATE);

  /* ----------------------------------------------------------------
   * 1. Routes statiques éditoriales
   *    Retirées le 2026-10-02 : /lp/mica-2026 et /lp/cerfa-2026 (noindex),
   *    /pro, /pro-plus, /cgv-abonnement (pages de transition « tout est
   *    gratuit » depuis la démonétisation de juin 2026, noindex).
   * ---------------------------------------------------------------- */
  const staticRoutes: MetadataRoute.Sitemap = [
    entry("/", "daily", 1, latestContent),
    entry("/blog", "weekly", 0.8, latestArticle),
    entry("/actualites", "daily", 0.8, latestNews),
    // NOTE — /calendrier-crypto (legacy) supprimé du sitemap : redirige 301
    // vers /calendrier (cf. next.config.js, audit SEO 26-04 CRIT-3).
    entry("/outils", "monthly", 0.7),
    // Phase 3 / Agent A4 — page hub /ressources (lead magnets PDF + outils + blog).
    entry("/ressources", "weekly", 0.7),
    entry("/outils/simulateur-dca", "monthly", 0.7),
    entry("/outils/convertisseur", "monthly", 0.7),
    // P1 #1 roadmap : LE outil viral (Cryptoast top 3 Google sur "fiscalité crypto").
    entry("/outils/calculateur-fiscalite", "monthly", 0.85),
    // Phase 3 / Agent A1 — page comparative outils fiscaux (Waltio recommandé).
    entry("/outils/declaration-fiscale-crypto", "monthly", 0.8),
    // Vérificateur MiCA : trafic stratégique sur "plateforme MiCA conforme".
    entry("/outils/verificateur-mica", "weekly", 0.75),
    entry("/outils/whitepaper-tldr", "monthly", 0.6),
    // Pilier 5 (V2) — outils interactifs ajoutés le 26-04-2026.
    entry("/outils/glossaire-crypto", "weekly", 0.7),
    entry("/outils/calculateur-roi-crypto", "monthly", 0.8),
    entry("/outils/portfolio-tracker", "monthly", 0.75),
    // Pilier "Innovation features killer" (26-04-2026).
    entry("/outils/calculateur-apy-staking", "monthly", 0.7),
    entry("/outils/simulateur-halving-bitcoin", "monthly", 0.7),
    entry("/outils/comparateur-personnalise", "monthly", 0.7),
    // Piliers V2 (26-04) : pages-mère News auto, Analyses TA auto, Calendrier.
    entry("/analyses-techniques", "daily", 0.8, latestTA),
    entry("/calendrier", "weekly", 0.7),
    // /partenariats a été 301 vers /sponsoring (audit SEO 01/05/2026).
    entry("/partenaires", "weekly", 0.85),
    entry("/ambassadeurs", "monthly", 0.7),
    entry("/sponsoring", "monthly", 0.7),
    // /api-publique — docs des endpoints CC-BY 4.0 (stratégie backlinks).
    entry("/api-publique", "monthly", 0.7),
    // /etudes — hub des études cornerstone.
    entry("/etudes", "monthly", 0.7),
    entry("/etudes/mica-juillet-2026-etat-des-lieux", "monthly", 0.85),
    entry("/etudes/fiscalite-crypto-france-2026-guide-cerfa", "monthly", 0.9),
    // /guides — hub des guides pratiques actionnables (HowTo schema).
    entry("/guides", "monthly", 0.7),
    entry("/guides/declaration-crypto-2026-checklist", "monthly", 0.85),
    // /embed — docs des widgets JS embarquables (les /embed/* restent noindex).
    entry("/embed", "monthly", 0.7),
    entry("/contact", "monthly", 0.5),
    entry("/methodologie", "monthly", 0.5),
    // Charte éthique éditoriale — ajout 2026-05-07 (signal E-E-A-T).
    entry("/charte", "yearly", 0.6),
    entry("/a-propos", "monthly", 0.6),
    // FIX SEO 2026-05-06 — hubs indexables jamais soumis auparavant.
    entry("/cryptos", "weekly", 0.85),
    entry("/alternative-a", "monthly", 0.7),
    entry("/historique-prix", "weekly", 0.7),
    entry("/vs", "weekly", 0.75),
    // Hub /acheter créé 2026-06-13 (cluster 600 pages crypto×pays).
    entry("/acheter", "weekly", 0.8),
    // Dashboard public d'impact (audit Trust 26-04).
    entry("/impact", "weekly", 0.7),
    // /affiliations a été 301 vers /transparence (audit SEO 01/05/2026).
    entry("/transparence", "monthly", 0.5),
    entry("/mentions-legales", "yearly", 0.3),
    entry("/confidentialite", "yearly", 0.3),
    entry("/top", "weekly", 0.7),
    entry("/staking", "weekly", 0.7),
    entry("/glossaire", "monthly", 0.6, latestDate(GLOSSARY_TERMS.map((t) => t.lastUpdated))),
    // Hubs (P0-5) — pages-mère qui regroupent les sous-routes existantes.
    entry("/avis", "weekly", 0.85),
    entry("/comparatif", "weekly", 0.85),
    entry("/marche", "daily", 0.8),
    entry("/quiz", "monthly", 0.75),
    entry("/marche/heatmap", "daily", 0.7),
    entry("/marche/fear-greed", "daily", 0.6),
    entry("/marche/gainers-losers", "daily", 0.6),
    entry("/halving-bitcoin", "weekly", 0.65),
    entry("/quiz/plateforme", "monthly", 0.7),
    entry("/quiz/crypto", "monthly", 0.7),
    // Quiz "Trouve ton exchange en 60 sec" (lead magnet).
    entry("/quiz/trouve-ton-exchange", "weekly", 0.85),
    // Programmatic SEO — /comparer (hub cryptos vs cryptos).
    entry("/comparer", "weekly", 0.75),
    entry("/wizard/premier-achat", "monthly", 0.7),
    // Alertes prix par email — page outil indexable.
    entry("/alertes", "monthly", 0.7),
    // Phase 3 / A5 — landing widgets embeddables + ressources libres.
    entry("/embeds", "monthly", 0.7),
    entry("/ressources-libres", "monthly", 0.7),
    // FIX 2026-05-02 #11 — TIER 3 features (audit consolidé 6 experts).
    entry("/outils/yield-stablecoins", "weekly", 0.8),
    entry("/outils/tax-loss-harvesting", "monthly", 0.75),
    entry("/outils/fiscal-copilot", "monthly", 0.7),
    entry("/outils/wallet-connect", "monthly", 0.65),
    entry("/crypto-wrapped", "monthly", 0.6),
    // Pack Déclaration (ressource gratuite depuis juin 2026).
    entry("/pack-declaration-crypto-2026", "weekly", 0.9),
    // FIX 2026-05-02 #21+22 — innovation features landings + CGU.
    entry("/outils/whale-radar", "monthly", 0.7),
    entry("/outils/phishing-checker", "monthly", 0.75),
    entry("/outils/allocator-ia", "monthly", 0.75),
    entry("/outils/gas-tracker-fr", "weekly", 0.7),
    entry("/outils/export-expert-comptable", "monthly", 0.8),
    entry("/outils/crypto-license", "monthly", 0.7),
    entry("/outils/succession-crypto", "monthly", 0.7),
    entry("/outils/dca-lab", "monthly", 0.7),
    entry("/cgu", "yearly", 0.3),
    // Académie : hub indexable (les leçons sont canonicalisées vers /blog).
    entry("/academie", "weekly", 0.8),
    // BLOCs 0-7 (2026-05-04) — pages SEO ajoutées lors de la session "par bloc".
    entry("/comparatif/frais", "weekly", 0.85, latestDate(getAllPlatforms().map((p) => p.fees.verified?.date))),
    entry("/comparatif/securite", "weekly", 0.85),
    entry("/airdrops", "weekly", 0.85),
    entry("/outils/profit-loss-calculator", "monthly", 0.8),
    entry("/faq-crypto", "weekly", 0.85),
    entry("/marche/whales", "daily", 0.7),
    entry("/newsletter", "weekly", 0.7),
    // /portefeuille hors sitemap : disallow dans robots.txt (audit SEO 30/04/2026).
  ];

  /* ----------------------------------------------------------------
   * 1bis. Top X listicles
   * ---------------------------------------------------------------- */
  const listicleRoutes: MetadataRoute.Sitemap = ALL_LISTICLES.map((l) =>
    entry(`/top/${l.slug}`, "weekly", 0.75),
  );

  /* ----------------------------------------------------------------
   * 1quater. Pages partenaires affiliés (long-form reviews)
   * ---------------------------------------------------------------- */
  const partnerRoutes: MetadataRoute.Sitemap = affiliatePartners.map((p) =>
    entry(`/partenaires/${p.slug}`, "weekly", 0.8),
  );

  /* ----------------------------------------------------------------
   * 1ter. Glossaire (pages individuelles) — lastUpdated de chaque terme
   * ---------------------------------------------------------------- */
  const glossaryRoutes: MetadataRoute.Sitemap = GLOSSARY_TERMS.map((t) =>
    entry(`/glossaire/${t.id}`, "monthly", 0.5, toLastModified(t.lastUpdated)),
  );

  /* ----------------------------------------------------------------
   * 2. Articles de blog — date de mise à jour du frontmatter
   * ---------------------------------------------------------------- */
  const articleRoutes: MetadataRoute.Sitemap = articles.map((a) =>
    entry(`/blog/${a.slug}`, "monthly", 0.6, toLastModified(a.lastUpdated ?? a.date)),
  );

  /* ----------------------------------------------------------------
   * 2bis. Pages auteur (E-E-A-T)
   * ---------------------------------------------------------------- */
  const authorRoutes: MetadataRoute.Sitemap = getAllAuthors().map((a) =>
    entry(`/auteur/${a.id}`, "monthly", 0.5),
  );

  /* ----------------------------------------------------------------
   * 3. Routes programmatiques (lib/programmatic.ts)
   *    /avis/[slug], /comparatif/[slug], /cryptos/[slug],
   *    /cryptos/[slug]/acheter-en-france, /staking/[slug]
   *    lastmod : date de vérification des données plateforme (avis,
   *    comparatifs) ; date de revue éditoriale (fiches /cryptos).
   * ---------------------------------------------------------------- */
  // Exclut les plateformes fermées au marché FR (ex : Gemini, déjà en noindex) :
  // /avis/[id], /alternative-a/[id] et les duels /comparatif/x-vs-id.
  const unavailableIds = getAllPlatforms()
    .filter((p) => !isAvailableFr(p))
    .map((p) => p.id);
  const refersToUnavailable = (path: string) =>
    unavailableIds.some(
      (id) =>
        path === `/avis/${id}` ||
        path === `/alternative-a/${id}` ||
        (path.startsWith("/comparatif/") &&
          (path.split("/comparatif/")[1] ?? "").split("-vs-").includes(id))
    );
  const editorialIds = new Set(getAllCryptos().map((c) => c.id));
  const programmaticLastModified = (path: string): Date | undefined => {
    const seg = path.split("/").filter(Boolean);
    if (seg[0] === "avis" && seg[1]) return platformDate(seg[1]);
    if (seg[0] === "comparatif" && seg[1]) {
      return latestDate(seg[1].split("-vs-").map((id) => getPlatformById(id)?.fees.verified?.date));
    }
    if (seg[0] === "cryptos" && seg.length === 2 && editorialIds.has(seg[1])) return ficheReviewed;
    return undefined;
  };
  const programmaticRoutes: MetadataRoute.Sitemap = getAllProgrammaticRoutes()
    .filter((r) => !refersToUnavailable(r.path))
    .map((r) => entry(r.path, r.changeFrequency, r.priority, programmaticLastModified(r.path)));

  /* ----------------------------------------------------------------
   * 3.b. Fiches LLM scaling Phase 1 (DB-backed, updated_at réel)
   *      Best-effort : si la DB est down, on retourne [] silencieusement.
   *      Les coingecko_id des fiches éditoriales (ripple, binancecoin…) sont
   *      retirés par le filtre final (308 vers /cryptos/<id>).
   * ---------------------------------------------------------------- */
  const dbFichesRoutes: MetadataRoute.Sitemap = await (async () => {
    try {
      const sb = createSupabaseServiceRoleClient();
      if (!sb) return [];
      const { data, error } = await sb
        .from("cryptos")
        .select("coingecko_id, updated_at, market_cap_rank")
        .eq("source", "llm-pipeline")
        .eq("is_published", true)
        .order("market_cap_rank", { ascending: true, nullsFirst: false })
        .limit(2000);
      if (error || !data) return [];
      return data.map((r: { coingecko_id: string; updated_at: string; market_cap_rank: number | null }) =>
        entry(
          `/cryptos/${r.coingecko_id}`,
          "weekly",
          // Priorité dégressive selon market_cap_rank : top 100 = 0.7,
          // 100-300 = 0.6, 300-700 = 0.5, 700+ = 0.4.
          r.market_cap_rank == null
            ? 0.4
            : r.market_cap_rank < 100 ? 0.7
            : r.market_cap_rank < 300 ? 0.6
            : r.market_cap_rank < 700 ? 0.5
            : 0.4,
          toLastModified(r.updated_at),
        ),
      );
    } catch (err) {
      console.warn("[sitemap] DB fiches fetch failed:", err);
      return [];
    }
  })();

  /* ----------------------------------------------------------------
   * 3bis. /comparer/[slug] LEGACY : redirigé en 308 vers /vs/[a]/[b]
   *       (next.config.js → lib/seo-redirects.cjs) → absent du sitemap.
   * ---------------------------------------------------------------- */

  /* ----------------------------------------------------------------
   * 3ter. Programmatic SEO massif (BATCH 58 — top 100) :
   *       /vs/[a]/[b] → 4950 paires ; /acheter/[crypto]/[pays] → 600.
   *       Source : lib/programmatic-pages.ts.
   * ---------------------------------------------------------------- */
  const comparerPairRoutes: MetadataRoute.Sitemap = getComparerPairRoutes().map((r) =>
    entry(r.path, r.changeFrequency, r.priority),
  );
  const acheterRoutes: MetadataRoute.Sitemap = getAcheterRoutes().map((r) =>
    entry(r.path, r.changeFrequency, r.priority),
  );

  /* ----------------------------------------------------------------
   * 3quater. /alternative-a/[plateforme] — même périmètre que la route
   *          (generateStaticParams exclut les hardware wallets : Ledger et
   *          Trezor y sont des 404, retirés du sitemap le 2026-10-02).
   * ---------------------------------------------------------------- */
  const alternativeRoutes: MetadataRoute.Sitemap = getAllPlatforms()
    .filter((p) => p.category !== "wallet" && isAvailableFr(p))
    .map((p) => entry(`/alternative-a/${p.id}`, "monthly", 0.7, platformDate(p.id)));

  // /historique-prix/[crypto]/[annee] : aligné sur generateStaticParams de la page
  // (getAllCryptos × HIST_YEARS, dynamicParams=false), SANS les années
  // antérieures au lancement du projet (noindex côté page) — getHistYearsFor.
  const historiquePrixRoutes: MetadataRoute.Sitemap = getAllCryptos().flatMap((c) =>
    getHistYearsFor(c).map((annee) =>
      entry(`/historique-prix/${c.id}/${annee}`, "yearly", 0.55),
    ),
  );

  /* ----------------------------------------------------------------
   * 4. Pages convertisseur SEO programmatic (top 30 pairs)
   * ---------------------------------------------------------------- */
  const converterPairRoutes: MetadataRoute.Sitemap = TOP_PAIRS.map(({ from, to }) =>
    entry(`/convertisseur/${from}-${to}`, "daily", 0.5),
  );

  /* ----------------------------------------------------------------
   * 5. Piliers V2 — News, Analyses TA, Académie (parcours)
   *    lastModified = vraie date de publication (frontmatter `date`).
   *    Les leçons /academie/<parcours>/<slug> ne sont PAS listées : même MDX
   *    que /blog/<slug>, canonical vers le blog (déjà listé en 2.).
   * ---------------------------------------------------------------- */
  const newsRoutes: MetadataRoute.Sitemap = newsSummaries.map((n) =>
    entry(`/actualites/${n.slug}`, "monthly", 0.5, toLastModified(n.date)),
  );

  const taRoutes: MetadataRoute.Sitemap = taSummaries.map((a) =>
    entry(`/analyses-techniques/${a.slug}`, "weekly", 0.6, toLastModified(a.date)),
  );

  const academyTrackRoutes: MetadataRoute.Sitemap = TRACKS.map((t) =>
    entry(`/academie/${t.id}`, "weekly", 0.75),
  );

  // Reflex Cards : hub + pages carte déjà visibles (sorties ou révélées) et indexables
  // (description + fiche à relier), seulement quand le jeu est activé (lib/reflex-cards/data.ts).
  await applyReleases(); // sorties effectives (paliers de joueurs) : seules les cartes sorties sont indexées
  const reflexDay = seasonDay();
  const reflexCardRoutes: MetadataRoute.Sitemap = isReflexCardsEnabled()
    ? [
        { url: `${SITE_URL}/cartes`, lastModified: now, changeFrequency: "weekly" as const, priority: 0.8 },
        ...allReflexCards()
          .filter((c) => isVisible(c, reflexDay) && isIndexable(c))
          .map((c) => ({
            url: `${SITE_URL}/cartes/${c.id}`,
            lastModified: now,
            changeFrequency: "monthly" as const,
            priority: 0.5,
          })),
      ]
    : [];

  return filterSitemapEntries(
    [
      ...staticRoutes,
      ...reflexCardRoutes,
      ...partnerRoutes,
      ...listicleRoutes,
      ...glossaryRoutes,
      ...articleRoutes,
      ...authorRoutes,
      ...programmaticRoutes,
      ...dbFichesRoutes,
      ...comparerPairRoutes,
      ...acheterRoutes,
      ...alternativeRoutes,
      ...historiquePrixRoutes,
      ...converterPairRoutes,
      ...newsRoutes,
      ...taRoutes,
      ...academyTrackRoutes,
    ],
    (e) => e.url,
    buildSitemapFilterContext(),
  );
}
