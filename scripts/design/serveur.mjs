#!/usr/bin/env node
/**
 * Banc de design (lot A0) — build et serveur LOCAL figés, sans écriture en production.
 *
 *   node scripts/design/serveur.mjs build  [--donnees <dir>]
 *   node scripts/design/serveur.mjs start  --port 3180 [--donnees <dir>]
 *
 * - Environnement forcé (prioritaire sur .env.local, que Next ne réécrit pas) : KV de prod coupé (au plafond), Resend coupé
 *   (envoie de vrais courriels), clés LLM coupées (coût) : KV_REST_API_URL=http://127.0.0.1:9, KV_REST_API_TOKEN,
 *   RESEND_API_KEY, ANTHROPIC_API_KEY, OPENROUTER_API_KEY = local-off.
 * - NODE_OPTIONS=--require scripts/design/figer-donnees.cjs : réponses des API externes rejouées depuis le magasin
 *   (HORS dépôt), horloge figée, toute écriture externe refusée.
 * - .env.local : doit exister et être ignoré par git (jamais affiché, jamais commité).
 * Les ports 3180-3189 sont réservés au banc.
 */
import fs from "node:fs";
import path from "node:path";
import { spawn, execFileSync } from "node:child_process";
import { ROOT, args, dossierDonnees } from "./lib/commun.mjs";

const a = args();
const cmd = a._[0];
if (!["build", "start"].includes(cmd)) { console.error("usage : serveur.mjs build|start [--port 3180] [--donnees <dir>]"); process.exit(2); }

const envLocal = path.join(ROOT, ".env.local");
if (fs.existsSync(envLocal)) {
  try { execFileSync("git", ["check-ignore", "-q", ".env.local"], { cwd: ROOT }); }
  catch { console.error("banc : .env.local n'est PAS ignoré par git : arrêt (risque de fuite de secrets)."); process.exit(3); }
} else console.warn("banc : pas de .env.local (Supabase vide : pages de données incomplètes).");

const donnees = dossierDonnees(a);
fs.mkdirSync(donnees, { recursive: true });
const preload = path.join(ROOT, "scripts/design/figer-donnees.cjs").replace(/\\/g, "/");
const env = {
  ...process.env,
  KV_REST_API_URL: "http://127.0.0.1:9",
  KV_REST_API_TOKEN: "local-off",
  RESEND_API_KEY: "local-off",
  ANTHROPIC_API_KEY: "local-off",
  OPENROUTER_API_KEY: "local-off",
  NEXT_TELEMETRY_DISABLED: "1",
  BANC_DONNEES: donnees,
  NODE_OPTIONS: `${process.env.NODE_OPTIONS || ""} --require ${preload}`.trim(),
};
// Reflex Cards comme en production (mémoire du projet, 02/10/2026) : sans ces variables (absentes de .env.local),
// /cartes/* répond 404 en local et les captures du jeu et des cartes ne valent rien. NEXT_PUBLIC_* est inliné au BUILD.
// REFLEX_CARDS_UNIVERS : valeur de production non vérifiée, laissée absente (la poser dans l'environnement si besoin).
// Le mode comptes appelle Supabase en écriture (rpc) : refusé par figer-donnees.cjs, rien n'est écrit.
for (const [k, v] of Object.entries({ NEXT_PUBLIC_REFLEX_CARDS_ENABLED: "true", NEXT_PUBLIC_REFLEX_CARDS_LAUNCH_DATE: "2026-10-02", REFLEX_CARDS_ACCOUNTS: "true" }))
  if (env[k] === undefined) env[k] = v;
if (cmd === "start" && process.env.BANC_DONNEES_MODE) env.BANC_DONNEES_MODE = process.env.BANC_DONNEES_MODE;
const next = path.join(ROOT, "node_modules/next/dist/bin/next");
const port = String(a.port || 3180);
if (cmd === "start" && !/^318\d$/.test(port)) { console.error("banc : ports 3180-3189 seulement"); process.exit(2); }
if (cmd === "build") {
  // Caches de Next qui survivent d'un build à l'autre (.next/cache) : leurs entrées sont datées par le système de fichiers
  // (horloge RÉELLE), donc toujours « fraîches » pour l'horloge figée du banc, qui est dans le passé. Sans ce nettoyage,
  // un build reprendrait les réponses d'une passe antérieure (autre magasin, autre jour, réponses edge en direct) au lieu
  // du magasin : les données des pages dépendraient de l'historique du dossier. On repart du magasin seul.
  for (const d of ["fetch-cache", "images"]) {
    const p = path.join(ROOT, ".next", "cache", d);
    if (fs.existsSync(p)) { fs.rmSync(p, { recursive: true, force: true }); console.log(`banc : cache ${path.relative(ROOT, p)} vidé (données = magasin seul)`); }
  }
}
const argv = cmd === "build" ? [next, "build"] : [next, "start", "-p", port, "-H", "127.0.0.1"];
console.log(`banc : next ${cmd}${cmd === "start" ? " sur http://127.0.0.1:" + port : ""} · magasin ${donnees}`);
const child = spawn(process.execPath, argv, { cwd: ROOT, env, stdio: "inherit" });
child.on("exit", (code) => process.exit(code ?? 1));
for (const sig of ["SIGINT", "SIGTERM"]) process.on(sig, () => child.kill(sig));
