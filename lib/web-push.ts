/**
 * lib/web-push.ts — Helpers Web Push (VAPID) côté serveur.
 *
 * Encapsule la lib `web-push` pour :
 *  - Charger la config VAPID depuis l'env (et lazily setVapidDetails 1×).
 *  - Récupérer les subscriptions d'un user via le SERVICE ROLE client (les
 *    routes appelantes vivent côté serveur uniquement, donc bypass RLS OK).
 *  - Envoyer une notification à toutes les subs d'un user, avec gestion
 *    automatique des erreurs 404 / 410 (sub expirée → on purge la DB).
 *  - Mettre à jour `last_seen_at` après chaque envoi réussi (utile pour
 *    pruner les subs mortes lors d'un cron de cleanup futur).
 *
 * GRACEFUL DEGRADATION : si VAPID_PUBLIC_KEY ou VAPID_PRIVATE_KEY manquent,
 * `getVapidConfig()` retourne null et toutes les fonctions deviennent no-op
 * (log + return). Permet de déployer le code SANS avoir encore configuré
 * les clés sur Vercel — pas de crash 500 sur evaluate-alerts.
 */

import webpush from "web-push";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";

/* -------------------------------------------------------------------------- */
/*  Types                                                                     */
/* -------------------------------------------------------------------------- */

export interface PushPayload {
  title: string;
  body: string;
  /** URL d'icône (défaut côté SW : /icons/icon-192.svg). */
  icon?: string;
  /** URL d'ouverture au click (défaut "/"). */
  url?: string;
  /**
   * Tag → coalesce les notifs (1 seule visible par tag, la dernière écrase).
   * Ex : `alert-${alert.id}` pour ne pas spammer 5 notifs si re-trigger.
   */
  tag?: string;
}

export interface PushSubscriptionRow {
  id: string;
  user_id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  topics: string[];
}

interface VapidConfig {
  publicKey: string;
  privateKey: string;
  subject: string;
}

interface SendResult {
  sent: number;
  failed: number;
  expired: number;
}

/* -------------------------------------------------------------------------- */
/*  Config                                                                    */
/* -------------------------------------------------------------------------- */

let vapidConfigured = false;

/**
 * Lit la config VAPID depuis l'env. Retourne null si incomplet — auquel cas
 * les fonctions d'envoi loggent un warn et no-op proprement.
 *
 * `subject` doit être un mailto: ou une URL https selon la spec VAPID.
 */
export function getVapidConfig(): VapidConfig | null {
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT || "mailto:contact@cryptoreflex.fr";

  if (!publicKey || !privateKey) return null;

  return { publicKey, privateKey, subject };
}

/**
 * Configure web-push (idempotent — guard via vapidConfigured pour ne pas
 * setVapidDetails à chaque call). Retourne false si pas configurable.
 */
function ensureVapidConfigured(): boolean {
  if (vapidConfigured) return true;
  const cfg = getVapidConfig();
  if (!cfg) return false;
  webpush.setVapidDetails(cfg.subject, cfg.publicKey, cfg.privateKey);
  vapidConfigured = true;
  return true;
}

/* -------------------------------------------------------------------------- */
/*  DB helpers                                                                */
/* -------------------------------------------------------------------------- */

async function fetchSubscriptionsForUser(
  userId: string,
): Promise<PushSubscriptionRow[]> {
  const supabase = createSupabaseServiceRoleClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("user_push_subscriptions")
    .select("id, user_id, endpoint, p256dh, auth, topics")
    .eq("user_id", userId);

  if (error) {
    console.warn("[web-push] fetchSubscriptionsForUser:", error.message);
    return [];
  }
  // topics arrive en jsonb → typé any par PostgREST, on cast.
  return (data ?? []).map((r) => ({
    id: r.id as string,
    user_id: r.user_id as string,
    endpoint: r.endpoint as string,
    p256dh: r.p256dh as string,
    auth: r.auth as string,
    topics: Array.isArray(r.topics) ? (r.topics as string[]) : [],
  }));
}

async function deleteSubscriptionByEndpoint(endpoint: string): Promise<void> {
  const supabase = createSupabaseServiceRoleClient();
  if (!supabase) return;
  const { error } = await supabase
    .from("user_push_subscriptions")
    .delete()
    .eq("endpoint", endpoint);
  if (error) console.warn("[web-push] delete expired sub failed:", error.message);
}

