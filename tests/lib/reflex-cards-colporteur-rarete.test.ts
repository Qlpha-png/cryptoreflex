/**
 * Reflex Cards — Boutique (ex-Colporteur), Kev 04/10 : une offre tirée avant un changement de catalogue affichait « Peu commune »
 * (puis « Ultra rare ») sur une carte d'une autre rareté. Désormais : les offres périmées (carte retirée ou rareté recalée) sont
 * tirées à nouveau au chargement ; la rareté affichée ET exigée est toujours celle de la carte aujourd'hui.
 */
import { describe, it, expect } from "vitest";
import { makeGameDb } from "../fixtures/rc-pglite";
import { CARD } from "@/lib/reflex-cards/engine";
import { loadGame, runAction } from "@/lib/reflex-cards/store";
import { toClient } from "@/lib/reflex-cards/actions";

const ACC = { guest: false, email: "qa@cryptoreflex.test" };
const ctx = { now: Date.parse("2026-10-04T18:00:00Z"), today: "2026-10-04", day: 3 };
type Cl = { pstats: { colpD: { offers: { r: string; id: string; done: boolean }[] } } };

describe("Reflex Cards — Boutique : offres du jour toujours cohérentes", () => {
  it("des offres périmées sont tirées à nouveau ; chaque offre affiche et exige la rareté actuelle de sa carte", async () => {
    const { pg, db } = await makeGameDb();
    const P = await db.createGuest("8".repeat(64), "2026-10-02");
    await runAction(db, P, "ouvrir", { req: "00000000-0000-4000-9000-0000000000c1" }, ctx, ACC);
    const sr = [...CARD.values()].find((c) => c.r === "SR" && !c.fossil)!;
    const pc = [...CARD.values()].filter((c) => c.r === "PC" && !c.fossil).slice(0, 2);
    /* offres « d'avant » : une Super rare mémorisée comme Peu commune, une carte qui n'existe plus */
    const stale = { k: ctx.today, line: 0, offers: [{ r: "PC", id: sr.id }, { r: "PC", id: "carte-retiree-xyz" }, { r: "PC", id: pc[1].id }] };
    await pg.query("update public.rc_days set colp = $3::jsonb where player_id = $1 and day = $2", [P, ctx.today, JSON.stringify(stale)]);
    const cl = toClient(await loadGame(db, P, ctx), ctx, ACC) as unknown as Cl;
    const offers = cl.pstats.colpD.offers;
    expect(offers).toHaveLength(3);
    expect(offers.some((o) => o.id === "carte-retiree-xyz")).toBe(false);
    for (const o of offers) { expect(CARD.get(o.id), o.id).toBeTruthy(); expect(o.r, o.id).toBe(CARD.get(o.id)!.r); }
    expect(offers.every((o) => o.r !== "UR" && o.r !== "L")).toBe(true); // jamais d'Ultra rare ni de Légendaire
    /* relu en base : les nouvelles offres sont enregistrées (plus de nouveau tirage au chargement suivant) */
    const again = toClient(await loadGame(db, P, ctx), ctx, ACC) as unknown as Cl;
    expect(again.pstats.colpD.offers.map((o) => o.id)).toEqual(offers.map((o) => o.id));
    /* l'échange exige un doublon de la rareté de la carte offerte */
    const o0 = offers[0];
    const wrong = [...CARD.values()].find((c) => c.r !== o0.r && !c.fossil)!;
    await pg.query("insert into public.rc_cards (player_id, card_id, n, holo, fins) values ($1, $2, 3, 0, '{\"ag\":[],\"or\":[],\"onyx\":[]}'::jsonb) on conflict (player_id, card_id) do update set n = 3", [P, wrong.id]);
    await expect(runAction(db, P, "colporteur", { i: 0, give: wrong.id }, ctx, ACC)).rejects.toThrow(/même rareté/);
    const right = [...CARD.values()].find((c) => c.r === o0.r && !c.fossil && c.id !== o0.id)!;
    await pg.query("insert into public.rc_cards (player_id, card_id, n, holo, fins) values ($1, $2, 3, 0, '{\"ag\":[],\"or\":[],\"onyx\":[]}'::jsonb) on conflict (player_id, card_id) do update set n = 3", [P, right.id]);
    const ok = await runAction(db, P, "colporteur", { i: 0, give: right.id }, ctx, ACC);
    expect((ok.data as { id: string }).id).toBe(o0.id);
  }, 60000);
});
