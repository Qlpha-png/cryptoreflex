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
 * Mapping Stripe Price OU Product ID → Plan interne.
 *
 * Configuré via env vars pour ne pas hardcoder les prix dans le code.
 * Pourquoi accepter les deux :
 *  - Price IDs (price_xxx) sont les identifiants des prix Stripe (1 produit
 *    peut avoir plusieurs prix : mensuel, annuel, devises différentes…)
 *  - Product IDs (prod_xxx) sont les identifiants des produits Stripe
 *  - Les Payment Links sont liés à un Product, et la subscription expose
 *    `subscription.items[0].price.product` qui contient le Product ID
 *
 * On regarde d'abord le Price ID (plus précis), puis le Product ID en fallback.
 * Les env vars peuvent contenir l'un OU l'autre — on s'en fiche.
 *
 * @param priceId — l'ID du price Stripe (price_xxx)
 * @param productId — optionnel, l'ID du product (prod_xxx)
 */
export function priceIdToPlan(priceId: string, productId?: string): Plan {
  // Lookup Price ID
  const monthlyEnv = process.env.STRIPE_PRICE_PRO_MONTHLY;
  const annualEnv = process.env.STRIPE_PRICE_PRO_ANNUAL;

  if (monthlyEnv && priceId === monthlyEnv) return "pro_monthly";
  if (annualEnv && priceId === annualEnv) return "pro_annual";

  // Fallback Product ID (si l'utilisateur a configuré des Product IDs au lieu de Price IDs)
  if (productId) {
    if (monthlyEnv && productId === monthlyEnv) return "pro_monthly";
    if (annualEnv && productId === annualEnv) return "pro_annual";
  }

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
