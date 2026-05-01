"use client";

import { useEffect, useRef, useState } from "react";

/**
 * AnimatedStat — count-up animation pour stats numériques.
 *
 * RSC-safe : on accepte un `format` STRING (préset) et NON une fonction,
 * pour pouvoir être appelé depuis des Server Components (CryptoStats etc.).
 * Les fonctions ne traversent pas la frontière RSC (Next 14).
 *
 * Présets de format :
 *  - "compact-usd"     → 1,2 Md $
 *  - "usd"             → 1 234,56 $
 *  - "compact-number"  → 21 M
 *  - "number"          → 21 234 567,89
 *  - "percent"         → 12,3 %
 *  - "raw"             → 21234567.89 (toString brut, pour cas custom)
 *
 * Optionnel : `suffix` (ex: " BTC") concaténé après le nombre formaté.
 *
 * - IntersectionObserver : déclenchement au scroll dans le viewport
 * - requestAnimationFrame : 60fps GPU-friendly
 * - prefers-reduced-motion : valeur finale instantanée, pas d'anim
 * - SSR-safe : valeur finale rendue côté serveur, anim côté client
 * - tabular-nums : zéro jitter pendant le compte
 */

type FormatType =
  | "compact-usd"
  | "usd"
  | "compact-number"
  | "number"
  | "percent"
  | "raw";

interface AnimatedStatProps {
  value: number;
  format: FormatType;
  /** Texte concaténé après la valeur (ex: " BTC"). */
  suffix?: string;
  /** Durée de l'animation en ms. Default 1000. */
  duration?: number;
  /** Classe CSS sur le span racine. */
  className?: string;
  /** Anime une seule fois quand visible. Default true. */
  once?: boolean;
}

function formatValue(n: number, type: FormatType): string {
  switch (type) {
    case "compact-usd":
      return new Intl.NumberFormat("fr-FR", {
        style: "currency",
        currency: "USD",
        notation: "compact",
        maximumFractionDigits: 1,
      }).format(n);
    case "usd":
      return new Intl.NumberFormat("fr-FR", {
        style: "currency",
        currency: "USD",
        maximumFractionDigits: 2,
      }).format(n);
    case "compact-number":
      return new Intl.NumberFormat("en-US", {
        notation: "compact",
        maximumFractionDigits: 2,
      }).format(n);
    case "number":
      return new Intl.NumberFormat("fr-FR", {
        maximumFractionDigits: 2,
      }).format(n);
    case "percent":
      return new Intl.NumberFormat("fr-FR", {
        style: "percent",
        minimumFractionDigits: 1,
        maximumFractionDigits: 2,
      }).format(n / 100);
    case "raw":
      return String(Math.round(n * 100) / 100);
    default:
      return String(n);
  }
}

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

export default function AnimatedStat({
  value,
  format,
  suffix,
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
      {formatValue(display, format)}
      {suffix ?? ""}
    </span>
  );
}
