/**
 * POST /api/academy/certificate
 *
 * Génère un certificat HTML imprimable A4 pour un track donné.
 *
 *  Body : { trackId: "debutant" | "intermediaire" | "avance"; name: string }
 *  Réponse : `text/html; charset=utf-8` avec content-disposition `attachment`,
 *            que le navigateur enregistre en .html. L'utilisateur fait
 *            Ctrl/Cmd + P → Enregistrer en PDF.
 *
 * Pourquoi pas un vrai PDF (puppeteer, @react-pdf) ?
 *   - @react-pdf/renderer ajoute ~2 MB au bundle serverless et casse souvent
 *     en environnement Edge / Vercel Lambda.
 *   - Puppeteer / Chromium est lourd (>50 MB).
 *   - L'export "Imprimer en PDF" navigateur produit un PDF identique en
 *     qualité, sans aucune dépendance NPM.
 *
 * Si on veut basculer en vrai PDF plus tard : il suffit d'ajouter
 * `@react-pdf/renderer` aux deps et remplacer la génération HTML par un
 * <Document /> renvoyé via `renderToStream`.
 *
 * Sécurité :
 *   - Le `name` est échappé HTML (helper `escapeHtml`) pour éviter toute
 *     injection (XSS si l'utilisateur ouvre son propre certificat dans le
 *     navigateur — improbable, mais defensive).
 *   - Aucune donnée n'est persistée côté serveur.
 *   - Validation stricte de `trackId` (whitelist).
 */

import { NextResponse } from "next/server";
import { getTrack, type TrackId } from "@/lib/academy-tracks";
import { BRAND } from "@/lib/brand";
import { createRateLimiter } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/ip";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Rate limit : 30 certificats / heure / IP.
 *
 * Pourquoi 30/h : un user honnête en génère 1-3 (un par track terminé).
 * 30 laisse une grosse marge pour les retours/regen sans bloquer, mais
 * empêche un bot de cramer 1000 certificats/min (chacun coûte un buildHtml
 * qui mange ~2 KB de RAM + envoie ~6 KB sur le réseau).
 *
 * Audit M9 (26-04) : la route était sans limit avant — un attaquant pouvait
 * facilement saturer le pod / faire grimper les coûts Vercel.
 */
const rateLimiter = createRateLimiter({
  limit: 30,
  windowMs: 3600 * 1000,
  key: "academy-cert",
});

