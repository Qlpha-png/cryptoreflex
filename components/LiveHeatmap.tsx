"use client";

/**
 * LiveHeatmap — treemap crypto live style Finviz, animée tick-by-tick.
 *
 * Différence avec <Heatmap /> (statique top 100, layout grid uniforme) :
 *  - Source live : `useLivePrices()` → SSE Binance (fallback /api/prices REST).
 *  - Layout treemap pondéré par `marketCap` (algo squarified maison ~50 LOC).
 *  - Couleur interpolée par paliers (transition CSS 600ms à chaque tick prix).
 *  - Sparkline 7d optionnelle dans chaque tile (si `coins[i].sparkline7d`).
 *  - Slider time-frame (1h / 24h / 7j) — 24h utilise le delta SSE live, 1h et
 *    7j fallback sur les valeurs initiales (pas de stream sur ces périodes).
 *  - Click tile → navigate `/cryptos/{coingeckoId}` (Next router push).
 *
 * Limité à 20 cryptos par défaut (vs 100 sur l'autre composant) :
 *   - Squarified treemap dégénère visuellement au-delà (les tiles deviennent
 *     trop petites pour lire le symbol/prix).
 *   - SSE Binance : on garde le payload sous 2 KB/tick (cf. mapping
 *     `lib/binance-mapping.ts` qui filtre les ids non-listés Binance).
 *
 * Props :
 *   - `coins` : seed initial (Server Component, top 20 par market cap).
 *   - `internalSlugs` : optionnel, pour fallback "no link" sur les coins
 *     sans fiche éditoriale (rétro-compat avec <Heatmap />).
 *   - `embed` : si true, masque le header "Heatmap live" (le wrapper iframe
 *     l'affiche déjà).
 */

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import Link from "next/link";
import { cryptoPagePath } from "@/lib/crypto-page-slug";
import {
  formatCompactUsd,
  formatPct,
  formatUsd,
  type MarketCoin,
} from "@/lib/coingecko";
import { useLivePrices } from "@/lib/hooks/useLivePrices";
import DataSourceLine from "@/components/DataSourceLine";
import { ALLOWED_PRICE_STREAM_IDS } from "@/lib/binance-mapping";
import { useThemeColors } from "@/lib/theme/colors";

type Period = "1h" | "24h" | "7d";

interface Props {
  coins: MarketCoin[];
  internalSlugs?: string[];
  /** Si true → cacher le header (utile pour /embed/heatmap). */
  embed?: boolean;
  /** Surcharge le titre (par ex. "Top 20 cryptos en direct"). */
  heading?: string;
}

/* ─────────────────────── Couleurs interpolées ─────────────────────── */

/**
 * Couleur de tuile en fonction de la variation %.
 *
 * 06/10/2026 — l'ancienne échelle HSL (teinte fixe, saturation faible près
 * de 0) donnait des tuiles neutres marron boueux, et le vert vif portait un
 * texte blanc à 3,0-3,5:1. Désormais : gris propre entre −0,3 % et +0,3 %,
 * puis interpolation RGB par paliers vers le rouge ou le vert (teinte fixe
 * par signe, cf. audit 03/10/2026). Paliers calculés pour que le texte
 * blanc (opaque) reste ≥ 5:1 sur toute l’échelle.
 */
const NEUTRAL_RGB: readonly [number, number, number] = [58, 64, 74];
type ColorStop = readonly [number, readonly [number, number, number]];
const RED_STOPS: readonly ColorStop[] = [
  [0.3, NEUTRAL_RGB],
  [1.5, [126, 59, 69]],
  [4, [168, 50, 59]],
  [8, [192, 42, 42]],
];
const GREEN_STOPS: readonly ColorStop[] = [
  [0.3, NEUTRAL_RGB],
  [1.5, [47, 100, 73]],
  [4, [35, 116, 71]],
  [8, [23, 128, 63]],
];

