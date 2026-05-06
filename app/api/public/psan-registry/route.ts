/**
 * /api/public/psan-registry — endpoint open data CC-BY 4.0
 * ------------------------------------------------------------------
 * Expose le registre PSAN (FR) + statut MiCA (UE) compilé par Cryptoreflex
 * à partir des sources officielles AMF, ESMA, BaFin, etc.
 *
 * Pourquoi ce endpoint :
 *  - L'AMF publie un registre PSAN mais en HTML moche, non parsable
 *  - L'ESMA publie le registre MiCA mais éparpillé entre CSV et PDF
 *  - On consolide les deux + ajoute le champ `atRiskJuly2026` (deadline
 *    fin transition MiCA) qui n'existe nulle part ailleurs en open data FR
 *
 * Strategie backlinks organiques :
 *  - Le dataset "PSAN + MiCA agrégé" est rare en FR
 *  - Cible : devs solo qui buildent un comparateur, journalistes qui
 *    veulent un tableau à jour, étudiants en droit fintech
 *  - Toute reutilisation = attribution requise = lien dofollow vers
 *    https://cryptoreflex.fr (clause CC-BY 4.0)
 */

import { NextResponse } from "next/server";
import psanData from "@/data/psan-registry.json";
import { BRAND } from "@/lib/brand";

export const dynamic = "force-static";
export const revalidate = 86_400;

interface PsanPayload {
  _meta: {
    source: string;
    schemaVersion: string;
    license: string;
    licenseUrl: string;
    attribution: string;
    attributionHtml: string;
    canonicalUrl: string;
    lastUpdated: string;
    nextReviewDate?: string;
    contact: string;
    officialSources: Record<string, string>;
  };
  platforms: unknown;
}

function buildPayload(): PsanPayload {
  const raw = psanData as {
    _meta?: {
      lastUpdated?: string;
      nextReviewDate?: string;
      officialSources?: Record<string, string>;
    };
    platforms?: unknown;
  };
  const lastUpdated = raw._meta?.lastUpdated ?? new Date().toISOString().split("T")[0];

  return {
    _meta: {
      source: "Cryptoreflex (consolidation registres AMF / ESMA / BaFin / CNMV / MFSA / CSSF / Bank of Lithuania / Central Bank of Ireland)",
      schemaVersion: "1.0",
      license: "CC-BY-4.0",
      licenseUrl: "https://creativecommons.org/licenses/by/4.0/deed.fr",
      attribution:
        "Donnees fournies par Cryptoreflex (https://cryptoreflex.fr) sous licence CC-BY 4.0. Mention obligatoire en cas de reutilisation.",
      attributionHtml:
        '<a href="https://cryptoreflex.fr" rel="dofollow">Donnees Cryptoreflex</a> — CC-BY 4.0',
      canonicalUrl: BRAND.url + "/api/public/psan-registry",
      lastUpdated,
      nextReviewDate: raw._meta?.nextReviewDate,
      contact: BRAND.partnersEmail,
      officialSources: raw._meta?.officialSources ?? {},
    },
    platforms: raw.platforms ?? [],
  };
}

const COMMON_HEADERS: Record<string, string> = {
  "Content-Type": "application/json; charset=utf-8",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Max-Age": "86400",
  "X-License": "CC-BY-4.0",
  "X-Attribution":
    "Donnees Cryptoreflex (https://cryptoreflex.fr) - Reutilisation conditionnee a un lien dofollow.",
  Link: '<https://creativecommons.org/licenses/by/4.0/>; rel="license"; title="CC-BY-4.0"',
  "Cache-Control": "public, max-age=3600, s-maxage=86400, stale-while-revalidate=86400",
};

export function GET() {
  const payload = buildPayload();
  return NextResponse.json(payload, { status: 200, headers: COMMON_HEADERS });
}

export function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: COMMON_HEADERS });
}
