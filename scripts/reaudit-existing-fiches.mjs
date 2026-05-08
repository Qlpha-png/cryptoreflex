#!/usr/bin/env node
// ============================================================================
// reaudit-existing-fiches.mjs — re-applique le validator règle des 3 sur
// toutes les fiches LLM existantes, avec le code fixé (commit dbe7e24+).
// ============================================================================
// Usage :
//   NEXT_PUBLIC_SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... \
//     node scripts/reaudit-existing-fiches.mjs [--dry-run]
//
// Fait :
//   - SELECT toutes les fiches source='llm-pipeline' (89 actuellement).
//   - Re-applique auditRegleDes3 (validator avec fix regex CJK + parens).
//   - UPDATE en DB :
//       fact_check_score = nouveau audit.overall
//       needs_review     = !audit.passed
//       llm_content._audit = nouveau breakdown + issues
//   - Rapport stdout : avant/après, fiches qui montent/descendent, fiches
//     restantes sub-100%.
//
// Idempotent : peut être relancé. Aucun appel LLM, juste validator local.
// ============================================================================

import { createClient } from "@supabase/supabase-js";

const DRY_RUN = process.argv.includes("--dry-run");

function countMatches(text, regex) {
  if (!text || typeof text !== "string") return 0;
  const matches = text.match(regex);
  return matches ? matches.length : 0;
}

