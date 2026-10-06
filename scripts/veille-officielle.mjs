#!/usr/bin/env node
/**
 * scripts/veille-officielle.mjs — veille de nuit sur les sources officielles dont dépendent les chiffres du site.
 *
 * Kev, 05/10/2026 : « il faut que les calculs se mettent à jour automatiquement sur les sources officielles, je n'ai pas
 * envie d'avoir la moindre erreur ». Chaque nuit (.github/workflows/veille-officielle.yml), ce script compare l'état
 * actuel des sources à l'état de référence relu et accepté (data/veille/etat.json) :
 *  - [loi]      Légifrance (API officielle PISTE) : nouvelle version d'un article suivi, y compris une version à venir
 *               (« VIGUEUR_DIFF » : une loi de finances votée en décembre est vue avant son entrée en vigueur) ;
 *  - [valeur]   chaque chiffre repris par le site (305 €, 12,8 %, tranches du barème, décote, 10,6 %…) doit figurer tel
 *               quel dans le texte officiel en vigueur (data/veille/sources.json, « attendus ») ;
 *  - [bofip]    nouvelle version d'une fiche BOFiP suivie (page officielle) + nouvelle fiche qui cite le régime crypto
 *               (jeu de données ouvert bofip-vigueur, mis à jour chaque mois) ;
 *  - [page]     date « modifié le » / « vérifié le » / millésime des pages officielles (FAQ impots.gouv, 2086,
 *               service-public) et chiffres attendus dans ces pages ;
 *  - [registre] autorisation MiCA de chaque plateforme (registre de l'ESMA) contre data/platforms.json ;
 *  - [frais]    grilles tarifaires citées par le comparateur : empreinte des pourcentages et montants (ou du PDF).
 * Un écart → ligne « - ❌ » dans le rapport, code de sortie 1, ticket GitHub « veille-officielle » (lu par la routine
 * Claude du matin, qui relit la source, met le site à jour puis réenregistre la référence).
 *
 * Usage : node scripts/veille-officielle.mjs [--enregistrer] [--detail] [--sans-frais] [--navigateur]
 *   --enregistrer  réécrit data/veille/etat.json avec l'état observé (APRÈS relecture humaine ou de la routine)
 *   --detail       imprime les extraits officiels (versions, phrases chiffrées) : sert à écrire les « attendus »
 *   --navigateur   relit au navigateur (Playwright) les grilles de frais illisibles sans lui
 * Variables : PISTE_CLIENT_ID / PISTE_CLIENT_SECRET (Légifrance ; jamais imprimées), VEILLE_REPORT (défaut
 * veille-report.md). Textes de loi = domaine public ; aucun secret ni donnée personnelle dans le rapport.
 */
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync, existsSync, appendFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const ARGS = new Set(process.argv.slice(2));
const ENREGISTRER = ARGS.has("--enregistrer");
const DETAIL = ARGS.has("--detail");
const SANS_FRAIS = ARGS.has("--sans-frais");
const NAVIGATEUR = ARGS.has("--navigateur");
const SOURCES = JSON.parse(readFileSync(path.join(ROOT, "data/veille/sources.json"), "utf8"));
const ETAT_PATH = path.join(ROOT, "data/veille/etat.json");
const ETAT = existsSync(ETAT_PATH) ? JSON.parse(readFileSync(ETAT_PATH, "utf8")) : {};
const REPORT = process.env.VEILLE_REPORT || path.join(ROOT, "veille-report.md");
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0 Safari/537.36 CryptoreflexVeille/1.0";
const AUJ = new Date().toISOString().slice(0, 10);

const lignes = []; // { niveau: "fail"|"warn"|"new"|"ok", zone, msg, changement? }
const fail = (zone, msg) => lignes.push({ niveau: "fail", zone, msg });
/** Source modifiée (nouvelle version, nouvelle date, nouvelle grille) : résolu par « --enregistrer » une fois le site relu.
 *  Les autres échecs (chiffre absent du texte officiel, registre en désaccord, source illisible) ne le sont PAS. */
const changement = (zone, msg) => lignes.push({ niveau: "fail", zone, msg, changement: true });
const warn = (zone, msg) => lignes.push({ niveau: "warn", zone, msg });
const nouveau = (zone, msg) => lignes.push({ niveau: "new", zone, msg });
const ok = (zone, msg) => lignes.push({ niveau: "ok", zone, msg });
const observe = { legifrance: {}, bofip: {}, filets: {}, pages: {}, frais: {} };

