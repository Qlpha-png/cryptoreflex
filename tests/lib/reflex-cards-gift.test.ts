/**
 * Reflex Cards — booster cadeau (Kev 04/10) : posé dans le profil d'un joueur (perso.gift), annoncé sans dévoiler les cartes,
 * ouvert UNE seule fois à la main, sans consommer de booster de la réserve ; un cadeau mal formé ou citant une carte inconnue
 * n'est jamais proposé.
 */
import { describe, it, expect, vi } from "vitest";

process.env.REFLEX_CARDS_UNIVERS = "true";
process.env.REFLEX_CARDS_ACCOUNTS = "true";
process.env.NEXT_PUBLIC_REFLEX_CARDS_LAUNCH_DATE = "2026-10-02";
vi.resetModules();
const { makeGameDb } = await import("../fixtures/rc-pglite");
const { loadGame, runAction } = await import("@/lib/reflex-cards/store");
const { toClient, giftOf } = await import("@/lib/reflex-cards/actions");

const ACC = { guest: false, email: "qa@cryptoreflex.test" };
const GIFT = {
  id: "kev-val-20261004", from: "Kev", title: "Pour la plus belle des princesses", msg: "Cinq cartes choisies une à une.",
  items: [{ id: "nf_pudgy-penguins", ed: null }, { id: "wk_q16197959", ed: null }, { id: "ethereum", ed: "icon" }, { id: "bitcoin", ed: "myth" }, { id: "wk_q13382352", ed: "relic" }],
};
const ctx = { now: Date.parse("2026-10-04T20:00:00Z"), today: "2026-10-04", day: 3 };
type Cl = { perso: { gift: { id: string; n: number; title: string } | null }; packs: { stock: number }; col: Record<string, unknown>; eds: Record<string, unknown>; meta: [string][] };

describe("Reflex Cards — booster cadeau", () => {
  it("annoncé sans ses cartes, ouvert une fois, sans toucher à la réserve", async () => {
    const { pg, db } = await makeGameDb();
    const P = await db.createGuest("b".repeat(64), "2026-10-02");
    await pg.query("update public.rc_players set perso = perso || jsonb_build_object('gift', $2::jsonb) where player_id = $1", [P, JSON.stringify(GIFT)]);
    const before = toClient(await loadGame(db, P, ctx), ctx, ACC) as unknown as Cl;
    expect(before.perso.gift).toEqual({ id: GIFT.id, from: "Kev", title: GIFT.title, msg: GIFT.msg, n: 5 });
    expect(JSON.stringify(before.perso.gift)).not.toContain("wk_q13382352");
    const stock = before.packs.stock;
    const out = await runAction(db, P, "ouvrir-cadeau", { id: GIFT.id, req: "00000000-0000-4000-9000-0000000000a1" }, ctx, ACC);
    const data = out.data as { items: { id: string; ed: string | null }[]; results: { isNew: boolean }[]; gift: { title: string } };
    expect(data.items.map((x) => `${x.ed ?? "base"}|${x.id}`)).toEqual(GIFT.items.map((x) => `${x.ed ?? "base"}|${x.id}`));
    expect(data.results.every((r) => r.isNew)).toBe(true);
    expect(data.gift.title).toBe(GIFT.title);
    const st = out.state as unknown as Cl;
    expect(st.perso.gift).toBeNull();
    expect(st.packs.stock).toBe(stock);
    expect(st.col["nf_pudgy-penguins"]).toBeTruthy();
    expect(st.col["wk_q16197959"]).toBeTruthy();
    expect(st.eds["icon|ethereum"]).toBeTruthy();
    expect(st.eds["myth|bitcoin"]).toBeTruthy();
    expect(st.eds["relic|wk_q13382352"]).toBeTruthy();
    const have = new Set(st.meta.map((r) => r[0]));
    for (const it of GIFT.items) expect(have.has(it.id), it.id).toBe(true);
    /* vrai rang mondial de découverte : personne d'autre ne les a → N° 1 */
    expect((out.state as unknown as { edNo: Record<string, number> }).edNo).toEqual({ "myth|bitcoin": 1, "relic|wk_q13382352": 1 });
    /* relu en base : même chose, et le cadeau ne s'ouvre pas deux fois */
    const again = toClient(await loadGame(db, P, ctx), ctx, ACC) as unknown as Cl;
    expect(again.perso.gift).toBeNull();
    expect(again.eds["relic|wk_q13382352"]).toBeTruthy();
    /* un second joueur qui obtient la même Mythique est N° 2 ; le premier reste N° 1 */
    const P2 = await db.createGuest("9".repeat(64), "2026-10-02");
    await pg.query("update public.rc_players set perso = perso || jsonb_build_object('gift', $2::jsonb) where player_id = $1", [P2, JSON.stringify({ ...GIFT, id: "cadeau-deux", items: [{ id: "bitcoin", ed: "myth" }] })]);
    const o2 = await runAction(db, P2, "ouvrir-cadeau", { id: "cadeau-deux", req: "00000000-0000-4000-9000-0000000000b1" }, ctx, ACC);
    expect((o2.state as unknown as { edNo: Record<string, number> }).edNo).toEqual({ "myth|bitcoin": 2 });
    expect((toClient(await loadGame(db, P, ctx), ctx, ACC) as unknown as { edNo: Record<string, number> }).edNo["myth|bitcoin"]).toBe(1);
    await expect(runAction(db, P, "ouvrir-cadeau", { id: GIFT.id, req: "00000000-0000-4000-9000-0000000000a2" }, ctx, ACC)).rejects.toThrow(/déjà été ouvert/);
  }, 60000);

  it("un cadeau mal formé ou citant une carte inconnue n'est jamais proposé", () => {
    expect(giftOf({ gift: { ...GIFT, items: [{ id: "carte-inconnue-xyz", ed: null }] } })).toBeNull();
    expect(giftOf({ gift: { ...GIFT, items: [{ id: "bitcoin", ed: "relic" }] } })).toBeNull(); // pas une relique
    expect(giftOf({ gift: { ...GIFT, items: [{ id: "pr_aave", ed: "icon" }] } })).toBeNull(); // pas une Icône
    expect(giftOf({ gift: { ...GIFT, id: "Bad Id!" } })).toBeNull();
    expect(giftOf({ gift: { ...GIFT, items: [] } })).toBeNull();
    expect(giftOf({})).toBeNull();
    expect(giftOf({ gift: { ...GIFT, msg: "<script>x</script>" } })!.msg).not.toContain("<");
  });
});
