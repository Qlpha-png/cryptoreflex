"use client";

/**
 * PlatformsCarouselControls — boutons prev/next + indicateur scroll
 * pour le carousel horizontal des plateformes (homepage).
 *
 * Design : pro & technique
 *  - 2 boutons flottants (gauche / droite) avec halo gold subtle
 *  - Visible uniquement quand il y a du scroll restant dans la direction
 *  - Dots indicateur en bas (style Apple App Store carousel)
 *  - Touch swipe mobile = natif via scroll-snap-x sur le container
 *  - Click bouton = scroll programmé d'1 card width avec smooth behavior
 *
 * Pattern : ce composant ne rend PAS les cartes (Server Component les rend).
 * Il s'attache au container via id et observe son scroll position.
 */

import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface Props {
  /** ID du container scroll horizontal à contrôler */
  containerId: string;
  /** Nombre total de cards (pour les dots indicator) */
  totalItems: number;
  /** Largeur d'une card en px (pour calculer le scroll d'1 step) */
  cardWidth?: number;
}

export default function PlatformsCarouselControls({
  containerId,
  totalItems,
  cardWidth = 340,
}: Props) {
  const containerRef = useRef<HTMLElement | null>(null);
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(true);
  const [activeIdx, setActiveIdx] = useState(0);

  // Bind to container scroll events
  useEffect(() => {
    const el = document.getElementById(containerId);
    if (!el) return;
    containerRef.current = el;

    function update() {
      const c = containerRef.current;
      if (!c) return;
      const { scrollLeft, scrollWidth, clientWidth } = c;
      setCanPrev(scrollLeft > 8);
      setCanNext(scrollLeft + clientWidth < scrollWidth - 8);
      // Active dot = card index sous le scrollLeft + cardWidth/2
      const idx = Math.round(scrollLeft / cardWidth);
      setActiveIdx(Math.min(Math.max(0, idx), totalItems - 1));
    }
    update();
    el.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      el.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [containerId, totalItems, cardWidth]);

  function scrollByCards(direction: -1 | 1) {
    const el = containerRef.current;
    if (!el) return;
    el.scrollBy({ left: direction * cardWidth, behavior: "smooth" });
  }

  function scrollToCard(idx: number) {
    const el = containerRef.current;
    if (!el) return;
    el.scrollTo({ left: idx * cardWidth, behavior: "smooth" });
  }

  return (
    <>
      {/* Boutons prev/next — desktop only (mobile = swipe natif suffit) */}
      <div
        className="hidden md:flex absolute top-1/2 -translate-y-1/2 left-0 right-0 justify-between pointer-events-none px-1 z-20"
        aria-hidden="true"
      >
        <button
          type="button"
          onClick={() => scrollByCards(-1)}
          disabled={!canPrev}
          aria-label="Plateforme précédente"
          className={`pointer-events-auto h-12 w-12 rounded-full bg-elevated/95 backdrop-blur-md border border-border shadow-2xl shadow-black/40 inline-flex items-center justify-center text-fg/80 hover:text-primary hover:border-primary/40 hover:scale-110 transition-all duration-300 ${
            !canPrev ? "opacity-0 pointer-events-none" : "opacity-100"
          }`}
        >
          <ChevronLeft className="h-5 w-5" strokeWidth={2.2} />
        </button>
        <button
          type="button"
          onClick={() => scrollByCards(1)}
          disabled={!canNext}
          aria-label="Plateforme suivante"
          className={`pointer-events-auto h-12 w-12 rounded-full bg-elevated/95 backdrop-blur-md border border-border shadow-2xl shadow-black/40 inline-flex items-center justify-center text-fg/80 hover:text-primary hover:border-primary/40 hover:scale-110 transition-all duration-300 ${
            !canNext ? "opacity-0 pointer-events-none" : "opacity-100"
          }`}
        >
          <ChevronRight className="h-5 w-5" strokeWidth={2.2} />
        </button>
      </div>

      {/* Dots indicator — Apple App Store style */}
      <div className="mt-6 flex items-center justify-center gap-1.5">
        {Array.from({ length: totalItems }).map((_, i) => (
          <button
            key={i}
            type="button"
            onClick={() => scrollToCard(i)}
            aria-label={`Aller à la plateforme ${i + 1}`}
            className={`transition-all duration-300 rounded-full ${
              i === activeIdx
                ? "h-2 w-6 bg-primary"
                : "h-2 w-2 bg-fg/20 hover:bg-fg/40"
            }`}
          />
        ))}
      </div>
    </>
  );
}
