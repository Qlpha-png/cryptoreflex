/**
 * scripts/lib/fusion-regles.mjs — R11 « fusion » (lot Z7, 10/10/2026) : la table de l'architecture 0 € (§ 2.2) EN CODE.
 *
 * Décision de Kev du 10/10/2026 : mise en service PROGRESSIVE. Le MODE par défaut est « propose » : une proposition devient
 * une demande de fusion étiquetée, JAMAIS fusionnée seule. La fusion automatique des frais n'existe que si la variable
 * explicite R11_FUSION_FRAIS vaut exactement « on » (dépôt GitHub → Settings → Variables), après deux semaines
 * d'observation. Toute autre valeur (absente, « ON », « true », « 1 », « oui ») = mode « propose ».
 *
 * Trois sorties possibles pour une famille de données :
 *  - « automatique »   : un script déterministe ou R11 peut écrire sans relecture (sous les conditions de la table) ;
 *  - « conditionnelle » : automatique SEULEMENT si toutes les conditions sont vertes ET l'interrupteur est « on » ;
 *  - « jamais »        : aucune fusion par un robot, quoi qu'on configure (lois, BOFiP, barème, DAC8, incidents).
 * Fonctions pures, zéro dépendance, testées (tests/lib/fusion-regles.test.ts).
 */

export const MODES = ["propose", "auto-frais"];
export const VARIABLE_INTERRUPTEUR_FRAIS = "R11_FUSION_FRAIS";

/**
 * La table de l'architecture § 2.2. `executant` : qui écrit aujourd'hui.
 *  - « scripts-deterministes » : déjà automatique, hors de R11 (lots Z4 à Z6) ; R11 n'a rien à décider ;
 *  - « r11 » : R11 (ce lot) décide et agit ;
 *  - « non-implemente » : la table l'autorise, mais aucun robot ne l'exécute encore (la veille ouvre un ticket) ;
 *  - « aucun » : personne, jamais.
 * `sinon` : sortie quand la fusion n'a pas lieu (ticket, proposition = demande de fusion, brouillon = demande de fusion en brouillon).
 */
export const FAMILLES = {
  "dates-controle": { libelle: "Dates de contrôle « rien n'a changé » (autoCheckedAt MiCA, frais, textes fiscaux)", fusion: "automatique", executant: "scripts-deterministes", sinon: "ticket", plafond: null },
  "mica-retrait": { libelle: "Statut MiCA dans le sens prudent (retrait ou suspension au registre)", fusion: "automatique", executant: "non-implemente", sinon: "ticket", plafond: null },
  "mica-agrement": { libelle: "Statut MiCA dans l'autre sens (nouvel agrément)", fusion: "jamais", executant: "aucun", sinon: "ticket", plafond: null },
  "calendrier-officiel": { libelle: "FOMC, réunions BCE, halving", fusion: "automatique", executant: "scripts-deterministes", sinon: "ticket", plafond: "8 dates par an attendues" },
  "cours-taux-rendements": { libelle: "Taux BCE, cours, rendements DeFi", fusion: "automatique", executant: "scripts-deterministes", sinon: "ticket", plafond: "cours < 60 %, change < 3 %/jour, rendements 0 à 25 %" },
  frais: { libelle: "Frais d'une plateforme (page officielle)", fusion: "conditionnelle", executant: "r11", sinon: "proposition", plafond: "0,5 point" },
  "lois-bofip-bareme-dac8": { libelle: "Lois, BOFiP, barème, DAC8 (zéro erreur fiscale)", fusion: "jamais", executant: "aucun", sinon: "brouillon", plafond: null },
  incidents: { libelle: "Incidents de sécurité", fusion: "jamais", executant: "aucun", sinon: "ticket", plafond: null },
};

/** Mode de mise en service d'après l'environnement (lecture stricte : seul « on » active la fusion automatique des frais). */
export function lireMode(env = {}) {
  const interrupteurFrais = String(env?.[VARIABLE_INTERRUPTEUR_FRAIS] ?? "") === "on";
  return { mode: interrupteurFrais ? "auto-frais" : "propose", interrupteurFrais };
}

