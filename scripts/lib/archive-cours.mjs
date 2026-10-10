/**
 * scripts/lib/archive-cours.mjs — lecture de l'archive maison des cours (R4) par le robot des détails R3 et export mensuel
 * des clôtures (lot Z3, 10/10/2026).
 *
 * R3 (scripts/populate-all-cryptos-kv.mjs) : dès qu'une fiche a au moins 7 jours de points dans l'archive, sa courbe 7 jours
 * et ses plus haut / plus bas viennent de l'archive, avec la date du premier point (« Plus haut depuis le JJ/MM/AAAA ») ;
 * sinon la source actuelle reste. Export : les clôtures quotidiennes (dernier point de chaque jour UTC) sont commitées dans
 * data/archive/AAAA-MM.json (Supabase Free n'a pas de sauvegarde automatique) : le mois précédent, définitif, le 1er de chaque
 * mois ; le mois en cours, partiel, chaque lundi.
 * Lectures : API REST de Supabase (clé service_role ; l'archive n'est pas lisible par anon). Zéro dépendance.
 */

export const ARCHIVE_JOURS_MIN = 7;
export const COURBE_POINTS_MAX = 168;
const JOUR = 86_400_000;

const pos = (v) => {
  const n = typeof v === "number" ? v : typeof v === "string" ? Number(v) : NaN;
  return Number.isFinite(n) && n > 0 ? n : null;
};

/** Réduit une série à `max` points au plus (pas régulier, dernier point toujours gardé). */
export function reduireSerie(valeurs, max = COURBE_POINTS_MAX) {
  if (valeurs.length <= max) return [...valeurs];
  const pas = valeurs.length / max;
  const out = [];
  for (let i = 0; i < max - 1; i++) out.push(valeurs[Math.floor(i * pas)]);
  out.push(valeurs[valeurs.length - 1]);
  return out;
}

/**
 * Applique l'archive aux lignes de détails (format CoinGecko /coins/markets stocké dans les seaux KV). Seulement pour les
 * fiches dont le premier point a au moins 7 jours. Renvoie le nombre de fiches modifiées.
 * @param {Record<string, any>} record
 * @param {{extremes: Map<string, any>, series: Map<string, number[]>}} archive
 * @param {number} maintenant
 */
export function appliquerArchive(record, archive, maintenant) {
  let n = 0;
  for (const [id, ligne] of Object.entries(record)) {
    const e = archive.extremes.get(id);
    if (!e) continue;
    const premier = Date.parse(e.premier);
    if (!Number.isFinite(premier) || maintenant - premier < ARCHIVE_JOURS_MIN * JOUR) continue;
    const haut = pos(e.plus_haut);
    const bas = pos(e.plus_bas);
    if (haut === null || bas === null) continue;
    const serie = (archive.series.get(id) ?? []).filter((x) => x > 0);
    if (serie.length >= 2) ligne.sparkline_in_7d = { price: reduireSerie(serie) };
    ligne.ath = haut;
    ligne.ath_date = e.plus_haut_le;
    ligne.atl = bas;
    ligne.atl_date = e.plus_bas_le;
    ligne.ath_depuis = new Date(premier).toISOString();
    ligne.ath_source = "archive";
    const prix = pos(ligne.current_price);
    if (prix !== null) {
      ligne.ath_change_percentage = Math.round(((prix - haut) / haut) * 10_000) / 100;
      ligne.atl_change_percentage = Math.round(((prix - bas) / bas) * 10_000) / 100;
    }
    n++;
  }
  return n;
}

function entetes(key) {
  return { apikey: key, Authorization: `Bearer ${key}`, Accept: "application/json", "Content-Type": "application/json" };
}

/** Erreur « archive absente » (migration 20261010 pas encore lancée). */
export function archiveAbsente(status, corps) {
  return status === 404 || /42P01|PGRST202|PGRST205|does not exist|Could not find the (table|function)/i.test(JSON.stringify(corps ?? ""));
}

/**
 * Lit l'archive : extrêmes de chaque fiche (fonction cours_archive_extremes) et points des 7 derniers jours.
 * @returns {Promise<{disponible: boolean, raison?: string, extremes: Map<string, any>, series: Map<string, number[]>}>}
 */
