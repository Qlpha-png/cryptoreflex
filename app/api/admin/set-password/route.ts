/**
 * /api/admin/set-password — Force-reset du password d'un user (admin only).
 *
 * Cas d'usage :
 *  - Founder/admin a perdu son password et SMTP est casse (pas de reset email)
 *  - Debug en dev : reset rapidement le password d'un user de test
 *
 * SECURITE :
 *  - Header X-Admin-Secret obligatoire = process.env.CRON_SECRET
 *    (le meme secret que pour les crons Vercel, deja configure)
 *  - Comparaison timing-safe via verifyBearer (mais on utilise un header
 *    custom plutot que Authorization pour ne pas trigger le mecanisme Bearer
 *    interne qu'on utilise ailleurs)
 *  - Rate limit : 5 calls / 15 min / IP
 *  - Service role utilise UNIQUEMENT cote serveur, jamais expose
 *
 * Usage curl :
 *   curl -X POST 'https://www.cryptoreflex.fr/api/admin/set-password' \
 *     -H 'X-Admin-Secret: <CRON_SECRET>' \
 *     -H 'Content-Type: application/json' \
 *     -d '{"email":"user@example.com","password":"NewPass123!"}'
 */

import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";
import { createRateLimiter } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const limiter = createRateLimiter({
  limit: 5,
  windowMs: 15 * 60 * 1000,
  key: "admin-set-password",
});

function getClientIp(req: NextRequest): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return req.headers.get("x-real-ip") ?? "unknown";
}

function verifyAdminSecret(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    console.error("[admin/set-password] CRON_SECRET manquant");
    return false;
  }
  const provided = req.headers.get("x-admin-secret") ?? "";
  if (provided.length !== secret.length) return false;
  return timingSafeEqual(Buffer.from(provided), Buffer.from(secret));
}

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  const rl = await limiter(ip);
  if (!rl.ok) {
    return NextResponse.json(
      { error: "Trop de tentatives." },
      { status: 429, headers: { "Retry-After": String(rl.retryAfter) } }
    );
  }

  if (!verifyAdminSecret(req)) {
    // 404 plutot que 401 pour ne pas reveler l'existence de la route
    return NextResponse.json({ error: "Not found" }, { status: 404 });
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
  const { data: usersData, error: listError } = await admin.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  });

  if (listError) {
    console.error("[admin/set-password] listUsers error:", listError.message);
    return NextResponse.json(
      { error: "Erreur Supabase: " + listError.message },
      { status: 500 }
    );
  }

  const user = usersData.users.find(
    (u) => u.email?.toLowerCase() === email
  );

  if (!user) {
    return NextResponse.json(
      { error: `Aucun user trouvé avec email ${email}` },
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

  console.log(`[admin/set-password] Password reset OK pour ${email} (user ${user.id})`);

  return NextResponse.json({
    ok: true,
    userId: user.id,
    message: `Password reset pour ${email}. Tu peux te connecter via /connexion.`,
  });
}