/* Les identifiants PISTE ne doivent JAMAIS apparaître dans un journal (dépôt public) : tout texte imprimé passe par ici. */
const SECRETS = [process.env.PISTE_CLIENT_ID, process.env.PISTE_CLIENT_SECRET].filter((s) => s && s.length > 6);
const propre = (s) => SECRETS.reduce((t, x) => t.split(x).join("***"), String(s));
const log = (...a) => console.log(propre(a.join(" ")));

const ENT = { nbsp: " ", eacute: "é", egrave: "è", ecirc: "ê", agrave: "à", acirc: "â", ccedil: "ç", ocirc: "ô", ucirc: "û", icirc: "î", iuml: "ï", euml: "ë", rsquo: "'", lsquo: "'", laquo: "«", raquo: "»", amp: "&", quot: '"', apos: "'", lt: "<", gt: ">", deg: "°", euro: "€", Eacute: "É" };
/** Texte comparable : balises retirées, entités décodées, toutes les espaces (insécables comprises) réduites à une seule. */
function texte(html) {
  return String(html || "")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&([a-z]+);/gi, (m, n) => ENT[n] ?? m)
    .replace(/[’‘]/g, "'")
    .replace(/[\s    ]+/g, " ")
    .trim();
}
const norm = (s) => texte(s);
const jour = (v) => {
  if (v == null || v === "") return null;
  if (typeof v === "number") return new Date(v).toISOString().slice(0, 10);
  const s = String(v);
  if (/^\d{10,}$/.test(s)) return new Date(Number(s)).toISOString().slice(0, 10);
  return s.slice(0, 10);
};
const sha = (b) => createHash("sha256").update(b).digest("hex").slice(0, 16);

/** Requête avec 2 nouvelles tentatives (réseau, 5xx, 429) : une coupure passagère n'est pas un changement de source. */
async function req(url, init = {}) {
  let last;
  for (let i = 0; i < 3; i++) {
    if (i) await new Promise((r) => setTimeout(r, 3000 * i));
    try {
      const res = await fetch(url, { redirect: "follow", ...init, headers: { "user-agent": UA, "accept-language": "fr-FR,fr;q=0.9", ...(init.headers || {}) }, signal: AbortSignal.timeout(init.timeout ?? 40_000) });
      if ((res.status >= 500 || res.status === 429) && i < 2) { last = new Error(`HTTP ${res.status}`); await res.body?.cancel().catch(() => {}); continue; }
      return res;
    } catch (e) {
      last = e;
    }
  }
  throw last;
}
const raison = (e) => propre(e?.cause?.code || e?.message || e).slice(0, 80);

