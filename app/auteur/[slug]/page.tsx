import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Linkedin,
  Mail,
  Clock,
  ShieldCheck,
} from "lucide-react";

import StructuredData from "@/components/StructuredData";
import { getAllArticleSummaries, type ArticleSummary } from "@/lib/mdx";
import {
  authorPersonSchema,
  getAllAuthors,
  getAuthorById,
  DEFAULT_AUTHOR_ID,
} from "@/lib/authors";
import {
  breadcrumbSchema,
  graphSchema,
  organizationSchema,
} from "@/lib/schema";
import { BRAND } from "@/lib/brand";

interface Props {
  params: { slug: string };
}

function XIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className} fill="currentColor">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

export function generateStaticParams() {
  return getAllAuthors().map((a) => ({ slug: a.id }));
}

export function generateMetadata({ params }: Props): Metadata {
  const author = getAuthorById(params.slug);
  if (!author) return {};
  return {
    title: `${author.name} — ${author.role}`,
    description: author.shortBio,
    alternates: { canonical: `/auteur/${author.id}` },
    openGraph: {
      type: "profile",
      title: `${author.name} — ${author.role} de ${BRAND.name}`,
      description: author.shortBio,
      url: `/auteur/${author.id}`,
      images: [author.image],
    },
  };
}

/**
 * Mappe le champ `author` (string libre du frontmatter MDX) vers un id auteur.
 * Stratégie : on accepte soit un id direct (kebab-case présent dans authors.json),
 * soit on retombe sur `DEFAULT_AUTHOR_ID` (Kevin Voisin / Cryptoreflex).
 *
 * Quand on aura plusieurs rédacteurs, il suffira d'ajouter un champ `aliases`
 * à l'auteur dans data/authors.json, puis d'étendre cette résolution.
 */
function resolveAuthorId(rawAuthor: string | undefined): string {
  if (!rawAuthor) return DEFAULT_AUTHOR_ID;
  const slug = rawAuthor
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  // Si le slug correspond à un auteur connu → on l'utilise. Sinon → défaut.
  return getAllAuthors().some((a) => a.id === slug) ? slug : DEFAULT_AUTHOR_ID;
}

