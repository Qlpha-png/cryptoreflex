/**
 * /api/stripe/webhook — Endpoint Stripe webhook.
 *
 * Reçoit les events Stripe (checkout.session.completed, customer.subscription.*,
 * invoice.payment_failed) et met à jour la table `users` Supabase en
 * conséquence.
 *
 * SÉCURITÉ :
 *  - Signature HMAC SHA256 vérifiée via stripe.webhooks.constructEvent()
 *  - Idempotency garantie via table `stripe_webhook_events` (PK event_id)
 *  - Service role Supabase utilisé (bypass RLS) car opération admin
 *
 * À CONFIGURER côté Stripe Dashboard :
 *  - URL : https://www.cryptoreflex.fr/api/stripe/webhook
 *  - Events à écouter :
 *      checkout.session.completed
 *      customer.subscription.created
 *      customer.subscription.updated
 *      customer.subscription.deleted
 *      invoice.payment_failed
 *      invoice.payment_succeeded
 *  - Récupérer le Signing Secret → STRIPE_WEBHOOK_SECRET dans Vercel env
 *
 * À CONFIGURER côté Supabase (cf. supabase/schema.sql) :
 *  - Table `users` (id, email, plan, plan_expires_at, stripe_customer_id)
 *  - Table `stripe_webhook_events` (event_id PK, type, received_at)
 */

import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { getStripeClient, priceIdToPlan, planToExpirationDate } from "@/lib/stripe";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";
import type Stripe from "stripe";

export const runtime = "nodejs"; // Stripe SDK nécessite Node, pas Edge
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const stripe = getStripeClient();
  const supabase = createSupabaseServiceRoleClient();
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  // Graceful degradation : si pas configuré, on renvoie 503 sans crasher
  if (!stripe || !supabase || !webhookSecret) {
    console.warn("[stripe-webhook] Configuration incomplète : Stripe ou Supabase non configurés");
    return NextResponse.json(
      { error: "Service temporarily unavailable" },
      { status: 503 }
    );
  }

  // Récupère le raw body (obligatoire pour vérifier la signature)
  const body = await req.text();
  const signature = (await headers()).get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[stripe-webhook] Signature verification failed:", message);
    return NextResponse.json(
      { error: `Webhook signature verification failed: ${message}` },
      { status: 400 }
    );
  }

  // Idempotency : on enregistre l'event_id en DB, si déjà reçu on skip
  const { error: insertError } = await supabase
    .from("stripe_webhook_events")
    .insert({
      event_id: event.id,
      type: event.type,
    });

  if (insertError && insertError.code === "23505") {
    // Duplicate key = event déjà traité
    console.log(`[stripe-webhook] Event ${event.id} déjà traité, skip`);
    return NextResponse.json({ received: true, idempotent: true });
  }

  // Dispatch event handlers
  try {
    switch (event.type) {
      case "checkout.session.completed":
        await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session, supabase);
        break;

      case "customer.subscription.created":
      case "customer.subscription.updated":
        await handleSubscriptionUpdate(event.data.object as Stripe.Subscription, supabase);
        break;

      case "customer.subscription.deleted":
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription, supabase);
        break;

      case "invoice.payment_failed":
        await handlePaymentFailed(event.data.object as Stripe.Invoice, supabase);
        break;

      default:
        console.log(`[stripe-webhook] Event non géré : ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error(`[stripe-webhook] Handler error for ${event.type}:`, message);
    return NextResponse.json(
      { error: "Internal handler error" },
      { status: 500 }
    );
  }
}

/* -------------------------------------------------------------------------- */
/*  Event Handlers                                                            */
/* -------------------------------------------------------------------------- */

type SupabaseAdmin = NonNullable<ReturnType<typeof createSupabaseServiceRoleClient>>;

async function handleCheckoutCompleted(
  session: Stripe.Checkout.Session,
  supabase: SupabaseAdmin
) {
  const email = session.customer_details?.email;
  const customerId = session.customer as string | null;

  if (!email || !customerId) {
    console.error("[checkout.completed] Email ou customer ID manquant");
    return;
  }

  // Détermine le plan depuis amount_total
  // 999 cents = 9,99 € → pro_monthly
  // 7999 cents = 79,99 € → pro_annual
  const plan = session.amount_total === 999 ? "pro_monthly" : "pro_annual";
  const expiresAt = planToExpirationDate(plan);

  // Crée ou met à jour le user dans Supabase via auth.admin.inviteUserByEmail()
  // → envoie automatiquement un magic link pour qu'il se connecte
  const { data: invited, error: inviteError } =
    await supabase.auth.admin.inviteUserByEmail(email, {
      redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || "https://www.cryptoreflex.fr"}/mon-compte`,
    });

  if (inviteError && inviteError.code !== "email_exists") {
    console.error("[checkout.completed] Invitation échouée:", inviteError);
    return;
  }

  // Récupère l'user (qu'il vienne d'être créé ou qu'il existait déjà)
  let userId = invited?.user?.id;
  if (!userId) {
    const { data: existing } = await supabase
      .from("users")
      .select("id")
      .eq("email", email)
      .single();
    userId = existing?.id;
  }

  if (!userId) {
    console.error("[checkout.completed] Impossible de récupérer l'user ID");
    return;
  }

  // Upsert dans la table `users`
  const { error: upsertError } = await supabase.from("users").upsert(
    {
      id: userId,
      email,
      plan,
      plan_expires_at: expiresAt.toISOString(),
      stripe_customer_id: customerId,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "id" }
  );

  if (upsertError) {
    console.error("[checkout.completed] Upsert user échoué:", upsertError);
  } else {
    console.log(`[checkout.completed] User ${email} mis à jour en plan ${plan}`);
  }
}