/* ------------------------------------------------------------------ Légifrance (API PISTE) */
const PISTE = [
  { nom: "production", oauth: "https://oauth.piste.gouv.fr/api/oauth/token", api: "https://api.piste.gouv.fr/dila/legifrance/lf-engine-app" },
  { nom: "bac à sable", oauth: "https://sandbox-oauth.piste.gouv.fr/api/oauth/token", api: "https://sandbox-api.piste.gouv.fr/dila/legifrance/lf-engine-app" },
];
/** Forme d'un identifiant, sans jamais le révéler : longueur, format UUID, espaces parasites. */
const forme = (v) => `${v.length} car.${/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v.trim()) ? ", format UUID" : ""}${v !== v.trim() ? ", ESPACES AUTOUR" : ""}`;
async function jetonPiste() {
  const brutId = process.env.PISTE_CLIENT_ID || "", brutSecret = process.env.PISTE_CLIENT_SECRET || "";
  if (!brutId.trim() || !brutSecret.trim()) return { erreur: "PISTE_CLIENT_ID / PISTE_CLIENT_SECRET absents" };
  const id = brutId.trim(), secret = brutSecret.trim();
  const essais = [];
  // Ordre normal, puis identifiants inversés (collage dans le mauvais champ), en formulaire puis en en-tête « Basic ».
  const variantes = [
    { nom: "", id, secret },
    { nom: " (identifiants inversés)", id: secret, secret: id },
  ];
  for (const env of PISTE) {
    for (const v of variantes) {
      for (const basic of [false, true]) {
        try {
          const headers = { "content-type": "application/x-www-form-urlencoded", accept: "application/json" };
          const corps = { grant_type: "client_credentials", scope: "openid" };
          if (basic) headers.authorization = `Basic ${Buffer.from(`${v.id}:${v.secret}`).toString("base64")}`;
          else Object.assign(corps, { client_id: v.id, client_secret: v.secret });
          const res = await req(env.oauth, { method: "POST", headers, body: new URLSearchParams(corps) });
          const j = await res.json().catch(() => ({}));
          if (res.ok && j.access_token) {
            if (v.nom) warn("loi", `identifiants PISTE inversés dans les secrets GitHub (PISTE_CLIENT_ID ↔ PISTE_CLIENT_SECRET) : ça marche, mais à remettre dans l'ordre`);
            return { ...env, token: j.access_token, entetes: null, nom: env.nom + v.nom + (basic ? " (en-tête Basic)" : "") };
          }
          essais.push(`${env.nom}${v.nom}${basic ? " Basic" : ""} : HTTP ${res.status} ${propre(j.error || "")} ${propre(j.error_description || "").slice(0, 120)}`.trim());
        } catch (e) {
          essais.push(`${env.nom}${v.nom} : ${raison(e)}`);
        }
      }
    }
  }
  // Repli : PISTE accepte aussi une « clé d'API » (en-tête KeyId) — l'un des deux secrets peut en être une.
  for (const env of PISTE) {
    for (const [nomVar, cle] of [["PISTE_CLIENT_ID", id], ["PISTE_CLIENT_SECRET", secret]]) {
      try {
        const res = await req(`${env.api}/consult/getArticle`, { method: "POST", headers: { KeyId: cle, "content-type": "application/json", accept: "application/json" }, body: JSON.stringify({ id: "LEGIARTI000038612228" }) });
        const j = await res.json().catch(() => ({}));
        if (res.ok && j.article) return { ...env, entetes: { KeyId: cle }, nom: `${env.nom}, clé d'API contenue dans ${nomVar}` };
        essais.push(`${env.nom} clé d'API ${nomVar} : HTTP ${res.status} ${propre(JSON.stringify(j)).slice(0, 160)}`);
      } catch (e) {
        essais.push(`${env.nom} clé d'API ${nomVar} : ${raison(e)}`);
      }
    }
  }
  return { erreur: `jeton refusé (${essais.join(" ; ")}) ; PISTE_CLIENT_ID = ${forme(brutId)}, PISTE_CLIENT_SECRET = ${forme(brutSecret)}` };
}
async function lf(api, chemin, corps) {
  const res = await req(api.api + chemin, { method: "POST", headers: { ...(api.entetes || { authorization: `Bearer ${api.token}` }), "content-type": "application/json", accept: "application/json" }, body: JSON.stringify(corps) });
  const brut = await res.text();
  let json = null;
  try { json = JSON.parse(brut); } catch {}
  return { status: res.status, json, brut: propre(brut.slice(0, 240)) };
}
// « ABROGE_DIFF » = version en vigueur aujourd'hui dont la fin est déjà fixée (ex. art. 1736 : du 01/07/2026 au 01/01/2030, vu le 06/10/2026).
const EN_VIGUEUR = new Set(["VIGUEUR", "ABROGE_DIFF"]);
const versionsDe = (a) => (a?.articleVersions || []).map((v) => ({ id: v.id, etat: v.etat, debut: jour(v.dateDebut), fin: jour(v.dateFin) }));

/** Version EN VIGUEUR d'un article (et versions à venir), à partir d'un identifiant connu ou du couple texte + numéro. */
async function articleEnVigueur(api, src) {
  const traces = [];
  let a = null;
  if (src.idConnu) {
    const r = await lf(api, "/consult/getArticle", { id: src.idConnu });
    traces.push(`getArticle(${src.idConnu}) HTTP ${r.status}${r.json?.article ? "" : " " + r.brut}`);
    a = r.json?.article || null;
  }
  if (!a?.id) {
    for (const chemin of ["/consult/getArticleWithIdandNum", "/consult/getArticleWithIdAndNum"]) {
      const r = await lf(api, chemin, { id: src.texte, num: src.num });
      traces.push(`${chemin.split("/").pop()}(${src.num}) HTTP ${r.status}${r.json?.article ? "" : " " + r.brut}`);
      if (r.json?.article?.id) { a = r.json.article; break; }
    }
  }
  if (!a?.id) return { erreur: traces.join(" | ") };
  let versions = versionsDe(a);
  const courante = versions.find((v) => EN_VIGUEUR.has(v.etat));
  if (courante && courante.id !== a.id) {
    const r = await lf(api, "/consult/getArticle", { id: courante.id });
    traces.push(`getArticle(version en vigueur ${courante.id}) HTTP ${r.status}`);
    if (r.json?.article?.id) { a = r.json.article; if (!versions.length) versions = versionsDe(a); }
  }
  return {
    id: a.id,
    num: a.num,
    etat: a.etat,
    debut: jour(a.dateDebut),
    fin: jour(a.dateFin),
    texte: norm(a.texte || a.texteHtml || ""),
    versions,
    differees: versions.filter((v) => v.etat === "VIGUEUR_DIFF").map((v) => `${v.id}@${v.debut}`),
    traces,
    cles: Object.keys(a).slice(0, 40).join(","),
  };
}
/** Extraits utiles pour écrire les « attendus » : phrases qui contiennent un chiffre en € ou en %. */
const extraits = (t, max = 1400) => (t.match(/[^.;]*\d[\d ]*(?:,\d+)? ?(?:€|%|euros)[^.;]*/g) || []).map((s) => s.trim()).join(" ‖ ").slice(0, max);

