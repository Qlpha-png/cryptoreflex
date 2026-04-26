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

/**
 * /pro — landing page Cryptoreflex Pro.
 *
 * Refonte 26/04/2026 — focus session « offer Pro » :
 *  - Calculateur fiscalité PRO (export PDF Cerfa 2086 + 3916-bis)
 *  - Portfolio tracker PRO (alertes prix illimitées)
 *  - Glossaire PRO (Q/A par expert)
 *  - Newsletter premium (insights weekly + Discord)
 *  - Articles premium
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
    "Cryptoreflex Pro à 9 €/mois ou 79 €/an : calculateur fiscalité PRO (export Cerfa 2086 + 3916-bis), alertes prix illimitées, portfolio PRO, glossaire expert et Discord. Précommande early-bird 49 €/an.",
  alternates: { canonical: `${BRAND.url}/pro` },
  openGraph: {
    title: "Cryptoreflex Pro — l'abonnement crypto premium FR",
    description:
      "9 €/mois ou 79 €/an. Calculateur PRO + Cerfa 2086 prêt-à-imprimer, alertes illimitées, portfolio multi-comptes, Discord. Stripe arrive automne 2026.",
    url: `${BRAND.url}/pro`,
    type: "website",
  },
  robots: { index: true, follow: true },
};

/* -------------------------------------------------------------------------- */
/*  Plans                                                                     */
/* -------------------------------------------------------------------------- */

// Stripe Payment Link early-bird — fallback vers waitlist si non configuré.
const EARLYBIRD_LINK =
  process.env.NEXT_PUBLIC_PRO_EARLYBIRD_STRIPE_LINK ?? "#waitlist";

const TIERS: PricingTier[] = [
  {
    id: "free",
    name: "Gratuit",
    Icon: Sparkles,
    price: "0 €",
    priceUnit: "à vie",
    description: "L'essentiel pour suivre la crypto sans engagement.",
    features: [
      "Calculateur fiscalité standard",
      "Portfolio tracker (30 positions)",
      "5 alertes prix par email",
      "Glossaire 200+ termes",
      "Newsletter quotidienne",
      "Comparateur MiCA complet",
    ],
    excluded: [
      "Export Cerfa 2086 prêt-à-imprimer",
      "Alertes prix illimitées",
      "Q/A expert sur le glossaire",
      "Accès Discord communauté",
      "Articles premium",
    ],
    ctaLabel: "Commencer gratuitement",
    ctaHref: "/calculateur",
    availability: "Disponible aujourd'hui",
  },
  {
    id: "pro-monthly",
    name: "Pro Mensuel",
    badge: "Le plus populaire",
    Icon: Crown,
    price: "9 €",
    priceUnit: "/ mois",
    description:
      "Pour les investisseurs sérieux qui veulent l'outillage complet sans engagement annuel.",
    features: [
      "Calculateur fiscalité PRO + export Cerfa 2086",
      "Export 3916-bis (comptes étrangers crypto)",
      "Portfolio PRO (positions illimitées + API)",
      "Alertes prix illimitées (toutes cryptos)",
      "Glossaire PRO — Q/A par un expert",
      "Newsletter premium (insights weekly)",
      "Accès Discord communauté Pro",
      "Tous les articles premium",
      "Annulation 1 clic",
    ],
    ctaLabel: "Précommander early-bird 49 €",
    ctaHref: EARLYBIRD_LINK,
    highlight: true,
    availability: "Stripe — automne 2026",
  },
  {
    id: "pro-annual",
    name: "Pro Annuel",
    badge: "Économie 33 %",
    Icon: Crown,
    price: "79 €",
    priceUnit: "/ an",
    description:
      "Tout le plan mensuel avec 29 € d'économie sur l'année + accès anticipé aux nouvelles features.",
    features: [
      "Tout le plan Pro Mensuel",
      "Économie de 29 € / an (vs 108 € mensuel)",
      "Accès anticipé nouvelles features",
      "Badge « Founding member » Discord",
      "1 audit portfolio offert /an (visio 30 min)",
    ],
    ctaLabel: "Précommander early-bird 49 €",
    ctaHref: EARLYBIRD_LINK,
    availability: "Stripe — automne 2026",
  },
];

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
    title: "Discord communauté Pro",
    text: "Channel privé avec autres abonnés Pro + équipe Cryptoreflex. Posez vos questions techniques, recevez les insights avant la newsletter publique.",
  },
  {
    icon: Users,
    title: "Articles premium + insights weekly",
    text: "1 newsletter premium hebdomadaire avec analyse marché + accès aux articles fond de Cryptoreflex (decks fiscalité, on-chain, MiCA).",
  },
];

