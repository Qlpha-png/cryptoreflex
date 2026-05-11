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

// Generate keys
function genId(prefix, len = 12) {
  // Cohérent avec le format observé : cr_pk_test_NMHW0D8K72A2 (12 chars majuscules+chiffres)
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let s = prefix;
  const buf = randomBytes(len);
  for (let i = 0; i < len; i++) s += chars[buf[i] % chars.length];
  return s;
}

const tierPrefix = tier === "production" ? "live" : "test";
const publicKey = genId(`cr_pk_${tierPrefix}_`, 12);
const secretToken = genId(`cr_sk_${tierPrefix}_`, 32);
const secretPrefix = secretToken.slice(0, 18) + "…";

// Hash secret with scrypt + pepper (1ère pepper de la liste = current)
const peppers = API_KEY_PEPPER.split(",").map((s) => s.trim()).filter(Boolean);
const pepper = peppers[0];
const salt = randomBytes(16);
const derived = await scrypt(`${secretToken}${pepper}`, salt, 64, {
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
