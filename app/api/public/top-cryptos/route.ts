/**
 * /api/public/top-cryptos — endpoint open data CC-BY 4.0
 * ------------------------------------------------------------------
 * Expose les fiches cryptos top 10 par capitalisation, vulgarisées en
 * français pour débutants : description, cas d'usage, points forts,
 * points faibles, beginnerFriendly score, riskLevel, plateformes
 * d'achat compatibles France.
 *
 * Pourquoi unique :
 *  - CoinGecko / CMC publient les chiffres mais en anglais et techniques
 *  - Aucun dataset FR n'expose un "tagline" + "useCase débutant" structuré
 *  - On cible les blogs FR qui veulent vulgariser sans pomper Wikipedia
 */

import { NextResponse } from "next/server";
import topCryptos from "@/data/top-cryptos.json";
import { BRAND } from "@/lib/brand";

export const dynamic = "force-static";
export const revalidate = 86_400;

interface TopCryptosPayload {
  _meta: {
    source: string;
    purpose: string;
    schemaVersion: string;
    license: string;
    licenseUrl: string;
    attribution: string;
    attributionHtml: string;
    canonicalUrl: string;
    lastUpdated: string;
    contact: string;
  };
  topCryptos: unknown;
}

function buildPayload(): TopCryptosPayload {
  const raw = topCryptos as {
    _meta?: { lastUpdated?: string; purpose?: string };
    topCryptos?: unknown;
  };
  const lastUpdated = raw._meta?.lastUpdated ?? new Date().toISOString().split("T")[0];

  return {
    _meta: {
      source: "Cryptoreflex (recherche éditoriale, vulgarisation francophone)",
      purpose: raw._meta?.purpose ?? "Top 10 cryptos par capitalisation, expliquées pour débutants FR",
      schemaVersion: "1.0",
      license: "CC-BY-4.0",
      licenseUrl: "https://creativecommons.org/licenses/by/4.0/deed.fr",
      attribution:
        "Donnees fournies par Cryptoreflex (https://cryptoreflex.fr) sous licence CC-BY 4.0. Mention obligatoire en cas de reutilisation.",
      attributionHtml:
        '<a href="https://cryptoreflex.fr" rel="dofollow">Donnees Cryptoreflex</a> — CC-BY 4.0',
      canonicalUrl: BRAND.url + "/api/public/top-cryptos",
      lastUpdated,
      contact: BRAND.partnersEmail,
    },
    topCryptos: raw.topCryptos ?? [],
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
