/**
 * GET /api/push/vapid-key
 *
 * Retourne la clé publique VAPID pour le client. Pas de gating — c'est par
 * définition une clé PUBLIQUE (utilisée par le navigateur pour valider la
 * signature des notifs côté push service Mozilla/Google).
 *
 * Si non configurée → 503 (le client affichera "push indisponible" plutôt
 * que de tenter un subscribe qui échouerait avec une erreur cryptique).
 */

import { NextResponse } from "next/server";
import { getVapidConfig } from "@/lib/web-push";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(): Promise<NextResponse> {
  const cfg = getVapidConfig();
  if (!cfg) {
    return NextResponse.json(
      { ok: false, error: "Push notifications non configurées." },
      { status: 503 },
    );
  }
  return NextResponse.json(
    { ok: true, publicKey: cfg.publicKey },
    { headers: { "Cache-Control": "public, max-age=3600" } },
  );
}
