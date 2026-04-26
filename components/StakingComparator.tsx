"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  ExternalLink,
  Filter,
  Lock,
  RefreshCw,
  ShieldAlert,
  TrendingUp,
} from "lucide-react";

import type { StakingPair } from "@/lib/programmatic";
import { getPlatformById } from "@/lib/platforms";
import AffiliateLink from "@/components/AffiliateLink";

/* ------------------------------------------------------------------ */
/*  Types & constantes                                                 */
/* ------------------------------------------------------------------ */

type LockUpFilter = "all" | "liquid" | "lt7" | "lt30";

type SortKey = "apyDesc" | "apyAsc" | "lockAsc" | "riskAsc" | "nameAsc";

interface Props {
  pairs: StakingPair[];
}

const APY_MIN_BOUND = 0;
const APY_MAX_BOUND = 20;

const RISK_LABELS: Record<StakingPair["risk"], string> = {
  1: "Très faible",
  2: "Faible",
  3: "Modéré",
  4: "Élevé",
  5: "Très élevé",
};

const LOCK_FILTER_LABELS: Record<LockUpFilter, string> = {
  all: "Tous",
  liquid: "Liquid only",
  lt7: "≤ 7j",
  lt30: "≤ 30j",
};

const SORT_LABELS: Record<SortKey, string> = {
  apyDesc: "APY décroissant",
  apyAsc: "APY croissant",
  lockAsc: "Lock-up croissant",
  riskAsc: "Risque croissant",
  nameAsc: "Nom (A → Z)",
};

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function formatLockUp(days: number): string {
  if (days === 0) return "Liquid";
  if (days < 7) return `${days} j`;
  if (days % 7 === 0) return `${days / 7} sem`;
  return `${days} j`;
}

function avgApy(pair: StakingPair): number {
  return (pair.apyMin + pair.apyMax) / 2;
}

function platformLabel(id: string): string {
  const p = getPlatformById(id);
  if (p) return p.name;
  // Fallback : capitalize l'id (ex: "okx" → "OKX")
  return id.length <= 4 ? id.toUpperCase() : id.charAt(0).toUpperCase() + id.slice(1);
}

function passesLockFilter(days: number, filter: LockUpFilter): boolean {
  switch (filter) {
    case "liquid":
      return days === 0;
    case "lt7":
      return days <= 7;
    case "lt30":
      return days <= 30;
    case "all":
    default:
      return true;
  }
}

function applySort(list: StakingPair[], sort: SortKey): StakingPair[] {
  const arr = [...list];
  switch (sort) {
    case "apyDesc":
      return arr.sort((a, b) => avgApy(b) - avgApy(a));
    case "apyAsc":
      return arr.sort((a, b) => avgApy(a) - avgApy(b));
    case "lockAsc":
      return arr.sort((a, b) => a.lockUpDays - b.lockUpDays);
    case "riskAsc":
      return arr.sort((a, b) => a.risk - b.risk);
    case "nameAsc":
      return arr.sort((a, b) => a.name.localeCompare(b.name, "fr"));
    default:
      return arr;
  }
}

/* ------------------------------------------------------------------ */
/*  Composants internes                                                */
/* ------------------------------------------------------------------ */

function RiskDots({ level }: { level: StakingPair["risk"] }) {
  const tone =
    level <= 2
      ? "text-success"
      : level === 3
      ? "text-warning"
      : "text-danger";
  return (
    <span
      className="inline-flex items-center gap-0.5"
      role="img"
      aria-label={`Risque ${level} sur 5 — ${RISK_LABELS[level]}`}
    >
      {Array.from({ length: 5 }).map((_, i) => (
        <span
          key={i}
          aria-hidden="true"
          className={`text-base leading-none ${
            i < level ? tone : "text-border"
          }`}
        >
          {i < level ? "●" : "○"}
        </span>
      ))}
    </span>
  );
}

