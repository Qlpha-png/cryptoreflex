/**
 * lib/api-keys/response.ts — Helpers de réponse normalisée pour `/api/v1/*`.
 *
 * Toute réponse de succès passe par `successResponse()` :
 *   - Applique le guard PSAN sur le payload (output-guard.ts)
 *   - Ajoute `_meta.{license, source, request_id, pagination?}`
 *   - Propage les headers rate limit + X-Request-Id
 *   - Force `Cache-Control: no-store` pour endpoints `me/*` (RGPD)
 *
 * Toute réponse d'erreur applicative (post-auth, ex 400 validation) passe par
 * `applicationError()`. Les erreurs d'auth sont déjà gérées par le middleware
 * `requireApiKey()`.
 */

import { guardOutput } from "./output-guard";
import type { ApiErrorBody, ApiSuccessBody } from "./types";

const META_LICENSE_PUBLIC = "CC-BY-4.0";
const META_LICENSE_B2B = "Cryptoreflex B2B API Subscription";
const META_SOURCE = "cryptoreflex.fr";

interface SuccessOptions {
  request_id: string;
  /** "public" pour les endpoints publics élargis, "b2b" pour les `me/*`. */
  license: "public" | "b2b";
  /** Headers rate limit / autres à propager. */
  headers?: Record<string, string>;
  /** Pagination metadata si applicable. */
  pagination?: ApiSuccessBody<unknown>["_meta"]["pagination"];
  /** Cache-Control. Default "no-store" pour `me/*`, public pour catalogue. */
  cacheControl?: string;
  /** HTTP status, default 200. */
  status?: number;
}

export function successResponse<T>(
  data: T,
  opts: SuccessOptions,
): Response {
  // PSAN guard — strippe ou bloque si champ interdit (recommendation, signal…).
  const guard = guardOutput(data);
  if (!guard.ok) {
    // En prod, fail-closed.
    return applicationError(
      500,
      "INTERNAL_COMPLIANCE_GUARD",
      "Erreur interne — réponse non conforme. L'incident a été loggé.",
      opts.request_id,
    );
  }

  const body: ApiSuccessBody<T> = {
    ok: true,
    data,
    _meta: {
      license: opts.license === "public" ? META_LICENSE_PUBLIC : META_LICENSE_B2B,
      source: META_SOURCE,
      request_id: opts.request_id,
      pagination: opts.pagination,
    },
  };

  return new Response(JSON.stringify(body), {
    status: opts.status ?? 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "X-Request-Id": opts.request_id,
      "Cache-Control":
        opts.cacheControl ??
        (opts.license === "public"
          ? "public, max-age=60, s-maxage=300, stale-while-revalidate=600"
          : "no-store"),
      ...(opts.headers ?? {}),
    },
  });
}

export function applicationError(
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
      license: META_LICENSE_B2B,
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
