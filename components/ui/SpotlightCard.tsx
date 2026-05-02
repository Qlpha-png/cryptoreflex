"use client";

import { useCallback, useRef, type ReactNode } from "react";

/**
 * SpotlightCard — halo gold radial qui suit la souris dans la card.
 *
 * Pattern signature Linear / Vercel. Le composant met à jour les CSS
 * custom properties --mx / --my via 1 seul `pointermove` par frame
 * (rAF throttle), pour zéro re-render React (transformation visuelle
 * déléguée 100% CSS via .spotlight-card::before).
 *
 * Mobile / no-pointer : effet désactivé via media query CSS, donc
 * AUCUN coût JS sur tactile (le hook continue à tourner mais le
 * ::before reste invisible — coût négligeable).
 *
 * Respect de prefers-reduced-motion : géré dans globals.css.
 *
 * Usage :
 *   <SpotlightCard className="rounded-2xl border ...">
 *     ...children...
 *   </SpotlightCard>
 */

interface SpotlightCardProps {
  children: ReactNode;
  className?: string;
  /** Optionnel : élément conteneur (default = "div"). */
  as?: "div" | "article" | "section";
}

export default function SpotlightCard({
  children,
  className = "",
  as = "div",
}: SpotlightCardProps) {
  const ref = useRef<HTMLDivElement>(null);
  const rafIdRef = useRef<number | null>(null);

  const handleMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (rafIdRef.current !== null) return;
    const target = ref.current;
    if (!target) return;
    const x = e.clientX;
    const y = e.clientY;
    rafIdRef.current = requestAnimationFrame(() => {
      const rect = target.getBoundingClientRect();
      const mx = x - rect.left;
      const my = y - rect.top;
      target.style.setProperty("--mx", `${mx}px`);
      target.style.setProperty("--my", `${my}px`);
      rafIdRef.current = null;
    });
  }, []);

  const Component = as as "div";
  return (
    <Component
      ref={ref}
      onPointerMove={handleMove}
      className={`spotlight-card ${className}`}
    >
      {children}
    </Component>
  );
}
