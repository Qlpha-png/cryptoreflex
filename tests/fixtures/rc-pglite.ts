/**
 * Reflex Cards — base PostgreSQL embarquée (PGlite) avec la VRAIE migration de production,
 * et l'adaptateur GameDb correspondant (même contrat que supabaseGameDb).
 */
import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { fromRcLoad, type GameDb, type Loaded } from "@/lib/reflex-cards/store";

/* eslint-disable @typescript-eslint/no-explicit-any */
export async function makeGameDb(o: { b3?: boolean; b4?: boolean } = {}): Promise<{ pg: PGlite; db: GameDb; legacyLoad: GameDb["load"] }> {
  const pg = new PGlite();
  await pg.exec(`create role anon; create role authenticated; create role service_role; create schema auth; create table auth.users (id uuid primary key);`);
  /* comme Supabase : toute nouvelle table, fonction ou séquence du schéma public est d'office accessible à anon, authenticated et
     service_role (privilèges par défaut) — les migrations doivent retirer explicitement ce qui ne doit pas l'être (relecture du 03/10) */
  await pg.exec(`alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
    alter default privileges in schema public grant all on functions to anon, authenticated, service_role;
    alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;`);
  await pg.exec(readFileSync("supabase/migrations/20261002_reflex_cards_b1.sql", "utf8"));
  await pg.exec(readFileSync("supabase/migrations/20261002_reflex_cards_b2_amis.sql", "utf8"));
  /* B3 (rc_load + garde holo) par défaut ; { b3: false } = la base de production d'avant la migration */
  if (o.b3 !== false) await pg.exec(readFileSync("supabase/migrations/20261003_reflex_cards_b3_perf.sql", "utf8"));
  /* B4 (social entre amis) par défaut avec B3 ; { b4: false } = la base d'avant cette migration */
  if (o.b3 !== false && o.b4 !== false) await pg.exec(readFileSync("supabase/migrations/20261003_reflex_cards_b4_social.sql", "utf8"));
  const q = async (s: string, p: unknown[]) => (await pg.query(s, p)).rows as any[];
  const iso = (r: any) => ({ ...r, ...(r.first_at ? { first_at: new Date(r.first_at).toISOString() } : {}), ...(r.at ? { at: new Date(r.at).toISOString() } : {}), ...(r.day ? { day: new Date(r.day).toISOString().slice(0, 10) } : {}) });
  /** l'ancienne lecture (7 requêtes), gardée pour comparer avec rc_load */
  const legacyLoad: GameDb["load"] = async (id, since) => {
    const [player] = await q("select * from public.rc_players where player_id=$1", [id]);
    return {
      player: player ? { ...player, stock_at: new Date(player.stock_at).toISOString(), first_day: new Date(player.first_day).toISOString().slice(0, 10) } : null,
      cards: (await q("select card_id,n,holo,fins,first_at from public.rc_cards where player_id=$1 order by card_id", [id])).map(iso),
      eds: (await q("select ed,card_id,n,first_at from public.rc_editions where player_id=$1 order by ed, card_id", [id])).map(iso),
      cos: (await q("select item_id,no,at from public.rc_cosmetics where player_id=$1 order by item_id", [id])).map(iso),
      claims: await q("select key from public.rc_claims where player_id=$1 order by key", [id]),
      days: (await q("select day,ev,colp from public.rc_days where player_id=$1 and day >= $2 order by day", [id, since])).map(iso),
      quiz: (await q("select card_id,ok,day from public.rc_quiz where player_id=$1 order by card_id", [id])).map(iso),
    } as Loaded;
  };
  const db: GameDb = {
    async findGuest(hash) { return (await q("select player_id from public.rc_players where guest_hash=$1", [hash]))[0]?.player_id ?? null; },
    async createGuest(hash, day) { return (await q("select public.rc_guest($1,$2) as id", [hash, day]))[0].id; },
    async findAccount(owner) { return (await q("select player_id from public.rc_players where owner=$1", [owner]))[0]?.player_id ?? null; },
    async account(owner, day) { return (await q("select public.rc_account($1,$2) as id", [owner, day]))[0].id; },
    async claim(hash, owner) { return (await q("select public.rc_claim($1,$2) as id", [hash, owner]))[0].id ?? null; },
    /* comme la production : rc_load (B3) si elle existe, sinon l'ancienne lecture table par table */
    async load(id, since) {
      if (o.b3 !== false) return fromRcLoad((await q("select public.rc_load($1,$2) as r", [id, since]))[0].r);
      return legacyLoad(id, since);
    },
    async edWorld() {
      const rows = (await q("select ed, card_id, player_id::text as player_id, first_at from public.rc_editions where ed in ('myth','relic') order by first_at, player_id", [])).map((r: any) => ({ ...r, first_at: new Date(r.first_at).toISOString() }));
      const pseudos: Record<string, string> = {};
      for (const p of await q("select player_id::text as player_id, pseudo from public.rc_players", [])) pseudos[p.player_id] = p.pseudo ?? "";
      return { rows, pseudos };
    },
    async apply(id, version, patch) {
      try {
        return (await q("select public.rc_apply($1,$2,$3::jsonb) as r", [id, version, JSON.stringify(patch)]))[0].r;
      } catch (e) {
        const err = new Error(String((e as Error).message)) as Error & { code?: string };
        err.code = (e as { code?: string }).code;
        throw err;
      }
    },
  };
  return { pg, db, legacyLoad };
}

