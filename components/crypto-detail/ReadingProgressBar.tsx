"use client";

import { useEffect, useRef } from "react";

interface ReadingProgressBarProps {
  /** Sélecteur de l'article dont on suit le scroll. Default = "article". */
  targetSelector?: string;
  /** Classe CSS additionnelle sur le wrapper. */
  className?: string;
}

/**
 * ReadingProgressBar — Barre de progression de lecture sticky en haut de viewport.
 *
 * Calcule en continu le % de scroll de l'article cible (ou du body si non trouvé).
 * Utilise requestAnimationFrame pour éviter tout re-render React (DOM mutation
 * directe sur la barre intérieure via ref + style.transform).
 *
 * - Hauteur 3px, gradient gold (primary → primary-glow).
 * - Devient plus opaque au-delà de 50 % de progression.
 * - Respecte prefers-reduced-motion (pas de transition CSS).
 * - SSR-safe : tout dans useEffect.
 */
export default function ReadingProgressBar({
  targetSelector = "article",
  className = "",
}: ReadingProgressBarProps) {
  const barRef = useRef<HTMLDivElement | null>(null);
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const lastProgressRef = useRef<number>(0);

  useEffect(() => {
    const bar = barRef.current;
    const wrapper = wrapperRef.current;
    if (!bar || !wrapper) return;

    const target =
      (targetSelector
        ? (document.querySelector(targetSelector) as HTMLElement | null)
        : null) ?? document.body;

    const update = () => {
      const rect = target.getBoundingClientRect();
      const viewportH = window.innerHeight;
      // Hauteur scrollable = hauteur du target - viewport (clampée >= 1)
      const scrollable = Math.max(1, target.offsetHeight - viewportH);
      // Position scroll dans le target = -rect.top (positif quand on a scrollé)
      const scrolled = Math.min(scrollable, Math.max(0, -rect.top));
      const progress = Math.min(1, Math.max(0, scrolled / scrollable));

      if (Math.abs(progress - lastProgressRef.current) > 0.001) {
        lastProgressRef.current = progress;
        bar.style.transform = `scaleX(${progress})`;
        // Opacité augmente au scroll : 0.55 → 1
        const opacity = 0.55 + 0.45 * progress;
        wrapper.style.opacity = opacity.toFixed(3);
      }

      rafRef.current = null;
    };

    const onScroll = () => {
      if (rafRef.current !== null) return;
      rafRef.current = requestAnimationFrame(update);
    };

    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);

    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [targetSelector]);

  return (
    <div
      ref={wrapperRef}
      aria-hidden="true"
      className={`pointer-events-none fixed inset-x-0 top-0 z-50 h-[3px] bg-transparent ${className}`.trim()}
      style={{ opacity: 0.55 }}
    >
      <div
        ref={barRef}
        className="h-full origin-left bg-gradient-to-r from-primary to-primary-glow shadow-[0_0_8px_rgba(245,165,36,0.55)] motion-reduce:transition-none"
        style={{
          transform: "scaleX(0)",
          willChange: "transform",
          transition: "transform 80ms linear",
        }}
      />
    </div>
  );
}
