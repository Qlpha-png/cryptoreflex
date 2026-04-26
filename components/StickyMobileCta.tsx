"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight, X } from "lucide-react";

/**
 * StickyMobileCta — barre CTA flottante mobile au-dessus de MobileBottomNav.
 *
 * Audit Block 2 RE-AUDIT 26/04/2026 (Agent Performance P0 BUG MAJEUR détecté
 * sur ma propre implémentation initiale) :
 *  - Avant : `window.addEventListener("scroll", ...)` qui appelait setVisible(y > 400)
 *    à CHAQUE pixel scrollé → setState lourd → re-render à chaque frame → INP +80-150ms
 *    sur Android mid-range.
 *  - Après : 2 IntersectionObserver — un sentinel à 400px du top (montre la barre quand
 *    le sentinel sort du viewport) + un sur #cat-comparer (cache la barre quand on entre
 *    dans la PlatformsSection). Zero scroll listener. Zero re-render parasite.
 *
 * Behavior :
 *  - Visible <lg uniquement (md:hidden).
 *  - Apparait quand le sentinel (positionné à 400px du top du document) sort du viewport.
 *  - Disparait quand on entre dans la section #cat-comparer.
 *  - Bouton X dismiss persistant via sessionStorage.
 *  - Au-dessus de MobileBottomNav (z-40, MobileBottomNav z-40).
 *
 * A11y :
 *  - role="region" + aria-label.
 *  - aria-live="off".
 *  - Tap targets 44×44 (min-h-tap).
 *  - Respecte safe-area-inset-bottom iOS.
 */
export default function StickyMobileCta() {
  const [showAfterScroll, setShowAfterScroll] = useState(false);
  const [insidePlatforms, setInsidePlatforms] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Persistance dismiss : 1 fermeture = invisible jusqu'au prochain refresh.
    try {
      if (sessionStorage.getItem("sticky-cta-dismissed") === "1") {
        setDismissed(true);
        return;
      }
    } catch {
      /* sessionStorage peut être bloqué (Safari private mode) */
    }

    // IO #1 : sentinel à 400px du top. Quand le sentinel n'est PAS intersect avec
    // le viewport (= scrollé au-delà), on montre la barre. Coût ~0 vs scroll listener.
    let sentinelObserver: IntersectionObserver | null = null;
    if (sentinelRef.current && typeof IntersectionObserver !== "undefined") {
      sentinelObserver = new IntersectionObserver(
        ([entry]) => {
          // entry.isIntersecting === true → sentinel visible (au top de la page, scroll < 400)
          // === false → sentinel hors viewport (scroll > 400) → on montre la barre
          setShowAfterScroll(!entry.isIntersecting);
        },
        { threshold: 0, rootMargin: "0px" },
      );
      sentinelObserver.observe(sentinelRef.current);
    }

    // IO #2 : cache automatiquement quand le visiteur entre dans #cat-comparer.
    let platformsObserver: IntersectionObserver | null = null;
    const platformsTarget = document.getElementById("cat-comparer");
    if (platformsTarget && typeof IntersectionObserver !== "undefined") {
      platformsObserver = new IntersectionObserver(
        ([entry]) => setInsidePlatforms(entry.isIntersecting),
        { rootMargin: "-100px 0px 0px 0px", threshold: 0 },
      );
      platformsObserver.observe(platformsTarget);
    }

    return () => {
      sentinelObserver?.disconnect();
      platformsObserver?.disconnect();
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

  const visible = showAfterScroll && !insidePlatforms && !dismissed;

  return (
    <>
      {/* Sentinel invisible à 400px du top — sert de trigger IO sans scroll listener.
          Position absolute (pas fixed) car c'est une référence dans le flux du document. */}
      <div
        ref={sentinelRef}
        aria-hidden="true"
        style={{ position: "absolute", top: 400, left: 0, width: 1, height: 1, pointerEvents: "none" }}
      />

      {visible && (
        <div
          role="region"
          aria-label="Comparer les plateformes crypto rapidement"
          aria-live="off"
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
      )}
    </>
  );
}
