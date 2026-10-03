/**
 * /api/cartes/amis — les amis Reflex Cards (phase B2, 1re partie).
 *   GET  : mon code ami, mon jeton d'invitation (code signé), mes amis (aperçu de leur collection), demandes reçues et envoyées ;
 *   GET ?profil=CODE : le profil d'un ami ACCEPTÉ (pseudo, titre, Panthéon, toutes ses cartes) ; 404 sinon ;
 *   GET ?inv=JETON : qui invite (pseudo, code) si le lien est signé et encore valable — le jeu demande d'accepter ou refuser ;
 *   POST : { a: "demande", code } | { a: "repondre", code, ok } | { a: "retirer", code } | { a: "invitation", tok } → { ok, msg, list }.
 *   « invitation » = lien ouvert ET accepté : amis sans autre attente (l'hôte a partagé son lien) ; « demande » = code saisi : l'autre accepte.
 *   Plafond 100 amis/demandes des deux côtés ; 20 demandes par jour ; 30 gestes par minute (compteur partagé KV).
 * Compte Cryptoreflex obligatoire (jamais d'invité). Tant que la migration des amis n'est pas passée en base :
 * 503 { code: "not_ready" } et le jeu garde l'onglet Amis caché. Mutations inter-sites refusées par le middleware.
 */
import { NextResponse, type NextRequest } from "next/server";
import { isReflexCardsEnabled, reflexAccountsMode } from "@/lib/reflex-cards/flag";
import { NO_STORE, SessionError, errorJson, gameCtx, resolvePlayer, type Who } from "@/lib/reflex-cards/session";
import { supabaseGameDb } from "@/lib/reflex-cards/store";
import { FRIEND_CODE_RE, FRIEND_MSG, FriendsNotReady, befriendByInvite, friendProfile, friendsView, inviteInfo, inviteToken, inviteVersion, supabaseFriendsDb, type FriendsDb } from "@/lib/reflex-cards/friends";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";
import { createRateLimiter } from "@/lib/rate-limit";
import type { SupabaseClient } from "@supabase/supabase-js";
import { supabaseSocialDb } from "@/lib/reflex-cards/social";
import { applyReleases } from "@/lib/reflex-cards/releases";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

/* 30 gestes par minute et par partie : largement au-dessus d'un usage réel. Compteur PARTAGÉ entre serveurs (KV) : les
   demandes d'ami sont la seule porte ouverte au spam, et ce volume reste minuscule (Kev 03/10 : « sans brider le jeu »). */
const perPlayer = createRateLimiter({ limit: 30, windowMs: 60_000, key: "rc-amis", forceKv: true });

const notFound = () => new NextResponse("Page introuvable", { status: 404 });
const notReady = () => NextResponse.json({ ok: false, code: "not_ready", error: "Les amis arrivent très bientôt." }, { status: 503, headers: NO_STORE });

/** ce que voit le joueur : la vue des amis + son jeton d'invitation (version courante de son lien) */
async function view(fdb: FriendsDb, player: string) {
  const [v, p] = await Promise.all([friendsView(fdb, player), fdb.profile(player)]);
  return { ...v, invite: inviteToken(v.code, inviteVersion(p?.perso)) };
}

async function who(req: NextRequest): Promise<{ w: Who; fdb: FriendsDb; sb: SupabaseClient }> {
  await applyReleases(); // calendrier effectif des sorties (aperçus de collections)
  const sb = createSupabaseServiceRoleClient();
  if (!sb) throw new SessionError(503, "Service momentanément indisponible.");
  const w = await resolvePlayer(req, { create: false, createAccount: true, today: gameCtx().today, db: supabaseGameDb(sb) });
  if (w.account.guest || !w.player) throw new SessionError(401, "Connectez-vous pour ajouter des amis.", "login");
  return { w, fdb: supabaseFriendsDb(sb), sb };
}