async function veilleLegifrance() {
  const api = await jetonPiste();
  if (api.erreur) {
    fail("loi", `Légifrance inaccessible : ${api.erreur}. Les articles de loi ne sont PAS contrôlés cette nuit.`);
    return;
  }
  log(`Légifrance : jeton obtenu (${api.nom}).`);
  for (const src of SOURCES.legifrance) {
    let a;
    try { a = await articleEnVigueur(api, src); } catch (e) { a = { erreur: raison(e) }; }
    if (a.erreur) { fail("loi", `${src.cle} : lecture impossible (${a.erreur})`); continue; }
    observe.legifrance[src.cle] = { id: a.id, debut: a.debut, differees: a.differees };
    if (DETAIL) {
      log(`\n### ${src.cle} → ${a.id} (num ${a.num}, état ${a.etat}, en vigueur du ${a.debut} au ${a.fin}) ; champs : ${a.cles}`);
      log(`  appels : ${a.traces.join(" | ")}`);
      log(`  versions : ${a.versions.map((v) => `${v.id}:${v.etat}:${v.debut}→${v.fin}`).join("  ") || "(aucune liste)"}`);
      log(`  extraits : ${extraits(a.texte) || a.texte.slice(0, 600)}`);
    }
    if (a.etat && !EN_VIGUEUR.has(a.etat)) warn("loi", `${src.cle} : la version lue (${a.id}) est à l'état ${a.etat}, pas « VIGUEUR »`);
    const ref = ETAT.legifrance?.[src.cle];
    if (!ref) nouveau("loi", `${src.cle} : version ${a.id} en vigueur depuis le ${a.debut} (pas encore de référence)`);
    else {
      if (ref.id !== a.id) changement("loi", `${src.cle} (${src.sujet}) : NOUVELLE VERSION ${a.id} en vigueur depuis le ${a.debut} (référence : ${ref.id} du ${ref.debut}) → relire l'article et les pages qui en dépendent`);
      const neuves = a.differees.filter((d) => !(ref.differees || []).includes(d));
      if (neuves.length) changement("loi", `${src.cle} (${src.sujet}) : version À VENIR publiée (${neuves.join(", ")}) → préparer la mise à jour du site avant son entrée en vigueur`);
      if (ref.id === a.id && !neuves.length) ok("loi", `${src.cle} : inchangé (${a.id})`);
    }
    if (!a.texte) { fail("valeur", `${src.cle} : texte vide, chiffres non contrôlés`); continue; }
    for (const att of src.attendus || []) {
      if (!a.texte.includes(norm(att))) fail("valeur", `${src.cle} ne contient plus « ${att} » (${src.sujet}) → chiffre du site peut-être faux`);
    }
    await new Promise((r) => setTimeout(r, 400));
  }
}

