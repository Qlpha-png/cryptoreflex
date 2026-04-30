/**
 * /api/auth/reset-password — Demande de reset password (BYPASS Supabase SMTP).
 *
 * Flow :
 *  1. POST { email } → admin.generateLink({ type: 'recovery', email })
 *     → recupere l'action_link (recovery), AUCUN email envoye via Supabase
 *  2. On envoie l'email NOUS-MEMES via Resend + resetPasswordEmail template
 *  3. User clique → /api/auth/callback?next=/mon-compte/mot-de-passe
 *  4. Sur /mon-compte/mot-de-passe → definit nouveau pwd
 *
 * SECURITE :
 *  - Email enumeration prevention : reponse uniforme meme si email inconnu
 *  - Si user inexistant : on ne genere pas de link mais on repond comme si
 *  - Rate limit : 3 demandes / heure / IP (anti-spam)
 */

import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";
import { sendEmail } from "@/lib/email/client";
import { resetPasswordEmail } from "@/lib/email/templates";
import { createRateLimiter } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const limiter = createRateLimiter({
  limit: 3,
  windowMs: 60 * 60 * 1000,
  key: "auth-reset-password-v2",
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

  const admin = createSupabaseServiceRoleClient();
  if (!admin) {
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

  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL || "https://www.cryptoreflex.fr";

  // STEP 1 : verifie si user existe (sinon on repond pareil mais on n'envoie rien)
  // P1 FIX (audit backend 30/04/2026) — N+1 sur chaque reset, voir login/route.ts.
  const { data: publicUser } = await admin
    .from("users")
    .select("id, email")
    .ilike("email", email)
    .maybeSingle();
  const existingUser = publicUser ? { email: publicUser.email } : null;

  // Reponse uniforme pour eviter user enumeration
  const uniformResponse = NextResponse.json({
    ok: true,
    message: "Si ce compte existe, un email de réinitialisation a été envoyé.",
  });

  if (!existingUser) {
    // Pas de user → on log mais on repond pareil (anti-enumeration)
    console.log(`[auth/reset-password] Email inconnu : ${email} (no-op)`);
    return uniformResponse;
  }

  // STEP 2 : genere le recovery link → recupere hashed_token (cf /api/auth/login
  // pour explication : action_link supabase verify utilise hash fragment illisible
  // serveur, donc on construit notre URL avec token_hash + verifyOtp dans le callback)
  const { data: linkData, error: linkError } =
    await admin.auth.admin.generateLink({
      type: "recovery",
      email,
      options: {
        redirectTo: `${siteUrl}/api/auth/callback`,
      },
    });

  if (linkError || !linkData?.properties?.hashed_token) {
    console.error("[auth/reset-password] generateLink error:", linkError?.message);
    return uniformResponse;
  }

  const tokenHash = linkData.properties.hashed_token;
  const resetLink = `${siteUrl}/api/auth/callback?token_hash=${encodeURIComponent(tokenHash)}&type=recovery&next=/mon-compte/mot-de-passe`;

  // STEP 3 : envoie l'email via Resend
  const tmpl = resetPasswordEmail({ email, resetLink });
  const result = await sendEmail({
    to: email,
    subject: tmpl.subject,
    preheader: tmpl.preheader,
    html: tmpl.html,
    text: tmpl.text,
  });

  if (!result.ok) {
    console.error("[auth/reset-password] sendEmail error:", result.error);
    // On retourne quand meme la reponse uniforme — l'user voit "email envoye"
    // meme si en realite il a pas marche. On log cote serveur pour alerter.
  } else {
    console.log(`[auth/reset-password] Reset link envoye a ${email} (Resend id: ${result.id})`);
  }

  return uniformResponse;
}
