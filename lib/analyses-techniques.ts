/**
 * lib/analyses-techniques.ts — pages vivantes des analyses techniques (lot L2 du regroupement, 08/10/2026).
 *
 * Données : data/analyses-techniques/<slug>.json, mis à jour chaque jour par le robot (scripts/lib/analyses-techniques.mjs).
 * `latest` = dernier calcul réussi (euros, clôtures journalières terminées) ; `history` = tous les calculs publiés, du
 * plus récent au plus ancien (avant le 08/10/2026 : analyses datées importées, en dollars, devise portée par la ligne).
 *
 * Tout le texte des pages est ici (gabarit fixe, relu une fois) : le robot n'écrit aucun mot. Vocabulaire DESCRIPTIF
 * seulement (doctrine AMF du 04/08/2026 sur le conseil en crypto-actifs) : aucune expression de recommandation près d'un
 * indicateur ; le test tests/lib/analyses-gabarit.test.ts le vérifie sur le HTML rendu des 5 pages et du hub.
 * Les valeurs sont stockées brutes ; l'arrondi est fait ici, à l'affichage (une seule valeur par fait, D9).
 */
import bitcoin from "@/data/analyses-techniques/bitcoin.json";
import ethereum from "@/data/analyses-techniques/ethereum.json";
import solana from "@/data/analyses-techniques/solana.json";
import xrp from "@/data/analyses-techniques/xrp.json";
import cardano from "@/data/analyses-techniques/cardano.json";
import { fmtFr, NBSP } from "@/lib/format-fr";

export type Tendance = "haussière" | "baissière" | "neutre";
export type Devise = "EUR" | "USD";

export interface LigneHistorique {
  date: string;
  currency: Devise;
  price: number;
  rsi14: number;
  ma50: number;
  ma200: number;
  vol30?: number;
  trend: Tendance;
  origin: "publié" | "recalculé";
  source?: string;
  change24h?: number;
  /** depuis la reprise L2 (08/10/2026) : paire, clôture et heure du calcul portées par la ligne */
  pair?: string;
  closeDate?: string;
  calculatedAt?: string;
}

/**
 * Lignes RETIRÉES de l'historique (reprise L2, 08/10/2026) : les 5 analyses du 26/04/2026 (commit 597df9a9) avaient été
 * écrites à la main avec des valeurs d'essai (RSI ronds 58/55/52/48/45) ; elles sont arithmétiquement impossibles (la
 * MA200 du Bitcoin passait de 78 450 $ à 84 759 $ en un jour). Elles ne sont plus dans data/analyses-techniques/*.json ;
 * l'adresse datée du 26/04 reste en 301 vers la page vivante (règle par motif du middleware).
 */
export const LIGNES_RETIREES: { date: string; raison: string }[] = [
  { date: "2026-04-26", raison: "valeurs d’essai qui n’étaient pas des cours de marché" },
];

export function noteRetraits(): string {
  return LIGNES_RETIREES.map(
    (r) => `Les valeurs affichées le ${fmtDateCourte(r.date)} n’étaient pas des cours de marché (contenu d’essai) : elles ont été retirées de l’historique.`,
  ).join(" ");
}

/** Libellé de la source d'une ligne (les lignes importées en dollars n'ont pas de source enregistrée). */
const LIBELLES_SOURCE: Record<string, string> = {
  kraken: "Kraken (API publique)",
  "binance-data-api": "Binance (données publiques de marché)",
};
export function libelleSource(source: string | undefined): string {
  return source ? (LIBELLES_SOURCE[source] ?? source) : "source non enregistrée";
}

/** Deux calculs ne se comparent (RSI, prix) que sur la même série : même devise ET même source. */
export function memeSerie(a: { currency: Devise; source?: string }, b: { currency: Devise; source?: string }): boolean {
  return a.currency === b.currency && (a.source ?? null) === (b.source ?? null);
}

export interface DernierCalcul {
  date: string;
  calculatedAt: string;
  currency: Devise;
  source: string;
  sourceLabel: string;
  pair: string;
  closeDate: string;
  price: number;
  change24h: number;
  rsi14: number;
  ma50: number;
  ma200: number;
  vol30: number;
  trend: Tendance;
  trendRule: string;
  closes30: number[];
}

