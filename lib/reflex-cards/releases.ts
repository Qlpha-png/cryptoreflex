/**
 * Reflex Cards — calendrier EFFECTIF des sorties (décision Kev, 03/10/2026) :
 * la saison 1 ne suit plus des dates fixes. La partie 1 (Genèse) est sortie au lancement ; chaque partie suivante
 * sort quand le jeu atteint un palier de joueurs inscrits (comptes), une partie au plus par jour. Tant qu'elle n'est pas
 * sortie, une partie est « en attente » : ses cartes restent secrètes, l'album affiche « dès N joueurs » et non une date.
 *
 * Sources, par priorité :
 *  1. REFLEX_CARDS_RELEASES (variable serveur, JSON) : dates forcées à la main, { "1": "2026-10-20", "2": null… } ;
 *  2. le registre KV « rc:releases:v1 » : dates déjà déclenchées (une sortie ne se « dé-sort » jamais) ;
 *  3. le déclenchement automatique : joueurs inscrits ≥ palier → sortie datée d'aujourd'hui, enregistrée en KV.
 * Paliers : REFLEX_CARDS_RELEASE_PLAYERS = « 20,40,70,… » (11 nombres, parties 2 à 12), sinon la liste par défaut.
 * Les paliers et le nombre de joueurs ne sont JAMAIS affichés aux joueurs (Kev 03/10) : une partie non sortie est une « future sortie ».
 *
 * Tout ce qui dépend du jour de sortie passe par partDay() du moteur (setPartDays), appelé par applyReleases() au début de
 * chaque route et page concernée. Par défaut (avant applyReleases), seule la partie 1 est sortie : jamais une sortie par
 * accident sur une lambda froide.
 */
import "server-only";
import raw from "@/data/reflex-cards-game.json";
import { getKv } from "@/lib/kv";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";
import { FAR, setPartDays } from "./engine";
import { launchDate, parisToday } from "./season";

const PARTS = (raw as unknown as { paliers: { parties: { jour: number; collection: string; partie: number }[] } }).paliers.parties;
export const N_PARTS = PARTS.length;
/** paliers de joueurs inscrits pour les parties 2 à 12 (cumulés) */
export const DEFAULT_PLAYERS = [20, 40, 70, 100, 150, 200, 275, 350, 450, 600, 800];
const KV_RELEASES = "rc:releases:v1";
const KV_PLAYERS = "rc:players:v1";
const PLAYERS_TTL = 10 * 60_000;
const MEM_TTL = 60_000;

export interface Releases {
  /** date de sortie « AAAA-MM-JJ » de chaque partie, null = en attente */
  dates: (string | null)[];
  /** jour de saison de chaque sortie (FAR = en attente) */
  days: number[];
  /** joueurs inscrits (comptes) connus au dernier comptage — usage interne, jamais affiché */
  players: number;
  /** prochaine partie en attente et son palier — usage interne */
  next: { part: number; need: number; have: number } | null;
  /** révélation de l'Équipe de la saison (3 jours après la Collection 3, partie 1) et fin de saison (12 jours après la dernière) */
  totyDay: number;
  endDay: number;
}

export function releasePlayers(): number[] {
  const v = process.env.REFLEX_CARDS_RELEASE_PLAYERS?.trim();
  if (!v) return DEFAULT_PLAYERS;
  const xs = v.split(/[,; ]+/).map((x) => Number(x)).filter((n) => Number.isInteger(n) && n > 0);
  return xs.length === N_PARTS - 1 && xs.every((n, i) => i === 0 || n >= xs[i - 1]) ? xs : DEFAULT_PLAYERS;
}
const isDate = (v: unknown): v is string => typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v));
/** dates forcées (variable serveur) : tableau ou objet { index: date|null } */
export function manualReleases(env = process.env.REFLEX_CARDS_RELEASES): (string | null | undefined)[] {
  const out: (string | null | undefined)[] = [];
  if (!env?.trim()) return out;
  try {
    const j = JSON.parse(env) as unknown;
    const entries = Array.isArray(j) ? j.map((v, i) => [String(i), v] as const) : Object.entries(j as Record<string, unknown>);
    for (const [k, v] of entries) {
      const i = Number(k);
      if (!Number.isInteger(i) || i < 0 || i >= N_PARTS) continue;
      if (v === null) out[i] = null;
      else if (isDate(v)) out[i] = v;
    }
  } catch { /* JSON illisible : ignoré, journalisé plus bas */ console.warn("[reflex-cards] REFLEX_CARDS_RELEASES illisible"); }
  return out;
}

