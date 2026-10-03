/**
 * Reflex Cards — migration B3 (03/10/2026) : lecture de la partie en un appel (rc_load) et garde « holo ≤ exemplaires non
 * numérotés » dans rc_apply. Vraie migration sur PGlite, avec et sans B3 (la production avant que Kev la fasse passer).
 */
import { describe, it, expect, beforeAll } from "vitest";
import { readFileSync } from "node:fs";
import type { PGlite } from "@electric-sql/pglite";
import { fakeSupabase, makeGameDb } from "../fixtures/rc-pglite";
import { applyPatch, loadGame, resetRcLoadProbe, runAction, supabaseGameDb, toState, type GameDb, type Loaded } from "@/lib/reflex-cards/store";
import { RULES } from "@/lib/reflex-cards/engine";
import type { Ctx } from "@/lib/reflex-cards/actions";

const ACC = { guest: false, email: "joueur@exemple.test" };
const ctx: Ctx = { now: Date.parse("2026-10-31T10:00:00Z"), today: "2026-10-31", day: 30 };
let reqN = 0;
const req = () => `00000000-0000-4000-9100-${String(++reqN).padStart(12, "0")}`;
/* même contenu, quel que soit le format des horodatages (rc_load : « +00:00 » et microsecondes ; ancienne lecture : ISO « Z ») */
const norm = (L: Loaded) => {
  const s = toState(L);
  const p = { ...s.player } as Record<string, unknown>;
  for (const k of ["stock_at", "created_at", "updated_at"]) if (p[k]) p[k] = new Date(p[k] as string | Date).getTime(); // ms (Date ou texte)
  p.first_day = String(p.first_day).slice(0, 10);
  return { player: p, cards: [...s.cards].sort(), eds: [...s.eds].sort(), cos: [...s.cos].sort(), claims: [...s.claims].sort(), days: [...s.days].sort(), quiz: [...s.quiz].sort() };
};
/** une partie bien remplie : boosters, missions/jalons, journée, quiz, objets */
async function fill(db: GameDb, pg: PGlite, P: string) {
  await pg.query("update public.rc_players set reflets = 3000, eclats = 3000, stock = 40 where player_id=$1", [P]);
  for (let i = 0; i < 12; i++) await runAction(db, P, "ouvrir", { req: req() }, ctx, ACC);
  const s = await loadGame(db, P, ctx);
  const owned = [...s.cards.keys()].find((id) => RULES.quiz[id]);
  if (owned) await runAction(db, P, "quiz", { id: owned, rep: "faux" }, ctx, ACC).catch(() => {});
  await runAction(db, P, "fiche", { id: [...s.cards.keys()][0] }, ctx, ACC);
  const it = RULES.cos.find((x) => x.src === "shop" && x.price && x.price <= 300);
  if (it) await runAction(db, P, "acheter", { id: it.id }, ctx, ACC).catch(() => {});
}

describe("Reflex Cards — B3 : lecture de la partie en un appel (rc_load)", () => {
  let pg: PGlite, db: GameDb, legacyLoad: GameDb["load"], P = "";
  beforeAll(async () => {
    ({ pg, db, legacyLoad } = await makeGameDb());
    P = await db.createGuest("a".repeat(64), "2026-10-29");
    await fill(db, pg, P);
  });
  it("rc_load renvoie exactement la même partie que l'ancienne lecture table par table", async () => {
    const a = await db.load(P, "2026-10-21"), b = await legacyLoad(P, "2026-10-21");
    expect(a.cards.length).toBeGreaterThan(20);
    expect(a.claims.length).toBeGreaterThan(0);
    expect(a.days.length).toBeGreaterThan(0);
    expect(norm(a)).toEqual(norm(b));
    /* le filtre de date des journées est respecté */
    expect((await db.load(P, "2026-11-01")).days).toEqual([]);
  });
  it("partie inconnue : player null, et « Partie introuvable » comme avant", async () => {
    const L = await db.load("00000000-0000-4000-8000-000000000000", "2026-10-21");
    expect(L).toEqual({ player: null, cards: [], eds: [], cos: [], claims: [], days: [], quiz: [] });
    await expect(loadGame(db, "00000000-0000-4000-8000-000000000000", ctx)).rejects.toThrow(/introuvable/);
  });
  it("droits : rc_load exécutable par le serveur seulement", async () => {
    const r = (await pg.query(`select has_function_privilege('anon','public.rc_load(uuid,date)','execute') as a,
      has_function_privilege('authenticated','public.rc_load(uuid,date)','execute') as u,
      has_function_privilege('service_role','public.rc_load(uuid,date)','execute') as s,
      has_function_privilege('service_role','public.rc_friend_cards(uuid)','execute') as f`)).rows[0];
    expect(r).toEqual({ a: false, u: false, s: true, f: true });
  });
  it("supabaseGameDb : UN seul appel avec rc_load ; sans la migration, repli automatique sur l'ancienne lecture", async () => {
    const calls: string[] = [];
    const real = fakeSupabase(pg);
    const spy = (missing: boolean) => ({
      from: (t: string) => { calls.push("from:" + t); return real.from(t); },
      rpc: (fn: string, args: Record<string, unknown>) => {
        calls.push("rpc:" + fn);
        if (missing && fn === "rc_load") return Promise.resolve({ data: null, error: { code: "PGRST202", message: "Could not find the function public.rc_load in the schema cache" } });
        return real.rpc(fn, args);
      },
    });
    resetRcLoadProbe();
    const withB3 = await supabaseGameDb(spy(false) as never).load(P, "2026-10-21");
    expect(calls).toEqual(["rpc:rc_load"]);
    calls.length = 0;
    resetRcLoadProbe();
    const without = await supabaseGameDb(spy(true) as never).load(P, "2026-10-21");
    expect(calls[0]).toBe("rpc:rc_load");
    expect(calls.slice(1).every((c) => c.startsWith("from:"))).toBe(true);
    expect(norm(without)).toEqual(norm(withB3));
    /* tant que rc_load manque, on ne la redemande pas à chaque geste */
    calls.length = 0;
    await supabaseGameDb(spy(true) as never).load(P, "2026-10-21");
    expect(calls.includes("rpc:rc_load")).toBe(false);
    resetRcLoadProbe();
  });
});

