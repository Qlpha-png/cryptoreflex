"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { Activity } from "lucide-react";

/**
 * PriceChart — graphique prix multi-période (7j / 30j / 1an), SVG inline.
 *
 * Architecture (P1-2 audit-front-2026) :
 *  - Client Component : fetch /api/historical AU MOUNT (jamais au render initial),
 *    pour rester hydration-safe et ne pas casser le caching SSR/ISR de la page.
 *  - SVG calculé manuellement (pas de lib externe — cohérent avec sparkline,
 *    bundle JS minimal). Path linéaire + polygone "fill" sous la courbe.
 *  - Tooltip : hover/focus déplace une ligne verticale + bulle prix + date.
 *  - Toggle période 7/30/365j : refetch propre, garde la donnée précédente
 *    pour éviter le flash blanc (skeleton seulement au premier mount).
 *  - A11y : role="img" + aria-label dynamique ("Graphique prix Bitcoin
 *    7 derniers jours, prix actuel X €"), focusable au clavier, instructions
 *    sr-only pour la navigation, points clavier ←/→ pour parcourir.
 *  - prefers-reduced-motion : pas de transition sur le tooltip si actif.
 */

type Period = 7 | 30 | 365;

interface HistoricalPoint {
  /** ms */
  t: number;
  /** prix (currency demandée — ici EUR par défaut) */
  price: number;
}

interface Props {
  coingeckoId: string;
  /** EUR par défaut. L'API ne supporte que EUR/USD côté wrapper actuel — extension future. */
  currency?: "eur" | "usd";
  /** Nom humain pour l'aria-label ("Bitcoin", "Ethereum"…). Optionnel. */
  cryptoName?: string;
}

const PERIOD_OPTIONS: Array<{ value: Period; label: string; aria: string }> = [
  { value: 7, label: "7j", aria: "7 derniers jours" },
  { value: 30, label: "30j", aria: "30 derniers jours" },
  { value: 365, label: "1an", aria: "1 dernière année" },
];

const WIDTH = 300;
const HEIGHT = 120;
const PADDING_X = 4;
const PADDING_Y = 6;

