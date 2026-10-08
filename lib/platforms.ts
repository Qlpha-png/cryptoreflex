import platformsData from "@/data/platforms.json";
import walletsData from "@/data/wallets.json";
import { getAffiliationKind } from "@/lib/partnerships";

/** Fiabilité d'un coût du comparateur : publié en entier, majorant (marge publiée au plus), ou marge non chiffrée en plus. */
/** exact ; max = « au plus » ; partiel = + marge non publiée ; max-partiel = « au plus », + marge non publiée. */
export type CostKind = "exact" | "max" | "partiel" | "max-partiel";

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
  /**
   * Sécurité, relevée les 06-07/10/2026 sur les sources officielles (page sécurité, rapport annuel, CGU) et, pour les
   * incidents, sur un communiqué officiel ou la presse reconnue. Avant : 95 %, 99 %, « aucun incident »… jamais sourcés.
   * null = rien de publié : le site affiche « non communiqué par la plateforme », jamais une promesse.
   */
  security: {
    /** Part des cryptos des clients conservée hors ligne, en %, telle que PUBLIÉE par la plateforme ; null sinon. */
    coldStoragePct: number | null;
    /** Formule publiée (« la majorité », « 95 % et plus ») ou « sans objet » (CFD, pas de garde) ; affichée telle quelle. */
    coldStorageNote?: string;
    /** true : assurance déclarée par la plateforme ; false : elle écrit qu'il n'y en a pas ; null : rien de publié. */
    insurance: boolean | null;
    /** Portée exacte de l'assurance publiée (ex. « contre le vol, une partie des actifs seulement »). */
    insuranceNote?: string;
    twoFA: boolean;
    /**
     * Incident de sécurité documenté le plus récent (fonds ou données de clients touchés, ou intrusion dans la plateforme),
     * plus, s'il est différent, le plus grave des dernières années ; phrases commençant par « En <mois> <année>, ».
     * null = aucun relevé dans nos sources, ce qui n'est PAS « aucun incident ».
     */
    lastIncident: string | null;
    /** Source (URL) de chaque valeur non nulle, par champ ; une URL par fait cité pour les incidents. */
    source: { coldStoragePct?: string; insurance?: string; lastIncident?: string[] };
    /** Date du relevé (AAAA-MM-JJ). */
    verified: string;
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
    /**
     * Notes App Store / Play Store : valeurs brutes SANS source ni date (06/10/2026 : Coinbase affichée 4,7 contre
     * 4,56 relevé sur l'API iTunes FR, Just Mining et Feel Mining sans application sur l'App Store FR). Elles ne sont
     * affichées nulle part tant que appStoreVerified / playStoreVerified (date AAAA-MM-JJ du relevé) n'existent pas :
     * passer par storeRating().
     */
    appStore: number;
    playStore: number;
    appStoreVerified?: string;
    playStoreVerified?: string;
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
/* ---------------------------------------------------------------------------------------------------------------- */
/* Sécurité (06/10/2026) : chaque valeur affichée est publiée par la plateforme (ou documentée, pour les incidents) ;   */
/* sinon on écrit qu'elle n'est pas communiquée. Plus de « Aucun incident à date » ni de « police dédiée » inventés.   */
/* ---------------------------------------------------------------------------------------------------------------- */

const pctFr = (n: number) => `${n.toLocaleString("fr-FR", { maximumFractionDigits: 2 })} %`;

/** Minuscule initiale pour insérer un libellé en milieu de phrase (« « La majorité » » → « « la majorité » »), sauf sigle (« FBI »). */
export const lcFirst = (t: string): string =>
  t.replace(/^([«\s  ]*)(\p{Lu})(?=\p{Ll})/u, (_m, lead: string, c: string) => lead + c.toLowerCase());

/** « de Kraken », « d'eToro », « d'OKX », « d'AnyCoin Direct » : préposition élidée devant une voyelle. */
export const deNom = (name: string): string => (/^[aeiouyàâéèêëîïôöûùü]/i.test(name) ? `d'${name}` : `de ${name}`);

/** Conservation hors ligne prête à afficher : « 98 % », « la majorité, selon la plateforme », « Non communiqué… ». */
export function coldStorageLabel(p: Pick<Platform, "category" | "security">): string {
  if (p.category === "wallet") return "Sans objet (vous gardez vous-même vos clés)";
  const s = p.security;
  if (s.coldStorageNote) return s.coldStorageNote;
  if (s.coldStoragePct != null) return pctFr(s.coldStoragePct);
  return "Non communiqué par la plateforme";
}

/** Assurance prête à afficher, avec sa portée quand elle est publiée. */
export function insuranceLabel(p: Pick<Platform, "category" | "security">): string {
  const s = p.security;
  if (s.insurance === true) return s.insuranceNote ?? "Oui, selon la plateforme";
  if (s.insurance === false) return s.insuranceNote ?? "Aucune, selon la plateforme";
  if (p.category === "wallet") return "Sans objet (la société ne garde pas vos cryptos)";
  return "Non communiquée par la plateforme";
}

/** Phrase courte qui rappelle qu'un incident non relevé n'est pas une garantie (tableaux, FAQ). */
export const NO_INCIDENT_FOUND = "Aucun incident relevé dans nos sources, ce qui n'est pas une garantie";

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
  return Number.isFinite(rc) ? `${rc.toLocaleString("fr-FR", { maximumFractionDigits: 2 })}\u00a0%` : "voir l'avis";
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


/**
 * Coût relevé d'un achat de 1 000 € (fees.cost, relevé daté et sourcé), ou la raison de son absence.
 *  - ok : montant en euros, avec sa fiabilité (exact / au plus / marge non publiée en plus) ;
 *  - non-publie : la plateforme ne publie pas ce coût ;
 *  - pas-de-carte : pas d'achat par carte pour un résident français ;
 *  - non-releve : aucun relevé fees.cost pour cette plateforme.
 */
export type PurchaseCost =
  | { status: "ok"; eur: number; kind: CostKind; date: string; source: string }
  | { status: "non-publie"; date: string; source: string }
  | { status: "pas-de-carte"; date: string; source: string }
  | { status: "non-releve" };

/**
 * Coût COMPLET d'un achat de 1 000 € payé par carte : frais d'achat + frais du moyen de paiement (fees.cost.card).
 * Audit du 06/10/2026 (A-C0-4) : /avis/kraken affichait « Achat par carte 10,00 € » (cost.c1000, achat depuis le solde
 * en euros) alors que le relevé par carte donne 47,75 € (1 % + 3,75 % + 0,25 €). Jamais de repli sur instantBuy, qui
 * n'inclut pas le surcoût de la carte : sans relevé, « Non relevé ».
 */
export function cardCost1000(p: Platform): PurchaseCost {
  const c = p.fees.cost;
  if (!c) return { status: "non-releve" };
  if (c.card === null) return { status: "pas-de-carte", date: c.date, source: c.source };
  if (c.card.c1000 == null) return { status: "non-publie", date: c.date, source: c.source };
  return { status: "ok", eur: c.card.c1000, kind: c.card.kind, date: c.date, source: c.source };
}

/**
 * true quand le relevé chiffre réellement le surcoût d'un paiement par carte : coût carte relevé ET différent du coût
 * depuis le solde. Passe finale (06/10/2026) : la tuile « Achat par carte, frais de carte compris » affichait pour
 * Bitpanda, Revolut, Deblock et Trading 212 un coût carte simplement égal au coût depuis le solde, sans aucun relevé
 * des frais de carte. Dans ce cas, le libellé dit « frais de carte non relevés ».
 */
export function cardFeeMeasured(p: Pick<Platform, "fees">): boolean {
  const c = p.fees.cost;
  if (!c || !c.card || c.card.c1000 == null) return false;
  return c.c1000 == null || c.card.c1000 !== c.c1000;
}

/** Libellé de la tuile « achat par carte » : « frais de carte compris » seulement quand ils sont chiffrés. */
export function cardCostLabel(p: Pick<Platform, "fees">): string {
  return cardFeeMeasured(p) ? "Achat par carte, frais de carte compris" : "Achat par carte (frais de carte non relevés)";
}

/** Coût d'un achat de 1 000 € par le chemin décrit dans fees.cost.path (achat depuis le solde, après un virement). */
export function simpleCost1000(p: Platform): PurchaseCost & { path: string | null } {
  const c = p.fees.cost;
  if (!c) return { status: "non-releve", path: null };
  if (c.c1000 == null) return { status: "non-publie", date: c.date, source: c.source, path: c.path };
  return { status: "ok", eur: c.c1000, kind: c.kind, date: c.date, source: c.source, path: c.path };
}

const eurFr = (n: number) =>
  `${n.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;

/** « 47,75 € + marge non publiée », « au plus 29,50 € », « au plus 40,00 € + marge non publiée », « 12,50 € », « Non publié », « Pas d'achat par carte », « Non relevé ». */
export function purchaseCostText(c: PurchaseCost): string {
  switch (c.status) {
    case "ok":
      if (c.kind === "max") return `au plus ${eurFr(c.eur)}`;
      if (c.kind === "partiel") return `${eurFr(c.eur)} + marge non publiée`;
      if (c.kind === "max-partiel") return `au plus ${eurFr(c.eur)} + marge non publiée`;
      return eurFr(c.eur);
    case "non-publie":
      return "Non publié";
    case "pas-de-carte":
      return "Pas d'achat par carte";
    default:
      return "Non relevé";
  }
}

/**
 * Coût d'un achat payé par carte bancaire, en % de 1 000 € (frais du moyen de paiement compris), ou null.
 * Priorité au relevé fees.cost.card. null quand ce relevé dit « non publié » ou « pas d'achat par carte » : correcteur
 * final du 06/10/2026, /cryptos/[slug]/acheter-en-france affichait encore 3,99 % pour Coinbase alors que la page d'aide
 * relevée le 05/10/2026 ne chiffre pas ce coût. Sans relevé fees.cost : fees.cardBuy, jamais instantBuy (sans la carte).
 */
export function cardBuyPct(p: Platform): number | null {
  const c = cardCost1000(p);
  /* Passe finale (06/10/2026) : pas de pourcentage « par carte » quand le surcoût de la carte n'est pas chiffré. */
  if (c.status === "ok") return cardFeeMeasured(p) ? Math.round(c.eur * 10) / 100 : null;
  if (c.status === "non-releve") return p.fees.cardBuy ?? null;
  return null;
}

const lowerFirst = (s: string) => s.charAt(0).toLowerCase() + s.slice(1);
const nbFr = (n: number, d = 2) => n.toLocaleString("fr-FR", { maximumFractionDigits: d });
const noteFr = (n: number) => n.toLocaleString("fr-FR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const dateFr = (iso: string) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? iso
    : d.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Paris" });
};

/** Phrase sur le coût d'un achat par carte (relevé fees.cost.card, jamais instantBuy). */
export function cardCostSentence(p: Pick<Platform, "name" | "fees">): string {
  const c = cardCost1000(p as Platform);
  switch (c.status) {
    case "ok":
      if (!cardFeeMeasured(p)) {
        return `Un achat de 1 000 € payé par carte coûte ${purchaseCostText(c)} de frais d'achat ; d'éventuels frais de paiement par carte ne sont pas chiffrés dans notre relevé (date dans l'encadré des frais).`;
      }
      return `Un achat de 1 000 € payé par carte coûte ${purchaseCostText(c)} (frais d'achat et frais de paiement par carte compris ; date du relevé dans l'encadré des frais).`;
    case "non-publie":
      return `${p.name} ne publie pas le coût complet d'un achat par carte.`;
    case "pas-de-carte":
      return `${p.name} ne propose pas d'achat par carte aux résidents français.`;
    default:
      return "Le coût d'un achat par carte n'est pas relevé dans nos données.";
  }
}

