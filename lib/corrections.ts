/**
 * lib/corrections.ts — lecture du journal public des corrections (data/corrections.json, 06/10/2026).
 *
 * Sert la page /corrections et la mention « Corrigé le … » en bas des articles (components/CorrectionNotice.tsx).
 * Règle (/charte) : pas de correction silencieuse ; toute correction d'un fait publié ajoute une entrée au JSON.
 */
import data from "@/data/corrections.json";

export interface Correction {
  /** Date ISO (AAAA-MM-JJ) de la correction en ligne. */
  date: string;
  /** Chemin de la page corrigée (« /charte », « /blog/slug »…). */
  page: string;
  /** Slug de l'article (/blog/[slug]) : déclenche la mention « Corrigé le … » en bas de l'article. */
  slug?: string;
  avant: string;
  après: string;
  nature: string;
  /** Commit du dépôt public qui porte la correction, quand il existe déjà. */
  commit?: string;
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/** Toutes les corrections, de la plus récente à la plus ancienne (ordre du fichier conservé à date égale). */
export function getAllCorrections(): Correction[] {
  const list = (data as { corrections: Correction[] }).corrections;
  return list
    .map((c, i) => ({ c, i }))
    .sort((a, b) => (a.c.date === b.c.date ? a.i - b.i : a.c.date < b.c.date ? 1 : -1))
    .map(({ c }) => c);
}

/** Corrections d'un article (/blog/[slug]), de la plus récente à la plus ancienne. */
export function getCorrectionsForSlug(slug: string): Correction[] {
  return getAllCorrections().filter((c) => c.slug === slug);
}

/** Corrections d'une page, par son chemin exact. */
export function getCorrectionsForPage(page: string): Correction[] {
  return getAllCorrections().filter((c) => c.page === page);
}

/** Date de la correction la plus récente d'une page, ou null. */
export function lastCorrectionDate(page: string): string | null {
  return getCorrectionsForPage(page)[0]?.date ?? null;
}

/** Vérifie la forme d'une entrée ; renvoie la liste des problèmes (vide si l'entrée est valide). */
export function validateCorrection(c: Partial<Correction>): string[] {
  const issues: string[] = [];
  if (!c.date || !ISO_DATE.test(c.date) || Number.isNaN(Date.parse(c.date))) issues.push("date ISO invalide");
  if (!c.page || !c.page.startsWith("/")) issues.push("page doit commencer par /");
  for (const k of ["avant", "après", "nature"] as const) {
    if (!c[k] || !String(c[k]).trim()) issues.push(`${k} vide`);
  }
  if (c.slug !== undefined && c.page !== `/blog/${c.slug}`) issues.push("slug et page ne correspondent pas");
  return issues;
}
