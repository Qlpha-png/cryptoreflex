"use client";

import { useEffect, useRef, useState } from "react";

/**
 * HeroPulseScrub — le scrub de la ligne de vie (desktop uniquement).
 *
 * Survoler la courbe révèle le point exact : réticule lumineux posé SUR
 * le trait + hairline verticale + chip mono « prix · il y a N h ». La
 * courbe cesse d'être une signature décorative : elle devient lisible,
 * heure par heure — sans jamais devenir un outil de décision (pas d'axe,
 * pas de variation %, juste le fait brut : tel prix à telle heure).
 *
 * Perf : aucun setState par mouvement — tout passe par refs + styles
 * directs sous rAF throttle. Monté uniquement sur pointeur fin (souris),
 * jamais en tactile. pointer-events:auto sur la bande seule (zone sans
 * contenu cliquable au-dessus).
 */

interface Props {
  /** Sparkline BTC brute (≈168 points horaires, le dernier = maintenant). */
  sparkline: number[];
  /** Polyline de la courbe en % du conteneur ([xPct, yPct]…). */
  points: Array<[number, number]>;
}

function agoLabel(hoursAgo: number): string {
  if (hoursAgo <= 0) return "maintenant";
  if (hoursAgo < 24) return `il y a ${hoursAgo} h`;
  const d = Math.floor(hoursAgo / 24);
  const h = hoursAgo % 24;
  return h ? `il y a ${d} j ${h} h` : `il y a ${d} j`;
}

export default function HeroPulseScrub({ sparkline, points }: Props) {
  const [enabled, setEnabled] = useState(false);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const lineRef = useRef<HTMLSpanElement | null>(null);
  const dotRef = useRef<HTMLSpanElement | null>(null);
  const chipRef = useRef<HTMLSpanElement | null>(null);
  const raf = useRef(0);

  useEffect(() => {
    // Souris uniquement — jamais de scrub tactile.
    setEnabled(
      window.matchMedia("(hover: hover) and (pointer: fine)").matches,
    );
  }, []);

  useEffect(() => {
    return () => cancelAnimationFrame(raf.current);
  }, []);

  if (!enabled || sparkline.length < 24 || points.length < 2) return null;

  /** y (%) de la courbe pour un x (%) — interpolation sur la polyline. */
  const yPctAt = (xPct: number): number => {
    if (xPct <= points[0][0]) return points[0][1];
    for (let i = 0; i < points.length - 1; i++) {
      const [x1, y1] = points[i];
      const [x2, y2] = points[i + 1];
      if (xPct <= x2) {
        const f = (xPct - x1) / Math.max(0.001, x2 - x1);
        return y1 + (y2 - y1) * f;
      }
    }
    return points[points.length - 1][1];
  };

  const onMove = (e: React.PointerEvent) => {
    cancelAnimationFrame(raf.current);
    const { clientX } = e;
    raf.current = requestAnimationFrame(() => {
      const wrap = wrapRef.current;
      const line = lineRef.current;
      const dot = dotRef.current;
      const chip = chipRef.current;
      if (!wrap || !line || !dot || !chip) return;
      const rect = wrap.getBoundingClientRect();
      const frac = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
      const xPct = frac * 100;
      const yPct = yPctAt(xPct);
      const i = Math.round(frac * (sparkline.length - 1));
      const price = sparkline[i];
      if (price == null) return;
      line.style.left = `${xPct}%`;
      dot.style.left = `${xPct}%`;
      dot.style.top = `${yPct}%`;
      // Le chip suit le point mais reste dans le cadre.
      chip.style.left = `min(max(${xPct}%, 5.5rem), calc(100% - 5.5rem))`;
      chip.style.top = `${Math.max(12, yPct - 14)}%`;
      chip.textContent = `${Math.round(price).toLocaleString("fr-FR")} $ · ${agoLabel(sparkline.length - 1 - i)}`;
      wrap.classList.add("hero-scrub-on");
    });
  };

  const onLeave = () => {
    cancelAnimationFrame(raf.current);
    wrapRef.current?.classList.remove("hero-scrub-on");
  };

  return (
    <div
      ref={wrapRef}
      className="hero-scrub absolute inset-0"
      aria-hidden="true"
      onPointerMove={onMove}
      onPointerLeave={onLeave}
    >
      <span ref={lineRef} className="hero-scrub-line" />
      <span ref={dotRef} className="hero-scrub-dot" />
      <span ref={chipRef} className="hero-scrub-chip num-data" />
    </div>
  );
}
