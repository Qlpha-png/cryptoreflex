/**
 * POST /api/push/subscribe
 *
 * Enregistre (ou met à jour) une PushSubscription pour l'utilisateur courant.
 *
 * Body : {
 *   endpoint: string,             // URL fournie par le push service navigateur
 *   keys: { p256dh: string, auth: string },
 *   topics?: string[]             // défaut ["alerts","brief"]
 * }
 *
 * Logique upsert :
 *  - L'endpoint est UNIQUE en DB (cf. migration). Si la même sub existe déjà
 *    (même endpoint), on update p256dh/auth/topics/last_seen_at sur la ligne
 *    existante. Sinon on insert.
 *  - On stocke aussi user_agent (utile pour debug "ah cette sub vient de mon
 *    iPhone Safari").
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface SubscribeBody {
  endpoint?: unknown;
  keys?: { p256dh?: unknown; auth?: unknown };
  topics?: unknown;
}

const DEFAULT_TOPICS = ["alerts", "brief"] as const;

function isValidTopic(t: unknown): t is string {
  return typeof t === "string" && /^[a-z0-9_-]{1,32}$/.test(t);
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  // requireAuth() redirect si pas connecté — mais on ne peut pas redirect une
  // POST API. On vérifie donc manuellement et retourne 401 si absent.
  const user = await requireAuth();
  // requireAuth peut redirect — si on est ici, user est défini.

  let body: SubscribeBody;
  try {
    body = (await req.json()) as SubscribeBody;
  } catch {
    return NextResponse.json(
      { ok: false, error: "JSON invalide." },
      { status: 400 },
    );
  }

  const endpoint =
    typeof body.endpoint === "string" && body.endpoint.startsWith("https://")
      ? body.endpoint
      : null;
  const p256dh =
    typeof body.keys?.p256dh === "string" ? body.keys.p256dh : null;
  const auth = typeof body.keys?.auth === "string" ? body.keys.auth : null;

  if (!endpoint || !p256dh || !auth) {
    return NextResponse.json(
      { ok: false, error: "Subscription invalide (endpoint/keys manquants)." },
      { status: 400 },
    );
  }

  const topics = Array.isArray(body.topics)
    ? body.topics.filter(isValidTopic)
    : Array.from(DEFAULT_TOPICS);
  const finalTopics = topics.length > 0 ? topics : Array.from(DEFAULT_TOPICS);

  const supabase = createSupabaseServiceRoleClient();
  if (!supabase) {
    return NextResponse.json(
      { ok: false, error: "Service indisponible." },
      { status: 503 },
    );
  }

  const userAgent = req.headers.get("user-agent")?.slice(0, 256) ?? null;

  // Upsert via onConflict sur la colonne unique `endpoint`.
  // Note : on RE-bind user_id aussi, pour le cas où la même sub change de
  // user (rare mais possible si le user se déconnecte / reconnecte avec
  // un autre compte sur le même navigateur).
  const { error } = await supabase
    .from("user_push_subscriptions")
    .upsert(
      {
        user_id: user.id,
        endpoint,
        p256dh,
        auth,
        topics: finalTopics,
        user_agent: userAgent,
        last_seen_at: new Date().toISOString(),
      },
      { onConflict: "endpoint" },
    );

  if (error) {
    console.error("[push/subscribe] upsert failed:", error.message);
    return NextResponse.json(
      { ok: false, error: "Impossible d'enregistrer la souscription." },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true, topics: finalTopics });
}
