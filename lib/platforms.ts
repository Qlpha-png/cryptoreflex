import platformsData from "@/data/platforms.json";

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

/** Toutes les plateformes triées par score global décroissant. */
export function getAllPlatforms(): Platform[] {
  return [...data.platforms].sort(
    (a, b) => b.scoring.global - a.scoring.global
  );
}

export function getPlatformById(id: string): Platform | undefined {
  return data.platforms.find((p) => p.id === id);
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
