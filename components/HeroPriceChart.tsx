"use client";

/**
 * HeroPriceChart — point focal visuel du hero (desktop >=lg).
 *
 * Grand graphique de prix premium sur données RÉELLES :
 *  - courbe 7j = sparkline_in_7d (CoinGecko) passée par le serveur,
 *  - prix vedette = live SSE via useLivePrices (~2.5s) + flash up/down,
 *  - sélecteur BTC / ETH / SOL,
 *  - crosshair interactif au survol (prix au point pointé),
 *  - courbe lissée (Catmull-Rom→Bézier), aire dégradée gold, tracé animé,
 *    dernier point "live" pulsant.
 *
 * Accent GOLD signature (cohérent dark+gold). La variation 24h reste
 * colorée vert/rouge (signal marché). 100% accessible + reduced-motion.
 * Rendu client-only (ssr:false côté Hero) → aucun mismatch d'hydration.
 */

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, TrendingUp, TrendingDown } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import type { CoinPrice } from "@/lib/coingecko";
import { formatUsd, formatPct } from "@/lib/coingecko";
import CryptoLogo from "@/components/ui/CryptoLogo";
import LiveAge from "@/components/ui/LiveAge";
import { useLivePrices } from "@/lib/hooks/useLivePrices";

const FOCUS_IDS = ["bitcoin", "ethereum", "solana"] as const;
const LIVE_IDS = ["bitcoin", "ethereum", "solana"];

const VIEW_W = 600;
const VIEW_H = 240;
const PAD_T = 18;
const PAD_B = 22;

interface Props {
  prices: CoinPrice[];
  sparklines?: Partial<Record<string, number[]>>;
  updatedAt?: string;
}

