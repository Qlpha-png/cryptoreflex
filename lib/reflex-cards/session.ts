/**
 * Reflex Cards — qui joue ? (phase B1)
 *
 * - Compte du site (session Supabase, e-mail confirmé) : sa partie, sur tous ses appareils.
 * - Sinon, invité : un jeton secret aléatoire (32 octets) dans un cookie httpOnly limité à /api/cartes ;
 *   la base ne garde que son empreinte SHA-256. La partie invitée est créée au premier geste de jeu.
 *   INVITÉS COUPÉS par défaut (Kev 02/10 : compte Cryptoreflex obligatoire avant d'ouvrir un booster) :
 *   seulement si REFLEX_CARDS_GUESTS=true. Sinon tout geste sans compte → 401 { code: "login" }.
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
const GUEST_MAX_AGE = 390 * 24 * 3600; // moins de 13 mois (recommandation CNIL sur la durée des traceurs)
const TOKEN_RE = /^[A-Za-z0-9_-]{43}$/; // 32 octets en base64url
export const hashToken = (t: string) => createHash("sha256").update(t).digest("hex");

/** parties sans compte autorisées ? (coupées par défaut : compte obligatoire) */
export const guestsAllowed = () => process.env.REFLEX_CARDS_GUESTS?.trim() === "true";
export const LOGIN_REQUIRED = "Créez votre compte Cryptoreflex gratuit (ou connectez-vous) pour ouvrir vos boosters et garder vos cartes.";

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
  constructor(public status: number, message: string, public code?: string) { super(message); }
}

/** create : crée la partie (invité ou compte) ; createAccount : crée/retrouve la partie d'un COMPTE seulement (lecture d'état) */
export async function resolvePlayer(req: NextRequest, o: { create: boolean; createAccount?: boolean; today: string; db?: GameDb }): Promise<Who> {
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
  let expired = false;
  if (rh && req.cookies.getAll().some((c) => c.name.startsWith("sb-"))) {
    const { data, error } = await rh.supabase.auth.getUser();
    /* service de connexion injoignable : on ne traite PAS le joueur en visiteur (album vide) → 503, le jeu propose « Réessayer » */
    if (error && (error.name === "AuthRetryableFetchError" || (error.status ?? 0) >= 500)) throw new SessionError(503, "Connexion à votre compte momentanément impossible : réessayez dans un instant.");
    const u = data?.user;
    if (u && !u.is_anonymous && u.email_confirmed_at) user = { id: u.id, email: u.email ?? null };
    else {
      /* cookie de session présent mais aucun compte valide : session expirée ou renouvellement refusé. Journalisé sans donnée
         personnelle pour comprendre les « albums vides » (02/10) ; le jeu propose alors de se reconnecter. */
      expired = true;
      console.warn("[reflex-cards] session illisible", JSON.stringify({ name: error?.name ?? null, status: error?.status ?? null, code: (error as { code?: string } | null)?.code ?? null, user: !!u, confirmed: !!u?.email_confirmed_at }));
    }
  }
  const raw = req.cookies.get(GUEST_COOKIE)?.value ?? "";
  const hash = TOKEN_RE.test(raw) ? hashToken(raw) : null;

  let player: string | null = null;
  if (user) {
    if (hash) player = await db.claim(hash, user.id);
    if (!player) player = o.create || o.createAccount ? await db.account(user.id, o.today) : await db.findAccount(user.id);
  } else {
    if (hash && guestsAllowed()) player = await db.findGuest(hash);
    if (!player && o.create) {
      if (!guestsAllowed()) throw new SessionError(401, LOGIN_REQUIRED, "login");
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
    account: { guest: !user, email: user?.email ?? null, ...(expired && !user ? { expired: true } : {}) },
    finish(res) {
      rh?.applyCookies(res);
      if (setGuest) res.cookies.set(GUEST_COOKIE, setGuest, { httpOnly: true, secure: https, sameSite: "lax", path: GUEST_PATH, maxAge: GUEST_MAX_AGE });
      else if (clearGuest) res.cookies.set(GUEST_COOKIE, "", { httpOnly: true, secure: https, sameSite: "lax", path: GUEST_PATH, maxAge: 0 });
      return res;
    },
  };
}

/** minutes écoulées depuis minuit à Paris */
const parisMinutes = (at: Date) => {
  const p = Object.fromEntries(new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Paris", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(at).map((x) => [x.type, x.value]));
  return Number(p.hour) * 60 + Number(p.minute);
};
/** jour de jeu : celui du serveur ; la veille seulement dans les 30 minutes après minuit (page chargée avant minuit, qui ne
 *  connaît pas encore les sorties du jour). Au-delà : jour du serveur (sinon on pourrait alterner deux jeux d'offres du jour). */
export function gameCtx(clientDay?: unknown, at: Date = new Date()): Ctx {
  const sd = seasonDay(at), cd = Number(clientDay);
  const yesterdayOk = cd === sd - 1 && cd >= 1 && parisMinutes(at) < 30;
  return { now: at.getTime(), today: parisToday(at), day: Number.isInteger(cd) && (cd === sd || yesterdayOk) ? cd : sd };
}

/** réponse d'erreur : refus de règle du jeu (422), session (401/429/503), panne (500, sans détail) */
export function errorJson(e: unknown): NextResponse {
  if (e instanceof GameError) return NextResponse.json({ ok: false, code: e.code, error: e.message }, { status: 422, headers: NO_STORE });
  if (e instanceof SessionError) return NextResponse.json({ ok: false, error: e.message, ...(e.code ? { code: e.code } : {}) }, { status: e.status, headers: NO_STORE });
  console.error("[reflex-cards] erreur serveur", e);
  return NextResponse.json({ ok: false, error: "Service momentanément indisponible, réessayez." }, { status: 500, headers: NO_STORE });
}
export const NO_STORE = { "Cache-Control": "no-store" };
