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
/* 05/10/2026 (Kev : « un truc sans jeton et sans devoir que je l'actualise ») : réparations SANS IA décidées ici, exécutées par
   .github/workflows/sentinelle.yml (relancer la publication du jour, l'orchestrateur de secours, un robot GitHub en échec). */
const repairs = { dailyContent: null, orchestrator: null, rerun: [] };
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
/* 05/10/2026 : analyses techniques du jour (5 cryptos) — une panne de la source de prix en avait fait perdre 3 sur 5. */
async function checkAnalyses() {
  try {
    const { res } = await get(SITE + "/analyses-techniques");
    const html = await res.text();
    const dates = [...html.matchAll(/\/analyses-techniques\/(\d{4}-\d{2}-\d{2})-([a-z0-9]+)-analyse-technique/g)];
    if (!dates.length) return fail("fraîcheur", "page des analyses techniques sans aucune analyse");
    const last = dates.map((m) => m[1]).sort().pop();
    const h = (Date.now() - Date.parse(last + "T04:30:00Z")) / HOUR;
    const n = new Set(dates.filter((m) => m[1] === last).map((m) => m[2])).size;
    const today = new Date().toISOString().slice(0, 10), hourUtc = new Date().getUTCHours();
    if (h > 36) { fail("fraîcheur", `dernière analyse technique du ${last} (robot des analyses en panne ?)`); repairs.dailyContent ??= "analyses périmées"; }
    else if (n < 5) warn("fraîcheur", `${n} analyse(s) technique(s) sur 5 le ${last}`);
    if ((last < today && hourUtc >= 6) || (last === today && n < 5)) repairs.dailyContent ??= `analyses du jour incomplètes (${last === today ? n : 0}/5)`;
    else ok("fraîcheur", `5 analyses techniques le ${last}`);
  } catch (e) {
    warn("fraîcheur", `page des analyses illisible : ${e.message}`);
  }
}

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
      if (h > 36) { fail("fraîcheur", `dernière actu publiée il y a ${Math.round(h)} h (robot d'actus en panne ?)`); repairs.dailyContent ??= "actus périmées"; }
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
      // 06/10/2026 : un refus d'Upstash (quota « max requests limit exceeded ») passait pour « aucun relevé »
      if (j.error || !r.ok) fail("fraîcheur", `prix du bandeau : lecture du cache refusée par Upstash (HTTP ${r.status}${j.error ? ` : ${String(j.error).slice(0, 160)}` : ""})`);
      else if (age == null) fail("fraîcheur", "prix du bandeau : aucun relevé en cache");
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
    /* 05/10/2026 : prix en euros (taux du jour) contre Kraken XBTEUR — un taux figé avait surévalué les euros de 3,3 % */
    const top = await (await get(SITE + "/api/coins/top?limit=10&vs=eur")).res.json();
    const eur = (top.coins || []).find((x) => x.id === "bitcoin")?.current_price;
    const ke = await (await get("https://api.kraken.com/0/public/Ticker?pair=XBTEUR", { timeout: 15_000 })).res.json();
    const refE = Number(Object.values(ke.result || {})[0]?.c?.[0]);
    if (!eur || !refE) warn("prix", "comparaison du prix en euros impossible");
    else {
      const gapE = Math.abs(eur - refE) / refE;
      if (gapE > 0.03) fail("prix", `prix du Bitcoin en euros ${Math.round(eur)} € contre ${Math.round(refE)} € chez Kraken (écart ${(gapE * 100).toFixed(1)} %)`);
      else ok("prix", `prix en euros cohérent (${Math.round(eur)} € / Kraken ${Math.round(refE)} €)`);
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
    /* 05/10/2026 : la veille officielle est exclue — son « échec » signale une source officielle modifiée (ticket
       « veille-officielle » dédié, traité par la routine), et relancer un passage « enregistrer » accepterait une nouvelle
       référence sans relecture. */
    const runs = (j.workflow_runs || []).filter((w) => w.name && !/sentinelle/i.test(w.name) && !/veille-officielle\.yml$/.test(w.path || "") && w.status === "completed");
    // dernier résultat par tâche : un échec réparé ensuite n'est plus un défaut
    const latest = new Map();
    for (const w of runs) if (!latest.has(w.name)) latest.set(w.name, w);
    const broken = [...latest.values()].filter((w) => w.conclusion === "failure");
    if (broken.length) for (const w of broken) fail("robots", `tâche « ${w.name} » en échec (${w.html_url})`);
    else ok("robots", `${latest.size} tâches GitHub, aucune en échec sur 26 h`);
    for (const w of broken) {
      if (/daily-content\.yml$/.test(w.path || "")) repairs.dailyContent ??= "publication du jour en échec";
      else if ((w.run_attempt ?? 1) === 1 && !/audit-navigateur|e2e|coolify-crons/.test(w.path || "")) repairs.rerun.push({ id: w.id, name: w.name });
    }
  } catch (e) {
    warn("robots", `liste des tâches GitHub illisible : ${e.message}`);
  }
  /* 05/10/2026 : un robot qui ne se lance plus du tout ne produit aucun échec. Âge maximal du dernier passage (heures) ;
     GitHub retarde souvent ses tâches programmées de plusieurs heures, d'où la marge. */
  const CADENCE = [
    ["daily-content.yml", "actus et analyses du jour", 30],
    ["audit-navigateur.yml", "audit navigateur de nuit", 32],
    ["health-check.yml", "contrôle de santé", 16],
    ["freshness-check.yml", "contrôle de fraîcheur", 40],
    ["refresh-prices-db.yml", "prix de la base", 16],
    ["refresh-static-details-kv.yml", "détails des fiches", 16],
    ["weekly-blog.yml", "article de la semaine", 8 * 24 + 12],
    ["weekly-events.yml", "agenda de la semaine", 8 * 24 + 12],
  ];
  for (const [file, label, maxH] of CADENCE) {
    try {
      const r = await fetch(`https://api.github.com/repos/${repo}/actions/workflows/${file}/runs?per_page=1`, {
        headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json", "user-agent": UA },
      });
      const last = (await r.json()).workflow_runs?.[0];
      const h = last ? (Date.now() - Date.parse(last.created_at)) / HOUR : Infinity;
      if (h > maxH) fail("robots", `« ${label} » (${file}) n'a pas tourné depuis ${Number.isFinite(h) ? Math.round(h) + " h" : "jamais"} (maximum ${maxH} h)`);
    } catch (e) {
      warn("robots", `cadence de ${file} illisible : ${e.message}`);
    }
  }
  ok("robots", `cadence vérifiée pour ${CADENCE.length} robots`);
}

