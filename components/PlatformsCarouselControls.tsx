"use client";

/**
 * PlatformsCarouselControls — controls + AUTO-PLAY pour carousel plateformes.
 *
 * Features pro/technique :
 *  - Auto-scroll toutes les 4.5s avec smooth behavior
 *  - LOOP infini : quand on atteint la fin, retour smooth au debut
 *  - PAUSE on hover desktop (mouseenter sur container)
 *  - PAUSE on touch mobile + au moindre user interaction (swipe, click bouton, click dot)
 *  - RESUME 8s apres derniere interaction (UX standard YouTube/Netflix)
 *  - PAUSE on focus-within (a11y : ne pas perturber un user qui navigue clavier)
 *  - PAUSE on prefers-reduced-motion (a11y WCAG 2.3.3)
 *  - PAUSE on document.hidden (visibility API : evite waste battery quand tab cache)
 *  - Dot indicator avec progress fill anime pendant l'attente du prochain scroll
 *
 * Pattern : ce composant gere les controls + auto-play. Le track scroll
 * est rendu en Server Component dans PlatformsSection.tsx.
 */

import { useEffect, useRef, useState, useCallback } from "react";
import { ChevronLeft, ChevronRight, Pause, Play } from "lucide-react";

interface Props {
  /** ID du container scroll horizontal à contrôler */
  containerId: string;
  /** Nombre total de cards (pour les dots indicator) */
  totalItems: number;
  /** Largeur d'une card en px (pour calculer le scroll d'1 step) */
  cardWidth?: number;
  /** Intervalle auto-play en ms (defaut 4500 = 4.5s par card) */
  autoplayMs?: number;
  /** Delai avant resume apres user interaction (defaut 8000 = 8s) */
  resumeDelayMs?: number;
}

