/**
 * Reflex Cards — Amis et Quiz du jour (Kev 02/10/2026), de bout en bout sur PostgreSQL embarqué (PGlite) avec les VRAIES
 * migrations (b1 + b2 amis) et les vraies routes /api/cartes/{etat,action,amis}. Session Supabase simulée.
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

const etat = await import("@/app/api/cartes/etat/route");
const action = await import("@/app/api/cartes/action/route");
const amis = await import("@/app/api/cartes/amis/route");
const { quizDay, qjReward, CULTURE } = await import("@/lib/reflex-cards/quiz-day");

const BASE = "https://www.cryptoreflex.fr";
let ipN = 0;
const mk = (path: string, o: { method?: string; body?: unknown } = {}) => {
  const h = new Headers({ "x-forwarded-proto": "https", "x-vercel-forwarded-for": `10.1.0.${++ipN}`, cookie: "sb-x-auth-token=1" });
  if (o.body !== undefined) h.set("content-type", "application/json");
  return new NextRequest(BASE + path, { method: o.method ?? "GET", headers: h, body: o.body === undefined ? undefined : JSON.stringify(o.body) });
};
const USERS: Record<string, string> = { A: "bbbbbbbb-0000-4000-8000-0000000000a1", B: "bbbbbbbb-0000-4000-8000-0000000000b2", C: "bbbbbbbb-0000-4000-8000-0000000000c3" };
const as = (k: string) => { auth.user = { id: USERS[k], email: `${k.toLowerCase()}@exemple.test`, email_confirmed_at: "2026-10-01T00:00:00Z", is_anonymous: false }; };
const getAmis = async () => (await amis.GET(mk("/api/cartes/amis"))).json();
const post = async (body: unknown) => { const r = await amis.POST(mk("/api/cartes/amis", { method: "POST", body })); return { status: r.status, j: await r.json() }; };
const act = async (body: Record<string, unknown>) => { const r = await action.POST(mk("/api/cartes/action", { method: "POST", body: { jour: 2, ...body } })); return { status: r.status, j: await r.json() }; };

beforeAll(async () => {
  ({ pg } = await makeGameDb());
  for (const id of Object.values(USERS)) await pg.query("insert into auth.users(id) values ($1)", [id]);
  vi.stubEnv("NEXT_PUBLIC_REFLEX_CARDS_ENABLED", "true");
  vi.stubEnv("NEXT_PUBLIC_REFLEX_CARDS_LAUNCH_DATE", "2026-10-02");
  vi.stubEnv("REFLEX_CARDS_ACCOUNTS", "true");
  vi.stubEnv("REFLEX_CARDS_INVITE_SECRET", "secret-de-test");
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-10-03T10:00:00Z")); // jour 2
});
beforeEach(() => { auth.user = null; });

describe("Reflex Cards — Amis", () => {
  let codeA = "", codeB = "", codeC = "";
  it("visiteur sans compte : refusé (connexion demandée)", async () => {
    const r = await amis.GET(mk("/api/cartes/amis"));
    expect(r.status).toBe(401);
    expect((await r.json()).code).toBe("login");
  });
  it("chaque compte reçoit un code ami de 8 caractères, stable", async () => {
    as("A"); const a = await getAmis(); codeA = a.code;
    as("B"); codeB = (await getAmis()).code;
    as("C"); codeC = (await getAmis()).code;
    for (const c of [codeA, codeB, codeC]) expect(c).toMatch(/^[A-HJ-NP-Z2-9]{8}$/);
    expect(new Set([codeA, codeB, codeC]).size).toBe(3);
    as("A"); expect((await getAmis()).code).toBe(codeA);
    expect(a).toMatchObject({ friends: [], incoming: [], outgoing: [] });
  });
  it("code invalide, inconnu ou le sien : refus clair, rien d'écrit", async () => {
    as("A");
    expect((await post({ a: "demande", code: "abc" })).status).toBe(422);
    expect((await post({ a: "demande", code: "ZZZZZZZZ" })).j.error).toMatch(/Aucun joueur/);
    expect((await post({ a: "demande", code: codeA })).j.error).toMatch(/propre code/);
    expect((await pg.query("select count(*)::int as n from public.rc_friends")).rows[0]).toEqual({ n: 0 });
  });
  it("demande → en attente chez les deux ; acceptation → amis des deux côtés", async () => {
    as("A");
    const r = await post({ a: "demande", code: codeB.toLowerCase() });
    expect(r.status).toBe(200);
    expect(r.j.list.outgoing).toEqual([{ code: codeB, pseudo: "Joueur" }]);
    expect((await post({ a: "demande", code: codeB })).j.error).toMatch(/déjà envoyée/);
    as("B");
    const b = await getAmis();
    expect(b.incoming).toEqual([{ code: codeA, pseudo: "Joueur" }]);
    const ok = await post({ a: "repondre", code: codeA, ok: true });
    expect(ok.j.msg).toMatch(/amis/);
    expect(ok.j.list.friends.map((f: { code: string }) => f.code)).toEqual([codeA]);
    as("A");
    expect((await getAmis()).friends.map((f: { code: string }) => f.code)).toEqual([codeB]);
  });
  it("demandes croisées : la seconde vaut acceptation", async () => {
    as("C"); await post({ a: "demande", code: codeA });
    as("A"); const r = await post({ a: "demande", code: codeC });
    expect(r.j.msg).toMatch(/amis/);
    expect(r.j.list.friends).toHaveLength(2);
  });
  it("l'aperçu d'un ami montre sa collection (nombre, Légendaires, plus belles cartes)", async () => {
    as("B");
    for (let i = 0; i < 3; i++) await act({ a: "ouvrir", req: crypto.randomUUID() });
    const own = (await pg.query("select count(*)::int as n from public.rc_cards c join public.rc_players p using(player_id) where p.owner=$1", [USERS.B])).rows[0] as { n: number };
    as("A");
    const fB = (await getAmis()).friends.find((f: { code: string }) => f.code === codeB);
    expect(fB.own).toBe(own.n);
    expect(fB.best.length).toBe(Math.min(3, own.n));
  });
  it("seuls les amis ACCEPTÉS exposent leurs cartes ; refus et retrait", async () => {
    const cards = async (k: string) => (await pg.query("select count(*)::int as n from public.rc_friend_cards((select player_id from public.rc_players where owner=$1))", [USERS[k]])).rows[0];
    as("C"); await post({ a: "retirer", code: codeA });
    as("A"); expect((await getAmis()).friends.map((f: { code: string }) => f.code)).toEqual([codeB]);
    as("C"); await post({ a: "demande", code: codeB });
    expect(await cards("C")).toEqual({ n: 0 }); // demande en attente : aucune carte de B visible
    as("B"); const no = await post({ a: "repondre", code: codeC, ok: false });
    expect(no.j.msg).toMatch(/refusée/);
    expect(no.j.list.incoming).toEqual([]);
  });
  it("lien d'invitation : code signé ; l'ouvrir rend amis sans attendre d'acceptation", async () => {
    const { inviteToken, inviteCode } = await import("@/lib/reflex-cards/friends");
    as("A"); const a = await getAmis();
    expect(a.invite).toMatch(/^[A-HJ-NP-Z2-9]{8}\.[a-f0-9]{16}$/);
    expect(a.invite).toBe(inviteToken(codeA));
    expect(inviteCode(a.invite)).toBe(codeA);
    expect(inviteCode(codeA + ".0000000000000000")).toBeNull(); // code seul, signature inventée
    expect(inviteCode(codeB + a.invite.slice(8))).toBeNull();    // signature d'un autre code
    expect(inviteCode(codeA)).toBeNull();
    /* C (plus ami de A depuis le retrait) ouvre le lien de A : amis tout de suite, rien « en attente » */
    as("C");
    expect((await post({ a: "invitation", tok: codeA + ".0000000000000000" })).status).toBe(422);
    expect((await post({ a: "invitation", tok: codeA })).status).toBe(422);
    const r = await post({ a: "invitation", tok: a.invite });
    expect(r.status).toBe(200);
    expect(r.j.msg).toBe("Vous êtes maintenant amis avec Joueur !");
    expect(r.j.list.friends.map((f: { code: string }) => f.code)).toContain(codeA);
    expect(r.j.list.outgoing).toEqual([]);
    expect(r.j.list.invite).toBe(inviteToken(codeC));
    as("A");
    expect((await getAmis()).friends.map((f: { code: string }) => f.code).sort()).toEqual([codeB, codeC].sort());
    expect((await getAmis()).incoming).toEqual([]);
    /* déjà amis, ou son propre lien : refus clair, rien d'écrit en plus */
    const n0 = (await pg.query("select count(*)::int as n from public.rc_friends")).rows[0];
    as("C"); expect((await post({ a: "invitation", tok: a.invite })).j.error).toMatch(/déjà amis/);
    as("A"); expect((await post({ a: "invitation", tok: a.invite })).j.error).toMatch(/propre lien/);
    expect((await pg.query("select count(*)::int as n from public.rc_friends")).rows[0]).toEqual(n0);
  });
  it("profil d'un ami : pseudo, boosters ouverts, toutes ses cartes ; refusé pour un non-ami ou un code invalide", async () => {
    as("A");
    const r = await amis.GET(mk(`/api/cartes/amis?profil=${codeB.toLowerCase()}`));
    const j = await r.json();
    expect(r.status).toBe(200);
    expect(j.profil).toMatchObject({ code: codeB, pseudo: "Joueur", title: null, pantheon: [], opened: 3, firstDay: "2026-10-03" });
    const own = (await pg.query("select count(*)::int as n from public.rc_cards c join public.rc_players p using(player_id) where p.owner=$1 and c.n>0", [USERS.B])).rows[0] as { n: number };
    expect(j.profil.cards).toHaveLength(own.n);
    expect(new Set(j.profil.cards).size).toBe(own.n);
    expect(JSON.stringify(j.profil)).not.toMatch(/player_id|owner|@/); // rien d'interne, pas d'e-mail
    /* B a refusé C : C ne voit pas le profil de B ; code invalide : refus clair */
    as("C");
    expect((await amis.GET(mk(`/api/cartes/amis?profil=${codeB}`))).status).toBe(404);
    expect((await amis.GET(mk("/api/cartes/amis?profil=abc"))).status).toBe(422);
  });
  it("limite : 20 demandes par 24 h", async () => {
    const me = (await pg.query("select player_id from public.rc_players where owner=$1", [USERS.C])).rows[0] as { player_id: string };
    /* 21 comptes de test, puis la règle vérifiée directement en SQL */
    await pg.query("delete from public.rc_friends");
    const ids: string[] = [];
    for (let i = 0; i < 21; i++) {
      const u = `dddddddd-0000-4000-8000-${String(i).padStart(12, "0")}`;
      await pg.query("insert into auth.users(id) values ($1)", [u]);
      const p = ((await pg.query("select public.rc_account($1,'2026-10-03') as id", [u])).rows[0] as { id: string }).id;
      ids.push(((await pg.query("select public.rc_friend_code($1) as c", [p])).rows[0] as { c: string }).c);
    }
    const res: string[] = [];
    for (const c of ids) res.push(((await pg.query("select public.rc_friend_request($1,$2) as r", [me.player_id, c])).rows[0] as { r: string }).r);
    expect(res.slice(0, 20).every((r) => r === "sent")).toBe(true);
    expect(res[20]).toBe("limit_day");
  });
});

