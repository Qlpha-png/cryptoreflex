/**
 * Reflex Cards — le social entre amis (lots 1 et 3 validés par Kev le 03/10/2026) :
 *   - échanges : une carte contre une carte, même rareté, même finition (le numéro d'une numérotée suit la carte),
 *     acceptés ou refusés par l'ami, faits d'un seul coup en base ; 3 par jour (4 avec « Échange en plus ») ;
 *   - cadeau du jour : un doublon ordinaire offert à un ami ;
 *   - pioche : une carte au hasard du dernier booster d'un ami (copie ordinaire, il garde la sienne), 1 par jour (2 avec
 *     « Pioche en plus ») ;
 *   - parrainage : 1 booster chacun quand le filleul (arrivé par le lien d'invitation) ouvre son premier booster ;
 *   - fil d'activité des amis, réactions d'un geste.
 * La base n'est touchée qu'ici, par les fonctions SQL de supabase/migrations/20261003_reflex_cards_b4_social.sql (service role).
 * Le navigateur ne voit jamais l'identifiant de partie d'un autre joueur : seulement son code ami.
 */
import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { CARD, RULES, GameError, copyOk, cryptoRnd, isOut, svcKey, tradeables, TRADE_FINS, type CardRow, type GameState, type Rnd, type TradeFin } from "./engine";
import type { Ctx, Planned } from "./actions";

/** la migration B4 n'est pas encore passée en base : le social reste caché */
export class SocialNotReady extends Error {}
const missing = (e: { code?: string; message?: string } | null) =>
  !!e && (e.code === "PGRST202" || e.code === "42883" || e.code === "42P01" || (/rc_(trade|gift|feed|react|referral|friend_d|friend_p|event)/.test(e.message ?? "") && /exist|schema cache|find/i.test(e.message ?? "")));

export interface TradeRow { id: string; mine: boolean; code: string; pseudo: string; give: string; get: string; fin: TradeFin; gs: number | null; ts: number | null; status: string; at: string; done: string | null }
export interface DrawCard { id: string; ed: string | null; fin: string | null }
export interface DrawRow { id: number; cards: DrawCard[]; at: string }
export interface FeedRow { id: number; kind: string; card: string | null; data: Record<string, unknown>; at: string; me: boolean; actor: string | null; code: string | null; target: string | null; rx: number[]; mine: number | null }
export interface TradeReq { give: string; get: string; fin: TradeFin; gs: number | null; ts: number | null }
interface DupRow { card_id: string; n: number; holo: number; fins: CardRow["fins"] }

export interface SocialDb {
  tradesToday(player: string, day: string): Promise<number>;
  propose(player: string, code: string, t: TradeReq, day: string, max: number): Promise<string>;
  answer(player: string, id: string, accept: boolean, day: string, max: number): Promise<string>;
  cancel(player: string, id: string): Promise<string>;
  trades(player: string): Promise<TradeRow[]>;
  /** les cartes d'un ami accepté qui ont au moins 2 exemplaires ; null : pas un ami */
  friendDups(player: string, code: string): Promise<DupRow[] | null>;
  gift(player: string, code: string, card: string, day: string): Promise<string>;
  friendDraw(player: string, code: string): Promise<DrawRow | null>;
  friendPacks(player: string): Promise<(DrawRow & { code: string })[]>;
  referralNew(referee: string, referrer: string): Promise<string>;
  referralReward(referee: string): Promise<{ referee: boolean; referrer: boolean } | null>;
  referralWeek(player: string): Promise<number>;
  feed(player: string): Promise<FeedRow[]>;
  react(player: string, event: number, emoji: number): Promise<string>;
  /** friendCode : l'ami visé (pioche dans son booster), null : personne (belle carte tirée) */
  event(actor: string, kind: "pull" | "pick", friendCode: string | null, card: string, data: Record<string, unknown>): Promise<void>;
}

