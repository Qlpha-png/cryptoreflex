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
  Calculator,
  MessagesSquare,
  AlertTriangle,
} from "lucide-react";
import NewsletterInline from "@/components/NewsletterInline";
import StructuredData from "@/components/StructuredData";
import TieredPricing, { type PricingTier } from "@/components/TieredPricing";
import {
  faqSchema,
  breadcrumbSchema,
  graphSchema,
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
  title: "Cryptoreflex Pro — calculateur fiscal, portfolio et alertes premium",
  description:
    `Cryptoreflex Pro à ${META_MONTHLY_PRICE}/mois ou ${META_ANNUAL_PRICE}/an : calculateur fiscalité PRO (export Cerfa 2086 + 3916-bis), alertes prix illimitées, portfolio PRO, glossaire expert, brief hebdomadaire alpha + réponse fiscale perso 48h. Annulation 1 clic, garantie 14 j remboursé.`,
  alternates: { canonical: `${BRAND.url}/pro` },
  openGraph: {
    title: "Cryptoreflex Pro — l'abonnement crypto premium FR",
    description:
      `${META_MONTHLY_PRICE}/mois ou ${META_ANNUAL_PRICE}/an. Calculateur PRO + Cerfa 2086 prêt-à-imprimer, alertes illimitées, portfolio multi-comptes, réponse fiscale perso 48h. Annulation 1 clic.`,
    url: `${BRAND.url}/pro`,
    type: "website",
  },
  robots: { index: true, follow: true },
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
        "Export Cerfa 2086 prêt-à-imprimer",
        "Export 3916-bis (comptes étrangers)",
        "Alertes prix illimitées",
        "Glossaire complet + Q/A expert",
        "Brief PRO hebdomadaire (alpha)",
        "Réponse fiscale perso (48h)",
        "Articles premium",
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
        "Calculateur fiscalité PRO + export Cerfa 2086",
        "Export 3916-bis (comptes étrangers crypto)",
        "Portfolio PRO (positions illimitées + API)",
        "Alertes prix illimitées (toutes cryptos)",
        "Glossaire PRO — 250+ termes + Q/A par un expert",
        "Brief PRO hebdomadaire (alpha + on-chain)",
        "Réponse fiscale perso par email (sous 48h)",
        "Tous les articles premium",
        "Annulation 1 clic",
      ],
      ctaLabel: paymentsEnabled
        ? MONTHLY_HAS_OWN_LINK
          ? `S'abonner — ${MONTHLY_PRICE}/mois`
          : `S'abonner — voir les plans`
        : "Rejoindre la liste d'attente",
      ctaHref: paymentsEnabled ? MONTHLY_LINK : "#waitlist",
      highlight: true,
      availability: paymentsEnabled
        ? MONTHLY_HAS_OWN_LINK
          ? "Disponible — paiement immédiat"
          : "Early-bird en attendant le mensuel"
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
        "Tout le plan mensuel avec 29 € d'économie sur l'année + accès anticipé aux nouvelles features.",
      features: [
        "Tout le plan Pro Mensuel",
        "Économie de 29 € / an (vs 108 € mensuel)",
        "Accès anticipé nouvelles features (beta)",
        "1 audit portfolio offert /an (visio 30 min avec le fondateur)",
        "Statut « Founding member » + accès direct au fondateur",
      ],
      ctaLabel: paymentsEnabled
        ? ANNUAL_HAS_OWN_LINK
          ? `S'abonner — ${ANNUAL_PRICE}/an`
          : `S'abonner — voir les plans`
        : "Rejoindre la liste d'attente",
      ctaHref: paymentsEnabled ? ANNUAL_LINK : "#waitlist",
      availability: paymentsEnabled
        ? ANNUAL_HAS_OWN_LINK
          ? "Disponible — paiement immédiat"
          : "Early-bird en attendant l'annuel"
        : "Liste d'attente ouverte",
    },
  ];
}

const TIERS = buildTiers(PAYMENTS_ENABLED);

/* -------------------------------------------------------------------------- */
/*  Features détaillées                                                       */
/* -------------------------------------------------------------------------- */

