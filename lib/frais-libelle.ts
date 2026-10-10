/**
 * lib/frais-libelle.ts — libellé honnête d'une date de frais (lot Z6, 10/10/2026), sans aucune donnée : importable par un
 * composant client sans embarquer data/veille/frais-auto.json.
 *
 * Une date qui vient du contrôle automatique des grilles (lib/frais-auto.ts) ne se présente jamais comme une relecture humaine :
 * « grille officielle contrôlée automatiquement le … » (comme « Registre ESMA contrôlé automatiquement » pour MiCA). Une liste
 * qui mêle les deux natures reçoit un libellé neutre exact : « frais relus ou contrôlés automatiquement entre le … et le … ».
 */

/** Date affichée et sa nature : `auto` = contrôle automatique des grilles, sinon relecture humaine. */
export interface DateFrais {
  date: string | null;
  auto: boolean;
}

export const LIBELLE_FRAIS_AUTO = "grille officielle contrôlée automatiquement";
export const LIBELLE_FRAIS_AUTO_PLURIEL = "grilles officielles contrôlées automatiquement";
export const LIBELLE_FRAIS_MIXTE = "frais relus ou contrôlés automatiquement";

/** Dates seules d'une liste de DateFrais (pour <VerifieLe dates={…} />). */
export function datesDe(items: ReadonlyArray<DateFrais>): Array<string | null> {
  return items.map((i) => i.date);
}

/**
 * Libellé qui précède la date dans <VerifieLe>. `humain` est le libellé d'une relecture humaine (« frais relevés »,
 * « vérifié », « Frais vérifiés »…, ou "" dans une cellule de tableau). Toutes les dates viennent du contrôle automatique :
 * « grille(s) officielle(s) contrôlée(s) automatiquement » ; liste qui mêle les deux : « frais relus ou contrôlés
 * automatiquement » ; aucune : `humain` inchangé. La première lettre suit celle de `humain`.
 */
export function libelleFrais(
  items: ReadonlyArray<DateFrais>,
  humain: string,
  /** Libellés propres à la phrase (10/10/2026) : évite « Frais : frais relus… » ou « coût d'un achat grille… ». */
  phrase?: { auto?: string; mixte?: string },
): string {
  const lues = items.filter((i) => i.date);
  const nAuto = lues.filter((i) => i.auto).length;
  if (!nAuto) return humain;
  const mixte = nAuto < lues.length;
  const base = mixte
    ? (phrase?.mixte ?? LIBELLE_FRAIS_MIXTE)
    : (phrase?.auto ?? (lues.length > 1 ? LIBELLE_FRAIS_AUTO_PLURIEL : LIBELLE_FRAIS_AUTO));
  return /^[A-ZÉÈÀ]/.test(humain) ? base.charAt(0).toUpperCase() + base.slice(1) : base;
}
