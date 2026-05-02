"use client";

import { useRef, type ReactNode } from "react";

interface Props {
  children: ReactNode;
  /** Force d'attraction du curseur (0..1). Default 0.25 = subtle. */
  strength?: number;
  className?: string;
}

/**
 * Magnetic — wrapper qui attire son enfant vers le curseur dans
 * un rayon limité par strength. Pattern Awwwards / Cuberto / Stripe CTAs.
 *
 * Utilisé sur le CTA primary du Hero pour signaler "interaction premium"
 * au moment décisif (le clic). Désactivé sur touch via CSS @media
 * (cf. .magnetic dans globals.css).
 *
 * Inner span séparé pour permettre transition transform 150ms (snap-back
 * doux quand le curseur sort).
 */
export default function Magnetic({
  children,
  strength = 0.25,
  className = "",
}: Props) {
  const innerRef = useRef<HTMLSpanElement>(null);

  const onMove = (e: React.MouseEvent) => {
    const el = innerRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const dx = (e.clientX - (r.left + r.width / 2)) * strength;
    const dy = (e.clientY - (r.top + r.height / 2)) * strength;
    el.style.transform = `translate3d(${dx}px, ${dy}px, 0)`;
  };

  const reset = () => {
    if (innerRef.current) {
      innerRef.current.style.transform = "";
    }
  };

  return (
    <span
      onMouseMove={onMove}
      onMouseLeave={reset}
      className={`magnetic ${className}`}
    >
      <span ref={innerRef} className="magnetic-inner">
        {children}
      </span>
    </span>
  );
}
