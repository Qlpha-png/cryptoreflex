/**
 * POST /api/push/test  (ADMIN ONLY)
 *
 * Envoie une notification de test à l'utilisateur courant — UNIQUEMENT si
 * c'est un admin (cf. lib/auth.ts → isAdminEmail). Les non-admins reçoivent
 * un 404 strict (security through obscurity, comme les autres routes admin).
 *
 * Sert à vérifier depuis /admin que la chaîne navigateur ↔ push service ↔
 * worker est OK (typiquement après changement de clé VAPID ou debug d'une
 * sub qui ne reçoit plus rien).
 */

import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { sendPushToUser } from "@/lib/web-push";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(): Promise<NextResponse> {
  const user = await getUser();
  if (!user || !user.isAdmin) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const result = await sendPushToUser(user.id, {
    title: "🧪 Test push réussi",
    body: "Si tu vois ce message, la config VAPID + Service Worker est OK.",
    url: "/admin",
    tag: "admin-test",
  });

  return NextResponse.json({ ok: true, ...result });
}
