"use client";

/**
 * <PortfolioTotals /> — Totaux Portfolio (footer du tableau).
 *
 * Pilier 5. Affiche :
 *  - Valeur totale du portefeuille
 *  - Variation 24 h pondérée (€ + %)
 *  - Nombre de positions
 */

import { Briefcase, TrendingUp, TrendingDown, Minus } from "lucide-react";
import type { PortfolioSummary } from "@/lib/portfolio-types";
import AnimatedNumber from "@/components/ui/AnimatedNumber";

interface PortfolioTotalsProps {
  summary: PortfolioSummary;
}

export default function PortfolioTotals({ summary }: PortfolioTotalsProps) {
  const { totalValue, totalChange24hEur, totalChange24hPct, positionsCount } =
    summary;

  const TrendIcon =
    totalChange24hPct > 0
      ? TrendingUp
      : totalChange24hPct < 0
        ? TrendingDown
        : Minus;
  const trendClass =
    totalChange24hPct > 0
      ? "text-success-fg border-success/30 bg-success/5"
      : totalChange24hPct < 0
        ? "text-danger-fg border-danger/30 bg-danger/5"
        : "text-muted border-border bg-elevated";

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      {/* Valeur totale */}
      <div className="rounded-2xl border border-primary/30 bg-primary/5 p-5">
        <div className="flex items-center gap-2 text-xs font-semibold text-primary-soft uppercase tracking-wide">
          <Briefcase className="h-3.5 w-3.5" />
          Valeur totale
        </div>
        <div className="mt-2 text-2xl sm:text-3xl font-extrabold text-fg tabular-nums">
          <AnimatedNumber
            value={totalValue}
            decimals={2}
            duration={500}
            suffix=" €"
            once={false}
          />
        </div>
      </div>

      {/* Variation 24h */}
      <div className={`rounded-2xl border p-5 ${trendClass}`}>
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide opacity-80">
          <TrendIcon className="h-3.5 w-3.5" />
          Variation 24 h
        </div>
        <div className="mt-2 text-2xl sm:text-3xl font-extrabold tabular-nums">
          {totalChange24hPct >= 0 ? "+" : ""}
          {totalChange24hPct.toFixed(2)} %
        </div>
        <div className="mt-1 text-sm font-semibold tabular-nums opacity-80">
          {totalChange24hEur >= 0 ? "+" : ""}
          {totalChange24hEur.toLocaleString("fr-FR", {
            style: "currency",
            currency: "EUR",
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}
        </div>
      </div>

      {/* Nombre de positions */}
      <div className="rounded-2xl border border-border bg-surface p-5">
        <div className="flex items-center gap-2 text-xs font-semibold text-muted uppercase tracking-wide">
          Positions
        </div>
        <div className="mt-2 text-2xl sm:text-3xl font-extrabold text-fg tabular-nums">
          {positionsCount}
        </div>
        <div className="mt-1 text-xs text-muted">
          {positionsCount > 1 ? "cryptomonnaies" : "cryptomonnaie"} suivie
          {positionsCount > 1 ? "s" : ""}
        </div>
      </div>
    </div>
  );
}
