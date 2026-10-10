#!/usr/bin/env node
/**
 * scripts/construire-cmc-id-map.mjs — construit data/cmc-id-map.json (lot Z3, 10/10/2026).
 *
 * Table « identifiant de fiche (= id CoinGecko) → identifiant numérique CoinMarketCap » lue par le robot des fiches (R2,
 * app/api/cron/refresh-prices) pour demander les cours par lots de 100. Reconstruite chaque mois par le robot
 * .github/workflows/cmc-id-map.yml (le 1er à 08:30 UTC, juste après un passage de R2 : prix de référence frais),
 * jamais par R2 lui-même ; refus d'écrire une table de moins de 90 % des correspondances actuelles (--forcer pour passer).
 *
 * Appariement : symbole ET nom ET prix à ± 5 % du prix de référence (scripts/lib/cmc-appariement.mjs). Le piège
 * beam → onbeam (même symbole, même nom, 68 % d'écart) est rejeté.
 *
 * Sources :
 *  - fiches : --fiches <fichier.json> ([{ id, symbol, name, prix, prixLe }]) ; sinon la base (NEXT_PUBLIC_SUPABASE_URL +
 *    SUPABASE_SERVICE_ROLE_KEY) : coingecko_id, symbol, name, price_usd, price_updated_at ;
 *  - CoinMarketCap : --liste <fichier.json> (réponse d'une liste CMC déjà téléchargée, champ data) ; sinon l'API avec
 *    CMC_API_KEY : /v1/cryptocurrency/map (identifiants), puis /v2/cryptocurrency/quotes/latest?id= par lots de 100 pour
 *    les seuls candidats (≈ 8 crédits). Avant tout appel payant : compteur officiel /v1/key/info (0 crédit) et frein du
 *    mois (scripts/lib/budget-mois.mjs) ; refus si le frein est actif ou s'il reste moins de 300 crédits ce mois-ci.
 *
 * Usage : node scripts/construire-cmc-id-map.mjs [--liste f] [--fiches f] [--ecrire] [--forcer] [--rapport f]
 *   sans --ecrire : affiche le bilan, n'écrit rien. Journaux publics : nombres et identifiants publics seulement.
 */
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { apparier, normaliserCmc, TOLERANCE_PRIX_PCT } from "./lib/cmc-appariement.mjs";
import { lireLignesCmc, MANUELS } from "./lib/cmc-lignes.mjs";

// Désignations manuelles et lecture de l'API : scripts/lib/cmc-lignes.mjs (partagé avec la route app/api/cron/cmc-lignes).
export { MANUELS };

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SORTIE = path.join(ROOT, "data/cmc-id-map.json");

/** Refus d'écrire une table de moins de 90 % des correspondances actuelles (raison), sinon null. */
export const TABLE_MIN_PCT = 90;
export function tableTropPetite(nouvelle, actuelle) {
  if (!(nouvelle > 0)) return "aucune correspondance : table non écrite";
  if (actuelle > 0 && nouvelle < (actuelle * TABLE_MIN_PCT) / 100) return `${nouvelle} correspondances contre ${actuelle} dans la table actuelle (${TABLE_MIN_PCT} % exigés) : table non écrite`;
  return null;
}

function arg(nom) {
  const i = process.argv.indexOf(nom);
  return i > 0 ? process.argv[i + 1] : undefined;
}

async function lireFichesBase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("ni --fiches ni accès à la base (NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)");
  // Par pages de 1 000 (plafond de PostgREST) : au-delà de 1 000 fiches, aucune n'est ignorée en silence.
  const lignes = [];
  for (let debut = 0; ; debut += 1000) {
    const r = await fetch(`${url.replace(/\/$/, "")}/rest/v1/cryptos?select=coingecko_id,symbol,name,price_usd,price_updated_at&order=coingecko_id&offset=${debut}&limit=1000`, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
      signal: AbortSignal.timeout(30_000),
    });
    if (!r.ok) throw new Error(`base : HTTP ${r.status}`);
    const page = await r.json();
    lignes.push(...page);
    if (page.length < 1000) break;
  }
  return lignes.map((x) => ({ id: x.coingecko_id, symbol: x.symbol, name: x.name, prix: Number(x.price_usd) || null, prixLe: x.price_updated_at }));
}

/** Lignes CMC via l'API (identifiants puis cotations des seuls candidats) : scripts/lib/cmc-lignes.mjs. */
async function lireCmcApi(fiches, key) {
  const r = await lireLignesCmc({ symboles: fiches.map((f) => f.symbol), key });
  console.log(`[cmc-map] API CoinMarketCap : ${r.candidats} candidats, ${r.credits} crédit(s)`);
  return { lignes: r.lignes, source: r.source };
}

