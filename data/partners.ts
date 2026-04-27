/**
 * Partners data — Cryptoreflex affiliations vitrine.
 *
 * Source de vérité unique pour /partenaires + /go/[partner] + cross-sell.
 * Conçu suite aux recommandations de 20 agents experts vitrine.
 *
 * Disclosure RGPD obligatoire : chaque partenaire = lien affilié. Cryptoreflex
 * perçoit une commission sans surcoût pour l'utilisateur (loi 9 juin 2023 +
 * décret 2022-928).
 */

export type PartnerCategory =
  | "fiscalite"
  | "hardware-wallet"
  | "exchange"
  | "education";

export interface PartnerPersona {
  name: string;
  description: string;
}

export interface Partner {
  /** URL slug : /partenaires/[slug] */
  slug: string;
  /** Nom officiel pour affichage */
  name: string;
  /** Catégorie pour filtrage */
  category: PartnerCategory;
  /** Tagline 1 ligne (style éditorial Cryptoreflex) */
  tagline: string;
  /** Description courte (1-2 phrases) sur la vitrine */
  shortDescription: string;
  /** Pourquoi on les a sélectionnés (philosophie éditoriale) */
  whyWeUseIt: string;
  /** URL affiliée tracking via /go/[slug] (le redirect ajoute UTM) */
  affiliateUrl: string;
  /** Path logo SVG dans /public */
  logoPath: string;
  /** Couleur brand pour accent (hex) */
  brandColor: string;
  /** Année de création (trust signal) */
  since: string;
  /** Pays d'origine */
  country: string;
  /** Prix d'entrée display */
  priceFrom: string;
  /** Avantages (3-5 bullets) */
  pros: string[];
  /** Inconvénients honnêtes (transparence éditoriale) */
  cons: string[];
  /** Code promo si négocié (optionnel) */
  promoCode?: { code: string; discount: string };
  /** Featured = mis en avant sur homepage vitrine */
  featured: boolean;
  /** Order display (1, 2, 3...) */
  order: number;
  /** Personas pour matchmaking */
  personas: PartnerPersona[];
}

