import platformsData from "@/data/platforms.json";
import walletsData from "@/data/wallets.json";
import { getAffiliationKind } from "@/lib/partnerships";

/** Fiabilité d'un coût du comparateur : publié en entier, majorant (marge publiée au plus), ou marge non chiffrée en plus. */
export type CostKind = "exact" | "max" | "partiel";

/**
 * Accès téléphonique au support : numéro publié ; appel ou rappel sans numéro (depuis l'appli, sur rendez-vous…) ;
 * réservé à une offre haut de gamme ; aucun.
 */
export type SupportPhone = "numero" | "appli" | "reserve" | "aucun";

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
    /**
     * Coût d'un achat par le chemin le plus simple de l'appli (refonte du comparateur, 05/10/2026), relevé sur la
     * source officielle : % + frais fixe + minimum par tranche ; spreadUnpublished = marge ajoutée au prix sans être
     * chiffrée (le coût affiché n'est alors qu'un minimum). cardPct null = pas d'achat par carte pour un résident français.
     */
    /**
     * Coût réel d'un achat de Bitcoin par le chemin le plus simple de l'appli, après virement SEPA (comparateur, 05/10/2026).
     * Montants en euros recalculés depuis la grille officielle (source), null = la plateforme ne publie pas ce coût.
     *  - « exact » : tout le coût est publié ;
     *  - « max » : la plateforme publie un maximum pour sa marge, le montant est ce maximum (« au plus ») ;
     *  - « partiel » : une marge non chiffrée s'ajoute au montant.
     */
    cost?: {
      path: string;
      c100: number | null;
      c1000: number | null;
      kind: CostKind;
      /** null : pas d'achat par carte pour un résident français */
      card: { c100: number | null; c1000: number | null; kind: CostKind } | null;
      /** précision affichée sous le prix (une phrase) */
      note?: string;
      date: string;
      source: string;
    };
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
  /**
   * Assistance client, relevée sur la page officielle d'assistance de la plateforme (06/10/2026 : les anciennes valeurs
   * n'avaient jamais été sourcées ; Kraken était donné « téléphone FR » alors qu'il ne publie aucun numéro).
   * null = non vérifié : ne jamais l'afficher comme un oui ou un non. Toute valeur renseignée exige source + verified.
   */
  support: {
    /** Chat ou messagerie d'assistance assurés en français, d'après la plateforme. */
    frenchChat: boolean | null;
    /** Assistance par téléphone en français (numéro publié, ou appel / rappel demandé depuis l'appli). */
    frenchPhone: boolean | null;
    /** Accès téléphonique : numéro publié, appel ou rappel demandé depuis l'appli / l'espace client, ou aucun. */
    phone: SupportPhone | null;
    /** Délai de réponse annoncé par la plateforme elle-même (jamais une estimation) ; null = aucun délai publié. */
    responseTime: string | null;
    /** Page officielle d'assistance relevée. */
    source: string | null;
    /** Autres pages officielles lues pour ce relevé (langues, téléphone…). */
    otherSources?: string[];
    /** Date du relevé (AAAA-MM-JJ). */
    verified: string | null;
    /** Ce que dit la page (canaux, langue, horaires, conditions), prêt à afficher. */
    note: string | null;
  };
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
    /** TrustScore affiché par Trustpilot ; null = aucune note publique (ex. note suspendue par Trustpilot). */
    trustpilot: number | null;
    /** Nombre total d'avis affiché par Trustpilot ; null quand la note est absente. */
    trustpilotCount: number | null;
    /** Page Trustpilot relevée (fr.trustpilot.com/review/<domaine>), null si aucune page fiable. */
    trustpilotUrl: string | null;
    /** Date du relevé (AAAA-MM-JJ), à afficher à côté de la note. */
    trustpilotVerified: string;
    /** Précision à afficher avec la note (profil d'une maison mère, d'une marque renommée, note suspendue…). */
    trustpilotNote?: string;
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

/**
 * 06/10/2026 : sans relation rémunérée réelle (lib/partnerships.ts), le lien sortant est le site officiel, sans
 * paramètre de parrainage. data/platforms.json contenait des codes jamais souscrits (« ?ref=cryptoreflex »,
 * « /join/CRYPTOREFLEX », « /invite?a=CRYPTOREFLEX »…) : ils laissaient croire à une affiliation et pouvaient
 * créditer un compte tiers homonyme.
 */
export const withOfficialLink = <T extends { id: string; websiteUrl: string; affiliateUrl: string }>(p: T): T =>
  getAffiliationKind(p.id) === null ? { ...p, affiliateUrl: p.websiteUrl } : p;

/**
 * Offre de bienvenue affichable, ou null. 06/10/2026 : 33 fiches sur 36 affichaient « Bonus actuel — voir conditions
 * sur la plateforme » (et un badge « Bonus ») sans aucune offre relevée, y compris Kraken dont les données disent
 * « pas de bonus de bienvenue ». Une offre n'est affichée que si son montant a été relevé (bonus.amount) ; sinon rien.
 */
export function verifiedBonus(p: Pick<Platform, "bonus">): string | null {
  return p.bonus.amount != null ? p.bonus.welcome : null;
}

