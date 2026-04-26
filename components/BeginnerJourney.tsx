// SERVER COMPONENT — DO NOT add 'use client'. Hydration cost is currently 0 KB.
// Audit Block 3 RE-AUDIT 26/04/2026 (Agent Performance P0 RR1) : si tracking
// nécessaire, isoler dans un sibling client component (BeginnerJourneyTracker)
// importé via next/dynamic ssr:false. Préserve score perf 9.5/10.

import dynamic from "next/dynamic";
import Link from "next/link";
import { ArrowRight, Clock, Sparkles } from "lucide-react";
import { BEGINNER_STEPS, beginnerJourneyHowToSchema } from "@/lib/beginner-journey";
import StructuredData from "@/components/StructuredData";

// BeginnerJourneyTracker chargé en dynamic ssr:false pour préserver 0 KB
// hydration sur le composant principal. Coût : ~2 KB JS chunk séparé.
const BeginnerJourneyTracker = dynamic(
  () => import("@/components/BeginnerJourneyTracker"),
  { ssr: false },
);

/**
 * BeginnerJourney — parcours étapé "Premiers pas en crypto" (4 étapes).
 *
 * Audit Block 3 RE-AUDIT 26/04/2026 (8 agents PRO consolidés) :
 *
 * VAGUE 1 — A11y EAA P0 (Agents A11y + Front + UX) :
 *  - Suppression du doublon titre/badge interne (laisse CategoryHeader piloter).
 *  - Suppression du title="..." (antipattern WCAG 2.5.3 Label-in-Name).
 *  - aria-label structuré "Étape X sur 4 : titre" sur chaque Link.
 *  - Suppression du doublon `{idx+1}.` dans H3 (numéro déjà visible via span hero).
 *  - aria-hidden + focusable=false sur toutes les icônes décoratives.
 *  - motion-reduce:transform-none + transition-none sur translate-x ArrowRight.
 *
 * VAGUE 2 — DYNAMISME (Agent Animation 3/10 → 9.5/10) :
 *  - Numéro étape "01-04" en outline gradient hero top-right (style Stripe Atlas).
 *  - .journey-card class : magnetic + spotlight gold qui suit le curseur.
 *  - .journey-card[data-active="true"] = pulse gold doux 2.4s (étape suivante).
 *  - Connector ligne SVG drawn progressively à scroll-reveal (0 à pathLength=1).
 *  - .journey-icon-wrap = bounce-in 700ms + rotation hover.
 *  - .arrow-spring sur ArrowRight CTA (overshoot easeOutBack au hover).
 *  - Cards stagger via --i CSS var (apparition cascade 80ms).
 *
 * VAGUE 3 — SEO/CRO (Agent SEO/CRO 6.5/10 → 9/10) :
 *  - Schema.org HowTo JSON-LD injecté (rich results "How to" Google).
 *  - Anchor texts keyword-rich (cf. lib/beginner-journey.ts).
 *  - Badge "X min de lecture" par étape (trust + CTR organique).
 *  - data-journey-step attribute pour tracking via BeginnerJourneyTracker.
 *  - "Pas sûr ?" CTA quiz au-dessus de la grille (segmente l'indécis).
 *  - Bloc CTA email secondaire visible (avant : tertiaire enterré).
 *
 * VAGUE 4 — Visual (Agent Visual 6.2/10 → 9/10) :
 *  - Médaillon icône double-couche (ring tinted + gradient).
 *  - Eyebrow "Étape 01" + h3 clean (au lieu de "1. Comprendre" doublon).
 *  - Bg gradient diagonal + inset highlight (style Apple/Stripe metallic).
 *  - Stroke-width Lucide 1.5 (premium vs 1.75 actuel).
 *
 * VAGUE 5 — Mobile (Agent Mobile 5.5/10 → 8.5/10) :
 *  - Carousel scroll-snap horizontal mobile (1500px → 420px scroll).
 *  - Padding p-6 + text-[15px] (lisibilité mobile).
 *  - Connector vertical gradient mobile (entre cards stack).
 */

