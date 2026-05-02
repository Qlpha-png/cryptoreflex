"use client";

/**
 * <UserLevelBadge /> — mini badge dans la Navbar qui affiche niveau + streak.
 *
 * Étude #16 ETUDE-2026-05-02 — gamification.
 *
 * Comportement :
 *  - Fetch /api/gamification/me au mount + à chaque visibilitychange (focus tab)
 *  - Render rien si pas authentifié OU si l'API retourne degraded (Supabase off)
 *  - Cliquable : navigate vers /mon-compte (où le panneau gamification est rendu)
 *
 * UI :
 *  - Pill compact : "Lv 5" + flame icon si streak > 0
 *  - Tooltip natif title=...  (pas de Radix pour rester léger)
 */

import { useEffect, useState } from "react";
import Link from "next/link";
import { Trophy, Flame } from "lucide-react";

interface ProgressLite {
  xp: number;
  level: number;
  streakDays: number;
  bestStreak: number;
}

export default function UserLevelBadge() {
  const [progress, setProgress] = useState<ProgressLite | null>(null);
  const [degraded, setDegraded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const fetchProgress = async () => {
      try {
        const res = await fetch("/api/gamification/me", {
          credentials: "include",
        });
        if (!res.ok) {
          // 401 anonyme — on n'affiche rien
          if (!cancelled) setProgress(null);
          return;
        }
        const data = await res.json();
        if (cancelled) return;
        if (data?.degraded) {
          setDegraded(true);
          return;
        }
        if (data?.ok && data.progress) {
          setProgress({
            xp: data.progress.xp,
            level: data.progress.level,
            streakDays: data.progress.streakDays,
            bestStreak: data.progress.bestStreak,
          });
        }
      } catch {
        if (!cancelled) setProgress(null);
      }
    };

    fetchProgress();

    const onVisibility = () => {
      if (document.visibilityState === "visible") fetchProgress();
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  if (degraded || !progress) return null;

  const tooltip = `Niveau ${progress.level} · ${progress.xp} XP${
    progress.streakDays > 0
      ? ` · streak ${progress.streakDays}j (record ${progress.bestStreak}j)`
      : ""
  } — clique pour voir ta progression complète.`;

  return (
    <Link
      href="/mon-compte#progression"
      className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-2.5 py-1 text-[11px] font-bold text-primary hover:bg-primary/15 hover:border-primary/50 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      title={tooltip}
      aria-label={tooltip}
    >
      <Trophy className="h-3 w-3" aria-hidden="true" />
      <span className="tabular-nums">Lv {progress.level}</span>
      {progress.streakDays > 0 && (
        <span className="inline-flex items-center gap-0.5 ml-0.5 pl-1.5 border-l border-primary/30 text-amber-300">
          <Flame className="h-3 w-3" aria-hidden="true" />
          <span className="tabular-nums">{progress.streakDays}</span>
        </span>
      )}
    </Link>
  );
}
