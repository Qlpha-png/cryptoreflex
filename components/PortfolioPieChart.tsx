"use client";

import { useMemo } from "react";

export interface PieSlice {
  /** Identifiant stable (cryptoId) — sert de key React. */
  id: string;
  /** Label visible sur la légende (ex: "Bitcoin (BTC)"). */
  label: string;
  /** Valeur en EUR (sera convertie en %). */
  value: number;
}

interface PortfolioPieChartProps {
  /** Slices déjà cumulés. Ordre = ordre de stack (plus gros d'abord). */
  slices: PieSlice[];
  /** Top N affiché individuellement, le reste agrégé en "Autres". Défaut 5. */
  topN?: number;
  /** Diamètre SVG en px. Défaut 200. */
  size?: number;
  className?: string;
}

/**
 * Palette gold-cohérent avec le design system Cryptoreflex.
 * Choix volontaires :
 *   - 1ère slice (la plus grosse) en gold primary pour valoriser la "core position"
 *   - dégradé chaud → froid pour ne pas avoir 5 oranges qui se confondent
 *   - "Autres" en gris muted (pas une vraie position individuelle)
 */
const PALETTE = [
  "#F5A524", // primary gold (1ère = top holding)
  "#22D3EE", // cyan-400
  "#A78BFA", // violet-400
  "#F472B6", // pink-400
  "#34D399", // emerald-400
];
const OTHER_COLOR = "#525866";

/**
 * Camembert SVG calculé manuellement (pas de lib externe).
 *
 * - Si 1 seul slice : on dessine un cercle plein (un seul arc à 100% buggue
 *   en SVG path).
 * - Sinon : on calcule chaque arc avec la formule classique
 *   (sin/cos depuis le centre, large-arc-flag selon angle > 180°).
 *
 * Hover : le slice survolé est légèrement grossi via stroke-width.
 *
 * a11y :
 *   - role="img" + aria-label décrivant la composition complète
 *   - légende textuelle séparée (pas que visuelle, pour SR)
 */
export default function PortfolioPieChart({
  slices,
  topN = 5,
  size = 200,
  className = "",
}: PortfolioPieChartProps) {
  /* -------- Agrégation top N + "Autres" --------------------------------- */
  const { displayed, total } = useMemo(() => {
    const sorted = [...slices].sort((a, b) => b.value - a.value);
    const total = sorted.reduce((acc, s) => acc + s.value, 0);
    if (total <= 0) return { displayed: [] as PieSlice[], total: 0 };

    if (sorted.length <= topN) {
      return { displayed: sorted, total };
    }
    const top = sorted.slice(0, topN);
    const rest = sorted.slice(topN);
    const restSum = rest.reduce((acc, s) => acc + s.value, 0);
    return {
      displayed: [
        ...top,
        { id: "__others", label: "Autres", value: restSum },
      ],
      total,
    };
  }, [slices, topN]);

  /* -------- Calcul des arcs --------------------------------------------- */
  const arcs = useMemo(() => {
    if (total <= 0 || displayed.length === 0) return [];
    const cx = size / 2;
    const cy = size / 2;
    const r = size / 2 - 2; // 2px margin pour stroke

    // Cas 1 slice : on retourne un cercle plein (pie path à 100% est dégénéré)
    if (displayed.length === 1) {
      return [
        {
          id: displayed[0]!.id,
          label: displayed[0]!.label,
          pct: 100,
          color: PALETTE[0]!,
          isCircle: true,
          d: "",
        },
      ];
    }

    let angleStart = -Math.PI / 2; // commence à 12h
    return displayed.map((s, idx) => {
      const pct = (s.value / total) * 100;
      const angle = (s.value / total) * 2 * Math.PI;
      const angleEnd = angleStart + angle;

      const x1 = cx + r * Math.cos(angleStart);
      const y1 = cy + r * Math.sin(angleStart);
      const x2 = cx + r * Math.cos(angleEnd);
      const y2 = cy + r * Math.sin(angleEnd);
      const largeArc = angle > Math.PI ? 1 : 0;

      const d = [
        `M ${cx} ${cy}`,
        `L ${x1} ${y1}`,
        `A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2}`,
        "Z",
      ].join(" ");

      const color =
        s.id === "__others"
          ? OTHER_COLOR
          : PALETTE[idx % PALETTE.length] ?? PALETTE[0]!;

      angleStart = angleEnd;

      return {
        id: s.id,
        label: s.label,
        pct,
        color,
        isCircle: false,
        d,
      };
    });
  }, [displayed, total, size]);

  /* -------- aria-label détaillé pour SR ---------------------------------- */
  const ariaLabel = useMemo(() => {
    if (displayed.length === 0) return "Camembert vide : aucune position";
    const parts = displayed.map(
      (s) => `${s.label} ${((s.value / total) * 100).toFixed(1)}%`
    );
    return `Répartition du portefeuille : ${parts.join(", ")}`;
  }, [displayed, total]);

  if (displayed.length === 0) {
    return null;
  }

  return (
    <div
      className={`flex flex-col sm:flex-row items-center gap-6 ${className}`}
    >
      <div
        role="img"
        aria-label={ariaLabel}
        className="shrink-0"
        style={{ width: size, height: size }}
      >
        <svg
          viewBox={`0 0 ${size} ${size}`}
          width={size}
          height={size}
          aria-hidden="true"
        >
          {arcs.map((arc) =>
            arc.isCircle ? (
              <circle
                key={arc.id}
                cx={size / 2}
                cy={size / 2}
                r={size / 2 - 2}
                fill={arc.color}
              />
            ) : (
              <path
                key={arc.id}
                d={arc.d}
                fill={arc.color}
                stroke="rgba(0,0,0,0.25)"
                strokeWidth={1}
              >
                <title>{`${arc.label} — ${arc.pct.toFixed(1)}%`}</title>
              </path>
            )
          )}
          {/* Centre creux pour donut effect (optionnel — discret, garde la lisibilité) */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={size * 0.22}
            fill="#16191F"
            stroke="rgba(255,255,255,0.04)"
            strokeWidth={1}
          />
        </svg>
      </div>

      {/* Légende */}
      <ul className="flex-1 min-w-0 space-y-1.5 text-sm w-full">
        {arcs.map((arc) => {
          const pct = arc.pct;
          return (
            <li
              key={arc.id}
              className="flex items-center justify-between gap-3 min-w-0"
            >
              <span className="flex items-center gap-2 min-w-0">
                <span
                  aria-hidden="true"
                  className="inline-block h-3 w-3 rounded-sm shrink-0"
                  style={{ backgroundColor: arc.color }}
                />
                <span className="truncate text-fg/90">{arc.label}</span>
              </span>
              <span className="font-mono text-xs text-fg/80 shrink-0 tabular-nums">
                {pct.toFixed(1)}%
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
