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
 *
 * Garde-fous (audit sécurité 2026-10-02) :
 *  - endpoint limité aux VRAIS push services (FCM, Mozilla, Apple, WNS) via
 *    isAllowedPushEndpoint — sinon le cron POSTerait vers n'importe quelle URL.
 *  - 10 souscriptions max par utilisateur (au-delà : 409, sauf mise à jour
 *    d'un endpoint déjà enregistré pour ce user).
 *  - Rate limit 20 req / heure / utilisateur.
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";
import { isAllowedPushEndpoint, mergeTopics } from "@/lib/web-push";
import { createRateLimiter } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Nombre max de navigateurs / appareils abonnés par utilisateur. */
const MAX_SUBSCRIPTIONS_PER_USER = 10;

/** Clés Web Push (base64url, éventuellement base64 standard + padding). */
const PUSH_KEY_REGEX = /^[A-Za-z0-9_\-+/=]{8,256}$/;

const limiter = createRateLimiter({
  limit: 20,
  windowMs: 60 * 60 * 1000,
  key: "push-subscribe",
});

interface SubscribeBody {
  endpoint?: unknown;
  keys?: { p256dh?: unknown; auth?: unknown };
  topics?: unknown;
  /** true : AJOUTER `topics` à ceux déjà enregistrés pour cet appareil (jeu Reflex Cards) ; absent : remplacement (d'origine) */
  merge?: unknown;
  /** sujets à retirer (avec merge) */
  remove?: unknown;
}

function isValidTopic(t: unknown): t is string {
  return typeof t === "string" && /^[a-z0-9_-]{1,32}$/.test(t);
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  // requireAuth() redirect si pas connecté — mais on ne peut pas redirect une
  // POST API. On vérifie donc manuellement et retourne 401 si absent.
  const user = await requireAuth();
  // requireAuth peut redirect — si on est ici, user est défini.

  const rl = await limiter(user.id);
  if (!rl.ok) {
    return NextResponse.json(
      { ok: false, error: "Trop de tentatives. Réessayez plus tard." },
      { status: 429, headers: { "Retry-After": String(rl.retryAfter) } },
    );
  }

  let body: SubscribeBody;
  try {
    body = (await req.json()) as SubscribeBody;
  } catch {
    return NextResponse.json(
      { ok: false, error: "JSON invalide." },
      { status: 400 },
    );
  }

  const endpoint = isAllowedPushEndpoint(body.endpoint) ? body.endpoint : null;
  const p256dh =
    typeof body.keys?.p256dh === "string" && PUSH_KEY_REGEX.test(body.keys.p256dh)
      ? body.keys.p256dh
      : null;
  const auth =
    typeof body.keys?.auth === "string" && PUSH_KEY_REGEX.test(body.keys.auth)
      ? body.keys.auth
      : null;

  if (!endpoint || !p256dh || !auth) {
    return NextResponse.json(
      {
        ok: false,
        error: "Subscription invalide (endpoint/keys manquants ou push service non reconnu).",
      },
      { status: 400 },
    );
  }

  /* sujets : remplacement par défaut (comportement d'origine, sujets par défaut si aucun) ; `merge: true` (jeu Reflex Cards,
     public/reflex-cards/pwa.js) : ajoutés aux sujets déjà enregistrés pour cet appareil, `remove` retirés — un joueur qui
     active les notifications du jeu garde ses alertes de prix, et inversement (lib/web-push.ts mergeTopics). */
  const requested = Array.isArray(body.topics) ? body.topics.filter(isValidTopic) : [];
  const merge = body.merge === true;
  const remove = Array.isArray(body.remove) ? body.remove.filter(isValidTopic) : [];

  const supabase = createSupabaseServiceRoleClient();
  if (!supabase) {
    return NextResponse.json(
      { ok: false, error: "Service indisponible." },
      { status: 503 },
    );
  }

  // Plafond par utilisateur : on compte ses souscriptions existantes. Un
  // endpoint déjà à lui = simple mise à jour (toujours autorisée).
  const { data: existing, error: countError } = await supabase
    .from("user_push_subscriptions")
    .select("endpoint, topics")
    .eq("user_id", user.id);
  if (countError) {
    console.error("[push/subscribe] count failed:", countError.message);
    return NextResponse.json(
      { ok: false, error: "Impossible d'enregistrer la souscription." },
      { status: 500 },
    );
  }
  const rows = (existing ?? []) as Array<{ endpoint: string; topics?: unknown }>;
  const mine = rows.find((r) => r.endpoint === endpoint);
  const alreadyMine = !!mine;
  const finalTopics = mergeTopics(Array.isArray(mine?.topics) ? (mine.topics as string[]) : null, requested, { merge, remove });
  if (!alreadyMine && rows.length >= MAX_SUBSCRIPTIONS_PER_USER) {
    return NextResponse.json(
      {
        ok: false,
        error: `Nombre maximal d'appareils atteint (${MAX_SUBSCRIPTIONS_PER_USER}). Désactivez les notifications sur un ancien appareil.`,
      },
      { status: 409 },
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