function colorForChange(value: number | null): string {
  if (value === null || Number.isNaN(value)) {
    return `rgb(${NEUTRAL_RGB.join(", ")})`;
  }
  const a = Math.abs(value);
  const stops = value >= 0 ? GREEN_STOPS : RED_STOPS;
  let rgb: readonly number[] = stops[stops.length - 1][1];
  if (a <= stops[0][0]) {
    rgb = NEUTRAL_RGB;
  } else {
    for (let i = 1; i < stops.length; i++) {
      const [v1, c1] = stops[i];
      const [v0, c0] = stops[i - 1];
      if (a <= v1) {
        const t = (a - v0) / (v1 - v0);
        rgb = c0.map((x, k) => Math.round(x + (c1[k] - x) * t));
        break;
      }
    }
  }
  return `rgb(${rgb.join(", ")})`;
}

/* ─────────────────────── Typo des tuiles ─────────────────────── */

/**
 * 06/10/2026 — tailles choisies en PIXELS réels de la tuile (avant : en % de
 * surface, d'où « 02 », « 75 » ou « -0,54 / % » sur mobile). On garde le plus
 * grand palier où le ticker ET la variation tiennent en entier sur une ligne ;
 * sinon le ticker seul ; sinon aucun texte (aria-label + infobulle restent).
 */
const TEXT_TIERS = [
  { sym: 22, chg: 14 },
  { sym: 16, chg: 12 },
  { sym: 13, chg: 10 },
  { sym: 11, chg: 10 },
] as const;
/** Ticker seul : plafonné à 13 px pour ne pas détonner entre petites tuiles. */
const SYMBOL_ONLY_FROM = 2;
/** Avance d'un caractère mono en em, marge de sécurité incluse (repli si la mesure échoue). */
const MONO_CH = 0.64;
/** Police des tuiles (ticker + variation), partagée avec la mesure canvas. */
const MONO_STACK = "ui-monospace, Menlo, monospace";

/**
 * 06/10/2026 — avance RÉELLE de la police mono du système (Consolas ≈ 0,55 em,
 * Menlo ≈ 0,60 em), mesurée une fois au canvas, + 4 % de marge. L'estimation
 * fixe de 0,64 em faisait tomber 5 tuiles sur 60 en « ticker seul » à 1440 px.
 */
function measureMonoEm(): number {
  try {
    const ctx = document.createElement("canvas").getContext("2d");
    if (!ctx) return MONO_CH;
    ctx.font = `800 100px ${MONO_STACK}`;
    const em = ctx.measureText("0000000000").width / 1000;
    return em > 0.4 && em < 0.8 ? em * 1.04 : MONO_CH;
  } catch {
    return MONO_CH;
  }
}

function pickTileText(
  symbol: string,
  changeText: string,
  w: number,
  h: number,
  ch: number = MONO_CH,
): { sym: number; chg: number; top: boolean } {
  // le ticker a 0,02 em d'espacement de lettres en plus
  const symCh = ch + 0.02;
  for (let i = 0; i < TEXT_TIERS.length; i++) {
    const t = TEXT_TIERS[i];
    const fits =
      symbol.length * t.sym * symCh <= w &&
      changeText.length * t.chg * ch <= w &&
      t.sym * 1.1 + 2 + t.chg * 1.15 <= h;
    if (fits) return { sym: t.sym, chg: t.chg, top: i === 0 };
  }
  for (const t of TEXT_TIERS.slice(SYMBOL_ONLY_FROM)) {
    if (symbol.length * t.sym * symCh <= w && t.sym * 1.1 <= h) {
      return { sym: t.sym, chg: 0, top: false };
    }
  }
  return { sym: 0, chg: 0, top: false };
}

/* ─────────────────────── Squarified treemap ─────────────────────── */

interface TileInput {
  id: string;
  weight: number;
}

