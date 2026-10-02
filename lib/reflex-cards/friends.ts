/**
 * Reflex Cards — amis (phase B2, 1re partie, plan validé par Kev le 02/10/2026).
 * Code ami, demandes (accord de l'autre joueur), liste avec un aperçu de la collection de chaque ami.
 * La base n'est touchée qu'ici, par les fonctions SQL de supabase/migrations/20261002_reflex_cards_b2_amis.sql
 * (service role). Le navigateur ne voit jamais l'identifiant de partie d'un autre joueur : seulement son code ami.
 */
import "server-only";
import { createHash, createHmac, timingSafeEqual } from "node:crypto";
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
  /** fiche publique d'une partie (pseudo, perso, boosters ouverts, premier jour) — appelée seulement pour un ami accepté */
  profile(pid: string): Promise<{ pseudo: string; perso: Record<string, unknown> | null; opened: number; first_day: string } | null>;
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
    async profile(pid) {
      const { data, error } = await sb.from("rc_players").select("pseudo,perso,opened,first_day").eq("player_id", pid).maybeSingle();
      if (error) { if (missing(error)) throw new FriendsNotReady(error.message); throw new Error(error.message); }
      return (data as { pseudo: string; perso: Record<string, unknown> | null; opened: number; first_day: string } | null) ?? null;
    },
  };
}

/** le profil d'un ami : son Panthéon (ou ses plus belles cartes), toute sa collection — pour la visiter sans tourner de pages */
export interface FriendProfile { code: string; pseudo: string; since: string; title: string | null; pantheon: string[]; opened: number; firstDay: string; cards: string[] }
/** null : ce joueur n'est pas (ou plus) un ami accepté — on ne révèle rien */
export async function friendProfile(db: FriendsDb, me: string, code: string): Promise<FriendProfile | null> {
  const f = (await db.list(me)).find((r) => r.code === code && r.status === "accepted");
  if (!f) return null;
  const [p, all] = await Promise.all([db.profile(f.pid), db.cards(me)]);
  if (!p) return null;
  const cards = all.filter((c) => c.pid === f.pid && CARD.get(c.card_id)).map((c) => c.card_id);
  const own = new Set(cards), perso = p.perso ?? {};
  /* clés du Panthéon : « édition|carte » (itemKey du jeu) ; seules les cartes qu'il possède encore comptent */
  const pantheon = (Array.isArray(perso.pantheon) ? perso.pantheon : []).map(String).filter((k) => own.has(k.split("|")[1] ?? "")).slice(0, 3);
  return { code, pseudo: p.pseudo, since: f.since, title: typeof perso.title === "string" ? perso.title : null, pantheon, opened: p.opened, firstDay: String(p.first_day).slice(0, 10), cards };
}

/* Lien d'invitation (Kev 02/10) = le code ami SIGNÉ. L'ouvrir rend amis tout de suite : c'est le joueur qui a partagé
   son lien qui donne son accord. Le code seul, saisi à la main, reste une demande que l'autre accepte. La signature
   empêche de transformer un code aperçu chez quelqu'un en « invitation ». Clé : REFLEX_CARDS_INVITE_SECRET, sinon
   dérivée (SHA-256) de la clé service, qui ne quitte jamais le serveur. */
export const INVITE_RE = /^[A-HJ-NP-Z2-9]{8}\.[a-f0-9]{16}$/;
const inviteKey = (): Buffer | null => {
  const s = process.env.REFLEX_CARDS_INVITE_SECRET?.trim() || process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  return s ? createHash("sha256").update("rc-invite|" + s).digest() : null;
};
/** jeton d'invitation d'un code ami (null : aucune clé serveur, le jeu retombe sur le lien à code simple) */
export function inviteToken(code: string): string | null {
  const k = inviteKey();
  if (!k || !FRIEND_CODE_RE.test(code)) return null;
  return code + "." + createHmac("sha256", k).update(code).digest("hex").slice(0, 16);
}
/** le code ami d'un jeton valide, sinon null */
export function inviteCode(tok: string): string | null {
  if (!INVITE_RE.test(tok)) return null;
  const code = tok.slice(0, 8), want = inviteToken(code);
  if (!want) return null;
  const a = Buffer.from(tok), b = Buffer.from(want);
  return a.length === b.length && timingSafeEqual(a, b) ? code : null;
}
/** arrivée par un lien d'invitation : la demande part, puis elle est acceptée au nom de l'inviteur (il a partagé son lien).
 *  Renvoie 'accepted', ou le refus de la demande (already, self, unknown, limites, gone). */
export async function befriendByInvite(db: FriendsDb, me: string, code: string): Promise<string> {
  const res = await db.request(me, code);
  if (res !== "sent" && res !== "pending") return res; // accepted (demande croisée), already, self, unknown, limit_*
  const myCode = await db.code(me);
  if (!myCode) return "gone";
  const host = (await db.list(me)).find((r) => r.code === code && r.status === "pending" && r.outgoing);
  if (!host) return "gone";
  return db.answer(host.pid, myCode, true);
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
