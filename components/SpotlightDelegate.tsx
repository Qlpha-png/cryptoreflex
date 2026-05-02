"use client";

import { useEffect } from "react";

/**
 * SpotlightDelegate — listener pointermove unique au document qui delegate
 * vers tout élément `.spotlight-card` (event delegation pattern).
 *
 * Pourquoi event delegation :
 *  - PlatformCard (et 90% des cards du site) sont Server Components.
 *  - Plutôt que de wrapper chaque card en Client, on installe UN SEUL
 *    listener global qui hydrate les CSS vars --mx/--my sur la card
 *    survolée (closest()).
 *  - 0 hydration boundary supplémentaire, 0 re-render React.
 *  - rAF throttle = 1 update par frame max (60 fps), pas 1 par event mousemove.
 *
 * Mobile / pointer:coarse :
 *  - matchMedia('(hover: hover) and (pointer: fine)') = false → on attache
 *    rien. 0 surcoût sur mobile/tactile.
 *
 * Reduced motion :
 *  - Le CSS .spotlight-card::before respecte prefers-reduced-motion via
 *    le bloc global (animations: none !important).
 *  - On peut quand même skip le hook côté JS pour économiser CPU.
 *
 * Mount unique dans app/layout.tsx (Server) après les autres scripts.
 */
export default function SpotlightDelegate() {
  useEffect(() => {
    // Vérifie support pointeur fin (desktop). Mobile = no-op.
    if (typeof window === "undefined") return;
    const supportsHover = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    if (!supportsHover) return;

    // Reduced motion : skip pour économiser CPU.
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReducedMotion) return;

    let rafId: number | null = null;
    let pendingX = 0;
    let pendingY = 0;
    let pendingTarget: HTMLElement | null = null;

    const handleMove = (e: PointerEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;

      // closest() = bubble jusqu'à trouver une .spotlight-card
      const card = target.closest<HTMLElement>(".spotlight-card");
      if (!card) return;

      pendingX = e.clientX;
      pendingY = e.clientY;
      pendingTarget = card;

      if (rafId !== null) return;
      rafId = requestAnimationFrame(() => {
        if (pendingTarget) {
          const rect = pendingTarget.getBoundingClientRect();
          pendingTarget.style.setProperty("--mx", `${pendingX - rect.left}px`);
          pendingTarget.style.setProperty("--my", `${pendingY - rect.top}px`);
        }
        rafId = null;
      });
    };

    document.addEventListener("pointermove", handleMove, { passive: true });
    return () => {
      document.removeEventListener("pointermove", handleMove);
      if (rafId !== null) cancelAnimationFrame(rafId);
    };
  }, []);

  return null;
}