async function main() {
  const fichierFiches = arg("--fiches");
  const fichierListe = arg("--liste");
  const fiches = fichierFiches ? JSON.parse(readFileSync(fichierFiches, "utf8")) : await lireFichesBase();
  let lignes;
  let sourceCmc;
  if (fichierListe) {
    const j = JSON.parse(readFileSync(fichierListe, "utf8"));
    lignes = Array.isArray(j) ? j : j.data;
    sourceCmc = typeof j?.source === "string" && j.source
      ? `${j.source}, lue par la route du site (${lignes.length} lignes)`
      : `liste CoinMarketCap déjà téléchargée (${path.basename(fichierListe)}, ${lignes.length} lignes)`;
  } else if ((process.env.CMC_API_KEY ?? "").trim()) {
    ({ lignes, source: sourceCmc } = await lireCmcApi(fiches, process.env.CMC_API_KEY.trim()));
  } else {
    throw new Error("ni --liste ni CMC_API_KEY");
  }
  const candidats = lignes.map(normaliserCmc).filter(Boolean);
  const { map, exclus, details } = apparier(fiches, candidats, { manuels: MANUELS });
  const ecartes = Object.fromEntries(
    Object.entries(details)
      .filter(([, d]) => d.statut === "non apparié" && typeof d.ecartPrixPct === "number")
      .map(([id, d]) => [id, { cmcId: d.cmcId, cmcSlug: d.cmcSlug, ecartPrixPct: d.ecartPrixPct }]),
  );
  const manuels = Object.fromEntries(Object.entries(details).filter(([, d]) => d.manuel).map(([id, d]) => [id, { cmcSlug: d.cmcSlug, cmcNom: d.cmcNom, ecartPrixPct: d.ecartPrixPct }]));
  const sortie = {
    _lisezMoi:
      "Correspondance id du site (= id CoinGecko) -> id numérique CoinMarketCap. Construite par scripts/construire-cmc-id-map.mjs (lot Z3) : même symbole ET nom compatible ET prix CMC à ± 5 % du prix de référence ; jamais par symbole seul. Une fiche absente d'ici n'est jamais demandée à CoinMarketCap : le robot des fiches passe par DexScreener (adresse de contrat) ou la fiche garde le masquage au-delà de 48 h. Testée par tests/lib/coinmarketcap.test.ts et tests/lib/fiches-z3.test.ts.",
    _total: Object.keys(map).length,
    _construction: { le: new Date().toISOString(), fiches: fiches.length, sourceCmc, sourceReference: arg("--source-reference") ?? (fichierFiches ? path.basename(fichierFiches) : "base Supabase (price_usd, price_updated_at)"), tolerancePct: TOLERANCE_PRIX_PCT },
    map,
    exclus,
    _controlePrix: `Contrôle à la construction : pour CHAQUE correspondance, prix CoinMarketCap comparé au prix de référence de la fiche (relevé à 6 h au plus). Tolérance ${TOLERANCE_PRIX_PCT} %. Hors tolérance → non appariée (voir _ecartesPrix).`,
    _manuels: manuels,
    _ecartesPrix: ecartes,
  };
  const motifs = {};
  for (const d of Object.values(details)) if (d.statut !== "apparié") motifs[d.motif.replace(/[-\d.]+ %/, "N %").replace(/\(.*\)/, "(…)")] = (motifs[d.motif.replace(/[-\d.]+ %/, "N %").replace(/\(.*\)/, "(…)")] ?? 0) + 1;
  console.log(`[cmc-map] ${fiches.length} fiches : ${Object.keys(map).length} appariées, ${exclus.length} non appariées`);
  for (const [m, n] of Object.entries(motifs).sort((a, b) => b[1] - a[1])) console.log(`  - ${n} × ${m}`);
  const rapport = arg("--rapport");
  if (rapport) writeFileSync(rapport, JSON.stringify(details, null, 1) + "\n");
  if (process.argv.includes("--ecrire")) {
    // Reprise Z3 (I5) : le robot mensuel ne remplace jamais la table par une table nettement plus petite (base lue en
    // partie, liste CMC tronquée…) : moins de 90 % des correspondances actuelles → refus, la table reste en place.
    const actuelle = (() => { try { return Number(JSON.parse(readFileSync(SORTIE, "utf8"))._total) || 0; } catch { return 0; } })();
    const refus = tableTropPetite(Object.keys(map).length, actuelle);
    if (refus && !process.argv.includes("--forcer")) throw new Error(refus);
    writeFileSync(SORTIE, JSON.stringify(sortie, null, 1) + "\n");
    console.log(`[cmc-map] écrit : ${path.relative(ROOT, SORTIE)}`);
  } else console.log("[cmc-map] sans --ecrire : rien n'est écrit");
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((e) => {
    console.error(`[cmc-map] échec : ${e.message}`);
    process.exit(1);
  });
}
