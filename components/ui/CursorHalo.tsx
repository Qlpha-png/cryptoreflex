"use client";

import { useEffect, useRef } from "react";

/**
 * CursorHalo — BATCH 29A.
 *
 * Halo gold radial 320px qui suit le curseur via lerp (12% / frame).
 * Donne une sensation "le hero te regarde" — pattern Linear, Cursor, Arc.net.
 *
 * Désactivé sur :
 *  - touch (pointer:coarse) — sans souris ça ne sert à rien
 *  - prefers-reduced-motion — accessibilité
 *
 * Performance : transform composited only, GPU. Pas de re-render React
 * (ref direct). RAF unique, listener mousemove passive.
 */
export default function CursorHalo() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.matchMedia("(pointer: coarse)").matches) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let x = window.innerWidth / 2;
    let y = window.innerHeight / 2;
    let tx = x;
    let ty = y;
    let raf = 0;

    const onMove = (e: MouseEvent) => {
      tx = e.clientX;
      ty = e.clientY;
    };

    const tick = () => {
      x += (tx - x) * 0.12;
      y += (ty - y) * 0.12;
      if (ref.current) {
        ref.current.style.transform = `translate3d(${x - 160}px, ${y - 160}px, 0)`;
      }
      raf = requestAnimationFrame(tick);
    };

    window.addEventListener("mousemove", onMove, { passive: true });
    raf = requestAnimationFrame(tick);

    return () => {
      window.removeEventListener("mousemove", onMove);
      cancelAnimationFrame(raf);
    };
  }, []);

  return <div ref={ref} aria-hidden="true" className="cursor-halo" />;
}
