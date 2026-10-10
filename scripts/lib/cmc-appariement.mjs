/**
 * scripts/lib/cmc-appariement.mjs — appariement des fiches du site avec CoinMarketCap (lot Z3, 10/10/2026 ; identité
 * par contrat, 10/10/2026 après contre-vérification de la règle de continuité).
 *
 * Règle (architecture 0 € § 4.1 n° 5) : une fiche n'est reliée à un identifiant CoinMarketCap que si les conditions
 * suivantes tiennent :
 *  1. même symbole (insensible à la casse), ou slug CMC désigné à la main (MANUELS, scripts/lib/cmc-lignes.mjs) ;
 *  2. nom compatible (noms normalisés égaux, ou slug CMC = identifiant du site, ou mots du nom le plus court tous
 *     présents dans le plus long, mots génériques « token », « coin »… mis à part) ;
 *  3. IDENTITÉ PAR CONTRAT : des COUPLES (réseau, adresse) de la fiche en base comparés à ceux de la ligne CMC, réseaux
 *     normalisés par reseauCmc / RESEAUX_IDENTITE ci-dessous (reprise du 10/10/2026 : une même adresse sur deux réseaux
 *     peut désigner deux jetons différents, cas réel 0xaD55…c7e0 = USDO sur Base mais cUSDO sur Ethereum ; forks
 *     PulseChain ; dénominations ibc/ propres à chaque chaîne) :
 *       a. même adresse sur le MÊME réseau = « commune », preuve forte ;
 *       b. même réseau et adresses de forme canonique différentes (EVM « 0x » + 40 hex, ou Solana) = « differente »
 *          → candidat rejeté ; SAUF si l'adresse CMC figure dans la fiche sur un AUTRE réseau = « conflit », traité comme
 *          « inconnue » (cas réel edu-coin : CMC étiquette « Ethereum » l'adresse Arbitrum 0xf817…) ;
 *       c. une adresse trouvée seulement sur un autre réseau, ou sur un réseau inconnu, n'est JAMAIS une preuve : ni levée
 *          de la règle « à 1 $ », ni reconduction, ni appariement sans référence de prix ;
 *       d. jamais une preuve non plus : les adresses bouche-trou (liste explicite testée + motifs 0xeeee…, 0x0000…1010) et
 *          toute adresse portée par au moins 2 fiches ou par au moins 2 identifiants CMC des lignes lues (adressesPartagees,
 *          recalculées à chaque construction ; 10/10/2026 : 0xdead…0000 = mantle ET metis-token en base ; HEX 5015 et
 *          pHEX 28928 à la même adresse chez CMC) ;
 *       e. pas de preuve d'identité = inconnu (pas de rejet), SAUF actif « à 1 $ » (|prix − 1| < 0,1, prix de la fiche ou
 *          de la ligne CMC) ou classé stablecoin : là, une adresse commune est OBLIGATOIRE, ou une désignation manuelle
 *          explicite (MANUELS, avec sa preuve en commentaire) quand la fiche n'a aucune adresse en base ; et pour un tel
 *          actif, un identifiant CMC qui CHANGE par rapport à la table précédente exige une adresse commune, désignation
 *          manuelle comprise.
 *          Cas réel : usda-2 (Avalon USDa, ethereum 0x8a60…) ≠ CMC 35965 « USDA » (ethereum 0x0000206329…) ;
 *     Casse : seules les adresses hexadécimales (EVM, XDC, Aptos/Sui) passent en minuscules ; les autres formats (base58
 *     Solana/Tron, ibc/…) sont comparés tels quels.
 *  4. prix CMC à ± 5 % d'une référence INDÉPENDANTE : le prix déjà en base SEULEMENT s'il ne vient pas de CoinMarketCap
 *     (price_source ≠ coinmarketcap, sinon le contrôle se validerait lui-même : R2 écrit ce prix depuis le même
 *     identifiant) et s'il est relevé à 6 h au plus de l'horodatage CMC ; sinon une référence de SECOURS de moins d'une
 *     heure (DexScreener par adresse de contrat, puis CoinGecko public ; validation interne seulement). Sans aucune
 *     référence indépendante, seule une adresse de contrat commune permet l'appariement (preuve plus forte que le prix).
 * Piège connu : « beam » (BEAM, ancienne crypto de confidentialité) ne doit JAMAIS être relié à « onbeam » (Beam, jeu) :
 * même symbole, même nom normalisé, prix à 68 % d'écart → rejeté par la condition 4.
 *
 * CONTINUITÉ : une fiche de la table précédente garde son identifiant CMC SEULEMENT avec une adresse de contrat commune
 * SUR LE MÊME RÉSEAU (preuve indépendante du prix ; ni le symbole ni le nom ne sont regardés, d'où la règle 3) et, si une référence de prix indépendante existe, un écart d'au plus 5 % ; sinon elle
 * est « perdue » (alerte), jamais gardée. Ni une désignation manuelle introuvable, ni une fiche dépubliée ne se
 * reconduisent. Homonymes départagés dans l'ordre : adresse commune, slug = identifiant du site, puis identifiant
 * précédent seulement s'il passe le contrôle d'adresse.
 * Doublons : deux fiches qui revendiquent le même identifiant CMC sont TOUTES DEUX exclues (cas MANTRA, OM ancien et
 * nouveau), sauf : une fiche dépubliée ne compte pas (la publiée garde l'identifiant), et une correspondance directe
 * l'emporte sur une reconduite.
 * Zéro dépendance (Node 20 et bundle Next). Fonctions pures, testées par tests/lib/fiches-z3.test.ts,
 * tests/lib/cmc-continuite.test.ts et tests/lib/cmc-identite.test.ts.
 */

