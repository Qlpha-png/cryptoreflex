/**
 * /api/stripe/portal — Crée une session Customer Portal Stripe.
 *
 * Permet au user d'accéder au portail Stripe pour :
 *  - Mettre à jour sa carte
 *  - Voir ses factures
 *  - Annuler son abonnement (1 clic — conforme décret 2022-34)
 *  - Changer de plan (mensuel ↔ annuel)
 *
 * Configuration Stripe Customer Portal (Dashboard > Settings > Billing > Customer portal) :
 *  - Activer "Allow customers to cancel subscriptions"
 *  - Activer "Show prorations" pour les changements de plan
 *  - Activer "Cancellation reason" optionnel pour récolter du feedback
 */

import { NextResponse } from "next/server";
import { getStripeClient } from "@/lib/stripe";
import { requireAuth } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  const stripe = getStripeClient();
  if (!stripe) {
    return NextResponse.json(
      { error: "Service temporarily unavailable" },
      { status: 503 }
    );
  }

  const user = await requireAuth();

  if (!user.stripeCustomerId) {
    return NextResponse.json(
      { error: "Aucun abonnement actif trouvé" },
      { status: 400 }
    );
  }

  try {
    const session = await stripe.billingPortal.sessions.create({
      customer: user.stripeCustomerId,
      return_url: `${process.env.NEXT_PUBLIC_SITE_URL || "https://www.cryptoreflex.fr"}/mon-compte`,
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[stripe/portal] Erreur création session:", message);
    return NextResponse.json(
      { error: "Impossible de créer la session de gestion" },
      { status: 500 }
    );
  }
}
