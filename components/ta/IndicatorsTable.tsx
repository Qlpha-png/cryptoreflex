/**
 * <IndicatorsTable /> — tableau visuel des indicateurs techniques.
 *
 * Affiche une vue "dashboard" colorée des principaux indicateurs (RSI, MA50,
 * MA200, MACD, Bollinger). Coloration sémantique :
 *  - vert  = haussier
 *  - rouge = baissier
 *  - ambre = neutre / indécis
 *
 * Server Component pur — calculs déjà passés en props (pas de fetch côté UI).
 */

import { Activity, ArrowDown, ArrowUp, Minus } from "lucide-react";
import type { Indicators } from "@/lib/ta-types";

interface Props {
  /** Indicateurs déjà calculés par lib/technical-analysis.ts. */
  indicators: Indicators;
  /** Prix actuel — sert à colorer "au-dessus / sous" les MA. */
  currentPrice: number;
}

/* -------------------------------------------------------------------------- */
/*  Helpers internes                                                          */
/* -------------------------------------------------------------------------- */

function formatPrice(value: number): string {
  if (!Number.isFinite(value) || value === 0) return "—";
  if (value >= 1000) return value.toLocaleString("en-US", { maximumFractionDigits: 0 });
  if (value >= 1) return value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return value.toLocaleString("en-US", { minimumFractionDigits: 4, maximumFractionDigits: 4 });
}

function rsiTone(rsi: number): "bullish" | "bearish" | "neutral" {
  if (rsi >= 60) return "bullish";
  if (rsi <= 40) return "bearish";
  return "neutral";
}

function toneClasses(tone: "bullish" | "bearish" | "neutral"): string {
  switch (tone) {
    case "bullish":
      return "text-emerald-300";
    case "bearish":
      return "text-rose-300";
    default:
      return "text-amber-300";
  }
}

function ToneIcon({ tone }: { tone: "bullish" | "bearish" | "neutral" }) {
  if (tone === "bullish") return <ArrowUp className="inline h-3.5 w-3.5" aria-hidden="true" />;
  if (tone === "bearish") return <ArrowDown className="inline h-3.5 w-3.5" aria-hidden="true" />;
  return <Minus className="inline h-3.5 w-3.5" aria-hidden="true" />;
}

/* -------------------------------------------------------------------------- */
/*  Composant                                                                 */
/* -------------------------------------------------------------------------- */

