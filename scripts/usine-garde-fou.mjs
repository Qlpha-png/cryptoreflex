#!/usr/bin/env node
/**
 * scripts/usine-garde-fou.mjs — RETOUR ARRIÈRE automatique après une fusion de l'Usine qui dégrade le site (09/10/2026).
 * Lancé par .github/workflows/usine-garde-fou.yml quand la sentinelle finit en échec. Décision : scripts/lib/usine-garde-fou.mjs
 * (défaut de CONTENU vu par la sentinelle + fusion automatique de l'Usine depuis moins de 6 h → git revert + push main).
 *
 * Usage : node scripts/usine-garde-fou.mjs [--simulation] [--json]
 * Variables : KV_REST_API_URL / KV_REST_API_TOKEN (résumé de la sentinelle), USINE_RETOUR_ARRIERE=off pour tout couper.
 * Trace KV : usine:garde-fou:dernier (tableau de bord). Sortie standard : décision et raisons (aucun secret).
 */
import { execFileSync } from "node:child_process";
import { appendFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { decider } from "./lib/usine-garde-fou.mjs";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const SIMULATION = process.argv.includes("--simulation") || process.env.USINE_RETOUR_ARRIERE === "off";
const JSON_OUT = process.argv.includes("--json");
const now = Date.now();
const git = (...a) => execFileSync("git", a, { cwd: ROOT, encoding: "utf8" });
const out = (k, v) => process.env.GITHUB_OUTPUT && appendFileSync(process.env.GITHUB_OUTPUT, `${k}=${String(v).replace(/\n/g, " ")}\n`);

async function lireResume() {
  const url = process.env.KV_REST_API_URL?.replace(/\/$/, "");
  const token = process.env.KV_REST_API_TOKEN;
  if (!url || !token) return null;
  try {
    const r = await fetch(`${url}/get/${encodeURIComponent("usine:sentinelle:dernier")}`, { headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(10_000) });
    const j = await r.json();
    if (!r.ok || j.error || j.result == null) return null;
    return typeof j.result === "string" ? JSON.parse(j.result) : j.result;
  } catch {
    return null;
  }
}
async function ecrireTrace(trace) {
  const url = process.env.KV_REST_API_URL?.replace(/\/$/, "");
  const token = process.env.KV_REST_API_TOKEN;
  if (!url || !token) return;
  try {
    const r = await fetch(url, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "content-type": "application/json" },
      body: JSON.stringify(["SET", "usine:garde-fou:dernier", JSON.stringify(trace), "EX", 30 * 86_400]),
      signal: AbortSignal.timeout(10_000),
    });
    await r.body?.cancel().catch(() => {});
  } catch {
    /* trace facultative */
  }
}

const commits = git("log", "origin/main", "--since=8 hours ago", "--format=%H%x1f%ae%x1f%s%x1f%b%x1f%cI%x1e")
  .split("\x1e")
  .map((l) => l.trim())
  .filter(Boolean)
  .map((l) => {
    const [sha, email, message, corps, date] = l.split("\x1f");
    return { sha, email, message, corps, date };
  });
const resume = await lireResume();
const decision = decider({ commits, resume, now });
const trace = { at: new Date(now).toISOString(), simulation: SIMULATION, ...decision };

if (decision.action === "revert" && !SIMULATION) {
  git("config", "user.name", "Cryptoreflex Usine (garde-fou)");
  git("config", "user.email", "usine@cryptoreflex.fr");
  git("checkout", "-q", "main");
  git("revert", "--no-edit", decision.sha);
  let pousse = false;
  for (let i = 0; i < 3 && !pousse; i++) {
    try {
      git("push", "origin", "HEAD:main");
      pousse = true;
    } catch {
      git("fetch", "origin", "main");
      try {
        git("rebase", "origin/main");
      } catch {
        git("rebase", "--abort");
        break;
      }
    }
  }
  trace.pousse = pousse;
  if (!pousse) trace.erreur = "push impossible (conflit) : intervention humaine";
}
await ecrireTrace(trace);
out("action", decision.action);
out("sha", decision.sha ?? "");
out("raison", decision.raison ?? (decision.raisons ?? []).join(" ; "));
if (JSON_OUT) process.stdout.write(JSON.stringify(trace, null, 2) + "\n");
else if (decision.action === "revert") {
  process.stdout.write(`[garde-fou] ${SIMULATION ? "SIMULATION : annulerait" : trace.pousse ? "ANNULÉ" : "ÉCHEC de l'annulation de"} ${decision.sha.slice(0, 10)} « ${decision.message} »\n`);
  for (const r of decision.raisons) process.stdout.write(`  - ${r}\n`);
} else process.stdout.write(`[garde-fou] rien à faire : ${decision.raison}\n`);
if (decision.action === "revert" && !SIMULATION && !trace.pousse) process.exit(1);