/* ------------------------------------------------------------------ BOFiP */
const BOFIP_API = "https://data.economie.gouv.fr/api/explore/v2.1/catalog/datasets/bofip-vigueur/records";
async function bofipJeu(where, select = "identifiant_juridique,debut_de_validite,permalien") {
  const out = [];
  for (let offset = 0; offset < 500; offset += 100) {
    const u = new URL(BOFIP_API);
    u.searchParams.set("select", select);
    u.searchParams.set("where", where);
    u.searchParams.set("limit", "100");
    u.searchParams.set("offset", String(offset));
    const res = await req(u);
    if (!res.ok) throw new Error(`jeu de données BOFiP HTTP ${res.status}`);
    const j = await res.json();
    out.push(...j.results);
    if (offset + 100 >= j.total_count) break;
  }
  return out;
}
async function veilleBofip() {
  for (const f of SOURCES.bofip.fiches) {
    let date = null, source = "page";
    try {
      // L'adresse sans version redirige vers la version en vigueur : …/identifiant=<BOI>-AAAAMMJJ
      const res = await req(f.page);
      const html = await res.text();
      const m = res.url.match(/identifiant=([A-Z0-9-]+)-(\d{8})/);
      if (res.ok && m && m[1] === f.id) date = `${m[2].slice(0, 4)}-${m[2].slice(4, 6)}-${m[2].slice(6, 8)}`;
      else if (res.ok) {
        const ds = [...html.matchAll(new RegExp(`${f.id.replace(/-/g, "\\-")}-(\\d{8})`, "g"))].map((x) => x[1]).sort();
        if (ds.length) { const d = ds[ds.length - 1]; date = `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}`; }
      }
    } catch {}
    if (!date) {
      try {
        const [r] = await bofipJeu(`identifiant_juridique="${f.id}"`);
        if (r) { date = r.debut_de_validite; source = "jeu de données (mensuel)"; if (DETAIL) log(`BOFiP ${f.id} : page officielle illisible, permalien du jeu de données = ${r.permalien}`); }
      } catch {}
    }
    if (!date) { warn("bofip", `${f.id} : version en vigueur illisible cette nuit (page et jeu de données)`); continue; }
    observe.bofip[f.id] = date;
    const ref = ETAT.bofip?.[f.id];
    if (!ref) nouveau("bofip", `${f.id} : version du ${date} (${source}, pas encore de référence)`);
    else if (ref !== date) changement("bofip", `${f.id} (${f.sujet}) : NOUVELLE VERSION du ${date} (référence : ${ref}) → relire la fiche ; ${f.page}`);
    else ok("bofip", `${f.id} : inchangée (${date})`);
  }
  for (const q of SOURCES.bofip.filets) {
    let rows;
    try { rows = await bofipJeu(q, "identifiant_juridique,debut_de_validite"); } catch (e) { warn("bofip", `filet ${q} : ${raison(e)}`); continue; }
    const vus = rows.map((r) => `${r.identifiant_juridique}@${r.debut_de_validite}`).sort();
    observe.filets[q] = vus;
    const ref = ETAT.filets?.[q];
    if (!ref) { nouveau("bofip", `filet ${q} : ${vus.length} fiches (pas encore de référence)`); continue; }
    const neufs = vus.filter((v) => !ref.includes(v));
    if (neufs.length) changement("bofip", `fiche(s) BOFiP nouvelle(s) ou modifiée(s) qui citent ${q} : ${neufs.join(", ")} → relire`);
    else ok("bofip", `filet ${q} : rien de neuf (${vus.length} fiches)`);
  }
}

/* ------------------------------------------------------------------ pages officielles */
async function veillePages() {
  for (const p of SOURCES.pages) {
    let html;
    try {
      const res = await req(p.url);
      html = await res.text();
      if (!res.ok) { warn("page", `${p.cle} : HTTP ${res.status} cette nuit (non contrôlée)`); continue; }
    } catch (e) { warn("page", `${p.cle} : ${raison(e)} (non contrôlée)`); continue; }
    const t = texte(html);
    const m = t.match(new RegExp(p.repere, "i"));
    if (!m) { fail("page", `${p.cle} : repère de date introuvable (la page a changé de forme ?) ; ${p.url}`); continue; }
    observe.pages[p.cle] = m[1];
    const ref = ETAT.pages?.[p.cle];
    if (!ref) nouveau("page", `${p.cle} : repère « ${m[1]} » (pas encore de référence)`);
    else if (ref !== m[1]) changement("page", `${p.cle} (${p.sujet}) : page modifiée (« ${m[1]} », référence « ${ref} ») → relire ; ${p.url}`);
    else ok("page", `${p.cle} : inchangée (${m[1]})`);
    for (const att of p.attendus || []) if (!t.includes(norm(att))) fail("valeur", `${p.cle} ne contient plus « ${att} » (${p.sujet}) ; ${p.url}`);
    if (DETAIL) log(`page ${p.cle} : repère ${m[1]} ; chiffres : ${[...new Set(t.match(/\d[\d ]*(?:,\d+)? ?(?:%|€)/g) || [])].slice(0, 30).join(" | ")}`);
  }
}

