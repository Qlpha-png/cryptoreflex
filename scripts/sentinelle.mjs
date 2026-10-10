#!/usr/bin/env node
/**
 * scripts/sentinelle.mjs — détection d'erreurs automatique de cryptoreflex.fr, même quand personne ne regarde.
 *
 * Kev, 04/10/2026 : « que les chiffres, documents, articles soient automatisés et contrôlés, avec une détection
 * d'erreur fiable et automatique pour te prévenir même quand je ne suis pas actif ». Lancé par GitHub Actions
 * (.github/workflows/sentinelle.yml) : contrôle léger toutes les heures et après chaque déploiement, complet chaque nuit.
 * Un défaut → code de sortie 1 (GitHub envoie un e-mail), ticket « Sentinelle » mis à jour (dépôt privé
 * Qlpha-png/cryptoreflex-sentinelle), et la tâche Claude planifiée se déclenche pour corriger ou préparer la correction.
 * Sortie standard : un décompte seulement (journal public) ; le détail est dans le fichier du rapport.
 *
 * Usage : node scripts/sentinelle.mjs [--full] [--site=https://www.cryptoreflex.fr]
 * Variables facultatives : KV_REST_API_URL / KV_REST_API_TOKEN (âge des prix), GITHUB_TOKEN + GITHUB_REPOSITORY
 * (échecs des robots), CRON_SECRET (budget CoinMarketCap), SENTINELLE_REPORT (fichier du rapport, défaut
 * sentinelle-report.md).
 * Aucune donnée personnelle, aucun secret écrit dans le rapport.
 */
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { CADENCE, TRACES_CRON, jugerTrace } from "./lib/sentinelle-robots.mjs";
import { AGE_MAX_H, FICHES_TEMOINS, choisirEchantillon, fichesDuPlan, jugerFiche } from "./lib/sentinelle-cours.mjs";
import { inventaireDonnees, jugerPageDates, pagesDatesDuJour } from "./lib/inventaire-dates.mjs";
import {
  chargerRegistre, compter, evaluerRegistre, jugerCmcJour, jugerExpiration, jugerTailleBase, rapportHebdo, ticketsDefauts, validerRegistre,
} from "./lib/fraicheur-registre.mjs";
import { bilanConsommation, compterExecutionsMois, mesureCmc, mesureGithub, mesureStock, nonMesure, sectionConsommation } from "./lib/budget-mois.mjs";

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
    /* 08/10/2026 (lot L2) : le hub est un « tableau du jour » de 5 pages vivantes ; chaque ligne porte
       data-calcul="<slug>|<horodatage ISO>". Repli sur l'ancien format (liens datés) tant que la production ne l'a pas. */
    const vivantes = [...html.matchAll(/data-calcul="([a-z0-9-]+)\|(\d{4}-\d{2}-\d{2})T[0-9:]+Z"/g)];
    const dates = vivantes.length
      ? vivantes.map((m) => [m[0], m[2], m[1]])
      : [...html.matchAll(/\/analyses-techniques\/(\d{4}-\d{2}-\d{2})-([a-z0-9]+)-analyse-technique/g)];
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
      /* 06/10/2026 (quota Upstash) : la clé stale n'est plus écrite qu'une fois par heure ; on lit d'abord la clé live
         (TTL 12 min, écrite toutes les 10 min) et la clé stale seulement si la live a expiré. */
      const readKey = async (key) => {
        const r = await fetch(`${kvUrl}/get/${encodeURIComponent(key)}`, { headers: { Authorization: `Bearer ${kvToken}` }, signal: AbortSignal.timeout(10_000) });
        const j = await r.json();
        return { r, j, payload: typeof j.result === "string" ? JSON.parse(j.result) : j.result };
      };
      let { r, j, payload } = await readKey("cg-ticker-prices:v1");
      const fromLive = !!payload?.fetchedAt;
      if (!j.error && r.ok && !fromLive) ({ r, j, payload } = await readKey("cg-ticker-prices:stale:v1"));
      const age = payload?.fetchedAt ? (Date.now() - Date.parse(payload.fetchedAt)) / 60_000 : null;
      // 06/10/2026 : un refus d'Upstash (quota « max requests limit exceeded ») passait pour « aucun relevé »
      if (j.error || !r.ok) fail("fraîcheur", `prix du bandeau : lecture du cache refusée par Upstash (HTTP ${r.status}${j.error ? ` : ${String(j.error).slice(0, 160)}` : ""})`);
      else if (age == null) fail("fraîcheur", "prix du bandeau : aucun relevé en cache");
      else if (fromLive && age > 30) fail("fraîcheur", `prix du bandeau vieux de ${Math.round(age)} min (tâche Vercel des prix en panne ?)`);
      else if (!fromLive && age > 75) fail("fraîcheur", `prix du bandeau : relevé live expiré, secours vieux de ${Math.round(age)} min (tâche Vercel des prix en panne ?)`);
      else if (!fromLive) warn("fraîcheur", `prix du bandeau : relevé live expiré (un passage de la tâche Vercel manqué ?), secours de ${Math.round(age)} min`);
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
    /* 10/10/2026 : un passage déclenché par une pull request (tests E2E d'une branche proposée) ne dit rien du site en
       ligne : il est ignoré ici (le ticket restait ouvert 15 h sur une PR déjà fusionnée). */
    const runs = (j.workflow_runs || []).filter((w) => w.name && !/sentinelle/i.test(w.name) && !/veille-officielle\.yml$/.test(w.path || "") && w.event !== "pull_request" && w.status === "completed");
    // dernier résultat par tâche : un échec réparé ensuite n'est plus un défaut
    const latest = new Map();
    for (const w of runs) if (!latest.has(w.name)) latest.set(w.name, w);
    const broken = [...latest.values()].filter((w) => w.conclusion === "failure");
    /* 09/10/2026 (Usine) : un agent IA en échec (usine-*.yml) n'est pas un défaut du site — sa production est une proposition
       relue par Kevin — : « à surveiller », et jamais rejoué automatiquement (chaque passage coûte). */
    const estAgent = (w) => /\/usine-[a-z-]+\.yml$/.test(w.path || "");
    const casses = broken.filter((w) => !estAgent(w));
    if (casses.length) for (const w of casses) fail("robots", `tâche « ${w.name} » en échec (${w.html_url})`);
    else ok("robots", `${latest.size} tâches GitHub, aucune en échec sur 26 h`);
    for (const w of broken.filter(estAgent)) warn("robots", `agent IA « ${w.name} » en échec (${w.html_url})`);
    for (const w of casses) {
      if (/daily-content\.yml$/.test(w.path || "")) repairs.dailyContent ??= "publication du jour en échec";
      else if ((w.run_attempt ?? 1) === 1 && !/audit-navigateur|e2e|coolify-crons/.test(w.path || "")) repairs.rerun.push({ id: w.id, name: w.name });
    }
  } catch (e) {
    warn("robots", `liste des tâches GitHub illisible : ${e.message}`);
  }
  /* 05/10/2026 : un robot qui ne se lance plus du tout ne produit aucun échec. Âge maximal du dernier passage (heures) :
     liste CADENCE de scripts/lib/sentinelle-robots.mjs (08/10/2026 : + veille officielle 30 h, + robot FOMC). */
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
      /* 06/10/2026 (quota Upstash) : la trace n'est plus écrite qu'une fois par heure (et à chaque envoi ou erreur) → 90 min */
      if (min > 90) fail("robots", `alertes de prix : dernière trace il y a ${Math.round(min)} min (vérification toutes les 15 min, trace horaire)`);
      else if (t.errors > 0) warn("robots", `alertes de prix : ${t.errors} erreur(s) au dernier passage`);
      else ok("robots", `alertes de prix vérifiées il y a ${Math.round(min)} min (${t.checked} alertes)`);
    }
  } catch (e) {
    warn("robots", `trace des alertes illisible : ${e.message}`);
  }
  /* 08/10/2026 (lot fraîcheur A) : instantané de secours des prix, rappels de série, série d'e-mails fiscalité —
     trace « dernier passage + résultat » (lib/cron-trace.ts), seuils de scripts/lib/sentinelle-robots.mjs (3 h, 30 h, 30 h). */
  for (const [key, label, maxH, sourceAttendue] of TRACES_CRON) {
    try {
      const r = await fetch(`${kvUrl}/get/${encodeURIComponent(key)}`, { headers: { Authorization: `Bearer ${kvToken}` }, signal: AbortSignal.timeout(10_000) });
      const j = await r.json();
      if (j.error || !r.ok) { warn("robots", `${label} : trace illisible (HTTP ${r.status})`); continue; }
      const t = typeof j.result === "string" ? JSON.parse(j.result) : j.result;
      const v = jugerTrace(t, label, maxH, Date.now(), sourceAttendue);
      (v.level === "fail" ? fail : v.level === "warn" ? warn : ok)("robots", v.msg);
    } catch (e) {
      warn("robots", `${label} : trace illisible (${e.message})`);
    }
  }
}

