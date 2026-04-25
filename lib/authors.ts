/**
 * Helpers Authors — source unique de vérité E-E-A-T pour Cryptoreflex.
 *
 * Les données vivent dans `data/authors.json`. Tout le reste (fiches,
 * cartes, schemas Person…) lit via ces helpers pour rester DRY.
 */

import authorsData from "@/data/authors.json";
import { BRAND } from "@/lib/brand";

/* -------------------------------------------------------------------------- */
/*  Types                                                                     */
/* -------------------------------------------------------------------------- */

export interface AuthorSocial {
  linkedin?: string;
  twitter?: string;
  email?: string;
  github?: string;
  website?: string;
}

export interface Author {
  id: string;
  name: string;
  role: string;
  shortBio: string;
  bio: string;
  expertise: string[];
  yearsExperience: number;
  credentials?: string[];
  social: AuthorSocial;
  image: string;
}

interface AuthorsFile {
  authors: Author[];
}

/* -------------------------------------------------------------------------- */
/*  Constantes                                                                */
/* -------------------------------------------------------------------------- */

const SITE_URL = BRAND.url.replace(/\/$/, "");
const ORGANIZATION_ID = `${SITE_URL}/#organization`;

/** Auteur par défaut utilisé si un article ne précise pas son auteur. */
export const DEFAULT_AUTHOR_ID = "kevin-voisin";

/* -------------------------------------------------------------------------- */
/*  Lecture                                                                   */
/* -------------------------------------------------------------------------- */

const data = authorsData as AuthorsFile;

export function getAllAuthors(): Author[] {
  return data.authors;
}

export function getAuthorById(id: string): Author | undefined {
  return data.authors.find((a) => a.id === id);
}

export function getAuthorByIdOrDefault(id?: string): Author {
  const found = id ? getAuthorById(id) : undefined;
  return found ?? (getAuthorById(DEFAULT_AUTHOR_ID) as Author);
}

/* -------------------------------------------------------------------------- */
/*  URLs & métadonnées                                                        */
/* -------------------------------------------------------------------------- */

export function authorUrl(author: Author): string {
  return `${SITE_URL}/auteur/${author.id}`;
}

export function authorImageAbs(author: Author): string {
  if (/^https?:\/\//i.test(author.image)) return author.image;
  return `${SITE_URL}${author.image.startsWith("/") ? "" : "/"}${author.image}`;
}

/** Liste de profils sociaux propres (filtre les vides) — utile pour `sameAs`. */
export function authorSameAs(author: Author): string[] {
  const out: string[] = [];
  if (author.social.linkedin) out.push(author.social.linkedin);
  if (author.social.twitter) out.push(author.social.twitter);
  if (author.social.github) out.push(author.social.github);
  if (author.social.website) out.push(author.social.website);
  return out;
}

/* -------------------------------------------------------------------------- */
/*  Schema.org Person (E-E-A-T)                                               */
/* -------------------------------------------------------------------------- */

export type JsonLd = Record<string, unknown>;

/**
 * Renvoie un schema Person complet avec @id stable, utilisable :
 *  - en standalone sur la page auteur,
 *  - référencé via `{ "@id": ... }` depuis Article / Review.
 */
export function authorPersonSchema(author: Author): JsonLd {
  const url = authorUrl(author);
  return {
    "@context": "https://schema.org",
    "@type": "Person",
    "@id": `${url}#person`,
    name: author.name,
    url,
    image: authorImageAbs(author),
    jobTitle: author.role,
    description: author.shortBio,
    worksFor: { "@id": ORGANIZATION_ID },
    knowsAbout: author.expertise,
    sameAs: authorSameAs(author),
    ...(author.social.email ? { email: author.social.email } : {}),
  };
}

/** Référence courte à un auteur (à inclure dans Article.author, Review.author…). */
export function authorRef(author: Author): JsonLd {
  return {
    "@type": "Person",
    "@id": `${authorUrl(author)}#person`,
    name: author.name,
    url: authorUrl(author),
  };
}