export default async function AuthorPage({ params }: Props) {
  const author = getAuthorById(params.slug);
  if (!author) notFound();

  const allArticles = await getAllArticleSummaries();
  const authorArticles: ArticleSummary[] = allArticles
    .filter((a) => resolveAuthorId(a.author) === author.id)
    .sort((a, b) => +new Date(b.date) - +new Date(a.date));

  return (
    <>
      <StructuredData
        id="author-graph"
        data={graphSchema([
          organizationSchema(),
          authorPersonSchema(author),
          breadcrumbSchema([
            { name: "Accueil", url: "/" },
            { name: "Auteurs", url: "/a-propos" },
            { name: author.name, url: `/auteur/${author.id}` },
          ]),
        ])}
      />

      <article className="py-16 sm:py-20">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <Link
            href="/a-propos"
            className="inline-flex items-center gap-2 text-sm text-muted hover:text-fg"
          >
            <ArrowLeft className="h-4 w-4" />
            À propos de {BRAND.name}
          </Link>

          {/* Hero auteur */}
          <header className="mt-8 flex flex-col sm:flex-row gap-6 sm:gap-8">
            <div className="shrink-0">
              <div className="relative h-28 w-28 sm:h-36 sm:w-36 rounded-2xl overflow-hidden bg-elevated ring-2 ring-primary/40">
                <Image
                  src={author.image}
                  alt={`Photo de ${author.name}, ${author.role}`}
                  fill
                  sizes="(min-width: 640px) 144px, 112px"
                  className="object-cover"
                  priority
                />
              </div>
            </div>

            <div className="flex-1 min-w-0">
              <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-fg">
                {author.name}
              </h1>
              <p className="mt-1 text-sm text-muted">{author.role}</p>

              <ul className="mt-4 flex flex-wrap gap-1.5">
                {author.expertise.map((tag) => (
                  <li
                    key={tag}
                    className="inline-flex items-center rounded-full border border-border bg-elevated px-2.5 py-0.5 text-xs text-fg/80"
                  >
                    {tag}
                  </li>
                ))}
              </ul>

              <div className="mt-4 flex flex-wrap items-center gap-2">
                {author.social.linkedin && (
                  <Link
                    href={author.social.linkedin}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-md border border-border bg-elevated px-2.5 py-1 text-xs text-fg/85 hover:border-primary/60 transition-colors"
                  >
                    <Linkedin className="h-3.5 w-3.5" />
                    LinkedIn
                  </Link>
                )}
                {author.social.twitter && (
                  <Link
                    href={author.social.twitter}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-md border border-border bg-elevated px-2.5 py-1 text-xs text-fg/85 hover:border-primary/60 transition-colors"
                  >
                    <XIcon className="h-3.5 w-3.5" />X
                  </Link>
                )}
                {author.social.email && (
                  <Link
                    href={`mailto:${author.social.email}`}
                    className="inline-flex items-center gap-1.5 rounded-md border border-border bg-elevated px-2.5 py-1 text-xs text-fg/85 hover:border-primary/60 transition-colors"
                  >
                    <Mail className="h-3.5 w-3.5" />
                    Email
                  </Link>
                )}
              </div>
            </div>
          </header>

          {/* Bio */}
          <section className="mt-10">
            <h2 className="text-xl font-bold text-fg">Biographie</h2>
            <p className="mt-3 text-fg/85 leading-relaxed">{author.bio}</p>
          </section>

          {/* Crédibilité */}
          {author.credentials && author.credentials.length > 0 && (
            <section className="mt-10">
              <h2 className="text-xl font-bold text-fg">Expérience & expertise</h2>
              <ul className="mt-3 space-y-2">
                {author.credentials.map((c) => (
                  <li key={c} className="flex items-start gap-2 text-fg/85">
                    <ShieldCheck className="h-4 w-4 mt-1 shrink-0 text-primary-soft" />
                    <span>{c}</span>
                  </li>
                ))}
                <li className="flex items-start gap-2 text-fg/85">
                  <ShieldCheck className="h-4 w-4 mt-1 shrink-0 text-primary-soft" />
                  <span>
                    {author.yearsExperience}+ ans dans l'écosystème crypto français
                  </span>
                </li>
              </ul>
            </section>
          )}

          {/* Articles */}
          <section className="mt-12">
            <h2 className="text-xl font-bold text-fg">
              Articles publiés ({authorArticles.length})
            </h2>

            {authorArticles.length === 0 ? (
              <p className="mt-3 text-muted">Aucun article publié pour le moment.</p>
            ) : (
              <ul className="mt-5 space-y-4">
                {authorArticles.map((a) => (
                  <li key={a.slug}>
                    <Link
                      href={`/blog/${a.slug}`}
                      className="block rounded-xl border border-border bg-surface p-5 hover:border-primary/40 hover:bg-surface/80 transition-colors group"
                    >
                      <div className="flex items-center gap-2 text-xs text-muted">
                        <span className="rounded-full bg-elevated px-2 py-0.5 font-semibold text-fg/80">
                          {a.category}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5" />
                          {a.readTime}
                        </span>
                        <span>•</span>
                        <time dateTime={a.date}>
                          {new Date(a.date).toLocaleDateString("fr-FR", {
                            day: "2-digit",
                            month: "long",
                            year: "numeric",
                          })}
                        </time>
                      </div>
                      <h3 className="mt-2 font-semibold text-fg group-hover:text-primary-soft transition-colors">
                        {a.title}
                      </h3>
                      <p className="mt-1 text-sm text-fg/70 line-clamp-2">
                        {a.description}
                      </p>
                      <span className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-primary-soft">
                        Lire l'article
                        <ArrowRight className="h-3.5 w-3.5" />
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </article>
    </>
  );
}
