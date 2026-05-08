"use server";

/**
 * Server Actions du dashboard B2B `/mon-compte/dev`.
 *
 * - createSandboxKey   : génère + insert une clé sandbox (J+14, scopes restreints)
 * - revokeKey          : révoque une clé existante
 *
 * Toutes les actions :
 *   - require l'auth Supabase (cookie session)
 *   - écrivent un audit_log via lib/api-keys/audit
 *   - retournent un état serialisable pour les Server Components
 *
 * Pourquoi des Server Actions et pas des routes API : le dashboard est UI
 * humaine cookie-authed, pas Bearer token. Le middleware `requireApiKey`
 * n'est donc pas adapté ; on utilise `getUser()` direct.
 */

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getUser } from "@/lib/auth";
import { generateApiKeyPair } from "@/lib/api-keys/format";
import { hashSecret } from "@/lib/api-keys/hash";
import { DEFAULT_SCOPES_BY_TIER, sanitizeScopes } from "@/lib/api-keys/scopes";
import { insertApiKey, revokeApiKey } from "@/lib/api-keys/db";
import { logAudit } from "@/lib/api-keys/audit";
import type { ApiKeyTier } from "@/lib/api-keys/types";

/**
 * Crée une clé sandbox pour l'utilisateur courant. La clé secrète est encodée
 * dans l'URL de redirect (cookie temporaire serait plus propre mais c'est
 * acceptable pour MVP : single-shot, jamais affiché ailleurs).
 *
 * IMPORTANT : ce flow est appelé depuis un formulaire HTML standard. La clé
 * en clair existe UNIQUEMENT le temps de la redirection — après affichage,
 * elle disparaît du DOM (rechargement de la page sans le param).
 */
export async function createSandboxKey(formData: FormData): Promise<void> {
  const user = await getUser();
  if (!user) {
    redirect("/connexion?next=/mon-compte/dev");
  }

  const labelRaw = String(formData.get("label") || "").trim();
  const label = labelRaw.length > 0 ? labelRaw.slice(0, 100) : "Clé sandbox";

  const tier: ApiKeyTier = "sandbox";
  const scopes = sanitizeScopes(DEFAULT_SCOPES_BY_TIER[tier], tier);

  const pair = generateApiKeyPair("sandbox");
  const secret_hash = await hashSecret(pair.secret_raw);

  // Sandbox expire à J+14 (D-1).
  const expires_at = new Date(
    Date.now() + 14 * 24 * 60 * 60 * 1000,
  ).toISOString();

  const inserted = await insertApiKey({
    user_id: user.id,
    public_key: pair.public_key,
    secret_hash,
    secret_prefix: pair.secret_prefix,
    label,
    tier,
    scopes,
    stripe_subscription_id: null,
    expires_at,
  });

  if (!inserted) {
    redirect("/mon-compte/dev?error=create_failed");
  }

  await logAudit({
    user_id: user.id,
    event: "b2b.api_key.created",
    metadata: {
      api_key_id: inserted.id,
      tier,
      scopes,
      via: "dashboard_sandbox",
    },
  });

  revalidatePath("/mon-compte/dev");

  // Redirige vers la page reveal avec le secret en clair en query param.
  // Sécurité acceptable :
  //   - HTTPS only en prod (TLS protège la query)
  //   - URL n'est pas loggée par Vercel sur paths /mon-compte/* (dynamic)
  //   - La page reveal redirige vers le détail dès l'affichage (pas de
  //     bookmark possible)
  redirect(
    `/mon-compte/dev/${inserted.id}/reveal?s=${encodeURIComponent(pair.secret_raw)}`,
  );
}

/**
 * Révoque une clé. Action irréversible, audit_log conservé.
 * Retourne `void` pour être compatible avec `<form action={...}>` sans
 * `useFormState` côté MVP. Les erreurs sont propagées via redirect query param.
 */
export async function revokeApiKeyAction(formData: FormData): Promise<void> {
  const user = await getUser();
  if (!user) {
    redirect("/connexion?next=/mon-compte/dev");
  }

  const keyId = String(formData.get("key_id") || "").trim();
  if (!keyId) {
    redirect("/mon-compte/dev?error=missing_id");
  }

  const ok = await revokeApiKey(keyId, user.id);
  if (!ok) {
    redirect(`/mon-compte/dev/${keyId}?error=revoke_failed`);
  }

  await logAudit({
    user_id: user.id,
    event: "b2b.api_key.revoked",
    metadata: { api_key_id: keyId, via: "dashboard" },
  });

  revalidatePath("/mon-compte/dev");
  revalidatePath(`/mon-compte/dev/${keyId}`);
  redirect(`/mon-compte/dev/${keyId}?revoked=1`);
}