export default function BeginnerJourney() {
  const totalMinutes = BEGINNER_STEPS.reduce((s, x) => s + x.minutes, 0);

  return (
    <section
      aria-label="Parcours débutant en 4 étapes"
      className="bg-background"
    >
      {/* Schema.org HowTo JSON-LD — rich results "How to" Google */}
      <StructuredData
        id="beginner-journey-howto"
        data={beginnerJourneyHowToSchema()}
      />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
        {/* Audit UX P0 : suppression du doublon titre/badge interne. Le H2 et
            l'intro sont déjà rendus par CategoryHeader (page.tsx) qui pilote
            la voix "Étape 1 — Démarrer maintenant". Pas de redondance ici.
            On garde uniquement la mini-meta total + le CTA "Pas sûr ?" quiz. */}
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <p className="text-sm text-fg/65 inline-flex items-center gap-2">
            <Clock className="h-4 w-4 text-primary-soft" strokeWidth={1.75} aria-hidden="true" focusable="false" />
            <span>~{totalMinutes} min total · 100&nbsp;% gratuit · aucun prérequis</span>
          </p>
          <Link
            href="/quiz/plateforme"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary-soft hover:text-primary-glow transition-colors min-h-[36px]"
            aria-label="Pas sûr·e par où commencer ? Réponds à 5 questions, on te dit l'étape 1"
          >
            <Sparkles className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden="true" focusable="false" />
            Pas sûr·e par où commencer ? Quiz 5Q
          </Link>
        </div>

        {/* Carousel mobile / Grid desktop. Audit Mobile : .mobile-scroll-x déjà
            défini globals.css mais inutilisé ici → on l'utilise pour stack
            vertical 1500px → carousel horizontal 420px sur mobile. */}
        <ol
          aria-label="4 étapes pour démarrer en crypto"
          className="mt-8 flex sm:grid gap-4 sm:gap-8 sm:grid-cols-2 lg:grid-cols-4
                     overflow-x-auto sm:overflow-visible snap-x snap-mandatory
                     scrollbar-thin pb-2 sm:pb-0
                     -mx-4 px-4 sm:mx-0 sm:px-0"
        >
          {BEGINNER_STEPS.map(({ step, Icon, meta, title, description, href, cta }, idx) => (
            <li
              key={step}
              className="relative shrink-0 w-[82%] sm:w-auto snap-start sm:snap-align-none"
              style={{ ["--i" as string]: idx } as React.CSSProperties}
            >
              {/* Connector SVG drawn progressively (desktop entre cards) */}
              {idx < BEGINNER_STEPS.length - 1 && (
                <svg
                  aria-hidden="true"
                  className="hidden lg:block absolute top-12 -right-4 h-0.5 w-8 overflow-visible z-0 pointer-events-none"
                  viewBox="0 0 32 2"
                  preserveAspectRatio="none"
                >
                  <defs>
                    <linearGradient id={`stepConn-${idx}`} x1="0" x2="1">
                      <stop offset="0" stopColor="rgb(245 165 36)" stopOpacity="0.6" />
                      <stop offset="1" stopColor="rgb(245 165 36)" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  <path
                    d="M0 1 H32"
                    pathLength={1}
                    className="spark-draw"
                    stroke={`url(#stepConn-${idx})`}
                    strokeWidth={2}
                    strokeLinecap="round"
                    fill="none"
                  />
                </svg>
              )}

              {/* Connector vertical mobile (entre cards stackées) */}
              {idx < BEGINNER_STEPS.length - 1 && (
                <span
                  aria-hidden="true"
                  className="sm:hidden absolute left-9 -bottom-3 h-3 w-0.5 bg-gradient-to-b from-primary/40 to-transparent z-0 pointer-events-none"
                />
              )}

              <Link
                href={href}
                data-journey-step={step}
                aria-label={`Étape ${idx + 1} sur ${BEGINNER_STEPS.length} : ${title}. ${cta}.`}
                className="journey-card group relative flex h-full min-h-[260px] flex-col rounded-2xl border border-border
                           bg-gradient-to-br from-surface to-surface/60 backdrop-blur-[1px]
                           p-6 sm:p-7 transition-all motion-reduce:transition-none hover:border-primary/50
                           shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)]
                           focus:outline-none focus-visible:ring-2 focus-visible:ring-primary
                           focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              >
                {/* Numéro hero outline gradient absolute top-right (Stripe Atlas style).
                    aria-hidden : numéro déjà annoncé via aria-label "Étape X sur 4". */}
                <span
                  aria-hidden="true"
                  className="absolute top-4 right-5 font-display text-[56px] leading-none font-black tracking-tighter
                             bg-clip-text text-transparent bg-gradient-to-br from-primary/55 to-primary/5
                             group-hover:from-primary/75 group-hover:to-primary/15
                             transition-[background] duration-300 ease-emphasized"
                >
                  {step}
                </span>

                {/* Médaillon icône double-couche : ring + gradient + bounce-in mount */}
                <span
                  className="journey-icon-wrap inline-flex h-14 w-14 items-center justify-center rounded-2xl
                             bg-gradient-to-br from-primary/15 to-primary/5 ring-1 ring-primary/25
                             text-primary group-hover:ring-primary/45 group-hover:scale-105
                             transition-transform duration-normal motion-reduce:transition-none motion-reduce:transform-none"
                >
                  <Icon className="h-6 w-6" strokeWidth={1.5} aria-hidden="true" focusable="false" />
                </span>

                {/* Eyebrow durée + Title clean (suppression doublon `{idx+1}.`) */}
                <span className="mt-5 inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-primary-soft/80">
                  <Clock className="h-3 w-3" strokeWidth={1.75} aria-hidden="true" focusable="false" />
                  {meta}
                </span>
                <h3 className="mt-1.5 text-xl sm:text-lg font-bold text-fg">{title}</h3>

                <p className="mt-2 text-[15px] sm:text-sm text-fg/70 leading-relaxed flex-1">
                  {description}
                </p>

                {/* CTA + Arrow spring au hover */}
                <span className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-primary-soft group-hover:text-primary transition-colors motion-reduce:transition-none">
                  {cta}
                  <ArrowRight
                    className="arrow-spring h-4 w-4 motion-reduce:transition-none"
                    strokeWidth={1.75}
                    aria-hidden="true"
                    focusable="false"
                  />
                </span>

                {/* Checkmark ✓ (visible si data-visited="true" via Tracker, sinon hidden via CSS) */}
                <span
                  className="journey-check-badge absolute top-3 left-3 grid h-6 w-6 place-items-center rounded-full bg-success/15 ring-1 ring-success/40 opacity-0 scale-50 pointer-events-none"
                  aria-hidden="true"
                >
                  <svg viewBox="0 0 12 12" className="h-3 w-3 text-success">
                    <path
                      d="M2.5 6.5 L5 9 L9.5 3.5"
                      pathLength={1}
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={2}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </span>
              </Link>
            </li>
          ))}
        </ol>

        {/* Bloc CTA email secondaire — Audit UX P1 : remonté du tertiaire enterré
            en bloc visible. Pour Marie qui n'a pas le temps de tout lire maintenant. */}
        <div className="mt-12 rounded-2xl border border-primary/20 bg-primary/5 p-6 text-center">
          <p className="text-base font-semibold text-fg">Pas le temps de tout lire maintenant ?</p>
          <p className="mt-1 text-sm text-fg/70">
            On t&apos;envoie le parcours complet en 7 emails — 1 par jour, 3 min de lecture.
          </p>
          <Link
            href="#cat-informe"
            className="btn-primary mt-4 inline-flex"
            aria-label="Recevoir le parcours débutant complet par email en 7 jours"
          >
            <Sparkles className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" focusable="false" />
            Recevoir le parcours par email
          </Link>
        </div>
      </div>

      {/* Tracker client séparé — dynamic ssr:false pour préserver perf RSC.
          Lit localStorage, applique data-active sur la prochaine étape,
          révèle les checkmarks ✓ sur les étapes complétées. */}
      <BeginnerJourneyTracker />
    </section>
  );
}
