/**
 * GET /api/cron/audit-cryptos-health
 *
 * Health-check automatique des 780 fiches crypto :
 *   1. DELISTING : si CG ne retourne plus l'id → flag is_published=false + Sentry
 *   2. REBRAND : si market_cap_rank change brutalement → flag needs_review
 *   3. NEW TOPS : si CG top 100 mais pas en DB → log Sentry pour suggérer génération
 *   4. STALE : raw_data_snapshot >30 jours → flag needs_review
 *
 * Schedule : 1×/semaine via daily-orchestrator (lourd, pas besoin daily).
 *
 * Coût API :
 *   - 4 fetches CG /coins/markets pour 780 ids (chunks 250)
 *   - 1 fetch CG /coins/markets top 100 (vérif new tops)
 *   - 1 query Supabase (light, coingecko_id only)
 *   - N writes Supabase pour les flags (typiquement <10/run)
 *
 * Réponse :
 *   {
 *     ok, fetched, dbCount,
 *     delisted: [...ids],
 *     rankShifts: [{id, from, to}],
 *     newTops: [...ids],
 *     stale: [...ids],
 *     unpublished: count,
 *     flagged: count,
 *   }
 */

import { NextRequest, NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";

import { verifyBearer } from "@/lib/auth";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";
import { getKv } from "@/lib/kv";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const COINGECKO_BASE = "https://api.coingecko.com/api/v3";
const CHUNK_SIZE = 250;
const SLEEP_BETWEEN_CHUNKS_MS = 5000;
/** Si rank shift >50% → flag needs_review (ex: rank 100 → 1000 = -900%). */
const RANK_SHIFT_THRESHOLD_PCT = 0.5;
/** Stale si raw_data_snapshot >30j (ms) */
const STALE_AGE_MS = 30 * 24 * 3600 * 1000;

/**
 * MULTI-STADE SAFETY 2026-05-11 — Au lieu d'unpublish dès le 1er run où CG
 * ne retourne pas l'ID, on tracke en KV depuis combien de runs l'ID est
 * absent. Stades de progression :
 *   - Stade 1 (run 1)  : KV.set(missing_since=now). Aucune action DB.
 *   - Stade 2 (run 3)  : Sentry alert "suspect since 2 runs". Aucune action.
 *   - Stade 3 (run 7)  : Flag needs_review=true. Encore visible.
 *   - Stade 4 (run 14) : Sentry CRITICAL "candidate unpublish". JAMAIS auto-unpublish.
 *
 * Chaque review nécessite une action MANUELLE (admin UI ou SQL direct).
 * Garantit zéro mass-unpublish accidentel comme l'incident 2026-05-11.
 *
 * Reset auto : si CG retourne l'ID à un run, KV.del(missing_since) → reset.
 */
const KV_PREFIX_MISSING = "audit:missing:";
const STAGE_3_FLAG_RUNS = 7;       // après 7 runs absent → needs_review
const STAGE_4_ALERT_RUNS = 14;     // après 14 runs absent → Sentry critical

interface CGRow {
  id: string;
  market_cap_rank: number | null;
}

interface DbRow {
  coingecko_id: string;
  market_cap_rank: number | null;
  last_refreshed_at: string | null;
  is_published: boolean;
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  const startedAt = Date.now();
  const secret = process.env.CRON_SECRET;
  if (!verifyBearer(req, secret)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  Sentry.addBreadcrumb({
    category: "cron",
    message: "audit-cryptos-health started",
    level: "info",
  });

  const sb = createSupabaseServiceRoleClient();
  if (!sb) {
    return NextResponse.json(
      { ok: false, error: "Supabase unavailable" },
      { status: 500 },
    );
  }

  // 1. Get DB state
  const { data: dbRows, error: dbErr } = await sb
    .from("cryptos")
    .select("coingecko_id, market_cap_rank, last_refreshed_at, is_published")
    .eq("is_published", true)
    .order("market_cap_rank", { ascending: true, nullsFirst: false })
    .limit(1000);
  if (dbErr) {
    return NextResponse.json(
      { ok: false, error: `DB read: ${dbErr.message}` },
      { status: 500 },
    );
  }

  const db = (dbRows as DbRow[]) ?? [];
  const dbIds = db.map((r) => r.coingecko_id);
  const dbById = new Map(db.map((r) => [r.coingecko_id, r]));

  // 2. Fetch CG en chunks
  const cgRows: CGRow[] = [];
  const chunks: string[][] = [];
  for (let i = 0; i < dbIds.length; i += CHUNK_SIZE) {
    chunks.push(dbIds.slice(i, i + CHUNK_SIZE));
  }

  for (let idx = 0; idx < chunks.length; idx++) {
    const chunk = chunks[idx];
    const url = `${COINGECKO_BASE}/coins/markets?vs_currency=usd&ids=${chunk.join(",")}&per_page=${chunk.length}&page=1&sparkline=false`;
    try {
      const res = await fetch(url, {
        cache: "no-store",
        signal: AbortSignal.timeout(20000),
      });
      if (!res.ok) {
        Sentry.addBreadcrumb({
          category: "cron",
          message: `audit-cryptos chunk ${idx + 1}/${chunks.length} returned ${res.status}`,
          level: "warning",
        });
        continue;
      }
      const json = (await res.json()) as CGRow[];
      cgRows.push(...json);
    } catch (err) {
      Sentry.captureException(err);
    }
    if (idx < chunks.length - 1) {
      await new Promise((r) => setTimeout(r, SLEEP_BETWEEN_CHUNKS_MS));
    }
  }

  // 3. Top 100 CG (pour détecter new tops absents de DB)
  let cgTop100: CGRow[] = [];
  try {
    await new Promise((r) => setTimeout(r, SLEEP_BETWEEN_CHUNKS_MS));
    const res = await fetch(
      `${COINGECKO_BASE}/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=100&page=1&sparkline=false`,
      { cache: "no-store", signal: AbortSignal.timeout(15000) },
    );
    if (res.ok) cgTop100 = (await res.json()) as CGRow[];
  } catch {
    // skip new-tops detection if CG fail
  }

  // CRITICAL SAFETY CHECK 2026-05-11 — Si CG a fail (rate-limit, ban),
  // cgRows peut être très partiel ou vide. Sans ce check, on unpublish
  // TOUTES les 780 fiches (bug catastrophique observé en run #1).
  // Règle : si cgFetched < 80% du dbCount, abort sans modifs DB.
  const COVERAGE_MIN_PCT = 0.8;
  if (cgRows.length < db.length * COVERAGE_MIN_PCT) {
    Sentry.captureMessage(
      `audit-cryptos-health ABORTED: CG coverage too low (${cgRows.length}/${db.length})`,
      "warning",
    );
    return NextResponse.json({
      ok: false,
      aborted: true,
      reason: `CG coverage ${cgRows.length}/${db.length} < ${COVERAGE_MIN_PCT * 100}% — likely CG rate-limited, abort to avoid mass unpublish`,
      durationMs: Date.now() - startedAt,
    }, { status: 200 });
  }

  // 4. Analyse : delisted, rank shifts, new tops, stale
  const cgById = new Map(cgRows.map((r) => [r.id, r]));
  const cgIds = new Set(cgRows.map((r) => r.id));
  const dbIdSet = new Set(dbIds);

  const delisted: string[] = [];
  const rankShifts: Array<{ id: string; from: number | null; to: number | null }> = [];
  const stale: string[] = [];

  for (const row of db) {
    // DELISTED : DB published mais CG ne retourne plus
    if (!cgIds.has(row.coingecko_id)) {
      delisted.push(row.coingecko_id);
      continue;
    }
    // RANK SHIFT >50%
    const cgRank = cgById.get(row.coingecko_id)?.market_cap_rank ?? null;
    if (
      cgRank != null &&
      row.market_cap_rank != null &&
      Math.abs(cgRank - row.market_cap_rank) / Math.max(row.market_cap_rank, 1) >
        RANK_SHIFT_THRESHOLD_PCT
    ) {
      rankShifts.push({
        id: row.coingecko_id,
        from: row.market_cap_rank,
        to: cgRank,
      });
    }
    // STALE : raw_data_snapshot >30j
    if (row.last_refreshed_at) {
      const age = Date.now() - new Date(row.last_refreshed_at).getTime();
      if (age > STALE_AGE_MS) stale.push(row.coingecko_id);
    }
  }

  const newTops = cgTop100
    .filter((c) => !dbIdSet.has(c.id))
    .map((c) => c.id);

  // 5. MULTI-STADE PROCESSING (NO AUTO-UNPUBLISH 2026-05-11)
  const kv = getKv();
  let stage1Count = 0; // first miss
  let stage2Count = 0; // 2-6 runs missing
  let stage3Count = 0; // 7-13 runs → flag needs_review
  let stage4Count = 0; // 14+ runs → critical alert
  const stage4Ids: string[] = [];
  const stage3Ids: string[] = [];

  for (const id of delisted) {
    const kvKey = `${KV_PREFIX_MISSING}${id}`;
    const tracking = (await kv.get<{ missingSince: string; runCount: number }>(kvKey)) ?? null;
    const newRunCount = (tracking?.runCount ?? 0) + 1;
    const missingSince = tracking?.missingSince ?? new Date().toISOString();

    // Persist updated tracking (TTL 30j auto-cleanup)
    await kv.set(kvKey, { missingSince, runCount: newRunCount }, { ex: 30 * 86400 });

    if (newRunCount === 1) stage1Count++;
    else if (newRunCount < STAGE_3_FLAG_RUNS) stage2Count++;
    else if (newRunCount < STAGE_4_ALERT_RUNS) {
      stage3Count++;
      stage3Ids.push(id);
    } else {
      stage4Count++;
      stage4Ids.push(id);
    }
  }

  // Reset KV pour les IDs qui sont revenus en CG (cleanup)
  let resetCount = 0;
  // (cleanup paresseux : on ne lit pas tout le KV ici, on attend que les
  // entrées TTL 30j expirent naturellement OU qu'un autre run les retrouve)
  // Pour reset explicite, parcourir kv.keys(prefix) — surcoût KV élevé,
  // pas critique car TTL 30j fait le job. On reset juste si on a déjà
  // tracking ET que cgIds.has(id) maintenant (= ID revenu).
  for (const id of dbIds) {
    if (cgIds.has(id)) {
      const kvKey = `${KV_PREFIX_MISSING}${id}`;
      const tracking = await kv.get(kvKey);
      if (tracking) {
        await kv.del(kvKey);
        resetCount++;
      }
    }
  }

  // 5b. Flag stage 3 (7+ runs missing) → needs_review (mais reste publié)
  let flagged = 0;
  if (stage3Ids.length > 0) {
    for (let i = 0; i < stage3Ids.length; i += 50) {
      const chunk = stage3Ids.slice(i, i + 50);
      const { error } = await sb
        .from("cryptos")
        .update({ needs_review: true })
        .in("coingecko_id", chunk);
      if (!error) flagged += chunk.length;
    }
  }

  // 5c. Stage 4 → Sentry CRITICAL + EMAIL ADMIN (14+ runs = vrai delisting probable)
  if (stage4Ids.length > 0) {
    Sentry.captureMessage(
      `audit-cryptos CRITICAL: ${stage4Ids.length} ids missing CG for 14+ runs (likely delisted, MANUAL REVIEW REQUIRED): ${stage4Ids.slice(0, 10).join(", ")}`,
      "error",
    );
    // EMAIL ADMIN — alerte directe (Sentry parfois ignoré, email sur le tel = visible)
    try {
      const { sendEmail } = await import("@/lib/email/client");
      const adminEmail = process.env.ADMIN_ALERT_EMAIL || "kevinvoisin2016@gmail.com";
      const list = stage4Ids.map((id) => `  • ${id}`).join("\n");
      await sendEmail({
        to: adminEmail,
        subject: `[Cryptoreflex] ⚠️ ${stage4Ids.length} crypto(s) à reviewer (delisting probable)`,
        text: `${stage4Ids.length} crypto(s) absentes de CoinGecko depuis 14+ runs.\n\nLISTE :\n${list}\n\nAction requise : review manuelle dans Supabase Dashboard.\nQuery SQL :\n  SELECT coingecko_id, name, market_cap_rank FROM cryptos\n  WHERE coingecko_id IN ('${stage4Ids.join("','")}');\n\nSi vraiment delisted : UPDATE cryptos SET is_published=false WHERE coingecko_id IN (...);\nSi rebrand : update coingecko_id avec le nouveau ID CG.\n\nDashboard : https://supabase.com/dashboard/project/ovolnnnmsugfhsckhivh/editor`,
        html: `<h2>⚠️ ${stage4Ids.length} crypto(s) à reviewer</h2><p>Absentes de CoinGecko depuis <strong>14+ runs</strong> du cron audit-cryptos-health (= ~14 jours).</p><p><strong>Liste :</strong></p><ul>${stage4Ids.map((id) => `<li><code>${id}</code></li>`).join("")}</ul><p><strong>Action :</strong> review manuelle dans Supabase Dashboard.</p><pre style="background:#f4f4f4;padding:10px;border-radius:4px">SELECT coingecko_id, name, market_cap_rank FROM cryptos\nWHERE coingecko_id IN ('${stage4Ids.join("','")}');</pre><p>Si vraiment delisted : <code>UPDATE cryptos SET is_published=false WHERE coingecko_id IN (...);</code></p><p>Si rebrand : update <code>coingecko_id</code> avec le nouveau ID CoinGecko.</p>`,
      });
    } catch (err) {
      // email fail = pas critique, Sentry a déjà l'info
      Sentry.captureException(err);
    }
  }

  // 5d. Flag rank shifts + stale → needs_review (cumulé avec stage3)
  const toFlag = Array.from(
    new Set([...rankShifts.map((r) => r.id), ...stale, ...stage3Ids]),
  );
  if (toFlag.length > 0) {
    for (let i = 0; i < toFlag.length; i += 50) {
      const chunk = toFlag.slice(i, i + 50);
      const { error } = await sb
        .from("cryptos")
        .update({ needs_review: true })
        .in("coingecko_id", chunk);
      if (!error) flagged += chunk.length;
    }
  }

  // unpublished = 0 GARANTI (jamais d'auto-unpublish dans ce cron)
  const unpublished = 0;

  // 5c. New tops → log Sentry pour suggestion (pas d'auto-create)
  if (newTops.length > 0) {
    Sentry.captureMessage(
      `audit-cryptos: ${newTops.length} new top-100 cryptos missing from DB: ${newTops.slice(0, 10).join(", ")}${newTops.length > 10 ? "..." : ""}`,
      "info",
    );
  }

  const durationMs = Date.now() - startedAt;
  return NextResponse.json({
    ok: true,
    dbCount: db.length,
    cgFetched: cgRows.length,
    cgTopFetched: cgTop100.length,
    // Multi-stage breakdown (non-destructive):
    missingTotal: delisted.length,
    stage1_firstMiss: stage1Count,
    stage2_warming: stage2Count,
    stage3_flagged: stage3Count,
    stage4_critical_pending_manual_review: stage4Count,
    stage4Ids: stage4Ids.slice(0, 20),
    resetMissing: resetCount,
    rankShifts: rankShifts.slice(0, 10),
    rankShiftsCount: rankShifts.length,
    newTops: newTops.slice(0, 10),
    newTopsCount: newTops.length,
    stale: stale.slice(0, 10),
    staleCount: stale.length,
    unpublished, // = 0 GARANTI (multi-stade safety)
    flagged,
    durationMs,
  });
}
