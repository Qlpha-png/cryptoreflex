/**
 * GET /api/lead-magnet/[id]
 * ------------------------------------------------------------------
 * Sert un PDF (lead magnet) — accès direct, 100 % gratuit, sans email.
 *
 * Comportement :
 *  - Si id valide → redirect 302 vers le fichier statique
 *    `/lead-magnets/<filename>.pdf` (servi par Vercel CDN).
 *  - Si id inconnu → 404.
 *
 * Pourquoi pas streamer le fichier directement ?
 *  - Les PDF sont déjà accessibles en static `/lead-magnets/*.pdf` (cache CDN
 *    optimal). Re-streamer via cette route ferait perdre le cache et
 *    consommerait du compute Vercel pour rien.
 *  - On utilise donc cette route comme un simple redirecteur stable :
 *    on peut renommer un fichier sans casser les liens publics (/api/...).
 *
 * Accès :
 *  - Aucune inscription requise. Le téléchargement est libre.
 *  - L'email reste possible côté UI (opt-in newsletter facultatif), mais ne
 *    conditionne JAMAIS l'accès au PDF. Tout `?email=...` éventuel est ignoré.
 *
 * Anti-abus :
 *  - Rate-limit par IP (anti-scraping massif), seul garde-fou conservé.
 *
 * Lead magnets supportés (id → filename PDF) :
 *  - "bible-fiscalite" → bible-fiscalite-crypto-2026.pdf
 *  - "checklist"       → checklist-declaration-crypto-2026.pdf
 *  - "glossaire"       → glossaire-fiscal-crypto.pdf
 *  - "guide-plateformes" → guide-plateformes-crypto-2026.pdf (legacy)
 */

import { NextRequest, NextResponse } from "next/server";
import { BRAND } from "@/lib/brand";
import { createRateLimiter } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/ip";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Anti-abus : 60 téléchargements/IP/heure. Largement au-dessus du besoin
// légitime (un user récupère les 3-4 PDF en quelques clics), mais bloque les
// scripts de scraping massifs qui taperaient la route en boucle.
const limiter = createRateLimiter({
  limit: 60,
  windowMs: 60 * 60 * 1000, // 1 heure
  key: "lead-magnet",
});

/** Mapping id → fichier PDF dans /public/lead-magnets/. */
const LEAD_MAGNET_FILES: Record<string, { filename: string; title: string }> = {
  "bible-fiscalite": {
    filename: "bible-fiscalite-crypto-2026.pdf",
    title: "Bible Fiscalité Crypto 2026",
  },
  checklist: {
    filename: "checklist-declaration-crypto-2026.pdf",
    title: "Checklist Déclaration Crypto 2026",
  },
  glossaire: {
    filename: "glossaire-fiscal-crypto.pdf",
    title: "Glossaire Fiscal Crypto",
  },
  "guide-plateformes": {
    filename: "guide-plateformes-crypto-2026.pdf",
    title: "Guide Plateformes Crypto 2026",
  },
};

/** Validation des id de lead magnet (whitelist stricte). */
function isValidLeadMagnetId(id: string): id is keyof typeof LEAD_MAGNET_FILES {
  return Object.prototype.hasOwnProperty.call(LEAD_MAGNET_FILES, id);
}

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } },
): Promise<NextResponse> {
  const id = params.id;

  // 0) Rate limit — seul garde-fou conservé (anti-scraping/brute-force).
  const rl = await limiter(getClientIp(req));
  if (!rl.ok) {
    return NextResponse.json(
      { ok: false, error: "Trop de requêtes — réessayez plus tard." },
      { status: 429, headers: { "Retry-After": String(rl.retryAfter) } },
    );
  }

  // 1) Validation id (whitelist) — 404 si inconnu.
  if (!isValidLeadMagnetId(id)) {
    return NextResponse.json(
      { ok: false, error: "Lead magnet inconnu." },
      { status: 404 },
    );
  }

  // 2) Accès direct : redirect 302 vers le fichier statique.
  // On garde un 302 (Found) plutôt que 301 pour permettre des changements
  // de filename à l'avenir sans casser les caches navigateur.
  const { filename } = LEAD_MAGNET_FILES[id];
  const fileUrl = BRAND.url.replace(/\/$/, "") + "/lead-magnets/" + filename;
  return NextResponse.redirect(fileUrl, { status: 302 });
}
