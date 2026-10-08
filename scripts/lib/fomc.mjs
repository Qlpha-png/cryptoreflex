/**
 * scripts/lib/fomc.mjs — calendrier des réunions FOMC lu sur le site de la Fed, et réécriture du seul bloc FOMC de
 * lib/events-seed.ts (lot fraîcheur A, 08/10/2026, audit n° 34 : FOMC du 6 mai au lieu du 29 avril, juillet, octobre et
 * décembre absents, badge « Mis à jour automatiquement » sans aucun robot).
 *
 * Source : https://www.federalreserve.gov/monetarypolicy/fomccalendars.htm — un panneau par année
 * (« <h4><a id="…">2026 FOMC Meetings</a></h4> »), une ligne par réunion avec les balises
 * « fomc-meeting__month » (« January », « Apr/May ») et « fomc-meeting__date » (« 27-28 », « 17-18* », « 30-1 »).
 * L'astérisque signale une réunion avec projections économiques (SEP). Les votes par écrit (« notation vote ») et les
 * réunions non programmées (« unscheduled ») ne sont pas des réunions du calendrier : ils sont ignorés.
 * Date de l'événement = DEUXIÈME jour (jour de la décision et du communiqué).
 *
 * Zéro dépendance (Node ≥ 20). Utilisé par scripts/refresh-fomc.mjs et tests/lib/events-fomc.test.ts.
 */

export const FOMC_URL = "https://www.federalreserve.gov/monetarypolicy/fomccalendars.htm";
export const MARQUE_DEBUT = "/* <fomc-auto> Bloc écrit par scripts/refresh-fomc.mjs depuis le calendrier officiel de la Fed : ne pas modifier à la main. */";
export const MARQUE_FIN = "/* </fomc-auto> */";
/** Réunions programmées attendues par an (la Fed en tient 8). En dessous : la page a changé, le robot échoue. */
export const MIN_REUNIONS_PAR_AN = 8;

const MOIS_EN = ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"];
const MOIS_FR = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];

/** « January », « Jan », « Sept » → 1-12 ; null si inconnu */
function moisDe(nom) {
  const n = nom.trim().toLowerCase().replace(/\.$/, "");
  const i = MOIS_EN.findIndex((m) => m === n || (n.length >= 3 && m.startsWith(n)));
  return i >= 0 ? i + 1 : null;
}

const texte = (html) => html.replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();
const pad = (n) => String(n).padStart(2, "0");

/**
 * Lit la page de la Fed. Renvoie { reunions: [...], ignorees: [...] } ; LÈVE une erreur si la structure n'est plus
 * reconnue (aucun panneau d'année, balises mois/date dépareillées, mois ou jours illisibles).
 * Réunion : { annee, mois, jour1, jour2, moisDecision, decision: "AAAA-MM-JJ", sep }.
 */
export function lireCalendrierFed(html) {
  if (typeof html !== "string" || html.length < 1000) throw new Error("page de la Fed vide ou tronquée");
  const titres = [...html.matchAll(/<h4>\s*<a[^>]*>\s*(\d{4}) FOMC Meetings\s*<\/a>\s*<\/h4>/g)];
  if (!titres.length) throw new Error("structure de la page de la Fed changée : aucun titre « AAAA FOMC Meetings »");
  const reunions = [];
  const ignorees = [];
  titres.forEach((t, k) => {
    const annee = Number(t[1]);
    const bloc = html.slice(t.index, k + 1 < titres.length ? titres[k + 1].index : undefined);
    const mois = [...bloc.matchAll(/class="[^"]*\bfomc-meeting__month\b[^"]*"[^>]*>([\s\S]*?)<\/div>/g)].map((m) => texte(m[1]));
    const dates = [...bloc.matchAll(/class="[^"]*\bfomc-meeting__date\b[^"]*"[^>]*>([\s\S]*?)<\/div>/g)].map((m) => texte(m[1]));
    if (mois.length !== dates.length) throw new Error(`structure de la page de la Fed changée : ${annee}, ${mois.length} mois pour ${dates.length} dates`);
    mois.forEach((m, i) => {
      const d = dates[i];
      const jours = d.match(/^(\d{1,2})(?:\s*-\s*(\d{1,2}))?\s*(\*)?$/);
      if (!jours) { ignorees.push(`${annee} ${m} ${d}`); return; } // vote par écrit, réunion non programmée…
      const [m1, m2] = m.split("/").map(moisDe);
      if (!m1 || (m.includes("/") && !m2)) throw new Error(`mois illisible sur la page de la Fed : « ${m} » (${annee})`);
      const jour1 = Number(jours[1]);
      const jour2 = jours[2] ? Number(jours[2]) : jour1;
      // réunion à cheval sur deux mois (« Apr/May 30-1 ») : la décision tombe le mois suivant
      const moisDecision = m2 && jour2 < jour1 ? m2 : m1;
      const decision = `${annee}-${pad(moisDecision)}-${pad(jour2)}`;
      const dt = new Date(`${decision}T00:00:00Z`);
      if (dt.toISOString().slice(0, 10) !== decision) throw new Error(`date impossible sur la page de la Fed : ${decision}`);
      reunions.push({ annee, mois: m1, jour1, jour2, moisDecision, decision, sep: !!jours[3] });
    });
  });
  reunions.sort((a, b) => a.decision.localeCompare(b.decision));
  return { reunions, ignorees };
}

