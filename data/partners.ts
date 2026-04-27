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

import type { LucideIcon } from "lucide-react";
import {
  Wallet,
  ShieldCheck,
  FileText,
  Crown,
  Smartphone,
  Lock,
  Cpu,
  Zap,
  Sparkles,
  TrendingUp,
} from "lucide-react";

export type PartnerCategory =
  | "fiscalite"
  | "hardware-wallet"
  | "exchange"
  | "education";

export interface PartnerPersona {
  name: string;
  description: string;
}

/** Produit individuel vendu par un partenaire (hardware, plan SaaS, etc.). */
export interface PartnerProduct {
  /** ID unique stable (ex: "nano-s-plus", "safe-3", "investisseur") */
  id: string;
  /** Nom affichage */
  name: string;
  /** Prix display (ex : "79 €", "À partir de 99 €/an", "Gratuit") */
  price: string;
  /** Description 1 ligne (USP unique) */
  description: string;
  /** Icône Lucide pour le visuel produit (fallback si pas d'imagePath). */
  Icon: LucideIcon;
  /**
   * Chemin image officielle produit dans /public (ex: /products/nano-s-plus.png).
   * Optionnel — quand présent, affiché à la place de l'Icon dans la vitrine
   * et la page détail. Fournir des PNG transparents 600×600+ ou WebP.
   * Sources : kits affiliés Ledger / Trezor / Waltio (Creatives section).
   */
  imagePath?: string;
  /** Badge optionnel (ex: "Best-seller", "Recommandé", "Nouveau") */
  badge?: { label: string; tone: "primary" | "success" | "warning" | "info" };
  /** URL affiliée spécifique au produit (optionnel - sinon utilise affiliateUrl global) */
  productUrl?: string;
  /** Highlight features (3 max, courts) */
  highlights: string[];
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
  /** Path logo SVG dans /public (placeholder si manquant) */
  logoPath: string;
  /** Couleur brand pour accent (hex) */
  brandColor: string;
  /** Année de création (trust signal) */
  since: string;
  /** Pays d'origine */
  country: string;
  /** Prix d'entrée display (legacy, utilisé pour le CTA principal) */
  priceFrom: string;
  /** Commission affiliée display (motivant pour Cryptoreflex éthique transparente) */
  commission?: string;
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
  /** Produits/plans vendus par ce partenaire (vitrine dynamique) */
  products: PartnerProduct[];
}

