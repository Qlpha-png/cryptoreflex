/**
 * /api/auth/reset-password — Demande de reset password.
 *
 * Flow :
 *  1. POST { email } → supabase.auth.resetPasswordForEmail()
 *  2. Supabase envoie email avec lien (TTL 1h) → /api/auth/callback?code=xxx
 *  3. Callback échange code → session active
 *  4. User redirigé vers /mon-compte/mot-de-passe pour définir nouveau pwd
 *
 * SÉCURITÉ :
 *  - Rate limit : 3 demandes / heure / IP (anti-spam)
 *  - Email enumeration prevention : réponse uniforme même si email inconnu
 */

import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createRateLimiter } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const limiter = createRateLimiter({
  limit: 3,
  windowMs: 60 * 60 * 1000,
  key: "auth-reset-password",
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
      { error: "Trop de tentatives. Réessaye dans une heure." },
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

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || "https://www.cryptoreflex.fr"}/api/auth/callback?next=/mon-compte/mot-de-passe`,
  });

  if (error) {
    console.error("[auth/reset-password] resetPasswordForEmail error:", error.message);
    // On masque l'erreur pour éviter user enumeration
  }

  // Réponse uniforme (success même si email inconnu)
  return NextResponse.json({
    ok: true,
    message: "Si ce compte existe, un email de réinitialisation a été envoyé.",
  });
}
