/**
 * PricingPriceDisplay — NEUTRALISÉ (démonétisation juin 2026).
 *
 * Cet îlot Client gérait l'A/B testing de l'affichage prix d'abonnement
 * (variants "2,99 €/mois", "annual-upfront", "cafe-frame"). Cryptoreflex
 * est désormais 100 % gratuit : plus aucun prix d'abonnement à afficher.
 *
 * Le composant rend désormais un libellé neutre « Gratuit » et n'a plus
 * besoin de l'A/B testing. On conserve l'export par défaut et la signature
 * de props (drop-in) pour ne casser aucun import résiduel.
 */

interface PricingPriceDisplayProps {
  /** Conservé pour compat : ignoré (plus de prix payant). */
  monthlyPrice?: string;
  /** Conservé pour compat : ignoré (plus de prix payant). */
  annualPrice?: string;
  /** Conservé pour compat : ignoré (plus de prix payant). */
  defaultUnit?: string;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export default function PricingPriceDisplay(_props: PricingPriceDisplayProps) {
  return (
    <div className="mt-5 flex items-baseline gap-1">
      <span className="text-3xl sm:text-4xl font-extrabold text-white">
        Gratuit
      </span>
    </div>
  );
}
