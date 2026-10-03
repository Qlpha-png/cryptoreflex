/**
 * GET /api/cartes/etat?jour=N — la partie du joueur (compte du site ou invité de ce navigateur).
 * Pas de partie encore (aucun booster ouvert) : { state: null } et le jeu démarre une partie neuve.
 * Coupée (404) tant que REFLEX_CARDS_ACCOUNTS n'est pas « true » ou « essai ».
 */
import { NextResponse, type NextRequest } from "next/server";
import { isReflexCardsEnabled, reflexAccountsMode } from "@/lib/reflex-cards/flag";
import { NO_STORE, errorJson, gameCtx, guestsAllowed, resolvePlayer, type Who } from "@/lib/reflex-cards/session";
import { loadGame } from "@/lib/reflex-cards/store";
import { toClient } from "@/lib/reflex-cards/actions";
import { applyReleases } from "@/lib/reflex-cards/releases";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
/* la partie est relue à CHAQUE appel : aucune lecture Supabase ne doit passer par le cache de données de Next.js */
export const fetchCache = "force-no-store";

export async function GET(req: NextRequest) {
  if (!isReflexCardsEnabled() || reflexAccountsMode() === "off") return new NextResponse("Page introuvable", { status: 404 });
  const ctx = gameCtx(req.nextUrl.searchParams.get("jour"));
  if (ctx.day < 1) return new NextResponse("Page introuvable", { status: 404 });
  let who: Who | null = null;
  try {
    await applyReleases(); // calendrier effectif des sorties, avant toute lecture de partie
    /* compte reconnu : sa partie est retrouvée (ou créée) comme pour un geste — jamais « partie introuvable » à la lecture */
    who = await resolvePlayer(req, { create: false, createAccount: true, today: ctx.today });
    if (!who.player) return who.finish(NextResponse.json({ ok: true, state: null, account: who.account, guests: guestsAllowed() }, { headers: NO_STORE }));
    const s = await loadGame(who.db, who.player, ctx);
    return who.finish(NextResponse.json({ ok: true, state: toClient(s, ctx, who.account), guests: guestsAllowed() }, { headers: NO_STORE }));
  } catch (e) {
    /* les cookies (partie invitée tout juste créée, session rafraîchie) partent aussi avec un refus */
    return who ? who.finish(errorJson(e)) : errorJson(e);
  }
}
