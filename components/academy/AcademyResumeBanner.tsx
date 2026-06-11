"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Flame, PlayCircle } from "lucide-react";
import { TRACKS } from "@/lib/academy-tracks";
import {
  calculateProgress,
  getNextLessonIndex,
  getProgress,
  getStreak,
  isTrackComplete,
} from "@/lib/academy-progress";

/**
 * AcademyResumeBanner — pont "Reprendre où vous en étiez" sur la landing
 * /academie (DA Obsidian sprint 3).
 *
 * La gamification vivait UNIQUEMENT sur /academie/mon-parcours : un
 * visiteur récurrent qui atterrit sur /academie ne voyait aucune trace de
 * sa progression. Ce bandeau client la fait remonter : prochaine leçon du
 * parcours actif le plus récent + streak + lien vers le dashboard complet.
 *
 * SSR-safe : rend null côté serveur et au 1er paint (la landing reste
 * 100 % statique pour le SEO, ce bandeau s'hydrate après mount — même
 * contrat que MonParcoursDashboard). Rend null aussi si aucun parcours
 * n'est entamé (les nouveaux visiteurs voient la landing inchangée).
 */

interface ResumeState {
  trackId: string;
  trackTitle: string;
  lessonTitle: string;
  lessonSlug: string;
  pct: number;
  streak: number;
}

export default function AcademyResumeBanner() {
  const [resume, setResume] = useState<ResumeState | null>(null);

  useEffect(() => {
    // Parcours actif = entamé, non complet, lastLessonAt le plus récent.
    let best: { at: number; state: ResumeState } | null = null;
    for (const track of TRACKS) {
      const progress = getProgress(track.id);
      if (progress.completedLessons.length === 0) continue;
      if (isTrackComplete(track.id, track.lessons)) continue;
      const nextIdx = getNextLessonIndex(track.id, track.lessons);
      if (nextIdx === -1) continue;
      const lesson = track.lessons[nextIdx];
      if (best && progress.lastLessonAt <= best.at) continue;
      best = {
        at: progress.lastLessonAt,
        state: {
          trackId: track.id,
          trackTitle: track.title,
          lessonTitle: lesson.title,
          lessonSlug: lesson.articleSlug,
          pct: calculateProgress(track.id, track.lessons),
          streak: getStreak().current,
        },
      };
    }
    if (best) setResume(best.state);
  }, []);

  if (!resume) return null;

  return (
    <div className="glass-card mt-6 flex flex-col gap-3 rounded-xl p-4 sm:flex-row sm:items-center sm:justify-between animate-fade-in-up">
      <div className="flex items-center gap-3 min-w-0">
        <PlayCircle
          className="h-8 w-8 shrink-0 text-primary-soft"
          strokeWidth={1.5}
          aria-hidden="true"
        />
        <div className="min-w-0">
          <p className="text-xs text-muted">
            Reprendre — {resume.trackTitle} ·{" "}
            <span className="num-data text-ice-fg">{resume.pct}%</span>
            {resume.streak > 1 && (
              <span className="ml-2 inline-flex items-center gap-0.5 text-warning-fg">
                <Flame className="h-3 w-3" aria-hidden="true" />
                {resume.streak} j
              </span>
            )}
          </p>
          <p className="truncate text-sm font-semibold text-fg">
            {resume.lessonTitle}
          </p>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <Link
          href={`/academie/${resume.trackId}/${resume.lessonSlug}`}
          className="btn-primary px-4 py-2 text-sm"
        >
          Continuer
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
        <Link
          href="/academie/mon-parcours"
          className="btn-ghost px-4 py-2 text-sm"
        >
          Mon parcours
        </Link>
      </div>
    </div>
  );
}
