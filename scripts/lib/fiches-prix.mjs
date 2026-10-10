/**
 * scripts/lib/fiches-prix.mjs — règles du robot des fiches R2 « refresh-prices-db » (lot Z3, 10/10/2026).
 *
 * Toutes les fiches (≈ 780), 3 fois par jour, sans rien inventer :
 *  1. CoinMarketCap par identifiant (data/cmc-id-map.json), lots fixes de 100, USD, 1 crédit par lot ;
 *  2. les fiches sans identifiant CMC : DexScreener par ADRESSE DE CONTRAT seulement (lots de 30 par réseau, adresse lue
 *     en base : colonne chains ou raw_data_snapshot.contracts) ; jamais par symbole ;
 *  3. les autres gardent leur dernier cours, masqué au-delà de 48 h par le site (lib/cours-fiche.ts, lot A).
 * Garde-fous : prix > 0 ; variation de plus de 60 % par rapport au cours précédent de la même fiche relevé il y a moins de
 * 48 h (sinon la médiane des 7 derniers jours de l'archive) → ligne non écrite (« suspecte » ; deux passages de suite → ticket par le workflow) ; symbole renvoyé ≠ symbole de la table → ligne ignorée.
 * Verdict : ROUGE si une erreur, ou si moins de 95 % des fiches appariées à CoinMarketCap sont écrites.
 * Zéro dépendance (Node 20 et bundle Next). Fonctions pures, testées par tests/lib/fiches-z3.test.ts.
 */

export const LOT_CMC = 100;
export const LOT_DEX = 30;
export const COUVERTURE_MIN_PCT = 95;
export const VARIATION_MAX_PCT = 60;
/** Cours précédent pris en compte pour le garde-fou de variation seulement s'il a moins de 48 h. */
export const PRECEDENT_MAX_H = 48;
/**
 * Liquidité minimale d'une paire DEX retenue (en dessous, un prix se manipule pour peu). Reprise Z3 (M1) : 50 000 $ au
 * lieu de 10 000 $, ces points entrant dans l'archive donc dans le « plus haut depuis le … ».
 */
export const DEX_LIQUIDITE_MIN_USD = 50_000;

/** Réseau (nom de plateforme CoinGecko, tel qu'en base) → identifiant de réseau DexScreener. */
export const RESEAUX_DEX = {
  ethereum: "ethereum",
  "binance-smart-chain": "bsc",
  solana: "solana",
  "polygon-pos": "polygon",
  "arbitrum-one": "arbitrum",
  base: "base",
  avalanche: "avalanche",
  "optimistic-ethereum": "optimism",
  tron: "tron",
  sui: "sui",
  "the-open-network": "ton",
  fantom: "fantom",
  cronos: "cronos",
  linea: "linea",
  zksync: "zksync",
  blast: "blast",
  mantle: "mantle",
  sonic: "sonic",
  berachain: "berachain",
  unichain: "unichain",
  scroll: "scroll",
  aptos: "aptos",
  "near-protocol": "near",
  celo: "celo",
  pulsechain: "pulsechain",
  abstract: "abstract",
  "world-chain": "worldchain",
  hyperevm: "hyperevm",
  "sei-v2": "seiv2",
  injective: "injective",
  osmosis: "osmosis",
};

const num = (v) => (typeof v === "number" && Number.isFinite(v) ? v : typeof v === "string" && v.trim() !== "" && Number.isFinite(Number(v)) ? Number(v) : null);
const pos = (v) => {
  const n = num(v);
  return n !== null && n > 0 ? n : null;
};

