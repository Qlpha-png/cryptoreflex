/**
 * lib/api-keys/auth.ts — Middleware d'authentification clé API B2B.
 *
 * Pipeline complet pour chaque appel `/api/v1/*` :
 *   1. Pre-auth IP rate limit (S-1) — bloque les attaques brute-force avant
 *      tout coût crypto.
 *   2. Extract Bearer token + parse format.
 *   3. Lookup `public_key` (O(1) via UNIQUE index).
 *   4. scrypt-verify(secret + pepper) constant-time.
 *   5. Status check (active / deprecated grace / revoked / expired).
 *   6. Scope check (si requis par la route).
 *   7. Rate limit par tier (Upstash KV).
 *   8. Audit log (`b2b.request` succès, ou `b2b.request.unauthorized` échec).
 *   9. Mark last_used_at (best-effort, async).
 *
 * Réponses d'erreur normalisées (S-2 : toujours 401 invalid_credentials, jamais
 * 404, pour ne pas fuir l'existence d'un keyId).
 *
 * Usage :
 *
 *   import { requireApiKey } from "@/lib/api-keys/auth";
 *
 *   export const runtime = "nodejs";
 *   export const preferredRegion = ["fra1"]; // C-5 — RGPD UE
 *
 *   export async function GET(req: Request) {
 *     const auth = await requireApiKey(req, ["user:portfolio:read"]);
 *     if (!auth.ok) return auth.response; // 401 / 403 / 429
 *     const { key, request_id } = auth;
 *     // ... handler logic
 *   }
 */

import {
  extractBearerToken,
  parseSecretKey,
} from "./format";
import { verifySecret } from "./hash";
import { hasAllScopes } from "./scopes";
import {
  getApiKeyByPublicKey,
  isApiKeyServable,
  markApiKeyUsed,
} from "./db";
import { checkPreAuthIpQuota } from "./ip-pre-rl";
import { checkApiKeyRateLimit, rateLimitHeaders } from "./rate-limit";
import { logAudit, newRequestId, extractRequestMeta } from "./audit";
import type {
  ApiKeyRecord,
  ApiKeyScope,
  ApiErrorBody,
} from "./types";

const META_LICENSE_DEFAULT = "Cryptoreflex B2B API Subscription";
const META_SOURCE = "cryptoreflex.fr";

interface AuthSuccess {
  ok: true;
  key: ApiKeyRecord;
  request_id: string;
  /** Headers à propager dans la réponse (rate limit + request id). */
  headers: Record<string, string>;
}

interface AuthFailure {
  ok: false;
  response: Response;
  request_id: string;
}

export type AuthResult = AuthSuccess | AuthFailure;

function errorResponse(
  status: number,
  code: string,
  message: string,
  request_id: string,
  hint?: string,
  extraHeaders?: Record<string, string>,
): Response {
  const body: ApiErrorBody = {
    ok: false,
    error: { code, message, hint },
    _meta: {
      license: META_LICENSE_DEFAULT,
      source: META_SOURCE,
      request_id,
    },
  };
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "X-Request-Id": request_id,
      "Cache-Control": "no-store",
      ...(extraHeaders ?? {}),
    },
  });
}

/**
 * Valide la clé API du caller. Retourne soit la clé authentifiée + headers,
 * soit une Response prête à renvoyer.
 */
