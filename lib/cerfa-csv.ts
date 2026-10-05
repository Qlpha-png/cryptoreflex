/**
 * lib/cerfa-csv.ts — lecture du fichier importé dans le générateur Cerfa 2086 (côté navigateur, sans dépendance).
 *
 * Format lu : le modèle CSV de l'outil (public/modeles/cerfa-2086-modele.csv, ou sa version Excel en français
 * cerfa-2086-modele-excel.csv : date, type, asset, quantity, price_eur, fees, exchange, portfolio_value_eur) ou un
 * tableau JSON aux mêmes champs. Les exports bruts des plateformes ne sont PAS lus (colonnes différentes) ; l'export
 * de Waltio est un fichier Excel, pas ce JSON.
 *
 * Principe (revues du 05/10/2026) : AUCUNE lecture silencieuse d'une valeur douteuse. Une ligne au nombre de valeurs
 * incohérent (« 0,02 » non protégé dans un CSV à virgules), un montant ambigu (« 90.000 »), une valeur illisible ou
 * négative, un prix manquant sur un achat ou une vente : la ligne est signalée avec son numéro et le PDF reste bloqué
 * tant qu'elle n'est pas corrigée (une ligne écartée fausserait la ligne 220).
 * Les heures sont lues à l'heure de Paris (une vente du 31/12 à 23 h 30 reste en 2025, même sur un serveur en UTC).
 */
import type { CerfaTransaction, CerfaTxType } from "@/lib/cerfa-2086";

export const REQUIRED_HEADERS = ["date", "type", "asset", "quantity"] as const;

const SUPPORTED_TYPES = new Set<CerfaTxType>(["buy", "sell", "swap", "transfer", "fee", "reward"]);
/** Types acceptés en français (accents retirés avant comparaison). */
const TYPE_ALIASES: Record<string, CerfaTxType> = {
  achat: "buy",
  vente: "sell",
  echange: "swap",
  transfert: "transfer",
  frais: "fee",
  recompense: "reward",
};
/** Types pour lesquels un prix unitaire en euros est indispensable au calcul. */
const PRICE_REQUIRED = new Set<CerfaTxType>(["buy", "sell", "reward"]);

function stripAccents(s: string): string {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "");
}

function normType(v: unknown): CerfaTxType | null {
  const t = stripAccents(String(v ?? "")).trim().toLowerCase();
  if (SUPPORTED_TYPES.has(t as CerfaTxType)) return t as CerfaTxType;
  return TYPE_ALIASES[t] ?? null;
}

/* -------------------------------------------------------------------------- */
/*  CSV                                                                       */
/* -------------------------------------------------------------------------- */

/** Découpe une ligne CSV (guillemets « "" » gérés) avec le séparateur donné. */
function splitLine(line: string, sep: string): string[] {
  const out: string[] = [];
  let cur = "";
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (quoted) {
      if (ch === '"' && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else if (ch === '"') {
        quoted = false;
      } else {
        cur += ch;
      }
    } else if (ch === '"') {
      quoted = true;
    } else if (ch === sep) {
      out.push(cur);
      cur = "";
    } else {
      cur += ch;
    }
  }
  out.push(cur);
  return out.map((c) => c.trim());
}

export interface CsvRow {
  /** Numéro de ligne dans le fichier (l'en-tête est la ligne 1). */
  line: number;
  values: Record<string, string>;
  /**
   * Valeurs en trop par rapport aux en-têtes, MÊME vides : sur un achat, la dernière colonne (valeur du portefeuille)
   * est vide, et un « 0,02 » non protégé décale tout d'un cran sans laisser de valeur non vide en trop.
   */
  extra: string[];
}

