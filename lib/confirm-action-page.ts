/**
 * lib/confirm-action-page.ts — Page « confirmer en 1 clic » pour les liens
 * d'action envoyés par email (désabonnement, suppression d'alerte).
 *
 * SÉCURITÉ (audit 2026-10-01) : les scanners de liens (Outlook Safe Links,
 * passerelles antivirus) OUVRENT les URL des emails avant l'utilisateur. Si un
 * simple GET déclenchait l'action, ils désabonneraient les gens à leur insu.
 * Règle : le GET affiche cette page ; seul le POST du formulaire (ou le POST
 * RFC 8058 « One-Click » des messageries) exécute l'action.
 */

import { BRAND } from "@/lib/brand";

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

const STYLE = `body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px;background:#0B0D10;color:#F4F5F7;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif}
.card{max-width:520px;width:100%;background:#111827;border-radius:14px;padding:36px 28px;text-align:center;box-shadow:0 20px 60px -20px rgba(0,0,0,.5)}
.logo{font-size:20px;font-weight:800;color:#F5A524;margin:0 0 20px}
h1{font-size:22px;margin:0 0 14px;color:#fff}
p{font-size:15px;line-height:1.6;margin:0 0 12px;color:#D1D5DB}
button{margin-top:18px;padding:13px 22px;border:none;border-radius:10px;background:#F5A524;color:#0B0D10;font-size:15px;font-weight:700;cursor:pointer}
a{color:#F5A524}
.foot{margin-top:22px;font-size:12px;color:#6B7280}`;

/** Page avec un bouton qui envoie le formulaire en POST vers `actionUrl`. */
export function confirmActionPage(opts: {
  title: string;
  message: string;
  actionUrl: string;
  buttonLabel: string;
}): string {
  return `<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex,nofollow"><title>${esc(opts.title)} — ${esc(BRAND.name)}</title><style>${STYLE}</style></head>
<body><main class="card"><div class="logo">${esc(BRAND.name)}</div><h1>${esc(opts.title)}</h1><p>${esc(opts.message)}</p>
<form method="post" action="${esc(opts.actionUrl)}"><button type="submit">${esc(opts.buttonLabel)}</button></form>
<p class="foot">Vous n'êtes pas à l'origine de ce lien ? Fermez simplement cette page : rien ne sera modifié.</p></main></body></html>`;
}

/** Page de résultat (succès ou erreur), sans action. */
export function resultPage(opts: { title: string; message: string }): string {
  return `<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex,nofollow"><title>${esc(opts.title)} — ${esc(BRAND.name)}</title><style>${STYLE}</style></head>
<body><main class="card" role="status"><div class="logo">${esc(BRAND.name)}</div><h1>${esc(opts.title)}</h1><p>${esc(opts.message)}</p>
<p><a href="${esc(BRAND.url)}">Retour sur ${esc(BRAND.domain)}</a></p></main></body></html>`;
}

export const HTML_HEADERS = {
  "Content-Type": "text/html; charset=utf-8",
  "Cache-Control": "no-store",
  "X-Robots-Tag": "noindex, nofollow",
};
