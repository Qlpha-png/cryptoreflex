/**
 * /api/auth/update-password — Mise à jour du mot de passe (user authentifié).
 *
 * Cas d'usage :
 *  1. User vient du flow reset password (session créée par callback)
 *  2. User authentifié veut changer son password depuis /mon-compte
 *  3. User sans password (créé par Stripe) veut en définir un
 *
 * Flow :
 *  1. POST { password } → on vérifie session active
 *  2. supabase.auth.updateUser({ password })
 *  3. Supabase met à jour, session reste valide
 *
 * SÉCURITÉ :
 *  - Auth required (session cookie)
 *  - Rate limit : 5 tentatives / 15 min (anti-abus)
 *  - Password policy : min 8 chars, mélange lettres + chiffres/symboles
 */

import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createRateLimiter } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const limiter = createRateLimiter({
  limit: 5,
  windowMs: 15 * 60 * 1000,
  key: "auth-update-password",
});

function getClientIp(req: NextRequest): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return req.headers.get("x-real-ip") ?? "unknown";
}

function isPasswordStrong(pwd: string): { ok: boolean; reason?: string } {
  if (pwd.length < 8) return { ok: false, reason: "Au moins 8 caractères." };
  if (pwd.length > 72) return { ok: false, reason: "Maximum 72 caractères." };
  const hasLetter = /[a-zA-Z]/.test(pwd);
  const hasDigitOrSym = /[\d\W]/.test(pwd);
  if (!hasLetter || !hasDigitOrSym) {
    return {
      ok: false,
      reason: "Mélange lettres et chiffres ou symboles requis.",
    };
  }
  return { ok: true };
}

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  const rl = await limiter(ip);
  if (!rl.ok) {
    return NextResponse.json(
      { error: "Trop de tentatives. Réessaye plus tard." },
      { status: 429, headers: { "Retry-After": String(rl.retryAfter) } }
    );
  }

  const supabase = createSupabaseServerClient();
  if (!supabase) {
    return NextResponse.json(
      { error: "Service indisponible" },
      { status: 503 }
    );
  }

  // Vérifie session active
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { error: "Tu dois être connecté pour modifier ton mot de passe." },
      { status: 401 }
    );
  }

  let body: { password?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const password = body.password;
  if (!password) {
    return NextResponse.json({ error: "Mot de passe requis" }, { status: 400 });
  }

  const pwdCheck = isPasswordStrong(password);
  if (!pwdCheck.ok) {
    return NextResponse.json({ error: pwdCheck.reason }, { status: 400 });
  }

  const { error } = await supabase.auth.updateUser({ password });

  if (error) {
    console.error("[auth/update-password] updateUser error:", error.message);
    return NextResponse.json(
      { error: "Erreur lors de la mise à jour. Réessaye plus tard." },
      { status: 500 }
    );
  }

  return NextResponse.json({
    ok: true,
    message: "Mot de passe mis à jour.",
  });
}