/* 07/10/2026 (Kev : « contrôler la consommation de CoinMarketCap pour qu'on ait toujours les ressources pour 1 mois ») :
   compteur officiel de la clé lu par le site (/api/diag/cmc-budget, protégé par CRON_SECRET, 0 crédit). Défaut si, au
   rythme actuel, le garde-fou devrait couper CMC avant la fin du mois (ou le coupe déjà) ; à surveiller au-delà de 80 %. */
/* Lot Z2b (08/10/2026) : la réponse du bilan est gardée pour la section « Consommation du mois » (cmcReponse), avec la raison
   quand elle manque (cmcRaison) : jamais de chiffre supposé. */
let cmcReponse = null;
let cmcRaison = "bilan CoinMarketCap non lu dans ce passage";
async function checkCmcBudget() {
  const secret = (process.env.CRON_SECRET ?? "").trim(); // espaces de bord ignorés, comme le fait fetch pour un en-tête
  if (!secret) { cmcRaison = "CRON_SECRET absent de l'environnement"; return warn("quota", "budget CoinMarketCap non contrôlé (CRON_SECRET absent de l'environnement)"); }
  /* Tickets PUBLICS : jamais la valeur du secret, ni un message d'erreur brut qui pourrait la recopier (fetch cite
     l'en-tête refusé quand le secret contient un retour à la ligne). */
  if (!/^[\x21-\x7e]+$/.test(secret)) { cmcRaison = "CRON_SECRET mal formé"; return fail("quota", "budget CoinMarketCap non contrôlé : CRON_SECRET mal formé (espace, retour à la ligne ou caractère invisible)"); }
  const lire = async () => {
    const { res } = await get(SITE + "/api/diag/cmc-budget", { headers: { authorization: `Bearer ${secret}` }, timeout: 20_000 });
    if (res.status !== 200) { await res.body?.cancel().catch(() => {}); return { http: res.status }; }
    return { b: await res.json() };
  };
  let r;
  try {
    r = await lire();
    // incident ponctuel (compteur ou route) : une seconde lecture une minute plus tard avant de conclure
    if (r.http || !r.b?.lu) { await new Promise((fin) => setTimeout(fin, 65_000)); r = await lire(); }
  } catch (e) {
    cmcRaison = `bilan illisible (${e?.name === "TimeoutError" ? "délai dépassé" : "erreur réseau"})`;
    return warn("quota", `budget CoinMarketCap illisible (${e?.name === "TimeoutError" ? "délai dépassé" : "erreur réseau"})`);
  }
  if (r.http) cmcRaison = `la route du bilan répond HTTP ${r.http}`;
  else cmcReponse = r.b ?? null;
  if (r.http) return fail("quota", `contrôle du budget CoinMarketCap impossible : la route répond HTTP ${r.http} (jeton CRON_SECRET différent entre GitHub et Vercel ?)`);
  const b = r.b;
  if (!b?.lu) {
    // clé absente = CMC simplement pas utilisé ; compteur illisible = garde-fou du mois AVEUGLE (seul cas où le mois peut s'épuiser)
    if (/clé/.test(b?.raison ?? "")) return warn("quota", `CoinMarketCap non utilisé : ${b.raison}`);
    return fail("quota", "garde-fou mensuel CoinMarketCap aveugle : compteur officiel illisible (le site ne règle plus son rythme que par instance)");
  }
  /* 08/10/2026 (lot Z1, architecture 0 € § 6.2 point 3) : compteur QUOTIDIEN (/v1/key/info) et erreur 1009 (plafond du
     jour atteint). Le plafond quotidien de l'offre Basic existe mais sa valeur n'est pas publiée : jamais supposé. */
  const v = jugerCmcJour(b, Date.now());
  (v.level === "fail" ? fail : v.level === "warn" ? warn : ok)("quota", v.msg);
  const resume = `CoinMarketCap : ${fmt(b.aujourdhui)} crédits aujourd'hui, ${fmt(b.moisUtilises)} sur ${fmt(b.moisPlafond)} ce mois ; rythme ≈ ${fmt(b.rythmeJour)}/jour, soit ≈ ${fmt(b.besoinFinDeMois)} d'ici la fin du mois pour ${fmt(b.disponible)} disponibles (garde-fou : ${b.mode})`;
  if (b.niveau === "alerte") {
    // ligne ❌ STABLE (le ticket n'est complété que si l'ensemble des défauts change) ; chiffres du moment à part
    fail("quota", b.mode === "arrêt"
      ? "CoinMarketCap coupé par le garde-fou du mois : les pages passent sur les autres sources jusqu'à la remise à zéro"
      : "au rythme actuel, le garde-fou couperait CoinMarketCap avant la fin du mois");
    warn("quota", `${resume} — ${b.raison}`);
  } else if (b.niveau === "attention") warn("quota", `${resume} — ${b.raison}`);
  else ok("quota", resume);
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

/* ------------------------------------------------------------------ cours des fiches (lot fraîcheur A2, audit L3) */
async function checkCoursFiches() {
  let fiches;
  try {
    fiches = fichesDuPlan(await (await get(SITE + "/sitemap.xml")).res.text());
  } catch (e) {
    warn("cours des fiches", `plan du site illisible (${e.message})`);
    return;
  }
  const echantillon = choisirEchantillon(fiches, Date.now(), 30);
  const defauts = [];
  let controlees = 0, masquees = 0, bloquees = 0;
  const temoinsSansRepere = [];
  for (const id of echantillon) {
    try {
      let { res } = await get(`${SITE}/cryptos/${id}`);
      let html = await res.text();
      if (isCheckpoint(res.status, html)) { bloquees++; continue; }
      if (res.status !== 200) { defauts.push(`/cryptos/${id} répond ${res.status}`); continue; }
      let j = jugerFiche(html, Date.now());
      if (j.etat === "defaut" && /relevé il y a/.test(j.detail)) {
        // page servie depuis le cache au-delà de sa durée : la première lecture relance la génération, on relit une fois
        await new Promise((r) => setTimeout(r, 8000));
        ({ res } = await get(`${SITE}/cryptos/${id}`));
        html = await res.text();
        j = jugerFiche(html, Date.now());
      }
      if (j.etat === "editoriale") {
        // les témoins sont des fiches générées : sans repère data-cours-*, le contrôle ne voit plus rien
        if (FICHES_TEMOINS.includes(id)) temoinsSansRepere.push(id);
        continue;
      }
      controlees++;
      if (/masqué/.test(j.detail)) masquees++;
      if (j.etat === "defaut") defauts.push(`/cryptos/${id} : ${j.detail}`);
    } catch (e) {
      warn("cours des fiches", `/cryptos/${id} injoignable (${e.message})`);
    }
  }
  // Reprise du 08/10 (juré I7) : un contrôle qui ne voit aucune fiche générée échoue, il ne se contente pas d'avertir.
  for (const id of temoinsSansRepere) defauts.push(`/cryptos/${id} : repère data-cours-* absent (fiche générée lue comme éditoriale : le contrôle des cours est aveugle)`);
  if (controlees === 0 && bloquees < echantillon.length) defauts.push(`aucune fiche générée contrôlée sur ${echantillon.length} lues (repère data-cours-* disparu ?)`);
  if (defauts.length) for (const d of defauts) fail("cours des fiches", d);
  else if (controlees === 0) warn("cours des fiches", `les ${bloquees} lectures ont été bloquées par le pare-feu de Vercel : rien n'a pu être contrôlé`);
  else if (controlees < 20) warn("cours des fiches", `seulement ${controlees} fiches générées contrôlées (20 attendues)`);
  else ok("cours des fiches", `${controlees} fiches contrôlées (dont audiera, luxxcoin) : aucun cours de plus de ${AGE_MAX_H} h affiché, ${masquees} cours masqués`);
}

/* ------------------------------------------------------------------ dates « vérifié le » (lot fraîcheur A2, L1) */
async function checkDatesVerification() {
  // 1. pages : aucune date « vérifié / mis à jour / relevé » affichée hors du composant <VerifieLe>
  const problemes = [];
  let slugsAvis = [];
  try {
    slugsAvis = JSON.parse(readFileSync(path.join(ROOT, "data/platforms.json"), "utf8")).platforms.map((x) => x.id);
  } catch { /* liste illisible : pages fixes seulement */ }
  const PAGES = pagesDatesDuJour(slugsAvis, Date.now());
  for (const p of PAGES) {
    try {
      const { res } = await get(SITE + p);
      const html = await res.text();
      if (isCheckpoint(res.status, html) || res.status !== 200) continue;
      for (const d of jugerPageDates(html)) problemes.push(`${p} : « ${d} »`);
    } catch (e) {
      warn("dates vérifiées", `${p} injoignable (${e.message})`);
    }
  }
  if (problemes.length) for (const pb of problemes.slice(0, 20)) fail("dates vérifiées", `date affichée hors du composant : ${pb}`);
  else ok("dates vérifiées", `${PAGES.length} pages : toutes les dates « vérifié le » passent par le composant`);
  // 2. données : dates au-delà du seuil de leur famille (information, la page l'affiche déjà « à revérifier »)
  const inv = inventaireDonnees(ROOT, Date.now());
  const vieilles = inv.filter((l) => l.aReverifier > 0);
  if (vieilles.length) warn("dates vérifiées", `à revérifier : ${vieilles.map((l) => `${l.champ} (${l.aReverifier}/${l.total}, seuil ${l.seuil} j)`).join(" ; ")}`);
  else ok("dates vérifiées", `${inv.length} champs de date sous leur seuil`);
}

/* ------------------------------------------------------------------ registre des 51 familles (lot Z1, 08/10/2026) */
/* Architecture 0 € § 6.2 : la vraie date de chaque famille de data/fraicheur/registre.json est lue et notée ✅ / ⚠️ / ❌
   (date illisible = ❌, jamais « inconnue »). Une famille ❌ ouvre un ticket dédié (étape du workflow, dédoublonné par
   titre) ; un ticket « état des 51 familles » est publié chaque dimanche. Ici : un décompte et la liste des ❌, en
   « à surveiller » (le signal par famille est son ticket ; la sentinelle ne passe pas au rouge pour une donnée tenue en
   session qui attend sa relecture). Fichiers écrits : fraicheur-etat.json, fraicheur-hebdo.md (à côté du rapport). */
const pagesLues = new Map();
async function texteDuSite(chemin) {
  if (!pagesLues.has(chemin)) {
    pagesLues.set(chemin, (async () => {
      const { res } = await get(SITE + chemin);
      const corps = await res.text();
      return res.status === 200 && !isCheckpoint(res.status, corps) ? corps : null;
    })());
  }
  return pagesLues.get(chemin);
}
async function kvLire(cle) {
  const kvUrl = process.env.KV_REST_API_URL?.replace(/\/$/, "");
  const kvToken = process.env.KV_REST_API_TOKEN;
  const r = await fetch(`${kvUrl}/get/${encodeURIComponent(cle)}`, { headers: { Authorization: `Bearer ${kvToken}` }, signal: AbortSignal.timeout(10_000) });
  const j = await r.json();
  if (j.error || !r.ok) throw new Error(`HTTP ${r.status}`);
  return typeof j.result === "string" ? JSON.parse(j.result) : j.result;
}
const accesSupabase = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return url && key ? { url, key } : null;
};

