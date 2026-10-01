/**
 * /api/email/unsubscribe — Désinscription RGPD (art. 21) + One-Click RFC 8058.
 *
 * URL présente dans le header List-Unsubscribe et le pied de chaque email
 * (lib/email/client.ts, lib/email/components.ts) : ?email=…&token=… (HMAC).
 *
 * Comportement (audit sécurité 2026-10-01) :
 *  - GET  (clic sur le lien du pied d'email) → page de CONFIRMATION avec un
 *    bouton, sans rien modifier. Les scanners de liens (Outlook Safe Links,
 *    antivirus) ouvrent les URL des emails : un GET qui désinscrit les
 *    désinscrirait à l'insu des destinataires.
 *  - POST (bouton de la page, ou POST « List-Unsubscribe=One-Click » des
 *    messageries) → désinscription effective :
 *      1. users.unsubscribed_at = maintenant (comptes Cryptoreflex) ;
 *      2. statut « inactive » dans Beehiiv (newsletter + séquences email),
 *         sinon la désinscription n'avait AUCUN effet sur les envois.
 *  - Token HMAC exigé dans tous les cas (plus de contournement « formulaire »).
 */

import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";
import { verifyUnsubscribeToken } from "@/lib/auth-tokens";
import { unsubscribeFromBeehiiv } from "@/lib/beehiiv";
import { confirmActionPage, resultPage, HTML_HEADERS } from "@/lib/confirm-action-page";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function handleUnsubscribe(email: string): Promise<{ success: boolean }> {
  const normalized = email.toLowerCase().trim();
  let ok = true;

  const supabase = createSupabaseServiceRoleClient();
  if (supabase) {
    const { error } = await supabase
      .from("users")
      .update({ unsubscribed_at: new Date().toISOString() })
      .eq("email", normalized);
    // PGRST116 = aucune ligne : l'email peut ne pas avoir de compte, c'est normal.
    if (error && error.code !== "PGRST116") {
      console.error("[unsubscribe] update users échoué:", error.message);
      ok = false;
    }
  }

  const beehiiv = await unsubscribeFromBeehiiv(normalized);
  if (!beehiiv.ok) {
    console.error("[unsubscribe] Beehiiv a échoué pour un token valide");
    ok = false;
  }
  return { success: ok };
}

function invalidPage(status: number) {
  return new NextResponse(
    resultPage({
      title: "Lien invalide",
      message: "Ce lien de désinscription est invalide ou incomplet. Pour toute demande : contact@cryptoreflex.fr",
    }),
    { status, headers: HTML_HEADERS },
  );
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const email = url.searchParams.get("email");
  const token = url.searchParams.get("token");
  if (!email || !token) return invalidPage(400);
  if (!verifyUnsubscribeToken(email, token)) return invalidPage(403);

  // Aucune modification ici : on demande confirmation (cf. en-tête).
  return new NextResponse(
    confirmActionPage({
      title: "Se désinscrire ?",
      message: `Vous ne recevrez plus d'emails d'information de Cryptoreflex à l'adresse ${email.trim().toLowerCase()}. Vos éventuelles alertes de prix restent actives.`,
      actionUrl: `${url.pathname}${url.search}`,
      buttonLabel: "Confirmer la désinscription",
    }),
    { status: 200, headers: HTML_HEADERS },
  );
}

export async function POST(req: NextRequest) {
  // RFC 8058 : email + token sont dans l'URL (header List-Unsubscribe).
  // Repli : formulaire ou JSON portant email/token.
  const url = new URL(req.url);
  let email = url.searchParams.get("email");
  let token = url.searchParams.get("token");
  const ct = req.headers.get("content-type") ?? "";
  const wantsJson = ct.includes("application/json");

  if (!email || !token) {
    try {
      if (wantsJson) {
        const json = await req.json();
        email = email ?? json.email ?? null;
        token = token ?? json.token ?? null;
      } else {
        const form = await req.formData();
        email = email ?? form.get("email")?.toString() ?? null;
        token = token ?? form.get("token")?.toString() ?? null;
      }
    } catch {
      /* corps absent ou illisible */
    }
  }

  if (!email || !token || !verifyUnsubscribeToken(email, token)) {
    return wantsJson
      ? NextResponse.json({ error: "Invalid or missing token" }, { status: 403 })
      : invalidPage(403);
  }

  const { success } = await handleUnsubscribe(email);
  if (wantsJson) {
    return success
      ? NextResponse.json({ ok: true, message: "Unsubscribed" })
      : NextResponse.json({ error: "Unsubscribe failed" }, { status: 500 });
  }
  return new NextResponse(
    success
      ? resultPage({
          title: "Désinscription confirmée",
          message: "C'est fait : vous ne recevrez plus d'emails d'information de Cryptoreflex. Vos alertes de prix éventuelles restent actives et se gèrent depuis la page Alertes.",
        })
      : resultPage({
          title: "Désinscription en cours",
          message: "Votre demande est enregistrée mais un service n'a pas répondu. Nous la traitons manuellement ; vous pouvez aussi écrire à contact@cryptoreflex.fr.",
        }),
    { status: success ? 200 : 500, headers: HTML_HEADERS },
  );
}
