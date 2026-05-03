/**
 * lib/seo-alternates.ts — Helper hreflang Next.js metadata.
 *
 * BUG : Next.js metadata `alternates` est shallow-merged. Si page.tsx defini
 * `alternates: { canonical: PAGE_URL }`, ca remplace COMPLETEMENT l'objet
 * `alternates` du root layout — les `languages` (FR/BE/CH/CA/x-default) sont
 * perdus. Resultat : hreflang absent sur toutes les pages enfants.
 *
 * USAGE :
 *   import { withHreflang } from "@/lib/seo-alternates";
 *   export const metadata = {
 *     ...
 *     alternates: withHreflang(`${BRAND.url}/blog`),
 *   };
 *
 * Retourne : { canonical, languages: { 'fr-FR': url, 'fr-BE': url, ... } }
 *
 * Strategy : meme URL canonique pour les 4 regions FR. Signal Google que
 * le contenu francais cible explicitement France/Belgique/Suisse/Quebec
 * sans dupliquer le contenu sous /be /ch /ca.
 */

import type { Metadata } from "next";
import { BRAND } from "@/lib/brand";

type AlternatesValue = NonNullable<Metadata["alternates"]>;

/**
 * Construit l'objet alternates avec canonical + hreflang multi-region.
 * Si `canonicalUrl` n'est pas fourni, utilise BRAND.url (home).
 */
export function withHreflang(canonicalUrl?: string): AlternatesValue {
  const url = canonicalUrl ?? BRAND.url;
  return {
    canonical: url,
    languages: {
      "fr-FR": url,
      "fr-BE": url,
      "fr-CH": url,
      "fr-CA": url,
      "x-default": url,
    },
  };
}
