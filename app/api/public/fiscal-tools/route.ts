/**
 * /api/public/fiscal-tools — endpoint open data CC-BY 4.0
 * ------------------------------------------------------------------
 * Comparatif des outils de fiscalité crypto (Waltio, Koinly, CoinTracking,
 * etc.) avec tarification, fonctionnalités, support FR, MiCA compliance.
 *
 * Pourquoi unique :
 *  - Aucun comparateur FR open data sur les outils fiscaux crypto
 *  - Cerfa 2086 + 3916-bis = pic recherche en mai chaque année
 *  - Cible : blogs finance perso, comptables, freelances qui couvrent fiscalité
 */

import { NextResponse } from "next/server";
import fiscalToolsData from "@/data/fiscal-tools.json";
import { BRAND } from "@/lib/brand";

export const dynamic = "force-static";
export const revalidate = 86_400;

interface FiscalToolsPayload {
  _meta: {
    source: string;
    schemaVersion: string;
    license: string;
    licenseUrl: string;
    attribution: string;
    attributionHtml: string;
    canonicalUrl: string;
    lastUpdated: string;
    contact: string;
    disclaimer: string;
  };
  tools: unknown;
}

function buildPayload(): FiscalToolsPayload {
  const raw = fiscalToolsData as {
    _meta?: { lastUpdated?: string };
    tools?: unknown;
  };
  const lastUpdated = raw._meta?.lastUpdated ?? new Date().toISOString().split("T")[0];

  return {
    _meta: {
      source: "Cryptoreflex (recherche éditoriale sites officiels Waltio, Koinly, CoinTracking)",
      schemaVersion: "1.0",
      license: "CC-BY-4.0",
      licenseUrl: "https://creativecommons.org/licenses/by/4.0/deed.fr",
      attribution:
        "Donnees fournies par Cryptoreflex (https://cryptoreflex.fr) sous licence CC-BY 4.0. Mention obligatoire en cas de reutilisation.",
      attributionHtml:
        '<a href="https://cryptoreflex.fr" rel="dofollow">Donnees Cryptoreflex</a> — CC-BY 4.0',
      canonicalUrl: BRAND.url + "/api/public/fiscal-tools",
      lastUpdated,
      contact: BRAND.partnersEmail,
      disclaimer:
        "Information indicative — vérifier les tarifs et fonctionnalités sur le site officiel de chaque outil avant souscription. Cryptoreflex ne fournit pas de conseil fiscal.",
    },
    tools: raw.tools ?? [],
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
    "Donnees Cryptoreflex (https://cryptoreflex.fr) — Reutilisation conditionnee a un lien dofollow.",
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
