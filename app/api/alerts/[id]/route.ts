/**
 * /api/alerts/[id]
 *
 * GET    : récupère une alerte — propriétaire connecté uniquement.
 * DELETE : supprime l'alerte. Autorisé si :
 *          - `?token=` valide (lien signé présent dans l'email d'alerte), OU
 *          - session dont l'email = email de l'alerte (UI /alertes).
 *
 * Variante "one-click unsubscribe" : DELETE peut aussi être appelée par GET
 * avec `?action=delete&token=...`. Permet le lien direct dans l'email reçu
 * (les clients mail ne peuvent pas envoyer de DELETE).
 *
 * SÉCURITÉ (audit 2026-10-01) : avant, une requête SANS en-tête Origin (curl)
 * était traitée comme « same-origin » → suppression de n'importe quelle
 * alerte sans token. Corrigé : preuve cryptographique ou session propriétaire.
 * CSRF : les cookies Supabase sont SameSite=Lax → non envoyés sur un DELETE
 * cross-site.
 */

import { NextRequest, NextResponse } from "next/server";
import { deleteAlert, getAlertById, verifyUnsubscribeToken } from "@/lib/alerts";
import { getUser } from "@/lib/auth";
import { getClientIp } from "@/lib/ip";
import { confirmActionPage, HTML_HEADERS } from "@/lib/confirm-action-page";

/** L'utilisateur connecté est-il le propriétaire (même email) de l'alerte ? */
async function isOwner(alertEmail: string): Promise<boolean> {
  const user = await getUser();
  if (!user?.email) return false;
  return user.email.trim().toLowerCase() === alertEmail.trim().toLowerCase();
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface Ctx {
  params: { id: string };
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
 *  - `?token=` fourni → il doit être valide pour l'email de l'alerte.
 *  - sinon → session propriétaire obligatoire (même email que l'alerte).
 *
 * Rendu :
 *  - `options.html` = page HTML lisible (lien depuis l'email).
 *  - sinon JSON pour les fetch JS.
 */
async function handleDelete(
  req: NextRequest,
  id: string,
  options: { html: boolean },
): Promise<NextResponse> {
  const token = req.nextUrl.searchParams.get("token") ?? "";

  if (options.html && !token) {
    return htmlResponse(400, "Lien invalide", "Token manquant.");
  }

  const alert = await getAlertById(id);
  if (!alert) {
    // Idempotent : déjà supprimée ?
    return options.html
      ? htmlResponse(200, "Alerte introuvable", "Cette alerte a déjà été supprimée ou n'existe plus.")
      : NextResponse.json({ ok: false, error: "Alerte introuvable." }, { status: 404 });
  }

  // Paramètre `token` présent (même vide) = parcours « lien signé » : jeton
  // valide exigé, AUCUN repli sur la session (sinon `?token=` vide servirait à
  // contourner le contrôle CSRF du middleware).
  const authorized = req.nextUrl.searchParams.has("token")
    ? Boolean(token) && (await verifyUnsubscribeToken(alert.email, token))
    : await isOwner(alert.email);
  if (!authorized) {
    return options.html
      ? htmlResponse(403, "Lien invalide", "Le lien de désinscription n'est pas valide ou a expiré.")
      : NextResponse.json({ ok: false, error: "Accès refusé." }, { status: 403 });
  }

  const ok = await deleteAlert(id);
  if (!ok) {
    return options.html
      ? htmlResponse(500, "Erreur", "Suppression impossible. Réessaie plus tard.")
      : NextResponse.json({ ok: false, error: "Suppression impossible." }, { status: 500 });
  }

  return options.html
    ? htmlResponse(200, "Alerte supprimée", `Vous ne recevrez plus d'email pour cette alerte (${alert.symbol} ${alert.condition === "above" ? ">" : "<"} ${alert.threshold} ${alert.currency.toUpperCase()}).`)
    : NextResponse.json({ ok: true }, { status: 200 });
}

export async function GET(req: NextRequest, ctx: Ctx): Promise<NextResponse> {
  if (!rateLimit(getClientIp(req))) {
    return NextResponse.json({ ok: false, error: "Trop de requêtes." }, { status: 429 });
  }

  const action = req.nextUrl.searchParams.get("action");
  if (action === "delete") {
    // Le lien de l'email n'exécute rien : page de confirmation, puis POST.
    // (Les scanners de liens ouvrent les URL des emails — audit 2026-10-01.)
    const token = req.nextUrl.searchParams.get("token") ?? "";
    const alert = token ? await getAlertById(ctx.params.id) : null;
    if (!alert) {
      return htmlResponse(token ? 200 : 400, token ? "Alerte introuvable" : "Lien invalide", token ? "Cette alerte a déjà été supprimée ou n'existe plus." : "Token manquant.");
    }
    if (!(await verifyUnsubscribeToken(alert.email, token))) {
      return htmlResponse(403, "Lien invalide", "Le lien de désinscription n'est pas valide ou a expiré.");
    }
    return new NextResponse(
      confirmActionPage({
        title: "Désactiver cette alerte ?",
        message: `Alerte ${alert.symbol} ${alert.condition === "above" ? ">" : "<"} ${alert.threshold} ${alert.currency.toUpperCase()} : vous ne recevrez plus d'email pour elle.`,
        actionUrl: `${req.nextUrl.pathname}${req.nextUrl.search}`,
        buttonLabel: "Désactiver l'alerte",
      }),
      { status: 200, headers: HTML_HEADERS },
    );
  }

  // Lecture simple — propriétaire connecté uniquement.
  const alert = await getAlertById(ctx.params.id);
  if (!alert || !(await isOwner(alert.email))) {
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

/** POST = bouton de la page de confirmation (lien email, token obligatoire). */
export async function POST(req: NextRequest, ctx: Ctx): Promise<NextResponse> {
  if (!rateLimit(getClientIp(req))) {
    return NextResponse.json({ ok: false, error: "Trop de requêtes." }, { status: 429 });
  }
  if (req.nextUrl.searchParams.get("action") !== "delete") {
    return NextResponse.json({ ok: false, error: "Action inconnue." }, { status: 400 });
  }
  return handleDelete(req, ctx.params.id, { html: true });
}

export async function DELETE(req: NextRequest, ctx: Ctx): Promise<NextResponse> {
  if (!rateLimit(getClientIp(req))) {
    return NextResponse.json({ ok: false, error: "Trop de requêtes." }, { status: 429 });
  }

  return handleDelete(req, ctx.params.id, { html: false });
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
