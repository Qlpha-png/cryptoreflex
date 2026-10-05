import platformsData from "@/data/platforms.json";
import walletsData from "@/data/wallets.json";

export interface Platform {
  id: string;
  name: string;
  /** Chemin d'un fichier RÉEL de public/logos, ou null s'il n'existe pas de logo officiel (jamais de logo inventé). */
  logo: string | null;
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
    /** Entité agréée et autorité, telles qu'inscrites au registre MiCA de l'ESMA (null si absente). */
    legalEntity?: string | null;
    authority?: string | null;
    registerSource?: string;
  };
  fees: {
    spotMaker: number;
    spotTaker: number;
    /** Achat simple dans l'appli depuis le solde en euros (après un virement), hors surcoût de la carte. */
    instantBuy: number;
    /**
     * Achat payé par carte bancaire, surcoût du dépôt par carte compris (ex. SwissBorg : 2,25 % + 0,99 %).
     * Absent : la grille ne publie pas de surcoût distinct, on retombe sur instantBuy (cf. cardBuyPct).
     */
    cardBuy?: number;
    withdrawalCrypto: string;
    withdrawalFiatSepa: number | string;
    spread: string;
    /**
     * Frais vérifiés sur grille officielle (ou recoupement 2+ sources <6 mois),
     * sourcés + datés. Ajouté le 2026-06-13 (audit "frais réels", 3 lots de
     * 2 finders + 1 adversarial). Source de vérité pour /comparatif/frais.
     * Si absent : la plateforme n'a pas (encore) été re-vérifiée individuellement.
     */
    verified?: {
      /** Date de vérification, ISO (YYYY-MM-DD). */
      date: string;
      /** URL de la source (officielle si lisible, sinon tierce fiable datée). */
      source: string;
      /** Modèle économique réel — détermine si maker/taker a un sens. */
      model:
        | "exchange"
        | "courtier"
        | "carte"
        | "cfd"
        | "on-ramp"
        | "dca"
        | "hybride";
      /** false pour les courtiers/apps/CFD : ne PAS afficher maker/taker. */
      makerTakerApplies: boolean;
      /** Frais réel pour un particulier (achat simple), libellé prêt à afficher. */
      realCostPct: string;
      /** fiable = publiable tel quel ; douteux/non vérifiable = afficher "à vérifier" ; indisponible = retirer du marché FR. */
      verdict: "fiable" | "douteux" | "non vérifiable" | "indisponible";
      /** Pièges à signaler (spread caché, réduction token, frais fixe, CFD, inactivité…). */
      note?: string;
    };
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

/**
 * Peut servir un résident français : agréée MiCA avec accès à la France (registre ESMA / liste blanche AMF)
 * et pas sortie du marché FR. Les hardware wallets (auto-conservation) sont hors champ MiCA.
 */
const servesFr = (p: Platform): boolean =>
  p.category === "wallet" || (p.fees.verified?.verdict !== "indisponible" && p.mica.micaCompliant);

/**
 * Une plateforme qui ne peut pas servir la France ne porte jamais de lien affilié ni d'offre :
 * tout CTA, où qu'il soit sur le site, mène à sa fiche, qui explique pourquoi (audit du 02/10/2026).
 */
const withoutPromotion = (p: Platform): Platform =>
  servesFr(p)
    ? p
    : {
        ...p,
        affiliateUrl: `/avis/${p.id}`,
        badge: null,
        bonus: { welcome: "Aucune offre : plateforme non autorisée en France", amount: null, currency: null, conditions: null, validUntil: null },
      };

const PLATFORMS = data.platforms.map(withoutPromotion);

/** Concatène exchanges/brokers + hardware wallets (source pour comparatifs cross-catégorie). */
const ALL = [...PLATFORMS, ...wallets.platforms];

/** Toutes les plateformes (exchanges + brokers + wallets) triées par score global décroissant. */
export function getAllPlatforms(): Platform[] {
  return [...ALL].sort((a, b) => b.scoring.global - a.scoring.global);
}

/** Uniquement les exchanges / brokers (sans hardware wallets). */
export function getExchangePlatforms(): Platform[] {
  return [...PLATFORMS].sort(
    (a, b) => b.scoring.global - a.scoring.global
  );
}

export function getPlatformById(id: string): Platform | undefined {
  return ALL.find((p) => p.id === id);
}

/**
 * Top N plateformes pour la home (par score global) : UNIQUEMENT des exchanges/courtiers autorisés en France.
 * Audit 05/10/2026 : l'ancienne version prenait toutes les entrées (portefeuilles Ledger et Trezor compris) pour
 * les données structurées « plateformes régulées MiCA en France », et Binance (non autorisé) était 8e.
 */
/**
 * Vrai si le libellé « dernier incident » signifie qu'il n'y en a pas (null, « Aucun incident majeur… »).
 * Audit du 05/10/2026 : ces libellés s'affichaient en orange et produisaient « Incident notable : Aucun incident majeur ».
 */
export function hasNoIncident(lastIncident: string | null | undefined): boolean {
  return !lastIncident || /^aucun\b/i.test(lastIncident.trim());
}

export function getTopPlatforms(n = 6): Platform[] {
  return getExchangePlatforms().filter(isAvailableFr).slice(0, n);
}

/** Plateformes filtrées par statut MiCA. */
export function getMicaCompliantPlatforms(): Platform[] {
  return getAllPlatforms().filter((p) => p.mica.micaCompliant);
}

export function getPlatformsAtRisk(): Platform[] {
  return getAllPlatforms().filter((p) => p.mica.atRiskJuly2026);
}

/**
 * Plateforme accessible à un résident français : agréée MiCA avec accès à la France
 * (registre ESMA / liste blanche AMF) et pas sortie du marché FR (ex : Gemini, avril 2026 ;
 * Binance, 1er juillet 2026). Les hardware wallets sont hors champ MiCA.
 * À utiliser pour NE PAS recommander une plateforme qu'on ne peut plus ouvrir
 * (classements, quiz, CTA) et pour noindexer sa fiche.
 */
export function isAvailableFr(p: Platform): boolean {
  return servesFr(p);
}

/**
 * Nombre de plateformes (exchanges/brokers) DISPONIBLES en France — le compteur
 * « X plateformes » affiché partout. Exclut les plateformes fermées au marché FR
 * (ex : Gemini) et les hardware wallets. Source dynamique = pas de drift.
 * Constante miroir pour les contextes string : STATS.platforms (lib/brand.ts).
 */
export function getAvailablePlatformCount(): number {
  return getExchangePlatforms().filter(isAvailableFr).length;
}

/**
 * Frais court et HONNÊTE pour les cartes/listes : le coût réel d'un achat.
 * - exchange order-book : taker (l'ordre marché qu'utilise un débutant) ;
 * - courtier/app : frais d'achat réel (instantBuy), pas le taux "Pro" qui flatte
 *   les hybrides (Nexo/Wirex/Young affichent 0,20 % Pro mais coûtent ~2 % en App) ;
 * - hardware wallet : spread broker in-app (pas de frais de trading).
 * Évite le « Frais spot 0,XX % » trompeur pour les non-exchanges.
 */
/** Même règle que feeShort, au format français (« 0,4 % ») — pour l'accueil et les listes en français. */
export function feeShortFr(p: Platform): string {
  if (p.category === "wallet") return "spread intégré";
  const mt = p.fees.verified?.makerTakerApplies ?? true;
  const rc = Number(mt ? p.fees.spotTaker : p.fees.instantBuy);
  return Number.isFinite(rc) ? `${rc.toLocaleString("fr-FR", { maximumFractionDigits: 2 })} %` : "voir l'avis";
}

/** Alias de feeShortFr : tout le site est en français (« 1,49 % » et non « 1.49% », audit du 05/10/2026). */
export const feeShort = feeShortFr;

/** Coût d'un achat payé par carte bancaire (surcoût du dépôt par carte compris quand la grille le publie). */
export function cardBuyPct(p: Platform): number {
  return p.fees.cardBuy ?? p.fees.instantBuy;
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
  // Pas de label MiCA positif si la plateforme n'est pas (ou plus) conforme.
  if (!p.mica.micaCompliant) return undefined;
  const reg = p.mica.amfRegistration;
  if (reg) {
    // "AMF" uniquement pour un agrément MiCA délivré par l'AMF (format A20xx-xxx, liste
    // blanche AMF). Les agréments étrangers n'ont pas de numéro AMF.
    return /^A\d/.test(reg) ? `MiCA · AMF ${reg}` : `MiCA · ${reg}`;
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
        /* Pas d'aggregateRating : la note est la nôtre (éditoriale) et le nombre d'avis venait
           de Trustpilot (voire était inventé : Math.max(…, 100)). Google n'accepte que des notes
           données directement par les utilisateurs du site. Audit 03/10/2026. */
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
            description: `Frais spot maker à partir de ${p.fees.spotMaker.toLocaleString("fr-FR", { maximumFractionDigits: 3 })} % par transaction`,
          },
        },
      },
    })),
  };
}