describe("Reflex Cards — Quiz du jour", () => {
  it("5 questions à 4 choix, les mêmes toute la journée, différentes le lendemain", () => {
    const q1 = quizDay("partie-x", "2026-10-03", 2), q2 = quizDay("partie-x", "2026-10-03", 2), q3 = quizDay("partie-x", "2026-10-04", 3);
    expect(q1).toHaveLength(5);
    for (const q of q1) { expect(q.c).toHaveLength(4); expect(new Set(q.c).size).toBe(4); expect(q.ok).toBeGreaterThanOrEqual(0); expect(q.ok).toBeLessThan(4); }
    expect(q2).toEqual(q1);
    expect(q3).not.toEqual(q1);
  });
  it("barème : 3/5 → 20, 4/5 → 40, 5/5 → 40 et 1 booster, moins → rien", () => {
    expect([0, 1, 2, 3, 4, 5].map(qjReward)).toEqual([
      { reflets: 0, booster: 0 }, { reflets: 0, booster: 0 }, { reflets: 0, booster: 0 },
      { reflets: 20, booster: 0 }, { reflets: 40, booster: 0 }, { reflets: 40, booster: 1 },
    ]);
  });
  it("le navigateur ne reçoit pas les réponses ; 5/5 → +40 Reflets et 1 booster ; une seule partie par jour", async () => {
    as("A");
    const e0 = await (await etat.GET(mk("/api/cartes/etat?jour=2"))).json();
    const qj = e0.state.qj;
    expect(qj.done).toBe(false);
    expect(JSON.stringify(qj)).not.toMatch(/"ok"|"a":/);
    const pid = ((await pg.query("select player_id from public.rc_players where owner=$1", [USERS.A])).rows[0] as { player_id: string }).player_id;
    const sol = quizDay(pid, "2026-10-03", 2);
    expect(qj.q.map((q: { q: string }) => q.q)).toEqual(sol.map((q) => q.q));
    const before = e0.state;
    const r = await act({ a: "quiz-jour", rep: sol.map((q) => q.ok) });
    expect(r.status).toBe(200);
    expect(r.j.data.score).toBe(5);
    expect(r.j.state.reflets).toBe(before.reflets + 40);
    expect(r.j.state.packs.stock).toBe(before.packs.stock + 1);
    expect(r.j.state.qj).toMatchObject({ done: true, score: 5 });
    const again = await act({ a: "quiz-jour", rep: sol.map((q) => q.ok) });
    expect(again.status).toBe(422);
    expect(again.j.error).toMatch(/déjà joué/);
  });
  it("mauvaises réponses : score juste, aucune récompense, partie du jour consommée", async () => {
    as("C");
    const e0 = await (await etat.GET(mk("/api/cartes/etat?jour=2"))).json();
    const pid = ((await pg.query("select player_id from public.rc_players where owner=$1", [USERS.C])).rows[0] as { player_id: string }).player_id;
    const sol = quizDay(pid, "2026-10-03", 2);
    const r = await act({ a: "quiz-jour", rep: sol.map((q, i) => (i < 2 ? q.ok : (q.ok + 1) % 4)) });
    expect(r.j.data.score).toBe(2);
    expect(r.j.state.reflets).toBe(e0.state.reflets);
    expect(r.j.state.qj).toMatchObject({ done: true, score: 2 });
    expect(r.j.state.qj.sol).toHaveLength(5);
  });
  it("réponses incomplètes : refus, rien de consommé", async () => {
    as("B");
    const r = await act({ a: "quiz-jour", rep: [0, 1] });
    expect(r.status).toBe(422);
    const e = await (await etat.GET(mk("/api/cartes/etat?jour=2"))).json();
    expect(e.state.qj.done).toBe(false);
  });
  it("questions variées et accessibles : 2 de culture + 3 sur les cartes, une explication à chaque fois, ni année ni rareté", () => {
    for (const c of CULTURE) { expect(new Set([c.a, ...c.d]).size).toBe(4); expect(c.e.length).toBeGreaterThan(20); expect(c.q.length).toBeGreaterThan(10); }
    expect(CULTURE.length).toBeGreaterThanOrEqual(30);
    for (const d of ["2026-10-03", "2026-10-10", "2026-11-01", "2026-12-24"]) {
      const qs = quizDay("partie-y", d, 2);
      expect(qs).toHaveLength(5);
      const cult = qs.filter((q) => CULTURE.some((c) => c.q === q.q));
      expect(cult).toHaveLength(2);
      for (const q of qs) { expect(q.e.length).toBeGreaterThan(10); expect(q.c[q.ok].length).toBeGreaterThan(0); expect(/En quelle année est né|rareté de la carte/.test(q.q)).toBe(false); }
      for (const q of qs.filter((x) => !cult.includes(x))) expect(/ticker|description|famille|Laquelle de ces cryptos/.test(q.q)).toBe(true);
    }
  });
  it("question par question : la bonne réponse n'est révélée qu'après avoir répondu, la première réponse compte, la 5e donne le score", async () => {
    as("B");
    const pid = ((await pg.query("select player_id from public.rc_players where owner=$1", [USERS.B])).rows[0] as { player_id: string }).player_id;
    const sol = quizDay(pid, "2026-10-03", 2);
    const e0 = await (await etat.GET(mk("/api/cartes/etat?jour=2"))).json();
    expect(e0.state.qj.given).toEqual([]);
    const before = e0.state;
    /* Q1 ratée : la correction de Q1 seulement, les autres questions restent sans réponse */
    const wrong = (sol[0].ok + 1) % 4;
    const r0 = await act({ a: "quiz-jour", i: 0, rep: wrong });
    expect(r0.status).toBe(200);
    expect(r0.j.data).toEqual({ i: 0, rep: wrong, ok: sol[0].ok, correct: false, e: sol[0].e, answered: 1 });
    expect(r0.j.state.qj.given).toEqual([{ i: 0, rep: wrong, ok: sol[0].ok, correct: false, e: sol[0].e }]);
    expect(JSON.stringify(r0.j.state.qj.q)).not.toMatch(/"ok"|"a":/);
    expect(r0.j.state.reflets).toBe(before.reflets);
    /* répondre une 2e fois à Q1 : même correction, rien d'écrit (la première réponse compte) */
    const r0b = await act({ a: "quiz-jour", i: 0, rep: sol[0].ok });
    expect(r0b.j.data).toMatchObject({ i: 0, rep: wrong, correct: false, answered: 1 });
    expect((await pg.query("select count(*)::int as n from public.rc_claims where key like 'zq|2026-10-03|%'")).rows[0]).toEqual({ n: 1 });
    /* entrées invalides, et plus de « tout d'un coup » une fois commencé */
    expect((await act({ a: "quiz-jour", i: 9, rep: 0 })).status).toBe(422);
    expect((await act({ a: "quiz-jour", i: 1, rep: 7 })).status).toBe(422);
    expect((await act({ a: "quiz-jour", rep: sol.map((q) => q.ok) })).status).toBe(422);
    /* Q2 à Q4 justes, puis Q5 juste → 4/5 : +40 Reflets, pas de booster */
    for (let i = 1; i < 4; i++) {
      const r = await act({ a: "quiz-jour", i, rep: sol[i].ok });
      expect(r.j.data).toMatchObject({ i, correct: true, answered: i + 1 });
      expect(r.j.data.done).toBeUndefined();
    }
    const last = await act({ a: "quiz-jour", i: 4, rep: sol[4].ok });
    expect(last.j.data).toMatchObject({ i: 4, correct: true, done: true, score: 4, reward: { reflets: 40, booster: 0 } });
    expect(last.j.data.sol).toHaveLength(5);
    expect(last.j.data.sol[0]).toEqual({ q: sol[0].q, a: sol[0].c[sol[0].ok], e: sol[0].e });
    expect(last.j.state.reflets).toBe(before.reflets + 40);
    expect(last.j.state.packs.stock).toBe(before.packs.stock);
    expect(last.j.state.qj).toMatchObject({ done: true, score: 4 });
    expect((await act({ a: "quiz-jour", i: 2, rep: 0 })).j.error).toMatch(/déjà joué/);
  });
});
