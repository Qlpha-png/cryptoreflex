"use client";

import { useCallback, useRef, type ReactNode } from "react";
import Link from "next/link";

/**
 * MagneticCta — bouton qui « attire » la souris dans un rayon ~80px.
 *
 * Effet signature Awwwards : translate(--mag-x, --mag-y) suit le pointeur
 * avec une intensité ~0.25 (dampening) pour un mouvement subtil mais
 * perceptible. Reset smooth au pointerleave via CSS transition (.magnetic-cta).
 *
 * Mobile / pointer:coarse : le CSS désactive le translate (no-op).
 *
 * Usage :
 *   <MagneticCta href="/pro-plus" className="btn-primary">
 *     Découvrir Pro+
 *   </MagneticCta>
 */

interface MagneticCtaProps {
  children: ReactNode;
  href: string;
  className?: string;
  /** Intensité du magnetisme (0.0 = aucun, 0.5 = fort). Default 0.25. */
  intensity?: number;
}

export default function MagneticCta({
  children,
  href,
  className = "",
  intensity = 0.25,
}: MagneticCtaProps) {
  const ref = useRef<HTMLAnchorElement>(null);
  const rafIdRef = useRef<number | null>(null);

  const handleMove = useCallback(
    (e: React.PointerEvent<HTMLAnchorElement>) => {
      if (rafIdRef.current !== null) return;
      const target = ref.current;
      if (!target) return;
      const x = e.clientX;
      const y = e.clientY;
      rafIdRef.current = requestAnimationFrame(() => {
        const rect = target.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        const dx = (x - cx) * intensity;
        const dy = (y - cy) * intensity;
        target.style.setProperty("--mag-x", `${dx}px`);
        target.style.setProperty("--mag-y", `${dy}px`);
        rafIdRef.current = null;
      });
    },
    [intensity],
  );

  const handleLeave = useCallback(() => {
    const target = ref.current;
    if (!target) return;
    target.style.setProperty("--mag-x", "0px");
    target.style.setProperty("--mag-y", "0px");
  }, []);

  return (
    <Link
      ref={ref}
      href={href}
      onPointerMove={handleMove}
      onPointerLeave={handleLeave}
      className={`magnetic-cta ${className}`}
    >
      {children}
    </Link>
  );
}