/** Tableau CSV : séparateur détecté sur l'en-tête (« ; », tabulation ou « , »), en-têtes en minuscules. */
export function parseCsvTable(text: string): { headers: string[]; rows: CsvRow[]; sep: string } {
  const lines = text.replace(/^﻿/, "").split(/\r?\n/);
  const firstIdx = lines.findIndex((l) => l.trim().length > 0);
  if (firstIdx === -1) return { headers: [], rows: [], sep: "," };
  const head = lines[firstIdx];
  const sep = ([";", "\t", ","] as const)
    .map((s) => [s, head.split(s).length] as const)
    .sort((a, b) => b[1] - a[1])[0][0];
  const headers = splitLine(head, sep).map((h) => h.toLowerCase());
  const rows: CsvRow[] = [];
  for (let i = firstIdx + 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue;
    const cols = splitLine(lines[i], sep);
    const values: Record<string, string> = {};
    headers.forEach((h, j) => {
      values[h] = cols[j] ?? "";
    });
    rows.push({ line: i + 1, values, extra: cols.slice(headers.length) });
  }
  return { headers, rows, sep };
}

/* -------------------------------------------------------------------------- */
/*  Nombres                                                                   */
/* -------------------------------------------------------------------------- */

export type NumberRead = { ok: true; value: number } | { ok: false; reason: "vide" | "illisible" | "ambigu" };

/**
 * Lit un nombre écrit à la française ou à l'anglaise : « 90 000 », « 1 234,56 », « 1.234,56 », « 1,234.56 »,
 * « 1.234.567 », « 0,5 ». Pour un montant en euros (`amount`), « 90.000 » ou « 1,234 » (un seul séparateur suivi de
 * trois chiffres) est AMBIGU (90 ou 90 000 ?) : refusé plutôt que deviné.
 */
export function readNumber(v: unknown, amount = false): NumberRead {
  if (typeof v === "number") return Number.isFinite(v) ? { ok: true, value: v } : { ok: false, reason: "illisible" };
  if (typeof v !== "string") return { ok: false, reason: "vide" };
  let s = v.replace(/[\s  €]/g, "").replace(/[−–]/g, "-");
  if (!s) return { ok: false, reason: "vide" };
  if (amount && /^[+-]?[1-9]\d{0,2}[.,]\d{3}$/.test(s)) return { ok: false, reason: "ambigu" };
  if (!/^[+-]?(\d+([.,]\d+)*)$/.test(s)) return { ok: false, reason: "illisible" };
  const commas = (s.match(/,/g) ?? []).length;
  const dots = (s.match(/\./g) ?? []).length;
  if (commas && dots) {
    s = s.lastIndexOf(",") > s.lastIndexOf(".") ? s.replace(/\./g, "").replace(",", ".") : s.replace(/,/g, "");
  } else if (commas > 1) {
    s = s.replace(/,/g, ""); // 1,234,567 : séparateurs de milliers
  } else if (dots > 1) {
    s = s.replace(/\./g, ""); // 1.234.567 : séparateurs de milliers
  } else if (commas === 1) {
    s = s.replace(",", ".");
  }
  const n = Number(s);
  return Number.isFinite(n) ? { ok: true, value: n } : { ok: false, reason: "illisible" };
}

/** Compatibilité : nombre ou NaN (sans contrôle d'ambiguïté). */
export function parseNumber(v: unknown): number {
  const r = readNumber(v);
  return r.ok ? r.value : NaN;
}

/* -------------------------------------------------------------------------- */
/*  Dates (heure de Paris)                                                    */
/* -------------------------------------------------------------------------- */

const PARIS_PARTS = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Europe/Paris",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23",
});

/** Instant UTC correspondant à une heure murale de Paris. */
function parisToUtc(y: number, mo: number, d: number, h: number, mi: number, s: number): Date {
  const guess = Date.UTC(y, mo - 1, d, h, mi, s);
  const p = Object.fromEntries(PARIS_PARTS.formatToParts(new Date(guess)).map((x) => [x.type, x.value]));
  const asIfUtc = Date.UTC(Number(p.year), Number(p.month) - 1, Number(p.day), Number(p.hour), Number(p.minute), Number(p.second));
  return new Date(guess - (asIfUtc - guess));
}

