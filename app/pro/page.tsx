import type { Metadata } from "next";
import Link from "next/link";
import {
  Crown,
  Check,
  X as XIcon,
  Mail,
  ShieldCheck,
  Sparkles,
  Bell,
  Wallet,
  GraduationCap,
  FileText,
  Zap,
  Users,
  HelpCircle,
  Clock,
} from "lucide-react";
import NewsletterInline from "@/components/NewsletterInline";
import StructuredData from "@/components/StructuredData";
import {
  faqSchema,
  breadcrumbSchema,
  graphSchema,
  type JsonLd,
} from "@/lib/schema";
import { BRAND } from "@/lib/brand";

/**
 * /pro — landing page Cryptoreflex Pro (€9.99/mo).
 *
 * V1 : page de waitlist.
 *  - Pas encore de checkout Stripe (TODO milestone M+4-6 plan 2026).
 *  - CTA principal = inscription waitlist via API newsletter (source: pro-waitlist).
 *  - Mailto secondaire pour les leads VIP (entreprises, créateurs gros volume).
 *
 * SEO :
 *  - Schema Product + Offer (3 plans) + FAQPage + BreadcrumbList
 *  - Metadata canonique + OG dédié
 *
 * Design : cohérent dark + gold premium (utilise card-premium / glass / glow-border).
 */

export const metadata: Metadata = {
  title: "Cryptoreflex Pro — abonnement premium 9,99 €/mo",
  description:
    "Watchlist illimitée, alertes prix illimitées, portfolio multi-comptes, académie premium, support prioritaire. Lancement juin 2026 — inscris-toi à la waitlist.",
  alternates: { canonical: `${BRAND.url}/pro` },
  openGraph: {
    title: "Cryptoreflex Pro — l'abonnement crypto premium FR",
    description:
      "Pro à 9,99 €/mo : watchlist & alertes illimitées, portfolio multi-API, masterclass vidéo, support 24h. Inscris-toi à la waitlist.",
    url: `${BRAND.url}/pro`,
    type: "website",
  },
  robots: { index: true, follow: true },
};

/* -------------------------------------------------------------------------- */
/*  Données : plans, features, FAQ                                            */
/* -------------------------------------------------------------------------- */

interface Plan {
  id: "free" | "pro" | "pro-annuel";
  name: string;
  badge?: string;
  price: string;
  priceUnit: string;
  description: string;
  features: { label: string; included: boolean }[];
  ctaLabel: string;
  ctaHref: string;
  highlight?: boolean;
}

const PLANS: Plan[] = [
  {
    id: "free",
    name: "Free",
    price: "0 €",
    priceUnit: "à vie",
    description: "Tout l'essentiel pour suivre la crypto sans engagement.",
    features: [
      { label: "Watchlist 10 cryptos", included: true },
      { label: "Portfolio 30 positions", included: true },
      { label: "5 alertes prix par email", included: true },
      { label: "Académie standard", included: true },
      { label: "Watchlist illimitée", included: false },
      { label: "Portfolio multi-comptes (API)", included: false },
      { label: "Alertes prix illimitées", included: false },
      { label: "Académie premium (vidéos)", included: false },
      { label: "Export PDF mensuel", included: false },
      { label: "Support prioritaire 24h", included: false },
    ],
    ctaLabel: "Commencer gratuitement",
    ctaHref: "/watchlist",
  },
  {
    id: "pro",
    name: "Pro",
    badge: "Le plus populaire",
    price: "9,99 €",
    priceUnit: "/ mois",
    description: "Pour les investisseurs sérieux qui veulent du sans-friction.",
    features: [
      { label: "Watchlist illimitée", included: true },
      { label: "Portfolio multi-comptes (API)", included: true },
      { label: "Alertes prix illimitées", included: true },
      { label: "Académie premium (vidéos masterclass)", included: true },
      { label: "Export PDF mensuel", included: true },
      { label: "Support prioritaire 24h", included: true },
      { label: "Sans pub, sans tracker tiers", included: true },
      { label: "Annulation 1 clic", included: true },
    ],
    ctaLabel: "Rejoindre la waitlist",
    ctaHref: "#waitlist",
    highlight: true,
  },
  {
    id: "pro-annuel",
    name: "Pro Annuel",
    badge: "−20 %",
    price: "95 €",
    priceUnit: "/ an",
    description: "Tout Pro + accès anticipé aux nouvelles features.",
    features: [
      { label: "Tout le plan Pro", included: true },
      { label: "Économise 25 € / an", included: true },
      { label: "Accès anticipé nouvelles features", included: true },
      { label: "Badge « Founding member »", included: true },
      { label: "1 session bilan portfolio /an", included: true },
    ],
    ctaLabel: "Rejoindre la waitlist",
    ctaHref: "#waitlist",
  },
];

