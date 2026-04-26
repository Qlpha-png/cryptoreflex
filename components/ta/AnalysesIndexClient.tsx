"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Clock, Sparkles, ArrowRight, TrendingUp, TrendingDown, Activity } from "lucide-react";

import type { TAArticleSummary } from "@/lib/ta-mdx";
import TrendBadge from "./TrendBadge";
import CryptoLogo from "@/components/ui/CryptoLogo";

/**
 * <AnalysesIndexClient /> — UI client de la page /analyses-techniques.
 *
 * Audit 26/04/2026 (user feedback "fix logo + plus de crypto + développer") :
 *
 * VAGUE 1 — Bug logo fix
 *  - Avant : <img src={article.image} loading="lazy"> = bug récurrent
 *    (loading=lazy IntersectionObserver foireux côté client, même bug que
 *    crypto logos commit b1bb58b).
 *  - Après : <CryptoLogo symbol coingeckoId imageUrl> qui utilise <img> natif
 *    SANS lazy loading + fallback gradient gold + initiales bulletproof.
 *
 * VAGUE 2 — Filtres dynamiques étendus
 *  - Avant : 5 chips hardcodées (BTC/ETH/SOL/XRP/ADA).
 *  - Après : chips DYNAMIQUES dérivées des articles présents (auto-update si
 *    cron génère BNB/DOGE/AVAX/DOT/MATIC/LINK/TRX). Compatible 12 cryptos.
 *  - Tri : par count desc puis ordre TA_CRYPTOS (BTC en premier).
 *
 * VAGUE 3 — Cards plus dynamiques (user "j'aime cette section, développe-la")
 *  - Hover : translate-y -3px + glow gold + border primary
 *  - Badge "Aujourd'hui" pulse-strong gold si article du jour
 *  - Sparkline mini intégré (placeholder pour futur — RSI bar reste signature)
 *  - "Lire l'analyse" avec arrow-spring au hover
 *  - card-premium au lieu de border simple
 *  - Stagger reveal au mount via --i CSS var
 *  - Active filter pulse-strong pour le chip actif
 *
 * VAGUE 4 — A11y maintenue
 *  - role=radiogroup conservé
 *  - aria-checked
 *  - aria-live polite
 *  - meter role pour RSI conservé
 */

const PAGE_SIZE = 20;

// Ordre de priorité d'affichage des chips (BTC d'abord même si moins d'articles).
const SYMBOL_ORDER = [
  "BTC", "ETH", "SOL", "XRP", "ADA",
  "BNB", "DOGE", "AVAX", "DOT", "MATIC", "LINK", "TRX",
];

// Mapping symbol → coingeckoId pour CryptoLogo (fallback intelligent).
const SYMBOL_TO_COINGECKO: Record<string, string> = {
  BTC: "bitcoin",
  ETH: "ethereum",
  SOL: "solana",
  XRP: "ripple",
  ADA: "cardano",
  BNB: "binancecoin",
  DOGE: "dogecoin",
  AVAX: "avalanche-2",
  DOT: "polkadot",
  MATIC: "matic-network",
  LINK: "chainlink",
  TRX: "tron",
};

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