function ApyBar({ min, max }: { min: number; max: number }) {
  // Position de la barre [min..max] sur l'échelle 0..APY_MAX_BOUND.
  const lo = Math.max(0, Math.min(min, APY_MAX_BOUND));
  const hi = Math.max(lo, Math.min(max, APY_MAX_BOUND));
  const left = (lo / APY_MAX_BOUND) * 100;
  const width = ((hi - lo) / APY_MAX_BOUND) * 100;
  return (
    <div className="mt-2">
      <div className="flex items-baseline justify-between text-xs text-muted">
        <span aria-hidden="true">{APY_MIN_BOUND}%</span>
        <span aria-hidden="true">{APY_MAX_BOUND}%+</span>
      </div>
      <div
        className="relative mt-1 h-2 w-full overflow-hidden rounded-full bg-elevated/80 border border-border"
        aria-hidden="true"
      >
        <div
          className="absolute top-0 h-full rounded-full bg-gradient-to-r from-success/70 via-success to-success/80"
          style={{
            left: `${left}%`,
            width: `${Math.max(width, 2)}%`,
          }}
        />
      </div>
    </div>
  );
}

function PlatformBadge({ id }: { id: string }) {
  return (
    <span className="inline-flex items-center rounded-full border border-border bg-elevated/60 px-2 py-0.5 text-[11px] font-medium text-fg/80">
      {platformLabel(id)}
    </span>
  );
}

