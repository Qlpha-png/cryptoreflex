/**
 * scripts/lib/usine-garde-fou.mjs — RETOUR ARRIÈRE d'une fusion de l'Usine qui dégrade le site (09/10/2026).
 *
 * Après chaque fusion, Vercel déploie et la sentinelle contrôle la production (déclencheur deployment_status). Si elle
 * voit un défaut NOUVEAU dans une zone que le CONTENU peut casser (pages, chiffres, fiscal, partenaires, plans du site,
 * dates vérifiées) alors qu'une fusion de l'Usine vient d'avoir lieu, le workflow usine-garde-fou.yml recommande
 * d'annuler cette fusion (git revert) ; Kevin l'exécute en un clic. Règles :
 *  - commit candidat = fusion de l'Usine (sujet « usine(… » ou « Usine IA — … », auteur usine@cryptoreflex.fr OU corps
 *    marqué « pull request # » / « Co-Authored-By: Cryptoreflex Usine »), de moins de FENETRE_H heures, non annulée ;
 *  - un défaut est NOUVEAU s'il est apparu (champ `depuis` écrit par la sentinelle) après la fusion ; un défaut antérieur
 *    à la fusion ne l'incrimine pas ; un défaut sans date est compté (prudence) ;
 *  - un défaut d'infrastructure (quota, robot, prix, fraîcheur…) ne déclenche rien ;
 *  - un seul retour arrière par passage (la fusion la plus récente), puis la sentinelle rejuge au déploiement suivant.
 * Zéro dépendance, fonctions pures (tests/lib/usine-autonomie.test.ts). Le workflow (scripts/usine-garde-fou.mjs) lit git et le KV.
 */

export const FENETRE_H = 6;
export const AUTEUR_USINE = "usine@cryptoreflex.fr";
export const PREFIXES_MESSAGE = ["usine(", "Usine IA — "];
export const MARQUEURS_CORPS = ["pull request #", "Co-Authored-By: Cryptoreflex Usine"];
/** Zones de la sentinelle dont un défaut peut venir d'un contenu fusionné (mêmes zones que ZONES_DEPOT du plan). */
export const ZONES_CONTENU = ["pages", "chiffres", "fiscal", "partenaires", "plans du site", "dates vérifiées"];

const HEURE = 3_600_000;

/** Fusion de l'Usine ? (sujet ET auteur ou marqueur du corps) */
export function estFusionUsine(c) {
  const message = String(c?.message ?? "");
  const corps = String(c?.corps ?? "");
  if (!PREFIXES_MESSAGE.some((p) => message.startsWith(p))) return false;
  return String(c?.email ?? "") === AUTEUR_USINE || MARQUEURS_CORPS.some((m) => corps.includes(m));
}

/** Commits candidats : fusions de l'Usine, récentes, non annulées (tout commit dont le corps cite « This reverts commit X » exclut X). */
export function commitsCandidats(commits, now = Date.now()) {
  const liste = Array.isArray(commits) ? commits : [];
  const annules = [];
  for (const c of liste) for (const m of String(c.corps ?? "").matchAll(/This reverts commit ([0-9a-f]{7,40})/gi)) annules.push(m[1].toLowerCase());
  return liste.filter((c) => {
    if (!estFusionUsine(c)) return false;
    if (/^Revert "/.test(String(c.message ?? ""))) return false;
    const t = Date.parse(String(c.date ?? ""));
    if (!Number.isFinite(t) || now - t > FENETRE_H * HEURE || t > now + HEURE) return false;
    const sha = String(c.sha ?? "").toLowerCase();
    return !annules.some((a) => sha.startsWith(a) || a.startsWith(sha));
  });
}

/** Défauts de la sentinelle qui relèvent du contenu (déclencheurs d'un retour arrière). */
export function defautsContenu(resume) {
  const d = resume && typeof resume === "object" && Array.isArray(resume.defauts) ? resume.defauts : [];
  return d.filter((x) => x && ZONES_CONTENU.includes(String(x.area ?? "")));
}

/** Défauts de contenu apparus APRÈS l'instant `t` (sans date `depuis` : comptés, par prudence). */
export function defautsApres(resume, t) {
  return defautsContenu(resume).filter((x) => {
    const d = Date.parse(String(x.depuis ?? ""));
    return !Number.isFinite(d) || d >= t - 10 * 60_000;
  });
}

/**
 * Décision : { action: "revert", sha, message, raisons } | { action: "rien", raison }.
 * @param p { commits: [{ sha, email, message, corps, date }], resume: résumé KV usine:sentinelle:dernier, now, shaDemande? }
 * shaDemande : Kevin a demandé l'annulation de CE commit (bouton) ; il doit rester candidat (récent, de l'Usine, non annulé).
 */
export function decider(p) {
  const now = p.now ?? Date.now();
  const candidats = commitsCandidats(p.commits, now);
  if (p.shaDemande) {
    const c = candidats.find((x) => String(x.sha).startsWith(String(p.shaDemande)));
    if (!c) return { action: "rien", raison: `le commit demandé ${String(p.shaDemande).slice(0, 10)} n'est pas (ou plus) une fusion récente de l'Usine non annulée` };
    return { action: "revert", sha: c.sha, message: c.message, raisons: ["retour arrière demandé par Kevin"] };
  }
  const resume = p.resume;
  if (!resume || typeof resume !== "object" || !resume.at) return { action: "rien", raison: "résumé de la sentinelle illisible" };
  const ageH = (now - Date.parse(String(resume.at))) / HEURE;
  if (!Number.isFinite(ageH) || ageH > 2) return { action: "rien", raison: "résumé de la sentinelle trop ancien" };
  if (!defautsContenu(resume).length) return { action: "rien", raison: `aucun défaut de contenu (${Number(resume.fails ?? 0)} défaut(s) hors contenu)` };
  if (!candidats.length) return { action: "rien", raison: `${defautsContenu(resume).length} défaut(s) de contenu mais aucune fusion récente de l'Usine` };
  const c = candidats[0];
  const nouveaux = defautsApres(resume, Date.parse(String(c.date)));
  if (!nouveaux.length) return { action: "rien", raison: `les défauts de contenu sont antérieurs à la fusion ${String(c.sha).slice(0, 10)} : elle n'est pas en cause` };
  return { action: "revert", sha: c.sha, message: c.message, raisons: nouveaux.map((d) => `[${d.area}] ${d.msg}`) };
}
