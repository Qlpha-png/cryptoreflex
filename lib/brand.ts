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
  tagline: "Tout pour investir en crypto en France",
  description:
    "100 cryptos analysées (score fiabilité, on-chain live, roadmap), 34 plateformes MiCA / PSAN comparées (CASP UE + agrément AMF FR), 26 outils (DCA, ROI, fiscalité PFU, Cerfa 2086, Whale Radar, Allocator IA), IA Q&A par fiche, alertes prix gratuites. Méthodologie publique, sans bullshit.",
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
   * Nombre de plateformes auditées dans data/platforms.json.
   * Sync auto possible via `getAllPlatforms().length` mais on garde une
   * constante affichée pour éviter les drift visuels (ex: 34 → 33 après
   * dépublication d'une plateforme).
   */
  platforms: 34,
  /**
   * Nombre de fiches crypto éditoriales (data/top-cryptos.json + hidden-gems).
   * = 10 top + 90 hidden = 100.
   */
  cryptos: 100,
  /**
   * Nombre d'outils dans app/outils/<slug>/page.tsx.
   * Comptage manuel : 14 historiques + 4 TIER 3 (BATCH 11) + 8 BATCH 7-8
   * (whale-radar, phishing-checker, allocator-ia, gas-tracker-fr,
   * export-expert-comptable, crypto-license, succession-crypto, dca-lab) = 26.
   */
  tools: 26,
} as const;
