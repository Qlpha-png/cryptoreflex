"use client";

/**
 * PricingPriceDisplay — îlot Client A/B pour l'affichage prix (expérience
 * `pricing_display_v1`).
 *
 * 3 variants :
 *  - `monthly` (control) : "2,99 € / mois" en grand (rendu identique au
 *    rendu legacy de TieredPricing).
 *  - `annual-upfront` : "<annualPrice> / an" en grand + "soit <equivMonthly>/mois"
 *    en petit (le mensuel équivalent est calculé : annualPrice / 12).
 *  - `cafe-frame` : "Le prix d'un café par mois" + prix en plus petit.
 *
 * SSR rend le control. Côté Client, hydration → variant cookie-based.
 *
 * Tracking conversion :
 *  - `click_checkout` : sur le bouton CTA voisin (géré par TieredPricing
 *    via une prop `onCtaClick` injectée). Pour ne pas multiplier les wrappers,
 *    on expose ici un helper `trackPricingCheckoutClick()` que TieredPricing
 *    appellera depuis le onClick si le tier porte `abTestKey === "pricing_display_v1"`.
 *  - `checkout_complete` : reste à instrumenter dans le webhook Stripe ou la
 *    page success (hors scope V1 — documenté limitation).
 *
 * Props identiques au rendu prix natif TieredPricing pour rester drop-in.
 */

import { useVariant } from "@/lib/abtest-client";

interface PricingPriceDisplayProps {
  /** Prix mensuel formaté (ex: "2,99 €"). */
  monthlyPrice: string;
  /** Prix annuel formaté (ex: "28,99 €"). Vrai prix Stripe annuel (réduit). */
  annualPrice: string;
  /** Unité par défaut affichée sous le prix (ex: "/ mois"). */
  defaultUnit: string;
}

/**
 * Calcule le mensuel équivalent à partir d'un prix annuel formaté FR.
 * Ex: "28,99 €" → "2,42 €" (28,99 / 12 = 2,4158...).
 */
function computeMonthlyEquivalent(annualPriceFr: string): string {
  const num = parseFloat(annualPriceFr.replace(/[^\d,.]/g, "").replace(",", "."));
  if (!Number.isFinite(num) || num <= 0) return annualPriceFr;
  const monthly = num / 12;
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 2,
  }).format(monthly);
}

const EXPERIMENT_ID = "pricing_display_v1";

export default function PricingPriceDisplay({
  monthlyPrice,
  annualPrice,
  defaultUnit,
}: PricingPriceDisplayProps) {
  const variant = useVariant(EXPERIMENT_ID);

  if (variant === "annual-upfront") {
    // FIX 2026-05-02 audit cohérence : avant on affichait "soit {monthlyPrice}/mois"
    // (= 2,99 €) qui était mathématiquement faux car le prix annuel (28,99 €)
    // équivaut à 2,42 €/mois (économie ~19%). On calcule maintenant le vrai
    // mensuel équivalent depuis annualPrice/12.
    const equivMonthly = computeMonthlyEquivalent(annualPrice);
    return (
      <div className="mt-5">
        <div className="flex items-baseline gap-1">
          <span className="text-3xl sm:text-4xl font-extrabold text-white tabular-nums">
            {annualPrice}
          </span>
          <span className="text-sm text-white/60">/ an</span>
        </div>
        <p className="mt-1 text-xs text-white/55">
          soit <span className="font-semibold text-white/75">{equivMonthly}</span> / mois
          {" "}
          <span className="text-white/45">(au lieu de {monthlyPrice})</span>
        </p>
      </div>
    );
  }

  if (variant === "cafe-frame") {
    return (
      <div className="mt-5">
        <div className="text-base sm:text-lg font-bold text-white leading-snug">
          Le prix d&apos;un café par mois
        </div>
        <div className="mt-1.5 flex items-baseline gap-1">
          <span className="text-xl sm:text-2xl font-extrabold text-white/85 tabular-nums">
            {monthlyPrice}
          </span>
          <span className="text-xs text-white/55">{defaultUnit}</span>
        </div>
      </div>
    );
  }

  // control "monthly" — strictement identique au rendu legacy TieredPricing.
  return (
    <div className="mt-5 flex items-baseline gap-1">
      <span className="text-3xl sm:text-4xl font-extrabold text-white tabular-nums">
        {monthlyPrice}
      </span>
      <span className="text-sm text-white/60">{defaultUnit}</span>
    </div>
  );
}
