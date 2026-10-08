/**
 * scripts/lib/fraicheur-registre.mjs — registre de fraîcheur des 51 familles (+ 18b), lot Z1 du 08/10/2026
 * (architecture 0 € § 6.2, carte de fraîcheur du 08/10/2026).
 *
 * Lu par la sentinelle complète (scripts/sentinelle.mjs) : pour chaque famille de data/fraicheur/registre.json, la VRAIE
 * date est lue (KV, GitHub, fichier, constante, page en production, base Supabase…) et jugée :
 *   ✅ âge ≤ ageMaxH · ⚠️ âge ≤ critiqueH · ❌ au-delà, ou date illisible, ou robot en échec.
 * Aucune famille n'est « inconnue » : une date qu'on ne sait pas lire vaut ❌ (on ne prouve pas la fraîcheur).
 * Fonctions pures isolées pour les tests (tests/lib/fraicheur-registre.test.ts) ; les lectures réseau passent par ctx.
 * Aucun secret n'est écrit dans un résultat (les messages ne contiennent ni clé ni jeton).
 */
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";

const HEURE = 3_600_000;
const JOUR = 24 * HEURE;

export const METHODES = ["kv", "workflow", "fichier", "constante", "dossier", "page", "page-calcul", "supabase", "recomptage", "echeance-jeu", "absence", "aucune"];
/** 51 familles de la carte + 18b (liste noire AMF), dans l'ordre */
export const IDS_ATTENDUS = [...Array.from({ length: 51 }, (_, i) => String(i + 1)).flatMap((id) => (id === "18" ? ["18", "18b"] : [id]))];
export const ICONES = { ok: "✅", attention: "⚠️", defaut: "❌" };

export function chargerRegistre(root) {
  return JSON.parse(readFileSync(path.join(root, "data/fraicheur/registre.json"), "utf8"));
}

/** Erreurs de forme du registre (liste vide = valide). */
export function validerRegistre(reg) {
  const err = [];
  const fam = Array.isArray(reg?.familles) ? reg.familles : [];
  const ids = fam.map((f) => f.id);
  for (const id of IDS_ATTENDUS) if (!ids.includes(id)) err.push(`famille ${id} absente`);
  for (const id of ids) if (!IDS_ATTENDUS.includes(id)) err.push(`famille ${id} inattendue`);
  if (new Set(ids).size !== ids.length) err.push("identifiant en double");
  for (const f of fam) {
    const ou = `famille ${f.id}`;
    for (const k of ["famille", "source", "robot", "cadence"]) if (typeof f[k] !== "string" || !f[k].trim()) err.push(`${ou} : ${k} manquant`);
    if (!(typeof f.ageMaxH === "number" && f.ageMaxH > 0)) err.push(`${ou} : ageMaxH invalide`);
    const l = f.lecture;
    if (!l || !METHODES.includes(l.methode)) { err.push(`${ou} : méthode de lecture absente ou inconnue`); continue; }
    if (typeof l.explication !== "string" || l.explication.length < 10) err.push(`${ou} : explication de la lecture manquante`);
    if (l.methode !== "echeance-jeu" && !(typeof f.critiqueH === "number" && f.critiqueH >= f.ageMaxH)) err.push(`${ou} : critiqueH doit être ≥ ageMaxH`);
    const requis = {
      kv: ["cle", "champ"], workflow: ["fichier"], fichier: ["fichier", "chemin", "mode"], constante: ["fichier", "motif"],
      dossier: ["dossier", "champ", "mode"], page: ["chemin", "motif", "mode"], "page-calcul": ["chemin", "motif"],
      supabase: ["table", "colonne", "filtre", "mode"], recomptage: [], "echeance-jeu": ["fichier", "chemin"],
      absence: ["fichiers", "interdits"], aucune: ["raison"],
    }[l.methode];
    for (const k of requis) if (l[k] == null || l[k] === "") err.push(`${ou} : paramètre « ${k} » manquant pour la méthode ${l.methode}`);
    for (const s of l.et || []) if (!s || !METHODES.includes(s.methode)) err.push(`${ou} : lecture complémentaire (et) de méthode inconnue`);
    for (const m of l.motifs || []) { try { new RegExp(m); } catch { err.push(`${ou} : motif d'absence invalide`); } }
    for (const k of ["motif"]) if (l[k]) { try { new RegExp(l[k]); } catch { err.push(`${ou} : motif invalide`); } }
    if (l.mode && !["plusAncienne", "plusRecente"].includes(l.mode)) err.push(`${ou} : mode inconnu`);
  }
  return err;
}

