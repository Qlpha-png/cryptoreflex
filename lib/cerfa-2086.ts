/**
 * lib/cerfa-2086.ts
 * -----------------
 * Logique métier "Cerfa 2086 + 3916-bis pré-rempli" :
 *  - Lecture d'un CSV au format pivot de l'outil (modèle public/modeles/cerfa-2086-modele.csv ; côté navigateur :
 *    lib/cerfa-csv.ts) → transactions normalisées. Les exports bruts des plateformes ne sont PAS lus.
 *  - Calcul des cessions imposables selon l'article 150 VH bis du CGI, ligne
 *    par ligne du formulaire 2086 (lignes 211 à 224).
 *  - Génération PDF (récap "annexe Cerfa") via pdf-lib.
 *
 * RÈGLE APPLIQUÉE (art. 150 VH bis du CGI ; BOFiP BOI-RPPM-PVBMC-30-20 ;
 * formulaire 2086, CERFA 16043) :
 *
 *   l. 224 = l. 218 − [ l. 223 × ( l. 217 / l. 212 ) ]
 *
 *   212 = valeur globale du portefeuille au moment de la cession (toutes
 *         cryptos, tous supports, tout le foyer fiscal — BOFiP § 140)
 *   213 = prix de cession
 *   214 = frais de cession (déduits du PREMIER terme uniquement, jamais du
 *         quotient — BOFiP § 50, Remarque)
 *   217 = prix de cession net des soultes (= 213 ici : soultes non gérées)
 *   218 = prix de cession net des frais et soultes (= 213 − 214)
 *   220 = prix total d'acquisition du portefeuille = somme des prix payés en
 *         monnaie légale pour TOUTES les acquisitions antérieures (toutes
 *         cryptos confondues, toutes années confondues)
 *   221 = somme des fractions de capital initial déjà imputées lors des
 *         cessions antérieures (= le terme 223 × 217 / 212 de chacune d'elles,
 *         y compris celles des années précédentes — BOFiP § 100-110)
 *   222 = soultes reçues lors d'échanges antérieurs (non gérées : 0)
 *   223 = 220 − 221 − 222
 *
 * Exonération : si la somme des prix de cession de l'année, NETS de frais
 * (lignes 218, additionnées en ligne 51 du formulaire), ≤ 305 €
 * (art. 150 VH bis II ; c'est le total des ventes, pas la plus-value).
 *
 * VALEUR GLOBALE (l. 212) — jamais estimée avec un "dernier prix connu" :
 *   (a) si la vente fournit `portfolioValueEur` (saisie utilisateur) → utilisée ;
 *   (b) sinon calculée = Σ (quantité détenue × prix du JOUR de la cession) :
 *       prix de la cession pour l'actif cédé, prix d'une transaction du même
 *       jour pour les autres actifs, ou `options.priceLookup` ;
 *   (c) si un prix manque → la cession est marquée "a_completer" (plus-value
 *       null), ainsi que toutes les cessions suivantes (la l. 221 devient
 *       inconnue). Aucun chiffre faux n'est présenté comme officiel.
 *
 * Non géré (annoncé dans le PDF) : échanges avec soulte (l. 216/222),
 * paiements en crypto, frais d'acquisition (non ajoutés à la l. 220 — montant
 * signalé), récompenses (hypothèse : valorisées à la réception).
 *
 * Sécurité / RGPD :
 *   - aucun stockage des transactions côté serveur (POST → calcul → stream PDF) ;
 *   - les données utilisateurs ne transitent PAS dans la KV ni dans Beehiiv.
 */

import {
  PDFDocument,
  StandardFonts,
  rgb,
  type PDFFont,
  type PDFPage,
  type RGB,
} from "pdf-lib";
import { calculateFlatTax, formatEur, SEUIL_EXONERATION_EUR } from "@/lib/tax-fr";
import PSAN_REGISTRY from "@/data/psan-registry.json";

/* -------------------------------------------------------------------------- */
/*  Types publics                                                             */
/* -------------------------------------------------------------------------- */

export type CerfaTxType = "buy" | "sell" | "swap" | "transfer" | "fee" | "reward";

export interface CerfaTransaction {
  /** ISO-8601 (YYYY-MM-DD ou full ISO datetime). */
  date: string;
  /** Type d'opération normalisé. */
  type: CerfaTxType;
  /** Symbole de l'actif (BTC, ETH, USDC, …). */
  asset: string;
  /** Quantité (signée positive). */
  quantity: number;
  /** Prix unitaire en euros au moment de l'opération (0 si non disponible). */
  priceEur: number;
  /**
   * Frais en euros. Sur une vente : frais de cession (ligne 214). Sur un achat :
   * frais d'acquisition — NON ajoutés à la ligne 220 par l'outil (montant
   * signalé dans les avertissements).
   */
  fees: number;
  /**
   * Plateforme d'origine (libre, ex: "Binance", "Coinbase", "Bitpanda").
   * Sert à générer un 3916-bis par exchange étranger détecté.
   */
  exchange?: string;
  /**
   * (Vente uniquement) Valeur globale du portefeuille au moment de la cession
   * (ligne 212), en euros, saisie par l'utilisateur. Prioritaire sur le calcul.
   */
  portfolioValueEur?: number;
}

export type CerfaCessionStatut = "calculee" | "a_completer";

export type CerfaValeurGlobaleSource = "saisie" | "calculee";

export type CerfaPrixSource =
  | "prix_de_cession"
  | "transaction_meme_jour"
  | "source_externe"
  | "manquant";

/** Détail d'un actif dans le calcul de la valeur globale (ligne 212). */
export interface CerfaValorisationLigne {
  asset: string;
  quantite: number;
  /** Prix unitaire € retenu au jour de la cession (null si manquant). */
  prixUnitaireEur: number | null;
  source: CerfaPrixSource;
}

export interface CerfaCession {
  /** Ligne 211 — date de la cession (ISO). */
  date: string;
  /** Symbole cédé (informatif — le 2086 ne le demande pas). */
  asset: string;
  /** Quantité cédée. */
  quantity: number;
  /** "calculee" = toutes les lignes déterminées ; "a_completer" = plus-value non calculable. */
  statut: CerfaCessionStatut;
  /** Motifs (bloquants ou non) à afficher à l'utilisateur. */
  alertes: string[];
  /** Ligne 212 — valeur globale du portefeuille au moment de la cession (null si inconnue). */
  valeurGlobaleEur: number | null;
  valeurGlobaleSource: CerfaValeurGlobaleSource | null;
  /** Détail du calcul de la ligne 212 (vide si saisie ou non calculée). */
  valorisation: CerfaValorisationLigne[];
  /** Ligne 213 — prix de cession. */
  prixCessionEur: number;
  /** Ligne 214 — frais de cession. */
  fraisCessionEur: number;
  /** Ligne 218 — prix de cession net des frais (et soultes : 0). */
  prixCessionNetEur: number;
  /** Ligne 220 — prix total d'acquisition du portefeuille (cumul des achats antérieurs). */
  prixTotalAcquisitionEur: number;
  /** Ligne 221 — fractions de capital initial déjà imputées (null si inconnues). */
  fractionsAnterieuresEur: number | null;
  /** Ligne 223 — prix total d'acquisition net (= 220 − 221 − 222). */
  prixAcquisitionNetEur: number | null;
  /** Fraction de capital initial imputée à cette cession = 223 × 217 / 212. */
  fractionCapitalInitialEur: number | null;
  /** Ligne 224 — plus-value (positive) ou moins-value (négative). null si à compléter. */
  plusValueEur: number | null;
  /** Vrai si la ligne 224 est négative. */
  deficit: boolean;
}

export interface CerfaSummary {
  /** Année d'imposition. */
  taxYear: number;
  /** Nombre de cessions de l'année (calculées + à compléter). */
  nbCessions: number;
  nbCessionsCalculees: number;
  nbCessionsACompleter: number;
  /** Vrai si au moins une cession est à compléter : les totaux de plus-value sont PARTIELS. */
  calculIncomplet: boolean;
  /** Cumul des prix de cession bruts (ligne 213) de l'année. */
  totalCessionsEur: number;
  /** Cumul des prix de cession nets de frais (ligne 218) — c'est lui que le formulaire (l. 51) compare à 305 €. */
  totalCessionsNetEur: number;
  /** Cumul des frais de cession (ligne 214). */
  totalFraisCessionEur: number;
  /** Somme des lignes 224 positives (cessions calculées). */
  totalPlusValuesEur: number;
  /** Somme des lignes 224 négatives, en valeur absolue (cessions calculées). */
  totalMoinsValuesEur: number;
  /** Plus-value nette = plus-values − moins-values (partielle si calculIncomplet). */
  plusValueNetteEur: number;
  /** Vrai si total des prix de cession ≤ 305 € (exonération). */
  exonere: boolean;
  /** Impôt PFU 31,4 % estimé (0 si exonéré ou déficit ; partiel si calculIncomplet). */
  impotPfuEur: number;
  /** Net après impôt (plusValueNette − impotPfu). */
  netApresImpotEur: number;
  /** Nom du contribuable affiché en haut du PDF (optionnel). */
  taxpayerName?: string;
  /** Liste des exchanges étrangers détectés (pour 3916-bis). */
  foreignExchanges: string[];
  /** Avertissements méthodologiques à afficher (rewards, frais d'achat, swaps, …). */
  avertissements: string[];
}

