/**
 * /api/alerts/[id]
 *
 * GET    : récupère une alerte (debug — pas vraiment utilisé en prod)
 * DELETE : supprime l'alerte. Authentifié via `?token=<sha256(email + secret)>`.
 *          En mode mocked (pas de secret), token = "mocked-token".
 *
 * Variante "one-click unsubscribe" : DELETE peut aussi être appelée par GET
 * avec `?action=delete&token=...`. Permet le lien direct dans l'email reçu
 * (les clients mail ne peuvent pas envoyer de DELETE).
 */

import { NextRequest, NextResponse } from "next/server";
import { deleteAlert, getAlertById, verifyUnsubscribeToken } from "@/lib/alerts";
import { getKv } from "@/lib/kv";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface Ctx {
  params: { id: string };
}

function getClientIp(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "local"
  );
}

const RL_STORE = new Map<string, { count: number; resetAt: number }>();
const RL_LIMIT = 30;
const RL_WINDOW_MS = 60_000;

function rateLimit(key: string): boolean {
  const now = Date.now();
  const entry = RL_STORE.get(key);
  if (!entry || entry.resetAt < now) {
    RL_STORE.set(key, { count: 1, resetAt: now + RL_WINDOW_MS });
    return true;
  }
  if (entry.count >= RL_LIMIT) return false;
  entry.count += 1;
  return true;
}

/**
 * Cœur partagé GET (action=delete) + DELETE.
 *
 * Auth :
 *  - Si `requireToken` (cas du GET one-click depuis l'email) → on exige un token
 *    cryptographique valide.
 *  - Sinon (cas du DELETE depuis l'UI same-origin) → on a déjà filtré côté caller
 *    (Origin same-host) et on accepte sans token.
 *
 * Rendu :
 *  - `options.html` = page HTML lisible (lien depuis l'email).
 *  - sinon JSON pour les fetch JS.
 */
async function handleDelete(
  req: NextRequest,
  id: string,
  options: { html: boolean; requireToken: boolean },
): Promise<NextResponse> {
  const token = req.nextUrl.searchParams.get("token") ?? "";

  if (options.requireToken && !token) {
    return options.html
      ? htmlResponse(400, "Lien invalide", "Token manquant.")
      : NextResponse.json({ ok: false, error: "Token manquant." }, { status: 400 });
  }

  const alert = await getAlertById(id);
  if (!alert) {
    // Idempotent : déjà supprimée ?
    return options.html
      ? htmlResponse(200, "Alerte introuvable", "Cette alerte a déjà été supprimée ou n'existe plus.")
      : NextResponse.json({ ok: false, error: "Alerte introuvable." }, { status: 404 });
  }

  if (options.requireToken) {
    const valid = await verifyUnsubscribeToken(alert.email, token);
    if (!valid) {
      return options.html
        ? htmlResponse(403, "Lien invalide", "Le lien de désinscription n'est pas valide ou a expiré.")
        : NextResponse.json({ ok: false, error: "Token invalide." }, { status: 403 });
    }
  }

  const ok = await deleteAlert(id);
  if (!ok) {
    return options.html
      ? htmlResponse(500, "Erreur", "Suppression impossible. Réessaie plus tard.")
      : NextResponse.json({ ok: false, error: "Suppression impossible." }, { status: 500 });
  }

  return options.html
    ? htmlResponse(200, "Alerte supprimée", `Tu ne recevras plus d'email pour cette alerte (${alert.symbol} ${alert.condition === "above" ? ">" : "<"} ${alert.threshold} ${alert.currency.toUpperCase()}).`)
    : NextResponse.json({ ok: true }, { status: 200 });
}

export async function GET(req: NextRequest, ctx: Ctx): Promise<NextResponse> {
  if (!rateLimit(getClientIp(req))) {
    return NextResponse.json({ ok: false, error: "Trop de requêtes." }, { status: 429 });
  }

  const action = req.nextUrl.searchParams.get("action");
  if (action === "delete") {
    return handleDelete(req, ctx.params.id, { html: true, requireToken: true });
  }

  // Lecture simple (debug)
  const alert = await getAlertById(ctx.params.id);
  if (!alert) {
    return NextResponse.json({ ok: false, error: "Introuvable." }, { status: 404 });
  }
  // On ne renvoie pas l'email complet (privacy) sauf au caller authentifié → ici on masque.
  return NextResponse.json(
    {
      ok: true,
      alert: {
        ...alert,
        email: maskEmail(alert.email),
      },
    },
    { status: 200, headers: { "Cache-Control": "no-store" } },
  );
}

export async function DELETE(req: NextRequest, ctx: Ctx): Promise<NextResponse> {
  if (!rateLimit(getClientIp(req))) {
    return NextResponse.json({ ok: false, error: "Trop de requêtes." }, { status: 429 });
  }

  // CSRF : on accepte le DELETE quand :
  //  - l'Origin est same-host (UI Cryptoreflex), OU
  //  - on est en mode mocked (dev / preview), OU
  //  - un token cryptographique valide est fourni (caller externe authentifié).
  const sameOrigin = isOriginAllowed(req);
  const hasToken = Boolean(req.nextUrl.searchParams.get("token"));
  if (!sameOrigin && !hasToken && !getKv().mocked) {
    return NextResponse.json({ ok: false, error: "Origine non autorisée." }, { status: 403 });
  }

  // Si pas de same-origin (donc forcément un token), on l'exige valide.
  // Si same-origin OU mocked → token optionnel.
  const requireToken = !sameOrigin && !getKv().mocked;
  return handleDelete(req, ctx.params.id, { html: false, requireToken });
}

function isOriginAllowed(req: NextRequest): boolean {
  if (getKv().mocked) return true;
  const origin = req.headers.get("origin");
  if (!origin) return true;
  try {
    const o = new URL(origin);
    const host = req.headers.get("host");
    return Boolean(host) && o.host === host;
  } catch {
    return false;
  }
}

function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (!local || !domain) return email;
  const visible = local.slice(0, Math.min(2, local.length));
  return `${visible}${"*".repeat(Math.max(1, local.length - visible.length))}@${domain}`;
}

/**
 * Petite page HTML de confirmation/erreur servie sur GET ?action=delete.
 * Style minimaliste cohérent avec la marque, sans deps externe.
 */
function htmlResponse(status: number, title: string, body: string): NextResponse {
  const html = `<!doctype html>
<html lang="fr">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <meta name="robots" content="noindex" />
  <title>${escapeHtml(title)} — Cryptoreflex</title>
  <style>
    body{margin:0;background:#0B0F1A;color:#E5E7EB;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;}
    main{max-width:520px;margin:80px auto;padding:32px;background:#111827;border:1px solid rgba(99,102,241,0.25);border-radius:16px;}
    h1{font-size:22px;margin:0 0 12px 0;color:#fff;}
    p{font-size:14px;line-height:1.55;color:#9CA3AF;}
    a{color:#A5B4FC;}
  </style>
</head>
<body>
  <main>
    <h1>${escapeHtml(title)}</h1>
    <p>${escapeHtml(body)}</p>
    <p><a href="/alertes">Retour à mes alertes</a> · <a href="/">Cryptoreflex</a></p>
  </main>
</body>
</html>`;
  return new NextResponse(html, {
    status,
    headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" },
  });
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
