/**
 * scripts/lib/cmc-appariement.mjs — appariement des fiches du site avec CoinMarketCap (lot Z3, 10/10/2026).
 *
 * Règle (architecture 0 € § 4.1 n° 5) : une fiche n'est reliée à un identifiant CoinMarketCap que si les TROIS
 * conditions tiennent :
 *  1. même symbole (insensible à la casse) ;
 *  2. nom compatible (noms normalisés égaux, ou slug CMC = identifiant du site, ou mots du nom le plus court tous
 *     présents dans le plus long, mots génériques « token », « coin »… mis à part) ;
 *  3. prix CMC à ± 5 % du prix de référence (le prix déjà en base, relevé à 6 h au plus de l'horodatage CMC).
 * Sinon : « non apparié » (la fiche passe par DexScreener par adresse de contrat, ou garde le masquage au-delà de 48 h).
 * Piège connu : « beam » (BEAM, ancienne crypto de confidentialité) ne doit JAMAIS être relié à « onbeam » (Beam, jeu) :
 * même symbole, même nom normalisé, prix à 68 % d'écart → rejeté par la condition 3.
 * Deux fiches qui revendiquent le même identifiant CMC sont TOUTES DEUX exclues (cas MANTRA, OM ancien et nouveau).
 * Zéro dépendance (Node 20 et bundle Next). Fonctions pures, testées par tests/lib/fiches-z3.test.ts.
 */

export const TOLERANCE_PRIX_PCT = 5;
/** Écart maximal entre l'heure du prix de référence et l'heure du prix CMC. */
export const AGE_REFERENCE_MAX_H = 6;

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

/**
 * Ligne CMC normalisée, quel que soit le format : API Pro (quote.USD) ou liste publique du site (quote = [{ symbol: "USD" }]).
 * @returns {{cmcId:number, slug:string, name:string, symbol:string, prix:number|null, le:string|null, adresses: Array<{plateforme:string, adresse:string}>}|null}
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
  if (raw.platform && typeof raw.platform === "object" && typeof raw.platform.token_address === "string") {
    adresses.push({ plateforme: String(raw.platform.slug ?? raw.platform.name ?? ""), adresse: raw.platform.token_address });
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

/**
 * Appariement de toutes les fiches.
 * @param {Array<{id:string, symbol:string, name:string, prix?:number|null, prixLe?:string|null}>} fiches
 * @param {Array<ReturnType<typeof normaliserCmc>>} candidats lignes CMC normalisées
 * @param {{tolerancePct?: number, ageReferenceMaxH?: number, manuels?: Record<string, {cmcSlug: string, motif?: string}>}} [opts]
 * @returns {{map: Record<string,{id:number,symbol:string}>, exclus: string[], details: Record<string, any>}}
 */
export function apparier(fiches, candidats, opts = {}) {
  const tol = opts.tolerancePct ?? TOLERANCE_PRIX_PCT;
  const ageMax = (opts.ageReferenceMaxH ?? AGE_REFERENCE_MAX_H) * 3_600_000;
  const manuels = opts.manuels ?? {};
  const parSymbole = new Map();
  const parSlug = new Map();
  for (const c of candidats) {
    if (!c) continue;
    if (!parSymbole.has(c.symbol)) parSymbole.set(c.symbol, []);
    parSymbole.get(c.symbol).push(c);
    if (c.slug) parSlug.set(c.slug, c);
  }
  /** @type {Record<string, any>} */
  const details = {};
  const retenus = new Map();
  for (const f of fiches) {
    const sym = String(f.symbol ?? "").toUpperCase();
    const refT = f.prixLe ? Date.parse(f.prixLe) : NaN;
    const referenceValide = (c) => typeof f.prix === "number" && f.prix > 0 && Number.isFinite(refT) && c.le && Math.abs(Date.parse(c.le) - refT) <= ageMax;
    const juger = (c) => {
      if (!referenceValide(c)) return { c, ecart: null, ok: false, motif: "aucun prix de référence relevé à moins de 6 h du prix CoinMarketCap" };
      const e = ecartPct(c.prix, f.prix);
      return { c, ecart: e, ok: e !== null && Math.abs(e) <= tol, motif: e === null ? "prix CoinMarketCap absent" : `écart de prix ${e} %` };
    };
    let candidatsFiche;
    let manuel = false;
    if (manuels[f.id]?.cmcSlug) {
      const c = parSlug.get(manuels[f.id].cmcSlug);
      candidatsFiche = c ? [c] : [];
      manuel = true;
    } else {
      candidatsFiche = (parSymbole.get(sym) ?? []).filter((c) => nomsCompatibles(f, c));
    }
    if (!candidatsFiche.length) {
      details[f.id] = {
        statut: "non apparié",
        motif: manuel
          ? `slug CMC désigné introuvable (${manuels[f.id].cmcSlug})`
          : (parSymbole.get(sym) ?? []).length
            ? "symbole présent chez CoinMarketCap, nom incompatible"
            : "aucune ligne CoinMarketCap à ce symbole dans la liste lue",
      };
      continue;
    }
    const juges = candidatsFiche.map(juger);
    const bons = juges.filter((j) => j.ok);
    let choix = null;
    if (bons.length === 1) choix = bons[0];
    else if (bons.length > 1) choix = bons.find((j) => j.c.slug === f.id) ?? null;
    if (!choix) {
      const meilleur = [...juges].sort((a, b) => Math.abs(a.ecart ?? Infinity) - Math.abs(b.ecart ?? Infinity))[0];
      details[f.id] = {
        statut: "non apparié",
        motif: bons.length > 1 ? `homonymes : ${bons.length} lignes CoinMarketCap valides (${bons.map((j) => j.c.slug).join(", ")})` : meilleur.motif,
        cmcSlug: meilleur.c.slug,
        cmcId: meilleur.c.cmcId,
        ecartPrixPct: meilleur.ecart,
      };
      continue;
    }
    details[f.id] = { statut: "apparié", cmcId: choix.c.cmcId, cmcSlug: choix.c.slug, cmcNom: choix.c.name, ecartPrixPct: choix.ecart, ...(manuel ? { manuel: true } : {}) };
    retenus.set(f.id, { id: choix.c.cmcId, symbol: choix.c.symbol });
  }
  // un même identifiant CMC revendiqué par deux fiches : les deux sont exclues (jamais de choix arbitraire)
  const parCmc = new Map();
  for (const [site, e] of retenus) {
    if (!parCmc.has(e.id)) parCmc.set(e.id, []);
    parCmc.get(e.id).push(site);
  }
  for (const [cmcId, sites] of parCmc) {
    if (sites.length < 2) continue;
    for (const s of sites) {
      retenus.delete(s);
      details[s] = { ...details[s], statut: "non apparié", motif: `identifiant CMC ${cmcId} revendiqué par ${sites.length} fiches (${sites.join(", ")})` };
    }
  }
  const map = {};
  for (const id of [...retenus.keys()].sort()) map[id] = retenus.get(id);
  const exclus = fiches.map((f) => f.id).filter((id) => !map[id]).sort();
  return { map, exclus, details };
}
