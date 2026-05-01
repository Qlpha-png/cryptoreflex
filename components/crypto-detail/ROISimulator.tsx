"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Calculator,
  TrendingDown,
  TrendingUp,
  CalendarRange,
  Repeat,
  Info,
} from "lucide-react";

/**
 * ROISimulator — calculatrice "Et si tu avais investi X€ en {date} ?"
 *
 * Embarqué sur chaque fiche `/cryptos/[slug]` (entre Verdict et Roadmap).
 * Objectif : transformer un visiteur passif en utilisateur engagé qui manipule
 * les leviers (montant / date / stratégie) et voit immédiatement l'impact.
 *
 * Architecture
 *  - Client Component, fetch /api/historical au mount + à chaque changement
 *    de "période" (durée totale en jours).
 *  - 3 contrôles UI : montant (slider+input 50–10 000 €), date départ (slider
 *    mappé sur ~360 positions de 2020-01-01 à J-30), stratégie (lump/DCA mois/
 *    DCA semaine).
 *  - Calcul live debounced 200ms sur les sliders (sinon recalcul à chaque
 *    mouvement = jank perceptible sur mobile).
 *  - Sparkline SVG maison (zéro dépendance) qui montre l'évolution de la
 *    valeur du portefeuille au fil du temps, pas du prix de la crypto.
 *  - Si l'API retourne 400 (coin pas dans la whitelist), on affiche un fallback
 *    explicite plutôt qu'un loader infini.
 *
 * A11y
 *  - Sliders avec <label htmlFor>, valeur affichée à côté, focus-visible ring.
 *  - Live region (role="status") pour annoncer la mise à jour du résultat.
 *  - Mobile-first : grille empilée sur 360px, sliders pleine largeur.
 */

interface Props {
  coingeckoId: string;
  cryptoName: string;
  cryptoSymbol: string;
}

interface HistoricalPoint {
  /** timestamp en ms (clé `t` côté API/lib historical-prices). */
  t: number;
  /** prix EUR */
  price: number;
}

type Strategy = "lump" | "dca-month" | "dca-week";

interface SimResult {
  /** Valeur actuelle totale du portefeuille (EUR). */
  current: number;
  /** Total investi (utile pour DCA, identique au montant en lump). */
  invested: number;
  /** Variation absolue. */
  delta: number;
  /** ROI signé en %. */
  roiPct: number;
  /** Quantité totale détenue à la fin (en unité de la crypto). */
  units: number;
  /** Série temporelle de la VALEUR du portefeuille à chaque point historique. */
  portfolioSeries: number[];
}

/** Date de départ minimale autorisée (couvre cycle 2020 → today). */
const START_FLOOR = new Date("2020-01-01T00:00:00Z").getTime();
/** Marge sécurité : pas de date de départ < 30 jours dans le passé. */
const START_CEILING_OFFSET_MS = 30 * 86_400_000;
/** Nombre de positions du slider de date — mappé sur 1 par ~5 jours. */
const DATE_SLIDER_STEPS = 360;

const AMOUNT_MIN = 50;
const AMOUNT_MAX = 10_000;
const AMOUNT_STEP = 50;

/**
 * Benchmarks anti-FOMO (ROI cumulé estimé du S&P 500 en EUR, dividendes réinvestis).
 * Sources approximatives (Yahoo Finance, Bloomberg) — arrondis pour comparaison
 * indicative. On n'ajuste pas par mois pour rester simple : la table sert à
 * rappeler qu'une crypto à +500 % vs un S&P 500 à +60 % sur la même période,
 * c'est une prime de risque ÉNORME.
 */
const SP500_BENCHMARKS: Array<{ years: number; roiPct: number }> = [
  { years: 5, roiPct: 95 },
  { years: 4, roiPct: 70 },
  { years: 3, roiPct: 50 },
  { years: 2, roiPct: 25 },
  { years: 1, roiPct: 12 },
];

