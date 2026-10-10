#!/usr/bin/env node
/**
 * scripts/fiches-liens.mjs — robot de nuit « fiches sans défaut » (lot Z3, 10/10/2026 ; reprise du 10/10).
 *
 * Lancé par .github/workflows/fiches-liens.yml (Gardien 03:40 UTC + horaire natif de secours). Pages contrôlées : toutes
 * les fiches /cryptos/<slug> du plan du site et les 100 pages /acheter/<slug>/fr. Les 1 381 duels /vs ne sont pas lus
 * (≈ 23 min de plus à 1 requête par seconde, plus leurs liens) : leurs adresses sont contrôlées comme liens internes quand
 * une fiche y renvoie.
 * Règles : scripts/lib/fiches-defauts.mjs. Budget : UNE requête par seconde au plus (toutes destinations confondues),
 * durée bornée (--duree-max-min, 280 par défaut) ; la durée mesurée est écrite dans le résultat et dans le run.
 * Reprise Z3 :
 *  - B1 : chaque lien sortant est demandé à l'adresse ÉCRITE dans la page (« / » final gardé) ;
 *  - B2 : un lien déjà déclaré mort (donc retiré du HTML par le rendu) est retesté chaque nuit ;
 *  - I3 : défauts de page ou lien mort encore affiché (non retirable) → alerte (sortie GitHub « alerte », ticket) ;
 *  - I4 : plan du site à 0 fiche, plan enfant en échec ou moins de 90 % des pages du passage précédent → code 2 ;
 *  - M3 : une redirection d'un lien sortant est suivie une fois.
 * Sortie : data/fiches/defauts.json. Codes : 1 si au moins un lien interne est mort (ticket par le workflow) ; 2 si le
 * passage n'a pas pu se faire (plan illisible ou incomplet).
 *
 * Usage : node scripts/fiches-liens.mjs [--base URL] [--max-pages N] [--sans-acheter] [--sortie fichier] [--duree-max-min N]
 * Journaux publics : adresses publiques et codes HTTP seulement.
 */
import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  CODES_REDIRECTION,
  classerSortant,
  defautsPage,
  etatSortants,
  extraireLiens,
  jugerInterne,
  normaliserUrl,
  pagesInsuffisantes,
  SITE,
  sortantsAControler,
} from "./lib/fiches-defauts.mjs";
import { fichesDuPlan } from "./lib/sentinelle-cours.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const arg = (n, d) => {
  const i = process.argv.indexOf(n);
  return i > 0 ? process.argv[i + 1] : d;
};
const BASE = String(arg("--base", SITE)).replace(/\/$/, "");
const SORTIE = path.resolve(ROOT, arg("--sortie", "data/fiches/defauts.json"));
const MAX_PAGES = Number(arg("--max-pages", "0")) || Infinity;
const DUREE_MAX_MS = Number(arg("--duree-max-min", "280")) * 60_000;
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36 (cryptoreflex-fiches-liens)";
const INTERVALLE_MS = 1_000;
const T0 = Date.now();

let derniere = 0;
/** Une requête par seconde au plus, toutes destinations confondues. */
async function requete(url, opts = {}) {
  const attente = derniere + INTERVALLE_MS - Date.now();
  if (attente > 0) await new Promise((r) => setTimeout(r, attente));
  derniere = Date.now();
  try {
    const r = await fetch(url, { redirect: "manual", ...opts, headers: { "user-agent": UA, accept: "text/html,application/xhtml+xml,*/*;q=0.8", "accept-language": "fr-FR,fr;q=0.9", ...(opts.headers ?? {}) }, signal: AbortSignal.timeout(20_000) });
    return { code: r.status, location: r.headers.get("location"), r };
  } catch (e) {
    const cause = String(e?.cause?.code ?? e?.code ?? e?.name ?? "");
    return { code: 0, erreur: /ENOTFOUND|EAI_AGAIN|ENODATA/.test(cause) ? "DNS" : /Timeout|Abort/i.test(cause) ? "délai" : cause || "réseau" };
  }
}
const horsBudget = () => Date.now() - T0 > DUREE_MAX_MS;

/** Lien sortant : GET à l'adresse brute, une redirection suivie (M3). */
async function sonderSortant(url) {
  let r = await requete(url);
  if (CODES_REDIRECTION.has(r.code) && r.location) {
    let cible = null;
    try { cible = new URL(r.location, url).toString(); } catch { /* adresse de redirection illisible : on garde le 3xx */ }
    if (cible) r = await requete(cible);
  }
  return r;
}

