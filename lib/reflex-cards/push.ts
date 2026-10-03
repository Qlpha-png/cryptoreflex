/**
 * Reflex Cards — règles des notifications (PWA, option A, Kev 03/10/2026) : pures, sans réseau, testées
 * (tests/lib/reflex-cards-push.test.ts). Le cron app/api/cron/reflex-cards-push/route.ts les applique toutes les 15 minutes.
 *
 * Trois notifications, pour les joueurs abonnés au sujet « cartes » (bouton du jeu, public/reflex-cards/pwa.js) :
 *  - « réserve pleine » : la réserve (10 boosters, 1 toutes les 15 min) vient de se remplir — joueur actif ces 14 derniers
 *    jours, pas en train de jouer, jamais deux fois pour la même réserve ni en moins de 2 h 30 ;
 *  - « quiz du jour » : le soir, une fois, à ceux qui ne l'ont pas encore joué ;
 *  - « nouvelle sortie » : une partie vient de sortir (calendrier effectif) → tous les abonnés.
 * Jamais entre 22 h et 8 h (heure de Paris).
 */
import { RULES, dayAdd } from "./engine";
import { GAME_ICONS } from "./pwa";

/** sujet Web Push choisi dans le jeu (user_push_subscriptions.topics) */
export const TOPIC = "cartes";
/** heures calmes (Paris) : aucune notification de 22 h à 8 h */
export const QUIET_FROM = 22;
export const QUIET_TO = 8;
/** « réserve pleine » : jamais deux fois en moins de 2 h 30 (le temps de remplir 10 boosters) */
export const FULL_COOLDOWN_MS = 150 * 60_000;
/** joueur en train de jouer (partie modifiée il y a moins de 20 min) : on ne le dérange pas */
export const PLAYING_MS = 20 * 60_000;
/** joueur actif : a joué l'un des 14 derniers jours */
export const ACTIVE_DAYS = 14;
/** rappel du quiz du jour : la fenêtre 18 h 00-18 h 59 (Paris), une fois par jour (marqueur KV) */
export const QUIZ_HOUR = 18;
/** marqueurs KV */
export const KV_FULL = "rc:push:full:"; // + player_id → FullMark
export const KV_QUIZ = "rc:push:quiz:"; // + date → horodatage de l'envoi
export const KV_RELEASES = "rc:push:releases:v1"; // { dates } déjà annoncées

export const parisHour = (at: Date): number =>
  Number(new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Paris", hour: "2-digit", hourCycle: "h23" }).format(at));
export const isQuietHour = (at: Date): boolean => {
  const h = parisHour(at);
  return h >= QUIET_FROM || h < QUIET_TO;
};
export const quizWindow = (at: Date): boolean => parisHour(at) === QUIZ_HOUR;
export const isActive = (days: readonly string[], today: string): boolean => {
  const since = dayAdd(today, -ACTIVE_DAYS);
  return days.some((d) => d >= since);
};

/** instant (ms) où la réserve sera pleine ; null si la base la dit déjà pleine (remplissage paresseux : stock_at ne bouge
 *  qu'aux gestes du joueur, donc une réserve pleine en base n'a pas changé depuis la dernière annonce) ou date illisible */
export function fullAt(stock: number, stockAt: string | number, maxs: number = RULES.maxs, cycle: number = RULES.cycle): number | null {
  if (stock >= maxs) return null;
  const at = typeof stockAt === "number" ? stockAt : Date.parse(stockAt);
  return Number.isFinite(at) ? at + (maxs - stock) * cycle : null;
}

export interface FullCandidate { player_id: string; owner: string; stock: number; stock_at: string; updated_at: string; days: string[] }
/** dernière annonce « réserve pleine » d'une partie : quand, et pour quelle réserve (stock_at) */
export interface FullMark { at: number; stockAt: string }

export function planFull(p: FullCandidate, mark: FullMark | null | undefined, now: number, today: string): boolean {
  const full = fullAt(p.stock, p.stock_at);
  if (full === null || full > now) return false;
  if (!isActive(p.days, today)) return false;
  const upd = Date.parse(p.updated_at);
  if (Number.isFinite(upd) && now - upd < PLAYING_MS) return false;
  if (mark && (mark.stockAt === p.stock_at || now - mark.at < FULL_COOLDOWN_MS)) return false;
  return true;
}

/** parties sorties (date ≤ aujourd'hui) pas encore annoncées — index ≥ 1 : l'index 0 est la partie du lancement */
export function newReleases(dates: readonly (string | null)[], notified: readonly (string | null | undefined)[], today: string): number[] {
  const out: number[] = [];
  for (let i = 1; i < dates.length; i++) {
    const d = dates[i];
    if (d && d <= today && notified[i] !== d) out.push(i);
  }
  return out;
}

export interface Msg { title: string; body: string; icon: string; url: string; tag: string }
/** les messages (vouvoiement, comme tout le jeu) ; `url` : l'onglet du jeu ouvert au clic (public/sw.js) */
export const MSG = {
  full: {
    title: "Reflex Cards",
    body: `Votre réserve de boosters est pleine : ${RULES.maxs} boosters vous attendent.`,
    icon: GAME_ICONS.any192,
    url: "/cartes/jouer#booster",
    tag: "rc-reserve",
  } satisfies Msg,
  quiz: {
    title: "Reflex Cards — quiz du jour",
    body: "Le quiz du jour vous attend : 5 questions, jusqu'à 40 Reflets et un booster bonus.",
    icon: GAME_ICONS.any192,
    url: "/cartes/jouer#defis",
    tag: "rc-quiz",
  } satisfies Msg,
  release: (i: number): Msg => {
    const p = RULES.parts[i];
    return {
      title: "Reflex Cards — nouvelle sortie",
      body: p ? `Collection « ${p.collection} », partie ${p.partie} : de nouvelles cartes à tirer dès maintenant !` : "De nouvelles cartes viennent de sortir : à vous de jouer !",
      icon: GAME_ICONS.any192,
      url: "/cartes/jouer#booster",
      tag: `rc-release-${i}`,
    };
  },
};