/* 05/10/2026 : contenu programmé de Reflex Cards — les missions sont écrites date par date et les objets éphémères du
   Comptoir jour de saison par jour de saison (1 à 90 au lancement) : sans prolongation, le Comptoir se vide en silence. */
async function checkGameContent() {
  try {
    const rules = JSON.parse(readFileSync(path.join(ROOT, "data", "reflex-cards-rules.json"), "utf8"));
    const { res } = await get(SITE + "/cartes/jouer");
    const day = Number((await res.text()).match(/GAME_DAY=(\d+)/)?.[1]);
    const ephMax = Math.max(...Object.keys(rules.eph || {}).map(Number).filter(Number.isFinite));
    const lastMission = Object.keys(rules.missionsByDate || {}).sort().pop();
    const missionsLeft = lastMission ? (Date.parse(lastMission) - Date.now()) / (24 * HOUR) : -1;
    if (!Number.isFinite(day)) warn("jeu", "jour de saison de Reflex Cards illisible");
    else if (day > ephMax) fail("jeu", `Reflex Cards : plus aucun objet éphémère au Comptoir (jour ${day}, programmés jusqu'au jour ${ephMax})`);
    else if (ephMax - day < 30) warn("jeu", `Reflex Cards : objets éphémères programmés jusqu'au jour ${ephMax} (${ephMax - day} jours restants) — à prolonger`);
    if (missionsLeft < 0) fail("jeu", "Reflex Cards : plus aucune mission programmée");
    else if (missionsLeft < 30) warn("jeu", `Reflex Cards : missions programmées jusqu'au ${lastMission} — à prolonger`);
    if (Number.isFinite(day) && day <= ephMax && missionsLeft >= 30) ok("jeu", `Reflex Cards : jour ${day}, éphémères jusqu'au jour ${ephMax}, missions jusqu'au ${lastMission}`);
  } catch (e) {
    warn("jeu", `contenu programmé du jeu illisible : ${e.message}`);
  }
}