export interface Analyse {
  slug: string;
  symbol: string;
  name: string;
  latest: DernierCalcul;
  history: LigneHistorique[];
}

/** Les 5 pages, dans l'ordre d'affichage du hub. */
export const TA_SLUGS = ["bitcoin", "ethereum", "solana", "xrp", "cardano"] as const;
export type TASlug = (typeof TA_SLUGS)[number];

const FICHIERS: Record<TASlug, unknown> = { bitcoin, ethereum, solana, xrp, cardano };

/** « du Bitcoin », « d’Ethereum »… (H1 et phrases). */
const DE: Record<TASlug, string> = {
  bitcoin: "du Bitcoin",
  ethereum: "d’Ethereum",
  solana: "de Solana",
  xrp: "du XRP",
  cardano: "de Cardano",
};

export function isTASlug(s: string): s is TASlug {
  return (TA_SLUGS as readonly string[]).includes(s);
}

export function getAnalyse(slug: string): Analyse | null {
  if (!isTASlug(slug)) return null;
  const a = FICHIERS[slug] as Analyse;
  return a && a.latest ? a : null;
}

export function getAnalyses(): Analyse[] {
  return TA_SLUGS.map((s) => getAnalyse(s)).filter((a): a is Analyse => a !== null);
}

/** Horodatage du calcul le plus récent des 5 (lastmod du hub). */
export function dernierCalculGlobal(analyses: Analyse[] = getAnalyses()): string | null {
  const t = analyses.map((a) => a.latest.calculatedAt).sort();
  return t.length ? t[t.length - 1] : null;
}

/* -------------------------------------------------------------------------- */
/*  Format                                                                    */
/* -------------------------------------------------------------------------- */

const SYMBOLE: Record<Devise, string> = { EUR: "€", USD: "$" };

/** Prix affiché : 84 050 € ; 152,34 € ; 0,7825 € (décimales selon l'ordre de grandeur). */
export function fmtPrix(n: number, devise: Devise): string {
  if (!Number.isFinite(n)) return "—";
  const d = n >= 1000 ? 0 : n >= 1 ? 2 : 4;
  return `${fmtFr(n, d)}${NBSP}${SYMBOLE[devise]}`;
}

/**
 * Prix d'une ligne d'historique : les lignes importées (dollars) sont affichées avec la précision publiée à l'époque
 * (« 0,25 $ », pas « 0,2500 $ ») : au moins 2 décimales sous 1 000, au plus celles de la règle générale.
 */
export function fmtPrixLigne(h: Pick<LigneHistorique, "price" | "currency">): string {
  if (h.currency === "EUR" || !Number.isFinite(h.price) || h.price >= 1000) return fmtPrix(h.price, h.currency);
  const publiees = (String(h.price).split(".")[1] ?? "").length;
  const max = h.price >= 1 ? 2 : 4;
  return `${fmtFr(h.price, Math.min(max, Math.max(2, publiees)))}${NBSP}${SYMBOLE[h.currency]}`;
}

/** 07/10/2026 */
export function fmtDateCourte(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : iso;
}

/** « 04:31 » (heure UTC d'un horodatage ISO) */
export function fmtHeureUtc(iso: string): string {
  const m = /T(\d{2}):(\d{2})/.exec(iso);
  return m ? `${m[1]}:${m[2]}` : "";
}

export function fmtRsi(n: number): string {
  return fmtFr(n, 1);
}

export type Position = "au-dessus" | "en dessous";
export function position(prix: number, moyenne: number): Position {
  return prix >= moyenne ? "au-dessus" : "en dessous";
}

/** Écart du cours à une moyenne, en % signé (« +4,7 % »). */
export function ecart(prix: number, moyenne: number): string {
  const e = (prix / moyenne - 1) * 100;
  return `${e > 0 ? "+" : e < 0 ? "−" : ""}${fmtFr(Math.abs(e), 1)}${NBSP}%`;
}

