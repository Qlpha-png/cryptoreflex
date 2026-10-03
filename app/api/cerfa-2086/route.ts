/**
 * POST /api/cerfa-2086
 * --------------------
 * Génère un PDF "Cerfa 2086 + 3916-bis" pré-rempli à partir d'une liste de
 * transactions crypto importées par l'utilisateur.
 *
 * Gating (démonétisation juin 2026 — outil gratuit pour tout compte connecté) :
 *  1. Auth Supabase (getUser()) — identité requise pour le rate-limit par user
 *  2. Rate limit 5 PDF/jour/user (anti-abus)
 *
 * Body attendu :
 *  {
 *    transactions: Array<{
 *      date: string (ISO),
 *      type: "buy"|"sell"|"swap"|"transfer"|"fee"|"reward",
 *      asset: string,
 *      quantity: number,
 *      priceEur: number,
 *      fees?: number,
 *      exchange?: string
 *    }>,
 *    taxYear: number,
 *    taxpayerName?: string
 *  }
 *
 * Limites (anti-DoS + cohérence Cerfa 2086) :
 *  - max 1000 transactions par PDF (bornage validateTransactions)
 *  - max 5 MB de body (Next.js applique déjà ~1MB par défaut, on confirme côté validation)
 *
 * Réponses :
 *  - 200 : application/pdf en stream (Content-Disposition: attachment)
 *  - 400 : body invalide (validation Zod-like)
 *  - 401 : non authentifié
 *  - 429 : rate limit
 *  - 500 : erreur génération PDF
 *
 * Performance : la génération PDF prend 0.5–3 s selon le nombre de cessions.
 * Runtime Node.js obligatoire (pdf-lib >> Edge runtime).
 */

import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { createRateLimiter } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/ip";
import {
  buildSummary,
  computeCessions,
  generateFullCerfa,
  validateTransactions,
} from "@/lib/cerfa-2086";
import { awardXp } from "@/lib/gamification";

/* -------------------------------------------------------------------------- */
/*  Aperçu (body.preview === true) — audit 2026-10-03                          */
/* -------------------------------------------------------------------------- */
// L'aperçu affiché avant téléchargement passe par le MÊME moteur que le PDF
// (computeCessions + buildSummary) : plus de second calcul côté client, qui
// divergeait du document. Sans compte (l'aperçu sert à décider), limité par IP,
// aucun PDF généré, aucune écriture.
const previewLimiter = createRateLimiter({
  limit: 40,
  windowMs: 10 * 60 * 1000,
  key: "cerfa-2086-preview",
});

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* -------------------------------------------------------------------------- */
/*  Rate limiter — 5 PDFs/user/jour                                           */
/* -------------------------------------------------------------------------- */

const limiter = createRateLimiter({
  limit: 5,
  windowMs: 24 * 60 * 60 * 1000, // 24h
  key: "cerfa-2086",
});

/* -------------------------------------------------------------------------- */
/*  Bornes                                                                    */
/* -------------------------------------------------------------------------- */

const MAX_BODY_BYTES = 5 * 1024 * 1024; // 5 MB
const MIN_TAX_YEAR = 2019; // entrée en vigueur 150 VH bis (LF 2019)
const MAX_TAX_YEAR = new Date().getUTCFullYear() + 1;

/* -------------------------------------------------------------------------- */
/*  Handler                                                                   */
/* -------------------------------------------------------------------------- */

