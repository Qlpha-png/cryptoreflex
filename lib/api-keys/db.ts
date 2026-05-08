/**
 * lib/api-keys/db.ts — Helpers Supabase typés pour la table `api_keys`.
 *
 * Toutes les requêtes B2B (auth middleware, rotation, lecture dashboard)
 * passent par ce module. On bypass RLS via service_role car les routes
 * `/api/v1/*` n'ont pas de session Supabase classique (le caller s'authentifie
 * via Bearer token, pas cookie).
 *
 * RLS reste actif pour les pages dashboard `/mon-compte/dev/*` qui utilisent
 * `createSupabaseServerClient()` (lib/supabase/server.ts).
 */

import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";
import type {
  ApiKeyRecord,
  ApiKeyScope,
  ApiKeyStatus,
  ApiKeyTier,
} from "./types";

function getDb() {
  const sb = createSupabaseServiceRoleClient();
  if (!sb) {
    throw new Error(
      "[api-keys/db] Supabase service role client absent. " +
        "Vérifier SUPABASE_SERVICE_ROLE_KEY + NEXT_PUBLIC_SUPABASE_URL.",
    );
  }
  return sb;
}

/**
 * Lookup d'une clé via son `public_key` (cr_pk_live_<keyId>). O(1) via UNIQUE
 * index. Retourne null si absente — IMPORTANT : le caller doit toujours
 * répondre `401 invalid_credentials` (S-2) sans distinguer "absente" vs
 * "secret invalide", pour ne pas fuir l'existence d'un keyId.
 */
export async function getApiKeyByPublicKey(
  publicKey: string,
): Promise<ApiKeyRecord | null> {
  const sb = getDb();
  const { data, error } = await sb
    .from("api_keys")
    .select("*")
    .eq("public_key", publicKey)
    .maybeSingle();
  if (error) {
    console.error("[api-keys/db] getApiKeyByPublicKey error", error.message);
    return null;
  }
  return (data as ApiKeyRecord | null) ?? null;
}

/** Lister les clés d'un user (dashboard). Trié récent → ancien. */
export async function listApiKeysForUser(
  userId: string,
): Promise<ApiKeyRecord[]> {
  const sb = getDb();
  const { data, error } = await sb
    .from("api_keys")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) {
    console.error("[api-keys/db] listApiKeysForUser error", error.message);
    return [];
  }
  return (data as ApiKeyRecord[] | null) ?? [];
}

/** Création initiale d'une clé. Le caller a déjà hashé le secret. */
export async function insertApiKey(input: {
  user_id: string;
  public_key: string;
  secret_hash: string;
  secret_prefix: string;
  label: string;
  tier: ApiKeyTier;
  scopes: ApiKeyScope[];
  stripe_subscription_id?: string | null;
  expires_at?: string | null;
}): Promise<ApiKeyRecord | null> {
  const sb = getDb();
  const { data, error } = await sb
    .from("api_keys")
    .insert({
      user_id: input.user_id,
      public_key: input.public_key,
      secret_hash: input.secret_hash,
      secret_prefix: input.secret_prefix,
      label: input.label,
      tier: input.tier,
      scopes: input.scopes,
      stripe_subscription_id: input.stripe_subscription_id ?? null,
      expires_at: input.expires_at ?? null,
      status: "active",
    })
    .select("*")
    .single();
  if (error) {
    console.error("[api-keys/db] insertApiKey error", error.message);
    return null;
  }
  return data as ApiKeyRecord;
}

/**
 * Mark `last_used_*` après chaque appel B2B authentifié. Best-effort, non
 * bloquant : on log et on continue si ça échoue (audit_log a déjà été écrit).
 */
export async function markApiKeyUsed(
  keyId: string,
  ip: string | null,
): Promise<void> {
  const sb = getDb();
  const { error } = await sb
    .from("api_keys")
    .update({
      last_used_at: new Date().toISOString(),
      last_used_ip: ip,
    })
    .eq("id", keyId);
  if (error) {
    console.warn("[api-keys/db] markApiKeyUsed warn", error.message);
  }
}

/** Révoque une clé. Audit log déjà loggé par le caller (action user). */
export async function revokeApiKey(
  keyId: string,
  userId: string,
): Promise<boolean> {
  const sb = getDb();
  const { error } = await sb
    .from("api_keys")
    .update({
      status: "revoked",
      revoked_at: new Date().toISOString(),
    })
    .eq("id", keyId)
    .eq("user_id", userId); // Defense in depth — on s'assure que c'est bien sa clé
  if (error) {
    console.error("[api-keys/db] revokeApiKey error", error.message);
    return false;
  }
  return true;
}

/**
 * Détermine si une clé peut servir une requête à l'instant T.
 * Encapsule la logique status + deprecated_until + expires_at + checks.
 */
export function isApiKeyServable(key: ApiKeyRecord, now = Date.now()): {
  ok: boolean;
  reason?: ApiKeyStatus | "expired_natural" | "deprecated_grace_over";
} {
  if (key.status === "revoked") return { ok: false, reason: "revoked" };
  if (key.status === "expired") return { ok: false, reason: "expired" };
  if (key.expires_at && new Date(key.expires_at).getTime() < now) {
    return { ok: false, reason: "expired_natural" };
  }
  if (key.status === "deprecated") {
    if (
      key.deprecated_until &&
      new Date(key.deprecated_until).getTime() < now
    ) {
      return { ok: false, reason: "deprecated_grace_over" };
    }
  }
  return { ok: true };
}
