"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity,
  Coins,
  Database,
  PieChart,
  RotateCw,
  TrendingDown,
  TrendingUp,
  Users,
  Wallet,
  Code2,
  Layers,
} from "lucide-react";
import type { OnChainMetrics } from "@/lib/onchain-metrics";

/**
 * OnChainMetricsLive — Client Component qui transforme la fiche /cryptos/[slug]
 * en mini-dashboard live (TVL DeFi, dominance, FDV, holders, etc.).
 *
 * Pattern :
 *  - Fetch /api/onchain/{coingeckoId} au mount + sur clic refresh.
 *  - Si la réponse est null OU si fetch fail → ne rend RIEN (return null).
 *    On préfère masquer le bloc plutôt que d'afficher un "—" qui dégrade la
 *    crédibilité éditoriale.
 *  - Skeleton custom pendant le loading initial seulement (pas pendant un refresh).
 *  - Animations CSS pures via classes Tailwind `animate-onchain-up` (définie
 *    inline en <style jsx>) — pas de Framer Motion, pas de dep.
 */

interface Props {
  coingeckoId: string;
  cryptoName: string;
}

interface ApiResponse {
  metrics: OnChainMetrics | null;
}

export default function OnChainMetricsLive({ coingeckoId, cryptoName }: Props) {
  const [metrics, setMetrics] = useState<OnChainMetrics | null>(null);
  const [initialLoading, setInitialLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [errored, setErrored] = useState<boolean>(false);

  const load = useCallback(
    async (signal?: AbortSignal): Promise<void> => {
      try {
        const res = await fetch(
          `/api/onchain/${encodeURIComponent(coingeckoId)}`,
          { signal, cache: "no-store" },
        );
        if (!res.ok) {
          setErrored(true);
          setMetrics(null);
          return;
        }
        const json = (await res.json()) as ApiResponse;
        setMetrics(json.metrics ?? null);
        setErrored(false);
      } catch (err) {
        // AbortError = unmount, on ignore
        if ((err as Error)?.name === "AbortError") return;
        setErrored(true);
        setMetrics(null);
      }
    },
    [coingeckoId],
  );

  useEffect(() => {
    const controller = new AbortController();
    setInitialLoading(true);
    load(controller.signal).finally(() => setInitialLoading(false));
    return () => controller.abort();
  }, [load]);

  const handleRefresh = useCallback(async () => {
    if (refreshing) return;
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load, refreshing]);

  // Skeleton uniquement au premier chargement
  if (initialLoading) {
    return <SkeletonGrid />;
  }

  // Aucun bloc vide : si rien à dire, on disparaît.
  if (errored || !metrics || !hasAnyDisplayableField(metrics)) {
    return null;
  }

  return (
    <section
      aria-label={`Métriques on-chain ${cryptoName}`}
      className="rounded-2xl border border-border bg-surface p-5 sm:p-6"
    >
      {/* Animations CSS pures — staggered fade-up. Respecte prefers-reduced-motion. */}
      <style jsx>{`
        @keyframes onchainUp {
          from {
            opacity: 0;
            transform: translateY(8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .onchain-card {
          opacity: 0;
          animation: onchainUp 0.45s ease-out forwards;
        }
        @media (prefers-reduced-motion: reduce) {
          .onchain-card {
            opacity: 1;
            animation: none;
          }
        }
      `}</style>

      <header className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-primary" aria-hidden="true" />
          <h2 className="text-base sm:text-lg font-bold tracking-tight">
            Métriques on-chain{" "}
            <span className="gradient-text">{cryptoName}</span>
          </h2>
        </div>
        <button
          type="button"
          onClick={handleRefresh}
          disabled={refreshing}
          aria-label="Rafraîchir les métriques on-chain"
          className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-elevated/60 px-2.5 py-1.5 text-xs font-semibold text-muted hover:text-fg hover:border-primary/40 transition-colors disabled:opacity-60 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
        >
          <RotateCw
            className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`}
            aria-hidden="true"
          />
          {refreshing ? "Mise à jour..." : "Rafraîchir"}
        </button>
      </header>

      <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        <MetricCards metrics={metrics} />
      </div>

      <SourceFooter metrics={metrics} />
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/*  Cards                                                                     */
/* -------------------------------------------------------------------------- */

interface CardSpec {
  key: string;
  label: string;
  icon: typeof Activity;
  value: string;
  sub?: string;
  trend?: number;
  source?: "DeFiLlama" | "CoinGecko" | "GitHub";
}

function MetricCards({ metrics }: { metrics: OnChainMetrics }) {
  const cards = useMemo(() => buildCards(metrics), [metrics]);
  return (
    <>
      {cards.map((c, i) => (
        <article
          key={c.key}
          className="onchain-card rounded-xl border border-border bg-elevated/40 p-4"
          style={{ animationDelay: `${i * 60}ms` }}
        >
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-muted">
              <c.icon className="h-3.5 w-3.5" aria-hidden="true" />
              <span className="text-[11px] uppercase tracking-wider">{c.label}</span>
            </div>
            {c.source && (
              <span className="text-[10px] text-muted/70 font-mono">{c.source}</span>
            )}
          </div>
          <div className="mt-2 font-mono text-lg font-bold text-fg tabular-nums truncate">
            {c.value}
          </div>
          {(c.sub || typeof c.trend === "number") && (
            <div className="mt-1 flex items-center gap-2 text-[11px]">
              {typeof c.trend === "number" && <TrendBadge value={c.trend} />}
              {c.sub && <span className="text-muted truncate">{c.sub}</span>}
            </div>
          )}
        </article>
      ))}
    </>
  );
}

function buildCards(m: OnChainMetrics): CardSpec[] {
  const cards: CardSpec[] = [];

  if (typeof m.tvlUSD === "number") {
    cards.push({
      key: "tvl",
      label: "TVL (Total Value Locked)",
      icon: Database,
      value: formatCompactUsd(m.tvlUSD),
      trend: m.tvlChange7d,
      sub: typeof m.tvlChange7d === "number" ? "sur 7 jours" : undefined,
      source: "DeFiLlama",
    });
  }

  if (typeof m.marketCapDominance === "number") {
    cards.push({
      key: "dominance",
      label: "Dominance marché",
      icon: PieChart,
      value: `${m.marketCapDominance.toFixed(2)}%`,
      sub: "du market cap crypto total",
      source: "CoinGecko",
    });
  }

  if (typeof m.fdv === "number") {
    cards.push({
      key: "fdv",
      label: "FDV (valuation pleinement diluée)",
      icon: Coins,
      value: formatCompactUsd(m.fdv),
      sub: "supply max × prix",
      source: "CoinGecko",
    });
  }

  if (typeof m.holdersCount === "number") {
    cards.push({
      key: "holders",
      label: "Holders",
      icon: Wallet,
      value: formatCompactNumber(m.holdersCount),
      sub:
        typeof m.holdersTop10Pct === "number"
          ? `Top 10 = ${m.holdersTop10Pct.toFixed(1)}% du supply`
          : undefined,
      source: "CoinGecko",
    });
  }

  if (typeof m.activeAddresses24h === "number") {
    cards.push({
      key: "active",
      label: "Adresses actives 24h",
      icon: Users,
      value: formatCompactNumber(m.activeAddresses24h),
      source: "CoinGecko",
    });
  }

  if (typeof m.txCount24h === "number") {
    cards.push({
      key: "tx",
      label: "Transactions 24h",
      icon: Layers,
      value: formatCompactNumber(m.txCount24h),
      trend: m.txCount24hChange,
      sub: typeof m.txCount24hChange === "number" ? "vs hier" : undefined,
      source: "CoinGecko",
    });
  }

  if (typeof m.githubCommits30d === "number") {
    cards.push({
      key: "github",
      label: "Commits GitHub 30j",
      icon: Code2,
      value: formatCompactNumber(m.githubCommits30d),
      sub: "activité dev",
      source: "GitHub",
    });
  }

  return cards;
}

function TrendBadge({ value }: { value: number }) {
  const positive = value >= 0;
  const Icon = positive ? TrendingUp : TrendingDown;
  const cls = positive
    ? "text-accent-green border-accent-green/30 bg-accent-green/5"
    : "text-accent-rose border-accent-rose/30 bg-accent-rose/5";
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 font-mono text-[10px] font-semibold tabular-nums ${cls}`}
    >
      <Icon className="h-3 w-3" aria-hidden="true" />
      {(positive ? "+" : "") + value.toFixed(2)}%
    </span>
  );
}

