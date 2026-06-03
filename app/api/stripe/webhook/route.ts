/**
 * /api/stripe/webhook — DÉSACTIVÉ (démonétisation, juin 2026).
 *
 * Cryptoreflex est désormais 100 % gratuit : plus d'abonnement payant Stripe.
 * Cet endpoint ne traite plus aucun event Stripe. On répond 200 pour éviter
 * que Stripe ne retry en boucle si un event résiduel arrivait encore.
 *
 * IMPORTANT : on ne touche NI aux clés/secrets Stripe, NI au dashboard Stripe,
 * NI aux clients existants. Kevin nettoiera l'intégration Stripe de son côté
 * (désactivation des produits/prix + suppression des env vars STRIPE_* dans Vercel).
 */

import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  return NextResponse.json(
    { ok: true, disabled: true, reason: "Stripe désactivé — Cryptoreflex est gratuit" },
    { status: 200 },
  );
}
