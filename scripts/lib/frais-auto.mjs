/**
 * scripts/lib/frais-auto.mjs — date du contrôle automatique des grilles de frais (lot Z6, 10/10/2026, famille 19 de la
 * carte de fraîcheur ; architecture 0 € § 2.2 : « dates de contrôle "rien n'a changé" » = fusion automatique permise).
 *
 * Principe : chaque nuit, la veille (scripts/veille-officielle.mjs, étape « grilles de frais ») relit les pages de frais
 * OFFICIELLES de chaque plateforme et compare leur empreinte (taux et montants, ou PDF, ou liste de PDF) à la référence
 * relue par un humain (data/veille/etat.json). Quand TOUTES les pages suivies d'une plateforme sont lues et
 * inchangées, le robot écrit la date du jour dans data/veille/frais-auto.json (champ affiché « fees.autoCheckedAt »,
 * lib/frais-auto.ts). La date « Frais vérifiés le … » du site devient la plus récente entre la relecture humaine
 * (fees.verified.date) et ce contrôle.
 *
 * Ce que le robot ne fait JAMAIS : modifier un montant de frais, avancer une date quand une page a changé, était illisible
 * (403, défi anti-robot, forme changée), n'avait pas encore de référence ou a disparu. Un écart reste signalé par le
 * ticket de la veille (comme avant ce lot). Fonctions pures, testées (tests/lib/frais-auto-z6.test.ts). Zéro dépendance.
 */

/** Verdicts pour lesquels une date de contrôle a un sens : une grille affichée (fiable) ou affichée « à vérifier » (douteux).
 *  « indisponible » (date = jour de la fermeture, pas d'un relevé), « non-verifie » (aucune grille lue) et « non vérifiable »
 *  (CFD) ne sont jamais rajeunis. */
export const VERDICTS_DATABLES = ["fiable", "douteux"];

/** Empreintes qui couvrent des CHIFFRES de la grille : taux et montants, document PDF, liste des PDF publiés. Une empreinte
 *  de « phrases » (pages sans chiffre) ne prouve rien sur un taux : elle suit les changements, sans rajeunir de date. */
export const EMPREINTES_FORTES = ["jetons", "pdf", "liens"];

/** Clé d'empreinte d'une page relevée (même ordre que la veille). */
export function cleEmpreinte(emp) {
  if (!emp || typeof emp !== "object") return null;
  return emp.pdf ? "pdf" : emp.liens ? "liens" : emp.phrases ? "phrases" : emp.jetons ? "jetons" : null;
}