/* ------------------------------------------------------------------ dates */
const MOIS_FR = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];

/**
 * Instant (ms) d'une date lue, ou null. « AAAA-MM » = 1er du mois, « AAAA-MM-JJ » = minuit UTC (on ne rajeunit jamais une
 * donnée) ; horodatage ISO ; « 08 octobre 2026 » ; « 08/10/2026 » ; date RSS ; nombre (secondes ou millisecondes).
 */
export function instantDe(v) {
  if (v == null || v === "") return null;
  if (typeof v === "number") return Number.isFinite(v) ? (v < 1e12 ? v * 1000 : v) : null;
  const s = String(v).trim();
  if (/^\d{10}$/.test(s)) return Number(s) * 1000;
  if (/^\d{13}$/.test(s)) return Number(s);
  if (/^\d{4}-\d{2}$/.test(s)) return Date.parse(`${s}-01T00:00:00Z`);
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return Date.parse(`${s}T00:00:00Z`);
  if (/^\d{4}-\d{2}-\d{2}T/.test(s)) { const t = Date.parse(s); return Number.isFinite(t) ? t : null; }
  let m = s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (m) return Date.parse(`${m[3]}-${m[2]}-${m[1]}T00:00:00Z`);
  m = s.toLowerCase().match(/^(\d{1,2})(?:er)? ([a-zéû]+) (\d{4})$/);
  if (m && MOIS_FR.includes(m[2])) return Date.UTC(Number(m[3]), MOIS_FR.indexOf(m[2]), Number(m[1]));
  const t = Date.parse(s); // RSS (RFC 2822) et autres formats que JavaScript lit sans ambiguïté
  return Number.isFinite(t) ? t : null;
}
const iso = (t) => new Date(t).toISOString();
const jourFr = (t) => new Date(t).toLocaleDateString("fr-FR", { timeZone: "Europe/Paris", day: "2-digit", month: "2-digit", year: "numeric" });
export const ageTexte = (h) => (h < 1 ? `${Math.max(0, Math.round(h * 60))} min` : h < 48 ? `${Math.round(h)} h` : `${Math.round(h / 24)} j`);

/* ------------------------------------------------------------------ lectures locales (pures, testées) */
/**
 * Valeurs d'un chemin « a.b[].c » ; « a.* » = toutes les valeurs de l'objet a ; ids / exclureIds filtrent les éléments
 * de tableau par leur champ id.
 */
export function valeursChemin(obj, chemin, { ids, exclureIds } = {}) {
  let cur = [obj];
  for (const part of chemin.split(".")) {
    if (part === "*") {
      cur = cur.flatMap((o) => (o && typeof o === "object" && !Array.isArray(o) ? Object.values(o) : []));
      continue;
    }
    const tableau = part.endsWith("[]");
    const cle = tableau ? part.slice(0, -2) : part;
    cur = cur.flatMap((o) => {
      const v = o && typeof o === "object" ? o[cle] : undefined;
      if (!tableau) return v === undefined ? [] : [v];
      let arr = Array.isArray(v) ? v : [];
      if (ids) arr = arr.filter((x) => ids.includes(x?.id));
      if (exclureIds) arr = arr.filter((x) => !exclureIds.includes(x?.id));
      return arr;
    });
  }
  return cur;
}

function choisir(dates, mode) {
  const ts = dates.map((d) => ({ d, t: instantDe(d) })).filter((x) => x.t !== null);
  if (!ts.length) return null;
  ts.sort((a, b) => a.t - b.t);
  return (mode === "plusRecente" ? ts[ts.length - 1] : ts[0]).d;
}