const PLATFORMS = data.platforms.map(withOfficialLink).map(withoutPromotion);

/** Concatène exchanges/brokers + hardware wallets (source pour comparatifs cross-catégorie). */
const ALL = [...PLATFORMS, ...wallets.platforms.map(withOfficialLink)];

/**
 * Plateforme dont le lien d'affiliation / de parrainage RÉEL correspond à cette URL (même domaine, même chemin de
 * départ, mêmes paramètres hors utm_*), ou undefined. Sert aux liens écrits à la main (MDX, encadrés) : une simple
 * URL « bitpanda.com/fr » sans le code de parrainage ne rapporte rien et ne doit pas être signalée « Publicité ».
 */
export function findPaidPlatformByUrl(href: string): Platform | undefined {
  let target: URL;
  try {
    target = new URL(href);
  } catch {
    return undefined;
  }
  const host = (u: URL) => u.hostname.toLowerCase().replace(/^www\./, "");
  return ALL.find((p) => {
    if (getAffiliationKind(p.id) === null) return false;
    let aff: URL;
    try {
      aff = new URL(p.affiliateUrl);
    } catch {
      return false;
    }
    if (host(aff) !== host(target)) return false;
    if (aff.pathname !== "/" && !target.pathname.startsWith(aff.pathname)) return false;
    for (const [k, v] of aff.searchParams) {
      if (!k.startsWith("utm_") && target.searchParams.get(k) !== v) return false;
    }
    return true;
  });
}

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

/* -------------------------------------------------------------------------- */
/* Support client — libellés (relevé du 06/10/2026)                            */
/* -------------------------------------------------------------------------- */

type Support = Platform["support"];

/** « Oui » / « Non » / « Non vérifié » : un chat en français n'est promis que s'il a été relevé sur la page officielle. */
export function supportChatLabel(s: Support): string {
  return s.frenchChat === true ? "Oui" : s.frenchChat === false ? "Non" : "Non vérifié";
}

/** Accès téléphonique tel que la plateforme le décrit, avec la langue quand elle est connue. */
export function supportPhoneLabel(s: Support): string {
  /* « Aucun numéro publié » plutôt que « aucun téléphone » : certaines pages ne font que ne pas en afficher. */
  if (s.phone === "aucun") return "Aucun numéro publié";
  if (s.phone == null) return s.frenchPhone === false ? "Non" : "Non vérifié";
  const how =
    s.phone === "numero" ? "Numéro publié" : s.phone === "reserve" ? "Réservé aux offres haut de gamme" : "Appel possible, sans numéro publié";
  const lang = s.frenchPhone === true ? "en français" : s.frenchPhone === false ? "pas en français" : "langue non précisée";
  return `${how}, ${lang}`;
}

/** Délai de réponse annoncé par la plateforme, ou rien d'inventé. */
export function supportDelayLabel(s: Support): string {
  return s.responseTime ?? (s.verified ? "Aucun délai annoncé" : "Non vérifié");
}

/**
 * Aide en français, en un mot pour les tableaux : « Téléphone et chat », « Chat », « Téléphone », « Non » ou
 * « Non vérifié ». « Non » seulement quand le chat ET le téléphone ont été relevés sans français.
 */
export function frenchHelpLabel(s: Support): string {
  const parts = [s.frenchPhone === true && "téléphone", s.frenchChat === true && "chat"].filter(Boolean) as string[];
  if (parts.length) {
    const t = parts.join(" et ");
    return t.charAt(0).toUpperCase() + t.slice(1);
  }
  const noPhone = s.frenchPhone === false || s.phone === "aucun";
  return s.frenchChat === false && noPhone ? "Non" : "Non vérifié";
}

/** Rang de tri « aide en français » : 2 téléphone, 1 chat, 0 sinon (non vérifié compris). */
export function frenchHelpRank(s: Support): number {
  return s.frenchPhone === true ? 2 : s.frenchChat === true ? 1 : 0;
}

/** Coût d'un achat payé par carte bancaire (surcoût du dépôt par carte compris quand la grille le publie). */
export function cardBuyPct(p: Platform): number {
  return p.fees.cardBuy ?? p.fees.instantBuy;
}

/**
 * Note Trustpilot prête à afficher (« 4,0/5 (23 213 avis) »), ou null s'il n'y a pas de note publique.
 * Les valeurs sont relevées à la main sur la page Trustpilot (ratings.trustpilotUrl) : toujours afficher
 * la date du relevé (ratings.trustpilotVerified) à côté.
 */
export function trustpilotText(r: Platform["ratings"]): string | null {
  if (r.trustpilot == null || r.trustpilotCount == null) return null;
  const note = r.trustpilot.toLocaleString("fr-FR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  return `${note}/5 (${r.trustpilotCount.toLocaleString("fr-FR")} avis)`;
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
  /** Date du relevé (AAAA-MM-JJ) quand la source en a une. */
  verified?: string;
} | null {
  if (p.ratings.trustpilot != null && p.ratings.trustpilot >= 3.5 && (p.ratings.trustpilotCount ?? 0) > 0) {
    return {
      label: "Trustpilot",
      rating: p.ratings.trustpilot,
      count: p.ratings.trustpilotCount,
      verified: p.ratings.trustpilotVerified,
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