interface TileLayout {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Squarified treemap (Bruls, Huijing, van Wijk, 2000) — implémentation maison
 * compacte. Renvoie un layout en pourcentages [0..100], facile à appliquer en
 * CSS `position:absolute` + `width%/height%`.
 *
 * Approche : on alloue les tiles dans la "bande" la plus courte du rectangle
 * libre, et on choisit la prochaine tile pour minimiser l'aspect ratio max.
 */
function squarify(
  items: TileInput[],
  width: number,
  height: number,
): TileLayout[] {
  const totalWeight = items.reduce((s, it) => s + it.weight, 0);
  if (totalWeight <= 0 || items.length === 0) return [];

  // On normalise les poids pour qu'ils représentent une AIRE (en unités de
  // surface du rectangle width × height).
  const totalArea = width * height;
  const scaled = items.map((it) => ({
    id: it.id,
    area: (it.weight / totalWeight) * totalArea,
  }));

  const result: TileLayout[] = [];

  // Rect courant à remplir (on rogne au fur et à mesure).
  let rectX = 0;
  let rectY = 0;
  let rectW = width;
  let rectH = height;

  let row: typeof scaled = [];
  let i = 0;

  /** Calcule l'aspect ratio max d'une row donnée pour la côté court actuel. */
  const worstRatio = (currentRow: typeof scaled, shortSide: number): number => {
    if (currentRow.length === 0) return Infinity;
    const sum = currentRow.reduce((s, it) => s + it.area, 0);
    let maxR = 0;
    for (const it of currentRow) {
      const r = Math.max(
        (shortSide * shortSide * it.area) / (sum * sum),
        (sum * sum) / (shortSide * shortSide * it.area),
      );
      if (r > maxR) maxR = r;
    }
    return maxR;
  };

  /** Layout une row terminée le long du côté court du rect courant. */
  const layoutRow = (currentRow: typeof scaled) => {
    const shortSide = Math.min(rectW, rectH);
    const sum = currentRow.reduce((s, it) => s + it.area, 0);
    const longSide = sum / shortSide; // épaisseur de la bande
    if (rectW <= rectH) {
      // Bande horizontale en haut.
      let cursor = rectX;
      for (const it of currentRow) {
        const w = it.area / longSide;
        result.push({
          id: it.id,
          x: cursor,
          y: rectY,
          width: w,
          height: longSide,
        });
        cursor += w;
      }
      rectY += longSide;
      rectH -= longSide;
    } else {
      // Bande verticale à gauche.
      let cursor = rectY;
      for (const it of currentRow) {
        const h = it.area / longSide;
        result.push({
          id: it.id,
          x: rectX,
          y: cursor,
          width: longSide,
          height: h,
        });
        cursor += h;
      }
      rectX += longSide;
      rectW -= longSide;
    }
  };

  while (i < scaled.length) {
    const next = scaled[i];
    const shortSide = Math.min(rectW, rectH);
    const candidate = [...row, next];
    if (
      row.length === 0 ||
      worstRatio(candidate, shortSide) <= worstRatio(row, shortSide)
    ) {
      row = candidate;
      i += 1;
    } else {
      layoutRow(row);
      row = [];
    }
  }
  if (row.length > 0) layoutRow(row);

  // Conversion en pourcentages.
  return result.map((r) => ({
    id: r.id,
    x: (r.x / width) * 100,
    y: (r.y / height) * 100,
    width: (r.width / width) * 100,
    height: (r.height / height) * 100,
  }));
}

/* ─────────────────────── Sparkline mini (pure SVG) ─────────────────────── */

function MiniSparkline({
  values,
  color,
}: {
  values: number[];
  color: string;
}) {
  if (!values || values.length < 2) return null;
  const w = 100;
  const h = 24;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const step = w / (values.length - 1);
  const path = values
    .map((v, idx) => {
      const x = (idx * step).toFixed(1);
      const y = (h - ((v - min) / range) * h).toFixed(1);
      return `${idx === 0 ? "M" : "L"}${x},${y}`;
    })
    .join(" ");
  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      preserveAspectRatio="none"
      width="100%"
      height="100%"
      aria-hidden="true"
      style={{ display: "block", opacity: 0.55 }}
    >
      <path d={path} fill="none" stroke={color} strokeWidth="1.2" />
    </svg>
  );
}

/* ─────────────────────── Composant principal ─────────────────────── */

