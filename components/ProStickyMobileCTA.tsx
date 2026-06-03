/**
 * ProStickyMobileCTA — NEUTRALISÉ (démonétisation juin 2026).
 *
 * Cryptoreflex est désormais 100 % gratuit : il n'y a plus d'abonnement
 * payant à pousser via un CTA sticky mobile. Ce composant ne rend donc
 * plus rien (`return null`).
 *
 * On conserve l'export par défaut et la signature de props (`enabled`,
 * `monthlyPrice`) pour ne casser aucun import résiduel côté pages.
 */
interface Props {
  /** Conservé pour compat : ignoré (plus de CTA payant). */
  enabled?: boolean;
  /** Conservé pour compat : ignoré (plus de prix affiché). */
  monthlyPrice?: string;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export default function ProStickyMobileCTA(_props: Props) {
  return null;
}