export function supabaseSocialDb(sb: SupabaseClient): SocialDb {
  const rpc = async <T>(fn: string, args: Record<string, unknown>): Promise<T> => {
    const { data, error } = await sb.rpc(fn, args);
    if (error) { if (missing(error)) throw new SocialNotReady(error.message); throw new Error(error.message); }
    return data as T;
  };
  return {
    tradesToday: (p, day) => rpc<number>("rc_trades_today", { p_me: p, p_day: day }),
    propose: (p, code, t, day, max) => rpc<string>("rc_trade_propose", { p_a: p, p_code: code, p_give: t.give, p_get: t.get, p_fin: t.fin, p_give_serial: t.gs, p_get_serial: t.ts, p_day: day, p_max: max }),
    answer: (p, id, ok, day, max) => rpc<string>("rc_trade_answer", { p_me: p, p_id: id, p_accept: ok, p_day: day, p_max: max }),
    cancel: (p, id) => rpc<string>("rc_trade_cancel", { p_me: p, p_id: id }),
    trades: async (p) => (await rpc<TradeRow[] | null>("rc_trade_list", { p_me: p })) ?? [],
    friendDups: (p, code) => rpc<DupRow[] | null>("rc_friend_dups", { p_me: p, p_code: code }),
    gift: (p, code, card, day) => rpc<string>("rc_gift", { p_from: p, p_code: code, p_card: card, p_day: day }),
    friendDraw: (p, code) => rpc<DrawRow | null>("rc_friend_draw", { p_me: p, p_code: code }),
    friendPacks: async (p) => (await rpc<(DrawRow & { code: string })[] | null>("rc_friend_packs", { p_me: p })) ?? [],
    referralNew: (referee, referrer) => rpc<string>("rc_referral_new", { p_referee: referee, p_referrer: referrer }),
    referralReward: (referee) => rpc<{ referee: boolean; referrer: boolean } | null>("rc_referral_reward", { p_referee: referee, p_max: RULES.maxs, p_cycle_ms: RULES.cycle }),
    referralWeek: (p) => rpc<number>("rc_referral_week", { p_me: p }),
    feed: async (p) => (await rpc<FeedRow[] | null>("rc_feed", { p_me: p })) ?? [],
    react: (p, ev, emoji) => rpc<string>("rc_react", { p_me: p, p_event: ev, p_emoji: emoji }),
    async event(actor, kind, friendCode, card, data) {
      if (friendCode) await rpc("rc_event_friend", { p_actor: actor, p_kind: kind, p_code: friendCode, p_card: card, p_data: data });
      else await rpc("rc_event_add", { p_actor: actor, p_kind: kind, p_target: null, p_card: card, p_data: data });
    },
  };
}

/* ---------- plafonds du jour ---------- */
export const TRADES_PER_DAY = 3;
export const tradeMax = (s: GameState, today: string) => TRADES_PER_DAY + (s.claims.has("s|" + svcKey("xtr", today)) ? 1 : 0);
export const pickMax = (s: GameState, today: string) => 1 + (s.claims.has("s|" + svcKey("xpk", today)) ? 1 : 0);
export const picksUsed = (s: GameState, today: string) => { let n = 0; for (const k of s.claims) if (k.startsWith(`pk|${today}|`)) n++; return n; };
export const giftUsed = (s: GameState, today: string) => s.claims.has("gift|" + today);
export const REFERRALS_PER_WEEK = 3;

/** carte de base sortie (ni fossile ni carte à venir) */
const known = (id: string, day: number) => { const c = CARD.get(id); return !!c && !c.fossil && isOut(c, day); };

/** la proposition d'échange, contrôlée côté serveur : deux cartes sorties différentes, même rareté, même finition, et
 *  un exemplaire que je peux céder (l'ami : contrôlé par la base, au moment de la proposition et de l'acceptation) */
