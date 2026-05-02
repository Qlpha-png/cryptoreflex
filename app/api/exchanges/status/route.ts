/**
 * GET /api/exchanges/status
 *
 * Liste les connexions exchange actives du user (sans exposer les API keys).
 * Utilisé par l'UI /portefeuille pour afficher l'état "Connected | Sync in
 * progress | Error" et la dernière sync.
 *
 * Réponse :
 *   200 { ok: true, connections: [{ provider, label, lastSyncedAt, lastSyncStatus,
 *         consecutiveFailures }], cryptoConfigured: boolean }
 *   401 si pas connecté
 */

import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";
import { isExchangeCryptoReady } from "@/lib/exchange-crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getUser();
  if (!user) {
    return NextResponse.json(
      { ok: false, error: "Connexion requise." },
      { status: 401 },
    );
  }

  const supabase = createSupabaseServiceRoleClient();
  if (!supabase) {
    return NextResponse.json(
      { ok: true, connections: [], cryptoConfigured: false, dbConfigured: false },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  }

  const { data, error } = await supabase
    .from("user_exchange_connections")
    .select("provider, label, last_synced_at, last_sync_status, consecutive_failures")
    .eq("user_id", user.id);

  if (error) {
    console.warn("[exchanges/status] select error:", error.message);
    return NextResponse.json(
      { ok: false, error: "Erreur DB." },
      { status: 500 },
    );
  }

  return NextResponse.json(
    {
      ok: true,
      connections: (data ?? []).map((c) => ({
        provider: c.provider,
        label: c.label,
        lastSyncedAt: c.last_synced_at,
        lastSyncStatus: c.last_sync_status,
        consecutiveFailures: c.consecutive_failures,
      })),
      cryptoConfigured: isExchangeCryptoReady(),
      dbConfigured: true,
    },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
