/**
 * POST /api/push/unsubscribe
 *
 * Supprime une PushSubscription pour l'utilisateur courant. Le client envoie
 * l'endpoint qu'il vient de désinscrire côté navigateur (via
 * `subscription.unsubscribe()`), on supprime la ligne correspondante en DB.
 *
 * On filtre `endpoint AND user_id` pour éviter qu'un user A puisse unsubscribe
 * une sub appartenant à un user B en connaissant son endpoint (faille
 * théorique : les endpoints ne sont pas devinables, mais ceinture+bretelles).
 *
 * Body : { endpoint: string }
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface UnsubscribeBody {
  endpoint?: unknown;
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const user = await requireAuth();

  let body: UnsubscribeBody;
  try {
    body = (await req.json()) as UnsubscribeBody;
  } catch {
    return NextResponse.json(
      { ok: false, error: "JSON invalide." },
      { status: 400 },
    );
  }

  const endpoint =
    typeof body.endpoint === "string" && body.endpoint.length > 0
      ? body.endpoint
      : null;
  if (!endpoint) {
    return NextResponse.json(
      { ok: false, error: "endpoint manquant." },
      { status: 400 },
    );
  }

  const supabase = createSupabaseServiceRoleClient();
  if (!supabase) {
    return NextResponse.json(
      { ok: false, error: "Service indisponible." },
      { status: 503 },
    );
  }

  const { error } = await supabase
    .from("user_push_subscriptions")
    .delete()
    .eq("endpoint", endpoint)
    .eq("user_id", user.id);

  if (error) {
    console.error("[push/unsubscribe] delete failed:", error.message);
    return NextResponse.json(
      { ok: false, error: "Suppression impossible." },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}