export default function LiveHeatmap({
  coins,
  internalSlugs,
  embed = false,
  heading = "Heatmap crypto en direct",
}: Props) {
  const [period, setPeriod] = useState<Period>("24h");
  const tc = useThemeColors();
  const [hovered, setHovered] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [size, setSize] = useState<{ w: number; h: number }>({
    w: 1000,
    h: 560,
  });
  // 06/10/2026 — texte masqué tant que la taille réelle n'est pas mesurée :
  // calibré sur 1000×560 (rendu serveur), il serait rogné sur mobile.
  const [measured, setMeasured] = useState(false);
  const [monoEm, setMonoEm] = useState(MONO_CH);

  // On ne stream QUE les ids qui ont un mapping Binance (sinon
  // /api/prices/stream les drop silencieusement et on a la donnée seed).
  const streamableIds = useMemo(
    () => coins.filter((c) => ALLOWED_PRICE_STREAM_IDS.has(c.id)).map((c) => c.id),
    [coins],
  );
  const { prices, status, lastUpdate } = useLivePrices(streamableIds);

  // ResizeObserver — pour recalculer le treemap quand la taille du conteneur
  // change (responsive, embed iframe, etc.).
  useEffect(() => {
    const node = containerRef.current;
    if (!node) return;
    setMonoEm(measureMonoEm());
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (width > 0 && height > 0) {
          setSize({ w: width, h: height });
          setMeasured(true);
        }
      }
    });
    ro.observe(node);
    return () => ro.disconnect();
  }, []);

  const slugSet = useMemo(
    () => new Set(internalSlugs ?? []),
    [internalSlugs],
  );

  // Layout treemap recalculé quand la taille change ou quand on a la liste.
  // On utilise sqrt(marketCap) pour adoucir la dispersion (Bitcoin écraserait
  // tout sinon — ratio ~3:1 vs ETH en marketCap brut).
  const layout = useMemo(() => {
    const items: TileInput[] = coins.map((c) => ({
      id: c.id,
      weight: Math.sqrt(Math.max(c.marketCap, 1)),
    }));
    return squarify(items, size.w || 1000, size.h || 560);
  }, [coins, size.w, size.h]);

  const layoutById = useMemo(() => {
    const m = new Map<string, TileLayout>();
    for (const t of layout) m.set(t.id, t);
    return m;
  }, [layout]);

  const periodLabel = period === "7d" ? "7 j" : period;
  // 06/10/2026 — espacements réduits sur conteneur étroit (mobile) : 16 px
  // perdus par tuile de 30 px, c'était la moitié de la place du texte.
  const narrow = size.w < 640;
  const gap = narrow ? 2 : 4;
  const innerPad = narrow ? 2 : 4;

  return (
    <div>
      {!embed && (
        <header className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="font-display text-xl sm:text-2xl font-extrabold tracking-tight text-fg">
              {heading}
            </h2>
            <p className="mt-1 text-xs text-muted">
              Top {coins.length} cryptos par capitalisation · taille = market cap
              · couleur = variation {periodLabel}
            </p>
          </div>
          <LiveStatusBadge status={status} lastUpdate={lastUpdate} />
        </header>
      )}

      {/* Slider période */}
      <div
        role="radiogroup"
        aria-label="Période de variation affichée"
        className="mb-3 inline-flex rounded-lg border border-border bg-surface p-1"
      >
        {(["1h", "24h", "7d"] as Period[]).map((p) => {
          const active = period === p;
          return (
            <button
              key={p}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => setPeriod(p)}
              className={[
                "px-3 py-1.5 text-xs font-semibold rounded-md transition-colors",
                "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                active
                  ? "bg-primary text-background"
                  : "text-muted hover:text-fg",
              ].join(" ")}
            >
              {p === "7d" ? "7 j" : p}
            </button>
          );
        })}
      </div>

      {/* Treemap */}
      <div
        ref={containerRef}
        role="region"
        aria-label={`Heatmap des ${coins.length} plus grosses cryptos, mise à jour en direct`}
        style={{
          position: "relative",
          width: "100%",
          height: "min(70vh, 640px)",
          minHeight: 420,
          borderRadius: 12,
          overflow: "hidden",
          background: "rgba(20,24,32,0.6)",
        }}
      >
        {coins.map((coin) => {
          const tile = layoutById.get(coin.id);
          if (!tile) return null;

          // Source de la variation : SSE pour 24h, seed sinon.
          const live = prices[coin.id];
          let change: number | null;
          if (period === "24h") {
            change = live ? live.change24h : coin.priceChange24h;
          } else if (period === "1h") {
            change = coin.priceChange1h;
          } else {
            change = coin.priceChange7d;
          }
          const price = live ? live.price : coin.currentPrice;

          const bg = colorForChange(change);
          // 06/10/2026 — blanc pur partout (≥ 5:1 garanti par la palette).
          const fg = tc("fg-max");
          const hasPage = slugSet.has(coin.id);
          const changeText = change === null ? "—" : formatPct(change);
          const cellLabel = `${coin.name} (${coin.symbol}), variation ${periodLabel} ${
            change === null ? "indisponible" : formatPct(change)
          }, prix ${formatUsd(price)}, capitalisation ${formatCompactUsd(coin.marketCap)}`;

          // Taille réelle de la zone de texte en px (tuile − espacements).
          const tileW = (tile.width / 100) * size.w;
          // 06/10/2026 — petite tuile : marge intérieure de 1 px (le texte est
          // centré), pour que la variation tienne sous le ticker.
          const pad = tileW < 72 ? 1 : innerPad;
          const availW = tileW - 2 * (gap + pad);
          const availH = (tile.height / 100) * size.h - 2 * (gap + pad);
          const text = measured
            ? pickTileText(coin.symbol, changeText, availW, availH, monoEm)
            : { sym: 0, chg: 0, top: false };
          // Sparkline seulement si elle ne chevauche pas le texte centré.
          const showSpark =
            text.top &&
            availH >= text.sym * 1.1 + 2 + text.chg * 1.15 + 44 &&
            !!coin.sparkline7d &&
            coin.sparkline7d.length > 1;

          const tileStyle: CSSProperties = {
            position: "absolute",
            left: `${tile.x}%`,
            top: `${tile.y}%`,
            width: `${tile.width}%`,
            height: `${tile.height}%`,
            padding: gap,
            boxSizing: "border-box",
          };

          const innerStyle: CSSProperties = {
            position: "relative",
            width: "100%",
            height: "100%",
            borderRadius: 6,
            background: bg,
            color: fg,
            transition:
              "background-color 600ms ease-out, transform 200ms ease-out",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            textAlign: "center",
            padding: pad,
            cursor: hasPage ? "pointer" : "default",
            outline: "none",
            overflow: "hidden",
          };

          const symbolStyle: CSSProperties = {
            fontFamily: MONO_STACK,
            fontWeight: 800,
            fontSize: text.sym,
            lineHeight: 1.1,
            letterSpacing: "0.02em",
            textTransform: "uppercase",
            maxWidth: "100%",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            // Le reset global overflow-wrap:anywhere ne doit pas couper le ticker.
            overflowWrap: "normal",
          };

          const changeStyle: CSSProperties = {
            fontFamily: MONO_STACK,
            fontWeight: 600,
            fontSize: text.chg,
            lineHeight: 1.15,
            marginTop: 2,
            fontVariantNumeric: "tabular-nums",
            whiteSpace: "nowrap",
            overflowWrap: "normal",
          };

          const sharedHandlers = {
            onMouseEnter: () => setHovered(coin.id),
            onMouseLeave: () =>
              setHovered((cur) => (cur === coin.id ? null : cur)),
            onFocus: () => setHovered(coin.id),
            onBlur: () =>
              setHovered((cur) => (cur === coin.id ? null : cur)),
          };

          const inner = (
            <>
              {text.sym > 0 && <span style={symbolStyle}>{coin.symbol}</span>}
              {text.chg > 0 && <span style={changeStyle}>{changeText}</span>}
              {/* Sparkline 7d affichée uniquement sur les grandes tiles. */}
              {showSpark && coin.sparkline7d && (
                <div
                  style={{
                    position: "absolute",
                    left: 6,
                    right: 6,
                    bottom: 4,
                    height: 18,
                    pointerEvents: "none",
                  }}
                >
                  <MiniSparkline
                    values={coin.sparkline7d}
                    color={fg}
                  />
                </div>
              )}
              {hovered === coin.id && (
                <CellTooltip
                  coin={coin}
                  change={change}
                  price={price}
                  period={period}
                />
              )}
            </>
          );

          if (hasPage) {
            return (
              <div key={coin.id} style={tileStyle}>
                <Link
                  href={cryptoPagePath(coin.id)}
                  role="link"
                  aria-label={cellLabel}
                  style={innerStyle}
                  className="hover:scale-[1.02] focus-visible:ring-2 focus-visible:ring-primary"
                  {...sharedHandlers}
                >
                  {inner}
                </Link>
              </div>
            );
          }

          return (
            <div key={coin.id} style={tileStyle}>
              <div
                role="img"
                tabIndex={0}
                aria-label={cellLabel}
                style={innerStyle}
                {...sharedHandlers}
              >
                {inner}
              </div>
            </div>
          );
        })}
      </div>

      {/* 06/10/2026 — sources réellement servies (champ `sources`), plus de « CoinGecko » en dur. */}
      <DataSourceLine
        items={coins}
        className="mt-3 text-[11px] text-muted"
        prefix="Prix en direct : flux Binance spot dans votre navigateur ; au chargement :"
        suffix={<>{" "}· Couleur interpolée selon la variation {periodLabel}. Cliquez sur une crypto pour ouvrir sa fiche.</>}
      />
    </div>
  );
}

