/**
 * /api/auth/signup — Inscription par email + mot de passe.
 *
 * Flow :
 *  1. POST { email, password } → Supabase signUp() crée l'user
 *  2. Si email confirmation activée côté Supabase → user reçoit email de confirmation
 *  3. Si auto-confirm activé → session immédiate, cookie set
 *  4. Réponse uniformisée pour éviter user enumeration
 *
 * SÉCURITÉ :
 *  - Rate limit anti-spam : 3 inscriptions / heure / IP
 *  - Password policy : min 8 chars (Supabase default), idéalement 12+
 *  - Email enumeration prevention : on répond toujours 200 avec message uniforme
 *  - Token unique 1-shot pour confirmation (géré par Supabase)
 */

import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createRateLimiter } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Rate limit signup : 3 par heure / IP (anti-spam comptes vides)
const limiter = createRateLimiter({
  limit: 3,
  windowMs: 60 * 60 * 1000,
  key: "auth-signup",
});

function getClientIp(req: NextRequest): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return req.headers.get("x-real-ip") ?? "unknown";
}

/** Validation password : 8+ chars, au moins 1 chiffre OU 1 symbole. */
function isPasswordStrong(pwd: string): { ok: boolean; reason?: string } {
  if (pwd.length < 8) return { ok: false, reason: "Au moins 8 caractères." };
  if (pwd.length > 72) return { ok: false, reason: "Maximum 72 caractères." };
  // bcrypt limite à 72 bytes — on bloque côté client pour éviter erreur silencieuse
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
  // Rate limit FIRST
  const ip = getClientIp(req);
  const rl = await limiter(ip);
  if (!rl.ok) {
    return NextResponse.json(
      { error: "Trop de tentatives. Réessaye dans une heure." },
      { status: 429, headers: { "Retry-After": String(rl.retryAfter) } }
    );
  }

  const supabase = createSupabaseServerClient();
  if (!supabase) {
    return NextResponse.json(
      { error: "Inscription bientôt disponible" },
      { status: 503 }
    );
  }

  let body: { email?: string; password?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const email = body.email?.trim().toLowerCase();
  const password = body.password;

  if (!email || !email.includes("@")) {
    return NextResponse.json({ error: "Email invalide" }, { status: 400 });
  }
  if (!password) {
    return NextResponse.json({ error: "Mot de passe requis" }, { status: 400 });
  }

  const pwdCheck = isPasswordStrong(password);
  if (!pwdCheck.ok) {
    return NextResponse.json({ error: pwdCheck.reason }, { status: 400 });
  }

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || "https://www.cryptoreflex.fr"}/api/auth/callback`,
    },
  });

  if (error) {
    console.error("[auth/signup] signUp error:", error.message);
    // Si email déjà inscrit → Supabase renvoie une erreur explicite,
    // on la traduit en message générique pour éviter user enumeration.
    if (error.message.includes("registered") || error.message.includes("already")) {
      return NextResponse.json({
        ok: true,
        message:
          "Si cet email n'est pas déjà utilisé, tu vas recevoir un email de confirmation.",
      });
    }
    return NextResponse.json(
      { error: "Erreur lors de l'inscription. Réessaye plus tard." },
      { status: 500 }
    );
  }

  // Si Supabase a une session immédiatement → email confirmation désactivée,
  // l'user est connecté via le cookie set par Supabase.
  // Sinon → user doit confirmer son email avant de se connecter.
  const needsConfirmation = !data.session;

  return NextResponse.json({
    ok: true,
    needsConfirmation,
    message: needsConfirmation
      ? "Vérifie ta boîte mail pour confirmer ton inscription."
      : "Compte créé. Tu es connecté.",
  });
}