export const partners: Partner[] = [
  {
    slug: "ledger",
    name: "Ledger",
    category: "hardware-wallet",
    tagline: "Le hardware wallet français qui domine le marché mondial.",
    shortDescription:
      "Leader français incontesté (3M+ utilisateurs). Secure Element certifié CC EAL5+, écosystème Ledger Live mature, support en français, design Tony Fadell (créateur iPod).",
    whyWeUseIt:
      "On l'utilise depuis 2018 et c'est notre choix de référence. Hardware best-in-class, écosystème le plus large du marché (5 500+ tokens), made in France. Pour la majorité des utilisateurs crypto, Ledger est l'outil qui fait le job du premier coup.",
    // Lien officiel Ledger Affiliate Program (email d'onboarding 26/04/2026).
    // r=5313c8e86d40 = ID affilié unique Cryptoreflex pour tracker conversions.
    affiliateUrl: "https://shop.ledger.com/?r=5313c8e86d40",
    logoPath: "/logos/partners/ledger.svg",
    brandColor: "#000000",
    since: "2014",
    country: "France",
    priceFrom: "79 €",
    commission: "taux compétitif Ledger Affiliate",
    pros: [
      "Secure Element certifié CC EAL5+ (résiste extraction physique)",
      "Écosystème mature : 5 500+ tokens, MetaMask/Rabby intégrations",
      "Made in France — design + R&D + fabrication partielle EU",
      "Mises à jour firmware régulières, support FR",
    ],
    cons: [],
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
    products: [
      {
        id: "nano-s-plus",
        name: "Ledger Nano S Plus",
        price: "79 €",
        description: "Le hardware wallet best-seller, suffisant pour 90% des besoins.",
        Icon: ShieldCheck,
        badge: { label: "Recommandé débutant", tone: "primary" },
        highlights: [
          "Écran 128×64 lisible",
          "100+ apps simultanées",
          "USB-C, compatible MetaMask",
        ],
      },
      {
        id: "nano-x",
        name: "Ledger Nano X",
        price: "149 €",
        description: "Bluetooth chiffré + batterie pour signer en mobilité.",
        Icon: Smartphone,
        highlights: [
          "Bluetooth Low Energy chiffré",
          "Batterie autonome",
          "App mobile iOS + Android",
        ],
      },
      {
        id: "stax",
        name: "Ledger Stax",
        price: "399 €",
        description: "Écran e-ink tactile premium, signature visuelle.",
        Icon: Sparkles,
        badge: { label: "Premium", tone: "warning" },
        highlights: [
          "Écran e-ink courbe tactile",
          "Charge sans fil Qi",
          "Design Tony Fadell (iPod)",
        ],
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
      "C'est le wallet qu'on garde en parallèle de Ledger pour la diversification fabricant (best practice patrimoine sérieux). Code 100% public sur GitHub : tu n'as pas à faire confiance, tu vérifies toi-même. La référence absolue pour qui veut la souveraineté complète.",
    affiliateUrl: "https://affil.trezor.io/aff_c?offer_id=137&aff_id=141576",
    logoPath: "/logos/partners/trezor.svg",
    brandColor: "#1B1B1B",
    since: "2014",
    country: "République tchèque",
    priceFrom: "49 €",
    commission: "12% par vente",
    pros: [
      "100% open-source (firmware + Trezor Suite + bootloader auditables sur GitHub)",
      "Shamir Backup natif (fractionnement seed multi-sites) sur Safe 5 et Model T",
      "Audits publics récurrents par la communauté de sécurité",
      "Compatibilité Linux native, philosophie souveraine assumée",
    ],
    cons: [],
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
    products: [
      {
        id: "safe-3",
        name: "Trezor Safe 3",
        price: "79 €",
        description: "Secure Element + open-source. Le sweet spot du marché.",
        Icon: ShieldCheck,
        imagePath: "/products/trezor-safe-3.png",
        badge: { label: "Best-seller", tone: "success" },
        highlights: [
          "Secure Element EAL6+ certifié",
          "100% open-source",
          "20+ langues, écran couleur",
        ],
      },
      {
        id: "safe-5",
        name: "Trezor Safe 5",
        price: "169 €",
        description: "Écran tactile couleur, haptic feedback premium.",
        Icon: Smartphone,
        imagePath: "/products/trezor-safe-5.png",
        highlights: [
          "Écran tactile couleur 1.54\"",
          "Vibrations haptic feedback",
          "Shamir Backup natif",
        ],
      },
      {
        id: "model-t",
        name: "Trezor Model T",
        price: "189 €",
        description: "Modèle premium historique, support coins étendu.",
        Icon: Crown,
        imagePath: "/products/trezor-model-t.png",
        highlights: [
          "Écran tactile couleur",
          "Shamir Backup (SLIP-39)",
          "Compatible 1500+ cryptos",
        ],
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
    affiliateUrl: "https://www.waltio.com/fr/?a_aid=Cryptoreflex",
    logoPath: "/logos/partners/waltio.svg",
    brandColor: "#0066FF",
    since: "2018",
    country: "France",
    priceFrom: "Gratuit",
    commission: "20% par vente",
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
    products: [
      {
        id: "decouverte",
        name: "Découverte",
        price: "Gratuit",
        description: "Visualise ton portfolio, jusqu'à 30 transactions.",
        Icon: Sparkles,
        badge: { label: "Sans CB", tone: "info" },
        highlights: [
          "Connexion 220+ plateformes",
          "Aperçu plus-values",
          "Pas d'export Cerfa",
        ],
      },
      {
        id: "investisseur",
        name: "Investisseur",
        price: "199 €/an",
        description: "Le plan recommandé pour la majorité des contribuables FR.",
        Icon: FileText,
        badge: { label: "Recommandé", tone: "primary" },
        highlights: [
          "Cerfa 2086 + 3916-bis auto",
          "Jusqu'à 5 000 transactions",
          "Support FR prioritaire",
        ],
      },
      {
        id: "trader",
        name: "Trader",
        price: "549 €/an",
        description: "Pour gros volumes et stratégies DeFi avancées.",
        Icon: TrendingUp,
        highlights: [
          "50 000 transactions",
          "DeFi multi-chain avancé",
          "Multi-portefeuilles illimité",
        ],
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