export interface CerfaGenerateInput {
  transactions: CerfaTransaction[];
  taxYear: number;
  taxpayerName?: string;
  /** Options de calcul (source de prix externe, …). */
  options?: ComputeCessionsOptions;
}

export interface CerfaGenerateResult {
  pdfBytes: Uint8Array;
  summary: CerfaSummary;
  cessions: CerfaCession[];
}

export interface ComputeCessionsOptions {
  /**
   * Prix en euros d'un actif à une date (YYYY-MM-DD, UTC). Retourne null/undefined
   * si inconnu. Utilisé en dernier recours pour la ligne 212 (après la valeur
   * saisie et les transactions du même jour). Jamais d'extrapolation côté outil.
   */
  priceLookup?: (asset: string, dateIso: string) => number | null | undefined;
}

/* -------------------------------------------------------------------------- */
/*  Validation des transactions (Zod-like manuel, zéro deps)                  */
/* -------------------------------------------------------------------------- */

const VALID_TYPES: CerfaTxType[] = [
  "buy",
  "sell",
  "swap",
  "transfer",
  "fee",
  "reward",
];

export interface ValidationError {
  index: number;
  field: string;
  message: string;
}

export interface ValidationResult {
  ok: boolean;
  transactions: CerfaTransaction[];
  errors: ValidationError[];
}

function isValidIsoDate(s: string): boolean {
  if (typeof s !== "string") return false;
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return false;
  // Borne raisonnable : 2010-01-01 → 2050-12-31
  const t = d.getTime();
  return t >= 1262304000000 && t < 2556143999999;
}

function num(v: unknown): number {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") {
    const n = Number(v.replace(",", ".").trim());
    return Number.isFinite(n) ? n : NaN;
  }
  return NaN;
}

/**
 * Valide et normalise une liste brute de transactions reçues côté API.
 * Limites : max 1000 transactions par PDF (anti-DoS et limite raisonnable).
 */
export function validateTransactions(raw: unknown): ValidationResult {
  const errors: ValidationError[] = [];
  const transactions: CerfaTransaction[] = [];

  if (!Array.isArray(raw)) {
    return {
      ok: false,
      transactions: [],
      errors: [{ index: -1, field: "_root", message: "transactions doit être un tableau" }],
    };
  }

  if (raw.length === 0) {
    return {
      ok: false,
      transactions: [],
      errors: [{ index: -1, field: "_root", message: "Aucune transaction fournie" }],
    };
  }

  if (raw.length > 1000) {
    return {
      ok: false,
      transactions: [],
      errors: [
        {
          index: -1,
          field: "_root",
          message: `Trop de transactions (${raw.length}, max 1000 par PDF)`,
        },
      ],
    };
  }

  for (let i = 0; i < raw.length; i++) {
    const item = raw[i];
    if (!item || typeof item !== "object") {
      errors.push({ index: i, field: "_root", message: "Ligne invalide (non objet)" });
      continue;
    }
    const obj = item as Record<string, unknown>;

    const date = String(obj.date ?? "").trim();
    if (!isValidIsoDate(date)) {
      errors.push({ index: i, field: "date", message: `Date invalide: "${date}"` });
      continue;
    }

    const typeRaw = String(obj.type ?? "").trim().toLowerCase();
    const type = VALID_TYPES.includes(typeRaw as CerfaTxType)
      ? (typeRaw as CerfaTxType)
      : null;
    if (!type) {
      errors.push({
        index: i,
        field: "type",
        message: `Type invalide: "${typeRaw}" (attendu: ${VALID_TYPES.join("|")})`,
      });
      continue;
    }

    const asset = String(obj.asset ?? "").trim().toUpperCase();
    if (!asset || asset.length > 12) {
      errors.push({ index: i, field: "asset", message: `Symbole invalide: "${asset}"` });
      continue;
    }

    const quantity = num(obj.quantity);
    if (!Number.isFinite(quantity) || quantity < 0) {
      errors.push({ index: i, field: "quantity", message: `Quantité invalide` });
      continue;
    }

    const priceEur = num(obj.priceEur ?? obj.price_eur);
    if (!Number.isFinite(priceEur) || priceEur < 0) {
      errors.push({ index: i, field: "priceEur", message: `Prix € invalide` });
      continue;
    }

    const fees = num(obj.fees ?? 0);
    const safeFees = Number.isFinite(fees) && fees >= 0 ? fees : 0;

    const exchangeRaw = obj.exchange;
    const exchange =
      typeof exchangeRaw === "string" && exchangeRaw.trim().length > 0
        ? exchangeRaw.trim()
        : undefined;

    // Valeur globale du portefeuille (ligne 212) saisie — optionnelle.
    let portfolioValueEur: number | undefined;
    const pvRaw = obj.portfolioValueEur ?? obj.portfolio_value_eur;
    if (pvRaw !== undefined && pvRaw !== null && pvRaw !== "") {
      const pv = num(pvRaw);
      if (!Number.isFinite(pv) || pv < 0) {
        errors.push({
          index: i,
          field: "portfolioValueEur",
          message: "Valeur globale du portefeuille (ligne 212) invalide",
        });
        continue;
      }
      portfolioValueEur = pv > 0 ? pv : undefined;
    }

    transactions.push({
      date,
      type,
      asset,
      quantity,
      priceEur,
      fees: safeFees,
      exchange,
      ...(portfolioValueEur !== undefined ? { portfolioValueEur } : {}),
    });
  }

  if (transactions.length === 0) {
    return { ok: false, transactions: [], errors };
  }

  return { ok: errors.length === 0, transactions, errors };
}

/* -------------------------------------------------------------------------- */
/*  Parsing CSV multi-exchanges                                               */
/* -------------------------------------------------------------------------- */

/**
 * Parser CSV minimal, séparateur virgule, sans guillemets (utilisé par les tests serveur). Le navigateur passe par
 * lib/cerfa-csv.ts, qui gère aussi « ; », les guillemets, la virgule décimale et les dates JJ/MM/AAAA.
 *
 * Retourne un tableau d'objets indexés par les en-têtes (1ère ligne).
 */
export function parseCsv(text: string): Array<Record<string, string>> {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) return [];
  const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());
  const rows: Array<Record<string, string>> = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(",");
    const row: Record<string, string> = {};
    for (let j = 0; j < headers.length; j++) {
      row[headers[j]] = (cols[j] ?? "").trim();
    }
    rows.push(row);
  }
  return rows;
}

/* -------------------------------------------------------------------------- */
/*  Arithmétique des lignes du formulaire 2086                                */
/* -------------------------------------------------------------------------- */

export interface Ligne2086Input {
  /** l. 212 — valeur globale du portefeuille au moment de la cession (> 0). */
  valeurGlobaleEur: number;
  /** l. 213 — prix de cession. */
  prixCessionEur: number;
  /** l. 214 — frais de cession (défaut 0). */
  fraisCessionEur?: number;
  /** l. 220 — prix total d'acquisition du portefeuille. */
  prixTotalAcquisitionEur: number;
  /** l. 221 — fractions de capital initial déjà imputées (défaut 0). */
  fractionsAnterieuresEur?: number;
  /** l. 222 — soultes reçues lors d'échanges antérieurs (défaut 0). */
  soultesRecuesAnterieuresEur?: number;
}

export interface Ligne2086Result {
  /** l. 217 — prix de cession net des soultes (= 213 : aucune soulte gérée). */
  prixCessionNetSoultesEur: number;
  /** l. 218 — prix de cession net des frais et soultes. */
  prixCessionNetEur: number;
  /** l. 223 — prix total d'acquisition net = 220 − 221 − 222. */
  prixAcquisitionNetEur: number;
  /** Fraction de capital initial imputée = 223 × 217 / 212. */
  fractionCapitalInitialEur: number;
  /** l. 224 = 218 − fraction. */
  plusValueEur: number;
}

/**
 * Calcule les lignes 217, 218, 223, 224 du formulaire 2086 pour une cession.
 *
 *   224 = 218 − [223 × (217 / 212)]
 *
 * Les frais (214) ne sont déduits que du premier terme (218), jamais du
 * quotient (217 / 212) — BOI-RPPM-PVBMC-30-20 § 50, Remarque.
 * Aucun arrondi : l'arrondi au centime se fait uniquement à l'affichage.
 */
