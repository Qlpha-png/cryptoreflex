/**
 * scripts/lib/fiches-defauts.mjs — règles du robot de nuit « fiches sans défaut » (lot Z3, 10/10/2026).
 *
 * Demande de Kev : « nos fiches doivent être toujours à jour, sans aucun lien mort ou problème ». Le robot
 * (scripts/fiches-liens.mjs, .github/workflows/fiches-liens.yml, Gardien 03:40 UTC) lit chaque fiche /cryptos/<slug> du plan
 * du site (et /acheter/<slug>/fr) et contrôle :
 *  (a) chaque lien interne répond 200, ou 301/308 vers une page qui répond 200 (un seul saut) ;
 *  (b) chaque lien sortant répond < 400 (GET, User-Agent de navigateur, 2 essais espacés) ; « mort » seulement pour un
 *      échec DNS, 404, 410 ou 5xx DEUX nuits de suite (la veille et ce jour, dates UTC, échecs espacés d'au moins 12 h :
 *      une nuit non concluante ou un trou remet le compteur à 1) ; 401, 403, 429 = refus du robot, non concluant (jamais
 *      retiré) ;
 *  (c) aucun « NaN », « undefined », « null », « [object Object] » dans le texte visible, aucun prix à 0, aucune image
 *      sans adresse, un h1, des données structurées JSON-LD lisibles.
 * Résultat : data/fiches/defauts.json (commit du robot), lu au rendu par lib/liens-morts.ts : un lien sortant mort est
 * retiré de la fiche (texte sans lien) jusqu'à guérison. Un lien interne mort ouvre un ticket et le robot échoue (rouge).
 * Zéro dépendance. Fonctions pures, testées par tests/lib/fiches-z3.test.ts.
 */

export const SITE = "https://www.cryptoreflex.fr";
export const NUITS_AVANT_MORT = 2;
export const CODES_MORTS = new Set([404, 410]);

