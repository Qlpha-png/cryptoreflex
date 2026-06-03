/**
 * /api/stripe/portal — NEUTRALISÉ (démonétisation juin 2026).
 *
 * Cryptoreflex est désormais 100 % gratuit : il n'y a plus d'abonnement à
 * gérer, donc plus aucune session Stripe Customer Portal à créer.
 *
 * On garde la route en place (pas de 404) pour ne pas casser un éventuel
 * appel client legacy : elle répond simplement par un JSON sobre indiquant
 * que la gestion d'abonnement n'a plus lieu d'être. Aucune clé Stripe n'est
 * touchée ni utilisée.
 */

import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  return NextResponse.json(
    {
      disabled: true,
      reason:
        "Cryptoreflex est gratuit — il n'y a aucun abonnement à gérer.",
    },
    { status: 200 },
  );
}
