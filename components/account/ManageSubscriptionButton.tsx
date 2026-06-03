/**
 * ManageSubscriptionButton — neutralisé (démonétisation juin 2026).
 *
 * Cryptoreflex est désormais 100 % gratuit : plus d'abonnement Stripe à gérer,
 * donc plus de redirection vers le Customer Portal. Ce composant est orphelin
 * (plus monté nulle part). On le neutralise en no-op tout en conservant
 * l'export par défaut pour ne casser aucun import résiduel éventuel.
 */
export default function ManageSubscriptionButton() {
  return null;
}
