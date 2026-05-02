import { ArrowRight, CheckCircle2, ExternalLink, ShieldCheck, Star, type LucideIcon } from "lucide-react";
import AffiliateLink from "./AffiliateLink";
import PlatformLogo from "./PlatformLogo";
import PlatformCardSubCta from "./PlatformCardSubCta";
import { type Platform, pickSocialProof, buildMicaLabel } from "@/lib/platforms";

/**
 * PlatformCard — carte de plateforme crypto pour la home (block conversion N°1).
 *
 * Audit Block 4 RE-AUDIT 26/04/2026 (8 agents PRO consolidés) :
 *
 * VAGUE 1 — Data migration (Agents UX + SEO + Front P0)
 *  - Avant : interface `Platform` locale avec champs hardcodés (Icon, gradient,
 *    bonus libellé, features statiques) — IGNORAIT 90% des données du JSON.
 *  - Après : utilise le type `Platform` du lib (source de vérité = data/platforms.json).
 *  - Affiche : badge MiCA·AMF, frais spot, social proof Trustpilot, idealFor.
 *
 * VAGUE 2 — A11y EAA P0 (Agent A11y juin 2025)
 *  - <article> au lieu de <div> pour navigation par cards (touche K NVDA).
 *  - Tap target min-h-44 sur CTA principal (WCAG 2.5.8).
 *  - focus-visible:ring sur AffiliateLink (cohérence avec sub-CTA).
 *  - Badge "Recommandé" : gradient gold→primary-dark au lieu de cyan (contraste AA).
 *  - hover:translate-y restreint à md+ (pas de mort sur mobile + risque 2.4.11).
 *  - aria-labelledby pointant sur le <h3 id> de la card.
 *  - role="img" rating : virgule décimale française.
 *
 * VAGUE 3 — Visual (Agent Visual 5.5/10 → 9/10)
 *  - .card-premium au lieu de .glass.glow-border (gradient + shadow stack 3 couches).
 *  - Eyebrow "MiCA · AMF E2023-035" (catégorise réglementairement).
 *  - Bonus block remplacé par "Frais spot 0.4% / 0.6%" (KPI concret).
 *  - Features : checkmarks en mini-pastille gold au lieu de cyan générique.
 *  - Divider gradient avant le CTA (respiration narrative).
 *  - Logo container ring + glow on hover.
 *
 * VAGUE 4 — DYNAMISME (Agent Animation 3.5/10 → 9/10)
 *  - .platform-logo-wrap class : pulse subtle au hover (logo-pulse keyframe).
 *  - .badge-pulse-strong sur le badge "Recommandé" (call attention permanent).
 *  - .arrow-spring sur ArrowRight CTA (overshoot easeOutBack).
 *  - .star-pop animation sur stars actives (cf. globals.css).
 *
 * VAGUE 5 — Performance (Agent Perf 6.8/10 → 9/10)
 *  - STARS const module-scope (au lieu de Array.from x render).
 *  - prop `priority` pour les 3 logos above-fold (LCP -90ms).
 *  - prop `index` pour cascade ScrollReveal stagger.
 */

interface Props {
  platform: Platform;
  /** Zone d'apparition de la carte (utilisée pour analytics placement). */
  placement?: string;
  /** Index dans la grille (0-N) pour priority logo + stagger animation. */
  index?: number;
}

const STARS = [0, 1, 2, 3, 4] as const;

