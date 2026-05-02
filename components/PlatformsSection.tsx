import { ArrowRight, ShieldCheck, Star, Sparkles } from "lucide-react";
import Link from "next/link";
import PlatformCard from "./PlatformCard";
import AmfDisclaimer from "./AmfDisclaimer";
import StructuredData from "./StructuredData";
import PlatformsCarouselControls from "./PlatformsCarouselControls";
import { getExchangePlatforms, platformsItemListSchema } from "@/lib/platforms";
import { BRAND } from "@/lib/brand";

/**
 * PlatformsSection — block conversion N°1 (affiliation crypto).
 *
 * Refactor 28-04-2026 (user feedback : "on voit que les 6 même tout le temps") :
 * VITRINE 6 cards statique → CAROUSEL HORIZONTAL SWIPE qui montre TOUTES les
 * plateformes. Chaque carte = card width fixe (340px), scroll-snap-x natif,
 * touch swipe mobile + boutons prev/next desktop + dots indicator Apple-style.
 *
 * Avantages :
 *  - User voit qu'il y a + de plateformes (engagement +)
 *  - Pro & technique : transitions fluides, swipe natif zéro JS overhead
 *  - SEO : toutes les plateformes restent dans le DOM (Schema.org ItemList complet)
 *  - Mobile-first : swipe natif iOS/Android = UX qu'ils connaissent (Instagram/TikTok)
 *
 * Schema.org Rich Snippets : ItemList + Product + AggregateRating injecté
 * pour TOUTES les plateformes (pas seulement les 6 visibles avant).
 *
 * Disclaimer affiliation global préservé (loi 9 juin 2023 + DGCCRF).
 */