export function computeLigne2086(input: Ligne2086Input): Ligne2086Result {
  const l212 = input.valeurGlobaleEur;
  const l213 = input.prixCessionEur;
  const l214 = input.fraisCessionEur ?? 0;
  const l220 = input.prixTotalAcquisitionEur;
  const l221 = input.fractionsAnterieuresEur ?? 0;
  const l222 = input.soultesRecuesAnterieuresEur ?? 0;

  for (const [name, v] of Object.entries({ l212, l213, l214, l220, l221, l222 })) {
    if (!Number.isFinite(v)) throw new Error(`computeLigne2086: ${name} non numérique`);
  }
  if (l212 <= 0) {
    throw new Error("computeLigne2086: la valeur globale du portefeuille (l. 212) doit être > 0");
  }
  if (l214 < 0 || l221 < 0 || l222 < 0 || l220 < 0 || l213 < 0) {
    throw new Error("computeLigne2086: montant négatif interdit");
  }

  const l217 = l213; // soultes non gérées
  const l218 = l213 - l214;
  const l223 = l220 - l221 - l222;
  const fraction = (l223 * l217) / l212;
  const l224 = l218 - fraction;

  return {
    prixCessionNetSoultesEur: l217,
    prixCessionNetEur: l218,
    prixAcquisitionNetEur: l223,
    fractionCapitalInitialEur: fraction,
    plusValueEur: l224,
  };
}

/* -------------------------------------------------------------------------- */
/*  Calcul des cessions selon 150 VH bis                                      */
/* -------------------------------------------------------------------------- */

/**
 * Identifie les exchanges considérés "étrangers" (= hors France) pour générer
 * automatiquement un 3916-bis. Liste basée sur les plateformes les plus
 * communes utilisées par les particuliers FR ; toute plateforme non
 * explicitement listée est considérée par défaut comme étrangère (on préfère
 * un faux positif (3916-bis en trop) à un faux négatif (oubli = amende 750 €)).
 */
const KNOWN_FR_EXCHANGES = new Set([
  "coinhouse",
  "feel mining",
  "feel-mining",
  "stackinsat",
  "paymium",
  "bitstack", // Bitstack Digital Assets SAS (Meyreuil, France) — vérifié le 05/10/2026
  // 05/10/2026 : « bitpanda france » retiré : les comptes sont tenus par Bitpanda GmbH (droit autrichien) ; son
  // enregistrement auprès de l'AMF ne fait pas du compte un compte français → 3916-bis dû.
]);

function isForeignExchange(name: string | undefined): boolean {
  if (!name) return false;
  const n = name.trim().toLowerCase();
  return !KNOWN_FR_EXCHANGES.has(n);
}

/** Tolérance sur les quantités (sommes flottantes). */
const EPS_QTY = 1e-9;

/**
 * Jour calendaire (YYYY-MM-DD) d'une date ISO en heure de Paris : un
 * contribuable français déclare la date de cession en heure locale (une vente
 * horodatée 2024-12-31T23:30Z par un exchange est du 1er janvier 2025 à Paris).
 * Une date sans heure ("2024-06-01") reste le 2024-06-01.
 */
const DAY_FMT = new Intl.DateTimeFormat("sv-SE", {
  timeZone: "Europe/Paris",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});
function cessionDay(dateIso: string): string {
  const t = new Date(dateIso).getTime();
  if (Number.isNaN(t)) return dateIso.slice(0, 10);
  return DAY_FMT.format(t);
}

/** Année fiscale (heure de Paris) d'une date ISO. */
function cessionYear(dateIso: string): number {
  return Number(cessionDay(dateIso).slice(0, 4));
}

/** YYYY-MM-DD → JJ/MM/AAAA (affichage). */
function fmtDate(dateIso: string): string {
  const d = cessionDay(dateIso);
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(d);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : d;
}

/** Quantité lisible (jusqu'à 8 décimales, format fr-FR). */
function fmtQty(q: number): string {
  if (!Number.isFinite(q)) return "—";
  return q.toLocaleString("fr-FR", { maximumFractionDigits: 8 });
}

interface IndexedTx {
  tx: CerfaTransaction;
  index: number;
  t: number;
}

/**
 * Prix € d'un actif observé sur une transaction du MÊME jour UTC que la
 * cession (la plus proche dans le temps). Retourne null si aucune.
 */
function sameDayPrice(
  pricesByAsset: Map<string, IndexedTx[]>,
  asset: string,
  day: string,
  saleT: number,
): number | null {
  const list = pricesByAsset.get(asset);
  if (!list) return null;
  let best: IndexedTx | null = null;
  let bestDelta = Number.POSITIVE_INFINITY;
  for (const it of list) {
    if (cessionDay(it.tx.date) !== day) continue;
    const delta = Math.abs(it.t - saleT);
    if (delta < bestDelta) {
      best = it;
      bestDelta = delta;
    }
  }
  return best ? best.tx.priceEur : null;
}

/**
 * Construit la liste des cessions de l'année fiscale demandée.
 *
 * Toutes les transactions (toutes années) sont rejouées chronologiquement :
 *  - buy / reward : quantité détenue += qty ; l. 220 += qty × priceEur
 *    (reward : hypothèse "valeur à la réception", signalée dans le résumé).
 *  - fee : la quantité quitte le portefeuille (ligne 212 exacte) ; rien sur 214.
 *  - swap : neutre (sursis art. 150 VH bis II A, sans soulte) MAIS la composition
 *    du portefeuille devient non traçable (une seule ligne, un seul actif) →
 *    la l. 212 ne peut plus être calculée automatiquement (saisie requise).
 *  - transfer : ignoré (mouvement interne).
 *  - sell : cession → lignes 212 à 224 ; après calcul, l. 221 += fraction.
 *
 * Si une cession ne peut pas être calculée (l. 212 inconnue, prix manquant,
 * historique incomplet), elle est marquée "a_completer" et TOUTES les cessions
 * suivantes aussi (leur l. 221 dépend de la fraction inconnue).
 */