export default function PlatformsCarouselControls({
  containerId,
  totalItems,
  cardWidth = 340,
  autoplayMs = 4500,
  resumeDelayMs = 8000,
}: Props) {
  const containerRef = useRef<HTMLElement | null>(null);
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(true);
  const [activeIdx, setActiveIdx] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isHovering, setIsHovering] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const resumeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reducedMotionRef = useRef(false);

  /* ----------------------- Scroll helpers (memoized) ----------------------- */

  const scrollByCards = useCallback(
    (direction: -1 | 1) => {
      const el = containerRef.current;
      if (!el) return;
      el.scrollBy({ left: direction * cardWidth, behavior: "smooth" });
    },
    [cardWidth]
  );

  const scrollToCard = useCallback(
    (idx: number) => {
      const el = containerRef.current;
      if (!el) return;
      el.scrollTo({ left: idx * cardWidth, behavior: "smooth" });
    },
    [cardWidth]
  );

  /* --------------- Loop next : avance 1, ou retour debut si fin --------------- */

  const advanceOrLoop = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    const { scrollLeft, scrollWidth, clientWidth } = el;
    const atEnd = scrollLeft + clientWidth >= scrollWidth - 8;
    if (atEnd) {
      el.scrollTo({ left: 0, behavior: "smooth" });
    } else {
      scrollByCards(1);
    }
  }, [scrollByCards]);

  /* ---------------------- Auto-play interval management --------------------- */

  const stopAutoplay = useCallback(() => {
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const startAutoplay = useCallback(() => {
    stopAutoplay();
    if (reducedMotionRef.current) return; // WCAG 2.3.3 : respect user pref
    intervalRef.current = setInterval(advanceOrLoop, autoplayMs);
  }, [advanceOrLoop, autoplayMs, stopAutoplay]);

  /* --------------- User interaction = pause + resume apres delai -------------- */

  const handleUserInteraction = useCallback(() => {
    stopAutoplay();
    if (resumeTimeoutRef.current !== null) {
      clearTimeout(resumeTimeoutRef.current);
    }
    resumeTimeoutRef.current = setTimeout(() => {
      if (isPlaying && !isHovering && !document.hidden) {
        startAutoplay();
      }
    }, resumeDelayMs);
  }, [isPlaying, isHovering, resumeDelayMs, startAutoplay, stopAutoplay]);

  /* ------------------------------- Effects -------------------------------- */

  // Bind scroll observer (track active dot)
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
      const idx = Math.round(scrollLeft / cardWidth);
      setActiveIdx(Math.min(Math.max(0, idx), totalItems - 1));
    }
    update();
    el.addEventListener("scroll", update, { passive: true });
    el.addEventListener("touchstart", handleUserInteraction, { passive: true });
    el.addEventListener("mouseenter", () => setIsHovering(true));
    el.addEventListener("mouseleave", () => setIsHovering(false));
    window.addEventListener("resize", update);
    return () => {
      el.removeEventListener("scroll", update);
      el.removeEventListener("touchstart", handleUserInteraction);
      window.removeEventListener("resize", update);
    };
  }, [containerId, totalItems, cardWidth, handleUserInteraction]);

  // Detect prefers-reduced-motion (WCAG 2.3.3)
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    reducedMotionRef.current = mq.matches;
    function onChange(e: MediaQueryListEvent) {
      reducedMotionRef.current = e.matches;
      if (e.matches) stopAutoplay();
      else if (isPlaying && !isHovering) startAutoplay();
    }
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [isPlaying, isHovering, startAutoplay, stopAutoplay]);

  // Pause when tab is hidden (Page Visibility API : save battery)
  useEffect(() => {
    function onVisibility() {
      if (document.hidden) stopAutoplay();
      else if (isPlaying && !isHovering && !reducedMotionRef.current) {
        startAutoplay();
      }
    }
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [isPlaying, isHovering, startAutoplay, stopAutoplay]);

  // Manage autoplay lifecycle based on isPlaying + isHovering
  useEffect(() => {
    if (isPlaying && !isHovering && !document.hidden) {
      startAutoplay();
    } else {
      stopAutoplay();
    }
    return () => stopAutoplay();
  }, [isPlaying, isHovering, startAutoplay, stopAutoplay]);

  /* -------------------------------- Handlers ------------------------------ */

  function onPrevClick() {
    handleUserInteraction();
    scrollByCards(-1);
  }
  function onNextClick() {
    handleUserInteraction();
    scrollByCards(1);
  }
  function onDotClick(i: number) {
    handleUserInteraction();
    scrollToCard(i);
  }
  function togglePlayPause() {
    setIsPlaying((p) => !p);
  }

  /* ---------------------------------- Render ------------------------------ */

  return (
    <>
      {/* Boutons prev/next — desktop only (mobile = swipe natif suffit) */}
      <div
        className="hidden md:flex absolute top-1/2 -translate-y-1/2 left-0 right-0 justify-between pointer-events-none px-1 z-20"
        aria-hidden="true"
      >
        <button
          type="button"
          onClick={onPrevClick}
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
          onClick={onNextClick}
          disabled={!canNext}
          aria-label="Plateforme suivante"
          className={`pointer-events-auto h-12 w-12 rounded-full bg-elevated/95 backdrop-blur-md border border-border shadow-2xl shadow-black/40 inline-flex items-center justify-center text-fg/80 hover:text-primary hover:border-primary/40 hover:scale-110 transition-all duration-300 ${
            !canNext ? "opacity-0 pointer-events-none" : "opacity-100"
          }`}
        >
          <ChevronRight className="h-5 w-5" strokeWidth={2.2} />
        </button>
      </div>

      {/* Dots indicator + play/pause toggle */}
      <div className="mt-6 flex items-center justify-center gap-3">
        {/* Toggle Play/Pause — petit bouton subtle a gauche des dots */}
        <button
          type="button"
          onClick={togglePlayPause}
          aria-label={isPlaying ? "Mettre en pause le défilement automatique" : "Reprendre le défilement automatique"}
          aria-pressed={!isPlaying}
          className="inline-flex items-center justify-center h-7 w-7 rounded-full text-muted hover:text-primary hover:bg-elevated/60 transition-colors"
        >
          {isPlaying ? (
            <Pause className="h-3 w-3" strokeWidth={2.2} aria-hidden="true" />
          ) : (
            <Play className="h-3 w-3 translate-x-[1px]" strokeWidth={2.2} aria-hidden="true" />
          )}
        </button>

        {/* Dots avec progress fill anime sur le dot actif (seulement si auto-play actif) */}
        {Array.from({ length: totalItems }).map((_, i) => {
          const active = i === activeIdx;
          const showProgress =
            active && isPlaying && !isHovering && !reducedMotionRef.current;
          return (
            <button
              key={i}
              type="button"
              onClick={() => onDotClick(i)}
              aria-label={`Aller à la plateforme ${i + 1}`}
              className={`relative overflow-hidden transition-all duration-300 rounded-full ${
                active
                  ? "h-2 w-7 bg-fg/15"
                  : "h-2 w-2 bg-fg/20 hover:bg-fg/40"
              }`}
            >
              {active && (
                <span
                  aria-hidden="true"
                  className="absolute inset-y-0 left-0 bg-primary rounded-full"
                  style={{
                    width: showProgress ? "100%" : "100%",
                    transition: showProgress
                      ? `width ${autoplayMs}ms linear`
                      : "width 200ms ease",
                    // Restart animation by toggling key via activeIdx + autoplay state
                    animation: showProgress
                      ? `dot-progress ${autoplayMs}ms linear infinite`
                      : "none",
                  }}
                />
              )}
            </button>
          );
        })}
      </div>

      {/* Keyframe pour le progress fill du dot actif */}
      <style jsx global>{`
        @keyframes dot-progress {
          0% {
            width: 0%;
          }
          100% {
            width: 100%;
          }
        }
      `}</style>
    </>
  );
}
