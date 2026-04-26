"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Clock } from "lucide-react";

import type { TAArticleSummary } from "@/lib/ta-mdx";
import TrendBadge from "./TrendBadge";

/**
 * <AnalysesIndexClient /> — UI client de la page /analyses-techniques.
 *
 * Reçoit les analyses pré-fetchées côté Server (cache 1800s ISR) et expose :
 *  - Tabs filtre crypto (Toutes / BTC / ETH / SOL / XRP / ADA)
 *  - Cartes : symbol logo + prix + change 24h coloré + RSI mini-bar + badge tendance
 *  - Pagination 20/page (taille standard listing)
 *
 * Tout est client-side : aucun fetch supplémentaire, hydration-safe.
 */

const PAGE_SIZE = 20;

const SYMBOLS_FILTER: Array<{ key: string; label: string }> = [
  { key: "ALL", label: "Toutes" },
  { key: "BTC", label: "BTC" },
  { key: "ETH", label: "ETH" },
  { key: "SOL", label: "SOL" },
  { key: "XRP", label: "XRP" },
  { key: "ADA", label: "ADA" },
];

interface Props {
  articles: TAArticleSummary[];
}

function formatDate(iso: string): string {
  return new Date(iso + "T00:00:00Z").toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

function formatPrice(value: number): string {
  if (!Number.isFinite(value) || value === 0) return "—";
  if (value >= 1000) return value.toLocaleString("en-US", { maximumFractionDigits: 0 });
  if (value >= 1) return value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return value.toLocaleString("en-US", { minimumFractionDigits: 4, maximumFractionDigits: 4 });
}

function formatPct(value: number): string {
  if (!Number.isFinite(value)) return "—";
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(2)}%`;
}

export default function AnalysesIndexClient({ articles }: Props) {
  const [activeSymbol, setActiveSymbol] = useState<string>("ALL");
  const [page, setPage] = useState(1);

  // Reset page quand le filtre change.
  const filtered = useMemo(() => {
    if (activeSymbol === "ALL") return articles;
    return articles.filter((a) => a.symbol === activeSymbol);
  }, [articles, activeSymbol]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const visible = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  return (
    <>
      {/* Tabs filtre crypto */}
      <nav
        aria-label="Filtrer par crypto"
        className="mt-8 flex flex-wrap gap-2"
        role="radiogroup"
      >
        {SYMBOLS_FILTER.map((opt) => {
          const count =
            opt.key === "ALL"
              ? articles.length
              : articles.filter((a) => a.symbol === opt.key).length;
          const isActive = activeSymbol === opt.key;
          return (
            <button
              key={opt.key}
              type="button"
              role="radio"
              aria-checked={isActive}
              onClick={() => {
                setActiveSymbol(opt.key);
                setPage(1);
              }}
              className={[
                "rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors",
                "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                isActive
                  ? "border-primary bg-primary/15 text-primary-glow"
                  : "border-border bg-surface text-fg/70 hover:border-primary/40 hover:text-fg",
              ].join(" ")}
            >
              {opt.label}
              <span className="ml-1.5 text-xs text-muted">({count})</span>
            </button>
          );
        })}
      </nav>

      <p className="sr-only" aria-live="polite">
        {filtered.length} analyse{filtered.length > 1 ? "s" : ""} affichée
        {filtered.length > 1 ? "s" : ""}
        {activeSymbol !== "ALL" ? ` pour ${activeSymbol}` : ""}.
      </p>

      {/* Grille d'analyses */}
      {visible.length === 0 ? (
        <div className="mt-12 rounded-2xl border border-border bg-surface p-10 text-center">
          <p className="text-fg/70">
            Aucune analyse disponible pour cette sélection.
          </p>
        </div>
      ) : (
        <ul className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {visible.map((a) => (
            <li key={a.slug}>
              <AnalysisCard article={a} />
            </li>
          ))}
        </ul>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <nav
          aria-label="Pagination des analyses"
          className="mt-10 flex items-center justify-center gap-2"
        >
          <button
            type="button"
            disabled={safePage === 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            aria-label="Page précédente"
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-surface text-fg/70 hover:border-primary/40 hover:text-fg disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="text-sm text-muted px-2">
            Page <span className="font-bold text-fg">{safePage}</span> /{" "}
            {totalPages}
          </span>
          <button
            type="button"
            disabled={safePage === totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            aria-label="Page suivante"
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-surface text-fg/70 hover:border-primary/40 hover:text-fg disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </nav>
      )}
    </>
  );
}

/* -------------------------------------------------------------------------- */
/*  Card                                                                      */
/* -------------------------------------------------------------------------- */

function AnalysisCard({ article }: { article: TAArticleSummary }) {
  const change = article.change24h;
  const changeColor = change > 0 ? "text-emerald-400" : change < 0 ? "text-rose-400" : "text-muted";
  const rsi = article.rsi;
  const rsiColor = rsi >= 70 ? "bg-rose-500" : rsi <= 30 ? "bg-emerald-500" : "bg-amber-500";

  return (
    <Link
      href={`/analyses-techniques/${article.slug}`}
      className="group block h-full rounded-2xl border border-border bg-surface p-5 transition-colors hover:border-primary/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
    >
      <header className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          {article.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={article.image}
              alt=""
              className="h-8 w-8 rounded-full bg-elevated"
              loading="lazy"
            />
          ) : (
            <div className="h-8 w-8 rounded-full bg-elevated grid place-items-center text-[11px] font-bold text-primary">
              {article.symbol.slice(0, 3)}
            </div>
          )}
          <div className="min-w-0">
            <div className="font-bold text-sm text-fg truncate">{article.name}</div>
            <div className="text-[11px] text-muted font-mono">{article.symbol}</div>
          </div>
        </div>
        <TrendBadge trend={article.trend} size="sm" />
      </header>

      {/* Prix + change 24h */}
      <div className="mt-4 flex items-baseline gap-2">
        <span className="font-mono text-lg font-bold text-fg">
          {formatPrice(article.currentPrice)} $
        </span>
        <span className={`text-sm font-mono font-semibold ${changeColor}`}>
          {formatPct(change)}
        </span>
      </div>

      {/* RSI mini-bar */}
      <div className="mt-3">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[10px] uppercase tracking-wide text-muted">RSI</span>
          <span className="text-[11px] font-mono font-semibold text-fg/80">
            {rsi.toFixed(1)}
          </span>
        </div>
        <div
          role="meter"
          aria-valuenow={rsi}
          aria-valuemin={0}
          aria-valuemax={100}
          className="h-1.5 rounded-full bg-elevated overflow-hidden"
        >
          <div
            className={`h-full ${rsiColor} transition-all`}
            style={{ width: `${Math.max(2, Math.min(100, rsi))}%` }}
          />
        </div>
      </div>

      <footer className="mt-4 flex items-center justify-between text-[11px] text-muted">
        <span className="inline-flex items-center gap-1">
          <Clock className="h-3 w-3" aria-hidden="true" />
          {formatDate(article.date)}
        </span>
        <span className="text-primary-glow group-hover:underline">Lire l'analyse →</span>
      </footer>
    </Link>
  );
}
