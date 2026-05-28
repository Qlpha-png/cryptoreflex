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

/**
 * Alias de bylines historiques → id canonique. Les frontmatters d'articles
 * stockent un NOM d'affichage ("Kevin Voisin", "Cryptoreflex", "Rédaction"…)
 * et non un id : cette table les rattache à un auteur réel de la registry,
 * pour éviter le fallback silencieux vers l'auteur par défaut.
 */
const AUTHOR_ALIASES: Record<string, string> = {
  "kevin voisin": "kevin-voisin",
  cryptoreflex: "redaction-cryptoreflex",
  rédaction: "redaction-cryptoreflex",
  "rédaction cryptoreflex": "redaction-cryptoreflex",
  "la rédaction cryptoreflex": "redaction-cryptoreflex",
  "équipe éditoriale": "redaction-cryptoreflex",
};

/** Résout un id OU un nom d'affichage OU un alias vers un id canonique. */
export function resolveAuthorId(idOrName?: unknown): string {
  // Défensif : le frontmatter MDX peut fournir un objet { name, role } ou rien.
  if (typeof idOrName === "object" && idOrName !== null) {
    const name = (idOrName as { name?: unknown }).name;
    return typeof name === "string" ? resolveAuthorId(name) : DEFAULT_AUTHOR_ID;
  }
  if (typeof idOrName !== "string" || !idOrName.trim()) return DEFAULT_AUTHOR_ID;
  const raw = idOrName.trim();
  if (getAuthorById(raw)) return raw; // déjà un id valide
  const key = raw.toLowerCase();
  if (AUTHOR_ALIASES[key]) return AUTHOR_ALIASES[key];
  const byName = data.authors.find((a) => a.name.toLowerCase() === key);
  return byName ? byName.id : DEFAULT_AUTHOR_ID;
}

export function getAuthorByIdOrDefault(id?: unknown): Author {
  return getAuthorById(resolveAuthorId(id)) as Author;
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
