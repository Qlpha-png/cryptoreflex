/**
 * Reflex Cards — la pioche chez un ami montre la VRAIE finition et le VRAI numéro de ses cartes.
 * Bug du 06/10 (même famille que « Dernières cartes obtenues », commit 2ab16081) : planOpen met dans patch.draw.cards la finition
 * PRÉVUE au tirage et pas de numéro ; rc_apply (B4) l'insérait telle quelle dans rc_draws.cards, puis attribuait le numéro (ou changeait
 * la carte en Holo, plafond du monde atteint) sans corriger le journal. rc_friend_packs / rc_friend_draw renvoient ce journal aux amis,
 * et le jeu inventait le numéro (card() le fabriquait par hachage, les libellés prenaient « 01 ») : « Argent 01/99 » pour toute Argent,
 * une Argent devenue Holo restait affichée en Argent.
 * Correctif : migration B5 (rc_apply écrit le vrai numéro dans le journal, même transaction) + le jeu n'invente plus aucun numéro.
 * Vraies migrations sur PGlite, vraie route des données sociales (socialView), vrai code du jeu (extrait du gabarit généré).
 */
import { describe, it, expect } from "vitest";
import { makeGameDb, fakeSupabase } from "../fixtures/rc-pglite";
import { CARD, planOpen, type GameState, type Item, type Rnd } from "@/lib/reflex-cards/engine";
import { loadGame, runAction } from "@/lib/reflex-cards/store";
import { socialView, supabaseSocialDb, type DrawCard } from "@/lib/reflex-cards/social";
import type { Ctx, Planned } from "@/lib/reflex-cards/actions";
import { GAME_TEMPLATE } from "@/lib/reflex-cards/game/template";

const ACC = { guest: false, email: "ami@exemple.test" };
const ctx: Ctx = { now: Date.parse("2026-10-31T10:00:00Z"), today: "2026-10-31", day: 30 };
let reqN = 0;
const req = () => `00000000-0000-4000-9000-${String(++reqN).padStart(12, "0")}`;
const seeded = (seed: number): Rnd => {
  let a = seed;
  return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
};

/** booster tiré avec la première graine qui donne au moins une Argent ; la finition PRÉVUE de chaque carte est gardée à part */
let plannedFins: (string | null)[] = [];
const planArgent = (s: GameState, _a: string, b: Record<string, unknown>, c: Ctx): Planned => {
  for (let seed = 1; seed < 200000; seed++) {
    const o = planOpen(s, { day: c.day, today: c.today, now: c.now, req: String(b.req), rnd: seeded(seed) });
    if (!o.items.some((it) => !it.ed && it.fin === "ag")) continue;
    plannedFins = o.items.map((it) => it.fin);
    return { patch: o.patch, data: { items: o.items, results: o.results, theme: o.theme } };
  }
  throw new Error("aucune Argent tirée");
};
const agIdx = () => plannedFins.flatMap((f, i) => (f === "ag" ? [i] : []));

/** A et B : deux comptes amis ; B ouvre un booster avec au moins une Argent ; A regarde le dernier booster de B */
async function friendPack(o: { issued: number; b5?: boolean }) {
  const { pg, db } = await makeGameDb({ b5: o.b5 });
  const [oa, ob] = ["dddddddd-0000-4000-8000-0000000000a1", "dddddddd-0000-4000-8000-0000000000b2"];
  for (const id of [oa, ob]) await pg.query("insert into auth.users(id) values ($1)", [id]);
  const A = await db.account(oa, "2026-10-29"), B = await db.account(ob, "2026-10-29");
  const codeB = (await pg.query<{ c: string }>("select public.rc_friend_code($1) as c", [B])).rows[0].c;
  await pg.query("insert into public.rc_friends (a, b, status, accepted_at) values ($1, $2, 'accepted', now())", [A, B]);
  /* numéros déjà distribués dans le monde pour chaque carte : issued + 1 est le prochain (99 : plafond atteint → Holo) */
  await pg.query("insert into public.rc_numbered (card_id, fin, issued) select x, 'ag', $2 from unnest($1::text[]) x", [[...CARD.keys()], o.issued]);
  const out = await runAction(db, B, "ouvrir", { req: req() }, ctx, ACC, planArgent);
  const items = (out.data as { items: Item[] }).items;
  const sdb = supabaseSocialDb(fakeSupabase(pg));
  const view = await socialView(sdb, await loadGame(db, A, ctx), A, ctx);
  const pack = view.packs.find((p) => p.code === codeB)!;
  const draw = (await sdb.friendDraw(A, codeB))!;
  return { items, pack, draw };
}

