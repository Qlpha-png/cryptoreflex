/**
 * Reflex Cards phase B1 — moteur serveur et parties complètes sur une vraie base PostgreSQL (PGlite, embarquée),
 * avec la migration de production (supabase/migrations/20261002_reflex_cards_b1.sql).
 */
import { describe, it, expect, beforeAll } from "vitest";
import type { PGlite } from "@electric-sql/pglite";
import { makeGameDb } from "../fixtures/rc-pglite";
import { CARD, RULES, dayTables, drawPack, inClear, refill, type Pity, type Rnd, type PlayerRow } from "@/lib/reflex-cards/engine";
import { loadGame, runAction, type GameDb } from "@/lib/reflex-cards/store";
import type { Ctx } from "@/lib/reflex-cards/actions";

const seeded = (seed: number): Rnd => {
  let a = seed;
  return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
};
const freshPity = (): Pity => ({ R: 0, SR: 0, UR: 0, opened: 0, gotSR: false, gotUR: false });
const rank = (id: string) => RULES.rar.indexOf(CARD.get(id)!.r);

describe("Reflex Cards — tirage serveur : la rareté publiée", () => {
  for (const day of [1, 90])
    it(`jour ${day} : 200 000 boosters au taux publié, seulement des cartes connues`, () => {
      const rnd = seeded(day * 7919), ps = freshPity(), N = 200000;
      let R = 0, SR = 0, UR = 0, L = 0, unknown = 0;
      for (let i = 0; i < N; i++) {
        const p = drawPack(day, ps, null, rnd);
        let best = -1;
        for (const it of p) {
          if (it.ed === "relic") continue;
          if (!inClear(it.id, day)) unknown++;
          if (!it.ed) best = Math.max(best, rank(it.id));
        }
        if (best >= 2) R++; if (best >= 3) SR++; if (best >= 4) UR++; if (best >= 5) L++;
      }
      expect(unknown).toBe(0);
      expect(R / N).toBeGreaterThan(0.366); expect(R / N).toBeLessThan(0.376);
      expect(SR / N).toBeGreaterThan(0.069); expect(SR / N).toBeLessThan(0.076);
      expect(UR / N).toBeGreaterThan(0.0088); expect(UR / N).toBeLessThan(0.0112);
      expect(L / N).toBeGreaterThan(0.0013); expect(L / N).toBeLessThan(0.0021);
    });
  it("booster thématique : les cartes de base viennent de la catégorie, rareté inchangée", () => {
    const rnd = seeded(42), ps = freshPity();
    let base = 0, fam = 0, R = 0;
    for (let i = 0; i < 50000; i++) {
      const p = drawPack(43, ps, "DeFi", rnd);
      let best = -1;
      for (const it of p) if (!it.ed) { base++; if (CARD.get(it.id)!.fam === "DeFi" || !dayTables(43).byRD[CARD.get(it.id)!.r].some((c) => c.fam === "DeFi")) fam++; best = Math.max(best, rank(it.id)); }
      if (best >= 2) R++;
    }
    expect(fam).toBe(base);
    expect(R / 50000).toBeGreaterThan(0.36); expect(R / 50000).toBeLessThan(0.383);
  });
  it("l'Équipe de la saison ne tombe pas avant le jour 46", () => {
    expect(dayTables(45).ed.toty.p).toBe(0);
    expect(dayTables(46).ed.toty.p).toBeGreaterThan(0);
  });
  it("garanties : une Rare au plus tard au 6e booster sans Rare", () => {
    const rnd = seeded(7), ps = freshPity();
    let since = 0, worst = 0;
    for (let i = 0; i < 20000; i++) {
      const p = drawPack(30, ps, null, rnd);
      const hasR = p.some((it) => !it.ed && rank(it.id) >= 2);
      since = hasR ? 0 : since + 1;
      worst = Math.max(worst, since);
    }
    expect(worst).toBeLessThan(RULES.pity.R);
  });
  it("réserve : un booster toutes les 15 minutes, 10 au plus", () => {
    const now = Date.parse("2026-10-03T12:00:00Z"), p = { stock: 3, stock_at: new Date(now - 61 * 60000).toISOString() } as PlayerRow;
    expect(refill(p, now).stock).toBe(7);
    expect(refill({ ...p, stock: 9 }, now)).toEqual({ stock: 10, stockAt: now });
    expect(refill({ ...p, stock: 10 }, now).stock).toBe(10);
  });
});

