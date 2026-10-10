/**
 * lib/article-confiance.ts — ce que l'encadré de confiance d'un article peut affirmer (lot B4, 10/10/2026).
 *
 * Deux calculs, tous deux LUS dans l'article et dans les données du site, jamais écrits à la main :
 *  1. `typesRemuneres(source)` : les types de relation commerciale (commission, parrainage personnel) des liens rémunérés
 *     que l'article affiche. Même décision que le rendu des liens : lienAffilie() pour <AffiliateLink> et
 *     <PlatformCardInline>, findPaidPlatformByUrl() pour les liens Markdown / href / <CTABox>, /go/{partenaire} pour les
 *     redirections de partenaires. Un lien qui n'est pas rémunéré (ou un lien interne) n'ajoute rien.
 *  2. `sourcesOfficielles(source)` : les liens vers des sites officiels (législation, administration fiscale,
 *     régulateurs) que l'article cite déjà dans son texte. Rien n'est ajouté qui ne soit pas dans l'article.
 *     Liste de domaines FERMÉE, pour qu'un lien de blog ou de plateforme ne passe jamais pour une source.
 */
import { findPaidPlatformByUrl } from "@/lib/platforms";
import { getAffiliationKind, type PartnershipKind } from "@/lib/partnerships";
import { lienAffilie } from "@/lib/lien-affilie";

export interface SourceCitee {
  label: string;
  url: string;
}

/** Domaines officiels reconnus comme sources (suffixe de nom d'hôte, sans « www. »). */
export const DOMAINES_OFFICIELS = [
  "legifrance.gouv.fr",
  "impots.gouv.fr",
  "bofip.impots.gouv.fr",
  "service-public.fr",
  "economie.gouv.fr",
  "amf-france.org",
  "esma.europa.eu",
  "eur-lex.europa.eu",
  "europa.eu",
  "banque-france.fr",
  "acpr.banque-france.fr",
  "orias.fr",
  "cnil.fr",
  "ecb.europa.eu",
  "securite-sociale.fr",
  "urssaf.fr",
] as const;

function hoteDe(url: string): string | null {
  try {
    return new URL(url).hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return null;
  }
}

/** true si l'adresse est un site officiel de la liste fermée. */
export function estSourceOfficielle(url: string): boolean {
  const h = hoteDe(url);
  return !!h && DOMAINES_OFFICIELS.some((d) => h === d || h.endsWith("." + d));
}

/** Valeur d'un attribut JSX/HTML écrit en toutes lettres (`nom="…"` ou `nom='…'`) dans une balise. */
function attribut(balise: string, nom: string): string | undefined {
  const m = new RegExp(`\\b${nom}\\s*=\\s*(?:"([^"]*)"|'([^']*)')`).exec(balise);
  return m ? (m[1] ?? m[2]) : undefined;
}

/** Types de relation rémunérée des liens que l'article affiche (ensemble vide = aucun lien publicitaire). */
export function typesRemuneres(source: string): Set<PartnershipKind> {
  const types = new Set<PartnershipKind>();
  const ajouter = (platformId?: string | null) => {
    const k = platformId ? getAffiliationKind(platformId) : null;
    if (k) types.add(k);
  };

  // <AffiliateLink platform="…" href="…"> : même décision que le composant
  for (const m of source.matchAll(/<AffiliateLink\b[^>]*>/g)) {
    const platform = attribut(m[0], "platform");
    const href = attribut(m[0], "href");
    ajouter(lienAffilie({ platform, href }).paidId);
  }
  // <PlatformCardInline id="…"> rend un <AffiliateLink platform="id" variant="button">
  for (const m of source.matchAll(/<PlatformCardInline\b[^>]*>/g)) {
    const id = attribut(m[0], "id");
    if (id) ajouter(lienAffilie({ platform: id }).paidId);
  }
  // <CTABox ctaUrl="…"> : /go/{partenaire} ou lien externe portant le code d'une relation déclarée
  for (const m of source.matchAll(/<CTABox\b[\s\S]*?ctaUrl\s*=\s*(?:"([^"]*)"|'([^']*)')/g)) {
    const url = m[1] ?? m[2] ?? "";
    const go = /^\/go\/([a-z0-9-]+)/i.exec(url);
    if (go) types.add(getAffiliationKind(go[1].toLowerCase()) ?? "affiliate");
    else if (/^https?:\/\//i.test(url)) ajouter(findPaidPlatformByUrl(url)?.id);
  }
  // liens Markdown [texte](https://…), href="https://…" et redirections /go/{partenaire} écrites en clair
  for (const m of source.matchAll(/\]\((https?:\/\/[^)\s]+)/g)) ajouter(findPaidPlatformByUrl(m[1])?.id);
  for (const m of source.matchAll(/\bhref\s*=\s*"(https?:\/\/[^"]+)"/g)) ajouter(findPaidPlatformByUrl(m[1])?.id);
  for (const m of source.matchAll(/\]\((\/go\/[a-z0-9-]+)|\bhref\s*=\s*"(\/go\/[a-z0-9-]+)/gi)) {
    const id = (m[1] ?? m[2]).split("/")[2].toLowerCase();
    types.add(getAffiliationKind(id) ?? "affiliate");
  }
  return types;
}

/** Liens vers des sites officiels cités dans le texte de l'article (au plus `max`, sans doublon, ordre d'apparition). */
export function sourcesOfficielles(source: string, max = 6): SourceCitee[] {
  const vus = new Set<string>();
  const out: SourceCitee[] = [];
  for (const m of source.matchAll(/\[([^\]\n]{2,160})\]\((https?:\/\/[^)\s]+)\)/g)) {
    const url = m[2].replace(/[.,;]+$/, "");
    if (!estSourceOfficielle(url) || vus.has(url)) continue;
    vus.add(url);
    out.push({ label: m[1].replace(/[*_`]/g, "").trim(), url });
    if (out.length >= max) break;
  }
  return out;
}
