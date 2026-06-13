/**
 * Source unique de vérité pour l'identité de marque.
 * Si le nom, le domaine ou la baseline change, ne modifier qu'ici.
 */

export const BRAND = {
  name: "Cryptoreflex",
  /**
   * Domaine d'affichage (footer, mentions légales, JSON-LD `domain`).
   * On garde le format sans `www.` ici parce que c'est le branding
   * naturel à montrer en lecture.
   */
  domain: "cryptoreflex.fr",
  /**
   * URL canonique de production.
   *
   * IMPORTANT : on force la version `www.` parce que Vercel sert le site
   * sur `www.cryptoreflex.fr` et redirige `cryptoreflex.fr` → `www.` en
   * 308. Si le sitemap pointait sur la version sans `www.`, chaque crawl
   * Googlebot subirait un redirect inutile (~434 routes), ce qui plombe
   * le crawl-budget et envoie un signal de canonical instable.
   *
   * Toute la chaîne (sitemap, robots.txt, JSON-LD, OG URLs, canonical)
   * dépend de cette constante — modifier ici suffit à tout aligner.
   */
  url: "https://www.cryptoreflex.fr",
  email: "contact@cryptoreflex.fr",
  partnersEmail: "partners@cryptoreflex.fr",
  tagline: "Tout sur la crypto, en français",
  description:
    "780 fiches crypto (100 fiches éditoriales + 680 fiches LLM, score fiabilité, on-chain live, roadmap), 33 plateformes MiCA / PSAN comparées (CASP UE + agrément AMF FR), 28 outils (DCA, ROI, fiscalité PFU, Cerfa 2086, Whale Radar, Allocator IA), IA Q&A par fiche, alertes prix gratuites. Méthodologie publique, sans bullshit.",
  /** Identifiant utilisé dans les UTM des liens d'affiliation. */
  utmSource: "cryptoreflex",
} as const;

/**
 * STATS — Source unique de vérité pour les chiffres-clés affichés
 * dans le Hero, le footer, les meta-descriptions, /a-propos, /admin, etc.
 *
 * Ne JAMAIS hardcoder ces chiffres ailleurs : importer depuis ici via
 * `import { STATS } from "@/lib/brand"`.
 *
 * BATCH 24 (audit cohérence final) : centralisation après audit qui a
 * trouvé "30+ plateformes / 18 outils / 20 outils" disséminés dans 7+
 * endroits désynchronisés. Cette constante garantit qu'il n'y a plus
 * jamais de drift catalog vs UI.
 *
 * Mise à jour : à chaque ajout de plateforme/crypto/outil, modifier ici
 * uniquement (les helpers `getAllPlatforms().length` etc. existent mais
 * ne sont pas utilisables côté Server Component pendant le build sans
 * import de data files lourds — STATS reste la version "display").
 */
export const STATS = {
  /**
   * Nombre de plateformes DISPONIBLES en France, affiché partout (« X plateformes »).
   * = exchanges/brokers de data/platforms.json HORS plateformes fermées au marché FR
   * (Gemini, avril 2026) et hors hardware wallets. Source UNIQUE pour les strings —
   * ne jamais hardcoder ce nombre ailleurs, importer STATS.platforms (ou, en Server
   * Component, getAvailablePlatformCount() dans lib/platforms.ts).
   * (34 audités − 1 fermé = 33 ; recompter à chaque ajout/fermeture.)
   */
  platforms: 33,
  /**
   * Nombre TOTAL de fiches crypto disponibles sur le site.
   * = 100 fiches éditoriales statiques (10 top + 90 hidden gems) + 680 fiches
   *   LLM exploratoires en DB (Supabase) = 780.
   * Pour le sous-total éditorial uniquement, voir `cryptosCurated`.
   */
  cryptos: 780,
  /** Sous-total des fiches crypto éditoriales (data/top-cryptos.json + hidden-gems). */
  cryptosCurated: 100,
  /**
   * Nombre d'outils dans app/outils/<slug>/page.tsx.
   * = 23 free + 5 pro = 28 (cf. app/outils/page.tsx).
   */
  tools: 28,
} as const;
