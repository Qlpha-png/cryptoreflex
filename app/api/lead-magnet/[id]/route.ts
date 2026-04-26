/**
 * GET /api/lead-magnet/[id]?email=foo@bar.com
 * ------------------------------------------------------------------
 * Sert un PDF (lead magnet) après vérification que l'email est bien abonné.
 *
 * Comportement :
 *  - Si email valide ET abonné Beehiiv actif → redirect vers le fichier
 *    statique `/lead-magnets/<filename>.pdf` (servi par Vercel CDN).
 *  - Si email manquant ou non abonné → redirect vers `/newsletter` avec UTM
 *    + query string `lead_magnet=<id>` pour pre-fill un retour user.
 *
 * Pourquoi pas streamer le fichier directement ?
 *  - Les PDF sont déjà accessibles en static `/lead-magnets/*.pdf` (cache CDN
 *    optimal). Re-streamer via cette route ferait perdre le cache et
 *    consommerait du compute Vercel pour rien.
 *  - On utilise donc cette route comme un "gate" léger : check abonnement
 *    puis 302 vers le fichier final.
 *
 * Sécurité :
 *  - Pas d'auth — l'inscription email est le "paywall" choisi.
 *  - Validation email serveur (jamais faire confiance au query string).
 *  - Mode mock Beehiiv : autorise le download (cf. `isActiveSubscriber()`).
 *
 * Lead magnets supportés (id → filename PDF) :
 *  - "bible-fiscalite" → bible-fiscalite-crypto-2026.pdf
 *  - "checklist"       → checklist-declaration-crypto-2026.pdf
 *  - "glossaire"       → glossaire-fiscal-crypto.pdf
 *  - "guide-plateformes" → guide-plateformes-crypto-2026.pdf (legacy)
 */

import { NextRequest, NextResponse } from "next/server";
import { isValidEmail } from "@/lib/newsletter";
import { isActiveSubscriber } from "@/lib/beehiiv";
import { BRAND } from "@/lib/brand";
import { createRateLimiter } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/ip";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Anti-abus : 10 téléchargements/IP/heure. Largement au-dessus du besoin
// légitime (un user qui veut le PDF clique 1-2 fois max), mais bloque les
// scripts de scraping massifs ou un attaquant qui voudrait tester massivement
// des emails contre l'API Beehiiv via cette route.
const limiter = createRateLimiter({
  limit: 10,
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

/**
 * Construit l'URL de redirection vers /newsletter quand l'utilisateur
 * n'est pas abonné. UTM + query lead_magnet pour pre-fill les UI futures.
 */
function buildNewsletterRedirect(id: string): string {
  const base = BRAND.url.replace(/\/$/, "");
  return (
    base +
    "/newsletter?lead_magnet=" +
    encodeURIComponent(id) +
    "&utm_source=lead-magnet&utm_medium=gate&utm_campaign=" +
    encodeURIComponent("lead-magnet-" + id)
  );
}

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } },
): Promise<NextResponse> {
  const id = params.id;

  // 0) Rate limit — défense anti-scraping/brute-force avant tout traitement.
  const rl = await limiter(getClientIp(req));
  if (!rl.ok) {
    return NextResponse.json(
      { ok: false, error: "Trop de requêtes — réessayez plus tard." },
      { status: 429, headers: { "Retry-After": String(rl.retryAfter) } },
    );
  }

  // 1) Validation id (whitelist)
  if (!isValidLeadMagnetId(id)) {
    return NextResponse.json(
      { ok: false, error: "Lead magnet inconnu." },
      { status: 404 },
    );
  }

  const { filename } = LEAD_MAGNET_FILES[id];
  const url = new URL(req.url);
  const email = url.searchParams.get("email")?.trim().toLowerCase() ?? "";

  // 2) Si pas d'email, redirect vers /newsletter
  if (!email || !isValidEmail(email)) {
    return NextResponse.redirect(buildNewsletterRedirect(id), { status: 302 });
  }

  // 3) Check Beehiiv (subscriber actif ?)
  const subscriber = await isActiveSubscriber(email);
  if (!subscriber) {
    // Email valide mais pas abonné → encourage l'inscription
    return NextResponse.redirect(buildNewsletterRedirect(id), { status: 302 });
  }

  // 4) Tout OK : redirect vers le fichier statique
  // On garde un 302 (Found) plutôt que 301 pour permettre des changements
  // de filename à l'avenir sans casser les caches navigateur.
  const fileUrl = BRAND.url.replace(/\/$/, "") + "/lead-magnets/" + filename;
  return NextResponse.redirect(fileUrl, { status: 302 });
}
