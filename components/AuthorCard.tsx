/**
 * <AuthorCard /> — bloc auteur E-E-A-T pour articles & pages YMYL.
 *
 * Variantes :
 *  - "compact"  : ligne dense (haut d'article — sous H1)
 *  - "full"     : carte détaillée avec bio + expertise (bas d'article)
 *
 * Utilisation :
 *   <AuthorCard authorId="kevin-voisin" variant="compact" date="2026-04-25" readTime="8 min" />
 *   <AuthorCard authorId="kevin-voisin" variant="full" />
 */

import Image from "next/image";
import Link from "next/link";
import { Linkedin, Mail, Clock, BadgeCheck } from "lucide-react";
import { getAuthorByIdOrDefault, type Author } from "@/lib/authors";

interface AuthorCardProps {
  authorId?: string;
  variant?: "compact" | "full";
  /** ISO date — affiché en variante compact uniquement. */
  date?: string;
  /** Ex. "8 min" — affiché en variante compact uniquement. */
  readTime?: string;
  /** ISO date — "Mis à jour le …" affiché si fourni. */
  dateModified?: string;
}

/** Icône X (Twitter) — Lucide n'expose plus le logo X moderne. */
function XIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className={className}
      fill="currentColor"
    >
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function SocialLinks({ author }: { author: Author }) {
  return (
    <div className="flex items-center gap-2">
      {author.social.linkedin && (
        <Link
          href={author.social.linkedin}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`LinkedIn de ${author.name}`}
          className="p-1.5 rounded-md border border-border hover:border-primary/60 text-muted hover:text-fg transition-colors"
        >
          <Linkedin className="h-3.5 w-3.5" />
        </Link>
      )}
      {author.social.twitter && (
        <Link
          href={author.social.twitter}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`X (Twitter) de ${author.name}`}
          className="p-1.5 rounded-md border border-border hover:border-primary/60 text-muted hover:text-fg transition-colors"
        >
          <XIcon className="h-3.5 w-3.5" />
        </Link>
      )}
      {author.social.email && (
        <Link
          href={`mailto:${author.social.email}`}
          aria-label={`Email ${author.name}`}
          className="p-1.5 rounded-md border border-border hover:border-primary/60 text-muted hover:text-fg transition-colors"
        >
          <Mail className="h-3.5 w-3.5" />
        </Link>
      )}
    </div>
  );
}

export default function AuthorCard({
  authorId,
  variant = "compact",
  date,
  readTime,
  dateModified,
}: AuthorCardProps) {
  const author = getAuthorByIdOrDefault(authorId);
  const profileUrl = `/auteur/${author.id}`;

  if (variant === "compact") {
    return (
      <div className="not-prose flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border border-border bg-surface/60 px-4 py-3">
        <Link href={profileUrl} className="flex items-center gap-3 group">
          <span className="relative h-10 w-10 rounded-full overflow-hidden bg-elevated ring-1 ring-border">
            <Image
              src={author.image}
              alt={`Photo de ${author.name}`}
              fill
              sizes="40px"
              className="object-cover"
            />
          </span>
          <span className="leading-tight">
            <span className="block text-sm font-semibold text-fg group-hover:text-primary-soft transition-colors">
              {author.name}
            </span>
            <span className="block text-xs text-muted">{author.role}</span>
          </span>
        </Link>

        <div className="flex items-center gap-3 text-xs text-muted ml-auto">
          {readTime && (
            <span className="inline-flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              {readTime}
            </span>
          )}
          {date && <span>Publié le {formatDate(date)}</span>}
          {dateModified && dateModified !== date && (
            <span className="inline-flex items-center gap-1 text-primary-soft">
              <BadgeCheck className="h-3.5 w-3.5" />
              MAJ {formatDate(dateModified)}
            </span>
          )}
        </div>
      </div>
    );
  }

  // variant === "full"
  return (
    <aside
      className="not-prose mt-12 rounded-2xl border border-border bg-surface p-6 sm:p-8"
      aria-label={`À propos de l'auteur, ${author.name}`}
    >
      <div className="flex flex-col sm:flex-row gap-6">
        <Link
          href={profileUrl}
          className="shrink-0 self-start"
          aria-label={`Voir tous les articles de ${author.name}`}
        >
          <span className="relative block h-20 w-20 rounded-full overflow-hidden bg-elevated ring-2 ring-primary/30">
            <Image
              src={author.image}
              alt={`Photo de ${author.name}, ${author.role} de Cryptoreflex`}
              fill
              sizes="80px"
              className="object-cover"
            />
          </span>
        </Link>

        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <Link
              href={profileUrl}
              className="text-lg font-bold text-fg hover:text-primary-soft transition-colors"
            >
              {author.name}
            </Link>
            <span className="text-sm text-muted">{author.role}</span>
          </div>

          <p className="mt-2 text-sm text-fg/80 leading-relaxed">
            {author.shortBio}
          </p>

          {author.expertise.length > 0 && (
            <ul className="mt-3 flex flex-wrap gap-1.5">
              {author.expertise.map((tag) => (
                <li
                  key={tag}
                  className="inline-flex items-center rounded-full border border-border bg-elevated px-2.5 py-0.5 text-xs text-fg/80"
                >
                  {tag}
                </li>
              ))}
            </ul>
          )}

          <div className="mt-4 flex flex-wrap items-center gap-4">
            <Link
              href={profileUrl}
              className="text-sm font-semibold text-primary-soft hover:underline"
            >
              Tous ses articles &rarr;
            </Link>
            <SocialLinks author={author} />
          </div>
        </div>
      </div>
    </aside>
  );
}
