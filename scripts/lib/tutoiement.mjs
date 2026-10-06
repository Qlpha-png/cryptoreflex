/**
 * scripts/lib/tutoiement.mjs — compteurs de tutoiement et de vouvoiement des fiches générées.
 *
 * Passe finale (06/10/2026) : scripts/generate-fiche-crypto.mjs comptait le tutoiement avec
 * /\b(tu|te|toi|ton|tes|t')\b/gi. En JavaScript, \b ne reconnaît que les lettres ASCII : « êtes », « côte » ou
 * « bâton » étaient comptés comme « tes », « te », « ton ». Une phrase entièrement vouvoyée donnait tuCount = 5 et
 * pouvait faire échouer l'audit de fiches correctes. Les frontières sont désormais Unicode (\p{L}, drapeau u).
 */

/* Mot isolé : ni lettre ni chiffre (Unicode) avant ou après. L'élision « t' » doit être suivie d'une lettre. */
const TU_RE = /(?<![\p{L}\p{N}])(?:(?:tu|te|toi|ton|tes)(?![\p{L}\p{N}'’])|t['’](?=\p{L}))/giu;
const VOUS_RE = /(?<![\p{L}\p{N}])(?:vous|votre|vos|vôtre|vôtres)(?![\p{L}\p{N}])/giu;

/** Nombre de marques de tutoiement (tu, te, toi, ton, tes, t'…). */
export function countTutoiement(text) {
  return (String(text ?? "").match(TU_RE) || []).length;
}

/** Nombre de marques de vouvoiement (vous, votre, vos, vôtre). */
export function countVouvoiement(text) {
  return (String(text ?? "").match(VOUS_RE) || []).length;
}
