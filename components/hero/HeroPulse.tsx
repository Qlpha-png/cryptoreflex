import {
  buildPulseGeometry,
  downsample,
  fallbackSpark,
  thermalGoldStop,
} from "@/lib/pulse";

/**
 * HeroPulse — la ligne de vie du marché (DA « Pouls Incandescent »,
 * panel créatif 2026-06-11).
 *
 * La VRAIE courbe BTC 7 jours, rendue comme une veine de lumière
 * monumentale qui traverse tout le hero : 4 paths SVG empilés sur la
 * même géométrie (bloom 24px → halo 9px → glow 4px → cœur incandescent
 * 1.75px) portés par un gradient thermique or → glacier. L'or naît côté
 * passé (la marque), le glacier éclaire le présent (la donnée). Le
 * Fear & Greed module la frontière — jamais de vert/rouge : la
 * température n'est pas un signal d'achat.
 *
 * 100 % Server Component : le SVG est dans le HTML initial (screenshot
 * parfait au premier paint, zéro hydration, zéro CLS). L'animation
 * d'entrée (draw 1.1s) est en CSS pur via pathLength normalisé — pas
 * de JS. La tête pulsante et le chip prix vivent dans l'île client
 * séparée <HeroPulseLive /> superposée par le parent.
 *
 * Compliance MiCA/AMF : aucun axe, aucun pourcentage, aucune échelle —
 * c'est une signature visuelle construite sur la donnée, pas un
 * graphique d'aide à la décision (le vrai chart vit sur /cryptos/bitcoin).
 */

const VIEW_W = 1200;
const VIEW_H = 360;
const PAD_T = 36;
const PAD_B = 64;

interface Props {
  /** Sparkline BTC 7j (168 points horaires). Fallback décoratif si absente. */
  sparkline?: number[];
  /** Fear & Greed 0-100 (module la frontière or/glacier). */
  fearGreed?: number | null;
}

export default function HeroPulse({ sparkline, fearGreed }: Props) {
  const isReal = !!sparkline && sparkline.length >= 24;
  const points = downsample(isReal ? sparkline! : fallbackSpark(), 96);
  const geo = buildPulseGeometry(points, VIEW_W, VIEW_H, PAD_T, PAD_B);
  if (!geo) return null;

  const goldStop = thermalGoldStop(fearGreed);

  // 4 passes : du plus diffus au plus incandescent. Les largeurs sont en
  // unités viewBox (vector-effect non utilisé : le scale étire la lumière
  // avec la ligne, c'est voulu — preserveAspectRatio="none").
  const passes: Array<{ w: number; o: number; useGradient: boolean }> = [
    { w: 24, o: 0.07, useGradient: true },
    { w: 9, o: 0.14, useGradient: true },
    { w: 4, o: 0.32, useGradient: true },
    { w: 1.75, o: 0.95, useGradient: false }, // cœur : blanc chaud uni
  ];

  return (
    <svg
      viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
      preserveAspectRatio="none"
      className="hero-pulse-svg"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        {/* Gradient thermique — l'identité du site en un trait */}
        <linearGradient id="pulse-thermal" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#F5A524" />
          <stop offset={String(goldStop)} stopColor="#FBBF24" />
          <stop offset={String(Math.min(0.72, goldStop + 0.2))} stopColor="#FFE9C2" />
          <stop offset="0.85" stopColor="#7DD3FC" />
          <stop offset="1" stopColor="#38BDF8" />
        </linearGradient>
        {/* Rideau de lumière sous la courbe — s'éteint vers le bas */}
        <linearGradient id="pulse-curtain" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#FBBF24" stopOpacity="0.10" />
          <stop offset="0.4" stopColor="#7DD3FC" stopOpacity="0.04" />
          <stop offset="1" stopColor="#38BDF8" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* Aplat sous la courbe */}
      <path d={geo.area} fill="url(#pulse-curtain)" />

      {/* 4 passes de lumière sur la même géométrie */}
      {passes.map((p, i) => (
        <path
          key={i}
          d={geo.line}
          fill="none"
          stroke={p.useGradient ? "url(#pulse-thermal)" : "#FFE9C2"}
          strokeWidth={p.w}
          strokeOpacity={p.o}
          strokeLinecap="round"
          strokeLinejoin="round"
          pathLength={1}
          className="hero-pulse-path"
        />
      ))}
    </svg>
  );
}

/** Coordonnées du dernier point en % du viewBox — pour ancrer l'île live. */
export function pulseHeadPosition(sparkline?: number[]): {
  xPct: number;
  yPct: number;
  isReal: boolean;
} {
  const isReal = !!sparkline && sparkline.length >= 24;
  const points = downsample(isReal ? sparkline! : fallbackSpark(), 96);
  const geo = buildPulseGeometry(points, VIEW_W, VIEW_H, PAD_T, PAD_B);
  if (!geo) return { xPct: 100, yPct: 50, isReal: false };
  return {
    xPct: (geo.last[0] / VIEW_W) * 100,
    yPct: (geo.last[1] / VIEW_H) * 100,
    isReal,
  };
}