/**
 * « Résumé à partir des données ci-dessus » de /avis/[slug] — A-C0-3 (audit du 06/10/2026).
 * Remplace les 4 « verdicts » rédigés par du code (« statistiquement difficile à battre », « position d'équilibriste »,
 * « sans honte »…) qui revenaient d'un avis à l'autre et s'appuyaient sur des données non sourcées. Le résumé ne reprend
 * que des données de la méthodologie, du registre MiCA, des frais relevés et du catalogue, sans adjectif. Il ne lit ni
 * support.* ni security.* (relevés en cours dans une autre session).
 */
export function buildPlatformSummary(p: Platform): { headline: string; facts: string[]; ideal: string; avoid: string } {
  const headline = `${p.name} obtient ${noteFr(p.scoring.global)}/5 selon notre méthodologie publique.`;

  /* 05/10/2026 : une plateforme non autorisée en France ne reçoit aucun verdict d'usage. */
  if (p.category !== "wallet" && !isAvailableFr(p)) {
    return {
      headline,
      facts: [
        `${p.name} ne figure pas parmi les plateformes crypto agréées MiCA avec accès à la France lors de notre dernière vérification (date dans l'encadré MiCA). Statut relevé : ${lowerFirst(p.mica.status).replace(/\.$/, "")}. Nous ne donnons donc aucun verdict d'usage : comparez plutôt les plateformes agréées MiCA avec accès à la France.`,
      ],
      ideal: "Aucun profil en France dans nos données.",
      avoid: "Vous résidez en France.",
    };
  }

  const s = p.scoring;
  // Les portefeuilles (data/wallets.json) n'ont pas toutes les sous-notes : on n'affiche que celles qui existent.
  const subs = (
    [
      ["frais", s.fees],
      ["sécurité", s.security],
      ["conformité MiCA", s.mica],
      ["expérience utilisateur", s.ux],
      ["support", s.support],
      ["catalogue et services", s.catalogue],
    ] as const
  ).filter(([, v]) => typeof v === "number");
  const facts: string[] = [`Sous-notes de la méthodologie : ${subs.map(([k, v]) => `${k} ${noteFr(v as number)}/5`).join(", ")}.`];
  if (p.category === "wallet") {
    facts.push(`${p.name} est un portefeuille matériel : vous conservez vous-même vos clés, hors du champ de l'agrément MiCA.`);
  } else {
    facts.push(
      `Statut réglementaire : ${lowerFirst(p.mica.status)}${p.mica.registerSource ? ` (${p.mica.registerSource})` : ""} ; date de vérification dans l'encadré MiCA.`,
    );
    const simple = simpleCost1000(p);
    if (simple.status !== "non-releve") {
      facts.push(
        `Achat de 1 000 € (${lowerFirst(simple.path ?? "")}) : ${lowerFirst(purchaseCostText(simple))}. Payé par carte : ${lowerFirst(purchaseCostText(cardCost1000(p)))}. Date du relevé dans l'encadré des frais.`,
      );
    } else if (p.fees.verified?.makerTakerApplies ?? true) {
      facts.push(`Frais du marché spot : ${nbFr(p.fees.spotMaker)} % en maker et ${nbFr(p.fees.spotTaker)} % en taker. Coût complet d'un achat par carte : non relevé.`);
    } else {
      facts.push("Coût d'un achat de 1 000 € : non relevé.");
    }
  }
  facts.push(
    `Catalogue : ${nbFr(p.cryptos.totalCount, 0)} cryptomonnaie${p.cryptos.totalCount > 1 ? "s" : ""} dans nos données${p.cryptos.stakingAvailable ? `, staking proposé (${p.cryptos.stakingCryptos.length} crypto${p.cryptos.stakingCryptos.length > 1 ? "s" : ""} recensée${p.cryptos.stakingCryptos.length > 1 ? "s" : ""} dans nos données, liste non exhaustive)` : ", pas de staking"}.`,
  );

  const avoid = p.weaknesses[0] ? `Point faible principal : ${p.weaknesses[0].replace(/\.$/, "")}.` : "Aucun point faible relevé dans nos données.";
  return { headline, facts, ideal: p.idealFor, avoid };
}