function validDay(y: number, mo: number, d: number): boolean {
  if (mo < 1 || mo > 12 || d < 1 || d > 31) return false;
  const t = new Date(Date.UTC(y, mo - 1, d));
  return t.getUTCFullYear() === y && t.getUTCMonth() === mo - 1 && t.getUTCDate() === d;
}

/**
 * Date lue : « AAAA-MM-JJ » gardée telle quelle ; date ISO avec fuseau gardée ; heure sans fuseau (ISO ou
 * JJ/MM/AAAA HH:MM[:SS]) lue à l'heure de Paris et rendue en ISO UTC ; « JJ/MM/AAAA » (ou « . », « - ») → AAAA-MM-JJ.
 * Refuse les dates impossibles (31/02). Renvoie null si illisible.
 */
export function normalizeDate(v: string): string | null {
  const s = (v ?? "").trim();
  let m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (m) return validDay(+m[1], +m[2], +m[3]) ? s : null;
  m = s.match(/^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2})(?:\.\d+)?)?(Z|[+-]\d{2}:?\d{2})?$/);
  if (m) {
    if (!validDay(+m[1], +m[2], +m[3])) return null;
    if (m[7]) return Number.isNaN(new Date(s.replace(" ", "T")).getTime()) ? null : s.replace(" ", "T");
    return parisToUtc(+m[1], +m[2], +m[3], +m[4], +m[5], +(m[6] ?? 0)).toISOString();
  }
  m = s.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2}))?)?$/);
  if (!m) return null;
  const [d, mo, y] = [+m[1], +m[2], +m[3]];
  if (!validDay(y, mo, d)) return null;
  if (m[4] === undefined) return `${y}-${String(mo).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  const h = +m[4];
  const mi = +m[5];
  if (h > 23 || mi > 59) return null;
  return parisToUtc(y, mo, d, h, mi, +(m[6] ?? 0)).toISOString();
}

/* -------------------------------------------------------------------------- */
/*  Lignes → transactions                                                     */
/* -------------------------------------------------------------------------- */

function rowToTransaction(r: Record<string, unknown>, line: number, errors: string[]): CerfaTransaction | null {
  const type = normType(r.type);
  if (!type) {
    errors.push(`Ligne ${line} : type « ${String(r.type ?? "")} » non reconnu (buy, sell, swap, transfer, fee, reward, ou achat, vente…).`);
    return null;
  }
  const date = normalizeDate(String(r.date ?? ""));
  if (!date) {
    errors.push(`Ligne ${line} : date invalide (AAAA-MM-JJ ou JJ/MM/AAAA).`);
    return null;
  }
  const asset = String(r.asset ?? r.symbol ?? "").trim().toUpperCase();
  if (!asset) {
    errors.push(`Ligne ${line} : actif vide.`);
    return null;
  }

  const q = readNumber(r.quantity ?? r.amount);
  if (!q.ok || q.value <= 0) {
    errors.push(`Ligne ${line} : quantité ${q.ok ? "nulle ou négative" : q.reason === "vide" ? "manquante" : "illisible"}.`);
    return null;
  }

  const priceRaw = r.price_eur ?? r.priceeur ?? r.priceEur ?? r.price;
  const p = readNumber(priceRaw ?? "", true);
  let priceEur = 0;
  if (p.ok) {
    if (p.value < 0) {
      errors.push(`Ligne ${line} : prix négatif.`);
      return null;
    }
    priceEur = p.value;
  } else if (p.reason === "ambigu") {
    errors.push(`Ligne ${line} : prix « ${String(priceRaw)} » ambigu (90 ou 90 000 ?) : écrivez 90000 ou 90 000.`);
    return null;
  } else if (p.reason === "illisible") {
    errors.push(`Ligne ${line} : prix « ${String(priceRaw)} » illisible (un nombre en euros, sans texte).`);
    return null;
  }
  if (PRICE_REQUIRED.has(type) && !(priceEur > 0)) {
    errors.push(`Ligne ${line} : prix unitaire en euros manquant (indispensable pour un achat, une vente ou une récompense).`);
    return null;
  }

  const f = readNumber(r.fees ?? "", true);
  let fees = 0;
  if (f.ok) {
    if (f.value < 0) {
      errors.push(`Ligne ${line} : frais négatifs (écrivez le montant sans signe moins).`);
      return null;
    }
    fees = f.value;
  } else if (f.reason !== "vide") {
    errors.push(`Ligne ${line} : frais « ${String(r.fees)} » ${f.reason === "ambigu" ? "ambigus (écrivez 1000 ou 1 000)" : "illisibles"}.`);
    return null;
  }

  const pvRaw = r.portfolio_value_eur ?? r.portfoliovalueeur ?? r.portfolioValueEur ?? r.valeur_portefeuille_eur ?? "";
  const pv = readNumber(pvRaw, true);
  let portfolioValueEur: number | undefined;
  if (pv.ok) {
    if (pv.value <= 0) {
      errors.push(`Ligne ${line} : valeur du portefeuille nulle ou négative.`);
      return null;
    }
    portfolioValueEur = pv.value;
  } else if (pv.reason !== "vide") {
    errors.push(
      `Ligne ${line} : valeur du portefeuille « ${String(pvRaw)} » ${pv.reason === "ambigu" ? "ambiguë (écrivez 4000 ou 4 000)" : "illisible"}.`,
    );
    return null;
  }

  return {
    date,
    type,
    asset,
    quantity: q.value,
    priceEur,
    fees,
    exchange: typeof r.exchange === "string" && r.exchange.trim() ? r.exchange.trim() : undefined,
    ...(type === "sell" && portfolioValueEur !== undefined ? { portfolioValueEur } : {}),
  };
}

/** Fichier importé (modèle CSV ou JSON aux mêmes champs) → transactions + erreurs lisibles (avec numéro de ligne). */
export function parseCerfaFile(text: string): { txs: CerfaTransaction[]; errors: string[] } {
  const errors: string[] = [];
  const trimmed = text.trim();
  if (trimmed.startsWith("[") || trimmed.startsWith("{")) {
    let json: unknown;
    try {
      json = JSON.parse(trimmed);
    } catch {
      return { txs: [], errors: ["Fichier JSON illisible."] };
    }
    const arr = Array.isArray(json)
      ? json
      : json && typeof json === "object" && Array.isArray((json as { transactions?: unknown }).transactions)
        ? (json as { transactions: unknown[] }).transactions
        : null;
    if (!arr) return { txs: [], errors: ["JSON détecté mais format inattendu (tableau de transactions requis)."] };
    const txs = arr
      .map((row, i) => (row && typeof row === "object" ? rowToTransaction(row as Record<string, unknown>, i + 1, errors) : null))
      .filter((x): x is CerfaTransaction => x !== null);
    return { txs, errors };
  }

  const { headers, rows, sep } = parseCsvTable(text);
  if (rows.length === 0) return { txs: [], errors: ["Fichier CSV vide ou en-têtes manquantes."] };
  for (const h of REQUIRED_HEADERS) {
    if (!headers.includes(h)) {
      return {
        txs: [],
        errors: [
          `Colonne manquante : ${h}. Colonnes attendues : ${REQUIRED_HEADERS.join(", ")}, price_eur, fees, exchange (partez du modèle à télécharger).`,
        ],
      };
    }
  }
  const txs: CerfaTransaction[] = [];
  for (const row of rows) {
    if (row.extra.length > 0) {
      const n = headers.length + row.extra.length;
      errors.push(
        sep === ","
          ? `Ligne ${row.line} : ${n} valeurs pour ${headers.length} colonnes. Un nombre écrit avec une virgule (0,02) décale les colonnes : utilisez le point (0.02), mettez-le entre guillemets, ou partez du modèle « Excel en français ».`
          : `Ligne ${row.line} : ${n} valeurs pour ${headers.length} colonnes (séparateur en trop).`,
      );
      continue;
    }
    const tx = rowToTransaction(row.values, row.line, errors);
    if (tx) txs.push(tx);
  }
  return { txs, errors };
}
