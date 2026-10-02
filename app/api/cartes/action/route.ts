/**
 * POST /api/cartes/action { a: action, jour: N, ...paramètres } — un geste de jeu, décidé par le serveur.
 * Le serveur relit la partie, applique les règles (lib/reflex-cards/actions.ts) puis écrit d'un seul coup
 * (rc_apply) ; il renvoie la partie à jour. La partie invitée est créée au premier geste.
 * Origine contrôlée par le middleware (mutations inter-sites refusées), corps JSON obligatoire.
 */
import { NextResponse, type NextRequest } from "next/server";
import { isReflexCardsEnabled, reflexAccountsMode } from "@/lib/reflex-cards/flag";
import { NO_STORE, SessionError, errorJson, gameCtx, resolvePlayer, type Who } from "@/lib/reflex-cards/session";
import { runAction } from "@/lib/reflex-cards/store";
import { createRateLimiter } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
/* près de la base Supabase (Londres) et dans l'UE (RGPD), comme /api/v1/me */
export const preferredRegion = ["fra1"];

const ACTIONS = new Set(["ouvrir", "mission", "semaine", "defi", "collection", "quiz", "fiche", "fabriquer", "acheter", "equiper", "service", "colporteur", "titre", "pantheon", "pseudo"]);
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
  let who: Who | null = null;
  try {
    who = await resolvePlayer(req, { create: true, today: ctx.today });
    if (!who.player) throw new SessionError(503, "Service momentanément indisponible.");
    const rl = await perPlayer(who.player);
    if (!rl.ok) throw new SessionError(429, "Doucement : trop de gestes en une minute.");
    const out = await runAction(who.db, who.player, a, body, ctx, who.account);
    return who.finish(NextResponse.json(out, { headers: NO_STORE }));
  } catch (e) {
    /* les cookies (partie invitée tout juste créée, session rafraîchie) partent aussi avec un refus */
    return who ? who.finish(errorJson(e)) : errorJson(e);
  }
}
