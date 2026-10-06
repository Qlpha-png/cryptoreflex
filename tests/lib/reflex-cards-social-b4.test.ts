/**
 * Reflex Cards — le social entre amis (lots 1 et 3, Kev 03/10/2026), de bout en bout sur PostgreSQL embarqué (PGlite) avec
 * les VRAIES migrations (b1 → b4) et les vraies routes /api/cartes/{amis,action,social}. Session Supabase simulée.
 * Échanges (même rareté, même finition, numéro qui suit la carte, album protégé, d'un seul coup), plafonds du jour, cadeau,
 * pioche, parrainage, fil d'activité et réactions, droits SQL.
 */
import { describe, it, expect, beforeAll, beforeEach, vi } from "vitest";
import { NextRequest } from "next/server";
import type { PGlite } from "@electric-sql/pglite";
import { fakeSupabase, makeGameDb } from "../fixtures/rc-pglite";

const auth = { user: null as null | Record<string, unknown> };
vi.mock("@/lib/supabase/route-handler", () => ({
  createRouteHandlerClient: () => ({
    supabase: { auth: { getUser: async () => ({ data: { user: auth.user }, error: null }) } },
    applyCookies: (res: unknown) => res,
  }),
}));
let pg: PGlite;
vi.mock("@/lib/supabase/server", () => ({ createSupabaseServiceRoleClient: () => fakeSupabase(pg) }));

const amis = await import("@/app/api/cartes/amis/route");
const action = await import("@/app/api/cartes/action/route");
const social = await import("@/app/api/cartes/social/route");
const etat = await import("@/app/api/cartes/etat/route");
const { CARD, RULES, isOut, copyOk, tradeables } = await import("@/lib/reflex-cards/engine");
const { notablePull, planPick } = await import("@/lib/reflex-cards/social");

const BASE = "https://www.cryptoreflex.fr";
let ipN = 0;
const mk = (path: string, o: { method?: string; body?: unknown } = {}) => {
  const h = new Headers({ "x-forwarded-proto": "https", "x-vercel-forwarded-for": `10.2.0.${++ipN % 250}`, cookie: "sb-x-auth-token=1" });
  if (o.body !== undefined) h.set("content-type", "application/json");
  return new NextRequest(BASE + path, { method: o.method ?? "GET", headers: h, body: o.body === undefined ? undefined : JSON.stringify(o.body) });
};
const USERS: Record<string, string> = {
  A: "cccccccc-0000-4000-8000-0000000000a1", B: "cccccccc-0000-4000-8000-0000000000b2", C: "cccccccc-0000-4000-8000-0000000000c3",
  D: "cccccccc-0000-4000-8000-0000000000d4", E: "cccccccc-0000-4000-8000-0000000000e5",
  F: "cccccccc-0000-4000-8000-0000000000f6", G: "cccccccc-0000-4000-8000-0000000000a7",
};
const as = (k: string) => { auth.user = { id: USERS[k], email: `${k.toLowerCase()}@exemple.test`, email_confirmed_at: "2026-10-01T00:00:00Z", is_anonymous: false }; };
const getAmis = async () => (await amis.GET(mk("/api/cartes/amis"))).json();
const postAmis = async (body: unknown) => { const r = await amis.POST(mk("/api/cartes/amis", { method: "POST", body })); return { status: r.status, j: await r.json() }; };
const getSoc = async (q = "") => { const r = await social.GET(mk("/api/cartes/social" + q)); return { status: r.status, j: await r.json() }; };
const postSoc = async (body: Record<string, unknown>) => { const r = await social.POST(mk("/api/cartes/social", { method: "POST", body })); return { status: r.status, j: await r.json() }; };
const act = async (body: Record<string, unknown>) => { const r = await action.POST(mk("/api/cartes/action", { method: "POST", body: { jour: 2, ...body } })); return { status: r.status, j: await r.json() }; };
let minute = 0;
/** une minute de plus (même journée) : les plafonds par minute des routes ne gênent pas les tests */
const tick = () => vi.setSystemTime(new Date(Date.parse("2026-10-03T10:00:00Z") + ++minute * 61_000));

const pid = async (k: string) => (await pg.query<{ player_id: string }>("select player_id from public.rc_players where owner=$1", [USERS[k]])).rows[0].player_id;
const F0 = { ag: [] as number[], or: [] as number[], onyx: [] as number[] };
async function setCard(k: string, id: string, n: number, holo = 0, fins = F0) {
  await pg.query("insert into public.rc_cards (player_id, card_id, n, holo, fins) values ($1,$2,$3,$4,$5::jsonb) on conflict (player_id, card_id) do update set n=excluded.n, holo=excluded.holo, fins=excluded.fins", [await pid(k), id, n, holo, JSON.stringify(fins)]);
}
const row = async (k: string, id: string) => (await pg.query<{ n: number; holo: number; fins: typeof F0 }>("select n, holo, fins from public.rc_cards where player_id=$1 and card_id=$2", [await pid(k), id])).rows[0] ?? null;
const version = async (k: string) => (await pg.query<{ version: number }>("select version from public.rc_players where player_id=$1", [await pid(k)])).rows[0].version;

