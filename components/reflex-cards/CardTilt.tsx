"use client";

import { useEffect } from "react";

/**
 * Inclinaison 3D et reflets au survol des cartes Reflex (bindTilt de la maquette).
 * Un seul composant par page : il accroche toutes les cartes `.rc-card[data-tilt]`.
 * Rien si « réduire les animations » est demandé.
 */
export default function CardTilt() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const f1 = (v: number) => v.toFixed(1);
    const off: (() => void)[] = [];
    document.querySelectorAll<HTMLElement>(".rc-card[data-tilt]").forEach((el) => {
      const move = (e: PointerEvent) => {
        const b = el.getBoundingClientRect(), px = (e.clientX - b.left) / b.width, py = (e.clientY - b.top) / b.height;
        el.style.setProperty("--rx", f1((0.5 - py) * 16) + "deg");
        el.style.setProperty("--px", f1((px - 0.5) * 9) + "px");
        el.style.setProperty("--py", f1((py - 0.5) * 7) + "px");
        el.style.setProperty("--ry", f1((px - 0.5) * 20) + "deg");
        el.style.setProperty("--mx", f1(px * 100) + "%");
        el.style.setProperty("--my", f1(py * 100) + "%");
      };
      const leave = () => {
        for (const [k, v] of [["--px", "0px"], ["--py", "0px"], ["--rx", "0deg"], ["--ry", "0deg"], ["--mx", "50%"], ["--my", "50%"]]) el.style.setProperty(k, v);
      };
      el.addEventListener("pointermove", move);
      el.addEventListener("pointerleave", leave);
      off.push(() => {
        el.removeEventListener("pointermove", move);
        el.removeEventListener("pointerleave", leave);
      });
    });
    return () => off.forEach((f) => f());
  }, []);
  return null;
}
