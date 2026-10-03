/**
 * lib/ta-mdx-reader.ts — couche disque des analyses techniques (sans cache Next).
 *
 * Séparée de lib/ta-mdx.ts (qui ajoute unstable_cache + mémoïsation process)
 * pour être testable hors runtime Next (tests/lib/ta-mdx-reader.test.ts).
 *
 * FIX PROD 2026-10-02 — « EMFILE: too many open files » (HTTP 500 sur
 * /analyses-techniques) : l'ancien readAllFromDisk ouvrait les ~340 MDX d'un
 * coup (Promise.all), et plusieurs getters cachés le rappelaient pour chaque
 * requête / page générée. Ici : lecture à concurrence BORNÉE + lecture d'un
 * seul fichier quand on cherche un slug.
 */

import { promises as fs } from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import type { Indicators, Levels, Trend } from "./ta-types";

/* -------------------------------------------------------------------------- */
/*  Types                                                                     */
/* -------------------------------------------------------------------------- */

export interface TAArticleSummary {
  /** Slug fichier sans extension : YYYY-MM-DD-symbol-analyse-technique. */
  slug: string;
  title: string;
  description: string;
  /** ISO YYYY-MM-DD. */
  date: string;
  /** UPPERCASE (BTC, ETH…). */
  symbol: string;
  name: string;
  cryptoSlug: string;
  coingeckoId: string;
  currentPrice: number;
  trend: Trend;
  rsi: number;
  change24h: number;
  volatility: number;
  image?: string;
}

export interface TAArticleFull extends TAArticleSummary {
  /** Body MDX brut (à passer dans <MdxContent />). */
  content: string;
  /** Indicateurs complets (parsés depuis le frontmatter nested). */
  indicators?: Indicators;
  /** Niveaux clés (supports/résistances). */
  levels?: Levels;
}

/** Nombre maximal de fichiers ouverts simultanément. */
export const TA_READ_CONCURRENCY = 16;

/* -------------------------------------------------------------------------- */
/*  Concurrence bornée                                                        */
/* -------------------------------------------------------------------------- */

/**
 * `Promise.all(items.map(fn))` mais avec au plus `limit` appels en vol.
 * Ordre des résultats = ordre des entrées. Rejette à la première erreur.
 */
export async function mapWithConcurrency<T, R>(
  items: readonly T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let next = 0;
  const workerCount = Math.min(Math.max(1, Math.floor(limit) || 1), items.length);
  const workers = Array.from({ length: workerCount }, async () => {
    while (next < items.length) {
      const i = next++;
      results[i] = await fn(items[i], i);
    }
  });
  await Promise.all(workers);
  return results;
}

/* -------------------------------------------------------------------------- */
/*  Normalisation frontmatter                                                 */
/* -------------------------------------------------------------------------- */

/** Coerce string-or-number → number, fallback 0. */
function toNumber(v: unknown, fallback = 0): number {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") {
    const n = Number(v);
    if (Number.isFinite(n)) return n;
  }
  return fallback;
}

/**
 * Coerce string → Trend, fallback "neutral".
 * Le générateur écrit la tendance en français (« Haussier », « Baissier », « Neutre »), les
 * anciens fichiers en anglais : les deux formes sont reconnues. Audit 03/10/2026 : 188 analyses
 * haussières ou baissières s'affichaient « Neutre » parce que seul l'anglais était accepté.
 */
function toTrend(v: unknown): Trend {
  const s = String(v ?? "").trim().toLowerCase();
  if (s === "bullish" || s === "haussier" || s === "haussière") return "bullish";
  if (s === "bearish" || s === "baissier" || s === "baissière") return "bearish";
  return "neutral";
}

function parseIndicators(raw: unknown): Indicators | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const r = raw as Record<string, unknown>;
  const macdRaw = (r.macd as Record<string, unknown>) ?? {};
  const bbRaw = (r.bollinger as Record<string, unknown>) ?? {};
  return {
    rsi: toNumber(r.rsi, 50),
    ma50: toNumber(r.ma50),
    ma200: toNumber(r.ma200),
    ema12: toNumber(r.ema12),
    ema26: toNumber(r.ema26),
    macd: {
      macd: toNumber(macdRaw.macd),
      signal: toNumber(macdRaw.signal),
      histogram: toNumber(macdRaw.histogram),
    },
    bollinger: {
      upper: toNumber(bbRaw.upper),
      middle: toNumber(bbRaw.middle),
      lower: toNumber(bbRaw.lower),
    },
  };
}

