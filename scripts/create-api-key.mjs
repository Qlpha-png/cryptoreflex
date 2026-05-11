#!/usr/bin/env node
/**
 * scripts/create-api-key.mjs
 *
 * Crée une nouvelle API key Cryptoreflex pour usage personnel (IA, scripts, etc).
 * Affiche le secret en clair UNE SEULE FOIS — copier immédiatement.
 *
 * Usage :
 *   node scripts/create-api-key.mjs --label "Mon IA personnelle" --tier sandbox
 *
 * Env requis :
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *   API_KEY_PEPPER
 */

import { randomBytes, scrypt as scryptCb } from "node:crypto";
import { promisify } from "node:util";

const scrypt = promisify(scryptCb);

const { NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, API_KEY_PEPPER } = process.env;

if (!NEXT_PUBLIC_SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !API_KEY_PEPPER) {
  console.error("Missing env: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, API_KEY_PEPPER");
  process.exit(1);
}

// Parse args
const args = process.argv.slice(2);
const labelIdx = args.indexOf("--label");
const tierIdx = args.indexOf("--tier");
const userIdIdx = args.indexOf("--user-id");

const label = labelIdx >= 0 ? args[labelIdx + 1] : "Personal IA Key";
const tier = tierIdx >= 0 ? args[tierIdx + 1] : "sandbox";
const userId = userIdIdx >= 0 ? args[userIdIdx + 1] : null;

if (!userId) {
  console.error("Missing --user-id <uuid>. Find your user_id via Supabase auth dashboard.");
  console.error("Usage: node scripts/create-api-key.mjs --label \"My IA\" --tier sandbox --user-id <uuid>");
  process.exit(1);
}

// Generate keys (FORMAT OFFICIEL : cohérent avec lib/api-keys/format.ts)
const CROCKFORD = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
function encodeCrockford(buf, length) {
  const bits = [];
  for (const byte of buf) for (let i = 7; i >= 0; i--) bits.push((byte >> i) & 1);
  let out = "";
  for (let i = 0; i < bits.length; i += 5) {
    const slice = bits.slice(i, i + 5);
    if (slice.length < 5) break;
    let v = 0;
    for (const b of slice) v = (v << 1) | b;
    out += CROCKFORD[v];
    if (out.length === length) break;
  }
  return out;
}

const envSlug = tier === "production" ? "live" : "test";
const keyId = encodeCrockford(randomBytes(8), 12);   // 12 chars Crockford
const secret = encodeCrockford(randomBytes(32), 48); // 48 chars Crockford
const publicKey = `cr_pk_${envSlug}_${keyId}`;
const secretToken = `cr_sk_${envSlug}_${keyId}_${secret}`; // FORMAT 4 segments !
const secretPrefix = `cr_sk_${envSlug}_${keyId.slice(0, 6)}…`;

// Hash secret avec PEPPER AVANT SECRET (cohérent avec lib/api-keys/hash.ts:hashSecret)
const peppers = API_KEY_PEPPER.split(",").map((s) => s.trim()).filter(Boolean);
const pepper = peppers[0];
const salt = randomBytes(16);
const derived = await scrypt(`${pepper}${secret}`, salt, 64, { // PEPPER FIRST
  N: 16384,
  r: 8,
  p: 1,
  maxmem: 64 * 1024 * 1024,
});
const secretHash = `scrypt$16384$8$1$${salt.toString("hex")}$${derived.toString("hex")}`;

// Insert in DB
const expiresAt = new Date(Date.now() + 365 * 24 * 3600 * 1000).toISOString(); // +1 an
const insertUrl = `${NEXT_PUBLIC_SUPABASE_URL.replace(/\/$/, "")}/rest/v1/api_keys`;
const res = await fetch(insertUrl, {
  method: "POST",
  headers: {
    apikey: SUPABASE_SERVICE_ROLE_KEY,
    Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
    "Content-Type": "application/json",
    Prefer: "return=representation",
  },
  body: JSON.stringify({
    user_id: userId,
    public_key: publicKey,
    secret_hash: secretHash,
    secret_prefix: secretPrefix,
    label,
    tier,
    scopes: ["public:read", "user:portfolio:read", "user:trades:read"],
    status: "active",
    expires_at: expiresAt,
  }),
});

if (!res.ok) {
  console.error(`Insert failed: ${res.status} ${await res.text()}`);
  process.exit(1);
}

const created = (await res.json())[0];

console.log("\n✅ API KEY CRÉÉE — copie le secret MAINTENANT (ne sera plus jamais affiché) :\n");
console.log("─".repeat(70));
console.log(`Label       : ${label}`);
console.log(`Tier        : ${tier}`);
console.log(`Public Key  : ${publicKey}`);
console.log(`Secret Token: ${secretToken}`);
console.log(`Expires At  : ${expiresAt}`);
console.log(`ID          : ${created.id}`);
console.log("─".repeat(70));
console.log("\n📋 Usage IA :");
console.log(`   curl -H "Authorization: Bearer ${publicKey}.${secretToken}" \\`);
console.log(`        https://www.cryptoreflex.fr/api/v1/...`);
console.log("\n⚠️  Stocke ce secret dans 1Password / .env de ton IA — perdu = à régénérer.");
