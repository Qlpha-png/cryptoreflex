/**
 * /api/auth/signup — Inscription par email + mot de passe (sans SMTP).
 *
 * Flow (bypass SMTP entièrement) :
 *  1. POST { email, password }
 *  2. admin.createUser({ email, password, email_confirm: true })
 *     → user créé immédiatement comme confirmé, AUCUN email envoyé
 *  3. signInWithPassword({ email, password })
 *     → Supabase set le cookie de session (collecté par applyCookies)
 *  4. Réponse 200 → client redirect /mon-compte
 *
 * FIX cookies : le helper createRouteHandlerClient bind les cookies set par
 * Supabase sur la NextResponse explicitement, sinon Next 14 ne les propage
 * pas (le user pense etre connecte mais le cookie n'arrive jamais cote browser).
 *
 * SÉCURITÉ :
 *  - Rate limit : 20 inscriptions / heure / IP (large, anti-spam reel)
 *  - Si email existe deja → tente signInWithPassword. Si match → connecte.
 *    Sinon → message clair "compte existant, /connexion ou /mot-de-passe-oublie".
 *  - Service role utilise UNIQUEMENT pour createUser cote serveur.
 */

import { NextRequest, NextResponse } from "next/server";
import { createRouteHandlerClient } from "@/lib/supabase/route-handler";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";
import { createRateLimiter } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/ip";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const limiter = createRateLimiter({
  limit: 20,
  windowMs: 60 * 60 * 1000,
  key: "auth-signup-v2",
});


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
      { error: "Trop de tentatives. Réessaye dans une heure." },
      { status: 429, headers: { "Retry-After": String(rl.retryAfter) } }
    );
  }

  const client = createRouteHandlerClient(req);
  const admin = createSupabaseServiceRoleClient();

  if (!client || !admin) {
    return NextResponse.json(
      { error: "Inscription temporairement indisponible." },
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

  // STEP 1 : créer le user via admin API (bypass SMTP)
  const { data: createData, error: createError } =
    await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

  if (createError) {
    console.error("[auth/signup] createUser error:", createError.message);

    if (isUserExistsError(createError.message)) {
      // Tente login avec le password fourni (peut-etre meme pwd ou user a deja set son pwd)
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (!signInError) {
        return applyCookies(
          NextResponse.json({ ok: true, message: "Connexion réussie." })
        );
      }

      return NextResponse.json(
        {
          error:
            "Cet email a déjà un compte. Va sur /connexion pour te connecter, ou utilise « Mot de passe oublié ».",
        },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: `Erreur lors de l'inscription : ${createError.message}` },
      { status: 500 }
    );
  }

  if (!createData?.user) {
    return NextResponse.json(
      { error: "Erreur lors de la création du compte." },
      { status: 500 }
    );
  }

  // STEP 2 : user créé, on le connecte (signInWithPassword set les cookies)
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (signInError) {
    console.error("[auth/signup] signInWithPassword after create:", signInError.message);
    return NextResponse.json({
      ok: true,
      needsLogin: true,
      message: "Compte créé. Va sur /connexion pour te connecter.",
    });
  }

  // FIX critique : applique les cookies set par signInWithPassword sur la response
  return applyCookies(
    NextResponse.json({ ok: true, message: "Compte créé. Tu es connecté." })
  );
}
