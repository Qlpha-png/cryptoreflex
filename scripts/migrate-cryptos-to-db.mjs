#!/usr/bin/env node
/**
 * scripts/migrate-cryptos-to-db.mjs
 *
 * Phase 1 scaling — seed initial table public.cryptos depuis les fichiers
 * JSON editoriaux existants (data/top-cryptos.json + data/hidden-gems.json).
 *
 * Comportement :
 *   - Idempotent : utilise upsert sur coingecko_id (re-runnable sans risque)
 *   - quality_tier = "T1" pour tous les imports JSON (ce sont des fiches
 *     hand-crafted historiques de l'equipe Cryptoreflex)
 *   - source = "imported-json"
 *   - llm_content = {} (vide — ces fiches n'ont pas l'analyse profonde
 *     LLM-generee. Elles peuvent etre enrichies plus tard via le pipeline.)
 *   - Mappe les champs editoriaux (tagline, what, useCase, strengths,
 *     weaknesses, etc.) dans raw_data_snapshot.editorial pour preservation
 *
 * Pre-requis :
 *   - Table public.cryptos creee (cf. supabase/migrations/20260508_cryptos_fiches.sql)
 *   - NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY en env
 *
 * Usage :
 *   NEXT_PUBLIC_SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... \
 *     node scripts/migrate-cryptos-to-db.mjs
 *
 * Dry-run (preview sans ecrire) :
 *   node scripts/migrate-cryptos-to-db.mjs --dry-run
 */

import { promises as fs } from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

const REPO_ROOT = path.resolve(process.cwd());
const TOP_FILE = path.join(REPO_ROOT, "data", "top-cryptos.json");
const GEMS_FILE = path.join(REPO_ROOT, "data", "hidden-gems.json");

const args = process.argv.slice(2);
const DRY_RUN = args.includes("--dry-run");

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                   */
/* -------------------------------------------------------------------------- */

async function readJson(file) {
  const raw = await fs.readFile(file, "utf8");
  return JSON.parse(raw);
}

/**
 * Mappe une entree TopCrypto vers une row DB.
 * Preserve tous les champs editoriaux dans raw_data_snapshot.editorial.
 */
function mapTopCryptoToRow(entry) {
  return {
    coingecko_id: entry.coingeckoId,
    slug: entry.id,
    symbol: (entry.symbol ?? "").toUpperCase(),
    name: entry.name,
    genesis_date: entry.yearCreated ? `${entry.yearCreated}-01-01` : null,
    categories: entry.category ? [entry.category] : [],
    homepage_url: entry.officialUrl ?? null,
    whitepaper_url: null,
    github_repos: [],
    twitter_handle: null,
    chains: {},
    raw_data_snapshot: {
      editorial: {
        kind: "top10",
        rank: entry.rank,
        tagline: entry.tagline,
        what: entry.what,
        useCase: entry.useCase,
        consensus: entry.consensus,
        blockTime: entry.blockTime,
        maxSupply: entry.maxSupply,
        strengths: entry.strengths ?? [],
        weaknesses: entry.weaknesses ?? [],
        beginnerFriendly: entry.beginnerFriendly ?? null,
        riskLevel: entry.riskLevel,
        whereToBuy: entry.whereToBuy ?? [],
        createdBy: entry.createdBy,
      },
    },
    llm_content: {},
    market_cap_rank: entry.rank,
    quality_tier: "T1",
    source: "imported-json",
    is_published: true,
    published_at: new Date().toISOString(),
    last_refreshed_at: new Date().toISOString(),
    needs_review: false,
  };
}

/**
 * Mappe une entree HiddenGem vers une row DB.
 * Les hidden gems ont deja un score de fiabilite (0-10) → on peut le mapper
 * vers score_overall (×10 pour 0-100 scale).
 */
