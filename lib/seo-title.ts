/**
 * lib/seo-title.ts — titres <title> sans marque doublée.
 *
 * Le root layout applique le template `%s | Cryptoreflex`. Un titre de contenu
 * (frontmatter MDX) qui finit déjà par « — analyse Cryptoreflex » ou
 * « | Cryptoreflex » produisait « … — analyse Cryptoreflex | Cryptoreflex »
 * (audit SEO 2026-10-02, ex. 5 actualités d'avril 2026). On retire ce suffixe
 * UNIQUEMENT pour la balise <title> ; le H1 et l'og:title restent inchangés.
 */

const BRAND_SUFFIX = /\s*[|—–-]\s*(?:(?:analyse|par|via)\s+)?Cryptoreflex\s*$/i;

export function stripBrandSuffix(title: string): string {
  const stripped = title.replace(BRAND_SUFFIX, "").trim();
  return stripped.length > 0 ? stripped : title;
}
