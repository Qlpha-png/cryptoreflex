/**
 * /api/auth/callback — Callback du magic link Supabase.
 *
 * Quand le user clique sur le magic link reçu par email :
 *   https://www.cryptoreflex.fr/api/auth/callback?code=xxx
 *
 * 1. On échange le code contre une session (exchangeCodeForSession)
 * 2. Supabase set le cookie de session (httpOnly, secure, sameSite=lax)
 * 3. On redirect vers /mon-compte (ou /pro/welcome pour les nouveaux abonnés)
 *
 * SÉCURITÉ :
 *  - Header `Referrer-Policy: no-referrer` évite que le code leak via referrer
 *  - Redirect 302 immédiat vide l'URL bar → pas de leak via browser history
 *  - Code 1-shot consommé en transaction côté Supabase
 */

import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const supabase = createSupabaseServerClient();
  if (!supabase) {
    return NextResponse.redirect(
      new URL("/connexion?error=service_unavailable", req.url)
    );
  }

  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const next = url.searchParams.get("next") ?? "/mon-compte";

  if (!code) {
    return NextResponse.redirect(new URL("/connexion?error=missing_code", req.url));
  }

  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    console.error("[auth/callback] exchangeCodeForSession error:", error.message);
    return NextResponse.redirect(
      new URL("/connexion?error=invalid_code", req.url)
    );
  }

  // Redirect avec headers de sécurité
  const response = NextResponse.redirect(new URL(next, req.url));
  response.headers.set("Referrer-Policy", "no-referrer");
  response.headers.set("Cache-Control", "no-store, no-cache, must-revalidate");
  return response;
}
