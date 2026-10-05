#!/usr/bin/env node
/**
 * scripts/sentinelle.mjs — détection d'erreurs automatique de cryptoreflex.fr, même quand personne ne regarde.
 *
 * Kev, 04/10/2026 : « que les chiffres, documents, articles soient automatisés et contrôlés, avec une détection
 * d'erreur fiable et automatique pour te prévenir même quand je ne suis pas actif ». Lancé par GitHub Actions
 * (.github/workflows/sentinelle.yml) : contrôle léger toutes les heures et après chaque déploiement, complet chaque nuit.
 * Un défaut → code de sortie 1 (GitHub envoie un e-mail), ticket « Sentinelle » mis à jour, et la tâche Claude
 * planifiée se déclenche pour corriger ou préparer la correction.
 *
 * Usage : node scripts/sentinelle.mjs [--full] [--site=https://www.cryptoreflex.fr]
 * Variables facultatives : KV_REST_API_URL / KV_REST_API_TOKEN (âge des prix), GITHUB_TOKEN + GITHUB_REPOSITORY
 * (échecs des robots), SENTINELLE_REPORT (fichier du rapport, défaut sentinelle-report.md).
 * Aucune donnée personnelle, aucun secret écrit dans le rapport.
 */
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const FULL = process.argv.includes("--full");
const SITE = (process.argv.find((a) => a.startsWith("--site="))?.slice(7) || process.env.SENTINELLE_SITE || "https://www.cryptoreflex.fr").replace(/\/$/, "");
const REPORT = process.env.SENTINELLE_REPORT || path.join(ROOT, "sentinelle-report.md");
const UA = "cryptoreflex-sentinelle/1.0 (+https://www.cryptoreflex.fr)";
const HOUR = 3_600_000;

const results = []; // { area, level: "ok"|"warn"|"fail", msg }
const ok = (area, msg) => results.push({ area, level: "ok", msg });
const warn = (area, msg) => results.push({ area, level: "warn", msg });
const fail = (area, msg) => results.push({ area, level: "fail", msg });

const counts = JSON.parse(readFileSync(path.join(ROOT, "data", "site-counts.json"), "utf8"));
const fmt = (n) => n.toLocaleString("fr-FR").replace(/ /g, " ");