export const TOLERANCE_PRIX_PCT = 5;
/** Écart maximal entre l'heure du prix de référence et l'heure du prix CMC. */
export const AGE_REFERENCE_MAX_H = 6;
/** Un actif dont le prix est à moins de 0,10 $ de 1 $ est traité comme un dollar numérique (adresse commune exigée). */
export const ECART_DOLLAR = 0.1;

const GENERIQUES = new Set(["token", "coin", "network", "protocol", "the", "finance", "chain", "dao", "ai", "labs", "new", "v2", "v3", "prev"]);

/** « Ether.fi » → « etherfi » ; accents retirés, minuscules, lettres et chiffres seulement. */
export function normaliserNom(s) {
  return String(s ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

function mots(s) {
  return String(s ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((m) => m && !GENERIQUES.has(m));
}

/** Noms compatibles (condition 2). */
export function nomsCompatibles(fiche, cmc) {
  const a = normaliserNom(fiche.name);
  const b = normaliserNom(cmc.name);
  if (a && a === b) return true;
  if (cmc.slug && cmc.slug === fiche.id) return true;
  if (normaliserNom(cmc.slug) === a && a) return true;
  const ma = mots(fiche.name);
  const mb = mots(cmc.name);
  if (!ma.length || !mb.length) return false;
  const [court, long] = ma.length <= mb.length ? [ma, mb] : [mb, ma];
  // un seul mot commun ne suffit pas (« Pepe » ≠ « Pepe Unchained ») : au moins deux mots, ou les mêmes mots
  if (court.length < 2 && long.length !== court.length) return false;
  return court.every((m) => long.includes(m));
}

/** Écart relatif en % de `prix` par rapport à `reference` (signé), null si l'un manque. */
export function ecartPct(prix, reference) {
  if (!(typeof prix === "number" && prix > 0 && typeof reference === "number" && reference > 0)) return null;
  return Math.round(((prix - reference) / reference) * 1000) / 10;
}

const num = (v) => (typeof v === "number" && Number.isFinite(v) ? v : typeof v === "string" && v.trim() !== "" && Number.isFinite(Number(v)) ? Number(v) : null);

/* ------------------------------------------------------------------------------------------------ réseaux */

/**
 * Réseaux NORMALISÉS (10/10/2026) : la clé commune est l'identifiant de plateforme CoinGecko, tel qu'il figure en base
 * (cryptos.chains, raw_data_snapshot.contracts). Une plateforme CoinMarketCap (champ platform des cotations : slug +
 * nom, ou platforms[] de l'API publique : nom seul) est traduite vers cette clé. Le NOM prime sur le slug, car CMC
 * réutilise un même slug pour deux réseaux (« bnb » = BNB Smart Chain BEP20 ET BNB Beacon Chain BEP2 ; « tron » = Tron20
 * et Tron10 ; « hyperliquid » = HyperEVM et Hyperliquid ; « cronos » = Cronos et Cronos zkEVM). Un réseau absent de la
 * table n'est jamais deviné : il reste « inconnu » (pas de rejet « contrat différent » possible sur lui).
 * Table relevée sur la carte publique CMC du 10/10/2026 (8 150 identifiants actifs) et les plateformes de la base.
 */
const CMC_NOM_VERS_RESEAU = {
  "ethereum": "ethereum",
  "bnb smart chain (bep20)": "binance-smart-chain",
  "bnb beacon chain (bep2)": "binancecoin",
  "solana": "solana",
  "base": "base",
  "polygon": "polygon-pos",
  "arbitrum": "arbitrum-one",
  "avalanche c-chain": "avalanche",
  "ton": "the-open-network",
  "x layer": "x-layer",
  "sui network": "sui",
  "tron20": "tron",
  "tron10": "tron",
  "bittensor": "bittensor",
  "osmosis": "osmosis",
  "multiversx": "elrond",
  "cronos": "cronos",
  "cronos zkevm mainnet": "cronos-zkevm",
  "cardano": "cardano",
  "hyperevm": "hyperevm",
  "hyperliquid": "hyperliquid",
  "icp": "internet-computer",
  "kaia": "klay-token",
  "optimism": "optimistic-ethereum",
  "hedera hashgraph": "hedera-hashgraph",
  "near": "near-protocol",
  "zksync era": "zksync",
  "xrp ledger": "xrp",
  "ordinals - brc20": "ordinals",
  "xdc network": "xdc-network",
  "sonic": "sonic",
  "celo": "celo",
  "bera chain": "berachain",
  "linea": "linea",
  "stellar": "stellar",
  "gnosis chain": "xdai",
  "neo": "neo",
  "mantle": "mantle",
  "katana": "katana",
  "pulsechain": "pulsechain",
  "fantom": "fantom",
  "core": "core",
  "blast": "blast",
  "etherlink": "etherlink",
  "aptos": "aptos",
  "abstract chain": "abstract",
  "monad": "monad",
  "vechain": "vechain",
  "heco": "huobi-token",
  "rsk rbtc": "rootstock",
  "injective": "injective",
  "kava": "kava",
  "aurora": "aurora",
  "manta pacific": "manta-pacific",
  "mantra": "mantra",
  "scroll": "scroll",
  "metal": "metal-l2",
  "ont": "ontology",
  "thorchain": "thorchain",
  "unichain": "unichain",
  "world chain": "world-chain",
  "starknet": "starknet",
  "algorand": "algorand",
  "moonbeam": "moonbeam",
  "moonriver": "moonriver",
  "ronin": "ronin",
  "plasma": "plasma",
  "ink": "ink",
  "fraxtal": "fraxtal",
  "mode": "mode",
  "opbnb": "opbnb",
  "taiko": "taiko",
  "megaeth": "megaeth",
  "sei network": null, // EVM et Cosmos sous le même nom : jamais deviné
};
/** Slug de plateforme CMC → réseau, quand le nom manque (ou n'est pas dans la table ci-dessus). */
const CMC_SLUG_VERS_RESEAU = {
  ethereum: "ethereum",
  solana: "solana",
  base: "base",
  "polygon-ecosystem-token": "polygon-pos",
  arbitrum: "arbitrum-one",
  avalanche: "avalanche",
  gram: "the-open-network",
  okb: "x-layer",
  sui: "sui",
  bittensor: "bittensor",
  osmosis: "osmosis",
  "multiversx-egld": "elrond",
  cardano: "cardano",
  "internet-computer": "internet-computer",
  kaia: "klay-token",
  "optimism-ethereum": "optimistic-ethereum",
  hedera: "hedera-hashgraph",
  "near-protocol": "near-protocol",
  zksync: "zksync",
  xrp: "xrp",
  "xdc-network": "xdc-network",
  sonic: "sonic",
  celo: "celo",
  berachain: "berachain",
  linea: "linea",
  stellar: "stellar",
  "gnosis-gno": "xdai",
  neo: "neo",
  mantle: "mantle",
  "katana-network": "katana",
  pulsechain: "pulsechain",
  fantom: "fantom",
  "core-dao": "core",
  blast: "blast",
  aptos: "aptos",
  abstract: "abstract",
  monad: "monad",
  vechain: "vechain",
  "htx-token": "huobi-token",
  "rsk-smart-bitcoin": "rootstock",
  injective: "injective",
  kava: "kava",
  "aurora-near": "aurora",
  "manta-network": "manta-pacific",
  "mantra-new": "mantra",
  scroll: "scroll",
  metal: "metal-l2",
  ontology: "ontology",
  thorchain: "thorchain",
  // « bnb », « tron », « hyperliquid », « cronos », « bitcoin », « chiliz » : un slug pour plusieurs réseaux → seul le nom tranche
};
/**
 * Plateformes CoinGecko (base) ramenées à la même clé (alias d'un même réseau). Tout autre identifiant CoinGecko est
 * gardé tel quel (c'est déjà la clé normalisée).
 */
const CG_ALIAS = { "binance-smart-chain": "binance-smart-chain", "polygon-pos": "polygon-pos", "arbitrum-one": "arbitrum-one", "optimistic-ethereum": "optimistic-ethereum" };

/** Réseau normalisé d'une plateforme CMC ({ slug, name }) ; null si inconnu. */
export function reseauCmc(plateforme) {
  const nom = String(plateforme?.name ?? "").trim().toLowerCase();
  if (nom && Object.prototype.hasOwnProperty.call(CMC_NOM_VERS_RESEAU, nom)) return CMC_NOM_VERS_RESEAU[nom];
  const slug = String(plateforme?.slug ?? "").trim().toLowerCase();
  return CMC_SLUG_VERS_RESEAU[slug] ?? null;
}
/** Réseau normalisé d'une plateforme CoinGecko (clé de cryptos.chains) ; null si vide. */
export function reseauCoingecko(id) {
  const k = String(id ?? "").trim().toLowerCase();
  if (!k) return null;
  return CG_ALIAS[k] ?? k;
}
/** Table de normalisation exposée pour les tests. */
export const RESEAUX_IDENTITE = { cmcParNom: CMC_NOM_VERS_RESEAU, cmcParSlug: CMC_SLUG_VERS_RESEAU };

const EVM = /^0x[0-9a-f]{40}$/;
const SOLANA = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
/**
 * Bouche-trous EXPLICITES (adresses normalisées), jamais une preuve d'identité : jetons natifs ou adresses nulles que des
 * actifs sans rapport partagent.
 */
export const BOUCHE_TROUS = new Set([
  // jeton natif des chaînes OP-stack : en base, porté à la fois par mantle (MNT) et metis-token (METIS), 10/10/2026
  "0xdeaddeaddeaddeaddeaddeaddeaddeaddead0000",
  // adresse nulle TON (forme « EQ… » de 0:000…000)
  `EQ${"A".repeat(43)}M9c`,
  // SOL enveloppé (jeton natif Solana)
  "So11111111111111111111111111111111111111112",
]);
/**
 * Adresse « bouche-trou » (liste explicite ci-dessus, jeton natif noté 0xeeee…, 0x0000…1010, précompilés) : jamais une
 * preuve d'identité, deux actifs sans rapport peuvent la partager. `a` = adresse normalisée.
 */
function boucheTrou(a) {
  if (BOUCHE_TROUS.has(a)) return true;
  if (!EVM.test(a)) return false;
  const hex = a.slice(2);
  return new Set(hex).size <= 3 || (hex.match(/0/g) ?? []).length >= 30;
}
/**
 * Adresse normalisée pour la comparaison : hexadécimal (EVM 0x + 40, Aptos/Sui 0x + 64, éventuellement suivi de
 * « ::module::JETON ») en minuscules, le préfixe XDC ramené à « 0x » ; tout autre format (base58 Solana/Tron, ibc/…,
 * comptes) gardé TEL QUEL, car sensible à la casse. null si vide ou invalide.
 */
export function adresseNormalisee(a) {
  const s = typeof a === "string" ? a.trim() : "";
  if (s.length < 20 || /\s/.test(s)) return null;
  // XDC Network : « xdc5d5f… » (CoinGecko) = « 0x5d5f… » (CoinMarketCap), même adresse (storx, mesure du 10/10/2026)
  if (/^xdc[0-9a-fA-F]{40}$/i.test(s)) return `0x${s.slice(3).toLowerCase()}`;
  const hex = /^(0x[0-9a-fA-F]+)(::.+)?$/i.exec(s);
  if (hex) return `0x${hex[1].slice(2).toLowerCase()}${hex[2] ?? ""}`;
  return s;
}

/**
 * Adresses de contrat d'une fiche pour la preuve d'identité, lues aux mêmes endroits que adressesFiche
 * (scripts/lib/fiches-prix.mjs : chains, raw_data_snapshot.contracts / platforms) mais TOUS réseaux confondus :
 * [{ reseau (clé CoinGecko normalisée), adresse }]. Accepte aussi une liste déjà prête (f.adresses).
 */
export function adressesIdentiteFiche(f) {
  const out = [];
  const vu = new Set();
  const ajouter = (plateforme, valeur) => {
    const reseau = reseauCoingecko(plateforme);
    const brute = typeof valeur === "string" ? valeur : typeof valeur?.contract_address === "string" ? valeur.contract_address : typeof valeur?.address === "string" ? valeur.address : "";
    const adresse = adresseNormalisee(brute);
    if (!reseau || !adresse || boucheTrou(adresse)) return;
    const k = `${reseau}:${adresse}`;
    if (vu.has(k)) return;
    vu.add(k);
    out.push({ reseau, adresse });
  };
  const lire = (src) => {
    if (!src) return;
    if (Array.isArray(src)) {
      for (const x of src) if (x && typeof x === "object") ajouter(x.reseau ?? x.chain ?? x.platform ?? x.network, x.adresse ?? x.address ?? x.contract_address ?? x.contract);
      return;
    }
    if (typeof src === "object") for (const [k, v] of Object.entries(src)) ajouter(k, v);
  };
  lire(f?.adresses);
  lire(f?.chains);
  lire(f?.contrats ?? f?.raw_data_snapshot?.contracts);
  lire(f?.raw_data_snapshot?.platforms);
  lire(f?.raw_data_snapshot?.detail_platforms);
  return out;
}

/**
 * Adresses qui ne valent JAMAIS preuve pour cette construction (condition 3 d) : portées par au moins 2 fiches distinctes
 * ou par au moins 2 identifiants CMC distincts des lignes lues. Recalculées à chaque construction.
 * @returns {Set<string>} adresses normalisées
 */
export function adressesPartagees(fiches, candidats) {
  const parFiche = new Map();
  const parCmc = new Map();
  const noter = (m, a, qui) => {
    if (!m.has(a)) m.set(a, new Set());
    m.get(a).add(qui);
  };
  for (const f of fiches ?? []) for (const a of adressesIdentiteFiche(f)) noter(parFiche, a.adresse, f.id);
  for (const c of candidats ?? []) {
    if (!c) continue;
    for (const a of c.adresses ?? []) {
      const n = adresseNormalisee(a?.adresse);
      if (n) noter(parCmc, n, c.cmcId);
    }
  }
  const out = new Set();
  for (const m of [parFiche, parCmc]) for (const [a, qui] of m) if (qui.size >= 2) out.add(a);
  return out;
}

/**
 * Identité par contrat (condition 3) entre une fiche et une ligne CMC normalisée, par couples (réseau, adresse).
 * @param {Set<string>} [exclues] adresses qui ne valent pas preuve (adressesPartagees)
 * @returns {{verdict: "commune"|"differente"|"conflit"|"inconnue", reseau?: string, adresse?: string}}
 */
export function identiteContrat(f, c, exclues) {
  const hors = (a) => !a || boucheTrou(a) || (exclues instanceof Set && exclues.has(a));
  const af = adressesIdentiteFiche(f).filter((a) => !hors(a.adresse));
  const ac = (c?.adresses ?? []).map((a) => ({ reseau: a?.reseau ?? null, adresse: adresseNormalisee(a?.adresse) })).filter((a) => !hors(a.adresse));
  if (!af.length || !ac.length) return { verdict: "inconnue" };
  // a. même adresse sur le MÊME réseau normalisé (un réseau CMC inconnu ne prouve rien)
  for (const a of ac) {
    if (a.reseau && af.some((x) => x.reseau === a.reseau && x.adresse === a.adresse)) return { verdict: "commune", reseau: a.reseau, adresse: a.adresse };
  }
  // b. même réseau, adresses de forme canonique différentes → contrat différent ; « conflit » si l'adresse CMC figure dans
  //    la fiche sur un autre réseau (étiquette de réseau douteuse d'un côté : ni preuve ni rejet)
  const canon = (s, r) => EVM.test(s) || (r === "solana" && SOLANA.test(s));
  let conflit = null;
  for (const a of ac) {
    if (!a.reseau || !canon(a.adresse, a.reseau)) continue;
    const memeReseau = af.filter((x) => x.reseau === a.reseau);
    if (!memeReseau.length || !memeReseau.every((x) => canon(x.adresse, a.reseau))) continue;
    if (af.some((x) => x.adresse === a.adresse)) {
      conflit ??= { verdict: "conflit", reseau: a.reseau, adresse: a.adresse };
      continue;
    }
    return { verdict: "differente", reseau: a.reseau, adresse: a.adresse };
  }
  // c. adresse égale seulement sur un autre réseau, ou réseaux sans recouvrement : jamais une preuve
  return conflit ?? { verdict: "inconnue" };
}

/** Catégorie de stablecoin (« Stablecoins », « USD Stablecoin », « Fiat-backed Stablecoin »… ; pas « Stablecoin Issuer »). */
const CATEGORIE_STABLE = /^[A-Za-z -]*\bstablecoins?$/i;
/** Actif « à 1 $ » ou stablecoin (condition 3 c). */
export function actifDollar(f, c) {
  const pres = (p) => typeof p === "number" && p > 0 && Math.abs(p - 1) < ECART_DOLLAR;
  if (pres(f?.prix) || pres(c?.prix)) return true;
  return Array.isArray(f?.categories) && f.categories.some((x) => typeof x === "string" && CATEGORIE_STABLE.test(x.trim()));
}

/* ------------------------------------------------------------------------------------------------ lignes CMC */

/**
 * Ligne CMC normalisée, quel que soit le format : API Pro (quote.USD) ou liste publique du site (quote = [{ symbol: "USD" }]).
 * Adresses : platform.token_address (cotations v2 et carte), et si présents contract_address[] (/v2/cryptocurrency/info)
 * ou platforms[] (API publique du site : contractPlatform / contractAddress).
 * @returns {{cmcId:number, slug:string, name:string, symbol:string, prix:number|null, le:string|null, adresses: Array<{plateforme:string, reseau:string|null, adresse:string}>}|null}
 */
export function normaliserCmc(raw) {
  if (!raw || typeof raw !== "object") return null;
  const id = num(raw.id);
  if (id === null || typeof raw.symbol !== "string") return null;
  let q = null;
  if (Array.isArray(raw.quote)) q = raw.quote.find((x) => x && (x.symbol === "USD" || x.name === "USD")) ?? null;
  else if (raw.quote && typeof raw.quote === "object") q = raw.quote.USD ?? null;
  const prix = num(q?.price);
  const adresses = [];
  const vu = new Set();
  const ajouter = (plateforme, adresse) => {
    const a = adresseNormalisee(adresse);
    if (!a) return;
    const reseau = reseauCmc(plateforme);
    const k = `${reseau}:${a}`;
    if (vu.has(k)) return;
    vu.add(k);
    adresses.push({ plateforme: String(plateforme?.slug ?? plateforme?.name ?? ""), reseau, adresse: a });
  };
  if (raw.platform && typeof raw.platform === "object" && typeof raw.platform.token_address === "string") ajouter(raw.platform, raw.platform.token_address);
  if (Array.isArray(raw.contract_address)) {
    for (const x of raw.contract_address) if (x && typeof x === "object") ajouter({ name: x.platform?.name, slug: x.platform?.coin?.slug }, x.contract_address);
  }
  if (Array.isArray(raw.platforms)) {
    for (const x of raw.platforms) if (x && typeof x === "object") ajouter({ name: x.contractPlatform ?? x.name }, x.contractAddress ?? x.contract_address);
  }
  return {
    cmcId: id,
    slug: typeof raw.slug === "string" ? raw.slug : "",
    name: typeof raw.name === "string" ? raw.name : raw.symbol,
    symbol: raw.symbol.toUpperCase(),
    prix: prix !== null && prix > 0 ? prix : null,
    le: typeof q?.last_updated === "string" ? q.last_updated : typeof raw.last_updated === "string" ? raw.last_updated : null,
    adresses,
  };
}

/** Index des lignes CMC normalisées par symbole et par slug. */
function indexer(candidats) {
  const parSymbole = new Map();
  const parSlug = new Map();
  const parId = new Map();
  for (const c of candidats) {
    if (!c) continue;
    if (!parSymbole.has(c.symbol)) parSymbole.set(c.symbol, []);
    parSymbole.get(c.symbol).push(c);
    if (c.slug) parSlug.set(c.slug, c);
    parId.set(c.cmcId, c);
  }
  return { parSymbole, parSlug, parId };
}

/**
 * Candidats d'une fiche : la ligne désignée à la main (slug ET identifiant), sinon même symbole ET nom compatible.
 * Désignation dont le slug renvoie un AUTRE identifiant que cmcId (slug réattribué) ou introuvable : aucun candidat, et
 * `alerte` (texte du ::warning::).
 */
function candidatsDe(f, { parSymbole, parSlug, parId }, manuels) {
  const m = manuels[f.id];
  if (m?.cmcSlug) {
    const c = parSlug.get(m.cmcSlug);
    if (c && Number.isInteger(m.cmcId) && c.cmcId !== m.cmcId) {
      return { liste: [], manuel: true, alerte: `slug CMC désigné réattribué : « ${m.cmcSlug} » renvoie l'identifiant ${c.cmcId} au lieu de ${m.cmcId} (désignation refusée, à revoir dans MANUELS)` };
    }
    if (!c) {
      const ailleurs = Number.isInteger(m.cmcId) ? parId?.get(m.cmcId) : null;
      return { liste: [], manuel: true, alerte: `slug CMC désigné introuvable (${m.cmcSlug})${ailleurs ? ` ; l'identifiant ${m.cmcId} porte désormais le slug « ${ailleurs.slug} »` : ""}` };
    }
    return { liste: [c], manuel: true };
  }
  const sym = String(f.symbol ?? "").toUpperCase();
  return { liste: (parSymbole.get(sym) ?? []).filter((c) => nomsCompatibles(f, c)), manuel: false };
}

/**
 * Le prix de la fiche en base sert-il de référence pour ce candidat ? Il doit être INDÉPENDANT de CoinMarketCap
 * (price_source ≠ coinmarketcap : sinon R2 l'a écrit depuis l'identifiant même qu'on contrôle) et relevé à 6 h au plus
 * de l'heure du prix CMC.
 */
function referenceBaseValide(f, c, ageMax) {
  if (String(f.prixSource ?? "").toLowerCase() === "coinmarketcap") return false;
  const refT = f.prixLe ? Date.parse(f.prixLe) : NaN;
  return typeof f.prix === "number" && f.prix > 0 && Number.isFinite(refT) && !!c.le && Math.abs(Date.parse(c.le) - refT) <= ageMax;
}

/**
 * Référence de SECOURS (finitions Z3, F4), pour la seule validation interne de l'appariement (jamais affichée, jamais
 * écrite en base) : prix CoinGecko public (identifiant de la fiche), sinon DexScreener par adresse de contrat, relevé il y a MOINS d'une heure et à
 * 6 h au plus de l'heure du prix CMC.
 */
export const AGE_SECOURS_MAX_H = 1;
function secoursValide(s, c, ageMax, maintenant) {
  if (!s || !(typeof s.prix === "number" && s.prix > 0)) return false;
  const t = Date.parse(String(s.le ?? ""));
  if (!Number.isFinite(t)) return false;
  const age = maintenant - t;
  // 5 min de tolérance d'horloge vers le futur ; plus d'une heure = périmée
  if (age > AGE_SECOURS_MAX_H * 3_600_000 || age < -300_000) return false;
  return !!c.le && Math.abs(Date.parse(c.le) - t) <= ageMax;
}

/**
 * Fiches pour lesquelles une référence de secours est demandée : au moins un candidat CMC (ou l'identifiant de la table
 * précédente) sans prix de référence indépendant valable en base (prix absent, venu de CoinMarketCap, ou relevé à plus de
 * 6 h du prix CMC).
 * @param {{manuels?: Record<string, {cmcSlug: string}>, precedente?: Record<string, {id: number}>, ageReferenceMaxH?: number}} [opts]
 * @returns {string[]} identifiants de fiches
 */
export function fichesSansReference(fiches, candidats, opts = {}) {
  const ageMax = (opts.ageReferenceMaxH ?? AGE_REFERENCE_MAX_H) * 3_600_000;
  const idx = indexer(candidats);
  const precedente = opts.precedente ?? {};
  const out = [];
  for (const f of fiches) {
    const { liste } = candidatsDe(f, idx, opts.manuels ?? {});
    const prec = precedente[f.id] && idx.parId.get(precedente[f.id].id);
    if ([...liste, ...(prec ? [prec] : [])].some((c) => !referenceBaseValide(f, c, ageMax))) out.push(f.id);
  }
  return out.sort();
}

/**
 * Appariement de toutes les fiches.
 * @param {Array<{id:string, symbol:string, name:string, prix?:number|null, prixLe?:string|null, prixSource?:string|null, publie?:boolean, categories?:string[], chains?:any, contrats?:any, adresses?:Array<{reseau:string, adresse:string}>}>} fiches
 * @param {Array<ReturnType<typeof normaliserCmc>>} candidats lignes CMC normalisées
 * @param {{tolerancePct?: number, ageReferenceMaxH?: number, manuels?: Record<string, {cmcSlug: string, cmcId?: number, motif?: string}>, secours?: Record<string, {prix: number, le: string, source: string}>, precedente?: Record<string, {id: number, symbol?: string}>, maintenant?: number, adressesExclues?: Set<string>}} [opts]
 *   adressesExclues : adresses qui ne valent pas preuve ; par défaut adressesPartagees(fiches, candidats).
 * @returns {{map: Record<string,{id:number,symbol:string}>, exclus: string[], details: Record<string, any>, adressesExclues: string[]}}
 */
export function apparier(fiches, candidats, opts = {}) {
  const tol = opts.tolerancePct ?? TOLERANCE_PRIX_PCT;
  const ageMax = (opts.ageReferenceMaxH ?? AGE_REFERENCE_MAX_H) * 3_600_000;
  const manuels = opts.manuels ?? {};
  /** @type {Record<string, {prix: number, le: string, source: string}>} */
  const secours = opts.secours ?? {};
  /** Table précédente (identifiant de fiche → { id CMC, symbol }) : règle de CONTINUITÉ (voir l'en-tête). */
  const precedente = opts.precedente ?? {};
  const maintenant = opts.maintenant ?? Date.now();
  const idx = indexer(candidats);
  const { parSymbole, parId } = idx;
  const exclues = opts.adressesExclues instanceof Set ? opts.adressesExclues : adressesPartagees(fiches, candidats);
  /** @type {Record<string, any>} */
  const details = {};
  const retenus = new Map();
  const publiee = new Map(fiches.map((f) => [f.id, f.publie !== false]));
  for (const f of fiches) {
    const sym = String(f.symbol ?? "").toUpperCase();
    const s = secours[f.id];
    const { liste: candidatsFiche, manuel, alerte: alerteManuel } = candidatsDe(f, idx, manuels);
    /** Jugement d'un candidat : identité par contrat (condition 3) puis prix contre une référence indépendante (4). */
    const juger = (c) => {
      const id = identiteContrat(f, c, exclues);
      const base = { c, identite: id.verdict, ecart: null, secours: null };
      if (id.verdict === "differente") return { ...base, ok: false, motif: `contrat différent (${id.reseau} : ${id.adresse} chez CoinMarketCap)` };
      if (id.verdict !== "commune" && actifDollar(f, c)) {
        const precisions = id.verdict === "conflit" ? ` (conflit d'adresses entre réseaux : ${id.reseau} ${id.adresse})` : "";
        if (!manuel) return { ...base, ok: false, motif: `actif à 1 $ ou stablecoin sans adresse de contrat commune sur le même réseau${precisions}` };
        // dollar désigné à la main : un identifiant qui CHANGE exige une adresse commune (le prix à ± 5 % autour de 1 $ ne
        // départage rien ; piège F9, slug réattribué à un autre dollar)
        const p = precedente[f.id];
        if (p && Number.isInteger(p.id) && p.id !== c.cmcId) return { ...base, ok: false, motif: `actif à 1 $ : identifiant CMC changé (${p.id} → ${c.cmcId}) sans adresse de contrat commune sur le même réseau${precisions}` };
      }
      let reference = null;
      let source = null;
      if (referenceBaseValide(f, c, ageMax)) reference = f.prix;
      else if (secoursValide(s, c, ageMax, maintenant)) {
        reference = s.prix;
        source = s.source;
      }
      if (reference === null) {
        // sans référence indépendante : une adresse commune (preuve plus forte que le prix) ou une désignation manuelle
        // explicite (MANUELS, preuve en commentaire) suffit ; le contrôle de prix s'applique dès qu'une référence existe
        if (id.verdict === "commune") return { ...base, ok: true, sansReference: true, motif: "adresse de contrat commune, aucune référence de prix indépendante" };
        if (manuel) return { ...base, ok: true, sansReference: true, motif: "désignation manuelle, aucune référence de prix indépendante" };
        return { ...base, ok: false, motif: "aucun prix de référence indépendant relevé à moins de 6 h du prix CoinMarketCap" };
      }
      const e = ecartPct(c.prix, reference);
      const suffixe = source ? ` (référence de secours : ${source})` : "";
      return { ...base, ecart: e, secours: source, ok: e !== null && Math.abs(e) <= tol, motif: e === null ? `prix CoinMarketCap absent${suffixe}` : `écart de prix ${e} %${suffixe}` };
    };
    // continuité : la ligne CMC de l'identifiant de la table précédente, SEULEMENT avec une adresse de contrat commune
    const reconduire = () => {
      const p = precedente[f.id];
      if (!p || !Number.isInteger(p.id)) return { r: null };
      if (manuel) return { r: null, motif: `désignation manuelle (${manuels[f.id].cmcSlug}) : pas de reconduction` };
      if (f.publie === false) return { r: null, motif: "fiche dépubliée : pas de reconduction" };
      const c = parId.get(p.id);
      if (!c) return { r: null, motif: `identifiant précédent ${p.id} absent des lignes CoinMarketCap lues` };
      const j = juger(c);
      if (j.identite !== "commune") return { r: null, motif: `identifiant précédent ${p.id} sans adresse de contrat commune sur le même réseau (${j.identite === "differente" ? j.motif : j.identite === "conflit" ? "conflit d'adresses entre réseaux" : "preuve d'identité absente"}) : pas de reconduction` };
      if (!j.ok) return { r: null, motif: `identifiant précédent ${p.id} : ${j.motif}` };
      return { r: j };
    };
    const retenir = (j, extra) => {
      details[f.id] = {
        statut: "apparié",
        cmcId: j.c.cmcId,
        cmcSlug: j.c.slug,
        cmcNom: j.c.name,
        ecartPrixPct: j.ecart,
        preuve: j.identite === "commune" ? "contrat" : manuel ? "manuel" : "symbole, nom et prix",
        ...(j.sansReference ? { sansReferencePrix: true } : {}),
        ...(manuel ? { manuel: true } : {}),
        ...extra,
        ...(j.secours ? { referenceSecours: j.secours } : {}),
      };
      retenus.set(f.id, { id: j.c.cmcId, symbol: j.c.symbol });
    };
    if (!candidatsFiche.length) {
      const { r, motif } = reconduire();
      if (r) {
        retenir(r, { reconduite: true, motif: "identifiant de la table précédente, adresse de contrat commune" });
        continue;
      }
      details[f.id] = {
        statut: "non apparié",
        motif: manuel
          ? alerteManuel ?? `slug CMC désigné introuvable (${manuels[f.id].cmcSlug})`
          : motif ?? ((parSymbole.get(sym) ?? []).length ? "symbole présent chez CoinMarketCap, nom incompatible" : "aucune ligne CoinMarketCap à ce symbole dans la liste lue"),
        ...(alerteManuel ? { alerteManuel } : {}),
      };
      continue;
    }
    const juges = candidatsFiche.map(juger);
    const bons = juges.filter((j) => j.ok);
    let choix = null;
    if (bons.length === 1) choix = bons[0];
    else if (bons.length > 1) {
      // homonymes : 1) adresse commune, 2) slug = identifiant du site, 3) identifiant précédent s'il a une adresse commune
      const communs = bons.filter((j) => j.identite === "commune");
      if (communs.length === 1) choix = communs[0];
      else {
        const pool = communs.length ? communs : bons;
        choix = pool.find((j) => j.c.slug === f.id) ?? pool.find((j) => j.c.cmcId === precedente[f.id]?.id && j.identite === "commune") ?? null;
      }
    }
    if (!choix) {
      const { r, motif } = reconduire();
      if (r) {
        retenir(r, { reconduite: true, motif: bons.length > 1 ? "homonymes départagés par l'identifiant de la table précédente (adresse de contrat commune)" : "identifiant de la table précédente, adresse de contrat commune" });
        continue;
      }
      const meilleur = [...juges].sort((a, b) => Math.abs(a.ecart ?? Infinity) - Math.abs(b.ecart ?? Infinity))[0];
      details[f.id] = {
        statut: "non apparié",
        motif: bons.length > 1 ? `homonymes : ${bons.length} lignes CoinMarketCap valides (${bons.map((j) => j.c.slug).join(", ")})` : meilleur.motif,
        cmcSlug: meilleur.c.slug,
        cmcId: meilleur.c.cmcId,
        ecartPrixPct: meilleur.ecart,
        ...(motif && precedente[f.id] ? { continuite: motif } : {}),
        ...(meilleur.secours ? { referenceSecours: meilleur.secours } : {}),
      };
      continue;
    }
    retenir(choix, {});
  }
  // Un même identifiant CMC revendiqué par plusieurs fiches : une fiche dépubliée ne compte pas (la publiée le garde) ;
  // une correspondance directe l'emporte sur une reconduite ; sinon toutes sont exclues (jamais de choix arbitraire).
  const parCmc = new Map();
  for (const [site, e] of retenus) {
    if (!parCmc.has(e.id)) parCmc.set(e.id, []);
    parCmc.get(e.id).push(site);
  }
  const exclure = (site, motif) => {
    retenus.delete(site);
    details[site] = { ...details[site], statut: "non apparié", motif };
  };
  for (const [cmcId, sites] of parCmc) {
    if (sites.length < 2) continue;
    let restants = sites;
    const publiees = restants.filter((x) => publiee.get(x));
    if (publiees.length && publiees.length < restants.length) {
      for (const x of restants.filter((y) => !publiee.get(y))) exclure(x, `fiche dépubliée : identifiant CMC ${cmcId} laissé à ${publiees.join(", ")}`);
      restants = publiees;
    }
    if (restants.length < 2) continue;
    const directs = restants.filter((x) => !details[x].reconduite);
    if (directs.length === 1) {
      for (const x of restants.filter((y) => y !== directs[0])) exclure(x, `identifiant CMC ${cmcId} repris par ${directs[0]} (correspondance directe)`);
      continue;
    }
    for (const x of restants) exclure(x, `identifiant CMC ${cmcId} revendiqué par ${restants.length} fiches (${restants.join(", ")})`);
  }
  const map = {};
  for (const id of [...retenus.keys()].sort()) map[id] = retenus.get(id);
  const exclus = fiches.map((f) => f.id).filter((id) => !map[id]).sort();
  return { map, exclus, details, adressesExclues: [...exclues].sort() };
}
