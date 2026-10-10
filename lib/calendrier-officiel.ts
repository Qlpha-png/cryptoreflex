/**
 * lib/calendrier-officiel.ts — calendriers officiels relus par le robot R7 (lot Z4, 10/10/2026), utilisable côté serveur
 * et navigateur. Source unique : data/calendrier-officiel.json (.github/workflows/refresh-fomc.yml,
 * scripts/refresh-calendrier-officiel.mjs) :
 *  - réunions de politique monétaire de la BCE (calendrier officiel du Conseil des gouverneurs ; la BCE doit être citée) ;
 *  - prochain halving de Bitcoin en FOURCHETTE (mempool.space, recoupé avec blockstream.info), méthode écrite à côté ;
 *  - releveLe : date du dernier passage où la Fed, la BCE et le halving ont été relus ensemble.
 * Aucune date de halving écrite en dur ailleurs : tout passe par PROCHAIN_HALVING.
 */
import fichier from "@/data/calendrier-officiel.json";
import type { CryptoEvent } from "@/lib/events-types";

export const CALENDRIER_OFFICIEL = fichier;

export const FED_CALENDRIER_URL = "https://www.federalreserve.gov/monetarypolicy/fomccalendars.htm";
export const BCE_CALENDRIER_URL = "https://www.ecb.europa.eu/press/calendars/mgcgc/html/index.en.html";

const MOIS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];
/** « 10 avril 2028 » (fuseau de Paris) depuis une date ou un instant ISO. */
export function dateLongue(iso: string): string {
  const d = new Date(iso.length === 10 ? `${iso}T12:00:00Z` : iso);
  const p = new Intl.DateTimeFormat("fr-FR", { timeZone: "Europe/Paris", day: "numeric", month: "long", year: "numeric" }).formatToParts(d);
  const v = (t: string) => p.find((x) => x.type === t)?.value ?? "";
  return `${v("day")} ${v("month")} ${v("year")}`;
}
/** AAAA-MM-JJ (fuseau de Paris) d'un instant ISO. */
export function jourParis(iso: string): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Paris", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(iso));
}
const virgule = (n: number, dec = 2) => n.toFixed(dec).replace(".", ",");
/** Séparateur de milliers INSÉCABLE (U+00A0) : un nombre ne se coupe jamais en fin de ligne (« 970 / 748 »). */
const milliers = (n: number) => n.toLocaleString("fr-FR").replace(/[\u202f\u00a0 ]/g, "\u00a0");
const NBSP = "\u00a0";
const ORDINAUX: Record<number, string> = { 5: "Cinquième", 6: "Sixième", 7: "Septième", 8: "Huitième", 9: "Neuvième" };
/** « 3,125 », « 1,5625 » : récompense en BTC sans zéros inutiles. */
const btc = (n: number) => String(n).replace(".", ",");

export interface ProchainHalving {
  bloc: number;
  hauteur: number;
  blocsRestants: number;
  /** instant ISO de l'estimation centrale */
  estimation: string;
  debut: string;
  fin: string;
  tempsMoyenMin: number;
  tempsBasMin: number;
  tempsHautMin: number;
  /** date du calcul (AAAA-MM-JJ) */
  calculeLe: string;
  source: string;
  /** rang du halving (5 pour le bloc 1 050 000) et récompense par bloc avant / après, en BTC */
  rang: number;
  recompenseAvant: number;
  recompenseApres: number;
  /** phrase de méthode, affichée à côté de la fourchette */
  methode: string;
  /** « vers le 10 avril 2028, entre le 13 mars et le 7 mai 2028 » */
  resume: string;
}