/** le cœur, sans effet de bord : les dates effectives à partir du registre, des paliers, du compte de joueurs et des forçages */
export function computeReleases(o: {
  launch: string; today: string; players: number; stored: (string | null)[]; thresholds: number[]; manual?: (string | null | undefined)[];
}): { dates: (string | null)[]; changed: boolean } {
  const dates: (string | null)[] = Array.from({ length: N_PARTS }, (_, i) => (i === 0 ? o.launch : o.stored[i] ?? null));
  const before = JSON.stringify(dates);
  /* une sortie enregistrée ne recule jamais : on ne garde que les dates ≤ aujourd'hui et croissantes */
  for (let i = 1; i < N_PARTS; i++) if (dates[i] && (dates[i]! > o.today || (dates[i - 1] && dates[i]! < dates[i - 1]!))) dates[i] = null;
  /* déclenchement automatique : la partie suivante sort quand le palier est atteint, au plus une partie par jour */
  for (let i = 1; i < N_PARTS; i++) {
    if (dates[i]) continue;
    const prev = dates[i - 1];
    if (!prev || prev >= o.today) break;
    if (o.players >= (o.thresholds[i - 1] ?? Infinity)) dates[i] = o.today;
    break;
  }
  /* forçages à la main, en dernier : ils priment (y compris pour retirer une sortie, null) */
  if (o.manual) for (let i = 1; i < N_PARTS; i++) if (o.manual[i] !== undefined) dates[i] = o.manual[i] ?? null;
  return { dates, changed: JSON.stringify(dates) !== before };
}

const dayOf = (launch: string, date: string | null): number => (date ? Math.round((Date.parse(date) - Date.parse(launch)) / 86_400_000) + 1 : FAR);

export function toReleases(launch: string, dates: (string | null)[], players: number, thresholds: number[]): Releases {
  const days = dates.map((d) => dayOf(launch, d));
  const i = dates.findIndex((d, k) => k > 0 && !d);
  const next = i > 0 ? { part: i, need: thresholds[i - 1] ?? 0, have: players } : null;
  const totyDay = days[6] < FAR ? days[6] + 3 : FAR;
  const endDay = days[N_PARTS - 1] < FAR ? days[N_PARTS - 1] + 12 : FAR;
  return { dates, days, players, next, totyDay, endDay };
}

/* ---------- accès aux données (KV, Supabase), avec mémoire courte par lambda ---------- */
let MEM: { at: number; rel: Releases } | null = null;
let PLAYERS_MEM: { at: number; n: number } | null = null;

async function countPlayers(): Promise<number> {
  const now = Date.now();
  if (PLAYERS_MEM && now - PLAYERS_MEM.at < PLAYERS_TTL) return PLAYERS_MEM.n;
  const kv = getKv();
  if (!kv.mocked) {
    const c = await kv.get<{ n: number; at: number }>(KV_PLAYERS).catch(() => null);
    if (c && typeof c.n === "number" && now - c.at < PLAYERS_TTL) { PLAYERS_MEM = { at: c.at, n: c.n }; return c.n; }
  }
  const sb = createSupabaseServiceRoleClient();
  let n = PLAYERS_MEM?.n ?? 0;
  if (sb) {
    const { count, error } = await sb.from("rc_players").select("player_id", { count: "exact", head: true }).not("owner", "is", null);
    if (!error && typeof count === "number") n = count;
    else console.warn("[reflex-cards] comptage des joueurs impossible", error?.message);
  }
  PLAYERS_MEM = { at: now, n };
  if (!kv.mocked) await kv.set(KV_PLAYERS, { n, at: now }, { ex: 3600 }).catch(() => {});
  return n;
}

/** les sorties effectives du moment (mémoire 60 s par lambda) */
export async function releases(): Promise<Releases> {
  const now = Date.now();
  if (MEM && now - MEM.at < MEM_TTL) return MEM.rel;
  const launch = launchDate();
  const thresholds = releasePlayers();
  if (!launch) { const rel = toReleases("2000-01-01", Array.from({ length: N_PARTS }, () => null), 0, thresholds); MEM = { at: now, rel }; return rel; }
  const kv = getKv();
  const stored = kv.mocked ? [] : ((await kv.get<{ dates?: (string | null)[] }>(KV_RELEASES).catch(() => null))?.dates ?? []);
  const players = await countPlayers();
  const { dates, changed } = computeReleases({ launch, today: parisToday(), players, stored, thresholds, manual: manualReleases() });
  if (changed && !kv.mocked) {
    /* on n'enregistre que ce qui vient du jeu lui-même (les forçages restent dans la variable serveur) */
    const auto = computeReleases({ launch, today: parisToday(), players, stored, thresholds }).dates;
    await kv.set(KV_RELEASES, { dates: auto, updated: new Date().toISOString() }).catch((e) => console.warn("[reflex-cards] registre des sorties non enregistré", e));
  }
  const rel = toReleases(launch, dates, players, thresholds);
  MEM = { at: now, rel };
  return rel;
}

/** à appeler au début de toute route ou page qui utilise le moteur : branche le calendrier effectif sur le moteur */
export async function applyReleases(): Promise<Releases> {
  const rel = await releases();
  setPartDays(rel.days, rel.totyDay, rel.endDay);
  return rel;
}

/** libellé public d'une partie pas encore sortie (Kev 03/10 : on n'affiche jamais les paliers de joueurs) */
export const FUTURE_LABEL = "Future sortie";
