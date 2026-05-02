/**
 * POST /api/exchanges/disconnect
 *
 * Body : { provider: "binance" }
 *
 * Supprime la connexion exchange + chiffrement effacé.
 * Auth obligatoire — un user ne peut delete que ses propres connexions
 * (RLS Supabase + check user_id côté code).
 */

import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface DisconnectBody {
  provider?: unknown;
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const user = await getUser();
  if (!user) {
    return NextResponse.json(
      { ok: false, error: "Connexion requise." },
      { status: 401 },
    );
  }

  let body: DisconnectBody;
  try {
    body = (await req.json()) as DisconnectBody;
  } catch {
    return NextResponse.json(
      { ok: false, error: "JSON invalide." },
      { status: 400 },
    );
  }

  const provider =
    typeof body.provider === "string" ? body.provider.toLowerCase().trim() : "";
  if (!provider) {
    return NextResponse.json(
      { ok: false, error: "Provider requis." },
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
    .from("user_exchange_connections")
    .delete()
    .eq("user_id", user.id)
    .eq("provider", provider);

  if (error) {
    console.error("[exchanges/disconnect] error:", error.message);
    return NextResponse.json(
      { ok: false, error: "Impossible de supprimer la connexion." },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true, provider });
}