export function computeCessions(
  transactions: CerfaTransaction[],
  taxYear: number,
  options: ComputeCessionsOptions = {},
): CerfaCession[] {
  const sorted: IndexedTx[] = transactions
    .map((tx, index) => ({ tx, index, t: new Date(tx.date).getTime() }))
    .sort((a, b) => a.t - b.t || a.index - b.index);

  // Index des prix observés (toute transaction avec un prix > 0), par actif.
  const pricesByAsset = new Map<string, IndexedTx[]>();
  for (const it of sorted) {
    if (Number.isFinite(it.tx.priceEur) && it.tx.priceEur > 0) {
      const list = pricesByAsset.get(it.tx.asset) ?? [];
      list.push(it);
      pricesByAsset.set(it.tx.asset, list);
    }
  }

  const holdings = new Map<string, number>(); // quantités détenues par actif
  let prixTotalAcquisition = 0; // l. 220 (cumul des acquisitions, toutes cryptos)
  let fractionsImputees = 0; // l. 221 (cumul des fractions déjà imputées)
  let chaineRompue: { date: string } | null = null; // 1re cession non calculable
  let swapVu: { date: string } | null = null;

  const cessions: CerfaCession[] = [];

  for (const { tx, t: saleT } of sorted) {
    const year = cessionYear(tx.date);
    const held = holdings.get(tx.asset) ?? 0;

    if (tx.type === "buy" || tx.type === "reward") {
      holdings.set(tx.asset, held + tx.quantity);
      // reward : hypothèse "valeur à la réception" (non tranchée officiellement) —
      // signalée dans buildSummary avec le montant concerné.
      prixTotalAcquisition += tx.quantity * tx.priceEur;
      continue;
    }

    if (tx.type === "fee") {
      holdings.set(tx.asset, Math.max(0, held - tx.quantity));
      continue;
    }

    if (tx.type === "swap") {
      if (!swapVu) swapVu = { date: tx.date };
      continue;
    }

    if (tx.type === "transfer") continue;

    /* ----------------------------- sell ----------------------------- */
    const day = cessionDay(tx.date);
    const alertes: string[] = [];
    let bloquant = false;

    const prixCession = tx.quantity * tx.priceEur; // l. 213
    const frais = Number.isFinite(tx.fees) && tx.fees > 0 ? tx.fees : 0; // l. 214

    if (!(prixCession > 0)) {
      alertes.push(
        "Prix de cession manquant (prix unitaire en euros = 0) : renseignez le prix de vente en euros de cette cession.",
      );
      bloquant = true;
    }

    const historiqueIncomplet = tx.quantity > held + EPS_QTY;
    if (historiqueIncomplet) {
      alertes.push(
        `Quantité vendue (${fmtQty(tx.quantity)} ${tx.asset}) supérieure à la quantité détenue connue (${fmtQty(held)} ${tx.asset}) : historique d'acquisition incomplet. Importez toutes vos acquisitions (sinon le prix total d'acquisition, ligne 220, est sous-évalué).`,
      );
      bloquant = true;
    }

    // ---- Ligne 212 : valeur globale du portefeuille au moment de la cession
    let valeurGlobale: number | null = null;
    let valeurGlobaleSource: CerfaValeurGlobaleSource | null = null;
    const valorisation: CerfaValorisationLigne[] = [];

    if (tx.portfolioValueEur !== undefined && tx.portfolioValueEur > 0) {
      valeurGlobale = tx.portfolioValueEur;
      valeurGlobaleSource = "saisie";
      if (prixCession > 0 && valeurGlobale < prixCession) {
        alertes.push(
          `Valeur globale saisie (${formatEur(valeurGlobale)}) inférieure au prix de cession (${formatEur(prixCession)}) : vérifiez la ligne 212 (le portefeuille, avant la cession, contient au moins les actifs cédés).`,
        );
      }
    } else if (swapVu) {
      alertes.push(
        `Un échange crypto/crypto (swap) du ${fmtDate(swapVu.date)} rend la composition du portefeuille non traçable : saisissez la valeur globale du portefeuille au moment de cette cession (ligne 212, champ portfolioValueEur).`,
      );
      bloquant = true;
    } else if (!historiqueIncomplet) {
      let total = 0;
      const manquants: string[] = [];
      for (const [asset, qty] of holdings) {
        if (qty <= EPS_QTY) continue;
        let prix: number | null = null;
        let source: CerfaPrixSource = "manquant";
        if (asset === tx.asset) {
          if (tx.priceEur > 0) {
            prix = tx.priceEur;
            source = "prix_de_cession";
          }
        } else {
          const p = sameDayPrice(pricesByAsset, asset, day, saleT);
          if (p !== null && p > 0) {
            prix = p;
            source = "transaction_meme_jour";
          } else {
            const ext = options.priceLookup?.(asset, day);
            if (typeof ext === "number" && Number.isFinite(ext) && ext > 0) {
              prix = ext;
              source = "source_externe";
            }
          }
        }
        valorisation.push({ asset, quantite: qty, prixUnitaireEur: prix, source });
        if (prix === null) manquants.push(asset);
        else total += qty * prix;
      }
      if (manquants.length > 0) {
        alertes.push(
          `Valeur globale du portefeuille (ligne 212) non calculable : aucun prix en euros au ${fmtDate(day)} pour ${manquants.join(", ")}. Saisissez la valeur globale (champ portfolioValueEur) ou ajoutez une transaction du jour avec son prix.`,
        );
        bloquant = true;
      } else {
        valeurGlobale = total;
        valeurGlobaleSource = "calculee";
      }
    }

    // ---- Lignes 220 / 221
    const l220 = prixTotalAcquisition;
    const l221: number | null = chaineRompue ? null : fractionsImputees;
    if (chaineRompue) {
      alertes.push(
        `Dépend d'une cession antérieure à compléter (${fmtDate(chaineRompue.date)}) : les fractions de capital initial déjà imputées (ligne 221) ne peuvent pas être déterminées tant que cette cession n'est pas complétée.`,
      );
      bloquant = true;
    }

    let cession: CerfaCession;
    if (!bloquant && valeurGlobale !== null && valeurGlobale > 0 && l221 !== null) {
      const l = computeLigne2086({
        valeurGlobaleEur: valeurGlobale,
        prixCessionEur: prixCession,
        fraisCessionEur: frais,
        prixTotalAcquisitionEur: l220,
        fractionsAnterieuresEur: l221,
      });
      fractionsImputees += l.fractionCapitalInitialEur;
      cession = {
        date: tx.date,
        asset: tx.asset,
        quantity: tx.quantity,
        statut: "calculee",
        alertes,
        valeurGlobaleEur: valeurGlobale,
        valeurGlobaleSource,
        valorisation,
        prixCessionEur: prixCession,
        fraisCessionEur: frais,
        prixCessionNetEur: l.prixCessionNetEur,
        prixTotalAcquisitionEur: l220,
        fractionsAnterieuresEur: l221,
        prixAcquisitionNetEur: l.prixAcquisitionNetEur,
        fractionCapitalInitialEur: l.fractionCapitalInitialEur,
        plusValueEur: l.plusValueEur,
        deficit: l.plusValueEur < 0,
      };
    } else {
      if (!chaineRompue) chaineRompue = { date: tx.date };
      cession = {
        date: tx.date,
        asset: tx.asset,
        quantity: tx.quantity,
        statut: "a_completer",
        alertes,
        valeurGlobaleEur: valeurGlobale,
        valeurGlobaleSource,
        valorisation,
        prixCessionEur: prixCession,
        fraisCessionEur: frais,
        prixCessionNetEur: prixCession - frais,
        prixTotalAcquisitionEur: l220,
        fractionsAnterieuresEur: l221,
        prixAcquisitionNetEur: l221 === null ? null : l220 - l221,
        fractionCapitalInitialEur: null,
        plusValueEur: null,
        deficit: false,
      };
    }

    holdings.set(tx.asset, Math.max(0, held - tx.quantity));

    if (year === taxYear) cessions.push(cession);
  }

  return cessions;
}

/* -------------------------------------------------------------------------- */
/*  Synthèse + impôt                                                          */
/* -------------------------------------------------------------------------- */

export function buildSummary(
  cessions: CerfaCession[],
  transactions: CerfaTransaction[],
  taxYear: number,
  taxpayerName?: string,
): CerfaSummary {
  const calculees = cessions.filter((c) => c.statut === "calculee");
  const nbACompleter = cessions.length - calculees.length;

  const totalCessions = cessions.reduce((s, c) => s + c.prixCessionEur, 0);
  const totalFrais = cessions.reduce((s, c) => s + c.fraisCessionEur, 0);
  // Seuil de 305 € : le formulaire (ligne 51) additionne les lignes 218 — prix de
  // cession NETS de frais (et de soultes) — et la notice renvoie à ce total.
  const totalCessionsNet = cessions.reduce((s, c) => s + c.prixCessionNetEur, 0);
  const totalPV = calculees.reduce((s, c) => s + Math.max(0, c.plusValueEur ?? 0), 0);
  const totalMV = calculees.reduce((s, c) => s + Math.min(0, c.plusValueEur ?? 0), 0); // négatif
  const plusValueNette = totalPV + totalMV; // les MV sont déjà négatives

  const exonere = totalCessionsNet <= SEUIL_EXONERATION_EUR;
  const baseImposable = exonere ? 0 : Math.max(0, plusValueNette);
  const impot = calculateFlatTax(baseImposable).totalFlatTax;

  // Détection des exchanges étrangers (3916-bis automatique)
  const foreignExchanges = Array.from(
    new Set(
      transactions
        .map((t) => t.exchange)
        .filter((e): e is string => Boolean(e) && isForeignExchange(e)),
    ),
  ).sort();

  // Avertissements méthodologiques (toutes années : la l. 220 est un cumul)
  const avertissements: string[] = [];

  if (nbACompleter > 0) {
    avertissements.push(
      `${nbACompleter} cession(s) à compléter : la plus-value correspondante n'est pas calculée (valeur globale du portefeuille ou donnée manquante). Les totaux de plus-value sont PARTIELS et ne doivent pas être reportés en l'état.`,
    );
  }

  const rewards = transactions.filter((t) => t.type === "reward");
  if (rewards.length > 0) {
    const valeur = rewards.reduce((s, t) => s + t.quantity * t.priceEur, 0);
    avertissements.push(
      `Récompenses (staking, airdrop…) : ${rewards.length} ligne(s) pour ${formatEur(valeur)} intégrés au prix total d'acquisition (ligne 220) à leur valeur à la réception. Hypothèse non tranchée par une doctrine dédiée : un prix d'acquisition de 0 € (gestion occasionnelle) donnerait une plus-value plus élevée. À vérifier avec un professionnel.`,
    );
  }

  const fraisAchat = transactions
    .filter((t) => t.type === "buy")
    .reduce((s, t) => s + (Number.isFinite(t.fees) && t.fees > 0 ? t.fees : 0), 0);
  if (fraisAchat > 0) {
    avertissements.push(
      `Frais d'acquisition : ${formatEur(fraisAchat)} (colonne fees des achats) NON intégrés à la ligne 220. L'article 150 VH bis III B vise les « prix effectivement acquittés en monnaie ayant cours légal » et le BOFiP ne tranche pas le sort des frais d'achat : si vous retenez leur intégration, majorez la ligne 220 de ce montant (plus-value plus faible).`,
    );
  }

  const swaps = transactions.filter((t) => t.type === "swap").length;
  if (swaps > 0) {
    avertissements.push(
      `${swaps} échange(s) crypto/crypto (swap) traités comme neutres (sursis d'imposition, art. 150 VH bis II A) — valable UNIQUEMENT sans soulte. Un échange avec soulte est une cession imposable (lignes 216/222) non gérée par cet outil : à traiter manuellement.`,
    );
  }

  const transfers = transactions.filter((t) => t.type === "transfer").length;
  if (transfers > 0) {
    avertissements.push(
      `${transfers} transfert(s) ignoré(s) (mouvements entre vos propres supports). Un transfert vers un tiers en paiement d'un bien ou service est une cession imposable que l'outil ne détecte pas.`,
    );
  }

  const feeRows = transactions.filter((t) => t.type === "fee").length;
  if (feeRows > 0) {
    avertissements.push(
      `${feeRows} ligne(s) de type fee : les quantités sortent du portefeuille (ligne 212 exacte) mais ne sont pas ajoutées à la ligne 214. Reportez les frais de cession en euros dans la colonne fees de la vente concernée.`,
    );
  }

  return {
    taxYear,
    nbCessions: cessions.length,
    nbCessionsCalculees: calculees.length,
    nbCessionsACompleter: nbACompleter,
    calculIncomplet: nbACompleter > 0,
    totalCessionsEur: totalCessions,
    totalCessionsNetEur: totalCessionsNet,
    totalFraisCessionEur: totalFrais,
    totalPlusValuesEur: totalPV,
    totalMoinsValuesEur: Math.abs(totalMV),
    plusValueNetteEur: plusValueNette,
    exonere,
    impotPfuEur: impot,
    netApresImpotEur: plusValueNette - impot,
    taxpayerName,
    foreignExchanges,
    avertissements,
  };
}

