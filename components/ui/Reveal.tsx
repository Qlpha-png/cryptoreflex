"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

interface Props {
  children: ReactNode;
  /** Délai avant déclenchement (ms). Default 0. */
  delay?: number;
  /** Threshold IntersectionObserver. Default 0.15 (15% visible). */
  threshold?: number;
  className?: string;
}

/**
 * Reveal — wrapper qui déclenche un fade-up 24px quand visible
 * dans le viewport (IntersectionObserver). Pattern Anthropic, Linear,
 * Vercel sections.
 *
 * SSR-safe : rend les enfants directement (state initial = false →
 * .reveal class avec opacity 0). Hydratation client ajoute le listener
 * et toggle .is-visible quand intersection.
 *
 * `prefers-reduced-motion` géré via CSS (cf. globals.css : .reveal
 * devient opacity 1 + translate 0 inconditionnel).
 *
 * Note : on rend toujours un `<div>` pour éviter l'enfer du polymorphic ref
 * typing (TS2590). Si on a besoin d'un `<section>` plus tard, on dupliquera
 * le composant.
 */
export default function Reveal({
  children,
  delay = 0,
  threshold = 0.15,
  className = "",
}: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || shown) return;
    if (typeof window === "undefined" || !window.IntersectionObserver) {
      setShown(true);
      return;
    }
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShown(true);
          io.disconnect();
        }
      },
      { threshold, rootMargin: "0px 0px -10% 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [shown, threshold]);

  return (
    <div
      ref={ref}
      style={{ transitionDelay: `${delay}ms` }}
      className={`reveal ${shown ? "is-visible" : ""} ${className}`}
    >
      {children}
    </div>
  );
}