function variation(avant: number, apres: number): string {
  const v = (apres / avant - 1) * 100;
  return `${v > 0 ? "+" : v < 0 ? "−" : ""}${fmtFr(Math.abs(v), 1)}${NBSP}%`;
}

function joursEntre(a: string, b: string): number {
  return Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86_400_000);
}

/* -------------------------------------------------------------------------- */
/*  Textes                                                                    */
/* -------------------------------------------------------------------------- */

/** « du Bitcoin », « d’Ethereum »… */
export function deNom(a: Pick<Analyse, "slug" | "name">): string {
  return DE[a.slug as TASlug] ?? `de ${a.name}`;
}

export function nomAvecSymbole(a: Pick<Analyse, "name" | "symbol">): string {
  return a.name === a.symbol ? a.name : `${a.name} (${a.symbol})`;
}

export function h1Analyse(a: Analyse): string {
  return `Analyse technique ${DE[a.slug as TASlug] ?? `de ${a.name}`}${a.name === a.symbol ? "" : ` (${a.symbol})`}`;
}

export function titreAnalyse(a: Analyse): string {
  return `Analyse technique ${nomAvecSymbole(a)} : RSI et moyennes du jour`;
}

function positionsTexte(l: { price: number; ma50: number; ma200: number }): string {
  const p50 = position(l.price, l.ma50);
  const p200 = position(l.price, l.ma200);
  if (p50 === p200) return `cours ${p50} des moyennes 50 et 200 jours`;
  return `cours ${p50} de la moyenne 50 jours et ${p200} de la moyenne 200 jours`;
}

export function descriptionAnalyse(a: Analyse): string {
  const l = a.latest;
  return `${a.name} le ${fmtDateCourte(l.date)} : RSI ${fmtRsi(l.rsi14)}, ${positionsTexte(l)}. Calcul automatique quotidien, historique daté, méthode publiée.`;
}

/** Phrase descriptive du RSI : position par rapport aux repères habituels, jamais une lecture de l'avenir. */
export function phraseRsi(rsi: number): string {
  const v = fmtRsi(rsi);
  if (rsi > 70) return `Le RSI sur 14 jours est à ${v}, au-dessus du repère habituel de 70 (zone appelée « surachat »).`;
  if (rsi < 30) return `Le RSI sur 14 jours est à ${v}, en dessous du repère habituel de 30 (zone appelée « survente »).`;
  return `Le RSI sur 14 jours est à ${v}, entre les repères habituels de 30 et 70.`;
}

/** « En 10 secondes » : 3 phrases. */
export function resume(a: Analyse): string[] {
  const l = a.latest;
  const p50 = position(l.price, l.ma50);
  const p200 = position(l.price, l.ma200);
  // reprise L2 : la clôture, le RSI et la tendance sont en chiffres juste au-dessus (rangée « chiffres du jour ») ;
  // la première phrase ne garde que la position du cours par rapport aux deux moyennes.
  const moyennes =
    p50 === p200
      ? `${p50} de ses moyennes mobiles sur 50 jours (${fmtPrix(l.ma50, l.currency)}) et sur 200 jours (${fmtPrix(l.ma200, l.currency)})`
      : `${p50} de sa moyenne mobile sur 50 jours (${fmtPrix(l.ma50, l.currency)}) et ${p200} de celle sur 200 jours (${fmtPrix(l.ma200, l.currency)})`;
  return [
    `À la clôture du ${fmtDateCourte(l.closeDate)} (${fmtPrix(l.price, l.currency)}), le cours ${DE[a.slug as TASlug] ?? `de ${a.name}`} est ${moyennes}.`,
    phraseRsi(l.rsi14),
    "Ces indicateurs décrivent le passé du prix ; ils ne disent rien de ce qu’il fera.",
  ];
}

/** Légende du graphique, en texte : écart du cours aux deux moyennes. */
export function phraseEcarts(l: Pick<DernierCalcul, "closeDate" | "price" | "ma50" | "ma200" | "currency">): string {
  const part = (m: number, nom: string) => {
    const e = Math.abs((l.price / m - 1) * 100);
    return `${fmtFr(e, 1)}${NBSP}% ${position(l.price, m)} de la moyenne ${nom}`;
  };
  return `À la clôture du ${fmtDateCourte(l.closeDate)}, le cours (${fmtPrix(l.price, l.currency)}) est ${part(l.ma50, "50 jours")} et ${part(l.ma200, "200 jours")}.`;
}

