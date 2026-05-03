"use client";

/**
 * <LessonNavigator /> — barre de navigation Prev / Mark Complete / Next
 * en bas d'une leçon. Client Component (toggle localStorage).
 *
 * Bug-evité : on ne pré-affiche PAS l'état "complété" au SSR, sinon il
 * flicke après hydratation. On rend un placeholder cohérent en attendant.
 */

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { safeNavigate } from "@/lib/safe-navigate";
import { ArrowLeft, ArrowRight, CheckCircle2, Circle } from "lucide-react";
import type { Lesson, TrackId } from "@/lib/academy-tracks";
import {
  getProgress,
  markLessonComplete,
  unmarkLessonComplete,
} from "@/lib/academy-progress";

interface LessonNavigatorProps {
  trackId: TrackId;
  trackTitle: string;
  current: Lesson;
  prev: Lesson | null;
  next: Lesson | null;
  /** Position 1-indexed pour affichage. */
  position: number;
  total: number;
}

export default function LessonNavigator({
  trackId,
  trackTitle,
  current,
  prev,
  next,
  position,
  total,
}: LessonNavigatorProps) {
  const router = useRouter();
  const [isHydrated, setIsHydrated] = useState(false);
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    setIsHydrated(true);
    const progress = getProgress(trackId);
    setIsComplete(progress.completedLessons.includes(current.articleSlug));
  }, [trackId, current.articleSlug]);

  function handleToggle() {
    if (isComplete) {
      unmarkLessonComplete(trackId, current.articleSlug);
      setIsComplete(false);
    } else {
      markLessonComplete(trackId, current.articleSlug);
      setIsComplete(true);
    }
  }

  function handleMarkAndNext() {
    if (!isComplete) {
      markLessonComplete(trackId, current.articleSlug);
      setIsComplete(true);
    }
    if (next) {
      // BATCH 53 — wallet-aware safe nav (cf. lib/safe-navigate.ts)
      safeNavigate(router, `/academie/${trackId}/${next.articleSlug}`);
    } else {
      // Dernière leçon → renvoie vers le quiz
      safeNavigate(router, `/academie/${trackId}/quiz`);
    }
  }

  return (
    <nav
      aria-label={`Navigation leçon ${position} sur ${total} — parcours ${trackTitle}`}
      className="not-prose mt-12 rounded-2xl border border-border bg-surface p-5 sm:p-6"
    >
      <div className="flex items-center justify-between gap-3 text-xs text-muted">
        <span className="font-mono">
          Leçon {position} / {total}
        </span>
        <Link
          href={`/academie/${trackId}`}
          className="hover:text-fg"
          aria-label={`Retour au parcours ${trackTitle}`}
        >
          ↩ Retour parcours
        </Link>
      </div>

      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {/* Prev */}
        {prev ? (
          <Link
            href={`/academie/${trackId}/${prev.articleSlug}`}
            className="inline-flex items-center gap-2 rounded-lg border border-border bg-elevated/40 px-3.5 py-2 text-sm text-fg/90 transition-colors hover:border-primary/40 hover:text-fg"
            aria-label={`Leçon précédente : ${prev.title}`}
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            <span className="hidden sm:inline">Précédente</span>
          </Link>
        ) : (
          <span aria-hidden="true" className="hidden sm:block sm:w-32" />
        )}

        {/* Mark complete toggle */}
        <button
          type="button"
          onClick={handleToggle}
          aria-pressed={isComplete}
          aria-label={
            isComplete
              ? "Retirer cette leçon des leçons terminées"
              : "Marquer cette leçon comme terminée"
          }
          className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
            isComplete
              ? "border border-emerald-500/40 bg-emerald-500/10 text-emerald-200 hover:bg-emerald-500/20"
              : "border border-border bg-elevated/40 text-fg/90 hover:border-primary/40 hover:text-fg"
          }`}
        >
          {!isHydrated ? (
            <Circle className="h-4 w-4 opacity-50" aria-hidden="true" />
          ) : isComplete ? (
            <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
          ) : (
            <Circle className="h-4 w-4" aria-hidden="true" />
          )}
          {isComplete ? "Leçon terminée" : "Marquer comme terminée"}
        </button>

        {/* Next or finish */}
        <button
          type="button"
          onClick={handleMarkAndNext}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-background transition-colors hover:bg-primary-glow"
          aria-label={
            next
              ? `Marquer terminé et passer à : ${next.title}`
              : "Marquer terminé et passer au quiz final"
          }
        >
          {next ? "Suivante" : "Quiz final"}
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    </nav>
  );
}