/* -------------------------------------------------------------------------- */
/*  FAQ (6 questions)                                                         */
/* -------------------------------------------------------------------------- */

const FAQS = [
  {
    q: "Quand Cryptoreflex Pro sort-il vraiment ?",
    a: "Lancement officiel automne 2026 (objectif octobre 2026) avec Stripe checkout intégré. D'ici là, tu peux précommander en early-bird à 49 € pour la première année (au lieu de 79 €) — Payment Link Stripe sécurisé.",
  },
  {
    q: "Que vaut l'early-bird à 49 € exactement ?",
    a: "1 année complète d'accès Pro à 49 € (au lieu de 79 €) avec lock-in du tarif sur le renouvellement automatique du 2e cycle si tu ne résilies pas. Ouvert tant que la Stripe Payment Link n'est pas désactivée publiquement.",
  },
  {
    q: "Quels moyens de paiement seront acceptés ?",
    a: "Carte bancaire (Visa, Mastercard, Amex) et SEPA via Stripe. Apple Pay et Google Pay au lancement. Paiement en crypto envisagé en V2 (BTC / USDC) après stabilisation.",
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

function buildProductSchema(): JsonLd {
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: "Cryptoreflex Pro",
    description:
      "Abonnement premium pour investisseurs crypto français : calculateur fiscalité avec export Cerfa 2086 et 3916-bis, alertes prix illimitées, portfolio multi-comptes, glossaire expert, Discord et articles premium.",
    brand: { "@type": "Brand", name: BRAND.name },
    image: `${BRAND.url}/og-image.png`,
    url: `${BRAND.url}/pro`,
    offers: [
      {
        "@type": "Offer",
        name: "Cryptoreflex Pro mensuel",
        price: "9.00",
        priceCurrency: "EUR",
        priceValidUntil: "2026-12-31",
        availability: "https://schema.org/PreOrder",
        url: `${BRAND.url}/pro#plans`,
        category: "Subscription",
      },
      {
        "@type": "Offer",
        name: "Cryptoreflex Pro annuel",
        price: "79.00",
        priceCurrency: "EUR",
        priceValidUntil: "2026-12-31",
        availability: "https://schema.org/PreOrder",
        url: `${BRAND.url}/pro#plans`,
        category: "Subscription",
      },
      {
        "@type": "Offer",
        name: "Cryptoreflex Pro early-bird 1ère année",
        price: "49.00",
        priceCurrency: "EUR",
        priceValidUntil: "2026-09-30",
        availability: "https://schema.org/PreOrder",
        url: `${BRAND.url}/pro#early-bird`,
        category: "Subscription",
      },
      {
        "@type": "Offer",
        name: "Cryptoreflex Free",
        price: "0",
        priceCurrency: "EUR",
        availability: "https://schema.org/InStock",
        url: `${BRAND.url}/calculateur`,
        category: "Subscription",
      },
    ],
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
    buildProductSchema(),
    buildItemListSchema(),
    faqSchema(FAQS.map((f) => ({ question: f.q, answer: f.a }))),
    breadcrumbSchema([
      { name: "Accueil", url: "/" },
      { name: "Cryptoreflex Pro", url: "/pro" },
    ]),
  ]);

  const earlybirdConfigured = EARLYBIRD_LINK.startsWith("http");

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
              <br className="hidden sm:block" /> 9 €/mois ou 79 €/an
            </h1>
            <p className="mt-5 text-base sm:text-lg text-fg/75 max-w-2xl">
              Calculateur fiscalité PRO avec export PDF Cerfa 2086 prêt-à-imprimer,
              alertes prix illimitées, portfolio multi-comptes, glossaire expert
              et Discord communauté. Pour les investisseurs qui veulent les
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

            <div
              role="note"
              className="mt-6 inline-flex items-center gap-2 rounded-full border border-warning/40 bg-warning/10 px-4 py-2 text-xs text-warning-fg"
            >
              <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
              Lancement Stripe automne 2026 — early-bird disponible :{" "}
              <strong>49 € la 1re année (au lieu de 79 €)</strong>
            </div>

            <div className="mt-7 flex flex-wrap justify-center gap-3">
              {earlybirdConfigured ? (
                <a
                  href={EARLYBIRD_LINK}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-primary"
                  id="early-bird"
                >
                  Précommander Pro 49 € early-bird
                </a>
              ) : (
                <a href="#waitlist" className="btn-primary" id="early-bird">
                  Rejoindre la waitlist Pro
                </a>
              )}
              <a href="#plans" className="btn-ghost">
                Voir les 3 plans
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
              On te notifie à l&apos;ouverture officielle de Stripe + 30 jours
              gratuits offerts à tous les early-access.
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