/* ---------- le vrai code du jeu, extrait du gabarit généré (lib/reflex-cards/game/template.ts) ---------- */
const grab = (re: RegExp, what: string) => { const m = GAME_TEMPLATE.match(re); if (!m) throw new Error(what + " introuvable dans le gabarit"); return m; };
const RNAME = new Function(grab(/const RNAME=\{[^}]*\};/, "RNAME")[0] + "return RNAME;")() as Record<string, string>;
const FIN = new Function(grab(/const FIN=\{[\s\S]*?\n\};/, "FIN")[0] + "return FIN;")() as Record<string, { label: (s: number | null) => string }>;
/** le début de card() (paramètres et réglages avant le dessin) : la finition et le numéro avec lesquels la carte est dessinée */
const [, cardParams, cardHead] = grab(/function card\((c,\{[^}]*\}=\{\})\)\{([\s\S]*?)const col=ed\?/, "début de card()");
const cardFinSerial = new Function("FIN", "cardMissing", "relicCard", `return (${cardParams})=>{${cardHead}return {fin,serial};};`)(FIN, () => "", () => "") as (c: unknown, o: Record<string, unknown>) => { fin: string | null; serial: number | null };
/** l'étiquette en haut d'une carte à finition (card()) */
const finTag = new Function("fin", "serial", "c", "RNAME", "return " + grab(/if\(fin\)tag=(fin==="holo"[\s\S]*?);else\{tag=RNAME\[c\.r\];rarTag=true;\}/, "étiquette de finition")[1]) as (fin: string, serial: number | null, c: { r: string }, R: Record<string, string>) => string;
/** les options passées à card() pour chaque carte du booster d'un ami, dans l'écran de pioche (sxPick) */
const pickRow = new Function("BY_ID", "card", "cardBackSVG", "return " + grab(/row\.innerHTML=p\.cards\.map\((\(it,i\)=>\{const c=BY_ID\[it\.id\];return c\?`[\s\S]*?`:"";\})\)\.join\(""\);/, "rendu de la pioche")[1]) as (BY_ID: unknown, card: (c: unknown, o: Record<string, unknown>) => string, back: () => string) => (it: DrawCard, i: number) => string;
/** ce que le joueur lit sur chaque carte du booster de son ami */
function shown(cards: DrawCard[]) {
  const BY_ID = Object.fromEntries(cards.map((x) => [x.id, { id: x.id, r: CARD.get(x.id)!.r }]));
  const seen: string[] = [];
  const row = pickRow(BY_ID, (c, o) => { const cc = c as { r: string }, d = cardFinSerial(c, o); seen.push(d.fin ? finTag(d.fin, d.serial, cc, RNAME) : RNAME[cc.r]); return ""; }, () => "");
  cards.forEach((x, i) => row(x, i));
  return seen;
}
const norm = (x: { id: string; ed?: string | null; fin?: string | null; serial?: number | null }) => ({ id: x.id, ed: x.ed ?? null, fin: x.fin ?? null, serial: x.serial ?? null });

describe("Reflex Cards — pioche chez un ami : vraie finition, vrai numéro", () => {
  it("une Argent du booster d'un ami arrive avec son vrai numéro et s'affiche « Argent 42/99 »", async () => {
    const { items, pack, draw } = await friendPack({ issued: 41 });
    expect(agIdx().length).toBeGreaterThan(0);
    for (const i of agIdx()) expect(items[i]).toMatchObject({ fin: "ag", serial: 42 });
    /* la base (journal du booster) et ce que reçoit l'ami : la même chose que ce que le joueur a tiré, numéros compris */
    expect(pack.cards.map(norm)).toEqual(items.map(norm));
    expect(draw.cards.map(norm)).toEqual(items.map(norm));
    const txt = shown(pack.cards);
    for (const i of agIdx()) expect(txt[i]).toBe(`Argent 42/99 · ${CARD.get(items[i].id)!.r}`);
    expect(txt.join("|")).not.toMatch(/\b01\/99\b/);
  });

  it("une Argent devenue Holo (plafond 99/99 atteint) arrive et s'affiche en Holo, sans numéro", async () => {
    const { items, pack, draw } = await friendPack({ issued: 99 });
    expect(agIdx().length).toBeGreaterThan(0);
    for (const i of agIdx()) {
      expect(items[i]).toMatchObject({ fin: "holo", serial: null });
      expect(norm(pack.cards[i])).toEqual({ id: items[i].id, ed: null, fin: "holo", serial: null });
      expect(norm(draw.cards[i])).toEqual({ id: items[i].id, ed: null, fin: "holo", serial: null });
    }
    const txt = shown(pack.cards);
    for (const i of agIdx()) expect(txt[i]).toBe(`Holo · ${RNAME[CARD.get(items[i].id)!.r]}`);
    expect(txt.join("|")).not.toMatch(/Argent/);
  });

  it("base d'avant la migration B5 : le booster s'ouvre, la pioche marche, et aucun numéro n'est inventé", async () => {
    const { items, pack } = await friendPack({ issued: 41, b5: false });
    for (const i of agIdx()) expect(items[i]).toMatchObject({ fin: "ag", serial: 42 }); // le joueur, lui, a son numéro
    expect(pack.cards.map((c) => c.id)).toEqual(items.map((c) => c.id));
    const txt = shown(pack.cards);
    for (const i of agIdx()) {
      expect(pack.cards[i].serial ?? null).toBeNull(); // journal d'avant B5 : finition prévue, sans numéro
      expect(txt[i]).toBe(`Argent · ${CARD.get(items[i].id)!.r}`); // jamais « 01/99 » ni un numéro tiré d'un hachage
    }
  });

  it("le jeu n'invente jamais un numéro : card() n'en fabrique plus, les libellés sans numéro n'ont aucun chiffre", () => {
    expect(cardHead).not.toMatch(/serial\s*=/);
    expect(cardFinSerial({ id: "x", r: "R" }, { fin: "ag" })).toEqual({ fin: "ag", serial: null });
    expect(cardFinSerial({ id: "x", r: "R" }, { fin: "or", serial: 7 })).toEqual({ fin: "or", serial: 7 });
    expect(GAME_TEMPLATE).not.toMatch(/serialFor|serial\|\|1\)\.padStart|label\(it\.serial\|\|1\)/);
    expect(FIN.ag.label(42)).toBe("Argent · 42 / 99");
    expect(FIN.or.label(7)).toBe("Or · 07 / 25");
    for (const f of ["ag", "or"]) expect(FIN[f].label(null)).not.toMatch(/\d|null|undefined/);
    expect(finTag("or", null, { r: "SR" }, RNAME)).toBe("Or · SR");
    expect(finTag("or", 7, { r: "SR" }, RNAME)).toBe("Or 07/25 · SR");
    expect(finTag("onyx", null, { r: "L" }, RNAME)).toBe("Onyx 1/1 · L");
  });
});