/* -------------------------------------------------------------------------- */
/*  Génération PDF                                                            */
/* -------------------------------------------------------------------------- */

/** Couleurs (cohérence dark theme + or accent du site, lisible sur fond blanc). */
const COLORS = {
  ink: rgb(0.04, 0.04, 0.06),
  muted: rgb(0.36, 0.38, 0.42),
  gold: rgb(0.96, 0.65, 0.14), // #F5A524
  border: rgb(0.85, 0.85, 0.88),
  warning: rgb(0.69, 0.41, 0.04),
  success: rgb(0.12, 0.55, 0.3),
  danger: rgb(0.78, 0.2, 0.18),
} satisfies Record<string, RGB>;

const PAGE_WIDTH = 595.28; // A4 portrait
const PAGE_HEIGHT = 841.89;
const MARGIN_X = 50;
const MARGIN_TOP = 50;
const MARGIN_BOTTOM = 60;
const CONTENT_RIGHT = PAGE_WIDTH - MARGIN_X;

interface PdfCtx {
  pdf: PDFDocument;
  font: PDFFont;
  fontBold: PDFFont;
  pages: PDFPage[];
  page: PDFPage;
  cursorY: number;
}

function createCtx(pdf: PDFDocument, font: PDFFont, fontBold: PDFFont): PdfCtx {
  const page = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  return { pdf, font, fontBold, pages: [page], page, cursorY: PAGE_HEIGHT - MARGIN_TOP };
}

function addPage(ctx: PdfCtx): void {
  ctx.page = ctx.pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  ctx.pages.push(ctx.page);
  ctx.cursorY = PAGE_HEIGHT - MARGIN_TOP;
}

function ensureSpace(ctx: PdfCtx, needed: number): void {
  if (ctx.cursorY - needed < MARGIN_BOTTOM) addPage(ctx);
}

function drawText(
  ctx: PdfCtx,
  text: string,
  opts: { x?: number; y?: number; size?: number; bold?: boolean; color?: RGB } = {},
): void {
  const x = opts.x ?? MARGIN_X;
  const y = opts.y ?? ctx.cursorY;
  const size = opts.size ?? 10;
  const font = opts.bold ? ctx.fontBold : ctx.font;
  const color = opts.color ?? COLORS.ink;
  ctx.page.drawText(sanitize(text), { x, y, size, font, color });
}

/** Texte aligné à droite sur `right` (bord droit). */
function drawTextRight(
  ctx: PdfCtx,
  text: string,
  right: number,
  opts: { y?: number; size?: number; bold?: boolean; color?: RGB } = {},
): void {
  const size = opts.size ?? 10;
  const font = opts.bold ? ctx.fontBold : ctx.font;
  const clean = sanitize(text);
  const w = font.widthOfTextAtSize(clean, size);
  ctx.page.drawText(clean, {
    x: right - w,
    y: opts.y ?? ctx.cursorY,
    size,
    font,
    color: opts.color ?? COLORS.ink,
  });
}

/**
 * pdf-lib StandardFonts (Helvetica, WinAnsi) ne gère pas tous les glyphes
 * Unicode (€, ≤, −, espaces insécables fines, …). On normalise ; tout
 * caractère restant hors Latin-1 / WinAnsi devient "?" (jamais de crash).
 */
function sanitize(text: string): string {
  const out = text
    .replace(/€/g, "EUR")
    .replace(/[‘’]/g, "'")
    .replace(/«\s?/g, '"')
    .replace(/\s?»/g, '"')
    .replace(/[“”]/g, '"')
    .replace(/[—–]/g, "-")
    .replace(/−/g, "-")
    .replace(/…/g, "...")
    .replace(/≤/g, "<=")
    .replace(/≥/g, ">=")
    .replace(/→/g, "->")
    .replace(/[    ]/g, " ");
  let res = "";
  for (const ch of out) {
    const code = ch.codePointAt(0) ?? 0;
    res += code <= 0xff || ch === "œ" || ch === "Œ" ? ch : "?";
  }
  return res;
}

function drawHr(ctx: PdfCtx, y?: number): void {
  const yy = y ?? ctx.cursorY;
  ctx.page.drawLine({
    start: { x: MARGIN_X, y: yy },
    end: { x: CONTENT_RIGHT, y: yy },
    thickness: 0.5,
    color: COLORS.border,
  });
}

function drawHeader(ctx: PdfCtx, title: string, subtitle: string): void {
  // Bandeau or fin en haut
  ctx.page.drawRectangle({
    x: 0,
    y: PAGE_HEIGHT - 8,
    width: PAGE_WIDTH,
    height: 8,
    color: COLORS.gold,
  });
  drawText(ctx, "Cryptoreflex", { y: PAGE_HEIGHT - 30, size: 9, color: COLORS.muted });
  drawText(ctx, title, { y: PAGE_HEIGHT - 55, size: 18, bold: true });
  drawText(ctx, subtitle, { y: PAGE_HEIGHT - 72, size: 10, color: COLORS.muted });
  drawHr(ctx, PAGE_HEIGHT - 82);
  ctx.cursorY = PAGE_HEIGHT - 100;
}

function drawFooter(ctx: PdfCtx, page: PDFPage, pageNum: number, total: number): void {
  page.drawLine({
    start: { x: MARGIN_X, y: 38 },
    end: { x: CONTENT_RIGHT, y: 38 },
    thickness: 0.4,
    color: COLORS.border,
  });
  page.drawText(
    sanitize(
      "Document généré automatiquement par Cryptoreflex à titre informatif – à vérifier avant dépôt.",
    ),
    { x: MARGIN_X, y: 24, size: 7.5, font: ctx.font, color: COLORS.muted },
  );
  page.drawText(`Page ${pageNum} / ${total}`, {
    x: CONTENT_RIGHT - 50,
    y: 24,
    size: 7.5,
    font: ctx.font,
    color: COLORS.muted,
  });
}

function drawTitle(ctx: PdfCtx, text: string): void {
  ensureSpace(ctx, 30);
  drawText(ctx, text, { size: 13, bold: true });
  ctx.cursorY -= 6;
  drawHr(ctx, ctx.cursorY);
  ctx.cursorY -= 14;
}

function drawKeyValue(ctx: PdfCtx, key: string, value: string, opts?: { highlight?: RGB }): void {
  ensureSpace(ctx, 18);
  drawText(ctx, key, { x: MARGIN_X, size: 10, color: COLORS.muted });
  drawText(ctx, value, {
    x: MARGIN_X + 280,
    size: 10,
    bold: true,
    color: opts?.highlight ?? COLORS.ink,
  });
  ctx.cursorY -= 16;
}

/** Paragraphe (wrap) en petite taille. */
function drawParagraph(
  ctx: PdfCtx,
  text: string,
  opts: { size?: number; color?: RGB; bullet?: string; x?: number; width?: number } = {},
): void {
  const size = opts.size ?? 8.5;
  const x = opts.x ?? MARGIN_X;
  const width = opts.width ?? CONTENT_RIGHT - x;
  const bullet = opts.bullet ?? "";
  const lines = wrapTextWidth(ctx.font, sanitize(text), size, width - (bullet ? 10 : 0));
  for (let i = 0; i < lines.length; i++) {
    ensureSpace(ctx, size + 3);
    if (i === 0 && bullet) drawText(ctx, bullet, { x, size, color: opts.color });
    drawText(ctx, lines[i], { x: x + (bullet ? 10 : 0), size, color: opts.color });
    ctx.cursorY -= size + 2.5;
  }
}

const A_COMPLETER = "À COMPLÉTER";

function eurOrNull(v: number | null): string {
  return v === null ? A_COMPLETER : formatEur(v);
}

/**
 * Tableau de synthèse des cessions.
 * Colonnes : Date | Actif | 212 Valeur globale | 213 Prix cession | 224 +/- value
 */
