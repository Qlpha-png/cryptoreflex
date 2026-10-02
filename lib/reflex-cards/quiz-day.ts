/**
 * Reflex Cards — « Quiz du jour » (plan validé par Kev le 02/10/2026).
 *
 * 5 questions à choix multiples sur les cartes SORTIES (année de naissance, ticker, chapitre de l'album, rareté), les mêmes
 * toute la journée pour un joueur (tirage déterministe : partie + date), une seule partie par jour, réponses vérifiées par
 * le serveur (le navigateur ne reçoit jamais la bonne réponse avant d'avoir joué).
 * Récompenses : 3/5 → +20 Reflets · 4/5 → +40 Reflets · 5/5 → +40 Reflets et 1 booster bonus.
 */
import "server-only";
import { createHash } from "node:crypto";
import raw from "@/data/reflex-cards-game.json";

type Row = [string, string, string, string, number, string, string, number, ...unknown[]];
type Palier = { fam: string; r: string; part: number };
const RAW = raw as unknown as {
  cards: Row[];
  paliers: { cartes: Record<string, Palier>; parties: { jour: number }[]; fossiles: Record<string, unknown> };
  publiques: string[];
};
const RNAME: Record<string, string> = { C: "Commune", PC: "Peu commune", R: "Rare", SR: "Super rare", UR: "Ultra rare", L: "Légendaire" };
const PUBLIQUES = new Set(RAW.publiques);

export interface QjQuestion { q: string; c: string[]; ok: number }
export const QJ_LEN = 5;

/** carte en clair ce jour-là (sortie ou publique) — jamais une carte à venir, qui trahirait la saison */
const released = (id: string, day: number) => {
  if (RAW.paliers.fossiles[id]) return false;
  const p = RAW.paliers.cartes[id];
  return !!p && (PUBLIQUES.has(id) || (day >= 1 && RAW.paliers.parties[p.part]?.jour <= day));
};

/** générateur déterministe (mulberry32) amorcé par l'empreinte de « clé|date » */
function rng(seed: string) {
  let a = createHash("sha256").update(seed).digest().readUInt32LE(0);
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const pick = <T>(r: () => number, xs: T[]) => xs[Math.floor(r() * xs.length)];
function shuffle<T>(r: () => number, xs: T[]): T[] {
  const a = [...xs];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}
/** 3 leurres distincts de la bonne réponse, tirés dans `pool` */
function decoys(r: () => number, pool: string[], good: string): string[] {
  const out: string[] = [];
  const cand = shuffle(r, [...new Set(pool)].filter((x) => x.toLowerCase() !== good.toLowerCase()));
  for (const x of cand) { if (out.length === 3) break; out.push(x); }
  return out;
}
function mcq(r: () => number, q: string, good: string, pool: string[]): QjQuestion | null {
  const d = decoys(r, pool, good);
  if (d.length < 3) return null;
  const c = shuffle(r, [good, ...d]);
  return { q, c, ok: c.indexOf(good) };
}

/** les 5 questions du jour pour une partie (même résultat à chaque appel le même jour) */
export function quizDay(playerKey: string, date: string, day: number): QjQuestion[] {
  const r = rng(`${playerKey}|${date}|quiz-du-jour`);
  const rows = RAW.cards.filter((row) => row[1] && row[2] && released(row[0], day));
  const fams = [...new Set(rows.map((row) => RAW.paliers.cartes[row[0]].fam))];
  const years = [...new Set(rows.map((row) => row[7]).filter((y) => y > 1990))].map(String);
  const syms = rows.map((row) => row[2].toUpperCase());
  const used = new Set<string>();
  const out: QjQuestion[] = [];
  const kinds = shuffle(r, ["year", "ticker", "fam", "rar", "ticker", "year", "fam"]);
  for (let k = 0; out.length < QJ_LEN && k < 60; k++) {
    const kind = kinds[k % kinds.length];
    const pool = kind === "year" ? rows.filter((row) => row[7] > 1990) : rows;
    if (!pool.length) continue;
    const row = pick(r, pool);
    if (used.has(row[0])) continue;
    const [id, name, sym] = row, pal = RAW.paliers.cartes[id];
    let q: QjQuestion | null = null;
    if (kind === "year") q = mcq(r, `En quelle année est né ${name} (${sym.toUpperCase()}) ?`, String(row[7]), years);
    else if (kind === "ticker") q = mcq(r, `Quel est le ticker de ${name} ?`, sym.toUpperCase(), syms);
    else if (kind === "fam") q = mcq(r, `Dans quel chapitre de l'album se range ${name} (${sym.toUpperCase()}) ?`, pal.fam, fams);
    else q = mcq(r, `Quelle est la rareté de la carte ${name} ?`, RNAME[pal.r], Object.values(RNAME));
    if (!q) continue;
    used.add(id);
    out.push(q);
  }
  return out;
}

/** récompense selon le score (sur 5) */
export function qjReward(score: number): { reflets: number; booster: number } {
  if (score >= 5) return { reflets: 40, booster: 1 };
  if (score === 4) return { reflets: 40, booster: 0 };
  if (score === 3) return { reflets: 20, booster: 0 };
  return { reflets: 0, booster: 0 };
}