describe("Reflex Cards — B3 : garde « holo ≤ exemplaires non numérotés »", () => {
  const ID = RULES.cards.find((c) => !c.fossil && c.r === "C")!.id;
  async function setup(b3: boolean) {
    const { pg, db } = await makeGameDb({ b3 });
    const P = await db.createGuest((b3 ? "b" : "c").repeat(64), "2026-10-29");
    /* 5 exemplaires : 1 Argent numérotée, 3 Holo, 1 ordinaire */
    await pg.query(`insert into public.rc_cards(player_id, card_id, n, holo, fins) values ($1,$2,5,3,'{"ag":[7],"or":[],"onyx":[]}'::jsonb)`, [P, ID]);
    return { pg, db, P };
  }
  const row = async (pg: PGlite, P: string) => (await pg.query("select n, holo, fins from public.rc_cards where player_id=$1 and card_id=$2", [P, ID])).rows[0] as { n: number; holo: number };

  it("rendre 3 doublons : l'ordinaire part d'abord, puis 2 Holo — la base ET la mémoire", async () => {
    const { pg, db, P } = await setup(true);
    const s = await loadGame(db, P, ctx);
    const patch = { cards: [{ id: ID, dn: -3 }] };
    const res = await db.apply(P, s.player.version, patch);
    expect(res.holo_cap).toBe(true);
    expect(await row(pg, P)).toMatchObject({ n: 2, holo: 1 });
    const mem = applyPatch(s, patch, res, ctx.now);
    expect(mem.cards.get(ID)).toMatchObject({ n: 2, holo: 1, fins: { ag: [7], or: [], onyx: [] } });
    /* l'exemplaire de l'album et la numérotée restent : on ne peut plus rien rendre */
    const s2 = await loadGame(db, P, ctx);
    await expect(db.apply(P, s2.player.version, { cards: [{ id: ID, dn: -1 }] })).rejects.toThrow(/rc_no_dup/);
  });
  it("rendre seulement l'ordinaire : les Holo ne bougent pas", async () => {
    const { pg, db, P } = await setup(true);
    const s = await loadGame(db, P, ctx);
    const res = await db.apply(P, s.player.version, { cards: [{ id: ID, dn: -1 }] });
    expect(await row(pg, P)).toMatchObject({ n: 4, holo: 3 });
    expect(applyPatch(s, { cards: [{ id: ID, dn: -1 }] }, res, ctx.now).cards.get(ID)).toMatchObject({ n: 4, holo: 3 });
  });
  it("sans B3 (production d'avant) : ancien comportement, et la mémoire reste identique à la base", async () => {
    const { pg, db, P } = await setup(false);
    const s = await loadGame(db, P, ctx);
    const res = await db.apply(P, s.player.version, { cards: [{ id: ID, dn: -3 }] });
    expect(res.holo_cap).toBeUndefined();
    expect(await row(pg, P)).toMatchObject({ n: 2, holo: 3 });
    expect(applyPatch(s, { cards: [{ id: ID, dn: -3 }] }, res, ctx.now).cards.get(ID)).toMatchObject({ n: 2, holo: 3 });
  });
  it("la migration remet d'aplomb les lignes déjà incohérentes, et elle est rejouable", async () => {
    const { pg, P } = await setup(false);
    await pg.query("update public.rc_cards set n = 2 where player_id=$1 and card_id=$2", [P, ID]); // n 2, holo 3, 1 numérotée
    const sql = readFileSync("supabase/migrations/20261003_reflex_cards_b3_perf.sql", "utf8");
    await pg.exec(sql);
    expect(await row(pg, P)).toMatchObject({ n: 2, holo: 1 });
    await pg.exec(sql); // idempotente
    expect(await row(pg, P)).toMatchObject({ n: 2, holo: 1 });
  });
});
