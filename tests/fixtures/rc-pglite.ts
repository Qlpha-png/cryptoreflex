/**
 * Reflex Cards — base PostgreSQL embarquée (PGlite) avec la VRAIE migration de production,
 * et l'adaptateur GameDb correspondant (même contrat que supabaseGameDb).
 */
import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import type { GameDb, Loaded } from "@/lib/reflex-cards/store";

/* eslint-disable @typescript-eslint/no-explicit-any */
export async function makeGameDb(): Promise<{ pg: PGlite; db: GameDb }> {
  const pg = new PGlite();
  await pg.exec(`create role anon; create role authenticated; create role service_role; create schema auth; create table auth.users (id uuid primary key);`);
  await pg.exec(readFileSync("supabase/migrations/20261002_reflex_cards_b1.sql", "utf8"));
  await pg.exec(readFileSync("supabase/migrations/20261002_reflex_cards_b2_amis.sql", "utf8"));
  const q = async (s: string, p: unknown[]) => (await pg.query(s, p)).rows as any[];
  const iso = (r: any) => ({ ...r, ...(r.first_at ? { first_at: new Date(r.first_at).toISOString() } : {}), ...(r.at ? { at: new Date(r.at).toISOString() } : {}), ...(r.day ? { day: new Date(r.day).toISOString().slice(0, 10) } : {}) });
  const db: GameDb = {
    async findGuest(hash) { return (await q("select player_id from public.rc_players where guest_hash=$1", [hash]))[0]?.player_id ?? null; },
    async createGuest(hash, day) { return (await q("select public.rc_guest($1,$2) as id", [hash, day]))[0].id; },
    async findAccount(owner) { return (await q("select player_id from public.rc_players where owner=$1", [owner]))[0]?.player_id ?? null; },
    async account(owner, day) { return (await q("select public.rc_account($1,$2) as id", [owner, day]))[0].id; },
    async claim(hash, owner) { return (await q("select public.rc_claim($1,$2) as id", [hash, owner]))[0].id ?? null; },
    async load(id, since) {
      const [player] = await q("select * from public.rc_players where player_id=$1", [id]);
      return {
        player: player ? { ...player, stock_at: new Date(player.stock_at).toISOString(), first_day: new Date(player.first_day).toISOString().slice(0, 10) } : null,
        cards: (await q("select card_id,n,holo,fins,first_at from public.rc_cards where player_id=$1", [id])).map(iso),
        eds: (await q("select ed,card_id,n,first_at from public.rc_editions where player_id=$1", [id])).map(iso),
        cos: (await q("select item_id,no,at from public.rc_cosmetics where player_id=$1", [id])).map(iso),
        claims: await q("select key from public.rc_claims where player_id=$1", [id]),
        days: (await q("select day,ev,colp from public.rc_days where player_id=$1 and day >= $2", [id, since])).map(iso),
        quiz: (await q("select card_id,ok,day from public.rc_quiz where player_id=$1", [id])).map(iso),
      } as Loaded;
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
  return { pg, db };
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
      const st = { cols: "*", where: [] as [string, string, unknown][], range: null as null | [number, number] };
      const run = async (single: boolean) => {
        try {
          const params: unknown[] = [];
          const w = st.where.map(([c, op, v]) => (params.push(v), `${id(c)} ${op} $${params.length}`));
          const cols = st.cols === "*" ? "*" : st.cols.split(",").map((c) => id(c.trim())).join(",");
          const sql = `select ${cols} from public.${id(table)}${w.length ? " where " + w.join(" and ") : ""}${st.range ? ` limit ${st.range[1] - st.range[0] + 1} offset ${st.range[0]}` : ""}`;
          const rows = out(await pg.query(sql, params) as any);
          if (single && rows.length > 1) return { data: null, error: { message: "plusieurs lignes" } };
          return { data: single ? rows[0] ?? null : rows, error: null };
        } catch (e) {
          return { data: null, error: { message: String((e as Error).message), code: (e as any).code } };
        }
      };
      const qb: any = {
        select(c: string) { st.cols = c; return qb; },
        eq(c: string, v: unknown) { st.where.push([c, "=", v]); return qb; },
        gte(c: string, v: unknown) { st.where.push([c, ">=", v]); return qb; },
        range(a: number, b: number) { st.range = [a, b]; return qb; },
        maybeSingle() { return run(true); },
        then(ok: any, ko: any) { return run(false).then(ok, ko); },
      };
      return qb;
    },
    async rpc(fn: string, args: Record<string, unknown>) {
      try {
        const keys = Object.keys(args);
        const call = `public.${id(fn)}(${keys.map((k, i) => `${id(k)} => $${i + 1}${k === "p_patch" ? "::jsonb" : ""}`).join(", ")})`;
        const params = keys.map((k) => (k === "p_patch" ? JSON.stringify(args[k]) : args[k]));
        /* fonctions qui renvoient une table : comme PostgREST, un tableau d'objets */
        if (fn === "rc_friend_list" || fn === "rc_friend_cards") return { data: out((await pg.query(`select * from ${call}`, params)) as any), error: null };
        const res = await pg.query(`select ${call} as r`, params);
        return { data: (res.rows[0] as any).r, error: null };
      } catch (e) {
        return { data: null, error: { message: String((e as Error).message), code: (e as any).code } };
      }
    },
  };
}
