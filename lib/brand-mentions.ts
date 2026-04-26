/**
 * Source unique de vérité pour les "brand mentions" de Cryptoreflex.
 *
 * Toutes les URLs externes qui prouvent l'existence légale, la réputation
 * ou l'identité de la marque Cryptoreflex sont centralisées ici. Cette
 * structure alimente :
 *
 *  1. `Organization.sameAs` (lib/schema.ts) → signal Knowledge Panel Google
 *  2. La page /a-propos (section "Vérifications externes")
 *  3. La page /transparence (preuves légales INSEE / Pappers / Société.com)
 *  4. Le footer (badges Trustpilot, INSEE, etc.)
 *
 * Pourquoi cette source unique :
 *  - Évite les divergences entre sameAs schema et UI (Google pénalise les
 *    incohérences entre données structurées et contenu visible).
 *  - Simplifie l'ajout/désactivation : un seul endroit à modifier.
 *  - Permet un typage par catégorie (legal / reviews / social / technical)
 *    pour générer plus tard un rendu différencié par section.
 *
 * Convention :
 *  - Les entrées commentées sont des PLACEHOLDERS. Décommenter QUAND la
 *    page existe réellement (page LinkedIn créée, profil X actif, etc.).
 *  - Inscrire une URL fantôme en sameAs = signal négatif Google E-E-A-T.
 */

export type BrandMentionType =
  | "RegistrationProof" // INSEE / data.gouv (preuve juridique d'existence)
  | "BusinessRegistry" // Pappers / Société.com (registre RCS public)
  | "ReviewSite" // Trustpilot / Google Reviews
  | "SocialProfile" // LinkedIn / X / Telegram (présence sociale)
  | "BusinessProfile" // Crunchbase / G2 / Capterra
  | "CodeRepository" // GitHub / GitLab (open-source = signal de transparence)
  | "PressMention" // article presse FR référent (Capital, BFM, Décrypto…)
  | "Encyclopedia"; // Wikipedia / Wikidata (signal le plus fort pour KP)

export interface BrandMention {
  /** Nom court affiché dans l'UI (ex : "Trustpilot", "INSEE"). */
  name: string;
  /** URL canonique vers la fiche / preuve. */
  url: string;
  /** Type de preuve — sert au tri visuel et au filtrage par section. */
  type: BrandMentionType;
}

/* -------------------------------------------------------------------------- */
/*  Catalogue des mentions actives                                            */
/* -------------------------------------------------------------------------- */

export const BRAND_MENTIONS = {
  /**
   * Preuves légales — issues du SIRET 103 352 621 (entrepreneur individuel
   * Kevin VOISIN, exploitant la marque Cryptoreflex). Ces fiches sont
   * générées automatiquement par les annuaires publics dès que l'entreprise
   * est immatriculée — pas besoin d'action manuelle pour les créer.
   */
  legal: [
    {
      name: "INSEE / Annuaire des entreprises",
      url: "https://annuaire-entreprises.data.gouv.fr/entreprise/103352621",
      type: "RegistrationProof",
    },
    {
      name: "Pappers",
      url: "https://www.pappers.fr/entreprise/cryptoreflex-103352621",
      type: "BusinessRegistry",
    },
    {
      name: "Société.com",
      url: "https://www.societe.com/societe/cryptoreflex-103352621.html",
      type: "BusinessRegistry",
    },
  ] as BrandMention[],

  /**
   * Sites d'avis — preuve de réputation. Trustpilot est le plus pondéré
   * par Google FR pour les services en ligne. Le profil doit être réclamé
   * (claimed) et avoir au moins 1 avis pour compter en sameAs.
   */
  reviews: [
    {
      name: "Trustpilot",
      url: "https://www.trustpilot.com/review/cryptoreflex.fr",
      type: "ReviewSite",
    },
  ] as BrandMention[],

  /**
   * Profils sociaux officiels — à activer UN PAR UN au fur et à mesure
   * que les pages sont effectivement créées et alimentées. Une URL qui
   * renvoie 404 ou un profil vide est pire que pas d'URL du tout.
   */
  social: [
    // {
    //   name: "LinkedIn Company",
    //   url: "https://www.linkedin.com/company/cryptoreflex",
    //   type: "SocialProfile",
    // },
    // {
    //   name: "X (Twitter)",
    //   url: "https://x.com/cryptoreflex",
    //   type: "SocialProfile",
    // },
    // {
    //   name: "Crunchbase",
    //   url: "https://www.crunchbase.com/organization/cryptoreflex",
    //   type: "BusinessProfile",
    // },
    // {
    //   name: "Telegram",
    //   url: "https://t.me/cryptoreflex",
    //   type: "SocialProfile",
    // },
  ] as BrandMention[],

  /**
   * Présence technique — GitHub public = preuve d'engagement open-source
   * et de transparence (très valorisé pour les sites finance/YMYL).
   * Vérifier que le repo est public AVANT décommentage. Si privé,
   * l'URL renvoie 404 et plombe la confiance Google.
   */
  technical: [
    {
      name: "GitHub Cryptoreflex",
      url: "https://github.com/Qlpha-png/cryptoreflex",
      type: "CodeRepository",
    },
  ] as BrandMention[],

  /**
   * Mentions presse / encyclopédies — placeholders. À ajouter dès qu'une
   * mention indépendante est publiée par un média reconnu (Capital, BFM,
   * Cointribune, JDC, JDG…). Une seule mention crédible vaut mieux que
   * 10 placeholders bidon.
   */
  press: [
    // { name: "Cointribune — interview Kevin Voisin", url: "https://...", type: "PressMention" },
    // { name: "Wikidata Q-ID Cryptoreflex", url: "https://www.wikidata.org/wiki/Q...", type: "Encyclopedia" },
  ] as BrandMention[],
} as const;

/* -------------------------------------------------------------------------- */
/*  Helpers d'extraction                                                      */
/* -------------------------------------------------------------------------- */

/**
 * Retourne uniquement les URLs actives (non commentées) pour injection
 * dans `Organization.sameAs`. Garantit un ordre stable (legal d'abord,
 * puis reviews, puis social, puis technical, puis press).
 *
 * Ordre = signal de priorité pour Google : les preuves légales d'abord,
 * la presse en dernier (parce que la presse est plus volatile).
 */
export function getActiveBrandUrls(): string[] {
  return [
    ...BRAND_MENTIONS.legal.map((m) => m.url),
    ...BRAND_MENTIONS.reviews.map((m) => m.url),
    ...BRAND_MENTIONS.social.map((m) => m.url),
    ...BRAND_MENTIONS.technical.map((m) => m.url),
    ...BRAND_MENTIONS.press.map((m) => m.url),
  ];
}

/** Toutes les mentions actives, à plat, avec leur métadonnée — utile UI. */
export function getAllActiveMentions(): BrandMention[] {
  return [
    ...BRAND_MENTIONS.legal,
    ...BRAND_MENTIONS.reviews,
    ...BRAND_MENTIONS.social,
    ...BRAND_MENTIONS.technical,
    ...BRAND_MENTIONS.press,
  ];
}

/** Filtre par type — utile pour les sections dédiées de /transparence. */
export function getMentionsByType(type: BrandMentionType): BrandMention[] {
  return getAllActiveMentions().filter((m) => m.type === type);
}
