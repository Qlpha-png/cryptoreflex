/**
 * lib/auto-publication.ts — ligne « Publiée automatiquement » des actualités et des analyses techniques.
 *
 * Décision D3 de Kev (06/10/2026) : les actualités (/actualites/[slug]) et les analyses techniques
 * (/analyses-techniques/[slug]) sont publiées automatiquement. Elles ne portent plus la fiche auteur de Kevin Voisin
 * ni une signature d'équipe : une seule ligne discrète « Publiée automatiquement à partir de [source] », la source
 * étant lue dans le frontmatter ; sans source, « Publiée automatiquement. ». Les articles de fond (/blog) restent
 * signés Kevin Voisin (lib/authors.ts, articleAuthorId).
 *
 * 07/10/2026 — règlement européen sur l'IA, art. 50(4), applicable depuis le 02/08/2026 : un texte publié pour
 * informer le public et généré par IA doit le dire, sauf relecture de fond par une personne compétente qui en porte
 * la responsabilité (FAQ de la Commission, mise à jour le 24/07/2026). Les ACTUALITÉS et le BRIEF sont rédigés par une
 * IA (scripts/generate-daily-content.mjs : publication seulement si l'IA a rédigé, gabarits purgés le 29/05/2026 ;
 * scripts/generate-daily-brief.mjs) → « Rédigée par une IA … ». Les ANALYSES TECHNIQUES sont produites par un gabarit
 * à partir d'indicateurs calculés, sans IA → la mention reste « Publiée automatiquement ».
 */

export interface AutoSource {
  name: string;
  /** Lien http(s) vers la source, ou null s'il manque (le nom est alors affiché sans lien). */
  url: string | null;
}

export interface AutoSourceFrontmatter {
  source?: string | null;
  sourceUrl?: string | null;
  /** Brèves : « Nom — https://… », une entrée par source. */
  sources?: string[] | null;
}

const httpUrl = (u?: string | null): string | null => {
  const t = (u ?? "").trim();
  return /^https?:\/\/\S+$/i.test(t) ? t : null;
};

/** Valeurs de repli de lib/news-mdx.ts quand le frontmatter n'a pas de source : traitées comme « pas de source ». */
const PLACEHOLDER_NAMES = new Set(["", "inconnu", "unknown", "#"]);

/** Sources citées par le frontmatter (brèves : champ sources ; actualités : source + sourceUrl). */
export function autoPublicationSources(fm: AutoSourceFrontmatter): AutoSource[] {
  const out: AutoSource[] = [];
  if (Array.isArray(fm.sources) && fm.sources.length > 0) {
    for (const raw of fm.sources) {
      const [name, url] = String(raw).split(/\s+—\s+/);
      const n = (name ?? "").trim();
      if (PLACEHOLDER_NAMES.has(n.toLowerCase())) continue;
      out.push({ name: n, url: httpUrl(url) });
    }
    return out;
  }
  const n = (fm.source ?? "").trim();
  if (!PLACEHOLDER_NAMES.has(n.toLowerCase())) out.push({ name: n, url: httpUrl(fm.sourceUrl) });
  return out;
}

/** « A », « A et B », « A, B et C ». */
export function joinFr(names: string[]): string {
  if (names.length <= 1) return names.join("");
  return `${names.slice(0, -1).join(", ")} et ${names[names.length - 1]}`;
}

/**
 * Texte brut de la ligne (sert aussi aux tests). Sans IA : « Publiée automatiquement à partir de X. » ou « Publiée
 * automatiquement. ». Rédigée par une IA : « Rédigée par une IA à partir de X et publiée automatiquement. » ou
 * « Rédigée par une IA et publiée automatiquement. ».
 */
export function autoPublicationText(sources: AutoSource[], redigeeParIA = false): string {
  const noms = joinFr(sources.map((s) => s.name));
  if (redigeeParIA) return sources.length === 0 ? "Rédigée par une IA et publiée automatiquement." : `Rédigée par une IA à partir de ${noms} et publiée automatiquement.`;
  if (sources.length === 0) return "Publiée automatiquement.";
  return `Publiée automatiquement à partir de ${noms}.`;
}
