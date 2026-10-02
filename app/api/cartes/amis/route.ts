/**
 * /api/cartes/amis — les amis Reflex Cards (phase B2, 1re partie).
 *   GET  : mon code ami, mes amis (aperçu de leur collection), demandes reçues et envoyées ;
 *   POST : { a: "demande", code } | { a: "repondre", code, ok } | { a: "retirer", code } → { ok, msg, list }.
 * Compte Cryptoreflex obligatoire (jamais d'invité). Tant que la migration des amis n'est pas passée en base :
 * 503 { code: "not_ready" } et le jeu garde l'onglet Amis caché. Mutations inter-sites refusées par le middleware.
 */
import { NextResponse, type NextRequest } from "next/server";
import { isReflexCardsEnabled, reflexAccountsMode } from "@/lib/reflex-cards/flag";
import { NO_STORE, SessionError, errorJson, gameCtx, resolvePlayer, type Who } from "@/lib/reflex-cards/session";
import { supabaseGameDb } from "@/lib/reflex-cards/store";
import { FRIEND_CODE_RE, FRIEND_MSG, FriendsNotReady, friendsView, supabaseFriendsDb, type FriendsDb } from "@/lib/reflex-cards/friends";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";
import { createRateLimiter } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* 30 gestes par minute et par partie : largement au-dessus d'un usage réel */
const perPlayer = createRateLimiter({ limit: 30, windowMs: 60_000, key: "rc-amis" });

const notFound = () => new NextResponse("Page introuvable", { status: 404 });
const notReady = () => NextResponse.json({ ok: false, code: "not_ready", error: "Les amis arrivent très bientôt." }, { status: 503, headers: NO_STORE });

async function who(req: NextRequest): Promise<{ w: Who; fdb: FriendsDb }> {
  const sb = createSupabaseServiceRoleClient();
  if (!sb) throw new SessionError(503, "Service momentanément indisponible.");
  const w = await resolvePlayer(req, { create: false, createAccount: true, today: gameCtx().today, db: supabaseGameDb(sb) });
  if (w.account.guest || !w.player) throw new SessionError(401, "Connectez-vous pour ajouter des amis.", "login");
  return { w, fdb: supabaseFriendsDb(sb) };
}

export async function GET(req: NextRequest) {
  if (!isReflexCardsEnabled() || reflexAccountsMode() === "off") return notFound();
  let w: Who | null = null;
  try {
    const r = await who(req);
    w = r.w;
    return w.finish(NextResponse.json({ ok: true, ...(await friendsView(r.fdb, w.player!)) }, { headers: NO_STORE }));
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
  const a = String(body.a ?? ""), code = String(body.code ?? "").toUpperCase().replace(/\s+/g, "");
  if (!["demande", "repondre", "retirer"].includes(a)) return NextResponse.json({ ok: false, error: "Action inconnue." }, { status: 400, headers: NO_STORE });
  if (!FRIEND_CODE_RE.test(code)) return NextResponse.json({ ok: false, error: "Un code ami fait 8 caractères (lettres et chiffres)." }, { status: 422, headers: NO_STORE });
  let w: Who | null = null;
  try {
    const r = await who(req);
    w = r.w;
    const rl = await perPlayer(w.player!);
    if (!rl.ok) throw new SessionError(429, "Doucement : réessayez dans une minute.");
    await r.fdb.code(w.player!); // la partie qui demande a toujours un code (pour apparaître chez l'autre)
    const res = a === "demande" ? await r.fdb.request(w.player!, code)
      : a === "repondre" ? await r.fdb.answer(w.player!, code, body.ok === true)
      : await r.fdb.remove(w.player!, code);
    const m = FRIEND_MSG[res] ?? { ok: false, msg: "Réessayez dans un instant." };
    const list = await friendsView(r.fdb, w.player!);
    return w.finish(NextResponse.json(m.ok ? { ok: true, msg: m.msg, list } : { ok: false, error: m.msg, list }, { status: m.ok ? 200 : 422, headers: NO_STORE }));
  } catch (e) {
    if (e instanceof FriendsNotReady) return w ? w.finish(notReady()) : notReady();
    return w ? w.finish(errorJson(e)) : errorJson(e);
  }
}
