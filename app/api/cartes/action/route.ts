/**
 * POST /api/cartes/action { a: action, jour: N, ...paramètres } — un geste de jeu, décidé par le serveur.
 * Le serveur relit la partie, applique les règles (lib/reflex-cards/actions.ts) puis écrit d'un seul coup
 * (rc_apply) ; il renvoie la partie à jour. La partie invitée est créée au premier geste.
 * Origine contrôlée par le middleware (mutations inter-sites refusées), corps JSON obligatoire.
 */
import { NextResponse, type NextRequest } from "next/server";
import { isReflexCardsEnabled, reflexAccountsMode } from "@/lib/reflex-cards/flag";
import { NO_STORE, SessionError, errorJson, gameCtx, resolvePlayer, type Who } from "@/lib/reflex-cards/session";
import { loadGame, runAction } from "@/lib/reflex-cards/store";
import { toClient } from "@/lib/reflex-cards/actions";
import { afterOpen, supabaseSocialDb } from "@/lib/reflex-cards/social";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";
import { applyReleases } from "@/lib/reflex-cards/releases";
import { createRateLimiter } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

const ACTIONS = new Set(["ouvrir", "mission", "semaine", "defi", "collection", "quiz", "fiche", "fabriquer", "acheter", "equiper", "service", "colporteur", "titre", "pantheon", "pseudo", "quiz-jour", "lien-ami", "accueil"]);
/* 120 gestes par minute et par partie : largement au-dessus d'un joueur réel */
const perPlayer = createRateLimiter({ limit: 120, windowMs: 60_000, key: "rc-action" });

export async function POST(req: NextRequest) {
  if (!isReflexCardsEnabled() || reflexAccountsMode() === "off") return new NextResponse("Page introuvable", { status: 404 });
  if (!(req.headers.get("content-type") ?? "").includes("application/json")) return NextResponse.json({ ok: false, error: "JSON attendu." }, { status: 415, headers: NO_STORE });
  const tooLong = () => NextResponse.json({ ok: false, error: "Demande trop longue." }, { status: 413, headers: NO_STORE });
  if (Number(req.headers.get("content-length") ?? 0) > 4096) return tooLong();
  const raw = await req.text().catch(() => "");
  if (raw.length > 4096) return tooLong();
  let body: Record<string, unknown>;
  try {
    body = JSON.parse(raw);
    if (!body || typeof body !== "object" || Array.isArray(body)) throw new Error("objet");
  } catch {
    return NextResponse.json({ ok: false, error: "Demande illisible." }, { status: 400, headers: NO_STORE });
  }
  const a = String(body.a ?? "");
  if (!ACTIONS.has(a)) return NextResponse.json({ ok: false, error: "Action inconnue." }, { status: 400, headers: NO_STORE });
  const ctx = gameCtx(body.jour);
  if (ctx.day < 1) return new NextResponse("Page introuvable", { status: 404 });
  /* page d'un jour passé (ouverte avant minuit au-delà de la tolérance, ou servie par le cache) : refus AVANT tout geste.
     Sinon le booster serait tiré dans les cartes du jour, inconnues de la page : consommé, mais jamais révélé. Le jeu se recharge. */
  const cd = Number(body.jour);
  if (Number.isInteger(cd) && cd !== ctx.day) return NextResponse.json({ ok: false, code: "reload", error: "De nouvelles cartes sont sorties : la page se recharge." }, { status: 409, headers: NO_STORE });
  let who: Who | null = null;
  try {
    await applyReleases(); // calendrier effectif des sorties, avant tout geste
    who = await resolvePlayer(req, { create: true, today: ctx.today });
    if (!who.player) throw new SessionError(503, "Service momentanément indisponible.");
    const rl = await perPlayer(who.player);
    if (!rl.ok) throw new SessionError(429, "Doucement : trop de gestes en une minute.");
    /* services entre amis (4e échange, 2e pioche) : comptes seulement, un invité n'a pas d'amis */
    if (a === "service" && (body.id === "xtr" || body.id === "xpk") && who.account.guest) throw new SessionError(401, "Connectez-vous pour échanger avec vos amis.", "login");
    let out: Record<string, unknown> = await runAction(who.db, who.player, a, body, ctx, who.account);
    /* booster d'un compte : belle carte annoncée aux amis ; 1er booster d'un filleul → 1 booster chacun (lot 3) */
    if (a === "ouvrir" && !who.account.guest && !out.replay) {
      const sb = createSupabaseServiceRoleClient();
      const ref = sb ? await afterOpen(supabaseSocialDb(sb), who.player, out as Parameters<typeof afterOpen>[2]) : null;
      if (ref) out = { ...out, referral: ref, state: toClient(await loadGame(who.db, who.player, ctx), ctx, who.account) };
    }
    return who.finish(NextResponse.json(out, { headers: NO_STORE }));
  } catch (e) {
    /* les cookies (partie invitée tout juste créée, session rafraîchie) partent aussi avec un refus */
    return who ? who.finish(errorJson(e)) : errorJson(e);
  }
}
