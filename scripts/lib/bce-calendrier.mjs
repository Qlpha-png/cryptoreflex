/**
 * scripts/lib/bce-calendrier.mjs — réunions de politique monétaire de la BCE (robot R7 étendu, lot Z4, 10/10/2026).
 * Fonctions pures, testées sur une copie figée de la page (tests/fixtures/bce/mgcgc-2026-10-10.html). Zéro dépendance.
 *
 * Source : calendrier des réunions du Conseil des gouverneurs (https://www.ecb.europa.eu/press/calendars/mgcgc/html/index.en.html),
 * « users of this website may make free use of the information », la BCE doit être citée (S9).
 *
 * Pièges mesurés le 10/10/2026 (éclaireur Z4) :
 *  - la page ne montre QUE les dates à venir : le contrôle « 8 réunions par an » porte sur l'année N+1, jamais sur l'année
 *    en cours (partielle) ; les décisions passées sont gardées d'un passage à l'autre (accumulation) ;
 *  - jour de décision = libellé « (Day 2) » ou « followed by press conference » (le 11/10/2028 est écrit sans « (Day 1) » :
 *    la règle « tout sauf Day 1 » compterait 9 réunions en 2028) ;
 *  - « non-monetary policy meeting » contient « monetary policy meeting » : exclu explicitement, comme le Conseil général
 *    et la ligne « Press conference » qui double le jour 2.
 */

export const BCE_CALENDRIER_URL = "https://www.ecb.europa.eu/press/calendars/mgcgc/html/index.en.html";
export const REUNIONS_PAR_AN = { min: 7, max: 10 };

const texte = (s) => String(s).replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/\s+/g, " ").trim();
const versIso = (jjmmaaaa) => {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(jjmmaaaa);
  if (!m) return null;
  const iso = `${m[3]}-${m[2]}-${m[1]}`;
  const d = new Date(`${iso}T00:00:00Z`);
  return Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== iso ? null : iso;
};

/**
 * Lit la page calendrier. Renvoie { lignes, decisions: [{ date, jour1 }] } ou { erreur }.
 * decisions = jours de décision (communiqué de politique monétaire), triés.
 */
export function lireCalendrierBce(html) {
  const dl = String(html ?? "").match(/<div class="definition-list[^"]*">\s*<dl>([\s\S]*?)<\/dl>/);
  if (!dl) return { erreur: "liste <dl> du calendrier absente (structure de la page changée)" };
  const paires = [...dl[1].matchAll(/<dt>([\s\S]*?)<\/dt>\s*<dd>([\s\S]*?)<\/dd>/g)].map((m) => ({ brut: texte(m[1]), libelle: texte(m[2]) }));
  if (paires.length < 10) return { erreur: `${paires.length} entrée(s) seulement dans le calendrier` };
  const lignes = [];
  for (const p of paires) {
    const date = versIso(p.brut);
    if (!date) return { erreur: `date illisible « ${p.brut.slice(0, 20)} »` };
    lignes.push({ date, libelle: p.libelle });
  }
  const politique = lignes.filter((l) => /monetary policy meeting/i.test(l.libelle) && !/non-monetary/i.test(l.libelle) && !/General Council/i.test(l.libelle) && !/^Press conference/i.test(l.libelle));
  const decisions = [];
  for (const l of politique) {
    const estDecision = /\(Day 2\)/i.test(l.libelle) || /followed by press conference/i.test(l.libelle);
    if (!estDecision) continue;
    const veille = new Date(Date.parse(`${l.date}T00:00:00Z`) - 86_400_000).toISOString().slice(0, 10);
    const jour1 = politique.find((x) => x.date === veille && !/\(Day 2\)/i.test(x.libelle)) ? veille : null;
    decisions.push({ date: l.date, jour1 });
  }
  // réunion d'un seul jour sans « Day » : décision seulement si aucun « Day 2 » ne la suit le lendemain
  for (const l of politique) {
    if (/\(Day [12]\)/i.test(l.libelle) || /followed by press conference/i.test(l.libelle)) continue;
    const lendemain = new Date(Date.parse(`${l.date}T00:00:00Z`) + 86_400_000).toISOString().slice(0, 10);
    if (!decisions.some((d) => d.date === lendemain)) decisions.push({ date: l.date, jour1: null });
  }
  decisions.sort((a, b) => a.date.localeCompare(b.date));
  for (const d of decisions) {
    const j2 = decisions.filter((x) => x.date === d.date).length;
    if (j2 > 1) return { erreur: `décision en double le ${d.date}` };
  }
  return { lignes: lignes.length, decisions };
}

