/**
 * /api/auth/login-password — Connexion par email + mot de passe.
 *
 * Flow :
 *  1. POST { email, password } → supabase.auth.signInWithPassword()
 *  2. Si succès : on bind les cookies set par Supabase sur la NextResponse
 *     via applyCookies() (FIX cookies non propagés en Next 14 Route Handler)
 *  3. Réponse 200 ok → client redirect vers /mon-compte
 *
 * SÉCURITÉ :
 *  - Rate limit anti-brute force : 30 tentatives / 15 min / IP
 *  - Erreur uniformisée pour éviter user enumeration
 */

import { NextRequest, NextResponse } from "next/server";
import { createRouteHandlerClient } from "@/lib/supabase/route-handler";
import { createRateLimiter } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const limiter = createRateLimiter({
  limit: 30,
  windowMs: 15 * 60 * 1000,
  key: "auth-login-password-v2",
});

function getClientIp(req: NextRequest): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return req.headers.get("x-real-ip") ?? "unknown";
}

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  const rl = await limiter(ip);
  if (!rl.ok) {
    return NextResponse.json(
      { error: "Trop de tentatives. Réessaye dans 15 minutes." },
      { status: 429, headers: { "Retry-After": String(rl.retryAfter) } }
    );
  }

  const client = createRouteHandlerClient(req);
  if (!client) {
    return NextResponse.json(
      { error: "Connexion bientôt disponible" },
      { status: 503 }
    );
  }
  const { supabase, applyCookies } = client;

  let body: { email?: string; password?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const email = body.email?.trim().toLowerCase();
  const password = body.password;

  if (!email || !email.includes("@") || !password) {
    return NextResponse.json(
      { error: "Email et mot de passe requis" },
      { status: 400 }
    );
  }

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    console.error("[auth/login-password] signInWithPassword error:", error.message);
    return NextResponse.json(
      { error: "Identifiants invalides." },
      { status: 401 }
    );
  }

  // FIX critique : applique les cookies set par signInWithPassword sur la response.
  // Sans ça, le cookie session reste cote serveur et le navigateur ne le recoit jamais.
  return applyCookies(NextResponse.json({ ok: true }));
}