// Copy verbatim de auditRegleDes3 depuis batch-generate-fiches.mjs (commit dbe7e24).
function auditRegleDes3(parsed, rawData) {
  const issues = [];
  const c = parsed ?? {};
  const name = rawData?.name ?? "";
  const symbol = rawData?.symbol ?? "";
  const corpus = [
    c.tldr ?? "",
    c.thesis ?? "",
    c.howItWorks ?? "",
    c.tokenomics ?? "",
    c.metrics?.narrative ?? "",
    c.frEuStatus ?? "",
  ].join("\n\n");

  const tuCount = countMatches(corpus, /\b(tu|te|toi|ton|tes|t')\b/gi);
  const vousCount = countMatches(corpus, /\b(vous|votre|vos)\b/gi);
  const tutoiementScore = Math.min(100, Math.max(0, tuCount * 5 - vousCount * 10));
  if (tuCount < 5) issues.push(`tutoiement insuffisant (${tuCount}/5)`);
  if (vousCount > 2) issues.push(`vouvoiement (${vousCount})`);

  const escapeRe = (s) => String(s || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const nameTokens = String(name || "")
    .split(/[\s()[\],\/\-]+/)
    .filter((t) => t.length >= 4)
    .map(escapeRe);
  const nameRegexes = [];
  if (nameTokens.length > 0) {
    nameRegexes.push(new RegExp(`\\b${nameTokens[0]}\\b`, "gi"));
    if (nameTokens.length > 1 && nameTokens[nameTokens.length - 1] !== nameTokens[0]) {
      nameRegexes.push(new RegExp(`\\b${nameTokens[nameTokens.length - 1]}\\b`, "gi"));
    }
  }
  const symbolEsc = escapeRe(symbol);
  const symbolMatches = symbolEsc
    ? countMatches(corpus, new RegExp(`\\b${symbolEsc}\\b`, "gi"))
    : 0;
  const nameMatches = nameRegexes.reduce(
    (acc, re) => acc + countMatches(corpus, re),
    0,
  );
  const nameSymbolMentions = symbolMatches + nameMatches;
  const numberMentions = countMatches(
    corpus,
    /\$[\d.,]+\s?(?:[BKMbillionsmillemilliers]+)?|\d+[.,]?\d*\s?%|\d+[.,]?\d*\s?(?:M|B|k|TPS|tx)/g,
  );
  const personalizationScore = Math.min(
    100,
    Math.round((nameSymbolMentions / 3) * 30 + (numberMentions / 10) * 70),
  );
  if (nameSymbolMentions < 3) issues.push(`name mentions (${nameSymbolMentions}/3)`);
  if (numberMentions < 5) issues.push(`chiffres specifiques (${numberMentions}/5)`);

  // Validator IDENTIQUE à scripts/batch-generate-fiches.mjs auditRegleDes3 :
  // depthTotal=6, thesis seuil 150 (pas 200).
  const wordCount = (s) => (s ? s.split(/\s+/).filter(Boolean).length : 0);
  const wThesis = wordCount(c.thesis);
  const wHow = wordCount(c.howItWorks);
  const wTok = wordCount(c.tokenomics);
  const wFR = wordCount(c.frEuStatus);
  const risksCategories = new Set(
    (Array.isArray(c.risks) ? c.risks : []).map((r) => r?.category).filter(Boolean),
  ).size;
  const competitorsCount = Array.isArray(c.competitors) ? c.competitors.length : 0;
  let depthChecks = 0;
  const depthTotal = 6;
  if (wThesis >= 150) depthChecks++;
  else issues.push(`thesis (${wThesis}/150)`);
  if (wHow >= 200) depthChecks++;
  else issues.push(`howItWorks (${wHow}/200)`);
  if (wTok >= 200) depthChecks++;
  else issues.push(`tokenomics (${wTok}/200)`);
  if (wFR >= 150) depthChecks++;
  else issues.push(`frEuStatus (${wFR}/150)`);
  if (risksCategories >= 3) depthChecks++;
  else issues.push(`risks categs (${risksCategories}/3)`);
  if (competitorsCount >= 3) depthChecks++;
  else issues.push(`competitors (${competitorsCount}/3)`);
  const depthScore = Math.round((depthChecks / depthTotal) * 100);

  const overall = Math.round(
    tutoiementScore * 0.3 + personalizationScore * 0.35 + depthScore * 0.35,
  );
  const passed =
    overall >= 70 && tutoiementScore >= 50 && personalizationScore >= 60 && depthScore >= 70;

  return {
    overall,
    passed,
    breakdown: {
      tutoiementScore,
      personalizationScore,
      depthScore,
      tuCount,
      nameSymbolMentions,
      numberMentions,
      wThesis,
      wHow,
      wTok,
      wFR,
    },
    issues,
  };
}

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error("Missing env: NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY");
    process.exit(1);
  }
  const sb = createClient(url, key, { auth: { persistSession: false } });

  console.log(`=== Re-audit existing LLM fiches${DRY_RUN ? " (DRY RUN)" : ""} ===\n`);

  const { data: fiches, error } = await sb
    .from("cryptos")
    .select("coingecko_id, name, symbol, market_cap_rank, fact_check_score, llm_content, llm_model")
    .eq("source", "llm-pipeline")
    .order("market_cap_rank", { ascending: true });

  if (error) {
    console.error("SELECT error:", error);
    process.exit(1);
  }

  console.log(`Loaded ${fiches.length} LLM fiches.\n`);

  const updates = [];
  const stats = {
    total: fiches.length,
    perfect: 0,
    improved: 0,
    degraded: 0,
    unchanged: 0,
    stillSubPerfect: [],
  };

  for (const f of fiches) {
    const oldScore = f.fact_check_score ?? 0;
    const llm = f.llm_content || {};

    // Le validator a besoin de `parsed` (fields tldr/thesis/etc.) + `rawData` (name/symbol).
    // llm_content contient déjà tout sauf _audit. On reconstruit rawData minimal.
    const parsed = { ...llm };
    delete parsed._audit; // ne pas inclure l'audit dans le corpus
    const rawData = { name: f.name, symbol: f.symbol };

    const newAudit = auditRegleDes3(parsed, rawData);
    const newScore = newAudit.overall;
    const newNeedsReview = !newAudit.passed;

    let delta = newScore - oldScore;
    if (delta > 0) stats.improved++;
    else if (delta < 0) stats.degraded++;
    else stats.unchanged++;
    if (newScore === 100) stats.perfect++;
    if (newScore < 100) {
      stats.stillSubPerfect.push({
        coingecko_id: f.coingecko_id,
        name: f.name,
        rank: f.market_cap_rank,
        oldScore,
        newScore,
        issues: newAudit.issues,
        breakdown: newAudit.breakdown,
      });
    }

    updates.push({
      coingecko_id: f.coingecko_id,
      newScore,
      newNeedsReview,
      newAudit,
      llm_content: { ...llm, _audit: newAudit },
    });
  }

  console.log("=== STATS ===");
  console.log(`  total fiches  : ${stats.total}`);
  console.log(`  perfect (100) : ${stats.perfect}`);
  console.log(`  improved      : ${stats.improved}`);
  console.log(`  degraded      : ${stats.degraded}`);
  console.log(`  unchanged     : ${stats.unchanged}`);
  console.log(`  still sub-100 : ${stats.stillSubPerfect.length}\n`);

  if (stats.stillSubPerfect.length > 0) {
    console.log("=== Fiches encore sub-100% ===");
    for (const f of stats.stillSubPerfect) {
      console.log(`  ${f.coingecko_id} (rank ${f.rank}) ${f.name}`);
      console.log(`    score: ${f.oldScore} → ${f.newScore}`);
      console.log(`    issues: ${f.issues.join(" | ")}`);
      console.log(
        `    breakdown: tu=${f.breakdown.tutoiementScore} perso=${f.breakdown.personalizationScore} depth=${f.breakdown.depthScore}`,
      );
    }
    console.log();
  }

  if (DRY_RUN) {
    console.log("DRY RUN — no DB writes.");
    return;
  }

  console.log("=== UPDATE DB ===");
  let updated = 0;
  let failed = 0;
  for (const u of updates) {
    const { error: upErr } = await sb
      .from("cryptos")
      .update({
        fact_check_score: u.newScore,
        needs_review: u.newNeedsReview,
        llm_content: u.llm_content,
      })
      .eq("coingecko_id", u.coingecko_id);
    if (upErr) {
      console.error(`  ❌ ${u.coingecko_id}: ${upErr.message}`);
      failed++;
    } else {
      updated++;
    }
  }
  console.log(`  ✓ updated ${updated}, failed ${failed}`);
}

main().catch((e) => {
  console.error("Fatal:", e);
  process.exit(1);
});
