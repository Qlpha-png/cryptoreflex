/**
 * /api/admin/debug-magic-link — DEBUG : retourne un magic link sans envoyer email.
 *
 * Permet de tester le flow callback en bypassant l'email.
 *
 * Usage curl :
 *   curl -X POST 'https://www.cryptoreflex.fr/api/admin/debug-magic-link' \
 *     -H 'X-Admin-Secret: <CRON_SECRET>' \
 *     -H 'Content-Type: application/json' \
 *     -d '{"email":"user@example.com"}'
 *
 * Renvoie : { magicLink: "https://www.cryptoreflex.fr/api/auth/callback?token_hash=...&type=magiclink" }
 */

import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function verifyAdminSecret(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const provided = req.headers.get("x-admin-secret") ?? "";
  if (provided.length !== secret.length) return false;
  return timingSafeEqual(Buffer.from(provided), Buffer.from(secret));
}

export async function POST(req: NextRequest) {
  if (!verifyAdminSecret(req)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const admin = createSupabaseServiceRoleClient();
  if (!admin) {
    return NextResponse.json({ error: "Service role missing" }, { status: 503 });
  }

  let body: { email?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const email = body.email?.trim().toLowerCase();
  if (!email) {
    return NextResponse.json({ error: "Email requis" }, { status: 400 });
  }

  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL || "https://www.cryptoreflex.fr";

  const { data: linkData, error: linkError } =
    await admin.auth.admin.generateLink({
      type: "magiclink",
      email,
      options: { redirectTo: `${siteUrl}/api/auth/callback` },
    });

  if (linkError) {
    return NextResponse.json(
      { error: "generateLink error: " + linkError.message },
      { status: 500 }
    );
  }

  const tokenHash = linkData?.properties?.hashed_token;
  if (!tokenHash) {
    return NextResponse.json(
      { error: "No hashed_token in response", properties: linkData?.properties },
      { status: 500 }
    );
  }

  const ourLink = `${siteUrl}/api/auth/callback?token_hash=${encodeURIComponent(tokenHash)}&type=magiclink&next=/mon-compte`;
  const supabaseLink = linkData?.properties?.action_link;

  return NextResponse.json({
    ourLink,
    supabaseLink,
    properties: linkData?.properties,
  });
}
