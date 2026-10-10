/**
 * lib/lien-affilie.ts — décision unique « ce lien d'article est-il rémunéré ? » (lot B4, 10/10/2026).
 *
 * Extraite de components/mdx/AffiliateLink.tsx sans changer la logique : le rendu du lien ET le calcul de la ligne
 * « Rémunération » de l'encadré de confiance (lib/article-confiance.ts) la lisent, pour qu'une page n'annonce jamais autre
 * chose que ce qu'elle affiche.
 */
import { findPaidPlatformByUrl, getPlatformById } from "@/lib/platforms";
import { getFiscalToolById } from "@/lib/fiscal-tools";
import { isPaidLink } from "@/lib/partnerships";

/** Cible d'un <AffiliateLink platform href> et identifiant du partenaire rémunéré, ou paidId = null si le lien est neutre. */
export function lienAffilie({ platform, href }: { platform?: string; href?: string }) {
  const p = platform ? getPlatformById(platform) : undefined;
  const tool = platform && !p ? getFiscalToolById(platform) : null;
  const rawHref = p?.affiliateUrl ?? tool?.affiliateUrl ?? href ?? "#";
  const paidId = platform ? (isPaidLink(platform, rawHref) ? platform : null) : findPaidPlatformByUrl(rawHref)?.id ?? null;
  return { p, tool, rawHref, paidId };
}