/* Lot Z2b : les fichiers fraicheur-etat.json et fraicheur-hebdo.md sont écrits à la FIN du contrôle complet
   (ecrireEtatFraicheur), une fois la consommation du mois mesurée : elle y figure (section du ticket du dimanche). */
let etatFraicheur = null;
async function checkRegistreFraicheur() {
  let reg;
  try {
    reg = chargerRegistre(ROOT);
  } catch (e) {
    return fail("registre de fraîcheur", `data/fraicheur/registre.json illisible (${e.message})`);
  }
  const erreurs = validerRegistre(reg);
  if (erreurs.length) fail("registre de fraîcheur", `registre mal formé : ${erreurs.slice(0, 5).join(" ; ")}`);
  const ctx = {
    root: ROOT,
    now: Date.now(),
    env: process.env,
    fetch,
    ua: UA,
    getTexte: texteDuSite,
    kvGet: process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN ? kvLire : null,
    github: { token: process.env.GITHUB_TOKEN, repo: process.env.GITHUB_REPOSITORY },
    supabase: accesSupabase(),
  };
  const resultats = await evaluerRegistre(reg, ctx);
  const n = compter(resultats);
  etatFraicheur = { now: ctx.now, resultats, compte: n };
  ok("registre de fraîcheur", `${resultats.length} familles : ${n.ok} ✅, ${n.attention} ⚠️, ${n.defaut} ❌`);
  const defauts = resultats.filter((r) => r.etat === "defaut");
  if (defauts.length) warn("registre de fraîcheur", `familles ❌ (un ticket par famille) : ${defauts.map((r) => `n° ${r.id}`).join(", ")}`);
}

