/**
 * Stripe SDK helpers Cryptoreflex Pro.
 *
 * Centralise l'init du client Stripe + helpers de mapping Price ID → Plan.
 *
 * GRACEFUL DEGRADATION : si STRIPE_SECRET_KEY n'est pas configuré, les
 * helpers retournent null et les routes API doivent gérer ce cas
 * (renvoyer 503 ou afficher "bientôt disponible").
 */

import Stripe from "stripe";
import type { Plan } from "@/lib/auth";

let _stripe: Stripe | null = null;

/** Singleton Stripe client (lazy-init pour éviter le crash au build si env vide). */
export function getStripeClient(): Stripe | null {
  if (_stripe) return _stripe;

  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;

  _stripe = new Stripe(key, {
    apiVersion: "2026-04-22.dahlia",
    typescript: true,
    appInfo: {
      name: "Cryptoreflex",
      version: "1.0.0",
      url: "https://www.cryptoreflex.fr",
    },
  });

  return _stripe;
}

/**
 * Mapping Stripe Price ID → Plan interne.
 *
 * Configuré via env vars pour ne pas hardcoder les prix dans le code.
 * Les Price IDs sont créés dans Stripe Dashboard > Products.
 */
export function priceIdToPlan(priceId: string): Plan {
  if (priceId === process.env.STRIPE_PRICE_PRO_MONTHLY) return "pro_monthly";
  if (priceId === process.env.STRIPE_PRICE_PRO_ANNUAL) return "pro_annual";
  return "free";
}

/**
 * Calcule la date d'expiration d'un abonnement à partir du plan.
 * Approximation : 31 jours pour mensuel, 366 jours pour annuel.
 * En production, on récupère `current_period_end` directement depuis Stripe.
 */
export function planToExpirationDate(plan: Plan, fromTimestamp?: number): Date {
  const now = fromTimestamp ?? Date.now();
  const days = plan === "pro_annual" ? 366 : 31;
  return new Date(now + days * 24 * 60 * 60 * 1000);
}
