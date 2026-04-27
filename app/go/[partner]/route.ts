/**
 * /go/[partner] — Affiliate tracking redirect.
 *
 * Flow :
 *  1. User clique CTA partenaire sur /partenaires (ou ailleurs)
 *  2. URL pointe vers /go/{slug}?ctx={contexte}&pos={position}
 *  3. On log le clic (Plausible custom event + console pour Vercel logs)
 *  4. On redirect 302 vers l'URL affiliée du partenaire avec UTM ajoutés
 *
 * Privacy : on log le partenaire + contexte mais PAS d'IP / user-agent
 * (RGPD-friendly, pas de cookie tracker).
 *
 * Disclosure obligatoire : la mention "Lien affilié - commission perçue"
 * est visible sur /partenaires AVANT chaque CTA (loi 9 juin 2023).
 */

import { NextRequest, NextResponse } from "next/server";
import { getPartner } from "@/data/partners";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: { partner: string } }
) {
  const partner = getPartner(params.partner);

  if (!partner) {
    // Partenaire inconnu → redirect vers /partenaires (404 explicit)
    return NextResponse.redirect(new URL("/partenaires", req.url));
  }

  // Récupère contexte + position pour analytics
  const sp = req.nextUrl.searchParams;
  const ctx = sp.get("ctx") ?? "direct";
  const pos = sp.get("pos") ?? "default";

  // Log côté serveur (Vercel logs visibles via dashboard)
  console.log(
    `[affiliate-click] partner=${partner.slug} ctx=${ctx} pos=${pos}`
  );

  // Construit l'URL affiliée finale avec UTM enrichis
  const targetUrl = new URL(partner.affiliateUrl);
  targetUrl.searchParams.set("utm_source", "cryptoreflex");
  targetUrl.searchParams.set("utm_medium", "affiliate");
  targetUrl.searchParams.set("utm_campaign", partner.slug);
  if (ctx !== "direct") targetUrl.searchParams.set("utm_content", ctx);

  // Redirect 302 (temporary) — préserve le tracking partenaire
  const response = NextResponse.redirect(targetUrl.toString(), 302);

  // Headers no-cache (chaque clic doit être loggé, pas servi depuis cache)
  response.headers.set("Cache-Control", "no-store, no-cache, must-revalidate");
  response.headers.set("Referrer-Policy", "no-referrer-when-downgrade");

  return response;
}
