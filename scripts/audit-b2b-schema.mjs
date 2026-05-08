#!/usr/bin/env node
// ============================================================================
// audit-b2b-schema.mjs — Inventaire des tables existantes pour API B2B
// ============================================================================
// But : avant d'écrire la moindre migration, dresser l'inventaire EXACT du
//       schéma Supabase. Règle d'or imposée par le user :
//
//   "Si tables existent → l'API B2B LIT exclusivement depuis ces tables.
//    Ne crée jamais de tables parallèles."
//
// Sortie : audits/b2b-schema-report.json + log lisible stdout.
//
// Usage local :
//   NEXT_PUBLIC_SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... \
//     node scripts/audit-b2b-schema.mjs
//
// Usage CI : voir .github/workflows/audit-b2b-schema.yml
// ============================================================================

import { createClient } from "@supabase/supabase-js";
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error("❌ NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY required");
  process.exit(1);
}

const sb = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});

// Tables candidates : tout ce que la spec B2B et les routes API existantes
// peuvent vouloir lire ou écrire. On classe par domaine.
const CANDIDATES = {
  core: [
    "users",
    "audit_log",
    "stripe_webhook_events",
  ],
  b2b_auth: [
    "api_keys",
    "api_key_scopes",
    "rate_limit_buckets",
    "rate_limits",
  ],
  b2b_webhooks: [
    "webhooks",
    "webhook_subscriptions",
    "webhook_deliveries",
    "webhook_events",
  ],
  user_business: [
    "user_progress",
    "user_alerts",
    "user_push_subscriptions",
    "user_exchange_connections",
  ],
  user_trades_pmp: [
    "user_trades",
    "trades",
    "user_portfolio",
    "user_portfolio_positions",
    "portfolio_positions",
    "user_pmp",
    "pmp",
    "user_realized_pnl",
    "realized_pnl",
    "user_2086_exports",
    "exports_2086",
    "cerfa_2086_exports",
  ],
  catalog: [
    "cryptos",
    "platforms",
    "events",
  ],
  newsletter: [
    "newsletter_subscribers",
    "newsletter_unsubscribes",
  ],
};

async function probeTable(table) {
  // Essai 1 : SELECT * LIMIT 1.
  // Cas A : data ≠ null && length > 0  → table existe + sample row.
  // Cas B : data ≠ null && length === 0 → table existe mais vide.
  // Cas C : error.code === "42P01"     → table n'existe pas.
  // Cas D : autre erreur                → permission / RLS / inconnu.
  try {
    const { data, error, count } = await sb
      .from(table)
      .select("*", { count: "exact", head: false })
      .limit(1);

    if (error) {
      const code = error.code || "unknown";
      const isMissing = code === "42P01" || /does not exist/i.test(error.message || "");
      return {
        table,
        exists: !isMissing,
        error: error.message,
        code,
        rows: null,
        columns: null,
        sample: null,
      };
    }

    const sampleRow = data && data.length > 0 ? data[0] : null;
    const columns = sampleRow ? Object.keys(sampleRow) : null;

    return {
      table,
      exists: true,
      error: null,
      code: null,
      rows: typeof count === "number" ? count : null,
      columns,
      sample: sampleRow,
    };
  } catch (e) {
    return {
      table,
      exists: false,
      error: String(e?.message || e),
      code: "exception",
      rows: null,
      columns: null,
      sample: null,
    };
  }
}

function maskSensitive(value) {
  if (typeof value !== "string") return value;
  if (value.length > 32) return `${value.slice(0, 8)}…(${value.length} chars)`;
  return value;
}

function sanitize(sample) {
  if (!sample || typeof sample !== "object") return sample;
  const out = {};
  for (const [k, v] of Object.entries(sample)) {
    if (
      /token|secret|hash|key|password|encrypted|cipher/i.test(k) &&
      typeof v === "string"
    ) {
      out[k] = `[REDACTED:${v.length}chars]`;
    } else if (typeof v === "string") {
      out[k] = maskSensitive(v);
    } else {
      out[k] = v;
    }
  }
  return out;
}

async function main() {
  console.log("🔍 Audit B2B schema — Cryptoreflex Supabase");
  console.log(`   URL: ${url}`);
  console.log("");

  const report = {
    generated_at: new Date().toISOString(),
    supabase_url: url,
    domains: {},
    summary: {
      total_candidates: 0,
      existing: 0,
      missing: 0,
      errors: 0,
    },
  };

  for (const [domain, tables] of Object.entries(CANDIDATES)) {
    console.log(`\n── ${domain} ──`);
    report.domains[domain] = [];
    for (const t of tables) {
      report.summary.total_candidates++;
      const r = await probeTable(t);
      r.sample = sanitize(r.sample);
      report.domains[domain].push(r);

      if (r.exists) {
        report.summary.existing++;
        const cols = r.columns ? r.columns.length : "?";
        const rows = r.rows ?? "?";
        console.log(
          `   ✅ ${t.padEnd(36)} cols:${cols}  rows:${rows}` +
            (r.columns ? `\n      ${r.columns.join(", ")}` : "")
        );
      } else if (r.code === "42P01" || /does not exist/i.test(r.error || "")) {
        report.summary.missing++;
        console.log(`   ❌ ${t.padEnd(36)} (does not exist)`);
      } else {
        report.summary.errors++;
        console.log(`   ⚠️  ${t.padEnd(36)} error: ${r.error} (${r.code})`);
      }
    }
  }

  console.log("\n──────────────────────────────────────────────");
  console.log(
    `Total: ${report.summary.total_candidates} | ` +
      `Exist: ${report.summary.existing} | ` +
      `Missing: ${report.summary.missing} | ` +
      `Errors: ${report.summary.errors}`
  );

  const outPath = "audits/b2b-schema-report.json";
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, JSON.stringify(report, null, 2), "utf-8");
  console.log(`\n📄 Rapport JSON : ${outPath}`);
}

main().catch((e) => {
  console.error("❌ Fatal:", e);
  process.exit(1);
});
