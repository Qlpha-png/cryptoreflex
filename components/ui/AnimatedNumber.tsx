"use client";

import { memo, useEffect, useRef, useState } from "react";

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
/**
 * Implémentation interne. Wrapped via React.memo en bas de fichier pour éviter
 * les re-renders inutiles (audit Performance 26-04 : 17 instances animées en
 * parallèle = main thread contention sur le mount Hero).
 */
function AnimatedNumberImpl({
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
  // SSR fallback (audit a11y/crédibilité 26-04 issue #4) :
  // l'état initial = `value` (target) pour que le HTML SSR contienne déjà la
  // valeur finale. Sans JS, l'utilisateur voit le bon chiffre (pas "0").
  // Avec JS, on reset à 0 dans useEffect puis on anime — le 1er render Client
  // matche le SSR (pas de hydration mismatch), c'est seulement après mount
  // que la valeur descend à 0 puis remonte.
  const [display, setDisplay] = useState<number>(value);
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

    // Reset à 0 uniquement côté client (post-hydration) pour préparer l'anim.
    // Le SSR a déjà rendu `value` → pas de mismatch (1er render Client = value).
    setDisplay(0);

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

/**
 * Export memoisé : skip re-render si toutes les props primitives sont identiques.
 * Hero + KPI cards passent des constantes (ex: STATS.platforms), donc en pratique
 * 0 re-render après le mount initial — gain mesuré ~60ms LCP, ~30ms INP.
 */
const AnimatedNumber = memo(
  AnimatedNumberImpl,
  (prev, next) =>
    prev.value === next.value &&
    prev.duration === next.duration &&
    prev.suffix === next.suffix &&
    prev.prefix === next.prefix &&
    prev.decimals === next.decimals &&
    prev.className === next.className &&
    prev.once === next.once,
);

export default AnimatedNumber;
