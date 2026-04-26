/**
 * lib/legal-disclaimers.ts
 *
 * Source unique de vérité pour TOUS les textes légaux récurrents :
 * disclaimers AMF, avertissements MiCA, mentions loi Influenceurs,
 * dates clés réglementaires.
 *
 * Pourquoi un module dédié ?
 *  - Audit conformité 26-04-2026 : on a constaté >5 wordings différents
 *    de "ceci n'est pas un conseil" éparpillés dans le code (Footer,
 *    AmfDisclaimer, mentions-legales, transparence, blog/[slug]).
 *    Une formulation incohérente d'un disclaimer juridique affaiblit
 *    sa valeur défensive en cas de saisine AMF/DGCCRF.
 *  - On veut pouvoir mettre à jour la formulation à un seul endroit
 *    quand la doctrine AMF DOC-2024-01 sera mise à jour ou quand le
 *    règlement MiCA Phase 2 entrera réellement en vigueur (1er juillet 2026).
 *
 * Convention :
 *  - Toutes les constantes sont des `string` plain-text (pas de JSX).
 *  - Le rendu JSX (couleurs, icônes, structure) reste à la charge des
 *    composants <AmfDisclaimer>, <RegulatoryFooter>, <AffiliateLink>.
 */

/* -------------------------------------------------------------------------- */
/*  Dates réglementaires clés                                                 */
/* -------------------------------------------------------------------------- */

/**
 * Date d'entrée en vigueur de MiCA Phase 2 — fin de la période transitoire
 * de 18 mois ouverte par l'art. 143 du règlement (UE) 2023/1114.
 *
 * À partir de cette date :
 *  - Tout PSAN qui n'a pas obtenu son agrément CASP doit cesser ses
 *    activités d'offre/exécution/réception-transmission d'ordres en UE.
 *  - Les utilisateurs voient leurs comptes gelés en dépôt/retrait sur
 *    les plateformes non-agréées (mais leurs fonds ne sont pas saisis).
 */
export const MICA_PHASE2_DATE = new Date("2026-07-01T00:00:00.000Z");

/**
 * Date de promulgation de la loi Influenceurs n°2023-451 du 9 juin 2023,
 * codifiée aux articles L121-1 et L132-2 du Code de la consommation.
 */
export const INFLUENCER_LAW_DATE = new Date("2023-06-09");

/* -------------------------------------------------------------------------- */
/*  AMF (Article 222-15 RG AMF + L321-1 CMF)                                  */
/* -------------------------------------------------------------------------- */

/**
 * Disclaimer AMF version COMPACTE — utilisé en pied de page, dans les
 * cards CTA, et partout où la place est limitée.
 */
export const AMF_DISCLAIMER_SHORT =
  "L'investissement en crypto-actifs comporte un risque élevé de perte totale en capital. " +
  "Cryptoreflex n'est ni conseiller en investissements financiers (CIF), ni prestataire " +
  "de services d'investissement (PSI). Les performances passées ne préjugent pas des " +
  "performances futures.";

/**
 * Disclaimer AMF version LONGUE — pour pages outils (calculateur fiscal,
 * simulateur ROI, comparateurs), articles fiscalité approfondis, et pages
 * où une formulation détaillée renforce la défense juridique.
 */
export const AMF_DISCLAIMER_FULL =
  "Cet article ne constitue pas un conseil en investissement personnalisé au sens de " +
  "l'article L.321-1 du Code monétaire et financier. " +
  AMF_DISCLAIMER_SHORT +
  " Avant toute décision patrimoniale significative, consultez un Conseiller en " +
  "Investissements Financiers (CIF) immatriculé à l'ORIAS, ou un avocat fiscaliste " +
  "pour les questions liées à la déclaration de vos cryptoactifs (formulaire 2086, " +
  "article 150 VH bis du CGI).";

/**
 * Mention de positionnement réglementaire — à inclure sur /transparence,
 * /a-propos, /mentions-legales pour documenter explicitement notre statut.
 *
 * Pourquoi cette formulation : elle utilise les mots-clés exacts de la
 * doctrine AMF (DOC-2024-01) qui qualifie un site comme le nôtre — éditeur
 * web rémunéré par affiliation — comme NON-soumis au régime PSAN/CASP.
 */
export const NOT_PSAN_NOT_CIF_NOTICE =
  "Cryptoreflex est un éditeur web indépendant. Il n'est ni Prestataire de Services " +
  "sur Actifs Numériques (PSAN, ex-régime français), ni Crypto-Asset Service Provider " +
  "(CASP, régime MiCA), ni Conseiller en Investissements Financiers (CIF). " +
  "Cryptoreflex ne détient jamais les fonds des utilisateurs, ne donne aucun conseil " +
  "personnalisé, et ne pratique pas la réception-transmission d'ordres. " +
  "Son activité se limite à la production de contenus éditoriaux (comparatifs, guides, " +
  "outils gratuits) et à la promotion via liens d'affiliation de plateformes elles-mêmes " +
  "agréées CASP au sens du règlement (UE) 2023/1114 (MiCA).";