/** Calcul précédent : la ligne d'historique la plus récente datée AVANT le dernier calcul. */
export function calculPrecedent(a: Analyse): LigneHistorique | null {
  return a.history.find((h) => h.date < a.latest.date) ?? null;
}

export interface Changements {
  /** date du calcul précédent (AAAA-MM-JJ), ou null s'il n'y en a pas */
  depuis: string | null;
  /** jours entre les deux calculs */
  jours: number;
  /** lignes « Prix », « RSI », « Position », « Tendance » */
  lignes: { libelle: string; texte: string; court: string | null }[];
  memeDevise: boolean;
  /** même devise ET même source : sinon le prix et le RSI ne sont pas comparés (seuls les états le sont) */
  memeSerie: boolean;
  /** pastille unique du hub quand la série change (sinon null) */
  pastilleSerie: string | null;
}

function changementPosition(avant: Position, apres: Position, moyenne: string): string | null {
  if (avant === apres) return null;
  return `${moyenne} : cours passé ${apres === "au-dessus" ? "au-dessus" : "en dessous"}`;
}

/**
 * « Ce qui a changé depuis le calcul du … ». Reprise L2 : le prix ET le RSI ne sont comparés que sur la même série (même
 * devise, même source) ; quand la série change (dollars → euros, Kraken → Binance…), seuls les états (position par
 * rapport aux moyennes, tendance calculée) sont comparés, et le hub n'affiche qu'une pastille.
 */
export function ceQuiAChange(a: Analyse): Changements {
  const l = a.latest;
  const p = calculPrecedent(a);
  if (!p) return { depuis: null, jours: 0, lignes: [], memeDevise: false, memeSerie: false, pastilleSerie: null };
  const memeDevise = p.currency === l.currency;
  const serie = memeSerie(p, l);
  const lignes: Changements["lignes"] = [];
  lignes.push(
    serie
      ? {
          libelle: "Prix",
          texte: `${fmtPrix(p.price, p.currency)} → ${fmtPrix(l.price, l.currency)} (${variation(p.price, l.price)})`,
          court: `Prix ${variation(p.price, l.price)}`,
        }
      : !memeDevise
        ? {
            libelle: "Prix",
            texte: `première mesure en euros (le calcul du ${fmtDateCourte(p.date)} était en ${p.currency === "USD" ? "dollars" : p.currency}, les deux prix ne se comparent pas)`,
            court: "Première mesure en euros",
          }
        : {
            libelle: "Prix",
            texte: `première mesure sur une nouvelle source (${l.sourceLabel} ; le calcul du ${fmtDateCourte(p.date)} venait de ${libelleSource(p.source)}), les deux prix ne se comparent pas`,
            court: "Nouvelle source des cours",
          },
  );
  lignes.push(
    serie
      ? { libelle: "RSI (14)", texte: `${fmtRsi(p.rsi14)} → ${fmtRsi(l.rsi14)}`, court: `RSI ${fmtRsi(p.rsi14)} → ${fmtRsi(l.rsi14)}` }
      : { libelle: "RSI (14)", texte: `${fmtRsi(l.rsi14)}, première mesure sur la nouvelle série de cours ; comparaison au prochain calcul`, court: null },
  );
  const a50 = position(p.price, p.ma50), n50 = position(l.price, l.ma50);
  const a200 = position(p.price, p.ma200), n200 = position(l.price, l.ma200);
  const c50 = changementPosition(a50, n50, "Moyenne 50 jours");
  const c200 = changementPosition(a200, n200, "Moyenne 200 jours");
  lignes.push({
    libelle: "Position par rapport aux moyennes 50 et 200 jours",
    texte:
      !c50 && !c200
        ? `inchangée (${n50 === n200 ? `${n50} des deux` : `${n50} de la moyenne 50 jours, ${n200} de la moyenne 200 jours`})`
        : [c50, c200].filter(Boolean).join(" ; "),
    court: [c50, c200].filter(Boolean).join(" ; ") || null,
  });
  lignes.push({
    libelle: "Tendance calculée",
    texte: p.trend === l.trend ? `inchangée (${l.trend})` : `${p.trend} → ${l.trend}`,
    court: p.trend === l.trend ? null : `Tendance ${p.trend} → ${l.trend}`,
  });
  return { depuis: p.date, jours: joursEntre(p.date, l.date), lignes, memeDevise, memeSerie: serie, pastilleSerie: serie ? null : lignes[0].court };
}