async function touchLastSeen(id: string): Promise<void> {
  const supabase = createSupabaseServiceRoleClient();
  if (!supabase) return;
  const { error } = await supabase
    .from("user_push_subscriptions")
    .update({ last_seen_at: new Date().toISOString() })
    .eq("id", id);
  if (error) console.warn("[web-push] touchLastSeen failed:", error.message);
}

/* -------------------------------------------------------------------------- */
/*  Public API                                                                */
/* -------------------------------------------------------------------------- */

/**
 * Envoie une notification push à toutes les subscriptions d'un utilisateur.
 *
 * Comportement :
 *  - Si VAPID non configuré → log + return { sent: 0 } (no-op silencieux).
 *  - Si l'user n'a aucune sub → return { sent: 0 }.
 *  - Pour chaque sub : tente l'envoi.
 *    - 404 / 410 → sub expirée, on la supprime de la DB.
 *    - Autre erreur → log mais on continue (les autres subs ne sont pas
 *      pénalisées par une 1 seule en panne).
 *  - Sub OK → on bump last_seen_at (best-effort, erreur silencieuse).
 */
export async function sendPushToUser(
  userId: string,
  payload: PushPayload,
): Promise<SendResult> {
  const result: SendResult = { sent: 0, failed: 0, expired: 0 };

  if (!ensureVapidConfigured()) {
    console.warn(
      "[web-push] VAPID non configuré — sendPushToUser no-op pour user",
      userId,
    );
    return result;
  }

  const subs = await fetchSubscriptionsForUser(userId);
  if (!subs.length) return result;

  const json = JSON.stringify(payload);

  await Promise.all(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          },
          json,
        );
        result.sent++;
        await touchLastSeen(sub.id);
      } catch (err: unknown) {
        const status =
          typeof err === "object" && err !== null && "statusCode" in err
            ? Number((err as { statusCode?: unknown }).statusCode)
            : 0;
        if (status === 404 || status === 410) {
          result.expired++;
          await deleteSubscriptionByEndpoint(sub.endpoint);
        } else {
          result.failed++;
          const msg = err instanceof Error ? err.message : String(err);
          console.warn(
            `[web-push] send failed for sub ${sub.id} (status=${status}):`,
            msg,
          );
        }
      }
    }),
  );

  return result;
}

/**
 * Envoie une notification à plusieurs users sur un topic donné.
 * Filtre côté client (en DB) : on ne récupère que les subs ayant `topic` dans
 * leur tableau `topics`. Pratique pour le brief quotidien (topic="brief")
 * ou les annonces produit (topic="announce").
 */
export async function sendPushToTopic(
  topic: string,
  userIds: string[],
  payload: PushPayload,
): Promise<SendResult> {
  const aggregate: SendResult = { sent: 0, failed: 0, expired: 0 };

  if (!ensureVapidConfigured()) {
    console.warn("[web-push] VAPID non configuré — sendPushToTopic no-op");
    return aggregate;
  }
  if (!userIds.length) return aggregate;

  const supabase = createSupabaseServiceRoleClient();
  if (!supabase) return aggregate;

  // Filtre topics côté DB via @> (jsonb contains).
  const { data, error } = await supabase
    .from("user_push_subscriptions")
    .select("id, user_id, endpoint, p256dh, auth, topics")
    .in("user_id", userIds)
    .contains("topics", JSON.stringify([topic]));

  if (error) {
    console.warn("[web-push] sendPushToTopic query:", error.message);
    return aggregate;
  }

  const json = JSON.stringify(payload);

  await Promise.all(
    (data ?? []).map(async (sub) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint as string,
            keys: {
              p256dh: sub.p256dh as string,
              auth: sub.auth as string,
            },
          },
          json,
        );
        aggregate.sent++;
        await touchLastSeen(sub.id as string);
      } catch (err: unknown) {
        const status =
          typeof err === "object" && err !== null && "statusCode" in err
            ? Number((err as { statusCode?: unknown }).statusCode)
            : 0;
        if (status === 404 || status === 410) {
          aggregate.expired++;
          await deleteSubscriptionByEndpoint(sub.endpoint as string);
        } else {
          aggregate.failed++;
        }
      }
    }),
  );

  return aggregate;
}
