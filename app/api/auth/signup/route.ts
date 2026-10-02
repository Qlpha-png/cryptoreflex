/**
 * /api/auth/signup — Inscription « email d'abord », AVEC vérification de
 * l'email (Supabase SMTP contourné : l'email part via Resend).
 *
 * Flow :
 *  1. POST { email } (un éventuel `password` envoyé par un ancien client est ignoré)
 *  2. admin.createUser({ email, password: <aléatoire jetable>, email_confirm: false })
 *     → compte créé NON confirmé : impossible de s'y connecter tant que
 *       l'email n'est pas prouvé (cf. /api/auth/login-password).
 *  3. admin.generateLink({ type: "signup" }) → hashed_token
 *  4. Email Resend avec /api/auth/callback?token_hash=…&type=signup
 *     → verifyOtp confirme l'email + ouvre la session
 *     → /mon-compte/mot-de-passe : l'utilisateur choisit SON mot de passe.
 *  5. Réponse { needsConfirmation: true } → SignupForm affiche « vérifiez
 *     votre boîte mail ».
 *
 * SÉCURITÉ (audit 2026-10-01) — avant, le compte était créé « confirmé »
 * sans aucune preuve : n'importe qui pouvait s'inscrire avec l'email d'un
 * tiers (dont un email admin). Désormais :
 *  - Rate limit : 20 inscriptions / heure / IP + 5 emails d'auth / adresse / 24 h.
 *  - Email déjà inscrit → 409 « compte existant » (aucune tentative de
 *    connexion ici, pas d'oracle de mot de passe).
 *  - AUCUN mot de passe choisi avant la preuve de l'email : si un tiers
 *    inscrit l'adresse d'une victime et que celle-ci clique le lien, le tiers
 *    n'a rien pour se connecter (il ne connaît pas le mot de passe jetable).
 *  - Service role utilisé UNIQUEMENT côté serveur.
 */

import { NextRequest, NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";
import { createRateLimiter, authEmailRecipientLimiter } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/ip";
import { sendEmail } from "@/lib/email/client";
import { signupConfirmEmail } from "@/lib/email/templates";
import { randomPassword } from "@/lib/auth-guards";
import { allowedAuthNext } from "@/lib/safe-redirect";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const limiter = createRateLimiter({
  limit: 20,
  windowMs: 60 * 60 * 1000,
  key: "auth-signup-v2",
});


function isUserExistsError(message: string): boolean {
  const m = message.toLowerCase();
  return (
    m.includes("registered") ||
    m.includes("already") ||
    m.includes("exists") ||
    m.includes("duplicate")
  );
}

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  const rl = await limiter(ip);
  if (!rl.ok) {
    return NextResponse.json(
      { error: "Trop de tentatives. Réessayez dans une heure." },
      { status: 429, headers: { "Retry-After": String(rl.retryAfter) } }
    );
  }

  const admin = createSupabaseServiceRoleClient();

  if (!admin) {
    return NextResponse.json(
      { error: "Inscription temporairement indisponible." },
      { status: 503 }
    );
  }

  let body: { email?: unknown; next?: unknown } | null;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";

  if (!email || !email.includes("@")) {
    return NextResponse.json({ error: "Email invalide" }, { status: 400 });
  }

  // AUDIT 2026-10-02 — limite par DESTINATAIRE en plus de la limite IP :
  // 5 emails d'auth / adresse / 24 h (seau partagé login + signup + reset).
  // Vérifiée AVANT createUser : aucun compte créé si l'email ne partira pas.
  const rcpt = await authEmailRecipientLimiter(email);
  if (!rcpt.ok) {
    return NextResponse.json(
      {
        error:
          "Trop d'emails envoyés à cette adresse aujourd'hui. Vérifiez vos spams ou réessayez demain.",
      },
      { status: 429, headers: { "Retry-After": String(rcpt.retryAfter) } }
    );
  }

  // Mot de passe jetable : l'utilisateur choisit le sien APRÈS avoir prouvé
  // l'email (/mon-compte/mot-de-passe). Personne ne connaît celui-ci.
  const password = randomPassword();

  const existingAccountResponse = NextResponse.json(
    {
      error:
        "Cet email a déjà un compte. Allez sur /connexion pour vous connecter, ou utilisez « Mot de passe oublié ».",
    },
    { status: 409 }
  );

  // STEP 1 : créer le user NON confirmé via admin API
  const { data: createData, error: createError } =
    await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: false,
    });

  if (createError) {
    if (isUserExistsError(createError.message)) {
      // Compte existant : pas de tentative de connexion ici (sinon cette route
      // servirait à tester des mots de passe sans la limite par email de
      // /api/auth/login-password). L'utilisateur passe par /connexion.
      return existingAccountResponse;
    }

    Sentry.captureException(createError, {
      tags: { route: "auth/signup", stage: "createUser" },
      extra: { emailDomain: email.split("@")[1] ?? "unknown" },
      level: "error",
    });
    console.error("[auth/signup] createUser error:", createError.message);
    return NextResponse.json(
      { error: "Erreur lors de l'inscription. Réessayez dans quelques instants." },
      { status: 500 }
    );
  }

  const userId = createData?.user?.id;
  if (!userId) {
    return NextResponse.json(
      { error: "Erreur lors de la création du compte." },
      { status: 500 }
    );
  }

  // Échec après création → on supprime le compte pour permettre un nouvel essai.
  const rollback = async (stage: string, err: unknown) => {
    Sentry.captureException(err instanceof Error ? err : new Error(String(err)), {
      tags: { route: "auth/signup", stage },
      extra: { emailDomain: email.split("@")[1] ?? "unknown" },
      level: "error",
    });
    console.error(`[auth/signup] ${stage} failed:`, err);
    await admin.auth.admin.deleteUser(userId).catch(() => undefined);
    return NextResponse.json(
      { error: "Impossible d'envoyer l'email de confirmation. Réessayez dans quelques instants." },
      { status: 500 }
    );
  };

  // STEP 2 : lien de confirmation (hashed_token → verifyOtp dans le callback)
  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL || "https://www.cryptoreflex.fr";
  const { data: linkData, error: linkError } =
    await admin.auth.admin.generateLink({
      type: "signup",
      email,
      password,
      options: { redirectTo: `${siteUrl}/api/auth/callback` },
    });
  const tokenHash = linkData?.properties?.hashed_token;
  if (linkError || !tokenHash) {
    return rollback("generateLink", linkError ?? "no hashed_token");
  }
  // Reflex Cards : après le choix du mot de passe, retour au jeu (liste fermée, aucune redirection ouverte).
  const toGame = allowedAuthNext(body?.next);
  const afterPassword = toGame ? `/mon-compte/mot-de-passe?next=${encodeURIComponent(toGame)}` : "/mon-compte/mot-de-passe";
  const confirmLink = `${siteUrl}/api/auth/callback?token_hash=${encodeURIComponent(tokenHash)}&type=signup&next=${encodeURIComponent(afterPassword)}`;

  // STEP 3 : email via Resend
  const tmpl = signupConfirmEmail({ email, confirmLink });
  const sent = await sendEmail({
    to: email,
    subject: tmpl.subject,
    preheader: tmpl.preheader,
    html: tmpl.html,
    text: tmpl.text,
  });
  if (!sent.ok) {
    return rollback("sendEmail", sent.error ?? "unknown");
  }

  return NextResponse.json({
    ok: true,
    needsConfirmation: true,
    message: `Un lien de confirmation vient d'être envoyé à ${email}. Cliquez dessus pour activer votre compte, puis choisissez votre mot de passe.`,
  });
}
