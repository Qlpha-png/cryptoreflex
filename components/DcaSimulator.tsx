"use client";

import { useEffect, useMemo, useState } from "react";
import { TrendingUp, TrendingDown, Calendar, Coins, Loader2 } from "lucide-react";
import type { HistoricalPoint } from "@/lib/historical-prices";

/* -------------------------------------------------------------------------- */
/*  Types & constantes                                                        */
/* -------------------------------------------------------------------------- */

type CoinChoice = "bitcoin" | "ethereum" | "solana";

const COIN_OPTIONS: { id: CoinChoice; label: string; symbol: string }[] = [
  { id: "bitcoin", label: "Bitcoin", symbol: "BTC" },
  { id: "ethereum", label: "Ethereum", symbol: "ETH" },
  { id: "solana", label: "Solana", symbol: "SOL" },
];

const DURATION_OPTIONS = [
  { months: 12, label: "1 an" },
  { months: 24, label: "2 ans" },
  { months: 36, label: "3 ans" },
  { months: 60, label: "5 ans" },
];

/* -------------------------------------------------------------------------- */
/*  Composant                                                                 */
/* -------------------------------------------------------------------------- */

interface SimulationResult {
  totalInvested: number;
  finalValue: number;
  roi: number;
  totalUnits: number;
  avgBuyPrice: number;
  finalSpotPrice: number;
  /** série mensuelle pour le graphique */
  series: { month: number; invested: number; portfolio: number; lumpSum: number }[];
  /** comparatif "achat unique au mois 0" */
  lumpSumFinalValue: number;
  lumpSumRoi: number;
}

