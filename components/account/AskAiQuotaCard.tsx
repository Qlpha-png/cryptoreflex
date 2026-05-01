"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Bot, Sparkles, ArrowRight } from "lucide-react";

interface QuotaData {
  plan: string;
  dailyLimit: number;
  used: number;
  remaining: number;
  isPro: boolean;
}

/**
 * AskAiQuotaCard — affiche le quota IA Q&A restant pour la journée.
 * Visible uniquement si l'user est Pro (sinon le parent affiche autre chose).
 *
 * Source : GET /api/me/ask-quota (no-cache).
 * Refresh manuel possible (l'user voit son quota après chaque question).
 */
export default function AskAiQuotaCard() {
  const [data, setData] = useState<QuotaData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/me/ask-quota", { credentials: "include" })
      .then((r) => r.json())
      .then((d) => {
        if (!cancelled) setData(d);
      })
      .catch(() => {
        // Silencieux : si KV down ou réseau, on n'affiche pas la card
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <div className="rounded-2xl border border-border bg-surface/40 p-4 animate-pulse h-32" />
    );
  }

  if (!data || !data.isPro) return null;

  const pct = (data.used / data.dailyLimit) * 100;
  const isLow = data.remaining <= 5;
  const isExhausted = data.remaining === 0;

  return (
    <div className="rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/5 via-background to-background p-5">
      <div className="flex items-start gap-3">
        <div className="shrink-0 grid place-items-center h-10 w-10 rounded-xl bg-primary/15 text-primary">
          <Bot className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline justify-between gap-2 flex-wrap">
            <h3 className="text-sm font-bold text-fg">IA Q&amp;A par fiche crypto</h3>
            <span className="text-[10px] uppercase tracking-wider text-muted font-mono">
              Quota du jour
            </span>
          </div>

          <div className="mt-2 flex items-baseline gap-2">
            <span
              className={`font-mono text-3xl font-extrabold tabular-nums ${
                isExhausted ? "text-muted" : isLow ? "text-amber-400" : "text-primary"
              }`}
            >
              {data.remaining}
            </span>
            <span className="text-sm text-muted">/ {data.dailyLimit} restantes</span>
          </div>

          {/* Progress bar */}
          <div
            className="mt-3 h-1.5 rounded-full bg-elevated overflow-hidden"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={data.dailyLimit}
            aria-valuenow={data.used}
            aria-label={`${data.used} questions utilisées sur ${data.dailyLimit}`}
          >
            <div
              className={`h-full transition-all duration-300 ${
                isExhausted
                  ? "bg-muted"
                  : isLow
                    ? "bg-amber-400"
                    : "bg-gradient-to-r from-primary to-primary-glow"
              }`}
              style={{ width: `${pct}%` }}
            />
          </div>

          <p className="mt-2 text-[11px] text-muted">
            Reset automatique 24h après ta première question. Modèle Claude Haiku
            contextualisé sur chacune des 100 fiches crypto.
          </p>

          {isExhausted ? (
            <p className="mt-2 text-xs text-amber-400">
              Quota atteint. Tu peux poser de nouvelles questions dans &lt; 24h.
            </p>
          ) : (
            <Link
              href="/cryptos"
              className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-primary-soft hover:text-primary transition-colors"
            >
              <Sparkles className="h-3.5 w-3.5" />
              Poser une question sur une fiche
              <ArrowRight className="h-3 w-3" />
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