const FEATURES = [
  {
    icon: Calculator,
    title: "Calculateur fiscalité PRO",
    text: "Tous les calculs du calculateur free + export PDF Cerfa 2086 prêt-à-imprimer + formulaire 3916-bis pré-rempli pour les comptes crypto étrangers.",
  },
  {
    icon: FileText,
    title: "Export Cerfa 2086 prêt-à-imprimer",
    text: "Plus besoin de recopier ligne par ligne dans Impots.gouv. Le PDF généré reprend la forme exacte du Cerfa 2086 millésime 2026.",
  },
  {
    icon: Bell,
    title: "Alertes prix illimitées",
    text: "Configure autant d'alertes que tu veux par email — seuils up/down, %, marché crash. Pas de limite à 5 comme la version free.",
  },
  {
    icon: GraduationCap,
    title: "Glossaire PRO + Q/A expert",
    text: "Au-delà des 200 définitions free, accède à un Q/A enrichi par notre expert : « pourquoi cette taxonomie », « cas limite fiscal », exemples concrets.",
  },
  {
    icon: MessagesSquare,
    title: "Réponse fiscale personnalisée (48h)",
    text: "Tu poses ta question fiscale crypto par email (cas réel : DCA staking ETH, swap DeFi, vente NFT…), réponse argumentée sous 48h ouvrées par notre expert. Pas un Discord avec 200 inconnus — un échange ciblé sur TON cas.",
  },
  {
    icon: Users,
    title: "Brief PRO hebdomadaire + articles premium",
    text: "1 newsletter premium par semaine : alpha actionnable + on-chain insights (whale moves, ETF flows, signaux marché). Inclut l'accès aux articles fond Cryptoreflex (decks fiscalité avancée, on-chain, MiCA).",
  },
];

/* -------------------------------------------------------------------------- */
/*  FAQ (6 questions)                                                         */
/* -------------------------------------------------------------------------- */

const FAQS = [
  {
    q: "Comment je m'abonne à Cryptoreflex Pro ?",
    a: `Tu choisis Mensuel (${MONTHLY_PRICE}/mois) ou Annuel (${ANNUAL_PRICE}/an) sur cette page, tu cliques "S'abonner". Tu es redirigé vers une page de paiement Stripe sécurisée — carte bancaire, Apple Pay, Google Pay ou SEPA. Accès Pro activé immédiatement après paiement, facture envoyée par email.`,
  },
  {
    q: "Quelle est la différence entre Mensuel et Annuel ?",
    a: `L'Annuel (${ANNUAL_PRICE}/an) revient à environ ${(parseFloat(ANNUAL_PRICE.replace(/[^\d,.]/g, "").replace(",", ".")) / 12).toFixed(2)}€/mois — soit environ 33% d'économie versus le Mensuel (${MONTHLY_PRICE}/mois × 12). Tu paies en une fois, tu es tranquille pour 12 mois. Le Mensuel reste flexible : annulation 1 clic à tout moment.`,
  },
  {
    q: "Quels moyens de paiement sont acceptés ?",
    a: "Carte bancaire (Visa, Mastercard, Amex) et SEPA via Stripe. Apple Pay et Google Pay sur mobile. Paiement en crypto (BTC / USDC) envisagé en V2 après stabilisation.",
  },
  {
    q: "Comment annuler mon abonnement ?",
    a: "En 1 clic depuis ton espace « Abonnement ». Pas de questionnaire, pas de friction. L'accès Pro reste actif jusqu'à la fin de la période payée, puis tu repasses automatiquement en plan Gratuit.",
  },
  {
    q: "Y a-t-il une garantie satisfait ou remboursé ?",
    a: "Oui — 14 jours de remboursement intégral à compter de la date du premier paiement. Aucune justification requise. Politique alignée sur le droit de rétractation européen pour les services numériques (art. L221-18 Code de la consommation).",
  },
  {
    q: "Mes données portfolio et calculs fiscaux restent-ils privés ?",
    a: "Oui. Les données sont stockées chiffrées (AES-256) sur des serveurs UE (Vercel Frankfurt + Supabase Paris). Aucune revente, aucun partage tiers. Tu peux exporter ou supprimer toutes tes données depuis ton espace personnel à tout moment (RGPD).",
  },
];

