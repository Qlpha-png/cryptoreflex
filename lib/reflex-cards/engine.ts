/**
 * Reflex Cards — moteur serveur (phase B1, plan validé par Kev le 02/10/2026).
 *
 * Les règles viennent de data/reflex-cards-rules.json, exporté du jeu v9 lui-même (Reflex-Cards/src/export-rules.mjs) :
 * cartes, album, éditions, finitions, garanties, économie, quiz, missions par date, éphémères, objets, défis.
 * Ce module est PUR (aucun accès à la base) : il lit l'état d'une partie et calcule le « patch » à appliquer
 * (supabase/migrations/20261002_reflex_cards_b1.sql → rc_apply). Le hasard est cryptographique (node:crypto).
 */
import "server-only";
import { randomInt } from "node:crypto";
import RULES_RAW from "@/data/reflex-cards-rules.json";

export type Rar = "C" | "PC" | "R" | "SR" | "UR" | "L";
type Fin = "holo" | "ag" | "or" | "onyx";
interface RCard { id: string; r: Rar; fam: string; noto: number; num: number | string; part: number | null; legende?: 1; fossil?: 1; year?: number }
interface Rules {
  rar: Rar[];
  cards: RCard[];
  parts: { jour: number; collection: string; partie: number }[];
  pages: string[][];
  wRar: Record<Rar, number>;
  ed: Record<string, { p: number; list: string[] }>;
  totyFromDay: number;
  relics: string[];
  relicP: number;
  fin: Record<Fin, { p: number; cap?: number }>;
  finOrder: Fin[];
  pity: { R: number; SR: number; UR: number };
  onboard: { SR: number; UR: number };
  shardDup: Record<Rar, number>;
  edDup: Record<string, number>;
  craft: Record<Rar, number>;
  maxs: number;
  cycle: number;
  quiz: Record<string, string>;
  qzRew: number;
  qzCap: number;
  missions: { id: string; k: string; g: number; r: number }[];
  missionsByDate: Record<string, string[]>;
  week: { goal: number; rew: number };
  eph: Record<string, string[]>;
  cos: { id: string; ty: string; r: string; src: string; price?: number; title?: string }[];
  cosDefault: Record<string, string>;
  cosOwned: string[];
  svc: { id: string; p: number; per: "day" | "week" }[];
  families: string[];
  quests: { id: string; goal: number; card?: string }[];
  themes: { id: string; rew: number; fams?: boolean; cards?: string[] }[];
  titles: string[];
}
export const RULES = RULES_RAW as unknown as Rules;
export const RAR = RULES.rar;
const RNK = (r: Rar) => RAR.indexOf(r);
export const CARD = new Map(RULES.cards.map((c) => [c.id, c]));
const BASE = RULES.cards.filter((c) => !c.fossil);
const PUBLIQUES = new Set([...RULES.ed.icon.list, ...RULES.ed.trophy.list]);
const ED_ORDER = ["myth", "toty", "icon", "bds", "fossil"] as const;
const PRESTIGE_ED: Record<string, number> = { relic: 10, myth: 9, toty: 8, icon: 7, trophy: 5.5, bds: 5.1, fossil: 3.6 };
const FIN_BONUS: Record<Fin, number> = { holo: 0.3, ag: 0.5, or: 0.7, onyx: 0.9 };
const COS = new Map(RULES.cos.map((x) => [x.id, x]));

