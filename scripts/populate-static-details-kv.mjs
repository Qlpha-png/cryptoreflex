#!/usr/bin/env node
/**
 * scripts/populate-static-details-kv.mjs
 *
 * Workaround temporaire : le serveur Coolify est IP-banni par CoinGecko free
 * (autres workloads spam CG). Tant que /api/cron/refresh-static-details ne
 * peut pas tourner avec succès, on populate KV depuis une machine locale
 * (IP différente, pas bannie) directement via Upstash REST API.
 *
 * Usage :
 *   node scripts/populate-static-details-kv.mjs
 *
 * Env requis :
 *   KV_REST_API_URL    (ex: https://more-eft-106594.upstash.io)
 *   KV_REST_API_TOKEN
 *
 * Lit data/top-cryptos.json + data/hidden-gems.json pour la liste des
 * coingecko_id, fetch CG /coins/markets en 1 batch, stocke en KV
 * cg-static-details:v1 avec TTL 8h.
 */

import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");

const KV_URL = process.env.KV_REST_API_URL;
const KV_TOKEN = process.env.KV_REST_API_TOKEN;

if (!KV_URL || !KV_TOKEN) {
  console.error("Missing KV_REST_API_URL or KV_REST_API_TOKEN env vars");
  process.exit(1);
}

const KV_KEY = "cg-static-details:v1";
const TTL_SECONDS = 8 * 3600;

console.log("[populate-kv] Loading static datasets...");
const top = JSON.parse(readFileSync(resolve(ROOT, "data/top-cryptos.json"), "utf-8"));
const gems = JSON.parse(readFileSync(resolve(ROOT, "data/hidden-gems.json"), "utf-8"));

const ids = [
  ...(top.topCryptos || []),
  ...(gems.hiddenGems || []),
]
  .map((c) => c.coingeckoId)
  .filter(Boolean);

console.log(`[populate-kv] ${ids.length} coingecko_ids to fetch from CG`);

const url = `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=${ids.join(
  ",",
)}&order=market_cap_desc&per_page=${Math.min(ids.length, 250)}&page=1&sparkline=true&price_change_percentage=24h,7d`;

console.log("[populate-kv] Fetching CG /coins/markets batch...");
const cgRes = await fetch(url, { signal: AbortSignal.timeout(30000) });
if (!cgRes.ok) {
  console.error(`CG returned ${cgRes.status}: ${await cgRes.text()}`);
  process.exit(1);
}
const json = await cgRes.json();
const record = {};
for (const c of json) {
  if (c?.id) record[c.id] = c;
}
const fetched = Object.keys(record).length;
console.log(`[populate-kv] CG returned ${fetched}/${ids.length} entries`);

if (fetched === 0) {
  console.error("CG returned empty array");
  process.exit(1);
}

// Push to Upstash KV via SET command with EX TTL.
console.log(`[populate-kv] Pushing to Upstash KV (key=${KV_KEY}, ttl=${TTL_SECONDS}s)...`);
const setUrl = `${KV_URL.replace(/\/$/, "")}/set/${encodeURIComponent(KV_KEY)}?ex=${TTL_SECONDS}`;
const kvRes = await fetch(setUrl, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${KV_TOKEN}`,
  },
  body: JSON.stringify(record),
});

if (!kvRes.ok) {
  console.error(`KV SET failed: ${kvRes.status} ${await kvRes.text()}`);
  process.exit(1);
}

const kvBody = await kvRes.json();
console.log(`[populate-kv] KV SET response:`, kvBody);
console.log(`[populate-kv] DONE. ${fetched} entries stored in ${KV_KEY} with TTL ${TTL_SECONDS}s.`);
console.log(`[populate-kv] Sample IDs: ${Object.keys(record).slice(0, 5).join(", ")}, ...`);