export default function ROISimulator({
  coingeckoId,
  cryptoName,
  cryptoSymbol,
}: Props) {
  /* -------- State -------------------------------------------------------- */
  const [amount, setAmount] = useState<number>(1000);
  // Position du slider de date (0 = date_floor, DATE_SLIDER_STEPS = J-30).
  const [datePos, setDatePos] = useState<number>(
    Math.floor(DATE_SLIDER_STEPS * 0.5),
  );
  const [strategy, setStrategy] = useState<Strategy>("lump");

  const [points, setPoints] = useState<HistoricalPoint[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<"unsupported" | "fetch" | null>(null);
  const [clamped, setClamped] = useState(false);

  // Debounce token pour éviter les recalculs lourds à chaque pixel sur slider.
  const [debouncedAmount, setDebouncedAmount] = useState<number>(amount);
  const [debouncedDatePos, setDebouncedDatePos] = useState<number>(datePos);

  /* -------- Fetch historical (max 1825j = 5 ans, couvre depuis 2020) ----- */
  useEffect(() => {
    if (typeof window === "undefined") return;
    let cancelled = false;
    setLoading(true);
    setError(null);

    fetch(`/api/historical?coin=${encodeURIComponent(coingeckoId)}&days=1825`, {
      cache: "force-cache",
    })
      .then(async (r) => {
        if (r.status === 400) {
          // Coin pas dans la whitelist — fallback message dédié.
          setError("unsupported");
          setPoints(null);
          return;
        }
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const data = (await r.json()) as {
          points: HistoricalPoint[];
          clamped?: boolean;
        };
        if (cancelled) return;
        setPoints(Array.isArray(data.points) ? data.points : []);
        setClamped(Boolean(data.clamped));
      })
      .catch(() => {
        if (cancelled) return;
        setError("fetch");
        setPoints(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [coingeckoId]);

  /* -------- Debounce sliders (200ms) ------------------------------------ */
  useEffect(() => {
    const id = setTimeout(() => setDebouncedAmount(amount), 200);
    return () => clearTimeout(id);
  }, [amount]);

  useEffect(() => {
    const id = setTimeout(() => setDebouncedDatePos(datePos), 200);
    return () => clearTimeout(id);
  }, [datePos]);

  /* -------- Map slider position → timestamp réel ------------------------- */
  const startCeiling = useMemo(
    () => Date.now() - START_CEILING_OFFSET_MS,
    [],
  );

  const startTs = useMemo(() => {
    const ratio = debouncedDatePos / DATE_SLIDER_STEPS;
    return Math.round(START_FLOOR + ratio * (startCeiling - START_FLOOR));
  }, [debouncedDatePos, startCeiling]);

  /* -------- Calcul résultat --------------------------------------------- */
  const result: SimResult | null = useMemo(() => {
    if (!points || points.length < 2) return null;
    if (!Number.isFinite(debouncedAmount) || debouncedAmount <= 0) return null;

    // Slice : ne garder que les points >= startTs.
    const startIdx = points.findIndex((p) => p.t >= startTs);
    if (startIdx < 0 || startIdx >= points.length - 1) return null;
    const slice = points.slice(startIdx);
    if (slice.length < 2) return null;

    const endPrice = slice[slice.length - 1]!.price;
    if (!endPrice || endPrice <= 0) return null;

    // Pour chaque stratégie : on simule l'achat point par point pour pouvoir
    // dessiner la courbe d'évolution du portefeuille.
    if (strategy === "lump") {
      const startPrice = slice[0]!.price;
      if (!startPrice || startPrice <= 0) return null;
      const units = debouncedAmount / startPrice;
      const portfolioSeries = slice.map((p) => units * p.price);
      const current = units * endPrice;
      return {
        current,
        invested: debouncedAmount,
        delta: current - debouncedAmount,
        roiPct: ((current - debouncedAmount) / debouncedAmount) * 100,
        units,
        portfolioSeries,
      };
    }

    // DCA : on calcule un set de timestamps cibles d'achat (1 par mois ou par
    // semaine), on trouve le point historique le plus proche, on accumule
    // une fraction du montant total. La série portfolio à chaque point t
    // = unités cumulées jusqu'à t * prix(t).
    const totalMs = slice[slice.length - 1]!.t - slice[0]!.t;
    const intervalMs =
      strategy === "dca-month" ? 30 * 86_400_000 : 7 * 86_400_000;
    const buyCount = Math.max(1, Math.floor(totalMs / intervalMs) + 1);
    const tranche = debouncedAmount / buyCount;

    // Timestamps cibles : startTs, startTs + 1*interval, …
    const targets: number[] = [];
    for (let i = 0; i < buyCount; i++) {
      targets.push(slice[0]!.t + i * intervalMs);
    }

    // Pour chaque point historique, accumule les achats dont le timestamp
    // cible <= ce point. Algorithme O(n + k) avec k = nb achats.
    let totalUnits = 0;
    let totalInvested = 0;
    let nextTargetIdx = 0;
    const portfolioSeries: number[] = [];

    for (const p of slice) {
      // On exécute tous les achats dont le timestamp cible <= p.t.
      while (
        nextTargetIdx < targets.length &&
        targets[nextTargetIdx]! <= p.t
      ) {
        // Trouve le prix au point ≥ ce target. Comme on itère slice, on prend
        // simplement le prix courant `p.price` (approx : on achète au prix du
        // jour le plus proche supérieur ou égal à target).
        if (p.price > 0) {
          totalUnits += tranche / p.price;
          totalInvested += tranche;
        }
        nextTargetIdx++;
      }
      portfolioSeries.push(totalUnits * p.price);
    }

    // Si tous les achats n'ont pas pu être joués (cas marginal : intervalle
    // qui dépasse la fin de la série), on achète le reste au dernier prix.
    while (nextTargetIdx < targets.length) {
      if (endPrice > 0) {
        totalUnits += tranche / endPrice;
        totalInvested += tranche;
      }
      nextTargetIdx++;
    }

    const current = totalUnits * endPrice;
    if (!Number.isFinite(totalInvested) || totalInvested <= 0) return null;

    return {
      current,
      invested: totalInvested,
      delta: current - totalInvested,
      roiPct: ((current - totalInvested) / totalInvested) * 100,
      units: totalUnits,
      portfolioSeries,
    };
  }, [points, debouncedAmount, startTs, strategy]);

  /* -------- Benchmark S&P 500 (anti-FOMO) ------------------------------ */
  const sp500Estimate = useMemo(() => {
    const yearsElapsed =
      (Date.now() - startTs) / (365.25 * 86_400_000);
    if (yearsElapsed < 0.5) return null;
    // On prend le benchmark le plus proche en années (interpolation grossière).
    const sorted = [...SP500_BENCHMARKS].sort(
      (a, b) =>
        Math.abs(a.years - yearsElapsed) - Math.abs(b.years - yearsElapsed),
    );
    return sorted[0]!;
  }, [startTs]);

  /* -------- Format helpers --------------------------------------------- */
  const formattedStartDate = useMemo(
    () =>
      new Date(startTs).toLocaleDateString("fr-FR", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }),
    [startTs],
  );

  /* -------- Fallback unsupported --------------------------------------- */
  if (error === "unsupported") {
    return (
      <section
        aria-label={`Simulateur ROI ${cryptoName}`}
        className="rounded-2xl border border-border bg-surface p-6 motion-safe:animate-fade-in-up"
      >
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-primary-soft">
          <Calculator className="h-3.5 w-3.5" aria-hidden="true" />
          Simulateur ROI
        </div>
        <h2 className="mt-1.5 text-xl font-extrabold text-fg">
          Et si tu avais investi en {cryptoName} ?
        </h2>
        <p className="mt-3 text-sm text-muted leading-relaxed">
          Simulateur disponible uniquement pour les top 30 cryptos par market
          cap. {cryptoName} ({cryptoSymbol}) n&apos;est pas encore couvert par
          notre source de données historiques.
        </p>
      </section>
    );
  }

  /* -------- Main render ------------------------------------------------- */
  return (
    <section
      aria-label={`Simulateur ROI ${cryptoName}`}
      className="rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-5 sm:p-7 motion-safe:animate-fade-in-up"
    >
      <header className="flex items-start gap-3">
        <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
          <Calculator className="h-5 w-5" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <div className="text-xs font-semibold uppercase tracking-wider text-primary-soft">
            Simulateur ROI interactif
          </div>
          <h2 className="mt-0.5 text-xl sm:text-2xl font-extrabold text-fg leading-tight">
            Et si tu avais investi en {cryptoName} ?
          </h2>
          <p className="mt-1 text-xs sm:text-sm text-muted leading-snug">
            Choisis un montant, une date de départ et une stratégie — le calcul
            est instantané.
          </p>
        </div>
      </header>

      {/* Sliders + stratégie */}
      <div className="mt-6 grid gap-5">
        {/* Montant */}
        <div>
          <div className="flex items-baseline justify-between gap-3">
            <label
              htmlFor="roi-sim-amount"
              className="text-[11px] uppercase tracking-wider text-muted font-semibold"
            >
              Montant investi
            </label>
            <div className="flex items-center gap-2">
              <input
                id="roi-sim-amount-num"
                type="number"
                min={AMOUNT_MIN}
                max={AMOUNT_MAX}
                step={AMOUNT_STEP}
                value={Number.isFinite(amount) ? amount : ""}
                onChange={(e) => {
                  const v = parseFloat(e.target.value);
                  if (!Number.isFinite(v)) return;
                  setAmount(Math.min(Math.max(v, AMOUNT_MIN), AMOUNT_MAX));
                }}
                aria-label="Montant investi en euros"
                className="w-24 rounded-lg bg-background border border-border px-2 py-1 text-sm font-mono tabular-nums text-fg
                           focus:outline-none focus-visible:border-primary/60 focus-visible:ring-2 focus-visible:ring-primary/40"
              />
              <span className="text-xs text-muted">€</span>
            </div>
          </div>
          <input
            id="roi-sim-amount"
            type="range"
            min={AMOUNT_MIN}
            max={AMOUNT_MAX}
            step={AMOUNT_STEP}
            value={amount}
            onChange={(e) => setAmount(parseInt(e.target.value, 10))}
            aria-label="Slider montant investi"
            className="mt-2 w-full accent-primary cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 rounded"
          />
          <div className="mt-1 flex justify-between text-[10px] text-muted/80 font-mono">
            <span>{AMOUNT_MIN} €</span>
            <span>{AMOUNT_MAX.toLocaleString("fr-FR")} €</span>
          </div>
        </div>

        {/* Date départ */}
        <div>
          <div className="flex items-baseline justify-between gap-3">
            <label
              htmlFor="roi-sim-date"
              className="text-[11px] uppercase tracking-wider text-muted font-semibold inline-flex items-center gap-1.5"
            >
              <CalendarRange className="h-3 w-3" aria-hidden="true" />
              Date de départ
            </label>
            <span className="text-sm font-semibold text-fg font-mono tabular-nums">
              {formattedStartDate}
            </span>
          </div>
          <input
            id="roi-sim-date"
            type="range"
            min={0}
            max={DATE_SLIDER_STEPS}
            step={1}
            value={datePos}
            onChange={(e) => setDatePos(parseInt(e.target.value, 10))}
            aria-label="Slider date de départ"
            aria-valuetext={formattedStartDate}
            className="mt-2 w-full accent-primary cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 rounded"
          />
          <div className="mt-1 flex justify-between text-[10px] text-muted/80 font-mono">
            <span>janv. 2020</span>
            <span>il y a 30 j</span>
          </div>
        </div>

        {/* Stratégie */}
        <div>
          <div className="text-[11px] uppercase tracking-wider text-muted font-semibold inline-flex items-center gap-1.5">
            <Repeat className="h-3 w-3" aria-hidden="true" />
            Stratégie d&apos;achat
          </div>
          <div
            role="radiogroup"
            aria-label="Stratégie d'investissement"
            className="mt-2 grid grid-cols-3 gap-2"
          >
            <StrategyButton
              active={strategy === "lump"}
              onClick={() => setStrategy("lump")}
              label="Lump sum"
              sub="Achat unique"
            />
            <StrategyButton
              active={strategy === "dca-month"}
              onClick={() => setStrategy("dca-month")}
              label="DCA mensuel"
              sub="1 achat / mois"
            />
            <StrategyButton
              active={strategy === "dca-week"}
              onClick={() => setStrategy("dca-week")}
              label="DCA hebdo"
              sub="1 achat / sem."
            />
          </div>
        </div>
      </div>

      {/* Résultat — live region */}
      <div
        role="status"
        aria-live="polite"
        className="mt-6 rounded-xl border border-border bg-background/70 p-5 sm:p-6 min-h-[180px]"
      >
        {loading && !result && (
          <p className="text-sm text-muted animate-pulse motion-reduce:animate-none">
            Récupération des prix historiques…
          </p>
        )}

        {error === "fetch" && !loading && (
          <p className="text-sm text-muted">
            Données indisponibles pour le moment. Réessaie dans quelques
            secondes ou utilise notre{" "}
            <a
              href="/outils/simulateur-dca"
              className="text-primary-soft underline-offset-2 hover:underline"
            >
              simulateur DCA complet
            </a>
            .
          </p>
        )}

        {result && (
          <ResultBlock
            result={result}
            cryptoSymbol={cryptoSymbol}
            strategy={strategy}
            sp500={sp500Estimate}
            startDate={formattedStartDate}
          />
        )}
      </div>

      {/* Footer disclaimers */}
      <div className="mt-4 space-y-1.5">
        {clamped && (
          <p className="text-[11px] text-warning-fg leading-snug inline-flex items-start gap-1.5">
            <Info className="h-3 w-3 mt-0.5 shrink-0" aria-hidden="true" />
            Données limitées par CoinGecko free tier — résultat indicatif sur la
            période disponible.
          </p>
        )}
        <p className="text-[11px] text-muted leading-snug">
          Les performances passées ne préjugent pas des performances futures.
          Calcul basé sur les prix CoinGecko en EUR. Action vs crypto =
          volatilité différente : la prime de risque crypto se paye en stress
          baissier équivalent.
        </p>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/*  StrategyButton                                                            */
/* -------------------------------------------------------------------------- */

function StrategyButton({
  active,
  onClick,
  label,
  sub,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  sub: string;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={active}
      onClick={onClick}
      className={`rounded-xl border px-2 py-2 text-left transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${
        active
          ? "border-primary/70 bg-primary/15 text-fg"
          : "border-border bg-background/40 text-fg/85 hover:border-primary/40"
      }`}
    >
      <div className="text-xs sm:text-sm font-bold leading-tight">{label}</div>
      <div className="text-[10px] sm:text-[11px] text-muted leading-tight mt-0.5">
        {sub}
      </div>
    </button>
  );
}

/* -------------------------------------------------------------------------- */
/*  ResultBlock                                                               */
/* -------------------------------------------------------------------------- */

function ResultBlock({
  result,
  cryptoSymbol,
  strategy,
  sp500,
  startDate,
}: {
  result: SimResult;
  cryptoSymbol: string;
  strategy: Strategy;
  sp500: { years: number; roiPct: number } | null;
  startDate: string;
}) {
  const positive = result.delta >= 0;
  const colorClass = positive ? "text-success" : "text-danger";
  const Icon = positive ? TrendingUp : TrendingDown;
  const sign = positive ? "+" : "";
  const strategyLabel =
    strategy === "lump"
      ? "achat unique"
      : strategy === "dca-month"
        ? "DCA mensuel"
        : "DCA hebdo";

  return (
    <div className="grid gap-5 sm:grid-cols-[1fr_auto] sm:gap-6 items-center">
      <div className="min-w-0">
        <div className="text-[11px] uppercase tracking-wider text-muted">
          Valeur aujourd&apos;hui ({strategyLabel} depuis {startDate})
        </div>
        <div className="mt-1 flex items-baseline gap-2 flex-wrap">
          <span className="text-3xl sm:text-4xl font-extrabold text-fg font-mono tabular-nums leading-none">
            {formatEur(result.current)}
          </span>
          <span
            className={`inline-flex items-center gap-1 text-base sm:text-lg font-bold font-mono tabular-nums ${colorClass}`}
          >
            <Icon className="h-4 w-4" aria-hidden="true" />
            {sign}
            {formatPct(result.roiPct)}
          </span>
        </div>
        <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-muted">
          <div>
            Investi :{" "}
            <span className="text-fg font-mono tabular-nums">
              {formatEur(result.invested)}
            </span>
          </div>
          <div>
            Plus/moins-value :{" "}
            <span
              className={`font-mono tabular-nums font-semibold ${colorClass}`}
            >
              {sign}
              {formatEur(result.delta)}
            </span>
          </div>
          <div>
            Quantité :{" "}
            <span className="text-fg font-mono tabular-nums">
              {formatCrypto(result.units)} {cryptoSymbol}
            </span>
          </div>
          {sp500 && (
            <div className="col-span-2 mt-1 text-[11px] text-muted/90">
              À titre de comparaison, le S&amp;P 500 aurait fait
              ~+{sp500.roiPct}&nbsp;% sur ~{sp500.years} an
              {sp500.years > 1 ? "s" : ""}.
            </div>
          )}
        </div>
      </div>

      {/* Sparkline */}
      <PortfolioSparkline
        series={result.portfolioSeries}
        positive={positive}
      />
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  PortfolioSparkline (SVG maison, zéro dep)                                 */
/* -------------------------------------------------------------------------- */

function PortfolioSparkline({
  series,
  positive,
}: {
  series: number[];
  positive: boolean;
}) {
  const width = 200;
  const height = 80;

  // Downsample si > width points pour limiter la taille du DOM SVG.
  const compact = useMemo(() => {
    if (series.length <= width) return series;
    const bucket = Math.ceil(series.length / width);
    const out: number[] = [];
    for (let i = 0; i < series.length; i += bucket) {
      const slice = series.slice(i, i + bucket);
      const avg = slice.reduce((s, v) => s + v, 0) / slice.length;
      out.push(avg);
    }
    return out;
  }, [series]);

  if (compact.length < 2) {
    return (
      <div
        className="hidden sm:flex items-center justify-center text-xs text-muted"
        style={{ width, height }}
        aria-hidden="true"
      >
        —
      </div>
    );
  }

  const min = Math.min(...compact);
  const max = Math.max(...compact);
  const span = max - min || 1;
  const stepX = width / Math.max(compact.length - 1, 1);

  const pathD = compact
    .map((v, i) => {
      const x = i * stepX;
      const y = height - ((v - min) / span) * (height - 4) - 2;
      return `${i === 0 ? "M" : "L"}${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(" ");

  const fillD = `${pathD} L${width.toFixed(2)},${height} L0,${height} Z`;

  const stroke = positive ? "#22C55E" : "#EF4444";
  const fill = positive ? "rgba(34,197,94,0.16)" : "rgba(239,68,68,0.14)";

  return (
    <svg
      role="img"
      aria-label="Évolution de la valeur du portefeuille"
      viewBox={`0 0 ${width} ${height}`}
      width={width}
      height={height}
      className="w-full max-w-[200px] sm:w-[200px] sm:max-w-none mt-2 sm:mt-0"
    >
      <path d={fillD} fill={fill} />
      <path
        d={pathD}
        fill="none"
        stroke={stroke}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/* -------------------------------------------------------------------------- */
/*  Helpers format                                                            */
/* -------------------------------------------------------------------------- */

function formatEur(v: number): string {
  try {
    return new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency: "EUR",
      maximumFractionDigits: v >= 1000 ? 0 : 2,
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

function formatCrypto(v: number): string {
  if (!Number.isFinite(v) || v === 0) return "0";
  if (v >= 1) return v.toFixed(4);
  if (v >= 0.0001) return v.toFixed(6);
  return v.toExponential(2);
}

