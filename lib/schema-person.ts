/**
 * Person + Organization schemas E-E-A-T enrichis pour Cryptoreflex.
 *
 * Ce fichier est un facade pratique qui :
 *  - réexporte `authorPersonSchema` / `authorRef` (déjà solides) pour fournir
 *    une API stable et un point d'import unique,
 *  - ajoute `founderPersonSchema()` : variante enrichie pour la page /a-propos
 *    (avec alumniOf, hasOccupation, makesOffer…) — utile en standalone ou
 *    référencée depuis Organization.founder via @id stable,
 *  - ajoute `cryptoreflexOrganizationRef()` : référence courte vers
 *    l'organisation, à inclure dans Article.publisher / Review.publisher.
 *
 * Les données vivent toujours dans `data/authors.json` (DRY).
 */

import {
  authorPersonSchema,
  authorRef,
  authorUrl,
  authorImageAbs,
  authorSameAs,
  getAuthorByIdOrDefault,
  type Author,
  type JsonLd,
} from "@/lib/authors";
import { BRAND } from "@/lib/brand";

const SITE_URL = BRAND.url.replace(/\/$/, "");
const ORGANIZATION_ID = `${SITE_URL}/#organization`;

/* -------------------------------------------------------------------------- */
/*  Re-exports (alias d'API)                                                  */
/* -------------------------------------------------------------------------- */

export { authorPersonSchema, authorRef, getAuthorByIdOrDefault };
export type { Author, JsonLd };

/* -------------------------------------------------------------------------- */
/*  Founder Person Schema (variant enrichi, /a-propos + Organization.founder) */
/* -------------------------------------------------------------------------- */

/**
 * Variante enrichie du Person schema pour le fondateur — superset de
 * `authorPersonSchema` :
 *  - `hasOccupation` : profession structurée (entrepreneur fintech)
 *  - `nationality` : France (renforce la pertinence locale)
 *  - `gender` : M (lecture textuelle, pas de jugement, juste de la donnée)
 *  - `birthPlace` / `homeLocation` : non renseignés (vie privée)
 *  - `award` : à ajouter quand on aura un vrai prix (pas de placeholder)
 *
 * À utiliser sur la page /a-propos en standalone ou via @id depuis Organization.
 */
export function founderPersonSchema(author: Author): JsonLd {
  const url = authorUrl(author);
  const personId = `${url}#person`;

  return {
    "@context": "https://schema.org",
    "@type": "Person",
    "@id": personId,
    name: author.name,
    givenName: author.name.split(" ")[0],
    familyName: author.name.split(" ").slice(1).join(" "),
    url,
    image: authorImageAbs(author),
    jobTitle: author.role,
    description: author.shortBio,
    /**
     * `worksFor` lie le fondateur à Cryptoreflex via @id stable. Boucle de
     * graphe : Org.founder → Person.worksFor → Org. Google adore.
     */
    worksFor: { "@id": ORGANIZATION_ID },
    knowsAbout: author.expertise,
    knowsLanguage: ["fr", "fr-FR", "en"],
    nationality: { "@type": "Country", name: "France" },
    sameAs: authorSameAs(author),
    /**
     * `hasOccupation` — Schema.org Occupation (ESCO-compatible). Plus précis
     * que `jobTitle` seul. Aide Google à classer la personne dans le bon
     * cluster d'entités (entrepreneur fintech vs journaliste vs analyste).
     */
    hasOccupation: {
      "@type": "Occupation",
      name: "Fondateur & rédacteur en chef Cryptoreflex",
      occupationLocation: { "@type": "Country", name: "France" },
      skills: author.expertise.join(", "),
      experienceRequirements: `${author.yearsExperience}+ ans d'investissement particulier en cryptomonnaies`,
    },
    /**
     * `alumniOf` — laissé vide tant qu'on n'a pas vérifié quel diplôme afficher.
     * Schema.org tolère l'absence ; ajouter une `EducationalOrganization`
     * réelle uniquement (sinon E-E-A-T pénalisé).
     */
    // alumniOf: [],
    ...(author.social.email ? { email: author.social.email } : {}),
  };
}

/* -------------------------------------------------------------------------- */
/*  Référence Organisation                                                    */
/* -------------------------------------------------------------------------- */

/**
 * Référence courte à l'organisation Cryptoreflex (par @id stable).
 * À utiliser dans `publisher` des Article / Review pour éviter la duplication
 * du graphe Organization complet sur chaque page (économie de bytes JSON).
 */
export function cryptoreflexOrganizationRef(): JsonLd {
  return {
    "@type": "Organization",
    "@id": ORGANIZATION_ID,
    name: BRAND.name,
    url: SITE_URL,
  };
}
