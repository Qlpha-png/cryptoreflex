import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, BookOpen, Clock, GraduationCap } from "lucide-react";
import { BRAND } from "@/lib/brand";
import {
  LEVELS_ORDER,
  LEVEL_META,
  getAcademyLessons,
  getLessonCounts,
  getLessonsByLevel,
  type AcademyLesson,
  type AcademyLevel,
} from "@/lib/academie";
import StructuredData from "@/components/StructuredData";

/**
 * /academie — index pédagogique structuré en 3 niveaux.
 *
 * Server Component avec ISR 1 jour. Pas de client JS — tout est statique.
 *
 * Stratégie SEO :
 *   - Page indexable, priorité 0.8 dans le sitemap.
 *   - Schema.org Course (LearningResource) avec les 15 leçons listées comme
 *     hasPart. Google peut afficher des rich snippets "education" sur ce type.
 *   - Linking interne : chaque card → URL existante (blog, outil, glossaire).
 */

const TITLE = "Académie crypto gratuite — 15 leçons pour débuter";
const DESCRIPTION =
  "Académie crypto Cryptoreflex : un parcours en 3 niveaux (débutant, intermédiaire, avancé) avec 15 leçons gratuites pour apprendre à investir crypto sereinement, étape par étape.";

export const revalidate = 86400; // 1 jour

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: `${BRAND.url}/academie` },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: `${BRAND.url}/academie`,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
  },
};

export default function AcademiePage() {
  const lessons = getAcademyLessons();
  const counts = getLessonCounts();

  // Schema.org Course + LearningResource pour chaque leçon (hasPart).
  // On utilise Course plutôt que LearningResource au top level car Google
  // a un meilleur support des rich snippets pour Course.
  const courseSchema = {
    "@context": "https://schema.org",
    "@type": "Course",
    name: "Académie crypto Cryptoreflex",
    description: DESCRIPTION,
    url: `${BRAND.url}/academie`,
    provider: {
      "@type": "Organization",
      name: BRAND.name,
      url: BRAND.url,
    },
    inLanguage: "fr-FR",
    educationalLevel: "Beginner to Advanced",
    isAccessibleForFree: true,
    hasCourseInstance: {
      "@type": "CourseInstance",
      courseMode: "online",
      courseWorkload: `PT${lessons.reduce((acc, l) => acc + l.readingTime, 0)}M`,
    },
    hasPart: lessons.map((l) => ({
      "@type": "LearningResource",
      name: l.title,
      description: l.summary,
      url: `${BRAND.url}${l.targetUrl}`,
      educationalLevel:
        l.level === "debutant"
          ? "Beginner"
          : l.level === "intermediaire"
            ? "Intermediate"
            : "Advanced",
      timeRequired: `PT${l.readingTime}M`,
    })),
  };

  return (
    <article className="py-12 sm:py-16">
      <StructuredData data={courseSchema} id="academie-course" />

      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        {/* Breadcrumb */}
        <nav className="text-xs text-muted">
          <Link href="/" className="hover:text-fg">
            Accueil
          </Link>
          <span className="mx-2">/</span>
          <span className="text-fg/80">Académie</span>
        </nav>

        {/* Header */}
        <header className="mt-6 mb-12 max-w-3xl">
          <span className="badge-info">
            <GraduationCap className="h-3.5 w-3.5" aria-hidden="true" />
            Académie crypto · gratuite
          </span>
          <h1 className="mt-3 ds-h1 leading-[1.1]">
            Académie crypto{" "}
            <span className="text-gradient-gold">Cryptoreflex</span>
          </h1>
          <p className="mt-4 ds-lead">
            Apprends à investir crypto étape par étape. Trois niveaux,
            15&nbsp;leçons, 100&nbsp;% gratuit. On part du zéro absolu et on va
            jusqu&apos;aux sujets pointus (L2, DeFi, restaking).
          </p>

          {/* Mini-stats parcours */}
          <dl className="mt-6 grid grid-cols-3 gap-3 max-w-md">
            {LEVELS_ORDER.map((lvl) => (
              <div
                key={lvl}
                className="rounded-xl border border-border bg-surface p-3 text-center"
              >
                <dt className="text-[10px] uppercase tracking-wider text-muted">
                  Niveau {LEVEL_META[lvl].badge}
                </dt>
                <dd className="mt-1 text-lg font-bold text-fg">
                  {counts[lvl]}{" "}
                  <span className="text-[11px] font-normal text-muted">
                    leçon{counts[lvl] > 1 ? "s" : ""}
                  </span>
                </dd>
              </div>
            ))}
          </dl>
        </header>

        {/* Sections par niveau */}
        <div className="space-y-16">
          {LEVELS_ORDER.map((lvl) => (
            <LevelSection
              key={lvl}
              level={lvl}
              lessons={getLessonsByLevel(lvl)}
            />
          ))}
        </div>

        {/* CTA bas de page */}
        <section
          aria-labelledby="academie-cta"
          className="mt-20 rounded-2xl border border-primary/30 bg-primary/5 p-6 sm:p-8 text-center"
        >
          <h2
            id="academie-cta"
            className="text-xl sm:text-2xl font-bold text-fg"
          >
            Une question, un sujet à approfondir ?
          </h2>
          <p className="mt-2 text-sm text-fg/80 max-w-xl mx-auto">
            Cette V1 couvre les fondamentaux. Pour les sujets non traités ici
            ou plus pointus, plonge dans le blog ou utilise nos outils
            pratiques.
          </p>
          <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
            <Link href="/blog" className="btn-primary text-sm py-2.5">
              <BookOpen className="h-4 w-4" aria-hidden="true" />
              Tous les guides du blog
            </Link>
            <Link href="/outils" className="btn-ghost text-sm py-2.5">
              Voir les outils
            </Link>
          </div>
        </section>
      </div>
    </article>
  );
}

