/**
 * Source unique de vérité pour l'identité de marque.
 * Si le nom, le domaine ou la baseline change, ne modifier qu'ici.
 */

import COUNTS from "@/data/site-counts.json";

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
  /** Description courte du site (chiffres réels, data/site-counts.json). */
  description: `${COUNTS.cryptos} fiches crypto, ${COUNTS.platformsAudited} plateformes comparées dont ${COUNTS.platforms} autorisées en France (registres AMF et ESMA), ${COUNTS.tools} outils gratuits (fiscalité PFU, Cerfa 2086, simulateur DCA, convertisseur) et le jeu de cartes Reflex Cards. Méthodologie publique.`,
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
 * Mise à jour (depuis le 05/10/2026) : PLUS RIEN À LA MAIN. Les valeurs viennent de
 * data/site-counts.json, recalculé depuis les données par `node scripts/update-site-counts.mjs`
 * (chaque nuit par la sentinelle). tests/lib/site-counts.test.ts échoue si le fichier ne correspond
 * plus aux données du dépôt (plateforme, outil ou carte ajouté sans recompter).
 */
/** Nombre au format français, milliers séparés par une espace insécable classique (U+00A0, pas U+202F). */
export const fmtCount = (n: number): string => n.toLocaleString("fr-FR").replace(/ /g, " ");

export const STATS = {
  /** Plateformes disponibles en France (registres officiels, isAvailableFr). */
  platforms: COUNTS.platforms,
  /** Plateformes auditées (exchanges et courtiers, disponibles ou non en France). */
  platformsAudited: COUNTS.platformsAudited,
  /** Fiches crypto publiées au total (éditoriales + exploratoires en base, d'après le plan du site). */
  cryptos: COUNTS.cryptos,
  /** Fiches crypto éditoriales (data/top-cryptos.json + hidden-gems). */
  cryptosCurated: COUNTS.cryptosCurated,
  /** Duels /vs possibles entre fiches éditoriales. */
  vsPairs: COUNTS.vsPairs,
  /** Outils publiés (lib/tools-catalog.ts, hors « à venir »). */
  tools: COUNTS.tools,
  /** Cartes Reflex Cards (catalogue Univers). */
  cards: COUNTS.cards,
} as const;
