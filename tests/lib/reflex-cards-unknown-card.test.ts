/**
 * Reflex Cards — une carte présente en base mais absente du catalogue chargé (Univers éteint après avoir été allumé, carte retirée
 * du catalogue lors d'un nettoyage) ne doit jamais faire planter une partie : elle reste en base, elle n'entre pas dans l'état.
 */
import { describe, it, expect } from "vitest";
import { makeGameDb } from "../fixtures/rc-pglite";
import { loadGame, runAction } from "@/lib/reflex-cards/store";
import { toClient } from "@/lib/reflex-cards/actions";

const ACC = { guest: false, email: "qa@cryptoreflex.test" };

describe("Reflex Cards — carte inconnue en base", () => {
  it("est ignorée par la partie (chargement, état envoyé, geste) et reste en base", async () => {
    const { pg, db } = await makeGameDb();
    const ctx = { now: Date.parse("2026-10-04T18:00:00Z"), today: "2026-10-04", day: 3 };
    const P = await db.createGuest("c".repeat(64), "2026-10-02");
    await runAction(db, P, "ouvrir", { req: "00000000-0000-4000-9000-000000000001" }, ctx, ACC);
    await pg.query("insert into public.rc_cards (player_id, card_id, n, holo, fins) values ($1, 'carte-retiree-du-catalogue', 2, 0, '{\"ag\":[],\"or\":[],\"onyx\":[]}'::jsonb)", [P]);
    const s = await loadGame(db, P, ctx);
    expect(s.cards.has("carte-retiree-du-catalogue")).toBe(false);
    expect(s.cards.size).toBeGreaterThan(0);
    const cl = toClient(s, ctx, ACC) as { col: Record<string, unknown> };
    expect(cl.col["carte-retiree-du-catalogue"]).toBeUndefined();
    const out = await runAction(db, P, "ouvrir", { req: "00000000-0000-4000-9000-000000000002" }, ctx, ACC);
    expect(out.state).toBeTruthy();
    const still = await pg.query("select n from public.rc_cards where player_id=$1 and card_id='carte-retiree-du-catalogue'", [P]);
    expect(still.rows).toHaveLength(1);
  }, 60000);
});
