"use client";

import { useEffect, useRef, useState } from "react";

/**
 * HeroPulseScrub — le scrub de la ligne de vie (desktop uniquement).
 *
 * Survoler la zone du graphe révèle le point exact : réticule lumineux
 * posé SUR le trait + hairline verticale + chip mono « prix · il y a N h ».
 *
 * v2 (2026-06-13) — deux bugs corrigés (feedback « ça bug quand je passe
 * la souris sur la ligne ») :
 *   1. NE BLOQUE PLUS LES CLICS — l'ancien overlay couvrait toute la bande
 *      en pointer-events:auto et interceptait tout ce qui était dessous.
 *      Désormais l'overlay est pointer-events:none ; l'écoute du pointeur
 *      se fait sur la <section> du hero (l'évènement bulle, rien n'est
 *      bloqué).
 *   2. LE POINT TOMBE PILE SUR LA LIGNE — on échantillonne le VRAI tracé
 *      SVG affiché (getPointAtLength sur le cœur du pouls), comme la moto,
 *      au lieu d'une polyline 48 pts linéaire qui passait à côté de la
 *      courbe lissée.
 *
 * Factuel descriptif (pas d'axe, pas de variation %) → compliance. Souris
 * uniquement (jamais tactile). Aucun setState par mouvement (refs + rAF).
 */

interface Props {
  /** Sparkline BTC brute (≈168 points horaires, le dernier = maintenant). */
  sparkline: number[];
}

function agoLabel(hoursAgo: number): string {
  if (hoursAgo <= 0) return "maintenant";
  if (hoursAgo < 24) return `il y a ${hoursAgo} h`;
  const d = Math.floor(hoursAgo / 24);
  const h = hoursAgo % 24;
  return h ? `il y a ${d} j ${h} h` : `il y a ${d} j`;
}

export default function HeroPulseScrub({ sparkline }: Props) {
  const [enabled, setEnabled] = useState(false);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const lineRef = useRef<HTMLSpanElement | null>(null);
  const dotRef = useRef<HTMLSpanElement | null>(null);
  const chipRef = useRef<HTMLSpanElement | null>(null);

  useEffect(() => {
    setEnabled(window.matchMedia("(hover: hover) and (pointer: fine)").matches);
  }, []);

  useEffect(() => {
    if (!enabled || sparkline.length < 24) return;
    const wrap = wrapRef.current;
    const line = lineRef.current;
    const dot = dotRef.current;
    const chip = chipRef.current;
    if (!wrap || !line || !dot || !chip) return;
    const band = wrap.parentElement; // .hero-pulse-band
    const section = wrap.closest("section") ?? document.body;
    if (!band) return;

    // Échantillonnage du VRAI tracé affiché → [xPx, yPx] dans la bande.
    let samples: Array<[number, number]> = [];
    const buildSamples = () => {
      const rect = band.getBoundingClientRect();
      if (rect.width < 50) return;
      const paths = band.querySelectorAll<SVGPathElement>("path.hero-pulse-path");
      const core = paths[paths.length - 1];
      const svg = core?.ownerSVGElement;
      if (!core || !svg) return;
      const vb = svg.viewBox.baseVal;
      if (!vb || vb.width < 1) return;
      let total = 0;
      try {
        total = core.getTotalLength();
      } catch {
        return;
      }
      if (!total) return;
      const N = 240;
      const out: Array<[number, number]> = [];
      let prevX = -Infinity;
      for (let i = 0; i <= N; i++) {
        const pt = core.getPointAtLength((i / N) * total);
        const px = ((pt.x - vb.x) / vb.width) * rect.width;
        const py = ((pt.y - vb.y) / vb.height) * rect.height;
        if (px <= prevX + 0.01) continue;
        out.push([px, py]);
        prevX = px;
      }
      if (out.length >= 16) samples = out;
    };
    buildSamples();

    const yAtX = (xPx: number): number => {
      if (samples.length < 2) return 0;
      if (xPx <= samples[0][0]) return samples[0][1];
      for (let i = 0; i < samples.length - 1; i++) {
        const [x1, y1] = samples[i];
        const [x2, y2] = samples[i + 1];
        if (xPx <= x2) {
          const f = (xPx - x1) / Math.max(0.001, x2 - x1);
          return y1 + (y2 - y1) * f;
        }
      }
      return samples[samples.length - 1][1];
    };

    let raf = 0;
    let shown = false;

    const onMove = (e: PointerEvent) => {
      const { clientX, clientY } = e;
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const rect = band.getBoundingClientRect();
        // On ne montre le scrub que dans la zone du graphe (la bande).
        const inside =
          clientY >= rect.top &&
          clientY <= rect.bottom &&
          clientX >= rect.left &&
          clientX <= rect.right;
        if (!inside) {
          if (shown) {
            shown = false;
            wrap.classList.remove("hero-scrub-on");
          }
          return;
        }
        const xPx = Math.min(rect.width, Math.max(0, clientX - rect.left));
        const yPx = yAtX(xPx);
        const frac = xPx / rect.width;
        const i = Math.round(frac * (sparkline.length - 1));
        const price = sparkline[i];
        if (price == null) return;
        line.style.left = `${xPx}px`;
        dot.style.left = `${xPx}px`;
        dot.style.top = `${yPx}px`;
        chip.style.left = `${Math.min(Math.max(xPx, 88), rect.width - 88)}px`;
        chip.style.top = `${Math.max(10, yPx - 16)}px`;
        chip.textContent = `${Math.round(price).toLocaleString("fr-FR")} $ · ${agoLabel(sparkline.length - 1 - i)}`;
        if (!shown) {
          shown = true;
          wrap.classList.add("hero-scrub-on");
        }
      });
    };
    const onLeave = () => {
      cancelAnimationFrame(raf);
      shown = false;
      wrap.classList.remove("hero-scrub-on");
    };

    section.addEventListener("pointermove", onMove);
    section.addEventListener("pointerleave", onLeave);
    const ro = new ResizeObserver(buildSamples);
    ro.observe(band);
    // La courbe peut changer (données live) → re-échantillonner.
    const mo = new MutationObserver(() => buildSamples());
    mo.observe(band, { subtree: true, attributes: true, attributeFilter: ["d"] });

    return () => {
      cancelAnimationFrame(raf);
      section.removeEventListener("pointermove", onMove);
      section.removeEventListener("pointerleave", onLeave);
      ro.disconnect();
      mo.disconnect();
    };
  }, [enabled, sparkline]);

  if (!enabled || sparkline.length < 24) return null;

  return (
    <div ref={wrapRef} className="hero-scrub absolute inset-0" aria-hidden="true">
      <span ref={lineRef} className="hero-scrub-line" />
      <span ref={dotRef} className="hero-scrub-dot" />
      <span ref={chipRef} className="hero-scrub-chip num-data" />
    </div>
  );
}
