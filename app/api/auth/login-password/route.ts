/**
 * /api/auth/login-password — Connexion par email + mot de passe.
 *
 * Flow :
 *  1. POST { email, password } → supabase.auth.signInWithPassword()
 *  2. Si succès : on bind les cookies set par Supabase sur la NextResponse
 *     via applyCookies() (FIX cookies non propagés en Next 14 Route Handler)
 *  3. Réponse 200 ok → client redirect vers /mon-compte
 *
 * SÉCURITÉ (durci 2026-05-02 audit expert sécurité) :
 *  - Rate limit anti-brute force IP : 10 tentatives / 15 min / IP
 *    (avant : 30/15min — trop permissif, ~120 essais/h via rotation IP)
 *  - Rate limit per-email (anti-credential stuffing distribué) :
 *    5 tentatives / 15 min / email — bloque même si l'attaquant tourne ses IPs
 *  - Erreur uniformisée pour éviter user enumeration
 */

import { NextRequest, NextResponse } from "next/server";
import { createRouteHandlerClient } from "@/lib/supabase/route-handler";
import { createRateLimiter } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/ip";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ipLimiter = createRateLimiter({
  limit: 10,
  windowMs: 15 * 60 * 1000,
  key: "auth-login-password-ip-v3",
});

const emailLimiter = createRateLimiter({
  limit: 5,
  windowMs: 15 * 60 * 1000,
  key: "auth-login-password-email-v1",
});


export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  const rlIp = await ipLimiter(ip);
  if (!rlIp.ok) {
    return NextResponse.json(
      { error: "Trop de tentatives. Réessaye dans 15 minutes." },
      { status: 429, headers: { "Retry-After": String(rlIp.retryAfter) } }
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

  // 2e couche : rate limit par email (anti-credential-stuffing distribué).
  // Si l'attaquant tourne 1000 IPs mais cible 1 email, le 2e limiter le bloque.
  const rlEmail = await emailLimiter(`email:${email}`);
  if (!rlEmail.ok) {
    return NextResponse.json(
      { error: "Trop de tentatives. Réessaye dans 15 minutes." },
      { status: 429, headers: { "Retry-After": String(rlEmail.retryAfter) } }
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
