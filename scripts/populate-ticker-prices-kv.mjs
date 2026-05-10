#!/usr/bin/env node
/**
 * scripts/populate-ticker-prices-kv.mjs
 *
 * Workaround : populate KV cg-ticker-prices:v1 depuis local (IP non bannie).
 *
 * Usage : node scripts/populate-ticker-prices-kv.mjs
 * Env requis : KV_REST_API_URL, KV_REST_API_TOKEN
 */

const KV_URL = process.env.KV_REST_API_URL;
const KV_TOKEN = process.env.KV_REST_API_TOKEN;

if (!KV_URL || !KV_TOKEN) {
  console.error("Missing KV_REST_API_URL or KV_REST_API_TOKEN");
  process.exit(1);
}

const KV_KEY = "cg-ticker-prices:v1";
const TTL_SECONDS = 360;

console.log("[ticker-kv] Fetching CG /coins/markets top 50...");
const url = "https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=50&page=1&sparkline=false&price_change_percentage=24h";
const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
if (!res.ok) {
  console.error(`CG ${res.status}`);
  process.exit(1);
}
const json = await res.json();

const record = {};
for (const c of json) {
  if (!c?.id) continue;
  record[c.id] = {
    id: c.id,
    symbol: c.symbol.toUpperCase(),
    name: c.name,
    image: c.image,
    price: c.current_price ?? 0,
    change24h: c.price_change_percentage_24h ?? 0,
    marketCap: c.market_cap ?? 0,
  };
}

const fetched = Object.keys(record).length;
console.log(`[ticker-kv] CG returned ${fetched} entries`);

const setUrl = `${KV_URL.replace(/\/$/, "")}/set/${encodeURIComponent(KV_KEY)}?ex=${TTL_SECONDS}`;
const kvRes = await fetch(setUrl, {
  method: "POST",
  headers: { "Content-Type": "application/json", Authorization: `Bearer ${KV_TOKEN}` },
  body: JSON.stringify(record),
});

if (!kvRes.ok) {
  console.error(`KV SET failed: ${kvRes.status}`);
  process.exit(1);
}

const kvBody = await kvRes.json();
console.log(`[ticker-kv] KV SET response:`, kvBody);
console.log(`[ticker-kv] DONE. ${fetched} entries in ${KV_KEY} (TTL ${TTL_SECONDS}s)`);
