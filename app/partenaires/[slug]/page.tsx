/**
 * /partenaires/[slug] — Page review long-form pour un partenaire affilié.
 *
 * Conçue suite aux recommandations de 10 agents experts conversion :
 *  - Hero brand-color + verdict 30s + rating Schema.org
 *  - Vitrine produits dynamique (3 CTAs distincts)
 *  - Field-test sections honnêtes (pros + cons obligatoire)
 *  - "Pourquoi maintenant" (loss aversion sourcée, sans comparaison inter-partenaires)
 *  - Specs table + Setup steps + FAQ accordéon (Schema.org FAQPage)
 *  - CTAs distribués (hero, in-content x3, sticky mobile, end-of-page)
 *  - JSON-LD Product + Review + AggregateRating + FAQPage + BreadcrumbList
 *
 * Honnêteté radicale (pattern Wirecutter/RTings) : la section
 * "Ce qu'on n'aime pas" reste obligatoire. La transparence est notre
 * différenciateur de confiance ; supprimer cette section = sape de l'éditorial.
 */

import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import {
  Sparkles,
  ArrowRight,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Crown,
  Globe,
  Calendar,
  Percent,
  Star,
  Clock,
  Award,
  ChevronDown,
  ChevronRight,
  Shield,
  Target,
  TrendingUp,
  ListChecks,
  HelpCircle,
  AlertTriangle,
  Lightbulb,
  Settings2,
  Coins,
  XCircle,
  ArrowDown,
} from "lucide-react";
import {
  getPartner,
  partners,
  type Partner,
  type PartnerProduct,
} from "@/data/partners";
import {
  getPartnerReview,
  type PartnerReview,
} from "@/data/partner-reviews";
import { BRAND } from "@/lib/brand";
import { breadcrumbSchema, faqSchema } from "@/lib/schema";
import StructuredData from "@/components/StructuredData";
import StickyPartnerCta from "./StickyPartnerCta";

export const revalidate = 86400; // 24h

interface Props {
  params: { slug: string };
}

/* -------------------------------------------------------------------------- */
/*  Static params + Metadata                                                  */
/* -------------------------------------------------------------------------- */

export function generateStaticParams() {
  return partners.map((p) => ({ slug: p.slug }));
}

export function generateMetadata({ params }: Props): Metadata {
  const partner = getPartner(params.slug);
  const review = getPartnerReview(params.slug);
  if (!partner || !review) return {};

  const title = `${partner.name} avis 2026 — Test ${review.testDuration} par Cryptoreflex`;
  const description = `${partner.tagline} Note ${review.rating}/5 après ${review.testDuration} d'usage réel. Avantages, prix, FAQ et guide complet.`;

  return {
    title,
    description,
    alternates: { canonical: `${BRAND.url}/partenaires/${partner.slug}` },
    openGraph: {
      title,
      description,
      url: `${BRAND.url}/partenaires/${partner.slug}`,
      type: "article",
      siteName: BRAND.name,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
    other: {
      "article:author": "Cryptoreflex",
      "article:modified_time": review.lastUpdated,
    },
  };
}

const TONE_STYLES: Record<
  NonNullable<PartnerProduct["badge"]>["tone"],
  string
> = {
  primary: "bg-primary/15 text-primary ring-1 ring-primary/30",
  success: "bg-success/15 text-success ring-1 ring-success/30",
  warning: "bg-warning/15 text-warning ring-1 ring-warning/30",
  info: "bg-elevated/80 text-fg/80 ring-1 ring-border",
};

/* -------------------------------------------------------------------------- */
/*  Page                                                                      */
/* -------------------------------------------------------------------------- */

export default function PartnerDetailPage({ params }: Props) {
  const partner = getPartner(params.slug);
  const review = getPartnerReview(params.slug);

  if (!partner || !review) {
    notFound();
  }

  const breadcrumbs = [
    { name: "Accueil", url: `${BRAND.url}/` },
    { name: "Partenaires", url: `${BRAND.url}/partenaires` },
    { name: partner.name, url: `${BRAND.url}/partenaires/${partner.slug}` },
  ];

  /* ------------------------------ JSON-LD ------------------------------ */
  const productJsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: partner.name,
    description: partner.shortDescription,
    brand: { "@type": "Brand", name: partner.name },
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: review.rating,
      bestRating: 5,
      worstRating: 1,
      reviewCount: review.externalReviewCount,
    },
    review: {
      "@type": "Review",
      reviewRating: {
        "@type": "Rating",
        ratingValue: review.rating,
        bestRating: 5,
      },
      author: {
        "@type": "Organization",
        name: BRAND.name,
        url: BRAND.url,
      },
      datePublished: review.lastUpdated,
      reviewBody: review.verdict.summary,
    },
    offers: partner.products.map((p) => ({
      "@type": "Offer",
      name: p.name,
      description: p.description,
      url: `${BRAND.url}/go/${partner.slug}?ctx=detail-product&pos=${p.id}`,
      availability: "https://schema.org/InStock",
      priceCurrency: "EUR",
      // priceFrom display tel quel — Google Rich Results accepte le texte si on
      // ne peut pas extraire un nombre stable (ex : "Gratuit", "À partir de…").
      // On laisse le price hors schéma pour éviter les warnings, le texte
      // d'affichage reste sur la page.
    })),
    url: `${BRAND.url}/partenaires/${partner.slug}`,
  };

  /* --------------------------------------------------------------------- */
  return (
    <main id="main-content" className="min-h-[80vh] pb-24">
      <StructuredData
        id="partner-detail"
        data={[
          breadcrumbSchema(breadcrumbs),
          faqSchema(
            review.faq.map((q) => ({ question: q.question, answer: q.answer }))
          ),
          productJsonLd,
        ]}
      />

      {/* Sticky CTA mobile */}
      <StickyPartnerCta
        slug={partner.slug}
        partnerName={partner.name}
        ctaLabel={`Voir ${partner.name}`}
        priceFrom={partner.priceFrom}
        brandColor={partner.brandColor}
      />

      {/* Note : le bouton "Retour" global est monté dans app/layout.tsx
          (visible automatiquement sur cette page). On évite le doublon. */}

      {/* ───────────────────────────── HERO ──────────────────────────────── */}
      <PartnerHero partner={partner} review={review} />

      {/* ─────────────────────────── DISCLOSURE ──────────────────────────── */}
      <section
        className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 mt-6"
        aria-label="Mention liens affiliés"
      >
        <aside
          role="note"
          className="glass rounded-2xl p-4 border-l-4 border-warning bg-warning/5"
        >
          <div className="flex items-start gap-3">
            <AlertCircle
              className="h-4 w-4 text-warning shrink-0 mt-0.5"
              aria-hidden="true"
            />
            <p className="text-xs sm:text-sm text-fg/75 leading-relaxed">
              <span className="font-bold text-fg">Lien affilié.</span> Cette
              page contient des liens affiliés (loi 9 juin 2023). Notre note de{" "}
              {review.rating}/5 résulte de {review.testDuration} de test
              terrain — pas d&apos;un partenariat commercial.
            </p>
          </div>
        </aside>
      </section>

      {/* ─────────────────────── VERDICT 30 SECONDES ─────────────────────── */}
      <PartnerVerdict review={review} partner={partner} />

      {/* ─────────────────── PEDAGOGIE : COMPRENDRE EN 3 MIN ──────────────── */}
      <Pedagogy partner={partner} review={review} />

      {/* ─────────────────── BEFORE / AFTER : VOILÀ CE QUI CHANGE ────────── */}
      <BeforeAfter partner={partner} review={review} />

      {/* ───────────────────── POURQUOI MAINTENANT ───────────────────────── */}
      <WhyBuyNow partner={partner} review={review} />

      {/* ─────────────────────── PRODUITS VITRINE ────────────────────────── */}
      <ProductShowcase partner={partner} />

      {/* ─────────────────────── FIELD TEST SECTIONS ─────────────────────── */}
      <FieldTest partner={partner} review={review} />

      {/* ─────────────────────── RISQUES ÉVITÉS (loss aversion) ───────────── */}
      <RisksAvoided review={review} partner={partner} />

      {/* ─────────────────────── PREUVES SOCIALES ─────────────────────────── */}
      <SocialProof review={review} />

      {/* ─────────────────────── SPECS TABLE ──────────────────────────────── */}
      <SpecsTable review={review} />

      {/* ─────────────────────── SETUP STEPS ──────────────────────────────── */}
      <SetupSteps review={review} partner={partner} />

      {/* ─────────────────────── FAQ ACCORDION ────────────────────────────── */}
      <PartnerFAQ review={review} />

      {/* ─────────────────────── CTA FINAL ────────────────────────────────── */}
      <FinalCta partner={partner} review={review} />
    </main>
  );
}

