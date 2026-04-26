/**
 * POST /api/calculateur-pdf-lead
 * ------------------------------
 * Lead magnet du calculateur fiscalité (PDF export).
 *
 * Flow :
 *  1. Validation email + body (calculation data).
 *  2. Rate limit 3 requêtes/IP/heure (anti-abuse — un PDF par demande sérieuse).
 *  3. Génère un sessionId UUID v4.
 *  4. Persiste le calcul dans KV (TTL 1h) via lib/calculateur-pdf-storage.
 *  5. Subscribe à Beehiiv (source = "calculateur-fiscalite-pdf",
 *     custom field "lead_magnet" + tags via UTM campaign).
 *  6. Envoie l'email transactionnel via Resend (CTA preview-pdf/[sessionId]).
 *  7. Retourne { ok: true, sessionId } pour que le client redirige.
 *
 * Réponse :
 *  - 200 : { ok: true, sessionId }
 *  - 400 : input invalide (email, data)
 *  - 429 : rate limit
 *  - 502 : erreur upstream Beehiiv (on retourne quand même sessionId si KV OK)
 *
 * Idempotence :
 *  - Pas garantie strictement (un user qui clique 2 fois aura 2 sessionId
 *    et 2 emails). Les souscriptions Beehiiv sont reactivate_existing : true
 *    donc pas de duplicate côté newsletter.
 *
 * Sécurité :
 *  - sessionId UUID v4 (non prédictible).
 *  - Pas de PII stockée hors email + montants (acceptable RGPD avec consentement).
 *  - TTL 1h limite l'exposition.
 */

import { NextRequest, NextResponse } from "next/server";
import { subscribe, isValidEmail } from "@/lib/newsletter";
import { sendEmail } from "@/lib/email";
import { createRateLimiter } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/ip";
import {
  generateSessionId,
  storeCalculation,
  validateCalculationData,
} from "@/lib/calculateur-pdf-storage";
import {
  calculateurFiscaliteWelcomeHtml,
  calculateurFiscaliteWelcomeSubject,
} from "@/lib/email-templates";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* -------------------------------------------------------------------------- */
/*  Rate limiter — 3 PDFs/IP/heure                                            */
/* -------------------------------------------------------------------------- */

const limiter = createRateLimiter({
  limit: 3,
  windowMs: 60 * 60 * 1000, // 1h
  key: "calc-pdf-lead",
});

/* -------------------------------------------------------------------------- */
/*  Handler                                                                    */
/* -------------------------------------------------------------------------- */

export async function POST(req: NextRequest) {
  // ---- Rate limit ----
  const ip = getClientIp(req);
  const rl = await limiter(ip);
  if (!rl.ok) {
    return NextResponse.json(
      {
        ok: false,
        error: "Trop de demandes. Tu as déjà téléchargé 3 simulations dans la dernière heure.",
      },
      {
        status: 429,
        headers: { "Retry-After": String(rl.retryAfter) },
      },
    );
  }

  // ---- Parse body ----
  let payload: unknown;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "Requête invalide." },
      { status: 400 },
    );
  }

  if (!payload || typeof payload !== "object") {
    return NextResponse.json(
      { ok: false, error: "Requête invalide." },
      { status: 400 },
    );
  }

  const body = payload as { email?: unknown; calculationData?: unknown };

  // ---- Validation email ----
  if (typeof body.email !== "string" || !isValidEmail(body.email)) {
    return NextResponse.json(
      { ok: false, error: "Adresse email invalide." },
      { status: 400 },
    );
  }
  const email = body.email.trim().toLowerCase();

  // ---- Validation calculation data ----
  const calculationData = validateCalculationData(body.calculationData);
  if (!calculationData) {
    return NextResponse.json(
      { ok: false, error: "Données de calcul manquantes ou invalides." },
      { status: 400 },
    );
  }

  // ---- Persistance KV (sessionId) ----
  const sessionId = generateSessionId();
  try {
    await storeCalculation(sessionId, email, calculationData, 3600);
  } catch (err) {
    console.error("[calc-pdf-lead] storeCalculation failed", err);
    return NextResponse.json(
      { ok: false, error: "Stockage temporaire indisponible. Réessaie." },
      { status: 502 },
    );
  }

  // ---- Subscribe Beehiiv (best effort — on n'échoue pas le flow si KO) ----
  // On utilise la source "inline" qui est whitelisted (cohérent avec
  // /api/newsletter/subscribe) ; les tags sont passés via custom_fields
  // pour segmenter dans Beehiiv (lead_magnet=calc-pdf, tier dérivable côté
  // Beehiiv via une automation).
  const subRes = await subscribe({
    email,
    source: "inline",
    customFields: {
      lead_magnet: "calculateur-fiscalite-pdf",
      regime: calculationData.input.regime,
    },
    utmSource: "cryptoreflex",
    utmMedium: "tool",
    utmCampaign: "calculateur-fiscalite-pdf",
    ip,
  });
  if (!subRes.ok) {
    // On log mais on continue : le user a quand même son PDF + email.
    console.warn("[calc-pdf-lead] Beehiiv subscribe failed", subRes.error);
  }

  // ---- Envoi email transactionnel (Resend, ou mock si non configuré) ----
  // Best effort aussi : si Resend KO, le user a quand même son sessionId
  // pour accéder à la preview directement.
  const summary = {
    regime: calculationData.input.regime,
    plusValueNette: calculationData.result.plusValueNette,
    impotTotal: calculationData.result.impotTotal,
    netApresImpot: calculationData.result.netApresImpot,
    exonere: calculationData.result.exonere,
    deficit: calculationData.result.deficit,
  };
  const emailRes = await sendEmail({
    to: email,
    subject: calculateurFiscaliteWelcomeSubject,
    html: calculateurFiscaliteWelcomeHtml({ email, summary, sessionId }),
    tag: "calc-pdf",
    from: process.env.RESEND_FROM_EMAIL ?? "Cryptoreflex <hello@cryptoreflex.fr>",
  });
  if (!emailRes.ok) {
    console.warn("[calc-pdf-lead] Resend sendEmail failed", emailRes.error);
  }

  return NextResponse.json(
    {
      ok: true,
      sessionId,
      // Indicateurs côté UI (optionnels) — ne change rien au flow utilisateur.
      meta: {
        beehiivOk: subRes.ok,
        emailOk: emailRes.ok,
      },
    },
    { status: 200 },
  );
}
