/**
 * Reflex Cards — amis (phase B2, 1re partie, plan validé par Kev le 02/10/2026).
 * Code ami, demandes (accord de l'autre joueur), liste avec un aperçu de la collection de chaque ami.
 * La base n'est touchée qu'ici, par les fonctions SQL de supabase/migrations/20261002_reflex_cards_b2_amis.sql
 * (service role). Le navigateur ne voit jamais l'identifiant de partie d'un autre joueur : seulement son code ami.
 */
import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { CARD } from "./engine";

export interface FriendRow { pid: string; code: string; pseudo: string; status: string; outgoing: boolean; since: string }
export interface FriendsDb {
  code(player: string): Promise<string | null>;
  request(player: string, code: string): Promise<string>;
  answer(player: string, code: string, accept: boolean): Promise<string>;
  remove(player: string, code: string): Promise<string>;
  list(player: string): Promise<FriendRow[]>;
  cards(player: string): Promise<{ pid: string; card_id: string }[]>;
}
/** la migration des amis n'est pas encore passée en base : l'onglet Amis reste caché */
export class FriendsNotReady extends Error {}
export const FRIEND_CODE_RE = /^[A-HJ-NP-Z2-9]{8}$/;

const missing = (e: { code?: string; message?: string } | null) =>
  !!e && (e.code === "PGRST202" || e.code === "42883" || e.code === "42P01" || e.code === "42703" || /rc_friend|friend_code/.test(e.message ?? "") && /exist|schema cache|find/i.test(e.message ?? ""));

export function supabaseFriendsDb(sb: SupabaseClient): FriendsDb {
  const rpc = async <T>(fn: string, args: Record<string, unknown>): Promise<T> => {
    const { data, error } = await sb.rpc(fn, args);
    if (error) { if (missing(error)) throw new FriendsNotReady(error.message); throw new Error(error.message); }
    return data as T;
  };
  return {
    code: (p) => rpc<string | null>("rc_friend_code", { p_player: p }),
    request: (p, c) => rpc<string>("rc_friend_request", { p_from: p, p_code: c }),
    answer: (p, c, ok) => rpc<string>("rc_friend_answer", { p_me: p, p_code: c, p_accept: ok }),
    remove: (p, c) => rpc<string>("rc_friend_remove", { p_me: p, p_code: c }),
    list: (p) => rpc<FriendRow[]>("rc_friend_list", { p_me: p }),
    cards: (p) => rpc<{ pid: string; card_id: string }[]>("rc_friend_cards", { p_me: p }),
  };
}

const RANK: Record<string, number> = { C: 0, PC: 1, R: 2, SR: 3, UR: 4, L: 5 };

export interface FriendsView {
  code: string;
  friends: { code: string; pseudo: string; since: string; own: number; L: number; UR: number; best: string[] }[];
  incoming: { code: string; pseudo: string }[];
  outgoing: { code: string; pseudo: string }[];
}

/** ce que voit le joueur dans l'onglet Amis */
export async function friendsView(db: FriendsDb, player: string): Promise<FriendsView> {
  const code = await db.code(player);
  if (!code) throw new Error("rc_code");
  const rows = await db.list(player);
  const acc = rows.filter((r) => r.status === "accepted");
  const cards = acc.length ? await db.cards(player) : [];
  const byPid = new Map<string, string[]>();
  for (const c of cards) (byPid.get(c.pid) ?? byPid.set(c.pid, []).get(c.pid)!).push(c.card_id);
  const friends = acc.map((r) => {
    const ids = (byPid.get(r.pid) ?? []).filter((id) => CARD.get(id));
    const rar = (id: string) => CARD.get(id)!.r as string;
    const best = [...ids].sort((a, b) => RANK[rar(b)] - RANK[rar(a)] || (CARD.get(a)!.noto ?? 0) - (CARD.get(b)!.noto ?? 0)).slice(0, 3);
    return { code: r.code, pseudo: r.pseudo, since: r.since, own: ids.length, L: ids.filter((id) => rar(id) === "L").length, UR: ids.filter((id) => rar(id) === "UR").length, best };
  });
  return {
    code,
    friends,
    incoming: rows.filter((r) => r.status === "pending" && !r.outgoing).map((r) => ({ code: r.code, pseudo: r.pseudo })),
    outgoing: rows.filter((r) => r.status === "pending" && r.outgoing).map((r) => ({ code: r.code, pseudo: r.pseudo })),
  };
}

/** message affiché après une demande / réponse / retrait ; null = refus (message d'erreur) */
export const FRIEND_MSG: Record<string, { ok: boolean; msg: string }> = {
  sent: { ok: true, msg: "Demande envoyée : votre ami doit l'accepter." },
  accepted: { ok: true, msg: "Vous êtes maintenant amis !" },
  declined: { ok: true, msg: "Demande refusée." },
  removed: { ok: true, msg: "C'est fait." },
  pending: { ok: false, msg: "Demande déjà envoyée : en attente de sa réponse." },
  already: { ok: false, msg: "Vous êtes déjà amis." },
  self: { ok: false, msg: "C'est votre propre code ami." },
  unknown: { ok: false, msg: "Aucun joueur avec ce code ami." },
  limit_day: { ok: false, msg: "20 demandes par jour au maximum : réessayez demain." },
  limit_total: { ok: false, msg: "100 amis ou demandes au maximum." },
  gone: { ok: false, msg: "Cette demande n'existe plus." },
};
