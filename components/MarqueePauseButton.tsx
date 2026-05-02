"use client";

import { useState, useCallback } from "react";
import { Pause, Play } from "lucide-react";

/**
 * MarqueePauseButton — bouton pause/lecture pour le PlatformsMarquee.
 *
 * Conforme WCAG 2.2.2 « Pause, Stop, Hide » : toute animation > 5s doit
 * pouvoir être mise en pause par un mécanisme accessible (clavier inclus).
 *
 * Le bouton toggle l'attribut `data-paused` sur le `<div data-marquee-pause-target>`
 * voisin (parent section ou descendant direct), qui est ciblé via CSS pour
 * `animation-play-state: paused`.
 *
 * On ne stocke pas l'état de pause en localStorage (préférence
 * « per-session » ; remettre à zéro au reload est OK pour une animation
 * décorative).
 */
export default function MarqueePauseButton() {
  const [paused, setPaused] = useState(false);

  const toggle = useCallback(() => {
    setPaused((prev) => {
      const next = !prev;
      // Trouve tous les targets dans la même section (parent <section>)
      const targets = document.querySelectorAll<HTMLElement>(
        "[data-marquee-pause-target]",
      );
      targets.forEach((t) => {
        if (next) {
          t.dataset.paused = "true";
        } else {
          delete t.dataset.paused;
        }
      });
      return next;
    });
  }, []);

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={
        paused ? "Reprendre le défilement" : "Mettre en pause le défilement"
      }
      aria-pressed={paused}
      className="inline-flex items-center gap-1.5 rounded-full border border-border bg-elevated/60 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-fg/80 hover:border-primary/40 hover:text-fg transition-colors min-h-tap"
    >
      {paused ? (
        <>
          <Play className="h-3 w-3" aria-hidden="true" />
          Reprendre
        </>
      ) : (
        <>
          <Pause className="h-3 w-3" aria-hidden="true" />
          Pause
        </>
      )}
    </button>
  );
}
