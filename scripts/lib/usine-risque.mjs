/**
 * scripts/lib/usine-risque.mjs — CLASSEMENT DU RISQUE d'une proposition d'agent IA (09/10/2026, « une usine autonome qui
 * ne dégrade pas le site »). Décide, à partir du diff, si la pull request est « prête » (verdict « auto » : aucun fait
 * touché, fusionnable en un clic) ou « à relire » (verdict « relecture »). Règle d'or : au moindre doute, relecture.
 *
 * « auto » SEULEMENT si TOUTES les conditions tiennent :
 *  - fichiers de la liste blanche ; aucune suppression ni renommage ; au plus FICHIERS_MAX fichiers ;
 *  - dans un contenu MDX (content/) : le frontmatter est reconnu comme le fait le site (gray-matter), seuls des champs
 *    sans fait y changent (title, description, keywords, tags, dates de mise à jour, marqueurs de l'Usine), et titre /
 *    description ne portent ni €, %, $ ni autre nombre qu'une année ;
 *  - dans le CORPS : aucune phrase ajoutée ni supprimée. Une ligne modifiée est sûre seulement si elle garde les mêmes
 *    mots (édition de liens internes) ou n'en change qu'un seul sans chiffre (coquille) ; tout chiffre, date, €, %,
 *    lien externe, lien rémunéré (/go/…), balise HTML/JSX, expression MDX ou import → relecture ;
 *  - data/corrections.json est hors liste blanche : une entrée au journal = un fait corrigé = relecture.
 * Les rapports d'audit et les fiches R&D (Markdown hors content/) ne sont pas servis aux lecteurs : liste blanche simple.
 * Zéro dépendance, fonctions pures (tests/lib/usine-autonomie.test.ts). Le workflow (scripts/usine-risque.mjs) lit le diff git.
 */

export const FICHIERS_MAX = 12;

/** Préfixes de la liste blanche (fusion en un clic possible). */
export const LISTE_BLANCHE = ["content/articles/", "content/news/", "docs/usine/rapports/", "usine/rnd/idees/", "usine/rnd/registre.json"];

/** Champs de frontmatter qu'un agent peut changer sans relecture (aucun fait dedans). */
export const CHAMPS_FRONTMATTER_SURS = ["title", "description", "keywords", "tags", "updatedAt", "lastUpdated", "updated", "revisionUsine", "seoUsine"];

