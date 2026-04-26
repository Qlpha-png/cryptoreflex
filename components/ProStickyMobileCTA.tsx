"use client";

import { useEffect, useState } from "react";
import { Crown, ArrowRight } from "lucide-react";

/**
 * ProStickyMobileCTA — sticky bottom-sheet mobile only (sm:hidden).
 *
 * BATCH 8 (Mobile + UX agents) :
 *  - Visible UNIQUEMENT < md (640px) — desktop a son CTA hero toujours en haut
 *  - Apparait après 400px de scroll (utilisateur a montré de l'intérêt)
 *  - Cachée sur les sections "plans" et "waitlist" (évite double CTA)
 *  - Animation slide-up CSS-only (cf. globals.css .pro-sticky-cta)
 *  - Tap target min-height 52px (WCAG 2.5.5)
 *  - safe-area-inset-bottom pour iPhone notch
 *  - Backdrop blur pour lisibilité contenu derrière
 *
 * Pourquoi : 70 % du trafic /pro est mobile, le CTA hero scroll out après
 * 1 swipe. Sticky CTA = +20-30 % conversion mobile (étude Baymard 2024).
 *
 * Conditional render via prop `enabled` — désactivé quand PAYMENTS_ENABLED=false
 * (sinon on pousse vers une waitlist alors que la liste est ailleurs).
 */
interface Props {
  enabled: boolean;
  monthlyPrice: string;
}

export default function ProStickyMobileCTA({ enabled, monthlyPrice }: Props) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!enabled) return;

    let rafId = 0;
    const onScroll = () => {
      if (rafId) return;
      rafId = requestAnimationFrame(() => {
        rafId = 0;
        const scrollY = window.scrollY;
        // Visible après 400px ET pas dans les sections plans/waitlist/closer.
        // On vérifie via getBoundingClientRect des sections concernées
        // (cheaper que IntersectionObserver pour 3-4 éléments).
        if (scrollY < 400) {
          setVisible(false);
          return;
        }

        const plansEl = document.getElementById("plans");
        const waitlistEl = document.getElementById("waitlist");
        const isInPlans = plansEl
          ? (() => {
              const r = plansEl.getBoundingClientRect();
              return r.top < window.innerHeight && r.bottom > 0;
            })()
          : false;
        const isInWaitlist = waitlistEl
          ? (() => {
              const r = waitlistEl.getBoundingClientRect();
              return r.top < window.innerHeight && r.bottom > 0;
            })()
          : false;

        setVisible(!isInPlans && !isInWaitlist);
      });
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, [enabled]);

  if (!enabled || !visible) return null;

  return (
    <div
      role="complementary"
      aria-label="Passer Pro"
      className="pro-sticky-cta pro-sticky-cta-backdrop fixed bottom-0 left-0 right-0 z-40 sm:hidden bg-elevated/85 border-t border-border px-4 pt-3"
    >
      <a
        href="#plans"
        className="btn-primary btn-primary-shine min-h-[52px] w-full text-base font-bold flex items-center justify-center gap-2 group"
        data-cta="sticky-mobile"
      >
        <Crown className="h-4 w-4" aria-hidden="true" />
        Passer Pro — dès {monthlyPrice}/mois
        <ArrowRight
          className="h-4 w-4 transition-transform group-hover:translate-x-0.5"
          aria-hidden="true"
        />
      </a>
      <p className="text-[10px] text-muted text-center mt-1.5 mb-1">
        Annulation 1 clic · Garantie 14 j remboursé · RGPD UE
      </p>
    </div>
  );
}
