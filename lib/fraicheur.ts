/**
 * lib/fraicheur.ts — âge des dates « vérifié le … » (lot fraîcheur A, partie A2, 08/10/2026).
 *
 * Règle (audit de fraîcheur du 08/10/2026, § 3 rang 3) : une date de vérification tenue à la main vieillit sans que rien
 * ne le signale. Chaque famille de données a un seuil ; au-delà, l'affichage le dit lui-même (« · à revérifier »), sans
 * alarme. Le calcul se fait à la requête ET dans le navigateur (components/ui/VerifieLe.tsx) : une page statique ou mise
 * en cache vieillit donc d'elle-même. La date affichée est toujours celle de la donnée, jamais « maintenant ».
 */
import { isoOrNull, latestIso, oldestIso } from "@/lib/data-dates";

/**
 * Seuils en jours, par famille (liste fermée du lot A2). Les deux dernières familles ne sont pas dans la liste d'origine :
 * elles reprennent le rythme nécessaire noté dans la carte de fraîcheur (n° 25 « 1 mois », n° 30 « 1 trimestre »).
 */
export const SEUILS_JOURS = {
  frais: 90,
  mica: 14,
  securite: 14,
  support: 90,
  rendements: 14,
  evenements: 30,
  airdrops: 14,
  editorial: 180,
  roadmaps: 180,
  decentralisation: 120,
  wallets: 90,
  "historique-prix": 35,
  fiscalite: 30,
  notes: 30,
  "tarifs-partenaires": 90,
  // lot Z4 (10/10/2026) : robots R6 (taux BCE, 4 jours ouvrés + week-end), R5 (liste blanche AMF), R7 (Fed, BCE, halving : hebdomadaire)
  change: 6,
  amf: 7,
  officiel: 9,
} as const;

export type FamilleFraicheur = keyof typeof SEUILS_JOURS;

const JOUR_MS = 86_400_000;

/**
 * Instant de référence d'une date de donnée, en millisecondes. « AAAA-MM » (mois seul) = 1er du mois : on ne rajeunit
 * jamais une donnée. « AAAA-MM-JJ » = minuit UTC de ce jour. Horodatage complet = cet instant. null si illisible.
 */
export function instantDonnee(v: unknown): number | null {
  const s = isoOrNull(v);
  if (!s) return null;
  if (s.length === 7) return Date.parse(`${s}-01T00:00:00Z`);
  if (s.length === 10) return Date.parse(`${s}T00:00:00Z`);
  const t = Date.parse(s);
  return Number.isFinite(t) ? t : null;
}

/** Âge en jours entiers (arrondi vers le bas) à l'instant `maintenant`, null si la date est illisible. */
export function ageEnJours(v: unknown, maintenant: number): number | null {
  const t = instantDonnee(v);
  if (t === null || !Number.isFinite(maintenant)) return null;
  return Math.max(0, Math.floor((maintenant - t) / JOUR_MS));
}

/** true si la date dépasse le seuil de sa famille, false sinon, null si la date est illisible. */
export function estAReverifier(v: unknown, famille: FamilleFraicheur, maintenant: number): boolean | null {
  const age = ageEnJours(v, maintenant);
  if (age === null) return null;
  return age > SEUILS_JOURS[famille];
}

const MOIS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];

/**
 * Date en clair : « 02/10/2026 » ; mois seul « avril 2026 » (aucun jour inventé) ; horodatage = jour à Paris.
 * null si illisible.
 */
export function formatJJMMAAAA(v: unknown): string | null {
  const s = isoOrNull(v);
  if (!s) return null;
  if (s.length === 7) return `${MOIS[Number(s.slice(5, 7)) - 1]} ${s.slice(0, 4)}`;
  if (s.length === 10) return `${s.slice(8, 10)}/${s.slice(5, 7)}/${s.slice(0, 4)}`;
  return new Date(s).toLocaleDateString("fr-FR", { timeZone: "Europe/Paris", day: "2-digit", month: "2-digit", year: "numeric" });
}

export interface PeriodeVerification {
  /** plus ancienne date (sert au calcul de l'âge : on n'annonce jamais plus frais que vrai) */
  plusAncienne: string;
  /** plus récente date */
  plusRecente: string;
  /** « le 02/10/2026 » ou « entre le 02/10/2026 et le 05/10/2026 » */
  texte: string;
  /** sans article, pour une cellule de tableau : « 02/10/2026 » ou « 02/10/2026 – 05/10/2026 » */
  brut: string;
}

/** Période couverte par une liste de dates (dates illisibles ignorées), null si aucune n'est lisible. */
export function periodeVerification(dates: ReadonlyArray<unknown>): PeriodeVerification | null {
  const plusAncienne = oldestIso(dates);
  const plusRecente = latestIso(dates);
  if (!plusAncienne || !plusRecente) return null;
  const a = formatJJMMAAAA(plusAncienne)!;
  const b = formatJJMMAAAA(plusRecente)!;
  // « le 02/10/2026 », mais « en avril 2026 » (mois seul)
  const le = (x: string) => (/^\d/.test(x) ? `le ${x}` : `en ${x}`);
  const entre = (x: string) => (/^\d/.test(x) ? `le ${x}` : x);
  return { plusAncienne, plusRecente, texte: a === b ? le(a) : `entre ${entre(a)} et ${entre(b)}`, brut: a === b ? a : `${a} – ${b}` };
}

/** Seuil en millisecondes (utile côté navigateur). */
export const seuilMs = (famille: FamilleFraicheur): number => SEUILS_JOURS[famille] * JOUR_MS;
