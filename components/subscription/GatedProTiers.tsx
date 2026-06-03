/**
 * GatedProTiers — NEUTRALISÉ (démonétisation juin 2026).
 *
 * Ce composant gérait l'encart de consentement (renonciation au droit de
 * rétractation L221-28 12°) + l'interception des clics vers buy.stripe.com
 * avant un paiement d'abonnement Soutien.
 *
 * Cryptoreflex est désormais 100 % gratuit : il n'y a plus de paiement, donc
 * plus de gate de consentement ni d'interception Stripe. Le composant ne rend
 * plus rien et n'installe aucun listener.
 *
 * On conserve l'export par défaut et la signature de props (`enabled`) pour ne
 * casser aucun import résiduel.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export default function GatedProTiers(_props: { enabled?: boolean }) {
  return null;
}
