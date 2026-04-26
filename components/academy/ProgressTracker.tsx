"use client";

/**
 * <ProgressTracker /> — sidebar / encart de progression du track (Client).
 *
 * Affiche :
 *   - Barre de progression (% complété)
 *   - Liste mini des leçons avec statut (faite / à faire / en cours)
 *   - CTA "Reprendre où j'en étais" → 1re leçon non complétée
 *   - Bouton "Reset progression" (confirmation simple, pas de modal lourde)
 *
 * Hydratation safe :
 *   - On commence avec un état neutre (`isHydrated=false`) pour ne pas
 *     diverger du HTML SSR. Une fois hydraté, on lit le localStorage.
 *   - Aucune valeur localStorage ne fuit au SSR.
 */

import { useEffect, useState } from "react";
import Link from "next/link";
import { CheckCircle2, Circle, RotateCcw, ArrowRight } from "lucide-react";
import type { Lesson, Track } from "@/lib/academy-tracks";
import {
  calculateProgress,
  getNextLessonIndex,
  getProgress,
  resetProgress,
} from "@/lib/academy-progress";

interface ProgressTrackerProps {
  track: Track;
  /** Si true, affiche la liste compacte (sidebar leçon). Sinon, vue track complète. */
  compact?: boolean;
  /** Slug de la leçon actuellement consultée (pour highlight). */
  currentSlug?: string;
}

export default function ProgressTracker({
  track,
  compact = false,
  currentSlug,
}: ProgressTrackerProps) {
  const [isHydrated, setIsHydrated] = useState(false);
  const [completed, setCompleted] = useState<string[]>([]);

  useEffect(() => {
    setIsHydrated(true);
    setCompleted(getProgress(track.id).completedLessons);
  }, [track.id]);

  const progressPct = isHydrated
    ? calculateProgress(track.id, track.lessons)
    : 0;

  const nextIdx = isHydrated ? getNextLessonIndex(track.id, track.lessons) : 0;
  const nextLesson: Lesson | null =
    nextIdx >= 0 ? track.lessons[nextIdx] ?? null : null;

  function handleReset() {
    if (
      typeof window !== "undefined" &&
      window.confirm(
        "Réinitialiser ta progression sur ce parcours ? Tes leçons cochées seront effacées (mais les articles restent accessibles)."
      )
    ) {
      resetProgress(track.id);
      setCompleted([]);
    }
  }

  const doneSet = new Set(completed);

  return (
    <aside
      aria-label={`Progression du parcours ${track.title}`}
      className="rounded-2xl border border-border bg-surface p-5"
    >
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-base font-bold text-fg">Ta progression</h2>
        <span
          className="font-mono text-sm font-semibold text-primary-glow"
          aria-live="polite"
        >
          {progressPct}%
        </span>
      </div>

      {/* Barre de progression — accessible via role progressbar */}
      <div
        role="progressbar"
        aria-valuenow={progressPct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`Progression : ${progressPct} pour cent`}
        className="mt-3 h-2 w-full overflow-hidden rounded-full bg-elevated"
      >
        <div
          className="h-full rounded-full bg-gradient-to-r from-primary to-primary-glow transition-all duration-500"
          style={{ width: `${progressPct}%` }}
        />
      </div>

      <p className="mt-2 text-xs text-muted">
        {isHydrated ? (
          <>
            {doneSet.size} / {track.lessons.length} leçons terminées
          </>
        ) : (
          <span className="opacity-0">…</span>
        )}
      </p>

      {/* CTA "Reprendre" */}
      {isHydrated && nextLesson && progressPct > 0 && progressPct < 100 && (
        <Link
          href={`/academie/${track.id}/${nextLesson.articleSlug}`}
          className="mt-4 inline-flex w-full items-center justify-between gap-2 rounded-lg border border-primary/40 bg-primary/10 px-3 py-2 text-sm font-semibold text-primary-glow transition-colors hover:bg-primary/20"
        >
          <span>Reprendre : {nextLesson.title}</span>
          <ArrowRight className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        </Link>
      )}

      {isHydrated && progressPct === 100 && (
        <Link
          href={`/academie/${track.id}/quiz`}
          className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-background transition-colors hover:bg-primary-glow"
        >
          Passer le quiz final
        </Link>
      )}

      {/* Liste des leçons — version compacte si demandée */}
      {!compact && (
        <ol className="mt-5 space-y-1.5 text-sm">
          {track.lessons.map((lesson) => {
            const isDone = isHydrated && doneSet.has(lesson.articleSlug);
            const isCurrent = currentSlug === lesson.articleSlug;
            return (
              <li key={lesson.articleSlug}>
                <Link
                  href={`/academie/${track.id}/${lesson.articleSlug}`}
                  aria-current={isCurrent ? "page" : undefined}
                  className={`flex items-start gap-2.5 rounded-lg px-2 py-1.5 transition-colors hover:bg-elevated/60 ${
                    isCurrent ? "bg-elevated/80 ring-1 ring-primary/40" : ""
                  }`}
                >
                  {isDone ? (
                    <CheckCircle2
                      className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400"
                      aria-label="Leçon terminée"
                    />
                  ) : (
                    <Circle
                      className="mt-0.5 h-4 w-4 shrink-0 text-muted"
                      aria-label="Leçon à faire"
                    />
                  )}
                  <span
                    className={`flex-1 ${
                      isDone ? "text-muted line-through" : "text-fg/90"
                    }`}
                  >
                    <span className="font-mono text-[11px] text-muted">
                      {String(lesson.order).padStart(2, "0")}.
                    </span>{" "}
                    {lesson.title}
                  </span>
                </Link>
              </li>
            );
          })}
        </ol>
      )}

      {/* Reset — seulement utile s'il y a quelque chose à reset */}
      {isHydrated && doneSet.size > 0 && (
        <button
          type="button"
          onClick={handleReset}
          className="mt-5 inline-flex items-center gap-1.5 text-[11px] text-muted hover:text-danger-fg"
          aria-label="Réinitialiser la progression du parcours"
        >
          <RotateCcw className="h-3 w-3" aria-hidden="true" />
          Réinitialiser
        </button>
      )}
    </aside>
  );
}
