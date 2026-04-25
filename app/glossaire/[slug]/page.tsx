import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Lightbulb,
  Tag,
  Calendar,
  GraduationCap,
} from "lucide-react";
import {
  GLOSSARY_TERMS,
  buildDefinedTermSchema,
  getTermById,
  type GlossaryDifficulty,
} from "@/lib/glossary";
import { BRAND } from "@/lib/brand";

// SSG : pré-générer toutes les pages au build pour SEO maximal.
export function generateStaticParams() {
  return GLOSSARY_TERMS.map((t) => ({ slug: t.id }));
}

// Pas de fallback dynamique : on connaît tous les slugs au build.
export const dynamicParams = false;

interface PageProps {
  params: { slug: string };
}

export function generateMetadata({ params }: PageProps): Metadata {
  const term = getTermById(params.slug);
  if (!term) {
    return {
      title: "Terme introuvable",
      robots: { index: false, follow: false },
    };
  }

  const title = `${term.term} : définition crypto simple`;
  const description = term.shortDefinition;
  const url = `${BRAND.url}/glossaire/${term.id}`;

  return {
    title,
    description,
    keywords: [
      term.term,
      `${term.term} définition`,
      `${term.term} crypto`,
      `c'est quoi ${term.term.toLowerCase()}`,
      ...term.synonyms,
    ],
    alternates: { canonical: url },
    openGraph: {
      title: `${term.term} — Glossaire ${BRAND.name}`,
      description,
      type: "article",
      url,
    },
    twitter: {
      card: "summary",
      title: `${term.term} — Glossaire ${BRAND.name}`,
      description,
    },
  };
}

export default function GlossaryTermPage({ params }: PageProps) {
  const term = getTermById(params.slug);
  if (!term) notFound();

  const related = term.relatedTerms
    .map((id) => getTermById(id))
    .filter((t): t is NonNullable<typeof t> => Boolean(t));

  const definedTermSchema = buildDefinedTermSchema(term, BRAND.url);

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Accueil", item: BRAND.url },
      {
        "@type": "ListItem",
        position: 2,
        name: "Glossaire",
        item: `${BRAND.url}/glossaire`,
      },
      {
        "@type": "ListItem",
        position: 3,
        name: term.term,
        item: `${BRAND.url}/glossaire/${term.id}`,
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(definedTermSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />

      <article className="py-12 sm:py-16">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          {/* Breadcrumb */}
          <nav aria-label="Fil d'Ariane" className="text-sm text-muted">
            <ol className="flex flex-wrap items-center gap-1.5">
              <li>
                <Link href="/" className="hover:text-white">
                  Accueil
                </Link>
              </li>
              <li aria-hidden="true">/</li>
              <li>
                <Link href="/glossaire" className="hover:text-white">
                  Glossaire
                </Link>
              </li>
              <li aria-hidden="true">/</li>
              <li className="text-white" aria-current="page">
                {term.term}
              </li>
            </ol>
          </nav>

          {/* Retour */}
          <Link
            href="/glossaire"
            className="mt-4 inline-flex items-center gap-1.5 text-sm text-primary-soft hover:text-primary"
          >
            <ArrowLeft className="h-4 w-4" />
            Retour au glossaire
          </Link>

          {/* Header */}
          <header className="mt-6">
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-2.5 py-1 font-semibold text-primary-soft">
                <Tag className="h-3 w-3" />
                {term.category}
              </span>
              <DifficultyBadge level={term.difficulty} />
              <span className="inline-flex items-center gap-1.5 text-muted">
                <Calendar className="h-3 w-3" />
                Mis à jour le{" "}
                {new Date(term.lastUpdated).toLocaleDateString("fr-FR", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </span>
            </div>

            <h1 className="mt-4 text-4xl sm:text-5xl font-extrabold tracking-tight">
              {term.term}
            </h1>

            <p className="mt-4 text-lg text-white/80 leading-relaxed">
              {term.shortDefinition}
            </p>

            {term.synonyms.length > 0 && (
              <p className="mt-3 text-sm text-muted">
                <span className="text-white/60">Aussi appelé : </span>
                {term.synonyms.map((s, i) => (
                  <span key={s}>
                    <em className="text-white/80 not-italic">{s}</em>
                    {i < term.synonyms.length - 1 ? ", " : ""}
                  </span>
                ))}
              </p>
            )}
          </header>

          {/* Définition longue */}
          <section className="mt-10 rounded-2xl border border-border bg-elevated/40 p-6 sm:p-8">
            <h2 className="flex items-center gap-2 text-xl font-bold text-white">
              <BookOpen className="h-5 w-5 text-primary" />
              Définition complète
            </h2>
            <div className="mt-4 space-y-4 text-white/85 leading-relaxed">
              {term.longDefinition.split("\n\n").map((para, i) => (
                <p key={i}>{para}</p>
              ))}
            </div>
          </section>

          {/* Exemple concret */}
          {term.example && (
            <section className="mt-6 rounded-2xl border border-warning-border bg-warning-soft p-6">
              <h2 className="flex items-center gap-2 text-base font-bold text-warning-fg">
                <Lightbulb className="h-4 w-4" />
                Exemple concret
              </h2>
              <p className="mt-2 text-white/85 leading-relaxed">{term.example}</p>
            </section>
          )}

          {/* Termes liés */}
          {related.length > 0 && (
            <section className="mt-10">
              <h2 className="text-xl font-bold text-white">Termes liés</h2>
              <p className="mt-1 text-sm text-muted">
                Pour aller plus loin sur des concepts proches.
              </p>
              <ul className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                {related.map((r) => (
                  <li key={r.id}>
                    <Link
                      href={`/glossaire/${r.id}`}
                      className="group flex items-start gap-3 rounded-xl border border-border bg-elevated/40 p-4 hover:border-primary/60 hover:bg-elevated/70 transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-white group-hover:text-primary-soft">
                          {r.term}
                        </h3>
                        <p className="mt-1 text-sm text-white/70 line-clamp-2">
                          {r.shortDefinition}
                        </p>
                      </div>
                      <ArrowRight className="h-4 w-4 text-muted shrink-0 mt-1 group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* CTA bas de page */}
          <section className="mt-12 rounded-2xl border border-border bg-surface/40 p-6 text-center">
            <p className="text-white/80">
              Vous débutez en crypto&nbsp;?{" "}
              <Link
                href="/blog"
                className="text-primary-soft hover:text-primary underline-offset-2 hover:underline font-semibold"
              >
                Consultez nos guides
              </Link>{" "}
              ou{" "}
              <Link
                href="/#plateformes"
                className="text-primary-soft hover:text-primary underline-offset-2 hover:underline font-semibold"
              >
                comparez les plateformes recommandées
              </Link>
              .
            </p>
          </section>
        </div>
      </article>
    </>
  );
}

function DifficultyBadge({ level }: { level: GlossaryDifficulty }) {
  const styles: Record<GlossaryDifficulty, string> = {
    Débutant: "border-success-border bg-success-soft text-success-fg",
    Intermédiaire: "border-info-border bg-info-soft text-info-fg",
    Avancé: "border-danger-border bg-danger-soft text-danger-fg",
  };
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-semibold ${styles[level]}`}
    >
      <GraduationCap className="h-3 w-3" />
      {level}
    </span>
  );
}
