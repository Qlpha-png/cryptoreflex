"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";

/**
 * TiltCard — rotation 3D légère perspective(1000px) suivant la souris.
 *
 * Effet glass premium signature. Les angles maxi ±5° pour rester subtils,
 * jamais gimmick. Transition smooth 200ms à pointerleave.
 *
 * Désactivé en pointer:coarse (mobile) via no-op CSS.
 *
 * Usage :
 *   <TiltCard className="rounded-2xl ...">
 *     ...
 *   </TiltCard>
 */

interface TiltCardProps {
  children: ReactNode;
  className?: string;
  /** Angle max en deg (default 5). */
  maxTilt?: number;
}

export default function TiltCard({
  children,
  className = "",
  maxTilt = 5,
}: TiltCardProps) {
  const ref = useRef<HTMLDivElement>(null);
  const rafIdRef = useRef<number | null>(null);
  // BATCH 19 a11y WCAG 2.3.3 — guard reduced-motion ET pointer:coarse
  // côté JS (pas seulement CSS) car on pose des styles inline qui
  // override le CSS reduced-motion.
  const [enabled, setEnabled] = useState(false);
  useEffect(() => {
    const supportsHover = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    setEnabled(supportsHover && !reduced);
  }, []);

  const handleMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!enabled) return;
      if (rafIdRef.current !== null) return;
      const target = ref.current;
      if (!target) return;
      const x = e.clientX;
      const y = e.clientY;
      rafIdRef.current = requestAnimationFrame(() => {
        const rect = target.getBoundingClientRect();
        const px = (x - rect.left) / rect.width; // 0..1
        const py = (y - rect.top) / rect.height; // 0..1
        const rotX = (0.5 - py) * maxTilt * 2;
        const rotY = (px - 0.5) * maxTilt * 2;
        target.style.transform = `perspective(1000px) rotateX(${rotX.toFixed(2)}deg) rotateY(${rotY.toFixed(2)}deg)`;
        rafIdRef.current = null;
      });
    },
    [maxTilt, enabled],
  );

  const handleLeave = useCallback(() => {
    const target = ref.current;
    if (!target) return;
    target.style.transform = "perspective(1000px) rotateX(0deg) rotateY(0deg)";
  }, []);

  // BATCH 22 a11y WCAG 2.3.3 — styles inline conditionnels sur `enabled`.
  // Avant : transformStyle preserve-3d + willChange transform créaient un
  // stacking context permanent même reduced-motion. Maintenant : style undefined
  // si pas de hover+fine ou prefers-reduced-motion → no GPU layer inutile.
  return (
    <div
      ref={ref}
      onPointerMove={enabled ? handleMove : undefined}
      onPointerLeave={enabled ? handleLeave : undefined}
      className={className}
      style={
        enabled
          ? {
              transition: "transform 200ms cubic-bezier(0.22, 1, 0.36, 1)",
              willChange: "transform",
              transformStyle: "preserve-3d",
            }
          : undefined
      }
    >
      {children}
    </div>
  );
}