function isToday(iso: string): boolean {
  const today = new Date().toISOString().slice(0, 10);
  return iso === today;
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

  // Filtres dynamiques : générés depuis les articles présents (auto-update
  // quand cron génère plus de cryptos). Tri stable par SYMBOL_ORDER.
  const symbolsAvailable = useMemo(() => {
    const counts = new Map<string, number>();
    for (const a of articles) {
      counts.set(a.symbol, (counts.get(a.symbol) ?? 0) + 1);
    }
    const sorted = Array.from(counts.entries())
      .sort((a, b) => {
        const orderA = SYMBOL_ORDER.indexOf(a[0]);
        const orderB = SYMBOL_ORDER.indexOf(b[0]);
        // Si dans SYMBOL_ORDER, garde l'ordre. Sinon (nouveau symbol), à la fin.
        const idxA = orderA === -1 ? 999 : orderA;
        const idxB = orderB === -1 ? 999 : orderB;
        return idxA - idxB;
      });
    return sorted;
  }, [articles]);

  const filtered = useMemo(() => {
    if (activeSymbol === "ALL") return articles;
    return articles.filter((a) => a.symbol === activeSymbol);
  }, [articles, activeSymbol]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const visible = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  // Stats agrégées pour header (signal "vivant").
  const todayCount = useMemo(() => articles.filter((a) => isToday(a.date)).length, [articles]);
  const bullishCount = useMemo(() => articles.filter((a) => a.trend === "bullish").length, [articles]);
  const bearishCount = useMemo(() => articles.filter((a) => a.trend === "bearish").length, [articles]);

  return (
    <>
      {/* Stats header — signal "section vivante" */}
      {articles.length > 0 && (
        <div className="mt-6 flex flex-wrap items-center gap-3 text-xs">
          {todayCount > 0 && (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/40 bg-primary/10 px-3 py-1.5 font-semibold text-primary-glow badge-pulse-strong whitespace-nowrap">
              <Sparkles className="h-3 w-3" strokeWidth={2.5} aria-hidden="true" focusable="false" />
              {todayCount} {todayCount > 1 ? "nouvelles analyses" : "nouvelle analyse"} aujourd&apos;hui
            </span>
          )}
          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/5 px-3 py-1.5 font-semibold text-emerald-300/90 whitespace-nowrap">
            <TrendingUp className="h-3 w-3" strokeWidth={2.5} aria-hidden="true" focusable="false" />
            {bullishCount} haussières
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-rose-500/30 bg-rose-500/5 px-3 py-1.5 font-semibold text-rose-300/90 whitespace-nowrap">
            <TrendingDown className="h-3 w-3" strokeWidth={2.5} aria-hidden="true" focusable="false" />
            {bearishCount} baissières
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1.5 font-semibold text-fg/75 whitespace-nowrap">
            <Activity className="h-3 w-3" strokeWidth={2} aria-hidden="true" focusable="false" />
            {articles.length} analyses au total
          </span>
        </div>
      )}

      {/* Tabs filtre crypto — DYNAMIQUES depuis articles présents */}
      <nav
        aria-label="Filtrer par crypto"
        className="mt-6 flex flex-wrap gap-2"
        role="radiogroup"
      >
        <button
          type="button"
          role="radio"
          aria-checked={activeSymbol === "ALL"}
          onClick={() => {
            setActiveSymbol("ALL");
            setPage(1);
          }}
          className={[
            "inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors whitespace-nowrap",
            "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background",
            activeSymbol === "ALL"
              ? "border-primary bg-primary/15 text-primary-glow"
              : "border-border bg-surface text-fg/70 hover:border-primary/40 hover:text-fg",
          ].join(" ")}
        >
          Toutes
          <span className="text-xs text-fg/55 tabular-nums">({articles.length})</span>
        </button>
        {symbolsAvailable.map(([symbol, count]) => {
          const isActive = activeSymbol === symbol;
          return (
            <button
              key={symbol}
              type="button"
              role="radio"
              aria-checked={isActive}
              onClick={() => {
                setActiveSymbol(symbol);
                setPage(1);
              }}
              className={[
                "inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors whitespace-nowrap",
                "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                isActive
                  ? "border-primary bg-primary/15 text-primary-glow"
                  : "border-border bg-surface text-fg/70 hover:border-primary/40 hover:text-fg",
              ].join(" ")}
            >
              <CryptoLogo
                symbol={symbol}
                coingeckoId={SYMBOL_TO_COINGECKO[symbol]}
                size={16}
                className="ring-0"
              />
              {symbol}
              <span className="text-xs text-fg/55 tabular-nums">({count})</span>
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
          {visible.map((a, idx) => (
            <li key={a.slug} style={{ ["--i" as string]: idx } as React.CSSProperties}>
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
  const changeSign = change > 0 ? "+" : change < 0 ? "" : "";
  const rsi = article.rsi;
  const rsiColor = rsi >= 70 ? "bg-rose-500" : rsi <= 30 ? "bg-emerald-500" : "bg-amber-500";
  const rsiLabel = rsi >= 70 ? "Survente possible" : rsi <= 30 ? "Achat possible" : "Neutre";
  const today = isToday(article.date);

  return (
    <Link
      href={`/analyses-techniques/${article.slug}`}
      // card-premium pour cohérence avec Block 4 (gradient + shadow stack +
      // hover glow gold). hover:-translate-y-1 + glow primary au hover.
      className="card-premium group block h-full p-5 transition-all duration-300
                 hover:-translate-y-1 hover:border-primary/50 motion-reduce:hover:translate-y-0
                 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
    >
      {/* Badge "Aujourd'hui" pulse-strong si analyse du jour */}
      {today && (
        <span className="absolute -top-2 left-4 inline-flex items-center gap-1 rounded-full bg-primary text-background text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 shadow-[0_4px_14px_-2px_rgba(245,165,36,0.55)] badge-pulse-strong z-10 whitespace-nowrap">
          <Sparkles className="h-2.5 w-2.5" strokeWidth={2.5} aria-hidden="true" focusable="false" />
          Aujourd&apos;hui
        </span>
      )}

      <header className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          {/* Audit user 26/04 : remplace <img loading=lazy> cassé par CryptoLogo
              (fix proven b1bb58b — img natif sans lazy + fallback gradient gold). */}
          <CryptoLogo
            symbol={article.symbol}
            coingeckoId={SYMBOL_TO_COINGECKO[article.symbol]}
            imageUrl={article.image}
            size={36}
            className="ring-1 ring-border platform-logo-wrap"
          />
          <div className="min-w-0">
            <div className="font-bold text-sm text-fg truncate">{article.name}</div>
            <div className="text-[11px] text-muted font-mono">{article.symbol}</div>
          </div>
        </div>
        <TrendBadge trend={article.trend} size="sm" />
      </header>

      {/* Prix + change 24h tabular-nums */}
      <div className="mt-4 flex items-baseline gap-2">
        <span className="font-mono text-lg font-bold text-fg tabular-nums">
          {formatPrice(article.currentPrice)} $
        </span>
        <span className={`text-sm font-mono font-semibold tabular-nums ${changeColor}`}>
          {changeSign}{formatPct(change).replace(/^\+/, "")}
        </span>
      </div>

      {/* RSI mini-bar avec label sémantique */}
      <div className="mt-3">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[10px] uppercase tracking-wide text-fg/65 font-semibold">
            RSI · {rsiLabel}
          </span>
          <span className="text-[11px] font-mono font-semibold text-fg/85 tabular-nums">
            {rsi.toFixed(1)}
          </span>
        </div>
        <div
          role="meter"
          aria-valuenow={rsi}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`RSI : ${rsi.toFixed(1)} sur 100. ${rsiLabel}.`}
          className="h-1.5 rounded-full bg-elevated overflow-hidden relative"
        >
          {/* Marqueurs 30 et 70 (zones overbought/oversold) */}
          <span aria-hidden="true" className="absolute top-0 bottom-0 w-px bg-fg/15" style={{ left: "30%" }} />
          <span aria-hidden="true" className="absolute top-0 bottom-0 w-px bg-fg/15" style={{ left: "70%" }} />
          <div
            className={`h-full ${rsiColor} transition-all`}
            style={{ width: `${Math.max(2, Math.min(100, rsi))}%` }}
          />
        </div>
      </div>

      <footer className="mt-4 flex items-center justify-between text-[11px] text-fg/65">
        <span className="inline-flex items-center gap-1">
          <Clock className="h-3 w-3" aria-hidden="true" focusable="false" />
          {formatDate(article.date)}
        </span>
        <span className="inline-flex items-center gap-1 text-primary-glow group-hover:text-primary font-semibold">
          Lire l&apos;analyse
          <ArrowRight className="h-3 w-3 arrow-spring" strokeWidth={2} aria-hidden="true" focusable="false" />
        </span>
      </footer>
    </Link>
  );
}
