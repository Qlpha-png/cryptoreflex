/**
 * Reflex Cards — « Dernières cartes obtenues » (#hrecent) porte le VRAI numéro et la VRAIE finition des numérotées.
 * Bug du 06/10 : planOpen écrivait recent avec la finition prévue au tirage et serial null, AVANT que rc_apply attribue le numéro
 * (ou change la carte en Holo, plafond du monde atteint) → le jeu affichait « Argent 01/99 » (numéro inventé), et une Argent
 * devenue Holo restait affichée en Argent. Vraie migration sur PGlite.
 */
import { describe, it, expect } from "vitest";
import { makeGameDb } from "../fixtures/rc-pglite";
import { CARD, planOpen, recentWithSerials, type GameState, type Item, type Rnd } from "@/lib/reflex-cards/engine";
import { loadGame, runAction, type GameDb } from "@/lib/reflex-cards/store";
import { toClient, type Ctx, type Planned } from "@/lib/reflex-cards/actions";

const ACC = { guest: false, email: "joueur@exemple.test" };
const ctx: Ctx = { now: Date.parse("2026-10-31T10:00:00Z"), today: "2026-10-31", day: 30 };
let reqN = 0;
const req = () => `00000000-0000-4000-9000-${String(++reqN).padStart(12, "0")}`;
const seeded = (seed: number): Rnd => {
  let a = seed;
  return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
};
type R = { id: string; ed: string | null; fin: string | null; serial: number | null };
const norm = (x: { id: string; ed?: string | null; fin?: string | null; serial?: number | null }): R => ({ id: x.id, ed: x.ed ?? null, fin: x.fin ?? null, serial: x.serial ?? null });

/** booster tiré avec la première graine qui donne au moins une Argent (planOpen est pur : rien n'est écrit pendant la recherche) ;
 *  la finition PRÉVUE de chaque carte est gardée à part (store.ts réécrit ensuite items en place avec la finition attribuée) */
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
const dbRecent = async (pg: Awaited<ReturnType<typeof makeGameDb>>["pg"], P: string) =>
  ((await pg.query<{ recent: R[] }>("select recent from public.rc_players where player_id = $1", [P])).rows[0].recent).map(norm);

