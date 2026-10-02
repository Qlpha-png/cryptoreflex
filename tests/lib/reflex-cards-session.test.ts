/**
 * Reflex Cards phase B1 — qui joue (invité / compte), cookies, rattachement, et les routes /api/cartes
 * de bout en bout sur la vraie migration (PGlite derrière un faux client Supabase).
 */
import { describe, it, expect, beforeAll, beforeEach, vi } from "vitest";
import { NextRequest } from "next/server";
import type { PGlite } from "@electric-sql/pglite";
import { fakeSupabase, makeGameDb } from "../fixtures/rc-pglite";

/* session Supabase simulée : l'utilisateur « connecté » du test courant */
const auth = { user: null as null | Record<string, unknown>, calls: 0 };
vi.mock("@/lib/supabase/route-handler", () => ({
  createRouteHandlerClient: () => ({
    supabase: { auth: { getUser: async () => { auth.calls++; return { data: { user: auth.user }, error: null }; } } },
    applyCookies: (res: unknown) => res,
  }),
}));
let pg: PGlite;
vi.mock("@/lib/supabase/server", () => ({ createSupabaseServiceRoleClient: () => fakeSupabase(pg) }));

const { resolvePlayer, hashToken, gameCtx, GUEST_COOKIE, SessionError } = await import("@/lib/reflex-cards/session");
const etat = await import("@/app/api/cartes/etat/route");
const action = await import("@/app/api/cartes/action/route");
const { NextResponse } = await import("next/server");

const BASE = "https://www.cryptoreflex.fr";
let ipN = 0;
const mk = (path: string, o: { cookies?: Record<string, string>; method?: string; body?: unknown; ip?: string; ct?: string } = {}) => {
  const h = new Headers({ "x-forwarded-proto": "https", "x-vercel-forwarded-for": o.ip ?? `10.0.0.${++ipN}` });
  if (o.cookies) h.set("cookie", Object.entries(o.cookies).map(([k, v]) => `${k}=${v}`).join("; "));
  if (o.body !== undefined) h.set("content-type", o.ct ?? "application/json");
  return new NextRequest(BASE + path, { method: o.method ?? "GET", headers: h, body: o.body === undefined ? undefined : typeof o.body === "string" ? o.body : JSON.stringify(o.body) });
};
const setCookie = (res: Response) => res.headers.get("set-cookie") ?? "";
const tokenOf = (res: Response) => /rc_g=([A-Za-z0-9_-]{43})/.exec(setCookie(res))?.[1] ?? null;
const ACCOUNT = (id: string, extra: Record<string, unknown> = {}) => ({ id, email: "joueur@exemple.test", email_confirmed_at: "2026-10-01T00:00:00Z", is_anonymous: false, ...extra });
const TODAY = "2026-10-03";

beforeAll(async () => {
  ({ pg } = await makeGameDb());
  vi.stubEnv("NEXT_PUBLIC_REFLEX_CARDS_ENABLED", "true");
  vi.stubEnv("NEXT_PUBLIC_REFLEX_CARDS_LAUNCH_DATE", "2026-10-02");
  vi.stubEnv("REFLEX_CARDS_ACCOUNTS", "essai");
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-10-03T10:00:00Z")); // jour 2
});
/* parties invitées testées dans les premiers blocs ; coupées par défaut (bloc « compte obligatoire ») */
beforeEach(() => { auth.user = null; auth.calls = 0; vi.stubEnv("REFLEX_CARDS_GUESTS", "true"); });