/* ========================================================================== */
/*  HERO                                                                      */
/* ========================================================================== */

function PartnerHero({
  partner,
  review,
}: {
  partner: Partner;
  review: PartnerReview;
}) {
  // H1 sales-driven par catégorie (recommandation agents copywriting)
  const heroLead = partner.tagline;

  return (
    <section
      aria-labelledby="partner-hero-title"
      className="relative overflow-hidden pt-8 sm:pt-12 pb-12 sm:pb-16"
    >
      {/* Halo brand color animé */}
      <div
        aria-hidden="true"
        className="partner-hero-glow"
        style={{
          background: `radial-gradient(circle at 30% 30%, ${partner.brandColor}40 0%, transparent 55%), radial-gradient(circle at 75% 70%, rgba(245, 158, 11, 0.18) 0%, transparent 60%)`,
        }}
      />

      <div className="relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          {/* COLONNE GAUCHE : H1 + lead + CTA */}
          <div className="lg:col-span-7 animate-hero-fade-up">
            {/* Eyebrow + rating */}
            <div className="flex items-center gap-3 flex-wrap">
              <span className="ds-eyebrow text-primary-soft inline-flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
                AVIS CRYPTOREFLEX · {review.lastUpdated.slice(0, 4)}
              </span>
              <span className="hidden sm:inline-flex items-center gap-1 text-xs text-muted">
                <Clock className="h-3 w-3" aria-hidden="true" />
                Testé sur {review.testDuration}
              </span>
            </div>

            {/* H1 + nom + tagline */}
            <h1
              id="partner-hero-title"
              className="mt-3 text-4xl sm:text-5xl lg:text-6xl font-extrabold text-fg tracking-[-0.025em] leading-[1.05]"
            >
              {partner.name}
              <span className="block mt-2 text-xl sm:text-2xl lg:text-3xl font-bold text-primary">
                {heroLead}
              </span>
            </h1>

            <p className="mt-5 text-base sm:text-lg text-fg/75 max-w-2xl leading-relaxed animate-hero-fade-up-delay-1">
              {review.verdict.summary}
            </p>

            {/* Trust row : rating + reviews count */}
            <div className="mt-6 flex items-center gap-5 flex-wrap animate-hero-fade-up-delay-2">
              <RatingDisplay rating={review.rating} />
              <a
                href={review.externalReviewSource.url}
                target="_blank"
                rel="noopener nofollow"
                className="text-xs text-muted hover:text-fg transition-colors"
              >
                {review.externalReviewCount.toLocaleString("fr-FR")} avis sur{" "}
                {review.externalReviewSource.name} ↗
              </a>
            </div>

            {/* CTA principal hero */}
            <div className="mt-7 flex flex-col sm:flex-row gap-3 animate-hero-fade-up-delay-3">
              <Link
                href={`/go/${partner.slug}?ctx=detail&pos=hero`}
                rel="sponsored noopener"
                target="_blank"
                className="btn-primary btn-primary-shine partner-cta-pulse min-h-[56px] inline-flex items-center justify-center gap-2 px-6 text-base font-bold"
              >
                Voir l&apos;offre {partner.name}
                <ExternalLink className="h-4 w-4" aria-hidden="true" />
              </Link>
              <a
                href="#verdict"
                className="min-h-[56px] inline-flex items-center justify-center gap-2 px-6 text-sm font-semibold text-fg/80 hover:text-fg transition-colors"
              >
                Lire notre verdict
                <ChevronDown className="h-4 w-4" aria-hidden="true" />
              </a>
            </div>

            {/* Disclosure légère */}
            <p className="mt-3 text-[11px] text-muted">
              Lien affilié — sans surcoût pour toi.
            </p>
          </div>

          {/* COLONNE DROITE : carte hero brand + price */}
          <div className="lg:col-span-5 animate-hero-fade-up-delay-2">
            <div
              className="relative rounded-3xl border border-border overflow-hidden p-6 sm:p-8"
              style={{
                background: `linear-gradient(135deg, ${partner.brandColor}25 0%, ${partner.brandColor}10 50%, transparent 100%)`,
              }}
            >
              <div className="flex items-start justify-between gap-3 mb-6">
                <span
                  className="inline-flex h-16 w-16 items-center justify-center rounded-2xl border border-white/10 overflow-hidden shrink-0"
                  aria-hidden="true"
                >
                  <Image
                    src={`${partner.logoPath}?v=2`}
                    alt={`Logo ${partner.name}`}
                    width={64}
                    height={64}
                    className="object-contain"
                    priority
                    unoptimized
                  />
                </span>
                <span className="badge badge-trust shrink-0">
                  <Crown className="h-3 w-3" aria-hidden="true" />
                  Vérifié
                </span>
              </div>

              <p className="text-xs uppercase tracking-wider text-muted mb-1">
                À partir de
              </p>
              <p className="text-5xl sm:text-6xl font-extrabold text-fg font-mono tabular-nums tracking-[-0.03em]">
                {partner.priceFrom}
              </p>

              <ul className="mt-6 space-y-2.5 border-t border-white/10 pt-5">
                {partner.pros.slice(0, 3).map((p, i) => (
                  <li
                    key={p}
                    className="text-sm text-fg/85 flex items-start gap-2 partner-stat-pop"
                    style={{ ["--i" as never]: i }}
                  >
                    <CheckCircle2
                      className="h-4 w-4 text-success shrink-0 mt-0.5"
                      aria-hidden="true"
                    />
                    <span className="leading-snug">{p}</span>
                  </li>
                ))}
              </ul>

              <div className="mt-6 grid grid-cols-3 gap-2 text-center">
                <MiniStat
                  label="Note"
                  value={`${review.rating}/5`}
                  icon={Star}
                />
                <MiniStat
                  label="Pays"
                  value={partner.country}
                  icon={Globe}
                />
                <MiniStat
                  label="Depuis"
                  value={partner.since}
                  icon={Calendar}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function RatingDisplay({ rating }: { rating: number }) {
  return (
    <div
      className="inline-flex items-center gap-1.5"
      aria-label={`Note ${rating} sur 5`}
    >
      <div className="flex items-center gap-0.5" aria-hidden="true">
        {[1, 2, 3, 4, 5].map((i) => {
          const filled = i <= Math.floor(rating);
          const half = !filled && i - rating < 1 && i - rating > 0;
          return (
            <Star
              key={i}
              className={`h-4 w-4 ${
                filled
                  ? "fill-primary text-primary"
                  : half
                    ? "fill-primary/50 text-primary"
                    : "text-fg/20"
              }`}
            />
          );
        })}
      </div>
      <span className="text-sm font-bold text-fg font-mono tabular-nums">
        {rating.toFixed(1)}
      </span>
      <span className="text-xs text-muted">/5</span>
    </div>
  );
}

function MiniStat({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon: typeof Star;
}) {
  return (
    <div className="rounded-xl bg-elevated/40 border border-white/5 px-2 py-3">
      <Icon
        className="h-3 w-3 text-muted mx-auto mb-1.5"
        aria-hidden="true"
      />
      <p className="text-[10px] uppercase tracking-wider text-muted">
        {label}
      </p>
      <p className="text-xs font-bold text-fg mt-0.5">{value}</p>
    </div>
  );
}

/* ========================================================================== */
/*  VERDICT — bestFor / notFor                                                */
/* ========================================================================== */

function PartnerVerdict({
  review,
  partner,
}: {
  review: PartnerReview;
  partner: Partner;
}) {
  return (
    <section
      id="verdict"
      aria-labelledby="verdict-title"
      className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 mt-16"
    >
      <div
        className="partner-section glass rounded-3xl p-6 sm:p-8 lg:p-10"
        style={{ ["--i" as never]: 0 }}
      >
        <div className="flex items-start justify-between gap-3 mb-5 flex-wrap">
          <div>
            <span className="ds-eyebrow text-primary-soft inline-flex items-center gap-1.5">
              <Award className="h-3.5 w-3.5" aria-hidden="true" />
              VERDICT EN 30 SECONDES
            </span>
            <h2
              id="verdict-title"
              className="mt-2 text-2xl sm:text-3xl font-extrabold text-fg tracking-tight"
            >
              Notre prise après {review.testDuration}
            </h2>
          </div>
          <RatingDisplay rating={review.rating} />
        </div>

        <p className="text-base sm:text-lg text-fg/85 leading-relaxed mb-7 italic border-l-2 border-primary/40 pl-4">
          &ldquo;{review.verdict.summary}&rdquo;
        </p>

        <div className="rounded-2xl border border-success/30 bg-success/5 p-5">
          <p className="ds-eyebrow text-success inline-flex items-center gap-1.5 mb-3">
            <Target className="h-3.5 w-3.5" aria-hidden="true" />
            FAIT POUR
          </p>
          <ul className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2">
            {review.verdict.bestFor.map((b) => (
              <li
                key={b}
                className="text-sm text-fg/85 flex items-start gap-2 leading-relaxed"
              >
                <CheckCircle2
                  className="h-4 w-4 text-success shrink-0 mt-0.5"
                  aria-hidden="true"
                />
                <span>{b}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* CTA in-content */}
        <div className="mt-7 pt-6 border-t border-border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <p className="text-sm text-fg/75">
            Tu te reconnais dans &ldquo;à choisir si&rdquo; ? Passe à
            l&apos;action :
          </p>
          <Link
            href={`/go/${partner.slug}?ctx=detail&pos=verdict`}
            rel="sponsored noopener"
            target="_blank"
            className="btn-primary btn-primary-shine min-h-[48px] inline-flex items-center gap-2 px-5 whitespace-nowrap"
          >
            Voir {partner.name}
            <ExternalLink className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
      </div>
    </section>
  );
}

/* ========================================================================== */
/*  PEDAGOGY — "Comprendre en 3 min" : 4 cards (probleme/solution/mecanisme/ROI)
/*  Conçu pour donner ENVIE d'acheter en expliquant POURQUOI honnêtement.
/* ========================================================================== */

function Pedagogy({
  partner,
  review,
}: {
  partner: Partner;
  review: PartnerReview;
}) {
  const { problem, solution, mechanism, roi } = review.pedagogy;
  return (
    <section
      aria-labelledby="pedagogy-title"
      className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 mt-16"
    >
      <header
        className="partner-section text-center max-w-3xl mx-auto mb-8"
        style={{ ["--i" as never]: 0 }}
      >
        <span className="ds-eyebrow text-primary-soft inline-flex items-center gap-1.5">
          <Lightbulb className="h-3.5 w-3.5" aria-hidden="true" />
          COMPRENDRE {partner.name.toUpperCase()} EN 3 MINUTES
        </span>
        <h2
          id="pedagogy-title"
          className="mt-3 text-3xl sm:text-4xl font-extrabold text-fg tracking-[-0.02em] leading-tight"
        >
          Pourquoi tu en as <span className="text-primary">vraiment</span> besoin
        </h2>
        <p className="mt-3 text-base text-fg/70 leading-relaxed">
          Pas de jargon. Pas de marketing. Juste les 4 vérités qui justifient
          (ou pas) cet investissement pour toi.
        </p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-5">
        <PedagogyCard
          step={1}
          title={problem.title}
          body={problem.body}
          stat={problem.stat}
          tone="warning"
          Icon={AlertTriangle}
          partner={partner}
          index={1}
        />
        <PedagogyCard
          step={2}
          title={solution.title}
          body={solution.body}
          stat={solution.stat}
          tone="success"
          Icon={Lightbulb}
          partner={partner}
          index={2}
        />
        <PedagogyCard
          step={3}
          title={mechanism.title}
          body={mechanism.body}
          tone="primary"
          Icon={Settings2}
          partner={partner}
          index={3}
          steps={mechanism.steps}
        />
        <PedagogyCard
          step={4}
          title={roi.title}
          body={roi.body}
          stat={roi.stat}
          tone="primary"
          Icon={Coins}
          partner={partner}
          index={4}
        />
      </div>
    </section>
  );
}

function PedagogyCard({
  step,
  title,
  body,
  stat,
  tone,
  Icon,
  partner,
  index,
  steps,
}: {
  step: number;
  title: string;
  body: string;
  stat?: string;
  tone: "warning" | "success" | "primary";
  Icon: typeof Star;
  partner: Partner;
  index: number;
  steps?: string[];
}) {
  const toneClasses: Record<typeof tone, string> = {
    warning:
      "border-warning/35 bg-gradient-to-br from-warning/8 via-warning/4 to-transparent",
    success:
      "border-success/35 bg-gradient-to-br from-success/8 via-success/4 to-transparent",
    primary:
      "border-primary/35 bg-gradient-to-br from-primary/8 via-primary/4 to-transparent",
  };
  const iconBgClasses: Record<typeof tone, string> = {
    warning: "bg-warning/15 text-warning ring-warning/30",
    success: "bg-success/15 text-success ring-success/30",
    primary: "bg-primary/15 text-primary ring-primary/30",
  };
  const labelClasses: Record<typeof tone, string> = {
    warning: "text-warning",
    success: "text-success",
    primary: "text-primary-soft",
  };
  const labelByTone: Record<typeof tone, string> = {
    warning: "ACTE 1 · LE PROBLÈME",
    success: "ACTE 2 · LA SOLUTION",
    primary: step === 3 ? "ACTE 3 · COMMENT ÇA MARCHE" : "ACTE 4 · LE ROI",
  };

  return (
    <article
      className={`partner-section group relative overflow-hidden rounded-3xl border p-6 sm:p-7 transition-all duration-500 hover:-translate-y-0.5 hover:shadow-2xl hover:shadow-black/30 ${toneClasses[tone]}`}
      style={{ ["--i" as never]: index }}
    >
      {/* Glow brand color subtle au hover */}
      <span
        aria-hidden="true"
        className="absolute -top-20 -right-20 w-48 h-48 rounded-full blur-3xl opacity-0 group-hover:opacity-40 transition-opacity duration-700"
        style={{
          background: `radial-gradient(circle, ${partner.brandColor}55 0%, transparent 70%)`,
        }}
      />

      <header className="relative flex items-start justify-between gap-3 mb-4">
        <div className="flex items-center gap-3">
          <span
            className={`inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ring-1 ${iconBgClasses[tone]} group-hover:scale-110 transition-transform duration-500`}
            aria-hidden="true"
          >
            <Icon className="h-5 w-5" strokeWidth={1.85} />
          </span>
          <div className="min-w-0">
            <p
              className={`text-[10px] font-bold tracking-[0.12em] uppercase ${labelClasses[tone]}`}
            >
              {labelByTone[tone]}
            </p>
            <h3 className="mt-0.5 text-lg sm:text-xl font-extrabold text-fg leading-tight">
              {title}
            </h3>
          </div>
        </div>
        {stat && (
          <span
            className={`shrink-0 text-2xl sm:text-3xl font-extrabold font-mono tabular-nums tracking-[-0.02em] partner-stat-pop ${labelClasses[tone]}`}
            style={{ ["--i" as never]: index }}
            aria-hidden="true"
          >
            {stat}
          </span>
        )}
      </header>

      <p className="relative text-sm sm:text-[15px] text-fg/80 leading-relaxed">
        {body}
      </p>

      {steps && steps.length > 0 && (
        <ol className="relative mt-4 space-y-2 border-l-2 border-primary/30 pl-4">
          {steps.map((s, i) => (
            <li
              key={i}
              className="text-sm text-fg/85 leading-relaxed flex items-start gap-2.5"
            >
              <span
                className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/20 text-primary text-[11px] font-extrabold font-mono tabular-nums mt-0.5"
                aria-hidden="true"
              >
                {i + 1}
              </span>
              <span>{s}</span>
            </li>
          ))}
        </ol>
      )}
    </article>
  );
}

/* ========================================================================== */
/*  BEFORE / AFTER — visualisation "Sans X" vs "Avec X"                       */
/* ========================================================================== */

function BeforeAfter({
  partner,
  review,
}: {
  partner: Partner;
  review: PartnerReview;
}) {
  const { beforeTitle, beforeItems, afterTitle, afterItems } =
    review.beforeAfter;

  return (
    <section
      aria-labelledby="before-after-title"
      className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 mt-16"
    >
      <header
        className="partner-section text-center max-w-3xl mx-auto mb-8"
        style={{ ["--i" as never]: 0 }}
      >
        <span className="ds-eyebrow text-primary-soft inline-flex items-center gap-1.5">
          <ArrowDown className="h-3.5 w-3.5" aria-hidden="true" />
          VOILÀ CE QUI CHANGE POUR TOI
        </span>
        <h2
          id="before-after-title"
          className="mt-3 text-2xl sm:text-3xl font-extrabold text-fg tracking-tight leading-tight"
        >
          La différence concrète, jour après jour
        </h2>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-5 relative">
        {/* Card BEFORE — rouge / friction */}
        <div
          className="partner-section relative rounded-3xl border border-warning/30 bg-gradient-to-br from-warning/8 via-warning/3 to-transparent p-6 sm:p-7 overflow-hidden"
          style={{ ["--i" as never]: 1 }}
        >
          <div className="flex items-center gap-3 mb-5">
            <span
              className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-warning/15 text-warning ring-1 ring-warning/30"
              aria-hidden="true"
            >
              <XCircle className="h-5 w-5" strokeWidth={1.85} />
            </span>
            <div>
              <p className="text-[10px] font-bold tracking-[0.12em] uppercase text-warning">
                Aujourd&apos;hui
              </p>
              <h3 className="mt-0.5 text-lg font-extrabold text-fg/90 leading-tight">
                {beforeTitle}
              </h3>
            </div>
          </div>
          <ul className="space-y-2.5">
            {beforeItems.map((it, i) => (
              <li
                key={i}
                className="text-sm text-fg/75 leading-relaxed flex items-start gap-2.5"
              >
                <XCircle
                  className="h-4 w-4 text-warning shrink-0 mt-0.5"
                  aria-hidden="true"
                />
                <span>{it}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Flèche centrale (mobile : flèche verticale ; desktop : horizontale) */}
        <span
          aria-hidden="true"
          className="hidden md:flex absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10 h-12 w-12 items-center justify-center rounded-full bg-elevated/90 backdrop-blur-md border border-primary/40 shadow-lg shadow-primary/10"
        >
          <ArrowRight className="h-5 w-5 text-primary" />
        </span>

        {/* Card AFTER — vert / résolution */}
        <div
          className="partner-section relative rounded-3xl border border-success/30 bg-gradient-to-br from-success/8 via-success/3 to-transparent p-6 sm:p-7 overflow-hidden"
          style={{ ["--i" as never]: 2 }}
        >
          {/* Halo brand color subtle */}
          <span
            aria-hidden="true"
            className="absolute -top-20 -right-20 w-48 h-48 rounded-full blur-3xl opacity-30"
            style={{
              background: `radial-gradient(circle, ${partner.brandColor}55 0%, transparent 70%)`,
            }}
          />
          <div className="relative flex items-center gap-3 mb-5">
            <span
              className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-success/15 text-success ring-1 ring-success/30"
              aria-hidden="true"
            >
              <CheckCircle2 className="h-5 w-5" strokeWidth={1.85} />
            </span>
            <div>
              <p className="text-[10px] font-bold tracking-[0.12em] uppercase text-success">
                Avec {partner.name}
              </p>
              <h3 className="mt-0.5 text-lg font-extrabold text-fg leading-tight">
                {afterTitle}
              </h3>
            </div>
          </div>
          <ul className="relative space-y-2.5">
            {afterItems.map((it, i) => (
              <li
                key={i}
                className="text-sm text-fg/85 leading-relaxed flex items-start gap-2.5"
              >
                <CheckCircle2
                  className="h-4 w-4 text-success shrink-0 mt-0.5"
                  aria-hidden="true"
                />
                <span>{it}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* CTA après le before/after — moment de bascule émotionnelle idéal */}
      <div
        className="partner-section mt-7 text-center"
        style={{ ["--i" as never]: 3 }}
      >
        <Link
          href={`/go/${partner.slug}?ctx=detail&pos=after-beforeafter`}
          rel="sponsored noopener"
          target="_blank"
          className="btn-primary btn-primary-shine min-h-[52px] inline-flex items-center justify-center gap-2 px-7 text-base font-bold"
        >
          Passer du côté &ldquo;Avec {partner.name}&rdquo;
          <ExternalLink className="h-4 w-4" aria-hidden="true" />
        </Link>
        <p className="mt-2 text-[11px] text-muted">
          Lien affilié — sans surcoût pour toi.
        </p>
      </div>
    </section>
  );
}

/* ========================================================================== */
/*  WHY BUY NOW — loss aversion sourcée, sans comparaison inter-partenaires    */
/* ========================================================================== */

function WhyBuyNow({
  partner,
  review,
}: {
  partner: Partner;
  review: PartnerReview;
}) {
  return (
    <section
      aria-labelledby="why-buy-now-title"
      className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 mt-16"
    >
      <header
        className="partner-section mb-6"
        style={{ ["--i" as never]: 1 }}
      >
        <span className="ds-eyebrow text-primary-soft inline-flex items-center gap-1.5">
          <TrendingUp className="h-3.5 w-3.5" aria-hidden="true" />
          POURQUOI {partner.name.toUpperCase()} MAINTENANT
        </span>
        <h2
          id="why-buy-now-title"
          className="mt-2 text-2xl sm:text-3xl font-extrabold text-fg tracking-tight"
        >
          {review.whyBuyNow.length} raisons concrètes — pas du marketing
        </h2>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {review.whyBuyNow.map((r, i) => (
          <div
            key={r.reason}
            className="partner-section relative rounded-2xl border border-border bg-elevated/40 p-5 hover:border-primary/40 hover:bg-elevated/60 transition-all duration-300"
            style={{ ["--i" as never]: i + 2 }}
          >
            <div className="flex items-start gap-3 mb-2">
              <span
                className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary text-sm font-extrabold font-mono tabular-nums"
                aria-hidden="true"
              >
                {i + 1}
              </span>
              <h3 className="text-base font-bold text-fg leading-tight">
                {r.reason}
              </h3>
            </div>
            <p className="text-sm text-fg/70 leading-relaxed pl-11">
              {r.description}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ========================================================================== */
/*  PRODUCT SHOWCASE                                                          */
/* ========================================================================== */

function ProductShowcase({ partner }: { partner: Partner }) {
  return (
    <section
      aria-labelledby="products-title"
      className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 mt-16"
    >
      <header
        className="partner-section mb-6 flex items-end justify-between gap-3 flex-wrap"
        style={{ ["--i" as never]: 0 }}
      >
        <div>
          <span className="ds-eyebrow text-primary-soft inline-flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
            CATALOGUE {partner.name.toUpperCase()}
          </span>
          <h2
            id="products-title"
            className="mt-2 text-2xl sm:text-3xl font-extrabold text-fg tracking-tight"
          >
            Quel modèle est fait pour toi ?
          </h2>
        </div>
        <Link
          href={`/go/${partner.slug}?ctx=detail&pos=catalogue-link`}
          rel="sponsored noopener"
          target="_blank"
          className="text-sm font-semibold text-primary hover:underline inline-flex items-center gap-1"
        >
          Voir tout le catalogue
          <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
        </Link>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {partner.products.map((product, i) => (
          <ProductCard
            key={product.id}
            product={product}
            partner={partner}
            index={i}
          />
        ))}
      </div>
    </section>
  );
}

function ProductCard({
  product,
  partner,
  index,
}: {
  product: PartnerProduct;
  partner: Partner;
  index: number;
}) {
  const Icon = product.Icon;
  return (
    <Link
      href={`/go/${partner.slug}?ctx=detail-product&pos=${product.id}`}
      rel="sponsored noopener"
      target="_blank"
      className="group/card partner-section relative flex flex-col rounded-2xl border border-border bg-elevated/30 hover:border-primary/40 hover:bg-elevated/60 hover:-translate-y-1 hover:shadow-2xl hover:shadow-primary/10 transition-all duration-500 overflow-hidden"
      style={{ ["--i" as never]: index + 1 }}
    >
      {product.badge && (
        <span
          className={`absolute top-3 right-3 z-10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider rounded-full ${TONE_STYLES[product.badge.tone]}`}
        >
          {product.badge.label}
        </span>
      )}

      <div
        className="relative h-36 sm:h-40 flex items-center justify-center overflow-hidden"
        style={{
          background: `linear-gradient(135deg, ${partner.brandColor}30 0%, ${partner.brandColor}05 70%, transparent 100%)`,
        }}
        aria-hidden="true"
      >
        <span
          className="absolute inset-0 opacity-0 group-hover/card:opacity-100 transition-opacity duration-500"
          style={{
            background:
              "radial-gradient(circle at center, rgba(245,158,11,0.18) 0%, transparent 65%)",
          }}
        />
        {product.imagePath ? (
          <Image
            src={product.imagePath}
            alt={product.name}
            width={160}
            height={160}
            className="relative object-contain max-h-[85%] w-auto group-hover/card:scale-105 transition-transform duration-500"
            unoptimized
          />
        ) : (
          <Icon
            className="relative h-16 w-16 text-fg/85 group-hover/card:text-primary group-hover/card:scale-110 transition-all duration-500"
            strokeWidth={1.4}
          />
        )}
      </div>

      <div className="flex flex-col flex-1 p-5">
        <h3 className="text-lg font-extrabold text-fg leading-tight mb-1.5">
          {product.name}
        </h3>
        <p className="text-sm text-fg/65 leading-relaxed mb-4 line-clamp-2">
          {product.description}
        </p>

        <ul className="space-y-1.5 mb-5">
          {product.highlights.map((h) => (
            <li
              key={h}
              className="text-xs text-fg/75 flex items-start gap-2 leading-snug"
            >
              <CheckCircle2
                className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5"
                aria-hidden="true"
              />
              <span>{h}</span>
            </li>
          ))}
        </ul>

        <div className="mt-auto pt-3 flex items-center justify-between border-t border-border">
          <span className="text-xl font-extrabold text-primary font-mono tabular-nums">
            {product.price}
          </span>
          <span className="text-xs font-semibold text-fg/70 inline-flex items-center gap-1 group-hover/card:text-primary transition-colors">
            Choisir
            <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover/card:translate-x-0.5" />
          </span>
        </div>
      </div>
    </Link>
  );
}

/* ========================================================================== */
/*  FIELD TEST SECTIONS                                                        */
/* ========================================================================== */

function FieldTest({
  partner,
  review,
}: {
  partner: Partner;
  review: PartnerReview;
}) {
  return (
    <section
      aria-labelledby="field-test-title"
      className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 mt-16"
    >
      <header
        className="partner-section mb-7"
        style={{ ["--i" as never]: 0 }}
      >
        <span className="ds-eyebrow text-primary-soft inline-flex items-center gap-1.5">
          <ListChecks className="h-3.5 w-3.5" aria-hidden="true" />
          NOTRE TEST TERRAIN · {review.testDuration}
        </span>
        <h2
          id="field-test-title"
          className="mt-2 text-2xl sm:text-3xl font-extrabold text-fg tracking-tight"
        >
          Ce qu&apos;on a réellement vu en usage
        </h2>
      </header>

      <div className="space-y-6">
        {review.sections.map((section, i) => (
          <article
            key={section.title}
            className="partner-section glass rounded-2xl p-6 sm:p-7"
            style={{ ["--i" as never]: i + 1 }}
          >
            <h3 className="text-xl sm:text-2xl font-extrabold text-fg tracking-tight mb-4 leading-tight">
              {section.title}
            </h3>
            <div className="prose-content text-fg/85 leading-relaxed text-[15px] space-y-4">
              {section.content.split(/\n\n+/).map((paragraph, idx) => (
                <p
                  key={idx}
                  dangerouslySetInnerHTML={{
                    __html: renderInlineMarkdown(paragraph),
                  }}
                />
              ))}
            </div>
          </article>
        ))}
      </div>

      {/* CTA in-content après field test */}
      <div
        className="partner-section mt-7 rounded-2xl bg-primary/5 border border-primary/30 p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
        style={{ ["--i" as never]: review.sections.length + 1 }}
      >
        <div>
          <p className="font-bold text-fg mb-0.5">
            Convaincu par {review.testDuration} de retour terrain ?
          </p>
          <p className="text-sm text-fg/75">
            Ne perds pas le momentum — passe sur {partner.name}.
          </p>
        </div>
        <Link
          href={`/go/${partner.slug}?ctx=detail&pos=after-field-test`}
          rel="sponsored noopener"
          target="_blank"
          className="btn-primary btn-primary-shine min-h-[48px] inline-flex items-center gap-2 px-5 shrink-0"
        >
          Voir {partner.name}
          <ExternalLink className="h-4 w-4" aria-hidden="true" />
        </Link>
      </div>
    </section>
  );
}

/** Markdown inline minimal : **bold** + escapeHtml. Sans dépendance. */
function renderInlineMarkdown(text: string): string {
  const escaped = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  return escaped.replace(
    /\*\*([^*]+)\*\*/g,
    '<strong class="text-fg font-bold">$1</strong>'
  );
}

/* ========================================================================== */
/*  RISKS AVOIDED — loss aversion encadrée                                    */
/* ========================================================================== */

function RisksAvoided({
  review,
  partner,
}: {
  review: PartnerReview;
  partner: Partner;
}) {
  return (
    <section
      aria-labelledby="risks-title"
      className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 mt-16"
    >
      <div
        className="partner-section relative rounded-3xl overflow-hidden border border-warning/30 bg-gradient-to-br from-warning/10 via-warning/5 to-transparent p-6 sm:p-8 lg:p-10"
        style={{ ["--i" as never]: 0 }}
      >
        <header className="mb-6">
          <span className="ds-eyebrow text-warning inline-flex items-center gap-1.5">
            <Shield className="h-3.5 w-3.5" aria-hidden="true" />
            CE QUE TU ÉVITES EN AGISSANT MAINTENANT
          </span>
          <h2
            id="risks-title"
            className="mt-2 text-2xl sm:text-3xl font-extrabold text-fg tracking-tight"
          >
            Les risques concrets que {partner.name} neutralise
          </h2>
        </header>

        <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {review.risksAvoided.map((r, i) => (
            <li
              key={r}
              className="partner-section flex items-start gap-3 rounded-xl bg-elevated/50 border border-border p-4 leading-relaxed"
              style={{ ["--i" as never]: i + 1 }}
            >
              <Shield
                className="h-4 w-4 text-warning shrink-0 mt-0.5"
                aria-hidden="true"
              />
              <span className="text-sm text-fg/85">{r}</span>
            </li>
          ))}
        </ul>

        <p className="mt-5 text-xs text-muted italic">
          Aversion aux pertes (Kahneman) : la perte de N euros est psychologiquement
          ~2,25× plus douloureuse que le gain équivalent. Ces risques sont
          réels — pas du marketing.
        </p>
      </div>
    </section>
  );
}

/* ========================================================================== */
/*  SOCIAL PROOF                                                              */
/* ========================================================================== */

function SocialProof({ review }: { review: PartnerReview }) {
  return (
    <section
      aria-label="Preuves sociales"
      className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 mt-16"
    >
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {review.socialProof.map((sp, i) => (
          <div
            key={sp.stat}
            className="partner-section glass rounded-2xl p-5 text-center"
            style={{ ["--i" as never]: i }}
          >
            <p className="text-3xl sm:text-4xl font-extrabold text-primary font-mono tabular-nums tracking-[-0.02em] partner-stat-pop">
              {sp.stat}
            </p>
            <p className="mt-2 text-xs text-fg/70 leading-relaxed">
              {sp.source}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ========================================================================== */
/*  SPECS TABLE                                                               */
/* ========================================================================== */

function SpecsTable({ review }: { review: PartnerReview }) {
  return (
    <section
      aria-labelledby="specs-title"
      className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 mt-16"
    >
      <header
        className="partner-section mb-5"
        style={{ ["--i" as never]: 0 }}
      >
        <span className="ds-eyebrow text-primary-soft">FICHE TECHNIQUE</span>
        <h2
          id="specs-title"
          className="mt-2 text-2xl sm:text-3xl font-extrabold text-fg tracking-tight"
        >
          Les specs vérifiées
        </h2>
      </header>

      <div
        className="partner-section glass rounded-2xl overflow-hidden divide-y divide-border"
        style={{ ["--i" as never]: 1 }}
      >
        {review.specs.map((spec) => (
          <div
            key={spec.label}
            className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-4 px-5 py-3.5 hover:bg-elevated/40 transition-colors"
          >
            <dt className="text-xs sm:text-sm font-semibold text-muted uppercase tracking-wider">
              {spec.label}
            </dt>
            <dd className="sm:col-span-2 text-sm text-fg/90 leading-relaxed font-medium">
              {spec.value}
            </dd>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ========================================================================== */
/*  SETUP STEPS                                                               */
/* ========================================================================== */

function SetupSteps({
  review,
  partner,
}: {
  review: PartnerReview;
  partner: Partner;
}) {
  return (
    <section
      aria-labelledby="setup-title"
      className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 mt-16"
    >
      <header
        className="partner-section mb-6"
        style={{ ["--i" as never]: 0 }}
      >
        <span className="ds-eyebrow text-primary-soft">
          MISE EN ROUTE · {review.setupSteps.length} ÉTAPES
        </span>
        <h2
          id="setup-title"
          className="mt-2 text-2xl sm:text-3xl font-extrabold text-fg tracking-tight"
        >
          Comment on configure {partner.name} sans se planter
        </h2>
      </header>

      <ol className="space-y-3">
        {review.setupSteps.map((step, i) => (
          <li
            key={step.title}
            className="partner-section relative rounded-2xl border border-border bg-elevated/30 p-5 hover:border-primary/40 transition-colors"
            style={{ ["--i" as never]: i + 1 }}
          >
            <div className="flex items-start gap-4">
              <span
                className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary font-extrabold font-mono tabular-nums text-sm border border-primary/30"
                aria-hidden="true"
              >
                {i + 1}
              </span>
              <div className="flex-1 min-w-0">
                <h3 className="text-base font-bold text-fg mb-1.5 leading-tight">
                  {step.title}
                </h3>
                <p className="text-sm text-fg/75 leading-relaxed">
                  {step.description}
                </p>
              </div>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}

/* ========================================================================== */
/*  FAQ — accordion natif <details>, zéro JS                                  */
/* ========================================================================== */

function PartnerFAQ({ review }: { review: PartnerReview }) {
  return (
    <section
      aria-labelledby="faq-title"
      className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 mt-16"
    >
      <header
        className="partner-section mb-5"
        style={{ ["--i" as never]: 0 }}
      >
        <span className="ds-eyebrow text-primary-soft inline-flex items-center gap-1.5">
          <HelpCircle className="h-3.5 w-3.5" aria-hidden="true" />
          QUESTIONS FRÉQUENTES
        </span>
        <h2
          id="faq-title"
          className="mt-2 text-2xl sm:text-3xl font-extrabold text-fg tracking-tight"
        >
          Les objections qu&apos;on entend tous les jours
        </h2>
      </header>

      <div
        className="partner-section glass rounded-2xl overflow-hidden divide-y divide-border"
        style={{ ["--i" as never]: 1 }}
      >
        {review.faq.map((q, i) => (
          <details key={i} className="group">
            <summary className="cursor-pointer list-none flex items-center justify-between gap-4 px-5 py-4 hover:bg-elevated/40 transition-colors">
              <span className="text-sm sm:text-base font-bold text-fg leading-snug">
                {q.question}
              </span>
              <ChevronDown
                className="h-5 w-5 text-muted shrink-0 transition-transform duration-300 group-open:rotate-180 group-open:text-primary"
                aria-hidden="true"
              />
            </summary>
            <div className="px-5 pb-5 text-sm text-fg/80 leading-relaxed">
              {q.answer}
            </div>
          </details>
        ))}
      </div>
    </section>
  );
}

/* ========================================================================== */
/*  FINAL CTA                                                                 */
/* ========================================================================== */

function FinalCta({
  partner,
  review,
}: {
  partner: Partner;
  review: PartnerReview;
}) {
  return (
    <section
      aria-labelledby="final-cta-title"
      className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 mt-20"
    >
      <div
        className="partner-section relative overflow-hidden rounded-3xl border border-primary/30 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-8 sm:p-10 lg:p-12 text-center"
        style={{ ["--i" as never]: 0 }}
      >
        {/* Halo gold derrière */}
        <div
          aria-hidden="true"
          className="absolute inset-0 -z-10 opacity-50"
          style={{
            background:
              "radial-gradient(ellipse at center, rgba(245, 158, 11, 0.20) 0%, transparent 60%)",
            filter: "blur(60px)",
          }}
        />

        <span className="ds-eyebrow text-primary-soft">PRÊT À PASSER ?</span>
        <h2
          id="final-cta-title"
          className="mt-3 text-3xl sm:text-4xl font-extrabold text-fg tracking-[-0.02em] leading-tight"
        >
          {review.verdict.bestFor[0]?.split("(")[0]?.trim() ?? partner.name} ?
          <br />
          <span className="text-primary">C&apos;est ici que ça commence.</span>
        </h2>

        <p className="mt-4 text-base sm:text-lg text-fg/75 max-w-2xl mx-auto leading-relaxed">
          {review.verdict.summary.split(".")[0]}.
        </p>

        <div className="mt-7 flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href={`/go/${partner.slug}?ctx=detail&pos=final-cta`}
            rel="sponsored noopener"
            target="_blank"
            className="btn-primary btn-primary-shine partner-cta-pulse min-h-[56px] inline-flex items-center justify-center gap-2 px-7 text-base font-bold"
          >
            Voir l&apos;offre {partner.name}
            <ExternalLink className="h-4 w-4" aria-hidden="true" />
          </Link>
          <Link
            href="/partenaires"
            className="min-h-[56px] inline-flex items-center justify-center gap-2 px-6 text-sm font-semibold text-fg/70 hover:text-fg transition-colors"
          >
            <ChevronRight className="h-4 w-4 rotate-180" aria-hidden="true" />
            Voir tous nos partenaires
          </Link>
        </div>

        <p className="mt-5 text-[11px] text-muted">
          Lien affilié — Cryptoreflex perçoit {partner.commission ?? "une commission"} sans surcoût pour toi. Si {partner.name}{" "}
          cesse d&apos;être recommandable, on retire la page.
        </p>
      </div>
    </section>
  );
}
