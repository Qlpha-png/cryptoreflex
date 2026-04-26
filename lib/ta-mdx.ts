/**
 * lib/ta-mdx.ts — Pipeline de lecture des analyses techniques MDX.
 *
 * Pendant léger de `lib/mdx.ts` mais dédié à `content/analyses-tech/*.mdx`.
 * Schéma du frontmatter spécifique aux analyses techniques (voir TAFrontmatter).
 *
 * Cache : unstable_cache 60s avec tag "ta-articles" pour permettre un bust
 * manuel via revalidateTag("ta-articles") (utilisé par le cron après écriture).
 */

import { promises as fs } from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { unstable_cache } from "next/cache";
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

/* -------------------------------------------------------------------------- */
/*  FS layer (non-cachée)                                                     */
/* -------------------------------------------------------------------------- */

const TA_DIR = path.join(process.cwd(), "content", "analyses-tech");

/** Coerce string-or-number → number, fallback 0. */
function toNumber(v: unknown, fallback = 0): number {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") {
    const n = Number(v);
    if (Number.isFinite(n)) return n;
  }
  return fallback;
}

/** Coerce string → Trend, fallback "neutral". */
function toTrend(v: unknown): Trend {
  if (v === "bullish" || v === "bearish" || v === "neutral") return v;
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

function normalize(raw: Record<string, unknown>, fallbackSlug: string, content: string): TAArticleFull {
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

async function readAllFromDisk(): Promise<TAArticleFull[]> {
  let files: string[];
  try {
    files = await fs.readdir(TA_DIR);
  } catch {
    return [];
  }

  const mdx = files.filter((f) => f.endsWith(".mdx") || f.endsWith(".md"));
  const articles = await Promise.all(
    mdx.map(async (file) => {
      const full = path.join(TA_DIR, file);
      const raw = await fs.readFile(full, "utf8");
      const { data, content } = matter(raw);
      const fallback = file.replace(/\.mdx?$/, "");
      return normalize(data as Record<string, unknown>, fallback, content);
    }),
  );

  // Tri date DESC puis symbol pour stabilité visuelle.
  return articles.sort((a, b) => {
    const da = new Date(a.date).getTime();
    const db = new Date(b.date).getTime();
    if (db !== da) return db - da;
    return a.symbol.localeCompare(b.symbol);
  });
}

/* -------------------------------------------------------------------------- */
/*  API publique cachée                                                       */
/* -------------------------------------------------------------------------- */

const TA_CACHE_TTL = 60;

export const getAllTAArticles = unstable_cache(
  async (): Promise<TAArticleFull[]> => readAllFromDisk(),
  ["ta:all"],
  { tags: ["ta-articles"], revalidate: TA_CACHE_TTL },
);

export const getAllTASummaries = unstable_cache(
  async (): Promise<TAArticleSummary[]> => {
    const all = await readAllFromDisk();
    return all.map(({ content: _c, ...rest }) => rest);
  },
  ["ta:summaries"],
  { tags: ["ta-articles"], revalidate: TA_CACHE_TTL },
);

export const getTAArticleBySlug = unstable_cache(
  async (slug: string): Promise<TAArticleFull | null> => {
    const all = await readAllFromDisk();
    return all.find((a) => a.slug === slug) ?? null;
  },
  ["ta:by-slug"],
  { tags: ["ta-articles"], revalidate: TA_CACHE_TTL },
);

export const getTASlugs = unstable_cache(
  async (): Promise<string[]> => {
    const all = await readAllFromDisk();
    return all.map((a) => a.slug);
  },
  ["ta:slugs"],
  { tags: ["ta-articles"], revalidate: TA_CACHE_TTL },
);