function drawCessionsTable(ctx: PdfCtx, cessions: CerfaCession[]): void {
  const X_DATE = MARGIN_X;
  const X_ASSET = MARGIN_X + 62;
  const R_212 = MARGIN_X + 230;
  const R_213 = MARGIN_X + 350;
  const R_224 = CONTENT_RIGHT;
  const ROW_H = 15;
  const HEADER_H = 18;
  const SIZE = 8.5;

  const drawTableHeader = (): void => {
    ctx.page.drawRectangle({
      x: MARGIN_X - 2,
      y: ctx.cursorY - 4,
      width: PAGE_WIDTH - 2 * MARGIN_X + 4,
      height: HEADER_H,
      color: rgb(0.95, 0.95, 0.96),
    });
    const y = ctx.cursorY + 2;
    drawText(ctx, "Date (211)", { x: X_DATE, y, size: SIZE, bold: true });
    drawText(ctx, "Actif", { x: X_ASSET, y, size: SIZE, bold: true });
    drawTextRight(ctx, "212 Valeur globale", R_212, { y, size: SIZE, bold: true });
    drawTextRight(ctx, "213 Prix de cession", R_213, { y, size: SIZE, bold: true });
    drawTextRight(ctx, "224 Plus/moins-value", R_224, { y, size: SIZE, bold: true });
    ctx.cursorY -= HEADER_H;
  };

  drawTableHeader();

  for (const c of cessions) {
    if (ctx.cursorY - ROW_H < MARGIN_BOTTOM + 20) {
      addPage(ctx);
      drawTableHeader();
    }
    const y = ctx.cursorY;
    const incomplete = c.statut !== "calculee";
    drawText(ctx, fmtDate(c.date), { x: X_DATE, y, size: SIZE });
    drawText(ctx, c.asset, { x: X_ASSET, y, size: SIZE });
    drawTextRight(ctx, eurOrNull(c.valeurGlobaleEur), R_212, {
      y,
      size: SIZE,
      color: c.valeurGlobaleEur === null ? COLORS.warning : COLORS.ink,
    });
    drawTextRight(ctx, formatEur(c.prixCessionEur), R_213, { y, size: SIZE });
    drawTextRight(ctx, incomplete ? A_COMPLETER : formatEur(c.plusValueEur ?? 0), R_224, {
      y,
      size: SIZE,
      bold: true,
      color: incomplete ? COLORS.warning : c.deficit ? COLORS.danger : COLORS.success,
    });
    ctx.cursorY -= ROW_H;
  }
  ctx.cursorY -= 6;
}

/**
 * Bloc détaillé d'une cession : toutes les lignes du formulaire 2086 (211 à 224)
 * sur deux colonnes, puis le détail de la ligne 212 et les alertes.
 */
function drawCessionBlock(ctx: PdfCtx, c: CerfaCession, n: number): void {
  const SIZE = 8.5;
  const LINE_H = 11.5;
  const COL_L_X = MARGIN_X;
  const COL_L_R = MARGIN_X + 245; // bord droit des valeurs colonne gauche
  const COL_R_X = MARGIN_X + 262;
  const COL_R_R = CONTENT_RIGHT;

  const incomplete = c.statut !== "calculee";
  const sourceLabel =
    c.valeurGlobaleSource === "saisie"
      ? "valeur saisie"
      : c.valeurGlobaleSource === "calculee"
        ? "calculée au jour de la cession"
        : A_COMPLETER;

  const left: Array<[string, string]> = [
    ["211 Date de la cession", fmtDate(c.date)],
    ["212 Valeur globale du portefeuille", eurOrNull(c.valeurGlobaleEur)],
    ["213 Prix de cession", formatEur(c.prixCessionEur)],
    ["214 Frais de cession", formatEur(c.fraisCessionEur)],
    ["215 Prix net des frais (213 - 214)", formatEur(c.prixCessionNetEur)],
    ["217 Prix net des soultes (= 213)", formatEur(c.prixCessionEur)],
    ["218 Prix net des frais et soultes", formatEur(c.prixCessionNetEur)],
  ];
  const right: Array<[string, string]> = [
    ["220 Prix total d'acquisition", formatEur(c.prixTotalAcquisitionEur)],
    ["221 Fractions de capital initial", eurOrNull(c.fractionsAnterieuresEur)],
    ["222 Soultes reçues (non géré)", formatEur(0)],
    ["223 Prix total d'acq. net (220-221-222)", eurOrNull(c.prixAcquisitionNetEur)],
    ["    Fraction imputée = 223 × 217 / 212", eurOrNull(c.fractionCapitalInitialEur)],
    ["224 Plus-value ou moins-value", incomplete ? A_COMPLETER : formatEur(c.plusValueEur ?? 0)],
  ];

  const detail212 =
    c.valeurGlobaleSource === "calculee" && c.valorisation.length > 0
      ? "Détail ligne 212 : " +
        c.valorisation
          .map((v) => {
            const src =
              v.source === "prix_de_cession"
                ? "prix de la cession"
                : v.source === "transaction_meme_jour"
                  ? "transaction du même jour"
                  : v.source === "source_externe"
                    ? "source de prix externe"
                    : "prix manquant";
            return `${v.asset} ${fmtQty(v.quantite)} x ${v.prixUnitaireEur === null ? "?" : formatEur(v.prixUnitaireEur)} (${src})`;
          })
          .join(" ; ")
      : null;

  const detailLines = detail212
    ? wrapTextWidth(ctx.font, sanitize(detail212), 8, CONTENT_RIGHT - MARGIN_X)
    : [];
  const alertLines = c.alertes.flatMap((a) =>
    wrapTextWidth(ctx.font, sanitize(a), 8, CONTENT_RIGHT - MARGIN_X - 10),
  );
  const needed =
    16 + Math.max(left.length, right.length) * LINE_H + (detailLines.length + alertLines.length) * 10.5 + 14;
  ensureSpace(ctx, Math.min(needed, PAGE_HEIGHT - MARGIN_TOP - MARGIN_BOTTOM));

  // Titre du bloc
  drawText(ctx, `Cession ${n} - ${fmtDate(c.date)} - ${c.asset} (${fmtQty(c.quantity)})`, {
    size: 9.5,
    bold: true,
  });
  drawTextRight(ctx, incomplete ? A_COMPLETER : "Calculée", CONTENT_RIGHT, {
    size: 9,
    bold: true,
    color: incomplete ? COLORS.warning : COLORS.success,
  });
  ctx.cursorY -= 14;

  const startY = ctx.cursorY;
  // Colonne gauche
  let y = startY;
  for (const [label, value] of left) {
    const isValeurGlobale = label.startsWith("212");
    drawText(ctx, label, { x: COL_L_X, y, size: SIZE, color: COLORS.muted });
    drawTextRight(ctx, value, COL_L_R, {
      y,
      size: SIZE,
      bold: true,
      color: isValeurGlobale && c.valeurGlobaleEur === null ? COLORS.warning : COLORS.ink,
    });
    y -= LINE_H;
  }
  // Colonne droite
  y = startY;
  for (const [label, value] of right) {
    const is224 = label.startsWith("224");
    const isNull = value === A_COMPLETER;
    drawText(ctx, label, { x: COL_R_X, y, size: SIZE, color: COLORS.muted });
    drawTextRight(ctx, value, COL_R_R, {
      y,
      size: SIZE,
      bold: true,
      color: isNull
        ? COLORS.warning
        : is224
          ? c.deficit
            ? COLORS.danger
            : COLORS.success
          : COLORS.ink,
    });
    y -= LINE_H;
  }
  ctx.cursorY = startY - Math.max(left.length, right.length) * LINE_H;

  // Source de la ligne 212
  drawText(ctx, `Ligne 212 : ${sourceLabel}`, { size: 8, color: COLORS.muted });
  ctx.cursorY -= 10.5;
  for (const l of detailLines) {
    ensureSpace(ctx, 11);
    drawText(ctx, l, { size: 8, color: COLORS.muted });
    ctx.cursorY -= 10.5;
  }
  for (const a of c.alertes) {
    const lines = wrapTextWidth(ctx.font, sanitize(a), 8, CONTENT_RIGHT - MARGIN_X - 10);
    for (let i = 0; i < lines.length; i++) {
      ensureSpace(ctx, 11);
      if (i === 0) drawText(ctx, "!", { x: MARGIN_X, size: 8, bold: true, color: COLORS.warning });
      drawText(ctx, lines[i], { x: MARGIN_X + 10, size: 8, color: COLORS.warning });
      ctx.cursorY -= 10.5;
    }
  }
  ctx.cursorY -= 4;
  drawHr(ctx, ctx.cursorY);
  ctx.cursorY -= 12;
}

/** Génère un Cerfa 3916-bis simplifié (1 page par exchange étranger). */
/** Entité légale, pays du siège et autorité d'une plateforme connue (data/psan-registry.json), pour pré-remplir la fiche 3916-bis. */
function exchangeEntity(name: string): { legalEntity: string; headquarters: string; jurisdiction: string; verified: string } | null {
  const n = name.trim().toLowerCase();
  if (!n) return null;
  type Row = { id?: string; name?: string; aliases?: string[]; legalEntity?: string; headquarters?: string; micaJurisdiction?: string; lastVerified?: string };
  const list = (PSAN_REGISTRY as { platforms: Row[] }).platforms;
  const hit = list.find((r) => [r.id, r.name, ...(r.aliases ?? [])].filter(Boolean).some((a) => String(a).toLowerCase() === n));
  if (!hit || !hit.legalEntity) return null;
  return { legalEntity: hit.legalEntity, headquarters: hit.headquarters ?? "", jurisdiction: hit.micaJurisdiction ?? "", verified: hit.lastVerified ?? "" };
}