describe("Reflex Cards — invité", () => {
  it("sans cookie ni création : pas de partie, aucun cookie, aucun appel à l'authentification", async () => {
    const w = await resolvePlayer(mk("/api/cartes/etat"), { create: false, today: TODAY });
    expect(w.player).toBeNull();
    expect(w.account).toEqual({ guest: true, email: null });
    expect(setCookie(w.finish(NextResponse.json({})))).toBe("");
    expect(auth.calls).toBe(0);
  });
  it("création : jeton secret en cookie httpOnly limité à /api/cartes ; la base ne garde que son empreinte", async () => {
    const w = await resolvePlayer(mk("/api/cartes/action"), { create: true, today: TODAY });
    const res = w.finish(NextResponse.json({}));
    const sc = setCookie(res), tok = tokenOf(res)!;
    expect(tok).toBeTruthy();
    expect(sc).toMatch(/HttpOnly/i); expect(sc).toMatch(/Secure/i); expect(sc).toMatch(/SameSite=lax/i);
    expect(sc).toMatch(/Path=\/api\/cartes/); expect(sc).toMatch(/Max-Age=33696000/);
    const rows = (await pg.query("select guest_hash from public.rc_players where player_id=$1", [w.player])).rows as { guest_hash: string }[];
    expect(rows[0].guest_hash).toBe(hashToken(tok));
    expect(JSON.stringify((await pg.query("select * from public.rc_players")).rows)).not.toContain(tok);
    const again = await resolvePlayer(mk("/api/cartes/etat", { cookies: { [GUEST_COOKIE]: tok } }), { create: false, today: TODAY });
    expect(again.player).toBe(w.player);
    expect(setCookie(again.finish(NextResponse.json({})))).toBe("");
  });
  it("cookie mal formé ou inconnu : effacé, aucune partie", async () => {
    for (const bad of ["abc", "x".repeat(43)]) {
      const w = await resolvePlayer(mk("/api/cartes/etat", { cookies: { [GUEST_COOKIE]: bad } }), { create: false, today: TODAY });
      expect(w.player).toBeNull();
      expect(setCookie(w.finish(NextResponse.json({})))).toMatch(/rc_g=;.*Max-Age=0/);
    }
  });
  it("au plus 10 nouvelles parties invitées par heure et par connexion", async () => {
    const ip = "203.0.113.9";
    for (let i = 0; i < 10; i++) await resolvePlayer(mk("/api/cartes/action", { ip }), { create: true, today: TODAY });
    await expect(resolvePlayer(mk("/api/cartes/action", { ip }), { create: true, today: TODAY })).rejects.toBeInstanceOf(SessionError);
  });
});

describe("Reflex Cards — compte du site et rattachement", () => {
  it("connexion dans le même navigateur : la partie invitée devient celle du compte, le jeton est effacé", async () => {
    const g = await resolvePlayer(mk("/api/cartes/action"), { create: true, today: TODAY });
    const tok = tokenOf(g.finish(NextResponse.json({})))!;
    await pg.query("insert into auth.users(id) values ($1)", ["aaaaaaaa-0000-4000-8000-000000000001"]);
    auth.user = ACCOUNT("aaaaaaaa-0000-4000-8000-000000000001");
    const w = await resolvePlayer(mk("/api/cartes/etat", { cookies: { [GUEST_COOKIE]: tok, "sb-x-auth-token": "1" } }), { create: false, today: TODAY });
    expect(w.player).toBe(g.player);
    expect(w.account).toEqual({ guest: false, email: "joueur@exemple.test" });
    expect(setCookie(w.finish(NextResponse.json({})))).toMatch(/rc_g=;.*Max-Age=0/);
    auth.user = null; // déconnecté : le jeton (effacé) ne donne plus rien
    expect((await resolvePlayer(mk("/api/cartes/etat", { cookies: { [GUEST_COOKIE]: tok } }), { create: false, today: TODAY })).player).toBeNull();
  });
  it("compte qui a déjà sa partie : on la charge, la partie invitée reste à l'invité", async () => {
    const OWNER = "aaaaaaaa-0000-4000-8000-000000000002";
    await pg.query("insert into auth.users(id) values ($1)", [OWNER]);
    auth.user = ACCOUNT(OWNER);
    const own = await resolvePlayer(mk("/api/cartes/action", { cookies: { "sb-x-auth-token": "1" } }), { create: true, today: TODAY });
    auth.user = null;
    const g = await resolvePlayer(mk("/api/cartes/action"), { create: true, today: TODAY });
    const tok = tokenOf(g.finish(NextResponse.json({})))!;
    auth.user = ACCOUNT(OWNER);
    const w = await resolvePlayer(mk("/api/cartes/etat", { cookies: { [GUEST_COOKIE]: tok, "sb-x-auth-token": "1" } }), { create: false, today: TODAY });
    expect(w.player).toBe(own.player);
    expect(setCookie(w.finish(NextResponse.json({})))).toBe("");
    auth.user = null;
    expect((await resolvePlayer(mk("/api/cartes/etat", { cookies: { [GUEST_COOKIE]: tok } }), { create: false, today: TODAY })).player).toBe(g.player);
  });
  it("e-mail non confirmé ou compte anonyme Supabase : traité en invité", async () => {
    for (const extra of [{ email_confirmed_at: null }, { is_anonymous: true }]) {
      auth.user = ACCOUNT("aaaaaaaa-0000-4000-8000-000000000009", extra);
      const w = await resolvePlayer(mk("/api/cartes/etat", { cookies: { "sb-x-auth-token": "1" } }), { create: false, today: TODAY });
      expect(w.account.guest).toBe(true);
      expect(w.player).toBeNull();
    }
  });
});