/* -------------------------------------------------------------------------- */
/*  Sous-composants serveur                                                   */
/* -------------------------------------------------------------------------- */

function LevelSection({
  level,
  lessons,
}: {
  level: AcademyLevel;
  lessons: AcademyLesson[];
}) {
  const meta = LEVEL_META[level];
  const headingId = `niveau-${level}`;

  if (lessons.length === 0) return null;

  // Couleur d'accent par niveau — discrète, garde la cohérence du DS.
  const accentBadge =
    level === "debutant"
      ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-200"
      : level === "intermediaire"
        ? "border-amber-500/40 bg-amber-500/10 text-amber-200"
        : "border-fuchsia-500/40 bg-fuchsia-500/10 text-fuchsia-200";

  return (
    <section aria-labelledby={headingId}>
      <header className="mb-6">
        <div className="flex items-center gap-3">
          <span
            className={`inline-flex items-center justify-center h-9 w-9 rounded-xl border text-sm font-bold ${accentBadge}`}
            aria-hidden="true"
          >
            {meta.badge}
          </span>
          <h2
            id={headingId}
            className="text-2xl sm:text-3xl font-bold tracking-tight text-fg"
          >
            Niveau {meta.badge}{" "}
            <span className="text-fg/60 font-normal">— {meta.label}</span>
          </h2>
        </div>
        <p className="mt-2 text-sm text-fg/70 max-w-2xl">{meta.description}</p>
        <p className="mt-1 text-[11px] text-muted font-mono">
          {lessons.length} leçon{lessons.length > 1 ? "s" : ""}
        </p>
      </header>

      <ol className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 list-none p-0 m-0">
        {lessons.map((lesson, idx) => (
          <li key={lesson.id}>
            <LessonCard lesson={lesson} index={idx + 1} />
          </li>
        ))}
      </ol>
    </section>
  );
}

function LessonCard({
  lesson,
  index,
}: {
  lesson: AcademyLesson;
  index: number;
}) {
  return (
    <Link
      href={lesson.targetUrl}
      aria-label={`Leçon ${index} : ${lesson.title} — commencer`}
      className="group flex h-full flex-col rounded-2xl border border-border bg-surface p-5 transition-colors hover:border-primary/40 hover:bg-elevated/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
    >
      <div className="flex items-center justify-between gap-3 mb-3">
        <span className="inline-flex items-center justify-center h-7 w-7 rounded-lg bg-primary/10 text-primary-soft text-xs font-bold">
          {index}
        </span>
        <span className="inline-flex items-center gap-1 text-[11px] font-mono text-muted">
          <Clock className="h-3 w-3" aria-hidden="true" />
          {lesson.readingTime} min
        </span>
      </div>

      <h3 className="text-base font-semibold text-fg leading-snug group-hover:text-primary transition-colors">
        {lesson.title}
      </h3>

      <p className="mt-2 text-sm text-fg/70 leading-relaxed flex-1">
        {lesson.summary}
      </p>

      <div className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-primary-glow">
        Commencer
        <ArrowRight
          className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5"
          aria-hidden="true"
        />
      </div>
    </Link>
  );
}