/* cartes sorties au jour 2, rangées par rareté */
const OUT = RULES.cards.filter((c) => !c.fossil && isOut(c, 2));
const byR = (r: string) => OUT.filter((c) => c.r === r).map((c) => c.id);
const [C1, C2, C3, C4, C5, C6] = byR("C");
const [R1, R2] = byR("R");
const codes: Record<string, string> = {};

beforeAll(async () => {
  ({ pg } = await makeGameDb());
  for (const id of Object.values(USERS)) await pg.query("insert into auth.users(id) values ($1)", [id]);
  vi.stubEnv("NEXT_PUBLIC_REFLEX_CARDS_ENABLED", "true");
  vi.stubEnv("NEXT_PUBLIC_REFLEX_CARDS_LAUNCH_DATE", "2026-10-02");
  vi.stubEnv("REFLEX_CARDS_ACCOUNTS", "true");
  vi.stubEnv("REFLEX_CARDS_INVITE_SECRET", "secret-de-test");
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-10-03T10:00:00Z")); // jour 2
  expect(C6 && R2).toBeTruthy();
  /* comptes A, B, C (D et E arrivent plus tard, par lien d'invitation) ; A ami de B et de C ; B et C pas amis */
  for (const k of ["A", "B", "C"]) { as(k); codes[k] = (await getAmis()).code; }
  for (const k of ["B", "C"]) { as("A"); await postAmis({ a: "demande", code: codes[k] }); as(k); expect((await postAmis({ a: "repondre", code: codes.A, ok: true })).status).toBe(200); }
});
beforeEach(() => { auth.user = null; tick(); });

describe("règle « l'album garde le plus bel exemplaire » (même règle en TS et en SQL)", () => {
  const cases: [string, { n: number; holo: number; fins: typeof F0 }, "ord" | "holo" | "ag" | "or" | "onyx", number | null, boolean][] = [
    ["1 ordinaire", { n: 1, holo: 0, fins: F0 }, "ord", null, false],
    ["2 ordinaires", { n: 2, holo: 0, fins: F0 }, "ord", null, true],
    ["1 Holo + 1 ordinaire : l'ordinaire part", { n: 2, holo: 1, fins: F0 }, "ord", null, true],
    ["1 Holo + 1 ordinaire : la Holo reste", { n: 2, holo: 1, fins: F0 }, "holo", null, false],
    ["2 Holo", { n: 2, holo: 2, fins: F0 }, "holo", null, true],
    ["1 Or + 1 Holo : la Holo part", { n: 2, holo: 1, fins: { ag: [], or: [4], onyx: [] } }, "holo", null, true],
    ["1 Or seul + 1 ordinaire : l'Or reste", { n: 2, holo: 0, fins: { ag: [], or: [4], onyx: [] } }, "or", 4, false],
    ["Or n°4 + Or n°9 : un des deux part", { n: 2, holo: 0, fins: { ag: [], or: [4, 9], onyx: [] } }, "or", 9, true],
    ["Argent n°5 + Or n°4 : l'Argent part", { n: 2, holo: 0, fins: { ag: [5], or: [4], onyx: [] } }, "ag", 5, true],
    ["Argent n°5 + Or n°4 : l'Or reste", { n: 2, holo: 0, fins: { ag: [5], or: [4], onyx: [] } }, "or", 4, false],
    ["numéro absent", { n: 3, holo: 0, fins: { ag: [5, 6], or: [], onyx: [] } }, "ag", 7, false],
    ["Onyx seul", { n: 2, holo: 1, fins: { ag: [], or: [], onyx: [1] } }, "onyx", 1, false],
  ];
  it.each(cases)("%s", async (_l, e, fin, serial, want) => {
    expect(copyOk({ ...e, t: 0 }, fin, serial)).toBe(want);
    await setCard("A", C6, e.n, e.holo, e.fins);
    const r = await pg.query<{ ok: boolean }>("select public.rc_copy_ok($1,$2,$3,$4) as ok", [await pid("A"), C6, fin, serial]);
    expect(r.rows[0].ok).toBe(want);
  });
  it("tradeables liste chaque exemplaire qui peut partir", () => {
    const m = new Map([[C1, { n: 4, holo: 2, fins: { ag: [8], or: [], onyx: [] }, t: 0 }]]);
    expect(tradeables(m, 2)).toEqual([{ id: C1, fin: "ord", serial: null, n: 1 }, { id: C1, fin: "holo", serial: null, n: 2 }]);
  });
});

