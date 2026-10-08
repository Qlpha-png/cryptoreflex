/**
 * lib/risk-text.ts — les textes d'avertissement sur les risques, à UN SEUL endroit (lot B3a, 08/10/2026).
 *
 * Lus par components/AmfDisclaimer.tsx (bandeaux des pages) et components/Footer.tsx (avertissement du pied).
 * Avant : le pied portait sa propre version (« perte partielle ou totale », renvoi à l'article L.321-1 du CMF) et
 * AmfDisclaimer une autre. Textes unifiés sur ceux d'AmfDisclaimer, sans aucune référence d'article (règle du
 * 05/10/2026 : ne citer aucun texte de loi sans l'avoir vérifié sur Légifrance ou amf-france.org).
 *
 *  - RISK.short : la phrase de base, reprise dans toutes les variantes d'AmfDisclaimer ;
 *  - RISK.long  : la phrase de base + la portée pédagogique (variante « educatif »), affichée dans le pied.
 */

const SHORT =
  "L’investissement en crypto-actifs comporte un risque élevé de perte totale en capital. " +
  "Cryptoreflex n’est pas un conseiller en investissements financiers. " +
  "Les performances passées ne préjugent pas des performances futures.";

const PORTEE =
  "Ce contenu a une vocation strictement pédagogique. Il ne constitue ni " +
  "une recommandation personnalisée, ni une incitation à acheter ou vendre " +
  "un crypto-actif. Pour toute décision patrimoniale, consultez un Conseiller " +
  "en Investissements Financiers (CIF) immatriculé à l’ORIAS.";

export const RISK = {
  short: SHORT,
  /** Portée pédagogique seule (variante « educatif » d'AmfDisclaimer). */
  portee: PORTEE,
  long: `${SHORT} ${PORTEE}`,
} as const;
