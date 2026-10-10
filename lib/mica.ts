import psanRegistry from "@/data/psan-registry.json";

// ============================================================================
// TYPES
// ============================================================================

/**
 * Statut PSAN (Prestataire de Services sur Actifs Numériques) — régime FR
 * pré-MiCA, issu de la loi PACTE de 2019, en vigueur jusqu'au 30 juin 2026.
 */
export type PsanStatus =
  | "registered" // Enregistré (PSAN simple) ou Agréé
  | "not_registered" // Non enregistré dans aucun État membre UE
  | "not_applicable" // Hors champ (wallet self-custody, DEX, etc.)
  | "revoked"; // Enregistrement retiré (faillite, sanction)

/**
 * Statut MiCA (Markets in Crypto-Assets, Règlement UE 2023/1114).
 * Applicable aux CASP depuis le 30 décembre 2024, période transitoire jusqu'au
 * 1er juillet 2026 pour les acteurs PSAN nationaux.
 */
export type MicaStatus =
  | "authorized" // Agrément CASP MiCA obtenu
  | "in_progress" // Dossier déposé / en cours d'instruction
  | "non_compliant" // Aucun agrément, opère hors cadre UE
  | "out_of_scope"; // Hors champ (DEX, wallet self-custody)

export interface PlatformMica {
  id: string;
  name: string;
  aliases: string[];
  /** Chemin d'un logo présent dans public/logos, ou null (aucun logo officiel téléchargé). */
  logo: string | null;
  websiteUrl: string;
  legalEntity: string;
  headquarters: string;
  psanStatus: PsanStatus;
  psanCountry: string | null;
  amfRegistration: string | null;
  registrationDate: string | null;
  micaStatus: MicaStatus;
  micaJurisdiction: string | null;
  micaAuthorizationDate: string | null;
  micaPassporting: string[];
  atRiskJuly2026: boolean;
  restrictions: string[];
  publicSource: string;
  wikipediaSource: string | null;
  lastVerified: string;
  notes: string;
  /** Lot Z4 : autorisation en vigueur trouvée dans la liste blanche de l'AMF par la veille R5 (scripts/veille-amf.mjs). */
  amf?: { noAmf: string | null; passeport: boolean; entite: string; nature: string; statut: string; debut: string | null; rapprochement: string; controle: string };
}

/** Lot Z4 : liste blanche de l'AMF relue par la veille R5 (data.gouv.fr, Licence Ouverte 2.0). */
export interface AmfMeta {
  source: string;
  url: string;
  ressource: string;
  /** date de publication de la liste par l'AMF (AAAA-MM-JJ) */
  publication: string;
  controle: string;
  lignes: number;
  entitesActives: number;
}

export interface PsanRegistryMeta {
  lastUpdated: string;
  updateFrequency: string;
  source: string;
  officialSources: {
    amf: string;
    esma: string;
    bafin: string;
    regulation: string;
  };
  disclaimer: string;
  schemaVersion: string;
  amf?: AmfMeta;
}

export interface PsanRegistry {
  _meta: PsanRegistryMeta;
  platforms: PlatformMica[];
}

const data = psanRegistry as unknown as PsanRegistry;

// ============================================================================
// QUERIES
// ============================================================================

/** Toutes les plateformes du registre, triées alphabétiquement. */
export function getAllMicaPlatforms(): PlatformMica[] {
  return [...data.platforms].sort((a, b) => a.name.localeCompare(b.name, "fr"));
}

/** Métadonnées du registre (date de dernière mise à jour, sources, etc.). */
export function getMicaMeta(): PsanRegistryMeta {
  return data._meta;
}

/** Recherche par identifiant slug. */
export function getMicaPlatformById(id: string): PlatformMica | undefined {
  return data.platforms.find((p) => p.id === id);
}

/**
 * Recherche tolérante par nom OU URL OU alias (case-insensitive).
 * Normalise les entrées (espaces, casse, protocoles, www, slashs trailing).
 */
export function getMicaStatusByName(query: string): PlatformMica | undefined {
  if (!query || typeof query !== "string") return undefined;
  const normalized = normalizeQuery(query);
  if (!normalized) return undefined;

  // Match exact d'abord (id, nom complet, aliases)
  const exact = data.platforms.find((p) => {
    if (p.id === normalized) return true;
    if (normalizeQuery(p.name) === normalized) return true;
    if (p.aliases.some((a) => normalizeQuery(a) === normalized)) return true;
    if (normalizeQuery(p.websiteUrl) === normalized) return true;
    return false;
  });
  if (exact) return exact;

  // Match partiel (substring sur nom/aliases/url)
  return data.platforms.find((p) => {
    const candidates = [
      p.id,
      p.name,
      p.websiteUrl,
      ...p.aliases,
    ].map(normalizeQuery);
    return candidates.some((c) => c.includes(normalized) || normalized.includes(c));
  });
}

