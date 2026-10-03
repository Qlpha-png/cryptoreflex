/**
 * Reflex Cards — lecture et écriture d'une partie en base (phase B1).
 * La base n'est jamais touchée qu'ici, toujours avec la clé serveur et l'identifiant de la partie du joueur
 * (retrouvée par session.ts : compte du site, ou jeton invité du navigateur).
 * L'accès passe par une petite interface (GameDb) : Supabase en production, PostgreSQL embarqué dans les tests.
 */
import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { GameError, dayAdd, type ColpDay, type GameState, type Patch, type PlayerRow, type CardRow, type Pity } from "./engine";
import { planAction, planDaily, toClient, type Account, type Ctx, type Planned } from "./actions";

export interface Loaded {
  player: (PlayerRow & { player_id?: string }) | null;
  cards: { card_id: string; n: number; holo: number; fins: CardRow["fins"]; first_at: string }[];
  eds: { ed: string; card_id: string; n: number; first_at: string }[];
  cos: { item_id: string; no: number | null; at: string }[];
  claims: { key: string }[];
  days: { day: string; ev: Record<string, number>; colp: unknown }[];
  quiz: { card_id: string; ok: boolean; day: string }[];
}
/** holo_cap : la base applique la garde « holo ≤ exemplaires non numérotés » (migration B3) — la mémoire fait pareil */
export interface ApplyResult { version: number; numbered: { i: number; fin: string; serial: number | null }[]; holo_cap?: boolean }
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
/** rc_load absente (migration B3 pas encore passée) : prochain essai après cette heure */
let RC_LOAD_RETRY = 0;
/** tests : oublier qu'rc_load était absente */
export const resetRcLoadProbe = () => { RC_LOAD_RETRY = 0; };
const missingFn = (e: { code?: string; message?: string }) => e.code === "PGRST202" || e.code === "42883" || /rc_load/.test(e.message ?? "") && /exist|schema cache|find/i.test(e.message ?? "");
/** la réponse de rc_load (un seul objet JSON) au format Loaded ; null = partie introuvable */
export function fromRcLoad(data: unknown): Loaded {
  const d = (data ?? null) as Partial<Loaded> | null;
  if (!d) return { player: null, cards: [], eds: [], cos: [], claims: [], days: [], quiz: [] };
  return {
    player: (d.player ?? null) as Loaded["player"],
    cards: d.cards ?? [], eds: d.eds ?? [], cos: d.cos ?? [], claims: d.claims ?? [], days: d.days ?? [], quiz: d.quiz ?? [],
  };
}
export function supabaseGameDb(sb: SupabaseClient): GameDb {
  /* pagination par 1 000 (plafond PostgREST), TOUJOURS triée sur la clé : sans tri, une insertion entre deux pages décale
     l'OFFSET et une ligne est sautée (audit du 03/10) */
  const all = async <T>(table: string, cols: string, player: string, order: string[], extra?: (q: any) => any): Promise<T[]> => {
    const out: T[] = [];
    for (let from = 0; ; from += 1000) {
      let q = sb.from(table).select(cols).eq("player_id", player);
      for (const c of order) q = q.order(c);
      q = q.range(from, from + 999);
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
      /* migration B3 passée : toute la partie en UN appel, un seul instantané (rc_load). Sinon (fonction absente) : ancienne lecture,
         et on ne réessaie rc_load qu'après 5 minutes (pas un aller-retour perdu à chaque geste en attendant la migration). */
      if (Date.now() >= RC_LOAD_RETRY) {
        const { data, error } = await sb.rpc("rc_load", { p_player: id, p_since: since });
        if (!error) return fromRcLoad(data);
        if (!missingFn(error)) throw new Error(error.message);
        RC_LOAD_RETRY = Date.now() + 5 * 60_000;
      }
      /* la ligne du joueur (donc sa version) d'ABORD, les autres tables ensuite : une écriture arrivée entre les deux fait monter la
         version et rc_apply la refusera (rc_conflict), au lieu d'accepter un geste calculé sur des cartes ou des jalons périmés
         avec la bonne version (audit du 03/10 : lecture non atomique) */
      const player = await sb.from("rc_players").select("*").eq("player_id", id).maybeSingle().then((r) => { if (r.error) throw new Error(r.error.message); return r.data; });
      const [cards, eds, cos, claims, days, quiz] = await Promise.all([
        all<Loaded["cards"][number]>("rc_cards", "card_id,n,holo,fins,first_at", id, ["card_id"]),
        all<Loaded["eds"][number]>("rc_editions", "ed,card_id,n,first_at", id, ["ed", "card_id"]),
        all<Loaded["cos"][number]>("rc_cosmetics", "item_id,no,at", id, ["item_id"]),
        all<Loaded["claims"][number]>("rc_claims", "key", id, ["key"]),
        all<Loaded["days"][number]>("rc_days", "day,ev,colp", id, ["day"], (q) => q.gte("day", since)),
        all<Loaded["quiz"][number]>("rc_quiz", "card_id,ok,day", id, ["card_id"]),
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

/**
 * Applique EN MÉMOIRE le patch que rc_apply vient d'écrire, avec exactement la même sémantique que la fonction SQL
 * (supabase/migrations/20261002_reflex_cards_b1.sql) : évite de relire toute la partie après chaque geste
 * (moitié moins de transfert depuis Supabase, geste plus rapide). Équivalence vérifiée par les tests (état en mémoire
 * = état relu en base, après chaque geste). Seuls les horodatages des nouvelles lignes diffèrent de quelques ms.
 */
export function applyPatch(s: GameState, p: Patch, res: ApplyResult, now: number): GameState {
  const P = p.player ?? {};
  const add = (k: string) => Number(P[k] ?? 0);
  const player: PlayerRow = {
    ...s.player,
    version: res.version,
    reflets: s.player.reflets + add("reflets"),
    eclats: s.player.eclats + add("eclats"),
    opened: s.player.opened + add("opened"),
    ...(P.stock != null ? { stock: Number(P.stock) } : {}),
    ...(P.stock_at != null ? { stock_at: String(P.stock_at) } : {}),
    ...(P.pity != null ? { pity: P.pity as Pity } : {}),
    ...("theme" in P ? { theme: P.theme == null ? null : String(P.theme) } : {}),
    ...(P.perso != null ? { perso: P.perso as Record<string, unknown> } : {}),
    ...(P.recent != null ? { recent: P.recent as unknown[] } : {}),
    ...(P.days != null ? { days: P.days as string[] } : {}),
    ...(P.pseudo != null ? { pseudo: String(P.pseudo) } : {}),
  };
  const cards = new Map(s.cards);
  for (const c of p.cards ?? []) {
    const e = cards.get(c.id);
    let row: CardRow = e ? { ...e, fins: { ag: [...e.fins.ag], or: [...e.fins.or], onyx: [...e.fins.onyx] } } : { n: 0, holo: 0, fins: { ag: [], or: [], onyx: [] }, t: now };
    if (c.dn > 0) row = { ...row, n: row.n + c.dn, holo: row.holo + (c.dholo ?? 0) };
    else if (c.dn < 0) {
      /* même règle que rc_apply (B3) : les exemplaires ordinaires partent d'abord, puis les Holo */
      const n2 = row.n + c.dn, nb = row.fins.ag.length + row.fins.or.length + row.fins.onyx.length;
      row = { ...row, n: n2, ...(res.holo_cap ? { holo: Math.min(row.holo, n2 - nb) } : {}) };
    }
    if (c.fin) {
      const n = res.numbered?.find((x) => x.i === c.i);
      if (n && n.fin === "holo") row.holo += 1;
      else if (n && n.serial != null && (n.fin === "ag" || n.fin === "or" || n.fin === "onyx")) row.fins[n.fin].push(n.serial);
    }
    cards.set(c.id, row);
  }
  const eds = new Map(s.eds);
  for (const x of p.eds ?? []) { const k = x.ed + "|" + x.id, e = eds.get(k); eds.set(k, { n: (e?.n ?? 0) + x.dn, t: e?.t ?? now }); }
  const cos = new Map(s.cos);
  for (const x of p.cos ?? []) cos.set(x.id, { no: x.no ?? null, t: now });
  const claims = new Set(s.claims);
  for (const k of p.claims ?? []) claims.add(k);
  const days = new Map(s.days);
  if (p.day) {
    const d = days.get(p.day.day) ?? { ev: {}, colp: null };
    const ev = { ...d.ev };
    for (const [k, v] of Object.entries(p.day.inc ?? {})) ev[k] = (ev[k] ?? 0) + Number(v);
    days.set(p.day.day, { ev, colp: "colp" in p.day ? (p.day.colp ?? null) : d.colp });
  }
  const quiz = new Map(s.quiz);
  if (p.quiz && !quiz.get(p.quiz.id)?.ok) quiz.set(p.quiz.id, { ok: p.quiz.ok, day: p.quiz.day });
  return { player, cards, eds, cos, claims, days, quiz };
}

/** mises à jour du jour (offres du Colporteur, objets mérités…) appliquées en base puis en mémoire, sans relecture */
async function withDaily(db: GameDb, player: string, s: GameState, ctx: Ctx): Promise<GameState | null> {
  const daily = planDaily(s, ctx);
  if (!daily) return s;
  try {
    return applyPatch(s, daily, await db.apply(player, s.player.version, daily), ctx.now);
  } catch (e) {
    if (/rc_conflict/.test(errMsg(e))) return null; // la partie a bougé ailleurs : on relit
    throw dbError(e);
  }
}

/** charge la partie (déjà créée par session.ts) et applique les mises à jour du jour */
export async function loadGame(db: GameDb, player: string, ctx: Ctx): Promise<GameState> {
  const since = dayAdd(ctx.today, -9);
  let L = await db.load(player, since);
  for (let attempt = 0; attempt < 3; attempt++) {
    const d = await withDaily(db, player, toState(L), ctx);
    if (d) return d;
    L = await db.load(player, since); // conflit (autre onglet) : on relit et on recommence
  }
  return toState(L);
}

/** une action du joueur : lecture → règles → écriture atomique ; recommence si la partie a changé entre-temps.
 *  plan : les règles appliquées (planAction ; la pioche chez un ami passe la sienne, avec le booster lu côté serveur) */
export async function runAction(db: GameDb, player: string, a: string, body: Record<string, unknown>, ctx: Ctx, account: Account, plan: (s: GameState, a: string, b: Record<string, unknown>, ctx: Ctx) => Planned = planAction) {
  for (let attempt = 0; attempt < 6; attempt++) {
    /* demandes simultanées sur la même partie : petite attente au hasard pour qu'elles ne se percutent plus */
    if (attempt) await new Promise((r) => setTimeout(r, 15 * attempt + Math.random() * 40 * attempt));
    const s = await loadGame(db, player, ctx);
    const planned = plan(s, a, body, ctx);
    if (!Object.keys(planned.patch).length) return { ok: true, msg: planned.msg, data: planned.data, state: toClient(s, ctx, account) };
    let res: ApplyResult;
    try {
      res = await db.apply(player, s.player.version, planned.patch);
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
    if (a === "ouvrir" && planned.data?.items && res.numbered?.length) {
      const items = planned.data.items as { fin: string | null; serial?: number | null }[];
      for (const n of res.numbered) { items[n.i].fin = n.fin; items[n.i].serial = n.serial; }
    }
    /* état après le geste calculé en mémoire (pas de relecture), puis mises à jour du jour éventuelles (objet mérité…) */
    const after = applyPatch(s, planned.patch, res, ctx.now);
    const s2 = (await withDaily(db, player, after, ctx)) ?? (await loadGame(db, player, ctx));
    return { ok: true, msg: planned.msg, data: planned.data, state: toClient(s2, ctx, account) };
  }
  throw new GameError("busy", "Votre partie est en cours de mise à jour ailleurs : réessayez.");
}