/** Adresse comparable : minuscules, sans ancre ni barre finale. */
export function normaliserUrl(u) {
  return String(u ?? "").trim().replace(/#.*$/, "").replace(/\/+$/, "").toLowerCase();
}

/**
 * Pages suivies pour une plateforme : source du coût citée par le comparateur + pages de data/veille/sources.json
 * (frais.pages), à l'exclusion des pages « index » (relues seulement comme liste de PDF). Même règle que la veille.
 * @returns {{ pages: string[], index: string[] }}
 */
export function pagesSuivies(plateforme, F = {}) {
  const index = F.index?.[plateforme.id] || [];
  const pages = [...new Set([plateforme.fees?.cost?.source, ...(F.pages?.[plateforme.id] || [])].filter((u) => typeof u === "string" && u && !index.includes(u)))];
  return { pages, index };
}

/**
 * Statut d'une page pour le jugement : à partir de la référence (etat.json) et de ce qui a été lu cette nuit.
 * @param {{ ref?: object, emp?: object, disparue?: boolean }} p
 * `depuis` = date d'ENREGISTREMENT de la valeur d'empreinte de la référence (champ « depuis » de la page dans etat.json) :
 * « inchangée » prouve seulement que la page n'a pas bougé depuis cette date.
 * @returns {{ etat: "inchangee"|"changee"|"nouvelle"|"illisible"|"disparue", cle: string|null, depuis: string|null }}
 */
export function statutPage({ ref, emp, disparue }) {
  if (disparue) return { etat: "disparue", cle: null, depuis: null };
  if (!emp) return { etat: "illisible", cle: null, depuis: null };
  const cle = cleEmpreinte(emp);
  if (!ref || ref.disparue) return { etat: "nouvelle", cle, depuis: null };
  const depuis = jourValide(ref.depuis);
  const cleRef = cleEmpreinte(ref);
  if (cleRef !== cle) return { etat: "changee", cle, depuis };
  return { etat: ref[cle] === emp[cle] ? "inchangee" : "changee", cle, depuis };
}

/** AAAA-MM-JJ valide (jour réel) ou null. */
export function jourValide(v) {
  if (typeof v !== "string" || !/^\d{4}-\d{2}-\d{2}/.test(v.trim())) return null;
  const j = v.trim().slice(0, 10);
  return new Date(`${j}T00:00:00Z`).toISOString().slice(0, 10) === j ? j : null;
}

/**
 * Valeur du champ « depuis » à écrire avec une page relevée (écriture de la référence, option --enregistrer) : la date
 * d'enregistrement de la valeur d'empreinte. Valeur identique à la référence = « depuis » conservé ; valeur nouvelle ou
 * changée = date du jour. Un « depuis » inconnu sur une valeur inchangée devient la date du jour (jamais plus ancien : le
 * doute joue contre l'avance de la date de contrôle).
 */
export function depuisPourEnregistrement(ref, emp, aujourdhui) {
  const cle = cleEmpreinte(emp);
  if (ref && !ref.disparue && cle && cleEmpreinte(ref) === cle && ref[cle] === emp[cle]) return jourValide(ref.depuis) ?? aujourdhui;
  return aujourdhui;
}

/** Date de la dernière relecture humaine des frais d'une plateforme : la plus ANCIENNE des dates qui s'affichent (frais, coût). */
export function relectureHumaine(plateforme) {
  const dates = [plateforme?.fees?.verified?.date, plateforme?.fees?.cost?.date].map(jourValide).filter(Boolean);
  return dates.length ? dates.sort()[0] : null;
}

/**
 * Faut-il écrire la date du jour pour cette plateforme ? Règles, toutes obligatoires :
 *  1. verdict « fiable » ou « douteux » ;
 *  2. au moins une page suivie ;
 *  3. TOUTES les pages suivies sont lues cette nuit ET inchangées par rapport à la référence relue (une page nouvelle sans
 *     référence, illisible, changée ou disparue empêche l'avance) ;
 *  4. une page citée par la fiche (fees.verified.source ou fees.cost.source) est suivie, avec une empreinte qui couvre des
 *     chiffres (taux et montants, PDF, liste de PDF) ;
 *  5. la relecture humaine des frais de la plateforme (la plus ancienne de fees.verified.date et fees.cost.date) est
 *     POSTÉRIEURE OU ÉGALE à la date d'enregistrement de la référence (« depuis ») de CHAQUE page suivie. Une page « inchangée »
 *     prouve seulement qu'elle n'a pas bougé depuis l'enregistrement de sa référence : si les frais ont été relus avant, la
 *     page a pu changer entre-temps, et avancer la date affirmerait une fraîcheur fausse.
 * @param {{ plateforme: object, suivi: Array<{ url: string, etat: string, cle: string|null, depuis?: string|null }> }} a
 * @returns {{ avance: boolean, raison: string }}
 */
export function jugerFraisAuto({ plateforme, suivi }) {
  const verdict = plateforme?.fees?.verified?.verdict;
  if (!VERDICTS_DATABLES.includes(verdict)) return { avance: false, raison: `verdict « ${verdict ?? "absent"} » : aucune date de contrôle` };
  if (!Array.isArray(suivi) || !suivi.length) return { avance: false, raison: "aucune page de frais suivie" };
  const pasBon = suivi.filter((s) => s.etat !== "inchangee");
  if (pasBon.length) return { avance: false, raison: `${pasBon.length} page(s) sur ${suivi.length} non confirmée(s) : ${pasBon.slice(0, 3).map((s) => `${s.etat} ${s.url}`).join(" ; ")}` };
  const citees = [plateforme.fees?.verified?.source, plateforme.fees?.cost?.source].filter(Boolean).map(normaliserUrl);
  const fortes = suivi.filter((s) => citees.includes(normaliserUrl(s.url)) && EMPREINTES_FORTES.includes(s.cle));
  if (!fortes.length) return { avance: false, raison: "la grille citée par la fiche n'est pas suivie par une empreinte de taux, de PDF ou de liste de PDF" };
  const relecture = relectureHumaine(plateforme);
  if (!relecture) return { avance: false, raison: "date de relecture humaine des frais illisible" };
  const sansDepuis = suivi.filter((s) => !jourValide(s.depuis));
  if (sansDepuis.length) return { avance: false, raison: `date d'enregistrement de la référence inconnue pour ${sansDepuis.length} page(s) : ${sansDepuis.slice(0, 2).map((s) => s.url).join(" ; ")}` };
  const posterieures = suivi.filter((s) => relecture < jourValide(s.depuis));
  if (posterieures.length) {
    const plusRecente = posterieures.map((s) => jourValide(s.depuis)).sort().pop();
    return { avance: false, raison: `relecture humaine (${relecture}) antérieure à la référence de ${posterieures.length} page(s) (enregistrée jusqu'au ${plusRecente}) : ${posterieures.slice(0, 2).map((s) => s.url).join(" ; ")}` };
  }
  return { avance: true, raison: `${suivi.length} page(s) lue(s), inchangée(s) depuis la relecture humaine du ${relecture}` };
}

/**
 * Nouveau contenu de data/veille/frais-auto.json : les plateformes qui avancent reçoivent la date du jour, les autres
 * gardent leur date précédente (on n'avance jamais une date sans contrôle réussi). Une date ne recule jamais.
 * @param {{ controle?: string, plateformes?: Record<string,string>, _info?: string }} avant
 * @param {string[]} idsSansEcart
 * @param {string} aujourdhui AAAA-MM-JJ
 */
export function fusionnerFraisAuto(avant, idsSansEcart, aujourdhui) {
  const plateformes = { ...(avant?.plateformes || {}) };
  for (const id of idsSansEcart) {
    if (!plateformes[id] || plateformes[id] < aujourdhui) plateformes[id] = aujourdhui;
  }
  const trie = Object.fromEntries(Object.keys(plateformes).sort().map((k) => [k, plateformes[k]]));
  return {
    _info:
      avant?._info ??
      "Écrit chaque nuit par scripts/veille-officielle.mjs (étape « grilles de frais », règles dans scripts/lib/frais-auto.mjs). Pour chaque plateforme : date du dernier contrôle automatique où TOUTES ses pages de frais suivies étaient lues et inchangées depuis l'enregistrement de leur référence (data/veille/etat.json, champ « depuis »), et où la relecture humaine des frais est postérieure ou égale à cet enregistrement. Une plateforme dont une page a changé, était illisible ou sans référence garde sa date précédente. Le robot ne modifie jamais un montant. Ne jamais écrire à la main.",
    controle: aujourdhui,
    plateformes: trie,
  };
}
