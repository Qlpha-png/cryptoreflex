/**
 * Lot légal du 08/10/2026 — neutralisation, à la lecture, du texte des analyses techniques datées déjà publiées.
 *
 * Les 368 fichiers content/analyses-tech/*.mdx (gabarits successifs du robot) contiennent un vocabulaire de
 * recommandation près d'indicateurs : « signal haussier », « Survente — rebond possible », « Scénario haussier »,
 * « Acheteur / Vendeur », « Plafond probable », niveaux « supports / résistances » (cibles implicites), lien
 * « pour acheter ». En attendant les pages vivantes (lot L2 du regroupement, qui supprimera ces fichiers), la page
 * affiche une version neutre : sections de scénarios et de niveaux retirées, lectures remplacées par des
 * descriptions (« Prix au-dessus de la moyenne »). Les chiffres ne changent pas.
 */

/** Retire une section Markdown « ## Titre » (titre exact ou préfixe) jusqu'au prochain titre de niveau 2. */
function retirerSection(md: string, titre: RegExp): string {
  const lignes = md.split("\n");
  const out: string[] = [];
  let dedans = false;
  for (const l of lignes) {
    if (/^##\s/.test(l)) dedans = titre.test(l.replace(/^##\s+/, "").trim());
    if (!dedans) out.push(l);
  }
  return out.join("\n");
}

/** Remplacements exacts (gabarits connus), du plus long au plus court. */
const REMPLACEMENTS: [RegExp, string][] = [
  [/Surachat\s*[—–-]\s*risque de correction/g, "Zone de surachat (RSI au-dessus de 70)"],
  [/Survente\s*[—–-]\s*rebond possible/g, "Zone de survente (RSI en dessous de 30)"],
  [/Prix au-dessus \(signal haussier\)/g, "Prix au-dessus de la moyenne"],
  [/Prix en dessous \(prudence\)/g, "Prix en dessous de la moyenne"],
  [/\|\s*Acheteur\s*\|/g, "| Entre 45 et 70 |"],
  [/\|\s*Vendeur\s*\|/g, "| Entre 30 et 45 |"],
  [/\|\s*Plafond probable\s*\|/g, "| Bande haute |"],
  [/\|\s*Plancher probable\s*\|/g, "| Bande basse |"],
  [/\s*Le RSI signale [^.]*\./g, ""],
  [/\s*[—–-]\s*utile pour calibrer la taille de position et la distance au stop/g, ""],
  [/\s*N'investis que ce que tu peux te permettre de perdre, et fais tes propres recherches avant toute prise de position\./g, ""],
  [/^.*\bStop (logique|court terme)\b.*$/gm, ""],
  [/\s*\((momentum (haussier|baissier)[^)]*|zone d'indécision)\)/g, ""],
];

/** Lignes de liste qui renvoient vers une offre (« … pour acheter … »). */
const LIGNE_OFFRE = /^\s*-\s*\[[^\]]*\bacheter\b[^\]]*\]\([^)]*\)\s*$/i;

export function neutraliserAnalyse(md: string): string {
  let s = retirerSection(md, /^(Scénarios?|Niveaux clés|Supports et résistances|Stratégie|Plan de trading)\b/i);
  for (const [motif, par] of REMPLACEMENTS) s = s.replace(motif, par);
  s = s
    .split("\n")
    .filter((l) => !LIGNE_OFFRE.test(l))
    .join("\n");
  return s.replace(/\n{3,}/g, "\n\n");
}
