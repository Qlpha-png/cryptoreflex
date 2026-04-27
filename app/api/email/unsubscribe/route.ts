/**
 * /api/email/unsubscribe — Désinscription RGPD en 1 clic.
 *
 * Endpoint requis par RFC 8058 (List-Unsubscribe-Post One-Click) pour
 * la conformité Gmail bulk sender 2024+.
 *
 * Comportement :
 *  - GET ?email=xxx : page HTML simple confirmant la désinscription
 *  - POST : same effect, no-cache (pour les outils anti-spam Gmail)
 *
 * Action : marque le user en "unsubscribed" dans Supabase pour ne plus
 * recevoir d'emails marketing (les emails transactionnels — facture,
 * échec paiement — restent obligatoires car liés à l'exécution du contrat).
 */

import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function handleUnsubscribe(email: string): Promise<{ success: boolean }> {
  const supabase = createSupabaseServiceRoleClient();
  if (!supabase) return { success: false };

  // On stocke la désinscription dans la table users
  // (colonne `unsubscribed_at` — à ajouter au schema si pas encore fait)
  const { error } = await supabase
    .from("users")
    .update({
      unsubscribed_at: new Date().toISOString(),
    })
    .eq("email", email.toLowerCase().trim());

  if (error && error.code !== "PGRST116") {
    // PGRST116 = no row found, OK car user peut être inconnu
    console.error("[unsubscribe] update échoué:", error);
    return { success: false };
  }

  return { success: true };
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const email = url.searchParams.get("email");

  if (!email) {
    return new NextResponse(
      `<!DOCTYPE html><html><body style="font-family:sans-serif;max-width:600px;margin:60px auto;padding:0 20px;color:#0a0a0a;">
      <h1>Email manquant</h1>
      <p>Le lien de désinscription est invalide. Contactez-nous : hello@cryptoreflex.fr</p>
      </body></html>`,
      { status: 400, headers: { "Content-Type": "text/html; charset=utf-8" } }
    );
  }

  await handleUnsubscribe(email);

  return new NextResponse(
    `<!DOCTYPE html><html><head><title>Désinscription confirmée — Cryptoreflex</title></head><body style="font-family:sans-serif;max-width:600px;margin:60px auto;padding:0 20px;color:#0a0a0a;line-height:1.6;">
    <h1 style="color:#F59E0B;">✓ Désinscription confirmée</h1>
    <p>Votre adresse <strong>${escapeHtml(email)}</strong> a été désinscrite de la newsletter Cryptoreflex.</p>
    <p>Vous continuerez à recevoir uniquement les emails transactionnels obligatoires (factures, alertes de paiement) tant que votre abonnement Pro est actif.</p>
    <p>Pour supprimer complètement votre compte (RGPD), écrivez à <a href="mailto:hello@cryptoreflex.fr">hello@cryptoreflex.fr</a>.</p>
    <p style="margin-top:40px;font-size:12px;color:#71757D;"><a href="https://www.cryptoreflex.fr">Retour sur cryptoreflex.fr</a></p>
    </body></html>`,
    {
      status: 200,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-store",
      },
    }
  );
}

export async function POST(req: NextRequest) {
  // RFC 8058 : One-Click Unsubscribe via POST
  // Le body peut être form-data (Gmail) ou JSON
  const url = new URL(req.url);
  let email = url.searchParams.get("email");

  if (!email) {
    try {
      const formData = await req.formData();
      email = formData.get("email")?.toString() || null;
    } catch {
      // try JSON
      try {
        const json = await req.json();
        email = json.email;
      } catch {
        email = null;
      }
    }
  }

  if (!email) {
    return NextResponse.json({ error: "Email required" }, { status: 400 });
  }

  const { success } = await handleUnsubscribe(email);

  if (!success) {
    return NextResponse.json({ error: "Unsubscribe failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, message: "Unsubscribed" });
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
