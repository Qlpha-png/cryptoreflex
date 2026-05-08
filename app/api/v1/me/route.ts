/**
 * GET /api/v1/me
 * --------------
 * Retourne le profil utilisateur lié à la clé API + ses scopes + son tier.
 *
 * Endpoint le plus simple — sert de "ping authentifié" pour valider qu'une
 * clé fonctionne avant les autres appels. Aucun scope spécifique requis (toute
 * clé authentifiée peut s'introspecter).
 *
 * Conformité :
 *   - runtime nodejs (scrypt)
 *   - preferredRegion fra1 (C-5, RGPD UE pour les `me/*`)
 *   - Cache-Control no-store
 *   - License: B2B Subscription
 */

import { requireApiKey } from "@/lib/api-keys/auth";
import { successResponse, applicationError } from "@/lib/api-keys/response";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const preferredRegion = ["fra1"];
export const dynamic = "force-dynamic";

export async function GET(req: Request): Promise<Response> {
  const auth = await requireApiKey(req);
  if (!auth.ok) return auth.response;

  const { key, request_id, headers } = auth;

  const sb = createSupabaseServiceRoleClient();
  if (!sb) {
    return applicationError(
      500,
      "INTERNAL_DB_UNAVAILABLE",
      "Service indisponible temporairement.",
      request_id,
    );
  }

  const { data: user, error } = await sb
    .from("users")
    .select("id, email, plan, plan_expires_at, created_at")
    .eq("id", key.user_id)
    .maybeSingle();

  if (error || !user) {
    return applicationError(
      500,
      "USER_NOT_FOUND",
      "Profil utilisateur introuvable. Contacte le support.",
      request_id,
    );
  }

  return successResponse(
    {
      user: {
        id: user.id,
        email: user.email,
        plan: user.plan,
        plan_expires_at: user.plan_expires_at,
        member_since: user.created_at,
      },
      api_key: {
        id: key.id,
        label: key.label,
        tier: key.tier,
        scopes: key.scopes,
        secret_prefix: key.secret_prefix,
        expires_at: key.expires_at,
        last_used_at: key.last_used_at,
        created_at: key.created_at,
      },
      rate_limit: {
        // Les chiffres viennent de lib/api-keys/rate-limit.ts ; on les expose
        // ici pour que le client puisse adapter sa cadence sans devoir
        // deviner.
        tier: key.tier,
        per_tier_documented: {
          sandbox: "60 r/min",
          b2b_starter: "500 r/s",
          b2b_pro: "5000 r/s",
          b2b_enterprise: "20000 r/s (sur devis)",
        },
      },
    },
    {
      request_id,
      license: "b2b",
      headers,
      tier: key.tier,
    },
  );
}