/** Plateformes flaggées "à risque juillet 2026". */
export function getAtRiskPlatforms(): PlatformMica[] {
  return data.platforms
    .filter((p) => p.atRiskJuly2026)
    .sort((a, b) => a.name.localeCompare(b.name, "fr"));
}

/** Plateformes pleinement agréées MiCA (CASP). */
export function getMicaAuthorizedPlatforms(): PlatformMica[] {
  return data.platforms
    .filter((p) => p.micaStatus === "authorized")
    .sort((a, b) => a.name.localeCompare(b.name, "fr"));
}

/** Plateformes PSAN AMF enregistrées en France. */
export function getAmfRegisteredPlatforms(): PlatformMica[] {
  return data.platforms
    .filter((p) => p.psanCountry === "FR" && p.psanStatus === "registered")
    .sort((a, b) => a.name.localeCompare(b.name, "fr"));
}

/**
 * Plateformes les plus consultées (hardcodé en fonction du trafic FR observé,
 * à mettre à jour mensuellement).
 */
export function getMostSearchedPlatforms(limit = 20): PlatformMica[] {
  const popularIds = [
    "binance",
    "coinbase",
    "kraken",
    "crypto-com",
    "bybit",
    "bitpanda",
    "okx",
    "trade-republic",
    "revolut",
    "kucoin",
    "mexc",
    "swissborg",
    "bitget",
    "etoro",
    "coinhouse",
    "ledger",
    "metamask",
    "phantom",
    "n26",
    "gate-io",
  ];
  return popularIds
    .map((id) => getMicaPlatformById(id))
    .filter((p): p is PlatformMica => p !== undefined)
    .slice(0, limit);
}

// ============================================================================
// UI HELPERS
// ============================================================================

/**
 * Couleur sémantique du statut combiné PSAN + MiCA, utilisée pour les badges.
 * - green : agrément MiCA pleinement obtenu, faible risque
 * - amber : enregistré mais en cours, à surveiller
 * - red   : non-compliant, à risque post-juin 2026
 * - gray  : hors champ MiCA (wallet, DEX) ou révoqué/faillite
 */
export type StatusColor = "green" | "amber" | "red" | "gray";

export function getStatusColor(p: PlatformMica): StatusColor {
  if (p.psanStatus === "revoked") return "gray";
  if (p.micaStatus === "out_of_scope") return "gray";
  /* agréée ailleurs mais sans accès à la France (pas de passeport, ou sortie du marché FR) */
  if (p.micaStatus === "authorized" && p.atRiskJuly2026) return "amber";
  if (p.micaStatus === "authorized") return "green";
  if (p.micaStatus === "non_compliant") return "red";
  if (p.atRiskJuly2026) return "amber";
  if (p.micaStatus === "in_progress") return "amber";
  return "gray";
}

export function getStatusLabel(p: PlatformMica): string {
  if (p.psanStatus === "revoked") return "Enregistrement révoqué";
  if (p.micaStatus === "out_of_scope") return "Hors champ MiCA";
  if (p.micaStatus === "authorized") return "Agréé MiCA (CASP)";
  if (p.micaStatus === "in_progress") return "Dossier MiCA en cours";
  if (p.micaStatus === "non_compliant") return "Aucun agrément MiCA (registre ESMA)";
  return "Statut inconnu";
}

/**
 * Statut en France depuis la fin de la période transitoire (1er juillet 2026). L'ancien régime
 * PSAN a pris fin le 30 juin 2026 : ses numéros (E20xx-xxx) ne sont plus affichés.
 */
export function getPsanLabel(p: PlatformMica): string {
  if (p.micaStatus === "out_of_scope") return "Hors champ de l'agrément MiCA";
  if (p.psanStatus === "revoked") return "Plateforme en liquidation";
  if (p.micaStatus === "authorized" && p.psanCountry === "FR")
    return p.amfRegistration ? `Agréée par l'AMF (n° ${p.amfRegistration})` : "Agréée par l'AMF";
  if (p.micaStatus === "authorized" && !p.atRiskJuly2026) return "Autorisée en France (passeport MiCA)";
  return "Non autorisée en France";
}

/** Tailwind classes pour un badge selon la couleur de statut. */
export function getStatusBadgeClasses(color: StatusColor): string {
  switch (color) {
    case "green":
      return "border-accent-green/40 bg-accent-green/10 text-accent-green";
    case "amber":
      return "border-primary/40 bg-primary/10 text-primary-soft";
    case "red":
      return "border-accent-rose/40 bg-accent-rose/10 text-accent-rose";
    case "gray":
    default:
      return "border-border bg-elevated/60 text-muted";
  }
}

/** Format date FR lisible. */
export function formatMicaDate(iso: string | null): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

// ============================================================================
// INTERNALS
// ============================================================================

function normalizeQuery(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .replace(/\/+$/, "")
    .replace(/\s+/g, " ");
}