/** Contrôle : l'année N+1 complète compte entre 7 et 10 décisions (8 attendues). Renvoie null ou la raison. */
export function verifierBce(decisions, aujourdhui) {
  const suivante = String(Number(aujourdhui.slice(0, 4)) + 1);
  const n = decisions.filter((d) => d.date.startsWith(suivante)).length;
  if (n < REUNIONS_PAR_AN.min || n > REUNIONS_PAR_AN.max) return `${n} décision(s) de politique monétaire en ${suivante} (${REUNIONS_PAR_AN.min} à ${REUNIONS_PAR_AN.max} attendues, 8 d'habitude)`;
  if (!decisions.some((d) => d.date >= aujourdhui)) return "aucune décision à venir dans le calendrier";
  return null;
}

/**
 * Fusion avec les décisions déjà connues : les décisions PASSÉES (absentes de la page, qui ne montre que l'avenir) sont
 * gardées sur 12 mois ; une décision encore future qui disparaît ou bouge est remplacée par la page (changement réel,
 * signalé dans `changements`).
 */
export function fusionnerDecisions(anciennes, lues, aujourdhui) {
  const limite = `${Number(aujourdhui.slice(0, 4)) - 1}${aujourdhui.slice(4)}`;
  const passees = (anciennes ?? []).filter((d) => d.date < aujourdhui && d.date >= limite && !lues.some((x) => x.date === d.date));
  const futuresAvant = (anciennes ?? []).filter((d) => d.date >= aujourdhui).map((d) => d.date);
  const futuresApres = lues.filter((d) => d.date >= aujourdhui).map((d) => d.date);
  const changements = [
    ...futuresAvant.filter((d) => !futuresApres.includes(d)).map((d) => `décision du ${d} retirée ou déplacée`),
    ...(futuresAvant.length ? futuresApres.filter((d) => !futuresAvant.includes(d)).map((d) => `nouvelle décision le ${d}`) : []),
  ];
  const toutes = [...passees, ...lues.filter((d) => d.date >= limite)].sort((a, b) => a.date.localeCompare(b.date));
  return { decisions: toutes, changements };
}

/** Adresse du fragment des décisions passées d'une année (URL interne de la BCE, non documentée : premier remplissage et contrôle seulement). */
export const bceDecisionsUrl = (annee) => `https://www.ecb.europa.eu/press/govcdec/mopo/${annee}/html/index_include.en.html`;

/** Décisions passées lues sur le fragment annuel : entrées au titre exact « Monetary policy decisions ». */
export function lireDecisionsPassees(html) {
  const out = new Set();
  // (?:(?!<\/?dt)[\s\S])*? : jamais au-delà de l'entrée en cours (sinon un compte rendu « s'accroche » à la décision suivante)
  const re = /<dt isoDate="(\d{4}-\d{2}-\d{2})">(?:(?!<\/?dt)[\s\S])*?<\/dt>\s*<dd>\s*<div class="title"><a[^>]*>\s*Monetary policy decisions\s*<\/a>/g;
  for (const m of String(html ?? "").matchAll(re)) out.add(m[1]);
  return [...out].sort().map((date) => ({ date, jour1: null }));
}