async function lirePlan() {
  const r = await requete(`${BASE}/sitemap.xml`, { redirect: "follow" });
  if (r.code !== 200) throw new Error(`plan du site : HTTP ${r.code || r.erreur}`);
  let xml = await r.r.text();
  // index de plans : on lit les plans enfants ; un plan enfant en échec = passage impossible (I4)
  const enfants = [...xml.matchAll(/<sitemap>[\s\S]*?<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
  for (const e of enfants) {
    const s = await requete(e, { redirect: "follow" });
    if (s.code !== 200) throw new Error(`plan enfant ${e} : HTTP ${s.code || s.erreur}`);
    xml += await s.r.text();
  }
  const fiches = fichesDuPlan(xml).map((f) => `/cryptos/${f.id}`);
  const acheter = process.argv.includes("--sans-acheter") ? [] : [...xml.matchAll(/<loc>[^<]*?(\/acheter\/[^/<]+\/fr)<\/loc>/g)].map((m) => m[1]);
  return { pages: [...new Set([...fiches, ...acheter])], nbFiches: new Set(fiches).size };
}

function sortieGithub(cle, valeur) {
  if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `${cle}=${valeur}\n`);
}

async function main() {
  const precedent = existsSync(SORTIE) ? JSON.parse(readFileSync(SORTIE, "utf8")) : null;
  const debutIso = new Date().toISOString();
  const nuit = debutIso.slice(0, 10);
  const plan = await lirePlan();
  const pages = plan.pages.slice(0, MAX_PAGES);
  // minimum de pages : seulement sur un passage complet (--max-pages sert aux essais locaux)
  if (MAX_PAGES === Infinity) {
    const manque = pagesInsuffisantes(pages.length, plan.nbFiches, precedent);
    if (manque) throw new Error(manque);
  }
  console.log(`[fiches-liens] ${pages.length} pages à lire (${BASE})`);
  const defauts = {};
  const internes = new Map(); // chemin → pages qui y renvoient
  const desPages = new Map(); // clé normalisée → { url brute, pages }
  let lues = 0;
  for (const p of pages) {
    if (horsBudget()) break;
    const r = await requete(`${BASE}${p}`);
    lues++;
    if (r.code !== 200) {
      defauts[p] = [{ type: "page", detail: r.code ? `la fiche répond HTTP ${r.code}` : `pas de réponse (${r.erreur})` }];
      continue;
    }
    const html = await r.r.text();
    const d = defautsPage(html);
    if (d.length) defauts[p] = d;
    const l = extraireLiens(html, BASE);
    for (const i of l.internes) internes.set(i, [...(internes.get(i) ?? []), p]);
    for (const s of l.sortants) {
      const k = normaliserUrl(s);
      if (!k) continue;
      const v = desPages.get(k) ?? { url: s, pages: [] };
      v.pages.push(p);
      desPages.set(k, v);
    }
  }
  const sortants = sortantsAControler(desPages, precedent);
  const retires = [...sortants.values()].filter((v) => v.retire).length;
  console.log(`[fiches-liens] pages lues : ${lues}/${pages.length} ; liens internes uniques : ${internes.size} ; sortants uniques : ${desPages.size} (+ ${retires} retiré(s) retesté(s))`);

  // (a) liens internes : 200, ou 301/308 → 200 en un saut (HEAD, GET si HEAD est refusé)
  const internesMorts = [];
  const internesNonConcluants = [];
  let internesControles = 0;
  for (const [chemin, origines] of internes) {
    if (horsBudget()) break;
    if (pages.includes(chemin) && !defauts[chemin]?.some((x) => x.type === "page")) {
      internesControles++;
      continue; // déjà lue en 200 ci-dessus
    }
    const juger = async () => {
      let r = await requete(`${BASE}${chemin}`, { method: "HEAD" });
      if (r.code === 405 || r.code === 501) r = await requete(`${BASE}${chemin}`);
      let cible = null;
      if ((r.code === 301 || r.code === 308) && r.location) cible = (await requete(new URL(r.location, BASE).toString(), { method: "HEAD" })).code;
      return jugerInterne(r.code, cible);
    };
    let j = await juger();
    // refus du pare-feu ou pas de réponse : un second essai 15 s plus tard ; toujours refusé = non concluant (pas mort)
    if (j.nonConcluant) {
      await new Promise((ok) => setTimeout(ok, 15_000));
      j = await juger();
    }
    internesControles++;
    if (j.nonConcluant) internesNonConcluants.push({ url: chemin, detail: j.detail });
    else if (!j.ok) internesMorts.push({ url: chemin, detail: j.detail, pages: origines.slice(0, 5), nbPages: origines.length });
  }

  // (b) liens sortants : GET à l'adresse brute, 2 essais espacés ; mort après 2 nuits d'échec (DNS, 404, 410, 5xx)
  const resultats = {};
  for (const { url } of sortants.values()) {
    if (horsBudget()) break;
    let r = await sonderSortant(url);
    let classe = classerSortant(r.code, r.erreur);
    if (classe !== "ok") {
      await new Promise((res) => setTimeout(res, 5_000));
      r = await sonderSortant(url);
      classe = classerSortant(r.code, r.erreur);
    }
    resultats[url] = { classe, code: r.code || r.erreur || null };
  }
  const etat = etatSortants(precedent, sortants, resultats, nuit, debutIso);

  const dureeS = Math.round((Date.now() - T0) / 1000);
  const complet = lues === pages.length && internesControles === internes.size && Object.keys(resultats).length === sortants.size;
  const sortie = {
    _lisezMoi:
      "Résultat du robot de nuit « fiches sans défaut » (scripts/fiches-liens.mjs, lot Z3). liensSortantsMorts : adresses retirées des fiches au rendu (lib/liens-morts.ts) jusqu'à guérison (mort = DNS, 404, 410 ou 5xx deux nuits de suite ; retestées chaque nuit même retirées). liensInternesMorts : le robot échoue et ouvre un ticket. liensMortsAffiches et defautsPages : alerte (ticket) et ⚠️ à la carte de fraîcheur.",
    passeLe: new Date().toISOString(),
    dureeS,
    complet,
    resume: {
      pages: pages.length,
      pagesLues: lues,
      liensInternes: internes.size,
      liensInternesControles: internesControles,
      liensInternesMorts: internesMorts.length,
      liensInternesNonConcluants: internesNonConcluants.length,
      liensSortants: desPages.size,
      liensSortantsRetiresRetestes: retires,
      liensSortantsControles: Object.keys(resultats).length,
      liensSortantsEnEchec: Object.keys(etat.enEchec).length,
      liensSortantsMorts: etat.morts.length,
      liensMortsAffiches: etat.mortsAffiches.length,
      pagesAvecDefauts: Object.keys(defauts).length,
    },
    liensSortantsMorts: etat.morts,
    sortantsEnEchec: Object.fromEntries(Object.entries(etat.enEchec).sort(([a], [b]) => a.localeCompare(b))),
    liensInternesMorts: internesMorts,
    liensInternesNonConcluants: internesNonConcluants,
    liensMortsAffiches: etat.mortsAffiches,
    defautsPages: Object.fromEntries(Object.entries(defauts).sort(([a], [b]) => a.localeCompare(b))),
  };
  mkdirSync(path.dirname(SORTIE), { recursive: true });
  writeFileSync(SORTIE, JSON.stringify(sortie, null, 1) + "\n");
  console.log(`[fiches-liens] ${JSON.stringify(sortie.resume)} ; durée ${dureeS} s ; ${complet ? "passage complet" : "passage INCOMPLET (budget de durée atteint)"}`);
  const alerte = sortie.resume.pagesAvecDefauts > 0 || sortie.resume.liensMortsAffiches > 0 || !complet;
  sortieGithub("alerte", alerte ? "true" : "false");
  if (process.env.GITHUB_STEP_SUMMARY) {
    const lignes = [
      "## Fiches sans défaut",
      "",
      `Durée mesurée : ${Math.floor(dureeS / 60)} min ${dureeS % 60} s · ${complet ? "passage complet" : "passage incomplet (budget de durée)"}`,
      "",
      "| Mesure | Valeur |",
      "|---|---|",
      ...Object.entries(sortie.resume).map(([k, v]) => `| ${k} | ${v} |`),
      "",
      ...internesMorts.slice(0, 30).map((m) => `- ❌ lien interne ${m.url} : ${m.detail} (sur ${m.nbPages} page(s), dont ${m.pages[0]})`),
      ...internesNonConcluants.slice(0, 30).map((m) => `- ⚠️ lien interne non concluant (refus ou pas de réponse, 2 essais) : ${m.url} : ${m.detail}`),
      ...etat.mortsAffiches.slice(0, 30).map((m) => `- ⚠️ lien mort encore affiché (non retirable) : ${m.url} (sur ${m.nbPages} page(s), dont ${m.pages[0]})`),
      ...Object.entries(defauts).slice(0, 30).map(([p, d]) => `- ⚠️ ${p} : ${d.map((x) => x.type).join(", ")}`),
      ...etat.morts.slice(0, 30).map((u) => `- 🔗 lien sortant retiré des fiches : ${u}`),
    ];
    writeFileSync(process.env.GITHUB_STEP_SUMMARY, lignes.join("\n") + "\n", { flag: "a" });
  }
  if (internesMorts.length) {
    console.error(`[fiches-liens] ${internesMorts.length} lien(s) interne(s) mort(s)`);
    process.exit(1);
  }
}

main().catch((e) => {
  console.error(`[fiches-liens] échec : ${e.message}`);
  sortieGithub("alerte", "true");
  process.exit(2);
});
