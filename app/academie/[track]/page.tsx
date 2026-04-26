/**
 * /academie/[track] — Page parcours.
 *
 * Server Component. Liste les leçons du track, embed la sidebar
 * <ProgressTracker /> (Client) et expose un lien vers le quiz final.
 *
 * generateStaticParams : 3 routes statiques (debutant / intermediaire / avance).
 */

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowRight,
  BookOpen,
  Clock,
  GraduationCap,
  Lock,
  PlayCircle,
} from "lucide-react";

import { BRAND } from "@/lib/brand";
import { TRACKS, getTrack } from "@/lib/academy-tracks";
import ProgressTracker from "@/components/academy/ProgressTracker";
import StructuredData from "@/components/StructuredData";

interface Props {
  params: { track: string };
}

export const revalidate = 86400;

export async function generateStaticParams() {
  return TRACKS.map((t) => ({ track: t.id }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const track = getTrack(params.track);
  if (!track) return { title: "Parcours introuvable" };

  const title = `Parcours ${track.title} — Académie crypto Cryptoreflex`;
  const description = `${track.description} ${track.lessons.length} leçons, ~${track.estimatedHours}h, progression suivie.`;
  const url = `${BRAND.url}/academie/${track.id}`;

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      type: "website",
      siteName: BRAND.name,
      locale: "fr_FR",
    },
    twitter: { card: "summary_large_image", title, description },
  };
}