export function checkTrade(s: GameState, b: Record<string, unknown>, ctx: Ctx): TradeReq {
  const give = String(b.give ?? ""), get = String(b.get ?? ""), fin = String(b.fin ?? "") as TradeFin;
  if (!TRADE_FINS.includes(fin)) throw new GameError("bad", "Finition inconnue.");
  const num = fin === "ag" || fin === "or" || fin === "onyx";
  const ser = (v: unknown) => (v == null || v === "" ? null : Number(v));
  const gs = num ? ser(b.gs) : null, ts = num ? ser(b.ts) : null;
  if (num && !(Number.isInteger(gs) && Number.isInteger(ts) && (gs as number) >= 1 && (ts as number) >= 1)) throw new GameError("bad", "Numéro manquant.");
  if (!known(give, ctx.day) || !known(get, ctx.day)) throw new GameError("bad", "Carte inconnue.");
  if (give === get) throw new GameError("bad", "Choisissez deux cartes différentes.");
  if (CARD.get(give)!.r !== CARD.get(get)!.r) throw new GameError("bad", "Même rareté des deux côtés, toujours.");
  if (!copyOk(s.cards.get(give), fin, gs)) throw new GameError("no_dup", fin === "ord" ? "Il vous faut un doublon ordinaire de cette carte." : "Cet exemplaire ne peut pas partir : votre album garde toujours le plus beau.");
  return { give, get, fin, gs, ts };
}

/** les exemplaires qu'un ami peut céder (à partir de ses cartes en plusieurs exemplaires) */
export function friendTradeables(rows: DupRow[], day: number) {
  return tradeables(new Map(rows.map((r) => [r.card_id, { n: r.n, holo: r.holo, fins: r.fins, t: 0 }])), day);
}

/** pioche dans le dernier booster d'un ami : une carte AU HASARD (tirage serveur ; la place choisie à l'écran n'est qu'un
 *  geste), reçue en copie ordinaire — jamais une finition ni une édition ; doublon = Éclats comme dans un booster */
export function planPick(draw: DrawRow, rnd: Rnd = cryptoRnd) {
  return (s: GameState, _a: string, _b: Record<string, unknown>, ctx: Ctx): Planned => {
    const used = picksUsed(s, ctx.today), max = pickMax(s, ctx.today);
    if (used >= max) throw new GameError("done", max > 1 ? "Pioches du jour utilisées : revenez demain." : "Pioche du jour utilisée : revenez demain (une 2e à la Boutique).");
    const slots = draw.cards.map((it, i) => ({ it, i })).filter((x) => known(x.it.id, ctx.day));
    if (!slots.length) throw new GameError("gone", "Rien à piocher dans ce booster.");
    const { it, i } = slots[Math.floor(rnd() * slots.length)];
    const c = CARD.get(it.id)!, isNew = !s.cards.has(c.id), gain = isNew ? 0 : RULES.shardDup[c.r];
    return {
      patch: {
        ...(gain ? { player: { eclats: gain } } : {}),
        cards: [{ id: c.id, dn: 1 }],
        claims: [`pk|${ctx.today}|${used + 1}`],
        day: { day: ctx.today, inc: { pick: 1, ...(isNew ? { newc: 1 } : {}) } },
      },
      data: { id: c.id, slot: i, isNew, gain },
    };
  };
}

/* belles cartes d'un booster annoncées dans le fil des amis : la plus belle du booster seulement */
const ED_SCORE: Record<string, number> = { relic: 100, myth: 90, toty: 80, icon: 70 };
const FIN_SCORE: Record<string, number> = { onyx: 65, or: 60, ag: 55 };
export function notablePull(items: { id: string; ed: string | null; fin: string | null; serial?: number | null }[]) {
  let best: (typeof items)[number] | null = null, score = 0;
  for (const it of items) {
    const c = CARD.get(it.id);
    if (!c) continue;
    const sc = Math.max(it.ed ? ED_SCORE[it.ed] ?? 0 : 0, !it.ed && it.fin ? FIN_SCORE[it.fin] ?? 0 : 0, !it.ed && c.r === "L" ? 50 : 0, !it.ed && c.r === "UR" ? 40 : 0);
    if (sc > score) { score = sc; best = it; }
  }
  return best;
}

/** après un booster ouvert par un COMPTE : belle carte annoncée aux amis ; 1er booster d'un filleul → parrainage payé.
 *  Ne bloque jamais le booster (migration absente, erreur passagère : rien). Renvoie le parrainage payé, sinon null. */
