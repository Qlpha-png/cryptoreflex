"use client";

import { useEffect, useRef, useState } from "react";

interface AnimatedNumberProps {
  /** Valeur cible. Le compteur s'anime de 0 à cette valeur. */
  value: number;
  /** Durée totale de l'anim en ms. Défaut 800ms. */
  duration?: number;
  /** Suffixe (ex. "%", "+", "k"). */
  suffix?: string;
  /** Préfixe (ex. "$", "€"). */
  prefix?: string;
  /** Nombre de décimales à afficher. Défaut 0. */
  decimals?: number;
  /** Classe sur le span racine. */
  className?: string;
  /** Anime une seule fois quand visible (default true). */
  once?: boolean;
}

/**
 * Easing easeOutQuart — démarrage rapide, fin douce.
 * f(t) = 1 - (1 - t)^4
 */
function easeOutQuart(t: number): number {
  return 1 - Math.pow(1 - t, 4);
}

/**
 * AnimatedNumber — anime un compteur de 0 à `value` quand le span devient visible.
 *
 * Détails :
 *  - IntersectionObserver natif pour déclencher l'anim au scroll
 *  - requestAnimationFrame pour la boucle (60fps natif, GPU-friendly)
 *  - 800ms easeOutQuart par défaut (ressenti "snappy" sans être brutal)
 *  - Respecte prefers-reduced-motion : affiche la valeur finale sans anim
 *  - tabular-nums pour éviter le jitter horizontal pendant le compte
 */
export default function AnimatedNumber({
  value,
  duration = 800,
  suffix = "",
  prefix = "",
  decimals = 0,
  className = "",
  once = true,
}: AnimatedNumberProps) {
  const ref = useRef<HTMLSpanElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const [display, setDisplay] = useState(0);
  const startedRef = useRef(false);

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

    const start = () => {
      if (startedRef.current && once) return;
      startedRef.current = true;

      const startTs = performance.now();
      const tick = (now: number) => {
        const elapsed = now - startTs;
        const t = Math.min(1, elapsed / duration);
        const eased = easeOutQuart(t);
        setDisplay(value * eased);
        if (t < 1) {
          rafRef.current = requestAnimationFrame(tick);
        } else {
          setDisplay(value);
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
      { threshold: 0.4 }
    );
    observer.observe(node);

    return () => {
      observer.disconnect();
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [value, duration, once]);

  const formatted =
    decimals > 0
      ? display.toFixed(decimals)
      : Math.round(display).toString();

  return (
    <span ref={ref} className={`tabular-nums ${className}`.trim()}>
      {prefix}
      {formatted}
      {suffix}
    </span>
  );
}