/* ─────────────────────── Tooltip ─────────────────────── */

function CellTooltip({
  coin,
  change,
  price,
  period,
}: {
  coin: MarketCoin;
  change: number | null;
  price: number;
  period: Period;
}) {
  return (
    <div
      role="tooltip"
      style={{
        position: "absolute",
        left: "50%",
        bottom: "calc(100% + 6px)",
        transform: "translateX(-50%)",
        zIndex: 50,
        whiteSpace: "nowrap",
        background: "rgba(15,18,24,0.96)",
        border: "1px solid rgb(var(--c-fg-max) / 0.1)",
        borderRadius: 8,
        padding: "8px 10px",
        boxShadow: "0 10px 30px rgb(var(--c-scrim) / 0.4)",
        pointerEvents: "none",
        textAlign: "left",
      }}
    >
      <div style={{ fontSize: 12, fontWeight: 700, color: "rgb(var(--c-fg-max))" }}>
        {coin.name}{" "}
        <span style={{ color: "rgb(var(--c-fg-4))", fontFamily: "ui-monospace" }}>
          {coin.symbol}
        </span>
      </div>
      <div
        style={{
          marginTop: 2,
          fontSize: 11,
          color: "#cbd5e1",
          fontFamily: "ui-monospace",
        }}
      >
        {formatUsd(price)}
      </div>
      {change !== null && (
        <div
          style={{
            marginTop: 2,
            fontSize: 11,
            fontWeight: 700,
            fontFamily: "ui-monospace",
            color: change >= 0 ? "#34d399" : "#f87171",
          }}
        >
          {period === "7d" ? "7 j" : period} {formatPct(change)}
        </div>
      )}
    </div>
  );
}

