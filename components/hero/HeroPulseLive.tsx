"use client";

import { useEffect, useRef, useState } from "react";
import { formatUsd } from "@/lib/coingecko";
import { useLivePrices } from "@/lib/hooks/useLivePrices";

/**
 * HeroPulseLive — l'île vivante du Pouls (client-only, ssr:false).
 *
 * Superposée au SVG serveur <HeroPulse /> : la tête pulsante ancrée au
 * bout de la ligne (coordonnées % calculées côté serveur) + le chip
 * prix BTC qui respire au rythme du poll 30 s (flash factuel au tick).
 *
 * N'est rendue QUE si la sparkline est réelle (isReal) : jamais de
 * chip prix sur la courbe décorative de secours — pas de fausses
 * données interactives.
 */

interface Props {
  /** Position de la tête en % du conteneur (depuis pulseHeadPosition). */
  xPct: number;
  yPct: number;
  /** Prix BTC initial (SSR) — affiché avant le premier tick live. */
  initialPrice: number;
}

export default function HeroPulseLive({ xPct, yPct, initialPrice }: Props) {
  const { prices } = useLivePrices(["bitcoin"]);
  const live = prices["bitcoin"];
  const price = live?.price ?? initialPrice;

  // B1 reprise (jury ronde 1) : sous md, la barre fixe du bas (64 px, fond à 95 %) laissait voir le texte de la puce en
  // transparence quand le héros dépasse l'écran (390×844, 414×896). La puce est masquée tant qu'elle chevauche la barre,
  // et réapparaît dès qu'elle remonte (défilement, rotation). Île client-only : aucun effet sur le rendu serveur.
  const chipRef = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const chip = chipRef.current;
    if (!chip) return;
    const verifier = () => {
      const barre = document.querySelector<HTMLElement>('nav[aria-label="Navigation principale mobile"]');
      const r = chip.getBoundingClientRect();
      const b = barre && getComputedStyle(barre).display !== "none" ? barre.getBoundingClientRect() : null;
      const chevauche = !!b && r.bottom > b.top && r.top < b.bottom;
      chip.style.visibility = chevauche ? "hidden" : "";
    };
    verifier();
    window.addEventListener("scroll", verifier, { passive: true });
    window.addEventListener("resize", verifier);
    return () => {
      window.removeEventListener("scroll", verifier);
      window.removeEventListener("resize", verifier);
    };
  }, [price]);

  // Flash 600ms à chaque variation de prix.
  const prev = useRef(price);
  const [flash, setFlash] = useState(false);
  useEffect(() => {
    if (price === prev.current) return;
    prev.current = price;
    setFlash(true);
    const t = setTimeout(() => setFlash(false), 600);
    return () => clearTimeout(t);
  }, [price]);

  return (
    <div
      className="pointer-events-none absolute inset-0 z-[2]"
      aria-hidden="true"
      style={{ containIntrinsicSize: "0 0" }}
    >
      {/* Tête pulsante au bout de la ligne */}
      <span
        className="hero-pulse-head"
        style={{ left: `${xPct}%`, top: `${yPct}%` }}
      />
      {/* Chip prix BTC — mono, factuel */}
      <span
        ref={chipRef}
        className={`hero-pulse-chip ${flash ? "hero-pulse-chip-flash" : ""}`}
        style={{
          left: `min(${xPct}%, calc(100% - 9.5rem))`,
          top: `${yPct}%`,
        }}
      >
        <span className="hero-pulse-chip-label">BTC</span>
        <span className="num-data">{formatUsd(price)}</span>
        <span className="hero-pulse-chip-live">
          <span className="hero-pulse-chip-dot" />
          direct
        </span>
      </span>
    </div>
  );
}
