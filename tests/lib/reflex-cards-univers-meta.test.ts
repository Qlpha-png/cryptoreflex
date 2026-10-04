/**
 * Reflex Cards Univers — régression du 04/10 (écran noir) : le navigateur n'a pas le catalogue entier, il ne peut dessiner que
 * les cartes dont le serveur envoie la ligne. Toute carte CITÉE dans l'état envoyé (Colporteur, dernières cartes tirées, fiches
 * lues, quiz, collection, éditions) ou dans une réponse sociale doit donc avoir sa ligne dans `meta`.
 */
import { describe, it, expect, vi } from "vitest";

process.env.REFLEX_CARDS_UNIVERS = "true";
process.env.REFLEX_CARDS_ACCOUNTS = "true";
process.env.NEXT_PUBLIC_REFLEX_CARDS_LAUNCH_DATE = "2026-10-02";
vi.resetModules();
const { makeGameDb } = await import("../fixtures/rc-pglite");
const { runAction } = await import("@/lib/reflex-cards/store");
const { universIdsIn, withUniversMeta, universCards } = await import("@/lib/reflex-cards/univers");

const ACC = { guest: false, email: "qa@cryptoreflex.test" };
type St = Record<string, unknown> & {
  meta: [string][]; col: Record<string, unknown>; eds: Record<string, unknown>; recent: { id: string }[];
  pstats: { colpD: { offers: { id: string }[] } | null; fiches: string[]; quiz: Record<string, unknown> };
};

describe("Univers — lignes des cartes citées", () => {
  it("l'état après des ouvertures contient la ligne de CHAQUE carte citée (Colporteur compris)", async () => {
    const { db } = await makeGameDb();
    const ctx = { now: Date.parse("2026-10-04T18:00:00Z"), today: "2026-10-04", day: 3 };
    const P = await db.createGuest("d".repeat(64), "2026-10-02");
    let out: Awaited<ReturnType<typeof runAction>> | null = null;
    for (let i = 0; i < 3; i++) out = await runAction(db, P, "ouvrir", { req: `00000000-0000-4000-9000-00000000000${i + 1}` }, ctx, ACC);
    const st = out!.state as unknown as St;
    const have = new Set(st.meta.map((r) => r[0]));
    const offers = st.pstats.colpD?.offers ?? [];
    expect(offers.length).toBeGreaterThan(0);
    const cited = new Set([
      ...Object.keys(st.col), ...Object.keys(st.eds).map((k) => k.split("|")[1]), ...st.recent.map((x) => x.id),
      ...offers.map((o) => o.id), ...st.pstats.fiches, ...Object.keys(st.pstats.quiz), ...universIdsIn(st),
    ]);
    expect(cited.size).toBeGreaterThan(15);
    expect([...cited].filter((id) => !have.has(id))).toEqual([]);
  }, 60000);

  it("withUniversMeta joint les lignes des cartes citées dans une réponse sociale, et seulement celles-là", () => {
    const [a, b, c, d] = universCards().filter((x) => /^(pr|wk|ev|nf)_/.test(x.id)).slice(0, 4).map((x) => x.id);
    const body = withUniversMeta({
      ok: true, on: true, packs: [{ id: 7, cards: [{ id: a, ed: null }] }], trades: [{ id: "x", give: b, get: "bitcoin" }],
      feed: [{ card: c, data: { base: "ok" } }], profil: { cards: [d], pantheon: [`icon|${a}`] }, pseudo: "on",
    });
    const ids = (body.meta ?? []).map((r) => r[0]).sort();
    expect(ids).toEqual([a, b, c, d, "bitcoin"].sort()); // ni « on », ni « packs », ni « ok », ni « base »
    for (const r of body.meta!) expect(r).toHaveLength(11);
  });
});