/**
 * Note App Store / Play Store affichable, ou null. Aucune note n'a de source ni de date au 06/10/2026 et les contrôles
 * ont montré des valeurs fausses : rien n'est affiché tant que le champ de relevé (appStoreVerified / playStoreVerified)
 * n'existe pas.
 */
export function storeRating(p: Pick<Platform, "ratings">, store: "appStore" | "playStore"): { rating: number; verified: string } | null {
  const verified = store === "appStore" ? p.ratings.appStoreVerified : p.ratings.playStoreVerified;
  if (!verified) return null;
  return { rating: p.ratings[store], verified };
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

/** Date du dernier calcul des scores (scripts/compute-platform-scores.mjs, lancé à la main), « AAAA-MM-JJ » ou null.
 *  08/10/2026 (lot fraîcheur A) : affichée sur /top à la place de « mis à jour automatiquement » / « trimestriellement ». */
export const PLATFORMS_LAST_SCORED: string | null = (() => {
  const v = (data._meta as { lastScored?: unknown }).lastScored;
  return typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null;
})();

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
  // Repli App Store seulement si la note a été relevée et datée (storeRating) : aucune ne l'est au 06/10/2026.
  const app = storeRating(p, "appStore");
  if (app && app.rating >= 3.5) {
    return {
      label: "App Store",
      rating: app.rating,
      count: null,
      verified: app.verified,
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
