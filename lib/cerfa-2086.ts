/**
 * lib/cerfa-2086.ts
 * -----------------
 * Logique métier "Cerfa 2086 + 3916-bis pré-rempli" :
 *  - Parsing CSV multi-exchanges (Binance, Coinbase, Bitpanda) → transactions normalisées.
 *  - Calcul des cessions imposables selon l'article 150 VH bis du CGI
 *    (réutilise lib/tax-fr.ts pour la formule prorata portefeuille).
 *  - Génération PDF (récap propre type "annexe Cerfa") via pdf-lib.
 *
 * Note V1 (volontaire) : on génère un **document récapitulatif officiel-like**
 * — pas le PDF Cerfa officiel rempli case par case. Raison :
 *   - le template PDF officiel d'impots.gouv.fr est régulièrement mis à jour
 *     et exposerait la stack à un breaking change non versionné ;
 *   - un récap propre (avec mêmes champs : prix global portefeuille, prix
 *     d'acquisition, valeur cession, plus/moins-value) est suffisant pour
 *     accompagner une déclaration manuelle ou un import dans Waltio.
 * V2 prévoira la fusion avec le template officiel (champs PDF AcroForm).
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
import {
  calculatePlusValue,
  calculateFlatTax,
  formatEur,
  SEUIL_EXONERATION_EUR,
} from "@/lib/tax-fr";

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
  /** Frais en euros (non utilisés directement par 150 VH bis mais conservés). */
  fees: number;
  /**
   * Plateforme d'origine (libre, ex: "Binance", "Coinbase", "Bitpanda").
   * Sert à générer un 3916-bis par exchange étranger détecté.
   */
  exchange?: string;
}

export interface CerfaCession {
  /** Date de la cession (ISO). */
  date: string;
  /** Symbole cédé (informatif — Cerfa 2086 ne le demande pas). */
  asset: string;
  /** Prix de cession en euros. */
  prixCessionEur: number;
  /** Valeur globale du portefeuille au moment de la cession (€). */
  valeurPortefeuilleEur: number;
  /** Cumul des prix d'acquisition de tout le portefeuille avant cette cession (€). */
  acquisitionsTotalesEur: number;
  /** Prix d'acquisition imputable à la cession (formule 150 VH bis). */
  prixAcquisitionImputeEur: number;
  /** Plus-value ou moins-value (€). */
  plusValueEur: number;
  /** Vrai si le résultat est négatif. */
  deficit: boolean;
}

export interface CerfaSummary {
  /** Année d'imposition. */
  taxYear: number;
  /** Nombre de cessions détectées (= nombre de lignes du Cerfa 2086). */
  nbCessions: number;
  /** Cumul des prix de cession (€). */
  totalCessionsEur: number;
  /** Total des plus-values (€, somme des positives). */
  totalPlusValuesEur: number;
  /** Total des moins-values (€, somme des négatives, valeur absolue). */
  totalMoinsValuesEur: number;
  /** Plus-value nette (= plus-values - moins-values) imposable. */
  plusValueNetteEur: number;
  /** Vrai si total cessions ≤ 305 € (exonération). */
  exonere: boolean;
  /** Impôt PFU 30 % estimé (0 si exonéré ou déficit). */
  impotPfuEur: number;
  /** Net après impôt (plusValueNette - impotPfu). */
  netApresImpotEur: number;
  /** Nom du contribuable affiché en haut du PDF (optionnel). */
  taxpayerName?: string;
  /** Liste des exchanges étrangers détectés (pour 3916-bis). */
  foreignExchanges: string[];
}

export interface CerfaGenerateInput {
  transactions: CerfaTransaction[];
  taxYear: number;
  taxpayerName?: string;
}

export interface CerfaGenerateResult {
  pdfBytes: Uint8Array;
  summary: CerfaSummary;
  cessions: CerfaCession[];
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

    transactions.push({ date, type, asset, quantity, priceEur, fees: safeFees, exchange });
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
 * Parser CSV minimal (pas de support des champs entre quotes avec virgule
 * interne — suffit pour les exports stockés bruts par Binance/Coinbase/Bitpanda
 * qui n'utilisent pas de virgule dans les champs critiques pour notre usage).
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
/*  Calcul des cessions selon 150 VH bis (lib/tax-fr)                          */
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
  "bitpanda france", // Bitpanda BG entity FR
  "paymium",
]);

function isForeignExchange(name: string | undefined): boolean {
  if (!name) return false;
  const n = name.trim().toLowerCase();
  return !KNOWN_FR_EXCHANGES.has(n);
}