/* -------------------------------------------------------------------------- */
/*  MiCA Phase 2 — risques utilisateurs                                       */
/* -------------------------------------------------------------------------- */

/**
 * Avertissement à afficher sur les fiches plateformes dont
 * `mica.atRiskJuly2026 === true` ou `mica.micaCompliant === false`.
 */
export const MICA_RISK_DISCLAIMER =
  "Plateforme à risque MiCA juillet 2026. Si l'agrément CASP n'est pas obtenu avant " +
  "le 1er juillet 2026, cette plateforme devra cesser ses activités d'offre et " +
  "d'exécution en Union européenne. Les utilisateurs résidents UE pourront voir leurs " +
  "fonctions de dépôt et de retrait suspendues. Aucun risque immédiat de saisie des " +
  "fonds, mais des délais de plusieurs semaines avant restitution sont possibles. " +
  "Vérifiez le statut auprès de l'AMF avant tout dépôt important.";

/**
 * Avertissement générique à afficher sur la page d'accueil et /comparatif
 * pendant la période de transition (avril → juin 2026).
 */
export const MICA_TRANSITION_NOTICE =
  "Période transitoire MiCA en cours. Le règlement MiCA Phase 2 (CASP) entre en " +
  "application le 1er juillet 2026. Cryptoreflex ne recommande activement que les " +
  "plateformes ayant déjà obtenu leur agrément CASP ou ayant une probabilité forte " +
  "de l'obtenir avant cette date. Statut détaillé sur /transparence.";

/* -------------------------------------------------------------------------- */
/*  Loi Influenceurs n°2023-451 du 9 juin 2023                                */
/* -------------------------------------------------------------------------- */

/**
 * Caption obligatoire sous chaque CTA d'affiliation — déjà rendue par
 * <AffiliateLink> via la prop `showCaption`. Constante dupliquée ici pour
 * permettre à d'autres composants (table de comparatif, sidebar /avis) de
 * l'utiliser sans dépendre de AffiliateLink.
 *
 * Sources :
 *  - Loi n°2023-451 du 9 juin 2023, art. 5 (identification claire et
 *    apparente du caractère commercial).
 *  - DGCCRF, recommandation pratique influenceurs (mai 2023) : la mention
 *    « Publicité » doit apparaître au-dessus ou directement à côté du
 *    contenu commercial, pas en bas de page seul.
 *  - Code de la consommation L121-1 (sanction max : 6 mois prison + 300k€).
 */
export const INFLUENCER_LAW_CAPTION =
  "Publicité — Cryptoreflex perçoit une commission";

/**
 * Mention longue à afficher sur /transparence et /affiliations pour
 * documenter explicitement notre conformité à la loi du 9 juin 2023.
 */
export const INFLUENCER_LAW_DISCLAIMER =
  "Conformément à la loi n°2023-451 du 9 juin 2023 visant à encadrer l'influence " +
  "commerciale, Cryptoreflex identifie de manière claire et apparente le caractère " +
  "commercial de chaque communication publicitaire. Tout lien d'affiliation est marqué " +
  "« Publicité — Cryptoreflex perçoit une commission » directement sous le bouton " +
  "concerné, et renvoie vers la présente page de transparence. Aucune communication " +
  "commerciale n'est dissimulée dans un contenu éditorial sans cette mention.";

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                   */
/* -------------------------------------------------------------------------- */

/**
 * Retourne le nombre de jours (entiers, arrondi inférieur) restant avant
 * MiCA Phase 2 par rapport à la date `now` passée en argument (par défaut :
 * date courante). Retourne 0 si la deadline est dépassée.
 *
 * On accepte une `now` injectable pour faciliter les tests et pour pouvoir
 * geler la date côté Server Component (ISR + revalidate=3600 → on évite les
 * incohérences "X jours" vs "X-1 jours" pendant la même heure d'invalidation).
 */
export function daysUntilMicaPhase2(now: Date = new Date()): number {
  const ms = MICA_PHASE2_DATE.getTime() - now.getTime();
  if (ms <= 0) return 0;
  return Math.floor(ms / (1000 * 60 * 60 * 24));
}

/**
 * Retourne true si MiCA Phase 2 est déjà en vigueur (1er juillet 2026 ou
 * postérieur). Utilisé pour basculer automatiquement les wordings côté UI
 * (« dans X jours » → « depuis le 1er juillet 2026 »).
 */
export function isMicaPhase2Active(now: Date = new Date()): boolean {
  return now.getTime() >= MICA_PHASE2_DATE.getTime();
}