/* 05/10/2026 : l'orchestrateur quotidien (Vercel Cron, 7 h UTC) laisse une trace de son passage dans le KV. */
async function checkOrchestrator() {
  const kvUrl = process.env.KV_REST_API_URL?.replace(/\/$/, "");
  const kvToken = process.env.KV_REST_API_TOKEN;
  if (!kvUrl || !kvToken) return warn("robots", "orchestrateur quotidien non contrôlé (accès KV absent)");
  try {
    const r = await fetch(`${kvUrl}/get/${encodeURIComponent("cron:orchestrator:last")}`, { headers: { Authorization: `Bearer ${kvToken}` }, signal: AbortSignal.timeout(10_000) });
    const j = await r.json();
    const t = typeof j.result === "string" ? JSON.parse(j.result) : j.result;
    if (!t?.at) warn("robots", "orchestrateur quotidien : pas encore de trace (premier passage attendu à 7 h UTC)");
    else {
      const h = (Date.now() - Date.parse(t.at)) / HOUR;
      if (h > 27) { fail("robots", `orchestrateur quotidien (prix, alertes, e-mails, agenda) : dernier passage il y a ${Math.round(h)} h`); repairs.orchestrator = `dernier passage il y a ${Math.round(h)} h`; }
      const bad = (t.jobs || []).filter((x) => !x.ok);
      for (const x of bad) (x.critical ? fail : warn)("robots", `orchestrateur : tâche « ${x.name} » en échec (${x.status || x.error || "?"})`);
      if (h <= 27 && !bad.length) ok("robots", `orchestrateur quotidien passé il y a ${Math.round(h)} h, ${(t.jobs || []).length} tâches réussies`);
    }
  } catch (e) {
    warn("robots", `trace de l'orchestrateur illisible : ${e.message}`);
  }
  /* alertes de prix : Vercel Cron toutes les 15 minutes */
  try {
    const r = await fetch(`${kvUrl}/get/${encodeURIComponent("cron:evaluate-alerts:last")}`, { headers: { Authorization: `Bearer ${kvToken}` }, signal: AbortSignal.timeout(10_000) });
    const j = await r.json();
    const t = typeof j.result === "string" ? JSON.parse(j.result) : j.result;
    if (!t?.at) warn("robots", "alertes de prix : pas encore de trace de passage");
    else {
      const min = (Date.now() - Date.parse(t.at)) / 60_000;
      if (min > 60) fail("robots", `alertes de prix : dernière vérification il y a ${Math.round(min)} min (prévue toutes les 15 min)`);
      else if (t.errors > 0) warn("robots", `alertes de prix : ${t.errors} erreur(s) au dernier passage`);
      else ok("robots", `alertes de prix vérifiées il y a ${Math.round(min)} min (${t.checked} alertes)`);
    }
  } catch (e) {
    warn("robots", `trace des alertes illisible : ${e.message}`);
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
await checkAnalyses();
await checkRobots();
await checkOrchestrator();
await checkGameContent();
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
writeFileSync(path.join(path.dirname(REPORT), "sentinelle-repairs.json"), JSON.stringify(repairs, null, 1));
if (repairs.dailyContent || repairs.orchestrator || repairs.rerun.length) console.log("\nRéparations proposées :", JSON.stringify(repairs));
console.log(lines.join("\n"));
process.exit(fails.length ? 1 : 0);
