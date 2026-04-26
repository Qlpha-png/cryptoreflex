"use client";

import { useEffect, useMemo, useState } from "react";
import { Calendar, TrendingUp, ArrowRight, Info } from "lucide-react";
import {
  buildHalvingProjection,
  daysToNextHalving,
  SCENARIOS,
  type Scenario,
} from "@/lib/bitcoin-halving-cycles";
import { getPlatformById } from "@/lib/platforms";
import AffiliateLink from "@/components/AffiliateLink";
import { track } from "@/lib/analytics";

const FREQUENCIES = [
  { id: "monthly" as const, label: "Mensuel" },
  { id: "weekly" as const, label: "Hebdo" },
];

const today = () => new Date().toISOString().slice(0, 10);

function formatEur(v: number): string {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(v);
}

function compactEur(v: number): string {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)} M€`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(0)} k€`;
  return `${v.toFixed(0)} €`;
}

interface ChartPoint {
  label: string;
  invested: number;
  conservateur: number;
  moyen: number;
  bullish: number;
}

export default function SimulateurHalvingBitcoin() {
  const [amountEur, setAmountEur] = useState<number>(100);
  const [frequency, setFrequency] = useState<"monthly" | "weekly">("monthly");
  const [startDate, setStartDate] = useState<string>(today());
  const [hasRun, setHasRun] = useState(false);

  const projections = useMemo(() => {
    const scenarios: Scenario[] = ["conservative", "moderate", "bullish"];
    return scenarios.map((s) => ({
      scenario: s,
      points: buildHalvingProjection(amountEur, s, startDate, frequency),
    }));
  }, [amountEur, frequency, startDate]);

  const chartData: ChartPoint[] = useMemo(() => {
    const moderate = projections.find((p) => p.scenario === "moderate")?.points ?? [];
    return moderate.map((pt, idx) => ({
      label: pt.label,
      conservateur: projections[0]?.points[idx]?.portfolioValueEur ?? 0,
      moyen: projections[1]?.points[idx]?.portfolioValueEur ?? 0,
      bullish: projections[2]?.points[idx]?.portfolioValueEur ?? 0,
      invested: pt.invested,
    }));
  }, [projections]);

  useEffect(() => {
    if (!hasRun || chartData.length === 0) return;
    track("halving-simulation-completed", {
      amount: amountEur,
      frequency,
      cycles: chartData.length,
    });
  }, [hasRun, chartData, amountEur, frequency]);

  const bitstack = getPlatformById("bitstack");
  const daysLeft = daysToNextHalving();

  const lastModerate = projections[1]?.points.at(-1);
  const lastBullish = projections[2]?.points.at(-1);
  const lastConservative = projections[0]?.points.at(-1);

  return (
    <div className="space-y-8">
      {/* Compteur jusqu'au prochain halving */}
      <div className="glass rounded-2xl p-4 sm:p-6 flex items-center gap-4">
        <Calendar className="h-6 w-6 text-primary-soft" />
        <div className="flex-1">
          <p className="text-xs uppercase tracking-wide text-white/60">Prochain halving</p>
          <p className="text-white font-bold">
            Avril 2028 — dans <span className="text-primary-soft">{daysLeft} jours</span>
          </p>
        </div>
      </div>

      {/* Inputs */}
      <div className="glass rounded-2xl p-6 sm:p-8">
        <div className="grid gap-6 sm:grid-cols-3">
          <div>
            <label htmlFor="halving-amount" className="block text-xs font-semibold uppercase tracking-wide text-white/60">
              Montant DCA (EUR)
            </label>
            <input
              id="halving-amount"
              type="number"
              min={1}
              step={10}
              value={amountEur}
              onChange={(e) => {
                setAmountEur(Number(e.target.value) || 0);
                setHasRun(true);
              }}
              className="mt-2 w-full rounded-xl border border-border bg-elevated px-3 py-2 text-white"
              placeholder="100"
            />
            <p className="mt-1 text-[11px] text-white/50">
              {frequency === "monthly" ? "par mois" : "par semaine"}
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-white/60">
              Fréquence
            </label>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {FREQUENCIES.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => {
                    setFrequency(f.id);
                    setHasRun(true);
                  }}
                  className={`rounded-xl border px-3 py-2 text-sm font-semibold ${
                    frequency === f.id
                      ? "border-primary bg-primary/15 text-primary-soft"
                      : "border-border bg-elevated text-white/70 hover:border-primary/40"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label htmlFor="halving-start" className="block text-xs font-semibold uppercase tracking-wide text-white/60">
              Date de début
            </label>
            <input
              id="halving-start"
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setHasRun(true);
              }}
              className="mt-2 w-full rounded-xl border border-border bg-elevated px-3 py-2 text-white"
            />
          </div>
        </div>
      </div>

      {/* Graphique SVG natif */}
      {chartData.length > 0 && <HalvingChart data={chartData} />}

      {/* Cartes scénarios */}
      {lastModerate && lastBullish && lastConservative && (
        <div className="grid gap-4 lg:grid-cols-3">
          <ScenarioCard
            title={SCENARIOS.conservative.label}
            description={SCENARIOS.conservative.description}
            invested={lastConservative.invested}
            value={lastConservative.portfolioValueEur}
            color="border-blue-500/40 bg-blue-500/5"
          />
          <ScenarioCard
            title={SCENARIOS.moderate.label}
            description={SCENARIOS.moderate.description}
            invested={lastModerate.invested}
            value={lastModerate.portfolioValueEur}
            color="border-primary/40 bg-primary/5"
            highlight
          />
          <ScenarioCard
            title={SCENARIOS.bullish.label}
            description={SCENARIOS.bullish.description}
            invested={lastBullish.invested}
            value={lastBullish.portfolioValueEur}
            color="border-accent-green/40 bg-accent-green/5"
          />
        </div>
      )}

      {/* CTA Bitstack */}
      {bitstack && (
        <div className="glass glow-border rounded-2xl p-6 sm:p-8">
          <div className="grid gap-6 sm:grid-cols-[1fr_auto] items-center">
            <div>
              <span className="badge-info">Notre choix DCA Bitcoin</span>
              <h3 className="mt-3 text-xl font-bold text-white">
                Bitstack — DCA Bitcoin auto dès 1 €/jour
              </h3>
              <p className="mt-2 text-sm text-white/70">
                Programme tes achats récurrents et accumule des sats à chaque halving
                sans devoir te connecter. Application FR conforme MiCA.
              </p>
            </div>
            <AffiliateLink
              href={bitstack.affiliateUrl}
              platform="bitstack"
              placement="halving-simulator-cta"
              ctaText="Démarrer mon DCA Bitcoin"
              className="btn-primary whitespace-nowrap justify-center"
            >
              Démarrer mon DCA
              <ArrowRight className="h-4 w-4" />
            </AffiliateLink>
          </div>
        </div>
      )}

      {/* Disclaimer YMYL */}
      <div className="rounded-xl border border-amber-400/30 bg-amber-400/5 p-4 text-xs text-white/70">
        <div className="flex gap-2">
          <Info className="h-4 w-4 shrink-0 text-amber-300" />
          <p>
            <strong className="text-amber-200">Avertissement :</strong>{" "}
            les projections affichées sont des <strong>scénarios mathématiques</strong>{" "}
            basés sur les multiplicateurs des cycles passés. Aucun rendement n'est
            garanti — Bitcoin peut perdre 80 % de sa valeur entre deux halvings comme
            il l'a déjà fait. Cet outil n'est pas un conseil en investissement.
            N'investis que ce que tu peux te permettre de perdre.
          </p>
        </div>
      </div>
    </div>
  );
}

function ScenarioCard({
  title,
  description,
  invested,
  value,
  color,
  highlight,
}: {
  title: string;
  description: string;
  invested: number;
  value: number;
  color: string;
  highlight?: boolean;
}) {
  const gain = value - invested;
  const roi = invested > 0 ? (gain / invested) * 100 : 0;
  return (
    <div className={`glass rounded-2xl p-5 border ${color} ${highlight ? "ring-1 ring-primary/40" : ""}`}>
      <div className="flex items-center gap-2">
        <TrendingUp className="h-4 w-4 text-white/60" />
        <h4 className="font-bold text-white">{title}</h4>
      </div>
      <p className="mt-2 text-xs text-white/60 leading-relaxed">{description}</p>
      <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
        <div>
          <p className="text-white/50">Investi</p>
          <p className="font-bold text-white">{formatEur(invested)}</p>
        </div>
        <div>
          <p className="text-white/50">Valeur estimée</p>
          <p className="font-bold text-primary-soft">{formatEur(value)}</p>
        </div>
      </div>
      <p className="mt-3 text-xs text-white/70">
        ROI : <span className={roi >= 0 ? "text-accent-green" : "text-red-400"}>{roi.toFixed(0)} %</span>
      </p>
    </div>
  );
}

/**
 * Chart SVG natif — 4 lignes (investi + 3 scénarios) sur les halvings futurs.
 * Pas de dépendance externe (pattern aligné sur DcaSimulator.tsx).
 */
function HalvingChart({ data }: { data: ChartPoint[] }) {
  const width = 720;
  const height = 300;
  const padding = { top: 16, right: 16, bottom: 32, left: 64 };

  const allValues = data.flatMap((d) => [d.invested, d.conservateur, d.moyen, d.bullish]);
  const maxY = Math.max(...allValues, 1) * 1.1;
  const minY = 0;

  const xScale = (i: number) =>
    padding.left + (i / Math.max(data.length - 1, 1)) * (width - padding.left - padding.right);
  const yScale = (v: number) =>
    height -
    padding.bottom -
    ((v - minY) / (maxY - minY)) * (height - padding.top - padding.bottom);

  const buildPath = (key: keyof Omit<ChartPoint, "label">) =>
    data
      .map((d, i) => `${i === 0 ? "M" : "L"} ${xScale(i).toFixed(1)} ${yScale(d[key]).toFixed(1)}`)
      .join(" ");

  const yTicks = 4;
  const ticks = Array.from({ length: yTicks + 1 }, (_, i) => (maxY * i) / yTicks);

  return (
    <div className="glass rounded-2xl p-4 sm:p-6">
      <h3 className="font-bold text-white">Projection portfolio aux 3 prochains halvings</h3>
      <p className="mt-1 text-xs text-white/60">3 scénarios — du plus prudent au plus bullish.</p>
      <div className="mt-4 flex flex-wrap gap-3 text-xs">
        <Legend color="#9CA3AF" label="Total investi" dashed />
        <Legend color="#3b82f6" label="Conservateur" />
        <Legend color="#F5B800" label="Moyen" />
        <Legend color="#22c55e" label="Bullish" />
      </div>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="mt-3 w-full h-auto"
        role="img"
        aria-label="Projection portfolio Bitcoin sur les prochains halvings"
      >
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

        <path d={buildPath("invested")} fill="none" stroke="#9CA3AF" strokeWidth={1.5} strokeDasharray="4 4" />
        <path d={buildPath("conservateur")} fill="none" stroke="#3b82f6" strokeWidth={2} />
        <path d={buildPath("moyen")} fill="none" stroke="#F5B800" strokeWidth={2.5} />
        <path d={buildPath("bullish")} fill="none" stroke="#22c55e" strokeWidth={2} />

        {data.map((d, i) => (
          <g key={d.label}>
            <circle cx={xScale(i)} cy={yScale(d.moyen)} r={3} fill="#F5B800" />
            <text
              x={xScale(i)}
              y={height - padding.bottom + 18}
              textAnchor="middle"
              fontSize="11"
              fill="#9BA3AF"
            >
              {d.label}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}

function Legend({ color, label, dashed }: { color: string; label: string; dashed?: boolean }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-white/70">
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
