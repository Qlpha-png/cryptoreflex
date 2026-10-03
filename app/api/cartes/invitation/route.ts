/**
 * GET /api/cartes/invitation?inv=JETON — qui invite ? (pseudo seulement), SANS compte.
 *
 * Pourquoi (plan « simple pour un ami invité », 03/10/2026) : l'ami qui ouvre un lien d'invitation joue d'abord en
 * invité ; la page de la carte et le jeu doivent pouvoir afficher « Léa vous invite » et « invitation en attente »
 * avant toute inscription. /api/cartes/amis?inv= exige un compte : cette route ne renvoie que le pseudo de l'hôte,
 * jamais son code ami, pour un jeton signé et encore valable.
 *
 * Limitée par adresse (60 / 10 min). Compte le tunnel (inv_open) sans donnée personnelle.
 */

import { NextRequest, NextResponse } from "next/server";
import { createRateLimiter } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/ip";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";
import { isReflexCardsEnabled, reflexAccountsMode } from "@/lib/reflex-cards/flag";
import { INVITE_RE, inviteInfo, supabaseFriendsDb } from "@/lib/reflex-cards/friends";
import { bumpFunnel } from "@/lib/reflex-cards/funnel";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "private, no-store, max-age=0" };
const limiter = createRateLimiter({ limit: 60, windowMs: 10 * 60 * 1000, key: "rc-invitation" });

export async function GET(req: NextRequest): Promise<Response> {
  if (!isReflexCardsEnabled() || reflexAccountsMode() === "off") {
    return NextResponse.json({ ok: false, error: "Indisponible." }, { status: 404, headers: NO_STORE });
  }
  const rl = await limiter(getClientIp(req));
  if (!rl.ok) {
    return NextResponse.json({ ok: false, error: "Doucement : réessayez dans un instant." }, { status: 429, headers: { ...NO_STORE, "Retry-After": String(rl.retryAfter) } });
  }
  const tok = (req.nextUrl.searchParams.get("inv") ?? "").trim();
  if (!INVITE_RE.test(tok)) {
    return NextResponse.json({ ok: false, error: "Lien d'invitation incomplet." }, { status: 422, headers: NO_STORE });
  }
  const sb = createSupabaseServiceRoleClient();
  if (!sb) return NextResponse.json({ ok: false, error: "Service momentanément indisponible." }, { status: 503, headers: NO_STORE });
  try {
    const info = await inviteInfo(supabaseFriendsDb(sb), tok);
    if (!info) {
      return NextResponse.json({ ok: false, error: "Ce lien d'invitation n'est plus valide : demandez-en un nouveau à votre ami." }, { status: 404, headers: NO_STORE });
    }
    void bumpFunnel("inv_open");
    return NextResponse.json({ ok: true, pseudo: info.pseudo }, { headers: NO_STORE });
  } catch {
    return NextResponse.json({ ok: false, error: "Service momentanément indisponible." }, { status: 503, headers: NO_STORE });
  }
}
