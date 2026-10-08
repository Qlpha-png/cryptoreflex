import { fmtPrix, type Devise } from "@/lib/analyses-techniques";

/**
 * Mini-courbe des 30 dernières clôtures, en SVG rendu côté serveur (aucun JavaScript). Couleur neutre (ni vert ni rouge :
 * une couleur de hausse ou de baisse se lirait comme un jugement). Accessible : role="img" + description en texte.
 */
export default function MiniCourbe({
  closes,
  devise,
  largeur = 120,
  hauteur = 36,
  className = "",
}: {
  closes: number[];
  devise: Devise;
  largeur?: number;
  hauteur?: number;
  className?: string;
}) {
  if (closes.length < 2) return null;
  const min = Math.min(...closes);
  const max = Math.max(...closes);
  const pad = 2;
  const dx = (largeur - pad * 2) / (closes.length - 1);
  const y = (v: number) => (max === min ? hauteur / 2 : pad + (hauteur - pad * 2) * (1 - (v - min) / (max - min)));
  const points = closes.map((v, i) => `${(pad + i * dx).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
  const premier = closes[0];
  const dernier = closes[closes.length - 1];
  const label = `Clôtures des ${closes.length} derniers jours : de ${fmtPrix(premier, devise)} à ${fmtPrix(dernier, devise)} (plus bas ${fmtPrix(min, devise)}, plus haut ${fmtPrix(max, devise)})`;
  return (
    <svg
      viewBox={`0 0 ${largeur} ${hauteur}`}
      width={largeur}
      height={hauteur}
      role="img"
      aria-label={label}
      className={`block max-w-full overflow-visible ${className}`.trim()}
      data-mini-courbe=""
    >
      <title>{label}</title>
      <polyline points={points} fill="none" className="stroke-chart-line" strokeWidth={1.5} strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
      <circle cx={(pad + (closes.length - 1) * dx).toFixed(1)} cy={y(dernier).toFixed(1)} r={2.2} className="fill-fg" />
    </svg>
  );
}
