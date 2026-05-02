"use client";

import { useEffect, useRef, useState } from "react";

/**
 * CountUp — BATCH 37 (audit Motion Expert /outils).
 *
 * Animation count-up sur résultats numériques (calc fiscal, DCA, ROI, etc).
 * Pattern "machine à sous" qui crée anticipation + signal "résultat prêt".
 *
 * - 0 dépendance externe (RAF + ease-out cubic natif)
 * - tabular-nums pour zéro jitter pendant le compte
 * - prefers-reduced-motion respecté (rend la valeur finale instant)
 * - Re-anime quand `value` change (utile pour recalcul live)
 *
 * Usage : <CountUp value={impotEur} format={(n) => `${n.toFixed(0)} €`} />
 */
interface Props {
  value: number;
  /** Durée de l'animation (ms). Default 800. */
  duration?: number;
  /** Formatter de la valeur. Default : nombre brut. */
  format?: (n: number) => string;
  /** Suffixe append après format. Optional. */
  suffix?: string;
  /** Classes CSS additionnelles. */
  className?: string;
}

export default function CountUp({
  value,
  duration = 800,
  format,
  suffix = "",
  className = "",
}: Props) {
  const [display, setDisplay] = useState(value);
  const fromRef = useRef(value);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      setDisplay(value);
      fromRef.current = value;
      return;
    }
    const from = fromRef.current;
    if (from === value) return;
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      // ease-out quart — démarre vite puis ralentit, signal "résultat se pose"
      const eased = 1 - Math.pow(1 - t, 4);
      setDisplay(from + (value - from) * eased);
      if (t < 1) raf = requestAnimationFrame(tick);
      else fromRef.current = value;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, duration]);

  const formatted = format
    ? format(display)
    : Math.round(display).toLocaleString("fr-FR");

  return (
    <span className={`tabular-nums ${className}`}>
      {formatted}
      {suffix}
    </span>
  );
}