const ENTITES = { amp: "&", lt: "<", gt: ">", quot: '"', "#39": "'", apos: "'", nbsp: " " };
function decoder(s) {
  return String(s).replace(/&(#x?[0-9a-f]+|[a-z]+|#39);/gi, (m, e) => {
    if (ENTITES[e] !== undefined) return ENTITES[e];
    if (/^#x/i.test(e)) return String.fromCodePoint(parseInt(e.slice(2), 16));
    if (/^#\d+$/.test(e)) return String.fromCodePoint(Number(e.slice(1)));
    return m;
  });
}

/** Adresse normalisée pour comparer : hôte en minuscules, sans fragment, sans « / » final (sauf racine). null si invalide. */
export function normaliserUrl(href, base = SITE) {
  try {
    const u = new URL(decoder(String(href).trim()), base);
    if (!/^https?:$/.test(u.protocol)) return null;
    u.hash = "";
    u.hostname = u.hostname.toLowerCase();
    let s = u.toString();
    if (u.pathname !== "/" && s.endsWith("/") && !u.search) s = s.slice(0, -1);
    return s;
  } catch {
    return null;
  }
}

/**
 * Adresse à DEMANDER : l'adresse écrite dans la page (entités décodées, fragment retiré), « / » final gardé. Reprise Z3
 * (B1) : un serveur strict répond 200 sur …/fr/ et 404 sur …/fr ; normaliserUrl ne sert qu'à comparer. null si invalide.
 */
export function adresseBrute(href, base = SITE) {
  try {
    const u = new URL(decoder(String(href).trim()), base);
    if (!/^https?:$/.test(u.protocol)) return null;
    u.hash = "";
    return u.toString();
  } catch {
    return null;
  }
}

/** Le lien est-il interne au site ? (même hôte, www ou nu) */
export function estInterne(url, base = SITE) {
  try {
    const h = new URL(url).hostname.replace(/^www\./, "");
    return h === new URL(base).hostname.replace(/^www\./, "");
  } catch {
    return false;
  }
}

/**
 * Liens d'une page : { internes: [chemin], sortants: [adresse brute], images: [src brute] }. Ignorés : ancres seules,
 * mailto:, tel:, javascript:, data:, /_next/, /api/, /cdn-cgi/. Les liens internes gardent leur chemin sans paramètres
 * (les variantes ?x= d'une même page ne sont contrôlées qu'une fois). Les sortants sont dédoublonnés par adresse
 * normalisée, mais c'est l'adresse BRUTE (la première vue) qui est rendue : c'est elle que le robot demande.
 */
export function extraireLiens(html, base = SITE) {
  const internes = new Set();
  /** @type {Map<string, string>} clé normalisée → adresse brute */
  const sortants = new Map();
  const images = [];
  for (const m of String(html).matchAll(/<a\b[^>]*?\shref\s*=\s*("([^"]*)"|'([^']*)')/gi)) {
    const brut = (m[2] ?? m[3] ?? "").trim();
    if (!brut || brut.startsWith("#") || /^(mailto|tel|javascript|data|sms):/i.test(brut)) continue;
    const url = normaliserUrl(brut, base);
    if (!url) continue;
    if (estInterne(url, base)) {
      const u = new URL(url);
      if (/^\/(_next|api|cdn-cgi)\//.test(u.pathname)) continue;
      internes.add(u.pathname.replace(/\/$/, "") || "/");
    } else if (!sortants.has(url)) {
      const b = adresseBrute(brut, base);
      if (b) sortants.set(url, b);
    }
  }
  for (const m of String(html).matchAll(/<img\b[^>]*>/gi)) {
    const src = m[0].match(/\ssrc\s*=\s*("([^"]*)"|'([^']*)')/i);
    images.push(src ? decoder(src[2] ?? src[3] ?? "") : null);
  }
  return { internes: [...internes].sort(), sortants: [...sortants.values()].sort(), images };
}

/**
 * Liens sortants à contrôler cette nuit (reprise Z3, B2) : ceux des pages (clé normalisée → { url brute, pages }) PLUS
 * chaque adresse déjà déclarée morte au passage précédent et absente des pages (retirée par le rendu) : elle est
 * retestée chaque nuit (morte = gardée ; vivante = guérie, elle revient au déploiement suivant).
 * @param {Map<string, {url: string, pages: string[]}>} desPages
 * @param {{liensSortantsMorts?: string[]} | null} precedent
 * @returns {Map<string, {url: string, pages: string[], retire: boolean}>}
 */
export function sortantsAControler(desPages, precedent) {
  const out = new Map();
  for (const [k, v] of desPages) out.set(k, { url: v.url, pages: v.pages, retire: false });
  for (const u of precedent?.liensSortantsMorts ?? []) {
    const k = normaliserUrl(u);
    if (k && !out.has(k)) out.set(k, { url: adresseBrute(u) ?? u, pages: [], retire: true });
  }
  return out;
}

/**
 * État de fin de nuit des liens sortants : fusion (2 nuits d'échec = mort), état précédent gardé pour les liens présents
 * mais non contrôlés (budget), liste des morts, et liens morts ENCORE affichés (déjà morts au passage précédent, toujours
 * morts et toujours dans le HTML : non retirables par le rendu, ex. affiliation ou layout → alerte).
 * Les clés de l'état sont les adresses brutes ; la comparaison se fait toujours sur l'adresse normalisée.
 * @param {{sortantsEnEchec?: Record<string, any>, liensSortantsMorts?: string[]} | null} precedent
 * @param {Map<string, {url: string, pages: string[], retire: boolean}>} aControler
 * @param {Record<string, {classe: string, code: any}>} resultats  par adresse brute
 * @param {string} nuit
 * @param {string} [maintenant]  heure ISO du début du passage (écart minimal entre deux échecs comptés)
 */
export function etatSortants(precedent, aControler, resultats, nuit, maintenant) {
  const precEchec = {};
  for (const [u, e] of Object.entries(precedent?.sortantsEnEchec ?? {})) {
    const k = normaliserUrl(u);
    if (k) precEchec[k] = { url: u, e };
  }
  const prec = {};
  for (const [k, v] of aControler) if (precEchec[k]) prec[v.url] = precEchec[k].e;
  const fusion = fusionnerSortants(prec, resultats, nuit, maintenant);
  for (const v of aControler.values()) if (!resultats[v.url] && prec[v.url]) fusion.enEchec[v.url] = prec[v.url];
  const morts = Object.entries(fusion.enEchec).filter(([, e]) => e.nuits >= NUITS_AVANT_MORT).map(([u]) => u).sort();
  const dejaMorts = new Set((precedent?.liensSortantsMorts ?? []).map((u) => normaliserUrl(u)).filter(Boolean));
  const mortsAffiches = [];
  for (const [k, v] of aControler) {
    if (!v.retire && v.pages.length && dejaMorts.has(k) && morts.includes(v.url)) mortsAffiches.push({ url: v.url, pages: v.pages.slice(0, 5), nbPages: v.pages.length });
  }
  return { enEchec: fusion.enEchec, morts, mortsAffiches };
}

/**
 * Nombre de pages minimal d'un passage (reprise Z3, I4) : 90 % des pages du passage précédent ; un plan à 0 fiche est
 * toujours une erreur. Renvoie null si le compte est acceptable, sinon la raison.
 */
export const PAGES_MIN_PCT = 90;
export function pagesInsuffisantes(nbPages, nbFiches, precedent) {
  if (!(nbFiches > 0)) return "plan du site lu sans aucune fiche /cryptos/";
  const avant = Number(precedent?.resume?.pages);
  if (Number.isFinite(avant) && avant > 0 && nbPages < (avant * PAGES_MIN_PCT) / 100) return `${nbPages} pages au plan contre ${avant} au passage précédent (${PAGES_MIN_PCT} % exigés)`;
  return null;
}

/** Une redirection d'un lien sortant est suivie une fois (M3) : un 301 vers une page 404 n'est pas « ok ». */
export const CODES_REDIRECTION = new Set([301, 302, 303, 307, 308]);

/**
 * Faut-il publier (commit, donc déploiement Vercel) le nouveau data/fiches/defauts.json ? (finitions Z3, M6)
 * Contenu UTILE = tout le fichier sauf passeLe et dureeS (qui changent à chaque passage) : listes de liens morts, en
 * échec, défauts de pages, résumé, complet. Comparaison par valeur, indépendante de l'ordre des clés et de la mise en page.
 * Garde de fraîcheur : la carte n° 52 du registre (data/fraicheur/registre.json) retient la PLUS ANCIENNE de « dernier
 * passage réussi du workflow » et « passeLe du fichier publié » (⚠️ au-delà de 30 h) : tant qu'elle lit passeLe, le
 * fichier est republié une fois par DATE UTC (reprise des finitions Z3, D5, au lieu d'un seuil de 12 h) : publié si la
 * date du passeLe publié diffère de celle de ce passage. Le premier passage de chaque jour publie donc, un passage en
 * double le même jour non, et un lancement manuel l'après-midi n'empêche plus la publication de la nuit suivante.
 * garde = false : garde désactivée (à faire seulement quand la carte n° 52 ne lira plus passeLe : il ne restera alors
 * aucun commit sans changement utile).
 * @param {any} ancien  fichier publié (null s'il est absent ou illisible)
 * @param {any} nouveau fichier de ce passage
 * @param {{ garde?: boolean }} [o]
 * @returns {{ publier: boolean, raison: string }}
 */
export function changementUtile(ancien, nouveau, { garde = true } = {}) {
  if (!nouveau || typeof nouveau !== "object") return { publier: false, raison: "nouveau résultat illisible : rien à publier" };
  if (!ancien || typeof ancien !== "object") return { publier: true, raison: "aucun résultat publié lisible" };
  const utile = (o) => {
    const { passeLe: _p, dureeS: _d, ...reste } = o;
    return canonique(reste);
  };
  if (utile(ancien) !== utile(nouveau)) return { publier: true, raison: "contenu utile modifié" };
  if (garde) {
    const jour = (v) => {
      const t = Date.parse(String(v ?? ""));
      return Number.isFinite(t) ? new Date(t).toISOString().slice(0, 10) : null;
    };
    const jA = jour(ancien.passeLe);
    const jN = jour(nouveau.passeLe) ?? new Date().toISOString().slice(0, 10);
    if (!jA) return { publier: true, raison: "date de passage publiée absente (lue par la carte de fraîcheur n° 52)" };
    if (jA !== jN) return { publier: true, raison: `contenu inchangé, mais date de passage publiée du ${jA} (une publication par date UTC ; lue par la carte de fraîcheur n° 52)` };
  }
  return { publier: false, raison: "contenu utile inchangé (hors passeLe et dureeS)" };
}

/** JSON canonique : clés d'objet triées, récursivement (l'ordre des tableaux compte). */
function canonique(v) {
  if (Array.isArray(v)) return `[${v.map(canonique).join(",")}]`;
  if (v && typeof v === "object") return `{${Object.keys(v).sort().map((k) => `${JSON.stringify(k)}:${canonique(v[k])}`).join(",")}}`;
  return JSON.stringify(v ?? null);
}

/** Texte visible : sans <script>, <style>, <noscript>, <template>, commentaires ni balises. */
export function texteVisible(html) {
  return decoder(
    String(html)
      .replace(/<!--[\s\S]*?-->/g, " ")
      .replace(/<(script|style|noscript|template|svg)\b[\s\S]*?<\/\1>/gi, " ")
      .replace(/<[^>]+>/g, " "),
  )
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Défauts d'une page (c) : [{ type, detail }]. Prix à 0 : « Prix : 0 $ », « 0,00 $ » ou un repère data-prix="0".
 */
export function defautsPage(html) {
  /** @type {Array<{type: string, detail: string}>} */
  const out = [];
  const texte = texteVisible(html);
  const extrait = (i, n) => texte.slice(Math.max(0, i - 40), i + n + 40);
  /** @type {Array<[string, RegExp]>} */
  const motifs = [
    ["NaN", /\bNaN\b/],
    ["undefined", /\bundefined\b/],
    ["null", /(^|[^\p{L}\p{N}_-])null([^\p{L}\p{N}_-]|$)/u],
    ["[object Object]", /\[object Object\]/],
  ];
  for (const [type, re] of motifs) {
    const m = texte.match(re);
    if (m) out.push({ type, detail: `« ${type} » dans le texte : « ${extrait(m.index ?? 0, m[0].length)} »` });
  }
  const prix0 = texte.match(/\b(?:Prix|Cours)\s*:?\s*(?:0(?:[.,]0+)?\s?(?:\$|€|US\$|USD|EUR)|\$\s?0(?:\.0+)?)(?![\d.,])/i);
  if (prix0 || /data-prix\s*=\s*"0(?:\.0+)?"/.test(html)) out.push({ type: "prix à 0", detail: prix0 ? `« ${prix0[0]} »` : "repère data-prix à 0" });
  if (!/<h1\b/i.test(html)) out.push({ type: "h1 absent", detail: "aucune balise h1" });
  for (const m of String(html).matchAll(/<script\b[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    try {
      const j = JSON.parse(m[1]);
      const items = Array.isArray(j) ? j : [j];
      if (!items.every((x) => x && typeof x === "object" && (x["@context"] || x["@graph"]) && (x["@type"] || x["@graph"]))) {
        out.push({ type: "JSON-LD invalide", detail: "bloc sans @context ou @type" });
      }
    } catch (e) {
      out.push({ type: "JSON-LD invalide", detail: `JSON illisible (${String(e?.message ?? e).slice(0, 60)})` });
    }
  }
  const { images } = extraireLiens(html);
  const cassees = images.filter((s) => s === null || !s.trim() || /^(undefined|null|NaN)$/i.test(s.trim()) || /\/(undefined|null)(\?|$)/.test(s));
  if (cassees.length) out.push({ type: "image cassée", detail: `${cassees.length} image(s) sans adresse valable` });
  return out;
}

/**
 * Jugement d'un lien interne à partir du premier code et, pour une redirection permanente, du code de la cible (un seul
 * saut). { ok, detail }.
 */
export function jugerInterne(code, codeCible) {
  if (code === 200) return { ok: true, detail: "200" };
  // 10/10/2026 : refus du pare-feu (401, 403, 429) ou pas de réponse = non concluant, jamais « mort » (le robot visite le
  // site pendant des heures depuis GitHub : un blocage passager ne doit pas ouvrir de fausse alerte). Le robot réessaie.
  if (code === 0 || code === 401 || code === 403 || code === 429) return { ok: false, nonConcluant: true, detail: code ? `HTTP ${code} (refus, non concluant)` : "pas de réponse (non concluant)" };
  if (code === 301 || code === 308) {
    if (codeCible === 200) return { ok: true, detail: `${code} → 200` };
    return { ok: false, detail: `${code} → ${codeCible ?? "?"} (la cible ne répond pas 200 en un saut)` };
  }
  return { ok: false, detail: code ? `HTTP ${code}` : "pas de réponse" };
}

/**
 * Classement d'une réponse de lien sortant : « ok » (< 400), « echec » (DNS, 404, 410, 5xx : compte pour la mort),
 * « non-concluant » (401, 403, 429, autres 4xx, délai dépassé : jamais retiré).
 */
export function classerSortant(code, erreur) {
  if (typeof code === "number" && code > 0 && code < 400) return "ok";
  if (erreur === "DNS") return "echec";
  if (CODES_MORTS.has(code) || (typeof code === "number" && code >= 500 && code < 600)) return "echec";
  return "non-concluant";
}

/** Veille (date UTC AAAA-MM-JJ) d'une nuit AAAA-MM-JJ ; null si la date est illisible. */
export function veille(nuit) {
  const t = Date.parse(`${nuit}T00:00:00Z`);
  return Number.isFinite(t) ? new Date(t - 86_400_000).toISOString().slice(0, 10) : null;
}

/** Écart minimal (heures) entre deux échecs comptés comme deux nuits (reprise des finitions Z3, D6). */
export const ECART_MIN_ECHECS_H = 12;

/**
 * Fusion avec l'état de la nuit précédente : un lien sortant est MORT après 2 nuits d'échec DE SUITE ; un succès le
 * guérit (il sort de la liste) ; un non-concluant ne change rien à l'état gardé.
 * Finitions Z3 (M4), « de suite » strict : le compteur n'augmente que si le dernier échec concluant (derniereNuit) date
 * de la VEILLE (date UTC). Après une nuit non concluante, un lien non contrôlé (budget) ou un trou d'un jour ou plus,
 * l'échec redevient « première nuit » (compteur à 1, depuis = cette nuit). Un même jour rejoué ne compte pas deux fois.
 * Un lien DÉJÀ mort (deux nuits de suite établies) le reste à chaque nouvel échec, même après un trou : seul un succès le
 * guérit (sinon il reviendrait sur la fiche un jour sur deux, défaut B2 de la reprise). Son état n'est plus réécrit.
 * Deux échecs comptés doivent être espacés d'au moins ECART_MIN_ECHECS_H heures (dernierEchecLe, si `maintenant` est
 * donné et si l'état précédent porte l'heure).
 * @param {Record<string, {nuits:number, depuis:string, code:string|number|null, derniereNuit:string, dernierEchecLe?:string}>} precedent
 * @param {Record<string, {classe:string, code:any}>} resultats
 * @param {string} nuit  date AAAA-MM-JJ de ce passage
 * @param {string} [maintenant]  heure ISO du passage (début), pour l'écart minimal entre deux échecs comptés
 */
export function fusionnerSortants(precedent, resultats, nuit, maintenant) {
  /** @type {Record<string, {nuits:number, depuis:string, code:string|number|null, derniereNuit:string, dernierEchecLe?:string}>} */
  const etat = {};
  const hier = veille(nuit);
  const tMaintenant = Date.parse(String(maintenant ?? ""));
  const horodatage = Number.isFinite(tMaintenant) ? { dernierEchecLe: new Date(tMaintenant).toISOString() } : {};
  for (const [url, r] of Object.entries(resultats)) {
    const p = precedent?.[url];
    if (r.classe === "ok") continue;
    if (r.classe === "non-concluant") {
      if (p) etat[url] = p;
      continue;
    }
    // Reprise des finitions Z3 (D2) : un lien DÉJÀ mort qui échoue encore garde son état tel quel (nuits plafonné à
    // NUITS_AVANT_MORT, derniereNuit et code non réécrits) : le fichier ne change qu'à une vraie transition (1 → 2,
    // remise à 1, guérison), donc pas de commit ni de déploiement chaque nuit à cause d'un compteur.
    if (p && p.nuits >= NUITS_AVANT_MORT) {
      etat[url] = p.nuits === NUITS_AVANT_MORT ? p : { ...p, nuits: NUITS_AVANT_MORT };
      continue;
    }
    // Même nuit rejouée (passage en double) : rien ne change.
    if (p && p.derniereNuit === nuit) {
      etat[url] = p;
      continue;
    }
    if (p && p.derniereNuit === hier) {
      // Reprise des finitions Z3 (D6) : la « nuit » est la date UTC du passage ; un échec à 23:59 puis un autre à 03:40
      // ne valent pas deux nuits. Il faut aussi au moins ECART_MIN_ECHECS_H heures entre les deux échecs comptés ; sinon
      // c'est la même nuit qui glisse sur la date suivante (compteur et heure du premier échec gardés).
      const tP = Date.parse(String(p.dernierEchecLe ?? ""));
      if (Number.isFinite(tP) && Number.isFinite(tMaintenant) && tMaintenant - tP < ECART_MIN_ECHECS_H * 3_600_000) {
        etat[url] = { ...p, derniereNuit: nuit };
        continue;
      }
      etat[url] = { nuits: p.nuits + 1, depuis: p.depuis ?? hier ?? nuit, code: r.code ?? null, derniereNuit: nuit, ...horodatage };
      continue;
    }
    etat[url] = { nuits: 1, depuis: nuit, code: r.code ?? null, derniereNuit: nuit, ...horodatage };
  }
  const morts = Object.entries(etat).filter(([, e]) => e.nuits >= NUITS_AVANT_MORT).map(([u]) => u).sort();
  return { enEchec: etat, morts };
}