function parseLevels(raw: unknown): Levels | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const r = raw as Record<string, unknown>;
  const supports = Array.isArray(r.supports) ? r.supports.map((v) => toNumber(v)) : [];
  const resistances = Array.isArray(r.resistances) ? r.resistances.map((v) => toNumber(v)) : [];
  return { supports, resistances };
}

export function normalizeTA(raw: Record<string, unknown>, fallbackSlug: string, content: string): TAArticleFull {
  const slug = (raw.slug as string) || fallbackSlug;
  const symbol = (raw.symbol as string) || "BTC";
  return {
    slug,
    title: (raw.title as string) || `Analyse technique ${symbol}`,
    description:
      (raw.description as string) ||
      content.replace(/\s+/g, " ").trim().slice(0, 180) + "…",
    date: (raw.date as string) || new Date().toISOString().slice(0, 10),
    symbol,
    name: (raw.name as string) || symbol,
    cryptoSlug: (raw.cryptoSlug as string) || symbol.toLowerCase(),
    coingeckoId: (raw.coingeckoId as string) || symbol.toLowerCase(),
    currentPrice: toNumber(raw.currentPrice),
    trend: toTrend(raw.trend),
    rsi: toNumber(raw.rsi, 50),
    change24h: toNumber(raw.change24h),
    volatility: toNumber(raw.volatility),
    image: typeof raw.image === "string" ? raw.image : undefined,
    content,
    indicators: parseIndicators(raw.indicators),
    levels: parseLevels(raw.levels),
  };
}

/* -------------------------------------------------------------------------- */
/*  Lecture disque                                                            */
/* -------------------------------------------------------------------------- */

const TA_EXT = /\.mdx?$/;

async function readTAFile(dir: string, file: string): Promise<TAArticleFull> {
  const raw = await fs.readFile(path.join(dir, file), "utf8");
  const { data, content } = matter(raw);
  return normalizeTA(data as Record<string, unknown>, file.replace(TA_EXT, ""), content);
}

/** Tri date DESC puis symbol (stabilité visuelle). */
export function sortTAArticles<T extends { date: string; symbol: string }>(articles: T[]): T[] {
  return articles.sort((a, b) => {
    const da = new Date(a.date).getTime();
    const db = new Date(b.date).getTime();
    if (db !== da) return db - da;
    return a.symbol.localeCompare(b.symbol);
  });
}

/**
 * Lit toutes les analyses d'un dossier, au plus `concurrency` fichiers ouverts
 * à la fois. Dossier absent → []. Une erreur de lecture d'un fichier rejette
 * (l'appelant décide : la mémoïsation de lib/ta-mdx.ts ne garde pas un échec).
 */
export async function readAllTAFromDir(
  dir: string,
  concurrency = TA_READ_CONCURRENCY,
): Promise<TAArticleFull[]> {
  let files: string[];
  try {
    files = await fs.readdir(dir);
  } catch {
    return [];
  }
  const mdx = files.filter((f) => TA_EXT.test(f));
  const articles = await mapWithConcurrency(mdx, concurrency, (file) => readTAFile(dir, file));
  return sortTAArticles(articles);
}

/** Slug sûr pour un nom de fichier (pas de séparateur, pas de « .. »). */
const SAFE_SLUG = /^[a-z0-9][a-z0-9-]*$/i;

/**
 * Lit UNIQUEMENT `<slug>.mdx` (puis `<slug>.md`). Renvoie null si le fichier
 * n'existe pas, si le slug est invalide, ou si le frontmatter déclare un autre
 * slug (l'appelant retombe alors sur la liste complète).
 */
export async function readTAFileBySlug(dir: string, slug: string): Promise<TAArticleFull | null> {
  if (!SAFE_SLUG.test(slug)) return null;
  for (const ext of [".mdx", ".md"]) {
    try {
      const article = await readTAFile(dir, `${slug}${ext}`);
      return article.slug === slug ? article : null;
    } catch (err) {
      if ((err as NodeJS.ErrnoException)?.code === "ENOENT") continue;
      throw err;
    }
  }
  return null;
}