export async function afterOpen(sdb: SocialDb, player: string, out: { data?: Record<string, unknown>; state?: { pstats?: { opened?: number } } }) {
  try {
    const it = notablePull((out.data?.items ?? []) as { id: string; ed: string | null; fin: string | null; serial?: number | null }[]);
    if (it) await sdb.event(player, "pull", null, it.id, { ed: it.ed ?? null, fin: it.fin ?? null, serial: it.serial ?? null });
    if (out.state?.pstats?.opened === 1) return await sdb.referralReward(player);
  } catch (e) {
    if (!(e instanceof SocialNotReady)) console.error("[reflex-cards] social après un booster", e);
  }
  return null;
}

/** ce que voit le joueur dans le social (onglet Amis) */
export async function socialView(sdb: SocialDb, s: GameState, player: string, ctx: Ctx) {
  const [trades, feed, packs, refWeek, today] = await Promise.all([
    sdb.trades(player), sdb.feed(player), sdb.friendPacks(player), sdb.referralWeek(player), sdb.tradesToday(player, ctx.today),
  ]);
  const tmax = tradeMax(s, ctx.today), pmax = pickMax(s, ctx.today);
  return {
    v: s.player.version,
    trades: trades.filter((t) => known(t.give, ctx.day) && known(t.get, ctx.day)),
    tradesLeft: Math.max(0, tmax - today), tradeMax: tmax,
    giftUsed: giftUsed(s, ctx.today),
    picksLeft: Math.max(0, pmax - picksUsed(s, ctx.today)), pickMax: pmax,
    packs: packs.map((p) => ({ code: p.code, id: p.id, at: p.at, cards: p.cards.filter((c) => CARD.get(c.id) && (CARD.get(c.id)!.fossil || isOut(CARD.get(c.id)!, ctx.day))) })),
    feed: feed.filter((f) => !f.card || !!CARD.get(f.card)),
    referral: { week: refWeek, max: REFERRALS_PER_WEEK },
    mine: tradeables(s.cards, ctx.day),
  };
}

/** message affiché après un geste social ; ok = false : refus */
export function socialMsg(a: string, res: string): { ok: boolean; msg: string } {
  const M: Record<string, { ok: boolean; msg: string }> = {
    sent: { ok: true, msg: "Proposition envoyée : votre ami doit l'accepter." },
    done: { ok: true, msg: a === "cadeau" ? "Cadeau envoyé !" : "Échange fait !" },
    declined: { ok: true, msg: "Proposition refusée." },
    cancelled: { ok: true, msg: "Proposition annulée." },
    set: { ok: true, msg: "" },
    removed: { ok: true, msg: "" },
    not_friend: { ok: false, msg: "Ce joueur n'est pas (ou plus) dans vos amis." },
    limit_day: { ok: false, msg: "Plus d'échange possible aujourd'hui : revenez demain (ou un de plus à la Boutique)." },
    limit_in: { ok: false, msg: "Votre ami a déjà 10 propositions en attente : réessayez plus tard." },
    dup: { ok: false, msg: "Proposition déjà envoyée : en attente de sa réponse." },
    no_give: { ok: false, msg: a === "echange-ok" ? "Votre ami n'a plus cette carte : échange annulé, rien n'a bougé." : "Vous n'avez plus cet exemplaire." },
    no_get: { ok: false, msg: a === "echange-ok" ? "Vous n'avez plus cet exemplaire : échange annulé, rien n'a bougé." : "Votre ami n'a plus cet exemplaire en double." },
    gone: { ok: false, msg: a === "reaction" ? "Cette activité n'est plus visible." : "Cette proposition n'existe plus." },
    already: { ok: false, msg: "Cadeau du jour déjà offert : revenez demain." },
    no_dup: { ok: false, msg: "Il vous faut un doublon ordinaire de cette carte." },
  };
  return M[res] ?? { ok: false, msg: "Réessayez dans un instant." };
}
