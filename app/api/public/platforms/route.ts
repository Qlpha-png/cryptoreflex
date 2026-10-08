/**
 * /api/public/platforms — endpoint open data CC-BY 4.0
 * ------------------------------------------------------------------
 * Expose le dataset platforms.json en JSON public, accessible CORS *,
 * pour que des sites tiers (blogs FR, podcasts crypto, agregateurs)
 * puissent reutiliser nos donnees a condition de citer Cryptoreflex.
 *
 * Strategie backlinks organiques :
 *  - Toute reutilisation = attribution requise = lien dofollow vers
 *    https://cryptoreflex.fr (clause CC-BY 4.0 dans le payload `_meta`)
 *  - Cible : referencement dans listes "free crypto APIs FR",
 *    "open data crypto Europe", developpeurs solo qui buildent un
 *    side-project avec des donnees PSAN/MiCA.
 *
 * Pourquoi pas un endpoint authentifie / rate-limite ?
 *  - Le dataset est petit (< 50 KB), volontairement copiable
 *  - On veut maximiser la diffusion, pas la controler
 *  - Le rate-limit edge Vercel (100 req/s par IP) suffit a se proteger
 *    d'un crawl abusif sans friction pour les usages legitimes.
 *
 * Conformite license :
 *  - Header HTTP `X-License: CC-BY-4.0`
 *  - Footer `_meta.attribution` dans le JSON, requis pour la reutilisation
 *  - Header `Link: rel="license"` pointant vers le texte officiel CC
 */

import { NextResponse } from "next/server";
import platformsData from "@/data/platforms.json";
import { BRAND } from "@/lib/brand";
import { withOfficialLink } from "@/lib/platforms";
import { PUBLIC_API_CACHE_CONTROL, platformsLastUpdated } from "@/lib/public-data-dates";

// Force static eval au build (data/platforms.json est versionne en repo).
export const dynamic = "force-static";
// Revalidation 24h (les donnees PSAN/MiCA bougent peu).
export const revalidate = 86_400;

interface PlatformsPayload {
  _meta: {
    source: string;
    schemaVersion: string;
    license: string;
    licenseUrl: string;
    attribution: string;
    attributionHtml: string;
    canonicalUrl: string;
    lastUpdated: string | null;
    contact: string;
  };
  platforms: unknown;
}

function buildPayload(): PlatformsPayload {
  // platforms.json contient deja un `_meta` interne ; on le wrappe avec
  // les champs de license publics (separation source vs distribution).
  const raw = platformsData as { _meta?: { lastUpdated?: string }; platforms?: unknown };
  // Exclut les plateformes fermées au marché FR (ex : Gemini) — le dataset public
  // reflète les plateformes disponibles en France (cohérent avec le compteur 33).
  // 06/10/2026 : affiliateUrl = site officiel pour toute plateforme sans relation rémunérée réelle
  // (lib/partnerships.ts) — plus de faux codes de parrainage (« ?ref=cryptoreflex ») dans le jeu public.
  const published = (
    (raw.platforms as Array<{ id: string; websiteUrl: string; affiliateUrl: string; fees?: { verified?: { verdict?: string } } }>) ?? []
  ).filter((p) => p?.fees?.verified?.verdict !== "indisponible");
  // 08/10/2026 (audit de fraîcheur n° 31) : date la plus récente des vérifications des lignes publiées, et non le
  // _meta.lastUpdated du fichier (resté au 13/06 alors que les lignes ont été revérifiées en octobre).
  const lastUpdated = platformsLastUpdated(raw._meta, published);

  return {
    _meta: {
      source: "Cryptoreflex (recherche editoriale, recoupement AMF/ESMA)",
      schemaVersion: "1.0",
      license: "CC-BY-4.0",
      licenseUrl: "https://creativecommons.org/licenses/by/4.0/deed.fr",
      attribution:
        "Donnees fournies par Cryptoreflex (https://cryptoreflex.fr) sous licence CC-BY 4.0. Mention obligatoire en cas de reutilisation.",
      attributionHtml:
        '<a href="https://cryptoreflex.fr" rel="dofollow">Donnees Cryptoreflex</a> — CC-BY 4.0',
      canonicalUrl: BRAND.url + "/api/public/platforms",
      lastUpdated,
      contact: BRAND.partnersEmail,
    },
    platforms: published.map(withOfficialLink),
  };
}

const COMMON_HEADERS: Record<string, string> = {
  "Content-Type": "application/json; charset=utf-8",
  // CORS large : on veut explicitement autoriser le cross-origin pour faciliter
  // la consommation depuis un blog ou une SPA tierce.
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Max-Age": "86400",
  // License signalee a 3 niveaux : header custom, header Link RFC 5988, payload.
  "X-License": "CC-BY-4.0",
  "X-Attribution":
    "Donnees Cryptoreflex (https://cryptoreflex.fr) - Reutilisation conditionnee a un lien dofollow.",
  Link: '<https://creativecommons.org/licenses/by/4.0/>; rel="license"; title="CC-BY-4.0"',
  // Cache : 1 h navigateur, 24 h CDN (lib/public-data-dates.ts, même valeur que le libellé de /api-publique).
  "Cache-Control": PUBLIC_API_CACHE_CONTROL,
};

export function GET() {
  const payload = buildPayload();
  return NextResponse.json(payload, { status: 200, headers: COMMON_HEADERS });
}

export function OPTIONS() {
  // Preflight CORS — pas de body, juste les headers.
  return new NextResponse(null, { status: 204, headers: COMMON_HEADERS });
}
