#!/usr/bin/env node
/**
 * populate-missing-only.mjs
 *
 * Populate KV uniquement pour les ids manquants (preserve existing).
 * Mini-chunks de 10 ids avec sleep 8s pour éviter 429.
 */

import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");

const { KV_REST_API_URL, KV_REST_API_TOKEN, NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env;

const KV_KEY = "cg-static-details:v1";
const TTL_SECONDS = 8 * 3600;
const MINI_CHUNK = 15;
const SLEEP_MS = 8000;

// Read existing KV
const kvRes = await fetch(`${KV_REST_API_URL.replace(/\/$/, "")}/get/${encodeURIComponent(KV_KEY)}`, {
  headers: { Authorization: `Bearer ${KV_REST_API_TOKEN}` },
  signal: AbortSignal.timeout(5000),
});
const kvData = await kvRes.json();
const record = JSON.parse(kvData.result || "{}");
console.log(`[missing] KV existing: ${Object.keys(record).length}`);

// All target ids
const top = JSON.parse(readFileSync(resolve(ROOT, "data/top-cryptos.json"), "utf-8"));
const gems = JSON.parse(readFileSync(resolve(ROOT, "data/hidden-gems.json"), "utf-8"));
const staticIds = [...(top.topCryptos || []), ...(gems.hiddenGems || [])]
  .map((c) => c.coingeckoId).filter(Boolean);

const sbUrl = `${NEXT_PUBLIC_SUPABASE_URL.replace(/\/$/, "")}/rest/v1/cryptos?select=coingecko_id&is_published=eq.true&order=market_cap_rank.asc.nullslast&limit=1000`;
const sbRes = await fetch(sbUrl, {
  headers: { apikey: SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}` },
});
const llmIds = (await sbRes.json()).map((r) => r.coingecko_id).filter(Boolean);

const allIds = Array.from(new Set([...staticIds, ...llmIds]));
const missing = allIds.filter((id) => !record[id]);
console.log(`[missing] Total ids: ${allIds.length}, missing: ${missing.length}`);

if (missing.length === 0) {
  console.log("[missing] Nothing to do, KV is complete!");
  process.exit(0);
}

// Mini-chunks
const chunks = [];
for (let i = 0; i < missing.length; i += MINI_CHUNK) {
  chunks.push(missing.slice(i, i + MINI_CHUNK));
}
console.log(`[missing] Will fetch ${chunks.length} mini-chunks of max ${MINI_CHUNK} ids`);

let added = 0;
for (let idx = 0; idx < chunks.length; idx++) {
  const chunk = chunks[idx];
  const url = `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=${chunk.join(
    ",",
  )}&order=market_cap_desc&per_page=${chunk.length}&page=1&sparkline=true&price_change_percentage=24h,7d`;

  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(20000) });
    if (!res.ok) {
      console.log(`  Chunk ${idx + 1}/${chunks.length} (${chunk.length} ids) — CG ${res.status}`);
      if (idx < chunks.length - 1) await new Promise((r) => setTimeout(r, SLEEP_MS * 2));
      continue;
    }
    const json = await res.json();
    let chunkAdded = 0;
    for (const c of json) {
      if (c?.id) {
        record[c.id] = c;
        chunkAdded++;
        added++;
      }
    }
    console.log(`  Chunk ${idx + 1}/${chunks.length} (${chunk.length} ids) — ${chunkAdded} added`);
  } catch (err) {
    console.log(`  Chunk ${idx + 1} ERR: ${err.message}`);
  }
  if (idx < chunks.length - 1) {
    await new Promise((r) => setTimeout(r, SLEEP_MS));
  }
}

const finalCount = Object.keys(record).length;
const sizeKB = Math.round(JSON.stringify(record).length / 1024);
console.log(`[missing] Total in KV now: ${finalCount} (+${added} added, ${sizeKB} KB)`);

const setUrl = `${KV_REST_API_URL.replace(/\/$/, "")}/set/${encodeURIComponent(KV_KEY)}?ex=${TTL_SECONDS}`;
const kvSetRes = await fetch(setUrl, {
  method: "POST",
  headers: { "Content-Type": "application/json", Authorization: `Bearer ${KV_REST_API_TOKEN}` },
  body: JSON.stringify(record),
});
console.log(`[missing] KV SET: ${kvSetRes.ok ? "OK" : "FAIL " + kvSetRes.status}`);
console.log(`[missing] DONE. Coverage: ${finalCount}/${allIds.length} (${Math.round(finalCount / allIds.length * 100)}%)`);
