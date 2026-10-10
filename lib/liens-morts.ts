/**
 * lib/liens-morts.ts — liens sortants morts des fiches, lus au rendu (lot Z3, 10/10/2026).
 *
 * Le robot de nuit « fiches sans défaut » (scripts/fiches-liens.mjs) écrit data/fiches/defauts.json. Un lien sortant
 * déclaré mort (échec DNS, 404, 410 ou 5xx deux nuits de suite) est RETIRÉ des fiches : le texte reste, sans lien,
 * jusqu'à ce que le robot le voie de nouveau répondre (il sort alors de la liste au passage suivant, puis au prochain
 * déploiement ; le robot commite le fichier, ce qui redéploie le site).
 * Comparaison sur l'adresse normalisée (hôte en minuscules, sans fragment ni « / » final), même règle que le robot.
 */
import defauts from "@/data/fiches/defauts.json";
import { normaliserUrl } from "@/scripts/lib/fiches-defauts.mjs";

const MORTS: ReadonlySet<string> = new Set(
  ((defauts as { liensSortantsMorts?: unknown }).liensSortantsMorts as unknown[] | undefined ?? [])
    .filter((u): u is string => typeof u === "string")
    .map((u) => normaliserUrl(u))
    .filter((u): u is string => !!u),
);

/** Vrai si l'adresse est déclarée morte par le robot de nuit. */
export function estLienMort(href: string | null | undefined, morts: ReadonlySet<string> = MORTS): boolean {
  if (!href) return false;
  const n = normaliserUrl(href);
  return !!n && morts.has(n);
}

/** L'adresse si elle est vivante (ou inconnue du robot), sinon null : la fiche affiche alors le texte sans lien. */
export function lienVivant<T extends string | null | undefined>(href: T, morts: ReadonlySet<string> = MORTS): T | null {
  return href && estLienMort(href, morts) ? null : href;
}