/**
 * Extrait de référence de la page lue : titres d'année et lignes de réunion recopiés TELS QUELS, le reste retiré.
 * Écrit par le robot à côté du seed (tests/fixtures/fomc/reference.html) : le test « FOMC du seed = Fed » relit cet
 * extrait et exige que le bloc du seed en soit exactement la traduction.
 */
export function extraitReference(html, url = FOMC_URL, lu = "") {
  const titres = [...html.matchAll(/<h4>\s*<a[^>]*>\s*\d{4} FOMC Meetings\s*<\/a>\s*<\/h4>/g)];
  const out = [
    "<!doctype html>",
    `<!-- Extrait de ${url}${lu ? ` lu le ${lu}` : ""} : titres d'année et lignes de réunion recopiés tels quels`,
    "     (balises fomc-meeting__month / fomc-meeting__date), le reste de la page retiré. Écrit par scripts/refresh-fomc.mjs ;",
    "     relu par tests/lib/events-fomc.test.ts. -->",
    '<html><head><meta charset="utf-8"><title>Federal Reserve Board - Meeting calendars and information</title></head><body>',
  ];
  titres.forEach((t, k) => {
    const bloc = html.slice(t.index, k + 1 < titres.length ? titres[k + 1].index : undefined);
    out.push(`<div class="panel panel-default"><div class="panel-heading">${t[0]}</div>`);
    const cellules = [...bloc.matchAll(/<div class="[^"]*\bfomc-meeting__(?:month|date)\b[^"]*"[^>]*>[\s\S]*?<\/div>/g)].map((m) => m[0]);
    for (let i = 0; i < cellules.length; i += 2) out.push(`  <div class="row fomc-meeting">\n    ${cellules[i]}\n    ${cellules[i + 1] ?? ""}\n  </div>`);
    out.push("</div>");
  });
  out.push("</body></html>", "");
  return out.join("\n");
}

/** Échoue si l'année demandée compte moins de MIN_REUNIONS_PAR_AN réunions programmées. */
export function verifierAnnee(reunions, annee) {
  const n = reunions.filter((r) => r.annee === annee).length;
  if (n < MIN_REUNIONS_PAR_AN) throw new Error(`page de la Fed : ${n} réunion(s) programmée(s) pour ${annee} (au moins ${MIN_REUNIONS_PAR_AN} attendues) — structure changée ?`);
  return n;
}

const jourFr = (j) => (j === 1 ? "1er" : String(j));

/** « les 28 et 29 avril 2026 », « les 30 avril et 1er mai 2027 » */
function periode(r) {
  if (r.jour1 === r.jour2) return `le ${jourFr(r.jour2)} ${MOIS_FR[r.moisDecision - 1]} ${r.annee}`;
  if (r.moisDecision !== r.mois) return `les ${jourFr(r.jour1)} ${MOIS_FR[r.mois - 1]} et ${jourFr(r.jour2)} ${MOIS_FR[r.moisDecision - 1]} ${r.annee}`;
  return `les ${jourFr(r.jour1)} et ${jourFr(r.jour2)} ${MOIS_FR[r.mois - 1]} ${r.annee}`;
}