/* Expirations (§ 6.2 point 4) : jetons du Gardien (06/10/2027), cron-job.org ; avertissement à J-30, défaut si expiré. */
function checkExpirations() {
  let reg;
  try { reg = chargerRegistre(ROOT); } catch { return; }
  for (const e of reg.expirations || []) {
    const v = jugerExpiration(e, Date.now());
    (v.level === "fail" ? fail : v.level === "warn" ? warn : ok)("expirations", v.msg);
  }
}

/* Taille de la base Supabase (§ 6.2 point 3) : ⚠️ à 60 %, ❌ à 80 % de 500 Mo. Lecture par la fonction SQL
   cryptoreflex_taille_base (migration 20261008_taille_base_sentinelle.sql, à lancer par Kev) avec la clé déjà présente ;
   tant qu'elle n'existe pas : « non mesurable », jamais un chiffre supposé. */
const tailleBase = { octets: null, plafond: 524_288_000, raison: "taille non lue dans ce passage" };
async function checkTailleBase() {
  let plafond = 524_288_000;
  try { plafond = chargerRegistre(ROOT).quotas?.supabase?.plafondOctets ?? plafond; } catch { /* plafond par défaut */ }
  tailleBase.plafond = plafond;
  const acces = accesSupabase();
  if (!acces) { tailleBase.raison = "accès Supabase absent de l'environnement"; return warn("quota", jugerTailleBase(null, plafond, "accès Supabase absent de l'environnement").msg); }
  try {
    const r = await fetch(`${acces.url.replace(/\/$/, "")}/rest/v1/rpc/cryptoreflex_taille_base`, {
      method: "POST",
      headers: { apikey: acces.key, Authorization: `Bearer ${acces.key}`, "content-type": "application/json" },
      body: "{}",
      signal: AbortSignal.timeout(15_000),
    });
    const corps = await r.json().catch(() => null);
    if (!r.ok) {
      const absente = r.status === 404 || /PGRST202|could not find the function/i.test(JSON.stringify(corps ?? ""));
      tailleBase.raison = absente ? "fonction SQL cryptoreflex_taille_base absente" : `HTTP ${r.status}`;
      return warn("quota", jugerTailleBase(null, plafond, absente ? "fonction SQL cryptoreflex_taille_base absente (migration 20261008_taille_base_sentinelle.sql non lancée)" : `HTTP ${r.status}`).msg);
    }
    const v = jugerTailleBase(Number(corps), plafond);
    if (typeof corps === "number" && Number.isFinite(corps) && corps >= 0) tailleBase.octets = corps;
    else tailleBase.raison = "réponse de la fonction illisible";
    (v.level === "fail" ? fail : v.level === "warn" ? warn : ok)("quota", v.msg);
    if (v.detail) warn("quota", v.detail);
  } catch (e) {
    tailleBase.raison = `lecture impossible (${e?.name === "TimeoutError" ? "délai dépassé" : "erreur réseau"})`;
    warn("quota", jugerTailleBase(null, plafond, `lecture impossible (${e?.name === "TimeoutError" ? "délai dépassé" : "erreur réseau"})`).msg);
  }
}

