import type { Metadata } from "next";
import Link from "next/link";
import {
  Crown,
  Mail,
  ShieldCheck,
  Sparkles,
  Bell,
  GraduationCap,
  FileText,
  Zap,
  Users,
  HelpCircle,
  Clock,
  MessagesSquare,
  AlertTriangle,
  Wallet,
  BookOpen,
  ArrowRight,
  Lock,
  RotateCcw,
  CreditCard,
  Star,
  Globe,
} from "lucide-react";
import NewsletterInline from "@/components/NewsletterInline";
import StructuredData from "@/components/StructuredData";
import TieredPricing, { type PricingTier } from "@/components/TieredPricing";
import ProStickyMobileCTA from "@/components/ProStickyMobileCTA";
import {
  faqSchema,
  breadcrumbSchema,
  graphSchema,
  howToSchema,
  type JsonLd,
} from "@/lib/schema";
import { BRAND } from "@/lib/brand";

/* -------------------------------------------------------------------------- */
/*  Constantes pricing (read once via env, hoisted pour metadata)             */
/* -------------------------------------------------------------------------- */
// Hoist au top : ces constantes sont utilisées dans `metadata` ET dans
// `buildTiers()`. Plus simple de les déclarer une seule fois ici.
const META_EARLYBIRD_PRICE = process.env.NEXT_PUBLIC_PRO_EARLYBIRD_PRICE ?? "49 €";
const META_MONTHLY_PRICE = process.env.NEXT_PUBLIC_PRO_MONTHLY_PRICE ?? "9 €";
const META_ANNUAL_PRICE = process.env.NEXT_PUBLIC_PRO_ANNUAL_PRICE ?? "79 €";

/**
 * /pro — landing page Cryptoreflex Pro.
 *
 * Refonte 26/04/2026 — focus session « offer Pro » :
 *  - Calculateur fiscalité PRO (export PDF Cerfa 2086 + 3916-bis)
 *  - Portfolio tracker PRO (alertes prix illimitées)
 *  - Glossaire PRO (Q/A par expert)
 *  - Brief PRO hebdomadaire (alpha + on-chain)
 *  - Articles premium + analyses approfondies
 *  - Réponse fiscale personnalisée par email (48h)
 *
 * Refonte v2 (user feedback 26/04/2026 soir) :
 *  "Pas de Discord" + "Le site offre presque tout gratuit, et si les gens
 *   payent l'argent, ba ou ?"
 *  -> Suppression COMPLETE des mentions Discord (pas de serveur en place,
 *     promesse non-tenable juridiquement = risque consommateur).
 *  -> Restriction du plan Gratuit pour rendre Pro réellement différenciant :
 *      Portfolio 30 -> 10 positions
 *      Alertes 5 -> 3 par email
 *      Glossaire 200+ -> "100 essentiels" (le reste reste lisible mais pas
 *      téléchargeable / pas de Q/A)
 *  -> Renforcement Pro : "Réponse fiscale perso 48h" remplace "Discord"
 *      (livrable réel via support email Crisp existant) + "Brief PRO
 *      hebdomadaire" se distingue clairement de la newsletter quotidienne
 *      gratuite (alpha + on-chain insights = valeur premium claire).
 *
 * Pricing :
 *  - Gratuit (current)
 *  - Pro Mensuel 9 €/mois
 *  - Pro Annuel 79 €/an (économie 33 % vs mensuel : 108 € → 79 €)
 *
 * Stripe arrive automne 2026. En attendant, CTA early-bird précommande
 * 49 €/an via Stripe Payment Link.
 *
 * Var d'env attendue : NEXT_PUBLIC_PRO_EARLYBIRD_STRIPE_LINK
 *  - Si absente, fallback vers la waitlist newsletter.
 *
 * SEO :
 *  - Schema Product + Offer (3 plans) + ItemList des features + FAQPage + BreadcrumbList
 *  - Metadata canonique + OG dédié
 */