const FEATURES = [
  {
    icon: Bell,
    title: "Alertes prix illimitées",
    text: "Configure autant d'alertes que tu veux par email — seuils up/down, %, marché crash.",
  },
  {
    icon: Wallet,
    title: "Portfolio multi-comptes",
    text: "Connecte tes comptes Binance, Kraken, Coinbase via API read-only. Suivi consolidé temps réel.",
  },
  {
    icon: GraduationCap,
    title: "Académie premium",
    text: "10+ heures de masterclass vidéo : analyse on-chain, fiscalité avancée, sécurité hardware wallet.",
  },
  {
    icon: FileText,
    title: "Export PDF mensuel",
    text: "Bilan portfolio + plus-values latentes prêts pour ta déclaration ou ton CGP.",
  },
  {
    icon: Zap,
    title: "Sans pub ni tracker",
    text: "Expérience clean : aucune pub d'affiliation, aucun pixel tiers, aucune dark pattern.",
  },
  {
    icon: Users,
    title: "Support prioritaire 24h",
    text: "Réponse garantie sous 24h ouvrées par email avec un humain de l'équipe Cryptoreflex.",
  },
];

const FAQS = [
  {
    q: "Combien coûte Cryptoreflex Pro ?",
    a: "9,99 € par mois ou 95 € par an (soit 7,92 €/mo, économie de 20 %). Sans engagement, annulation en 1 clic depuis ton espace personnel.",
  },
  {
    q: "Quels moyens de paiement seront acceptés ?",
    a: "Carte bancaire (Visa, Mastercard, Amex) et SEPA via Stripe. Apple Pay et Google Pay au lancement. Paiement en crypto envisagé en V2 (BTC / USDC).",
  },
  {
    q: "Comment annuler mon abonnement ?",
    a: "En 1 clic depuis ton espace « Abonnement ». Pas de questionnaire, pas de friction. L'accès Pro reste actif jusqu'à la fin de la période payée.",
  },
  {
    q: "Mes données portfolio sont-elles vraiment privées (RGPD) ?",
    a: "Oui. Les clés API exchange sont stockées chiffrées (AES-256) sur des serveurs UE (Vercel Frankfurt + Supabase Paris). Aucune revente, aucun partage tiers. Tu peux exporter ou supprimer toutes tes données depuis ton espace.",
  },
  {
    q: "Y a-t-il une garantie satisfait ou remboursé ?",
    a: "Oui — 14 jours de remboursement intégral à compter de la date du premier paiement. Aucune justification requise. Politique alignée sur le droit de rétractation européen pour les services numériques.",
  },
  {
    q: "Comment Cryptoreflex Pro se compare à Cryptoast Pro ?",
    a: "Cryptoreflex Pro est ~50 % moins cher (9,99 € vs ~19,99 €), 100 % francophone et conforme MiCA. Nous misons sur l'outillage portfolio et alertes plutôt que sur l'analyse signaux trading. Aucun cashback affiliation discutable. Comparatif détaillé dispo bientôt.",
  },
];

/* -------------------------------------------------------------------------- */
/*  Schema.org : Product + 3 Offers + FAQ + Breadcrumb                        */
/* -------------------------------------------------------------------------- */

