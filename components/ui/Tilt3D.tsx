"use client";

import { useRef, type ReactNode } from "react";

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
 * Performance : transform sur ref direct, zéro re-render React.
 * Transition smooth via cubic-bezier emphasized 250ms.
 */
export default function Tilt3D({ children, max = 6, className = "" }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  const onMove = (e: React.MouseEvent) => {
    if (typeof window === "undefined") return;
    if (window.matchMedia("(pointer: coarse)").matches) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
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
