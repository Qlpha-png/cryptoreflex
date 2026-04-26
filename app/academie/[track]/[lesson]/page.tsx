/**
 * /academie/[track]/[lesson] — Page leçon = wrapper pédagogique sur un MDX
 * existant de `content/articles/`.
 *
 * Server Component. Réutilise <MdxContent /> (RSC, zéro JS client) pour rendre
 * l'article, ajoute le header pédagogique (track, position N/M), embed la
 * sidebar de progression et la barre <LessonNavigator /> en bas.
 *
 * `generateStaticParams` produit toutes les combinaisons (track × lesson)
 * réellement définies dans `lib/academy-tracks.ts`. Aucun risque de 404 sur
 * une combo invalide — le `notFound()` reste un filet pour les requêtes
 * directes (URL malformée).
 */

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Clock } from "lucide-react";

import MdxContent from "@/components/MdxContent";
import ProgressTracker from "@/components/academy/ProgressTracker";
import LessonNavigator from "@/components/academy/LessonNavigator";
import StructuredData from "@/components/StructuredData";

import { BRAND } from "@/lib/brand";
import { getArticleBySlug } from "@/lib/mdx";
import { TRACKS, getTrack, getLesson, getNeighbors } from "@/lib/academy-tracks";

interface Props {
  params: { track: string; lesson: string };
}

export const revalidate = 86400;

export async function generateStaticParams() {
  // Cartesien track × lesson, avec déduplication implicite (chaque combo unique).
  const out: { track: string; lesson: string }[] = [];
  for (const track of TRACKS) {
    for (const lesson of track.lessons) {
      out.push({ track: track.id, lesson: lesson.articleSlug });
    }
  }
  return out;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const track = getTrack(params.track);
  const lesson = getLesson(params.track, params.lesson);
  if (!track || !lesson) return { title: "Leçon introuvable" };

  const article = await getArticleBySlug(lesson.articleSlug);
  if (!article) return { title: lesson.title };

  const title = `${lesson.title} — Parcours ${track.title} | Académie Cryptoreflex`;
  const url = `${BRAND.url}/academie/${track.id}/${lesson.articleSlug}`;

  return {
    title,
    description: article.description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description: article.description,
      url,
      type: "article",
      siteName: BRAND.name,
      locale: "fr_FR",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description: article.description,
    },
  };
}

export default async function LessonPage({ params }: Props) {
  const track = getTrack(params.track);
  const lesson = getLesson(params.track, params.lesson);
  if (!track || !lesson) notFound();

  const article = await getArticleBySlug(lesson.articleSlug);
  if (!article) notFound();

  const { prev, next } = getNeighbors(params.track, params.lesson);

  // Schema LearningResource — chaque leçon est listée comme partie du Course
  const schema = {
    "@context": "https://schema.org",
    "@type": "LearningResource",
    name: lesson.title,
    description: article.description,
    url: `${BRAND.url}/academie/${track.id}/${lesson.articleSlug}`,
    learningResourceType: "Lesson",
    educationalLevel: track.level,
    timeRequired: `PT${lesson.durationMin}M`,
    inLanguage: "fr-FR",
    isAccessibleForFree: true,
    isPartOf: {
      "@type": "Course",
      name: `Parcours ${track.title} — Académie Cryptoreflex`,
      url: `${BRAND.url}/academie/${track.id}`,
    },
  };

  return (
    <main className="py-8 sm:py-12">
      <StructuredData data={schema} id={`lesson-${lesson.articleSlug}`} />

      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        {/* Breadcrumb + retour */}
        <div className="flex items-center justify-between gap-3 text-xs text-muted">
          <nav aria-label="Fil d'Ariane">
            <Link href="/" className="hover:text-fg">
              Accueil
            </Link>
            <span className="mx-2">/</span>
            <Link href="/academie" className="hover:text-fg">
              Académie
            </Link>
            <span className="mx-2">/</span>
            <Link
              href={`/academie/${track.id}`}
              className="hover:text-fg"
            >
              {track.title}
            </Link>
            <span className="mx-2">/</span>
            <span className="text-fg/80">Leçon {lesson.order}</span>
          </nav>
          <Link
            href={`/academie/${track.id}`}
            className="inline-flex items-center gap-1 hover:text-fg"
          >
            <ArrowLeft className="h-3 w-3" aria-hidden="true" />
            Retour parcours
          </Link>
        </div>

        {/* Layout 2 colonnes */}
        <div className="mt-6 grid gap-8 lg:grid-cols-[1fr_320px]">
          <article>
            {/* Lesson header (= remplace celui de l'article blog) */}
            <header className="mb-8 border-b border-border pb-6">
              <p className="text-xs font-mono uppercase tracking-wider text-primary-soft">
                Parcours {track.title} · Leçon {lesson.order} sur{" "}
                {track.lessons.length}
              </p>
              <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-fg sm:text-4xl">
                {article.title}
              </h1>
              <p className="mt-3 inline-flex items-center gap-1.5 text-xs text-muted">
                <Clock className="h-3 w-3" aria-hidden="true" />
                {lesson.durationMin} min de lecture
              </p>
            </header>

            <MdxContent source={article.content} />

            {/* Navigation prev/next + mark complete */}
            <LessonNavigator
              trackId={track.id}
              trackTitle={track.title}
              current={lesson}
              prev={prev}
              next={next}
              position={lesson.order}
              total={track.lessons.length}
            />
          </article>

          <aside className="lg:sticky lg:top-24 self-start">
            <ProgressTracker
              track={track}
              currentSlug={lesson.articleSlug}
            />
          </aside>
        </div>
      </div>
    </main>
  );
}
