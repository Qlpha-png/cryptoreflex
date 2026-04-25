import Link from "next/link";
import { Calendar, Clock, BookOpen, ShieldCheck } from "lucide-react";

interface AuthorBoxProps {
  author?: string;
  publishedAt?: string;
  updatedAt?: string;
  readingTime?: string;
  /** URL vers la page méthodologie. */
  methodology?: string;
}

/**
 * AuthorBox — petit encart en tête d'article MDX qui affiche l'auteur,
 * les dates de publication et de MAJ, le temps de lecture et un lien
 * vers la méthodologie. Utilisé pour renforcer E-E-A-T (E-A-T).
 */
export default function AuthorBox({
  author = "Cryptoreflex",
  publishedAt,
  updatedAt,
  readingTime,
  methodology,
}: AuthorBoxProps) {
  return (
    <aside className="not-prose my-6 flex flex-wrap items-center gap-x-5 gap-y-2 rounded-2xl border border-border bg-elevated/40 px-5 py-4 text-xs text-fg/75">
      <span className="font-semibold text-fg">Par {author}</span>
      {publishedAt && (
        <span className="inline-flex items-center gap-1.5">
          <Calendar className="h-3.5 w-3.5" />
          Publié : {publishedAt}
        </span>
      )}
      {updatedAt && updatedAt !== publishedAt && (
        <span className="inline-flex items-center gap-1.5">
          <Calendar className="h-3.5 w-3.5 text-accent-green" />
          MAJ : {updatedAt}
        </span>
      )}
      {readingTime && (
        <span className="inline-flex items-center gap-1.5">
          <Clock className="h-3.5 w-3.5" />
          {readingTime}
        </span>
      )}
      {methodology && (
        <Link
          href={methodology}
          className="inline-flex items-center gap-1.5 text-primary-soft hover:text-primary"
        >
          <ShieldCheck className="h-3.5 w-3.5" />
          Méthodologie
        </Link>
      )}
    </aside>
  );
}
