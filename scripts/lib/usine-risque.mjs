/**
 * scripts/lib/usine-risque.mjs — CLASSEMENT DU RISQUE d'une proposition d'agent IA (09/10/2026, « une usine autonome qui
 * ne dégrade pas le site »). Décide, à partir du diff, si la pull request peut être FUSIONNÉE AUTOMATIQUEMENT (verdict
 * « auto ») ou doit attendre la RELECTURE de Kevin (verdict « relecture »). Règle d'or : au moindre doute, relecture.
 *
 * Fusion automatique possible SEULEMENT si TOUTES les conditions tiennent :
 *  - fichiers dans la liste blanche (articles et actus MDX, rapports d'audit, fiches et registre R&D) ;
 *  - aucune suppression de fichier, au plus FICHIERS_MAX fichiers ;
 *  - dans un MDX : les lignes du CORPS ajoutées ou modifiées ne portent ni chiffre, ni €, ni %, ni date (un changement de
 *    fait reste humain) ; les liens ajoutés sont internes ; le frontmatter ne change que sur des champs sans fait
 *    (title, description, keywords, tags, updatedAt, lastUpdated, revisionUsine, seoUsine) et les titres/descriptions
 *    ne portent de chiffre qu'une année ;
 *  - data/corrections.json est hors liste blanche : une entrée au journal = un fait corrigé = relecture.
 * Zéro dépendance, fonctions pures (tests/lib/usine.test.ts). Le workflow (scripts/usine-risque.mjs) lit le diff git.
 */

export const FICHIERS_MAX = 12;

/** Préfixes de la liste blanche (fusion automatique possible). */
export const LISTE_BLANCHE = ["content/articles/", "content/news/", "docs/usine/rapports/", "usine/rnd/idees/", "usine/rnd/registre.json"];

/** Champs de frontmatter qu'un agent peut changer sans relecture (aucun fait dedans). */
export const CHAMPS_FRONTMATTER_SURS = ["title", "description", "keywords", "tags", "updatedAt", "lastUpdated", "updated", "revisionUsine", "seoUsine"];

const RE_CHIFFRE = /\d/;
const RE_ANNEE_SEULE = /^(?:[^\d]*(?:19|20)\d{2}[^\d]*)*$/; // des chiffres seulement sous forme d'années
const RE_LIEN = /\]\(([^)\s]+)\)/g;

/** Analyse un patch unifié : lignes ajoutées et supprimées (sans le +/-), et position (frontmatter ou corps) pour un MDX. */
export function lignesDuPatch(patch) {
  const ajoutees = [], supprimees = [];
  for (const l of String(patch ?? "").split("\n")) {
    if (l.startsWith("+++") || l.startsWith("---")) continue;
    if (l.startsWith("+")) ajoutees.push(l.slice(1));
    else if (l.startsWith("-")) supprimees.push(l.slice(1));
  }
  return { ajoutees, supprimees };
}

/**
 * Lignes ajoutées/supprimées d'un MDX séparées entre frontmatter et corps. Le frontmatter est reconnu dans le fichier
 * APRÈS modification (`apres`) : une ligne du patch est « frontmatter » si elle y figure avant le second « --- ».
 */
export function separerFrontmatter(apres, lignes) {
  const texte = String(apres ?? "").replace(/^\uFEFF/, "");
  const m = /^---\r?\n([\s\S]*?)\r?\n---/.exec(texte);
  const fm = new Set((m ? m[1] : "").split(/\r?\n/));
  const dedans = (l) => fm.has(l.replace(/^\uFEFF/, "")) || /^(---)$/.test(l.replace(/^\uFEFF/, "").trim());
  return {
    frontmatter: lignes.filter((l) => dedans(l)),
    corps: lignes.filter((l) => !dedans(l)),
  };
}