/** Adresses de contrat d'une fiche, réseaux connus de DexScreener seulement : [{ reseau, adresse }]. */
export function adressesFiche(ligne) {
  const out = [];
  const vu = new Set();
  const ajouter = (plateforme, valeur) => {
    const reseau = RESEAUX_DEX[String(plateforme ?? "").toLowerCase()];
    const adresse = typeof valeur === "string" ? valeur.trim() : typeof valeur?.contract_address === "string" ? valeur.contract_address.trim() : "";
    if (!reseau || !adresse || adresse.length < 20 || /\s|,/.test(adresse)) return;
    const k = `${reseau}:${adresse.toLowerCase()}`;
    if (vu.has(k)) return;
    vu.add(k);
    out.push({ reseau, adresse });
  };
  const lire = (src) => {
    if (!src) return;
    if (Array.isArray(src)) {
      for (const x of src) if (x && typeof x === "object") ajouter(x.chain ?? x.platform ?? x.network, x.address ?? x.contract_address ?? x.contract);
      return;
    }
    if (typeof src === "object") for (const [k, v] of Object.entries(src)) ajouter(k, v);
  };
  lire(ligne?.chains);
  lire(ligne?.contrats ?? ligne?.raw_data_snapshot?.contracts);
  lire(ligne?.raw_data_snapshot?.platforms);
  lire(ligne?.raw_data_snapshot?.detail_platforms);
  return out;
}

/** Lots DexScreener : au plus 30 adresses par appel, un réseau par appel. [{ reseau, adresses, fichesParAdresse }] */
export function lotsDex(fiches) {
  const parReseau = new Map();
  for (const f of fiches) {
    for (const a of f.adresses ?? []) {
      if (!parReseau.has(a.reseau)) parReseau.set(a.reseau, []);
      const l = parReseau.get(a.reseau);
      if (!l.some((x) => x.id === f.id)) l.push({ id: f.id, adresse: a.adresse });
    }
  }
  const lots = [];
  for (const [reseau, liste] of [...parReseau].sort((a, b) => a[0].localeCompare(b[0]))) {
    for (let i = 0; i < liste.length; i += LOT_DEX) {
      const tranche = liste.slice(i, i + LOT_DEX);
      lots.push({ reseau, adresses: tranche.map((x) => x.adresse), fichesParAdresse: Object.fromEntries(tranche.map((x) => [x.adresse.toLowerCase(), x.id])) });
    }
  }
  return lots;
}

/**
 * Meilleure paire DexScreener d'une adresse : jeton de base = cette adresse, prix > 0, liquidité ≥ 50 000 $, la plus
 * liquide. null sinon (jamais une paire où le jeton n'est que la contrepartie).
 */
export function choisirPaire(paires, adresse) {
  const a = String(adresse).toLowerCase();
  const ok = (Array.isArray(paires) ? paires : [])
    .filter((p) => String(p?.baseToken?.address ?? "").toLowerCase() === a)
    .filter((p) => pos(p?.priceUsd) !== null && (num(p?.liquidity?.usd) ?? 0) >= DEX_LIQUIDITE_MIN_USD)
    .sort((x, y) => (num(y?.liquidity?.usd) ?? 0) - (num(x?.liquidity?.usd) ?? 0));
  const p = ok[0];
  if (!p) return null;
  return { prix: pos(p.priceUsd), volume24h: num(p.volume?.h24), change24h: num(p.priceChange?.h24), liquiditeUsd: num(p.liquidity?.usd), paire: String(p.pairAddress ?? ""), reseau: String(p.chainId ?? "") };
}

/** Ligne à écrire depuis une cotation CMC normalisée (lib/coinmarketcap.ts → CmcQuote). null si le symbole a changé. */
export function ligneDepuisCmc(siteId, symboleTable, q, maintenantIso) {
  if (!q || !(q.priceUsd > 0)) return null;
  if (symboleTable && q.symbol !== symboleTable) return null;
  const releve = q.lastUpdated && Number.isFinite(Date.parse(q.lastUpdated)) ? new Date(q.lastUpdated).toISOString() : maintenantIso;
  return {
    id: siteId,
    source: "coinmarketcap",
    releve,
    prix: q.priceUsd,
    capitalisation: q.marketCap ?? null,
    rang: q.rank ?? null,
    volume24h: q.volume24h ?? null,
    offreCirculante: q.circulatingSupply ?? null,
    offreTotale: q.totalSupply ?? null,
    offreMax: q.maxSupply ?? null,
    variation1h: q.change1h ?? null,
    variation24h: q.change24h ?? null,
    variation7j: q.change7d ?? null,
  };
}

/** Ligne à écrire depuis une paire DEX : pas de rang ni de capitalisation (DexScreener ne les établit pas). */
export function ligneDepuisDex(siteId, paire, maintenantIso) {
  if (!paire || !(paire.prix > 0)) return null;
  return { id: siteId, source: "dexscreener", releve: maintenantIso, prix: paire.prix, capitalisation: null, rang: null, volume24h: paire.volume24h, offreCirculante: null, offreTotale: null, offreMax: null, variation1h: null, variation24h: paire.change24h, variation7j: null };
}

