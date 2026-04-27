/**
 * /api/admin/debug-auth — Retourne directement ce que getUser() voit en prod.
 *
 * Lit les cookies du request, appelle supabase.auth.getUser() avec, et retourne
 * tout en JSON pour debug.
 */

import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { timingSafeEqual } from "node:crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function verifyAdminSecret(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const provided = req.headers.get("x-admin-secret") ?? "";
  if (provided.length !== secret.length) return false;
  return timingSafeEqual(Buffer.from(provided), Buffer.from(secret));
}

export async function GET(req: NextRequest) {
  // Mode admin : retourne aussi les prefixes des secrets pour audit env vars.
  const isAdmin = verifyAdminSecret(req);

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  const cookies = req.cookies.getAll();
  const sessionCookie = cookies.find((c) => c.name.includes("auth-token"));

  if (!url || !anonKey) {
    return NextResponse.json({
      error: "env vars missing",
      hasUrl: !!url,
      hasAnon: !!anonKey,
    });
  }

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return req.cookies.getAll();
      },
      setAll() {
        // no-op for this debug endpoint
      },
    },
  });

  const { data, error } = await supabase.auth.getUser();

  return NextResponse.json({
    cookieNames: cookies.map((c) => c.name),
    hasSessionCookie: !!sessionCookie,
    sessionCookiePreview: sessionCookie
      ? sessionCookie.value.slice(0, 50) + "..."
      : null,
    sessionCookieLen: sessionCookie?.value.length ?? 0,
    user: data?.user
      ? {
          id: data.user.id,
          email: data.user.email,
          aud: data.user.aud,
        }
      : null,
    error: error
      ? {
          message: error.message,
          status: error.status,
          name: error.name,
        }
      : null,
    supabaseUrl: url,
    anonKeyPreview: anonKey.slice(0, 20) + "...",
    ...(isAdmin && {
      adminAudit: {
        anon: previewSecret(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
        service: previewSecret(process.env.SUPABASE_SERVICE_ROLE_KEY),
        stripeKey: previewSecret(process.env.STRIPE_SECRET_KEY),
        stripeWebhook: previewSecret(process.env.STRIPE_WEBHOOK_SECRET),
        cronSecret: previewSecret(process.env.CRON_SECRET),
        resendApi: previewSecret(process.env.RESEND_API_KEY),
        resendFrom: process.env.RESEND_FROM_EMAIL,
      },
    }),
  });
}

function previewSecret(s: string | undefined): {
  prefix: string;
  len: number;
  ok: boolean;
} {
  if (!s) return { prefix: "MISSING", len: 0, ok: false };
  return { prefix: s.slice(0, 12), len: s.length, ok: true };
}