const RE_CHIFFRE = /\d/;
const RE_SYMBOLE = /[€%$]/;
/** Des chiffres seulement sous forme d'années (1900-2099), jamais suivies d'un symbole ou d'une unité collée. */
const RE_ANNEE_SEULE = /^(?:[^\d]*(?:19|20)\d{2}(?![\d\s]*[€%$]))*[^\d]*$/;
const RE_LIEN_MD = /\]\(([^)]*)\)/g;
/** Ce qu'une ligne de corps ne doit jamais acquérir sans relecture : adresse, balise, expression MDX, import, définition de lien. */
const RE_DANGER_CORPS = /https?:\/\/|\]\(\s*\/\/|<[a-zA-Z!/]|\{|^\s*(?:import|export)\b|^\s*\[[^\]]+\]:\s|\/go\//;

/** Lignes ajoutées et supprimées d'un patch unifié (sans le +/-), en-têtes « --- a/… » / « +++ b/… » exclus. */
export function lignesDuPatch(patch) {
  const ajoutees = [], supprimees = [];
  let dansHunk = false;
  for (const l of String(patch ?? "").split("\n")) {
    if (l.startsWith("@@")) {
      dansHunk = true;
      continue;
    }
    // avant le premier « @@ » : en-têtes de git (diff --git, index, « --- a/… », « +++ b/… ») ; une ligne de corps qui
    // commencerait par « ++ » ou « -- » n'est jamais confondue avec un en-tête une fois dans un hunk
    if (!dansHunk && /^(diff --git|index |similarity |rename |--- (a\/|\/dev\/null)|\+\+\+ (b\/|\/dev\/null))/.test(l)) continue;
    if (l.startsWith("+")) ajoutees.push(l.slice(1));
    else if (l.startsWith("-")) supprimees.push(l.slice(1));
  }
  return { ajoutees, supprimees };
}

/**
 * Frontmatter d'un MDX APRÈS modification, reconnu comme le fait gray-matter (BOM accepté, « --- » puis fin de ligne).
 * Renvoie { reconnu, lignes: Set } ; `reconnu` faux si le fichier ne commence pas par un frontmatter.
 */
export function frontmatterApres(apres) {
  const texte = String(apres ?? "").replace(/^\uFEFF/, "");
  const m = /^---[ \t]*\r?\n([\s\S]*?)\r?\n---[ \t]*(?:\r?\n|$)/.exec(texte);
  if (!m) return { reconnu: false, lignes: new Set() };
  return { reconnu: true, lignes: new Set(m[1].split(/\r?\n/)) };
}

/**
 * Sépare des lignes de patch entre frontmatter et corps. Une ligne est « frontmatter » si elle figure dans le frontmatter
 * d'après, si c'est une borne « --- », si c'est un champ « cle: valeur » dont la clé existe dans le frontmatter d'après ou
 * est un champ sûr (ligne supprimée d'un champ modifié), ou un élément de liste entre guillemets quand le frontmatter
 * d'après contient une liste (keywords, tags).
 */
export function separerFrontmatter(apres, lignes) {
  const fm = frontmatterApres(apres).lignes;
  const cles = new Set([...fm].map((l) => /^([A-Za-z_][\w-]*):/.exec(l)?.[1]).filter(Boolean));
  const aListe = [...fm].some((l) => /^\s+-\s/.test(l));
  const nettoie = (l) => l.replace(/^\uFEFF/, "");
  const dedans = (brut) => {
    const l = nettoie(brut);
    if (fm.has(l) || /^---[ \t]*$/.test(l)) return true;
    const c = /^([A-Za-z_][\w-]*):\s/.exec(l);
    if (c) return cles.has(c[1]) || CHAMPS_FRONTMATTER_SURS.includes(c[1]);
    return aListe && /^\s+-\s*".*"\s*$/.test(l);
  };
  return { frontmatter: lignes.filter((l) => dedans(l)), corps: lignes.filter((l) => !dedans(l)) };
}

/** Mots d'une ligne de corps, liens Markdown réduits à leur texte, ponctuation et casse ignorées. */
export function motsDe(ligne) {
  return String(ligne ?? "")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
}

/** Nombre de mots qui diffèrent entre deux lignes (ajoutés + retirés, multi-ensembles). */
export function ecartMots(a, b) {
  const ma = motsDe(a), mb = motsDe(b);
  const compte = new Map();
  for (const m of ma) compte.set(m, (compte.get(m) ?? 0) + 1);
  for (const m of mb) compte.set(m, (compte.get(m) ?? 0) - 1);
  let ecart = 0;
  for (const v of compte.values()) ecart += Math.abs(v);
  return ecart;
}

/** Mots dont le changement renverse le sens d'une phrase : jamais une « coquille ». */
export const MOTS_SENSIBLES = ["ne", "n", "pas", "plus", "jamais", "sans", "aucun", "aucune", "non", "oui", "interdit", "interdite", "autorise", "autorisee", "legal", "legale", "illegal", "illegale", "obligatoire", "facultatif", "gratuit", "gratuite", "payant", "payante", "impose", "imposable", "exonere", "exoneree", "agree", "agreee", "enregistre", "enregistree", "avant", "apres", "sauf", "toujours"];

function levenshtein(a, b) {
  const m = a.length, n = b.length;
  if (!m) return n;
  if (!n) return m;
  let prev = Array.from({ length: n + 1 }, (_, i) => i);
  for (let i = 1; i <= m; i++) {
    const cur = [i];
    for (let j = 1; j <= n; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    prev = cur;
  }
  return prev[n];
}

/** Liens Markdown d'une ligne : [{ texte, cible }]. */
function liensDe(ligne) {
  return [...String(ligne ?? "").matchAll(/\[([^\]]*)\]\(([^)]*)\)/g)].map((m) => ({ texte: m[1], cible: m[2].trim().split(/\s+/)[0] }));
}

