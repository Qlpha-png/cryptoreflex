/**
 * Reflex Cards — qui joue ? (phase B1)
 *
 * - Compte du site (session Supabase, e-mail confirmé) : sa partie, sur tous ses appareils.
 * - Sinon, invité : un jeton secret aléatoire (32 octets) dans un cookie httpOnly limité à /api/cartes ;
 *   la base ne garde que son empreinte SHA-256. La partie invitée est créée au premier geste de jeu.
 * - Invité qui se connecte ou s'inscrit dans le même navigateur : sa partie se rattache au compte
 *   (si le compte n'en a pas encore), et le jeton est oublié.
 * Aucun compte « anonyme » Supabase : les inscriptions publiques restent fermées (audit 2026-10-01).
 */
import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { createRouteHandlerClient } from "@/lib/supabase/route-handler";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";
import { createRateLimiter } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/ip";
import { supabaseGameDb, type GameDb } from "./store";
import type { Account, Ctx } from "./actions";
import { GameError } from "./engine";
import { parisToday, seasonDay } from "./season";

export const GUEST_COOKIE = "rc_g";
const GUEST_PATH = "/api/cartes";
const GUEST_MAX_AGE = 400 * 24 * 3600; // plafond des navigateurs (Chrome : 400 jours)
const TOKEN_RE = /^[A-Za-z0-9_-]{43}$/; // 32 octets en base64url
export const hashToken = (t: string) => createHash("sha256").update(t).digest("hex");

/* nouvelles parties invitées : 10 par heure et par adresse IP */
const newGuestLimit = createRateLimiter({ limit: 10, windowMs: 3_600_000, key: "rc-guest" });

export interface Who {
  db: GameDb;
  player: string | null;
  account: Account;
  /** applique sur la réponse les cookies de session rafraîchis et le cookie invité */
  finish<T extends NextResponse>(res: T): T;
}
export class SessionError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

export async function resolvePlayer(req: NextRequest, o: { create: boolean; today: string; db?: GameDb }): Promise<Who> {
  let db = o.db;
  if (!db) {
    const sb = createSupabaseServiceRoleClient();
    if (!sb) throw new SessionError(503, "Service momentanément indisponible.");
    db = supabaseGameDb(sb);
  }
  const rh = createRouteHandlerClient(req);
  const https = req.headers.get("x-forwarded-proto") === "https" || req.url.startsWith("https://");
  let setGuest: string | null = null;

  /* compte du site : seulement s'il y a un cookie de session Supabase (sinon pas d'appel réseau) */
  let user: { id: string; email: string | null } | null = null;
  if (rh && req.cookies.getAll().some((c) => c.name.startsWith("sb-"))) {
    const { data } = await rh.supabase.auth.getUser();
    const u = data?.user;
    if (u && !u.is_anonymous && u.email_confirmed_at) user = { id: u.id, email: u.email ?? null };
  }
  const raw = req.cookies.get(GUEST_COOKIE)?.value ?? "";
  const hash = TOKEN_RE.test(raw) ? hashToken(raw) : null;

  let player: string | null = null;
  if (user) {
    if (hash) player = await db.claim(hash, user.id);
    if (!player) player = o.create ? await db.account(user.id, o.today) : await db.findAccount(user.id);
  } else {
    if (hash) player = await db.findGuest(hash);
    if (!player && o.create) {
      const rl = await newGuestLimit(getClientIp(req));
      if (!rl.ok) throw new SessionError(429, "Trop de nouvelles parties depuis cette connexion : réessayez dans une heure.");
      const token = randomBytes(32).toString("base64url");
      player = await db.createGuest(hashToken(token), o.today);
      setGuest = token;
    }
  }
  /* jeton invité devenu inutile (partie rattachée, ou jeton inconnu) : on l'efface */
  const clearGuest = !!raw && !setGuest && (!hash || (user !== null && !(await db.findGuest(hash))) || (!user && !player));

  return {
    db,
    player,
    account: { guest: !user, email: user?.email ?? null },
    finish(res) {
      rh?.applyCookies(res);
      if (setGuest) res.cookies.set(GUEST_COOKIE, setGuest, { httpOnly: true, secure: https, sameSite: "lax", path: GUEST_PATH, maxAge: GUEST_MAX_AGE });
      else if (clearGuest) res.cookies.set(GUEST_COOKIE, "", { httpOnly: true, secure: https, sameSite: "lax", path: GUEST_PATH, maxAge: 0 });
      return res;
    },
  };
}

/** jour de jeu : celui du serveur, ou la veille si la page du joueur date d'avant minuit (elle ne connaît pas encore les sorties du jour) */
export function gameCtx(clientDay?: unknown, at: Date = new Date()): Ctx {
  const sd = seasonDay(at), cd = Number(clientDay);
  return { now: at.getTime(), today: parisToday(at), day: Number.isInteger(cd) && cd >= 1 && cd >= sd - 1 && cd <= sd ? cd : sd };
}

/** réponse d'erreur : refus de règle du jeu (422), session (401/429/503), panne (500, sans détail) */
export function errorJson(e: unknown): NextResponse {
  if (e instanceof GameError) return NextResponse.json({ ok: false, code: e.code, error: e.message }, { status: 422, headers: NO_STORE });
  if (e instanceof SessionError) return NextResponse.json({ ok: false, error: e.message }, { status: e.status, headers: NO_STORE });
  console.error("[reflex-cards] erreur serveur", e);
  return NextResponse.json({ ok: false, error: "Service momentanément indisponible, réessayez." }, { status: 500, headers: NO_STORE });
}
export const NO_STORE = { "Cache-Control": "no-store" };