/** Puces du hub : une seule pastille quand la série change, sinon les changements courts. */
export function pucesHub(c: Changements): string[] {
  if (c.pastilleSerie) return [c.pastilleSerie];
  return c.lignes.map((x) => x.court).filter((x): x is string => !!x);
}

/** Titre du bloc, avec la VRAIE date du calcul précédent (et l'écart s'il dépasse 2 jours). */
export function titreChangements(c: Changements): string {
  if (!c.depuis) return "Ce qui a changé : premier calcul publié";
  const base = `Ce qui a changé depuis le calcul du ${fmtDateCourte(c.depuis)}`;
  return c.jours > 2 ? `${base} (dernier calcul précédent, il y a ${c.jours} jours)` : base;
}

/** Les 30 lignes affichées. */
export function historique30(a: Analyse): LigneHistorique[] {
  return a.history.slice(0, 30);
}

/** Date du dernier calcul publié en dollars (pour la note de l'historique), ou null. */
export function dernierCalculEnDollars(a: Analyse): string | null {
  return a.history.find((h) => h.currency === "USD")?.date ?? null;
}

export function premierCalcul(a: Analyse): string {
  return a.history.length ? a.history[a.history.length - 1].date : a.latest.date;
}

/** Résumé daté à copier (texte brut : résumé + date + adresse). */
export function resumeACopier(a: Analyse, url: string): string {
  const l = a.latest;
  return [
    `${h1Analyse(a)}, calcul du ${fmtDateCourte(l.date)} à ${fmtHeureUtc(l.calculatedAt)} UTC (cours de clôture en euros, source : ${l.sourceLabel}).`,
    ...resume(a),
    `Calcul automatique, pas un conseil en investissement. Les crypto-actifs peuvent perdre tout ou partie de leur valeur. ${url}`,
  ].join("\n");
}

/** Décimales d'un prix dans le CSV : 2 au-dessus de 1, 4 en dessous (ordre de grandeur de la source). */
function decimalesPrix(x: number): number {
  return Math.abs(x) >= 1 ? 2 : 4;
}

/**
 * Fichier CSV complet (séparateur « ; », décimales à virgule, pour un tableur réglé en français). Reprise L2 : valeurs
 * arrondies (prix 2 ou 4 décimales, RSI et volatilité 2), colonnes paire, clôture et heure du calcul (vides pour les
 * lignes importées, qui ne les portaient pas), lignes retirées absentes.
 */
export function csvHistorique(a: Analyse): string {
  const n = (x: number | undefined, d: number) => (x == null || !Number.isFinite(x) ? "" : String(Number(x.toFixed(d))).replace(".", ","));
  const lignes = [
    "date_calcul;calcule_le;cloture_du;devise;paire;prix;rsi14;ma50;ma200;volatilite_30j_pct;tendance_calculee;origine;source",
    ...a.history.map((h) => {
      const dp = decimalesPrix(h.price);
      return [
        h.date,
        h.calculatedAt ?? "",
        h.closeDate ?? "",
        h.currency,
        h.pair ?? "",
        n(h.price, dp),
        n(h.rsi14, 2),
        n(h.ma50, dp),
        n(h.ma200, dp),
        n(h.vol30, 2),
        h.trend,
        h.origin,
        h.source ?? "",
      ].join(";");
    }),
  ];
  return `﻿${lignes.join("\r\n")}\r\n`;
}

/* -------------------------------------------------------------------------- */
/*  Textes fixes                                                              */
/* -------------------------------------------------------------------------- */

