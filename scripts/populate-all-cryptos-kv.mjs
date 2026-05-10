#!/usr/bin/env node
/**
 * scripts/populate-all-cryptos-kv.mjs
 *
 * Workaround : populate KV cg-static-details:v1 avec TOUTES les 780 fiches
 * (100 static + 680 LLM via Supabase) depuis local (IP non bannie).
 *
 * Usage : node scripts/populate-all-cryptos-kv.mjs
 *
 * Env requis :
 *   KV_REST_API_URL, KV_REST_API_TOKEN
 *   NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 */

import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");

const { KV_REST_API_URL, KV_REST_API_TOKEN, NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env;

if (!KV_REST_API_URL || !KV_REST_API_TOKEN) {
  console.error("Missing KV_REST_API_URL or KV_REST_API_TOKEN");
  process.exit(1);
}

const KV_KEY = "cg-static-details:v1";
const TTL_SECONDS = 8 * 3600;
const CHUNK_SIZE = 250;
const SLEEP_BETWEEN_CHUNKS_MS = 2000;

// 1. Static IDs from JSON
const top = JSON.parse(readFileSync(resolve(ROOT, "data/top-cryptos.json"), "utf-8"));
const gems = JSON.parse(readFileSync(resolve(ROOT, "data/hidden-gems.json"), "utf-8"));
const staticIds = [...(top.topCryptos || []), ...(gems.hiddenGems || [])]
  .map((c) => c.coingeckoId)
  .filter(Boolean);

console.log(`[populate-all] ${staticIds.length} static ids`);

// 2. LLM ids from Supabase REST (service role)
let llmIds = [];
if (NEXT_PUBLIC_SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
  try {
    const sbUrl = `${NEXT_PUBLIC_SUPABASE_URL.replace(/\/$/, "")}/rest/v1/cryptos?select=coingecko_id&is_published=eq.true&order=market_cap_rank.asc.nullslast&limit=1000`;
    const sbRes = await fetch(sbUrl, {
      headers: {
        apikey: SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        "Content-Type": "application/json",
      },
      signal: AbortSignal.timeout(15000),
    });
    if (sbRes.ok) {
      const rows = await sbRes.json();
      llmIds = rows
        .map((r) => r.coingecko_id)
        .filter((id) => id && !staticIds.includes(id));
      console.log(`[populate-all] ${llmIds.length} LLM ids from Supabase`);
    } else {
      console.warn(`[populate-all] Supabase ${sbRes.status} — skipping LLM`);
    }
  } catch (err) {
    console.warn(`[populate-all] Supabase fetch failed: ${err.message}`);
  }
} else {
  console.warn("[populate-all] No Supabase env — skipping LLM");
}

const allIds = Array.from(new Set([...staticIds, ...llmIds]));
console.log(`[populate-all] Total ${allIds.length} ids in ${Math.ceil(allIds.length / CHUNK_SIZE)} chunks`);

// 3. Read existing KV to preserve entries from previous runs
let record = {};
try {
  const getUrl = `${KV_REST_API_URL.replace(/\/$/, "")}/get/${encodeURIComponent(KV_KEY)}`;
  const getRes = await fetch(getUrl, {
    headers: { Authorization: `Bearer ${KV_REST_API_TOKEN}` },
    signal: AbortSignal.timeout(5000),
  });
  if (getRes.ok) {
    const data = await getRes.json();
    if (typeof data.result === "string" && data.result.length > 0) {
      record = JSON.parse(data.result);
      console.log(`[populate-all] Preserved ${Object.keys(record).length} existing KV entries`);
    }
  }
} catch (err) {
  console.warn(`[populate-all] KV read failed: ${err.message} — starting fresh`);
}

// Fetch CG in chunks (skip ids already in record to save quota)
const missingIds = allIds.filter((id) => !record[id]);
console.log(`[populate-all] ${missingIds.length} missing ids to fetch (skipping ${allIds.length - missingIds.length} already cached)`);

const chunks = [];
for (let i = 0; i < missingIds.length; i += CHUNK_SIZE) {
  chunks.push(missingIds.slice(i, i + CHUNK_SIZE));
}

for (let idx = 0; idx < chunks.length; idx++) {
  const chunk = chunks[idx];
  const url = `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=${chunk.join(
    ",",
  )}&order=market_cap_desc&per_page=${chunk.length}&page=1&sparkline=true&price_change_percentage=24h,7d`;

  console.log(`[populate-all] Chunk ${idx + 1}/${chunks.length} (${chunk.length} ids)...`);
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(30000) });
    if (!res.ok) {
      console.warn(`  CG ${res.status} — skip chunk`);
      continue;
    }
    const json = await res.json();
    let added = 0;
    for (const c of json) {
      if (c?.id) {
        record[c.id] = c;
        added++;
      }
    }
    console.log(`  ${added} entries added (total: ${Object.keys(record).length})`);
  } catch (err) {
    console.warn(`  Chunk ${idx + 1} failed: ${err.message}`);
  }
  if (idx < chunks.length - 1) {
    await new Promise((r) => setTimeout(r, SLEEP_BETWEEN_CHUNKS_MS));
  }
}

const fetched = Object.keys(record).length;
console.log(`[populate-all] Total fetched: ${fetched}/${allIds.length}`);

if (fetched === 0) {
  console.error("All chunks failed");
  process.exit(1);
}

// 4. Push to KV
const sizeKB = Math.round(JSON.stringify(record).length / 1024);
console.log(`[populate-all] Pushing ${fetched} entries (${sizeKB} KB) to KV...`);
const setUrl = `${KV_REST_API_URL.replace(/\/$/, "")}/set/${encodeURIComponent(KV_KEY)}?ex=${TTL_SECONDS}`;
const kvRes = await fetch(setUrl, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${KV_REST_API_TOKEN}`,
  },
  body: JSON.stringify(record),
});

if (!kvRes.ok) {
  console.error(`KV SET failed: ${kvRes.status} ${await kvRes.text()}`);
  process.exit(1);
}

const kvBody = await kvRes.json();
console.log(`[populate-all] KV SET response:`, kvBody);
console.log(`[populate-all] DONE. ${fetched} entries in ${KV_KEY} (TTL ${TTL_SECONDS}s, ${sizeKB} KB)`);