/** Raisons de relecture d'UN fichier (liste vide = fichier sûr). */
export function raisonsFichier(f) {
  const r = [];
  const chemin = String(f.chemin ?? "");
  if (f.statut === "D") r.push(`${chemin} : suppression de fichier`);
  if (!LISTE_BLANCHE.some((p) => chemin.startsWith(p) || chemin === p)) r.push(`${chemin} : hors de la liste blanche (code, données ou configuration)`);
  if (chemin === "data/corrections.json") r.push(`${chemin} : une entrée au journal des corrections = un fait corrigé`);
  if (r.length) return r;

  const { ajoutees, supprimees } = lignesDuPatch(f.patch);
  // la règle « aucun fait » (chiffres, dates, €, %, liens externes) ne vise que les CONTENUS du site ; un rapport d'audit ou
  // une fiche d'idée porte des chiffres par nature et n'est pas servi aux lecteurs
  if (chemin.startsWith("content/") && /\.mdx?$/.test(chemin)) {
    const { frontmatter: fmA, corps: corpsA } = separerFrontmatter(f.apres, ajoutees);
    const { corps: corpsS } = separerFrontmatter(f.apres, supprimees);
    // frontmatter : seulement des champs sûrs ; chiffres dans titre/description = années seulement
    for (const l of fmA) {
      const c = /^([A-Za-z_][\w-]*):\s*(.*)$/.exec(l);
      if (!c) {
        if (l.trim() === "---" || l.trim() === "" || /^\s+-\s/.test(l)) continue; // bornes, vide, élément de liste (keywords/tags)
        r.push(`${chemin} : ligne de frontmatter illisible « ${l.slice(0, 60)} »`);
        continue;
      }
      if (!CHAMPS_FRONTMATTER_SURS.includes(c[1])) r.push(`${chemin} : champ de frontmatter « ${c[1]} » modifié (hors liste des champs sans fait)`);
      else if (["title", "description"].includes(c[1]) && RE_CHIFFRE.test(c[2]) && !RE_ANNEE_SEULE.test(c[2])) r.push(`${chemin} : chiffre dans « ${c[1]} » (autre qu'une année)`);
    }
    // corps : aucun chiffre, €, %, ni date ajouté ou retiré ; liens ajoutés internes seulement
    const porteFait = (l) => RE_CHIFFRE.test(l) || /[€%]/.test(l);
    const ajoutsFaits = corpsA.filter(porteFait);
    const retraitsFaits = corpsS.filter((l) => porteFait(l) && !corpsA.some((a) => a.replace(/\]\([^)]*\)/g, "]()") === l.replace(/\]\([^)]*\)/g, "]()")));
    if (ajoutsFaits.length) r.push(`${chemin} : ${ajoutsFaits.length} ligne(s) du corps ajoutée(s) ou modifiée(s) avec un chiffre, une date, € ou %`);
    if (retraitsFaits.length) r.push(`${chemin} : ${retraitsFaits.length} ligne(s) du corps avec chiffre retirée(s)`);
    for (const l of corpsA) {
      for (const m of l.matchAll(RE_LIEN)) {
        if (!m[1].startsWith("/") && !m[1].startsWith("#")) {
          // lien externe ajouté : sûr seulement s'il existait déjà dans une ligne supprimée (texte réécrit autour)
          if (!supprimees.some((s) => s.includes(`](${m[1]})`))) r.push(`${chemin} : lien externe ajouté (${m[1].slice(0, 80)})`);
        }
      }
    }
    if (corpsA.length + corpsS.length > 80) r.push(`${chemin} : ${corpsA.length + corpsS.length} lignes du corps changées (réécriture trop large)`);
  } else if (chemin.startsWith("content/")) {
    r.push(`${chemin} : seul un fichier MDX est attendu dans content/`);
  } else if (chemin === "usine/rnd/registre.json") {
    // le registre R&D ne porte que des statuts et des titres : rien à vérifier de plus
  } else if (chemin.startsWith("docs/usine/rapports/") || chemin.startsWith("usine/rnd/idees/")) {
    if (!/\.md$/.test(chemin)) r.push(`${chemin} : seul un fichier Markdown est attendu ici`);
  }
  return r;
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
  if (liste.length > FICHIERS_MAX) raisons.push(`${liste.length} fichiers modifiés (maximum ${FICHIERS_MAX} pour une fusion automatique)`);
  if (opts.missionRelectureObligatoire) raisons.push("mission à relecture obligatoire (prototype, correction de code)");
  if (opts.declaration === "relecture") raisons.push("l'agent demande lui-même une relecture");
  for (const f of liste) raisons.push(...raisonsFichier(f));
  return { verdict: raisons.length ? "relecture" : "auto", raisons, fichiers: liste.length };
}