export default function TrackPage({ params }: Props) {
  const track = getTrack(params.track);
  if (!track) notFound();

  const totalMin = track.lessons.reduce((acc, l) => acc + l.durationMin, 0);

  const schema = {
    "@context": "https://schema.org",
    "@type": "Course",
    name: `Parcours ${track.title} — Académie crypto Cryptoreflex`,
    description: track.description,
    url: `${BRAND.url}/academie/${track.id}`,
    provider: {
      "@type": "Organization",
      name: BRAND.name,
      url: BRAND.url,
    },
    inLanguage: "fr-FR",
    educationalLevel: track.level,
    isAccessibleForFree: true,
    hasCourseInstance: {
      "@type": "CourseInstance",
      courseMode: "online",
      courseWorkload: `PT${totalMin}M`,
    },
    hasPart: track.lessons.map((l) => ({
      "@type": "LearningResource",
      name: l.title,
      url: `${BRAND.url}/academie/${track.id}/${l.articleSlug}`,
      timeRequired: `PT${l.durationMin}M`,
    })),
  };

  return (
    <main className="py-10 sm:py-14">
      <StructuredData data={schema} id={`track-${track.id}`} />

      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        {/* Breadcrumb */}
        <nav className="text-xs text-muted" aria-label="Fil d'Ariane">
          <Link href="/" className="hover:text-fg">
            Accueil
          </Link>
          <span className="mx-2">/</span>
          <Link href="/academie" className="hover:text-fg">
            Académie
          </Link>
          <span className="mx-2">/</span>
          <span className="text-fg/80">{track.title}</span>
        </nav>

        {/* Header track */}
        <header className="mt-5 mb-10 max-w-3xl">
          <span className="badge-info">
            <GraduationCap className="h-3.5 w-3.5" aria-hidden="true" />
            Parcours {track.title}
          </span>
          <h1 className="mt-3 ds-h1 leading-[1.1]">
            <span className="text-gradient-gold">{track.title}</span> — académie crypto
          </h1>
          <p className="mt-4 ds-lead">{track.description}</p>

          <dl className="mt-6 flex flex-wrap items-center gap-4 text-xs">
            <Stat label="Leçons" value={String(track.lessons.length)} />
            <Stat label="Durée" value={`~${track.estimatedHours}h`} />
            <Stat
              label="Niveau"
              value={
                track.level === "Beginner"
                  ? "Débutant"
                  : track.level === "Intermediate"
                    ? "Intermédiaire"
                    : "Avancé"
              }
            />
          </dl>
        </header>

        {/* Layout 2 colonnes : lessons + sidebar progression */}
        <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
          <section aria-labelledby="lessons-h">
            <h2
              id="lessons-h"
              className="text-2xl font-bold tracking-tight text-fg"
            >
              Leçons du parcours
            </h2>
            <ol className="mt-5 space-y-3 list-none p-0">
              {track.lessons.map((lesson) => (
                <li key={lesson.articleSlug}>
                  <LessonRow trackId={track.id} lesson={lesson} />
                </li>
              ))}
            </ol>

            {/* Quiz CTA — accessible mais visuellement "lock" si pas terminé */}
            <section
              aria-labelledby="quiz-h"
              className="mt-10 rounded-2xl border border-primary/30 bg-primary/5 p-6"
            >
              <div className="flex items-start gap-4">
                <div className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary-glow">
                  <Lock className="h-5 w-5" aria-hidden="true" />
                </div>
                <div className="flex-1">
                  <h2 id="quiz-h" className="text-lg font-bold text-fg">
                    Quiz de validation — débloque ton certificat
                  </h2>
                  <p className="mt-1 text-sm text-fg/80">
                    5 questions, 4 bonnes réponses minimum pour valider. Une
                    fois validé, tu peux télécharger un certificat personnalisé
                    avec ton nom.
                  </p>
                  <Link
                    href={`/academie/${track.id}/quiz`}
                    className="mt-4 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-background transition-colors hover:bg-primary-glow"
                  >
                    Passer le quiz maintenant
                    <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                  </Link>
                  <p className="mt-2 text-[11px] text-muted">
                    Recommandé : termine d&apos;abord toutes les leçons. Le
                    quiz couvre tout le parcours.
                  </p>
                </div>
              </div>
            </section>
          </section>

          {/* Sidebar progression */}
          <aside className="lg:sticky lg:top-24 self-start">
            <ProgressTracker track={track} />
            <div className="mt-4 rounded-xl border border-border bg-surface p-4 text-xs">
              <p className="font-semibold text-fg">Astuce</p>
              <p className="mt-1 text-muted leading-relaxed">
                Ta progression est sauvegardée dans ton navigateur. Ouvre cette
                page sur le même appareil pour reprendre.
              </p>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}

/* -------------------------------------------------------------------------- */
/*  Sous-composants                                                           */
/* -------------------------------------------------------------------------- */

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-surface px-3 py-2">
      <dt className="text-[10px] uppercase tracking-wider text-muted">
        {label}
      </dt>
      <dd className="mt-0.5 font-mono text-sm font-bold text-fg">{value}</dd>
    </div>
  );
}

function LessonRow({
  trackId,
  lesson,
}: {
  trackId: string;
  lesson: { order: number; articleSlug: string; title: string; durationMin: number };
}) {
  return (
    <Link
      href={`/academie/${trackId}/${lesson.articleSlug}`}
      className="group flex items-center gap-4 rounded-xl border border-border bg-surface p-4 transition-colors hover:border-primary/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
    >
      <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 font-mono text-sm font-bold text-primary-soft">
        {String(lesson.order).padStart(2, "0")}
      </span>
      <div className="flex-1">
        <h3 className="text-sm font-semibold text-fg group-hover:text-primary-glow transition-colors">
          {lesson.title}
        </h3>
        <p className="mt-0.5 inline-flex items-center gap-1 text-[11px] text-muted">
          <Clock className="h-3 w-3" aria-hidden="true" />
          {lesson.durationMin} min
          <span className="mx-1">·</span>
          <BookOpen className="h-3 w-3" aria-hidden="true" />
          Article guidé
        </p>
      </div>
      <PlayCircle
        className="h-5 w-5 text-muted group-hover:text-primary-glow transition-colors"
        aria-hidden="true"
      />
    </Link>
  );
}
