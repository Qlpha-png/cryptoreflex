/**
 * lib/article-dates.ts — date de dernière modification RÉELLE d'un article (lot B4, ronde 1 du jury, 10/10/2026).
 *
 * L'en-tête, l'encadré de confiance, le JSON-LD (dateModified) et les métadonnées Open Graph lisent la MÊME date : la plus
 * récente entre la date de publication, la mise à jour déclarée dans le frontmatter et la dernière correction publiée pour
 * l'article (data/corrections.json, journal public). Une correction du 6 octobre sur un article « mis à jour » le 26 avril
 * ne peut donc plus être contredite par sa propre signature.
 */
import { getCorrectionsForSlug } from "@/lib/corrections";

const ISO = /^\d{4}-\d{2}-\d{2}/;

/** Date ISO (AAAA-MM-JJ) de la dernière modification réelle ; `lastUpdated` absent = date de publication. */
export function derniereModification(article: { slug: string; date: string; lastUpdated?: string }): string {
  const candidates = [article.date, article.lastUpdated, ...getCorrectionsForSlug(article.slug).map((c) => c.date)].filter(
    (d): d is string => typeof d === "string" && ISO.test(d),
  );
  const max = candidates.map((d) => d.slice(0, 10)).sort().at(-1);
  if (!max) return article.date;
  // la valeur d'origine est renvoyée telle quelle quand elle est déjà la plus récente (JSON-LD inchangé pour ces articles)
  return candidates.find((d) => d.slice(0, 10) === max && d !== max && (d === article.lastUpdated || d === article.date)) ?? max;
}
