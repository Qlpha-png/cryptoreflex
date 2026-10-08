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
import { BRAND, STATS } from "@/lib/brand";
import { PUBLIC_API_CACHE_CONTROL } from "@/lib/public-data-dates";

export const dynamic = "force-static";
export const revalidate = 86_400;

const COMMON_HEADERS: Record<string, string> = {
  "Content-Type": "application/json; charset=utf-8",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Max-Age": "86400",
  "Cache-Control": PUBLIC_API_CACHE_CONTROL,
};

export function GET() {
  const spec = {
    openapi: "3.0.3",
    info: {
      title: "Cryptoreflex Public Open Data API",
      description:
        `API publique CC-BY 4.0 de Cryptoreflex.fr. 5 endpoints JSON sur le marché crypto français : ${STATS.platformsAudited} plateformes auditées, registre PSAN + MiCA consolidé, scores de décentralisation, top cryptos vulgarisées, outils de fiscalité. Toute réutilisation = attribution requise = lien dofollow vers https://www.cryptoreflex.fr.`,
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
        description: "Production (Vercel)",
      },
    ],
    tags: [
      {
        name: "platforms",
        description: "Catalogue des plateformes crypto auditées",
      },
      {
        name: "regulatory",
        description: "Données réglementaires (PSAN AMF, CASP MiCA UE)",
      },
      {
        name: "blockchain",
        description: "Données on-chain et métriques techniques",
      },
      {
        name: "education",
        description: "Données vulgarisées pour débutants",
      },
      {
        name: "fiscal",
        description: "Outils de fiscalité crypto",
      },
    ],
    paths: {
      "/api/public": {
        get: {
          summary: "Index / discovery",
          description:
            "Liste tous les endpoints publics CC-BY 4.0 avec leur description et leur schéma de réponse. Point d'entrée recommandé pour découvrir l'API.",
          tags: ["platforms"],
          responses: {
            "200": {
              description: "Index de l'API",
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
            `${STATS.platformsAudited} plateformes crypto auditées : frais maker/taker/SEPA, sécurité, statut MiCA, support FR. Date de vérification sur chaque fiche.`,
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
          summary: "Registre PSAN + MiCA consolidé",
          description:
            "Statut MiCA (registre ESMA) + numéro d'agrément AMF pour les prestataires français. Le champ atRiskJuly2026 vaut true si la plateforme ne peut pas servir la France depuis le 1er juillet 2026.",
          tags: ["regulatory"],
          responses: {
            "200": {
              description: "Registre réglementaire",
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
          summary: "Scores de décentralisation",
          description:
            "Score composite Cryptoreflex (Nakamoto coef + validators + geo + clients + open source) pour Bitcoin, Ethereum, Solana, etc. Daté score par score (lastVerified) : aucune révision programmée.",
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
          summary: "Top 10 cryptos vulgarisées",
          description:
            "Top 10 cryptos par capitalisation, expliquées en français pour débutants : tagline, useCase, points forts/faibles, riskLevel.",
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
          summary: "Outils de fiscalité crypto",
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
              description: "Source originale des données (compilations Cryptoreflex)",
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
                "Texte d'attribution obligatoire en cas de réutilisation (clause CC-BY 4.0)",
            },
            attributionHtml: {
              type: "string",
              description: "Attribution prête à coller en HTML (avec lien dofollow)",
            },
            canonicalUrl: { type: "string", format: "uri" },
            lastUpdated: {
              type: "string",
              format: "date",
              nullable: true,
              description:
                "Date la plus récente des relevés ou vérifications des lignes publiées (null si le jeu n'en porte aucune). Jamais la date de la requête ni du déploiement.",
              example: "2026-10-07",
            },
            contact: { type: "string", example: "partners@cryptoreflex.fr" },
          },
        },
        IndexResponse: {
          type: "object",
          properties: {
            _meta: { $ref: "#/components/schemas/Meta" },
            endpoints: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  path: { type: "string" },
                  url: { type: "string", format: "uri" },
                  description: { type: "string" },
                  responseShape: { type: "string" },
                  updateFrequency: {
                    type: "string",
                    description:
                      "Où lire la date de mise à jour du jeu de données (_meta.lastUpdated).",
                    example: "Date de mise à jour : _meta.lastUpdated",
                  },
                },
              },
            },
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
              example: "A2025-003",
              description: "Numéro d'agrément MiCA délivré par l'AMF (A20xx-xxx), null pour un agrément étranger",
            },
            micaStatus: {
              type: "string",
              enum: ["authorized", "in_progress", "not_authorized"],
            },
            micaJurisdiction: { type: "string", example: "Irlande (Central Bank of Ireland)" },
            atRiskJuly2026: {
              type: "boolean",
              description:
                "True si la plateforme, même agréée MiCA ailleurs, n'est pas accessible aux clients français depuis la fin de la période transitoire (1er juillet 2026)",
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
      description: "Documentation lisible par un humain",
      url: BRAND.url + "/api-publique",
    },
  };

  return NextResponse.json(spec, { status: 200, headers: COMMON_HEADERS });
}

export function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: COMMON_HEADERS });
}
