/**
 * /api/auth/login — Envoie un magic link au user.
 *
 * Flow :
 *  1. POST { email } → on appelle supabase.auth.signInWithOtp()
 *  2. Supabase envoie un email avec un magic link unique (TTL 1h)
 *  3. User clique → atterrit sur /api/auth/callback?code=xxx
 *  4. Callback échange le code contre une session → cookie de session set
 *  5. Redirect vers /mon-compte
 *
 * SÉCURITÉ :
 *  - Email enumeration prevention : on répond toujours 200 OK même si email
 *    inconnu (Supabase signInWithOtp gère ça nativement avec shouldCreateUser=true)
 *  - Rate limiting : à ajouter via Upstash Ratelimit (5 tentatives / 15 min / IP)
 *  - Token unique 1-shot, expire 1h (configuré côté Supabase Auth)
 */

import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const supabase = createSupabaseServerClient();
  if (!supabase) {
    return NextResponse.json(
      { error: "Connexion bientôt disponible" },
      { status: 503 }
    );
  }

  let body: { email?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const email = body.email?.trim().toLowerCase();
  if (!email || !email.includes("@")) {
    return NextResponse.json({ error: "Email invalide" }, { status: 400 });
  }

  // TODO : ajouter rate limiting Upstash Ratelimit (5 / 15min / IP+email)
  // import { Ratelimit } from "@upstash/ratelimit";
  // const { success } = await ratelimit.limit(`auth:${ip}|${sha256(email)}`);
  // if (!success) return NextResponse.json({ error: "Trop de tentatives" }, { status: 429 });

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || "https://www.cryptoreflex.fr"}/api/auth/callback`,
      shouldCreateUser: true, // crée le user si inexistant (utile pour Pro acheté avant compte)
    },
  });

  if (error) {
    console.error("[auth/login] signInWithOtp error:", error.message);
    // On masque l'erreur exacte pour éviter email enumeration
  }

  // Réponse uniformisée (success même si email inconnu — anti-enumeration)
  return NextResponse.json({
    ok: true,
    message: "Si ce compte existe, un email de connexion a été envoyé.",
  });
}