/**
 * Décision de R11 pour une proposition.
 * @param {{ famille: string, mode?: string, interrupteurFrais?: boolean, niveau?: "automatique"|"a_relire"|"rejete", testsVerts?: boolean }} e
 * `niveau` : verdict du proposeur (toutes les propositions de la demande de fusion doivent être « automatique » pour qu'elle le soit).
 * `testsVerts` : tsc + tests de données verts sur la branche (faux ou inconnu = pas de fusion automatique).
 * @returns {{ action: "fusion-auto"|"proposition"|"brouillon"|"ticket"|"deja-automatique", fusionner: boolean, brouillon: boolean, etiquette: string|null, raisons: string[] }}
 */
export function decider({ famille, mode = "propose", interrupteurFrais = false, niveau, testsVerts } = {}) {
  const f = FAMILLES[famille];
  // échec fermé : une famille inconnue n'est jamais fusionnée
  if (!f) return { action: "ticket", fusionner: false, brouillon: false, etiquette: null, raisons: [`famille « ${famille} » absente de la table de fusion : ticket, aucune écriture`] };
  const sortie = (action, raisons, extra = {}) => ({ action, fusionner: false, brouillon: action === "brouillon", etiquette: action === "proposition" ? "proposition-frais" : action === "brouillon" ? "proposition-fiscale" : null, raisons, ...extra });
  if (f.fusion === "jamais") {
    return sortie(f.sinon, [`${f.libelle} : jamais de fusion par un robot (règle de Kev, architecture § 2.2)`]);
  }
  if (f.executant === "scripts-deterministes") return sortie("deja-automatique", [`${f.libelle} : déjà écrit par des scripts déterministes, R11 n'intervient pas`]);
  if (f.executant === "non-implemente") return sortie("ticket", [`${f.libelle} : la table l'autorise mais aucun robot ne l'exécute encore (ticket de la veille)`]);
  // famille « frais » (seule exécutée par R11 dans ce lot)
  if (niveau === "rejete" || (niveau !== "automatique" && niveau !== "a_relire")) return sortie("ticket", ["proposition rejetée ou verdict inconnu : ticket motivé, rien n'est écrit"]);
  if (niveau === "a_relire") return sortie("proposition", ["au moins une ligne est « à relire » (écart, gratuit/payant, textes dérivés) : demande de fusion à relire, jamais fusionnée seule"]);
  // niveau « automatique »
  if (mode !== "auto-frais" || interrupteurFrais !== true) {
    return sortie("proposition", [`mode « propose » (interrupteur ${VARIABLE_INTERRUPTEUR_FRAIS} ≠ « on ») : demande de fusion étiquetée, jamais fusionnée seule`]);
  }
  if (testsVerts !== true) return sortie("proposition", ["tests non verts ou non lancés : pas de fusion automatique"]);
  return { action: "fusion-auto", fusionner: true, brouillon: false, etiquette: "proposition-frais", raisons: ["littéralité, double lecture, écart ≤ 0,5 point, textes dérivés sans l'ancienne valeur, tests verts, interrupteur « on »"] };
}

/**
 * Décision pour UNE plateforme à partir des jugements de ses champs (sortie de `proposerPlateforme`). Une demande de fusion
 * = une plateforme : elle n'est « automatique » que si TOUTES ses lignes proposées le sont (sinon la plus prudente l'emporte).
 * @param {Array<{ statut: string, niveau?: string }>} champs
 * @returns {{ niveau: "automatique"|"a_relire"|null, mode: string, decision: ReturnType<typeof decider>|null }} décision nulle si aucune ligne n'est proposée
 */
export function decisionPourChamps(champs, env = {}, testsVerts = false) {
  const { mode, interrupteurFrais } = lireMode(env);
  const lignes = (champs || []).filter((c) => c.statut === "propose");
  if (!lignes.length) return { niveau: null, mode, decision: null };
  const niveau = lignes.every((c) => c.niveau === "automatique") ? "automatique" : "a_relire";
  return { niveau, mode, decision: decider({ famille: "frais", mode, interrupteurFrais, niveau, testsVerts }) };
}