export default function HeroPriceChart({ prices, sparklines, updatedAt }: Props) {
  const { prices: livePrices, lastUpdate } = useLivePrices(LIVE_IDS);
  const [activeId, setActiveId] = useState<string>("bitcoin");
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const reduce = useReducedMotion();

  // Coins disponibles dans l'ordre BTC / ETH / SOL.
  const coins = FOCUS_IDS.flatMap((id) => {
    const found = prices.find((p) => p.id === id);
    return found ? [found] : [];
  });
  const active = coins.find((c) => c.id === activeId) ?? coins[0];

  // Prix vedette : live SSE si dispo, sinon valeur serveur.
  const live = active ? livePrices[active.id] : undefined;
  const price = live?.price ?? active?.price ?? 0;
  const change24h = live?.change24h ?? active?.change24h ?? 0;
  const up = change24h >= 0;

  // Série 7j (réelle) ; fallback courbe synthétique cohérente si absente.
  const baseSeries = useMemo(() => {
    const raw = active ? sparklines?.[active.id] : undefined;
    if (raw && raw.length >= 2) return raw;
    return active ? synthSpark(active) : [];
  }, [active, sparklines]);

  // Append le prix live comme dernier point → la courbe descend jusqu'au prix
  // affiché et la plage 7j reste cohérente (évite "prix < bas 7j").
  const series = useMemo(
    () => (price > 0 && baseSeries.length ? [...baseSeries, price] : baseSeries),
    [baseSeries, price],
  );

  const geo = useMemo(() => buildGeometry(series), [series]);
  const effectiveUpdatedAt = lastUpdate ? lastUpdate.toISOString() : updatedAt;

  if (!active || !geo) {
    return (
      <aside
        aria-label="Marché crypto en direct"
        className="glass rounded-2xl p-5 sm:p-6 shadow-card"
        style={{ minHeight: 320 }}
      />
    );
  }

  const min = Math.min(...series);
  const max = Math.max(...series);
  const hoverPt = hoverIdx != null ? geo.coords[hoverIdx] : null;
  const hoverVal = hoverIdx != null ? series[hoverIdx] : null;

  function onMove(e: React.MouseEvent<SVGSVGElement>) {
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const ratio = (e.clientX - rect.left) / rect.width;
    const idx = Math.round(ratio * (series.length - 1));
    setHoverIdx(Math.max(0, Math.min(series.length - 1, idx)));
  }

  return (
    <aside
      aria-label="Marché crypto en direct"
      className="glass card-obsidian relative rounded-2xl p-5 sm:p-6 shadow-card"
    >
      {/* Onglets coins + badge LIVE */}
      <header className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-1.5" role="tablist" aria-label="Choisir une crypto">
          {coins.map((c) => {
            const sel = c.id === active.id;
            return (
              <button
                key={c.id}
                type="button"
                role="tab"
                aria-selected={sel}
                onClick={() => {
                  setActiveId(c.id);
                  setHoverIdx(null);
                }}
                className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-colors min-h-tap ${
                  sel
                    ? "bg-primary/15 text-primary-soft ring-1 ring-primary/30"
                    : "text-muted hover:text-fg hover:bg-white/5"
                }`}
              >
                <CryptoLogo symbol={c.symbol} coingeckoId={c.id} imageUrl={c.image} size={16} priority={sel} />
                {c.symbol.toUpperCase()}
              </button>
            );
          })}
        </div>
        <span
          className="live-dot inline-flex items-center text-[11px] font-bold uppercase tracking-[0.14em] text-accent-green"
          role="status"
          aria-label="Données de marché en direct"
        >
          Live
        </span>
      </header>

      {/* Prix vedette live + variation 24h */}
      <div className="mt-4 flex items-end justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-sm font-semibold text-fg">
            <CryptoLogo symbol={active.symbol} coingeckoId={active.id} imageUrl={active.image} size={22} priority />
            <span className="truncate">{active.name}</span>
          </div>
          <div className="mt-1.5 text-3xl font-extrabold font-mono tabular-nums leading-none text-fg">
            {hoverVal != null ? formatUsd(hoverVal) : formatUsd(price)}
          </div>
        </div>
        <div
          className={`inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-mono font-bold ${
            up ? "bg-success/10 text-accent-green" : "bg-danger/10 text-danger-fg"
          }`}
        >
          {up ? <TrendingUp className="h-3.5 w-3.5" aria-hidden="true" /> : <TrendingDown className="h-3.5 w-3.5" aria-hidden="true" />}
          <span className="sr-only">{up ? "Hausse de" : "Baisse de"}</span>
          {formatPct(change24h)}
        </div>
      </div>

      {/* Graphique */}
      <div className="relative mt-3">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
          className="w-full h-auto overflow-visible touch-none"
          role="img"
          aria-label={`Évolution du prix de ${active.name} sur 7 jours, tendance ${up ? "haussière" : "baissière"}`}
          onMouseMove={onMove}
          onMouseLeave={() => setHoverIdx(null)}
        >
          <defs>
            <linearGradient id="hpc-area" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#F5A524" stopOpacity="0.28" />
              <stop offset="100%" stopColor="#F5A524" stopOpacity="0" />
            </linearGradient>
            <linearGradient id="hpc-line" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#F5A524" />
              <stop offset="100%" stopColor="#FBBF24" />
            </linearGradient>
          </defs>

          {/* Grille horizontale subtile */}
          {[0.25, 0.5, 0.75].map((r) => (
            <line
              key={r}
              x1="0"
              x2={VIEW_W}
              y1={PAD_T + r * (VIEW_H - PAD_T - PAD_B)}
              y2={PAD_T + r * (VIEW_H - PAD_T - PAD_B)}
              stroke="rgba(255,255,255,0.05)"
              strokeWidth="1"
            />
          ))}

          {/* Aire dégradée */}
          <path d={geo.area} fill="url(#hpc-area)" />

          {/* Courbe (tracé animé via .spark-draw) */}
          <path
            d={geo.line}
            fill="none"
            stroke="url(#hpc-line)"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            pathLength={1}
            className={reduce ? undefined : "spark-draw"}
            style={{ filter: "drop-shadow(0 0 6px rgba(245,165,36,0.35))" }}
          />

          {/* Crosshair au survol */}
          {hoverPt && (
            <g aria-hidden="true">
              <line
                x1={hoverPt[0]}
                x2={hoverPt[0]}
                y1={PAD_T}
                y2={VIEW_H - PAD_B}
                stroke="rgba(245,165,36,0.45)"
                strokeWidth="1"
                strokeDasharray="3 3"
              />
              <circle cx={hoverPt[0]} cy={hoverPt[1]} r="5" fill="#FBBF24" stroke="#0b0d10" strokeWidth="2" />
            </g>
          )}

          {/* Dernier point "live" pulsant */}
          {!hoverPt && (
            <g aria-hidden="true">
              {!reduce && (
                <motion.circle
                  cx={geo.last[0]}
                  cy={geo.last[1]}
                  r={4}
                  fill="none"
                  stroke="#FBBF24"
                  strokeWidth="1.5"
                  initial={{ r: 4, opacity: 0.7 }}
                  animate={{ r: [4, 13], opacity: [0.7, 0] }}
                  transition={{ duration: 1.8, repeat: Infinity, ease: "easeOut" }}
                />
              )}
              <circle cx={geo.last[0]} cy={geo.last[1]} r="4" fill="#FBBF24" stroke="#0b0d10" strokeWidth="2" />
            </g>
          )}
        </svg>

        {/* Tooltip prix au survol */}
        {hoverPt && hoverVal != null && (
          <div
            className="pointer-events-none absolute -top-1 rounded-md border border-primary/30 bg-elevated/95 px-2 py-1 text-[11px] font-mono font-semibold text-fg shadow-e2"
            style={{
              left: `${(hoverPt[0] / VIEW_W) * 100}%`,
              transform: "translateX(-50%)",
            }}
          >
            {formatUsd(hoverVal)}
          </div>
        )}
      </div>

      {/* Pied : bornes 7j + lien marché */}
      <div className="mt-3 flex items-center justify-between gap-3 border-t border-border/60 pt-3">
        <div className="flex items-center gap-3 text-[11px] text-muted font-mono tabular-nums">
          <span>7j&nbsp;bas {formatUsd(min)}</span>
          <span className="text-border">·</span>
          <span>haut {formatUsd(max)}</span>
        </div>
        <Link
          href="/marche"
          className="inline-flex items-center gap-1 text-xs font-semibold text-primary-soft hover:text-primary transition-colors"
        >
          Tout le marché
          <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
        </Link>
      </div>

      <div className="mt-2 text-right text-[10px] text-muted font-mono">
        MAJ {effectiveUpdatedAt ? <LiveAge since={effectiveUpdatedAt} /> : "à l'instant"}
      </div>
    </aside>
  );
}

/* -------------------------------------------------------------------------- */
/* Géométrie : courbe lissée (Catmull-Rom → Bézier) + aire fermée             */
/* -------------------------------------------------------------------------- */

function buildGeometry(points: number[]) {
  if (!points || points.length < 2) return null;
  const min = Math.min(...points);
  const max = Math.max(...points);
  const span = max - min || 1;
  const innerH = VIEW_H - PAD_T - PAD_B;
  const step = VIEW_W / (points.length - 1);

  const coords: [number, number][] = points.map((v, i) => [
    i * step,
    PAD_T + innerH - ((v - min) / span) * innerH,
  ]);

  const line = smoothPath(coords);
  const area = `${line} L${VIEW_W},${VIEW_H - PAD_B} L0,${VIEW_H - PAD_B} Z`;

  return { coords, line, area, last: coords[coords.length - 1] };
}

/** Catmull-Rom → cubic Bézier pour une courbe douce (tension 1). */
function smoothPath(pts: [number, number][]): string {
  if (pts.length < 2) return "";
  let d = `M${pts[0][0].toFixed(2)},${pts[0][1].toFixed(2)}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] ?? p2;
    const c1x = p1[0] + (p2[0] - p0[0]) / 6;
    const c1y = p1[1] + (p2[1] - p0[1]) / 6;
    const c2x = p2[0] - (p3[0] - p1[0]) / 6;
    const c2y = p2[1] - (p3[1] - p1[1]) / 6;
    d += ` C${c1x.toFixed(2)},${c1y.toFixed(2)} ${c2x.toFixed(2)},${c2y.toFixed(2)} ${p2[0].toFixed(2)},${p2[1].toFixed(2)}`;
  }
  return d;
}

/** Fallback déterministe cohérent avec la variation 24h (si pas de sparkline réelle). */
function synthSpark(coin: CoinPrice): number[] {
  const base = coin.price || 100;
  const drift = (coin.change24h || 0) / 100;
  const seed = (coin.symbol.charCodeAt(0) || 1) + Math.round(base);
  let a = seed;
  const rng = () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const out: number[] = [];
  let v = base * (1 - drift);
  for (let i = 0; i < 32; i++) {
    v = v + (drift / 32) * base + (rng() - 0.5) * 0.012 * base;
    out.push(v);
  }
  return out;
}