export default function DcaSimulator() {
  const [monthly, setMonthly] = useState(200);
  const [coin, setCoin] = useState<CoinChoice>("bitcoin");
  const [months, setMonths] = useState(36);

  const [history, setHistory] = useState<HistoricalPoint[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Charge l'historique 5 ans (couvre toutes les durées max).
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetch(`/api/historical?coin=${coin}&days=1825`)
      .then((r) => {
        if (!r.ok) throw new Error("Données indisponibles");
        return r.json();
      })
      .then((data: { points: HistoricalPoint[] }) => {
        if (!cancelled) setHistory(data.points);
      })
      .catch((e) => {
        if (!cancelled) setError(e.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [coin]);

  const result = useMemo<SimulationResult | null>(() => {
    if (!history || history.length < 30 || monthly <= 0 || months <= 0) return null;

    // On prend les `months` derniers achats mensuels (1 par mois, jour le plus récent disponible).
    const sorted = [...history].sort((a, b) => a.t - b.t);
    const last = sorted[sorted.length - 1];

    // Construit `months` points d'achat espacés ~30 j en remontant depuis la fin.
    const buyDates: HistoricalPoint[] = [];
    const dayMs = 86_400_000;
    for (let i = months - 1; i >= 0; i--) {
      const targetT = last.t - i * 30 * dayMs;
      // trouve le point le plus proche
      let closest = sorted[0];
      let bestDelta = Math.abs(sorted[0].t - targetT);
      for (const p of sorted) {
        const d = Math.abs(p.t - targetT);
        if (d < bestDelta) {
          bestDelta = d;
          closest = p;
        }
      }
      buyDates.push(closest);
    }

    const finalSpotPrice = last.price;

    // DCA : on achète `monthly` € à chaque date.
    let totalUnits = 0;
    let totalInvested = 0;
    const series: SimulationResult["series"] = [];
    buyDates.forEach((point, idx) => {
      const units = monthly / point.price;
      totalUnits += units;
      totalInvested += monthly;
      series.push({
        month: idx + 1,
        invested: totalInvested,
        portfolio: totalUnits * point.price,
        lumpSum: 0, // calculé après
      });
    });

    const finalValue = totalUnits * finalSpotPrice;
    const roi = ((finalValue - totalInvested) / totalInvested) * 100;
    const avgBuyPrice = totalInvested / totalUnits;

    // Comparatif lump sum : on aurait investi `monthly * months` au mois 0.
    const lumpSumInvest = monthly * months;
    const initialPrice = buyDates[0].price;
    const lumpSumUnits = lumpSumInvest / initialPrice;
    const lumpSumFinalValue = lumpSumUnits * finalSpotPrice;
    const lumpSumRoi = ((lumpSumFinalValue - lumpSumInvest) / lumpSumInvest) * 100;

    // Re-fill lumpSum series (valeur du portefeuille lump sum au fil du temps)
    series.forEach((row, idx) => {
      row.lumpSum = lumpSumUnits * buyDates[idx].price;
    });

    return {
      totalInvested,
      finalValue,
      roi,
      totalUnits,
      avgBuyPrice,
      finalSpotPrice,
      series,
      lumpSumFinalValue,
      lumpSumRoi,
    };
  }, [history, monthly, months]);

  const positive = (result?.roi ?? 0) >= 0;
  const symbol = COIN_OPTIONS.find((c) => c.id === coin)?.symbol ?? "BTC";

  return (
    <div id="simulateur" className="glass glow-border rounded-2xl p-6 sm:p-8">
      <div className="flex items-center gap-3 mb-6">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-accent-cyan">
          <TrendingUp className="h-5 w-5 text-white" />
        </div>
        <div>
          <h2 className="font-bold text-xl text-white">Simulateur DCA</h2>
          <p className="text-sm text-muted">
            Backtest réel sur les prix CoinGecko des 5 dernières années
          </p>
        </div>
      </div>

      <div className="grid lg:grid-cols-[320px_1fr] gap-6">
        {/* Inputs */}
        <div className="space-y-5">
          <Field
            label="Montant mensuel (€)"
            value={monthly}
            onChange={setMonthly}
            step={50}
            icon={<Coins className="h-4 w-4" />}
          />

          <div>
            <span className="text-xs font-medium text-muted uppercase tracking-wide">
              Crypto
            </span>
            <div className="mt-2 grid grid-cols-3 gap-2">
              {COIN_OPTIONS.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setCoin(opt.id)}
                  className={`rounded-lg border px-3 py-2 text-sm font-semibold transition-colors ${
                    coin === opt.id
                      ? "border-primary bg-primary/10 text-primary-soft"
                      : "border-border bg-background text-white/70 hover:border-primary/50"
                  }`}
                >
                  {opt.symbol}
                </button>
              ))}
            </div>
          </div>

          <div>
            <span className="text-xs font-medium text-muted uppercase tracking-wide">
              <Calendar className="inline h-3.5 w-3.5 mr-1" />
              Durée
            </span>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {DURATION_OPTIONS.map((opt) => (
                <button
                  key={opt.months}
                  type="button"
                  onClick={() => setMonths(opt.months)}
                  className={`rounded-lg border px-3 py-2 text-sm font-semibold transition-colors ${
                    months === opt.months
                      ? "border-primary bg-primary/10 text-primary-soft"
                      : "border-border bg-background text-white/70 hover:border-primary/50"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-lg border border-border bg-background/50 p-3 text-xs text-muted">
            <p>
              <strong className="text-white/80">Hypothèse :</strong> 1 achat le 1er
              du mois, frais ignorés (typiquement 0,5-1 % chez Bitstack/Coinbase).
            </p>
          </div>
        </div>

        {/* Résultats + chart */}
        <div className="space-y-5">
          {loading && (
            <div className="flex h-64 items-center justify-center rounded-xl border border-border bg-elevated/40">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <span className="ml-3 text-sm text-muted">
                Chargement de l'historique {symbol}…
              </span>
            </div>
          )}

          {error && !loading && (
            <div className="rounded-xl border border-accent-rose/40 bg-accent-rose/10 p-4 text-sm text-accent-rose">
              Impossible de charger les prix historiques. Réessaie dans un instant.
            </div>
          )}

          {result && !loading && (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <Stat
                  label="Total investi"
                  value={fmtEur(result.totalInvested)}
                  tone="neutral"
                />
                <Stat
                  label="Valeur finale"
                  value={fmtEur(result.finalValue)}
                  tone={positive ? "positive" : "negative"}
                />
                <Stat
                  label="ROI DCA"
                  value={`${positive ? "+" : ""}${result.roi.toFixed(1)}%`}
                  tone={positive ? "positive" : "negative"}
                  icon={
                    positive ? (
                      <TrendingUp className="h-4 w-4" />
                    ) : (
                      <TrendingDown className="h-4 w-4" />
                    )
                  }
                />
                <Stat
                  label="Prix moyen achat"
                  value={fmtEur(result.avgBuyPrice)}
                  tone="neutral"
                />
              </div>

              <Chart series={result.series} symbol={symbol} />

              <div className="rounded-xl border border-border bg-background/50 p-4">
                <h4 className="font-semibold text-white text-sm mb-3">
                  DCA vs Achat unique (lump sum)
                </h4>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <div className="text-xs text-muted">DCA progressif</div>
                    <div className="font-mono text-white">
                      {fmtEur(result.finalValue)}
                    </div>
                    <div
                      className={`text-xs font-semibold ${
                        result.roi >= 0 ? "text-accent-green" : "text-accent-rose"
                      }`}
                    >
                      {result.roi >= 0 ? "+" : ""}
                      {result.roi.toFixed(1)} %
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-muted">
                      Achat unique au mois 1
                    </div>
                    <div className="font-mono text-white">
                      {fmtEur(result.lumpSumFinalValue)}
                    </div>
                    <div
                      className={`text-xs font-semibold ${
                        result.lumpSumRoi >= 0
                          ? "text-accent-green"
                          : "text-accent-rose"
                      }`}
                    >
                      {result.lumpSumRoi >= 0 ? "+" : ""}
                      {result.lumpSumRoi.toFixed(1)} %
                    </div>
                  </div>
                </div>
                <p className="mt-3 text-xs text-muted">
                  {result.lumpSumRoi > result.roi
                    ? "Sur cette période, l'achat unique aurait été plus performant — mais aussi plus risqué (timing)."
                    : "Sur cette période, le DCA a lissé la volatilité et battu l'achat unique."}
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Sous-composants                                                           */
/* -------------------------------------------------------------------------- */

function Field({
  label,
  value,
  onChange,
  step,
  icon,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  step: number;
  icon?: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="text-xs font-medium text-muted uppercase tracking-wide">
        {icon && <span className="inline-block mr-1">{icon}</span>}
        {label}
      </span>
      <input
        type="number"
        value={value}
        step={step}
        min={0}
        onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
        className="mt-1 w-full rounded-lg bg-background border border-border px-3 py-2.5 font-mono text-white
                   focus:border-primary/60 focus:outline-none focus:ring-2 focus:ring-primary/20"
      />
    </label>
  );
}

function Stat({
  label,
  value,
  tone,
  icon,
}: {
  label: string;
  value: string;
  tone: "positive" | "negative" | "neutral";
  icon?: React.ReactNode;
}) {
  const color =
    tone === "positive"
      ? "text-accent-green"
      : tone === "negative"
      ? "text-accent-rose"
      : "text-white";
  return (
    <div className="rounded-xl border border-border bg-elevated/40 p-3">
      <div className="text-[10px] font-semibold text-muted uppercase tracking-wide">
        {label}
      </div>
      <div className={`mt-1 inline-flex items-center gap-1 font-mono font-bold ${color}`}>
        {icon}
        <span className="text-base sm:text-lg">{value}</span>
      </div>
    </div>
  );
}

/**
 * Chart SVG natif — 2 lignes (DCA portefeuille vs Lump sum portefeuille) + zone investi.
 * Pas de dépendance ; ResizeObserver pour responsive.
 */
function Chart({
  series,
  symbol,
}: {
  series: SimulationResult["series"];
  symbol: string;
}) {
  if (series.length === 0) return null;

  const width = 600;
  const height = 240;
  const padding = { top: 12, right: 16, bottom: 24, left: 56 };

  const allValues = series.flatMap((s) => [s.invested, s.portfolio, s.lumpSum]);
  const maxY = Math.max(...allValues) * 1.1;
  const minY = 0;

  const xScale = (i: number) =>
    padding.left + (i / Math.max(series.length - 1, 1)) * (width - padding.left - padding.right);
  const yScale = (v: number) =>
    height -
    padding.bottom -
    ((v - minY) / (maxY - minY)) * (height - padding.top - padding.bottom);

  const buildPath = (key: "invested" | "portfolio" | "lumpSum") =>
    series
      .map((s, i) => `${i === 0 ? "M" : "L"} ${xScale(i).toFixed(1)} ${yScale(s[key]).toFixed(1)}`)
      .join(" ");

  const yTicks = 4;
  const ticks = Array.from({ length: yTicks + 1 }, (_, i) => (maxY * i) / yTicks);

  return (
    <div className="rounded-xl border border-border bg-background/50 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <h4 className="font-semibold text-white text-sm">
          Évolution sur {series.length} mois — {symbol}
        </h4>
        <div className="flex flex-wrap gap-3 text-xs">
          <Legend color="#F5A524" label="DCA" />
          <Legend color="#0E7490" label="Achat unique" />
          <Legend color="#6B7280" label="Investi" dashed />
        </div>
      </div>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-auto"
        role="img"
        aria-label="Graphique d'évolution DCA vs achat unique"
      >
        {/* Grid + Y labels */}
        {ticks.map((v, i) => {
          const y = yScale(v);
          return (
            <g key={i}>
              <line
                x1={padding.left}
                x2={width - padding.right}
                y1={y}
                y2={y}
                stroke="#262B33"
                strokeDasharray="2 4"
              />
              <text x={padding.left - 8} y={y + 4} textAnchor="end" fontSize="10" fill="#9BA3AF">
                {compactEur(v)}
              </text>
            </g>
          );
        })}

        {/* Investi (référence) */}
        <path
          d={buildPath("invested")}
          fill="none"
          stroke="#6B7280"
          strokeWidth={1.5}
          strokeDasharray="4 4"
        />
        {/* Lump sum */}
        <path d={buildPath("lumpSum")} fill="none" stroke="#0E7490" strokeWidth={2} />
        {/* DCA */}
        <path d={buildPath("portfolio")} fill="none" stroke="#F5A524" strokeWidth={2.5} />

        {/* X axis labels (1er, milieu, dernier) */}
        {[0, Math.floor(series.length / 2), series.length - 1].map((i) => (
          <text
            key={i}
            x={xScale(i)}
            y={height - padding.bottom + 14}
            textAnchor="middle"
            fontSize="10"
            fill="#9BA3AF"
          >
            M{series[i].month}
          </text>
        ))}
      </svg>
    </div>
  );
}

function Legend({ color, label, dashed }: { color: string; label: string; dashed?: boolean }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-muted">
      <svg width="16" height="2">
        <line
          x1="0"
          y1="1"
          x2="16"
          y2="1"
          stroke={color}
          strokeWidth="2"
          strokeDasharray={dashed ? "3 3" : undefined}
        />
      </svg>
      {label}
    </span>
  );
}

/* -------------------------------------------------------------------------- */
/*  Helpers format                                                            */
/* -------------------------------------------------------------------------- */

function fmtEur(v: number): string {
  return v.toLocaleString("fr-FR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  });
}

function compactEur(v: number): string {
  if (v === 0) return "0 €";
  return new Intl.NumberFormat("fr-FR", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(v) + " €";
}
