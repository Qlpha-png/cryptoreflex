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
  tagline: "Comparatifs, guides et outils crypto",
  description:
    "Comparatifs des meilleures plateformes (Coinbase, Binance, Revolut…), guides clairs pour débutants et outils gratuits pour calculer tes profits crypto.",
  /** Identifiant utilisé dans les UTM des liens d'affiliation. */
  utmSource: "cryptoreflex",
} as const;
