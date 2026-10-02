/**
 * /api/admin/set-password — Force-reset du password d'un user (admin only).
 *
 * Cas d'usage :
 *  - Founder/admin a perdu son password et SMTP est casse (pas de reset email)
 *  - Debug en dev : reset rapidement le password d'un user de test
 *
 * SECURITE :
 *  - AUDIT 2026-10-02 : secret DÉDIÉ `ADMIN_SET_PASSWORD_SECRET` (avant :
 *    CRON_SECRET, partagé avec GitHub Actions / Vercel crons → toute fuite
 *    d'un secret de cron permettait de prendre n'importe quel compte).
 *    Variable absente → route DÉSACTIVÉE (404). À ne définir que le temps
 *    d'une intervention, puis la retirer de Vercel.
 *  - Header X-Admin-Secret comparé en temps constant (safeCompare, longueur
 *    en octets : un header non-ASCII ne provoque plus de 500).
 *  - Rate limit : 5 calls / 15 min / IP
 *  - Service role utilise UNIQUEMENT cote serveur, jamais expose
 *
 * Usage curl :
 *   curl -X POST 'https://www.cryptoreflex.fr/api/admin/set-password' \
 *     -H 'X-Admin-Secret: <ADMIN_SET_PASSWORD_SECRET>' \
 *     -H 'Content-Type: application/json' \
 *     -d '{"email":"user@example.com","password":"NewPass123!"}'
 */

import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";
import { createRateLimiter, maskEmailForLog } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/ip";
import { safeCompare } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const limiter = createRateLimiter({
  limit: 5,
  windowMs: 15 * 60 * 1000,
  key: "admin-set-password",
});


function verifyAdminSecret(req: NextRequest, secret: string): boolean {
  const provided = req.headers.get("x-admin-secret") ?? "";
  return safeCompare(provided, secret);
}

const NOT_FOUND = () => NextResponse.json({ error: "Not found" }, { status: 404 });

export async function POST(req: NextRequest) {
  // Route désactivée tant que le secret dédié n'est pas défini (fail-closed).
  const secret = process.env.ADMIN_SET_PASSWORD_SECRET;
  if (!secret) return NOT_FOUND();

  const ip = getClientIp(req);
  const rl = await limiter(ip);
  if (!rl.ok) {
    return NextResponse.json(
      { error: "Trop de tentatives." },
      { status: 429, headers: { "Retry-After": String(rl.retryAfter) } }
    );
  }

  if (!verifyAdminSecret(req, secret)) {
    // 404 plutot que 401 pour ne pas reveler l'existence de la route
    return NOT_FOUND();
  }

  const admin = createSupabaseServiceRoleClient();
  if (!admin) {
    return NextResponse.json(
      { error: "Service role non configure" },
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

  if (!email || !email.includes("@") || !password || password.length < 8) {
    return NextResponse.json(
      { error: "Email valide + password 8+ chars requis" },
      { status: 400 }
    );
  }

  // Step 1 : trouver l'user par email
  // P1 FIX (audit backend 30/04/2026) — N+1 listUsers remplacé par query directe.
  const { data: publicUser, error: listError } = await admin
    .from("users")
    .select("id, email")
    // `.eq` : en ilike, « _ » et « % » sont des jokers (plusieurs lignes possibles).
    .eq("email", email)
    .maybeSingle();

  if (listError) {
    console.error("[admin/set-password] users query error:", listError.message);
    return NextResponse.json(
      { error: "Erreur interne (détail dans les logs serveur)" },
      { status: 500 }
    );
  }

  const user = publicUser ? { id: publicUser.id, email: publicUser.email } : null;

  if (!user) {
    return NextResponse.json(
      { error: "Aucun utilisateur trouvé pour cet email" },
      { status: 404 }
    );
  }

  // Step 2 : update le password + email_confirm pour etre sur
  const { error: updateError } = await admin.auth.admin.updateUserById(user.id, {
    password,
    email_confirm: true,
  });

  if (updateError) {
    console.error("[admin/set-password] updateUserById error:", updateError.message);
    return NextResponse.json(
      { error: "Erreur update: " + updateError.message },
      { status: 500 }
    );
  }

  console.log(`[admin/set-password] Password reset OK pour ${maskEmailForLog(email)} (user ${user.id})`);

  return NextResponse.json({
    ok: true,
    userId: user.id,
    message: `Password reset pour ${email}. Vous pouvez te connecter via /connexion.`,
  });
}