/* ------------------------------------------------------------------ consommation du mois (lot Z2b, 08/10/2026) */
/* Kev : « à toi de faire en sorte qu'on gère la conso du mois », 0 € de dépassement, site jamais coupé. Un tableau par service :
   consommé, limite, projection de fin de mois (consommé ÷ jours écoulés × jours du mois), état ✅ < 75 % · ⚠️ 75-90 % · ❌ > 90 %.
   Mesuré sans nouveau secret : CoinMarketCap (compteur officiel via le bilan du site, sinon compteur interne des robots),
   Supabase (fonction SQL de taille, seuils 60/80 %), GitHub Actions (API avec GITHUB_TOKEN). Upstash et Vercel : « non mesuré »
   (leurs compteurs exigent un jeton de gestion que le site n'a pas ; alerte e-mail du fournisseur). Le FREIN (robot des cours)
   est décidé par le robot lui-même ; ici on l'affiche. */
let consommation = null;
async function checkConsommationMois() {
  const now = Date.now();
  const gh = await compterExecutionsMois({ repo: process.env.GITHUB_REPOSITORY, token: process.env.GITHUB_TOKEN, now, ua: UA });
  const services = [
    mesureCmc(cmcReponse, now, { raison: cmcReponse?.raison ?? cmcRaison, limiteSecours: 15_000 }),
    mesureStock({ id: "supabase", nom: "Supabase (base de données)", octets: tailleBase.octets, plafond: tailleBase.plafond, raison: tailleBase.raison, source: "fonction SQL cryptoreflex_taille_base" }),
    mesureGithub({ ...gh, now }),
    nonMesure("upstash", "Upstash (KV)"),
    nonMesure("vercel", "Vercel (crédit Pro du mois)"),
  ];
  consommation = { bilan: bilanConsommation(services, now), markdown: sectionConsommation(services, now) };
  const mesures = services.filter((s) => s.etat !== "non-mesure");
  ok("consommation", `${mesures.length} service(s) mesuré(s) sur ${services.length} : ${services.map((s) => `${s.nom.split(" (")[0]} ${s.icone}`).join(", ")}`);
  for (const s of services) {
    if (s.etat === "attention") warn("consommation", s.msg);
  }
  // Un défaut qui n'a pas déjà son signal ailleurs : dépôt GitHub privé (minutes facturables). CoinMarketCap ❌ est traité par le
  // frein du robot (affiché dans la section) ; la taille de la base a son contrôle (checkTailleBase).
  const gith = services.find((s) => s.id === "github");
  if (gith?.etat === "defaut") fail("quota", "dépôt GitHub privé : les minutes de GitHub Actions deviennent facturables (repasser le dépôt en public)");
  const cmc = services.find((s) => s.id === "cmc");
  if (cmc?.etat === "defaut") warn("consommation", cmc.msg);
}

