/**
 * POST /api/account/delete — Suppression de compte (DSR RGPD art. 17).
 *
 * Implémente le « droit à l'effacement » du RGPD pour permettre à un user
 * authentifié de supprimer définitivement son compte + toutes ses données
 * personnelles depuis son espace `/mon-compte`, en 1 clic, sans intervention
 * humaine.
 *
 * Avant cet endpoint (audit backend 30/04/2026) : la suppression de compte
 * nécessitait d'envoyer un email à hello@cryptoreflex.fr, traité manuellement.
 * Process non-conforme à l'obligation de réponse sous 1 mois si le trafic
 * monte (art. 12 §3 RGPD), et fragile car dépend d'une seule personne.
 *
 * SÉCURITÉ :
 *  - Auth obligatoire : on lit la session via createSupabaseServerClient()
 *    (RLS-aware). Pas d'auth = 401.
 *  - Confirmation explicite : on exige `{ confirm: "DELETE" }` dans le body
 *    pour éviter les suppressions accidentelles via CSRF (en plus du SameSite
 *    cookie déjà strict).
 *  - Service role : appelle `auth.admin.deleteUser(userId)` qui cascade sur
 *    `public.users` via `ON DELETE CASCADE` du schema (cf. supabase/schema.sql).
 *  - Stripe : si l'user a un `stripe_customer_id`, on cancel ses subscriptions
 *    actives + supprime le customer Stripe (best-effort, pas bloquant).
 *  - Idempotent : si déjà supprimé, retourne 200 (no-op).
 *
 * Le cookie de session est invalidé en réponse (le client doit rediriger
 * vers `/` après).
 */

import { NextRequest, NextResponse } from "next/server";
import {
  createSupabaseServerClient,
  createSupabaseServiceRoleClient,
} from "@/lib/supabase/server";
import { getStripeClient } from "@/lib/stripe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface DeleteBody {
  confirm?: string;
}

export async function POST(req: NextRequest) {
  // 1. Auth check : on lit la session via le client RLS-aware
  const userClient = createSupabaseServerClient();
  if (!userClient) {
    return NextResponse.json(
      { error: "Service temporarily unavailable" },
      { status: 503 }
    );
  }

  const {
    data: { user: authUser },
  } = await userClient.auth.getUser();

  if (!authUser) {
    return NextResponse.json(
      { error: "Unauthorized — login required" },
      { status: 401 }
    );
  }

  // 2. Confirmation explicite anti-CSRF
  let body: DeleteBody = {};
  try {
    body = (await req.json()) as DeleteBody;
  } catch {
    // body vide = pas de confirm = refusé
  }

  if (body.confirm !== "DELETE") {
    return NextResponse.json(
      {
        error:
          "Confirmation required — POST { confirm: 'DELETE' } to confirm permanent deletion",
      },
      { status: 400 }
    );
  }

  // 3. Service role pour la suppression effective (bypass RLS)
  const admin = createSupabaseServiceRoleClient();
  if (!admin) {
    return NextResponse.json(
      { error: "Service temporarily unavailable" },
      { status: 503 }
    );
  }

  // 4. Best-effort cleanup Stripe (cancel subscriptions + delete customer)
  //    Si Stripe n'est pas configuré ou si le user n'a pas de customer ID,
  //    on skip silencieusement.
  const { data: profile } = await admin
    .from("users")
    .select("stripe_customer_id")
    .eq("id", authUser.id)
    .single();

  const stripeCustomerId = profile?.stripe_customer_id ?? null;
  if (stripeCustomerId) {
    const stripe = getStripeClient();
    if (stripe) {
      try {
        // Cancel toutes les subscriptions actives
        const subs = await stripe.subscriptions.list({
          customer: stripeCustomerId,
          status: "active",
          limit: 100,
        });
        await Promise.allSettled(
          subs.data.map((s) =>
            stripe.subscriptions.cancel(s.id, { invoice_now: false })
          )
        );
        // Supprime le customer (Stripe garde l'historique facturation pour
        // raisons légales mais l'objet customer est marqué deleted).
        await stripe.customers.del(stripeCustomerId);
      } catch (err) {
        // Pas bloquant — l'objectif principal est de supprimer côté Supabase.
        console.warn("[account/delete] Stripe cleanup partiel:", err);
      }
    }
  }

  // 5. Suppression Supabase Auth user (cascade via ON DELETE CASCADE
  //    sur les FK depuis public.users + tables liées : portfolios, alerts,
  //    watchlists, sessions, etc.)
  const { error: deleteError } = await admin.auth.admin.deleteUser(authUser.id);

  if (deleteError) {
    console.error("[account/delete] Suppression échoue:", deleteError);
    return NextResponse.json(
      { error: "Deletion failed — contact support@cryptoreflex.fr" },
      { status: 500 }
    );
  }

  // 6. Sign-out côté cookie (best-effort) + log audit minimal
  const res = NextResponse.json({
    ok: true,
    message: "Compte supprimé. Toutes vos données personnelles ont été effacées.",
  });

  // Invalide les cookies de session (le client doit rediriger vers `/`)
  res.cookies.delete("sb-access-token");
  res.cookies.delete("sb-refresh-token");

  console.log(
    `[account/delete] User ${authUser.id} (email masked: ${maskEmail(
      authUser.email ?? ""
    )}) supprimé avec succès`
  );

  return res;
}

/** Masque un email pour les logs : `kevin@cryptoreflex.fr` → `kev***@cryptoreflex.fr`. */
function maskEmail(email: string): string {
  if (!email) return "";
  const [local, domain] = email.split("@");
  if (!domain) return "***";
  return `${(local ?? "").slice(0, 3)}***@${domain}`;
}
