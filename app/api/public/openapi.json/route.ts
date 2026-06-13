/**
 * /api/public/openapi.json — spec OpenAPI 3.0 de l'API publique CC-BY 4.0.
 *
 * Pourquoi exposer une spec OpenAPI :
 *  - Postman / Insomnia importent automatiquement la collection à partir de l'URL
 *  - Swagger UI / Redoc peuvent générer la doc HTML interactive
 *  - Les outils de scraping API (n8n, Make.com, Zapier) découvrent les endpoints
 *  - SEO bonus : Google indexe les fichiers OpenAPI publics
 *
 * Standard : https://spec.openapis.org/oas/v3.0.3
 *
 * Mise à jour : à chaque ajout d'endpoint dans /api/public/*, ajouter sa
 * définition dans `paths` ci-dessous + son schéma de réponse dans `components.schemas`.
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
  "Cache-Control": "public, max-age=3600, s-maxage=86400, stale-while-revalidate=86400",
};

export function GET() {
  const spec = {
    openapi: "3.0.3",
    info: {
      title: "Cryptoreflex Public Open Data API",
      description:
        "API publique CC-BY 4.0 de Cryptoreflex.fr. 5 endpoints JSON sur le marche crypto francais : 33 plateformes auditees, registre PSAN+MiCA consolide, scores de decentralisation, top cryptos vulgarisees, outils fiscalite. Toute reutilisation = attribution requise = lien dofollow vers https://www.cryptoreflex.fr.",
      version: "1.0.0",
      termsOfService: BRAND.url + "/mentions-legales",
      contact: {
        name: "Cryptoreflex Partners",
        email: BRAND.partnersEmail,
        url: BRAND.url + "/api-publique",
      },
      license: {
        name: "CC-BY-4.0",
        url: "https://creativecommons.org/licenses/by/4.0/",
      },
    },
    servers: [
      {
        url: BRAND.url,
        description: "Production (Hetzner CCX13 + Cloudflare Free)",
      },
    ],
    tags: [
      {
        name: "platforms",
        description: "Catalogue des plateformes crypto auditees",
      },
      {
        name: "regulatory",
        description: "Donnees reglementaires (PSAN AMF, CASP MiCA UE)",
      },
      {
        name: "blockchain",
        description: "Donnees on-chain et metriques techniques",
      },
      {
        name: "education",
        description: "Donnees vulgarisees pour debutants FR",
      },
      {
        name: "fiscal",
        description: "Outils fiscalite crypto",
      },
    ],
    paths: {
      "/api/public": {
        get: {
          summary: "Index / discovery",
          description:
            "Liste tous les endpoints publics CC-BY 4.0 avec leur description et schema de reponse. Point d entree recommande pour decouvrir l API.",
          tags: ["platforms"],
          responses: {
            "200": {
              description: "Index de l API",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/IndexResponse" },
                },
              },
            },
          },
        },
      },
      "/api/public/platforms": {
        get: {
          summary: "Catalogue plateformes crypto",
          description:
            "33 plateformes crypto auditees : frais maker/taker/SEPA, securite, statut MiCA, support FR. Mise a jour mensuelle.",
          tags: ["platforms"],
          responses: {
            "200": {
              description: "Liste des plateformes",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/PlatformsResponse" },
                },
              },
            },
          },
        },
      },
      "/api/public/psan-registry": {
        get: {
          summary: "Registre PSAN + MiCA consolide",
          description:
            "Statut PSAN (FR, AMF) + MiCA (UE, ESMA) consolide. Inclut le champ atRiskJuly2026 (deadline transition MiCA juillet 2026).",
          tags: ["regulatory"],
          responses: {
            "200": {
              description: "Registre reglementaire",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/PsanRegistryResponse" },
                },
              },
            },
          },
        },
      },
      "/api/public/decentralization-scores": {
        get: {
          summary: "Scores de decentralisation",
          description:
            "Score composite Cryptoreflex (Nakamoto coef + validators + geo + clients + open source) pour Bitcoin, Ethereum, Solana, etc. Mise a jour trimestrielle.",
          tags: ["blockchain"],
          responses: {
            "200": {
              description: "Scores par blockchain",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/DecentralizationResponse" },
                },
              },
            },
          },
        },
      },
      "/api/public/top-cryptos": {
        get: {
          summary: "Top 10 cryptos vulgarisees",
          description:
            "Top 10 cryptos par capitalisation, expliquees en francais pour debutants : tagline, useCase, points forts/faibles, riskLevel.",
          tags: ["education"],
          responses: {
            "200": {
              description: "Top 10 cryptos",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/TopCryptosResponse" },
                },
              },
            },
          },
        },
      },
      "/api/public/fiscal-tools": {
        get: {
          summary: "Outils fiscalite crypto",
          description:
            "Comparatif Waltio, Koinly, CoinTracking : tarifs, plans, support FR, MiCA, freeTrial.",
          tags: ["fiscal"],
          responses: {
            "200": {
              description: "Liste des outils fiscaux",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/FiscalToolsResponse" },
                },
              },
            },
          },
        },
      },
    },
    components: {
      schemas: {
        Meta: {
          type: "object",
          required: ["license", "attribution", "lastUpdated"],
          properties: {
            source: {
              type: "string",
              description: "Source originale des donnees (compilations Cryptoreflex)",
            },
            schemaVersion: { type: "string", example: "1.0" },
            license: { type: "string", example: "CC-BY-4.0" },
            licenseUrl: {
              type: "string",
              format: "uri",
              example: "https://creativecommons.org/licenses/by/4.0/deed.fr",
            },
            attribution: {
              type: "string",
              description:
                "Texte d attribution obligatoire en cas de reutilisation (clause CC-BY 4.0)",
            },
            attributionHtml: {
              type: "string",
              description: "Attribution prete a coller en HTML (avec lien dofollow)",
            },
            canonicalUrl: { type: "string", format: "uri" },
            lastUpdated: {
              type: "string",
              format: "date",
              example: "2026-05-04",
            },
            contact: { type: "string", example: "partners@cryptoreflex.fr" },
          },
        },
        IndexResponse: {
          type: "object",
          properties: {
            _meta: { $ref: "#/components/schemas/Meta" },
            endpoints: { type: "array", items: { type: "object" } },
            examples: { type: "object" },
          },
        },
        PlatformsResponse: {
          type: "object",
          properties: {
            _meta: { $ref: "#/components/schemas/Meta" },
            platforms: { type: "array", items: { $ref: "#/components/schemas/Platform" } },
          },
        },
        Platform: {
          type: "object",
          properties: {
            id: { type: "string", example: "coinbase" },
            name: { type: "string", example: "Coinbase" },
            websiteUrl: { type: "string", format: "uri" },
            fees: {
              type: "object",
              properties: {
                maker: { type: "number", example: 0.0026 },
                taker: { type: "number", example: 0.006 },
                sepaDeposit: { type: "number", example: 0 },
                withdrawal: { type: "number", example: 0 },
              },
            },
            security: {
              type: "object",
              properties: {
                score: { type: "number", example: 8.5 },
                hasInsurance: { type: "boolean" },
                hasColdStorage: { type: "boolean" },
                has2FA: { type: "boolean" },
              },
            },
            micaStatus: {
              type: "string",
              enum: ["authorized", "in_progress", "not_authorized", "exempt"],
            },
            supportFr: { type: "boolean" },
          },
        },
        PsanRegistryResponse: {
          type: "object",
          properties: {
            _meta: { $ref: "#/components/schemas/Meta" },
            platforms: {
              type: "array",
              items: { $ref: "#/components/schemas/PsanPlatform" },
            },
          },
        },
        PsanPlatform: {
          type: "object",
          properties: {
            id: { type: "string" },
            name: { type: "string" },
            psanStatus: {
              type: "string",
              enum: ["registered", "authorized", "pending", "rejected", "n/a"],
            },
            amfRegistration: {
              type: "string",
              example: "E2023-035",
              description: "Numero d enregistrement AMF (FR)",
            },
            micaStatus: {
              type: "string",
              enum: ["authorized", "in_progress", "not_authorized"],
            },
            micaJurisdiction: { type: "string", example: "Irlande (Central Bank of Ireland)" },
            atRiskJuly2026: {
              type: "boolean",
              description:
                "True si la plateforme risque d etre bloquee en UE apres la deadline MiCA du 30 juin 2026",
            },
            publicSource: { type: "string", format: "uri" },
            lastVerified: { type: "string", format: "date" },
          },
        },
        DecentralizationResponse: {
          type: "object",
          properties: {
            _meta: { $ref: "#/components/schemas/Meta" },
            scores: {
              type: "object",
              additionalProperties: { $ref: "#/components/schemas/DecentralizationScore" },
            },
          },
        },
        DecentralizationScore: {
          type: "object",
          properties: {
            score: {
              type: "number",
              minimum: 0,
              maximum: 10,
              description: "Score composite 0-10",
            },
            breakdown: {
              type: "object",
              properties: {
                nakamotoCoefficient: { type: "integer" },
                nakamotoScore: { type: "integer", minimum: 0, maximum: 10 },
                validatorsCount: { type: "integer" },
                validatorsScore: { type: "integer", minimum: 0, maximum: 10 },
                geographicDiversity: { type: "integer" },
                geographicScore: { type: "integer", minimum: 0, maximum: 10 },
                clientDiversity: { type: "integer" },
                clientScore: { type: "integer", minimum: 0, maximum: 10 },
                openSource: { type: "boolean" },
                openSourceScore: { type: "integer", minimum: 0, maximum: 10 },
              },
            },
            notes: { type: "string" },
            lastVerified: { type: "string", example: "2026-04" },
          },
        },
        TopCryptosResponse: {
          type: "object",
          properties: {
            _meta: { $ref: "#/components/schemas/Meta" },
            topCryptos: {
              type: "array",
              items: { $ref: "#/components/schemas/TopCrypto" },
            },
          },
        },
        TopCrypto: {
          type: "object",
          properties: {
            rank: { type: "integer", minimum: 1, maximum: 10 },
            id: { type: "string" },
            name: { type: "string" },
            symbol: { type: "string", example: "BTC" },
            tagline: { type: "string" },
            what: { type: "string" },
            useCase: { type: "string" },
            consensus: { type: "string", example: "Proof of Work" },
            beginnerFriendly: { type: "integer", minimum: 1, maximum: 5 },
            riskLevel: { type: "string", enum: ["Faible", "Modere", "Eleve", "Tres eleve"] },
            strengths: { type: "array", items: { type: "string" } },
            weaknesses: { type: "array", items: { type: "string" } },
          },
        },
        FiscalToolsResponse: {
          type: "object",
          properties: {
            _meta: { $ref: "#/components/schemas/Meta" },
            tools: {
              type: "array",
              items: { $ref: "#/components/schemas/FiscalTool" },
            },
          },
        },
        FiscalTool: {
          type: "object",
          properties: {
            id: { type: "string" },
            name: { type: "string" },
            country: { type: "string", example: "FR" },
            pricingModel: {
              type: "string",
              enum: ["subscription", "one-shot", "freemium", "free"],
            },
            freeTrial: { type: "boolean" },
            supportFr: { type: "boolean" },
            micaCompliant: { type: "boolean" },
            plansEur: { type: "array", items: { type: "object" } },
          },
        },
      },
    },
    externalDocs: {
      description: "Documentation lisible humaine",
      url: BRAND.url + "/api-publique",
    },
  };

  return NextResponse.json(spec, { status: 200, headers: COMMON_HEADERS });
}

export function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: COMMON_HEADERS });
}
