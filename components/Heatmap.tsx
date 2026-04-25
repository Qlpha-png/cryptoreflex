"use client";

import { useMemo, useState, useCallback, useId } from "react";
import Link from "next/link";
import {
  formatCompactUsd,
  formatPct,
  formatUsd,
  type MarketCoin,
} from "@/lib/coingecko";

/**
 * Heatmap — top 100 cryptos colorées selon variation 24h.
 *
 * Architecture :
 *  - Composant Client : tout l'interactif (filtres top 50/100, période,
 *    tooltip, navigation clavier) vit ici.
 *  - Reçoit `coins` + `internalSlugs` du Server (zéro fetch côté client).
 *  - Layout : grid CSS responsive (3 / 5 / 10 cols selon breakpoint).
 *    L'aire des cellules reste uniforme (V1) : on encode l'importance
 *    via le rang (ordre de placement) et la couleur via la variation.
 *
 * Couleurs :
 *  >= +5 %  → bg-emerald-500
 *  >= +2 %  → bg-emerald-500/70
 *  >=  0 %  → bg-emerald-500/30
 *  >= -2 %  → bg-rose-500/30
 *  >= -5 %  → bg-rose-500/70
 *  <  -5 %  → bg-rose-500
 *
 * Accessibilité :
 *  - role="grid" + aria-label sur le conteneur
 *  - chaque cellule role="gridcell" + tabIndex=0 + focus:ring visible
 *  - Enter ou Space sur cellule cliquable navigue vers /cryptos/[slug]
 */

type Period = "1h" | "24h" | "7d";
type TopFilter = 50 | 100;

interface Props {
  coins: MarketCoin[];
  /** Slugs des cryptos qui ont une fiche éditoriale dans `lib/cryptos.ts`. */
  internalSlugs: string[];
}

function changeForPeriod(coin: MarketCoin, period: Period): number | null {
  switch (period) {
    case "1h":
      return coin.priceChange1h;
    case "7d":
      return coin.priceChange7d;
    case "24h":
    default:
      return coin.priceChange24h ?? null;
  }
}

/** Renvoie la classe Tailwind de fond selon la variation %. */
function colorForChange(value: number | null): string {
  if (value === null || Number.isNaN(value)) return "bg-elevated";
  if (value >= 5) return "bg-emerald-500";
  if (value >= 2) return "bg-emerald-500/70";
  if (value >= 0) return "bg-emerald-500/30";
  if (value >= -2) return "bg-rose-500/30";
  if (value >= -5) return "bg-rose-500/70";
  return "bg-rose-500";
}

/** Texte clair/foncé selon l'intensité du fond pour rester lisible. */
function textForChange(value: number | null): string {
  if (value === null || Number.isNaN(value)) return "text-fg/85";
  if (value >= 5 || value < -5) return "text-white";
  if (value >= 2 || value < -2) return "text-white";
  return "text-fg";
}