export function lireFichier(root, l) {
  let j;
  try { j = JSON.parse(readFileSync(path.join(root, l.fichier), "utf8")); } catch (e) { return { erreur: `${l.fichier} illisible` }; }
  const vals = valeursChemin(j, l.chemin, l).filter((v) => typeof v === "string" || typeof v === "number");
  const date = choisir(vals, l.mode);
  if (date == null) return { erreur: `aucune date lisible dans ${l.fichier} (${l.chemin})` };
  const info = l.champDetail && j?.[l.champDetail] != null ? ` ; ${l.champDetail} = ${j[l.champDetail]}` : "";
  const out = { date, detail: `${l.fichier} ${l.chemin}${vals.length > 1 ? ` (${vals.length} dates, ${l.mode === "plusRecente" ? "la plus récente" : "la plus ancienne"})` : ""}${info}` };
  // exigerIds : chaque identifiant d'une liste de référence (ex. les plateformes de data/platforms.json) doit avoir une
  // date lisible dans l'objet lu (chemin « cle.* ») ; sinon ❌ (une plateforme en écart ne doit jamais se cacher).
  if (l.exigerIds) {
    let refJ;
    try { refJ = JSON.parse(readFileSync(path.join(root, l.exigerIds.fichier), "utf8")); } catch { return { ...out, etatForce: "defaut", raison: `${l.exigerIds.fichier} illisible` }; }
    const elements = valeursChemin(refJ, l.exigerIds.chemin).filter((x) => x && typeof x === "object");
    const attendus = elements.filter((x) => !(l.exigerIds.exclureCategorie && x.category === l.exigerIds.exclureCategorie)).map((x) => x.id).filter(Boolean);
    const base = valeursChemin(j, l.chemin.replace(/\.\*$/, ""))[0] ?? {};
    const manquants = attendus.filter((id) => instantDe(base?.[id]) === null);
    if (manquants.length) {
      return { ...out, etatForce: "defaut", raison: `${manquants.length} sur ${attendus.length} sans date : ${manquants.slice(0, 8).join(", ")}${manquants.length > 8 ? "…" : ""}` };
    }
  }
  if (l.exigerTous) {
    const elements = valeursChemin(j, l.exigerTous, l).length;
    const manquants = elements - vals.filter((v) => instantDe(v) !== null).length;
    if (manquants > 0) return { ...out, etatForce: "defaut", raison: `${manquants} élément(s) sans date sur ${elements}` };
  }
  if (l.pasAvant) {
    const ref = lireFichier(root, l.pasAvant);
    if (ref.date && instantDe(ref.date) > instantDe(date)) return { ...out, etatForce: "attention", raison: `données modifiées après cette date (${ref.date})` };
  }
  return out;
}

export function lireConstante(root, l) {
  let src;
  try { src = readFileSync(path.join(root, l.fichier), "utf8"); } catch { return { erreur: `${l.fichier} illisible` }; }
  const m = src.match(new RegExp(l.motif));
  if (!m) return { erreur: `constante introuvable dans ${l.fichier}` };
  return { date: m[1], detail: `${l.fichier}` };
}

export function lireDossier(root, l) {
  let noms;
  try { noms = readdirSync(path.join(root, l.dossier)).filter((n) => /\.mdx?$/.test(n)); } catch { return { erreur: `${l.dossier} illisible` }; }
  const lireChamp = (src, champ) => src.match(new RegExp(`^${champ}:\\s*["']?(\\d{4}-\\d{2}-\\d{2})`, "m"))?.[1] ?? null;
  const dates = [];
  for (const n of noms) {
    const tete = readFileSync(path.join(root, l.dossier, n), "utf8").slice(0, 3000);
    const d = lireChamp(tete, l.champ) ?? (l.repliChamp ? lireChamp(tete, l.repliChamp) : null);
    if (d) dates.push(d);
  }
  const date = choisir(dates, l.mode);
  if (date == null) return { erreur: `aucune date « ${l.champ} » dans ${l.dossier}` };
  return { date, detail: `${l.dossier} (${dates.length} fichiers datés sur ${noms.length})` };
}

/**
 * Contrôle d'absence : aucun texte « interdits » dans « fichiers », aucun motif (regex) « motifs » dans « fichiers » ni
 * dans les fichiers des « dossiers » ({ dossier, extension }). Un fichier listé illisible = ❌.
 */
