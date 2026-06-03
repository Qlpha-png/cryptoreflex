/**
 * FreeUserDashboard — neutralisé (démonétisation juin 2026).
 *
 * Cryptoreflex est désormais 100 % gratuit : il n'existe plus de plan payant
 * ni d'upsell « Soutien ». Ce composant présentait un bloc commercial (prix,
 * CTAs /pro, features verrouillées). Il n'est plus monté nulle part — on le
 * neutralise en no-op tout en conservant l'export par défaut pour ne casser
 * aucun import résiduel éventuel.
 */
export default function FreeUserDashboard() {
  return null;
}
