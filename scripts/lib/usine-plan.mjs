/**
 * scripts/lib/usine-plan.mjs — PLAN DU JOUR de l'Usine, déterministe (09/10/2026, « une usine qui sait exactement quoi
 * faire »). Les agents IA ne choisissent pas leur cible : ce module la calcule à partir des fichiers du dépôt et du résumé
 * de la sentinelle, le workflow l'écrit dans usine/.sortie/plan.md, et le tableau de bord /admin/usine affiche le même
 * plan. Zéro dépendance, fonctions pures (testées par tests/lib/usine.test.ts) ; les lectures de fichiers sont faites
 * par l'appelant (scripts/usine-plan.mjs, lib/usine/etat.ts).
 */

const JOUR = 86_400_000;

/** Délai avant qu'un article relu par l'Usine soit de nouveau candidat (jours). */
export const RELECTURE_JOURS = 60;
/** Délai avant qu'une page traitée par l'agent SEO soit de nouveau candidate (jours). */
export const SEO_JOURS = 90;
export const SEO_LOT_MAX = 10;
export const DESCRIPTION_MIN = 110;
export const DESCRIPTION_MAX = 160;
export const TITRE_MAX = 65;
/** Hubs internes qu'un article de fond devrait relier (au moins un). */
export const HUBS_INTERNES = ["/cryptos", "/comparatif", "/outils", "/glossaire", "/impots", "/academie"];

/** Zones de la sentinelle dont un défaut peut venir du dépôt (code, contenu, données) : à corriger par l'agent correcteur. */
export const ZONES_DEPOT = ["pages", "chiffres", "fiscal", "partenaires", "plans du site", "dates vérifiées"];
/** Zones dont un défaut vient de l'infrastructure (quota, robot, service tiers) : à expliquer, pas à corriger. */
export const ZONES_HORS_DEPOT = ["robots", "quota", "prix", "fraîcheur", "jeu", "consommation", "cours des fiches", "registre de fraîcheur"];

const instant = (v) => {
  const t = Date.parse(String(v ?? ""));
  return Number.isFinite(t) ? t : null;
};

/**
 * Lecture minimale d'un frontmatter MDX (clés simples « cle: valeur » ; les listes YAML ne sont pas lues).
 * Renvoie { champs, corps }. Sans frontmatter : champs vides, corps = texte entier.
 */
export function lireFrontmatter(texte) {
  // certains fichiers du dépôt commencent par un octet d'ordre (BOM, U+FEFF) : il ne fait pas partie du frontmatter
  const src = String(texte ?? "").replace(/^\uFEFF/, "");
  const m = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/.exec(src);
  if (!m) return { champs: {}, corps: src };
  const champs = {};
  for (const ligne of m[1].split(/\r?\n/)) {
    const c = /^([A-Za-z_][\w-]*):\s*(.*)$/.exec(ligne);
    if (!c) continue;
    let v = c[2].trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    champs[c[1]] = v;
  }
  return { champs, corps: src.slice(m[0].length) };
}

/**
 * Fiche d'un article pour le plan : { slug, titre, description, date, updatedAt, revisionUsine, seoUsine, liensInternes,
 * liensExternes }. `texte` = contenu complet du fichier.
 */
export function ficheArticle(slug, texte) {
  const { champs, corps } = lireFrontmatter(texte);
  const liens = [...corps.matchAll(/\]\((https?:\/\/[^)\s]+|\/[^)\s]*)\)/g)].map((m) => m[1]);
  return {
    slug,
    titre: champs.title ?? "",
    description: champs.description ?? "",
    date: champs.date ?? champs.publishedAt ?? null,
    // lib/mdx.ts : `updated` est l'alias historique de `lastUpdated`
    updatedAt: champs.updatedAt ?? champs.lastUpdated ?? champs.updated ?? champs.date ?? champs.publishedAt ?? null,
    revisionUsine: champs.revisionUsine ?? null,
    seoUsine: champs.seoUsine ?? null,
    liensInternes: liens.filter((l) => l.startsWith("/")),
    liensExternes: liens.filter((l) => !l.startsWith("/")),
  };
}

