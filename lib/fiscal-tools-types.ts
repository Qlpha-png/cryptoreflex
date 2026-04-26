/**
 * Types TypeScript pour les outils fiscaux crypto référencés sur Cryptoreflex.
 *
 * Source unique de vérité : `data/fiscal-tools.json`.
 * Helpers : `lib/fiscal-tools.ts`.
 *
 * On distingue volontairement ces outils des plateformes d'achat crypto
 * (`lib/platforms.ts`) parce qu'ils ne servent pas le même besoin :
 *  - Plateformes = achat / vente / staking (KYC, MiCA CASP)
 *  - Outils fiscaux = agrégation de transactions + génération Cerfa 2086 / 3916-bis
 *
 * Volontairement plus léger que `Platform` : pas de scoring multidimension,
 * pas de bonus de bienvenue (les outils fiscaux ne font pas de welcome bonus).
 */

/** Modèle tarifaire global de l'outil. */
export type FiscalToolPricingModel =
  | "freemium" // free tier permanent + paliers payants
  | "subscription" // abonnement annuel obligatoire dès la 1re tx
  | "one-time-per-year"; // achat ponctuel pour la déclaration de l'année

/** Un palier tarifaire (sous forme normalisée EUR/an). */
export interface FiscalToolPlan {
  /** Nom commercial du plan (ex: "Trader", "Hodler", "Pro"). */
  name: string;
  /** Prix annuel en euros (0 = gratuit). */
  priceEur: number;
  /** Nombre maximum de transactions incluses dans le plan. */
  maxTransactions: number | "unlimited";
  /** Liste courte des features clés (≤ 5 entrées). */
  features: string[];
}

/** Un outil de déclaration fiscale crypto. */
export interface FiscalTool {
  /** Identifiant kebab-case unique (ex: "waltio"). */
  id: string;
  /** Nom commercial affiché. */
  name: string;
  /** Path local vers le logo SVG (ex: "/logos/waltio.svg"). */
  logoUrl: string;
  /** URL marketing publique (sans tracking). */
  websiteUrl: string;
  /**
   * URL d'affiliation Cryptoreflex (avec UTM / ?ref=).
   * IMPORTANT : tous les CTA doivent passer par <AffiliateLink /> ou
   * `rel="sponsored noopener noreferrer"` pour conformité loi Influenceurs
   * (n°2023-451 du 9 juin 2023).
   */
  affiliateUrl: string;
  /** Pays du siège social (ISO 3166-1 alpha-2). */
  country: string;
  /** Modèle tarifaire global. */
  pricingModel: FiscalToolPricingModel;
  /** Existe-t-il un essai gratuit (sans CB) ? */
  freeTrial: boolean;
  /** Interface 100 % FR + support FR ? */
  supportFr: boolean;
  /** Génère un export adapté au formulaire 2086 / 3916-bis FR ? */
  micaCompliant: boolean;
  /** Paliers tarifaires (triés par prix croissant). */
  plansEur: FiscalToolPlan[];
  /** Nombre de plateformes / wallets supportés (CEX + DEX + chains). */
  supportedExchanges: number;
  /** Génère un export pré-rempli pour le 3916-bis (déclaration comptes étrangers) ? */
  exportCerfa3916bis: boolean;
  /** Génère un PDF récap ? */
  exportPdf: boolean;
  /** Génère un export CSV brut ? */
  exportCsv: boolean;
  /** Nombre d'intégrations API natives (synchro auto). */
  integrationsCount: number;
  /** Mode "expert-comptable" (export validé + accès comptable) ? */
  accountantSupport: boolean;
  /** Langues du support client (codes ISO 639-1). */
  customerSupport: string[];
  /** Points forts éditoriaux (≤ 5 entrées, formulés en FR). */
  pros: string[];
  /** Points faibles éditoriaux (≤ 4 entrées, formulés en FR). */
  cons: string[];
  /** Score Cryptoreflex sur 10 (à mettre à jour après tests). */
  score: number;
  /** Marquer l'outil que Cryptoreflex recommande en priorité (1 seul = true). */
  recommended: boolean;
  /** Notes éditoriales libres (badge, commentaire, etc.). */
  notes?: string;
}

/** Structure du fichier `data/fiscal-tools.json`. */
export interface FiscalToolsData {
  _meta: {
    lastUpdated: string;
    source: string;
    schemaVersion: string;
  };
  tools: FiscalTool[];
}
