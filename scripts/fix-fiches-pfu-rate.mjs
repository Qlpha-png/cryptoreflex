#!/usr/bin/env node
/**
 * scripts/fix-fiches-pfu-rate.mjs
 *
 * Corrige le taux PFU obsolète « 30 % » → « 31,4 % » dans le champ `llm_content`
 * des fiches crypto stockées en base Supabase (table public.cryptos).
 *
 * CONTEXTE : ~680 fiches LLM ont été générées AVANT la correction des prompts
 * et affichent « flat tax 30 % » / « PFU 30 % » au lieu du taux 2026 = 31,4 %
 * (12,8 % IR + 18,6 % prélèvements sociaux, hausse CSG LFSS 2026). Les prompts
 * de génération sont désormais corrigés (plus de récurrence) ; ce script répare
 * le stock existant.
 *
 * SÉCURITÉ (lis avant de lancer) :
 *  - DRY-RUN par défaut : n'écrit RIEN, liste juste les remplacements prévus.
 *    REGARDE la sortie avant d'appliquer.
 *  - `--apply` requis pour écrire. Écrit d'ABORD un backup JSON horodaté local
 *    (dossier backups/) du `llm_content` original de chaque fiche modifiée.
 *  - Remplacement CIBLÉ : uniquement un « 30 % » précédé d'un marqueur fiscal
 *    (flat tax / PFU / prélèvement forfaitaire) dans la même clause → ne touche
 *    PAS les « 30 % » non-fiscaux (« 30 % du supply », « a chuté de 30 % »).
 *  - Nécessite NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY en env
 *    (jamais affichés/commités). Ex. via `node --env-file=.env.local` si présents,
 *    ou exporte-les dans le shell.
 *
 * Usage :
 *   node scripts/fix-fiches-pfu-rate.mjs            # DRY-RUN (défaut, sûr)
 *   node scripts/fix-fiches-pfu-rate.mjs --apply    # applique (backup auto avant)
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";

// Charge .env.local / .env de façon robuste (gère CRLF + BOM, ne remplace pas
// une variable déjà définie). Évite la fragilité de `node --env-file=`.
function loadEnvFile(file) {
  try {
    const txt = readFileSync(file, "utf8").replace(/^﻿/, "");
    for (const line of txt.split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/i);
      if (!m) continue;
      let v = m[2].trim();
      if (
        (v.startsWith('"') && v.endsWith('"')) ||
        (v.startsWith("'") && v.endsWith("'"))
      )
        v = v.slice(1, -1);
      if (process.env[m[1]] === undefined) process.env[m[1]] = v;
    }
  } catch {
    /* fichier absent : on ignore */
  }
}
loadEnvFile(".env.local");
loadEnvFile(".env");

const APPLY = process.argv.includes("--apply");
const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!URL || !KEY) {
  console.error(
    "[fix-pfu] Manque NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY en env."
  );
  process.exit(1);
}

const sb = createClient(URL, KEY, { auth: { persistSession: false } });

// « 30 % » précédé (≤ 25 caractères, même clause) d'un marqueur fiscal.
const FISCAL_PATTERNS = [
  // marqueur fiscal AVANT le 30 %
  /(?:flat\s*tax|PFU|(?:prélèvement|taux) forfaitaire(?:\s*unique)?)[^.\n]{0,30}?\b30\s?%/gi,
  // marqueur fiscal APRÈS le 30 % (« 30 % flat (PFU) », « 30 % (PFU) »)
  /\b30\s?%[^.\n]{0,18}?(?:flat\s*tax|\bPFU\b|forfaitaire)/gi,
  // sans « PFU » adjacent (« plus-values … 30 % », « imposition à 30 % »)
  /(?:plus-value|imposition|impos[ée]|impôt)[^.\n]{0,24}?\b30\s?%/gi,
];

function fixText(s) {
  if (typeof s !== "string") return { text: s, n: 0, samples: [] };
  let n = 0;
  const samples = [];
  let text = s;
  for (const re of FISCAL_PATTERNS) {
    text = text.replace(re, (full) => {
      if (/31,4/.test(full) || !/\b30\s?%/.test(full)) return full;
      n++;
      samples.push(full.replace(/\s+/g, " ").trim());
      return full.replace(/\b30\s?%/, "31,4 %");
    });
  }
  return { text, n, samples };
}

/** Parcourt récursivement le JSON llm_content et corrige toutes les strings. */
function deepFix(value) {
  let count = 0;
  const samples = [];
  const walk = (v) => {
    if (typeof v === "string") {
      const { text, n, samples: sm } = fixText(v);
      count += n;
      samples.push(...sm);
      return text;
    }
    if (Array.isArray(v)) return v.map(walk);
    if (v && typeof v === "object") {
      const o = {};
      for (const k of Object.keys(v)) o[k] = walk(v[k]);
      return o;
    }
    return v;
  };
  const fixed = walk(value);
  return { fixed, count, samples };
}

const { data, error } = await sb
  .from("cryptos")
  .select("coingecko_id, llm_content")
  .eq("is_published", true)
  .limit(2000);

if (error) {
  console.error("[fix-pfu] Supabase:", error.message);
  process.exit(1);
}

let touched = 0;
let totalRepl = 0;
const backups = [];
const misses = [];

for (const row of data || []) {
  const { fixed, count, samples } = deepFix(row.llm_content || {});
  if (count > 0) {
    touched++;
    totalRepl += count;
    backups.push({ coingecko_id: row.coingecko_id, before: row.llm_content });
    console.log(
      `${APPLY ? "FIX " : "DRY "}${row.coingecko_id} — ${count} : ${samples.join(" | ").slice(0, 150)}`
    );
    if (APPLY) {
      const { error: upErr } = await sb
        .from("cryptos")
        .update({ llm_content: fixed })
        .eq("coingecko_id", row.coingecko_id);
      if (upErr) console.error(`  ! update KO ${row.coingecko_id}: ${upErr.message}`);
    }
  } else {
    // Détection des MISS : "30 %" en contexte fiscal mais non capté par le regex
    // ciblé (phrasing différent) → à examiner manuellement, ne pas corriger en aveugle.
    const raw = JSON.stringify(row.llm_content || {});
    if (
      /\b30\s?%/.test(raw) &&
      /flat ?tax|PFU|prélèvement forfaitaire|plus-value|imposable|impôt/i.test(raw)
    ) {
      misses.push(row.coingecko_id);
    }
  }
}

if (APPLY && backups.length) {
  mkdirSync("backups", { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const path = `backups/fiches-pfu-backup-${stamp}.json`;
  writeFileSync(path, JSON.stringify(backups, null, 2));
  console.log(`\n[backup] ${backups.length} fiches (llm_content AVANT modif) → ${path}`);
}

console.log(
  `\n${APPLY ? "APPLIQUÉ" : "DRY-RUN"} : ${touched} fiches concernées, ${totalRepl} occurrences « PFU 30 % » → « 31,4 % ».`
);
if (misses.length) {
  console.log(
    `⚠️ MISS : ${misses.length} fiche(s) ont un « 30 % » en contexte fiscal NON capté par le regex (phrasing different) — a examiner : ${misses.slice(0, 20).join(", ")}${misses.length > 20 ? " …" : ""}`
  );
}
console.log(
  APPLY
    ? "Terminé. Pense à purger le cache (revalidateTag 'cryptos' / 'crypto-fiche:*' ou redeploy)."
    : "Relance avec --apply pour écrire (backup automatique avant). REGARDE la liste ci-dessus d'abord."
);