describe("Reflex Cards — jour de jeu", () => {
  it("jour du serveur ; la veille seulement dans les 30 minutes après minuit (Paris) ; rien d'autre", () => {
    const at = new Date("2026-10-05T10:00:00Z"); // jour 4, 12 h à Paris
    expect(gameCtx(undefined, at)).toMatchObject({ day: 4, today: "2026-10-05" });
    expect(gameCtx(3, at).day).toBe(4); // veille refusée en journée : pas d'alternance entre deux jeux d'offres
    expect(gameCtx(3, new Date("2026-10-04T22:20:00Z")).day).toBe(3); // 00 h 20 à Paris : page d'avant minuit acceptée
    expect(gameCtx(3, new Date("2026-10-04T22:31:00Z")).day).toBe(4); // 00 h 31 : refusée
    for (const v of [2, 5, 90, "4; drop", 3.5, -1, null]) expect(gameCtx(v, at).day).toBe(4);
    expect(gameCtx(undefined, new Date("2026-10-04T22:30:00Z")).today).toBe("2026-10-05"); // minuit passé à Paris
  });
});

describe("Reflex Cards — routes /api/cartes", () => {
  it("coupées (404) sans REFLEX_CARDS_ACCOUNTS", async () => {
    vi.stubEnv("REFLEX_CARDS_ACCOUNTS", "");
    expect((await etat.GET(mk("/api/cartes/etat"))).status).toBe(404);
    expect((await action.POST(mk("/api/cartes/action", { method: "POST", body: { a: "ouvrir" } }))).status).toBe(404);
    vi.stubEnv("REFLEX_CARDS_ACCOUNTS", "essai");
  });
  it("refus : pas de JSON, corps illisible, action inconnue — et aucune partie créée", async () => {
    const n0 = Number(((await pg.query("select count(*) n from public.rc_players")).rows[0] as { n: number }).n);
    expect((await action.POST(mk("/api/cartes/action", { method: "POST", body: "a=ouvrir", ct: "application/x-www-form-urlencoded" }))).status).toBe(415);
    expect((await action.POST(mk("/api/cartes/action", { method: "POST", body: "{pas du json" }))).status).toBe(400);
    expect((await action.POST(mk("/api/cartes/action", { method: "POST", body: { a: "tricher" } }))).status).toBe(400);
    expect((await action.POST(mk("/api/cartes/action", { method: "POST", body: { a: "ouvrir", x: "y".repeat(5000) } }))).status).toBe(413);
    expect(Number(((await pg.query("select count(*) n from public.rc_players")).rows[0] as { n: number }).n)).toBe(n0);
  });
  it("parcours complet : état vide → 1er booster (partie créée) → état → refus de règle lisible", async () => {
    const e0 = await etat.GET(mk("/api/cartes/etat?jour=2"));
    expect(e0.status).toBe(200);
    expect(await e0.json()).toMatchObject({ ok: true, state: null, account: { guest: true } });
    const r1 = await action.POST(mk("/api/cartes/action", { method: "POST", body: { a: "ouvrir", jour: 2, req: crypto.randomUUID() } }));
    expect(r1.status).toBe(200);
    expect(r1.headers.get("cache-control")).toBe("no-store");
    const tok = tokenOf(r1)!;
    const j1 = await r1.json();
    expect(j1.data.items).toHaveLength(5);
    expect(j1.state.packs.stock).toBe(9);
    const e1 = await etat.GET(mk("/api/cartes/etat?jour=2", { cookies: { [GUEST_COOKIE]: tok } }));
    const s1 = (await e1.json()).state;
    expect(Object.values(s1.col as Record<string, { n: number }>).reduce((t, c) => t + c.n, 0) + Object.keys(s1.eds).length).toBeGreaterThan(0);
    expect(s1.packs.stock).toBe(9);
    const bad = await action.POST(mk("/api/cartes/action", { method: "POST", body: { a: "fabriquer", jour: 2, id: "bitcoin-inexistant" }, cookies: { [GUEST_COOKIE]: tok } }));
    expect(bad.status).toBe(422);
    expect(await bad.json()).toMatchObject({ ok: false, code: "bad" });
    /* quiz par la route, avec les noms de champs du jeu (le geste « a » ne doit pas être écrasé par la réponse) */
    const { RULES } = await import("@/lib/reflex-cards/engine");
    const qid = Object.keys(s1.col)[0];
    const qz = await action.POST(mk("/api/cartes/action", { method: "POST", body: { a: "quiz", jour: 2, id: qid, rep: RULES.quiz[qid] }, cookies: { [GUEST_COOKIE]: tok } }));
    expect(qz.status).toBe(200);
    const jq = await qz.json();
    expect(jq.data).toMatchObject({ ok: true, paid: true });
    expect(jq.state.reflets).toBe(5);
  });
  it("première action refusée : la partie invitée créée garde quand même son cookie", async () => {
    const r = await action.POST(mk("/api/cartes/action", { method: "POST", body: { a: "semaine", jour: 2 } }));
    expect(r.status).toBe(422);
    const tok = tokenOf(r);
    expect(tok).toBeTruthy();
    const e = await etat.GET(mk("/api/cartes/etat?jour=2", { cookies: { [GUEST_COOKIE]: tok! } }));
    expect((await e.json()).state).not.toBeNull();
  });
});