function buildProductSchema(): JsonLd {
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: "Cryptoreflex Pro",
    description:
      "Abonnement premium pour les investisseurs crypto français : watchlist illimitée, alertes prix illimitées, portfolio multi-comptes, académie premium, support prioritaire.",
    brand: { "@type": "Brand", name: BRAND.name },
    image: `${BRAND.url}/og-image.png`,
    url: `${BRAND.url}/pro`,
    offers: [
      {
        "@type": "Offer",
        name: "Cryptoreflex Pro mensuel",
        price: "9.99",
        priceCurrency: "EUR",
        priceValidUntil: "2026-12-31",
        availability: "https://schema.org/PreOrder",
        url: `${BRAND.url}/pro#waitlist`,
        category: "Subscription",
      },
      {
        "@type": "Offer",
        name: "Cryptoreflex Pro annuel",
        price: "95.00",
        priceCurrency: "EUR",
        priceValidUntil: "2026-12-31",
        availability: "https://schema.org/PreOrder",
        url: `${BRAND.url}/pro#waitlist`,
        category: "Subscription",
      },
      {
        "@type": "Offer",
        name: "Cryptoreflex Free",
        price: "0",
        priceCurrency: "EUR",
        availability: "https://schema.org/InStock",
        url: `${BRAND.url}/watchlist`,
        category: "Subscription",
      },
    ],
  };
}

/* -------------------------------------------------------------------------- */
/*  Page                                                                      */
/* -------------------------------------------------------------------------- */

