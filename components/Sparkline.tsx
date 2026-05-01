/**
 * Sparkline — micro-graphique SVG pur (zéro dépendance) pour visualiser
 * une tendance courte (typiquement 7 jours / 168 points CoinGecko).
 *
 * Choix :
 *  - Pur SVG (path d'aire fillée + ligne stroke), aucun lib chart-lib
 *  - Couleur dérivée du delta (data[last] >= data[0]) — vert / rouge
 *  - Animation au mount via `.spark-draw` (déjà défini dans globals.css :
 *    stroke-dasharray + stroke-dashoffset, 1.2s avec easing premium)
 *  - Accessible : <svg role="img" aria-label="…">. Placeholder muet si vide.
 *
 * Utilisé dans : PortfolioView, WatchlistView, MarketTableClient (existant
 * conservé pour la version "premium gradient" de la home), et toute autre
 * vue qui dispose d'un tableau de prix 7d.
 */

import type { CSSProperties } from "react";

export interface SparklineProps {
  /** Série de prix (au moins 2 points ; idéalement 7-168). */
  data: number[];
  /** Largeur SVG en px. */
  width?: number;
  /** Hauteur SVG en px. */
  height?: number;
  /** Si true, anime la longueur du path au mount (~600ms). Défaut : true. */
  animated?: boolean;
  /** Si true, affiche la variation absolue à droite du sparkline. */
  showLast?: boolean;
  /** Label a11y (override). Défaut : "Évolution sur 7 jours". */
  ariaLabel?: string;
  /** Override couleur (par défaut auto-dérivée du delta). */
  colorUp?: string;
  colorDown?: string;
  /** Classe additionnelle pour le wrapper <span>. */
  className?: string;
}

const DEFAULT_UP = "#10b981"; // green-500 ; cohérent avec --accent-green
const DEFAULT_DOWN = "#f43f5e"; // rose-500 ; cohérent avec --accent-rose

export default function Sparkline({
  data,
  width = 80,
  height = 24,
  animated = true,
  showLast = false,
  ariaLabel = "Évolution sur 7 jours",
  colorUp = DEFAULT_UP,
  colorDown = DEFAULT_DOWN,
  className,
}: SparklineProps) {
  // Placeholder neutre si la série est vide / dégénérée
  if (!data || data.length < 2) {
    return (
      <span
        aria-hidden="true"
        className={["inline-block align-middle", className ?? ""].join(" ").trim()}
        style={{ width, height }}
      >
        <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
          <line
            x1={0}
            y1={height / 2}
            x2={width}
            y2={height / 2}
            stroke="currentColor"
            strokeOpacity={0.18}
            strokeWidth={1}
            strokeDasharray="2 3"
          />
        </svg>
      </span>
    );
  }

  const first = data[0];
  const last = data[data.length - 1];
  const up = last >= first;
  const stroke = up ? colorUp : colorDown;

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const stepX = width / (data.length - 1);

  // Padding vertical 1px pour éviter que le stroke ne soit coupé
  const padY = 1;
  const usableH = Math.max(1, height - padY * 2);

  const points = data.map((v, i) => {
    const x = i * stepX;
    const y = padY + usableH - ((v - min) / range) * usableH;
    return `${x.toFixed(2)},${y.toFixed(2)}`;
  });

  const linePath = `M${points.join(" L")}`;
  const areaPath = `${linePath} L${width.toFixed(2)},${height} L0,${height} Z`;

  const variation = last - first;
  const variationPct = first !== 0 ? (variation / first) * 100 : 0;
  const variationLabel = `${variationPct >= 0 ? "+" : ""}${variationPct.toFixed(1)}%`;

  const pathStyle: CSSProperties = animated
    ? {
        // .spark-draw repose sur pathLength="1" — voir attribut sur <path>.
      }
    : {};

  return (
    <span
      className={["inline-flex items-center gap-1.5 align-middle", className ?? ""]
        .join(" ")
        .trim()}
    >
      <svg
        role="img"
        aria-label={ariaLabel}
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        className="block shrink-0 overflow-visible"
      >
        <path d={areaPath} fill={stroke} fillOpacity={0.15} />
        <path
          d={linePath}
          fill="none"
          stroke={stroke}
          strokeWidth={1.5}
          strokeLinecap="round"
          strokeLinejoin="round"
          pathLength={animated ? 1 : undefined}
          className={animated ? "spark-draw" : undefined}
          style={pathStyle}
        />
      </svg>
      {showLast && (
        <span
          className="text-[11px] font-mono font-semibold tabular-nums"
          style={{ color: stroke }}
        >
          {variationLabel}
        </span>
      )}
    </span>
  );
}
