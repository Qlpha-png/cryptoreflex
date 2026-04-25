/**
 * Source unique de vérité pour l'identité de marque.
 * Si le nom, le domaine ou la baseline change, ne modifier qu'ici.
 */

export const BRAND = {
  name: "Cryptoreflex",
  domain: "cryptoreflex.fr",
  url: "https://cryptoreflex.fr",
  email: "contact@cryptoreflex.fr",
  partnersEmail: "partners@cryptoreflex.fr",
  tagline: "Comparatifs, guides et outils crypto",
  description:
    "Comparatifs des meilleures plateformes (Coinbase, Binance, Revolut…), guides clairs pour débutants et outils gratuits pour calculer vos profits crypto.",
  /** Identifiant utilisé dans les UTM des liens d'affiliation. */
  utmSource: "cryptoreflex",
} as const;
