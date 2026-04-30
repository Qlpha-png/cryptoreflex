/**
 * /api/auth/callback — Callback magic link / reset / OAuth Supabase.
 *
 * Supporte 2 flows distincts :
 *
 *  1. PKCE / OAuth : ?code=xxx → exchangeCodeForSession()
 *     Pour les futurs flows OAuth (Google, GitHub) ou PKCE custom.
 *
 *  2. OTP / Magic link / Recovery : ?token_hash=xxx&type=magiclink|recovery
 *     Pour les magic links et reset password generes via admin.generateLink().
 *     On utilise verifyOtp() qui accepte le token_hash directement.
 *
 * Pourquoi pas Supabase verify endpoint : Supabase /auth/v1/verify redirige
 * en mettant les tokens dans le HASH FRAGMENT (#access_token=...), illisible
 * cote serveur. Notre callback construit l'URL avec ?token_hash= en query
 * param et call verifyOtp() qui set la session via cookies.
 *
 * Apres succes : redirect vers `next` (default /mon-compte).
 *
 * SECURITE :
 *  - Header Referrer-Policy: no-referrer evite leak du token via referrer
 *  - Redirect 302 immediat vide l'URL bar → pas de leak via browser history
 *  - Token 1-shot consomme en transaction cote Supabase
 *  - Cookies session set via applyCookies (helper bulletproof Next 14)
 */

import { NextRequest, NextResponse } from "next/server";
import { createRouteHandlerClient } from "@/lib/supabase/route-handler";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type OtpType =
  | "magiclink"
  | "recovery"
  | "signup"
  | "invite"
  | "email"
  | "email_change";

const VALID_OTP_TYPES = new Set<OtpType>([
  "magiclink",
  "recovery",
  "signup",
  "invite",
  "email",
  "email_change",
]);

export async function GET(req: NextRequest) {
  const client = createRouteHandlerClient(req);
  if (!client) {
    return NextResponse.redirect(
      new URL("/connexion?error=service_unavailable", req.url)
    );
  }
  const { supabase, applyCookies } = client;

  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const tokenHash = url.searchParams.get("token_hash");
  const typeParam = url.searchParams.get("type");

  // P0 OPEN REDIRECT FIX (audit sécurité backend 30/04/2026) :
  // Avant : `next = url.searchParams.get("next") ?? "/mon-compte"` puis
  // `new URL(next, req.url)` — le constructeur URL accepte une URL absolue
  // comme premier arg et IGNORE la base. Donc `?next=https://evil.com` =
  // redirect off-site avec session déjà active = phishing parfait.
  //
  // Maintenant : on accepte UNIQUEMENT les chemins relatifs commençant par
  // `/` mais pas `//` (qui serait `//evil.com` = même bug). Tout le reste
  // tombe sur le défaut `/mon-compte`.
  const rawNext = url.searchParams.get("next") ?? "/mon-compte";
  const next =
    rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : "/mon-compte";

  let authError: string | null = null;

  if (code) {
    // FLOW 1 : PKCE / OAuth
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) authError = error.message;
  } else if (tokenHash && typeParam) {
    // FLOW 2 : OTP / Magic link / Recovery
    const type = typeParam as OtpType;
    if (!VALID_OTP_TYPES.has(type)) {
      console.error("[auth/callback] type OTP invalide:", typeParam);
      return NextResponse.redirect(
        new URL("/connexion?error=invalid_code", req.url)
      );
    }
    const { error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type,
    });
    if (error) authError = error.message;
  } else {
    return NextResponse.redirect(
      new URL("/connexion?error=missing_code", req.url)
    );
  }

  if (authError) {
    console.error("[auth/callback] auth error:", authError);
    return NextResponse.redirect(
      new URL("/connexion?error=invalid_code", req.url)
    );
  }

  // Redirect avec session cookies appliques + headers de securite
  const response = NextResponse.redirect(new URL(next, req.url));
  response.headers.set("Referrer-Policy", "no-referrer");
  response.headers.set("Cache-Control", "no-store, no-cache, must-revalidate");
  return applyCookies(response);
}
