/**
 * /academie/[track]/quiz — page de quiz final d'un track.
 *
 * Server Component (passe les props au Client <TrackQuiz />).
 * Pré-génère les 3 routes statiques.
 */

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Award } from "lucide-react";

import { BRAND } from "@/lib/brand";
import { TRACKS, getTrack } from "@/lib/academy-tracks";
import { getQuizForTrack } from "@/lib/academy-quizzes";
import TrackQuiz from "@/components/academy/TrackQuiz";

interface Props {
  params: { track: string };
}

export const revalidate = 86400;

export async function generateStaticParams() {
  return TRACKS.map((t) => ({ track: t.id }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const track = getTrack(params.track);
  if (!track) return { title: "Quiz introuvable" };

  const title = `Quiz final — Parcours ${track.title} | Académie Cryptoreflex`;
  const description = `Quiz de validation du parcours ${track.title} : 5 questions, 4 bonnes réponses minimum pour valider et débloquer le certificat.`;
  const url = `${BRAND.url}/academie/${track.id}/quiz`;

  return {
    title,
    description,
    alternates: { canonical: url },
    // Pas d'OG image custom — on garde simple.
    openGraph: {
      title,
      description,
      url,
      type: "website",
      siteName: BRAND.name,
      locale: "fr_FR",
    },
    twitter: { card: "summary", title, description },
    // Le quiz est interactif et n'apporte pas de valeur SEO indexée — noindex.
    robots: { index: false, follow: true },
  };
}

export default function QuizPage({ params }: Props) {
  const track = getTrack(params.track);
  const questions = getQuizForTrack(params.track);
  if (!track || !questions) notFound();

  return (
    <main className="py-10 sm:py-14">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
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
          <Link
            href={`/academie/${track.id}`}
            className="hover:text-fg"
          >
            {track.title}
          </Link>
          <span className="mx-2">/</span>
          <span className="text-fg/80">Quiz final</span>
        </nav>

        {/* Header */}
        <header className="mt-5 mb-8">
          <span className="badge-info">
            <Award className="h-3.5 w-3.5" aria-hidden="true" />
            Quiz de validation · {track.title}
          </span>
          <h1 className="mt-3 ds-h1 leading-[1.1]">
            Quiz final —{" "}
            <span className="text-gradient-gold">{track.title}</span>
          </h1>
          <p className="mt-3 ds-lead">
            5 questions tirées des leçons que tu viens de suivre. Avec 4 bonnes
            réponses minimum, tu débloques ton certificat personnalisé téléchargeable.
          </p>
        </header>

        <TrackQuiz
          trackId={track.id}
          trackTitle={track.title}
          questions={questions}
        />

        <div className="mt-8 text-center">
          <Link
            href={`/academie/${track.id}`}
            className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-fg"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Retour au parcours
          </Link>
        </div>
      </div>
    </main>
  );
}