export function lireAbsence(root, l, now) {
  const motifs = (l.motifs || []).map((m) => new RegExp(m));
  const aLire = [...l.fichiers.map((f) => ({ f, interdits: true }))];
  for (const d of l.dossiers || []) {
    let noms;
    try { noms = readdirSync(path.join(root, d.dossier)).filter((n) => n.endsWith(d.extension)); } catch { return { erreur: `${d.dossier} illisible` }; }
    for (const n of noms) aLire.push({ f: path.posix.join(d.dossier, n), interdits: false });
  }
  for (const { f, interdits } of aLire) {
    let src;
    try { src = readFileSync(path.join(root, f), "utf8"); } catch { return { erreur: `${f} illisible` }; }
    const trouve = interdits ? l.interdits.find((x) => src.includes(x)) : undefined;
    if (trouve) return { date: iso(now), etatForce: "defaut", raison: `${trouve} présent dans ${f}`, detail: "contrôle du jour" };
    for (const re of motifs) {
      const m = src.match(re);
      if (m) return { date: iso(now), etatForce: "defaut", raison: `« ${m[0].slice(0, 60)} » dans ${f}`, detail: "contrôle du jour" };
    }
  }
  return { date: iso(now), detail: `contrôle du jour : rien d'interdit dans ${aLire.length} fichier(s)` };
}

/** Date extraite d'une page (texte brut), selon le motif (1er groupe) et le mode. */
export function extrairePage(texte, l) {
  const re = new RegExp(l.motif, "g");
  const vals = [...String(texte).matchAll(re)].map((m) => m[1]).filter(Boolean);
  if (!vals.length) return { erreur: `repère de date introuvable dans ${l.chemin}` };
  const date = choisir(vals, l.mode);
  if (date == null) return { erreur: `date illisible dans ${l.chemin} (« ${String(vals[0]).slice(0, 40)} »)` };
  return { date, detail: `${l.chemin}${vals.length > 1 ? ` (${vals.length} dates)` : ""}` };
}

/** Échéance du contenu programmé de Reflex Cards (même règle que checkGameContent de la sentinelle). */
export function echeanceJeu(rules, jourDeSaison, now) {
  const ephMax = Math.max(...Object.keys(rules?.eph || {}).map(Number).filter(Number.isFinite));
  const derniereMission = Object.keys(rules?.missionsByDate || {}).sort().pop() ?? null;
  if (!Number.isFinite(ephMax) || !Number.isFinite(jourDeSaison) || !derniereMission) return { erreur: "contenu programmé du jeu illisible" };
  const finEph = Date.UTC(new Date(now).getUTCFullYear(), new Date(now).getUTCMonth(), new Date(now).getUTCDate()) + (ephMax - jourDeSaison) * JOUR;
  const finMissions = instantDe(derniereMission);
  const echeance = Math.min(finEph, finMissions);
  return { echeance: iso(echeance), detail: `éphémères jusqu'au jour ${ephMax} (jour ${jourDeSaison} aujourd'hui), missions jusqu'au ${derniereMission}` };
}

/**
 * Jour de saison attendu (même règle que lib/reflex-cards/season.ts : jour de Paris − jour 1 + 1). Renvoie la raison
 * d'un écart, ou null. Les pages sont régénérées toutes les heures : dans les 2 h qui suivent minuit à Paris, la veille
 * est encore admise.
 */
