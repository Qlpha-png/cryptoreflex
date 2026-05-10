#!/usr/bin/env node
/**
 * audit-missing-cryptos.mjs
 *
 * Identifie les coingecko_id en DB qui ne sont PAS dans le KV cg-static-details.
 * Pour chacun, tente CG search pour trouver le vrai ID (renommage probable).
 */

import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");

const { KV_REST_API_URL, KV_REST_API_TOKEN, NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env;

if (!KV_REST_API_URL || !NEXT_PUBLIC_SUPABASE_URL) {
  console.error("Missing env vars");
  process.exit(1);
}

// 1. All static + LLM ids
const top = JSON.parse(readFileSync(resolve(ROOT, "data/top-cryptos.json"), "utf-8"));
const gems = JSON.parse(readFileSync(resolve(ROOT, "data/hidden-gems.json"), "utf-8"));
const staticData = [...(top.topCryptos || []), ...(gems.hiddenGems || [])]
  .map((c) => ({ id: c.coingeckoId, name: c.name, symbol: c.symbol, source: "static" }));

const sbUrl = `${NEXT_PUBLIC_SUPABASE_URL.replace(/\/$/, "")}/rest/v1/cryptos?select=coingecko_id,name,symbol&is_published=eq.true&order=market_cap_rank.asc.nullslast&limit=1000`;
const sbRes = await fetch(sbUrl, {
  headers: {
    apikey: SUPABASE_SERVICE_ROLE_KEY,
    Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
  },
  signal: AbortSignal.timeout(15000),
});
const llmRows = await sbRes.json();
const llmData = llmRows
  .filter((r) => r.coingecko_id && !staticData.find((s) => s.id === r.coingecko_id))
  .map((r) => ({ id: r.coingecko_id, name: r.name, symbol: r.symbol, source: "llm" }));

const allData = [...staticData, ...llmData];
console.log(`[audit] Total expected: ${allData.length} (${staticData.length} static + ${llmData.length} LLM)`);

// 2. Read KV
const kvRes = await fetch(`${KV_REST_API_URL.replace(/\/$/, "")}/get/cg-static-details:v1`, {
  headers: { Authorization: `Bearer ${KV_REST_API_TOKEN}` },
});
const kvData = await kvRes.json();
const kvRecord = JSON.parse(kvData.result || "{}");
console.log(`[audit] In KV: ${Object.keys(kvRecord).length}`);

// 3. Find missing
const missing = allData.filter((c) => !kvRecord[c.id]);
console.log(`\n[audit] MISSING ${missing.length} ids:`);

// 4. For each missing, search CG for the correct ID
console.log("\n[audit] Searching CG for correct IDs...\n");
const renames = [];
for (const c of missing.slice(0, 50)) {
  try {
    const sUrl = `https://api.coingecko.com/api/v3/search?query=${encodeURIComponent(c.symbol)}`;
    const sr = await fetch(sUrl, { signal: AbortSignal.timeout(8000) });
    if (!sr.ok) {
      console.log(`  [${c.source}] ${c.id} (${c.symbol}) — CG search ${sr.status}`);
      await new Promise((r) => setTimeout(r, 1500));
      continue;
    }
    const sj = await sr.json();
    // Match exact symbol
    const candidates = (sj.coins || []).filter((co) => co.symbol?.toUpperCase() === c.symbol?.toUpperCase());
    const top1 = candidates[0];
    if (top1 && top1.id !== c.id) {
      console.log(`  [${c.source}] ${c.id} → ${top1.id} (${top1.name}, rank=${top1.market_cap_rank ?? "?"})`);
      renames.push({ from: c.id, to: top1.id, name: top1.name, source: c.source });
    } else if (top1) {
      console.log(`  [${c.source}] ${c.id} (${c.symbol}) — KEEP (CG ID ok mais pas dans top 250 du chunk)`);
    } else {
      console.log(`  [${c.source}] ${c.id} (${c.symbol}) — NO CG MATCH (orphan)`);
      renames.push({ from: c.id, to: null, name: c.name, source: c.source });
    }
    await new Promise((r) => setTimeout(r, 1500));
  } catch (err) {
    console.log(`  [${c.source}] ${c.id} — ERR ${err.message}`);
  }
}

console.log(`\n[audit] Renames identified: ${renames.length}`);
console.log(JSON.stringify(renames, null, 2));
