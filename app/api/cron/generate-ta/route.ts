/**
 * GET /api/cron/generate-ta
 *
 * Cron quotidien (recommandé : 1× par jour, ex Vercel `0 7 * * *`).
 * Génère 1 analyse technique MDX par crypto top 5 (BTC/ETH/SOL/XRP/ADA),
 * écrit dans `content/analyses-tech/`. Skip propre si le fichier du jour existe.
 *
 * Sécurité : Bearer CRON_SECRET (404 si invalide pour ne pas révéler la route).
 *
 * Logs structurés : préfixe `[ta-cron-*]` pour grep facile dans Vercel logs.
 *
 * Réponse JSON :
 *   { ok, sessionId, processed, created, skipped, errors[] }
 *
 * Limitations :
 *  - 5 fichiers max / run (1 par crypto). Pas de retry sur échec API individuel.
 *  - Si CoinGecko renvoie une série vide, la crypto est skippée et reportée
 *    dans `errors`. Le cron ne crash pas.
 *  - Côté Vercel, l'écriture FS est éphémère sur Hobby (lambda RO).
 *    En prod, l'idée est d'utiliser un build hook ou un commit Git via
 *    GitHub API (out of scope ici — ce route gère le cas dev/edge runtime
 *    où FS est writable, ou un déploiement avec volume monté).
 */

import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "node:fs";
import path from "node:path";
import { revalidateTag } from "next/cache";

import { TA_CRYPTOS } from "@/lib/ta-types";
import {
  calcAllIndicators,
  calcVolatility,
  detectTrend,
  findSupportResistance,
} from "@/lib/technical-analysis";
import {
  generateTAArticle,
  serializeTAArticle,
  taArticlePath,
} from "@/lib/ta-article-generator";
import { fetchHistoricalPrices } from "@/lib/historical-prices";
import { fetchPrices } from "@/lib/coingecko";
import type { CoinId } from "@/lib/coingecko";
import type { TAData } from "@/lib/ta-types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Mapping symbole UPPERCASE → CoinId pour `fetchPrices`. */
const SYMBOL_TO_COIN_ID: Record<string, CoinId> = {
  BTC: "bitcoin",
  ETH: "ethereum",
  SOL: "solana",
  XRP: "ripple",
  ADA: "cardano",
};

interface ReportError {
  symbol: string;
  message: string;
}

interface CronReport {
  processed: number;
  created: number;
  skipped: number;
  errors: ReportError[];
  durationMs: number;
}

/* -------------------------------------------------------------------------- */
/*  Auth                                                                      */
/* -------------------------------------------------------------------------- */

function checkAuth(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    console.warn("[ta-cron-warn] CRON_SECRET absent — endpoint ouvert (mode dev).");
    return true;
  }
  const auth = req.headers.get("authorization") ?? "";
  return auth === `Bearer ${secret}`;
}

/* -------------------------------------------------------------------------- */
/*  Handler                                                                   */
/* -------------------------------------------------------------------------- */

export async function GET(req: NextRequest): Promise<NextResponse> {
  const sessionId = crypto.randomUUID();

  if (!checkAuth(req)) {
    // 404 délibéré (security through obscurity).
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const startedAt = Date.now();
  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD UTC
  const targetDir = path.join(process.cwd(), "content", "analyses-tech");

  console.info(
    `[ta-cron-start] session=${sessionId} date=${today} cryptos=${TA_CRYPTOS.length}`,
  );

  // Assure l'existence du répertoire (création récursive).
  try {
    await fs.mkdir(targetDir, { recursive: true });
  } catch (err) {
    console.error(`[ta-cron-error] mkdir failed: ${(err as Error).message}`);
    return NextResponse.json(
      { ok: false, sessionId, error: "Cannot create target directory" },
      { status: 500 },
    );
  }

  // Récupère les prix actuels du top 5 en une seule requête.
  const ids: CoinId[] = TA_CRYPTOS.map((c) => SYMBOL_TO_COIN_ID[c.symbol]).filter(
    (x): x is CoinId => Boolean(x),
  );
  const livePrices = await fetchPrices(ids).catch(() => []);
  const liveMap = new Map(livePrices.map((p) => [p.id, p]));

  const errors: ReportError[] = [];
  let created = 0;
  let skipped = 0;

  for (const crypto of TA_CRYPTOS) {
    const slug = `${today}-${crypto.symbol.toLowerCase()}-analyse-technique`;
    const filePath = path.join(targetDir, `${slug}.mdx`);

    // Skip si fichier du jour déjà présent (idempotence).
    try {
      await fs.access(filePath);
      skipped++;
      console.info(`[ta-cron-skip] symbol=${crypto.symbol} reason=already-exists`);
      continue;
    } catch {
      // file not found → on génère
    }

    try {
      // 1. Fetch 200j de prix historiques (close quotidien EUR — on convertit
      //    pas la peine, les indicateurs sont scale-invariants ; le `price`
      //    affiché vient de fetchPrices en USD).
      const history = await fetchHistoricalPrices(crypto.coingeckoId, 200);
      if (history.length < 50) {
        throw new Error(`historical too short: ${history.length} points`);
      }
      const prices = history.map((p) => p.price);

      // 2. Live USD price + change 24h (pour le frontmatter).
      const cgId = SYMBOL_TO_COIN_ID[crypto.symbol];
      const live = cgId ? liveMap.get(cgId) : undefined;
      const livePriceUsd = live?.price ?? prices[prices.length - 1]!;
      const change24h = live?.change24h ?? 0;

      // 3. Calculs TA
      const indicators = calcAllIndicators(prices);
      const trend = detectTrend(prices);
      const levels = findSupportResistance(prices, 50);
      const volatility = calcVolatility(prices, 14);

      const data: TAData = {
        symbol: crypto.symbol,
        name: crypto.name,
        slug: crypto.slug,
        price: Number(livePriceUsd.toFixed(livePriceUsd >= 1 ? 2 : 6)),
        change24h: Number(change24h.toFixed(2)),
        indicators,
        trend,
        levels,
        volatility,
        image: crypto.image,
      };

      // 4. Génération + sérialisation MDX
      const article = generateTAArticle(data, today);
      const mdx = serializeTAArticle(article);

      // 5. Écriture disque
      await fs.writeFile(filePath, mdx, "utf8");
      created++;
      console.info(
        `[ta-cron-created] symbol=${crypto.symbol} slug=${slug} rsi=${indicators.rsi} trend=${trend}`,
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      errors.push({ symbol: crypto.symbol, message });
      console.error(
        `[ta-cron-error] symbol=${crypto.symbol} message=${message}`,
      );
    }
  }

  // Bust le cache MDX pour que les nouvelles analyses soient visibles tout de suite.
  if (created > 0) {
    try {
      revalidateTag("ta-articles");
    } catch (err) {
      console.warn(`[ta-cron-warn] revalidateTag failed: ${(err as Error).message}`);
    }
  }

  const report: CronReport = {
    processed: TA_CRYPTOS.length,
    created,
    skipped,
    errors,
    durationMs: Date.now() - startedAt,
  };

  console.info(
    `[ta-cron-end] session=${sessionId} processed=${report.processed} created=${report.created} skipped=${report.skipped} errors=${report.errors.length} durationMs=${report.durationMs}`,
  );

  return NextResponse.json(
    { ok: true, sessionId, ...report },
    { status: 200, headers: { "Cache-Control": "no-store" } },
  );
}
