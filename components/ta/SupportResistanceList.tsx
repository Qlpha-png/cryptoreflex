/**
 * <SupportResistanceList /> — listes visuelles de niveaux clés.
 *
 * Affiche supports + résistances avec :
 *  - Numérotation S1/S2/S3 et R1/R2/R3
 *  - Distance % vs prix actuel (signée, colorée)
 *  - Mini barre de progression visuelle (densité de niveaux)
 *
 * Server Component pur — props pré-calculées.
 */

import { ChevronUp, ChevronDown, ShieldCheck, ShieldAlert } from "lucide-react";
import type { Levels } from "@/lib/ta-types";

interface Props {
  levels: Levels;
  currentPrice: number;
  /** Limite affichée par catégorie (défaut 3). */
  limit?: number;
}

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                   */
/* -------------------------------------------------------------------------- */

function formatPrice(value: number): string {
  if (!Number.isFinite(value) || value === 0) return "—";
  if (value >= 1000) return value.toLocaleString("en-US", { maximumFractionDigits: 0 });
  if (value >= 1) return value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return value.toLocaleString("en-US", { minimumFractionDigits: 4, maximumFractionDigits: 4 });
}

function distancePct(level: number, price: number): number {
  if (price === 0) return 0;
  return ((level - price) / price) * 100;
}

function fmtPct(pct: number): string {
  const sign = pct > 0 ? "+" : "";
  return `${sign}${pct.toFixed(2)}%`;
}

/* -------------------------------------------------------------------------- */
/*  Composant principal                                                       */
/* -------------------------------------------------------------------------- */

export default function SupportResistanceList({ levels, currentPrice, limit = 3 }: Props) {
  const supports = levels.supports.slice(0, limit);
  const resistances = levels.resistances.slice(0, limit);

  return (
    <section
      aria-label="Niveaux clés : supports et résistances"
      className="rounded-2xl border border-border bg-surface p-5 sm:p-6"
    >
      <header className="mb-4">
        <h2 className="text-base sm:text-lg font-bold tracking-tight">
          Niveaux <span className="gradient-text">clés</span>
        </h2>
        <p className="text-xs text-muted mt-1">
          Détectés par pivots highs/lows sur les 50 dernières périodes.
        </p>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Résistances : au-dessus du prix */}
        <div>
          <h3 className="flex items-center gap-1.5 text-xs uppercase tracking-wide text-rose-300 mb-2">
            <ShieldAlert className="h-3.5 w-3.5" aria-hidden="true" />
            Résistances
          </h3>
          {resistances.length === 0 ? (
            <p className="text-sm text-muted italic">Aucune résistance nette identifiée.</p>
          ) : (
            <ul className="space-y-1.5">
              {resistances.map((r, i) => {
                const d = distancePct(r, currentPrice);
                return (
                  <li
                    key={`r-${i}`}
                    className="flex items-center justify-between rounded-lg border border-rose-500/20 bg-rose-500/5 px-3 py-2"
                  >
                    <div className="flex items-center gap-2">
                      <span className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-rose-500/15 text-[11px] font-bold text-rose-300">
                        R{i + 1}
                      </span>
                      <span className="font-mono text-sm font-semibold text-fg">
                        {formatPrice(r)} $
                      </span>
                    </div>
                    <span className="flex items-center gap-1 text-xs font-mono text-rose-300">
                      <ChevronUp className="h-3 w-3" aria-hidden="true" />
                      {fmtPct(d)}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Supports : sous le prix */}
        <div>
          <h3 className="flex items-center gap-1.5 text-xs uppercase tracking-wide text-emerald-300 mb-2">
            <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
            Supports
          </h3>
          {supports.length === 0 ? (
            <p className="text-sm text-muted italic">Aucun support net identifié.</p>
          ) : (
            <ul className="space-y-1.5">
              {supports.map((s, i) => {
                const d = distancePct(s, currentPrice);
                return (
                  <li
                    key={`s-${i}`}
                    className="flex items-center justify-between rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-3 py-2"
                  >
                    <div className="flex items-center gap-2">
                      <span className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-emerald-500/15 text-[11px] font-bold text-emerald-300">
                        S{i + 1}
                      </span>
                      <span className="font-mono text-sm font-semibold text-fg">
                        {formatPrice(s)} $
                      </span>
                    </div>
                    <span className="flex items-center gap-1 text-xs font-mono text-emerald-300">
                      <ChevronDown className="h-3 w-3" aria-hidden="true" />
                      {fmtPct(d)}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>

      {/* Prix actuel — référence visuelle */}
      <div className="mt-4 flex items-center justify-center rounded-lg border border-primary/30 bg-primary/5 px-3 py-2">
        <span className="text-xs uppercase tracking-wide text-muted mr-2">Prix actuel</span>
        <span className="font-mono text-base font-bold text-primary-glow">
          {formatPrice(currentPrice)} $
        </span>
      </div>
    </section>
  );
}