/**
 * Construit la liste des cessions imposables à partir des transactions :
 *
 * Algorithme (simplifié pour V1) :
 *  - On filtre les transactions de l'année fiscale demandée + de type "sell"
 *    (les "swap" ne sont PAS imposables — neutralité crypto-crypto art. 150 VH bis).
 *  - Pour chaque "sell" :
 *      - acquisitionsTotales = somme(buy.quantity × buy.priceEur) jusqu'à la cession
 *      - valeurPortefeuille = somme(holdings × prix moyen actuel) au moment T
 *        Approximation V1 : on utilise le dernier prix connu par asset.
 *      - prix_cession = sell.quantity × sell.priceEur
 *      - applique calculatePlusValue(...)
 *
 * Limites V1 (acceptables — disclaimer dans le PDF) :
 *  - Pas de FIFO/LIFO strict (la formule 150 VH bis n'en a pas besoin :
 *    elle utilise la VALEUR GLOBALE du portefeuille, pas un lot identifié).
 *  - L'estimation de "valeur globale du portefeuille" au moment de la cession
 *    repose sur le prix de la cession elle-même pour l'asset cédé + le dernier
 *    prix connu pour les autres. Si un asset n'a jamais eu de prix renseigné,
 *    il est ignoré (sa valeur est 0).
 */
export function computeCessions(
  transactions: CerfaTransaction[],
  taxYear: number,
): CerfaCession[] {
  // Tri chronologique pour cumuler les acquisitions correctement
  const sorted = [...transactions].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
  );

  // État cumulé : par asset → quantity, totalEurAcquis
  const holdings = new Map<string, { qty: number; totalAcquisEur: number }>();
  // Dernier prix connu par asset (pour estimer la valeur du portefeuille)
  const lastPriceByAsset = new Map<string, number>();

  const cessions: CerfaCession[] = [];

  for (const tx of sorted) {
    const year = new Date(tx.date).getUTCFullYear();
    if (Number.isFinite(tx.priceEur) && tx.priceEur > 0) {
      lastPriceByAsset.set(tx.asset, tx.priceEur);
    }

    if (tx.type === "buy" || tx.type === "reward") {
      const cur = holdings.get(tx.asset) ?? { qty: 0, totalAcquisEur: 0 };
      cur.qty += tx.quantity;
      // Pour les rewards, prix d'acquisition = prix au moment de la réception
      cur.totalAcquisEur += tx.quantity * tx.priceEur;
      holdings.set(tx.asset, cur);
    } else if (tx.type === "sell") {
      // Calcul de la cession (uniquement si dans l'année fiscale demandée)
      const cur = holdings.get(tx.asset) ?? { qty: 0, totalAcquisEur: 0 };

      const prixCession = tx.quantity * tx.priceEur;

      // Valeur portefeuille au moment T = somme(qty × dernierPrix) pour tous les assets
      let valeurPortefeuille = 0;
      let acquisitionsTotales = 0;
      for (const [asset, h] of holdings.entries()) {
        const p = lastPriceByAsset.get(asset) ?? 0;
        valeurPortefeuille += h.qty * p;
        acquisitionsTotales += h.totalAcquisEur;
      }
      // Garde-fou : la valeur du portefeuille doit au moins inclure cette cession
      if (valeurPortefeuille < prixCession) {
        valeurPortefeuille = prixCession;
      }

      if (year === taxYear && prixCession > 0) {
        const r = calculatePlusValue({
          montantVente: prixCession,
          acquisitionsTotales,
          valeurPortefeuille,
          // totalCessionsAnnee est appliqué globalement après — ici on
          // calcule la plus-value brute par cession.
          totalCessionsAnnee: prixCession + 1, // évite l'exonération auto par cession
        });
        cessions.push({
          date: tx.date,
          asset: tx.asset,
          prixCessionEur: prixCession,
          valeurPortefeuilleEur: valeurPortefeuille,
          acquisitionsTotalesEur: acquisitionsTotales,
          prixAcquisitionImputeEur: r.prixAcquisitionImpute,
          plusValueEur: r.plusValue,
          deficit: r.deficit,
        });
      }

      // Mise à jour du portefeuille post-cession (au prorata)
      if (cur.qty > 0) {
        const ratio = Math.min(1, tx.quantity / cur.qty);
        cur.totalAcquisEur = cur.totalAcquisEur * (1 - ratio);
        cur.qty = Math.max(0, cur.qty - tx.quantity);
        holdings.set(tx.asset, cur);
      }
    } else if (tx.type === "transfer" || tx.type === "fee" || tx.type === "swap") {
      // Neutres fiscalement (swap = crypto/crypto, transfer = mouvement interne,
      // fee = frais). On ne touche pas aux cumuls — sauf les fees qu'on ne
      // déduit pas du prix de cession en V1 (acceptable, conservateur).
    }
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
  const totalCessions = cessions.reduce((s, c) => s + c.prixCessionEur, 0);
  const totalPV = cessions.reduce((s, c) => s + Math.max(0, c.plusValueEur), 0);
  const totalMV = cessions.reduce((s, c) => s + Math.min(0, c.plusValueEur), 0); // négatif
  const plusValueNette = totalPV + totalMV; // les MV sont déjà négatives

  const exonere = totalCessions <= SEUIL_EXONERATION_EUR;
  const baseImposable = exonere ? 0 : Math.max(0, plusValueNette);
  const flat = calculateFlatTax(baseImposable);
  const impot = flat.totalFlatTax;

  // Détection des exchanges étrangers (3916-bis automatique)
  const foreignExchanges = Array.from(
    new Set(
      transactions
        .map((t) => t.exchange)
        .filter((e): e is string => Boolean(e) && isForeignExchange(e)),
    ),
  ).sort();

  return {
    taxYear,
    nbCessions: cessions.length,
    totalCessionsEur: totalCessions,
    totalPlusValuesEur: totalPV,
    totalMoinsValuesEur: Math.abs(totalMV),
    plusValueNetteEur: plusValueNette,
    exonere,
    impotPfuEur: impot,
    netApresImpotEur: plusValueNette - impot,
    taxpayerName,
    foreignExchanges,
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
  success: rgb(0.12, 0.55, 0.30),
  danger: rgb(0.78, 0.20, 0.18),
} satisfies Record<string, RGB>;

const PAGE_WIDTH = 595.28; // A4 portrait
const PAGE_HEIGHT = 841.89;
const MARGIN_X = 50;
const MARGIN_TOP = 50;
const MARGIN_BOTTOM = 60;

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

/**
 * pdf-lib StandardFonts (Helvetica) ne gère pas tous les glyphes Unicode
 * (en particulier €, ' courbe, etc.). On normalise vers ASCII étendu Latin-1
 * pour éviter "WinAnsi cannot encode".
 */
function sanitize(text: string): string {
  return text
    .replace(/€/g, "EUR")
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/—/g, "-")
    .replace(/–/g, "-")
    .replace(/…/g, "...")
    .replace(/ /g, " ");
}