/**
 * Une ligne de corps modifiée (a = après, s = avant) est-elle sûre ? Sûre seulement si :
 *  - mêmes mots une fois les liens réduits à leur texte et les NOUVEAUX liens internes retirés (édition de liens) ;
 *  - ou un seul mot change, de même longueur à un caractère près, à deux lettres près, sans chiffre ni mot sensible (coquille).
 * Tout nouveau lien doit être interne strict (« /… », jamais « /go/… »), au texte court.
 */
export function comparerLignes(a, s) {
  const liensA = liensDe(a), liensS = liensDe(s);
  const ciblesS = new Set(liensS.map((l) => l.cible));
  for (const l of liensA) {
    if (ciblesS.has(l.cible)) continue;
    if (!/^\/[A-Za-z0-9][^\s]*$/.test(l.cible) || l.cible.startsWith("/go/")) return { ok: false, raison: `lien ajouté non interne ou rémunéré (${l.cible.slice(0, 80)})` };
    if (motsDe(l.texte).length > 6) return { ok: false, raison: "texte de lien trop long (plus de 6 mots)" };
  }
  // tous les liens réduits à leur texte : un nouveau lien interne doit être posé sur des mots déjà présents
  const ma = motsDe(a), ms = motsDe(s);
  if (ma.join(" ") === ms.join(" ")) return { ok: true };
  if (ma.length !== ms.length) return { ok: false, raison: "mots ajoutés ou retirés" };
  const diff = ma.map((w, i) => [w, ms[i]]).filter(([x, y]) => x !== y);
  if (diff.length !== 1) return { ok: false, raison: `${diff.length} mots changés` };
  const [x, y] = diff[0];
  if (RE_CHIFFRE.test(x) || RE_CHIFFRE.test(y)) return { ok: false, raison: "nombre modifié" };
  if (MOTS_SENSIBLES.includes(x) || MOTS_SENSIBLES.includes(y)) return { ok: false, raison: `mot sensible modifié (« ${y} » → « ${x} »)` };
  if (Math.abs(x.length - y.length) > 1 || levenshtein(x, y) > 2) return { ok: false, raison: `mot remplacé (« ${y} » → « ${x} »)` };
  return { ok: true };
}