/** Ligne depuis une ligne CoinGecko /coins/markets (repli quand CoinMarketCap échoue, jamais l'inverse). */
export function ligneDepuisCoingecko(c, maintenantIso) {
  if (!c?.id || !(pos(c.current_price) !== null)) return null;
  const releve = typeof c.last_updated === "string" && Number.isFinite(Date.parse(c.last_updated)) ? new Date(c.last_updated).toISOString() : maintenantIso;
  return {
    id: c.id,
    source: "coingecko",
    releve,
    prix: c.current_price,
    capitalisation: pos(c.market_cap),
    rang: pos(c.market_cap_rank),
    volume24h: num(c.total_volume),
    offreCirculante: pos(c.circulating_supply),
    offreTotale: pos(c.total_supply),
    offreMax: pos(c.max_supply),
    variation1h: null,
    variation24h: num(c.price_change_percentage_24h),
    variation7j: num(c.price_change_percentage_7d_in_currency),
  };
}

/**
 * Garde-fou de variation : la ligne est « suspecte » si le cours précédent de la fiche date de moins de 48 h et que
 * l'écart dépasse 60 %. Un cours précédent plus ancien (fiche figée depuis des mois) ne dit rien : la référence est
 * alors la médiane des 7 derniers jours de l'archive (reprise Z3), sinon pas de garde-fou.
 * @param {number} prix
 * @param {number | string | null | undefined} precedent
 * @param {string | null | undefined} precedentLe
 * @param {number} maintenant
 * @param {number | null} [medianeArchive]
 */
export function variationSuspecte(prix, precedent, precedentLe, maintenant, medianeArchive = null) {
  const p = pos(precedent);
  const t = precedentLe ? Date.parse(precedentLe) : NaN;
  // Reprise Z3 (I5) : cours en base absent ou de plus de 48 h → référence = médiane des 7 derniers jours de l'archive
  // (cas d'une migration de jeton suivie sur l'ancien identifiant : le garde-fou ne tombe plus au bout de 48 h).
  const ref = p !== null && Number.isFinite(t) && maintenant - t <= PRECEDENT_MAX_H * 3_600_000 ? p : pos(medianeArchive);
  if (ref === null) return null;
  const ecart = ((prix - ref) / ref) * 100;
  return Math.abs(ecart) > VARIATION_MAX_PCT ? Math.round(ecart * 10) / 10 : null;
}

/**
 * Fiches suspectes deux passages de suite (reprise Z3, I5) : ticket par le workflow de R2. precedentes = identifiants
 * suspects du passage précédent (trace KV), actuelles = [{ id, ecartPct, source }].
 */
export function suspectesRepetees(precedentes, actuelles) {
  const avant = new Set(Array.isArray(precedentes) ? precedentes : []);
  return actuelles.filter((s) => avant.has(s.id));
}

/** Lignes de fiches lues par pages (reprise Z3, M2) : PostgREST plafonne une réponse à 1 000 lignes. */
export const PAGE_SELECT = 1000;
export async function lireToutesLesPages(lirePage, taille = PAGE_SELECT) {
  const out = [];
  for (let debut = 0; ; debut += taille) {
    const { data, error } = await lirePage(debut, debut + taille - 1);
    if (error) return { data: null, error };
    const lot = Array.isArray(data) ? data : [];
    out.push(...lot);
    if (lot.length < taille) return { data: out, error: null };
  }
}

/**
 * Écritures des cours en base, `simultanees` à la fois (reprise Z3, B3). Colonnes étendues (migration 20261010) tant
 * qu'elles existent ; dès qu'une écriture répond « colonne absente », CHAQUE écriture concernée — y compris celles déjà
 * parties en même temps — est refaite en colonnes de base : aucune erreur ne vient de l'absence de la migration.
 * @param {{ from: (t: string) => any }} sb
 * @param {Array<any>} lignes
 * @param {{ signal?: AbortSignal, erreurs: Array<{stage: string, message: string}>, simultanees?: number }} o
 */