/* -------------------------------------------------------------------------- */
/*  Footer & helpers                                                          */
/* -------------------------------------------------------------------------- */

function SourceFooter({ metrics }: { metrics: OnChainMetrics }) {
  const sources: string[] = [];
  if (typeof metrics.tvlUSD === "number" || typeof metrics.tvlChange7d === "number") {
    sources.push("DeFiLlama");
  }
  if (
    typeof metrics.marketCapDominance === "number" ||
    typeof metrics.fdv === "number" ||
    typeof metrics.holdersCount === "number" ||
    typeof metrics.activeAddresses24h === "number" ||
    typeof metrics.txCount24h === "number"
  ) {
    sources.push("CoinGecko");
  }
  if (typeof metrics.githubCommits30d === "number") {
    sources.push("GitHub");
  }
  const sourcesLabel = sources.length ? sources.join(" · ") : "Source unique";

  return (
    <p className="mt-4 text-[11px] text-muted">
      Sources : {sourcesLabel} · maj {formatRelativeFr(metrics.lastUpdate)}
    </p>
  );
}

function SkeletonGrid() {
  return (
    <section
      aria-label="Chargement des métriques on-chain"
      className="rounded-2xl border border-border bg-surface p-5 sm:p-6"
    >
      <div className="h-5 w-56 rounded bg-elevated/60 animate-pulse motion-reduce:animate-none" />
      <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="h-24 rounded-xl border border-border bg-elevated/40 animate-pulse motion-reduce:animate-none"
          />
        ))}
      </div>
    </section>
  );
}

function hasAnyDisplayableField(m: OnChainMetrics): boolean {
  return (
    typeof m.tvlUSD === "number" ||
    typeof m.tvlChange7d === "number" ||
    typeof m.activeAddresses24h === "number" ||
    typeof m.txCount24h === "number" ||
    typeof m.holdersCount === "number" ||
    typeof m.marketCapDominance === "number" ||
    typeof m.fdv === "number" ||
    typeof m.githubCommits30d === "number"
  );
}

function formatCompactUsd(value: number): string {
  if (!Number.isFinite(value)) return "—";
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "USD",
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}

function formatCompactNumber(value: number): string {
  if (!Number.isFinite(value)) return "—";
  return new Intl.NumberFormat("fr-FR", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}

function formatRelativeFr(iso: string): string {
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return "à l'instant";
  const diffMs = Date.now() - t;
  const diffMin = Math.max(0, Math.round(diffMs / 60_000));
  if (diffMin < 1) return "à l'instant";
  if (diffMin < 60) return `il y a ${diffMin} min`;
  const diffH = Math.round(diffMin / 60);
  if (diffH < 24) return `il y a ${diffH} h`;
  const diffD = Math.round(diffH / 24);
  return `il y a ${diffD} j`;
}