export default function PlatformsSection() {
  // TOUTES les plateformes (était top 6) — triées par scoring global desc
  const platforms = getExchangePlatforms();
  const totalAvailable = platforms.length;

  return (
    // BATCH 26 — section orchestrée par <CategoryHeader Comparer les plateformes>
    // dans app/page.tsx → on dégonfle en H3 (le H2 est déjà fait). Layout pt-4
    // au lieu de py-20 pour resserrer la respiration entre header et carousel.
    <section
      id="plateformes"
      aria-labelledby="plateformes-title"
      className="relative pb-12 sm:pb-20 lg:pb-28 pt-4"
    >
      {/* Schema.org Rich Snippets — Audit SEO P0 GOLD */}
      <StructuredData
        id="platforms-itemlist"
        data={platformsItemListSchema(platforms, BRAND.url)}
      />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div className="max-w-2xl">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/5 px-3 py-1 text-[10px] font-mono font-bold text-emerald-300/90 uppercase tracking-wider">
              <ShieldCheck className="h-3 w-3" strokeWidth={2.5} aria-hidden="true" />
              {totalAvailable} plateformes vérifiées · MiCA · AMF
            </span>
            <h3
              id="plateformes-title"
              className="mt-4 text-xl sm:text-2xl font-bold tracking-tight"
            >
              Sélection éditoriale —{" "}
              <span className="gradient-text">{totalAvailable} options</span>
            </h3>
            <p className="mt-3 text-sm text-white/70 leading-relaxed">
              Triées par score global. Glisse pour découvrir les {totalAvailable}{" "}
              plateformes (méthodologie publique, frais réels, conformité MiCA
              vérifiée).
            </p>
          </div>
          <Link
            href="/comparatif"
            className="btn-ghost self-start py-2.5 text-sm shrink-0"
          >
            Voir les comparatifs
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>

        {/* Disclaimer affiliation global — Audit Mobile : 1 fois au lieu de N */}
        <p className="mt-5 inline-flex items-center gap-1.5 text-[11px] text-muted">
          <Star className="h-3 w-3 text-primary-soft" strokeWidth={2} aria-hidden="true" />
          <span>
            Liens partenaires rémunérés.{" "}
            <Link href="/transparence" className="underline underline-offset-2 hover:text-fg">
              Pourquoi ?
            </Link>
            {" — "}Sans surcoût pour toi, le site reste gratuit.
          </span>
        </p>

        {/* Carousel horizontal swipeable — toutes les plateformes en defile */}
        <div className="relative mt-8 sm:mt-12 -mx-4 sm:-mx-6 lg:-mx-8">
          {/* Gradient fades latéraux : signal visuel "il y a plus de contenu"
              (pattern Netflix / Apple App Store carousel). pointer-events-none
              pour ne pas bloquer les clicks/swipes. */}
          <div
            aria-hidden="true"
            className="hidden md:block absolute top-0 bottom-0 left-0 w-12 lg:w-16 z-10 pointer-events-none"
            style={{
              background: "linear-gradient(to right, var(--background, #0B0D10) 0%, transparent 100%)",
            }}
          />
          <div
            aria-hidden="true"
            className="hidden md:block absolute top-0 bottom-0 right-0 w-12 lg:w-16 z-10 pointer-events-none"
            style={{
              background: "linear-gradient(to left, var(--background, #0B0D10) 0%, transparent 100%)",
            }}
          />
          {/* Container scroll-snap-x — visible aux extremites grace au negative margin.
              CRITICAL : overflow-x-auto implique overflow-y: hidden CSS spec ;
              on force overflow-y: visible + padding-top pour que les badges
              "PLUS SECURISE" etc. (positionnes -top-3 sur chaque card) ne
              soient PAS clippes par le container. */}
          <div
            id="platforms-carousel-track"
            className="scroll-smooth platforms-carousel-track px-4 sm:px-6 lg:px-8 pt-4 pb-2"
            style={{
              overflowX: "auto",
              overflowY: "visible",
              scrollSnapType: "x mandatory",
              scrollPadding: "0 1rem",
              WebkitOverflowScrolling: "touch",
            }}
          >
            <div className="flex gap-4 sm:gap-5">
              {platforms.map((p, idx) => (
                <div
                  key={p.id}
                  className="shrink-0 snap-start"
                  style={{ width: "340px", scrollSnapAlign: "start" }}
                >
                  <PlatformCard
                    platform={p}
                    placement="home-platforms"
                    index={idx}
                  />
                </div>
              ))}
              {/* Card finale — CTA "voir tous les comparatifs" */}
              <div
                className="shrink-0 snap-start flex items-center"
                style={{ width: "340px", scrollSnapAlign: "start" }}
              >
                <Link
                  href="/comparatif"
                  className="group/end-card relative flex flex-col items-center justify-center w-full h-full min-h-[400px] rounded-2xl border-2 border-dashed border-primary/30 bg-gradient-to-br from-primary/5 to-transparent p-8 text-center hover:border-primary/60 hover:bg-primary/8 transition-all duration-300"
                >
                  <span className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/15 ring-1 ring-primary/30 mb-4 group-hover/end-card:scale-110 transition-transform">
                    <Sparkles className="h-7 w-7 text-primary" strokeWidth={1.85} aria-hidden="true" />
                  </span>
                  <p className="text-lg font-extrabold text-fg mb-1">
                    Tu hésites encore ?
                  </p>
                  <p className="text-sm text-fg/70 max-w-[240px] mb-4 leading-relaxed">
                    Vois tous nos duels comparatifs (Coinbase vs Binance, Ledger vs Trezor…)
                  </p>
                  <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary">
                    Voir les comparatifs
                    <ArrowRight className="h-4 w-4 transition-transform group-hover/end-card:translate-x-0.5" aria-hidden="true" />
                  </span>
                </Link>
              </div>
            </div>
          </div>

          {/* Boutons prev/next + dots indicator (client component) */}
          <PlatformsCarouselControls
            containerId="platforms-carousel-track"
            totalItems={platforms.length + 1}
            cardWidth={356}
          />
        </div>

        {/* CTA "Quiz plateforme" — Audit UX guidance "main tenue" : segmente l'indécis */}
        <div className="mt-10 rounded-2xl border border-primary/20 bg-primary/5 p-6 text-center">
          <p className="text-base font-semibold text-fg">
            Pas sûr·e laquelle choisir ?
          </p>
          <p className="mt-1 text-sm text-fg/70">
            Réponds à 5 questions, on te dit laquelle est faite pour toi (30 secondes).
          </p>
          <Link href="/quiz/plateforme" className="btn-primary mt-4 inline-flex">
            Trouver MA plateforme idéale
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>

        {/* Avertissement AMF — article 222-15 */}
        <AmfDisclaimer variant="comparatif" className="mt-6" />
      </div>
    </section>
  );
}