describe("échanges entre amis", () => {
  let idOrd = "";
  it("sans compte : refusé ; avec compte : vue vide, 3 échanges, 1 pioche, cadeau libre", async () => {
    expect((await social.GET(mk("/api/cartes/social"))).status).toBe(401);
    as("A");
    await pg.query("delete from public.rc_cards where player_id=$1", [await pid("A")]);
    const { status, j } = await getSoc();
    expect(status).toBe(200);
    expect(j).toMatchObject({ ok: true, trades: [], tradesLeft: 3, tradeMax: 3, giftUsed: false, picksLeft: 1, pickMax: 1, feed: [], referral: { week: 0, max: 3 } });
  });
  it("propositions refusées : rareté différente, exemplaire de l'album, pas ami, même carte, numéro manquant", async () => {
    await setCard("A", C1, 3); await setCard("A", C3, 1); await setCard("A", R1, 2);
    await setCard("B", C2, 2); await setCard("B", R2, 2);
    as("A");
    expect((await postSoc({ a: "echange", code: codes.B, give: R1, get: C2, fin: "ord" })).j.error).toMatch(/Même rareté/);
    expect((await postSoc({ a: "echange", code: codes.B, give: C3, get: C2, fin: "ord" })).j.error).toMatch(/doublon ordinaire/);
    expect((await postSoc({ a: "echange", code: codes.B, give: C1, get: C1, fin: "ord" })).j.error).toMatch(/deux cartes différentes/);
    expect((await postSoc({ a: "echange", code: codes.B, give: C1, get: C2, fin: "or" })).j.error).toMatch(/Numéro manquant/);
    as("B");
    expect((await postSoc({ a: "echange", code: codes.C, give: C2, get: C1, fin: "ord" })).j.error).toMatch(/pas \(ou plus\) dans vos amis/);
    expect((await pg.query("select count(*)::int as n from public.rc_trades")).rows[0]).toEqual({ n: 0 });
  });
  it("A propose un ordinaire contre un ordinaire : en attente chez les deux, compté chez A", async () => {
    as("A");
    const r = await postSoc({ a: "echange", code: codes.B, give: C1, get: C2, fin: "ord" });
    expect(r.status).toBe(200);
    expect(r.j.msg).toMatch(/Proposition envoyée/);
    expect(r.j.social.tradesLeft).toBe(2);
    const t = r.j.social.trades[0];
    expect(t).toMatchObject({ mine: true, code: codes.B, give: C1, get: C2, fin: "ord", status: "pending" });
    idOrd = t.id;
    expect((await postSoc({ a: "echange", code: codes.B, give: C1, get: C2, fin: "ord" })).j.error).toMatch(/déjà envoyée/);
    as("B");
    const b = await getSoc();
    expect(b.j.trades[0]).toMatchObject({ id: idOrd, mine: false, code: codes.A, give: C1, get: C2 });
    expect(b.j.tradesLeft).toBe(3);
  });
  it("seul l'ami qui reçoit peut accepter ; il accepte : les cartes passent d'un seul coup, versions montées", async () => {
    as("C");
    expect((await postSoc({ a: "echange-ok", id: idOrd })).j.error).toMatch(/n'existe plus/);
    const [va, vb] = [await version("A"), await version("B")];
    as("B");
    const r = await postSoc({ a: "echange-ok", id: idOrd });
    expect(r.status).toBe(200);
    expect(r.j.msg).toBe("Échange fait !");
    expect(r.j.state.col[C1]).toMatchObject({ n: 1 });
    expect(r.j.social.tradesLeft).toBe(2);
    expect(await row("A", C1)).toMatchObject({ n: 2 });
    expect(await row("A", C2)).toMatchObject({ n: 1, holo: 0 });
    expect(await row("B", C2)).toMatchObject({ n: 1 });
    expect(await row("B", C1)).toMatchObject({ n: 1 });
    expect(await version("A")).toBeGreaterThan(va);
    expect(await version("B")).toBeGreaterThan(vb);
    /* nouvelle carte pour chacun : compteur du jour « newc » */
    const nd = await pg.query<{ ev: Record<string, number> }>("select ev from public.rc_days where player_id=$1 and day='2026-10-03'", [await pid("B")]);
    expect(nd.rows[0].ev.newc).toBeGreaterThanOrEqual(1);
    expect((await postSoc({ a: "echange-ok", id: idOrd })).j.error).toMatch(/n'existe plus/);
  });
  it("Holo contre Holo : la finition passe avec la carte", async () => {
    await setCard("A", C4, 3, 2); await setCard("B", C5, 2, 2);
    as("A");
    expect((await postSoc({ a: "echange", code: codes.B, give: C4, get: C5, fin: "ord" })).j.error).toMatch(/doublon ordinaire|plus cet exemplaire|double/);
    const r = await postSoc({ a: "echange", code: codes.B, give: C4, get: C5, fin: "holo" });
    expect(r.status).toBe(200);
    as("B");
    expect((await postSoc({ a: "echange-ok", id: r.j.social.trades.find((t: { status: string }) => t.status === "pending").id })).status).toBe(200);
    expect(await row("A", C4)).toMatchObject({ n: 2, holo: 1 });
    expect(await row("A", C5)).toMatchObject({ n: 1, holo: 1 });
    expect(await row("B", C5)).toMatchObject({ n: 1, holo: 1 });
    expect(await row("B", C4)).toMatchObject({ n: 1, holo: 1 });
  });
  it("Or contre Or : le numéro suit la carte ; l'Or unique (le plus bel exemplaire) ne part pas", async () => {
    await pg.query("update public.rc_players set reflets = 500 where player_id=$1", [await pid("A")]);
    as("A");
    expect((await act({ a: "service", id: "xtr" })).j.ok).toBe(true); // 4e échange du jour (3 déjà comptés : 2 faits + 0 en attente)
    await setCard("A", R1, 2, 0, { ag: [], or: [3, 7], onyx: [] });
    await setCard("B", R2, 2, 0, { ag: [40], or: [12], onyx: [] });
    expect((await postSoc({ a: "echange", code: codes.B, give: R1, get: R2, fin: "or", gs: 7, ts: 12 })).j.error).toMatch(/plus cet exemplaire en double/);
    await setCard("B", R2, 3, 0, { ag: [40], or: [12, 15], onyx: [] });
    const r = await postSoc({ a: "echange", code: codes.B, give: R1, get: R2, fin: "or", gs: 7, ts: 15 });
    expect(r.status).toBe(200);
    expect(r.j.social.tradeMax).toBe(4);
    const issued = (await pg.query("select count(*)::int as n from public.rc_numbered")).rows[0];
    as("B");
    expect((await postSoc({ a: "echange-ok", id: r.j.social.trades.find((t: { status: string }) => t.status === "pending").id })).status).toBe(200);
    expect(await row("A", R1)).toMatchObject({ n: 1, fins: { or: [3] } });
    expect(await row("A", R2)).toMatchObject({ n: 1, fins: { ag: [], or: [15], onyx: [] } });
    expect(await row("B", R2)).toMatchObject({ n: 2, fins: { ag: [40], or: [12] } });
    expect(await row("B", R1)).toMatchObject({ n: 1, fins: { ag: [], or: [7], onyx: [] } });
    expect((await pg.query("select count(*)::int as n from public.rc_numbered")).rows[0]).toEqual(issued); // aucun numéro créé
  });
  it("plafond du jour : 3 (4 avec « Échange en plus ») ; une proposition refusée ou annulée ne compte plus", async () => {
    await setCard("A", C1, 9); await setCard("C", C3, 9);
    as("A");
    expect((await getSoc()).j.tradesLeft).toBe(1); // ordinaire, Holo, Or faits aujourd'hui ; 4 avec « Échange en plus »
    expect((await postSoc({ a: "echange", code: codes.C, give: C1, get: C3, fin: "ord" })).j.social.tradesLeft).toBe(0);
    expect((await postSoc({ a: "echange", code: codes.C, give: C1, get: C2, fin: "ord" })).j.error).toMatch(/Plus d'échange possible/);
    as("C");
    const r = await postSoc({ a: "echange", code: codes.A, give: C3, get: C1, fin: "ord" });
    expect(r.status).toBe(200);
    expect(r.j.social.tradesLeft).toBe(2);
    const id = r.j.social.trades.find((t: { status: string; mine: boolean }) => t.status === "pending" && t.mine).id;
    as("A");
    expect((await postSoc({ a: "echange-ok", id })).j.error).toMatch(/Plus d'échange possible/); // A : 4/4 aujourd'hui
    expect((await postSoc({ a: "echange-non", id })).j.msg).toBe("Proposition refusée.");
    as("C");
    expect((await getSoc()).j.tradesLeft).toBe(3); // refusée : rendue à C
    const r2 = await postSoc({ a: "echange", code: codes.A, give: C3, get: C1, fin: "ord" });
    const id2 = r2.j.social.trades.find((t: { status: string; mine: boolean }) => t.status === "pending" && t.mine).id;
    expect(r2.j.social.tradesLeft).toBe(2);
    expect((await postSoc({ a: "echange-annuler", id: id2 })).j.msg).toBe("Proposition annulée.");
    expect((await getSoc()).j.tradesLeft).toBe(3);
  });
  it("une proposition de plus de 3 jours expire", async () => {
    as("C");
    const r = await postSoc({ a: "echange", code: codes.A, give: C3, get: C1, fin: "ord" });
    const id = r.j.social.trades.find((t: { status: string; mine: boolean }) => t.status === "pending" && t.mine).id;
    await pg.query("update public.rc_trades set created_at = now() - interval '4 days' where id=$1", [id]);
    as("A");
    expect((await postSoc({ a: "echange-ok", id })).j.error).toMatch(/n'existe plus/);
    expect((await pg.query("select status from public.rc_trades where id=$1", [id])).rows[0]).toEqual({ status: "expired" });
  });
  it("deux amis acceptent en même temps deux propositions qui donnent le MÊME doublon : un seul échange passe", async () => {
    await pg.query("delete from public.rc_trades");
    await setCard("A", C6, 2); await setCard("B", C2, 3); await setCard("C", C3, 3);
    as("A");
    const t1 = (await postSoc({ a: "echange", code: codes.B, give: C6, get: C2, fin: "ord" })).j;
    const t2 = (await postSoc({ a: "echange", code: codes.C, give: C6, get: C3, fin: "ord" })).j;
    const idB = t1.social.trades.find((t: { code: string }) => t.code === codes.B).id, idC = t2.social.trades.find((t: { code: string }) => t.code === codes.C).id;
    const pa = await pid("A"), pb = await pid("B"), pc = await pid("C");
    const [x, y] = await Promise.all([
      pg.query<{ r: string }>("select public.rc_trade_answer($1,$2,true,'2026-10-03',3) as r", [pb, idB]),
      pg.query<{ r: string }>("select public.rc_trade_answer($1,$2,true,'2026-10-03',3) as r", [pc, idC]),
    ]);
    expect([x.rows[0].r, y.rows[0].r].sort()).toEqual(["done", "no_give"]);
    expect(await row("A", C6)).toMatchObject({ n: 1 }); // l'exemplaire de l'album est resté
    void pa;
  });
  it("invariants : jamais d'exemplaire négatif, holo ≤ exemplaires non numérotés, au moins 1 exemplaire", async () => {
    const bad = await pg.query("select * from public.rc_cards where n < 1 or holo < 0 or holo > n - jsonb_array_length(fins->'ag') - jsonb_array_length(fins->'or') - jsonb_array_length(fins->'onyx')");
    expect(bad.rows).toEqual([]);
  });
});

describe("Colporteur : une numérotée est l'exemplaire de l'album (garde de rc_apply alignée)", () => {
  it("1 ordinaire + 1 Argent : l'ordinaire part au Colporteur, l'Argent reste", async () => {
    as("C");
    const st = await (await etat.GET(mk("/api/cartes/etat?jour=2"))).json();
    const offers = st.state.pstats.colpD.offers as { r: string; id: string }[];
    const i = offers.findIndex((o) => ["C", "PC", "R"].includes(o.r));
    expect(i).toBeGreaterThanOrEqual(0);
    const give = byR(offers[i].r).find((id) => id !== offers[i].id && id !== offers[0].id && id !== offers[1]?.id && id !== offers[2]?.id)!;
    await setCard("C", give, 2, 0, { ag: [5], or: [], onyx: [] });
    const r = await act({ a: "colporteur", i, give });
    expect(r.status, r.j.error).toBe(200);
    expect(await row("C", give)).toMatchObject({ n: 1, holo: 0, fins: { ag: [5] } });
    /* plus rien à donner : l'Argent (le plus bel exemplaire) ne part jamais */
    const j = offers.findIndex((o, k) => k !== i && o.r === offers[i].r);
    if (j >= 0) expect((await act({ a: "colporteur", i: j, give })).status).toBe(422);
  });
});

describe("cadeau du jour", () => {
  it("un doublon ordinaire par jour ; jamais l'exemplaire de l'album ; seulement à un ami", async () => {
    await setCard("A", C5, 1); await setCard("A", C4, 3, 0);
    as("A");
    expect((await postSoc({ a: "cadeau", code: codes.B, id: C5 })).j.error).toMatch(/album ne part jamais/);
    as("B");
    expect((await postSoc({ a: "cadeau", code: codes.C, id: C2 })).j.error).toMatch(/pas \(ou plus\) dans vos amis/);
    as("A");
    const nb = (await row("B", C4))?.n ?? 0;
    const r = await postSoc({ a: "cadeau", code: codes.B, id: C4 });
    expect(r.status).toBe(200);
    expect(r.j.msg).toBe("Cadeau envoyé !");
    expect(r.j.social.giftUsed).toBe(true);
    expect(r.j.state.col[C4]).toMatchObject({ n: 2 });
    expect((await row("B", C4))!.n).toBe(nb + 1);
    expect((await postSoc({ a: "cadeau", code: codes.B, id: C4 })).j.error).toMatch(/déjà offert/);
  });
});

describe("pioche dans le dernier booster d'un ami", () => {
  it("pas encore de booster chez l'ami : rien à piocher", async () => {
    as("A");
    expect((await postSoc({ a: "pioche", code: codes.C })).j.error).toMatch(/Pas encore de booster/);
  });
  it("une carte au hasard de SON booster, en copie ordinaire ; 1 par jour, 2 avec « Pioche en plus » ; booster changé : on montre le nouveau", async () => {
    as("B");
    const o = await act({ a: "ouvrir", req: "11111111-1111-4111-8111-111111111111" });
    expect(o.status).toBe(200);
    const ids: string[] = o.j.data.items.map((x: { id: string }) => x.id);
    as("A");
    const v = await getSoc();
    const pack = v.j.packs.find((p: { code: string }) => p.code === codes.B);
    expect(pack.cards.map((c: { id: string }) => c.id)).toEqual(ids);
    const r = await postSoc({ a: "pioche", code: codes.B, draw: pack.id });
    expect(r.status).toBe(200);
    expect(ids).toContain(r.j.data.id);
    expect(ids[r.j.data.slot]).toBe(r.j.data.id);
    expect(r.j.state.col[r.j.data.id].n).toBeGreaterThanOrEqual(1);
    expect(r.j.social.picksLeft).toBe(0);
    expect((await postSoc({ a: "pioche", code: codes.B, draw: pack.id })).j.error).toMatch(/Pioche du jour utilisée/);
    expect((await act({ a: "service", id: "xpk" })).j.ok).toBe(true);
    as("B");
    await act({ a: "ouvrir", req: "22222222-2222-4222-8222-222222222222" });
    as("A");
    const st = await postSoc({ a: "pioche", code: codes.B, draw: pack.id });
    expect(st.status).toBe(409);
    expect(st.j.code).toBe("new_draw");
    expect(st.j.draw.id).not.toBe(pack.id);
    expect((await postSoc({ a: "pioche", code: codes.B, draw: st.j.draw.id })).status).toBe(200);
    expect((await postSoc({ a: "pioche", code: codes.B, draw: st.j.draw.id })).j.error).toMatch(/Pioches du jour utilisées/);
  });
  it("planPick : jamais une finition ni une édition (copie ordinaire), Éclats sur un doublon", () => {
    const s = { player: { version: 1 }, cards: new Map([[C1, { n: 1, holo: 0, fins: F0, t: 0 }]]), eds: new Map(), cos: new Map(), claims: new Set<string>(), days: new Map(), quiz: new Map() } as never;
    const p = planPick({ id: 1, at: "", cards: [{ id: C1, ed: null, fin: "or" }] }, () => 0)(s, "pioche", {}, { day: 2, today: "2026-10-03", now: 0 });
    expect(p.patch.cards).toEqual([{ id: C1, dn: 1 }]);
    expect(p.patch.player).toEqual({ eclats: RULES.shardDup[CARD.get(C1)!.r] });
    expect(p.patch.claims).toEqual(["pk|2026-10-03|1"]);
  });
});

describe("parrainage", () => {
  let tok = "";
  it("un nouveau joueur arrivé par le lien de A ouvre son premier booster : 1 booster chacun", async () => {
    as("A");
    tok = (await getAmis()).invite;
    await pg.query("update public.rc_players set stock = 10 where player_id=$1", [await pid("A")]);
    as("D");
    expect((await postAmis({ a: "invitation", tok })).status).toBe(200);
    expect((await pg.query("select count(*)::int as n from public.rc_referrals where referee=$1", [await pid("D")])).rows[0]).toEqual({ n: 1 });
    const o = await act({ a: "ouvrir", req: "33333333-3333-4333-8333-333333333333" });
    expect(o.status).toBe(200);
    expect(o.j.referral).toEqual({ referee: true, referrer: true });
    expect((await pg.query("select stock from public.rc_players where player_id=$1", [await pid("A")])).rows[0]).toEqual({ stock: 11 });
    expect((await pg.query<{ stock: number }>("select stock from public.rc_players where player_id=$1", [await pid("D")])).rows[0].stock).toBeGreaterThanOrEqual(10);
    /* une seule fois */
    const o2 = await act({ a: "ouvrir", req: "44444444-4444-4444-8444-444444444444" });
    expect(o2.j.referral).toBeUndefined();
  });
  it("un joueur qui a déjà ouvert des boosters n'est pas un filleul ; le parrain est payé 3 fois par 7 jours au plus", async () => {
    as("E");
    await getAmis();
    await act({ a: "ouvrir", req: "55555555-5555-4555-8555-555555555555" });
    expect((await postAmis({ a: "invitation", tok })).status).toBe(200);
    expect((await pg.query("select count(*)::int as n from public.rc_referrals where referee=$1", [await pid("E")])).rows[0]).toEqual({ n: 0 });
    /* plafond : 3 parrainages déjà payés à A cette semaine (D + 2 simulés dans SON registre) → le suivant ne paie que le filleul */
    const pa = await pid("A");
    expect((await pg.query("select count(*)::int as n from public.rc_claims where player_id=$1 and key like 'rf|%'", [pa])).rows[0]).toEqual({ n: 1 });
    for (const x of ["x1", "x2"]) await pg.query("insert into public.rc_claims (player_id, key) values ($1, $2)", [pa, "rf|20261003000000000000|" + x]);
    await pg.query("insert into public.rc_referrals (referee, referrer) values ($1,$2)", [await pid("E"), pa]);
    const r = await pg.query<{ r: unknown }>("select public.rc_referral_reward($1, 10, 900000) as r", [await pid("E")]);
    expect(r.rows[0].r).toEqual({ referee: true, referrer: false });
    as("A");
    expect((await getSoc()).j.referral).toEqual({ week: 3, max: 3 });
    /* supprimer le compte d'un filleul ne remet PAS le plafond à zéro (le registre est celui du parrain) */
    await pg.query("delete from auth.users where id=$1", [USERS.D]);
    expect((await pg.query<{ n: number }>("select count(*)::int as n from public.rc_referrals where referrer=$1", [pa])).rows[0].n).toBeLessThan(2);
    expect((await getSoc()).j.referral).toEqual({ week: 3, max: 3 });
  });
  it("pas de parrainage croisé : un joueur qui a déjà parrainé quelqu'un ne peut pas devenir le filleul de son filleul", async () => {
    as("F"); await getAmis(); as("G"); await getAmis();
    const pf = await pid("F"), pgid = await pid("G");
    expect((await pg.query<{ r: string }>("select public.rc_referral_new($1,$2) as r", [pgid, pf])).rows[0].r).toBe("ok");
    expect((await pg.query<{ r: string }>("select public.rc_referral_new($1,$2) as r", [pf, pgid])).rows[0].r).toBe("already");
    expect((await pg.query("select count(*)::int as n from public.rc_referrals where referee=$1", [pf])).rows[0]).toEqual({ n: 0 });
  });
});

describe("fil d'activité et réactions", () => {
  it("B voit les échanges, cadeaux et pioches de A ; A est nommé, un tiers non ami jamais", async () => {
    as("B");
    const f = (await getSoc()).j.feed as { kind: string; me: boolean; actor: string | null; target: string | null; id: number }[];
    expect(f.some((e) => e.kind === "gift" && e.actor === "Joueur" && e.target === "me")).toBe(true);
    expect(f.some((e) => e.kind === "trade")).toBe(true);
    expect(f.some((e) => e.kind === "pick" && e.target === "me")).toBe(true);
    /* l'échange A ↔ C (C n'est pas ami de B) : C n'est pas nommé */
    const ac = f.find((e) => e.kind === "trade" && !e.me && e.target !== "me");
    if (ac) expect(ac.target).toBe("");
  });
  it("réaction d'un geste : posée, changée, retirée ; jamais sur sa propre activité ni hors de ses amis", async () => {
    as("B");
    const f = (await getSoc()).j.feed as { id: number; me: boolean; kind: string }[];
    const ev = f.find((e) => !e.me)!, mine = f.find((e) => e.me);
    let r = await postSoc({ a: "reaction", ev: ev.id, rx: 1 });
    expect(r.status).toBe(200);
    expect(r.j.social.feed.find((e: { id: number }) => e.id === ev.id)).toMatchObject({ mine: 1, rx: [0, 1, 0, 0] });
    r = await postSoc({ a: "reaction", ev: ev.id, rx: 3 });
    expect(r.j.social.feed.find((e: { id: number }) => e.id === ev.id)).toMatchObject({ mine: 3, rx: [0, 0, 0, 1] });
    r = await postSoc({ a: "reaction", ev: ev.id, rx: 3 });
    expect(r.j.social.feed.find((e: { id: number }) => e.id === ev.id)).toMatchObject({ mine: null, rx: [0, 0, 0, 0] });
    if (mine) expect((await postSoc({ a: "reaction", ev: mine.id, rx: 0 })).j.error).toMatch(/plus visible/);
    expect((await postSoc({ a: "reaction", ev: ev.id, rx: 7 })).status).toBe(422);
    /* E n'est l'ami de personne sauf A : pas de réaction sur une activité de B */
    const evB = (await pg.query<{ id: number }>("select id from public.rc_events where actor=$1 limit 1", [await pid("B")])).rows[0];
    if (evB) { as("C"); expect((await postSoc({ a: "reaction", ev: Number(evB.id), rx: 0 })).j.error).toMatch(/plus visible/); }
  });
  it("belle carte annoncée : la plus belle du booster seulement", () => {
    const L = OUT.find((c) => c.r === "L")?.id, U = OUT.find((c) => c.r === "UR")?.id;
    expect(notablePull([{ id: C1, ed: null, fin: null }, { id: C2, ed: null, fin: "holo" }])).toBeNull();
    if (U) expect(notablePull([{ id: C1, ed: null, fin: null }, { id: U, ed: null, fin: null }])?.id).toBe(U);
    if (L && U) expect(notablePull([{ id: U, ed: null, fin: null }, { id: L, ed: null, fin: null }])?.id).toBe(L);
    /* à score égal, la dernière (booster trié du moins rare au plus rare) : la Légendaire Holo est annoncée, pas la Légendaire */
    if (L) expect(notablePull([{ id: L, ed: null, fin: null }, { id: L, ed: null, fin: "holo" }])?.fin).toBe("holo");
    expect(notablePull([{ id: C1, ed: null, fin: "or", serial: 3 }])?.fin).toBe("or");
    expect(notablePull([{ id: C1, ed: "icon", fin: null }])?.ed).toBe("icon");
  });
});

describe("sécurité de la base", () => {
  it("nouvelles tables : RLS actif, aucune politique, aucun droit pour anon / authenticated", async () => {
    const t = await pg.query<{ tablename: string; rowsecurity: boolean }>("select tablename, rowsecurity from pg_tables where schemaname='public' and tablename in ('rc_trades','rc_events','rc_reactions','rc_referrals') order by 1");
    expect(t.rows).toEqual(["rc_events", "rc_reactions", "rc_referrals", "rc_trades"].map((n) => ({ tablename: n, rowsecurity: true })));
    expect((await pg.query("select count(*)::int as n from pg_policies where schemaname='public' and tablename like 'rc\\_%'")).rows[0]).toEqual({ n: 0 });
    for (const role of ["anon", "authenticated"]) for (const tb of ["rc_trades", "rc_events", "rc_reactions", "rc_referrals"]) {
      expect((await pg.query<{ ok: boolean }>("select has_table_privilege($1, $2, 'select') as ok", [role, "public." + tb])).rows[0].ok).toBe(false);
    }
  });
  it("fonctions : service_role seulement ; les outils internes ne sont exécutables par personne d'autre", async () => {
    const fns = await pg.query<{ sig: string }>("select p.oid::regprocedure::text as sig from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname in ('rc_friend_of','rc_copy_ok','rc_day_inc','rc_move_copy','rc_plus_one','rc_trades_expire','rc_trades_today','rc_event_add','rc_event_friend','rc_trade_propose','rc_trade_answer','rc_trade_cancel','rc_trade_list','rc_friend_dups','rc_gift','rc_friend_draw','rc_friend_packs','rc_referral_new','rc_referral_reward','rc_referral_week','rc_feed','rc_react')");
    expect(fns.rows.length).toBe(22);
    const internal = ["rc_friend_of", "rc_copy_ok", "rc_day_inc", "rc_move_copy", "rc_plus_one", "rc_trades_expire"];
    for (const { sig } of fns.rows) {
      for (const role of ["anon", "authenticated"]) expect((await pg.query<{ ok: boolean }>("select has_function_privilege($1, $2, 'execute') as ok", [role, sig])).rows[0].ok, `${role} ${sig}`).toBe(false);
      const svc = (await pg.query<{ ok: boolean }>("select has_function_privilege('service_role', $1, 'execute') as ok", [sig])).rows[0].ok;
      expect(svc, sig).toBe(!internal.some((n) => sig.startsWith(n + "(") || sig.startsWith("public." + n + "(")));
    }
  });
});

describe("base de production d'avant la migration B4", () => {
  it("social : 503 « not_ready » (le jeu le garde caché) ; le booster d'un compte s'ouvre normalement", async () => {
    const keep = pg;
    ({ pg } = await makeGameDb({ b4: false }));
    try {
      for (const id of Object.values(USERS)) await pg.query("insert into auth.users(id) values ($1)", [id]);
      as("A");
      const r = await social.GET(mk("/api/cartes/social"));
      expect(r.status).toBe(503);
      expect((await r.json()).code).toBe("not_ready");
      expect((await postSoc({ a: "reaction", ev: 1, rx: 0 })).status).toBe(503);
      const o = await act({ a: "ouvrir", req: "66666666-6666-4666-8666-666666666666" });
      expect(o.status).toBe(200);
      expect(o.j.data.items).toHaveLength(5);
      expect(o.j.referral).toBeUndefined();
    } finally {
      pg = keep;
    }
  });
});
