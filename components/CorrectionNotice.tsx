import Link from "next/link";
import { getCorrectionsForSlug } from "@/lib/corrections";
import { formatDateFr } from "@/lib/engagements";

/**
 * Mention « Corrigé le … » en bas d'un article (06/10/2026) : tient la promesse de /charte (« Pas de correction
 * silencieuse »). Ne rend rien si l'article n'a aucune entrée dans data/corrections.json.
 *
 * Branchement (gabarit d'article, hors de ce lot) : <CorrectionNotice slug={article.slug} /> en fin d'article,
 * avant la signature. Composant serveur, sans état.
 */
/** Ajoute un point final si le texte n'en a pas. */
const endDot = (s: string) => (/[.!?…]$/.test(s.trim()) ? s : `${s}.`);

export default function CorrectionNotice({ slug }: { slug: string }) {
  const corrections = getCorrectionsForSlug(slug);
  if (corrections.length === 0) return null;
  return (
    <aside
      aria-label="Corrections apportées à cet article"
      className="not-prose mt-10 rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 text-sm text-fg/85"
    >
      <ul className="space-y-2">
        {corrections.map((c, i) => (
          <li key={`${c.date}-${i}`}>
            <strong className="text-fg">Corrigé le {formatDateFr(c.date)}.</strong> {endDot(c.nature)}
            <span className="mt-1 block">Avant&nbsp;: {endDot(c.avant)}</span>
            <span className="block">Après&nbsp;: {endDot(c.après)}</span>
          </li>
        ))}
      </ul>
      <p className="mt-2 text-xs text-muted">
        Toutes les corrections du site sont listées dans le{" "}
        <Link href="/corrections" className="text-primary-soft underline hover:text-primary">
          journal des corrections
        </Link>
        .
      </p>
    </aside>
  );
}
