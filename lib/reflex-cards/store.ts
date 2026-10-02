/**
 * Reflex Cards — lecture et écriture d'une partie en base (phase B1).
 * La base n'est jamais touchée qu'ici, toujours avec la clé serveur et l'identifiant de la partie du joueur
 * (retrouvée par session.ts : compte du site, ou jeton invité du navigateur).
 * L'accès passe par une petite interface (GameDb) : Supabase en production, PostgreSQL embarqué dans les tests.
 */
import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { GameError, dayAdd, type ColpDay, type GameState, type Patch, type PlayerRow, type CardRow } from "./engine";
import { planAction, planDaily, toClient, type Account, type Ctx } from "./actions";

export interface Loaded {
  player: (PlayerRow & { player_id?: string }) | null;
  cards: { card_id: string; n: number; holo: number; fins: CardRow["fins"]; first_at: string }[];
  eds: { ed: string; card_id: string; n: number; first_at: string }[];
  cos: { item_id: string; no: number | null; at: string }[];
  claims: { key: string }[];
  days: { day: string; ev: Record<string, number>; colp: unknown }[];
  quiz: { card_id: string; ok: boolean; day: string }[];
}
export interface ApplyResult { version: number; numbered: { i: number; fin: string; serial: number | null }[] }
export interface GameDb {
  /** partie invitée retrouvée (find) ou créée (create) par l'empreinte SHA-256 du jeton du navigateur */
  findGuest(hash: string): Promise<string | null>;
  createGuest(hash: string, day: string): Promise<string>;
  /** partie d'un compte, créée à la première visite */
  findAccount(owner: string): Promise<string | null>;
  account(owner: string, day: string): Promise<string>;
  /** rattache la partie invitée au compte (si le compte n'en a pas) ; renvoie la partie du compte, ou null */
  claim(hash: string, owner: string): Promise<string | null>;
  load(player: string, since: string): Promise<Loaded>;
  /** lève Error("rc_conflict"), Error("rc_no_dup"), ou une erreur Postgres (code 23505 doublon, 23514 contrainte) */
  apply(player: string, version: number, patch: Patch): Promise<ApplyResult>;
}

/* ---------- Supabase (production) ---------- */
export function supabaseGameDb(sb: SupabaseClient): GameDb {
  const all = async <T>(table: string, cols: string, player: string, extra?: (q: any) => any): Promise<T[]> => {
    const out: T[] = [];
    for (let from = 0; ; from += 1000) {
      let q = sb.from(table).select(cols).eq("player_id", player).range(from, from + 999);
      if (extra) q = extra(q);
      const { data, error } = await q;
      if (error) throw new Error(error.message);
      out.push(...((data ?? []) as T[]));
      if (!data || data.length < 1000) return out;
    }
  };
  return {
    async findGuest(hash) {
      const { data, error } = await sb.from("rc_players").select("player_id").eq("guest_hash", hash).maybeSingle();
      if (error) throw new Error(error.message);
      return (data?.player_id as string | undefined) ?? null;
    },
    async createGuest(hash, day) {
      const { data, error } = await sb.rpc("rc_guest", { p_hash: hash, p_day: day });
      if (error || !data) throw new Error(error?.message ?? "rc_guest");
      return data as string;
    },
    async findAccount(owner) {
      const { data, error } = await sb.from("rc_players").select("player_id").eq("owner", owner).maybeSingle();
      if (error) throw new Error(error.message);
      return (data?.player_id as string | undefined) ?? null;
    },
    async account(owner, day) {
      const { data, error } = await sb.rpc("rc_account", { p_owner: owner, p_day: day });
      if (error || !data) throw new Error(error?.message ?? "rc_account");
      return data as string;
    },
    async claim(hash, owner) {
      const { data, error } = await sb.rpc("rc_claim", { p_hash: hash, p_owner: owner });
      if (error) throw new Error(error.message);
      return (data as string | null) ?? null;
    },
    async load(id, since) {
      const [player, cards, eds, cos, claims, days, quiz] = await Promise.all([
        sb.from("rc_players").select("*").eq("player_id", id).maybeSingle().then((r) => { if (r.error) throw new Error(r.error.message); return r.data; }),
        all<Loaded["cards"][number]>("rc_cards", "card_id,n,holo,fins,first_at", id),
        all<Loaded["eds"][number]>("rc_editions", "ed,card_id,n,first_at", id),
        all<Loaded["cos"][number]>("rc_cosmetics", "item_id,no,at", id),
        all<Loaded["claims"][number]>("rc_claims", "key", id),
        all<Loaded["days"][number]>("rc_days", "day,ev,colp", id, (q) => q.gte("day", since)),
        all<Loaded["quiz"][number]>("rc_quiz", "card_id,ok,day", id),
      ]);
      return { player: player as Loaded["player"], cards, eds, cos, claims, days, quiz };
    },
    async apply(player, version, patch) {
      const { data, error } = await sb.rpc("rc_apply", { p_player: player, p_version: version, p_patch: patch });
      if (error) {
        const e = new Error(error.message) as Error & { code?: string };
        e.code = error.code;
        throw e;
      }
      return data as ApplyResult;
    },
  };
}

