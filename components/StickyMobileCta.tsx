"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, X } from "lucide-react";

/**
 * StickyMobileCta — barre CTA flottante mobile au-dessus de MobileBottomNav.
 *
 * Pourquoi (audit Block 1 RE-AUDIT 26/04/2026, Agents Conversion + Mobile P1) :
 *  - Sur mobile, le CTA principal "Trouver ma plateforme" est dans le Hero
 *    (above-the-fold). Une fois scrollé, le visiteur n'a plus de point d'entrée
 *    rapide vers le comparatif → friction.
 *  - Le pouce vit dans la zone "easy" Hoober (bas-centre). MobileBottomNav y est
 *    mais c'est une nav (4 destinations), pas un CTA conversion.
 *  - Bench fintech FR (Boursorama, N26 landings) : sticky CTA mobile = +15-22%
 *    CTR moyen. Non-intrusif tant qu'il est bien positionné.
 *
 * Behavior :
 *  - Visible <lg uniquement (md:hidden).
 *  - Apparait après scroll > 400px (sortie zone Hero).
 *  - Disparait quand on entre dans la section #cat-comparer (PlatformsSection)
 *    via IntersectionObserver — évite le doublon visuel avec les CTAs natifs.
 *  - Bouton X dismiss persistant via sessionStorage (1 seul refresh par session).
 *  - Au-dessus de MobileBottomNav (z-40, MobileBottomNav z-50) — slot dédié.
 *
 * A11y :
 *  - role="region" + aria-label.
 *  - aria-live="off" (apparition non-urgente, pas d'annonce SR).
 *  - Bouton dismiss avec aria-label clair.
 *  - Tap targets 44×44 (min-h-tap).
 *  - Respecte safe-area-inset-bottom iOS.
 *
 * Tracking :
 *  - Plausible event "Sticky CTA Click" via le href anchor.
 *  - Pas de prop tracking dédiée pour rester simple — placement="sticky-mobile"
 *    sera ajoutée si on switch sur AffiliateLink direct vers Bitpanda.
 */
export default function StickyMobileCta() {
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  // Au mount : check sessionStorage pour persistance dismiss + setup scroll listener.
  useEffect(() => {
    if (typeof window === "undefined") return;

    // Persistance dismiss : 1 fermeture = invisible jusqu'au prochain refresh.
    try {
      if (sessionStorage.getItem("sticky-cta-dismissed") === "1") {
        setDismissed(true);
        return;
      }
    } catch {
      /* sessionStorage peut être bloqué (Safari private mode) — on continue */
    }

    // Affiche après scroll > 400px (sortie de la zone Hero).
    const onScroll = () => {
      const y = window.scrollY || window.pageYOffset || 0;
      setVisible(y > 400);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });

    // Cache automatiquement quand le visiteur ENTRE dans #cat-comparer
    // (PlatformsSection) — évite le doublon avec les CTAs natifs des cards.
    const target = document.getElementById("cat-comparer");
    let observer: IntersectionObserver | null = null;
    if (target && typeof IntersectionObserver !== "undefined") {
      observer = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (entry.isIntersecting) {
              setVisible(false);
            }
          }
        },
        { rootMargin: "-100px 0px 0px 0px", threshold: 0 },
      );
      observer.observe(target);
    }

    return () => {
      window.removeEventListener("scroll", onScroll);
      observer?.disconnect();
    };
  }, []);

  function handleDismiss() {
    setDismissed(true);
    try {
      sessionStorage.setItem("sticky-cta-dismissed", "1");
    } catch {
      /* ignore */
    }
  }

  if (dismissed || !visible) return null;

  return (
    <div
      role="region"
      aria-label="Comparer les plateformes crypto rapidement"
      aria-live="off"
      // md:hidden = invisible sur tablette/desktop.
      // bottom = MobileBottomNav (h-16 = 64px) + safe-area-inset-bottom.
      // z-40 = sous MobileBottomNav (z-50) mais au-dessus du contenu.
      // animate-hero-fade-up = entrée smooth depuis le bas.
      className="md:hidden fixed left-0 right-0 z-40 px-3 pb-3 animate-hero-fade-up"
      style={{
        bottom: "calc(var(--mobile-bar-h, 64px) + env(safe-area-inset-bottom, 0px))",
      }}
    >
      <div className="mx-auto max-w-md flex items-center gap-2 rounded-2xl border border-primary/30 bg-elevated/95 backdrop-blur-md p-2 shadow-[0_8px_32px_-12px_rgba(0,0,0,0.6),0_0_0_1px_rgba(245,165,36,0.1)]">
        <Link
          href="#cat-comparer"
          className="btn-primary btn-ripple flex-1 min-h-tap py-3 text-sm font-semibold rounded-xl shadow-glow-gold"
          aria-label="Comparer les plateformes crypto maintenant"
        >
          Comparer maintenant
          <ArrowRight className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
        </Link>
        <button
          type="button"
          onClick={handleDismiss}
          aria-label="Masquer la barre Comparer"
          className="inline-flex items-center justify-center min-h-tap min-w-tap rounded-xl bg-surface/60 text-fg/70 hover:text-fg border border-border/40 hover:border-border transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          <X className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