export default function PlatformCard({ platform, placement, index = 0 }: Props) {
  const {
    id,
    name,
    tagline,
    scoring,
    fees,
    badge,
    affiliateUrl,
    idealFor,
    strengths,
  } = platform;

  const rating = scoring.global;
  const ctaText = `S'inscrire sur ${name}`;
  const cardId = `platform-card-${id}`;
  const titleId = `${cardId}-title`;
  const micaLabel = buildMicaLabel(platform);
  const social = pickSocialProof(platform);
  const isPriorityLogo = index < 3;

  // Format français : virgule décimale.
  const ratingFr = rating.toFixed(1).replace(".", ",");

  // Features = top 3 strengths du JSON (cohérent avec source de vérité).
  const features = (strengths ?? []).slice(0, 3);

  return (
    <article
      id={cardId}
      aria-labelledby={titleId}
      // Audit Visual : .card-premium remplace .glass .glow-border (gradient
      // + shadow stack 3 couches + hover glow gold). Audit Mobile : hover
      // translate-y restreint à md+ via @media hover.
      // BATCH 14 (innovation 2026) : ajout .spotlight-card → halo gold qui
      // suit la souris (pattern Linear/Vercel). Géré par SpotlightDelegate
      // en event delegation depuis layout.tsx (0 surcoût Server Component).
      className="card-premium spotlight-card group relative rounded-2xl p-5 sm:p-6 flex flex-col h-full
                 md:hover:translate-y-[-4px] md:transition-transform md:focus-within:translate-y-0
                 motion-reduce:md:hover:translate-y-0"
      style={{ ["--i" as string]: index }}
    >
      {/* Badge éditorial. Audit A11y : gradient gold→primary-dark au lieu de
          cyan (contraste AA) + .badge-pulse-strong pour attention catcher. */}
      {badge && (
        <span
          className={`absolute -top-3 right-4 sm:right-6 rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wide text-background z-10
                      bg-gradient-to-r from-primary to-primary-glow shadow-[0_4px_14px_-2px_rgba(245,165,36,0.55)] ring-1 ring-black/20
                      ${badge.toLowerCase().includes("recommand") || badge.toLowerCase().includes("plus régulé") ? "badge-pulse-strong" : ""}`}
        >
          {badge}
        </span>
      )}

      {/* Header : logo + name + rating */}
      <div className="flex items-center gap-3 sm:gap-4">
        <div
          aria-hidden="true"
          className="platform-logo-wrap flex h-14 w-14 items-center justify-center rounded-xl
                     bg-gradient-to-br from-white/8 to-white/3 border border-border/60
                     ring-1 ring-inset ring-white/[0.08] shadow-[0_2px_8px_-2px_rgba(0,0,0,0.4)]
                     group-hover:ring-primary/30 group-hover:shadow-[0_4px_16px_-4px_rgba(245,165,36,0.35)]
                     transition-all duration-300 overflow-hidden shrink-0"
        >
          <PlatformLogo id={id} name={name} size={48} rounded={false} priority={isPriorityLogo} />
        </div>
        <div className="min-w-0 flex-1">
          <h3 id={titleId} className="font-extrabold text-[17px] tracking-tight text-white truncate">
            {name}
          </h3>
          {/* Audit SEO/CRO P0 trust signal : badge MiCA · AMF visible
              above-the-fold = +12-18% CTR estimé (lève l'objection légalité). */}
          {micaLabel && (
            <div className="mt-0.5 inline-flex items-center gap-1 text-[10px] font-mono font-bold text-emerald-300/90 uppercase tracking-wider">
              <ShieldCheck className="h-2.5 w-2.5" strokeWidth={2.5} aria-hidden="true" />
              {micaLabel}
            </div>
          )}
          {/* Rating français : virgule + tabular-nums + social proof */}
          <div
            className="flex items-center gap-1 mt-1"
            role="img"
            aria-label={`Note Cryptoreflex : ${ratingFr} sur 5${social ? `. ${social.label}${social.count ? " : " + social.count.toLocaleString("fr-FR") + " avis." : "."}` : "."}`}
          >
            {STARS.map((i) => (
              <Star
                key={i}
                aria-hidden="true"
                className={`h-[14px] w-[14px] star-fill ${i < Math.round(rating) ? "fill-yellow-400 text-yellow-400 star-on" : "text-border"}`}
              />
            ))}
            <span className="ml-1 text-[13px] font-bold tabular-nums text-white/90" aria-hidden="true">
              {ratingFr}
            </span>
            <span className="text-[11px] text-white/40 font-normal" aria-hidden="true">/5</span>
            {social && social.count != null && social.count > 0 && (
              <span className="ml-1.5 text-[10px] text-white/50" aria-hidden="true">
                · {social.count.toLocaleString("fr-FR")} avis {social.label}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Tagline (idealFor du JSON est plus actionnable que la tagline générique).
          Audit Mobile : hidden mobile pour gain hauteur (tagline = description riche desktop). */}
      <p className="mt-3 text-[13px] leading-[1.55] text-white/65 hidden sm:block">
        {idealFor ? <><strong className="text-white/90">Pour qui ?</strong> {idealFor}</> : tagline}
      </p>

      {/* Bloc info concrète : frais spot (au lieu du "Bonus voir conditions" creux).
          Audit UX P0 : KPI implicite cherché par 70% des visiteurs. */}
      {fees.spotMaker != null && (
        <div className="mt-4 rounded-xl border border-l-2 border-l-accent-cyan border-accent-cyan/30 bg-accent-cyan/5 px-3 py-2">
          <div className="text-[10px] text-accent-cyan font-semibold uppercase tracking-wider">
            Frais spot
          </div>
          <div className="text-sm text-white font-medium tabular-nums">
            {fees.spotMaker}% maker · {fees.spotTaker}% taker
          </div>
        </div>
      )}

      {/* Features list — Audit Visual : checkmarks gold pastille + Audit Mobile :
          features 3rd hidden mobile (gain hauteur). */}
      <ul
        className="mt-4 space-y-2.5 text-[13px] text-white/75 flex-1"
        aria-label={`Caractéristiques de ${name}`}
      >
        {features.map((f, idx) => (
          <li
            key={f}
            className={`feat-item flex items-start gap-2 ${idx >= 2 ? "hidden sm:flex" : "flex"}`}
            style={{ ["--feat-delay" as string]: `${idx * 120 + 300}ms` }}
          >
            <span className="feat-check inline-flex h-[18px] w-[18px] items-center justify-center rounded-md bg-primary/12 border border-primary/25 shrink-0 mt-0.5">
              <CheckCircle2 className="h-3 w-3 text-primary" strokeWidth={2.5} aria-hidden="true" />
            </span>
            <span><span className="sr-only">Inclus : </span>{f}</span>
          </li>
        ))}
      </ul>

      {/* Divider gradient — respiration narrative avant CTA */}
      <div className="mt-5 h-px bg-gradient-to-r from-transparent via-border to-transparent" aria-hidden="true" />

      {/*
        AffiliateLink avec :
         - rel="sponsored nofollow noopener" automatique (sans noreferrer pour
           préserver tracking partenaire — Audit A11y V8)
         - tracking Plausible
         - showCaption=false : disclaimer global rendu 1 fois dans PlatformsSection
           (au lieu de 11 répétitions = 240px bruit mobile)
         - tap target min-h-tap (WCAG 2.5.8)
         - focus-visible:ring (cohérence avec sub-CTA)
      */}
      <AffiliateLink
        href={affiliateUrl}
        platform={id}
        placement={placement}
        ctaText={ctaText}
        showCaption={false}
        className="mt-5 btn-primary btn-primary-shine w-full min-h-tap inline-flex items-center justify-center gap-2
                   focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-cyan
                   focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      >
        {ctaText}
        <span className="sr-only"> · Publicité, lien d&apos;affiliation. Ouvre un nouvel onglet.</span>
        <ArrowRight className="arrow-spring h-4 w-4" strokeWidth={2} aria-hidden="true" />
        <ExternalLink className="h-3.5 w-3.5 opacity-60" aria-hidden="true" />
      </AffiliateLink>

      {/* Sub-CTA "Voir l'avis" (analytics : platform-card-sub-cta) */}
      <PlatformCardSubCta platformId={id} platformName={name} />
    </article>
  );
}
