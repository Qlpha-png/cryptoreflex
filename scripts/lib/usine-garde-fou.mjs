/**
 * scripts/lib/usine-garde-fou.mjs — RETOUR ARRIÈRE automatique (09/10/2026, « ne dégrade pas le site »).
 *
 * Après chaque fusion automatique de l'Usine, Vercel déploie et la sentinelle contrôle la production (déclencheur
 * deployment_status). Si elle voit un défaut dans une zone que le CONTENU peut casser (pages, chiffres, fiscal, partenaires,
 * plans du site, dates vérifiées) alors qu'une fusion automatique vient d'avoir lieu, le workflow usine-garde-fou.yml
 * annule cette fusion (git revert) et pousse main : le site revient à l'état d'avant. Règles :
 *  - seuls les commits de l'Usine (auteur usine@cryptoreflex.fr, message « usine(… »), fusionnés il y a moins de FENETRE_H
 *    heures, jamais déjà annulés, sont candidats ;
 *  - un défaut d'infrastructure (quota, robot, prix, fraîcheur…) ne déclenche rien ;
 *  - un seul retour arrière par passage (le plus récent), puis la sentinelle rejuge au déploiement suivant.
 * Zéro dépendance, fonctions pures (tests/lib/usine.test.ts). Le workflow (scripts/usine-garde-fou.mjs) lit git et le KV.
 */

export const FENETRE_H = 6;
export const AUTEUR_USINE = "usine@cryptoreflex.fr";
export const PREFIXE_MESSAGE = "usine(";
/** Zones de la sentinelle dont un défaut peut venir d'un contenu fusionné (mêmes zones que ZONES_DEPOT du plan). */
export const ZONES_CONTENU = ["pages", "chiffres", "fiscal", "partenaires", "plans du site", "dates vérifiées"];

const HEURE = 3_600_000;

/** Commits candidats : de l'Usine, récents, non annulés (un commit « Revert "usine(… » plus récent les exclut). */
export function commitsCandidats(commits, now = Date.now()) {
  const liste = Array.isArray(commits) ? commits : [];
  const annules = new Set();
  for (const c of liste) {
    const m = /This reverts commit ([0-9a-f]{7,40})/i.exec(String(c.corps ?? ""));
    if (m) annules.add(m[1]);
  }
  return liste.filter((c) => {
    if (String(c.email ?? "") !== AUTEUR_USINE) return false;
    if (!String(c.message ?? "").startsWith(PREFIXE_MESSAGE)) return false;
    const t = Date.parse(String(c.date ?? ""));
    if (!Number.isFinite(t) || now - t > FENETRE_H * HEURE) return false;
    if ([...annules].some((a) => String(c.sha).startsWith(a) || a.startsWith(String(c.sha)))) return false;
    return true;
  });
}

/** Défauts de la sentinelle qui relèvent du contenu (déclencheurs d'un retour arrière). */
export function defautsContenu(resume) {
  const d = resume && typeof resume === "object" && Array.isArray(resume.defauts) ? resume.defauts : [];
  return d.filter((x) => x && ZONES_CONTENU.includes(String(x.area ?? "")));
}

/**
 * Décision : { action: "revert", sha, raisons } | { action: "rien", raison }.
 * @param p { commits: [{ sha, email, message, corps, date }], resume: résumé KV usine:sentinelle:dernier, now }
 */
export function decider(p) {
  const now = p.now ?? Date.now();
  const resume = p.resume;
  if (!resume || typeof resume !== "object" || !resume.at) return { action: "rien", raison: "résumé de la sentinelle illisible" };
  const ageH = (now - Date.parse(String(resume.at))) / HEURE;
  if (!Number.isFinite(ageH) || ageH > 2) return { action: "rien", raison: "résumé de la sentinelle trop ancien" };
  const defauts = defautsContenu(resume);
  if (!defauts.length) return { action: "rien", raison: `aucun défaut de contenu (${Number(resume.fails ?? 0)} défaut(s) hors contenu)` };
  const candidats = commitsCandidats(p.commits, now);
  if (!candidats.length) return { action: "rien", raison: `${defauts.length} défaut(s) de contenu mais aucune fusion automatique récente de l'Usine` };
  const sha = candidats[0].sha;
  return { action: "revert", sha, message: candidats[0].message, raisons: defauts.map((d) => `[${d.area}] ${d.msg}`) };
}
