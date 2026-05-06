/**
 * /api/public/decentralization-scores — endpoint open data CC-BY 4.0
 * ------------------------------------------------------------------
 * Expose les scores de décentralisation Cryptoreflex pour Bitcoin, Ethereum,
 * Solana, etc. — methodologie composite (Nakamoto coefficient, validators,
 * geo diversity, client diversity, open source) sur 5 critères pondérés.
 *
 * Pourquoi ce dataset est unique :
 *  - Aucun open data FR ne publie un score consolidé "décentralisation"
 *  - Glassnode, Messari = paywall ; Nakaflow = juste Nakamoto coef
 *  - On agrège 5 sources publiques (Nakaflow, EthernNodes, Solana Beach,
 *    Mintscan, GitHub) en un score 0-10 directement utilisable
 *
 * Strategie backlinks organiques :
 *  - Cible : journalistes / podcasts crypto qui veulent un chiffre simple
 *    pour illustrer "Bitcoin est-il vraiment décentralisé ?"
 *  - Reusable in studies & academic papers (mention CC-BY = backlink)
 */

import { NextResponse } from "next/server";
import scoresData from "@/data/decentralization-scores.json";
import { BRAND } from "@/lib/brand";

export const dynamic = "force-static";
export const revalidate = 86_400;

interface ScoresPayload {
  _meta: {
    source: string;
    methodology: string;
    schemaVersion: string;
    license: string;
    licenseUrl: string;
    attribution: string;
    attributionHtml: string;
    canonicalUrl: string;
    lastUpdated: string;
    contact: string;
  };
  scores: unknown;
}

function buildPayload(): ScoresPayload {
  const raw = scoresData as {
    lastUpdated?: string;
    methodology?: string;
    scores?: unknown;
  };
  const lastUpdated = raw.lastUpdated ?? new Date().toISOString().split("T")[0];

  return {
    _meta: {
      source: "Cryptoreflex (agrégation Nakaflow, EthernNodes, Solana Beach, Mintscan, GitHub)",
      methodology:
        raw.methodology ??
        "Score composite sur 5 critères pondérés : Nakamoto coefficient (30%), validateurs/mineurs actifs (25%), diversité géographique (15%), diversité des clients logiciels (15%), open source (15%).",
      schemaVersion: "1.0",
      license: "CC-BY-4.0",
      licenseUrl: "https://creativecommons.org/licenses/by/4.0/deed.fr",
      attribution:
        "Donnees fournies par Cryptoreflex (https://cryptoreflex.fr) sous licence CC-BY 4.0. Mention obligatoire en cas de reutilisation.",
      attributionHtml:
        '<a href="https://cryptoreflex.fr" rel="dofollow">Donnees Cryptoreflex</a> — CC-BY 4.0',
      canonicalUrl: BRAND.url + "/api/public/decentralization-scores",
      lastUpdated,
      contact: BRAND.partnersEmail,
    },
    scores: raw.scores ?? {},
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