/* ------------------------------------------------------------------ registre MiCA (ESMA) */
function csv(text) {
  const rows = [];
  let row = [], f = "", q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) { if (c === '"' && text[i + 1] === '"') { f += '"'; i++; } else if (c === '"') q = false; else f += c; }
    else if (c === '"') q = true;
    else if (c === ",") { row.push(f); f = ""; }
    else if (c === "\n" || c === "\r") { if (c === "\r" && text[i + 1] === "\n") i++; row.push(f); rows.push(row); row = []; f = ""; }
    else f += c;
  }
  if (f || row.length) { row.push(f); rows.push(row); }
  const [h, ...r] = rows;
  return r.filter((x) => x.length > 5).map((x) => Object.fromEntries(h.map((k, i) => [k.trim(), (x[i] ?? "").trim()])));
}
const simple = (s) => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
const finPassee = (d) => { const m = String(d || "").match(/^(\d{2})\/(\d{2})\/(\d{4})$/); return m ? `${m[3]}-${m[2]}-${m[1]}` <= AUJ : false; };
async function veilleRegistre() {
  let rows;
  try {
    const res = await req(SOURCES.registre.esma);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    rows = csv((await res.text()).replace(/^﻿/, ""));
  } catch (e) { warn("registre", `registre ESMA illisible cette nuit (${raison(e)})`); return; }
  if (rows.length < 100) { warn("registre", `registre ESMA anormalement court (${rows.length} lignes) : non contrôlé`); return; }
  const autoriseFR = (r) => (r.ae_homeMemberState === "FR" || r.ac_serviceCode_cou.split(/\s*\|\s*/).includes("FR")) && !finPassee(r.ac_authorisationEndDate);
  const { platforms } = JSON.parse(readFileSync(path.join(ROOT, "data/platforms.json"), "utf8"));
  const exceptions = SOURCES.registre.exceptions || {};
  let n = 0;
  for (const p of platforms) {
    if (p.category === "wallet") continue;
    const ent = p.mica?.legalEntity;
    const lignesP = ent ? rows.filter((r) => simple(r.ae_lei_name) === simple(ent)) : [];
    // Plateforme sans entité au registre : on cherche son nom commercial (une nouvelle autorisation doit se voir).
    const parNom = !ent ? rows.filter((r) => simple(`${r.ae_lei_name} ${r.ae_commercial_name}`).split(" ").includes(simple(p.name).split(" ")[0])) : [];
    const registreFR = lignesP.some(autoriseFR);
    const site = !!p.mica?.micaCompliant;
    n++;
    if (exceptions[p.id]) { if (registreFR !== site) ok("registre", `${p.name} : écart assumé (${exceptions[p.id]})`); else warn("registre", `${p.name} : l'exception « ${exceptions[p.id]} » n'a plus lieu d'être (registre et site d'accord) → la retirer de data/veille/sources.json`); continue; }
    if (ent && !lignesP.length && site) fail("registre", `${p.name} : l'entité « ${ent} » n'apparaît plus au registre MiCA de l'ESMA alors que le site la dit autorisée → vérifier (retrait ? changement de nom ?)`);
    else if (registreFR !== site) fail("registre", `${p.name} : registre ESMA = ${registreFR ? "autorisée en France" : "PAS autorisée en France"}, site = ${site ? "autorisée" : "non autorisée"} → mettre data/platforms.json à jour`);
    else if (!ent && parNom.some(autoriseFR)) fail("registre", `${p.name} : une entité à ce nom apparaît au registre MiCA avec la France (${parNom.map((r) => r.ae_lei_name).join(", ")}) → statut à revoir`);
  }
  ok("registre", `registre ESMA : ${rows.length} lignes, ${n} plateformes rapprochées`);
}

