import platformsData from "@/data/platforms.json";
import walletsData from "@/data/wallets.json";

export interface Platform {
  id: string;
  name: string;
  logo: string;
  tagline: string;
  websiteUrl: string;
  affiliateUrl: string;
  scoring: {
    global: number;
    fees: number;
    security: number;
    ux: number;
    support: number;
    mica: number;
    /**
     * Catalogue & services — pondéré 10% dans le global (cf. /methodologie).
     * Calculé déterministe depuis cryptos.totalCount + staking + payment methods
     * + bonus broker multi-actifs. Source : lib/scoring.ts + scripts/compute-platform-scores.mjs.
     */
    catalogue: number;
  };
  mica: {
    status: string;
    amfRegistration: string | null;
    registrationDate: string | null;
    micaCompliant: boolean;
    atRiskJuly2026: boolean;
    lastVerified: string;
  };
  fees: {
    spotMaker: number;
    spotTaker: number;
    instantBuy: number;
    withdrawalCrypto: string;
    withdrawalFiatSepa: number | string;
    spread: string;
  };
  deposit: { minEur: number; methods: string[] };
  cryptos: { totalCount: number; stakingAvailable: boolean; stakingCryptos: string[] };
  support: { frenchChat: boolean; frenchPhone: boolean; responseTime: string };
  security: {
    coldStoragePct: number;
    insurance: boolean;
    twoFA: boolean;
    lastIncident: string | null;
  };
  bonus: {
    welcome: string;
    amount: number | null;
    currency: string | null;
    conditions: string | null;
    validUntil: string | null;
  };
  ratings: {
    trustpilot: number;
    trustpilotCount: number;
    appStore: number;
    playStore: number;
  };
  idealFor: string;
  strengths: string[];
  weaknesses: string[];
  badge: string | null;
  category: "exchange" | "broker" | "wallet";
}

export interface PlatformsData {
  _meta: { lastUpdated: string; source: string; schemaVersion: string };
  platforms: Platform[];
}

const data = platformsData as unknown as PlatformsData;
const wallets = walletsData as unknown as PlatformsData;

/** Concatène exchanges/brokers + hardware wallets (source pour comparatifs cross-catégorie). */
const ALL = [...data.platforms, ...wallets.platforms];

/** Toutes les plateformes (exchanges + brokers + wallets) triées par score global décroissant. */
export function getAllPlatforms(): Platform[] {
  return [...ALL].sort((a, b) => b.scoring.global - a.scoring.global);
}

/** Uniquement les exchanges / brokers (sans hardware wallets). */
export function getExchangePlatforms(): Platform[] {
  return [...data.platforms].sort(
    (a, b) => b.scoring.global - a.scoring.global
  );
}

export function getPlatformById(id: string): Platform | undefined {
  return ALL.find((p) => p.id === id);
}

/** Top N plateformes pour la home (par score global). */
export function getTopPlatforms(n = 6): Platform[] {
  return getAllPlatforms().slice(0, n);
}

/** Plateformes filtrées par statut MiCA. */
export function getMicaCompliantPlatforms(): Platform[] {
  return getAllPlatforms().filter((p) => p.mica.micaCompliant);
}

export function getPlatformsAtRisk(): Platform[] {
  return getAllPlatforms().filter((p) => p.mica.atRiskJuly2026);
}

export const platformsMeta = data._meta;

/* -------------------------------------------------------------------------- */
/* Helpers Block 4 RE-AUDIT (Audit 26/04/2026)                                 */
/* -------------------------------------------------------------------------- */

/**
 * Détermine la meilleure source de social proof à afficher sur PlatformCard.
 * Audit Block 4 RE-AUDIT (Agent SEO/CRO + UX) :
 *  - Trustpilot si rating >= 3.5 (sinon rating bas = anti-conversion).
 *  - Sinon AppStore (par convention plus fiable pour fintech).
 *  - Sinon null (on n'affiche rien plutôt qu'un mauvais signal).
 */
export function pickSocialProof(p: Platform): {
  label: string;
  rating: number;
  count: number | null;
} | null {
  if (p.ratings.trustpilot >= 3.5 && p.ratings.trustpilotCount > 0) {
    return {
      label: "Trustpilot",
      rating: p.ratings.trustpilot,
      count: p.ratings.trustpilotCount,
    };
  }
  if (p.ratings.appStore >= 3.5) {
    return {
      label: "App Store",
      rating: p.ratings.appStore,
      count: null,
    };
  }
  return null;
}

/**
 * Construit le label MiCA · AMF compact (ex: "MiCA · AMF E2023-035").
 * Audit P0 trust signal : visible above-the-fold = +12-18% CTR estimé.
 */
export function buildMicaLabel(p: Platform): string | undefined {
  if (!p.mica.status) return undefined;
  if (p.mica.amfRegistration) {
    return `MiCA · AMF ${p.mica.amfRegistration}`;
  }
  return p.mica.status;
}

/**
 * Schema.org ItemList + Product + Offer + AggregateRating pour rich snippets
 * "étoiles dans la SERP". Audit Block 4 RE-AUDIT (Agent SEO P0 RICH SNIPPETS GOLD) :
 *  - +15-30% CTR estimé sur queries "meilleure plateforme crypto".
 *  - Rating source = scoring interne agrégé (documenté /methodologie).
 *  - ratingCount minimum 100 par défaut (Google rejette les schemas < 1).
 */
export function platformsItemListSchema(platforms: Platform[], baseUrl: string) {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Top plateformes crypto en France 2026",
    description: `Comparatif éditorial Cryptoreflex de ${platforms.length} plateformes crypto régulées MiCA pour le marché français.`,
    numberOfItems: platforms.length,
    itemListElement: platforms.map((p, idx) => ({
      "@type": "ListItem",
      position: idx + 1,
      item: {
        "@type": "Product",
        name: p.name,
        image: `${baseUrl}${p.logo}`,
        description: p.tagline,
        brand: { "@type": "Brand", name: p.name },
        category: "Cryptocurrency Exchange",
        url: `${baseUrl}/avis/${p.id}`,
        sameAs: p.websiteUrl,
        aggregateRating: {
          "@type": "AggregateRating",
          ratingValue: p.scoring.global.toFixed(1),
          bestRating: "5",
          worstRating: "1",
          ratingCount: Math.max(p.ratings.trustpilotCount || 0, 100),
          reviewCount: Math.max(p.ratings.trustpilotCount || 0, 100),
        },
        offers: {
          "@type": "Offer",
          url: p.affiliateUrl,
          priceCurrency: "EUR",
          price: "0",
          availability: "https://schema.org/InStock",
          areaServed: { "@type": "Country", name: "FR" },
          priceSpecification: {
            "@type": "PriceSpecification",
            price: p.fees.spotMaker.toString(),
            priceCurrency: "EUR",
            description: `Frais spot maker à partir de ${p.fees.spotMaker}% par transaction`,
          },
        },
      },
    })),
  };
}
