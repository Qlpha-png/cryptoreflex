"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowRight,
  Calculator,
  Sparkles,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import Link from "next/link";

/**
 * MiniInvestSimulator — micro-calculateur "Si j'avais investi X€" (P1-10).
 *
 * Architecture :
 *  - Client Component embarqué dans `ToolsTeaser` (Server).
 *  - Inputs : montant (number), crypto (BTC/ETH/SOL), période (1/3/5 ans).
 *  - Au change debounced 350ms : fetch /api/historical?coin=...&days=...
 *    et calcule la valeur actuelle d'un investissement single-shot
 *    réalisé `days` jours plus tôt.
 *  - Hydration-safe : SSR sans résultat, le calcul démarre uniquement
 *    après mount + interaction. Pas de prop initial qui change entre
 *    Server/Client.
 *  - Fallback gracieux : si l'API rate-limit (points vide), affiche un
 *    message neutre + CTA simulateur DCA.
 *  - A11y : labels pour chaque input, live region pour le résultat.
 */

const COINS: Array<{ id: string; label: string; symbol: string }> = [
  { id: "bitcoin", label: "Bitcoin (BTC)", symbol: "BTC" },
  { id: "ethereum", label: "Ethereum (ETH)", symbol: "ETH" },
  { id: "solana", label: "Solana (SOL)", symbol: "SOL" },
];

const PERIODS: Array<{ years: number; label: string; days: number }> = [
  { years: 1, label: "1 an", days: 365 },
  { years: 3, label: "3 ans", days: 1095 },
  { years: 5, label: "5 ans", days: 1825 },
];

interface HistoricalPoint {
  t: number;
  price: number;
}

interface SimResult {
  /** Valeur actuelle de l'investissement, en EUR. */
  current: number;
  /** Variation absolue, en EUR (positive ou négative). */
  delta: number;
  /** ROI en %, signed. */
  roiPct: number;
  /** Date de référence (premier point trouvé) en ms. */
  startTs: number;
  /** Prix de référence et prix actuel utilisés. */
  startPrice: number;
  endPrice: number;
}

