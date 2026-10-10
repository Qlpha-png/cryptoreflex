/**
 * <ExplicationTaux> — définitions courtes des termes du repère <TauxSource> (reprise du lot Z5, 10/10/2026, juré
 * visiteur) : APR, APY, médiane sur 7 jours, stETH, et pourquoi lido.fi peut afficher un chiffre légèrement différent.
 * Une seule fois par page, sous le repère. Bloc repliable natif (<details>) : aucun JavaScript.
 */
export default function ExplicationTaux({ className }: { className?: string }) {
  return (
    <details className={className}>
      <summary className="cursor-pointer text-xs font-semibold text-fg/80 hover:text-fg">APR, APY, médiane, stETH : que signifient ces termes ?</summary>
      <p className="mt-2 text-xs leading-relaxed text-muted">
        APR : rendement annuel sans réinvestir les gains. APY : rendement annuel avec les gains réinvestis (un peu plus
        élevé). Médiane sur 7 jours : la valeur du milieu des 7 derniers taux quotidiens publiés par Lido ; un jour
        atypique ne la fait pas bouger. stETH : le jeton reçu quand on stake de l&apos;ETH chez Lido. Le site de Lido
        affiche une moyenne sur 7 jours, qui peut différer de quelques centièmes.
      </p>
    </details>
  );
}
