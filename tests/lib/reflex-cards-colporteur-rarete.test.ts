/**
 * Reflex Cards — Colporteur (Kev 04/10) : une offre tirée avant un changement de catalogue affichait « Peu commune » sur une carte
 * devenue Super rare, et l'échange se faisait contre un doublon Peu commune. La rareté affichée ET exigée est celle de la carte
 * aujourd'hui ; une carte sortie du catalogue rend l'offre indisponible.
 */
import { describe, it, expect } from "vitest";
import { makeGameDb } from "../fixtures/rc-pglite";
import { CARD } from "@/lib/reflex-cards/engine";
import { loadGame, runAction } from "@/lib/reflex-cards/store";
import { toClient } from "@/lib/reflex-cards/actions";

const ACC = { guest: false, email: "qa@cryptoreflex.test" };
const ctx = { now: Date.parse("2026-10-04T18:00:00Z"), today: "2026-10-04", day: 3 };
type Cl = { pstats: { colpD: { offers: { r: string; id: string; done: boolean }[] } } };

describe("Reflex Cards — Colporteur : rareté du jour", () => {
  it("affiche et exige la rareté actuelle de la carte, pas celle mémorisée dans l'offre", async () => {
    const { pg, db } = await makeGameDb();
    const P = await db.createGuest("8".repeat(64), "2026-10-02");
    await runAction(db, P, "ouvrir", { req: "00000000-0000-4000-9000-0000000000c1" }, ctx, ACC);
    const sr = [...CARD.values()].find((c) => c.r === "SR" && !c.fossil)!;
    const pc = [...CARD.values()].filter((c) => c.r === "PC" && !c.fossil).slice(0, 2);
    /* offres « d'avant » : la Super rare mémorisée comme Peu commune, et une carte qui n'existe plus */
    const colp = { k: ctx.today, line: 0, offers: [{ r: "PC", id: sr.id }, { r: "PC", id: "carte-retiree-xyz" }, { r: "PC", id: pc[1].id }] };
    await pg.query("update public.rc_days set colp = $3::jsonb where player_id = $1 and day = $2", [P, ctx.today, JSON.stringify(colp)]);
    await pg.query("insert into public.rc_cards (player_id, card_id, n, holo, fins) values ($1, $2, 3, 0, '{\"ag\":[],\"or\":[],\"onyx\":[]}'::jsonb) on conflict (player_id, card_id) do update set n = 3", [P, pc[0].id]);
    const cl = toClient(await loadGame(db, P, ctx), ctx, ACC) as unknown as Cl;
    expect(cl.pstats.colpD.offers[0]).toMatchObject({ id: sr.id, r: "SR", done: false });
    expect(cl.pstats.colpD.offers[1].done).toBe(true);
    /* un doublon Peu commune ne suffit plus pour la Super rare */
    await expect(runAction(db, P, "colporteur", { i: 0, give: pc[0].id }, ctx, ACC)).rejects.toThrow(/même rareté/);
    await expect(runAction(db, P, "colporteur", { i: 1, give: pc[0].id }, ctx, ACC)).rejects.toThrow(/plus disponible/);
    /* l'offre Peu commune normale fonctionne toujours */
    const ok = await runAction(db, P, "colporteur", { i: 2, give: pc[0].id }, ctx, ACC);
    expect((ok.data as { id: string }).id).toBe(pc[1].id);
  }, 60000);
});
