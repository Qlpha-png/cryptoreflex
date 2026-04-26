/**
 * <TrackCard /> — Carte de présentation d'un parcours sur la landing /academie.
 *
 * Server Component. Reçoit un `Track` complet, affiche pitch, niveau, durée,
 * # de leçons, accent gradient, et CTA "Commencer". Le statut de progression
 * (% complété, badge "en cours") est géré par <ProgressTracker /> sur les
 * pages internes — la landing reste 100% statique pour le SEO + perfs.
 */

import Link from "next/link";
import { ArrowRight, Clock, BookOpen, Sprout, Target, Rocket } from "lucide-react";
import type { Track } from "@/lib/academy-tracks";

const ICONS = {
  sprout: Sprout,
  target: Target,
  rocket: Rocket,
} as const;

interface TrackCardProps {
  track: Track;
}

export default function TrackCard({ track }: TrackCardProps) {
  const Icon = ICONS[track.iconKey];
  const lessonCount = track.lessons.length;

  return (
    <Link
      href={`/academie/${track.id}`}
      aria-label={`Parcours ${track.title} — ${lessonCount} leçons, environ ${track.estimatedHours}h`}
      className={`group relative flex h-full flex-col rounded-2xl border bg-gradient-to-br p-6 transition-all hover:shadow-glow-gold focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background ${track.accentClass}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 bg-background/40 text-primary-glow">
          <Icon className="h-5 w-5" aria-hidden="true" />
        </div>
        <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-background/40 px-2.5 py-1 text-[11px] font-mono text-fg/80">
          <Clock className="h-3 w-3" aria-hidden="true" />
          ~{track.estimatedHours}h
        </span>
      </div>

      <h3 className="mt-5 text-2xl font-bold tracking-tight text-fg">
        Parcours {track.title}
      </h3>

      <p className="mt-3 text-sm leading-relaxed text-fg/80 flex-1">
        {track.description}
      </p>

      <dl className="mt-5 grid grid-cols-2 gap-3 text-xs">
        <div className="rounded-lg border border-white/5 bg-background/30 p-2.5">
          <dt className="text-[10px] uppercase tracking-wider text-muted">
            Leçons
          </dt>
          <dd className="mt-0.5 font-mono text-base font-bold text-fg">
            {lessonCount}
          </dd>
        </div>
        <div className="rounded-lg border border-white/5 bg-background/30 p-2.5">
          <dt className="text-[10px] uppercase tracking-wider text-muted">
            Niveau
          </dt>
          <dd className="mt-0.5 text-sm font-semibold text-fg">
            {track.title}
          </dd>
        </div>
      </dl>

      <div className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-primary-glow">
        <BookOpen className="h-4 w-4" aria-hidden="true" />
        Commencer ce parcours
        <ArrowRight
          className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5"
          aria-hidden="true"
        />
      </div>
    </Link>
  );
}