/** Requête avec 2 nouvelles tentatives sur erreur réseau ou 5xx (une coupure d'une seconde n'est pas un défaut). */
async function get(url, init = {}) {
  let last;
  for (let attempt = 0; attempt < 3; attempt++) {
    if (attempt) await new Promise((r) => setTimeout(r, 4000 * attempt));
    const t0 = Date.now();
    try {
      const res = await fetch(url, { redirect: "follow", ...init, headers: { "user-agent": UA, ...(init.headers || {}) }, signal: AbortSignal.timeout(init.timeout ?? 30_000) });
      if (res.status >= 500 && attempt < 2) { last = new Error(`HTTP ${res.status}`); await res.body?.cancel().catch(() => {}); continue; }
      return { res, ms: Date.now() - t0 };
    } catch (e) {
      last = e;
    }
  }
  throw last;
}
/** Texte visible : sans scripts, styles ni balises (le code JS contient « undefined » légitimement). */
const visible = (html) =>
  html.replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<style[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " ").replace(/&nbsp;|&#160;/g, " ").replace(/\s+/g, " ");
const BAD_TEXT = /\bNaN\b|\bundefined\b|\[object Object\]|\bInfinity\b|\{STATS\.|\$\{/;
const isCheckpoint = (status, body) => (status === 403 || status === 429) && /Vercel Security Checkpoint|challenge/i.test(body);

/* ------------------------------------------------------------------ 1. pages clés */
const KEY_PAGES = [
  "/", "/marche", "/actualites", "/cryptos", "/cryptos/bitcoin", "/comparatif", "/outils", "/outils/calculateur-fiscalite",
  "/outils/cerfa-2086-auto", "/historique-prix/bitcoin/2025", "/cartes", "/cartes/jouer", "/feed.xml", "/sitemap-index.xml", "/robots.txt",
];
async function checkKeyPages() {
  for (const p of KEY_PAGES) {
    try {
      const { res, ms } = await get(SITE + p);
      const body = await res.text();
      if (isCheckpoint(res.status, body)) { warn("pages", `${p} : bloqué par la protection Vercel (pas un défaut du site)`); continue; }
      if (res.status !== 200) { fail("pages", `${p} répond ${res.status}`); continue; }
      if (body.length < 500) { fail("pages", `${p} : page presque vide (${body.length} octets)`); continue; }
      if (/\.(xml|txt)$/.test(p)) { ok("pages", `${p} 200 (${ms} ms)`); continue; }
      const m = visible(body).match(BAD_TEXT);
      if (m) fail("pages", `${p} affiche « ${m[0]} »`);
      else if (ms > 8000) warn("pages", `${p} lente : ${ms} ms`);
      else ok("pages", `${p} 200 (${ms} ms)`);
      if (p === "/") {
        const desc = body.match(/<meta name="description" content="([^"]*)"/)?.[1] ?? "";
        const plain = desc.replace(/&nbsp;| | /g, " ");
        if (!plain.includes(`${counts.platforms} plateformes`) || !plain.includes(`${fmt(counts.cryptos).replace(/ /g, " ")} fiches`))
          fail("chiffres", `accueil : la description ne porte pas les chiffres à jour (${counts.platforms} plateformes, ${counts.cryptos} fiches) : « ${desc.slice(0, 160)} »`);
        else ok("chiffres", `accueil : ${counts.platforms} plateformes, ${counts.cryptos} fiches`);
      }
    } catch (e) {
      fail("pages", `${p} injoignable : ${e.message}`);
    }
  }
}

/* ------------------------------------------------------------------ 2. fraîcheur */
async function checkFreshness() {
  // dernière actu publiée (flux RSS) : moins de 36 h
  try {
    const { res } = await get(SITE + "/feed.xml");
    const xml = await res.text();
    const dates = [...xml.matchAll(/<pubDate>([^<]+)<\/pubDate>/g)].map((m) => Date.parse(m[1])).filter(Number.isFinite);
    const last = Math.max(...dates);
    if (!dates.length) fail("fraîcheur", "flux RSS sans date de publication");
    else {
      const h = (Date.now() - last) / HOUR;
      if (h > 36) fail("fraîcheur", `dernière actu publiée il y a ${Math.round(h)} h (robot d'actus en panne ?)`);
      else ok("fraîcheur", `dernière actu il y a ${Math.round(h)} h`);
    }
  } catch (e) {
    fail("fraîcheur", `flux RSS illisible : ${e.message}`);
  }
  // prix du bandeau (cache KV) : moins de 30 min
  const kvUrl = process.env.KV_REST_API_URL?.replace(/\/$/, "");
  const kvToken = process.env.KV_REST_API_TOKEN;
  if (kvUrl && kvToken) {
    try {
      const r = await fetch(`${kvUrl}/get/${encodeURIComponent("cg-ticker-prices:stale:v1")}`, { headers: { Authorization: `Bearer ${kvToken}` }, signal: AbortSignal.timeout(10_000) });
      const j = await r.json();
      const payload = typeof j.result === "string" ? JSON.parse(j.result) : j.result;
      const age = payload?.fetchedAt ? (Date.now() - Date.parse(payload.fetchedAt)) / 60_000 : null;
      if (age == null) fail("fraîcheur", "prix du bandeau : aucun relevé en cache");
      else if (age > 30) fail("fraîcheur", `prix du bandeau vieux de ${Math.round(age)} min (tâche Vercel des prix en panne ?)`);
      else ok("fraîcheur", `prix du bandeau relevés il y a ${Math.round(age)} min`);
    } catch (e) {
      warn("fraîcheur", `cache des prix illisible : ${e.message}`);
    }
  } else warn("fraîcheur", "âge des prix non contrôlé (accès KV absent)");
  // prix affiché vs une source indépendante (Kraken, public) : écart < 3 %
  try {
    const { res } = await get(SITE + "/api/prices?ids=bitcoin");
    const j = await res.json();
    const site = (j.prices || []).find((x) => x.id === "bitcoin")?.price;
    const k = await (await get("https://api.kraken.com/0/public/Ticker?pair=XBTUSD", { timeout: 15_000 })).res.json();
    const ref = Number(Object.values(k.result || {})[0]?.c?.[0]);
    if (!site || !ref) warn("prix", "comparaison du prix du Bitcoin impossible");
    else {
      const gap = Math.abs(site - ref) / ref;
      if (gap > 0.03) fail("prix", `prix du Bitcoin affiché ${Math.round(site)} $ contre ${Math.round(ref)} $ chez Kraken (écart ${(gap * 100).toFixed(1)} %)`);
      else ok("prix", `prix du Bitcoin cohérent (${Math.round(site)} $ / Kraken ${Math.round(ref)} $)`);
    }
  } catch (e) {
    warn("prix", `comparaison du prix impossible : ${e.message}`);
  }
}

/* ------------------------------------------------------------------ 3. robots du site (GitHub Actions) */
async function checkRobots() {
  const token = process.env.GITHUB_TOKEN;
  const repo = process.env.GITHUB_REPOSITORY;
  if (!token || !repo) return warn("robots", "échecs des tâches GitHub non contrôlés (jeton absent)");
  try {
    const since = new Date(Date.now() - 26 * HOUR).toISOString();
    const r = await fetch(`https://api.github.com/repos/${repo}/actions/runs?per_page=100&created=%3E${since}`, {
      headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json", "user-agent": UA },
    });
    const j = await r.json();
    const runs = (j.workflow_runs || []).filter((w) => w.name && !/sentinelle/i.test(w.name) && w.status === "completed");
    // dernier résultat par tâche : un échec réparé ensuite n'est plus un défaut
    const latest = new Map();
    for (const w of runs) if (!latest.has(w.name)) latest.set(w.name, w);
    const broken = [...latest.values()].filter((w) => w.conclusion === "failure");
    if (broken.length) for (const w of broken) fail("robots", `tâche « ${w.name} » en échec (${w.html_url})`);
    else ok("robots", `${latest.size} tâches GitHub, aucune en échec sur 26 h`);
  } catch (e) {
    warn("robots", `liste des tâches GitHub illisible : ${e.message}`);
  }
}

/* ------------------------------------------------------------------ 4. documents fiscaux (nuit) */
async function checkFiscal() {
  // Exemple officiel BOFiP (BOI-RPPM-PVBMC-30-20 §110) : 1 000 € investis ; cessions de 450 € puis 1 300 € →
  // plus-values 75 € puis 675 €, au centime (même cas que tests/lib/cerfa-2086.test.ts).
  const body = {
    preview: true,
    taxYear: 2024,
    transactions: [
      { date: "2024-01-10", type: "buy", asset: "XYZ", quantity: 1, priceEur: 1000, fees: 0 },
      { date: "2024-03-10", type: "sell", asset: "XYZ", quantity: 0.375, priceEur: 1200, fees: 0 },
      { date: "2024-08-10", type: "sell", asset: "XYZ", quantity: 0.625, priceEur: 2080, fees: 0 },
    ],
  };
  try {
    const { res } = await get(SITE + "/api/cerfa-2086", { method: "POST", body: JSON.stringify(body), headers: { "content-type": "application/json", origin: SITE } });
    const j = await res.json().catch(() => ({}));
    if (res.status === 429) return warn("fiscal", "moteur Cerfa : limite d'aperçus atteinte, contrôle reporté");
    const pv = (j.cessions || []).map((c) => Math.round(c.plusValueEur * 100) / 100);
    if (res.status !== 200 || !j.ok) fail("fiscal", `moteur Cerfa 2086 : réponse ${res.status} ${j.error ?? ""}`);
    else if (pv.length !== 2 || pv[0] !== 75 || pv[1] !== 675) fail("fiscal", `moteur Cerfa 2086 : exemple officiel BOFiP faux (attendu 75 € puis 675 €, obtenu ${pv.join(" € puis ")} €)`);
    else ok("fiscal", "moteur Cerfa 2086 : exemple officiel BOFiP juste au centime (75 € puis 675 €)");
  } catch (e) {
    fail("fiscal", `moteur Cerfa 2086 injoignable : ${e.message}`);
  }
}

/* ------------------------------------------------------------------ 5. liens partenaires (nuit) */
async function checkPartners() {
  const src = readFileSync(path.join(ROOT, "data", "partners.ts"), "utf8");
  const slugs = [...new Set([...src.matchAll(/^\s{4}slug: "([a-z0-9-]+)"/gm)].map((m) => m[1]))];
  for (const s of slugs) {
    try {
      const { res } = await get(`${SITE}/go/${s}`, { redirect: "manual" });
      const loc = res.headers.get("location");
      if (res.status < 300 || res.status >= 400 || !loc) fail("partenaires", `/go/${s} ne redirige pas (${res.status})`);
      else ok("partenaires", `/go/${s} → ${new URL(loc).hostname}`);
    } catch (e) {
      fail("partenaires", `/go/${s} injoignable : ${e.message}`);
    }
  }
}

/* ------------------------------------------------------------------ 6. toutes les adresses des plans du site (nuit) */
/** En-tête HTML d'une page, avec 2 nouvelles tentatives sur coupure réseau (constaté depuis GitHub le 05/10/2026). */
async function readHead(url) {
  for (let attempt = 0; ; attempt++) {
    try {
      return await readHeadOnce(url);
    } catch (e) {
      if (attempt >= 2) throw e;
      await new Promise((r) => setTimeout(r, 3000 + attempt * 5000));
    }
  }
}
async function readHeadOnce(url) {
  const res = await fetch(url, { redirect: "manual", headers: { "user-agent": UA }, signal: AbortSignal.timeout(30_000) });
  let html = "";
  if (res.body && (res.headers.get("content-type") || "").includes("html")) {
    const reader = res.body.getReader();
    const dec = new TextDecoder();
    while (html.length < 200_000) {
      const { done, value } = await reader.read();
      if (done) break;
      html += dec.decode(value, { stream: true });
      if (html.includes("</head>")) break;
    }
    reader.cancel().catch(() => {});
  } else {
    res.body?.cancel().catch(() => {});
  }
  return { status: res.status, html };
}
async function checkSitemaps() {
  const index = await (await get(SITE + "/sitemap-index.xml")).res.text();
  const maps = [...index.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
  const urls = new Set();
  for (const m of maps) {
    const xml = await (await get(m)).res.text();
    for (const u of xml.matchAll(/<loc>([^<]+)<\/loc>/g)) urls.add(u[1]);
  }
  const list = [...urls];
  let bad = 0, blocked = 0, done = 0;
  const problems = [];
  const worker = async () => {
    while (list.length) {
      const u = list.pop();
      try {
        const { status, html } = await readHead(u);
        done++;
        if (isCheckpoint(status, html)) { blocked++; continue; }
        const path_ = u.replace(SITE, "");
        if (status !== 200) { bad++; problems.push(`${path_} répond ${status}`); continue; }
        const robots = html.match(/<meta name="robots" content="([^"]*)"/i)?.[1] ?? "";
        const canon = html.match(/<link rel="canonical" href="([^"]*)"/i)?.[1];
        if (/noindex/i.test(robots)) { bad++; problems.push(`${path_} est dans le plan mais en noindex`); }
        else if (canon && canon.replace(/\/$/, "") !== u.replace(/\/$/, "")) { bad++; problems.push(`${path_} : canonique vers ${canon.replace(SITE, "")}`); }
      } catch (e) {
        done++;
        netErrors.push(`${u.replace(SITE, "")} : ${e.message}`);
      }
    }
  };
  const netErrors = [];
  await Promise.all(Array.from({ length: 3 }, worker));
  if (blocked > done * 0.05) warn("plans du site", `${blocked} adresses bloquées par la protection Vercel (contrôle partiel)`);
  // coupures réseau persistantes : défaut seulement si elles dépassent 1 % des adresses (sinon c'est le réseau du robot)
  if (netErrors.length > done * 0.01) {
    fail("plans du site", `${netErrors.length} adresses injoignables après 3 essais (ex. ${netErrors.slice(0, 3).join(" ; ")})`);
  } else if (netErrors.length) {
    warn("plans du site", `${netErrors.length} adresses injoignables après 3 essais, sous le seuil de 1 % (${netErrors.slice(0, 3).join(" ; ")})`);
  }
  if (bad) {
    for (const p of problems.slice(0, 40)) fail("plans du site", p);
    if (problems.length > 40) fail("plans du site", `… et ${problems.length - 40} autres`);
  } else ok("plans du site", `${done - blocked} adresses contrôlées : toutes en 200, indexables, canoniques`);
}

/* ------------------------------------------------------------------ exécution + rapport */
await checkKeyPages();
await checkFreshness();
await checkRobots();
if (FULL) {
  await checkFiscal();
  await checkPartners();
  await checkSitemaps();
}

const fails = results.filter((r) => r.level === "fail");
const warns = results.filter((r) => r.level === "warn");
const when = new Date().toLocaleString("fr-FR", { timeZone: "Europe/Paris" });
const lines = [
  `## Sentinelle — ${FULL ? "contrôle complet" : "contrôle léger"} du ${when}`,
  "",
  fails.length ? `**${fails.length} défaut(s)** à corriger :` : "**Aucun défaut.**",
  "",
  ...fails.map((r) => `- ❌ [${r.area}] ${r.msg}`),
  ...(warns.length ? ["", "À surveiller :", "", ...warns.map((r) => `- ⚠️ [${r.area}] ${r.msg}`)] : []),
  "",
  `<details><summary>${results.filter((r) => r.level === "ok").length} contrôles réussis</summary>`,
  "",
  ...results.filter((r) => r.level === "ok").map((r) => `- ✅ [${r.area}] ${r.msg}`),
  "",
  "</details>",
];
writeFileSync(REPORT, lines.join("\n") + "\n");
console.log(lines.join("\n"));
process.exit(fails.length ? 1 : 0);