export function toState(L: Loaded): GameState {
  if (!L.player) throw new GameError("no_player", "Partie introuvable.");
  return {
    player: L.player,
    cards: new Map(L.cards.map((c) => [c.card_id, { n: c.n, holo: c.holo, fins: c.fins, t: Date.parse(c.first_at) }])),
    eds: new Map(L.eds.map((e) => [e.ed + "|" + e.card_id, { n: e.n, t: Date.parse(e.first_at) }])),
    cos: new Map(L.cos.map((x) => [x.item_id, { no: x.no, t: Date.parse(x.at) }])),
    claims: new Set(L.claims.map((c) => c.key)),
    days: new Map(L.days.map((d) => [String(d.day).slice(0, 10), { ev: d.ev ?? {}, colp: (d.colp as ColpDay | null) ?? null }])),
    quiz: new Map(L.quiz.map((q) => [q.card_id, { ok: q.ok, day: String(q.day).slice(0, 10) }])),
  };
}

const errCode = (e: unknown) => (e as { code?: string })?.code;
const errMsg = (e: unknown) => String((e as Error)?.message ?? e);
/** traduit une erreur de la base en message pour le joueur */
function dbError(e: unknown): GameError {
  const m = errMsg(e), c = errCode(e);
  if (/rc_no_dup/.test(m)) return new GameError("no_dup", "Ce doublon n'est plus disponible.");
  if (c === "23505" || /duplicate key/.test(m)) return new GameError("done", "Déjà fait.");
  if (c === "23514" || /check constraint/.test(m)) return new GameError("short", "Solde insuffisant.");
  return new GameError("db", "Service momentanément indisponible, réessayez.");
}

/** charge la partie (déjà créée par session.ts) et applique les mises à jour du jour */
export async function loadGame(db: GameDb, player: string, ctx: Ctx): Promise<GameState> {
  const since = dayAdd(ctx.today, -9);
  let L = await db.load(player, since);
  for (let attempt = 0; attempt < 3; attempt++) {
    const s = toState(L);
    const daily = planDaily(s, ctx);
    if (!daily) return s;
    try {
      await db.apply(player, s.player.version, daily);
      L = await db.load(player, since);
      return toState(L);
    } catch (e) {
      if (!/rc_conflict/.test(errMsg(e))) throw dbError(e);
      L = await db.load(player, since);
    }
  }
  return toState(L);
}

/** une action du joueur : lecture → règles → écriture atomique ; recommence si la partie a changé entre-temps */
export async function runAction(db: GameDb, player: string, a: string, body: Record<string, unknown>, ctx: Ctx, account: Account) {
  for (let attempt = 0; attempt < 6; attempt++) {
    /* demandes simultanées sur la même partie : petite attente au hasard pour qu'elles ne se percutent plus */
    if (attempt) await new Promise((r) => setTimeout(r, 15 * attempt + Math.random() * 40 * attempt));
    const s = await loadGame(db, player, ctx);
    const plan = planAction(s, a, body, ctx);
    if (!Object.keys(plan.patch).length) return { ok: true, msg: plan.msg, data: plan.data, state: toClient(s, ctx, account) };
    let res: ApplyResult;
    try {
      res = await db.apply(player, s.player.version, plan.patch);
    } catch (e) {
      if (/rc_conflict/.test(errMsg(e))) continue;
      /* booster rejoué (même demande) : on renvoie l'état sans rien recompter */
      if (a === "ouvrir" && (errCode(e) === "23505" || /duplicate key/.test(errMsg(e)))) {
        const s2 = await loadGame(db, player, ctx);
        return { ok: true, replay: true, state: toClient(s2, ctx, account) };
      }
      throw dbError(e);
    }
    /* numérotées : plafond atteint dans le monde → la carte devient Holo */
    if (a === "ouvrir" && plan.data?.items && res.numbered?.length) {
      const items = plan.data.items as { fin: string | null; serial?: number | null }[];
      for (const n of res.numbered) { items[n.i].fin = n.fin; items[n.i].serial = n.serial; }
    }
    const s2 = await loadGame(db, player, ctx);
    return { ok: true, msg: plan.msg, data: plan.data, state: toClient(s2, ctx, account) };
  }
  throw new GameError("busy", "Votre partie est en cours de mise à jour ailleurs : réessayez.");
}