/** Entrée du calendrier (lib/events-types.ts, CryptoEvent) : texte neutre, uniquement ce que dit la page de la Fed. */
export function versEvenement(r) {
  const moisDec = MOIS_FR[r.moisDecision - 1];
  return {
    id: `fomc-${r.annee}-${pad(r.moisDecision)}`,
    title: `Décision de taux FOMC (${moisDec} ${r.annee})`,
    date: r.decision,
    crypto: "MARCHÉ",
    category: "FOMC",
    source: "Federal Reserve",
    sourceUrl: FOMC_URL,
    description:
      `Réunion du comité de politique monétaire de la Fed (FOMC) ${periode(r)} ; décision sur les taux et communiqué le ${jourFr(r.jour2)} ${moisDec}.` +
      (r.sep ? " Réunion avec projections économiques (SEP)." : "") +
      " Date tirée du calendrier officiel de la Fed.",
    importance: 3,
  };
}

/** Réunions gardées dans le calendrier : décision dans les 12 derniers mois ou à venir (même règle que le seed). */
export function fenetre(reunions, aujourdhui) {
  const borne = new Date(`${aujourdhui}T00:00:00Z`);
  borne.setUTCFullYear(borne.getUTCFullYear() - 1);
  const min = borne.toISOString().slice(0, 10);
  return reunions.filter((r) => r.decision >= min);
}

/** Texte TypeScript du bloc (entre les marqueurs, indentation du tableau EVENTS_SEED). */
export function texteBloc(evenements, releveLe) {
  const lignes = evenements.map((e) => {
    const champs = Object.entries(e).map(([k, v]) => `    ${k}: ${typeof v === "number" ? v : JSON.stringify(v)},`);
    return `  {\n${champs.join("\n")}\n  },`;
  });
  return [
    `  ${MARQUE_DEBUT}`,
    `  /* Relevé de la page de la Fed : ${releveLe}. */`,
    ...lignes,
    `  ${MARQUE_FIN}`,
  ].join("\n");
}

/** Date du relevé inscrite dans le bloc actuel (« AAAA-MM-JJ »), null si absente. */
export function releveActuel(seed) {
  return seed.match(/Relevé de la page de la Fed : (\d{4}-\d{2}-\d{2})\./)?.[1] ?? null;
}

/**
 * Remplace le bloc FOMC du seed. LÈVE une erreur si les marqueurs manquent ou si une entrée « FOMC » traîne hors du
 * bloc (le robot ne réécrit QUE les entrées FOMC, et toutes).
 */
export function remplacerBloc(seed, bloc) {
  const i = seed.indexOf(`  ${MARQUE_DEBUT}`);
  const j = seed.indexOf(`  ${MARQUE_FIN}`);
  if (i < 0 || j < 0 || j < i) throw new Error("lib/events-seed.ts : marqueurs <fomc-auto> absents ou dans le désordre");
  const avant = seed.slice(0, i);
  const apres = seed.slice(j + `  ${MARQUE_FIN}`.length);
  if (/category:\s*"FOMC"/.test(avant + apres)) throw new Error("lib/events-seed.ts : entrée FOMC hors du bloc <fomc-auto> (à déplacer dans le bloc)");
  return avant + bloc + apres;
}

/** Entrées FOMC du bloc actuel (id + date), pour comparer sans tenir compte de la ligne « Relevé … ». */
export function entreesDuBloc(seed) {
  const i = seed.indexOf(MARQUE_DEBUT);
  const j = seed.indexOf(MARQUE_FIN);
  if (i < 0 || j < 0) return [];
  const bloc = seed.slice(i, j);
  return [...bloc.matchAll(/id: "(fomc-[^"]+)",[\s\S]*?date: "(\d{4}-\d{2}-\d{2})",[\s\S]*?description: ("(?:[^"\\]|\\.)*")/g)].map((m) => ({ id: m[1], date: m[2], description: JSON.parse(m[3]) }));
}