export default function IndicatorsTable({ indicators, currentPrice }: Props) {
  const rsi = indicators.rsi;
  const rsiBucketLabel =
    rsi >= 70 ? "Surachat" : rsi >= 60 ? "Acheteur" : rsi >= 45 ? "Neutre" : rsi >= 30 ? "Vendeur" : "Survente";

  const ma50Tone = currentPrice > indicators.ma50 ? "bullish" : "bearish";
  const ma200Tone = currentPrice > indicators.ma200 ? "bullish" : "bearish";
  const macdTone =
    indicators.macd.histogram > 0 ? "bullish" : indicators.macd.histogram < 0 ? "bearish" : "neutral";

  // Position du prix dans la bande Bollinger : 0 = bas, 100 = haut.
  const bbRange = indicators.bollinger.upper - indicators.bollinger.lower;
  const bbPosition =
    bbRange > 0
      ? Math.max(0, Math.min(100, ((currentPrice - indicators.bollinger.lower) / bbRange) * 100))
      : 50;

  return (
    <section
      aria-label="Tableau des indicateurs techniques"
      className="rounded-2xl border border-border bg-surface p-5 sm:p-6"
    >
      <header className="flex items-center gap-2 mb-4">
        <Activity className="h-4 w-4 text-primary" aria-hidden="true" />
        <h2 className="text-base sm:text-lg font-bold tracking-tight">
          Indicateurs <span className="gradient-text">techniques</span>
        </h2>
      </header>

      {/* RSI : barre de progression visuelle */}
      <div className="mb-5">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs uppercase tracking-wide text-muted">RSI (14)</span>
          <span className={`text-sm font-mono font-bold ${toneClasses(rsiTone(rsi))}`}>
            {rsi.toFixed(1)} · {rsiBucketLabel}
          </span>
        </div>
        <div
          role="meter"
          aria-valuenow={rsi}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`RSI à ${rsi.toFixed(1)}`}
          className="relative h-2 rounded-full bg-elevated overflow-hidden"
        >
          {/* Zones : survente (0-30) / neutre (30-70) / surachat (70-100) */}
          <div className="absolute inset-y-0 left-0 w-[30%] bg-rose-500/20" />
          <div className="absolute inset-y-0 left-[70%] right-0 bg-emerald-500/20" />
          {/* Curseur */}
          <div
            className="absolute top-0 h-full w-1 rounded-full bg-primary shadow-[0_0_8px_rgba(245,165,36,0.8)]"
            style={{ left: `calc(${rsi}% - 2px)` }}
          />
        </div>
        <div className="flex justify-between text-[10px] text-muted mt-1">
          <span>0 (survente)</span>
          <span>50</span>
          <span>100 (surachat)</span>
        </div>
      </div>

      {/* Grille 2 colonnes des autres indicateurs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Cell label="MA 50" value={`${formatPrice(indicators.ma50)} $`} tone={ma50Tone} hint={ma50Tone === "bullish" ? "Prix au-dessus" : "Prix en-dessous"} />
        <Cell label="MA 200" value={`${formatPrice(indicators.ma200)} $`} tone={ma200Tone} hint={ma200Tone === "bullish" ? "Tendance LT haussière" : "Tendance LT baissière"} />
        <Cell label="EMA 12" value={`${formatPrice(indicators.ema12)} $`} tone="neutral" />
        <Cell label="EMA 26" value={`${formatPrice(indicators.ema26)} $`} tone="neutral" />
        <Cell
          label="MACD"
          value={indicators.macd.macd.toFixed(2)}
          tone={macdTone}
          hint={macdTone === "bullish" ? "Momentum haussier" : macdTone === "bearish" ? "Momentum baissier" : "Indécis"}
        />
        <Cell
          label="Histogramme"
          value={indicators.macd.histogram.toFixed(2)}
          tone={macdTone}
          hint={`Signal : ${indicators.macd.signal.toFixed(2)}`}
        />
      </div>

      {/* Bollinger : barre avec position du prix */}
      <div className="mt-5">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs uppercase tracking-wide text-muted">Bandes de Bollinger (20, 2σ)</span>
          <span className="text-xs font-mono text-muted">
            Position : {bbPosition.toFixed(0)}%
          </span>
        </div>
        <div className="relative h-2 rounded-full bg-gradient-to-r from-rose-500/20 via-amber-500/20 to-emerald-500/20 overflow-hidden">
          <div
            className="absolute top-0 h-full w-1 rounded-full bg-primary shadow-[0_0_8px_rgba(245,165,36,0.8)]"
            style={{ left: `calc(${bbPosition}% - 2px)` }}
          />
        </div>
        <div className="flex justify-between text-[10px] text-muted mt-1 font-mono">
          <span>Basse : {formatPrice(indicators.bollinger.lower)} $</span>
          <span>Médiane : {formatPrice(indicators.bollinger.middle)} $</span>
          <span>Haute : {formatPrice(indicators.bollinger.upper)} $</span>
        </div>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/*  Sous-composant cellule                                                     */
/* -------------------------------------------------------------------------- */

function Cell({
  label,
  value,
  tone,
  hint,
}: {
  label: string;
  value: string;
  tone: "bullish" | "bearish" | "neutral";
  hint?: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-elevated/40 p-3">
      <div className="text-[11px] uppercase tracking-wide text-muted">{label}</div>
      <div className={`mt-1 font-mono text-base font-bold ${toneClasses(tone)}`}>
        <ToneIcon tone={tone} /> {value}
      </div>
      {hint && <div className="text-[11px] text-muted mt-0.5">{hint}</div>}
    </div>
  );
}
