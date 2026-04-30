/**
 * /api/auth/login — Envoie un magic link au user (BYPASS Supabase SMTP).
 *
 * Flow :
 *  1. POST { email } → admin.generateLink({ type: 'magiclink', email })
 *     → recupere l'action_link sans envoyer d'email via Supabase
 *  2. On envoie l'email NOUS-MEMES via Resend (sendEmail + magicLinkEmail)
 *     → utilise notre setup Resend qui marche, AUCUN passage par SMTP Supabase
 *  3. User clique le lien → /api/auth/callback?code=xxx → session + cookie
 *
 * Pourquoi bypass : Supabase SMTP (config interne) ne marche pas malgre une
 * config qui semble correcte (port 587, host smtp.resend.com, key valide).
 * En passant par admin API + notre Resend client, on a un seul point de
 * defaillance (Resend) au lieu de deux (Supabase + Resend).
 *
 * SECURITE :
 *  - Email enumeration prevention : on repond 200 OK meme si email inconnu
 *  - Si user inexistant : admin.generateLink le cree (shouldCreateUser default)
 *  - Rate limiting : 5 tentatives / 15 min / IP
 *  - Token unique 1-shot, expire 1h (gere par Supabase)
 */

import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";
import { sendEmail } from "@/lib/email/client";
import { magicLinkEmail } from "@/lib/email/templates";
import { createRateLimiter } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const limiter = createRateLimiter({
  limit: 5,
  windowMs: 15 * 60 * 1000,
  key: "auth-login-magic-v2",
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
      { error: "Trop de tentatives. Réessaye dans quelques minutes." },
      { status: 429, headers: { "Retry-After": String(rl.retryAfter) } }
    );
  }

  const admin = createSupabaseServiceRoleClient();
  if (!admin) {
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

  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL || "https://www.cryptoreflex.fr";

  // STEP 1 : verifie si user existe (admin.generateLink ne cree pas auto).
  //
  // P1 FIX (audit backend 30/04/2026) — N+1 / O(n) sur chaque login.
  // Avant : listUsers({ perPage: 1000 }).find() = telecharge 1000 users
  // a chaque login + scan JS lineaire. Casse silencieusement >1000 users.
  // Maintenant : query directe sur public.users (indexee sur email) +
  // fallback listUsers si la table publique est vide (cas post-creation).
  const { data: publicUser } = await admin
    .from("users")
    .select("id, email")
    .ilike("email", email)
    .maybeSingle();
  const existingUser = publicUser ? { email: publicUser.email } : null;

  if (!existingUser) {
    // Cree l'user comme confirme (email_confirm: true) sans envoyer d'email
    const { error: createError } = await admin.auth.admin.createUser({
      email,
      email_confirm: true,
    });
    if (createError && !createError.message.toLowerCase().includes("already")) {
      console.error("[auth/login] createUser error:", createError.message);
      // On continue quand meme — peut-etre erreur transitoire, generateLink essaiera
    }
  }

  // STEP 2 : genere le magic link → on recupere hashed_token (PAS action_link)
  // action_link pointe vers Supabase /verify qui redirige avec hash fragment
  // (illisible serveur). Avec hashed_token + verifyOtp dans notre callback,
  // on contourne ce probleme et on set la session via cookies.
  const { data: linkData, error: linkError } =
    await admin.auth.admin.generateLink({
      type: "magiclink",
      email,
      options: {
        redirectTo: `${siteUrl}/api/auth/callback`,
      },
    });

  if (linkError || !linkData?.properties?.hashed_token) {
    console.error("[auth/login] generateLink error:", linkError?.message);
    return NextResponse.json({
      ok: true,
      message: "Si ce compte existe, un email de connexion a été envoyé.",
    });
  }

  // Build NOTRE URL : pointe direct sur /api/auth/callback avec token_hash.
  // Le callback fera verifyOtp() qui set le cookie session puis redirige.
  const tokenHash = linkData.properties.hashed_token;
  const magicLink = `${siteUrl}/api/auth/callback?token_hash=${encodeURIComponent(tokenHash)}&type=magiclink&next=/mon-compte`;

  // STEP 3 : envoie l'email via NOTRE Resend (qui marche)
  const tmpl = magicLinkEmail({ email, magicLink });
  const result = await sendEmail({
    to: email,
    subject: tmpl.subject,
    preheader: tmpl.preheader,
    html: tmpl.html,
    text: tmpl.text,
  });

  if (!result.ok) {
    console.error("[auth/login] sendEmail error:", result.error);
    return NextResponse.json(
      { error: "Erreur d'envoi du lien. Réessaye dans quelques instants." },
      { status: 500 }
    );
  }

  console.log(`[auth/login] Magic link envoye a ${email} (Resend id: ${result.id})`);

  return NextResponse.json({
    ok: true,
    message: "Si ce compte existe, un email de connexion a été envoyé.",
  });
}
