/**
 * Icône de marque C+ (lot B2) pour les images générées : favicon PNG (app/icon.tsx) et icône Apple (app/apple-icon.tsx).
 *
 * Même dessin que public/brand/cr-favicon-v1.svg et app/icon.svg (favicon du kit C+, cplus/systeme/logo/favicon.svg) :
 * plaque encre, soleil or, horizon crème, deux reflets or. Construit en <div> (le moteur d'ImageResponse, Satori,
 * ne lit pas les variables CSS) : les 3 teintes du kit sont donc écrites ici, UNE fois.
 * Grille de 32 unités : soleil = demi-disque de centre (16, 18) et de rayon 11 ; horizon (3, 19, 26 × 2) ;
 * reflets (8, 23, 16 × 2) et (12, 27, 8 × 2, opacité 0,7).
 */
const PLAQUE = "#172033"; // encre du kit (plate-ink)
const OR = "#F5A524"; // or de marque (gold)
const CREME = "#F3EDE2"; // crème du kit (fg Encre)

export function IconeMarque({ taille, arrondi = true }: { taille: number; arrondi?: boolean }) {
  const u = taille / 32;
  const barre = (x: number, y: number, l: number, couleur: string, opacite = 1) => (
    <div
      style={{
        position: "absolute",
        left: x * u,
        top: y * u,
        width: l * u,
        height: 2 * u,
        borderRadius: u,
        background: couleur,
        opacity: opacite,
      }}
    />
  );
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        position: "relative",
        background: PLAQUE,
        borderRadius: arrondi ? 7 * u : 0,
      }}
    >
      <div
        style={{
          position: "absolute",
          left: 5 * u,
          top: 7 * u,
          width: 22 * u,
          height: 11 * u,
          borderTopLeftRadius: 11 * u,
          borderTopRightRadius: 11 * u,
          background: OR,
        }}
      />
      {barre(3, 19, 26, CREME)}
      {barre(8, 23, 16, OR)}
      {barre(12, 27, 8, OR, 0.7)}
    </div>
  );
}
