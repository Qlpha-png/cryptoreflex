/**
 * /api/public — endpoint discovery / index
 * ------------------------------------------------------------------
 * Liste tous les endpoints publics CC-BY 4.0 exposés par Cryptoreflex,
 * avec leur description et le schéma minimal attendu.
 *
 * Pourquoi un index :
 *  - Permettre aux devs de découvrir l'API sans avoir à lire la doc HTML
 *  - Servir de canonical pour les annuaires "free crypto APIs FR"
 *  - Donner un point d'entrée unique pour curl / Postman / Insomnia
 */

import { NextResponse } from "next/server";
import { BRAND } from "@/lib/brand";

export const dynamic = "force-static";
export const revalidate = 86_400;

const COMMON_HEADERS: Record<string, string> = {
  "Content-Type": "application/json; charset=utf-8",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Max-Age": "86400",
  "X-License": "CC-BY-4.0",
  Link: '<https://creativecommons.org/licenses/by/4.0/>; rel="license"; title="CC-BY-4.0"',
  "Cache-Control": "public, max-age=3600, s-maxage=86400, stale-while-revalidate=86400",
};

export function GET() {
  const baseUrl = BRAND.url;
  const payload = {
    _meta: {
      apiName: "Cryptoreflex Public Open Data",
      version: "1.0",
      license: "CC-BY-4.0",
      licenseUrl: "https://creativecommons.org/licenses/by/4.0/deed.fr",
      attribution: `Donnees fournies par Cryptoreflex (${baseUrl}) sous licence CC-BY 4.0. Mention obligatoire en cas de reutilisation : lien dofollow vers ${baseUrl}.`,
      attributionHtml: `<a href="${baseUrl}" rel="dofollow">Donnees Cryptoreflex</a> — CC-BY 4.0`,
      docsUrl: `${baseUrl}/api-publique`,
      canonicalUrl: `${baseUrl}/api/public`,
      contact: BRAND.partnersEmail,
      rateLimits: {
        anonymous: "100 req/s par IP (rate limit edge)",
        authenticated: "tier B2B disponible — contacter " + BRAND.partnersEmail,
      },
      cors: "Access-Control-Allow-Origin: * (utilisable depuis tout client)",
    },
    endpoints: [
      {
        path: "/api/public/platforms",
        url: `${baseUrl}/api/public/platforms`,
        description:
          "Catalogue des 33 plateformes crypto comparées (frais, sécurité, MiCA, support FR). Mise à jour mensuelle.",
        responseShape: "{ _meta, platforms: [{ id, name, fees, security, micaStatus, ... }] }",
        updateFrequency: "monthly",
      },
      {
        path: "/api/public/psan-registry",
        url: `${baseUrl}/api/public/psan-registry`,
        description:
          "Registre PSAN (FR) + statut MiCA (UE) consolidé : agrément AMF, autorisation CASP, passeporting UE, risque deadline juillet 2026.",
        responseShape:
          "{ _meta, platforms: [{ id, name, psanStatus, amfRegistration, micaStatus, atRiskJuly2026, ... }] }",
        updateFrequency: "monthly",
      },
      {
        path: "/api/public/decentralization-scores",
        url: `${baseUrl}/api/public/decentralization-scores`,
        description:
          "Score composite Cryptoreflex de décentralisation pour Bitcoin, Ethereum, Solana, etc. (Nakamoto coefficient, validators, geo, clients, open source).",
        responseShape: "{ _meta, scores: { bitcoin: { score, breakdown, notes }, ... } }",
        updateFrequency: "quarterly",
      },
      {
        path: "/api/public/top-cryptos",
        url: `${baseUrl}/api/public/top-cryptos`,
        description:
          "Top 10 cryptos par capitalisation, vulgarisées en français pour débutants : tagline, useCase, points forts/faibles, beginnerFriendly score, riskLevel.",
        responseShape:
          "{ _meta, topCryptos: [{ rank, id, name, symbol, tagline, what, useCase, strengths, weaknesses, ... }] }",
        updateFrequency: "monthly",
      },
      {
        path: "/api/public/fiscal-tools",
        url: `${baseUrl}/api/public/fiscal-tools`,
        description:
          "Comparatif des outils de fiscalité crypto FR (Waltio, Koinly, CoinTracking) : tarifs, plans, support FR, MiCA, freeTrial.",
        responseShape: "{ _meta, tools: [{ id, name, country, pricingModel, plansEur, ... }] }",
        updateFrequency: "monthly",
      },
    ],
    examples: {
      curl: `curl -s ${baseUrl}/api/public/platforms | jq .`,
      javascript: `await fetch("${baseUrl}/api/public/platforms").then(r => r.json())`,
      python: `import requests; r = requests.get("${baseUrl}/api/public/platforms"); data = r.json()`,
    },
  };

  return NextResponse.json(payload, { status: 200, headers: COMMON_HEADERS });
}

export function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: COMMON_HEADERS });
}
