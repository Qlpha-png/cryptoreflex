/**
 * Partners data — Cryptoreflex affiliations vitrine.
 *
 * Source de vérité unique pour /partenaires + /go/[partner] + cross-sell.
 * Conçu suite aux recommandations de 20 agents experts vitrine.
 *
 * Disclosure RGPD obligatoire : chaque partenaire = lien affilié. Cryptoreflex
 * perçoit une commission (loi 9 juin 2023 +
 * décret 2022-928).
 */

import type { LucideIcon } from "lucide-react";
import { AFFILIATE_URLS } from "@/lib/partner-links";
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
  /** Pourquoi on le recommande, à partir des seuls faits produits (Kev 05/10/2026 : aucun usage personnel ne doit être raconté). */
  whyWeChoseIt: string;
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
    tagline: "Le hardware wallet français : plus de 8 millions d'appareils vendus selon Ledger.",
    shortDescription:
      "Fabricant français fondé en 2014. Puce sécurisée certifiée CC EAL5+ ou EAL6+ selon le modèle, application Ledger Wallet (ex-Ledger Live), site, boutique et centre d'aide en français. Le Stax a été dessiné avec Tony Fadell (l'un des pères de l'iPod).",
    whyWeChoseIt:
      "Un portefeuille matériel très répandu (plus de 8 millions d'appareils vendus selon Ledger) : il garde vos clés hors ligne, et son application gère plus de 500 cryptos, plus de 15 000 avec des portefeuilles tiers.",
    // Lien officiel Ledger Affiliate Program (email d'onboarding 26/04/2026).
    // r=5313c8e86d40 = ID affilié unique Cryptoreflex pour tracker conversions.
    affiliateUrl: AFFILIATE_URLS.ledger,
    logoPath: "/logos/partners/ledger.svg",
    brandColor: "#000000",
    since: "2014",
    country: "France",
    priceFrom: "59 €",
    // Taux de départ public du programme (FAQ affiliation support.ledger.com, vérifiée le 05/10/2026).
    commission: "10 % par vente (taux de départ du programme Ledger)",
    pros: [
      "Puce sécurisée certifiée CC EAL5+ ou EAL6+ selon le modèle, dotée selon Ledger de protections contre les attaques physiques courantes",
      "15 000+ cryptos annoncées, compatible MetaMask et Rabby",
      "Société française : siège à Paris, site de production à Vierzon",
      "Mises à jour de Ledger OS fournies par Ledger, site, boutique et centre d'aide en français",
    ],
    cons: [],
    featured: true,
    order: 1,
    personas: [
      {
        name: "Premier hardware wallet",
        description:
          "Vous avez 2 000–50 000 € en crypto sur une plateforme. Vous voulez sortir, simplement. Nano S Plus à 59 €, installation guidée par l'application Ledger Wallet.",
      },
      {
        name: "Voyageur / nomade crypto",
        description:
          "Vous signez des transactions en déplacement depuis votre téléphone. Nano X (99 €) avec Bluetooth chiffré, ou Nano Gen5, Flex et Stax à écran tactile.",
      },
    ],
    products: [
      {
        id: "nano-s-plus",
        name: "Ledger Nano S Plus",
        price: "59 €",
        description: "Le modèle d'entrée de gamme : USB-C, sans batterie, pour ordinateur et Android.",
        Icon: ShieldCheck,
        badge: { label: "Recommandé débutant", tone: "primary" },
        highlights: [
          "Écran OLED 128×64",
          "Jusqu'à 100 apps installées",
          "USB-C, compatible MetaMask (pas d'iPhone)",
        ],
      },
      {
        id: "nano-x",
        name: "Ledger Nano X",
        price: "99 €",
        description: "Bluetooth chiffré + batterie pour signer depuis votre téléphone.",
        Icon: Smartphone,
        highlights: [
          "Bluetooth Low Energy 5.2 chiffré",
          "Batterie : jusqu'à 5 h d'autonomie",
          "App mobile iOS + Android",
        ],
      },
      {
        id: "stax",
        name: "Ledger Stax",
        price: "399 €",
        description: "Grand écran tactile E Ink incurvé, le haut de gamme de Ledger.",
        Icon: Sparkles,
        badge: { label: "Premium", tone: "warning" },
        highlights: [
          "Écran tactile E Ink incurvé de 3,7 pouces",
          "Recharge sans fil Qi",
          "Design Tony Fadell (iPod)",
        ],
      },
    ],
  },
  {
    slug: "trezor",
    name: "Trezor",
    category: "hardware-wallet",
    tagline: "Un firmware open source : chacun peut vérifier ce qu'il fait.",
    shortDescription:
      "Pionnier du portefeuille matériel (fondé en 2013, basé à Prague, premier modèle en 2014). Firmware open source publié sur GitHub. Sauvegarde multi-fragments sur les Safe 3, 5 et 7.",
    whyWeChoseIt:
      "Un portefeuille matériel dont le code est public : chacun peut vérifier ce qu'il fait. Un bon second appareil pour ne pas dépendre d'un seul fabricant.",
    affiliateUrl: AFFILIATE_URLS.trezor,
    logoPath: "/logos/partners/trezor.svg",
    brandColor: "#1B1B1B",
    // trezor.io/about (05/10/2026) : « 2013 — Fondation de Trezor » ; Model One sorti en 2014.
    since: "2013",
    country: "République tchèque",
    // Prix trezor.io au 05/10/2026 : Safe 3 59 €, Safe 5 129 €, Safe 7 249 € (Model One et Model T arrêtés).
    priceFrom: "59 €",
    // trezor.io/affiliate : « jusqu'à 15 % » de la valeur nette (hors TVA et livraison).
    commission: "jusqu'à 15 % du montant de la vente (hors TVA et livraison)",
    pros: [
      "Firmware open source (GPLv3, LGPLv3, MIT), recompilable pour vérifier qu'il correspond à la version officielle",
      "Sauvegarde multi-fragments (jusqu'à 16 morceaux) sur Safe 3, Safe 5 et Safe 7",
      "Programme de récompenses pour les failles signalées et liste publique des vulnérabilités corrigées",
      "Trezor Suite sous Windows, macOS, Linux et Android (iPhone : complet avec le Safe 7)",
    ],
    cons: [],
    featured: true,
    order: 2,
    personas: [
      {
        name: "Vérifier plutôt que croire",
        description:
          "Vous préférez vérifier le code plutôt que croire le marketing. Le firmware Trezor est public et peut être recompilé pour être comparé à la version officielle.",
      },
      {
        name: "Patrimoine à protéger dans la durée",
        description:
          "Vous voulez répartir votre sauvegarde entre plusieurs lieux. La sauvegarde multi-fragments des Safe 3, 5 et 7 permet par exemple de restaurer avec 3 morceaux sur 5.",
      },
    ],
    products: [
      {
        id: "safe-3",
        name: "Trezor Safe 3",
        price: "59 €",
        description: "Élément Sécurisé et deux boutons : le modèle d'entrée de gamme.",
        Icon: ShieldCheck,
        imagePath: "/products/trezor-safe-3.png",
        badge: { label: "Entrée de gamme", tone: "primary" },
        highlights: [
          "Élément Sécurisé certifié EAL6+",
          "Firmware open source",
          "Écran OLED monochrome 0,96\", USB-C",
        ],
      },
      {
        id: "safe-5",
        name: "Trezor Safe 5",
        price: "129 €",
        description: "Écran tactile couleur et retour haptique à chaque confirmation.",
        Icon: Smartphone,
        imagePath: "/products/trezor-safe-5.png",
        highlights: [
          "Écran tactile couleur 1,54\"",
          "Retour haptique, verre Gorilla Glass 3",
          "Sauvegarde multi-fragments",
        ],
      },
      {
        id: "safe-7",
        name: "Trezor Safe 7",
        price: "249 €",
        description: "Grand écran, Bluetooth et compatibilité iPhone complète.",
        Icon: Crown,
        badge: { label: "Haut de gamme", tone: "warning" },
        highlights: [
          "Écran tactile couleur 2,5\"",
          "Deux Éléments Sécurisés (OPTIGA + TROPIC01)",
          "Bluetooth, recharge sans fil Qi2",
        ],
      },
    ],
  },
  {
    slug: "waltio",
    name: "Waltio",
    category: "fiscalite",
    tagline: "Votre Cerfa 2086 préparé pour vous, sans Excel.",
    shortDescription:
      "Logiciel français de déclaration fiscale crypto. Prépare l'annexe 2086 selon la méthode globale de l'art. 150 VH bis CGI et les informations du 3916-bis. Plus de 700 intégrations (plateformes, wallets, blockchains).",
    whyWeChoseIt:
      "Un outil conçu pour la fiscalité française : il prépare le formulaire 2086 selon la méthode globale de l'article 150 VH bis et les informations des comptes à déclarer au 3916-bis.",
    affiliateUrl: AFFILIATE_URLS.waltio,
    logoPath: "/logos/partners/waltio.svg",
    // Couleur officielle Waltio = purple #503BFF (vérifiée logo officiel waltio.com).
    brandColor: "#503BFF",
    since: "2018",
    country: "France",
    priceFrom: "Gratuit",
    commission: "jusqu'à 20 % par vente",
    pros: [
      "Annexe 2086 calculée et formulaires 3916-bis pré-remplis",
      "Méthode globale de l'art. 150 VH bis CGI appliquée pour la France",
      "Support par e-mail, chat à partir de l'offre Lite",
      "Plus de 700 intégrations (Binance, Bitpanda, Coinhouse, Kraken, MetaMask…)",
    ],
    cons: [
      "Offre Unlimited à 999 €/an au-delà de 10 000 transactions",
      "Pas de connexion automatique aux blockchains Sui et Aptos (liste officielle vérifiée le 5 octobre 2026)",
      "Formulaires fiscaux localisés seulement pour les pays principaux ; ailleurs, un rapport générique à faire adapter par un conseiller local",
      "Fuite de données découverte en janvier 2026 (e-mail, gain ou perte 2024, soldes fin 2024) : restez vigilant face à l'hameçonnage",
    ],
    featured: true,
    order: 3,
    personas: [
      {
        name: "Déclaration de dernière minute",
        description:
          "Plusieurs plateformes, la date limite approche. Waltio Starter (99 €/an, jusqu'à 1 000 transactions) et nos guides vous aident à préparer la déclaration.",
      },
      {
        name: "Gros volumes, plusieurs wallets",
        description:
          "Plusieurs wallets, beaucoup d'opérations. Waltio Smart (249 €/an, jusqu'à 10 000 transactions) + un cabinet spécialisé en complément.",
      },
    ],
    products: [
      {
        id: "free",
        name: "Free",
        price: "Gratuit",
        description: "Suivez votre portefeuille ; formulaire des comptes étrangers inclus.",
        Icon: Sparkles,
        badge: { label: "Sans CB", tone: "info" },
        highlights: [
          "Plateformes et wallets illimités",
          "Formulaire 3916-bis",
          "Pas de rapport fiscal",
        ],
      },
      {
        id: "starter",
        name: "Starter",
        price: "99 €/an",
        description: "Jusqu'à 1 000 transactions par an (Lite à 39 €/an jusqu'à 50 transactions).",
        Icon: FileText,
        badge: { label: "Recommandé", tone: "primary" },
        highlights: [
          "Rapport des plus et moins-values",
          "Jusqu'à 1 000 transactions",
          "Suivi CeFi et DeFi",
        ],
      },
      {
        id: "smart",
        name: "Smart",
        price: "249 €/an",
        description: "Pour les gros volumes (Unlimited à 999 €/an au-delà).",
        Icon: TrendingUp,
        highlights: [
          "Jusqu'à 10 000 transactions",
          "Suivi CeFi et DeFi",
          "Guide de déclaration sur impots.gouv.fr",
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
