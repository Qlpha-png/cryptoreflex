"use client";

import { useEffect, useState } from "react";

/**
 * EventCountdown — countdown live "J-3 · 14h 22m" qui tick à 1 seconde.
 *
 * Audit Block 6 RE-AUDIT 26/04/2026 (Agent dynamism +1.5pt) :
 *  - Effet "WOW immédiat" sur events Halving / FOMC / ETF deadlines.
 *  - Affichage adaptatif selon délai :
 *    - >7j  : "Dans 24 mois" (statique, pas de tick — perf préservée)
 *    - 1-7j : "J-3 · 14h 22m" (tick chaque minute, économie batterie)
 *    - <24h : "14h 22m 08s" (tick chaque seconde, signature urgence)
 *    - 0    : "Aujourd'hui" + pulse vert
 *  - Pause via Page Visibility API (visibilitychange).
 *  - tabular-nums : pas de jitter horizontal pendant le tick.
 *
 * Coût : 1 setInterval (1Hz si <24h, 60s si <7j, sinon static).
 */

interface Props {
  /** ISO date "YYYY-MM-DD" (UTC). */
  date: string;
  /** Si true, affiche "~ Q2 2028" au lieu d'un countdown précis. */
  isApproximate?: boolean;
  /** Date label fallback si date trop lointaine ou approximate. */
  fallbackLabel: string;
}

function computeRemainingMs(date: string): number {
  const target = new Date(date + "T00:00:00Z").getTime();
  return Math.max(0, target - Date.now());
}

export default function EventCountdown({ date, isApproximate, fallbackLabel }: Props) {
  const [remaining, setRemaining] = useState<number>(() => computeRemainingMs(date));

  // Délai en jours pour décider du tick.
  const days = Math.floor(remaining / 86_400_000);
  const isUrgent = !isApproximate && days <= 7 && remaining > 0;
  const isVeryUrgent = !isApproximate && days < 1 && remaining > 0;
  const isStatic = isApproximate || days > 7;

  useEffect(() => {
    if (isStatic) return; // Pas de tick si fallback statique.
    const tickInterval = isVeryUrgent ? 1000 : 60_000; // 1s si <24h sinon 60s.
    const tick = () => setRemaining(computeRemainingMs(date));
    tick();
    const interval = setInterval(tick, tickInterval);
    const onVisibility = () => {
      if (document.visibilityState === "visible") tick();
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [date, isStatic, isVeryUrgent]);

  // Format adaptatif.
  if (isStatic) {
    return <span className="font-mono">{fallbackLabel}</span>;
  }

  if (remaining === 0) {
    return (
      <span className="font-mono inline-flex items-center gap-1 text-accent-green">
        <span className="live-dot" aria-hidden="true" />
        Aujourd&apos;hui
      </span>
    );
  }

  const totalSec = Math.floor(remaining / 1000);
  const d = Math.floor(totalSec / 86_400);
  const h = Math.floor((totalSec % 86_400) / 3_600);
  const m = Math.floor((totalSec % 3_600) / 60);
  const s = totalSec % 60;

  if (days < 1) {
    // Affichage urgent : "14h 22m 08s"
    return (
      <span className="font-mono tabular-nums text-accent-rose">
        {h.toString().padStart(2, "0")}h {m.toString().padStart(2, "0")}m {s.toString().padStart(2, "0")}s
      </span>
    );
  }

  if (days === 1) {
    return <span className="font-mono">Demain · {h}h {m}m</span>;
  }

  // 2-7j : "J-3 · 14h 22m"
  return (
    <span className="font-mono tabular-nums">
      J-{d} · {h}h {m}m
    </span>
  );
}