export default function MiniInvestSimulator() {
  const [amount, setAmount] = useState<number>(1000);
  const [coinId, setCoinId] = useState<string>("bitcoin");
  const [days, setDays] = useState<number>(365);

  const [points, setPoints] = useState<HistoricalPoint[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchKey = `${coinId}-${days}`;
  const lastFetchRef = useRef<string | null>(null);

  /* -------- Fetch debounced 350ms -------------------------------------- */
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (lastFetchRef.current === fetchKey) return;

    const id = setTimeout(() => {
      lastFetchRef.current = fetchKey;
      setLoading(true);
      setError(null);
      fetch(`/api/historical?coin=${encodeURIComponent(coinId)}&days=${days}`, {
        cache: "force-cache",
      })
        .then(async (r) => {
          if (!r.ok) throw new Error(`HTTP ${r.status}`);
          const data = (await r.json()) as { points: HistoricalPoint[] };
          setPoints(Array.isArray(data.points) ? data.points : []);
        })
        .catch(() => {
          setError("Données indisponibles pour le moment.");
          setPoints(null);
        })
        .finally(() => setLoading(false));
    }, 350);

    return () => clearTimeout(id);
  }, [coinId, days, fetchKey]);

  /* -------- Calcul résultat -------------------------------------------- */
  const result: SimResult | null = useMemo(() => {
    if (!points || points.length < 2 || !Number.isFinite(amount) || amount <= 0)
      return null;
    const start = points[0]!;
    const end = points[points.length - 1]!;
    if (!start.price || !end.price) return null;
    const units = amount / start.price;
    const current = units * end.price;
    const delta = current - amount;
    const roiPct = (delta / amount) * 100;
    return {
      current,
      delta,
      roiPct,
      startTs: start.t,
      startPrice: start.price,
      endPrice: end.price,
    };
  }, [points, amount]);

  const coinSymbol =
    COINS.find((c) => c.id === coinId)?.symbol ?? coinId.toUpperCase();
  const periodLabel = PERIODS.find((p) => p.days === days)?.label ?? "";

  return (
    <div className="rounded-2xl border border-border/60 bg-elevated/40 p-5 sm:p-6">
      <div className="flex items-center gap-2 mb-3">
        <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-primary/15 text-primary">
          <Calculator className="h-4 w-4" aria-hidden="true" />
        </span>
        <div>
          <h3 className="text-sm font-bold text-fg">
            Et si tu avais investi… ?
          </h3>
          <p className="text-[11px] text-muted">
            Estimation rapide single-shot sur historique CoinGecko.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Montant */}
        <div className="sm:col-span-1">
          <label
            htmlFor="mini-sim-amount"
            className="block text-[11px] uppercase tracking-wider text-muted mb-1"
          >
            Montant (€)
          </label>
          <input
            id="mini-sim-amount"
            type="number"
            inputMode="decimal"
            min={1}
            step={50}
            value={Number.isFinite(amount) ? amount : ""}
            onChange={(e) => {
              const v = parseFloat(e.target.value);
              setAmount(Number.isFinite(v) ? v : 0);
            }}
            aria-label="Montant investi en euros"
            className="w-full rounded-lg bg-background border border-border px-3 py-2 text-sm font-mono text-fg
                       focus:outline-none focus:border-primary/60 focus:ring-2 focus:ring-primary/30"
          />
        </div>

        {/* Crypto */}
        <div>
          <label
            htmlFor="mini-sim-coin"
            className="block text-[11px] uppercase tracking-wider text-muted mb-1"
          >
            Crypto
          </label>
          <select
            id="mini-sim-coin"
            value={coinId}
            onChange={(e) => setCoinId(e.target.value)}
            aria-label="Choisir la cryptomonnaie"
            className="w-full rounded-lg bg-background border border-border px-3 py-2 text-sm text-fg
                       focus:outline-none focus:border-primary/60 focus:ring-2 focus:ring-primary/30"
          >
            {COINS.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>
        </div>

        {/* Période */}
        <div>
          <label
            htmlFor="mini-sim-period"
            className="block text-[11px] uppercase tracking-wider text-muted mb-1"
          >
            Période
          </label>
          <select
            id="mini-sim-period"
            value={days}
            onChange={(e) => setDays(parseInt(e.target.value, 10))}
            aria-label="Choisir la période d'investissement"
            className="w-full rounded-lg bg-background border border-border px-3 py-2 text-sm text-fg
                       focus:outline-none focus:border-primary/60 focus:ring-2 focus:ring-primary/30"
          >
            {PERIODS.map((p) => (
              <option key={p.days} value={p.days}>
                Il y a {p.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Résultat — live region */}
      <div
        role="status"
        aria-live="polite"
        className="mt-4 min-h-[68px] rounded-xl border border-border bg-background/60 p-4"
      >
        {loading && !result && (
          <p className="text-xs text-muted animate-pulse motion-reduce:animate-none">
            Calcul en cours…
          </p>
        )}

        {error && !loading && (
          <p className="text-xs text-muted">
            {error}{" "}
            <Link
              href="/outils/simulateur-dca"
              className="text-primary-glow underline-offset-2 hover:underline"
            >
              Utiliser le simulateur DCA complet
            </Link>
          </p>
        )}

        {result && !loading && (
          <ResultBlock
            result={result}
            amount={amount}
            coinSymbol={coinSymbol}
            periodLabel={periodLabel}
          />
        )}

        {!result && !loading && !error && (
          <p className="text-xs text-muted">
            Renseigne un montant pour voir l&apos;estimation.
          </p>
        )}
      </div>

      <div className="mt-4 flex items-center justify-end">
        <Link
          href="/outils/simulateur-dca"
          className="inline-flex items-center gap-1 text-xs font-semibold text-primary-soft hover:text-primary"
        >
          <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
          Simulateur DCA complet
          <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
        </Link>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Result block                                                              */
/* -------------------------------------------------------------------------- */

function ResultBlock({
  result,
  amount,
  coinSymbol,
  periodLabel,
}: {
  result: SimResult;
  amount: number;
  coinSymbol: string;
  periodLabel: string;
}) {
  const positive = result.delta >= 0;
  const colorClass = positive ? "text-accent-green" : "text-accent-rose";
  const Icon = positive ? TrendingUp : TrendingDown;

  return (
    <div className="flex items-start gap-3">
      <Icon
        className={`h-5 w-5 mt-0.5 shrink-0 ${colorClass}`}
        aria-hidden="true"
      />
      <div className="text-sm text-fg/85 leading-snug">
        Si tu avais investi{" "}
        <strong className="text-fg font-mono tabular-nums">
          {formatEur(amount)}
        </strong>{" "}
        en {coinSymbol} il y a {periodLabel}, tu aurais aujourd&apos;hui{" "}
        <strong className="text-fg font-mono tabular-nums">
          {formatEur(result.current)}
        </strong>{" "}
        <span className={`font-mono font-semibold ${colorClass}`}>
          ({positive ? "+" : ""}
          {formatPct(result.roiPct)})
        </span>
        .
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                   */
/* -------------------------------------------------------------------------- */

function formatEur(v: number): string {
  try {
    return new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency: "EUR",
      maximumFractionDigits: 0,
    }).format(v);
  } catch {
    return `${v.toFixed(0)} €`;
  }
}

function formatPct(v: number): string {
  const abs = Math.abs(v);
  const digits = abs >= 100 ? 0 : abs >= 10 ? 1 : 2;
  return `${v.toFixed(digits)} %`;
}