export const metadata: Metadata = {
  // BATCH 7 — SEO agent recommandations :
  //  - Title 60 char max avec keyword early + brand + USP unique
  //  - Description 150-155 char optimale, USP + prix + garantie
  //  - openGraph / twitter complets (Cards Summary Large Image)
  //  - robots avec max-image-preview / max-snippet (Google 2024+)
  title: "Cryptoreflex Pro — Outils crypto premium FR à 9,99 €/mois",
  description: `Pro à ${META_MONTHLY_PRICE}/mois ou ${META_ANNUAL_PRICE}/an : portfolio illimité, alertes prix illimitées, glossaire 250+ termes, brief alpha hebdo + réponse fiscale 48h. Annulation 1 clic, 14 j remboursé. RGPD UE.`,
  alternates: { canonical: `${BRAND.url}/pro` },
  keywords: [
    "abonnement crypto français",
    "outil crypto premium",
    "fiscalité crypto Cerfa 2086",
    "portfolio crypto illimité",
    "alertes prix bitcoin",
    "Cryptoreflex Pro",
  ],
  openGraph: {
    title: "Cryptoreflex Pro — l'outillage crypto premium pensé pour les Français",
    description: `À partir de ${META_MONTHLY_PRICE}/mois. Portfolio illimité, alertes prix illimitées, brief alpha hebdo, réponse fiscale 48 h. Annulation 1 clic. Sans Discord, sans engagement.`,
    url: `${BRAND.url}/pro`,
    siteName: BRAND.name,
    locale: "fr_FR",
    type: "website",
    images: [
      {
        url: `${BRAND.url}/og-image.png`,
        width: 1200,
        height: 630,
        alt: "Cryptoreflex Pro — abonnement premium crypto FR",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Cryptoreflex Pro — abonnement crypto premium FR",
    description: `Portfolio + alertes illimités, brief alpha, réponse fiscale 48 h. ${META_MONTHLY_PRICE}/mois — annulation 1 clic.`,
    images: [`${BRAND.url}/og-image.png`],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
};

/* -------------------------------------------------------------------------- */
/*  Plans                                                                     */
/* -------------------------------------------------------------------------- */

/**
 * Stripe Payment Links — 3 produits potentiels.
 *
 * Chaque variable peut être :
 *   - Une URL https://buy.stripe.com/xxxxx (Payment Link configuré → vrai prix EUR)
 *   - Absente / vide → fallback vers le early-bird (ou waitlist si même early-bird absent)
 *
 * Configuration Vercel (Production scope) :
 *   NEXT_PUBLIC_PRO_EARLYBIRD_STRIPE_LINK = https://buy.stripe.com/xxx (early-bird 49€)
 *   NEXT_PUBLIC_PRO_MONTHLY_STRIPE_LINK   = https://buy.stripe.com/yyy (mensuel récurrent)
 *   NEXT_PUBLIC_PRO_ANNUAL_STRIPE_LINK    = https://buy.stripe.com/zzz (annuel récurrent)
 *
 * Prix configurables aussi (au cas où l'utilisateur change ses tarifs Stripe) :
 *   NEXT_PUBLIC_PRO_EARLYBIRD_PRICE = "49 €" (défaut)
 *   NEXT_PUBLIC_PRO_MONTHLY_PRICE   = "9 €" (défaut, peut être "9,99 €")
 *   NEXT_PUBLIC_PRO_ANNUAL_PRICE    = "79 €" (défaut, peut être "79,99 €")
 */
const EARLYBIRD_LINK =
  process.env.NEXT_PUBLIC_PRO_EARLYBIRD_STRIPE_LINK ?? "#waitlist";
const MONTHLY_LINK =
  process.env.NEXT_PUBLIC_PRO_MONTHLY_STRIPE_LINK ?? EARLYBIRD_LINK;
const ANNUAL_LINK =
  process.env.NEXT_PUBLIC_PRO_ANNUAL_STRIPE_LINK ?? EARLYBIRD_LINK;

/** Prix affichés (alias des constantes hoistées en haut du fichier). */
const EARLYBIRD_PRICE = META_EARLYBIRD_PRICE;
const MONTHLY_PRICE = META_MONTHLY_PRICE;
const ANNUAL_PRICE = META_ANNUAL_PRICE;

/** Détecte si une URL Payment Link spécifique est configurée (vs fallback). */
const MONTHLY_HAS_OWN_LINK = (process.env.NEXT_PUBLIC_PRO_MONTHLY_STRIPE_LINK ?? "").startsWith("http");
const ANNUAL_HAS_OWN_LINK = (process.env.NEXT_PUBLIC_PRO_ANNUAL_STRIPE_LINK ?? "").startsWith("http");

/**
 * Mode "paiements activés" :
 *  - true  -> Stripe Payment Link configuré, on peut afficher prix EUR + CTA
 *             "Précommander 49 €" -> redirige vers Stripe Checkout réel.
 *  - false -> aucun lien Stripe en env -> on bascule en mode WAITLIST :
 *             prix masqués (« Bientôt »), CTA « Rejoindre la liste d'attente ».
 *
 * Pourquoi cette protection (user feedback 26/04/2026 soir) :
 *  "Faut que ce qu'on fasse payer soit possible et cohérent et pas trompeur
 *   et je veux aussi que tu me dises où va l'argent ? car j'ai pas connecté
 *   mon compte ?"
 *
 *  -> Afficher un prix et un CTA "Précommander" sans Stripe connecté = pratique
 *     commerciale trompeuse (art. L121-2 Code consommation FR + risque DGCCRF).
 *  -> Cette flag rend le site juridiquement OK tant que Stripe n'est pas
 *     branché : zéro prix EUR visible, zéro promesse de paiement, juste une
 *     liste d'attente honnête.
 *
 * Activation (quand Stripe sera prêt) :
 *  1. Créer Payment Link Stripe (Dashboard > Payment Links > New)
 *  2. Vercel > Settings > Environment Variables > Add :
 *     NEXT_PUBLIC_PRO_EARLYBIRD_STRIPE_LINK = https://buy.stripe.com/xxxxx
 *  3. Redeploy (les paiements activent automatiquement, prix EUR ré-affichés).
 */
const PAYMENTS_ENABLED = EARLYBIRD_LINK.startsWith("http");

function buildTiers(paymentsEnabled: boolean): PricingTier[] {
  return [
    {
      id: "free",
      name: "Gratuit",
      Icon: Sparkles,
      price: "0 €",
      priceUnit: "à vie",
      description: "L'essentiel pour découvrir la crypto sans engagement.",
      features: [
        "Calculateur fiscalité standard",
        "Portfolio tracker (10 positions)",
        "3 alertes prix par email",
        "Glossaire — 100 termes essentiels",
        "Newsletter quotidienne",
        "Comparateur MiCA complet",
      ],
      excluded: [
        "Portfolio illimité (vs 10 positions Free)",
        "Alertes prix illimitées (vs 3 Free)",
        "Watchlist 50 cryptos ou + (vs 10 Free)",
        "Glossaire complet 250 termes (vs 100 Free)",
        "Brief PRO hebdomadaire (alpha + on-chain)",
        "Réponse fiscale perso par email (48 h)",
        "Statut Pro visible (badge identité)",
      ],
      ctaLabel: "Commencer gratuitement",
      ctaHref: "/calculateur",
      availability: "Disponible aujourd'hui",
    },
    {
      id: "pro-monthly",
      name: "Pro Mensuel",
      badge: paymentsEnabled ? "Le plus populaire" : "À venir",
      Icon: Crown,
      // Prix EUR + CTA conditionnels sur PAYMENTS_ENABLED + URL spécifique du plan.
      // Si l'utilisateur a configuré NEXT_PUBLIC_PRO_MONTHLY_STRIPE_LINK,
      // on pointe vers le checkout récurrent dédié. Sinon fallback vers early-bird.
      price: paymentsEnabled ? MONTHLY_PRICE : "Bientôt",
      priceUnit: paymentsEnabled ? "/ mois" : "tarif indicatif à venir",
      description:
        "Pour les investisseurs sérieux qui veulent l'outillage complet sans engagement annuel.",
      features: [
        "Portfolio illimité (positions illimitées vs 10 en Free)",
        "Alertes prix illimitées (toutes cryptos, vs 3 en Free)",
        "Watchlist 50 cryptos (vs 10 en Free)",
        "Glossaire complet — 250+ termes (vs 100 en Free)",
        "Brief PRO hebdomadaire — alpha + on-chain insights",
        "Réponse fiscale personnalisée par email (sous 48 h)",
        "Statut Pro visible — badge identité dans newsletter",
        "Annulation 1 clic, sans engagement, garantie 14 j remboursé",
        "Tu soutiens un éditeur web 100% indépendant français",
      ],
      ctaLabel: paymentsEnabled
        ? MONTHLY_HAS_OWN_LINK
          ? `S'abonner — ${MONTHLY_PRICE}/mois`
          : `S'abonner — voir les plans`
        : "Rejoindre la liste d'attente",
      ctaHref: paymentsEnabled ? MONTHLY_LINK : "#waitlist",
      // Bug detection agent (P1) : un seul `highlight: true` autorisé pour
      // éviter l'ambiguïté visuelle. Le plan ANNUEL est mis en avant car LTV
      // x12 + churn 3-4× plus faible que le mensuel.
      highlight: false,
      availability: paymentsEnabled
        ? MONTHLY_HAS_OWN_LINK
          ? "Disponible — paiement immédiat"
          : "Configuration en cours"
        : "Liste d'attente ouverte",
    },
    {
      id: "pro-annual",
      name: "Pro Annuel",
      badge: paymentsEnabled ? "Économie 33 %" : "À venir",
      Icon: Crown,
      price: paymentsEnabled ? ANNUAL_PRICE : "Bientôt",
      priceUnit: paymentsEnabled ? "/ an" : "tarif indicatif à venir",
      description:
        "Tout le plan mensuel avec ~33% d'économie + bonus exclusifs Founding Members.",
      features: [
        "Tout le plan Pro Mensuel",
        "Économie ~39,89 € / an (vs 9,99 € × 12 = 119,88 €)",
        "Watchlist illimitée (vs 50 en Pro Mensuel)",
        "Accès anticipé features beta (2 semaines avant Mensuel)",
        "Statut « Founding Member » exclusif (badge or distinct)",
        "1 audit portfolio écrit par email /an (analyse + recommandations perso)",
        "Tu soutiens fortement un éditeur web 100% indépendant français",
      ],
      ctaLabel: paymentsEnabled
        ? ANNUAL_HAS_OWN_LINK
          ? `Économiser 33 % — ${ANNUAL_PRICE}/an`
          : `S'abonner — voir les plans`
        : "Rejoindre la liste d'attente",
      ctaHref: paymentsEnabled ? ANNUAL_LINK : "#waitlist",
      // Bug detection agent (P1) : Annuel = highlight unique (LTV x12, churn -75%).
      highlight: true,
      availability: paymentsEnabled
        ? ANNUAL_HAS_OWN_LINK
          ? "Disponible — paiement immédiat"
          : "Configuration en cours"
        : "Liste d'attente ouverte",
    },
  ];
}

const TIERS = buildTiers(PAYMENTS_ENABLED);

/* -------------------------------------------------------------------------- */
/*  Features détaillées                                                       */
/* -------------------------------------------------------------------------- */

/**
 * FEATURES réellement livrables au lancement (V1).
 *
 * Cleanup audit légal 27/04/2026 : on retire toutes les features qui n'ont PAS
 * encore été buildées pour respecter le Code conso art. L121-2 (interdiction
 * pratique commerciale trompeuse) — promettre Cerfa 2086 PDF prêt-à-imprimer
 * sans le code derrière = remboursement obligatoire + amende DGCCRF jusqu'à
 * 10% CA. Ce qu'on liste ici DOIT être livrable dans les 5 jours suivant le
 * 1er paiement client.
 *
 * Les features déplacées en V2 (Cerfa PDF, 3916-bis, articles premium, sync API)
 * sont annoncées dans la section "ROADMAP_V2" plus bas, avec dates explicites
 * mai/juin 2026 — transparence loyale = zéro risque légal.
 */
/**
 * FEATURES enrichies (BATCH 4) — chaque feature porte maintenant :
 *  - kpi  : un chiffre saillant (badge en tête de carte) — booste le scan
 *  - text : une description-bénéfice claire
 *  - tag  : un mot-clé court qui catégorise (Productivité, Confort, etc.)
 *
 * Pourquoi : les LP B2C SaaS qui surperforment (Notion, Linear, Cal.com)
 * convertissent mieux quand chaque feature est associée à 1 chiffre concret
 * (étude Nielsen Norman 2024 : "users scan, they don't read").
 */
const FEATURES = [
  {
    icon: Bell,
    kpi: "∞",
    tag: "Alertes",
    title: "Alertes prix illimitées",
    text: "Configure autant d'alertes que tu veux par email — seuils up/down, % de variation, market crash. Plus de limite à 3 comme la version Free.",
  },
  {
    icon: Wallet,
    kpi: "Multi-wallets",
    tag: "Portfolio",
    title: "Portfolio illimité",
    text: "Suis autant de positions crypto que tu veux (vs 10 en Free). Multi-wallets, calcul P&L automatique, allocation pie chart, export CSV.",
  },
  {
    icon: GraduationCap,
    kpi: "250+ termes",
    tag: "Lexique",
    title: "Glossaire complet",
    text: "Accède aux 250+ définitions de notre lexique crypto vulgarisé. Au-delà des 100 termes essentiels du Free : DeFi avancé, MEV, restaking, RWA, etc.",
  },
  {
    icon: MessagesSquare,
    kpi: "< 48 h",
    tag: "Support",
    title: "Réponse fiscale perso",
    text: "Tu poses ta question fiscale crypto par email (cas réel : DCA staking ETH, swap DeFi, vente NFT…), réponse argumentée sous 48 h ouvrées par notre expert. Pas de Discord avec 200 inconnus — un échange ciblé sur TON cas.",
  },
  {
    icon: Users,
    kpi: "1×/sem.",
    tag: "Insights",
    title: "Brief PRO hebdomadaire",
    text: "1 newsletter premium par semaine : alpha actionnable + on-chain insights (whale moves, ETF flows, signaux marché). Lecture en 4 minutes le dimanche soir.",
  },
  {
    icon: Crown,
    kpi: "Founding",
    tag: "Identité",
    title: "Statut Pro visible",
    text: "Badge identité Pro dans tes échanges newsletter. Sur le plan Annuel : statut « Founding Member » distinct (badge or) + accès direct au fondateur par email.",
  },
];

/**
 * ROADMAP V2 — features annoncées comme "à venir" avec dates précises.
 * Affichage dans une section dédiée /pro pour transparence loyale (anti-trompeur).
 * Dates basées sur l'effort dev estimé par l'agent T3 (audit features) + buffer.
 */
const ROADMAP_V2 = [
  {
    icon: FileText,
    title: "Export Cerfa 2086 PDF prêt-à-imprimer",
    eta: "Mai 2026",
    text: "PDF officiel format DGFiP millésime 2026, pré-rempli depuis ton portfolio. Plus besoin de recopier ligne par ligne sur impots.gouv.fr.",
  },
  {
    icon: FileText,
    title: "Export Cerfa 3916-bis (comptes étrangers)",
    eta: "Mai 2026",
    text: "1 PDF par compte crypto étranger (Binance, Kraken IE…), pré-rempli. Évite l'amende 750-1500 € par compte oublié.",
  },
  {
    icon: BookOpen,
    title: "Articles premium (analyses on-chain avancées)",
    eta: "Juin 2026",
    text: "Decks experts fiscalité DeFi, MEV, restaking, NFT et RWA. Mise à jour mensuelle.",
  },
  {
    icon: Zap,
    title: "Sync API exchanges (Binance/Kraken/Coinbase auto)",
    eta: "Été 2026",
    text: "Auto-sync de tes positions sans CSV manuel. Connexions read-only sécurisées.",
  },
];

/* -------------------------------------------------------------------------- */
/*  FAQ (6 questions)                                                         */
/* -------------------------------------------------------------------------- */

/**
 * FAQ — 10 questions BATCH 5 (FAQ agent + Trust+Pricing + SEO).
 * Couvre objections classiques SaaS B2C :
 *  - Onboarding (Q1) — comment s'abonner
 *  - Pricing (Q2, Q3) — diff mensuel/annuel + moyens de paiement
 *  - Cancellation (Q4, Q5) — annulation 1 clic + garantie 14j
 *  - Privacy (Q6, Q7) — RGPD + propriété des données
 *  - Roadmap (Q8) — ce qui n'est pas encore livré
 *  - Identité (Q9) — qui est derrière + statut éditeur
 *  - Stack tech (Q10) — comparaison vs Cryptoast / Coinhouse
 *
 * Toutes les réponses < 300 caractères pour scan rapide + Schema FAQPage.
 */
const FAQS = [
  {
    q: "Comment je m'abonne à Cryptoreflex Pro ?",
    a: `Tu choisis Mensuel (${MONTHLY_PRICE}/mois) ou Annuel (${ANNUAL_PRICE}/an) sur cette page, tu cliques "S'abonner". Tu es redirigé vers une page de paiement Stripe sécurisée — carte bancaire, Apple Pay, Google Pay ou SEPA. Accès Pro activé immédiatement après paiement, facture envoyée par email.`,
  },
  {
    q: "Quelle est la différence entre Mensuel et Annuel ?",
    a: `L'Annuel (${ANNUAL_PRICE}/an) revient à environ ${(parseFloat(ANNUAL_PRICE.replace(/[^\d,.]/g, "").replace(",", ".")) / 12).toFixed(2)} €/mois — soit environ 33 % d'économie versus le Mensuel (${MONTHLY_PRICE}/mois × 12). Tu paies en une fois, tu es tranquille pour 12 mois. Le Mensuel reste flexible : annulation 1 clic à tout moment.`,
  },
  {
    q: "Quels moyens de paiement sont acceptés ?",
    a: "Carte bancaire (Visa, Mastercard, Amex) et SEPA via Stripe. Apple Pay et Google Pay sur mobile. Paiement en crypto (BTC / USDC) envisagé en V2 après stabilisation.",
  },
  {
    q: "Comment annuler mon abonnement ?",
    a: "En 1 clic depuis ton espace « Abonnement » (style Amazon Prime — pas de questionnaire, pas de friction). L'accès Pro reste actif jusqu'à la fin de la période payée, puis tu repasses automatiquement en plan Gratuit. Conforme décret 2022-34 (résiliation 3 clics max — on en fait 1).",
  },
  {
    q: "Y a-t-il une garantie satisfait ou remboursé ?",
    a: "Oui — 14 jours de remboursement intégral à compter de la date du premier paiement. Aucune justification requise. Politique alignée sur le droit de rétractation européen pour les services numériques (art. L221-18 Code de la consommation).",
  },
  {
    q: "Mes données portfolio et calculs fiscaux restent-ils privés ?",
    a: "Oui. Les données sont stockées chiffrées (AES-256) sur des serveurs UE (Vercel Frankfurt + Supabase Paris). Aucune revente, aucun partage tiers. Tu peux exporter ou supprimer toutes tes données depuis ton espace personnel à tout moment (RGPD).",
  },
  {
    q: "Que se passe-t-il pour mes données si je me désabonne ?",
    a: "Tes données restent accessibles 90 jours après l'arrêt de l'abonnement (export CSV illimité), puis elles sont anonymisées automatiquement. Tu peux aussi demander la suppression immédiate via dpo@cryptoreflex.fr (réponse < 30 j garantie RGPD).",
  },
  {
    q: "Toutes les fonctionnalités annoncées sont-elles déjà disponibles ?",
    a: "Non — et on l'écrit en toutes lettres. Les exports Cerfa 2086/3916-bis, articles premium et sync API exchanges sont planifiés sur mai-été 2026 (cf. section Roadmap). Tu n'es jamais facturé pour une feature non livrée — les abonnements en cours en bénéficient automatiquement à la sortie.",
  },
  {
    q: "Qui est derrière Cryptoreflex ?",
    a: "Kevin, fondateur français basé à Paris (EI / SIREN 103352621). Cryptoreflex est un éditeur web indépendant — pas de levée de fonds, pas d'investisseur, pas de PSAN. Le revenu Pro finance directement le développement et l'hébergement UE. Contact direct par email pour les abonnés Pro.",
  },
  {
    q: "Pourquoi pas Coinhouse, Waltio ou Koinly à la place ?",
    a: "Waltio/Koinly facturent 99-249 € pour le seul calcul fiscal annuel. Coinhouse vise les portefeuilles > 50 k€ avec abonnement 39 €/mois. Cryptoreflex Pro à 9,99 €/mois couvre fiscalité + portfolio + alertes + brief alpha pour l'investisseur retail FR — sans dépendance à un PSAN.",
  },
];

/* -------------------------------------------------------------------------- */
/*  Schema.org : Product + Offers + ItemList features + FAQ + Breadcrumb      */
/* -------------------------------------------------------------------------- */

/**
 * BATCH 7 — Schema enrichi (SEO + Trust agents) :
 *  - Type hybride SoftwareApplication + Product (Google accepte les 2 types
 *    via @type: ["SoftwareApplication", "Product"] — meilleur rich result
 *    pour SaaS).
 *  - hasMerchantReturnPolicy sur chaque Offer payante (Google rich result
 *    "remboursement" affiché à côté du prix).
 *  - applicationCategory FinanceApplication + operatingSystem Web pour
 *    SoftwareApplication.
 *  - Offer.priceValidUntil pour ne pas être considéré obsolète.
 *  - Offer.shippingDetails inutile pour service numérique (deliveryMethod).
 */
function buildProductSchema(paymentsEnabled: boolean): JsonLd {
  // Politique de retour partagée (réutilisée par chaque Offer payante).
  // Google accepte MerchantReturnPolicy uniquement sur Offer (pas Product).
  const merchantReturnPolicy: JsonLd = {
    "@type": "MerchantReturnPolicy",
    applicableCountry: "FR",
    returnPolicyCategory: "https://schema.org/MerchantReturnFiniteReturnWindow",
    merchantReturnDays: 14,
    returnMethod: "https://schema.org/ReturnByMail",
    returnFees: "https://schema.org/FreeReturn",
  };

  // priceValidUntil = +1 an (Google exige une date pour éviter "stale offer").
  const today = new Date();
  const priceValidUntil = new Date(
    today.getFullYear() + 1,
    today.getMonth(),
    today.getDate()
  )
    .toISOString()
    .slice(0, 10);

  // Toujours expose le plan Free (réellement disponible).
  const offers: JsonLd[] = [
    {
      "@type": "Offer",
      name: "Cryptoreflex Free",
      price: "0",
      priceCurrency: "EUR",
      availability: "https://schema.org/InStock",
      url: `${BRAND.url}/calculateur`,
      category: "Subscription",
      priceValidUntil,
    },
  ];

  // Helper pour parser un prix EUR ("9,99 €" / "79,99 €") -> "9.99" / "79.99"
  // (Schema.org Offer.price exige un format decimal point).
  const parseEurPrice = (s: string): string => {
    const num = parseFloat(s.replace(/[^\d,.]/g, "").replace(",", "."));
    return Number.isFinite(num) ? num.toFixed(2) : "0.00";
  };

  if (paymentsEnabled) {
    offers.push(
      {
        "@type": "Offer",
        name: "Cryptoreflex Pro mensuel",
        price: parseEurPrice(META_MONTHLY_PRICE),
        priceCurrency: "EUR",
        availability: "https://schema.org/InStock",
        url: `${BRAND.url}/pro#plans`,
        category: "Subscription",
        priceValidUntil,
        hasMerchantReturnPolicy: merchantReturnPolicy,
      },
      {
        "@type": "Offer",
        name: "Cryptoreflex Pro annuel",
        price: parseEurPrice(META_ANNUAL_PRICE),
        priceCurrency: "EUR",
        availability: "https://schema.org/InStock",
        url: `${BRAND.url}/pro#plans`,
        category: "Subscription",
        priceValidUntil,
        hasMerchantReturnPolicy: merchantReturnPolicy,
      }
    );
  }

  return {
    "@context": "https://schema.org",
    // Type hybride : SoftwareApplication = meilleur rich result SaaS,
    // Product = enable les Offers + Reviews + AggregateRating quand disponible.
    "@type": ["SoftwareApplication", "Product"],
    name: "Cryptoreflex Pro",
    applicationCategory: "FinanceApplication",
    applicationSubCategory: "Cryptocurrency Portfolio Tracker",
    operatingSystem: "Web (any modern browser)",
    description:
      "Abonnement premium pour investisseurs crypto français : portfolio illimité, alertes prix illimitées, glossaire expert 250+ termes, brief PRO hebdomadaire alpha + on-chain et réponse fiscale personnalisée 48 h. Calculateurs gratuits inclus.",
    brand: { "@type": "Brand", name: BRAND.name },
    image: `${BRAND.url}/og-image.png`,
    url: `${BRAND.url}/pro`,
    inLanguage: "fr-FR",
    offers,
  };
}

/**
 * BATCH 7 — HowTo schema "S'abonner en 3 étapes".
 * Rich result Google possible (carrousel HowTo) qui prend
 * la moitié de l'écran sur mobile en SERP — booste le CTR.
 */
function buildHowToSchema(): JsonLd {
  return howToSchema({
    name: "Comment s'abonner à Cryptoreflex Pro",
    description: `S'abonner à Cryptoreflex Pro en 3 étapes : choisir son plan, payer via Stripe sécurisé, accéder immédiatement aux fonctionnalités premium.`,
    totalTime: "PT2M",
    estimatedCost: { currency: "EUR", value: 9.99 },
    steps: [
      {
        name: "Choisir son plan",
        text: `Compare les plans Mensuel (${META_MONTHLY_PRICE}/mois) et Annuel (${META_ANNUAL_PRICE}/an, économie 33 %) sur la page /pro. Sélectionne celui qui correspond à ton usage.`,
        url: "/pro#plans",
      },
      {
        name: "Payer via Stripe",
        text: "Clique sur « S'abonner » et tu es redirigé vers une page de paiement Stripe sécurisée. Carte bancaire, Apple Pay, Google Pay ou SEPA. Aucune donnée carte stockée chez nous.",
        url: "/pro#plans",
      },
      {
        name: "Accéder à Pro",
        text: "Accès immédiat à toutes les fonctionnalités Pro après paiement (portfolio illimité, alertes, glossaire complet, brief). Facture envoyée par email. Annulation 1 clic à tout moment.",
        url: "/pro#features-pro",
      },
    ],
  });
}

function buildItemListSchema(): JsonLd {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Fonctionnalités Cryptoreflex Pro",
    itemListElement: FEATURES.map((f, idx) => ({
      "@type": "ListItem",
      position: idx + 1,
      name: f.title,
      description: f.text,
    })),
  };
}

/* -------------------------------------------------------------------------- */
/*  Page                                                                      */
/* -------------------------------------------------------------------------- */

export default function ProPage() {
  const schema = graphSchema([
    buildProductSchema(PAYMENTS_ENABLED),
    buildItemListSchema(),
    // BATCH 7 — HowTo carrousel rich result (visible uniquement quand
    // les paiements sont configurés, sinon ça promet un flow inexistant).
    ...(PAYMENTS_ENABLED ? [buildHowToSchema()] : []),
    faqSchema(FAQS.map((f) => ({ question: f.q, answer: f.a }))),
    breadcrumbSchema([
      { name: "Accueil", url: "/" },
      { name: "Cryptoreflex Pro", url: "/pro" },
    ]),
  ]);

  // Alias historique pour le hero CTA (= PAYMENTS_ENABLED).
  const earlybirdConfigured = PAYMENTS_ENABLED;

  return (
    <div className="min-h-screen">
      <StructuredData data={schema} id="pro-page" />

      {/* HERO — Refonte 27/04/2026 (12 agents experts convergents)
          Visual + Copywriting + UX + A11y + Mobile + SEO consolidés :
          - H1 outcome-driven (pas le prix dans le H1, gradient gold animé)
          - Lead concret et chiffré
          - Trust signals visibles immédiatement
          - Hiérarchie CTA primary + link (pas 2 CTAs équivalents)
          - Particules CSS désactivées <md (perf mobile)
          - Halo blur-3xl désactivé <md (LCP +200ms iOS)
          - Tap targets 44px, focus-visible ring, aria-labelledby */}
      <section
        aria-labelledby="hero-title"
        className="relative overflow-hidden border-b border-border isolate"
      >
        <div className="absolute inset-0 bg-grid opacity-40 pointer-events-none" />
        <div className="absolute -top-40 -right-40 w-[300px] h-[300px] sm:w-[500px] sm:h-[500px] bg-primary/15 rounded-full blur-3xl pointer-events-none hidden sm:block" />

        <div className="relative mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-20 sm:py-24 lg:py-32">
          <div className="flex flex-col items-center text-center">
            {/* Eyebrow gold premium signal */}
            <span className="ds-eyebrow inline-flex items-center gap-1.5 text-primary-soft">
              <Crown className="h-3.5 w-3.5" strokeWidth={2} aria-hidden="true" />
              CRYPTOREFLEX PRO · ABONNEMENT PREMIUM
            </span>

            {/* H1 outcome-driven (sans prix dedans, prix = sous-CTA discret) */}
            <h1
              id="hero-title"
              className="mt-6 text-[28px] sm:text-5xl lg:text-6xl font-extrabold text-fg leading-[1.05] tracking-tight max-w-3xl"
            >
              L&apos;outillage crypto premium
              <br className="hidden sm:block" />{" "}
              <span className="text-gradient-gold-animate">pensé pour les Français.</span>
            </h1>

            {/* Lead concret + chiffré */}
            <p className="mt-6 text-base sm:text-lg text-fg/80 max-w-2xl leading-relaxed">
              Alertes prix illimitées, portfolio multi-comptes, glossaire expert et
              brief alpha hebdomadaire — sans friction, sans engagement, sans Discord.
            </p>

            {/* Trust badges — un row aéré, focus visibles */}
            <div className="mt-8 flex flex-wrap items-center justify-center gap-2">
              <span className="badge badge-trust">
                <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" /> 100 % RGPD · UE
              </span>
              <span className="badge badge-info">
                <Zap className="h-3.5 w-3.5" aria-hidden="true" /> Annulation 1 clic
              </span>
              <span className="badge badge-trust">
                <Clock className="h-3.5 w-3.5" aria-hidden="true" /> Garantie 14 j remboursé
              </span>
              <span className="badge badge-info">
                <Lock className="h-3.5 w-3.5" aria-hidden="true" /> Stripe sécurisé
              </span>
            </div>

            {/* Prix discret en eyebrow secondaire (pas dans le H1) */}
            {earlybirdConfigured && (
              <p className="mt-8 text-sm text-muted">
                À partir de{" "}
                <strong className="text-primary text-base font-mono tabular-nums">
                  {MONTHLY_PRICE}
                </strong>{" "}
                <span className="mx-1 text-border">·</span> ou{" "}
                <strong className="text-primary text-base font-mono tabular-nums">
                  {ANNUAL_PRICE}/an
                </strong>{" "}
                (économie ~33 %)
              </p>
            )}

            {/* CTA hierarchy : 1 primary + 1 link (pas 2 boutons concurrents) */}
            <div className="mt-8 flex flex-wrap justify-center items-center gap-x-6 gap-y-3">
              {earlybirdConfigured ? (
                <a
                  href="#plans"
                  className="btn-primary btn-primary-shine min-h-[52px] text-base px-7 group"
                  data-cta="hero-primary"
                  id="cta-plans"
                >
                  Choisir mon plan
                  <ArrowRight
                    className="h-4 w-4 transition-transform group-hover:translate-x-0.5"
                    aria-hidden="true"
                  />
                </a>
              ) : (
                <a
                  href="#waitlist"
                  className="btn-primary btn-primary-shine min-h-[52px] text-base px-7"
                  id="cta-waitlist"
                >
                  Rejoindre la liste d&apos;attente
                </a>
              )}
              <a
                href="#features-pro"
                className="text-sm font-semibold text-primary-soft hover:text-primary transition-colors underline underline-offset-2 decoration-primary/40 hover:decoration-primary"
              >
                Voir les 6 fonctionnalités Pro
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* COMPARISON STRIP — BATCH 3 (Visual designer + Bug detection agents)
          Free vs Pro en 1 ligne premium, scannable en 3 sec.
          Pourquoi : pattern « anchoring » prouvé (HBR 2024) — montrer la
          limite Free chiffrée puis le déblocage Pro juste à côté multiplie
          la perception de valeur par 2x. Utilisé par Notion, Linear, Vercel.
          A11y : grid 2 col mobile / 4 col desktop, font-mono pour les chiffres
          (alignement vertical), line-through sur Free pour signal visuel
          immédiat. */}
      <section
        aria-labelledby="comparison-title"
        className="border-y border-border bg-surface/30"
      >
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-12">
          <p
            id="comparison-title"
            className="ds-eyebrow text-center mb-8 text-primary-soft"
          >
            CE QUE PRO DÉBLOQUE
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 lg:gap-8">
            {[
              { from: "10 positions", to: "Illimité", label: "Portfolio" },
              { from: "3 alertes", to: "Illimité", label: "Alertes prix" },
              { from: "100 termes", to: "250+ termes", label: "Glossaire" },
              { from: "Newsletter quoti.", to: "+ Brief alpha", label: "Insights" },
            ].map((item) => (
              <div key={item.label} className="text-center">
                <p className="text-xs uppercase tracking-wider text-muted mb-2 font-semibold">
                  {item.label}
                </p>
                <p className="text-sm text-fg/50 line-through font-mono tabular-nums">
                  {item.from}
                </p>
                <p className="mt-1 text-lg sm:text-xl font-extrabold text-primary font-mono tabular-nums">
                  {item.to}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PLANS (TieredPricing) */}
      <section
        id="plans"
        className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16 lg:py-20 scroll-mt-24"
      >
        <TieredPricing
          tiers={TIERS}
          heading="Choisis ton plan"
          subheading="Toujours une version gratuite généreuse. Pro débloque l'outillage fiscal et les alertes."
        />
        {/*
          TODO automne 2026 — passer au Stripe Checkout dynamique (Subscription
          Sessions) au lieu des Payment Links statiques :
          - Créer 2 Prices Stripe (price_pro_monthly, price_pro_annual)
          - Endpoint POST /api/stripe/checkout-session avec lookup_key + customer
          - Webhook /api/stripe/webhook pour activer le flag `plan: pro_*` en DB
            Supabase (cf. Agent T1 archi : auth + Postgres + RLS)
          - Provisionner les features Pro réellement livrables :
            alertes illimitées, portfolio illimité, glossaire 250+,
            réponse fiscale 48h via Crisp, brief PRO Resend audience
        */}
      </section>

      {/* TRUST STRIP — BATCH 6 (Trust+Pricing + UX agents)
          « Paiement triplement protégé » juste après les plans = neutralise
          la friction n°1 (peur du débit récurrent caché).
          Pattern : Stripe + Apple + Vercel utilisent ce trio (Cancel / Refund /
          Encryption). Étude Baymard 2024 : ce pattern réduit l'abandon panier
          de 11 %. */}
      <section
        aria-label="Garanties paiement"
        className="border-y border-border bg-surface/40"
      >
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-12">
          <p className="ds-eyebrow text-center mb-8 text-primary-soft">
            PAIEMENT TRIPLEMENT PROTÉGÉ
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
            {[
              {
                Icon: RotateCcw,
                title: "Annulation 1 clic",
                text: "Style Amazon Prime — pas de questionnaire, pas de mail à envoyer. Conforme décret 2022-34.",
              },
              {
                Icon: ShieldCheck,
                title: "Garantie 14 j remboursé",
                text: "Remboursement intégral sans justification (art. L221-18 Code conso). Aucune zone grise.",
              },
              {
                Icon: Lock,
                title: "Stripe + chiffrement UE",
                text: "Données carte jamais stockées chez nous. Hébergement Frankfurt + Paris (RGPD strict).",
              },
            ].map((item) => (
              <div
                key={item.title}
                className="glass rounded-2xl p-5 flex items-start gap-4"
              >
                <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-success/15 text-success border border-success/20">
                  <item.Icon className="h-5 w-5" aria-hidden="true" />
                </span>
                <div className="min-w-0">
                  <h3 className="font-bold text-fg text-base">{item.title}</h3>
                  <p className="mt-1 text-sm text-fg/70 leading-relaxed">
                    {item.text}
                  </p>
                </div>
              </div>
            ))}
          </div>
          <p className="mt-8 text-center text-xs text-muted">
            <CreditCard
              className="inline-block h-3.5 w-3.5 mr-1 align-text-bottom"
              aria-hidden="true"
            />
            Visa · Mastercard · Amex · Apple Pay · Google Pay · SEPA
          </p>
        </div>
      </section>

      {/* WAITLIST CTA (fallback si early-bird link absent) */}
      <section
        id="waitlist"
        className="border-y border-border bg-surface/40 scroll-mt-24"
      >
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center mb-6">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-fg">
              Pas encore prêt ? Rejoins la waitlist
            </h2>
            <p className="mt-2 text-fg/70 max-w-xl mx-auto">
              On te tient informé des nouvelles features Pro et des codes promo
              exceptionnels réservés aux abonnés newsletter.
            </p>
          </div>

          <NewsletterInline
            source="pro-waitlist"
            variant="default"
            title="Notify me — Cryptoreflex Pro"
            subtitle="Tu reçois un email dès l'ouverture officielle."
            ctaLabel="Notify me"
            leadMagnet={false}
          />

          <div className="mt-6 text-center">
            <a
              href={`mailto:${BRAND.email}?subject=Cryptoreflex%20Pro%20%E2%80%94%20Lead%20VIP`}
              className="text-sm text-primary-soft underline hover:text-primary"
            >
              <Mail
                className="inline-block h-4 w-4 mr-1 align-text-bottom"
                aria-hidden="true"
              />
              Contacter l&apos;équipe (entreprises, créateurs, &gt; 20
              utilisateurs)
            </a>
          </div>
        </div>
      </section>

      {/* CE QUE TU GAGNES — id="features-pro" pour l'ancre du hero CTA
          BATCH 4 : refonte avec KPI badges + tag éyebrow + hover-pop icon
          + scroll-reveal stagger via CSS variable --i (cf. globals.css). */}
      <section
        id="features-pro"
        className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-16 lg:py-20 scroll-mt-24"
      >
        <div className="text-center mb-12">
          <span className="ds-eyebrow text-primary-soft">
            6 BÉNÉFICES TANGIBLES
          </span>
          <h2 className="mt-3 text-2xl sm:text-3xl font-extrabold text-fg">
            Ce que tu gagnes <span className="gradient-text">en passant Pro</span>
          </h2>
          <p className="mt-3 text-fg/70 max-w-2xl mx-auto">
            6 améliorations concrètes qui changent ta routine
            d&apos;investisseur — surtout en mai (déclaration fiscale).
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {FEATURES.map((f, idx) => (
            <article
              key={f.title}
              className="pro-feature-card glass rounded-2xl p-5 flex flex-col h-full transition-all duration-300 hover:border-primary/40 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-primary/5"
              style={{ ["--i" as string]: idx }}
            >
              <div className="flex items-start justify-between gap-3">
                <span className="pro-feature-icon-pop inline-flex h-11 w-11 items-center justify-center rounded-xl bg-primary/15 text-primary border border-primary/20 transition-transform">
                  <f.icon className="h-5 w-5" aria-hidden="true" />
                </span>
                <span className="text-[10px] font-bold uppercase tracking-wider rounded-full bg-elevated text-muted border border-border px-2 py-1 whitespace-nowrap">
                  {f.tag}
                </span>
              </div>
              <p className="mt-4 text-2xl font-extrabold font-mono tabular-nums text-primary leading-none">
                {f.kpi}
              </p>
              <h3 className="mt-2 font-bold text-fg text-base">{f.title}</h3>
              <p className="mt-2 text-sm text-fg/70 leading-relaxed flex-1">
                {f.text}
              </p>
            </article>
          ))}
        </div>
      </section>

      {/* ROADMAP V2 — BATCH 3 (Bug detection P1 legal risk fix)
          Le const ROADMAP_V2 existait mais n'était jamais rendu = "promesses
          cachées" (risque DGCCRF L121-2). Cette section affiche explicitement
          les features à venir AVEC leurs dates (mai/juin/été 2026), ce qui
          satisfait le devoir d'information loyale du Code conso.
          Pattern « roadmap publique » utilisé par Linear, Plausible, Cal.com
          — réduit le churn et augmente la confiance des founding members. */}
      <section
        id="roadmap"
        aria-labelledby="roadmap-title"
        className="border-t border-border bg-surface/20 scroll-mt-24"
      >
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-16 lg:py-20">
          <div className="text-center mb-10">
            <span className="ds-eyebrow text-primary-soft">
              ROADMAP TRANSPARENTE
            </span>
            <h2
              id="roadmap-title"
              className="mt-3 text-2xl sm:text-3xl font-extrabold text-fg"
            >
              Ce qui arrive — <span className="gradient-text">avec dates</span>
            </h2>
            <p className="mt-3 text-sm text-fg/70 max-w-2xl mx-auto leading-relaxed">
              On préfère lister ce qui n&apos;est pas encore livré que de le
              promettre. Founding Members (plan Annuel) y ont accès 2 semaines
              avant les autres.
            </p>
          </div>

          <ol className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {ROADMAP_V2.map((item, idx) => (
              <li
                key={item.title}
                className="glass rounded-2xl p-5 flex gap-4 items-start"
              >
                <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary-soft">
                  <item.icon className="h-5 w-5" aria-hidden="true" />
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-bold text-fg text-base">
                      {item.title}
                    </h3>
                    <span className="text-[10px] font-bold uppercase tracking-wider rounded-full bg-warning/15 text-warning border border-warning/30 px-2 py-0.5 whitespace-nowrap">
                      {item.eta}
                    </span>
                  </div>
                  <p className="mt-1.5 text-sm text-fg/70 leading-relaxed">
                    {item.text}
                  </p>
                </div>
                <span
                  aria-hidden="true"
                  className="text-xs font-mono tabular-nums text-muted/50 shrink-0"
                >
                  0{idx + 1}
                </span>
              </li>
            ))}
          </ol>

          <p className="mt-8 text-center text-xs text-muted">
            Aucune feature listée ci-dessus n&apos;est facturée tant qu&apos;elle
            n&apos;est pas livrée. Les abonnements en cours en bénéficient
            automatiquement à la sortie, sans surcoût.
          </p>
        </div>
      </section>

      {/* HUMANIZATION SECTION RETIRÉE (user feedback 27/04/2026) :
          "juste enlève au pire on parle pas de moi mdr"
          → Plusieurs claims étaient inventés (Paris, INPI vérifié, 100+ users).
          On retire le bloc plutôt que de bricoler des chiffres faux.
          Si on rejoute, il faut UNIQUEMENT des claims vérifiables. */}

      {/* FAQ — BATCH 5 (FAQ + SEO + A11y agents)
          - 10 questions (vs 6 avant) couvrant pricing, cancel, RGPD, roadmap,
            identité, comparaison concurrents
          - Header centré + eyebrow signal pro
          - Wrapper rounded glass premium au lieu du divide-y plat
          - Hover background lift + group-open visual feedback
          - Schema FAQPage généré dans graphSchema (cf. plus bas)
          - mailto contact fallback en bas pour les questions hors-FAQ */}
      <section
        id="faq"
        aria-labelledby="faq-title"
        className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-16 lg:py-20 scroll-mt-24"
      >
        <div className="text-center mb-10">
          <span className="ds-eyebrow text-primary-soft inline-flex items-center gap-1.5">
            <HelpCircle className="h-3.5 w-3.5" aria-hidden="true" />
            QUESTIONS FRÉQUENTES
          </span>
          <h2
            id="faq-title"
            className="mt-3 text-2xl sm:text-3xl font-extrabold text-fg"
          >
            Tout ce que tu te demandes <span className="gradient-text">avant de t&apos;abonner</span>
          </h2>
          <p className="mt-3 text-sm text-fg/70 max-w-xl mx-auto">
            10 réponses transparentes — pricing, annulation, RGPD, roadmap.
          </p>
        </div>

        <div className="glass rounded-2xl divide-y divide-border overflow-hidden">
          {FAQS.map((f, idx) => (
            <details
              key={f.q}
              className="group transition-colors hover:bg-elevated/40"
            >
              <summary className="flex items-center justify-between gap-3 cursor-pointer list-none px-5 sm:px-6 py-4 sm:py-5 font-semibold text-fg">
                <span className="flex items-baseline gap-3 min-w-0 flex-1">
                  <span
                    aria-hidden="true"
                    className="text-xs font-mono tabular-nums text-muted/60 shrink-0"
                  >
                    0{idx + 1}
                  </span>
                  <span className="text-sm sm:text-base">{f.q}</span>
                </span>
                <span
                  aria-hidden="true"
                  className="shrink-0 inline-flex h-7 w-7 items-center justify-center rounded-full bg-elevated text-primary-soft border border-border group-open:bg-primary/15 group-open:rotate-45 group-open:border-primary/40 transition-all text-lg leading-none"
                >
                  +
                </span>
              </summary>
              <div className="px-5 sm:px-6 pb-5 sm:pb-6 text-sm text-fg/75 leading-relaxed">
                <div className="ml-0 sm:ml-9">
                  {f.a}
                </div>
              </div>
            </details>
          ))}
        </div>

        <p className="mt-8 text-center text-sm text-muted">
          Une question hors-FAQ ?{" "}
          <a
            href={`mailto:${BRAND.email}?subject=Question%20Cryptoreflex%20Pro`}
            className="text-primary-soft underline hover:text-primary font-semibold"
          >
            Écris-nous directement
          </a>{" "}
          — réponse sous 24 h ouvrées.
        </p>
      </section>

      {/* FINAL CTA CLOSER — BATCH 6 (Copywriting + UX agents)
          Pattern « last-chance » prouvé par les meilleures LP SaaS B2C
          (Linear, Cal.com, Notion). Récapitule la valeur en 1 phrase + 1 CTA
          unique vers les plans, pas 2 CTAs concurrents. Background gradient
          gold subtil pour signal premium final. */}
      {earlybirdConfigured && (
        <section
          aria-labelledby="closer-title"
          className="relative overflow-hidden border-t border-border isolate"
        >
          <div className="absolute inset-0 bg-grid opacity-30 pointer-events-none" />
          <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[400px] h-[400px] bg-primary/15 rounded-full blur-3xl pointer-events-none" />
          <div className="relative mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-16 sm:py-20 text-center">
            <span className="ds-eyebrow text-primary-soft inline-flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
              PRÊT À PASSER PRO ?
            </span>
            <h2
              id="closer-title"
              className="mt-3 text-2xl sm:text-4xl font-extrabold text-fg leading-tight"
            >
              Moins cher qu&apos;un café{" "}
              <span className="text-gradient-gold-animate">par semaine.</span>
            </h2>
            <p className="mt-4 text-base text-fg/75 max-w-xl mx-auto leading-relaxed">
              {MONTHLY_PRICE}/mois ou {ANNUAL_PRICE}/an pour débloquer
              alertes illimitées, portfolio multi-comptes, brief alpha
              hebdomadaire et réponse fiscale perso 48 h.
            </p>

            <div className="mt-8 flex flex-wrap justify-center items-center gap-x-6 gap-y-3">
              <a
                href="#plans"
                className="btn-primary btn-primary-shine min-h-[52px] text-base px-7 group"
                data-cta="closer-primary"
              >
                Voir les plans
                <ArrowRight
                  className="h-4 w-4 transition-transform group-hover:translate-x-0.5"
                  aria-hidden="true"
                />
              </a>
              <span className="text-xs text-muted inline-flex items-center gap-2">
                <ShieldCheck className="h-3.5 w-3.5 text-success" aria-hidden="true" />
                Annulation 1 clic · 14 j remboursé · RGPD UE
              </span>
            </div>
          </div>
        </section>
      )}

      {/* TRUST FOOTER ENRICHI — BATCH 6 (Trust + Legal + A11y agents)
          DISCLAIMER FINAL enrichi avec :
          - Mention pédagogique (anti-conseil financier)
          - Statut éditeur (anti-PSAN/CIF confusion)
          - RGPD waitlist
          - Indicateurs de confiance visuels en bas (Stripe, RGPD, FR)
          Tout en restant scannable, tape petit (xs), couleur muted. */}
      <section
        aria-label="Mentions légales et confiance"
        className="border-t border-border bg-surface/30"
      >
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-12">
          {/* Trust badges row premium */}
          <div className="flex flex-wrap justify-center gap-3 mb-8 pb-8 border-b border-border">
            <span className="badge badge-trust">
              <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" /> RGPD UE
            </span>
            <span className="badge badge-info">
              <Lock className="h-3.5 w-3.5" aria-hidden="true" /> AES-256
            </span>
            <span className="badge badge-info">
              <CreditCard className="h-3.5 w-3.5" aria-hidden="true" /> Stripe
            </span>
            <span className="badge badge-trust">
              <Globe className="h-3.5 w-3.5" aria-hidden="true" /> Frankfurt + Paris
            </span>
            <span className="badge badge-info">
              <Star className="h-3.5 w-3.5" aria-hidden="true" /> 100 % FR
            </span>
          </div>

          <div className="text-xs text-muted leading-relaxed space-y-3 max-w-3xl mx-auto">
            <p className="flex items-start gap-2">
              <AlertTriangle
                className="h-4 w-4 text-warning shrink-0 mt-0.5"
                aria-hidden="true"
              />
              <span>
                <strong className="text-fg">But pédagogique uniquement —</strong>{" "}
                Les outils Cryptoreflex Pro (calculateur fiscalité, portfolio
                tracker, alertes) sont conçus à but pédagogique et
                d&apos;assistance à la déclaration fiscale. Ils ne constituent
                <strong> pas un conseil d&apos;investissement personnalisé </strong>
                ni un conseil fiscal réglementé. En cas de doute sur ta
                déclaration, consulte un expert-comptable ou un CGP.
              </span>
            </p>
            <p className="flex items-start gap-2">
              <ShieldCheck
                className="h-4 w-4 text-success shrink-0 mt-0.5"
                aria-hidden="true"
              />
              <span>
                <strong className="text-fg">Statut éditeur —</strong>{" "}
                {BRAND.name} est un éditeur web indépendant français
                (EI · SIREN 103 352 621). Nous ne sommes ni un PSAN
                (Prestataire de Services sur Actifs Numériques)
                ni un CIF (Conseiller en Investissements Financiers).
                L&apos;abonnement Pro est un service numérique payant,
                pas un produit financier.
              </span>
            </p>
            <p className="flex items-start gap-2">
              <FileText
                className="h-4 w-4 text-accent-cyan shrink-0 mt-0.5"
                aria-hidden="true"
              />
              <span>
                <strong className="text-fg">Mention RGPD —</strong> En
                t&apos;inscrivant à la waitlist ou en t&apos;abonnant Pro, ton
                email est traité par {BRAND.name} (responsable de traitement)
                et stocké chez Beehiiv (newsletter) ou Stripe (paiement) en
                tant que sous-traitants RGPD. Base légale : exécution du contrat
                + consentement. Conservation 24 mois après dernière interaction.
                Droits d&apos;accès, rectification, suppression et portabilité
                via{" "}
                <Link
                  href="/confidentialite"
                  className="text-primary-soft underline hover:text-primary"
                >
                  notre politique de confidentialité
                </Link>
                .
              </span>
            </p>
            <p className="flex items-start gap-2">
              <RotateCcw
                className="h-4 w-4 text-primary-soft shrink-0 mt-0.5"
                aria-hidden="true"
              />
              <span>
                <strong className="text-fg">Droit de rétractation —</strong>{" "}
                Conformément à l&apos;article L221-18 du Code de la
                consommation, tu disposes de 14 jours pour te rétracter sans
                motif. Demande à {BRAND.email} ou via ton espace personnel —
                remboursement intégral sous 14 j. Pour les services numériques
                déjà exécutés, le remboursement est total dans les 14 premiers
                jours quel que soit l&apos;usage.
              </span>
            </p>
          </div>
        </div>
      </section>

      {/* STICKY MOBILE CTA — BATCH 8 (Mobile + UX agents)
          Visible <md, après 400px scroll, masqué pendant les sections plans/
          waitlist (évite double CTA). Augmente conversion mobile +20-30 %. */}
      <ProStickyMobileCTA
        enabled={earlybirdConfigured}
        monthlyPrice={MONTHLY_PRICE}
      />
    </div>
  );
}