/* Ligne vide à compléter à la main (jamais de texte fictif imprimé dans une case : audit 03/10/2026, remarque de Kev). */
const BLANK = "______________________________";

function draw3916Bis(ctx: PdfCtx, exchange: string, summary: CerfaSummary): void {
  addPage(ctx);
  drawHeader(
    ctx,
    `Préparation du 3916-bis – ${exchange}`,
    `Compte d'actifs numériques ouvert à l'étranger – Année ${summary.taxYear}`,
  );
  drawParagraph(
    ctx,
    "Cette fiche ne se dépose pas : elle rassemble ce que vous recopierez dans l'annexe 3916-bis de votre déclaration en ligne sur impots.gouv.fr (un formulaire par compte). Les lignes vides se complètent à la main ; numéro de compte et dates figurent dans l'espace client de la plateforme.",
    { size: 9, color: COLORS.muted },
  );
  ctx.cursorY -= 8;

  drawTitle(ctx, "1. Identification du déclarant");
  drawKeyValue(ctx, "Nom et prénom", summary.taxpayerName ?? BLANK);
  drawKeyValue(ctx, "Année fiscale", String(summary.taxYear));
  ctx.cursorY -= 8;

  const ent = exchangeEntity(exchange);
  drawTitle(ctx, "2. Identification du compte");
  drawKeyValue(ctx, "Désignation du compte", exchange);
  drawKeyValue(ctx, "Type de compte", "Compte d'actifs numériques");
  drawKeyValue(ctx, "Organisme gestionnaire (entité)", ent ? ent.legalEntity : BLANK);
  drawKeyValue(ctx, "Pays du siège", ent && ent.headquarters ? ent.headquarters : BLANK);
  if (ent && ent.jurisdiction) drawKeyValue(ctx, "Autorité de contrôle", ent.jurisdiction);
  drawKeyValue(ctx, "Adresse complète de l'organisme", BLANK);
  drawKeyValue(ctx, "Numéro de compte (ou identifiant client)", BLANK);
  drawKeyValue(ctx, "Date d'ouverture", BLANK);
  drawKeyValue(ctx, "Date de clôture (le cas échéant)", BLANK);
  if (ent) {
    ctx.cursorY -= 4;
    drawParagraph(
      ctx,
      `Entité et pays pré-remplis d'après notre registre des plateformes${ent.verified ? ` (vérifié le ${ent.verified.split("-").reverse().join("/")})` : ""} : contrôlez-les dans vos conditions générales ou votre espace client, l'entité peut différer selon la date d'ouverture du compte.`,
      { size: 8.5, color: COLORS.muted },
    );
  }
  ctx.cursorY -= 8;

  drawTitle(ctx, "3. Caractéristiques");
  drawText(ctx, "Compte ouvert ou clos durant l'année : [ ] Oui [ ] Non", { size: 10 });
  ctx.cursorY -= 14;
  drawText(ctx, "Compte détenu par l'intermédiaire d'un mandataire : [ ] Oui [ ] Non", {
    size: 10,
  });
  ctx.cursorY -= 18;

  drawText(
    ctx,
    "Rappel : l'omission de déclaration d'un compte étranger est sanctionnée par",
    { size: 9, color: COLORS.warning },
  );
  ctx.cursorY -= 12;
  drawText(
    ctx,
    "une amende de 750 EUR par compte (1500 EUR si valeur > 50 000 EUR). Art. 1736 X CGI.",
    { size: 9, color: COLORS.warning },
  );
}

/**
 * Génère le PDF complet (récap 2086 + annexes 3916-bis si exchanges étrangers).
 */