export async function lireArchive({ url, key, maintenant = Date.now(), fetchImpl = fetch }) {
  const vide = { extremes: new Map(), series: new Map() };
  if (!url || !key) return { disponible: false, raison: "accès Supabase absent", ...vide };
  const base = url.replace(/\/$/, "");
  const extremes = new Map();
  for (let offset = 0; offset < 100_000; offset += 1000) {
    const r = await fetchImpl(`${base}/rest/v1/rpc/cours_archive_extremes?order=fiche.asc&limit=1000&offset=${offset}`, { method: "POST", headers: entetes(key), body: "{}", signal: AbortSignal.timeout(30_000) });
    const corps = await r.json().catch(() => null);
    if (!r.ok) return { disponible: false, raison: archiveAbsente(r.status, corps) ? "archive non disponible (migration 20261010 à lancer)" : `archive illisible (HTTP ${r.status})`, ...vide };
    const page = Array.isArray(corps) ? corps : [];
    for (const x of page) extremes.set(x.fiche, x);
    if (page.length < 1000) break;
  }
  const series = new Map();
  const depuis = new Date(maintenant - ARCHIVE_JOURS_MIN * JOUR).toISOString();
  for (let offset = 0; offset < 200_000; offset += 1000) {
    const p = await fetchImpl(`${base}/rest/v1/cours_archive?select=fiche,ts,prix_usd&ts=gte.${encodeURIComponent(depuis)}&order=fiche.asc,ts.asc&limit=1000&offset=${offset}`, { headers: entetes(key), signal: AbortSignal.timeout(30_000) });
    if (!p.ok) return { disponible: false, raison: `points de l'archive illisibles (HTTP ${p.status})`, ...vide };
    const lignes = await p.json();
    for (const l of lignes) {
      if (!series.has(l.fiche)) series.set(l.fiche, []);
      const v = pos(l.prix_usd);
      if (v !== null) series.get(l.fiche).push(v);
    }
    if (lignes.length < 1000) break;
  }
  return { disponible: true, extremes, series };
}

/** Mois à exporter à ce passage (premier passage du jour UTC seulement) : [] ou [« AAAA-MM »…]. */
export function moisAExporter(maintenant) {
  const d = new Date(maintenant);
  if (d.getUTCHours() >= 6) return [];
  const courant = d.toISOString().slice(0, 7);
  const out = [];
  if (d.getUTCDate() === 1) out.push(new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() - 1, 1)).toISOString().slice(0, 7));
  if (d.getUTCDay() === 1) out.push(courant);
  return [...new Set(out)];
}

/** Contenu de data/archive/AAAA-MM.json : { mois, exporteLe, source, clotures: { fiche: [[jour, prix, source], …] } }. */
export function fichierMois(mois, lignes, maintenant) {
  /** @type {Record<string, Array<[string, number, string|null]>>} */
  const clotures = {};
  for (const l of [...lignes].sort((a, b) => String(a.fiche).localeCompare(String(b.fiche)) || String(a.jour).localeCompare(String(b.jour)))) {
    const v = pos(l.prix_usd);
    if (v === null || !l.fiche || !l.jour) continue;
    (clotures[l.fiche] ??= []).push([String(l.jour).slice(0, 10), v, l.source ?? null]);
  }
  return {
    _lisezMoi: "Clôtures quotidiennes (dernier point de chaque jour UTC) de l'archive des cours de cryptoreflex.fr (table cours_archive, robots R1 et R2 : CoinMarketCap, DexScreener). Copie de secours commitée par scripts/populate-all-cryptos-kv.mjs (lot Z3).",
    mois,
    exporteLe: new Date(maintenant).toISOString(),
    fiches: Object.keys(clotures).length,
    clotures,
  };
}

/** Clôtures d'un mois via la fonction cours_archive_clotures. */
export async function lireClotures({ url, key, mois, fetchImpl = fetch }) {
  const [a, m] = mois.split("-").map(Number);
  const debut = `${mois}-01`;
  const fin = new Date(Date.UTC(a, m, 0)).toISOString().slice(0, 10);
  const lignes = [];
  // PostgREST plafonne une réponse à 1 000 lignes : pages de 1 000 (≈ 800 fiches × 31 jours ≈ 25 pages)
  for (let offset = 0; offset < 1_000_000; offset += 1000) {
    const r = await fetchImpl(`${url.replace(/\/$/, "")}/rest/v1/rpc/cours_archive_clotures?order=fiche.asc,jour.asc&limit=1000&offset=${offset}`, { method: "POST", headers: entetes(key), body: JSON.stringify({ debut, fin }), signal: AbortSignal.timeout(60_000) });
    const corps = await r.json().catch(() => null);
    if (!r.ok) return { ok: false, raison: archiveAbsente(r.status, corps) ? "archive non disponible" : `HTTP ${r.status}`, lignes: [] };
    const page = Array.isArray(corps) ? corps : [];
    lignes.push(...page);
    if (page.length < 1000) break;
  }
  return { ok: true, lignes };
}
