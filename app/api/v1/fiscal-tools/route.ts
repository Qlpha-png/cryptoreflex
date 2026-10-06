/**
 * GET /api/v1/fiscal-tools
 * ------------------------
 * Version B2B de `/api/public/fiscal-tools`.
 *   - `?country=FR|DE|...` : filtre par pays (ISO 3166-1 alpha-2).
 *
 * Auth : scope `public:read`.
 */

import { requireApiKey } from "@/lib/api-keys/auth";
import { successResponse, applicationError } from "@/lib/api-keys/response";
import fiscalToolsData from "@/data/fiscal-tools.json";
import { withOfficialLink } from "@/lib/platforms";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface FiscalRaw {
  _meta?: { lastUpdated?: string };
  tools?: Array<{ id: string; websiteUrl: string; affiliateUrl: string; country?: string; [k: string]: unknown }>;
}

export async function GET(req: Request): Promise<Response> {
  const auth = await requireApiKey(req, ["public:read"]);
  if (!auth.ok) return auth.response;
  const { key, request_id, headers } = auth;

  const url = new URL(req.url);
  const countryRaw = url.searchParams.get("country");
  let country: string | null = null;
  if (countryRaw) {
    if (!/^[A-Za-z]{2}$/.test(countryRaw)) {
      return applicationError(
        400,
        "INVALID_PARAMETER",
        "Le paramètre `country` doit être un code ISO 3166-1 alpha-2 (ex: FR, DE).",
        request_id,
      );
    }
    country = countryRaw.toUpperCase();
  }

  const raw = fiscalToolsData as unknown as FiscalRaw;
  // 06/10/2026 : affiliateUrl = site officiel sans relation rémunérée réelle (lib/partnerships.ts).
  const all = (raw.tools ?? []).map(withOfficialLink);
  const tools = country
    ? all.filter((t) => (t.country || "").toUpperCase() === country)
    : all;

  return successResponse(
    {
      last_updated: raw._meta?.lastUpdated ?? null,
      country: country ?? "ALL",
      tools,
    },
    {
      request_id,
      license: "b2b",
      headers,
      tier: key.tier,
      cacheControl: "private, max-age=60, s-maxage=300, stale-while-revalidate=600",
    },
  );
}