/* -------------------------------------------------------------------------- */
/*  Schema.org : Product + Offers + ItemList features + FAQ + Breadcrumb      */
/* -------------------------------------------------------------------------- */

function buildProductSchema(paymentsEnabled: boolean): JsonLd {
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
    },
  ];

  // Les Offers Pro ne sont exposees a Google QUE quand Stripe est configure.
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
      },
      {
        "@type": "Offer",
        name: "Cryptoreflex Pro annuel",
        price: parseEurPrice(META_ANNUAL_PRICE),
        priceCurrency: "EUR",
        availability: "https://schema.org/InStock",
        url: `${BRAND.url}/pro#plans`,
        category: "Subscription",
      }
    );
  }

  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: "Cryptoreflex Pro",
    description:
      "Abonnement premium pour investisseurs crypto français : calculateur fiscalité avec export Cerfa 2086 et 3916-bis, alertes prix illimitées, portfolio multi-comptes, glossaire expert, brief PRO hebdomadaire, réponse fiscale personnalisée 48h et articles premium.",
    brand: { "@type": "Brand", name: BRAND.name },
    image: `${BRAND.url}/og-image.png`,
    url: `${BRAND.url}/pro`,
    offers,
  };
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

      {/* HERO */}
      <section className="relative overflow-hidden border-b border-border">
        <div className="absolute inset-0 bg-grid opacity-50 pointer-events-none" />
        <div className="absolute -top-40 -right-40 w-[500px] h-[500px] bg-primary/15 rounded-full blur-3xl" />
        <div className="relative mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-16 lg:py-24">
          <div className="flex flex-col items-center text-center">
            <span className="badge-info">
              <Crown className="h-3.5 w-3.5" aria-hidden="true" />
              Cryptoreflex Pro
            </span>
            <h1 className="mt-5 text-3xl sm:text-5xl lg:text-6xl font-extrabold text-fg leading-[1.1] max-w-3xl">
              <span className="gradient-text">Cryptoreflex Pro</span>
              {earlybirdConfigured ? (
                <>
                  <br className="hidden sm:block" /> {MONTHLY_PRICE}/mois ou {ANNUAL_PRICE}/an
                </>
              ) : (
                <>
                  <br className="hidden sm:block" /> Liste d&apos;attente ouverte
                </>
              )}
            </h1>
            <p className="mt-5 text-base sm:text-lg text-fg/75 max-w-2xl">
              Calculateur fiscalité PRO avec export PDF Cerfa 2086 prêt-à-imprimer,
              alertes prix illimitées, portfolio multi-comptes, glossaire expert
              et brief crypto hebdomadaire. Pour les investisseurs qui veulent les
              outils sans la friction.
            </p>

            <div className="mt-6 flex flex-wrap items-center justify-center gap-3 text-xs">
              <span className="badge badge-trust">
                <ShieldCheck className="h-3 w-3" aria-hidden="true" /> 100 % RGPD
                · serveurs UE
              </span>
              <span className="badge badge-info">
                <Zap className="h-3 w-3" aria-hidden="true" /> Annulation 1 clic
              </span>
              <span className="badge badge-info">
                <Clock className="h-3 w-3" aria-hidden="true" /> Garantie 14 j
                remboursé
              </span>
            </div>

            {earlybirdConfigured ? (
              <div
                role="note"
                className="mt-6 inline-flex items-center gap-2 rounded-full border border-accent-green/40 bg-accent-green/10 px-4 py-2 text-xs text-accent-green"
              >
                <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
                Disponible immédiatement — abonnement Stripe sécurisé,{" "}
                <strong>annulation 1 clic, garantie 14 j remboursé</strong>
              </div>
            ) : (
              /*
                Bandeau honnête mode WAITLIST : on ne promet aucun prix tant que
                Stripe n'est pas configuré (PAYMENTS_ENABLED=false). Évite la
                pratique commerciale trompeuse (art. L121-2 Code consommation).
              */
              <div
                role="note"
                className="mt-6 inline-flex items-center gap-2 rounded-full border border-primary/40 bg-primary/10 px-4 py-2 text-xs text-primary-soft"
              >
                <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
                Cryptoreflex Pro arrive bientôt — inscris-toi à la liste
                d&apos;attente, on te prévient à l&apos;ouverture.
              </div>
            )}

            <div className="mt-7 flex flex-wrap justify-center gap-3">
              {earlybirdConfigured ? (
                <a
                  href="#plans"
                  className="btn-primary"
                  id="cta-plans"
                >
                  Choisir mon plan ({MONTHLY_PRICE}/mois ou {ANNUAL_PRICE}/an)
                </a>
              ) : (
                <a href="#waitlist" className="btn-primary" id="cta-waitlist">
                  Rejoindre la liste d&apos;attente
                </a>
              )}
              <a href="#plans" className="btn-ghost">
                Voir les fonctionnalités
              </a>
            </div>
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
          TODO automne 2026 — remplacer le CTA "early-bird" par un Stripe Checkout :
          - Créer 2 prix Stripe (price_pro_monthly, price_pro_yearly)
          - Endpoint POST /api/stripe/checkout-session avec lookup_key
          - Webhook /api/stripe/webhook pour activer le rôle "pro" en DB
          - Provisionner accès Académie premium + alertes illimitées + invite Discord
        */}
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

      {/* CE QUE TU GAGNES */}
      <section className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-16 lg:py-20">
        <div className="text-center mb-12">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-fg">
            Ce que tu gagnes <span className="gradient-text">en passant Pro</span>
          </h2>
          <p className="mt-3 text-fg/70 max-w-2xl mx-auto">
            6 améliorations concrètes qui changent ta routine
            d&apos;investisseur — surtout en mai (déclaration fiscale).
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {FEATURES.map((f) => (
            <div key={f.title} className="glass rounded-2xl p-5">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15 text-primary">
                <f.icon className="h-5 w-5" aria-hidden="true" />
              </span>
              <h3 className="mt-3 font-bold text-fg">{f.title}</h3>
              <p className="mt-1.5 text-sm text-fg/70">{f.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-16 lg:py-20">
        <div className="flex items-center gap-2 mb-6">
          <HelpCircle className="h-5 w-5 text-primary" aria-hidden="true" />
          <h2 className="text-2xl sm:text-3xl font-extrabold text-fg">
            Questions fréquentes
          </h2>
        </div>
        <div className="divide-y divide-border border border-border rounded-2xl overflow-hidden">
          {FAQS.map((f) => (
            <details
              key={f.q}
              className="group bg-elevated/40 open:bg-elevated/70"
            >
              <summary className="flex items-center justify-between cursor-pointer list-none px-5 py-4 font-medium text-fg hover:bg-elevated/80">
                <span>{f.q}</span>
                <span
                  aria-hidden="true"
                  className="text-muted group-open:rotate-45 transition-transform text-xl leading-none"
                >
                  +
                </span>
              </summary>
              <div className="px-5 pb-5 text-sm text-fg/75 leading-relaxed">
                {f.a}
              </div>
            </details>
          ))}
        </div>
      </section>

      {/* DISCLAIMER FINAL */}
      <section className="border-t border-border bg-surface/30">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-10 text-xs text-muted leading-relaxed space-y-3">
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
              {BRAND.name} est un éditeur web indépendant français. Nous ne
              sommes ni un PSAN ni un CIF. L&apos;abonnement Pro est un service
              numérique payant, pas un produit financier.
            </span>
          </p>
          <p className="flex items-start gap-2">
            <FileText
              className="h-4 w-4 text-accent-cyan shrink-0 mt-0.5"
              aria-hidden="true"
            />
            <span>
              <strong className="text-fg">Mention RGPD —</strong> En
              t&apos;inscrivant à la waitlist Pro, ton email est traité par{" "}
              {BRAND.name} (responsable de traitement) et stocké chez Beehiiv
              (sous-traitant) sur la base de ton consentement explicite.
              Conservation 24 mois max. Désinscription en 1 clic via{" "}
              <Link
                href="/confidentialite"
                className="text-primary-soft underline hover:text-primary"
              >
                notre politique de confidentialité
              </Link>
              .
            </span>
          </p>
        </div>
      </section>
    </div>
  );
}
