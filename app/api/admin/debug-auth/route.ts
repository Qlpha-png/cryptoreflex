/**
 * /api/admin/debug-auth — Retourne directement ce que getUser() voit en prod.
 *
 * Lit les cookies du request, appelle supabase.auth.getUser() avec, et retourne
 * tout en JSON pour debug.
 */

import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
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
  });
}