export async function generateCerfaPdf(
  cessions: CerfaCession[],
  summary: CerfaSummary,
): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  pdf.setTitle(`Cerfa 2086 ${summary.taxYear} - Cryptoreflex`);
  pdf.setAuthor("Cryptoreflex");
  pdf.setSubject("Récapitulatif fiscal crypto année " + summary.taxYear);
  pdf.setProducer("Cryptoreflex - cryptoreflex.fr");

  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const ctx = createCtx(pdf, font, fontBold);

  /* ---------------- Page 1 — Couverture / Synthèse ---------------- */
  drawHeader(
    ctx,
    `Annexe Cerfa 2086 - Cessions crypto ${summary.taxYear}`,
    "Calcul selon l'article 150 VH bis du CGI (formulaire 2086, l. 211 à 224) – à vérifier avant dépôt",
  );

  // Disclaimer YMYL haut de page
  ctx.page.drawRectangle({
    x: MARGIN_X - 4,
    y: ctx.cursorY - 48,
    width: PAGE_WIDTH - 2 * MARGIN_X + 8,
    height: 52,
    color: rgb(1, 0.96, 0.88),
    borderColor: COLORS.gold,
    borderWidth: 0.6,
  });
  drawText(ctx, "AVERTISSEMENT", {
    y: ctx.cursorY - 8,
    size: 9,
    bold: true,
    color: COLORS.warning,
  });
  drawText(
    ctx,
    "Document généré automatiquement, à titre informatif, à partir des seules données importées.",
    { y: ctx.cursorY - 21, size: 8.5, color: COLORS.ink },
  );
  drawText(
    ctx,
    "Ce n'est pas le formulaire officiel. Vérifiez chaque ligne et faites valider par un professionnel",
    { y: ctx.cursorY - 32, size: 8.5, color: COLORS.ink },
  );
  drawText(ctx, "avant tout dépôt sur impots.gouv.fr.", {
    y: ctx.cursorY - 43,
    size: 8.5,
    color: COLORS.ink,
  });
  ctx.cursorY -= 66;

  /* Mode d'emploi : à quoi sert ce document (demande de Kev, 03/10/2026) — le lecteur doit comprendre
     qu'il recopie, qu'il ne dépose rien, et où il recopie. Parcours = celui du tutoriel du site. */
  drawTitle(ctx, "À quoi sert ce document et comment l'utiliser");
  const modeEmploi = [
    "Ce PDF ne se dépose pas et ne se joint à rien : c'est votre feuille de route. Les chiffres sont calculés à partir des données que vous avez importées ; la déclaration elle-même se fait dans votre espace sur impots.gouv.fr (déclaration en ligne obligatoire, sauf exception).",
    "Sur impots.gouv.fr : cliquez sur « Déclarer mes revenus », cochez la rubrique « Plus-values et gains divers », continuez jusqu'à l'écran « Plus-values sur actifs numériques », puis ouvrez l'« Annexe 2086 ».",
    "Dans l'annexe 2086, recopiez pour chaque cession les lignes 211 à 224 indiquées ci-dessous (une colonne « Cession » par vente, 5 par page).",
    "Reportez le total des lignes 224 en case 3AN de la 2042-C (plus-value) ou 3BN (moins-value) ; cochez 3CN seulement si vous optez pour le barème progressif.",
    "Chaque compte ouvert sur une plateforme étrangère = une annexe 3916-bis à remplir en ligne : les fiches de préparation jointes (une par compte) rassemblent les informations à recopier.",
    "Conservez ce PDF et vos exports : ils justifient chaque montant si l'administration vous le demande.",
  ];
  modeEmploi.forEach((t, i) => {
    drawParagraph(ctx, t, { size: 8.5, color: COLORS.ink, bullet: `${i + 1}.` });
    ctx.cursorY -= 2;
  });
  ctx.cursorY -= 8;

  if (summary.calculIncomplet) {
    ctx.page.drawRectangle({
      x: MARGIN_X - 4,
      y: ctx.cursorY - 38,
      width: PAGE_WIDTH - 2 * MARGIN_X + 8,
      height: 42,
      color: rgb(1, 0.93, 0.92),
      borderColor: COLORS.danger,
      borderWidth: 0.6,
    });
    drawText(ctx, `CALCUL INCOMPLET – ${summary.nbCessionsACompleter} cession(s) À COMPLÉTER`, {
      y: ctx.cursorY - 10,
      size: 9.5,
      bold: true,
      color: COLORS.danger,
    });
    drawText(
      ctx,
      "La valeur globale du portefeuille (l. 212) ou une donnée manque : la plus-value de ces cessions n'est pas",
      { y: ctx.cursorY - 22, size: 8.5, color: COLORS.ink },
    );
    drawText(
      ctx,
      "calculée et les totaux ci-dessous sont PARTIELS. Voir le détail de chaque cession.",
      { y: ctx.cursorY - 32, size: 8.5, color: COLORS.ink },
    );
    ctx.cursorY -= 56;
  }

  drawTitle(ctx, "Identification du contribuable");
  drawKeyValue(ctx, "Nom / Prénom", summary.taxpayerName ?? BLANK);
  drawKeyValue(ctx, "Année fiscale", String(summary.taxYear));
  drawKeyValue(
    ctx,
    "Date de génération",
    new Date().toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" }),
  );
  ctx.cursorY -= 6;

  drawTitle(ctx, "Synthèse des cessions imposables");
  const partiel = summary.calculIncomplet ? " (PARTIEL)" : "";
  drawKeyValue(ctx, "Nombre de cessions", String(summary.nbCessions));
  if (summary.calculIncomplet) {
    drawKeyValue(ctx, "  dont calculées", String(summary.nbCessionsCalculees));
    drawKeyValue(ctx, "  dont à compléter", String(summary.nbCessionsACompleter), {
      highlight: COLORS.warning,
    });
  }
  drawKeyValue(ctx, "Total des prix de cession (l. 213)", formatEur(summary.totalCessionsEur));
  drawKeyValue(ctx, "Total des frais de cession (l. 214)", formatEur(summary.totalFraisCessionEur));
  drawKeyValue(
    ctx,
    "Total net de frais (l. 218, seuil 305 EUR)",
    formatEur(summary.totalCessionsNetEur),
  );
  drawKeyValue(ctx, "Plus-values (l. 224 positives)" + partiel, formatEur(summary.totalPlusValuesEur));
  drawKeyValue(ctx, "Moins-values (l. 224 négatives)" + partiel, formatEur(summary.totalMoinsValuesEur));
  drawKeyValue(
    ctx,
    "Plus-value nette" + partiel,
    summary.calculIncomplet ? A_COMPLETER : formatEur(summary.plusValueNetteEur),
    {
      highlight: summary.calculIncomplet
        ? COLORS.warning
        : summary.plusValueNetteEur >= 0
          ? COLORS.success
          : COLORS.danger,
    },
  );
  if (summary.exonere) {
    drawKeyValue(
      ctx,
      "Exonération (art. 150 VH bis II)",
      `Oui : total des prix de cession nets de frais (l. 218) <= ${SEUIL_EXONERATION_EUR} EUR`,
      { highlight: COLORS.success },
    );
  }
  drawKeyValue(
    ctx,
    "Impôt PFU 31,4 % estimé",
    summary.calculIncomplet ? A_COMPLETER : formatEur(summary.impotPfuEur),
    { highlight: summary.calculIncomplet ? COLORS.warning : COLORS.gold },
  );
  drawKeyValue(
    ctx,
    "Net après impôt estimé",
    summary.calculIncomplet ? A_COMPLETER : formatEur(summary.netApresImpotEur),
    summary.calculIncomplet ? { highlight: COLORS.warning } : undefined,
  );
  ctx.cursorY -= 12;

  /* ---------------- Tableau des cessions ---------------- */
  if (cessions.length > 0) {
    drawTitle(ctx, "Cessions de l'année (synthèse)");
    if (cessions.length > 5) {
      drawParagraph(
        ctx,
        `Note : ${cessions.length} cessions. Le formulaire 2086 officiel compte 5 cessions par page (colonnes Cession 1 à 5) ; plusieurs pages seront nécessaires.`,
        { size: 8.5, color: COLORS.muted },
      );
      ctx.cursorY -= 4;
    }
    drawCessionsTable(ctx, cessions);

    /* ---------------- Détail ligne par ligne ---------------- */
    drawTitle(ctx, "Détail par cession – lignes 211 à 224 du formulaire 2086");
    drawParagraph(
      ctx,
      "Formule du formulaire : l. 224 = l. 218 - [ l. 223 x ( l. 217 / l. 212 ) ]. Les frais de cession (l. 214) ne sont déduits que du premier terme, pas du quotient (BOI-RPPM-PVBMC-30-20 § 50).",
      { size: 8.5, color: COLORS.muted },
    );
    ctx.cursorY -= 6;
    cessions.forEach((c, i) => drawCessionBlock(ctx, c, i + 1));
  } else {
    drawText(
      ctx,
      "Aucune cession imposable détectée pour l'année " + summary.taxYear + ".",
      { size: 11, color: COLORS.muted },
    );
    ctx.cursorY -= 18;
  }

  /* ---------------- Avertissements ---------------- */
  if (summary.avertissements.length > 0) {
    ensureSpace(ctx, 60);
    drawTitle(ctx, "Avertissements");
    for (const a of summary.avertissements) {
      drawParagraph(ctx, a, { size: 8.5, color: COLORS.warning, bullet: "!" });
      ctx.cursorY -= 3;
    }
    ctx.cursorY -= 10;
  }

  /* ---------------- Comptes etrangers (3916-bis) ---------------- */
  if (summary.foreignExchanges.length > 0) {
    ensureSpace(ctx, 60);
    drawTitle(ctx, "Comptes détenus à l'étranger (3916-bis)");
    drawText(
      ctx,
      `${summary.foreignExchanges.length} compte(s) étranger(s) détecté(s) :`,
      { size: 10 },
    );
    ctx.cursorY -= 14;
    for (const ex of summary.foreignExchanges) {
      drawText(ctx, "- " + ex, { size: 10, x: MARGIN_X + 12 });
      ctx.cursorY -= 13;
    }
    ctx.cursorY -= 6;
    drawText(
      ctx,
      "Une fiche de préparation 3916-bis suit pour chaque compte ci-dessus : à recopier dans votre déclaration en ligne, un formulaire par compte.",
      { size: 9, color: COLORS.muted },
    );
    ctx.cursorY -= 24;
  }

  /* ---------------- Notes méthodologiques ---------------- */
  ensureSpace(ctx, 80);
  drawTitle(ctx, "Notes méthodologiques");
  const notes = [
    "Formule appliquée (art. 150 VH bis du CGI, formulaire 2086) : l. 224 = l. 218 - [l. 223 x (l. 217 / l. 212)]. Les frais de cession (l. 214) réduisent le prix de cession dans le premier terme uniquement, pas dans le quotient (BOI-RPPM-PVBMC-30-20 § 50).",
    "Prix total d'acquisition (l. 220) : somme des prix payés en euros pour TOUTES les cryptos du portefeuille avant la cession, toutes plateformes et toutes années confondues. La l. 221 cumule les fractions de capital initial déjà imputées aux cessions antérieures, y compris celles des années précédentes (§ 100 à 110). La l. 222 (soultes reçues) n'est pas gérée : 0.",
    "Valeur globale du portefeuille (l. 212) : valeur saisie (champ portfolioValueEur) ou, à défaut, calculée = quantités détenues × prix du jour de la cession (prix de la cession pour l'actif cédé ; prix d'une transaction du même jour, ou d'une source de prix externe, pour les autres actifs). Si un prix manque, la cession est marquée À COMPLÉTER : aucune valeur n'est estimée. Le portefeuille s'entend de l'ensemble des crypto-actifs du foyer fiscal, tous supports confondus (§ 140).",
    "Exonération : si la somme des prix de cession de l'année, nets de frais (l. 218, total de la l. 51 du formulaire), est inférieure ou égale à 305 EUR (art. 150 VH bis II). Moins-values : imputables uniquement sur les plus-values de même nature de la même année, non reportables.",
    "Non géré par cet outil : échanges crypto/crypto avec soulte (l. 216 et 222), paiements en crypto de biens ou services, frais d'acquisition (non ajoutés à la l. 220 – montant indiqué dans les avertissements), récompenses de staking/airdrop (hypothèse : valorisées à la réception). Vérifiez ces points avec un professionnel.",
    "Les montants sont calculés sans arrondi intermédiaire et arrondis au centime à l'affichage seulement.",
  ];
  for (const n of notes) {
    drawParagraph(ctx, n, { size: 8.5, color: COLORS.muted, bullet: "*" });
    ctx.cursorY -= 2;
  }

  /* ---------------- Annexes 3916-bis ---------------- */
  for (const ex of summary.foreignExchanges) {
    draw3916Bis(ctx, ex, summary);
  }

  // Footer pages
  const total = ctx.pages.length;
  for (let i = 0; i < total; i++) {
    drawFooter(ctx, ctx.pages[i], i + 1, total);
  }

  return await pdf.save();
}

/** Wrap selon la largeur réelle du texte (police + taille), en points. */
function wrapTextWidth(font: PDFFont, text: string, size: number, maxWidth: number): string[] {
  const words = text.split(/\s+/).filter((w) => w.length > 0);
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    const candidate = cur ? `${cur} ${w}` : w;
    if (font.widthOfTextAtSize(candidate, size) > maxWidth && cur) {
      lines.push(cur);
      cur = w;
    } else {
      cur = candidate;
    }
  }
  if (cur) lines.push(cur);
  return lines;
}

/* -------------------------------------------------------------------------- */
/*  Pipeline complet (pour la route API)                                      */
/* -------------------------------------------------------------------------- */

export async function generateFullCerfa(
  input: CerfaGenerateInput,
): Promise<CerfaGenerateResult> {
  const cessions = computeCessions(input.transactions, input.taxYear, input.options);
  const summary = buildSummary(
    cessions,
    input.transactions,
    input.taxYear,
    input.taxpayerName,
  );
  const pdfBytes = await generateCerfaPdf(cessions, summary);
  return { pdfBytes, summary, cessions };
}