/* ─────────────────────── Status badge ─────────────────────── */

function LiveStatusBadge({
  status,
  lastUpdate,
}: {
  status: ReturnType<typeof useLivePrices>["status"];
  lastUpdate: Date | null;
}) {
  // AUDIT 2026-06-11 — depuis la désactivation du SSE (incident quota
  // Vercel mai 2026), "fallback" (poll REST 30 s) est l'état NORMAL de
  // fonctionnement : les prix se mettent bien à jour. Un badge orange
  // "FALLBACK" permanent faisait croire à une panne. On l'affiche comme
  // du direct (ce que c'est, à 30 s près).
  const label =
    status === "live" || status === "fallback"
      ? "EN DIRECT"
      : status === "connecting"
      ? "CONNEXION…"
      : "HORS LIGNE";
  const color =
    status === "live" || status === "fallback"
      ? "#34d399"
      : status === "connecting"
      ? "rgb(var(--c-fg-4))"
      : "#f87171";

  return (
    <span
      aria-live="polite"
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: "0.04em",
        color,
      }}
    >
      <span
        style={{
          width: 8,
          height: 8,
          borderRadius: "50%",
          background: color,
          boxShadow:
            status === "live" ? `0 0 8px ${color}` : undefined,
          animation:
            status === "live" ? "pulse-live 1.4s ease-in-out infinite" : undefined,
        }}
      />
      {label}
      {lastUpdate && status === "live" && (
        <span
          style={{
            color: "rgb(var(--c-fg-4))",
            fontWeight: 500,
            marginLeft: 4,
          }}
        >
          · {lastUpdate.toLocaleTimeString("fr-FR", {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
          })}
        </span>
      )}
      <style>{`
        @keyframes pulse-live {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.45; }
        }
      `}</style>
    </span>
  );
}
