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
import { sendEmail } from "@/lib/email/client";
import { welcomeProEmail, paymentFailedEmail } from "@/lib/email/templates";
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

  // P1 FIX (audit backend 30/04/2026) — détermination de plan robuste.
  //
  // Avant : `plan = session.amount_total === 999 ? "pro_monthly" : "pro_annual"`
  // Cassé : si Stripe applique un coupon/promo, amount_total change et le user
  // est upgradé en plan annuel par accident. Aussi cassé après refonte du
  // pricing (Soutien 3 €/mois = 300 cents, Annuel 29 €/an = 2900 cents).
  //
  // Maintenant : on récupère les line_items expanded de la session Checkout
  // et on utilise priceIdToPlan() pour résoudre le price ID → plan interne.
  // Plus tolérant aux changements de tarif (mensuel/annuel/coupon) que la
  // résolution par montant total.
  const stripeClient = getStripeClient();
  let plan: "pro_monthly" | "pro_annual" = "pro_monthly";
  if (stripeClient && session.id) {
    try {
      const expanded = await stripeClient.checkout.sessions.retrieve(session.id, {
        expand: ["line_items.data.price.product"],
      });
      const lineItem = expanded.line_items?.data[0];
      const priceId = lineItem?.price?.id ?? "";
      const productId =
        typeof lineItem?.price?.product === "string"
          ? lineItem.price.product
          : lineItem?.price?.product?.id;
      const resolved = priceIdToPlan(priceId, productId);
      if (resolved === "pro_monthly" || resolved === "pro_annual") {
        plan = resolved;
      } else {
        // Fix audit code review 01/05/2026 — on lit l'interval de récurrence
        // (year vs month) depuis le price expanded, AU LIEU d'un seuil cents
        // qui devient obsolète à chaque refonte de pricing (avant : 1500
        // cents qui assignait pro_monthly à un coupon -50% sur l'annuel).
        const interval = lineItem?.price?.recurring?.interval;
        if (interval === "year") {
          plan = "pro_annual";
        } else if (interval === "month") {
          plan = "pro_monthly";
        } else {
          // Vraiment aucun signal → fallback amount_total mais avec un seuil
          // calculé dynamiquement (3 × prix mensuel cents = transition).
          // Avec pricing 2,99 €/mois = 299 cents, seuil = 897 → tout >= 897
          // = annuel probable. Pas parfait mais documenté.
          plan = (session.amount_total ?? 0) >= 897 ? "pro_annual" : "pro_monthly";
        }
      }
    } catch (err) {
      console.error(
        "[checkout.completed] Impossible de récupérer line_items, fallback heuristique:",
        err
      );
      plan = (session.amount_total ?? 0) >= 897 ? "pro_annual" : "pro_monthly";
    }
  }
  const expiresAt = planToExpirationDate(plan);

  // Génère un magic link pour la connexion immédiate
  // Utilise generateLink (admin only) plutôt que inviteUserByEmail pour
  // contrôler le redirect et envoyer notre propre email branded.
  const { data: linkData, error: linkError } =
    await supabase.auth.admin.generateLink({
      type: "magiclink",
      email,
      options: {
        redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || "https://www.cryptoreflex.fr"}/mon-compte`,
      },
    });

  if (linkError) {
    console.error("[checkout.completed] generateLink échoué:", linkError);
    // On continue quand même pour upsert le user — il pourra se reconnecter
    // via /connexion plus tard
  }

  // Récupère l'user (qu'il vienne d'être créé ou qu'il existait déjà)
  let userId = linkData?.user?.id;
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
    return;
  }

  console.log(`[checkout.completed] User ${email} mis à jour en plan ${plan}`);

  // Envoie l'email de bienvenue avec le magic link
  // (action_link contient le lien de connexion sécurisé Supabase)
  const magicLink =
    linkData?.properties?.action_link ||
    `${process.env.NEXT_PUBLIC_SITE_URL || "https://www.cryptoreflex.fr"}/connexion`;

  const welcome = welcomeProEmail({ email, plan, magicLink });
  const emailResult = await sendEmail({
    to: email,
    subject: welcome.subject,
    preheader: welcome.preheader,
    html: welcome.html,
    text: welcome.text,
  });

  if (!emailResult.ok) {
    console.error(`[checkout.completed] Email welcome non envoyé à ${email}:`, emailResult.error);
  } else {
    console.log(`[checkout.completed] Email welcome envoyé à ${email}`);
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
  // Product ID extrait de la subscription (price.product peut être string ou
  // expanded Product object). On le passe en fallback à priceIdToPlan() pour
  // supporter les env vars configurées avec des Product IDs au lieu de Price IDs.
  const productId =
    typeof item?.price.product === "string"
      ? item.price.product
      : item?.price.product?.id;

  if (!priceId) return;

  const plan = status === "active" ? priceIdToPlan(priceId, productId) : "free";
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

  // Récupère l'email du user pour l'alerter
  const { data: user } = await supabase
    .from("users")
    .select("email")
    .eq("stripe_customer_id", customerId)
    .single();

  if (!user?.email) return;

  // URL pour mettre à jour la carte = redirection vers Customer Portal
  const updateUrl = `${process.env.NEXT_PUBLIC_SITE_URL || "https://www.cryptoreflex.fr"}/mon-compte`;

  const failed = paymentFailedEmail({
    email: user.email,
    updatePaymentUrl: updateUrl,
    graceDays: 7,
  });

  await sendEmail({
    to: user.email,
    subject: failed.subject,
    preheader: failed.preheader,
    html: failed.html,
    text: failed.text,
  });
}