export function jugerJourSaison(lu, jour1, now) {
  const paris = (t) => new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Paris", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(t));
  const attendu = Math.round((Date.parse(paris(now)) - Date.parse(jour1)) / JOUR) + 1;
  if (!Number.isFinite(lu)) return "jour de saison illisible";
  if (lu === attendu) return null;
  const heureParis = Number(new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Paris", hour: "2-digit", hourCycle: "h23" }).format(new Date(now)));
  if (lu === attendu - 1 && heureParis < 2) return null;
  return `jour ${lu} affiché, jour ${attendu} attendu (jour 1 = ${jour1})`;
}

/* ------------------------------------------------------------------ jugement (pur) */
/**
 * État d'une famille : { etat: "ok"|"attention"|"defaut", icone, ageH, date, msg }.
 * lu = { date?, echeance?, erreur?, etatForce?, raison?, detail? }.
 */
export function jugerEtat(f, lu, now) {
  const fin = (etat, texte, extra = {}) => ({ id: f.id, famille: f.famille, etat, icone: ICONES[etat], msg: texte, ...extra });
  if (!lu || lu.erreur) return fin("defaut", `date illisible : ${lu?.erreur ?? "aucune lecture"}`, { date: null, ageH: null });
  if (lu.echeance) {
    const t = instantDe(lu.echeance);
    const jours = (t - now) / JOUR;
    const etat = jours < 0 ? "defaut" : jours <= f.ageMaxH / 24 ? "attention" : "ok";
    return fin(etat, `${jours < 0 ? "échéance dépassée" : "échéance"} le ${jourFr(t)} (${jours < 0 ? "depuis" : "dans"} ${Math.abs(Math.round(jours))} j ; alerte à ${Math.round(f.ageMaxH / 24)} j)${lu.detail ? ` — ${lu.detail}` : ""}`, { date: lu.echeance, ageH: null });
  }
  const t = instantDe(lu.date);
  if (t === null) return fin("defaut", `date illisible (« ${String(lu.date).slice(0, 40)} »)`, { date: null, ageH: null });
  const ageH = (now - t) / HEURE;
  let etat = ageH <= f.ageMaxH ? "ok" : ageH <= f.critiqueH ? "attention" : "defaut";
  let note = "";
  if (ageH < -24) { etat = "attention"; note = " ; date dans le futur, à contrôler"; }
  if (lu.etatForce === "defaut") etat = "defaut";
  else if (lu.etatForce === "attention" && etat === "ok") etat = "attention";
  const raison = lu.raison ? ` ; ${lu.raison}` : "";
  return fin(etat, `${jourFr(t)} (il y a ${ageTexte(Math.max(0, ageH))} ; ⚠️ au-delà de ${ageTexte(f.ageMaxH)}, ❌ au-delà de ${ageTexte(f.critiqueH)})${note}${raison}${lu.detail ? ` — ${lu.detail}` : ""}`, { date: iso(t), ageH });
}

/* ------------------------------------------------------------------ lectures (réseau via ctx) */
async function lireKv(l, ctx) {
  if (!ctx.kvGet) return { erreur: "accès KV absent" };
  let p;
  try { p = await ctx.kvGet(l.cle); } catch (e) { return { erreur: `KV illisible (${String(e?.message ?? e).slice(0, 80)})` }; }
  let cle = l.cle;
  if ((!p || p[l.champ] == null) && l.repliCle) {
    try { p = await ctx.kvGet(l.repliCle); cle = l.repliCle; } catch (e) { return { erreur: `KV illisible (${String(e?.message ?? e).slice(0, 80)})` }; }
  }
  if (!p || p[l.champ] == null) return { erreur: `aucune trace dans la clé ${l.cle}` };
  const out = { date: p[l.champ], detail: `clé KV ${cle}` };
  if (l.trace && p.ok === false) return { ...out, etatForce: "defaut", raison: `dernier passage en échec (${String(p.raison ?? "raison inconnue").slice(0, 100)})` };
  if (l.trace && Number(p.errors) > 0) return { ...out, etatForce: "attention", raison: `${p.errors} erreur(s) au dernier passage` };
  return out;
}

async function lireWorkflow(l, ctx) {
  const { token, repo } = ctx.github || {};
  if (!token || !repo) return { erreur: "accès GitHub absent" };
  try {
    const r = await ctx.fetch(`https://api.github.com/repos/${repo}/actions/workflows/${l.fichier}/runs?status=success&per_page=1`, {
      headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json", "user-agent": ctx.ua ?? "cryptoreflex-sentinelle" },
    });
    if (!r.ok) return { erreur: `API GitHub HTTP ${r.status}` };
    const run = (await r.json()).workflow_runs?.[0];
    if (!run) return { erreur: `aucun passage réussi de ${l.fichier}` };
    return { date: run.created_at, detail: `dernier passage réussi de ${l.fichier}` };
  } catch (e) {
    return { erreur: `API GitHub injoignable (${String(e?.message ?? e).slice(0, 80)})` };
  }
}

async function lirePage(l, ctx) {
  if (!ctx.getTexte) return { erreur: "lecture du site absente" };
  let texte;
  try { texte = await ctx.getTexte(l.chemin); } catch (e) { return { erreur: `${l.chemin} injoignable (${String(e?.message ?? e).slice(0, 80)})` }; }
  if (texte == null) return { erreur: `${l.chemin} ne répond pas 200` };
  if (l.methode === "page-calcul") {
    const m = String(texte).match(new RegExp(l.motif));
    if (!m) return { erreur: `repère ${l.motif} introuvable dans ${l.chemin}` };
    const out = { date: iso(ctx.now), detail: `${l.chemin} (valeur calculée à la requête : ${m[0]})` };
    if (l.jour1) {
      const v = jugerJourSaison(Number(m[1]), l.jour1, ctx.now);
      if (v) return { ...out, etatForce: "defaut", raison: v };
    }
    return out;
  }
  return extrairePage(texte, l);
}

async function lireSupabase(l, ctx) {
  const { url, key } = ctx.supabase || {};
  if (!url || !key) return { erreur: "accès Supabase absent" };
  const essai = async (col) => {
    const ordre = l.mode === "plusRecente" ? `${col}.desc.nullslast` : `${col}.asc.nullsfirst`;
    const r = await ctx.fetch(`${url.replace(/\/$/, "")}/rest/v1/${l.table}?select=${col}&${l.filtre}&order=${ordre}&limit=1`, {
      headers: { apikey: key, Authorization: `Bearer ${key}`, Accept: "application/json" },
    });
    const corps = await r.json().catch(() => null);
    return { r, corps };
  };
  try {
    let col = l.colonne;
    let { r, corps } = await essai(col);
    if (!r.ok && l.repliColonne && /42703|column/i.test(JSON.stringify(corps ?? ""))) { col = l.repliColonne; ({ r, corps } = await essai(col)); }
    if (!r.ok) return { erreur: `Supabase HTTP ${r.status}` };
    if (!Array.isArray(corps) || !corps.length) return { erreur: `aucune ligne pour ${l.table} (${l.filtre})` };
    const v = corps[0][col];
    if (v == null) return { erreur: `au moins une ligne de ${l.table} sans ${col}` };
    // colonne de repli (ex. updated_at, que d'autres écritures peuvent rajeunir) : jamais mieux que ⚠️
    if (col !== l.colonne) return { date: v, detail: `${l.table}.${col} (repli : ${l.colonne} absente)`, etatForce: "attention", raison: "colonne de repli" };
    return { date: v, detail: `${l.table}.${col}` };
  } catch (e) {
    return { erreur: `Supabase injoignable (${String(e?.message ?? e).slice(0, 80)})` };
  }
}

export async function lireFamille(f, ctx) {
  const l = f.lecture;
  let lu;
  switch (l.methode) {
    case "kv": lu = await lireKv(l, ctx); break;
    case "workflow": lu = await lireWorkflow(l, ctx); break;
    case "fichier": lu = lireFichier(ctx.root, l); break;
    case "constante": lu = lireConstante(ctx.root, l); break;
    case "dossier": lu = lireDossier(ctx.root, l); break;
    case "page":
    case "page-calcul": lu = await lirePage(l, ctx); break;
    case "supabase": lu = await lireSupabase(l, ctx); break;
    case "recomptage": lu = ctx.env?.RECOMPTAGE_OK === "true" ? { date: iso(ctx.now), detail: "recomptage réussi dans ce passage" } : { erreur: "recomptage non fait dans ce passage de la sentinelle" }; break;
    case "absence": lu = lireAbsence(ctx.root, l, ctx.now); break;
    case "echeance-jeu": {
      let rules;
      try { rules = JSON.parse(readFileSync(path.join(ctx.root, l.fichier), "utf8")); } catch { lu = { erreur: `${l.fichier} illisible` }; break; }
      let jour = NaN;
      try { jour = Number(String((await ctx.getTexte?.(l.chemin)) ?? "").match(/GAME_DAY=(\d+)/)?.[1]); } catch { /* jour illisible */ }
      lu = echeanceJeu(rules, jour, ctx.now);
      break;
    }
    case "aucune": lu = { erreur: l.raison }; break;
    default: lu = { erreur: `méthode inconnue ${l.methode}` };
  }
  if (lu.erreur && l.repli) {
    const r = await lireFamille({ ...f, lecture: { ...l.repli, explication: l.explication } }, ctx);
    return r.erreur ? lu : { ...r, detail: `${r.detail ?? ""} (repli)` };
  }
  // et : lectures complémentaires ; la date retenue est la PLUS ANCIENNE (ex. n° 27 : référence enregistrée ET dernier
  // passage réussi de la veille). Une lecture complémentaire illisible = date illisible (❌).
  if (!lu.erreur && Array.isArray(l.et) && l.et.length) {
    const autres = [];
    for (const sous of l.et) autres.push(await lireFamille({ ...f, lecture: { ...sous, explication: l.explication } }, ctx));
    const enErreur = autres.find((x) => x.erreur);
    if (enErreur) return { erreur: enErreur.erreur };
    const toutes = [lu, ...autres];
    const plusAncienne = toutes.reduce((a, b) => (instantDe(b.date) < instantDe(a.date) ? b : a));
    const pire = toutes.find((x) => x.etatForce === "defaut") ?? toutes.find((x) => x.etatForce === "attention");
    return {
      date: plusAncienne.date,
      detail: `la plus ancienne de : ${toutes.map((x) => `${x.detail ?? "?"} (${x.date})`).join(" ; ")}`,
      ...(pire ? { etatForce: pire.etatForce, raison: pire.raison } : {}),
    };
  }
  return lu;
}

/** Résultats de toutes les familles, dans l'ordre du registre. */
export async function evaluerRegistre(reg, ctx) {
  const out = [];
  for (const f of reg.familles) {
    let lu;
    try { lu = await lireFamille(f, ctx); } catch (e) { lu = { erreur: `lecture interrompue (${String(e?.message ?? e).slice(0, 80)})` }; }
    out.push({ ...jugerEtat(f, lu, ctx.now), source: f.source, robot: f.robot, cadence: f.cadence, lecture: f.lecture.explication });
  }
  return out;
}

/* ------------------------------------------------------------------ restitution */
export function compter(resultats) {
  return { ok: resultats.filter((r) => r.etat === "ok").length, attention: resultats.filter((r) => r.etat === "attention").length, defaut: resultats.filter((r) => r.etat === "defaut").length };
}

const cellule = (s) => String(s ?? "").replace(/\|/g, "/").replace(/\n/g, " ");

/** Ticket hebdomadaire « état des 51 familles », lisible sans rien ouvrir. */
export function rapportHebdo(resultats, now) {
  const n = compter(resultats);
  const lignes = [
    `## État des 51 familles de données (+ 18b) — ${jourFr(now)}`,
    "",
    `**${n.ok} ✅ · ${n.attention} ⚠️ · ${n.defaut} ❌** sur ${resultats.length} familles. ✅ = date sous l'âge maximal ; ⚠️ = au-delà, sous l'âge critique ; ❌ = au-delà de l'âge critique, date illisible ou robot en échec.`,
    "",
  ];
  for (const [etat, titre] of [["defaut", "❌ À traiter"], ["attention", "⚠️ À surveiller"], ["ok", "✅ À jour"]]) {
    const rs = resultats.filter((r) => r.etat === etat);
    if (!rs.length) continue;
    lignes.push(`### ${titre} (${rs.length})`, "", "| n° | Famille | Date lue et seuils | Robot |", "|---|---|---|---|");
    for (const r of rs) lignes.push(`| ${r.id} | ${cellule(r.famille)} | ${cellule(r.msg)} | ${cellule(r.robot)} |`);
    lignes.push("");
  }
  lignes.push("Registre : data/fraicheur/registre.json · lecture : scripts/lib/fraicheur-registre.mjs.");
  return lignes.join("\n") + "\n";
}

/** Un ticket par famille ❌ (titre stable = clé de dédoublonnage). */
export function ticketsDefauts(resultats) {
  return resultats
    .filter((r) => r.etat === "defaut")
    .map((r) => ({
      id: r.id,
      titre: `[Fraîcheur] n° ${r.id} — ${r.famille}`,
      corps: [
        `**❌ ${r.famille}** (famille n° ${r.id} de la carte de fraîcheur)`,
        "",
        `- État : ${r.msg}`,
        `- Source : ${r.source}`,
        `- Robot : ${r.robot}`,
        `- Cadence nécessaire : ${r.cadence}`,
        `- Lecture de la vraie date : ${r.lecture}`,
        "",
        "Ce ticket se ferme seul quand la famille repasse ✅ ou ⚠️ à la sentinelle complète.",
      ].join("\n"),
    }));
}

/** Expiration d'un jeton ou d'un accès : ✅ au-delà de avertirJours, ⚠️ dans la fenêtre ou date non renseignée, ❌ expiré. */
export function jugerExpiration(e, now) {
  if (!e?.expire) return { level: "warn", msg: `${e?.nom ?? "accès"} : date d'expiration non renseignée (${e?.source ?? "à relever"})` };
  const t = instantDe(e.expire);
  if (t === null) return { level: "fail", msg: `${e.nom} : date d'expiration illisible (« ${e.expire} »)` };
  const jours = Math.floor((t - now) / JOUR);
  if (jours < 0) return { level: "fail", msg: `${e.nom} : expiré depuis le ${jourFr(t)}` };
  if (jours <= (e.avertirJours ?? 30)) return { level: "warn", msg: `${e.nom} : expire le ${jourFr(t)} (dans ${jours} j) — à renouveler` };
  return { level: "ok", msg: `${e.nom} : expire le ${jourFr(t)} (dans ${jours} j)` };
}

/**
 * Compteur QUOTIDIEN CoinMarketCap (bilan de /api/diag/cmc-budget). ❌ si une erreur 1009 (« daily rate limit ») date de
 * moins de 24 h ; ⚠️ à 80 % du plafond quotidien s'il est renvoyé par /v1/key/info ; sinon ✅ avec le compteur du jour.
 * Le message ❌ est stable (date seule) pour que le ticket ne soit complété qu'une fois.
 */
export function jugerCmcJour(b, now) {
  const e1009 = instantDe(b?.erreur1009);
  if (e1009 !== null && now - e1009 < JOUR) return { level: "fail", msg: `CoinMarketCap : plafond quotidien atteint (erreur 1009) le ${jourFr(e1009)}` };
  const jour = Number(b?.aujourdhui);
  const plafond = Number(b?.plafondJour);
  if (Number.isFinite(plafond) && plafond > 0 && Number.isFinite(jour)) {
    const pct = Math.round((jour / plafond) * 100);
    if (jour >= 0.8 * plafond) return { level: "warn", msg: `CoinMarketCap : ${jour} crédits aujourd'hui sur un plafond quotidien de ${plafond} (${pct} %)` };
    return { level: "ok", msg: `CoinMarketCap : ${jour} crédits aujourd'hui sur un plafond quotidien de ${plafond} (${pct} %)` };
  }
  return { level: "ok", msg: `CoinMarketCap : ${Number.isFinite(jour) ? jour : "?"} crédits aujourd'hui (plafond quotidien non renvoyé par /v1/key/info : valeur non publiée)${e1009 !== null ? ` ; dernière erreur 1009 le ${jourFr(e1009)}` : " ; aucune erreur 1009"}` };
}

/**
 * Phrases de conditions d'une page de licence (texte déjà nettoyé) : seules ces phrases entrent dans l'empreinte mensuelle
 * de la veille (scripts/veille-officielle.mjs, veilleLicences). Une valeur du jour ou un prix ne change donc rien.
 */
const MOTS_LICENCE = /licen[cs]|commercial|attribution|copyright|public domain|domaine public|reus|réutilis|redistribut|permission|prohibit|interdit|terms|conditions d|third part|tiers|source is acknowledged|\bcite/i;
export function phrasesLicence(t) {
  // « Last updated 2 years ago » (DexScreener) change avec le temps sans que le texte change : retiré de l'empreinte
  const sansAge = String(t).replace(/last updated [a-z0-9 ]{1,30} ago/gi, " ");
  return [...new Set(sansAge.split(/(?<=[.!?])\s+/).filter((s) => MOTS_LICENCE.test(s) && s.length > 25).map((s) => s.trim().slice(0, 240)))].sort();
}

/** Taille de la base : ⚠️ à 60 %, ❌ à 80 % du plafond ; null = non mesurable (⚠️, raison écrite). */
export function jugerTailleBase(octets, plafond, raison) {
  if (!(typeof octets === "number" && Number.isFinite(octets) && octets >= 0)) return { level: "warn", msg: `taille de la base Supabase non mesurable : ${raison ?? "lecture impossible"}` };
  const pct = (octets / plafond) * 100;
  const mo = (x) => `${Math.round(x / 1_048_576)} Mo`;
  const msg = `base Supabase : ${mo(octets)} sur ${mo(plafond)} (${pct.toFixed(1)} %)`;
  if (pct >= 80) return { level: "fail", msg: `base Supabase au-delà de 80 % de ${mo(plafond)} (passage en lecture seule à 100 % sur l'offre Free)` , detail: msg };
  if (pct >= 60) return { level: "warn", msg };
  return { level: "ok", msg };
}