function lireHalving(): ProchainHalving | null {
  const h = fichier.halving;
  if (!h || typeof h.estimation !== "string" || !h.fourchette) return null;
  const tempsMoyenMin = h.tempsMoyenS / 60;
  const tempsBasMin = h.fourchette.tempsBasS / 60;
  const tempsHautMin = h.fourchette.tempsHautS / 60;
  const rang = Math.round(h.bloc / 210_000);
  const debutCourt = dateLongue(h.fourchette.debut).replace(/ \d{4}$/, (a) => (jourParis(h.fourchette.debut).slice(0, 4) === jourParis(h.fourchette.fin).slice(0, 4) ? "" : a));
  return {
    bloc: h.bloc,
    hauteur: h.hauteur,
    blocsRestants: h.blocsRestants,
    estimation: h.estimation,
    debut: h.fourchette.debut,
    fin: h.fourchette.fin,
    tempsMoyenMin,
    tempsBasMin,
    tempsHautMin,
    calculeLe: h.calculeLe,
    source: h.source,
    rang,
    recompenseAvant: 50 / 2 ** (rang - 1),
    recompenseApres: 50 / 2 ** rang,
    // reprise Z4 : phrase lisible par un visiteur ; l'écart mesuré sur l'époque de difficulté reste dans le JSON
    methode:
      `Il reste ${milliers(h.blocsRestants)} blocs à miner avant le bloc ${milliers(h.bloc)}. Depuis le halving de 2024, un bloc sort en moyenne toutes les ${virgule(tempsMoyenMin)}${NBSP}minutes ; ` +
      `la fourchette retient de ${virgule(tempsBasMin)} à ${virgule(tempsHautMin)}${NBSP}minutes par bloc. Source : mempool.space.`,
    resume: `vers le ${dateLongue(h.estimation)}, entre le ${debutCourt} et le ${dateLongue(h.fourchette.fin)}`,
  };
}

/** Prochain halving de Bitcoin (null si le fichier est illisible : aucune date n'est alors affichée). */
export const PROCHAIN_HALVING: ProchainHalving | null = lireHalving();

/** Jours entiers entre maintenant et un instant ISO (arrondi), jamais négatif. */
export function joursAvant(iso: string, maintenant = Date.now()): number {
  return Math.max(0, Math.round((Date.parse(iso) - maintenant) / 86_400_000));
}

const MOIS_TITRE = (iso: string) => `${MOIS[Number(iso.slice(5, 7)) - 1]} ${iso.slice(0, 4)}`;

/** Décisions de politique monétaire de la BCE, au format du calendrier (/calendrier). */
export function evenementsBce(): CryptoEvent[] {
  const decisions = fichier.bce?.decisions ?? [];
  // reprise Z4 : titre court (sur le modèle « Décision de taux FOMC ») ; la carte dit déjà « Source : BCE »
  const jours = (jour1: string, date: string) =>
    jour1.slice(0, 7) === date.slice(0, 7) ? `${Number(jour1.slice(8))} et ${dateLongue(date)}` : `${dateLongue(jour1)} et ${dateLongue(date)}`;
  return decisions.map((d) => ({
    id: `bce-${d.date}`,
    title: `Décision de taux de la BCE (${MOIS_TITRE(d.date)})`,
    date: d.date,
    crypto: "MARCHÉ",
    category: "BCE" as const,
    source: "BCE",
    sourceUrl: BCE_CALENDRIER_URL,
    description: d.jour1
      ? `Réunion de politique monétaire du Conseil des gouverneurs de la BCE les ${jours(d.jour1, d.date)} ; décisions sur les taux annoncées le ${dateLongue(d.date)}.`
      : `Décisions de politique monétaire du Conseil des gouverneurs de la BCE le ${dateLongue(d.date)}.`,
    importance: 3 as const,
  }));
}

/** Prochain halving de Bitcoin au format du calendrier (date = estimation centrale, fourchette dans la description). */
export function evenementHalving(): CryptoEvent[] {
  const h = PROCHAIN_HALVING;
  if (!h) return [];
  return [
    {
      id: `btc-halving-${jourParis(h.estimation).slice(0, 4)}`,
      title: `${ORDINAUX[h.rang] ?? `${h.rang}e`} halving Bitcoin (estimation)`,
      date: jourParis(h.estimation),
      crypto: "BTC",
      category: "Halving",
      source: "mempool.space",
      sourceUrl: "https://mempool.space",
      // carte courte : le lien mène à /halving-bitcoin, qui donne la méthode
      description: `Récompense de ${btc(h.recompenseAvant)} à ${btc(h.recompenseApres)}${NBSP}BTC. Estimation ${h.resume}.`,
      importance: 3,
    },
  ];
}