/* Fichiers lus par l'étape « Tickets Fraîcheur » du workflow : état des familles + section « Consommation du mois ». */
function ecrireEtatFraicheur() {
  if (!etatFraicheur) return; // registre illisible : on n'écrit rien (sinon le workflow fermerait tous les tickets de famille)
  const { now, resultats, compte } = etatFraicheur;
  const dir = path.dirname(REPORT);
  writeFileSync(path.join(dir, "fraicheur-etat.json"), JSON.stringify({ le: new Date(now).toISOString(), compte, resultats, tickets: ticketsDefauts(resultats), ...(consommation ? { consommation: consommation.bilan } : {}) }, null, 1));
  writeFileSync(path.join(dir, "fraicheur-hebdo.md"), rapportHebdo(resultats, now) + (consommation ? "\n" + consommation.markdown : ""));
}

/* ------------------------------------------------------------------ résumé pour l'Usine (KV), 09/10/2026 */
/* Tableau de bord /admin/usine (lib/usine/etat.ts) : résumé « dernier passage » — comptes, défauts et points à surveiller
   (mêmes textes que le ticket privé : sans secret ni donnée personnelle), réparations décidées ; le contrôle complet y ajoute
   l'état des 51 familles, la consommation du mois et la taille de la base. UNE commande SET par passage (deux la nuit) ;
   un KV absent ou en panne n'écrit rien et ne change pas le verdict. */