export default function ProPage() {
  const schema = graphSchema([
    buildProductSchema(),
    faqSchema(FAQS.map((f) => ({ question: f.q, answer: f.a }))),
    breadcrumbSchema([
      { name: "Accueil", url: "/" },
      { name: "Cryptoreflex Pro", url: "/pro" },
    ]),
  ]);

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
              <br className="hidden sm:block" /> 9,99 €/mo
            </h1>
            <p className="mt-5 text-base sm:text-lg text-fg/75 max-w-2xl">
              Watchlist illimitée, alertes prix illimitées, portfolio
              multi-comptes API, académie premium et support prioritaire 24h.
              Pour les investisseurs qui veulent passer la vitesse supérieure.
            </p>

            <div className="mt-6 flex flex-wrap items-center justify-center gap-3 text-xs">
              <span className="badge badge-trust">
                <ShieldCheck className="h-3 w-3" aria-hidden="true" /> 100 % RGPD
              </span>
              <span className="badge badge-info">
                <Zap className="h-3 w-3" aria-hidden="true" /> Annulation 1 clic
              </span>
              <span className="badge badge-info">
                <Clock className="h-3 w-3" aria-hidden="true" /> Pas de carte requise pour la waitlist
              </span>
            </div>

            <div
              role="note"
              className="mt-6 inline-flex items-center gap-2 rounded-full border border-warning/40 bg-warning/10 px-4 py-2 text-xs text-warning-fg"
            >
              <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
              Pro arrive en juin 2026 — inscris-toi pour être notifié(e) en avant-première.
            </div>
          </div>
        </div>
      </section>

      {/* PLANS */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16 lg:py-20">
        <div className="text-center mb-10">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-fg">
            Choisis ton plan
          </h2>
          <p className="mt-2 text-fg/70">
            Toujours une version gratuite généreuse. Pro débloque l&apos;outillage avancé.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {PLANS.map((plan) => (
            <article
              key={plan.id}
              aria-labelledby={`plan-${plan.id}-name`}
              className={`rounded-3xl p-6 sm:p-8 flex flex-col ${
                plan.highlight
                  ? "card-premium ring-2 ring-primary/40 relative shadow-[0_20px_60px_-20px_rgba(245,165,36,0.4)]"
                  : "glass"
              }`}
            >
              {plan.badge && (
                <span
                  className={`absolute -top-3 left-1/2 -translate-x-1/2 inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-bold ${
                    plan.highlight
                      ? "bg-primary text-background"
                      : "bg-elevated border border-border text-primary-soft"
                  }`}
                  style={plan.highlight ? undefined : { position: "static", transform: "none" }}
                >
                  {plan.badge}
                </span>
              )}

              <h3
                id={`plan-${plan.id}-name`}
                className="text-2xl font-extrabold text-white"
              >
                {plan.name}
              </h3>
              <p className="mt-2 text-sm text-white/70">{plan.description}</p>

              <div className="mt-6 flex items-baseline gap-1">
                <span className="text-4xl font-extrabold text-white tabular-nums">
                  {plan.price}
                </span>
                <span className="text-sm text-white/60">{plan.priceUnit}</span>
              </div>

              <ul className="mt-6 space-y-3 text-sm flex-1" role="list">
                {plan.features.map((f) => (
                  <li
                    key={f.label}
                    className={`flex items-start gap-2 ${
                      f.included ? "text-white/90" : "text-white/40 line-through"
                    }`}
                  >
                    {f.included ? (
                      <Check
                        className="h-4 w-4 mt-0.5 text-success shrink-0"
                        aria-hidden="true"
                      />
                    ) : (
                      <XIcon
                        className="h-4 w-4 mt-0.5 text-white/30 shrink-0"
                        aria-hidden="true"
                      />
                    )}
                    <span>{f.label}</span>
                  </li>
                ))}
              </ul>

              <div className="mt-8">
                {plan.ctaHref.startsWith("#") ? (
                  <a
                    href={plan.ctaHref}
                    className={plan.highlight ? "btn-primary w-full" : "btn-ghost w-full"}
                  >
                    {plan.ctaLabel}
                  </a>
                ) : (
                  <Link
                    href={plan.ctaHref}
                    className={plan.highlight ? "btn-primary w-full" : "btn-ghost w-full"}
                  >
                    {plan.ctaLabel}
                  </Link>
                )}
              </div>
            </article>
          ))}
        </div>

        {/*
          TODO M+4-6 — remplacer le CTA "waitlist" par un Stripe Checkout :
          - Créer 2 prix Stripe (price_pro_monthly, price_pro_yearly)
          - Endpoint POST /api/stripe/checkout-session avec lookup_key
          - Webhook /api/stripe/webhook pour activer le rôle "pro" en DB
          - Provisionner accès Académie premium + alertes illimitées + API key
        */}
      </section>

      {/* WAITLIST CTA */}
      <section
        id="waitlist"
        className="border-y border-border bg-surface/40 scroll-mt-24"
      >
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center mb-6">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-fg">
              Rejoins la waitlist Pro
            </h2>
            <p className="mt-2 text-fg/70 max-w-xl mx-auto">
              Inscris-toi pour recevoir l&apos;accès anticipé en juin 2026, plus
              <span className="text-primary-soft"> 30 jours offerts </span>
              à toute l&apos;équipe early-access.
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
              <Mail className="inline-block h-4 w-4 mr-1 align-text-bottom" aria-hidden="true" />
              Contacter l&apos;équipe (entreprises, créateurs, > 20 utilisateurs)
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
            6 améliorations concrètes qui changent ta routine d&apos;investisseur.
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
          <h2 className="text-2xl sm:text-3xl font-extrabold text-fg">Questions fréquentes</h2>
        </div>
        <div className="divide-y divide-border border border-border rounded-2xl overflow-hidden">
          {FAQS.map((f) => (
            <details key={f.q} className="group bg-elevated/40 open:bg-elevated/70">
              <summary className="flex items-center justify-between cursor-pointer list-none px-5 py-4 font-medium text-fg hover:bg-elevated/80">
                <span>{f.q}</span>
                <span
                  aria-hidden="true"
                  className="text-muted group-open:rotate-45 transition-transform text-xl leading-none"
                >
                  +
                </span>
              </summary>
              <div className="px-5 pb-5 text-sm text-fg/75 leading-relaxed">{f.a}</div>
            </details>
          ))}
        </div>
      </section>

      {/* RGPD footer note */}
      <section className="border-t border-border bg-surface/30">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-10 text-xs text-muted leading-relaxed">
          <p className="flex items-start gap-2">
            <ShieldCheck className="h-4 w-4 text-success shrink-0 mt-0.5" aria-hidden="true" />
            <span>
              <strong className="text-fg">Mention RGPD —</strong> En t&apos;inscrivant
              à la waitlist Pro, ton email est traité par {BRAND.name} (responsable de
              traitement) et stocké chez Beehiiv (sous-traitant) sur la base de ton
              consentement explicite. Conservation 24 mois maximum. Aucun partage avec
              des tiers commerciaux. Désinscription en 1 clic en pied de chaque email,
              ou via{" "}
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
