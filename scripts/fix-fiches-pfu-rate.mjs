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
import { writeFileSync, mkdirSync } from "node:fs";

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
const FISCAL_30 =
  /((?:flat\s*tax|PFU|prélèvement forfaitaire(?:\s*unique)?)[^.\n]{0,25}?)\b30\s?%/gi;

function fixText(s) {
  if (typeof s !== "string") return { text: s, n: 0 };
  let n = 0;
  const text = s.replace(FISCAL_30, (full) => {
    n++;
    return full.replace(/\b30\s?%/, "31,4 %");
  });
  return { text, n };
}

/** Parcourt récursivement le JSON llm_content et corrige toutes les strings. */
function deepFix(value) {
  let count = 0;
  const walk = (v) => {
    if (typeof v === "string") {
      const { text, n } = fixText(v);
      count += n;
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
  return { fixed: walk(value), count };
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

for (const row of data || []) {
  const { fixed, count } = deepFix(row.llm_content || {});
  if (count > 0) {
    touched++;
    totalRepl += count;
    backups.push({ coingecko_id: row.coingecko_id, before: row.llm_content });
    console.log(`${APPLY ? "FIX " : "DRY "}${row.coingecko_id} — ${count} remplacement(s)`);
    if (APPLY) {
      const { error: upErr } = await sb
        .from("cryptos")
        .update({ llm_content: fixed })
        .eq("coingecko_id", row.coingecko_id);
      if (upErr) console.error(`  ! update KO ${row.coingecko_id}: ${upErr.message}`);
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
console.log(
  APPLY
    ? "Terminé. Pense à purger le cache (revalidateTag 'cryptos' / 'crypto-fiche:*' ou redeploy)."
    : "Relance avec --apply pour écrire (backup automatique avant). REGARDE la liste ci-dessus d'abord."
);