/* ---------- parties complètes sur PostgreSQL ---------- */
let pg: PGlite;
let db: GameDb;
let U = ""; // partie invitée du 1er joueur (créée dans beforeAll)
const ACC = { guest: true, email: null };
const ctxAt = (iso: string, day: number): Ctx => ({ now: Date.parse(iso), today: iso.slice(0, 10), day });
let reqN = 0;
const req = () => `00000000-0000-4000-8000-${String(++reqN).padStart(12, "0")}`;

beforeAll(async () => {
  ({ pg, db } = await makeGameDb());
  expect(await db.findGuest("e".repeat(64))).toBeNull();
  U = await db.createGuest("e".repeat(64), "2026-10-03");
  expect(await db.findGuest("e".repeat(64))).toBe(U);
});

describe("Reflex Cards — une partie sur le serveur", () => {
  it("partie introuvable : erreur claire, rien d'écrit", async () => {
    await expect(loadGame(db, "99999999-9999-4999-8999-999999999999", ctxAt("2026-10-03T10:00:00Z", 2))).rejects.toThrow(/introuvable/);
  });
  it("première visite : partie neuve, 10 boosters, jour joué, offres du Colporteur", async () => {
    const s = await loadGame(db, U, ctxAt("2026-10-03T10:00:00Z", 2));
    expect(s.player.stock).toBe(10);
    expect(s.cards.size).toBe(0);
    expect(s.player.days).toContain("2026-10-03");
    expect(s.days.get("2026-10-03")?.colp?.offers).toHaveLength(3);
  });
  it("ouvrir 10 boosters puis plus rien ; un booster rejoué n'est pas recompté", async () => {
    const ctx = ctxAt("2026-10-03T10:01:00Z", 2);
    const r1 = req();
    const a = await runAction(db, U, "ouvrir", { req: r1 }, ctx, ACC);
    expect((a.data!.items as unknown[]).length).toBe(5);
    const again = await runAction(db, U, "ouvrir", { req: r1 }, ctx, ACC);
    expect(again.state.packs.stock).toBe(9);
    for (let i = 0; i < 9; i++) await runAction(db, U, "ouvrir", { req: req() }, ctx, ACC);
    await expect(runAction(db, U, "ouvrir", { req: req() }, ctx, ACC)).rejects.toThrow(/Plus de booster/);
    const s = await loadGame(db, U, ctx);
    expect(s.player.opened).toBe(10);
    const copies = [...s.cards.values()].reduce((t, e) => t + e.n, 0) + [...s.eds.values()].reduce((t, e) => t + e.n, 0);
    expect(copies).toBe(50);
  });
  it("15 minutes plus tard : un booster de plus", async () => {
    const s = await loadGame(db, U, ctxAt("2026-10-03T10:16:30Z", 2));
    expect(refill(s.player, Date.parse("2026-10-03T10:16:30Z")).stock).toBe(1);
  });
  it("deux ouvertures simultanées : les deux comptent, la réserve ne passe jamais sous zéro", async () => {
    const ctx = ctxAt("2026-10-03T11:20:00Z", 2);
    const before = refill((await loadGame(db, U, ctx)).player, ctx.now).stock;
    const res = await Promise.allSettled([1, 2, 3, 4, 5, 6].map(() => runAction(db, U, "ouvrir", { req: req() }, ctx, ACC)));
    const okN = res.filter((r) => r.status === "fulfilled").length;
    for (const r of res) if (r.status === "rejected") expect(String((r.reason as Error).message)).toMatch(/Plus de booster/);
    expect(okN).toBe(Math.min(6, before));
    expect(refill((await loadGame(db, U, ctx)).player, ctx.now).stock).toBe(before - okN);
  });
  it("mission « ouvrir des boosters » : récupérée une fois, Reflets crédités", async () => {
    const ctx = ctxAt("2026-10-03T12:00:00Z", 2);
    const s = await loadGame(db, U, ctx);
    const { activeMissions } = await import("@/lib/reflex-cards/engine");
    const ms = activeMissions(s, ctx.today).filter((x) => x.d === ctx.today && !x.cl);
    expect(ms).toHaveLength(3);
    const m = ms[0];
    if (m.p < m.g) {
      await expect(runAction(db, U, "mission", { key: m.key }, ctx, ACC)).rejects.toThrow(/pas encore terminée/);
      await pg.query(`update public.rc_days set ev = ev || jsonb_build_object($3::text, $4::int) where player_id=$1 and day=$2`, [U, ctx.today, m.k, m.g]);
    }
    await expect(runAction(db, U, "mission", { key: "2026-10-03|inexistante" }, ctx, ACC)).rejects.toThrow(/plus disponible/);
    const r = await runAction(db, U, "mission", { key: m.key }, ctx, ACC);
    expect(r.state.reflets).toBe(s.player.reflets + m.r);
    await expect(runAction(db, U, "mission", { key: m.key }, ctx, ACC)).rejects.toThrow(/Déjà/);
  });
  it("quiz : bonne réponse +5 Reflets (5 par jour), mauvaise réponse = nouvel essai demain", async () => {
    const ctx = ctxAt("2026-10-03T12:05:00Z", 2);
    const s = await loadGame(db, U, ctx);
    const ids = [...s.cards.keys()];
    const r = await runAction(db, U, "quiz", { id: ids[0], rep: RULES.quiz[ids[0]] }, ctx, ACC);
    expect(r.state.reflets).toBe(s.player.reflets + RULES.qzRew);
    await expect(runAction(db, U, "quiz", { id: ids[0], rep: RULES.quiz[ids[0]] }, ctx, ACC)).rejects.toThrow(/déjà/);
    await runAction(db, U, "quiz", { id: ids[1], rep: "mauvaise réponse" }, ctx, ACC);
    await expect(runAction(db, U, "quiz", { id: ids[1], rep: RULES.quiz[ids[1]] }, ctx, ACC)).rejects.toThrow(/demain/);
    const tomorrow = await runAction(db, U, "quiz", { id: ids[1], rep: RULES.quiz[ids[1]] }, ctxAt("2026-10-04T08:00:00Z", 3), ACC);
    expect((tomorrow.data as { ok: boolean }).ok).toBe(true);
  });
  it("Comptoir : achat refusé sans Reflets, objet de l'étal acheté une seule fois, puis équipé", async () => {
    const ctx = ctxAt("2026-10-04T09:00:00Z", 3);
    await expect(runAction(db, U, "acheter", { id: "frame-saphir" }, ctx, ACC)).rejects.toThrow(/n'est plus en vente|manque/);
    await pg.query("update public.rc_players set reflets = 1000 where player_id=$1", [U]);
    const cl = RULES.cos.find((x) => x.src === "etal" && !RULES.cosOwned.includes(x.id))!;
    const r = await runAction(db, U, "acheter", { id: cl.id }, ctx, ACC);
    expect(r.state.reflets).toBe(1000 - (cl.price ?? 0));
    await expect(runAction(db, U, "acheter", { id: cl.id }, ctx, ACC)).rejects.toThrow(/Déjà/);
    const e = await runAction(db, U, "equiper", { id: cl.id }, ctx, ACC);
    expect((e.state.perso as Record<string, unknown>)[cl.ty]).toBe(cl.id);
    await expect(runAction(db, U, "equiper", { id: "frame-chelem" }, ctx, ACC)).rejects.toThrow(/non possédé/);
  });
  it("Comptoir : booster bonus une fois par jour, booster thématique imposé au suivant", async () => {
    const ctx = ctxAt("2026-10-04T09:05:00Z", 3);
    const s = await loadGame(db, U, ctx);
    const st = refill(s.player, ctx.now).stock;
    const b = await runAction(db, U, "service", { id: "bst" }, ctx, ACC);
    expect(b.state.packs.stock).toBe(st + 1);
    await expect(runAction(db, U, "service", { id: "bst" }, ctx, ACC)).rejects.toThrow(/Déjà pris/);
    await runAction(db, U, "service", { id: "thm", fam: "DeFi" }, ctx, ACC);
    const o = await runAction(db, U, "ouvrir", { req: req() }, ctx, ACC);
    const base = (o.data!.items as { id: string; ed: string | null }[]).filter((it) => !it.ed);
    expect(base.every((it) => CARD.get(it.id)!.fam === "DeFi" || !dayTables(3).byRD[CARD.get(it.id)!.r].some((c) => c.fam === "DeFi"))).toBe(true);
    expect(o.state.packs.theme).toBeNull();
  });
  it("Colporteur : un doublon de même rareté contre la carte proposée, une fois par offre", async () => {
    const ctx = ctxAt("2026-10-04T10:00:00Z", 3);
    const s = await loadGame(db, U, ctx);
    const { tradeN } = await import("@/lib/reflex-cards/engine");
    const offers = s.days.get(ctx.today)!.colp!.offers;
    const i = 0;
    /* on donne au joueur un doublon de la bonne rareté (et un d'une autre rareté) pour tester l'échange à coup sûr */
    const give = dayTables(3).byRD[offers[i].r].find((c) => c.id !== offers[i].id && !offers.some((o) => o.id === c.id))!.id;
    const other = dayTables(3).byRD[offers[i].r === "C" ? "PC" : "C"].find((c) => !offers.some((o) => o.id === c.id))!.id;
    for (const id of [give, other])
      await pg.query(`insert into public.rc_cards(player_id,card_id,n) values ($1,$2,3) on conflict (player_id,card_id) do update set n = 3`, [U, id]);
    await expect(runAction(db, U, "colporteur", { i, give: other }, ctx, ACC)).rejects.toThrow(/même rareté/);
    const s1 = await loadGame(db, U, ctx);
    expect(tradeN(s1, give)).toBe(2);
    const n0 = s1.cards.get(give)!.n, had = s1.cards.get(offers[i].id)?.n ?? 0;
    const r = await runAction(db, U, "colporteur", { i, give }, ctx, ACC);
    expect((r.state.col as Record<string, { n: number }>)[offers[i].id].n).toBe(had + 1);
    expect((r.state.col as Record<string, { n: number }>)[give].n).toBe(n0 - 1);
    expect((r.state.col as Record<string, unknown>)[offers[i].id]).toBeTruthy();
    await expect(runAction(db, U, "colporteur", { i, give }, ctx, ACC)).rejects.toThrow(/déjà prise|doublon/);
  });
  it("fabrication : carte sortie, manquante, au bon jour et avec assez d'éclats", async () => {
    const ctx = ctxAt("2026-10-04T10:10:00Z", 3);
    const s = await loadGame(db, U, ctx);
    const target = dayTables(3).byRD.C.find((c) => !s.cards.has(c.id) && c.part === 0)!;
    await pg.query("update public.rc_players set eclats = 0 where player_id=$1", [U]);
    await expect(runAction(db, U, "fabriquer", { id: target.id }, ctx, ACC)).rejects.toThrow(/manque/);
    await pg.query("update public.rc_players set eclats = 100 where player_id=$1", [U]);
    const r = await runAction(db, U, "fabriquer", { id: target.id }, ctx, ACC);
    expect(r.state.shards).toBe(100 - RULES.craft.C);
    await expect(runAction(db, U, "fabriquer", { id: target.id }, ctx, ACC)).rejects.toThrow(/déjà/);
  });
  it("défi « Premiers pas » : +1 booster, une seule fois ; titre pas encore obtenu refusé", async () => {
    const ctx = ctxAt("2026-10-04T10:20:00Z", 3);
    const s = await loadGame(db, U, ctx);
    const st = refill(s.player, ctx.now).stock;
    const r = await runAction(db, U, "defi", { id: "q-open" }, ctx, ACC);
    expect(r.state.packs.stock).toBe(st + 1);
    await expect(runAction(db, U, "defi", { id: "q-open" }, ctx, ACC)).rejects.toThrow(/déjà/);
    await expect(runAction(db, U, "titre", { id: "t-myth" }, ctx, ACC)).rejects.toThrow(/pas encore/);
    await expect(runAction(db, U, "inconnue", {}, ctx, ACC)).rejects.toThrow(/inconnue/);
  });
  it("fiches : comptées une fois par carte, 30 par jour au plus ; carte pas encore sortie refusée", async () => {
    const ctx = ctxAt("2026-10-04T10:25:00Z", 3);
    const s = await loadGame(db, U, ctx);
    const id = [...s.cards.keys()][0], f0 = s.days.get(ctx.today)?.ev.fiche ?? 0;
    const r = await runAction(db, U, "fiche", { id }, ctx, ACC);
    await runAction(db, U, "fiche", { id }, ctx, ACC);
    const s2 = await loadGame(db, U, ctx);
    expect(s2.claims.has("f|" + id)).toBe(true);
    expect(s2.days.get(ctx.today)!.ev.fiche).toBe(f0 + 2);
    expect(r.ok).toBe(true);
    const later = RULES.cards.find((c) => !inClear(c.id, 3))!.id;
    await expect(runAction(db, U, "fiche", { id: later }, ctx, ACC)).rejects.toThrow(/inconnue/);
    await expect(runAction(db, U, "quiz", { id: later, rep: RULES.quiz[later] }, ctx, ACC)).rejects.toThrow(/inconnue/);
    await expect(runAction(db, U, "fabriquer", { id: later }, ctx, ACC)).rejects.toThrow(/indisponible/);
    await pg.query(`update public.rc_days set ev = ev || '{"fiche":30}'::jsonb where player_id=$1 and day=$2`, [U, ctx.today]);
    const v0 = (await loadGame(db, U, ctx)).player.version;
    await runAction(db, U, "fiche", { id: [...s.cards.keys()][1] }, ctx, ACC);
    expect((await loadGame(db, U, ctx)).player.version).toBe(v0);
  });
  it("l'état envoyé au jeu ne contient que des cartes connues ce jour-là", async () => {
    const ctx = ctxAt("2026-10-04T10:30:00Z", 3);
    const r = await runAction(db, U, "pseudo", { v: "  Kev <b>  " }, ctx, ACC);
    expect(r.state.perso.pseudo).toBe("Kev b");
    for (const id of Object.keys(r.state.col)) expect(inClear(id, 3)).toBe(true);
  });
});

describe("Reflex Cards — récompenses longues (2e joueur, fin de saison)", () => {
  const OWNER = "22222222-2222-4222-8222-222222222222";
  let V = "";
  const ctx = ctxAt("2026-12-30T10:00:00Z", 90); // mercredi, jour 90 : toutes les cartes sont sorties
  const give = (ids: string[]) =>
    pg.query(`insert into public.rc_cards(player_id,card_id,n) select $1, x, 1 from unnest($2::text[]) x on conflict do nothing`, [V, ids]);
  beforeAll(async () => {
    await pg.query("insert into auth.users(id) values ($1)", [OWNER]);
    expect(await db.findAccount(OWNER)).toBeNull();
    V = await db.account(OWNER, ctx.today);
    expect(await db.findAccount(OWNER)).toBe(V);
    await loadGame(db, V, ctx);
  });
  it("collection : refusée incomplète, payée une fois complète, une seule fois", async () => {
    const th = RULES.themes.find((t) => t.id === "th-pion")!;
    await give(th.cards!.slice(1));
    await expect(runAction(db, V, "collection", { id: th.id }, ctx, ACC)).rejects.toThrow(/pas encore complète/);
    await give(th.cards!);
    const e0 = (await loadGame(db, V, ctx)).player.eclats;
    const r = await runAction(db, V, "collection", { id: th.id }, ctx, ACC);
    expect(r.state.shards).toBe(e0 + th.rew);
    await expect(runAction(db, V, "collection", { id: th.id }, ctx, ACC)).rejects.toThrow(/déjà/);
  });
  it("semaine régulière : 5 jours de mission dans la semaine, +150 une fois", async () => {
    await expect(runAction(db, V, "semaine", {}, ctx, ACC)).rejects.toThrow(/pas encore régulière/);
    const w = ["2026-12-28", "2026-12-29", "2026-12-30", "2026-12-26", "2026-12-27"]; // 2 jours de la semaine d'avant : ne comptent pas
    await pg.query(`insert into public.rc_claims(player_id,key) select $1, 'm|' || d || '|x' from unnest($2::text[]) d`, [V, w]);
    await expect(runAction(db, V, "semaine", {}, ctx, ACC)).rejects.toThrow(/pas encore régulière/);
    await pg.query(`insert into public.rc_claims(player_id,key) values ($1,'m|2027-01-01|x'),($1,'m|2027-01-03|x')`, [V]);
    const s = await loadGame(db, V, ctx);
    const r = await runAction(db, V, "semaine", {}, ctx, ACC);
    expect(r.state.reflets).toBe(s.player.reflets + RULES.week.rew);
    await expect(runAction(db, V, "semaine", {}, ctx, ACC)).rejects.toThrow(/déjà/);
  });
  it("Album d'argent : toutes les cartes de l'album hors Légendaires, SANS les Fossiles du Musée", async () => {
    const need = RULES.cards.filter((c) => !c.fossil && c.r !== "L").map((c) => c.id);
    await give(need.slice(0, -1));
    await expect(runAction(db, V, "titre", { id: "t-silver" }, ctx, ACC)).rejects.toThrow(/pas encore/);
    await give(need);
    expect(RULES.cards.some((c) => c.fossil)).toBe(true);
    const r = await runAction(db, V, "titre", { id: "t-silver" }, ctx, ACC);
    expect(r.state.perso.title).toBe("t-silver");
    expect((await runAction(db, V, "titre", { id: null }, ctx, ACC)).state.perso.title).toBeNull();
  });
  it("panthéon : seulement des cartes possédées, 3 au plus", async () => {
    const owned = RULES.cards.find((c) => !c.fossil && c.r !== "L")!.id;
    const missing = RULES.cards.find((c) => c.r === "L")!.id;
    await expect(runAction(db, V, "pantheon", { keys: ["base|" + missing] }, ctx, ACC)).rejects.toThrow(/non possédée/);
    await expect(runAction(db, V, "pantheon", { keys: ["myth|" + owned] }, ctx, ACC)).rejects.toThrow(/non possédée/);
    const r = await runAction(db, V, "pantheon", { keys: ["base|" + owned, "base|" + owned, "base|" + owned, "base|" + owned] }, ctx, ACC);
    expect(r.state.perso.pantheon).toHaveLength(3);
  });
  it("un joueur ne voit jamais la partie d'un autre ; la partie invitée se rattache à un compte neuf", async () => {
    const a = await loadGame(db, U, ctx), b = await loadGame(db, V, ctx);
    expect(b.cards.size).toBeGreaterThan(a.cards.size);
    expect(await db.claim("e".repeat(64), OWNER)).toBe(V); // ce compte a déjà sa partie : on la garde
    const NEW = "33333333-3333-4333-8333-333333333333";
    await pg.query("insert into auth.users(id) values ($1)", [NEW]);
    expect(await db.claim("e".repeat(64), NEW)).toBe(U);
    expect(await db.findGuest("e".repeat(64))).toBeNull();
    expect((await loadGame(db, U, ctx)).cards.size).toBe(a.cards.size);
  });
});
