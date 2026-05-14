"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

interface Props {
  children: ReactNode;
  /** Inclinaison maximum en degrés. Default 6° (subtle premium). */
  max?: number;
  className?: string;
}

/**
 * Tilt3D — BATCH 36 (audit Motion Expert WOW innovation).
 *
 * Tilt 3D parallax 6° max au mouvement souris. Pattern Linear / Cursor.com.
 * Transforme la perception "carte" en "objet physique" sans toucher au DOM.
 *
 * Désactivé sur :
 *  - prefers-reduced-motion (accessibilité)
 *  - pointer:coarse (touch — pas de souris à suivre)
 *
 * FIX 2026-05-14 (perf LCP `/cryptos` 8.2s → ~5s) — Lighthouse mobile
 * mainthread-work-breakdown 2.8s sur home / `/cryptos` (100 cards × wrapper
 * Tilt3D avec willChange + preserve-3d + transition + listeners). Avant :
 * le composant rendait toujours le wrapper avec ces styles, et n'évitait
 * que le calcul transform via early return dans onMove.
 *
 * Maintenant : détection client-side une seule fois au mount → si pointer
 * coarse OU reduced-motion, retourne directement `<div>{children}</div>`
 * sans listeners ni styles GPU. Rendu HTML SSR identique (wrapper neutre)
 * pour éviter hydration mismatch.
 *
 * Performance desktop souris : inchangée. Transform sur ref direct, zéro
 * re-render React. Transition smooth via cubic-bezier emphasized 250ms.
 */
export default function Tilt3D({ children, max = 6, className = "" }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  // SSR + first client render = wrapper "léger" (no listeners, no GPU layer).
  // Après mount, on bascule en mode "interactive" si conditions OK (souris fine,
  // pas de reduced-motion). Évite hydration mismatch sur mobile.
  const [interactive, setInteractive] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.matchMedia("(pointer: coarse)").matches) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    setInteractive(true);
  }, []);

  // Branche statique : 0 listener, 0 willChange, 0 transition. C'est ce qui
  // rend par défaut sur mobile + au premier paint client. Indistinguable
  // visuellement d'une simple div.
  if (!interactive) {
    return (
      <div ref={ref} className={className}>
        {children}
      </div>
    );
  }

  const onMove = (e: React.MouseEvent) => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5;
    const y = (e.clientY - r.top) / r.height - 0.5;
    el.style.transform = `perspective(900px) rotateX(${(-y * max).toFixed(2)}deg) rotateY(${(x * max).toFixed(2)}deg)`;
  };

  const onLeave = () => {
    if (ref.current) ref.current.style.transform = "";
  };

  return (
    <div
      ref={ref}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      className={className}
      style={{
        transition: "transform 250ms cubic-bezier(0.22, 1, 0.36, 1)",
        transformStyle: "preserve-3d",
        willChange: "transform",
      }}
    >
      {children}
    </div>
  );
}