/* ---------- dates (heure de Paris) ---------- */
export const dayAdd = (s: string, n: number): string => {
  const d = new Date(s + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};
export const weekStart = (s: string): string => dayAdd(s, -((new Date(s + "T12:00:00Z").getUTCDay() + 6) % 7));

/* ---------- hasard cryptographique ---------- */
const SCALE = 2 ** 47;
export type Rnd = () => number;
export const cryptoRnd: Rnd = () => randomInt(0, SCALE) / SCALE;
const pick = <T>(a: T[], rnd: Rnd): T => a[Math.floor(rnd() * a.length)];

/* ---------- sorties ---------- */
export const relDay = (c: RCard): number => (c.fossil ? 1 : RULES.parts[c.part as number].jour);
export const isOut = (c: RCard, day: number): boolean => relDay(c) <= day;
/** carte connue du joueur ce jour-là (mêmes règles que la page publique : sorties, Fossiles, Icônes, Trophées) */
export const inClear = (id: string, day: number): boolean => {
  const c = CARD.get(id);
  return !!c && (!!c.fossil || PUBLIQUES.has(id) || isOut(c, day));
};
export const craftDay = (c: RCard): number => (c.fossil ? 1 : relDay(c) + ((c.part as number) > 0 ? 7 : 0));

interface DayTables { byRD: Record<Rar, RCard[]>; ed: Record<string, { p: number; list: string[] }> }
const DAYC = new Map<number, DayTables>();
export function dayTables(day: number): DayTables {
  const hit = DAYC.get(day);
  if (hit) return hit;
  const byRD = Object.fromEntries(RAR.map((r) => [r, BASE.filter((c) => c.r === r && isOut(c, day)).sort((a, b) => a.noto - b.noto)])) as Record<Rar, RCard[]>;
  const ed: DayTables["ed"] = {};
  for (const k of ED_ORDER) {
    let list = RULES.ed[k].list.filter((id) => inClear(id, day));
    if (k === "toty" && day < RULES.totyFromDay) list = [];
    ed[k] = { p: list.length ? RULES.ed[k].p : 0, list };
  }
  const t = { byRD, ed };
  DAYC.set(day, t);
  return t;
}

/* ---------- tirage (portage fidèle de drawPack du jeu v9) ---------- */
export interface Item { id: string; ed: string | null; fin: Fin | null; serial?: number | null; pity?: Rar }
export interface Pity { R: number; SR: number; UR: number; opened: number; gotSR: boolean; gotUR: boolean }
const rarOf = (it: Item): Rar | null => (it.ed ? null : CARD.get(it.id)!.r);
const baseRank = (it: Item) => (it.ed ? -1 : RNK(CARD.get(it.id)!.r));
const prestige = (it: Item) => (it.ed ? PRESTIGE_ED[it.ed] : RNK(CARD.get(it.id)!.r) + (it.fin ? FIN_BONUS[it.fin] : 0));
function rollFin(rnd: Rnd): Fin | null {
  let x = rnd();
  for (const k of RULES.finOrder) {
    if (x < RULES.fin[k].p) return k;
    x -= RULES.fin[k].p;
  }
  return null;
}
function baseItem(r: Rar, day: number, fam: string | null, rnd: Rnd): Item {
  const all = dayTables(day).byRD[r];
  const pool = fam && all.some((c) => c.fam === fam) ? all.filter((c) => c.fam === fam) : all;
  return { id: pick(pool, rnd).id, ed: null, fin: rollFin(rnd) };
}
function drawOne(day: number, fam: string | null, rnd: Rnd): Item {
  const T = dayTables(day);
  if (rnd() < RULES.relicP * RULES.relics.length) return { id: pick(RULES.relics, rnd), ed: "relic", fin: null };
  let x = rnd();
  for (const k of ED_ORDER) {
    if (x < T.ed[k].p) return { id: pick(T.ed[k].list, rnd), ed: k, fin: null };
    x -= T.ed[k].p;
  }
  let y = rnd(), r: Rar = "C";
  for (const k of RAR) {
    if ((y -= RULES.wRar[k]) < 0) { r = k; break; }
  }
  return baseItem(r, day, fam, rnd);
}
/** un booster de 5 cartes ; `ps` (garanties) est mis à jour */
export function drawPack(day: number, ps: Pity, fam: string | null, rnd: Rnd = cryptoRnd): Item[] {
  const out: Item[] = [], seen = new Set<string>();
  for (let i = 0; i < 5; i++) {
    let it = drawOne(day, fam, rnd);
    /* doublon dans le même paquet : une autre carte DE LA MÊME RARETÉ */
    for (let t = 0; t < 6 && seen.has(it.id + "|" + it.ed); t++) it = it.ed ? drawOne(day, fam, rnd) : baseItem(rarOf(it)!, day, fam, rnd);
    seen.add(it.id + "|" + it.ed);
    out.push(it);
  }
  ps.opened++;
  const best = () => Math.max(-1, ...out.map(baseRank));
  const force = (t: Rar) => {
    let lo = -1;
    out.forEach((it, i) => { if (!it.ed && (lo < 0 || baseRank(it) < baseRank(out[lo]))) lo = i; });
    if (lo < 0) lo = 0;
    out[lo] = { ...baseItem(t, day, fam, rnd), pity: t };
  };
  const b = best();
  if (!ps.gotUR && ps.opened === RULES.onboard.UR && b < RNK("UR")) force("UR");
  else if (!ps.gotSR && ps.opened === RULES.onboard.SR && b < RNK("SR")) force("SR");
  else if (ps.UR + 1 >= RULES.pity.UR && b < RNK("UR")) force("UR");
  else if (ps.SR + 1 >= RULES.pity.SR && b < RNK("SR")) force("SR");
  else if (ps.R + 1 >= RULES.pity.R && b < RNK("R")) force("R");
  const b2 = best();
  ps.R = b2 >= RNK("R") ? 0 : ps.R + 1;
  ps.SR = b2 >= RNK("SR") ? 0 : ps.SR + 1;
  ps.UR = b2 >= RNK("UR") ? 0 : ps.UR + 1;
  if (b2 >= RNK("SR")) ps.gotSR = true;
  if (b2 >= RNK("UR")) ps.gotUR = true;
  return out.sort((a, b2_) => prestige(a) - prestige(b2_));
}

/* ---------- état d'une partie ---------- */
export interface CardRow { n: number; holo: number; fins: { ag: number[]; or: number[]; onyx: number[] }; t: number }
export interface PlayerRow {
  version: number; pseudo: string; reflets: number; eclats: number; stock: number; stock_at: string; pity: Pity;
  opened: number; theme: string | null; first_day: string; days: string[]; perso: Record<string, unknown>; recent: unknown[];
}
export interface GameState {
  player: PlayerRow;
  cards: Map<string, CardRow>;
  eds: Map<string, { n: number; t: number }>;
  cos: Map<string, { no: number | null; t: number }>;
  claims: Set<string>;
  days: Map<string, { ev: Record<string, number>; colp: ColpDay | null }>;
  quiz: Map<string, { ok: boolean; day: string }>;
}
export interface ColpDay { k: string; offers: { r: Rar; id: string; done?: boolean }[]; line: number }
export interface Patch {
  player?: Record<string, unknown>;
  cards?: { i?: number; id: string; dn: number; dholo?: number; fin?: "ag" | "or" | "onyx" }[];
  eds?: { ed: string; id: string; dn: number }[];
  cos?: { id: string; no: number | null }[];
  claims?: string[];
  day?: { day: string; inc?: Record<string, number>; colp?: ColpDay };
  quiz?: { id: string; ok: boolean; day: string };
  draw?: { req: string; kind: string; day: number; cards: Item[] };
}
export class GameError extends Error {
  constructor(public code: string, message: string) { super(message); }
}

/** nombre de doublons échangeables (l'exemplaire de l'album et les numérotées restent) */
export const tradeN = (s: GameState, id: string): number => {
  const e = s.cards.get(id);
  if (!e) return 0;
  return Math.max(0, e.n - 1 - (e.fins.ag.length + e.fins.or.length + e.fins.onyx.length));
};

/* ---------- réserve de boosters (1 toutes les 15 min, 10 au plus) ---------- */
export function refill(p: PlayerRow, now: number): { stock: number; stockAt: number } {
  let stock = p.stock, at = Date.parse(p.stock_at);
  if (stock >= RULES.maxs) return { stock, stockAt: now };
  const g = Math.floor((now - at) / RULES.cycle);
  if (g > 0) {
    stock = Math.min(RULES.maxs, stock + g);
    at = stock >= RULES.maxs ? now : at + g * RULES.cycle;
  }
  return { stock, stockAt: at };
}

/** ouvrir un booster : tirage, garanties, Éclats des doublons, compteurs du jour, journal */
export function planOpen(s: GameState, o: { day: number; today: string; now: number; req: string; rnd?: Rnd }) {
  const { stock, stockAt } = refill(s.player, o.now);
  if (stock <= 0) throw new GameError("no_pack", "Plus de booster pour l'instant : le prochain arrive dans moins de 15 minutes.");
  const fam = s.player.theme && RULES.families.includes(s.player.theme) ? s.player.theme : null;
  const ps: Pity = { ...s.player.pity };
  const items = drawPack(o.day, ps, fam, o.rnd ?? cryptoRnd);
  /* nouveautés et Éclats, carte après carte dans l'ordre de révélation */
  const owned = new Set(s.cards.keys()), ownedEd = new Set(s.eds.keys());
  let gain = 0, nw = 0;
  const results = items.map((it) => {
    let isNew: boolean, g = 0;
    if (it.ed) {
      const k = it.ed + "|" + it.id;
      isNew = !ownedEd.has(k);
      if (!isNew) g = RULES.edDup[it.ed] ?? 0;
      ownedEd.add(k);
    } else {
      isNew = !owned.has(it.id);
      if (!isNew) g = RULES.shardDup[CARD.get(it.id)!.r];
      owned.add(it.id);
    }
    gain += g;
    if (isNew) nw++;
    return { isNew, gain: g };
  });
  const recent = [...items.map((it) => ({ id: it.id, ed: it.ed, fin: it.fin, serial: null })), ...(s.player.recent as unknown[])].slice(0, 12);
  const patch: Patch = {
    player: { stock: stock - 1, stock_at: new Date(stock >= RULES.maxs ? o.now : stockAt).toISOString(), pity: ps, opened: 1, eclats: gain, recent, ...(fam ? { theme: null } : {}) },
    cards: items.flatMap((it, i) => (it.ed ? [] : [{ i, id: it.id, dn: 1, dholo: it.fin === "holo" ? 1 : 0, ...(it.fin && it.fin !== "holo" ? { fin: it.fin } : {}) }])),
    eds: items.filter((it) => it.ed).map((it) => ({ ed: it.ed as string, id: it.id, dn: 1 })),
    day: { day: o.today, inc: { opened: 1, ...(nw ? { newc: nw } : {}) } },
    draw: { req: o.req, kind: fam ? "theme:" + fam : "normal", day: o.day, cards: items },
  };
  return { patch, items, results, theme: fam };
}

/* ---------- missions du jour ---------- */
export function activeMissions(s: GameState, today: string) {
  const out: { d: string; id: string; k: string; g: number; r: number; key: string; cl: boolean; p: number }[] = [];
  for (let a = 2; a >= 0; a--) {
    const d = dayAdd(today, -a);
    if (d < s.player.first_day) continue;
    for (const id of RULES.missionsByDate[d] ?? []) {
      const m = RULES.missions.find((x) => x.id === id);
      if (!m) continue;
      const key = d + "|" + id, cl = s.claims.has("m|" + key);
      if (cl && a > 0) continue;
      let p = 0;
      for (let x = d; x <= today; x = dayAdd(x, 1)) p += s.days.get(x)?.ev[m.k] ?? 0;
      out.push({ d, id, k: m.k, g: m.g, r: m.r, key, cl, p: Math.min(m.g, p) });
    }
  }
  return out;
}
const missionDays = (s: GameState) => new Set([...s.claims].filter((k) => k.startsWith("m|")).map((k) => k.slice(2, 12)));
export function weekDone(s: GameState, today: string): number {
  const w = weekStart(today), md = missionDays(s);
  let n = 0;
  for (let i = 0; i < 7; i++) if (md.has(dayAdd(w, i))) n++;
  return n;
}

/* ---------- conditions (défis, collections, titres, objets mérités) ---------- */
const own = (s: GameState, id: string) => s.cards.has(id);
export const fullPages = (s: GameState) => RULES.pages.filter((P) => P.length === 9 && P.every((id) => own(s, id))).length;
const dupsWhere = (s: GameState, fn: (c: RCard) => boolean) => [...s.cards.keys()].filter((id) => { const c = CARD.get(id); return !!c && fn(c); }).reduce((t, id) => t + tradeN(s, id), 0);
const quizDone = (s: GameState) => [...s.quiz.values()].filter((q) => q.ok).length;
const fiches = (s: GameState) => [...s.claims].filter((k) => k.startsWith("f|")).length;
export function questProg(s: GameState, id: string): number {
  switch (id) {
    case "q-open": return s.player.opened;
    case "q-page": return fullPages(s);
    case "q-oracle": return RULES.cards.filter((c) => c.fam === "Oracle" && own(s, c.id)).length;
    case "q-swap": return dupsWhere(s, (c) => c.r === "C");
    case "q-l1": return dupsWhere(s, (c) => c.fam === "Layer 1");
    case "q-defi": return Math.min(dupsWhere(s, (c) => c.fam === "DeFi"), dupsWhere(s, (c) => c.fam === "DeFi" && c.r !== "C") ? 3 : 2);
    case "q-quiz": return quizDone(s);
    case "q-read": return fiches(s);
    case "q-week": return s.player.days.length;
    default: return 0;
  }
}
export function themeProg(s: GameState, th: Rules["themes"][number]) {
  return th.fams
    ? { n: RULES.families.filter((f) => BASE.some((c) => c.fam === f && own(s, c.id))).length, t: RULES.families.length }
    : { n: (th.cards ?? []).filter((id) => own(s, id)).length, t: (th.cards ?? []).length };
}
const anyEd = (s: GameState, k: string) => RULES.ed[k].list.some((id) => s.eds.has(k + "|" + id));
/* Album d'argent : toutes les cartes de l'ALBUM sauf Légendaires (les Fossiles du Musée n'en font pas partie — défaut v8 corrigé) */
export function titleOk(s: GameState, id: string): boolean {
  switch (id) {
    case "t-first": return s.cards.size > 0;
    case "t-page": return fullPages(s) > 0;
    case "t-ur": return BASE.filter((c) => c.r === "UR" && own(s, c.id)).length >= 5;
    case "t-l": return BASE.some((c) => c.r === "L" && own(s, c.id));
    case "t-icon": return anyEd(s, "icon");
    case "t-silver": return BASE.filter((c) => c.r !== "L").every((c) => own(s, c.id));
    case "t-onyx": return [...s.cards.values()].some((e) => e.fins.onyx.length > 0);
    case "t-myth": return anyEd(s, "myth");
    default: return false;
  }
}
/** objets mérités (jamais en vente) que la partie a débloqués */
export function earnedNow(s: GameState, day: number): string[] {
  const ok: Record<string, boolean> = {
    "frame-chelem": s.claims.has("t|th-gc"),
    "frame-s1": day >= 90 && BASE.filter((c) => own(s, c.id)).length / BASE.length >= 0.95,
  };
  return RULES.cos.filter((x) => x.src === "earn" && !s.cos.has(x.id) && (x.title ? titleOk(s, x.title) : ok[x.id])).map((x) => x.id);
}
export const ownsCos = (s: GameState, id: string) => RULES.cosOwned.includes(id) || s.cos.has(id);

/* ---------- le Colporteur : 3 offres figées pour la journée, jamais d'Ultra rare ni de Légendaire ---------- */
/* même tirage que le jeu (graine = jour) : une partie neuve voit les mêmes offres que sa version locale */
function h32(str: string): number {
  let h = 2166136261;
  for (const ch of str) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
function seeded(seed: number): Rnd {
  let a = seed;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export function colpOffers(s: GameState, today: string, day: number): ColpDay {
  const k = today + "|" + day, R = seeded(h32("colp|" + k));
  const rs: Rar[] = [R() < 0.5 ? "C" : "PC", R() < 0.55 ? "R" : "PC", R() < 0.35 ? "SR" : "R"];
  const offers: ColpDay["offers"] = [];
  for (const r of rs) {
    const all = dayTables(day).byRD[r].filter((c) => !offers.some((o) => o.id === c.id));
    const pool = all.filter((c) => !own(s, c.id)), src = pool.length ? pool : all;
    offers.push({ r, id: src[Math.floor(R() * src.length)].id });
  }
  return { k, offers, line: Math.floor(R() * 4) };
}

/* ---------- objets et services ---------- */
export const cosItem = (id: string) => COS.get(id);
export const onSale = (id: string, day: number) => {
  const x = COS.get(id);
  return !!x && (x.src === "etal" || (RULES.eph[String(day)] ?? []).includes(id) || (RULES.eph[String(day - 1)] ?? []).includes(id));
};
export const svcKey = (id: string, today: string) => {
  const sv = RULES.svc.find((x) => x.id === id);
  return sv ? `${id}|${sv.per === "day" ? today : weekStart(today)}` : null;
};
/** carte au hasard (récompense de défi) : de préférence une carte sortie qui manque */
export function giveNew(s: GameState, r: Rar, day: number, rnd: Rnd = cryptoRnd): string {
  const all = dayTables(day).byRD[r], pool = all.filter((c) => !own(s, c.id));
  return pick(pool.length ? pool : all, rnd).id;
}
/** retirer n doublons parmi les cartes qui vérifient fn (ordre stable) ; `spent` cumule plusieurs retraits d'une même action */
export function spendDups(s: GameState, fn: (c: RCard) => boolean, n: number, spent: Map<string, number> = new Map()): Map<string, number> {
  for (const id of [...s.cards.keys()].sort()) {
    const c = CARD.get(id);
    if (!c || !fn(c) || n <= 0) continue;
    const k = Math.min(n, tradeN(s, id) - (spent.get(id) ?? 0));
    if (k > 0) { spent.set(id, (spent.get(id) ?? 0) + k); n -= k; }
  }
  if (n > 0) throw new GameError("no_dup", "Pas assez de doublons pour ce défi.");
  return spent;
}