function mapHiddenGemToRow(entry) {
  const reliabilityScore = entry.reliability?.score ?? null;
  const overallScore = reliabilityScore != null ? Math.min(100, Math.max(0, reliabilityScore * 10)) : null;
  return {
    coingecko_id: entry.coingeckoId,
    slug: entry.id,
    symbol: (entry.symbol ?? "").toUpperCase(),
    name: entry.name,
    genesis_date: entry.yearCreated ? `${entry.yearCreated}-01-01` : null,
    categories: entry.category ? [entry.category] : [],
    homepage_url: entry.officialUrl ?? null,
    whitepaper_url: null,
    github_repos: [],
    twitter_handle: null,
    chains: {},
    raw_data_snapshot: {
      editorial: {
        kind: "hidden-gem",
        rank: entry.rank,
        marketCapRange: entry.marketCapRange,
        tagline: entry.tagline,
        what: entry.what,
        whyHiddenGem: entry.whyHiddenGem,
        reliability: entry.reliability,
        risks: entry.risks ?? [],
        useCase: entry.useCase,
        whereToBuy: entry.whereToBuy ?? [],
        monitoringSignals: entry.monitoringSignals ?? [],
      },
    },
    llm_content: {},
    market_cap_rank: entry.rank,
    score_overall: overallScore,
    quality_tier: "T1",
    source: "imported-json",
    is_published: true,
    published_at: new Date().toISOString(),
    last_refreshed_at: new Date().toISOString(),
    needs_review: false,
  };
}

/* -------------------------------------------------------------------------- */
/*  Main                                                                      */
/* -------------------------------------------------------------------------- */

async function main() {
  console.log(`\n=== Migration cryptos JSON -> Supabase${DRY_RUN ? " (DRY RUN)" : ""} ===\n`);

  const top = await readJson(TOP_FILE);
  const gems = await readJson(GEMS_FILE);
  const topRows = (top.topCryptos ?? []).map(mapTopCryptoToRow);
  const gemRows = (gems.hiddenGems ?? []).map(mapHiddenGemToRow);
  const allRows = [...topRows, ...gemRows];

  console.log(`Loaded : ${topRows.length} top-cryptos + ${gemRows.length} hidden-gems = ${allRows.length} total`);

  // Deduplique sur coingecko_id (au cas ou meme coin dans les 2 datasets).
  const byId = new Map();
  for (const row of allRows) {
    if (!row.coingecko_id) {
      console.warn(`⚠️  Skipping entry without coingeckoId: slug=${row.slug}`);
      continue;
    }
    // Si doublon : top10 prioritaire sur hidden-gem (plus de field editoriaux)
    const existing = byId.get(row.coingecko_id);
    if (!existing || row.raw_data_snapshot?.editorial?.kind === "top10") {
      byId.set(row.coingecko_id, row);
    }
  }
  const dedup = Array.from(byId.values());
  console.log(`After dedup : ${dedup.length} unique coingecko_ids`);

  if (DRY_RUN) {
    console.log("\n[DRY RUN] Sample row preview (3 first) :");
    dedup.slice(0, 3).forEach((r) => {
      console.log(`\n  ${r.coingecko_id} (${r.symbol}) — ${r.name}`);
      console.log(`    slug=${r.slug} tier=${r.quality_tier} rank=${r.market_cap_rank}`);
      console.log(`    score_overall=${r.score_overall ?? "null"}`);
      console.log(`    editorial.kind=${r.raw_data_snapshot.editorial.kind}`);
    });
    console.log("\n✓ Dry run done. No DB writes.\n");
    return;
  }

  // Real migration
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error("❌ NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY required");
    console.error("   For dry-run preview without keys: --dry-run");
    process.exit(1);
  }

  const sb = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  console.log(`\nUpserting ${dedup.length} rows in batches of 25...`);
  let inserted = 0;
  let errors = 0;
  for (let i = 0; i < dedup.length; i += 25) {
    const batch = dedup.slice(i, i + 25);
    const { error } = await sb.from("cryptos").upsert(batch, { onConflict: "coingecko_id" });
    if (error) {
      console.error(`❌ Batch ${i}-${i + batch.length} error:`, error.message);
      errors++;
    } else {
      inserted += batch.length;
      console.log(`  ✓ ${inserted}/${dedup.length}`);
    }
  }

  console.log(`\n=== DONE ===`);
  console.log(`  Inserted/updated : ${inserted}`);
  console.log(`  Errors           : ${errors}`);
  console.log(`\nVerify : SELECT count(*), quality_tier FROM public.cryptos GROUP BY quality_tier;`);
}

main().catch((err) => {
  console.error("\n❌ Migration error:", err.message);
  console.error(err.stack);
  process.exit(1);
});
