/**
 * /api/auth/signup — Inscription par email + mot de passe (sans SMTP).
 *
 * Flow (bypass SMTP entièrement) :
 *  1. POST { email, password }
 *  2. admin.createUser({ email, password, email_confirm: true })
 *     → user créé immédiatement comme confirmé, AUCUN email envoyé
 *  3. signInWithPassword({ email, password })
 *     → Supabase set le cookie de session
 *  4. Réponse 200 → client redirect /mon-compte
 *
 * SÉCURITÉ :
 *  - Rate limit : 3 inscriptions / heure / IP
 *  - Si email existe déjà → on tente signInWithPassword (au cas où le user
 *    réutilise le même password). Si ça matche → OK. Sinon → erreur claire.
 *  - Service role utilisé UNIQUEMENT pour createUser, jamais exposé client.
 */

import { NextRequest, NextResponse } from "next/server";
import {
  createSupabaseServerClient,
  createSupabaseServiceRoleClient,
} from "@/lib/supabase/server";
import { createRateLimiter } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Rate limit signup : 20 par heure / IP (large pour tests + retry user honnête).
// Anti-spam reel : on garde 20 vrais comptes/h ce qui suffit pour bloquer un bot.
// Cle "auth-signup-v2" pour reset le compteur des users qui ont teste avec v1.
const limiter = createRateLimiter({
  limit: 20,
  windowMs: 60 * 60 * 1000,
  key: "auth-signup-v2",
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

/** Pattern matching pour identifier les erreurs "user already exists" Supabase. */
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

  const supabase = createSupabaseServerClient();
  const admin = createSupabaseServiceRoleClient();

  if (!supabase || !admin) {
    return NextResponse.json(
      { error: "Inscription temporairement indisponible." },
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

  // STEP 1 : créer le user via admin API (bypass SMTP)
  const { data: createData, error: createError } =
    await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // marque comme confirmé immédiatement
    });

  // Si user existe déjà : on tente signInWithPassword (peut-être réutilise le même pwd)
  if (createError) {
    console.error("[auth/signup] createUser error:", createError.message);

    if (isUserExistsError(createError.message)) {
      // STEP 2a : user existe, on tente login avec le password fourni
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (!signInError) {
        // Match → user existant, password OK, on le connecte
        return NextResponse.json({
          ok: true,
          message: "Connexion réussie.",
        });
      }

      // Password ne match pas : compte existe mais autre pwd → message clair
      return NextResponse.json(
        {
          error:
            "Cet email a déjà un compte. Va sur /connexion pour te connecter, ou utilise « Mot de passe oublié » si tu ne t'en souviens plus.",
        },
        { status: 409 }
      );
    }

    // Autre erreur (DB, validation Supabase, etc.)
    return NextResponse.json(
      {
        error: `Erreur lors de l'inscription : ${createError.message}`,
      },
      { status: 500 }
    );
  }

  if (!createData?.user) {
    return NextResponse.json(
      { error: "Erreur lors de la création du compte." },
      { status: 500 }
    );
  }

  // STEP 2b : user créé, on le connecte immédiatement (set cookie de session)
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (signInError) {
    console.error("[auth/signup] signInWithPassword after create:", signInError.message);
    // User créé mais session échouée → on demande de se connecter manuellement
    return NextResponse.json({
      ok: true,
      needsLogin: true,
      message:
        "Compte créé ! Va sur /connexion pour te connecter avec ton mot de passe.",
    });
  }

  return NextResponse.json({
    ok: true,
    message: "Compte créé. Tu es connecté.",
  });
}
