#!/usr/bin/env node
/**
 * scripts/compute-platform-scores.mjs
 *
 * Recompute le bloc `scoring` de chaque plateforme dans data/platforms.json
 * en s'appuyant sur la formule officielle publiée sur /methodologie :
 *
 *   global = 0.20·fees + 0.25·security + 0.20·mica + 0.15·ux
 *          + 0.10·support + 0.10·catalogue
 *
 * Et dérive `catalogue` (jusqu'ici manquant) à partir des données déjà
 * présentes dans le JSON :
 *   - cryptos.totalCount
 *   - cryptos.stakingAvailable
 *   - deposit.methods.length
 *   - id ∈ MULTI_ASSET_BROKER_IDS (broker actions/ETF/métaux)
 *
 * Lance ce script à chaque fois que :
 *   - tu modifies un sous-score (fees/security/ux/support/mica) à la main,
 *   - tu ajoutes ou retires une plateforme,
 *   - tu changes les poids dans lib/scoring.ts (et /methodologie page).
 *
 * Usage :
 *   node scripts/compute-platform-scores.mjs            # write
 *   node scripts/compute-platform-scores.mjs --dry-run  # preview seulement
 */

import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_PATH = path.resolve(__dirname, "..", "data", "platforms.json");
const DRY_RUN = process.argv.includes("--dry-run");

// ─── Constantes (mirror de lib/scoring.ts — keep in sync !) ─────────────────

const SCORING_WEIGHTS = {
  fees: 0.2,
  security: 0.25,
  mica: 0.2,
  ux: 0.15,
  support: 0.1,
  catalogue: 0.1,
};

const MULTI_ASSET_BROKER_IDS = new Set([
  "bitpanda",
  "trade-republic",
  "revolut",
  "swissborg",
]);

// ─── Helpers ────────────────────────────────────────────────────────────────

function round1(n) {
  return Math.round(n * 10) / 10;
}

function computeCatalogueScore({
  totalCryptos,
  stakingAvailable,
  paymentMethodsCount,
  isMultiAssetBroker,
}) {
  const n = Math.max(0, totalCryptos);
  let base;
  if (n <= 30) base = 2.5;
  else if (n <= 100) base = 3.0 + ((n - 30) / 70) * 0.5;
  else if (n <= 300) base = 3.5 + ((n - 100) / 200) * 0.8;
  else if (n <= 500) base = 4.3 + ((n - 300) / 200) * 0.4;
  else if (n <= 700) base = 4.7 + ((n - 500) / 200) * 0.2;
  else base = 5.0;

  let bonus = 0;
  if (stakingAvailable) bonus += 0.3;
  if (paymentMethodsCount >= 5) bonus += 0.2;
  if (isMultiAssetBroker) bonus += 0.3;

  return round1(Math.min(5, base + bonus));
}

function computeGlobalScore(sub) {
  return round1(
    sub.fees * SCORING_WEIGHTS.fees +
      sub.security * SCORING_WEIGHTS.security +
      sub.mica * SCORING_WEIGHTS.mica +
      sub.ux * SCORING_WEIGHTS.ux +
      sub.support * SCORING_WEIGHTS.support +
      sub.catalogue * SCORING_WEIGHTS.catalogue,
  );
}

// ─── Run ────────────────────────────────────────────────────────────────────

async function main() {
  const raw = await readFile(DATA_PATH, "utf-8");
  const data = JSON.parse(raw);

  if (!Array.isArray(data.platforms)) {
    console.error("data.platforms n'est pas un tableau — fichier corrompu ?");
    process.exit(1);
  }

  console.log(`\n📊 Recalcul scoring pour ${data.platforms.length} plateformes\n`);
  console.log(
    "ID".padEnd(18) +
      "Cat".padStart(5) +
      "  Fees".padStart(8) +
      "  Sec".padStart(8) +
      "  MiCA".padStart(8) +
      "  UX".padStart(8) +
      "  Sup".padStart(8) +
      "  =>Glob".padStart(10) +
      "   (was)".padStart(10),
  );
  console.log("─".repeat(88));

  let driftCount = 0;
  for (const p of data.platforms) {
    const totalCryptos = p?.cryptos?.totalCount ?? 0;
    const stakingAvailable = Boolean(p?.cryptos?.stakingAvailable);
    const paymentMethodsCount = Array.isArray(p?.deposit?.methods)
      ? p.deposit.methods.length
      : 0;
    const isMultiAssetBroker = MULTI_ASSET_BROKER_IDS.has(p.id);

    const catalogue = computeCatalogueScore({
      totalCryptos,
      stakingAvailable,
      paymentMethodsCount,
      isMultiAssetBroker,
    });

    const sub = {
      fees: p.scoring.fees,
      security: p.scoring.security,
      mica: p.scoring.mica,
      ux: p.scoring.ux,
      support: p.scoring.support,
      catalogue,
    };
    const newGlobal = computeGlobalScore(sub);
    const oldGlobal = p.scoring.global;
    const drift = Math.abs(newGlobal - oldGlobal);
    const driftFlag = drift > 0.05 ? " ⚠️" : "";
    if (drift > 0.05) driftCount++;

    p.scoring = {
      global: newGlobal,
      fees: sub.fees,
      security: sub.security,
      ux: sub.ux,
      support: sub.support,
      mica: sub.mica,
      catalogue: sub.catalogue,
    };

    console.log(
      p.id.padEnd(18) +
        String(catalogue).padStart(5) +
        String(sub.fees).padStart(8) +
        String(sub.security).padStart(8) +
        String(sub.mica).padStart(8) +
        String(sub.ux).padStart(8) +
        String(sub.support).padStart(8) +
        String(newGlobal).padStart(10) +
        ("  (" + oldGlobal + ")").padStart(10) +
        driftFlag,
    );
  }

  console.log("─".repeat(88));
  console.log(
    `\n${data.platforms.length} plateformes recalculées — ${driftCount} drifts > 0.05 vs ancien global.\n`,
  );

  // Met à jour le _meta.lastScored
  data._meta = data._meta ?? {};
  data._meta.lastScored = new Date().toISOString().slice(0, 10);
  data._meta.scoringFormula =
    "global = 0.20·fees + 0.25·security + 0.20·mica + 0.15·ux + 0.10·support + 0.10·catalogue";

  if (DRY_RUN) {
    console.log("🔍 --dry-run : aucune écriture (relance sans le flag pour appliquer)");
    return;
  }

  await writeFile(DATA_PATH, JSON.stringify(data, null, 2) + "\n", "utf-8");
  console.log(`✅ data/platforms.json mis à jour — _meta.lastScored = ${data._meta.lastScored}`);
}

main().catch((e) => {
  console.error("[compute-platform-scores] ERREUR :", e);
  process.exit(1);
});