describe("Reflex Cards — dernières cartes obtenues : vrai numéro, vraie finition", () => {
  it("une Argent tirée apparaît avec son vrai numéro (pas « 01/99 »), en mémoire comme en base", async () => {
    const { pg, db } = await makeGameDb();
    const P = await db.createGuest("a".repeat(64), "2026-10-29");
    /* 41 Argent déjà distribuées dans le monde pour chaque carte : la prochaine est la n° 42 */
    await pg.query("insert into public.rc_numbered (card_id, fin, issued) select x, 'ag', 41 from unnest($1::text[]) x", [[...CARD.keys()]]);
    const out = await runAction(db, P, "ouvrir", { req: req() }, ctx, ACC, planArgent);
    const items = (out.data as { items: Item[] }).items;
    expect(agIdx().length).toBeGreaterThan(0);
    for (const i of agIdx()) expect(items[i]).toMatchObject({ fin: "ag", serial: 42 });
    /* la liste renvoyée au jeu, la base et une relecture complète : le booster en tête, numéros compris */
    const st = out.state as unknown as { recent: R[] };
    expect(st.recent.map(norm).slice(0, items.length)).toEqual(items.map(norm));
    for (const i of agIdx()) expect(st.recent[i]).toMatchObject({ fin: "ag", serial: 42 });
    expect(await dbRecent(pg, P)).toEqual(st.recent.map(norm));
    expect((toClient(await loadGame(db, P, ctx), ctx, ACC) as unknown as { recent: R[] }).recent.map(norm)).toEqual(st.recent.map(norm));
    /* et c'est bien le numéro rangé dans l'album */
    for (const i of agIdx()) expect((await pg.query<{ fins: { ag: number[] } }>("select fins from public.rc_cards where player_id = $1 and card_id = $2", [P, items[i].id])).rows[0].fins.ag).toContain(42);
    expect(JSON.stringify(st.recent)).not.toMatch(/"fin":"(ag|or|onyx)","serial":null|"serial":null,"fin":"(ag|or|onyx)"/);
  });

  it("une Argent devenue Holo (plafond 99/99 atteint) apparaît en Holo, sans numéro", async () => {
    const { pg, db } = await makeGameDb();
    const P = await db.createGuest("b".repeat(64), "2026-10-29");
    await pg.query("insert into public.rc_numbered (card_id, fin, issued) select x, 'ag', 99 from unnest($1::text[]) x", [[...CARD.keys()]]);
    const out = await runAction(db, P, "ouvrir", { req: req() }, ctx, ACC, planArgent);
    const items = (out.data as { items: Item[] }).items;
    expect(agIdx().length).toBeGreaterThan(0);
    const st = out.state as unknown as { recent: R[] };
    for (const i of agIdx()) {
      expect(items[i]).toMatchObject({ fin: "holo", serial: null });
      expect(norm(st.recent[i])).toEqual({ id: items[i].id, ed: null, fin: "holo", serial: null });
    }
    expect(await dbRecent(pg, P)).toEqual(st.recent.map(norm));
  });

  it("un autre booster ouvert entre-temps (autre onglet) : le booster est retrouvé plus bas et corrigé quand même", async () => {
    const { pg, db } = await makeGameDb();
    const P = await db.createGuest("c".repeat(64), "2026-10-29");
    await pg.query("insert into public.rc_numbered (card_id, fin, issued) select x, 'ag', 41 from unnest($1::text[]) x", [[...CARD.keys()]]);
    /* juste après l'écriture du booster, un second booster est ouvert ailleurs : la correction de recent tombe en conflit de version */
    let other: Item[] = [];
    let inject = true;
    const db2: GameDb = {
      ...db,
      async apply(p, v, patch) {
        const r = await db.apply(p, v, patch);
        if (inject && patch.draw) {
          inject = false;
          other = ((await runAction(db, p, "ouvrir", { req: req() }, ctx, ACC)).data as { items: Item[] }).items;
        }
        return r;
      },
    };
    const out = await runAction(db2, P, "ouvrir", { req: req() }, ctx, ACC, planArgent);
    const items = (out.data as { items: Item[] }).items;
    expect(other.length).toBe(5);
    const rec = await dbRecent(pg, P);
    expect(rec.slice(0, 5)).toEqual(other.map(norm)); // le booster de l'autre onglet, le plus récent, en tête
    expect(rec.slice(5, 5 + items.length)).toEqual(items.map(norm)); // puis le nôtre, numéros compris
    for (const i of agIdx()) expect(rec[5 + i]).toMatchObject({ fin: "ag", serial: 42 });
    expect((out.state as unknown as { recent: R[] }).recent.map(norm)).toEqual(rec);
  });

  it("recentWithSerials : rien à corriger, booster introuvable ou sorti de la liste → null", () => {
    const a = { id: "x", ed: null, fin: "ag", serial: null }, b = { id: "y", ed: null, fin: null, serial: null };
    const n = [{ i: 0, fin: "ag", serial: 7 }];
    expect(recentWithSerials([a, b], [a, b], [])).toBeNull();
    expect(recentWithSerials([b, b], [a, b], n)).toBeNull();
    expect(recentWithSerials([], [a, b], n)).toBeNull();
    expect(recentWithSerials([a, b], [a, b], n)).toEqual([{ ...a, serial: 7 }, b]);
    expect(recentWithSerials([b, a, b], [a, b], n)).toEqual([b, { ...a, serial: 7 }, b]);
    /* les clés relues en base arrivent dans un autre ordre (jsonb) : comparaison champ par champ */
    expect(recentWithSerials([{ serial: null, fin: "ag", id: "x", ed: null }], [a, b], n)).toEqual([{ id: "x", ed: null, fin: "ag", serial: 7 }]);
  });
});
