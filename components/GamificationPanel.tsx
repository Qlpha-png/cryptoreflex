"use client";

/**
 * <GamificationPanel /> — section Progression dans /mon-compte.
 *
 * Étude #16 ETUDE-2026-05-02 — gamification complete UI :
 *  - Cercle XP avec barre de progression circulaire SVG
 *  - Niveau actuel + xp/xpToNext + percentToNext
 *  - Streak actuel + meilleur streak (record perso)
 *  - Grille badges débloqués vs à débloquer (8 cards)
 *
 * Style aligné design system Cryptoreflex (tokens fg/border/primary/amber).
 */

import { useEffect, useState } from "react";
import {
  Trophy,
  Flame,
  Sparkles,
  BookOpen,
  Briefcase,
  Bell,
  FileCheck,
  Diamond,
  Gem,
  Crown,
  Lock,
  type LucideIcon,
} from "lucide-react";

interface BadgeView {
  id: string;
  name: string;
  description: string;
  icon: string;
  unlocked: boolean;
}

interface ProgressView {
  xp: number;
  level: number;
  streakDays: number;
  bestStreak: number;
  badges: string[];
  xpToNext: number;
  percentToNext: number;
  allBadges: BadgeView[];
}

const ICON_MAP: Record<string, LucideIcon> = {
  Sparkles,
  BookOpen,
  Briefcase,
  Bell,
  FileCheck,
  Diamond,
  Gem,
  Crown,
};

export default function GamificationPanel() {
  const [progress, setProgress] = useState<ProgressView | null>(null);
  const [loading, setLoading] = useState(true);
  const [degraded, setDegraded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/gamification/me", { credentials: "include" })
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        if (data?.degraded) {
          setDegraded(true);
          if (data.progress) setProgress(data.progress);
        } else if (data?.ok && data.progress) {
          setProgress(data.progress);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <section
        id="progression"
        className="rounded-2xl border border-border bg-surface p-6 sm:p-8 animate-pulse"
      >
        <div className="h-6 w-48 bg-elevated/60 rounded mb-4" />
        <div className="h-32 bg-elevated/60 rounded" />
      </section>
    );
  }

  if (!progress) {
    return null;
  }

  const radius = 52;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - progress.percentToNext / 100);

  return (
    <section
      id="progression"
      aria-labelledby="progression-title"
      className="rounded-2xl border border-border bg-surface p-6 sm:p-8"
    >
      <div className="flex items-center justify-between gap-3 flex-wrap mb-6">
        <h2
          id="progression-title"
          className="text-xl sm:text-2xl font-bold text-fg flex items-center gap-2"
        >
          <Trophy className="h-5 w-5 text-amber-400" />
          Ta progression
        </h2>
        {degraded && (
          <span className="text-xs text-amber-300/80">
            Données indisponibles temporairement.
          </span>
        )}
      </div>

      {/* KPIs principaux : Cercle XP + Streak */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
        {/* Cercle XP */}
        <div className="flex items-center justify-center md:justify-start gap-4">
          <div className="relative h-32 w-32 shrink-0">
            <svg
              viewBox="0 0 120 120"
              className="h-32 w-32 -rotate-90"
              aria-hidden="true"
            >
              <circle
                cx="60"
                cy="60"
                r={radius}
                stroke="currentColor"
                strokeOpacity={0.12}
                strokeWidth="8"
                fill="none"
                className="text-fg"
              />
              <circle
                cx="60"
                cy="60"
                r={radius}
                stroke="currentColor"
                strokeWidth="8"
                fill="none"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={dashOffset}
                className="text-primary transition-[stroke-dashoffset] duration-700 ease-out"
              />
            </svg>
            <div className="absolute inset-0 grid place-items-center text-center">
              <div>
                <div className="text-[10px] uppercase tracking-wider text-muted">
                  Niveau
                </div>
                <div className="text-3xl font-extrabold text-fg tabular-nums">
                  {progress.level}
                </div>
              </div>
            </div>
          </div>
          <div className="text-sm">
            <div className="font-bold text-fg tabular-nums">
              {progress.xp} XP
            </div>
            <div className="text-xs text-muted mt-0.5">
              {progress.xpToNext > 0
                ? `${progress.xpToNext} XP avant Lv ${progress.level + 1}`
                : "Niveau max actuel"}
            </div>
          </div>
        </div>

        {/* Streak */}
        <div className="rounded-xl border border-amber-400/30 bg-amber-500/5 p-4">
          <div className="flex items-center gap-2 text-amber-300 mb-1">
            <Flame className="h-4 w-4" />
            <span className="text-xs uppercase tracking-wider font-semibold">
              Streak actuel
            </span>
          </div>
          <div className="text-3xl font-extrabold text-fg tabular-nums">
            {progress.streakDays}
            <span className="ml-1 text-sm font-normal text-fg/60">jours</span>
          </div>
          {progress.streakDays === 0 && (
            <div className="mt-1 text-[11px] text-fg/60">
              Visite chaque jour pour démarrer.
            </div>
          )}
        </div>

        {/* Best streak */}
        <div className="rounded-xl border border-border bg-elevated/40 p-4">
          <div className="text-xs uppercase tracking-wider text-muted mb-1 font-semibold">
            Record personnel
          </div>
          <div className="text-3xl font-extrabold text-fg tabular-nums">
            {progress.bestStreak}
            <span className="ml-1 text-sm font-normal text-fg/60">jours</span>
          </div>
          {progress.bestStreak >= 365 && (
            <div className="mt-1 text-[11px] text-amber-300">
              Insider — 1 an+ 🏆
            </div>
          )}
        </div>
      </div>

      {/* Grille badges */}
      <div className="mt-8">
        <h3 className="text-sm font-bold text-fg mb-3">
          Badges{" "}
          <span className="text-muted text-xs ml-1 font-normal">
            ({progress.badges.length} / {progress.allBadges.length})
          </span>
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {progress.allBadges.map((b) => {
            const Icon = ICON_MAP[b.icon] ?? Sparkles;
            return (
              <div
                key={b.id}
                className={`rounded-xl border p-3 transition-colors ${
                  b.unlocked
                    ? "border-amber-400/40 bg-amber-500/5"
                    : "border-border/60 bg-elevated/20 opacity-60"
                }`}
                title={b.description}
              >
                <div className="flex items-center gap-2 mb-1">
                  <div
                    className={`grid place-items-center h-7 w-7 rounded-lg ${
                      b.unlocked
                        ? "bg-amber-500/15 text-amber-400"
                        : "bg-elevated/60 text-fg/60"
                    }`}
                  >
                    {b.unlocked ? (
                      <Icon className="h-3.5 w-3.5" />
                    ) : (
                      <Lock className="h-3.5 w-3.5" />
                    )}
                  </div>
                  <span
                    className={`text-xs font-bold ${
                      b.unlocked ? "text-fg" : "text-fg/60"
                    }`}
                  >
                    {b.name}
                  </span>
                </div>
                <div className="text-[11px] text-fg/65 leading-snug line-clamp-2">
                  {b.description}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