/* ------------------------------------------------------------------ grilles de frais */
/** Taux et montants d'une grille (« 1 000 € » et « 1,50 % » compris), normalisés et dédoublonnés. */
const jetonsFrais = (t) => [...new Set((t.match(/\d{1,3}(?:[ .,]\d{3})+(?:,\d+)? ?(?:%|€)|\d+(?:[.,]\d+)? ?(?:%|€)/g) || []).map((x) => x.replace(/ /g, "").replace(/\./g, ",")))].sort();
/* Navigateur réel (Playwright, option --navigateur) pour les grilles rendues en JavaScript ou filtrées : lancé une seule fois. */
let navigateur = null;
async function rendre(url) {
  if (!navigateur) {
    const { chromium } = await import("playwright");
    const b = await chromium.launch();
    navigateur = { b, ctx: await b.newContext({ locale: "fr-FR", viewport: { width: 1280, height: 900 } }) };
  }
  const page = await navigateur.ctx.newPage();
  try {
    const res = await page.goto(url, { waitUntil: "domcontentloaded", timeout: 45_000 });
    await page.waitForTimeout(5000);
    return { status: res?.status() ?? 0, texte: texte(await page.evaluate(() => document.body?.innerText || "")), html: await page.content() };
  } finally {
    await page.close().catch(() => {});
  }
}
/** Pages sans chiffre (« quels moyens de paiement ? ») : phrases qui parlent de frais, de minimum ou de limites. */
const MOTS_FRAIS = /frais|fee|commission|spread|marge|majoration|minimum|limite|limit|gratuit|free of charge|no fee|tarif|pricing|co[uû]t|cost/i;
const phrasesFrais = (t) => [...new Set(t.split(/(?<=[.!?])\s+/).filter((s) => MOTS_FRAIS.test(s) && s.length > 25).map((s) => s.trim().slice(0, 160)))].sort();
/** Liens vers des PDF d'une page qui liste les documents (une nouvelle grille tarifaire = un nouveau lien). */
const liensPdf = (html, base) => [...new Set([...String(html).matchAll(/href=["']([^"']+?\.pdf[^"']*)["']/gi)].map((m) => { try { return decodeURI(new URL(m[1].replace(/&amp;/g, "&"), base).href); } catch { return m[1]; } }))].sort();
/** Empreinte d'une page de frais : PDF (octets), liste de PDF (page index) ou taux et montants (page). null + raison si illisible. */
async function empreinte(url, { index = false, viaNav = false } = {}) {
  let pourquoi = "";
  if (!viaNav) {
    try {
      const res = await req(url, { timeout: 45_000 });
      const type = res.headers.get("content-type") || "";
      if (res.status === 404 || res.status === 410) return { pourquoi: `HTTP ${res.status}`, disparue: true };
      if (!res.ok) pourquoi = `HTTP ${res.status}`;
      else if (/pdf/i.test(type) || /\.pdf($|\?)/i.test(url)) return { emp: { pdf: sha(Buffer.from(await res.arrayBuffer())) } };
      else {
        const html = await res.text();
        if (index) {
          const liens = liensPdf(html, url);
          if (liens.length) return { emp: { liens: sha(liens.join("|")), liste: liens } };
          pourquoi = "aucun lien PDF sans navigateur";
        } else {
          const t = texte(html);
          const jetons = jetonsFrais(t);
          if (t.length >= 1500 && jetons.length) return { emp: { jetons: sha(jetons.join("|")), liste: jetons.slice(0, 80) } };
          const ph = phrasesFrais(t);
          if (t.length >= 1500 && ph.length) return { emp: { phrases: sha(ph.join("|")), liste: ph.slice(0, 40) } };
          pourquoi = "pas de grille lisible sans navigateur";
        }
      }
    } catch (e) { pourquoi = raison(e); }
  }
  if (!NAVIGATEUR) return { pourquoi };
  try {
    const r = await rendre(url);
    if (index) {
      const liens = liensPdf(r.html, url);
      if (r.status < 400 && liens.length) return { emp: { mode: "navigateur", liens: sha(liens.join("|")), liste: liens } };
      return { pourquoi: `navigateur : HTTP ${r.status}, ${liens.length} lien(s) PDF` };
    }
    const jetons = jetonsFrais(r.texte);
    if (r.status < 400 && r.texte.length >= 800 && jetons.length) return { emp: { mode: "navigateur", jetons: sha(jetons.join("|")), liste: jetons.slice(0, 80) } };
    const ph = phrasesFrais(r.texte);
    if (r.status < 400 && r.texte.length >= 800 && ph.length) return { emp: { mode: "navigateur", phrases: sha(ph.join("|")), liste: ph.slice(0, 40) } };
    return { pourquoi: r.status >= 400 ? `bloquée (HTTP ${r.status}, protection anti-robot probable)` : `navigateur : HTTP ${r.status}, ${r.texte.length} caractères, ni taux ni phrase de frais` };
  } catch (e) {
    return { pourquoi: `navigateur : ${raison(e)}` };
  }
}
async function veilleFrais() {
  const { platforms } = JSON.parse(readFileSync(path.join(ROOT, "data/platforms.json"), "utf8"));
  const F = SOURCES.frais || {};
  const ignorer = new Set(F.ignorer || []);
  const illisibles = [];
  let vues = 0;
  for (const p of platforms) {
    if (ignorer.has(p.id)) continue;
    const index = F.index?.[p.id] || [];
    // Une page déclarée « index » n'est relue que comme liste de PDF : relue aussi comme page, les deux empreintes s'écrasaient
    // (faux « phrases changées » chaque nuit sur deblock.com/fr/accords-juridiques, vu le 06/10/2026).
    const pages = [...new Set([p.fees?.cost?.source, ...(F.pages?.[p.id] || [])].filter((u) => typeof u === "string" && u && !index.includes(u)))];
    if (!pages.length && !index.length) continue;
    const refP = ETAT.frais?.[p.id] || {};
    const obs = (observe.frais[p.id] = {});
    for (const [url, estIndex] of [...pages.map((u) => [u, false]), ...index.map((u) => [u, true])]) {
      // Une page relevée au navigateur se relit TOUJOURS au navigateur (sinon l'empreinte changerait avec la méthode).
      const { emp, pourquoi, disparue } = await empreinte(url, { index: estIndex, viaNav: NAVIGATEUR && refP[url]?.mode === "navigateur" });
      // Page de frais supprimée (404/410) : la source citée par le comparateur n'existe plus → à traiter, pas à taire.
      if (disparue) { if (!refP[url]?.disparue) changement("frais", `${p.name} : page de frais disparue (${pourquoi}) → retrouver la grille officielle et corriger la source citée ; ${url}`); obs[url] = { disparue: true }; continue; }
      if (!emp) { illisibles.push(`${p.name} ${url} (${pourquoi})`); if (refP[url]) obs[url] = refP[url]; continue; }
      vues++;
      obs[url] = emp;
      const ref = refP[url];
      if (!ref) { nouveau("frais", `${p.name} : ${url} relevée (pas encore de référence)`); continue; }
      const cle = emp.pdf ? "pdf" : emp.liens ? "liens" : emp.phrases ? "phrases" : "jetons";
      if (ref[cle] === emp[cle]) continue;
      let diff = "";
      if (emp.liste && ref.liste) {
        const plus = emp.liste.filter((x) => !ref.liste.includes(x)), moins = ref.liste.filter((x) => !emp.liste.includes(x));
        diff = ` (apparus : ${plus.join(" ") || "—"} ; disparus : ${moins.join(" ") || "—"})`;
      }
      const quoi = cle === "pdf" ? "le document PDF a changé" : cle === "liens" ? "la liste des documents tarifaires a changé" : cle === "phrases" ? "les phrases sur les frais ou limites ont changé" : "les taux ou montants de la page ont changé";
      changement("frais", `${p.name} : ${quoi}${diff} → revérifier les frais affichés au comparateur ; ${url}`);
    }
  }
  if (navigateur) await navigateur.b.close().catch(() => {});
  ok("frais", `${vues} page(s) de frais relues`);
  if (illisibles.length) warn("frais", `pages de frais non relues cette nuit (${illisibles.length}) — référence précédente conservée : ${illisibles.join(" ; ")}`);
}

/* ------------------------------------------------------------------ exécution */
const etapes = [["Légifrance", veilleLegifrance], ["BOFiP", veilleBofip], ["pages officielles", veillePages], ["registre MiCA", veilleRegistre]];
if (!SANS_FRAIS) etapes.push(["grilles de frais", veilleFrais]);
for (const [nom, f] of etapes) {
  try { await f(); } catch (e) { fail("veille", `étape ${nom} interrompue : ${raison(e)}`); }
}

const ICON = { fail: "❌", warn: "⚠️", new: "🆕", ok: "✅" };
const ordre = { fail: 0, warn: 1, new: 2, ok: 3 };
const tri = [...lignes].sort((a, b) => ordre[a.niveau] - ordre[b.niveau]);
const nb = (n) => lignes.filter((l) => l.niveau === n).length;
const md = [
  `## Veille officielle — ${AUJ}`,
  "",
  nb("fail") ? `**${nb("fail")} changement(s) ou écart(s) à traiter.** Relire chaque source, mettre le site à jour, puis réenregistrer la référence (workflow « Veille officielle », option « enregistrer »).` : "Aucun changement sur les sources officielles suivies.",
  "",
  ...tri.filter((l) => l.niveau !== "ok").map((l) => `- ${ICON[l.niveau]} [${l.zone}] ${l.msg}`),
  "",
  `<details><summary>${nb("ok")} contrôle(s) sans changement</summary>`,
  "",
  ...tri.filter((l) => l.niveau === "ok").map((l) => `- ✅ [${l.zone}] ${l.msg}`),
  "",
  "</details>",
].join("\n");
writeFileSync(REPORT, propre(md));
if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, propre(md) + "\n");
log(md);

if (ENREGISTRER) {
  // On ne remplace que ce qui a été observé cette nuit : une source illisible garde sa référence précédente.
  const fusion = (a = {}, b = {}) => ({ ...a, ...b });
  const etat = {
    _lisezmoi: "État de référence relu et accepté des sources officielles (voir data/veille/sources.json). Réécrit par « node scripts/veille-officielle.mjs --enregistrer » : à ne lancer qu'après avoir mis le site à jour.",
    _enregistre: AUJ,
    legifrance: fusion(ETAT.legifrance, observe.legifrance),
    bofip: fusion(ETAT.bofip, observe.bofip),
    filets: fusion(ETAT.filets, observe.filets),
    pages: fusion(ETAT.pages, observe.pages),
    frais: fusion(ETAT.frais, observe.frais),
  };
  writeFileSync(ETAT_PATH, JSON.stringify(etat, null, 2) + "\n");
  log(`\nRéférence enregistrée dans data/veille/etat.json (${Object.keys(observe).map((k) => `${k} ${Object.keys(observe[k]).length}`).join(", ")}).`);
  // Un réenregistrement ne règle que les changements de version : un chiffre absent du texte officiel reste un échec.
  const restants = lignes.filter((l) => l.niveau === "fail" && !l.changement);
  if (restants.length) log(`\n${restants.length} écart(s) NON résolu(s) par l'enregistrement (voir le rapport).`);
  process.exit(restants.length ? 1 : 0);
}
process.exit(nb("fail") ? 1 : 0);
