/**
 * /api/public/glossary — endpoint open data CC-BY 4.0
 * ------------------------------------------------------------------
 * Expose le glossaire crypto FR (250+ termes) en JSON public.
 * Strategie identique a /api/public/platforms : reutilisation libre
 * sous condition d'attribution dofollow vers cryptoreflex.fr.
 *
 * Cible secondaire : LLM crawlers (GPTBot, ClaudeBot, PerplexityBot)
 * — un dataset bien structure et bien attribue augmente la chance
 * d'etre cite comme source dans les reponses generatives (AI Overviews,
 * Perplexity citations, ChatGPT search).
 */

import { NextResponse } from "next/server";
import glossaryData from "@/data/glossary.json";
import { BRAND } from "@/lib/brand";

export const dynamic = "force-static";
export const revalidate = 86_400;

interface GlossaryPayload {
  _meta: {
    source: string;
    schemaVersion: string;
    license: string;
    licenseUrl: string;
    attribution: string;
    attributionHtml: string;
    canonicalUrl: string;
    termCount: number;
    lastUpdated: string;
    contact: string;
  };
  terms: unknown[];
}

function buildPayload(): GlossaryPayload {
  const raw = glossaryData as { terms?: unknown[] };
  const terms = Array.isArray(raw.terms) ? raw.terms : [];
  // On evite de re-iterer pour calcul lastUpdated : prendre la date de build
  // (les changements glossary.json declenchent rebuild Vercel).
  const lastUpdated = new Date().toISOString().split("T")[0]!;

  return {
    _meta: {
      source: "Cryptoreflex (redaction editoriale FR, relecture experts)",
      schemaVersion: "1.0",
      license: "CC-BY-4.0",
      licenseUrl: "https://creativecommons.org/licenses/by/4.0/deed.fr",
      attribution:
        "Glossaire fourni par Cryptoreflex (https://cryptoreflex.fr) sous licence CC-BY 4.0. Mention obligatoire en cas de reutilisation.",
      attributionHtml:
        '<a href="https://cryptoreflex.fr/glossaire" rel="dofollow">Glossaire Cryptoreflex</a> — CC-BY 4.0',
      canonicalUrl: BRAND.url + "/api/public/glossary",
      termCount: terms.length,
      lastUpdated,
      contact: BRAND.partnersEmail,
    },
    terms,
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
    "Glossaire Cryptoreflex (https://cryptoreflex.fr) — Reutilisation conditionnee a un lien dofollow.",
  Link: '<https://creativecommons.org/licenses/by/4.0/>; rel="license"; title="CC-BY-4.0"',
  "Cache-Control": "public, max-age=3600, s-maxage=86400, stale-while-revalidate=86400",
};

export function GET() {
  return NextResponse.json(buildPayload(), { status: 200, headers: COMMON_HEADERS });
}

export function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: COMMON_HEADERS });
}