export async function requireApiKey(
  req: Request,
  requiredScopes: readonly ApiKeyScope[] = [],
): Promise<AuthResult> {
  const request_id = newRequestId();
  const meta = extractRequestMeta(req);

  /* ---------- 1) Pre-auth IP quota (S-1) ---------- */
  const preAuth = await checkPreAuthIpQuota(meta.ip);
  if (!preAuth.ok) {
    // On NE log PAS dans audit_log (volume potentiellement énorme côté attaque) ;
    // Sentry / Vercel logs récupèrent ça via console.warn.
    console.warn(
      `[api-keys/auth] pre-auth IP quota hit ip=${meta.ip} request_id=${request_id}`,
    );
    return {
      ok: false,
      request_id,
      response: errorResponse(
        429,
        "TOO_MANY_REQUESTS",
        "Trop de tentatives d'authentification. Réessaie dans quelques instants.",
        request_id,
        "Tu peux ralentir tes appels ou contacter le support si le problème persiste.",
        { "Retry-After": String(preAuth.retryAfter) },
      ),
    };
  }

  /* ---------- 2) Extract + parse token ---------- */
  const raw = extractBearerToken(req.headers.get("authorization"));
  if (!raw) {
    return {
      ok: false,
      request_id,
      response: errorResponse(
        401,
        "MISSING_CREDENTIALS",
        "Clé API manquante. Ajoute le header `Authorization: Bearer cr_sk_...`.",
        request_id,
      ),
    };
  }

  const parsed = parseSecretKey(raw);
  if (!parsed) {
    // Format invalide → on log et on uniformise la réponse (S-2).
    await logUnauthorized(meta, request_id, "INVALID_FORMAT");
    return {
      ok: false,
      request_id,
      response: invalidCredentials(request_id),
    };
  }

  /* ---------- 3) Lookup ---------- */
  const key = await getApiKeyByPublicKey(parsed.public_key);
  if (!key) {
    await logUnauthorized(meta, request_id, "KEY_NOT_FOUND", {
      public_key: parsed.public_key,
    });
    return {
      ok: false,
      request_id,
      response: invalidCredentials(request_id),
    };
  }

  /* ---------- 4) Verify secret ---------- */
  const verify = await verifySecret(parsed.secret, key.secret_hash);
  if (!verify.ok) {
    await logUnauthorized(meta, request_id, "BAD_SECRET", {
      api_key_id: key.id,
    });
    return {
      ok: false,
      request_id,
      response: invalidCredentials(request_id),
    };
  }

  /* ---------- 5) Status check ---------- */
  const servable = isApiKeyServable(key);
  if (!servable.ok) {
    await logAudit({
      user_id: key.user_id,
      event: "b2b.request.unauthorized",
      ip: meta.ip,
      user_agent: meta.user_agent,
      metadata: {
        request_id,
        api_key_id: key.id,
        reason: servable.reason,
      },
    });
    return {
      ok: false,
      request_id,
      response: errorResponse(
        401,
        "KEY_INACTIVE",
        "Cette clé n'est plus active.",
        request_id,
        servable.reason === "deprecated_grace_over"
          ? "La période de grâce est dépassée. Génère une nouvelle clé."
          : servable.reason === "expired" || servable.reason === "expired_natural"
            ? "Cette clé a expiré. Crée une nouvelle clé dans ton dashboard."
            : "Cette clé a été révoquée.",
      ),
    };
  }

  /* ---------- 6) Scope check ---------- */
  if (requiredScopes.length > 0) {
    if (!hasAllScopes(key.scopes, requiredScopes)) {
      await logAudit({
        user_id: key.user_id,
        event: "b2b.request.forbidden",
        ip: meta.ip,
        user_agent: meta.user_agent,
        metadata: {
          request_id,
          api_key_id: key.id,
          required: requiredScopes,
          have: key.scopes,
        },
      });
      return {
        ok: false,
        request_id,
        response: errorResponse(
          403,
          "INSUFFICIENT_SCOPE",
          "Cette clé n'a pas les autorisations nécessaires pour cet endpoint.",
          request_id,
          `Scopes requis : ${requiredScopes.join(", ")}.`,
        ),
      };
    }
  }

  /* ---------- 7) Rate limit par tier ---------- */
  const rl = await checkApiKeyRateLimit(key.id, key.tier);
  const rlHeaders = rateLimitHeaders(rl);
  if (!rl.ok) {
    await logAudit({
      user_id: key.user_id,
      event: "b2b.rate_limit_hit",
      ip: meta.ip,
      user_agent: meta.user_agent,
      metadata: {
        request_id,
        api_key_id: key.id,
        tier: key.tier,
      },
    });
    return {
      ok: false,
      request_id,
      response: errorResponse(
        429,
        "RATE_LIMIT_EXCEEDED",
        "Quota dépassé pour cette clé.",
        request_id,
        "Patiente, ralentis tes appels, ou passe à un tier supérieur.",
        rlHeaders,
      ),
    };
  }

  /* ---------- 8) Audit succès ---------- */
  await logAudit({
    user_id: key.user_id,
    event: "b2b.request",
    ip: meta.ip,
    user_agent: meta.user_agent,
    metadata: {
      request_id,
      api_key_id: key.id,
      tier: key.tier,
      method: req.method,
      path: new URL(req.url).pathname,
    },
  });

  /* ---------- 9) markApiKeyUsed (fire & forget) ---------- */
  void markApiKeyUsed(key.id, meta.ip);

  return {
    ok: true,
    key,
    request_id,
    headers: { ...rlHeaders, "X-Request-Id": request_id },
  };
}

function invalidCredentials(request_id: string): Response {
  return errorResponse(
    401,
    "INVALID_CREDENTIALS",
    "Clé API invalide ou inactive.",
    request_id,
    "Vérifie ton header Authorization ou crée une nouvelle clé sur /mon-compte/dev.",
  );
}

async function logUnauthorized(
  meta: { ip: string | null; user_agent: string | null },
  request_id: string,
  reason: string,
  extra?: Record<string, unknown>,
): Promise<void> {
  await logAudit({
    user_id: null, // pas authentifié
    event: "b2b.request.unauthorized",
    ip: meta.ip,
    user_agent: meta.user_agent,
    metadata: { request_id, reason, ...(extra ?? {}) },
  });
}