/** Article à relire : le plus ancien (updatedAt, sinon date) parmi ceux sans relecture de l'Usine depuis RELECTURE_JOURS. */
export function choisirArticleAReviser(fiches, now = Date.now()) {
  const candidats = fiches
    .filter((f) => f.slug && !(f.revisionUsine && instant(f.revisionUsine) !== null && now - instant(f.revisionUsine) < RELECTURE_JOURS * JOUR))
    .map((f) => ({ f, t: instant(f.updatedAt) ?? instant(f.date) ?? 0 }))
    .sort((a, b) => a.t - b.t || a.f.slug.localeCompare(b.f.slug));
  return candidats[0]?.f ?? null;
}

/** Défauts SEO d'une fiche (liste vide = rien à faire). */
export function defautsSeo(fiche) {
  const out = [];
  const d = fiche.description.length;
  if (d < DESCRIPTION_MIN) out.push(`description trop courte (${d} caractères, minimum ${DESCRIPTION_MIN})`);
  else if (d > DESCRIPTION_MAX) out.push(`description trop longue (${d} caractères, maximum ${DESCRIPTION_MAX})`);
  if (fiche.titre.length > TITRE_MAX) out.push(`titre trop long (${fiche.titre.length} caractères, maximum ${TITRE_MAX})`);
  if (!fiche.liensInternes.some((l) => HUBS_INTERNES.some((h) => l === h || l.startsWith(h + "/")))) out.push("aucun lien interne vers un hub (cryptos, comparatif, outils, glossaire, impôts, académie)");
  return out;
}

/** Lot SEO : au plus `max` fiches avec défauts, non traitées depuis SEO_JOURS, les plus anciennes d'abord. */
export function candidatsSeo(fiches, now = Date.now(), max = SEO_LOT_MAX) {
  return fiches
    .filter((f) => f.slug && !(f.seoUsine && instant(f.seoUsine) !== null && now - instant(f.seoUsine) < SEO_JOURS * JOUR))
    .map((f) => ({ fiche: f, defauts: defautsSeo(f), t: instant(f.updatedAt) ?? instant(f.date) ?? 0 }))
    .filter((c) => c.defauts.length > 0)
    .sort((a, b) => b.defauts.length - a.defauts.length || a.t - b.t || a.fiche.slug.localeCompare(b.fiche.slug))
    .slice(0, max)
    .map((c) => ({ slug: c.fiche.slug, titre: c.fiche.titre, defauts: c.defauts }));
}

/**
 * Défauts de la sentinelle classés pour le correcteur : { depot: [...], horsDepot: [...], autres: [...] } à partir d'une liste
 * [{ area, msg }] (résumé KV usine:sentinelle:dernier, ou rapport sentinelle-report.md analysé par lireRapportSentinelle).
 */
export function classerDefauts(defauts) {
  const depot = [], horsDepot = [], autres = [];
  for (const d of defauts ?? []) {
    if (!d || typeof d !== "object") continue;
    const zone = String(d.area ?? "");
    if (ZONES_DEPOT.includes(zone)) depot.push(d);
    else if (ZONES_HORS_DEPOT.includes(zone)) horsDepot.push(d);
    else autres.push(d);
  }
  return { depot, horsDepot, autres };
}

/** Lignes « - ❌ [zone] message » et « - ⚠️ [zone] message » d'un rapport de la sentinelle → [{ niveau, area, msg }]. */
export function lireRapportSentinelle(texte) {
  const out = [];
  for (const ligne of String(texte ?? "").split("\n")) {
    const m = /^- (❌|⚠️) \[([^\]]+)\] (.*)$/.exec(ligne.trim());
    if (m) out.push({ niveau: m[1] === "❌" ? "fail" : "warn", area: m[2], msg: m[3] });
  }
  return out;
}

/**
 * Plan complet d'une mission, prêt à être écrit dans usine/.sortie/plan.md.
 * @param mission reviseur | correcteur | seo | auditeur | chercheur | prototypeur
 * @param donnees { fiches?: fiche[], defauts?: [{area,msg}], idees?: idee[], cible?: string, rapportsPrecedents?: string[] }
 * @returns { mission, cible, titre, lignes: string[] }  (lignes = Markdown)
 */