/** Raisons de relecture d'UN fichier (liste vide = fichier sûr). */
export function raisonsFichier(f) {
  const r = [];
  const chemin = String(f.chemin ?? "");
  const statut = String(f.statut ?? "M")[0];
  if (statut === "D") r.push(`${chemin} : suppression de fichier`);
  if (statut === "R" || statut === "C") r.push(`${chemin} : renommage ou copie (l'ancienne adresse disparaît)`);
  if (!LISTE_BLANCHE.some((p) => chemin.startsWith(p) || chemin === p)) r.push(`${chemin} : hors de la liste blanche (code, données ou configuration)`);
  if (chemin === "data/corrections.json") r.push(`${chemin} : une entrée au journal des corrections = un fait corrigé`);
  if (r.length) return r;

  const { ajoutees, supprimees } = lignesDuPatch(f.patch);
  if (chemin.startsWith("content/")) {
    if (!/\.mdx?$/.test(chemin)) return [`${chemin} : seul un fichier MDX est attendu dans content/`];
    const fm = frontmatterApres(f.apres);
    if (!fm.reconnu) return [`${chemin} : frontmatter non reconnu (le classement ne peut pas séparer en-tête et corps)`];
    const { frontmatter: fmA, corps: corpsA } = separerFrontmatter(f.apres, ajoutees);
    const { frontmatter: fmS, corps: corpsS } = separerFrontmatter(f.apres, supprimees);

    // frontmatter : seulement des champs sûrs (ajoutés comme retirés) ; dans titre et description, ni symbole ni autre
    // nombre qu'une année
    for (const l of fmS) {
      const c = /^([A-Za-z_][\w-]*):\s*(.*)$/.exec(l.replace(/^\uFEFF/, ""));
      if (c && !CHAMPS_FRONTMATTER_SURS.includes(c[1])) r.push(`${chemin} : champ de frontmatter « ${c[1]} » retiré ou modifié (hors liste des champs sans fait)`);
    }
    for (const l of fmA) {
      const brut = l.replace(/^\uFEFF/, "");
      const c = /^([A-Za-z_][\w-]*):\s*(.*)$/.exec(brut);
      if (!c) {
        if (brut.trim() === "---" || brut.trim() === "" || /^\s+-\s/.test(brut)) continue; // bornes, vide, élément de liste (keywords/tags)
        r.push(`${chemin} : ligne de frontmatter illisible « ${brut.slice(0, 60)} »`);
        continue;
      }
      if (!CHAMPS_FRONTMATTER_SURS.includes(c[1])) r.push(`${chemin} : champ de frontmatter « ${c[1]} » modifié (hors liste des champs sans fait)`);
      else if (["title", "description"].includes(c[1]) && (RE_SYMBOLE.test(c[2]) || (RE_CHIFFRE.test(c[2]) && !RE_ANNEE_SEULE.test(c[2])))) r.push(`${chemin} : chiffre ou symbole dans « ${c[1]} » (autre qu'une année)`);
      else if (["title", "description"].includes(c[1]) && RE_DANGER_CORPS.test(c[2])) r.push(`${chemin} : adresse ou balise dans « ${c[1]} »`);
    }

    // corps : chaque ligne ajoutée doit être la version sûre d'une ligne supprimée (comparerLignes) ; chaque ligne
    // supprimée doit avoir sa remplaçante ; aucune adresse, balise ni expression nouvelle
    const restantes = [...corpsS];
    for (const a of corpsA) {
      if (a.trim() === "") continue;
      if (RE_DANGER_CORPS.test(a) && !restantes.some((s) => RE_DANGER_CORPS.test(s) && comparerLignes(a, s).ok && liensExternes(a).every((u) => s.includes(`(${u}`)))) {
        r.push(`${chemin} : ligne du corps avec adresse externe, lien rémunéré, balise ou expression ajoutée « ${a.trim().slice(0, 60)} »`);
        continue;
      }
      let meilleure = -1, raison = "aucune ligne d'origine";
      for (let i = 0; i < restantes.length; i++) {
        const v = comparerLignes(a, restantes[i]);
        if (v.ok) {
          meilleure = i;
          break;
        }
        if (ecartMots(a, restantes[i]) <= 2) raison = v.raison;
      }
      if (meilleure === -1) {
        r.push(`${chemin} : phrase du corps ajoutée ou réécrite « ${a.trim().slice(0, 60)} » (${raison})`);
        continue;
      }
      restantes.splice(meilleure, 1);
    }
    for (const s of restantes) if (s.trim() !== "") r.push(`${chemin} : phrase du corps supprimée « ${s.trim().slice(0, 60)} »`);
  } else if (chemin === "usine/rnd/registre.json") {
    // le registre R&D ne porte que des statuts et des titres : rien à vérifier de plus
  } else if (chemin.startsWith("docs/usine/rapports/") || chemin.startsWith("usine/rnd/idees/")) {
    if (!/\.md$/.test(chemin)) r.push(`${chemin} : seul un fichier Markdown est attendu ici`);
  }
  return r;
}

function liensExternes(ligne) {
  return [...String(ligne).matchAll(RE_LIEN_MD)].map((m) => m[1].trim().split(/\s+/)[0]).filter((u) => !/^\/[A-Za-z0-9]/.test(u) && !u.startsWith("#"));
}

/**
 * Verdict d'une proposition.
 * @param fichiers [{ chemin, statut: "A"|"M"|"D"|"R", patch, apres }] (apres = contenu du fichier après modification)
 * @param opts { missionRelectureObligatoire?: boolean, declaration?: "auto"|"relecture"|null }
 * @returns { verdict: "auto"|"relecture", raisons: string[], fichiers: number }
 */
export function classerProposition(fichiers, opts = {}) {
  const raisons = [];
  const liste = Array.isArray(fichiers) ? fichiers : [];
  if (liste.length === 0) raisons.push("aucune modification");
  if (liste.length > FICHIERS_MAX) raisons.push(`${liste.length} fichiers modifiés (maximum ${FICHIERS_MAX} pour une fusion en un clic)`);
  if (opts.missionRelectureObligatoire) raisons.push("mission à relecture obligatoire (prototype)");
  if (opts.declaration === "relecture") raisons.push("l'agent demande lui-même une relecture");
  for (const f of liste) raisons.push(...raisonsFichier(f));
  return { verdict: raisons.length ? "relecture" : "auto", raisons, fichiers: liste.length };
}