export async function GET(req: NextRequest) {
  if (!isReflexCardsEnabled() || reflexAccountsMode() === "off") return notFound();
  let w: Who | null = null;
  try {
    const r = await who(req);
    w = r.w;
    /* ?inv=JETON : qui invite ? (le jeu demande « accepter / refuser » avant toute amitié) */
    const inv = req.nextUrl.searchParams.get("inv");
    if (inv !== null) {
      const info = await inviteInfo(r.fdb, inv.trim());
      if (!info) return w.finish(NextResponse.json({ ok: false, error: "Ce lien d'invitation n'est plus valide : demandez-en un nouveau à votre ami." }, { status: 404, headers: NO_STORE }));
      return w.finish(NextResponse.json({ ok: true, invitation: info }, { headers: NO_STORE }));
    }
    /* ?profil=CODE : le profil et toute la collection d'un ami accepté (Kev 03/10) */
    const profil = req.nextUrl.searchParams.get("profil");
    if (profil !== null) {
      const code = profil.toUpperCase().replace(/\s+/g, "");
      if (!FRIEND_CODE_RE.test(code)) return w.finish(NextResponse.json({ ok: false, error: "Un code ami fait 8 caractères (lettres et chiffres)." }, { status: 422, headers: NO_STORE }));
      const p = await friendProfile(r.fdb, w.player!, code);
      if (!p) return w.finish(NextResponse.json({ ok: false, error: "Ce joueur n'est pas (ou plus) dans vos amis." }, { status: 404, headers: NO_STORE }));
      return w.finish(NextResponse.json({ ok: true, profil: p }, { headers: NO_STORE }));
    }
    return w.finish(NextResponse.json({ ok: true, ...(await view(r.fdb, w.player!)) }, { headers: NO_STORE }));
  } catch (e) {
    if (e instanceof FriendsNotReady) return w ? w.finish(notReady()) : notReady();
    return w ? w.finish(errorJson(e)) : errorJson(e);
  }
}

export async function POST(req: NextRequest) {
  if (!isReflexCardsEnabled() || reflexAccountsMode() === "off") return notFound();
  if (!(req.headers.get("content-type") ?? "").includes("application/json")) return NextResponse.json({ ok: false, error: "JSON attendu." }, { status: 415, headers: NO_STORE });
  const raw = await req.text().catch(() => "");
  if (raw.length > 512) return NextResponse.json({ ok: false, error: "Demande trop longue." }, { status: 413, headers: NO_STORE });
  let body: Record<string, unknown>;
  try { body = JSON.parse(raw); if (!body || typeof body !== "object" || Array.isArray(body)) throw new Error("objet"); }
  catch { return NextResponse.json({ ok: false, error: "Demande illisible." }, { status: 400, headers: NO_STORE }); }
  const a = String(body.a ?? "");
  if (!["demande", "repondre", "retirer", "invitation"].includes(a)) return NextResponse.json({ ok: false, error: "Action inconnue." }, { status: 400, headers: NO_STORE });
  let code = String(body.code ?? "").toUpperCase().replace(/\s+/g, "");
  if (a !== "invitation" && !FRIEND_CODE_RE.test(code)) return NextResponse.json({ ok: false, error: "Un code ami fait 8 caractères (lettres et chiffres)." }, { status: 422, headers: NO_STORE });
  let w: Who | null = null;
  try {
    const r = await who(req);
    w = r.w;
    const rl = await perPlayer(w.player!);
    if (!rl.ok) throw new SessionError(429, "Doucement : réessayez dans une minute.");
    if (a === "invitation") {
      /* lien signé ET de la version courante de l'hôte (un lien révoqué ne vaut plus rien) */
      const info = await inviteInfo(r.fdb, String(body.tok ?? "").trim());
      if (!info) return w.finish(NextResponse.json({ ok: false, error: "Ce lien d'invitation n'est plus valide : demandez-en un nouveau à votre ami." }, { status: 422, headers: NO_STORE }));
      code = info.code;
    }
    await r.fdb.code(w.player!); // la partie qui demande a toujours un code (pour apparaître chez l'autre)
    const res = a === "demande" ? await r.fdb.request(w.player!, code)
      : a === "repondre" ? await r.fdb.answer(w.player!, code, body.ok === true)
      : a === "retirer" ? await r.fdb.remove(w.player!, code)
      : await befriendByInvite(r.fdb, w.player!, code);
    /* lien d'invitation accepté par un joueur qui n'a encore ouvert aucun booster : c'est un filleul (lot 3, parrainage) */
    if (a === "invitation" && res === "accepted") {
      const host = await r.fdb.host(code);
      if (host) await supabaseSocialDb(r.sb).referralNew(w.player!, host.pid).catch(() => {});
    }
    const m = FRIEND_MSG[res] ?? { ok: false, msg: "Réessayez dans un instant." };
    const list = await view(r.fdb, w.player!);
    let msg = m.msg;
    if (a === "invitation") {
      const f = list.friends.find((x) => x.code === code);
      if (res === "accepted" && f) msg = `Vous êtes maintenant amis avec ${f.pseudo} !`;
      else if (res === "self") msg = "C'est votre propre lien d'invitation.";
    }
    return w.finish(NextResponse.json(m.ok ? { ok: true, msg, list } : { ok: false, error: msg, list }, { status: m.ok ? 200 : 422, headers: NO_STORE }));
  } catch (e) {
    if (e instanceof FriendsNotReady) return w ? w.finish(notReady()) : notReady();
    return w ? w.finish(errorJson(e)) : errorJson(e);
  }
}