export default function PriceChart({
  coingeckoId,
  currency = "eur",
  cryptoName,
}: Props) {
  const [period, setPeriod] = useState<Period>(7);
  const [points, setPoints] = useState<HistoricalPoint[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  const svgRef = useRef<SVGSVGElement | null>(null);
  const liveLabelRef = useRef<HTMLSpanElement | null>(null);

  /* -------- Fetch au mount + à chaque changement de période -------------- */
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    fetch(`/api/historical?coin=${encodeURIComponent(coingeckoId)}&days=${period}`, {
      cache: "force-cache",
    })
      .then(async (r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const data = (await r.json()) as { points: HistoricalPoint[] };
        if (cancelled) return;
        setPoints(Array.isArray(data.points) ? data.points : []);
      })
      .catch(() => {
        if (cancelled) return;
        setError("Données indisponibles");
        setPoints(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [coingeckoId, period]);

  /* -------- Géométrie SVG memoïsée --------------------------------------- */
  const geometry = useMemo(() => {
    if (!points || points.length < 2) return null;

    const min = Math.min(...points.map((p) => p.price));
    const max = Math.max(...points.map((p) => p.price));
    const span = max - min || 1;
    const innerW = WIDTH - PADDING_X * 2;
    const innerH = HEIGHT - PADDING_Y * 2;
    const stepX = innerW / (points.length - 1);

    const coords = points.map((p, i) => ({
      x: PADDING_X + i * stepX,
      y: PADDING_Y + innerH - ((p.price - min) / span) * innerH,
      price: p.price,
      t: p.t,
    }));

    const linePath = coords
      .map((c, i) => `${i === 0 ? "M" : "L"}${c.x.toFixed(2)},${c.y.toFixed(2)}`)
      .join(" ");

    const fillPath = `${linePath} L${coords[coords.length - 1]!.x.toFixed(
      2
    )},${(HEIGHT - PADDING_Y).toFixed(2)} L${coords[0]!.x.toFixed(
      2
    )},${(HEIGHT - PADDING_Y).toFixed(2)} Z`;

    const last = coords[coords.length - 1]!;
    const first = coords[0]!;
    const positive = last.price >= first.price;

    return { coords, linePath, fillPath, min, max, positive };
  }, [points]);

  /* -------- Tooltip pointer handling ------------------------------------- */
  const handlePointer = useCallback(
    (e: ReactPointerEvent<SVGSVGElement>) => {
      if (!geometry || !svgRef.current) return;
      const rect = svgRef.current.getBoundingClientRect();
      // Conversion px écran → coordonnées viewBox (responsive scale).
      const xRatio = WIDTH / rect.width;
      const xView = (e.clientX - rect.left) * xRatio;

      // Trouve le point le plus proche en X.
      let bestIdx = 0;
      let bestDist = Infinity;
      for (let i = 0; i < geometry.coords.length; i++) {
        const d = Math.abs(geometry.coords[i]!.x - xView);
        if (d < bestDist) {
          bestDist = d;
          bestIdx = i;
        }
      }
      setHoverIdx(bestIdx);
    },
    [geometry]
  );

  const handleLeave = useCallback(() => setHoverIdx(null), []);

  /* -------- Clavier : ←/→ pour naviguer ---------------------------------- */
  const handleKey = useCallback(
    (e: ReactKeyboardEvent<SVGSVGElement>) => {
      if (!geometry) return;
      const total = geometry.coords.length;
      if (e.key === "ArrowRight") {
        e.preventDefault();
        setHoverIdx((i) => Math.min((i ?? -1) + 1, total - 1));
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        setHoverIdx((i) => Math.max((i ?? total) - 1, 0));
      } else if (e.key === "Home") {
        e.preventDefault();
        setHoverIdx(0);
      } else if (e.key === "End") {
        e.preventDefault();
        setHoverIdx(total - 1);
      } else if (e.key === "Escape") {
        setHoverIdx(null);
      }
    },
    [geometry]
  );

  /* -------- Aria label dynamique ---------------------------------------- */
  const periodLabelHuman =
    period === 7 ? "7 derniers jours" : period === 30 ? "30 derniers jours" : "1 dernière année";

  const lastPrice = geometry?.coords[geometry.coords.length - 1]?.price ?? null;
  const lastPriceFormatted =
    lastPrice !== null ? formatPrice(lastPrice, currency) : "—";

  const ariaLabel = `Graphique prix ${cryptoName ?? coingeckoId} ${periodLabelHuman}, prix actuel ${lastPriceFormatted}.`;

  /* -------- Rendu ------------------------------------------------------- */

  return (
    <section
      aria-label={`Graphique prix ${cryptoName ?? coingeckoId}`}
      className="rounded-2xl border border-border bg-surface p-5 sm:p-6"
    >
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-primary" aria-hidden="true" />
          <h2 className="text-base sm:text-lg font-bold tracking-tight">
            Prix {cryptoName ?? ""} sur{" "}
            <span className="gradient-text">{periodLabelHuman}</span>
          </h2>
        </div>

        {/* Toggle période — chips role=radiogroup */}
        <div
          role="radiogroup"
          aria-label="Choisir la période"
          className="inline-flex items-center gap-1 rounded-xl border border-border bg-elevated/60 p-1"
        >
          {PERIOD_OPTIONS.map((opt) => {
            const active = period === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                role="radio"
                aria-checked={active}
                aria-label={opt.aria}
                onClick={() => setPeriod(opt.value)}
                className={[
                  "px-3 py-1 text-xs font-semibold rounded-lg transition-colors",
                  "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface",
                  active
                    ? "bg-primary text-background"
                    : "text-muted hover:text-fg",
                ].join(" ")}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Live region pour le tooltip clavier */}
      <span ref={liveLabelRef} className="sr-only" aria-live="polite">
        {hoverIdx !== null && geometry?.coords[hoverIdx]
          ? `${formatPrice(geometry.coords[hoverIdx]!.price, currency)} le ${formatDate(
              geometry.coords[hoverIdx]!.t,
              period
            )}`
          : ""}
      </span>

      {/* Body : skeleton / error / chart */}
      <div className="mt-4 relative" style={{ minHeight: HEIGHT }}>
        {loading && !geometry && <Skeleton />}

        {!loading && error && !geometry && (
          <div
            role="status"
            className="flex items-center justify-center h-[120px] text-sm text-muted"
          >
            {error}
          </div>
        )}

        {!loading && !error && (!points || points.length < 2) && (
          <div
            role="status"
            className="flex items-center justify-center h-[120px] text-sm text-muted"
          >
            Aucune donnée disponible.
          </div>
        )}

        {geometry && (
          <ChartSvg
            geometry={geometry}
            hoverIdx={hoverIdx}
            ariaLabel={ariaLabel}
            currency={currency}
            period={period}
            onPointer={handlePointer}
            onLeave={handleLeave}
            onKey={handleKey}
            svgRef={svgRef}
          />
        )}
      </div>

      <p className="mt-3 text-[11px] text-muted">
        Données : CoinGecko, devise {currency.toUpperCase()}, cache 1h.
      </p>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/*  Sous-composants                                                           */
/* -------------------------------------------------------------------------- */

interface Geometry {
  coords: Array<{ x: number; y: number; price: number; t: number }>;
  linePath: string;
  fillPath: string;
  min: number;
  max: number;
  positive: boolean;
}

function ChartSvg({
  geometry,
  hoverIdx,
  ariaLabel,
  currency,
  period,
  onPointer,
  onLeave,
  onKey,
  svgRef,
}: {
  geometry: Geometry;
  hoverIdx: number | null;
  ariaLabel: string;
  currency: "eur" | "usd";
  period: Period;
  onPointer: (e: ReactPointerEvent<SVGSVGElement>) => void;
  onLeave: () => void;
  onKey: (e: ReactKeyboardEvent<SVGSVGElement>) => void;
  svgRef: React.MutableRefObject<SVGSVGElement | null>;
}) {
  const { coords, linePath, fillPath, positive } = geometry;
  const stroke = "#F5A524"; // primary
  const strokeHover = "#FBBF24";
  const gradientId = `priceFill-${period}`;
  const hovered = hoverIdx !== null ? coords[hoverIdx] : null;

  return (
    <>
      <svg
        ref={svgRef}
        role="img"
        aria-label={ariaLabel}
        tabIndex={0}
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        preserveAspectRatio="none"
        className="block w-full h-[120px] outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface rounded"
        onPointerMove={onPointer}
        onPointerLeave={onLeave}
        onKeyDown={onKey}
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={stroke} stopOpacity="0.16" />
            <stop offset="100%" stopColor={stroke} stopOpacity="0" />
          </linearGradient>
        </defs>

        <path d={fillPath} fill={`url(#${gradientId})`} />
        <path
          d={linePath}
          fill="none"
          stroke={positive ? stroke : "#f43f5e"}
          strokeWidth={1.8}
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {hovered && (
          <>
            <line
              x1={hovered.x}
              x2={hovered.x}
              y1={PADDING_Y}
              y2={HEIGHT - PADDING_Y}
              stroke={strokeHover}
              strokeWidth={0.8}
              strokeDasharray="2 3"
              opacity={0.7}
            />
            <circle
              cx={hovered.x}
              cy={hovered.y}
              r={3.5}
              fill={strokeHover}
              stroke="#0b0d12"
              strokeWidth={1}
            />
          </>
        )}
      </svg>

      {/* Tooltip HTML — positionné en absolu, suit le hovered */}
      {hovered && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-2 rounded-lg border border-border bg-elevated/95 backdrop-blur px-2.5 py-1.5 text-[11px] font-mono text-fg shadow-lg"
          style={{
            left: `calc(${(hovered.x / WIDTH) * 100}% - 50px)`,
            transform: "translateY(-100%)",
            minWidth: 100,
          }}
        >
          <div className="font-bold text-fg tabular-nums">
            {formatPrice(hovered.price, currency)}
          </div>
          <div className="text-muted text-[10px]">
            {formatDate(hovered.t, period)}
          </div>
        </div>
      )}

      <p className="sr-only">
        Utilisez les flèches gauche et droite pour parcourir les points du
        graphique. Échap pour quitter le tooltip.
      </p>
    </>
  );
}

function Skeleton() {
  return (
    <div
      role="status"
      aria-label="Chargement du graphique"
      className="h-[120px] rounded-lg bg-elevated/60 animate-pulse motion-reduce:animate-none"
    />
  );
}

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                   */
/* -------------------------------------------------------------------------- */

function formatPrice(value: number, currency: "eur" | "usd"): string {
  try {
    return new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency: currency.toUpperCase(),
      maximumFractionDigits: value >= 1 ? 2 : 6,
    }).format(value);
  } catch {
    return `${value.toFixed(2)} ${currency.toUpperCase()}`;
  }
}

function formatDate(t: number, period: Period): string {
  const d = new Date(t);
  if (period === 7) {
    return d.toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  }
  if (period === 30) {
    return d.toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "short",
    });
  }
  return d.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