/**
 * Faux client Supabase (le strict nécessaire de supabaseGameDb : from/select/eq/gte/range/maybeSingle et rpc)
 * branché sur PGlite : les routes et supabaseGameDb tournent sur la vraie migration.
 * Comme PostgREST, les dates reviennent en texte (date : « AAAA-MM-JJ », timestamptz : ISO).
 */
export function fakeSupabase(pg: PGlite): any {
  const out = (res: { rows: any[]; fields: { name: string; dataTypeID: number }[] }) =>
    res.rows.map((r) => {
      const o: any = { ...r };
      for (const f of res.fields) if (o[f.name] instanceof Date) o[f.name] = f.dataTypeID === 1082 ? o[f.name].toISOString().slice(0, 10) : o[f.name].toISOString();
      return o;
    });
  const id = (s: string) => { if (!/^[a-z_]+$/.test(s)) throw new Error("identifiant refusé : " + s); return s; };
  return {
    from(table: string) {
      const st = { cols: "*", where: [] as [string, string, unknown][], order: [] as string[], range: null as null | [number, number], count: false };
      const run = async (single: boolean) => {
        try {
          const params: unknown[] = [];
          const w = st.where.map(([c, op, v]) => (v === null && /\bis\b/.test(op) ? `${id(c)} ${op} null` : (params.push(v), `${id(c)} ${op} $${params.length}`)));
          /* select(cols, { count: "exact", head: true }) : seulement le nombre de lignes */
          if (st.count) {
            const r = await pg.query(`select count(*)::int as n from public.${id(table)}${w.length ? " where " + w.join(" and ") : ""}`, params);
            return { data: null, count: (r.rows[0] as { n: number }).n, error: null };
          }
          const cols = st.cols === "*" ? "*" : st.cols.split(",").map((c) => id(c.trim())).join(",");
          const sql = `select ${cols} from public.${id(table)}${w.length ? " where " + w.join(" and ") : ""}${st.order.length ? " order by " + st.order.map(id).join(", ") : ""}${st.range ? ` limit ${st.range[1] - st.range[0] + 1} offset ${st.range[0]}` : ""}`;
          const rows = out(await pg.query(sql, params) as any);
          if (single && rows.length > 1) return { data: null, error: { message: "plusieurs lignes" } };
          return { data: single ? rows[0] ?? null : rows, error: null };
        } catch (e) {
          return { data: null, error: { message: String((e as Error).message), code: (e as any).code } };
        }
      };
      const qb: any = {
        select(c: string, o?: { count?: string; head?: boolean }) { st.cols = c; st.count = !!o?.count && !!o?.head; return qb; },
        eq(c: string, v: unknown) { st.where.push([c, "=", v]); return qb; },
        not(c: string, op: string, v: unknown) { st.where.push([c, op === "is" ? "is not" : "<>", v]); return qb; },
        gte(c: string, v: unknown) { st.where.push([c, ">=", v]); return qb; },
        order(c: string) { st.order.push(c); return qb; },
        range(a: number, b: number) { st.range = [a, b]; return qb; },
        maybeSingle() { return run(true); },
        then(ok: any, ko: any) { return run(false).then(ok, ko); },
      };
      return qb;
    },
    rpc(fn: string, args: Record<string, unknown>) {
      /* comme supabase-js : un « thenable » qui accepte .order() et .range() sur les fonctions-tables */
      const order: string[] = [];
      let range: null | [number, number] = null;
      const run = async () => {
        try {
          const keys = Object.keys(args);
          const js = (k: string) => k === "p_patch" || k === "p_data";
          const call = `public.${id(fn)}(${keys.map((k, i) => `${id(k)} => $${i + 1}${js(k) ? "::jsonb" : ""}`).join(", ")})`;
          const params = keys.map((k) => (js(k) ? JSON.stringify(args[k]) : args[k]));
          /* fonctions qui renvoient une table : comme PostgREST, un tableau d'objets (tri et limit/offset compris) */
          if (fn === "rc_friend_list" || fn === "rc_friend_cards") {
            const tail = `${order.length ? " order by " + order.map(id).join(", ") : ""}${range ? ` limit ${range[1] - range[0] + 1} offset ${range[0]}` : ""}`;
            return { data: out((await pg.query(`select * from ${call}${tail}`, params)) as any), error: null };
          }
          const res = await pg.query(`select ${call} as r`, params);
          return { data: (res.rows[0] as any).r, error: null };
        } catch (e) {
          return { data: null, error: { message: String((e as Error).message), code: (e as any).code } };
        }
      };
      const b: any = {
        order(c: string) { order.push(c); return b; },
        range(a: number, z: number) { range = [a, z]; return b; },
        then(ok: any, ko: any) { return run().then(ok, ko); },
      };
      return b;
    },
  };
}