async function ecrireResumeUsine() {
  const kvUrl = process.env.KV_REST_API_URL?.replace(/\/$/, "");
  const kvToken = process.env.KV_REST_API_TOKEN;
  if (!kvUrl || !kvToken) return;
  const court = (r) => ({ area: r.area, msg: String(r.msg).slice(0, 200) });
  const defauts = results.filter((r) => r.level === "fail");
  const surveiller = results.filter((r) => r.level === "warn");
  const maintenant = new Date().toISOString();
  // date de première apparition de chaque défaut (relue dans le résumé précédent) : le garde-fou de l'Usine n'incrimine une
  // fusion que pour un défaut apparu APRÈS elle
  const anciens = new Map();
  try {
    const r = await fetch(`${kvUrl}/get/${encodeURIComponent("usine:sentinelle:dernier")}`, { headers: { Authorization: `Bearer ${kvToken}` }, signal: AbortSignal.timeout(10_000) });
    const j = await r.json();
    const prev = typeof j.result === "string" ? JSON.parse(j.result) : j.result;
    for (const d of prev?.defauts ?? []) if (d?.area && d?.msg) anciens.set(`${d.area}|${d.msg}`, d.depuis ?? prev.at);
  } catch {
    /* premier passage ou KV muet : tous les défauts datent de maintenant */
  }
  const date = (d) => ({ ...d, depuis: anciens.get(`${d.area}|${d.msg}`) ?? maintenant });
  const resume = {
    at: maintenant,
    full: FULL,
    fails: defauts.length,
    warns: surveiller.length,
    oks: results.length - defauts.length - surveiller.length,
    defauts: defauts.slice(0, 40).map(court).map(date),
    surveiller: surveiller.slice(0, 40).map(court),
    reparations: repairs,
  };
  if (FULL) {
    if (etatFraicheur?.compte) resume.fraicheur = etatFraicheur.compte;
    if (consommation?.bilan) resume.consommation = consommation.bilan;
    resume.tailleBase = tailleBase;
  }
  const ecrire = async (key, ttl) => {
    const r = await fetch(kvUrl, {
      method: "POST",
      headers: { Authorization: `Bearer ${kvToken}`, "content-type": "application/json" },
      body: JSON.stringify(["SET", key, JSON.stringify(resume), "EX", ttl]),
      signal: AbortSignal.timeout(10_000),
    });
    await r.body?.cancel().catch(() => {});
  };
  try {
    await ecrire("usine:sentinelle:dernier", 3 * 86_400);
    if (FULL) await ecrire("usine:sentinelle:complet", 8 * 86_400);
  } catch {
    /* KV indisponible : le tableau de bord affiche « résumé non écrit » ; le verdict de ce passage ne change pas */
  }
}

/* ------------------------------------------------------------------ exécution + rapport */
await checkKeyPages();
await checkFreshness();
await checkAnalyses();
await checkRobots();
await checkOrchestrator();
await checkGameContent();
await checkCmcBudget();
if (FULL) {
  await checkFiscal();
  await checkPartners();
  await checkCoursFiches();
  await checkDatesVerification();
  await checkRegistreFraicheur();
  checkExpirations();
  await checkTailleBase();
  await checkConsommationMois();
  ecrireEtatFraicheur();
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
await ecrireResumeUsine();
/* 07/10/2026 : dépôt public = journal public. Sur la sortie standard, un simple décompte ; le détail (défauts, réparations,
   chiffres d'infrastructure) reste dans le fichier du rapport, publié seulement dans le ticket du dépôt privé. */
console.log(`${fails.length} défaut(s), ${warns.length} à surveiller, ${results.filter((r) => r.level === "ok").length} contrôles réussis`);
process.exit(fails.length ? 1 : 0);
