/**
 * /api/cartes/social — le social entre amis Reflex Cards (lots 1 et 3, Kev 03/10/2026).
 *   GET : mes échanges (reçus, envoyés, récents), échanges et pioches restants, cadeau du jour, derniers boosters de mes amis,
 *         fil d'activité, parrainages de la semaine, mes exemplaires échangeables ;
 *   GET ?dups=CODE : les exemplaires qu'un ami ACCEPTÉ peut céder (de quoi lui proposer un échange) ; 404 sinon ;
 *   POST : { a: "echange", code, give, get, fin, gs?, ts? } | { a: "echange-ok" | "echange-non" | "echange-annuler", id }
 *        | { a: "cadeau", code, id } | { a: "pioche", code, draw } | { a: "reaction", ev, rx } → { ok, msg, social, state? }.
 * Compte Cryptoreflex obligatoire (jamais d'invité). 30 gestes par minute (compteur partagé KV). Tant que la migration B4
 * n'est pas passée en base : 503 { code: "not_ready" } et le jeu garde le social caché. Mutations inter-sites refusées par le middleware.
 */
import { NextResponse, type NextRequest } from "next/server";
import { isReflexCardsEnabled, reflexAccountsMode } from "@/lib/reflex-cards/flag";
import { NO_STORE, SessionError, errorJson, gameCtx, resolvePlayer, type Who } from "@/lib/reflex-cards/session";
import { loadGame, runAction, supabaseGameDb } from "@/lib/reflex-cards/store";
import { FRIEND_CODE_RE } from "@/lib/reflex-cards/friends";
import { SocialNotReady, checkTrade, friendTradeables, planPick, socialMsg, socialView, supabaseSocialDb, tradeMax, type SocialDb } from "@/lib/reflex-cards/social";
import { copyOk, GameError } from "@/lib/reflex-cards/engine";
import { toClient } from "@/lib/reflex-cards/actions";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";
import { createRateLimiter } from "@/lib/rate-limit";
import { applyReleases } from "@/lib/reflex-cards/releases";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

const perPlayer = createRateLimiter({ limit: 30, windowMs: 60_000, key: "rc-social", forceKv: true });
const ACTIONS = new Set(["echange", "echange-ok", "echange-non", "echange-annuler", "cadeau", "pioche", "reaction"]);
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const CARD_RE = /^[a-z0-9-]{1,80}$/;

const notFound = () => new NextResponse("Page introuvable", { status: 404 });
const notReady = () => NextResponse.json({ ok: false, code: "not_ready", error: "Les échanges entre amis arrivent très bientôt." }, { status: 503, headers: NO_STORE });
const refuse = (status: number, error: string) => NextResponse.json({ ok: false, error }, { status, headers: NO_STORE });

async function who(req: NextRequest): Promise<{ w: Who; sdb: SocialDb }> {
  await applyReleases();
  const sb = createSupabaseServiceRoleClient();
  if (!sb) throw new SessionError(503, "Service momentanément indisponible.");
  const w = await resolvePlayer(req, { create: false, createAccount: true, today: gameCtx().today, db: supabaseGameDb(sb) });
  if (w.account.guest || !w.player) throw new SessionError(401, "Connectez-vous pour échanger avec vos amis.", "login");
  return { w, sdb: supabaseSocialDb(sb) };
}

export async function GET(req: NextRequest) {
  if (!isReflexCardsEnabled() || reflexAccountsMode() === "off") return notFound();
  let w: Who | null = null;
  try {
    const r = await who(req);
    w = r.w;
    const ctx = gameCtx();
    const dups = req.nextUrl.searchParams.get("dups");
    if (dups !== null) {
      const code = dups.toUpperCase().replace(/\s+/g, "");
      if (!FRIEND_CODE_RE.test(code)) return w.finish(refuse(422, "Un code ami fait 8 caractères (lettres et chiffres)."));
      const rows = await r.sdb.friendDups(w.player!, code);
      if (!rows) return w.finish(refuse(404, "Ce joueur n'est pas (ou plus) dans vos amis."));
      return w.finish(NextResponse.json({ ok: true, code, dups: friendTradeables(rows, ctx.day) }, { headers: NO_STORE }));
    }
    const s = await loadGame(w.db, w.player!, ctx);
    return w.finish(NextResponse.json({ ok: true, ...(await socialView(r.sdb, s, w.player!, ctx)) }, { headers: NO_STORE }));
  } catch (e) {
    if (e instanceof SocialNotReady) return w ? w.finish(notReady()) : notReady();
    return w ? w.finish(errorJson(e)) : errorJson(e);
  }
}