async function handleSubscriptionUpdate(
  subscription: Stripe.Subscription,
  supabase: SupabaseAdmin
) {
  const customerId = subscription.customer as string;
  const status = subscription.status;
  const item = subscription.items.data[0];
  const priceId = item?.price.id;

  if (!priceId) return;

  const plan = status === "active" ? priceIdToPlan(priceId) : "free";
  // Dans l'API Stripe 2026-04 (dahlia), `current_period_end` est sur l'item
  // de subscription, pas sur la subscription elle-même.
  const periodEnd = item?.current_period_end;
  const expiresAt = periodEnd
    ? new Date(periodEnd * 1000)
    : planToExpirationDate(plan);

  const { error } = await supabase
    .from("users")
    .update({
      plan,
      plan_expires_at: expiresAt.toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("stripe_customer_id", customerId);

  if (error) {
    console.error("[subscription.update] Update échoué:", error);
  }
}

async function handleSubscriptionDeleted(
  subscription: Stripe.Subscription,
  supabase: SupabaseAdmin
) {
  const customerId = subscription.customer as string;
  // Le plan reste actif jusqu'à `current_period_end` (cancel_at_period_end)
  // mais on log l'event pour traçabilité
  console.log(
    `[subscription.deleted] Customer ${customerId} a annulé. Accès jusqu'à period end.`
  );

  // Si la subscription est immédiatement annulée (status='canceled'), on bascule en free
  if (subscription.status === "canceled") {
    await supabase
      .from("users")
      .update({
        plan: "free",
        plan_expires_at: null,
        updated_at: new Date().toISOString(),
      })
      .eq("stripe_customer_id", customerId);
  }
}

async function handlePaymentFailed(
  invoice: Stripe.Invoice,
  supabase: SupabaseAdmin
) {
  const customerId = invoice.customer as string;
  // Stripe retry automatiquement pendant 7 jours (smart retries activé par défaut)
  // On log mais on ne change pas le plan immédiatement (grace period)
  console.warn(
    `[payment.failed] Customer ${customerId} - facture ${invoice.id} échouée, grace period 7j`
  );

  // TODO : envoyer email payment-failed au user via Resend
  // (cf. lib/email-templates/payment-failed.tsx — à créer)
}