describe("Reflex Cards — compte Cryptoreflex obligatoire (réglage par défaut : invités coupés)", () => {
  beforeEach(() => { vi.stubEnv("REFLEX_CARDS_GUESTS", ""); });
  const count = async () => Number(((await pg.query("select count(*) n from public.rc_players")).rows[0] as { n: number }).n);
  it("sans compte : aucun geste, aucune partie créée, aucun cookie ; l'API répond 401 « login »", async () => {
    const n0 = await count();
    await expect(resolvePlayer(mk("/api/cartes/action"), { create: true, today: TODAY })).rejects.toMatchObject({ status: 401, code: "login" });
    for (const body of [{ a: "ouvrir", jour: 2, req: crypto.randomUUID() }, { a: "mission", jour: 2, key: "x" }, { a: "pseudo", jour: 2, v: "Bot" }]) {
      const r = await action.POST(mk("/api/cartes/action", { method: "POST", body }));
      expect(r.status).toBe(401);
      expect(await r.json()).toMatchObject({ ok: false, code: "login" });
      expect(setCookie(r)).not.toContain("rc_g=");
    }
    expect(await count()).toBe(n0);
  });
  it("sans compte : l'état est vide et annonce que les invités ne sont pas admis", async () => {
    const r = await etat.GET(mk("/api/cartes/etat?jour=2"));
    expect(await r.json()).toMatchObject({ ok: true, state: null, account: { guest: true }, guests: false });
  });
  it("un ancien jeton invité n'ouvre plus rien et il est effacé", async () => {
    vi.stubEnv("REFLEX_CARDS_GUESTS", "true");
    const g = await resolvePlayer(mk("/api/cartes/action"), { create: true, today: TODAY });
    const tok = tokenOf(g.finish(NextResponse.json({})))!;
    vi.stubEnv("REFLEX_CARDS_GUESTS", "");
    const w = await resolvePlayer(mk("/api/cartes/etat", { cookies: { [GUEST_COOKIE]: tok } }), { create: false, today: TODAY });
    expect(w.player).toBeNull();
    expect(setCookie(w.finish(NextResponse.json({})))).toMatch(/rc_g=;.*Max-Age=0/);
    await expect(resolvePlayer(mk("/api/cartes/action", { cookies: { [GUEST_COOKIE]: tok } }), { create: true, today: TODAY })).rejects.toMatchObject({ code: "login" });
  });
  it("avec un compte : partie créée dès la première lecture (jamais « compte reconnu, partie vide »), puis retrouvée", async () => {
    const OWNER = "aaaaaaaa-0000-4000-8000-0000000000c1";
    await pg.query("insert into auth.users(id) values ($1)", [OWNER]);
    auth.user = ACCOUNT(OWNER);
    const sb = { "sb-x-auth-token": "1" };
    const e0 = await (await etat.GET(mk("/api/cartes/etat?jour=2", { cookies: sb }))).json();
    /* 02/10 : un compte reconnu retrouve (ou reçoit) toujours sa partie ; pseudo jamais choisi → le jeu le demandera une fois */
    expect(e0.state).toMatchObject({ account: { guest: false, email: "joueur@exemple.test" }, packs: { stock: 10 }, col: {}, pseudoChosen: false });
    expect((await pg.query("select count(*)::int as n from public.rc_players where owner=$1", [OWNER])).rows[0]).toEqual({ n: 1 });
    const r = await action.POST(mk("/api/cartes/action", { method: "POST", body: { a: "ouvrir", jour: 2, req: crypto.randomUUID() }, cookies: sb }));
    expect(r.status).toBe(200);
    expect(setCookie(r)).not.toContain("rc_g=");
    const j = await r.json();
    expect(j.data.items).toHaveLength(5);
    expect(j.state.account).toEqual({ guest: false, email: "joueur@exemple.test" });
    const row = (await pg.query("select owner, guest_hash from public.rc_players where owner=$1", [OWNER])).rows[0] as { owner: string; guest_hash: string | null };
    expect(row).toEqual({ owner: OWNER, guest_hash: null });
    const e1 = await (await etat.GET(mk("/api/cartes/etat?jour=2", { cookies: sb }))).json();
    expect(e1.state.packs.stock).toBe(9);
  });
});

describe("Reflex Cards — pseudo demandé une seule fois (Kev 02/10)", () => {
  it("pseudoChosen passe à vrai dès que le joueur a choisi un pseudo, et le reste", async () => {
    const OWNER = "aaaaaaaa-0000-4000-8000-0000000000c2";
    await pg.query("insert into auth.users(id) values ($1)", [OWNER]);
    auth.user = ACCOUNT(OWNER);
    const sb = { "sb-x-auth-token": "1" };
    const e0 = await (await etat.GET(mk("/api/cartes/etat?jour=2", { cookies: sb }))).json();
    expect(e0.state.pseudoChosen).toBe(false);
    const r = await action.POST(mk("/api/cartes/action", { method: "POST", body: { a: "pseudo", jour: 2, v: "Val" }, cookies: sb }));
    expect(r.status).toBe(200);
    expect((await r.json()).state).toMatchObject({ pseudoChosen: true, perso: { pseudo: "Val" } });
    for (let i = 0; i < 3; i++) {
      const e = await (await etat.GET(mk("/api/cartes/etat?jour=2", { cookies: sb }))).json();
      expect(e.state).toMatchObject({ pseudoChosen: true, perso: { pseudo: "Val" } });
    }
  });
});