export async function ecrireCours(sb, lignes, { signal, erreurs, simultanees = 6 }) {
  const ecrites = new Set();
  let colonnesEtendues = true;
  const une = async (u) => {
    const base = { price_usd: u.prix, market_cap_usd: u.capitalisation, market_cap_rank: u.rang, price_updated_at: u.releve };
    const etendues = {
      volume_24h_usd: u.volume24h,
      circulating_supply: u.offreCirculante,
      total_supply: u.offreTotale,
      max_supply: u.offreMax,
      change_1h_pct: u.variation1h,
      change_24h_pct: u.variation24h,
      change_7d_pct: u.variation7j,
      price_source: u.source,
    };
    let { error } = await sb.from("cryptos").update(colonnesEtendues ? { ...base, ...etendues } : base).eq("coingecko_id", u.id);
    if (error && colonneAbsente(error)) {
      colonnesEtendues = false;
      ({ error } = await sb.from("cryptos").update(base).eq("coingecko_id", u.id));
    }
    if (error) erreurs.push({ stage: `update-${u.id}`, message: String(error.message ?? "erreur").slice(0, 120) });
    else ecrites.add(u.id);
  };
  for (let i = 0; i < lignes.length; i += simultanees) {
    if (signal?.aborted) {
      erreurs.push({ stage: "db-update", message: `aborted (deadline) after ${i}/${lignes.length} rows` });
      break;
    }
    await Promise.all(lignes.slice(i, i + simultanees).map((u) => une(u).catch((e) => erreurs.push({ stage: `update-${u.id}`, message: e instanceof Error ? e.message : "erreur" }))));
  }
  return { ecrites, colonnesEtendues };
}

/** Couverture : part des fiches appariées à CoinMarketCap réellement écrites (en %, 0 décimale près). */
export function couverture(appariees, ecrites) {
  if (!(appariees > 0)) return 0;
  return Math.floor((Math.min(ecrites, appariees) / appariees) * 1000) / 10;
}

/** Verdict du passage (vert seulement si 0 erreur ET couverture ≥ 95 %). */
export function verdictR2({ erreurs, appariees, ecritesAppariees }) {
  const c = couverture(appariees, ecritesAppariees);
  if (erreurs > 0) return { ok: false, couverturePct: c, raison: `${erreurs} erreur(s)` };
  if (c < COUVERTURE_MIN_PCT) return { ok: false, couverturePct: c, raison: `couverture ${c} % des fiches appariées (95 % exigés)` };
  return { ok: true, couverturePct: c, raison: "ok" };
}

/** Points de l'archive des cours (R4) pour les lignes écrites. */
export function pointsArchive(lignes) {
  return lignes.filter((l) => l && l.prix > 0).map((l) => ({ fiche: l.id, ts: l.releve, prix_usd: l.prix, source: l.source }));
}

/** Erreur Supabase/PostgREST « table absente » (migration de l'archive pas encore lancée). */
export function tableAbsente(erreur) {
  const s = `${erreur?.code ?? ""} ${erreur?.message ?? ""}`;
  return /42P01|PGRST205|PGRST202|does not exist|Could not find the (table|function)/i.test(s);
}

/** Erreur « colonne absente » (colonnes étendues de la migration 20261010 pas encore créées). */
export function colonneAbsente(erreur) {
  const s = `${erreur?.code ?? ""} ${erreur?.message ?? ""}`;
  return /42703|PGRST204|column .* does not exist|Could not find the '.*' column/i.test(s);
}

/**
 * Frein du mois (scripts/lib/budget-mois.mjs) appliqué à R2 : frein actif → un passage CMC au plus toutes les 11 h 30
 * (8 h et 20 h UTC au lieu de 8, 14 et 20 h ; les cours restent sous les 24 h). Dernier passage inconnu → on relève.
 */
export const FREIN_R2_INTERVALLE_H = 11.5;
export function freinR2SautePassage(actif, maintenant, dernierPassageIso) {
  if (!actif) return false;
  const t = typeof dernierPassageIso === "string" ? Date.parse(dernierPassageIso) : NaN;
  if (!Number.isFinite(t) || t > maintenant) return false;
  return maintenant - t < FREIN_R2_INTERVALLE_H * 3_600_000;
}
