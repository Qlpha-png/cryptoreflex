/**
 * Reflex Cards — l'état renvoyé après un geste est calculé en mémoire (applyPatch) au lieu d'être relu en base.
 * Ce test vérifie, après CHAQUE geste d'une longue partie variée, que l'état en mémoire = l'état relu en base
 * (vraie migration sur PGlite). Seuls les horodatages « t » des nouvelles lignes peuvent différer de quelques ms.
 */
import { describe, it, expect, beforeAll } from "vitest";
import type { PGlite } from "@electric-sql/pglite";
import { makeGameDb } from "../fixtures/rc-pglite";
import { CARD, RULES, dayTables, tradeN, activeMissions } from "@/lib/reflex-cards/engine";
import { applyPatch, loadGame, runAction, toState, type GameDb } from "@/lib/reflex-cards/store";
import { toClient, type Ctx } from "@/lib/reflex-cards/actions";

let pg: PGlite, db: GameDb, P = "";
const ACC = { guest: false, email: "joueur@exemple.test" };
const ctx: Ctx = { now: Date.parse("2026-10-31T10:00:00Z"), today: "2026-10-31", day: 30 };
const strip = (v: unknown): unknown => {
  if (Array.isArray(v)) return v.map(strip);
  if (v && typeof v === "object") return Object.fromEntries(Object.entries(v).filter(([k]) => k !== "t").map(([k, x]) => [k, strip(x)]));
  return v;
};
let reqN = 0;
const req = () => `00000000-0000-4000-9000-${String(++reqN).padStart(12, "0")}`;
let checks = 0;
/** un geste, puis comparaison mémoire / base */
async function play(a: string, body: Record<string, unknown> = {}) {
  const out = await runAction(db, P, a, body, ctx, ACC);
  const fromDb = toClient(await loadGame(db, P, ctx), ctx, ACC);
  expect(strip(out.state), `geste ${a}`).toEqual(strip(fromDb));
  checks++;
  return out;
}

beforeAll(async () => {
  ({ pg, db } = await makeGameDb());
  P = await db.createGuest("f".repeat(64), "2026-10-29");
  await pg.query("update public.rc_players set reflets = 2000, eclats = 2000 where player_id=$1", [P]);
});

describe("Reflex Cards — état en mémoire = état en base, après chaque geste", () => {
  it("longue partie variée", async () => {
    for (let i = 0; i < 10; i++) await play("ouvrir", { req: req() });
    const s = await loadGame(db, P, ctx);
    for (const m of activeMissions(s, ctx.today).filter((x) => x.p >= x.g && !x.cl)) await play("mission", { key: m.key });
    const ids = [...s.cards.keys()];
    await play("quiz", { id: ids[0], rep: RULES.quiz[ids[0]] });
    await play("quiz", { id: ids[1], rep: "mauvaise réponse" });
    await play("fiche", { id: ids[2] });
    await play("fiche", { id: ids[2] });
    const etal = RULES.cos.find((x) => x.src === "etal" && !RULES.cosOwned.includes(x.id))!;
    await play("acheter", { id: etal.id });
    await play("equiper", { id: etal.id });
    await play("service", { id: "bst" });
    await play("service", { id: "thm", fam: "DeFi" });
    await play("ouvrir", { req: req() });
    await play("defi", { id: "q-open" });
    await play("titre", { id: "t-first" });
    await play("titre", { id: null });
    await play("pseudo", { v: "Testeur" });
    const s2 = await loadGame(db, P, ctx);
    const owned = [...s2.cards.keys()].slice(0, 3).map((id) => "base|" + id);
    await play("pantheon", { keys: owned });
    /* Colporteur : un doublon de la bonne rareté est préparé en base */
    const o = s2.days.get(ctx.today)!.colp!.offers[0];
    const give = dayTables(30).byRD[o.r].find((c) => c.id !== o.id)!.id;
    await pg.query(`insert into public.rc_cards(player_id,card_id,n) values ($1,$2,3) on conflict (player_id,card_id) do update set n = 3`, [P, give]);
    await play("colporteur", { i: 0, give });
    /* fabrication et collection */
    const s3 = await loadGame(db, P, ctx);
    const miss = dayTables(30).byRD.C.find((c) => !s3.cards.has(c.id) && c.part === 0)!;
    await play("fabriquer", { id: miss.id });
    const th = RULES.themes.find((t) => t.id === "th-pion")!;
    await pg.query(`insert into public.rc_cards(player_id,card_id,n) select $1, x, 1 from unnest($2::text[]) x on conflict do nothing`, [P, th.cards]);
    await play("collection", { id: th.id });
    /* gestes refusés : rien ne change, l'état reste cohérent */
    await expect(runAction(db, P, "defi", { id: "q-open" }, ctx, ACC)).rejects.toThrow();
    for (let i = 0; i < 2; i++) await play("ouvrir", { req: req() });
    expect(checks).toBeGreaterThanOrEqual(28);
    expect(tradeN(await loadGame(db, P, ctx), give)).toBeGreaterThanOrEqual(1);
  });

  it("cas fabriqué : numérotées (Onyx 1/1 puis Holo), doublons rendus, éditions, objets, compteurs, quiz, thème effacé", async () => {
    const before = await loadGame(db, P, ctx);
    const owned = [...before.cards.entries()].find(([, e]) => e.n >= 2 && e.fins.ag.length + e.fins.or.length + e.fins.onyx.length === 0)![0];
    const fresh = [...CARD.keys()].find((id) => !before.cards.has(id) && !CARD.get(id)!.fossil)!;
    const qOk = [...before.quiz.entries()].find(([, q]) => q.ok)?.[0];
    const patch = {
      player: { reflets: -5, eclats: 7, opened: 1, stock: 3, stock_at: new Date(ctx.now).toISOString(), theme: null, recent: [{ id: fresh, ed: null, fin: "onyx", serial: null }] },
      cards: [{ i: 0, id: fresh, dn: 1, fin: "onyx" as const }, { i: 1, id: fresh, dn: 1, fin: "onyx" as const }, { id: owned, dn: -1 }, { i: 2, id: owned, dn: 1, dholo: 1 }],
      eds: [{ ed: "myth", id: fresh, dn: 1 }, { ed: "myth", id: fresh, dn: 1 }],
      cos: [{ id: "frame-saphir", no: 3 }],
      claims: ["x|test|1"],
      day: { day: ctx.today, inc: { opened: 1, newc: 2 }, colp: { k: "z", offers: [], line: 1 } },
      ...(qOk ? { quiz: { id: qOk, ok: false, day: ctx.today } } : {}),
    };
    const res = await db.apply(P, before.player.version, patch);
    expect(res.numbered.map((n) => n.fin)).toEqual(["onyx", "holo"]);
    const mem = applyPatch(before, patch, res, ctx.now);
    const fromDb = toState(await db.load(P, "2026-10-01"));
    expect(strip(toClient(mem, ctx, ACC))).toEqual(strip(toClient(fromDb, ctx, ACC)));
    expect(mem.cards.get(fresh)).toMatchObject({ n: 2, holo: 1, fins: { onyx: [1] } });
    if (qOk) expect(mem.quiz.get(qOk)!.ok).toBe(true); // un quiz réussi le reste
  });
});