export function planifier(mission, donnees, now = Date.now()) {
  const jour = new Date(now).toISOString().slice(0, 10);
  const cible = (donnees.cible ?? "").trim();
  const lignes = [`# Plan du jour — mission « ${mission} » — ${jour}`, ""];
  let titre = `${mission} du ${jour}`;
  switch (mission) {
    case "reviseur": {
      const fiches = donnees.fiches ?? [];
      const choisi = cible ? fiches.find((f) => f.slug === cible) ?? { slug: cible } : choisirArticleAReviser(fiches, now);
      if (!choisi) {
        lignes.push("Aucun article candidat : tous ont été relus depuis moins de 60 jours. Écris `Aucune modification` dans le résumé.");
        return { mission, cible: null, titre: "Relecture : aucun article candidat", lignes };
      }
      titre = `Relecture — ${choisi.slug}`;
      lignes.push(`Article à relire : \`content/articles/${choisi.slug}.mdx\``);
      if (choisi.titre) lignes.push(`Titre : ${choisi.titre}`);
      if (choisi.updatedAt) lignes.push(`Dernière mise à jour déclarée : ${choisi.updatedAt}${choisi.revisionUsine ? ` · dernière relecture de l'Usine : ${choisi.revisionUsine}` : ""}`);
      if (choisi.liensExternes?.length) {
        lignes.push("", `Liens externes à tester (${choisi.liensExternes.length}) :`, ...choisi.liensExternes.slice(0, 40).map((l) => `- ${l}`));
      }
      lignes.push("", "Consigne : ne traite QUE cet article. Les autres attendent leur tour (un par jour).");
      return { mission, cible: choisi.slug, titre, lignes };
    }
    case "seo": {
      const fiches = donnees.fiches ?? [];
      const lot = cible ? fiches.filter((f) => f.slug === cible || `content/articles/${f.slug}.mdx` === cible).map((f) => ({ slug: f.slug, titre: f.titre, defauts: defautsSeo(f) })) : candidatsSeo(fiches, now);
      if (!lot.length) {
        lignes.push("Aucune page candidate : rien à optimiser selon les règles (description 110-160, titre ≤ 65, lien vers un hub). Écris `Aucune modification`.");
        return { mission, cible: null, titre: "SEO : aucune page candidate", lignes };
      }
      titre = `SEO — ${lot.length} page(s)`;
      lignes.push(`Lot de ${lot.length} page(s) (ne traite QUE celles-ci) :`, "");
      for (const p of lot) lignes.push(`- \`content/articles/${p.slug}.mdx\` — ${p.defauts.join(" ; ") || "cible demandée"}`);
      return { mission, cible: lot.map((p) => p.slug).join(","), titre, lignes };
    }
    case "correcteur": {
      const { depot, horsDepot, autres } = classerDefauts(donnees.defauts ?? []);
      titre = depot.length ? `Correction — ${depot.length} défaut(s) du dépôt` : "Correction : aucun défaut du dépôt";
      lignes.push(`Défauts vus par la sentinelle : ${depot.length} à corriger dans le dépôt, ${horsDepot.length} hors dépôt (à expliquer seulement), ${autres.length} à classer.`, "");
      if (depot.length) lignes.push("## À corriger (dépôt)", ...depot.map((d) => `- [${d.area}] ${d.msg}`), "");
      if (horsDepot.length) lignes.push("## Hors dépôt (expliquer, ne rien modifier)", ...horsDepot.map((d) => `- [${d.area}] ${d.msg}`), "");
      if (autres.length) lignes.push("## À classer toi-même", ...autres.map((d) => `- [${d.area}] ${d.msg}`), "");
      if (cible) lignes.push(`Cible demandée : ${cible} — ne traite que celle-là.`);
      if (!depot.length && !autres.length && !cible) lignes.push("Rien à corriger dans le dépôt : écris `Aucune modification` avec la liste ci-dessus classée.");
      return { mission, cible: cible || null, titre, lignes };
    }
    case "auditeur": {
      titre = `Audit hebdomadaire du ${jour}`;
      const prec = (donnees.rapportsPrecedents ?? []).slice().sort().pop();
      lignes.push(`Rapport à écrire : \`docs/usine/rapports/${jour}-audit.md\``);
      lignes.push(prec ? `Rapport précédent à comparer : \`docs/usine/rapports/${prec}\`` : "Aucun rapport précédent : c'est le premier.");
      return { mission, cible: `docs/usine/rapports/${jour}-audit.md`, titre, lignes };
    }
    case "chercheur": {
      const idees = donnees.idees ?? [];
      const ouvertes = idees.filter((i) => i.statut === "proposee" || i.statut === "retenue");
      titre = `R&D — veille et idées du ${jour}`;
      lignes.push(`Idées déjà au registre : ${idees.length} (${ouvertes.length} proposées ou retenues). Ne propose RIEN qui existe déjà :`, "");
      for (const i of idees.slice(0, 60)) lignes.push(`- [${i.statut}] ${i.id} — ${i.titre}`);
      lignes.push("", cible ? `Thème demandé : ${cible}` : "Thème libre : choisis les 3 pistes les plus utiles au lecteur et au site (voir la mission).");
      return { mission, cible: cible || null, titre, lignes };
    }
    case "prototypeur": {
      const idees = donnees.idees ?? [];
      const retenue = cible ? idees.find((i) => i.id === cible) : idees.filter((i) => i.statut === "retenue").sort((a, b) => String(a.date).localeCompare(String(b.date)))[0];
      if (!retenue) {
        lignes.push("Aucune idée au statut « retenue » dans usine/rnd/registre.json : rien à prototyper. Écris `Aucune modification`.");
        return { mission, cible: null, titre: "Prototype : aucune idée retenue", lignes };
      }
      titre = `Prototype — ${retenue.titre}`;
      lignes.push(`Idée retenue : ${retenue.id} — ${retenue.titre}`, `Fiche : \`${retenue.fichier}\``, "", "Construis le prototype décrit dans la fiche, puis passe l'idée au statut « en-cours » dans usine/rnd/registre.json.");
      return { mission, cible: retenue.id, titre, lignes };
    }
    default:
      lignes.push(`Mission inconnue : ${mission}.`);
      return { mission, cible: null, titre, lignes };
  }
}

/* ------------------------------------------------------------------ R&D : registre des idées */

export const STATUTS_IDEE = ["proposee", "retenue", "en-cours", "faite", "ecartee"];

/** Valide le registre des idées (usine/rnd/registre.json) ; liste d'erreurs (vide = valide). */
export function validerRegistreIdees(reg) {
  const err = [];
  if (!reg || !Array.isArray(reg.idees)) return ["registre sans liste « idees »"];
  const ids = new Set();
  for (const i of reg.idees) {
    const ou = `idée ${i?.id ?? "?"}`;
    if (!i || typeof i.id !== "string" || !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(i.id)) err.push(`${ou} : identifiant absent ou invalide`);
    else if (ids.has(i.id)) err.push(`${ou} : identifiant en double`);
    else ids.add(i.id);
    if (typeof i?.titre !== "string" || i.titre.length < 5) err.push(`${ou} : titre manquant`);
    if (!STATUTS_IDEE.includes(i?.statut)) err.push(`${ou} : statut inconnu (${STATUTS_IDEE.join(", ")})`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(i?.date ?? ""))) err.push(`${ou} : date AAAA-MM-JJ manquante`);
    if (typeof i?.fichier !== "string" || !i.fichier.startsWith("usine/rnd/idees/")) err.push(`${ou} : fichier de fiche manquant (usine/rnd/idees/…)`);
    for (const k of ["impact", "effort"]) if (!["faible", "moyen", "fort"].includes(i?.[k])) err.push(`${ou} : ${k} doit valoir faible, moyen ou fort`);
  }
  return err;
}

/** Tableau de bord : comptes par statut et idées retenues en attente. */
export function bilanIdees(reg) {
  const idees = Array.isArray(reg?.idees) ? reg.idees : [];
  const parStatut = Object.fromEntries(STATUTS_IDEE.map((s) => [s, idees.filter((i) => i.statut === s).length]));
  return { total: idees.length, parStatut, retenues: idees.filter((i) => i.statut === "retenue"), recentes: [...idees].sort((a, b) => String(b.date).localeCompare(String(a.date))).slice(0, 12) };
}