function escapeHtml(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function frenchDate(): string {
  return new Date().toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function buildHtml(name: string, trackId: TrackId, trackTitle: string): string {
  const safeName = escapeHtml(name).slice(0, 80);
  const safeTrack = escapeHtml(trackTitle);
  const date = frenchDate();
  const ref = `CR-${trackId.toUpperCase()}-${Date.now().toString(36).toUpperCase()}`;

  // CSS print : A4 landscape, marges 1cm, police serif élégante. Tous les
  // styles sont inline dans <style> pour rester self-contained une fois sauvé.
  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Certificat ${safeTrack} — ${safeName}</title>
  <style>
    @page { size: A4 landscape; margin: 0; }
    * { box-sizing: border-box; }
    html, body { margin: 0; padding: 0; }
    body {
      font-family: "Cormorant Garamond", "Georgia", serif;
      background: #f5f1e8;
      color: #1a1a1a;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 24px;
    }
    .certificate {
      width: 100%;
      max-width: 1100px;
      aspect-ratio: 1.414 / 1;
      background:
        radial-gradient(circle at 20% 20%, rgba(245,165,36,0.08), transparent 50%),
        radial-gradient(circle at 80% 80%, rgba(245,165,36,0.10), transparent 50%),
        #fdfbf4;
      border: 14px solid #1a1a1a;
      outline: 1px solid #b58c2e;
      outline-offset: -22px;
      padding: 56px 80px;
      position: relative;
      box-shadow: 0 30px 80px -30px rgba(0,0,0,0.3);
    }
    .corners::before, .corners::after,
    .corners > span::before, .corners > span::after {
      content: "";
      position: absolute;
      width: 26px;
      height: 26px;
      border: 2px solid #b58c2e;
    }
    .corners::before { top: 30px; left: 30px; border-right: none; border-bottom: none; }
    .corners::after { top: 30px; right: 30px; border-left: none; border-bottom: none; }
    .corners > span::before { bottom: 30px; left: 30px; border-right: none; border-top: none; position:absolute; }
    .corners > span::after { bottom: 30px; right: 30px; border-left: none; border-top: none; position:absolute; }

    .header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
    }
    .brand {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .logo {
      width: 44px;
      height: 44px;
      border-radius: 10px;
      background: linear-gradient(135deg, #F5A524, #FBBF24);
      color: #0B0D10;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      font-family: "Inter", sans-serif;
      font-weight: 800;
      font-size: 20px;
    }
    .brand-name {
      font-family: "Inter", sans-serif;
      font-weight: 700;
      font-size: 16px;
      letter-spacing: 0.02em;
      color: #1a1a1a;
    }
    .ref {
      font-family: "JetBrains Mono", "Courier New", monospace;
      font-size: 11px;
      color: #6c6557;
      letter-spacing: 0.05em;
    }

    .title-wrap {
      text-align: center;
      margin-top: 28px;
    }
    .eyebrow {
      font-family: "Inter", sans-serif;
      font-weight: 600;
      font-size: 12px;
      letter-spacing: 0.4em;
      text-transform: uppercase;
      color: #b58c2e;
      margin-bottom: 12px;
    }
    h1 {
      font-size: 56px;
      font-weight: 700;
      margin: 0;
      letter-spacing: -0.01em;
      color: #1a1a1a;
      line-height: 1.05;
    }
    .accent {
      color: #b58c2e;
      font-style: italic;
    }

    .recipient {
      text-align: center;
      margin-top: 40px;
    }
    .recipient .label {
      font-family: "Inter", sans-serif;
      font-size: 13px;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      color: #6c6557;
    }
    .recipient .name {
      margin-top: 8px;
      font-size: 44px;
      font-weight: 600;
      color: #1a1a1a;
      border-bottom: 1px solid #b58c2e;
      display: inline-block;
      padding: 0 32px 6px;
    }

    .body-text {
      text-align: center;
      margin-top: 28px;
      font-size: 18px;
      line-height: 1.5;
      color: #2a2a2a;
      max-width: 720px;
      margin-left: auto;
      margin-right: auto;
    }
    .body-text strong {
      color: #b58c2e;
      font-style: italic;
    }

    .footer {
      margin-top: 48px;
      display: flex;
      align-items: flex-end;
      justify-content: space-between;
      gap: 24px;
    }
    .footer .col {
      flex: 1;
      text-align: center;
    }
    .footer .signature {
      font-family: "Brush Script MT", cursive;
      font-size: 28px;
      color: #1a1a1a;
      border-bottom: 1px solid #1a1a1a;
      display: inline-block;
      padding: 0 24px 4px;
    }
    .footer .meta {
      font-family: "Inter", sans-serif;
      font-size: 11px;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      color: #6c6557;
      margin-top: 8px;
    }
    .seal {
      width: 90px;
      height: 90px;
      border-radius: 50%;
      border: 2px solid #b58c2e;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      flex-direction: column;
      gap: 2px;
      background: rgba(245, 165, 36, 0.06);
    }
    .seal .seal-top {
      font-family: "Inter", sans-serif;
      font-weight: 700;
      font-size: 9px;
      letter-spacing: 0.2em;
      color: #b58c2e;
    }
    .seal .seal-mid {
      font-family: "Inter", sans-serif;
      font-weight: 800;
      font-size: 22px;
      color: #1a1a1a;
    }
    .seal .seal-bot {
      font-family: "Inter", sans-serif;
      font-size: 8px;
      letter-spacing: 0.15em;
      color: #6c6557;
    }

    .print-hint {
      position: fixed;
      top: 12px;
      left: 50%;
      transform: translateX(-50%);
      background: #1a1a1a;
      color: #fdfbf4;
      padding: 10px 16px;
      border-radius: 999px;
      font-family: "Inter", sans-serif;
      font-size: 13px;
      box-shadow: 0 6px 20px -4px rgba(0,0,0,0.3);
    }
    @media print {
      .print-hint { display: none; }
      body { background: #fff; padding: 0; }
      .certificate { box-shadow: none; }
    }
  </style>
</head>
<body>
  <div class="print-hint">Astuce : Ctrl + P (Cmd + P) puis « Enregistrer en PDF »</div>
  <div class="certificate" role="document" aria-label="Certificat de réussite ${safeTrack}">
    <div class="corners"><span></span></div>

    <div class="header">
      <div class="brand">
        <div class="logo" aria-hidden="true">CR</div>
        <div>
          <div class="brand-name">${BRAND.name}</div>
          <div class="ref">Réf. ${ref}</div>
        </div>
      </div>
      <div class="ref">${BRAND.domain}</div>
    </div>

    <div class="title-wrap">
      <div class="eyebrow">Académie crypto · Cryptoreflex</div>
      <h1>Certificat de <span class="accent">réussite</span></h1>
    </div>

    <div class="recipient">
      <div class="label">Décerné à</div>
      <div class="name">${safeName}</div>
    </div>

    <p class="body-text">
      Pour la complétion intégrale du parcours <strong>${safeTrack}</strong>
      de l&rsquo;Académie crypto Cryptoreflex et la validation du quiz final.
    </p>

    <div class="footer">
      <div class="col">
        <div class="signature">Cryptoreflex</div>
        <div class="meta">Équipe pédagogique</div>
      </div>
      <div class="col">
        <div class="seal" aria-hidden="true">
          <div class="seal-top">CRYPTO</div>
          <div class="seal-mid">CR</div>
          <div class="seal-bot">REFLEX</div>
        </div>
      </div>
      <div class="col">
        <div class="signature">${date}</div>
        <div class="meta">Date de délivrance</div>
      </div>
    </div>
  </div>
</body>
</html>`;
}

const VALID_TRACKS: ReadonlySet<TrackId> = new Set([
  "debutant",
  "intermediaire",
  "avance",
]);

export async function POST(req: Request) {
  // Rate limit anti-abus (audit M9, 26-04). Headers Retry-After + X-RateLimit-Remaining
  // pour qu'un client honnête sache attendre / un bot serveur backoff naturellement.
  const ip = getClientIp(req);
  const rl = await rateLimiter(ip);
  if (!rl.ok) {
    return NextResponse.json(
      { error: "Too many requests" },
      {
        status: 429,
        headers: {
          "Retry-After": String(rl.retryAfter),
          "X-RateLimit-Remaining": "0",
        },
      },
    );
  }

  let body: { trackId?: unknown; name?: unknown };
  try {
    body = (await req.json()) as { trackId?: unknown; name?: unknown };
  } catch {
    return NextResponse.json(
      { error: "Body JSON invalide." },
      { status: 400 }
    );
  }

  const trackId = typeof body.trackId === "string" ? body.trackId : "";
  const name = typeof body.name === "string" ? body.name.trim() : "";

  if (!VALID_TRACKS.has(trackId as TrackId)) {
    return NextResponse.json(
      { error: "trackId invalide." },
      { status: 400 }
    );
  }
  if (name.length < 2 || name.length > 80) {
    return NextResponse.json(
      { error: "Le nom doit contenir entre 2 et 80 caractères." },
      { status: 400 }
    );
  }

  const track = getTrack(trackId);
  if (!track) {
    // Garde-fou (déjà filtré par VALID_TRACKS, mais le compilo est plus heureux).
    return NextResponse.json(
      { error: "Track introuvable." },
      { status: 404 }
    );
  }

  const html = buildHtml(name, trackId as TrackId, track.title);

  return new NextResponse(html, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Content-Disposition": `attachment; filename="certificat-cryptoreflex-${trackId}.html"`,
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