export async function POST(req: NextRequest) {
  if (!isReflexCardsEnabled() || reflexAccountsMode() === "off") return notFound();
  if (!(req.headers.get("content-type") ?? "").includes("application/json")) return refuse(415, "JSON attendu.");
  const raw = await req.text().catch(() => "");
  if (raw.length > 512) return refuse(413, "Demande trop longue.");
  let b: Record<string, unknown>;
  try { b = JSON.parse(raw); if (!b || typeof b !== "object" || Array.isArray(b)) throw new Error("objet"); }
  catch { return refuse(400, "Demande illisible."); }
  const a = String(b.a ?? "");
  if (!ACTIONS.has(a)) return refuse(400, "Action inconnue.");
  const code = String(b.code ?? "").toUpperCase().replace(/\s+/g, "");
  if (["echange", "cadeau", "pioche"].includes(a) && !FRIEND_CODE_RE.test(code)) return refuse(422, "Un code ami fait 8 caractères (lettres et chiffres).");
  if (a.startsWith("echange-") && !UUID_RE.test(String(b.id ?? ""))) return refuse(422, "Proposition inconnue.");
  if (a === "cadeau" && !CARD_RE.test(String(b.id ?? ""))) return refuse(422, "Carte inconnue.");
  let w: Who | null = null;
  try {
    const r = await who(req);
    w = r.w;
    const rl = await perPlayer(w.player!);
    if (!rl.ok) throw new SessionError(429, "Doucement : réessayez dans une minute.");
    const ctx = gameCtx();
    const me = w.player!, db = w.db, sdb = r.sdb, account = w.account;
    let s = await loadGame(db, me, ctx);
    let res = "", cardsMoved = false;
    switch (a) {
      case "echange": res = await sdb.propose(me, code, checkTrade(s, b, ctx), ctx.today, tradeMax(s, ctx.today)); break;
      case "echange-ok": res = await sdb.answer(me, String(b.id), true, ctx.today, tradeMax(s, ctx.today)); cardsMoved = res === "done"; break;
      case "echange-non": res = await sdb.answer(me, String(b.id), false, ctx.today, tradeMax(s, ctx.today)); break;
      case "echange-annuler": res = await sdb.cancel(me, String(b.id)); break;
      case "cadeau": {
        if (!copyOk(s.cards.get(String(b.id)), "ord", null)) throw new GameError("no_dup", "Il vous faut un doublon ordinaire de cette carte : l'exemplaire de votre album ne part jamais.");
        res = await sdb.gift(me, code, String(b.id), ctx.today);
        cardsMoved = res === "done";
        break;
      }
      case "pioche": {
        const draw = await sdb.friendDraw(me, code);
        if (!draw) return w.finish(refuse(404, "Pas encore de booster ouvert chez cet ami."));
        /* l'ami vient d'ouvrir un autre booster : on montre d'abord le nouveau (la pioche se fait dans ce qu'on a vu) */
        if (b.draw != null && Number(b.draw) !== Number(draw.id)) return w.finish(NextResponse.json({ ok: false, code: "new_draw", error: "Votre ami vient d'ouvrir un nouveau booster : le voici.", draw }, { status: 409, headers: NO_STORE }));
        const out = await runAction(db, me, "pioche", {}, ctx, account, planPick(draw));
        await sdb.event(me, "pick", code, String(out.data?.id ?? ""), {}).catch(() => {});
        return w.finish(NextResponse.json({ ok: true, data: out.data, state: out.state, social: await socialView(sdb, await loadGame(db, me, ctx), me, ctx) }, { headers: NO_STORE }));
      }
      case "reaction": {
        const ev = Number(b.ev), rx = Number(b.rx);
        if (!Number.isInteger(ev) || ev < 1 || !Number.isInteger(rx) || rx < 0 || rx > 3) return w.finish(refuse(422, "Réaction inconnue."));
        res = await sdb.react(me, ev, rx);
        break;
      }
    }
    const m = socialMsg(a, res);
    if (cardsMoved) s = await loadGame(db, me, ctx);
    const body = { ...(m.ok ? { ok: true, msg: m.msg } : { ok: false, error: m.msg }), social: await socialView(sdb, s, me, ctx), ...(cardsMoved ? { state: toClient(s, ctx, account) } : {}) };
    return w.finish(NextResponse.json(body, { status: m.ok ? 200 : 422, headers: NO_STORE }));
  } catch (e) {
    if (e instanceof SocialNotReady) return w ? w.finish(notReady()) : notReady();
    return w ? w.finish(errorJson(e)) : errorJson(e);
  }
}
