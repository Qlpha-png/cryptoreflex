"use client";

import { useEffect, useRef, useState } from "react";

interface AnimatedStatProps {
  /** Valeur cible numérique. */
  value: number;
  /** Fonction de formatage du nombre. */
  format: (n: number) => string;
  /** Durée de l'animation (ms). Default 1000. */
  duration?: number;
  /** Classe CSS sur le span racine. */
  className?: string;
  /** Anime une seule fois quand visible. Default true. */
  once?: boolean;
}

/**
 * easeOutCubic — démarre fort, ralentit vers la fin. Sensation snappy.
 */
function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

/**
 * AnimatedStat — version stat-card de AnimatedNumber.
 *
 * Différence-clé vs AnimatedNumber : on accepte un `format(n)` arbitraire
 * (pour pouvoir réutiliser formatCompactUsd / formatUsd / formatCompactNumber
 * de lib/coingecko.ts au lieu de re-coder les unités).
 *
 * - IntersectionObserver pour déclencher uniquement au scroll dans le viewport.
 * - requestAnimationFrame pour la boucle (60fps natif, GPU-friendly).
 * - prefers-reduced-motion : valeur finale instantanée.
 * - SSR-safe : valeur finale rendue côté serveur, 0 puis anim côté client.
 * - tabular-nums pour éviter le jitter pendant le compte.
 */
export default function AnimatedStat({
  value,
  format,
  duration = 1000,
  className = "",
  once = true,
}: AnimatedStatProps) {
  const ref = useRef<HTMLSpanElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const startedRef = useRef(false);
  // SSR : on rend la valeur finale formatée → pas de hydration mismatch.
  const [display, setDisplay] = useState<number>(value);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

    if (reduced) {
      setDisplay(value);
      return;
    }

    // Reset à 0 post-hydration pour préparer l'anim.
    setDisplay(0);

    const start = () => {
      if (startedRef.current && once) return;
      startedRef.current = true;
      const startTs = performance.now();
      const tick = (now: number) => {
        const elapsed = now - startTs;
        const t = Math.min(1, elapsed / duration);
        const eased = easeOutCubic(t);
        setDisplay(value * eased);
        if (t < 1) {
          rafRef.current = requestAnimationFrame(tick);
        } else {
          setDisplay(value);
          rafRef.current = null;
        }
      };
      rafRef.current = requestAnimationFrame(tick);
    };

    if (typeof IntersectionObserver === "undefined") {
      start();
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            start();
            if (once) observer.unobserve(entry.target);
          }
        }
      },
      { threshold: 0.3 },
    );
    observer.observe(node);

    return () => {
      observer.disconnect();
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [value, duration, once]);

  return (
    <span ref={ref} className={`tabular-nums ${className}`.trim()}>
      {format(display)}
    </span>
  );
}