export const partners: Partner[] = [
  {
    slug: "ledger",
    name: "Ledger",
    category: "hardware-wallet",
    tagline: "Le hardware wallet français qui domine — avec ses zones d'ombre.",
    shortDescription:
      "Marque française leader (3M+ users). Secure Element CC EAL5+ certifié. UX Ledger Live mature, support FR.",
    whyWeUseIt:
      "On l'utilise depuis 2018. C'est le choix par défaut pour 90% des cas. On reconnaît le drama Recover (2023) — on dit ce qu'on en pense honnêtement plutôt que de l'éviter.",
    affiliateUrl: "https://shop.ledger.com/?r=cryptoreflex",
    logoPath: "/logos/partners/ledger.svg",
    brandColor: "#000000",
    since: "2014",
    country: "France",
    priceFrom: "79 €",
    pros: [
      "Secure Element certifié CC EAL5+ (résiste extraction physique)",
      "Écosystème mature : 5 500+ tokens, MetaMask/Rabby intégrations",
      "Made in France — design + R&D + fabrication partielle EU",
      "Mises à jour firmware régulières, support FR",
    ],
    cons: [
      "OS BOLOS partiellement fermé (Trezor est 100% open-source)",
      "Drama Recover 2023 (cloud seed opt-in controversé)",
      "Ledger Live frais swap parfois plus élevés qu'en direct",
    ],
    promoCode: { code: "REFLEX10", discount: "-10% pour les abonnés Pro" },
    featured: true,
    order: 1,
    personas: [
      {
        name: "Premier hardware wallet",
        description:
          "Tu as 2 000–50 000 € en crypto sur un exchange. Tu veux sortir, simplement. Nano S Plus 79 €, setup 15 min, tu dors mieux.",
      },
      {
        name: "Voyageur / nomade crypto",
        description:
          "Tu signes des transactions en déplacement depuis ton téléphone. Nano X (149 €) avec Bluetooth chiffré.",
      },
    ],
  },
  {
    slug: "trezor",
    name: "Trezor",
    category: "hardware-wallet",
    tagline: "100% open-source. Aucun secret, aucune backdoor.",
    shortDescription:
      "Pionnier du hardware wallet (2014, République tchèque). Firmware + software entièrement auditables sur GitHub. Shamir Backup natif sur Model T.",
    whyWeUseIt:
      "Si tu lis le whitepaper Bitcoin le dimanche, c'est ton wallet. Code 100% public, pas de promesse marketing à croire — tu vérifies toi-même. Notre choix pour les cypherpunks.",
    affiliateUrl: "https://trezor.io/?ref=cryptoreflex",
    logoPath: "/logos/partners/trezor.svg",
    brandColor: "#1B1B1B",
    since: "2014",
    country: "République tchèque",
    priceFrom: "49 €",
    pros: [
      "100% open-source (firmware + Trezor Suite + bootloader)",
      "Shamir Backup natif (fractionnement seed multi-sites) sur Model T",
      "Audits publics récurrents par la communauté",
      "Compatibilité Linux native, philosophie souveraine",
    ],
    cons: [
      "Pas de Bluetooth (friction mobile vs Ledger Nano X)",
      "UX Trezor Suite moins polish que Ledger Live",
      "Mobile app Android-only (pas iOS)",
    ],
    promoCode: { code: "REFLEX5", discount: "-5% via notre lien" },
    featured: true,
    order: 2,
    personas: [
      {
        name: "Cypherpunk / privacy advocate",
        description:
          "\"Don't trust, verify\" n'est pas un slogan — c'est ton mode de vie. Trezor est ton seul choix possible.",
      },
      {
        name: "Audit-conscious user",
        description:
          "Patrimoine crypto sérieux (>20 k€). Tu veux vérifier le code, pas faire confiance au marketing. Trezor expose tout.",
      },
    ],
  },
  {
    slug: "waltio",
    name: "Waltio",
    category: "fiscalite",
    tagline: "Cerfa 2086 prêt en 12 minutes, pas en 12 heures.",
    shortDescription:
      "SaaS français leader fiscalité crypto. Génère Cerfa 2086 + 3916-bis pré-remplis selon doctrine Bercy (méthode PMP, art. 150 VH bis CGI). Connecte 220+ plateformes.",
    whyWeUseIt:
      "On déclare nos propres plus-values dessus depuis 2022. Le seul outil qui produit un Cerfa 2086 conforme à la doctrine fiscale française — Koinly et CoinTracking ne le font pas pour la France.",
    affiliateUrl:
      "https://waltio.com?ref=cryptoreflex&utm_source=cryptoreflex&utm_medium=affiliate&utm_campaign=fiscalite-fr",
    logoPath: "/logos/partners/waltio.svg",
    brandColor: "#0066FF",
    since: "2018",
    country: "France",
    priceFrom: "99 €/an",
    pros: [
      "Cerfa 2086 + 3916-bis pré-remplis automatiquement (unique en FR)",
      "Méthode PMP native (art. 150 VH bis CGI exigée par Bercy)",
      "Support FR sous 24h pendant période fiscale",
      "Connexion 220+ plateformes (Binance, Bitpanda, Coinhouse, Kraken, MetaMask…)",
    ],
    cons: [
      "Plan Trader 549 €/an cher si > 50 000 transactions",
      "Couverture moins exhaustive que Koinly sur chains exotiques (Sui, Aptos, Cosmos)",
      "Hors-sujet si tu n'es pas résident fiscal français",
    ],
    featured: true,
    order: 3,
    personas: [
      {
        name: "Tax-anxious deadline mai",
        description:
          "Multi-exchange, deadline approche, tu paniques. Waltio Investor 199 €/an + nos guides Pro = déclaration en 1 weekend.",
      },
      {
        name: "Investor lourd >100 k€",
        description:
          "Plusieurs wallets, gros volumes. Waltio Trader 549 €/an + cabinet partenaire en complément.",
      },
    ],
  },
];

/** Get partner by slug. */
export function getPartner(slug: string): Partner | null {
  return partners.find((p) => p.slug === slug) ?? null;
}

/** Get featured partners (vitrine homepage). */
export function getFeaturedPartners(): Partner[] {
  return partners.filter((p) => p.featured).sort((a, b) => a.order - b.order);
}