function drawHr(ctx: PdfCtx, y?: number): void {
  const yy = y ?? ctx.cursorY;
  ctx.page.drawLine({
    start: { x: MARGIN_X, y: yy },
    end: { x: PAGE_WIDTH - MARGIN_X, y: yy },
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
    end: { x: PAGE_WIDTH - MARGIN_X, y: 38 },
    thickness: 0.4,
    color: COLORS.border,
  });
  page.drawText(
    sanitize(
      "Document genere automatiquement par Cryptoreflex a titre informatif. " +
        "Verification par un professionnel recommandee.",
    ),
    { x: MARGIN_X, y: 24, size: 7.5, font: ctx.font, color: COLORS.muted },
  );
  page.drawText(`Page ${pageNum} / ${total}`, {
    x: PAGE_WIDTH - MARGIN_X - 50,
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

/**
 * Tableau des cessions (style Cerfa 2086).
 * Colonnes : Date | Actif | Prix cession | Px acquisition impute | Plus-value
 */
function drawCessionsTable(ctx: PdfCtx, cessions: CerfaCession[]): void {
  const colX = [MARGIN_X, MARGIN_X + 80, MARGIN_X + 160, MARGIN_X + 270, MARGIN_X + 400];
  const headers = ["Date", "Actif", "Prix cession", "Px acq. impute", "Plus/Moins-value"];
  const ROW_H = 16;
  const HEADER_H = 18;

  const drawTableHeader = (): void => {
    ctx.page.drawRectangle({
      x: MARGIN_X - 2,
      y: ctx.cursorY - 4,
      width: PAGE_WIDTH - 2 * MARGIN_X + 4,
      height: HEADER_H,
      color: rgb(0.95, 0.95, 0.96),
    });
    for (let i = 0; i < headers.length; i++) {
      drawText(ctx, headers[i], {
        x: colX[i],
        y: ctx.cursorY + 2,
        size: 9,
        bold: true,
      });
    }
    ctx.cursorY -= HEADER_H;
  };

  drawTableHeader();

  for (const c of cessions) {
    if (ctx.cursorY - ROW_H < MARGIN_BOTTOM + 20) {
      addPage(ctx);
      drawTableHeader();
    }
    const isLoss = c.plusValueEur < 0;
    const dateShort = (c.date ?? "").slice(0, 10);
    drawText(ctx, dateShort, { x: colX[0], y: ctx.cursorY, size: 9 });
    drawText(ctx, c.asset, { x: colX[1], y: ctx.cursorY, size: 9 });
    drawText(ctx, formatEur(c.prixCessionEur), { x: colX[2], y: ctx.cursorY, size: 9 });
    drawText(ctx, formatEur(c.prixAcquisitionImputeEur), {
      x: colX[3],
      y: ctx.cursorY,
      size: 9,
    });
    drawText(ctx, formatEur(c.plusValueEur), {
      x: colX[4],
      y: ctx.cursorY,
      size: 9,
      bold: true,
      color: isLoss ? COLORS.danger : COLORS.success,
    });
    ctx.cursorY -= ROW_H;
  }
  ctx.cursorY -= 6;
}

/** Génère un Cerfa 3916-bis simplifié (1 page par exchange étranger). */
function draw3916Bis(ctx: PdfCtx, exchange: string, summary: CerfaSummary): void {
  addPage(ctx);
  drawHeader(
    ctx,
    `Annexe 3916-bis - ${exchange}`,
    `Declaration d'un compte d'actifs numeriques ouvert a l'etranger - Annee ${summary.taxYear}`,
  );

  drawTitle(ctx, "1. Identification du declarant");
  drawKeyValue(ctx, "Nom du declarant", summary.taxpayerName ?? "[A completer]");
  drawKeyValue(ctx, "Annee fiscale", String(summary.taxYear));
  ctx.cursorY -= 8;

  drawTitle(ctx, "2. Identification du compte");
  drawKeyValue(ctx, "Designation du compte", exchange);
  drawKeyValue(ctx, "Type de compte", "Compte d'actifs numeriques");
  drawKeyValue(ctx, "Adresse de l'organisme gestionnaire", "[A completer manuellement]");
  drawKeyValue(ctx, "Numero de compte", "[A completer manuellement]");
  drawKeyValue(ctx, "Date d'ouverture", "[A completer manuellement]");
  drawKeyValue(ctx, "Date de cloture (le cas echeant)", "—");
  ctx.cursorY -= 8;

  drawTitle(ctx, "3. Caracteristiques");
  drawText(ctx, "Compte ouvert ou clos durant l'annee : [ ] Oui [ ] Non", { size: 10 });
  ctx.cursorY -= 14;
  drawText(ctx, "Compte detenu par l'intermediaire d'un mandataire : [ ] Oui [ ] Non", {
    size: 10,
  });
  ctx.cursorY -= 18;

  drawText(
    ctx,
    "Rappel : l'omission de declaration d'un compte etranger est sanctionnee par",
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
  pdf.setSubject("Recapitulatif fiscal crypto annee " + summary.taxYear);
  pdf.setProducer("Cryptoreflex - cryptoreflex.fr");

  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const ctx = createCtx(pdf, font, fontBold);

  /* ---------------- Page 1 — Couverture / Synthèse ---------------- */
  drawHeader(
    ctx,
    `Annexe Cerfa 2086 - Cessions crypto ${summary.taxYear}`,
    "Document recapitulatif - Article 150 VH bis du CGI",
  );

  // Disclaimer YMYL haut de page
  ctx.page.drawRectangle({
    x: MARGIN_X - 4,
    y: ctx.cursorY - 38,
    width: PAGE_WIDTH - 2 * MARGIN_X + 8,
    height: 42,
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
    "Document genere automatiquement a titre informatif. Verifiez chaque",
    { y: ctx.cursorY - 22, size: 8.5, color: COLORS.ink },
  );
  drawText(
    ctx,
    "ligne et faites valider par un professionnel avant tout depot officiel.",
    { y: ctx.cursorY - 32, size: 8.5, color: COLORS.ink },
  );
  ctx.cursorY -= 56;

  drawTitle(ctx, "Identification du contribuable");
  drawKeyValue(ctx, "Nom / Prenom", summary.taxpayerName ?? "[A completer manuellement]");
  drawKeyValue(ctx, "Annee fiscale", String(summary.taxYear));
  drawKeyValue(
    ctx,
    "Date de generation",
    new Date().toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" }),
  );
  ctx.cursorY -= 6;

  drawTitle(ctx, "Synthese des cessions imposables");
  drawKeyValue(ctx, "Nombre de cessions detectees", String(summary.nbCessions));
  drawKeyValue(ctx, "Total des cessions", formatEur(summary.totalCessionsEur));
  drawKeyValue(ctx, "Plus-values brutes (cessions)", formatEur(summary.totalPlusValuesEur));
  drawKeyValue(
    ctx,
    "Moins-values (cessions)",
    formatEur(summary.totalMoinsValuesEur),
  );
  drawKeyValue(
    ctx,
    "Plus-value nette imposable",
    formatEur(summary.plusValueNetteEur),
    { highlight: summary.plusValueNetteEur >= 0 ? COLORS.success : COLORS.danger },
  );
  if (summary.exonere) {
    drawKeyValue(
      ctx,
      "Exoneration",
      `Total cessions <= ${SEUIL_EXONERATION_EUR} EUR (art. 150 VH bis II)`,
      { highlight: COLORS.success },
    );
  }
  drawKeyValue(ctx, "Impot PFU 30 % estime", formatEur(summary.impotPfuEur), {
    highlight: COLORS.gold,
  });
  drawKeyValue(ctx, "Net apres impot estime", formatEur(summary.netApresImpotEur));
  ctx.cursorY -= 12;

  /* ---------------- Détail des cessions (tableau) ---------------- */
  if (cessions.length > 0) {
    drawTitle(ctx, "Detail des cessions (a reporter dans le 2086)");
    // Cerfa 2086 a 20 cases par feuillet : info utile pour l'utilisateur
    if (cessions.length > 20) {
      drawText(
        ctx,
        `Note : ${cessions.length} cessions detectees. Le formulaire 2086 officiel limite a 20 lignes par feuillet ; plusieurs feuillets seront necessaires.`,
        { size: 9, color: COLORS.muted },
      );
      ctx.cursorY -= 16;
    }
    drawCessionsTable(ctx, cessions);
  } else {
    drawText(
      ctx,
      "Aucune cession imposable detectee pour l'annee " + summary.taxYear + ".",
      { size: 11, color: COLORS.muted },
    );
    ctx.cursorY -= 18;
  }

  /* ---------------- Comptes etrangers (3916-bis) ---------------- */
  if (summary.foreignExchanges.length > 0) {
    ensureSpace(ctx, 60);
    drawTitle(ctx, "Comptes detenus a l'etranger (3916-bis)");
    drawText(
      ctx,
      `${summary.foreignExchanges.length} compte(s) etranger(s) detecte(s) :`,
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
      "Une annexe 3916-bis est generee automatiquement pour chaque compte ci-dessus.",
      { size: 9, color: COLORS.muted },
    );
    ctx.cursorY -= 14;
  }

  /* ---------------- Notes méthodologiques ---------------- */
  ensureSpace(ctx, 80);
  drawTitle(ctx, "Notes methodologiques");
  const notes = [
    "Calcul realise selon la formule officielle 150 VH bis : prix d'acquisition impute = (acquisitions totales x prix de cession) / valeur du portefeuille.",
    "Les cessions crypto-crypto (swap) sont neutres fiscalement et ne sont pas comptabilisees.",
    "Les recompenses (staking, airdrop) sont integrees au prix d'acquisition au prix du jour de la reception.",
    "L'estimation de la valeur globale du portefeuille utilise les derniers prix EUR connus a partir des transactions importees.",
    "Cet outil ne se substitue pas a un expert-comptable ; verifiez les chiffres avant depot officiel.",
  ];
  for (const n of notes) {
    const lines = wrapText(n, 92);
    for (const l of lines) {
      ensureSpace(ctx, 12);
      drawText(ctx, "* " + l, { size: 8.5, color: COLORS.muted });
      ctx.cursorY -= 11;
    }
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

/** Wrap simple à largeur fixe (chars). */
function wrapText(text: string, width: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    if ((cur + " " + w).trim().length > width) {
      if (cur) lines.push(cur);
      cur = w;
    } else {
      cur = (cur + " " + w).trim();
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
  const cessions = computeCessions(input.transactions, input.taxYear);
  const summary = buildSummary(
    cessions,
    input.transactions,
    input.taxYear,
    input.taxpayerName,
  );
  const pdfBytes = await generateCerfaPdf(cessions, summary);
  return { pdfBytes, summary, cessions };
}