function StakingCard({ pair }: { pair: StakingPair }) {
  const bestPlatformId = pair.availableOn[0];
  const bestPlatform = bestPlatformId ? getPlatformById(bestPlatformId) : undefined;
  const visiblePlatforms = pair.availableOn.slice(0, 4);
  const overflow = Math.max(pair.availableOn.length - visiblePlatforms.length, 0);
  const lockText = formatLockUp(pair.lockUpDays);

  return (
    <article
      className="group glass glow-border rounded-2xl p-5 sm:p-6 flex flex-col h-full hover-lift"
      aria-labelledby={`staking-${pair.cryptoId}-title`}
    >
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3
            id={`staking-${pair.cryptoId}-title`}
            className="text-lg sm:text-xl font-bold text-fg truncate"
          >
            {pair.name}
          </h3>
          <div className="text-xs font-mono text-muted">{pair.symbol}</div>
        </div>
        <span className="shrink-0 rounded-full border border-success/40 bg-success/10 px-2.5 py-1 text-xs font-mono font-semibold text-success">
          {pair.apyMin}% – {pair.apyMax}%
        </span>
      </header>

      <ApyBar min={pair.apyMin} max={pair.apyMax} />

      <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
        <div>
          <dt className="text-[11px] uppercase tracking-wider text-muted flex items-center gap-1">
            <Lock className="h-3 w-3" aria-hidden="true" />
            Lock-up
          </dt>
          <dd className="mt-1">
            <span
              className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${
                pair.lockUpDays === 0
                  ? "border-success/40 bg-success/10 text-success"
                  : "border-border bg-elevated/60 text-fg/80"
              }`}
            >
              {lockText}
            </span>
          </dd>
        </div>
        <div>
          <dt className="text-[11px] uppercase tracking-wider text-muted flex items-center gap-1">
            <ShieldAlert className="h-3 w-3" aria-hidden="true" />
            Risque
          </dt>
          <dd className="mt-1 flex items-center gap-2">
            <RiskDots level={pair.risk} />
            <span className="text-xs text-fg/80">{RISK_LABELS[pair.risk]}</span>
          </dd>
        </div>
      </dl>

      <div className="mt-4">
        <div className="text-[11px] uppercase tracking-wider text-muted mb-1.5">
          Disponible sur
        </div>
        <div className="flex flex-wrap gap-1.5">
          {visiblePlatforms.map((id) => (
            <PlatformBadge key={id} id={id} />
          ))}
          {overflow > 0 && (
            <span
              className="inline-flex items-center rounded-full border border-border bg-elevated/40 px-2 py-0.5 text-[11px] font-medium text-muted"
              aria-label={`et ${overflow} autre${overflow > 1 ? "s" : ""} plateforme${overflow > 1 ? "s" : ""}`}
            >
              +{overflow}
            </span>
          )}
        </div>
      </div>

      <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-2 mt-auto pt-4 border-t border-border/60">
        <Link
          href={`/staking/${pair.cryptoId}`}
          className="btn-ghost w-full text-sm"
          aria-label={`Voir le détail du staking ${pair.name}`}
        >
          Voir détail
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
        {bestPlatform ? (
          <AffiliateLink
            href={bestPlatform.affiliateUrl}
            platform={bestPlatform.id}
            placement="staking-comparator"
            className="btn-primary w-full text-sm"
          >
            Staker sur {bestPlatform.name}
            <span className="sr-only">
              {" "}
              (publicité, lien d'affiliation, ouvre un nouvel onglet)
            </span>
            <ExternalLink className="h-4 w-4" aria-hidden="true" />
          </AffiliateLink>
        ) : bestPlatformId ? (
          <span className="btn-ghost w-full text-sm opacity-60 cursor-not-allowed">
            {platformLabel(bestPlatformId)} (bientôt)
          </span>
        ) : null}
      </div>
    </article>
  );
}

/* ------------------------------------------------------------------ */
/*  Composant principal                                                */
/* ------------------------------------------------------------------ */

export default function StakingComparator({ pairs }: Props) {
  // Liste de plateformes uniques dérivée de toutes les pairs.
  const allPlatforms = useMemo(() => {
    const set = new Set<string>();
    pairs.forEach((p) => p.availableOn.forEach((id) => set.add(id)));
    return Array.from(set).sort((a, b) =>
      platformLabel(a).localeCompare(platformLabel(b), "fr")
    );
  }, [pairs]);

  // État Client local. Démarre toujours sur les filtres "neutres" pour matcher
  // le SSR (pas de mismatch d'hydration). Le re-filtrage se fait après mount.
  const [hydrated, setHydrated] = useState(false);
  const [apyMin, setApyMin] = useState(APY_MIN_BOUND);
  const [apyMax, setApyMax] = useState(APY_MAX_BOUND);
  const [lockFilter, setLockFilter] = useState<LockUpFilter>("all");
  const [maxRisk, setMaxRisk] = useState<StakingPair["risk"]>(5);
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);
  const [sort, setSort] = useState<SortKey>("apyDesc");

  useEffect(() => {
    setHydrated(true);
  }, []);

  /* --------------------------- Handlers --------------------------- */

  const reset = () => {
    setApyMin(APY_MIN_BOUND);
    setApyMax(APY_MAX_BOUND);
    setLockFilter("all");
    setMaxRisk(5);
    setSelectedPlatforms([]);
    setSort("apyDesc");
  };

  const togglePlatform = (id: string) => {
    setSelectedPlatforms((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  // Garantit cohérence min ≤ max pendant que l'utilisateur déplace les sliders.
  const onApyMinChange = (v: number) => {
    const safe = Math.max(APY_MIN_BOUND, Math.min(v, apyMax));
    setApyMin(safe);
  };
  const onApyMaxChange = (v: number) => {
    const safe = Math.min(APY_MAX_BOUND, Math.max(v, apyMin));
    setApyMax(safe);
  };

  /* ----------------------------- Filter --------------------------- */

  const filtered = useMemo(() => {
    const list = pairs.filter((p) => {
      // APY range : on inclut la pair si son range chevauche [apyMin..apyMax].
      const apyOverlap = p.apyMax >= apyMin && p.apyMin <= apyMax;
      if (!apyOverlap) return false;
      if (!passesLockFilter(p.lockUpDays, lockFilter)) return false;
      if (p.risk > maxRisk) return false;
      if (selectedPlatforms.length > 0) {
        const matches = p.availableOn.some((id) => selectedPlatforms.includes(id));
        if (!matches) return false;
      }
      return true;
    });
    return applySort(list, sort);
  }, [pairs, apyMin, apyMax, lockFilter, maxRisk, selectedPlatforms, sort]);

  /* ----------------------------- Stats ---------------------------- */

  const stats = useMemo(() => {
    if (filtered.length === 0) {
      return { avg: 0, max: 0, platforms: 0 };
    }
    const avg =
      filtered.reduce((s, p) => s + avgApy(p), 0) / filtered.length;
    const max = filtered.reduce((m, p) => Math.max(m, p.apyMax), 0);
    const platformSet = new Set<string>();
    filtered.forEach((p) => p.availableOn.forEach((id) => platformSet.add(id)));
    return { avg, max, platforms: platformSet.size };
  }, [filtered]);

  const total = pairs.length;
  const shown = filtered.length;

  /* ---------------------------- Markup ---------------------------- */

  return (
    <div
      role="region"
      aria-label="Comparateur de staking"
      className="staking-comparator"
    >
      {/* Stats récap */}
      <div
        className="mt-8 grid grid-cols-2 sm:grid-cols-4 gap-3"
        aria-live="polite"
      >
        <StatPill label="Affichées" value={`${shown} / ${total}`} />
        <StatPill
          label="APY moyen"
          value={shown > 0 ? `${stats.avg.toFixed(1)}%` : "—"}
          tone="success"
        />
        <StatPill
          label="APY max"
          value={shown > 0 ? `${stats.max.toFixed(1)}%` : "—"}
          tone="success"
        />
        <StatPill
          label="Plateformes"
          value={shown > 0 ? `${stats.platforms}` : "—"}
        />
      </div>

      {/* Filtres sticky */}
      <div className="sticky top-0 z-30 mt-6 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 pb-3">
        <div className="glass rounded-2xl border border-border/80 p-4 sm:p-5 backdrop-blur-xl shadow-e2">
          <div className="flex items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-fg">
              <Filter className="h-4 w-4 text-primary" aria-hidden="true" />
              Filtres
            </div>
            <button
              type="button"
              onClick={reset}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-primary-soft hover:text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded px-2 py-1 transition-colors"
              aria-label="Réinitialiser tous les filtres"
            >
              <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
              Réinitialiser
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-5">
            {/* APY range */}
            <fieldset className="lg:col-span-4">
              <legend
                id="apy-range-legend"
                className="text-[11px] font-semibold uppercase tracking-wider text-muted mb-1.5 flex items-center gap-1"
              >
                <TrendingUp className="h-3 w-3" aria-hidden="true" />
                APY ({apyMin}% – {apyMax === APY_MAX_BOUND ? `${APY_MAX_BOUND}%+` : `${apyMax}%`})
              </legend>
              <div
                className="relative h-6"
                aria-describedby="apy-range-legend"
              >
                {/* Track */}
                <div
                  className="absolute left-0 right-0 top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-elevated border border-border"
                  aria-hidden="true"
                />
                {/* Selected range */}
                <div
                  className="absolute top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-gradient-to-r from-success/60 to-success"
                  style={{
                    left: `${(apyMin / APY_MAX_BOUND) * 100}%`,
                    width: `${((apyMax - apyMin) / APY_MAX_BOUND) * 100}%`,
                  }}
                  aria-hidden="true"
                />
                <input
                  type="range"
                  min={APY_MIN_BOUND}
                  max={APY_MAX_BOUND}
                  step={0.5}
                  value={apyMin}
                  onChange={(e) => onApyMinChange(parseFloat(e.target.value))}
                  className="staking-range absolute inset-0 w-full appearance-none bg-transparent pointer-events-none"
                  aria-label={`APY minimum, actuellement ${apyMin}%`}
                />
                <input
                  type="range"
                  min={APY_MIN_BOUND}
                  max={APY_MAX_BOUND}
                  step={0.5}
                  value={apyMax}
                  onChange={(e) => onApyMaxChange(parseFloat(e.target.value))}
                  className="staking-range staking-range--upper absolute inset-0 w-full appearance-none bg-transparent pointer-events-none"
                  aria-label={`APY maximum, actuellement ${apyMax}%`}
                />
              </div>
              <div className="mt-1 flex justify-between text-[10px] font-mono text-muted">
                <span>{APY_MIN_BOUND}%</span>
                <span>{APY_MAX_BOUND}%</span>
              </div>
            </fieldset>

            {/* Lock-up */}
            <fieldset className="lg:col-span-3">
              <legend className="text-[11px] font-semibold uppercase tracking-wider text-muted mb-1.5 flex items-center gap-1">
                <Lock className="h-3 w-3" aria-hidden="true" />
                Lock-up
              </legend>
              <div
                className="flex flex-wrap gap-1.5"
                role="radiogroup"
                aria-label="Filtre lock-up"
              >
                {(Object.keys(LOCK_FILTER_LABELS) as LockUpFilter[]).map((key) => {
                  const active = lockFilter === key;
                  return (
                    <button
                      key={key}
                      type="button"
                      role="radio"
                      aria-checked={active}
                      onClick={() => setLockFilter(key)}
                      className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background ${
                        active
                          ? "border-primary/60 bg-primary/15 text-primary-soft"
                          : "border-border bg-elevated/40 text-fg/70 hover:text-fg hover:border-primary/30"
                      }`}
                    >
                      {LOCK_FILTER_LABELS[key]}
                    </button>
                  );
                })}
              </div>
            </fieldset>

            {/* Risque */}
            <fieldset className="lg:col-span-2">
              <legend className="text-[11px] font-semibold uppercase tracking-wider text-muted mb-1.5 flex items-center gap-1">
                <ShieldAlert className="h-3 w-3" aria-hidden="true" />
                Risque max
              </legend>
              <div
                className="flex flex-wrap gap-1.5"
                role="radiogroup"
                aria-label="Filtre risque maximum"
              >
                {[1, 2, 3, 4, 5].map((n) => {
                  const active = maxRisk === n;
                  return (
                    <button
                      key={n}
                      type="button"
                      role="radio"
                      aria-checked={active}
                      aria-label={`Risque maximum ${n} sur 5 — ${RISK_LABELS[n as StakingPair["risk"]]}`}
                      onClick={() => setMaxRisk(n as StakingPair["risk"])}
                      className={`min-w-[32px] h-[28px] rounded-full text-xs font-semibold border transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background ${
                        active
                          ? "border-primary/60 bg-primary/15 text-primary-soft"
                          : "border-border bg-elevated/40 text-fg/70 hover:text-fg hover:border-primary/30"
                      }`}
                    >
                      {n}
                    </button>
                  );
                })}
              </div>
            </fieldset>

            {/* Plateformes */}
            <fieldset className="lg:col-span-3">
              <legend className="text-[11px] font-semibold uppercase tracking-wider text-muted mb-1.5">
                Plateforme
              </legend>
              <div
                className="flex flex-wrap gap-1.5"
                role="group"
                aria-label="Filtre plateformes (sélection multiple)"
              >
                {allPlatforms.map((id) => {
                  const active = selectedPlatforms.includes(id);
                  return (
                    <button
                      key={id}
                      type="button"
                      aria-pressed={active}
                      onClick={() => togglePlatform(id)}
                      className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background ${
                        active
                          ? "border-primary/60 bg-primary/15 text-primary-soft"
                          : "border-border bg-elevated/40 text-fg/70 hover:text-fg hover:border-primary/30"
                      }`}
                    >
                      {platformLabel(id)}
                    </button>
                  );
                })}
              </div>
            </fieldset>
          </div>

          {/* Tri + count */}
          <div className="mt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-3 border-t border-border/60">
            <p className="text-xs text-muted" aria-live="polite">
              <span className="font-mono font-semibold text-fg">{shown}</span>{" "}
              <span aria-hidden="true">/</span>{" "}
              <span className="font-mono">{total}</span> cryptos affichées
            </p>
            <div className="flex items-center gap-2">
              <label
                htmlFor="staking-sort"
                className="text-xs font-medium text-muted"
              >
                Trier par
              </label>
              <select
                id="staking-sort"
                value={sort}
                onChange={(e) => setSort(e.target.value as SortKey)}
                className="rounded-lg border border-border bg-elevated/60 text-fg text-xs px-2.5 py-1.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              >
                {(Object.keys(SORT_LABELS) as SortKey[]).map((k) => (
                  <option key={k} value={k}>
                    {SORT_LABELS[k]}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Liste de cards */}
      <div
        className={`mt-6 transition-opacity duration-200 ${
          hydrated ? "opacity-100" : "opacity-95"
        }`}
      >
        {filtered.length === 0 ? (
          <div
            className="glass rounded-2xl border border-border p-8 text-center"
            role="status"
            aria-live="polite"
          >
            <p className="text-fg font-semibold">
              Aucune crypto ne correspond à tes filtres.
            </p>
            <p className="mt-1 text-sm text-muted">
              Essaie d'élargir le range APY, d'autoriser plus de risque ou de
              désélectionner certaines plateformes.
            </p>
            <button
              type="button"
              onClick={reset}
              className="mt-4 btn-ghost text-sm"
            >
              <RefreshCw className="h-4 w-4" aria-hidden="true" />
              Réinitialiser les filtres
            </button>
          </div>
        ) : (
          <ul className="grid grid-cols-1 lg:grid-cols-2 gap-4 list-none p-0 m-0">
            {filtered.map((p) => (
              <li key={p.cryptoId}>
                <StakingCard pair={p} />
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Range slider styles — local, scoped via classnames pour éviter
          d'alourdir globals.css. Inclut focus visible + reduced-motion. */}
      <style jsx>{`
        .staking-range {
          pointer-events: none;
        }
        .staking-range::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          height: 18px;
          width: 18px;
          border-radius: 9999px;
          background: var(--color-primary, #f5a524);
          border: 2px solid #0b0d10;
          box-shadow: 0 0 0 1px rgba(245, 165, 36, 0.6),
            0 4px 10px -2px rgba(0, 0, 0, 0.5);
          cursor: pointer;
          pointer-events: auto;
          transition: transform 120ms ease, box-shadow 200ms ease;
        }
        .staking-range::-moz-range-thumb {
          height: 18px;
          width: 18px;
          border-radius: 9999px;
          background: var(--color-primary, #f5a524);
          border: 2px solid #0b0d10;
          box-shadow: 0 0 0 1px rgba(245, 165, 36, 0.6),
            0 4px 10px -2px rgba(0, 0, 0, 0.5);
          cursor: pointer;
          pointer-events: auto;
        }
        .staking-range::-webkit-slider-thumb:hover {
          transform: scale(1.1);
        }
        .staking-range::-moz-range-thumb:hover {
          transform: scale(1.1);
        }
        .staking-range:focus-visible::-webkit-slider-thumb {
          outline: 2px solid var(--color-primary-glow, #fbbf24);
          outline-offset: 2px;
        }
        .staking-range:focus-visible::-moz-range-thumb {
          outline: 2px solid var(--color-primary-glow, #fbbf24);
          outline-offset: 2px;
        }
        .staking-range::-webkit-slider-runnable-track {
          background: transparent;
          height: 6px;
        }
        .staking-range::-moz-range-track {
          background: transparent;
          height: 6px;
        }
        @media (prefers-reduced-motion: reduce) {
          .staking-range::-webkit-slider-thumb,
          .staking-range::-moz-range-thumb {
            transition: none;
          }
        }
      `}</style>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  StatPill                                                           */
/* ------------------------------------------------------------------ */

function StatPill({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "success";
}) {
  const valueClass = tone === "success" ? "text-success" : "text-fg";
  return (
    <div className="glass rounded-xl border border-border px-3 py-2.5">
      <div className="text-[10px] font-semibold uppercase tracking-wider text-muted">
        {label}
      </div>
      <div className={`mt-0.5 text-base sm:text-lg font-bold font-mono ${valueClass}`}>
        {value}
      </div>
    </div>
  );
}