/** « Comment lire ces indicateurs » : 4 définitions et leurs limites (texte non signé, arbitrage 6 du 08/10/2026). */
export const COMMENT_LIRE: { titre: string; texte: string }[] = [
  {
    titre: "RSI sur 14 jours",
    texte:
      "Il compare l’ampleur moyenne des hausses et des baisses de clôture, calculée par une moyenne lissée sur 14 jours (méthode de Wilder) où les jours récents pèsent le plus, sur une échelle de 0 à 100. Au-dessus de 70, on parle de zone de « surachat » ; en dessous de 30, de « survente » : ce sont des noms donnés à des niveaux, pas des prévisions. Le RSI peut rester longtemps au-dessus de 70 ou en dessous de 30.",
  },
  {
    titre: "Moyennes mobiles 50 et 200 jours",
    texte:
      "Elles font la moyenne des 50 ou des 200 dernières clôtures journalières. Elles lissent le cours pour montrer sa direction passée, avec du retard : une moyenne sur 200 jours réagit lentement à un mouvement récent.",
  },
  {
    titre: "Volatilité sur 30 jours",
    texte:
      "C’est l’écart-type des variations quotidiennes du dernier mois, ramené à une année (× √365). Une volatilité élevée veut dire que le cours a beaucoup bougé ; elle ne dit ni dans quel sens il bougera, ni s’il restera aussi agité.",
  },
  {
    titre: "Tendance calculée",
    texte:
      "C’est le résultat d’une règle fixe appliquée au cours et aux deux moyennes, rien de plus. Elle ne tient compte ni de l’actualité, ni des volumes échangés, ni de votre situation.",
  },
];

export const LIMITES =
  "Aucun de ces calculs ne connaît l’actualité, la liquidité du marché ou votre situation personnelle. Ils décrivent ce qui s’est passé.";

export function texteMethode(l: Pick<DernierCalcul, "sourceLabel" | "pair">): string {
  return `RSI de Wilder sur 14 jours ; moyennes arithmétiques des clôtures journalières sur 50 et 200 jours ; volatilité : écart-type des rendements logarithmiques quotidiens des 30 derniers jours, multiplié par √365. Données : cours de clôture journaliers en euros, source : ${l.sourceLabel}, paire ${l.pair} ; seules les journées terminées (en heure UTC) sont prises en compte, la journée en cours ne l’est pas. ${MENTION_IA}`;
}

/**
 * Mention sur l'IA (reprise L2, option b du juré juridique) : le calcul quotidien n'utilise aucune IA, mais les textes
 * fixes du gabarit ont été rédigés avec l'aide d'une IA et Kev ne les a pas encore relus. Si Kev les relit, passer à :
 * « Calcul automatique chaque matin ; les phrases viennent d’un gabarit fixe relu par l’éditeur, aucune IA n’intervient
 * dans le calcul ni dans les textes publiés chaque jour. »
 */
export const MENTION_IA =
  "Calcul automatique chaque matin ; aucune IA n’intervient dans le calcul quotidien ni dans les chiffres publiés. Les textes fixes de cette page ont été rédigés avec l’aide d’une IA.";

/** Note sous l'historique : ce que porte chaque ligne (date du calcul ≠ date du cours). */
export function noteDatesHistorique(a: Analyse): string {
  const finUsd = dernierCalculEnDollars(a);
  const euros = "Chaque calcul en euros porte la clôture de la veille (journée UTC terminée).";
  return finUsd
    ? `${euros} Les calculs publiés jusqu’au ${fmtDateCourte(finUsd)} sont en dollars, repris tels qu’ils ont été publiés : ils portaient le cours du moment du calcul, à partir des données de CoinGecko puis, depuis début octobre 2026, de Binance (paire USDT), avec CoinGecko en secours ; la source de chaque ligne n’a pas été enregistrée.`
    : euros;
}

export const AVERTISSEMENT =
  "Ces informations ne constituent pas un conseil en investissement. Les crypto-actifs sont volatils : vous pouvez perdre tout ou partie du capital investi.";

/** Seuil du bandeau « donnée ancienne » (heures depuis le dernier calcul). */
export const SEUIL_ANCIEN_H = 36;
