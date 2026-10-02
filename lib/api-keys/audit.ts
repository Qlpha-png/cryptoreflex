/**
 * lib/api-keys/audit.ts — Audit trail immuable pour l'API B2B.
 *
 * Réutilise la table `audit_log` existante (`supabase/schema.sql`) avec un
 * jeu d'events `b2b.*`. PAS de table parallèle.
 *
 * Exemples d'events :
 *   - b2b.api_key.created      (user crée une clé via dashboard)
 *   - b2b.api_key.rotated      (rotation, ancienne en mode deprecated)
 *   - b2b.api_key.revoked
 *   - b2b.request              (chaque appel API authentifié)
 *   - b2b.request.unauthorized (échec auth — signal d'attaque)
 *   - b2b.rate_limit_hit       (429 servi)
 *   - b2b.webhook.created
 *   - b2b.webhook.delivered
 *   - b2b.webhook.failed
 *
 * Toutes les entries portent un `request_id` (nanoid 12) propagé dans la
 * réponse via header `X-Request-Id`. Permet de croiser un log Sentry / Vercel
 * avec une entry audit_log.
 */

import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";
import { randomBytes } from "node:crypto";

/** Génère un request_id court (12 chars Crockford-ish, sans I/L/O/0/1). */
export function newRequestId(): string {
  const charset = "23456789ABCDEFGHJKMNPQRSTUVWXYZ"; // 31 chars
  const bytes = randomBytes(12);
  let out = "";
  for (let i = 0; i < 12; i++) out += charset[bytes[i] % charset.length];
  return out;
}

export interface AuditEntry {
  user_id: string | null;
  event: string;
  ip?: string | null;
  user_agent?: string | null;
  metadata?: Record<string, unknown>;
}

/** Longueur max du user-agent stocké (un attaquant contrôle ce header). */
export const MAX_USER_AGENT_LENGTH = 256;

/** Tronque un user-agent (null si absent / vide). */
export function truncateUserAgent(ua: string | null | undefined): string | null {
  if (typeof ua !== "string" || ua.length === 0) return null;
  return ua.slice(0, MAX_USER_AGENT_LENGTH);
}

/**
 * Échecs d'auth NON persistés dans audit_log (AUDIT 2026-10-02) : un attaquant
 * sans clé valide (format invalide, clé inconnue) pouvait faire écrire une
 * ligne en base par requête → gonflement de table / coût Supabase. Ces cas
 * sont seulement comptés + loggés (console). Les échecs sur une clé EXISTANTE
 * (BAD_SECRET, clé inactive, scope…) restent audités : vrai signal d'attaque
 * ciblée sur un compte.
 */
const UNPERSISTED_UNAUTHORIZED_REASONS: ReadonlySet<string> = new Set([
  "INVALID_FORMAT",
  "KEY_NOT_FOUND",
]);

export function shouldPersistUnauthorizedAudit(reason: string): boolean {
  return !UNPERSISTED_UNAUTHORIZED_REASONS.has(reason);
}

/** Ligne `audit_log` normalisée (user_agent tronqué). Exportée pour les tests. */
export function toAuditRow(entry: AuditEntry): {
  user_id: string | null;
  event: string;
  ip: string | null;
  user_agent: string | null;
  metadata: Record<string, unknown>;
} {
  return {
    user_id: entry.user_id,
    event: entry.event,
    ip: entry.ip ?? null,
    user_agent: truncateUserAgent(entry.user_agent),
    metadata: entry.metadata ?? {},
  };
}

/**
 * Insert dans `audit_log`. Best-effort — on log un warn si ça échoue mais on
 * NE bloque PAS le flow d'API. L'absence d'audit n'empêche pas la réponse au
 * caller (DDOS-resistance : l'attaquant ne peut pas rendre l'API down en
 * faisant échouer audit_log).
 */
export async function logAudit(entry: AuditEntry): Promise<void> {
  const sb = createSupabaseServiceRoleClient();
  if (!sb) {
    console.warn("[api-keys/audit] Supabase absent — audit non écrit", entry.event);
    return;
  }
  const { error } = await sb.from("audit_log").insert(toAuditRow(entry));
  if (error) {
    console.warn("[api-keys/audit] insert warn", entry.event, error.message);
  }
}

/**
 * Helper : extrait IP + UA d'une Request standard.
 * Vercel passe l'IP réelle dans `x-forwarded-for` (premier de la liste).
 */
export function extractRequestMeta(req: Request): {
  ip: string | null;
  user_agent: string | null;
} {
  const xff = req.headers.get("x-forwarded-for") || "";
  const ip =
    xff.split(",")[0].trim() ||
    req.headers.get("x-real-ip") ||
    null;
  const user_agent = truncateUserAgent(req.headers.get("user-agent"));
  return { ip, user_agent };
}
