"use client";

/**
 * HeroPrimaryCta — wrapper Client du CTA primary du Hero.
 *
 * Rôle : tracker la conversion `click_pro_cta` pour l'expérience
 * `hero_headline_v1` au moment du click (avant la navigation interne `#`).
 *
 * Pourquoi ne pas remplacer le Link Next ? Parce que la cible est une ancre
 * locale (`#cat-comparer`) et qu'un simple `<a>` suffit. Pas besoin de prefetch
 * cross-page → on garde la sémantique HTML basique + un onClick tracking.
 *
 * Cookie côté Client : on utilise `getVariant()` (lecture seule) pour ne PAS
 * déclencher de second tracking d'exposure (le hook est déjà appelé par
 * HeroHeadline plus haut dans la même page).
 */

import { ArrowRight } from "lucide-react";
import { useCallback, useRef } from "react";
import { getVariant, trackVariantConversion } from "@/lib/abtest";

interface HeroPrimaryCtaProps {
  href: string;
  label: string;
  ariaLabel: string;
}

const EXPERIMENT_ID = "hero_headline_v1";

/**
 * MAJ BATCH 12 (innovation 2026) : ajout effet « magnetic CTA » signature
 * Awwwards. Le bouton attire la souris dans son rayon ~80px (intensity 0.25).
 * Désactivé en pointer:coarse (mobile) via .magnetic-cta CSS no-op +
 * prefers-reduced-motion respecté. Un seul listener pointermove + rAF
 * throttle = 0 surcharge.
 */
const MAGNETIC_INTENSITY = 0.25;

export default function HeroPrimaryCta({ href, label, ariaLabel }: HeroPrimaryCtaProps) {
  const ctaRef = useRef<HTMLAnchorElement>(null);
  const rafIdRef = useRef<number | null>(null);

  const handleClick = () => {
    // Lecture cookie sans réémettre une exposure — le variant a déjà été assigné
    // par HeroHeadline au mount. Si pas de cookie (cas rare : JS désactivé puis
    // réactivé entre temps), getVariant() en retire un + pose le cookie, ce qui
    // est cohérent.
    const variant = getVariant(EXPERIMENT_ID);
    trackVariantConversion(EXPERIMENT_ID, variant, "click_pro_cta");
  };

  const handlePointerMove = useCallback((e: React.PointerEvent<HTMLAnchorElement>) => {
    if (rafIdRef.current !== null) return;
    const target = ctaRef.current;
    if (!target) return;
    const x = e.clientX;
    const y = e.clientY;
    rafIdRef.current = requestAnimationFrame(() => {
      const rect = target.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const dx = (x - cx) * MAGNETIC_INTENSITY;
      const dy = (y - cy) * MAGNETIC_INTENSITY;
      target.style.setProperty("--mag-x", `${dx}px`);
      target.style.setProperty("--mag-y", `${dy}px`);
      rafIdRef.current = null;
    });
  }, []);

  const handlePointerLeave = useCallback(() => {
    const target = ctaRef.current;
    if (!target) return;
    target.style.setProperty("--mag-x", "0px");
    target.style.setProperty("--mag-y", "0px");
  }, []);

  return (
    <a
      ref={ctaRef}
      href={href}
      onClick={handleClick}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      className="btn-primary btn-ripple magnetic-cta text-body px-6 py-3.5 shadow-glow-gold w-full sm:w-auto group/cta"
      aria-label={ariaLabel}
    >
      {label}
      <ArrowRight
        className="h-4 w-4 transition-transform group-hover/cta:translate-x-0.5"
        strokeWidth={1.75}
        aria-hidden="true"
      />
    </a>
  );
}