export async function POST(req: NextRequest): Promise<Response> {
  /* ---------- 1) Parse du body (en premier : l'aperçu n'exige pas de compte) ---------- */
  // Garde-fou taille — Next limite par défaut mais on documente l'intention.
  const contentLengthHeader = req.headers.get("content-length");
  if (contentLengthHeader) {
    const sz = Number(contentLengthHeader);
    if (Number.isFinite(sz) && sz > MAX_BODY_BYTES) {
      return NextResponse.json(
        { ok: false, error: "Fichier trop lourd (max 5 MB)." },
        { status: 413 },
      );
    }
  }

  let payload: unknown;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "Requête invalide (JSON malformé)." },
      { status: 400 },
    );
  }

  if (!payload || typeof payload !== "object") {
    return NextResponse.json(
      { ok: false, error: "Requête invalide." },
      { status: 400 },
    );
  }

  const body = payload as {
    transactions?: unknown;
    taxYear?: unknown;
    taxpayerName?: unknown;
    preview?: unknown;
  };
  const isPreview = body.preview === true;

  /* ---------- 2) Auth + rate limit ---------- */
  let user: Awaited<ReturnType<typeof getUser>> = null;
  if (isPreview) {
    // Aperçu : pas de compte requis, limité par IP (aucun PDF, aucune écriture).
    const rl = await previewLimiter(getClientIp(req));
    if (!rl.ok) {
      return NextResponse.json(
        { ok: false, error: "Trop d'aperçus demandés : réessayez dans quelques minutes." },
        { status: 429, headers: { "Retry-After": String(rl.retryAfter) } },
      );
    }
  } else {
    user = await getUser();
    if (!user) {
      return NextResponse.json(
        { ok: false, error: "Authentification requise." },
        { status: 401 },
      );
    }
    // Rate limit par user.id, pas par IP.
    const rl = await limiter(`user:${user.id}`);
    if (!rl.ok) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Vous avez atteint la limite de 5 générations PDF par jour. Réessayez demain ou contactez le support si besoin.",
        },
        {
          status: 429,
          headers: { "Retry-After": String(rl.retryAfter) },
        },
      );
    }
  }

  /* ---------- 3) Validation ---------- */

  const taxYearNum = typeof body.taxYear === "number" ? body.taxYear : Number(body.taxYear);
  if (!Number.isFinite(taxYearNum) || taxYearNum < MIN_TAX_YEAR || taxYearNum > MAX_TAX_YEAR) {
    return NextResponse.json(
      {
        ok: false,
        error: `Année fiscale invalide (attendue : ${MIN_TAX_YEAR}-${MAX_TAX_YEAR}).`,
      },
      { status: 400 },
    );
  }

  const taxpayerName =
    typeof body.taxpayerName === "string" && body.taxpayerName.trim().length > 0
      ? body.taxpayerName.trim().slice(0, 120)
      : undefined;

  const validation = validateTransactions(body.transactions);
  if (!validation.ok) {
    return NextResponse.json(
      {
        ok: false,
        error: "Transactions invalides — corrigez votre fichier et réessayez.",
        details: validation.errors.slice(0, 10),
      },
      { status: 400 },
    );
  }

  /* ---------- 3b) Aperçu : mêmes calculs que le PDF, réponse JSON ---------- */
  if (isPreview) {
    try {
      const cessions = computeCessions(validation.transactions, taxYearNum);
      const summary = buildSummary(cessions, validation.transactions, taxYearNum);
      return NextResponse.json(
        {
          ok: true,
          summary,
          cessions: cessions.map((c) => ({
            date: c.date,
            asset: c.asset,
            quantity: c.quantity,
            statut: c.statut,
            prixCessionEur: c.prixCessionEur,
            plusValueEur: c.plusValueEur,
          })),
        },
        { headers: { "Cache-Control": "private, no-store, max-age=0" } },
      );
    } catch (err) {
      console.error("[cerfa-2086] preview failed", err);
      return NextResponse.json(
        { ok: false, error: "Aperçu indisponible : vérifiez votre fichier et réessayez." },
        { status: 500 },
      );
    }
  }

  /* ---------- 4) Génération PDF ---------- */
  let pdfBytes: Uint8Array;
  let summary: Awaited<ReturnType<typeof generateFullCerfa>>["summary"];
  try {
    const out = await generateFullCerfa({
      transactions: validation.transactions,
      taxYear: taxYearNum,
      taxpayerName,
    });
    pdfBytes = out.pdfBytes;
    summary = out.summary;
  } catch (err) {
    console.error("[cerfa-2086] generation failed", err);
    return NextResponse.json(
      {
        ok: false,
        error:
          "Erreur lors de la génération du PDF. Réessayez ou contactez le support si le problème persiste.",
      },
      { status: 500 },
    );
  }

  /* ---------- 4b) Award XP gamification (étude #16 ETUDE-2026-05-02) ----- */
  // Big award (50 XP) car le Cerfa 2086 est l'action la plus engageante du
  // site. Best-effort, jamais bloquant : si le badge fail, le PDF est livré.
  // Rate-limit 1×/jour côté lib/gamification (cf. ACTION_LIMITS).
  try {
    if (user) await awardXp(user.id, "cerfa_generated");
  } catch (err) {
    console.warn(
      "[cerfa-2086] awardXp failed:",
      err instanceof Error ? err.message : String(err),
    );
  }

  /* ---------- 5) Stream PDF + headers ---------- */
  const filename = `cryptoreflex-cerfa-2086-${summary.taxYear}.pdf`;
  return new Response(new Uint8Array(pdfBytes) as BodyInit, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Content-Length": String(pdfBytes.byteLength),
      "Cache-Control": "private, no-store, max-age=0",
      "X-Cessions-Count": String(summary.nbCessions),
      "X-Foreign-Exchanges": String(summary.foreignExchanges.length),
    },
  });
}