export default function Heatmap({ coins, internalSlugs }: Props) {
  const [topFilter, setTopFilter] = useState<TopFilter>(100);
  const [period, setPeriod] = useState<Period>("24h");
  const [hovered, setHovered] = useState<string | null>(null);
  const slugSet = useMemo(() => new Set(internalSlugs), [internalSlugs]);
  const tooltipId = useId();

  // Vérifie si la donnée existe pour la période sélectionnée
  // (1h et 7d peuvent être null selon l'API CoinGecko).
  const hasPeriodData = useCallback(
    (p: Period) => coins.some((c) => changeForPeriod(c, p) !== null),
    [coins]
  );

  const visible = useMemo(() => coins.slice(0, topFilter), [coins, topFilter]);

  return (
    <div>
      {/* CONTROLS — filtres top + période */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <div
          role="radiogroup"
          aria-label="Nombre de cryptos affichées"
          className="inline-flex rounded-lg border border-border bg-surface p-1"
        >
          {([50, 100] as TopFilter[]).map((n) => {
            const active = topFilter === n;
            return (
              <button
                key={n}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => setTopFilter(n)}
                className={[
                  "px-3 py-1.5 text-xs font-semibold rounded-md transition-colors",
                  "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                  active
                    ? "bg-primary text-background"
                    : "text-muted hover:text-fg",
                ].join(" ")}
              >
                Top {n}
              </button>
            );
          })}
        </div>

        <div
          role="radiogroup"
          aria-label="Période de variation affichée"
          className="inline-flex rounded-lg border border-border bg-surface p-1"
        >
          {(["1h", "24h", "7d"] as Period[]).map((p) => {
            const active = period === p;
            const enabled = hasPeriodData(p);
            return (
              <button
                key={p}
                type="button"
                role="radio"
                aria-checked={active}
                disabled={!enabled}
                onClick={() => enabled && setPeriod(p)}
                className={[
                  "px-3 py-1.5 text-xs font-semibold rounded-md transition-colors",
                  "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                  active
                    ? "bg-primary text-background"
                    : enabled
                    ? "text-muted hover:text-fg"
                    : "text-muted/40 cursor-not-allowed",
                ].join(" ")}
                title={enabled ? undefined : "Donnée indisponible"}
              >
                {p === "7d" ? "7 j" : p}
              </button>
            );
          })}
        </div>

        <p className="text-xs text-muted ml-auto">
          {visible.length} cryptos · couleurs basées sur la variation {period === "7d" ? "7 j" : period}
        </p>
      </div>

      {/* LEGEND — barre couleurs */}
      <div className="mb-5 flex items-center gap-2 text-[11px] text-muted">
        <span>-5 %+</span>
        <div
          aria-hidden="true"
          className="flex-1 max-w-md h-2 rounded-full overflow-hidden flex"
        >
          <span className="flex-1 bg-rose-500" />
          <span className="flex-1 bg-rose-500/70" />
          <span className="flex-1 bg-rose-500/30" />
          <span className="flex-1 bg-emerald-500/30" />
          <span className="flex-1 bg-emerald-500/70" />
          <span className="flex-1 bg-emerald-500" />
        </div>
        <span>+5 %+</span>
      </div>

      {/* GRID — heatmap */}
      <div
        role="grid"
        aria-label={`Heatmap top ${topFilter} cryptos par capitalisation, couleurs selon variation ${period}`}
        aria-describedby={hovered ? tooltipId : undefined}
        className="grid gap-1.5 grid-cols-3 sm:grid-cols-5 lg:grid-cols-10"
      >
        {visible.map((coin) => {
          const change = changeForPeriod(coin, period);
          const bg = colorForChange(change);
          const txt = textForChange(change);
          const hasPage = slugSet.has(coin.id);
          const cellLabel = `${coin.name} (${coin.symbol}), ${
            change === null
              ? "variation indisponible"
              : `variation ${period} ${formatPct(change)}`
          }, prix ${formatUsd(coin.currentPrice)}, capitalisation ${formatCompactUsd(
            coin.marketCap
          )}`;

          const innerContent = (
            <div className="flex h-full w-full flex-col items-center justify-center p-1.5 text-center">
              <span
                className={`font-mono text-[11px] sm:text-xs font-bold uppercase truncate max-w-full ${txt}`}
              >
                {coin.symbol}
              </span>
              <span
                className={`mt-0.5 font-mono text-[10px] sm:text-[11px] tabular-nums ${txt}`}
              >
                {change === null ? "—" : formatPct(change)}
              </span>
            </div>
          );

          const baseClass = [
            "relative aspect-square min-h-[64px] rounded-md select-none",
            "transition-transform duration-fast",
            "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background",
            "hover:scale-[1.04] hover:z-10 hover:shadow-e3",
            bg,
            hasPage ? "cursor-pointer" : "cursor-default",
          ].join(" ");

          // Wrapper commun pour gérer hover/focus tooltip (sans dupliquer le code).
          const sharedHandlers = {
            onMouseEnter: () => setHovered(coin.id),
            onMouseLeave: () =>
              setHovered((cur) => (cur === coin.id ? null : cur)),
            onFocus: () => setHovered(coin.id),
            onBlur: () =>
              setHovered((cur) => (cur === coin.id ? null : cur)),
          };

          if (hasPage) {
            return (
              <Link
                key={coin.id}
                href={`/cryptos/${coin.id}`}
                role="gridcell"
                aria-label={cellLabel}
                className={baseClass}
                {...sharedHandlers}
              >
                {innerContent}
                {hovered === coin.id && (
                  <CellTooltip coin={coin} change={change} period={period} />
                )}
              </Link>
            );
          }

          return (
            <div
              key={coin.id}
              role="gridcell"
              tabIndex={0}
              aria-label={cellLabel}
              className={baseClass}
              {...sharedHandlers}
            >
              {innerContent}
              {hovered === coin.id && (
                <CellTooltip coin={coin} change={change} period={period} />
              )}
            </div>
          );
        })}
      </div>

      {/* Tooltip live region (a11y) — recopie du tooltip visuel pour lecteurs d'écran */}
      <div id={tooltipId} className="sr-only" aria-live="polite">
        {hovered &&
          (() => {
            const c = visible.find((x) => x.id === hovered);
            if (!c) return null;
            const ch = changeForPeriod(c, period);
            return `${c.name} : ${formatUsd(c.currentPrice)}, variation ${
              period === "7d" ? "7 jours" : period
            } ${ch === null ? "indisponible" : formatPct(ch)}, market cap ${formatCompactUsd(
              c.marketCap
            )}`;
          })()}
      </div>

      <p className="mt-6 text-[11px] text-muted">
        Données :{" "}
        <a
          href="https://www.coingecko.com"
          rel="noopener noreferrer"
          className="hover:text-fg underline"
        >
          CoinGecko
        </a>{" "}
        · Mis à jour toutes les 2 min · Couleurs : vert = hausse, rouge = baisse
        sur la période sélectionnée.
      </p>
    </div>
  );
}

/* ───────────────────────── TOOLTIP ───────────────────────── */
function CellTooltip({
  coin,
  change,
  period,
}: {
  coin: MarketCoin;
  change: number | null;
  period: Period;
}) {
  return (
    <div
      role="tooltip"
      className="pointer-events-none absolute left-1/2 top-full z-20 mt-2 -translate-x-1/2
                 whitespace-nowrap rounded-lg border border-border bg-background/95 px-3 py-2
                 text-left shadow-e4 backdrop-blur-md"
    >
      <div className="text-xs font-semibold text-fg">
        {coin.name}{" "}
        <span className="text-muted font-mono">{coin.symbol}</span>
      </div>
      <div className="mt-0.5 font-mono text-[11px] text-muted tabular-nums">
        {formatUsd(coin.currentPrice)}
      </div>
      <div className="mt-0.5 font-mono text-[11px] text-muted tabular-nums">
        MCap {formatCompactUsd(coin.marketCap)}
      </div>
      {change !== null && (
        <div
          className={`mt-0.5 font-mono text-[11px] font-semibold tabular-nums ${
            change >= 0 ? "text-accent-green" : "text-accent-rose"
          }`}
        >
          {period === "7d" ? "7 j" : period} {formatPct(change)}
        </div>
      )}
    </div>
  );
}
