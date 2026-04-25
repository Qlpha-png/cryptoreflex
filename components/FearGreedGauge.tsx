/**
 * FearGreedGauge — Jauge SVG semi-circulaire pour l'index Fear & Greed.
 *
 * Server Component (pas de JS côté client) : calcule l'angle de l'aiguille
 * statiquement à partir de la value 0-100 et rend un SVG inline complet.
 *
 * Dégradé fixe rouge → orange → jaune → vert le long de l'arc, aiguille noire
 * positionnée selon la formule `angle = -90 + (value / 100) * 180` (angle en
 * degrés sur la base d'un arc demi-cercle horizontal, 0 en haut).
 *
 * A11y : <svg role="img" aria-label> + texte affiché en clair.
 * `prefers-reduced-motion` : aucune animation utilisée → conformité naturelle.
 */

interface Props {
  /** Score 0-100. */
  value: number;
  /** Label classification déjà localisé (ex. "Peur extrême"). */
  classification: string;
  /** Taille du SVG en px (largeur). Hauteur calculée = width / 2 + 60 (padding label). */
  size?: number;
}

export default function FearGreedGauge({
  value,
  classification,
  size = 360,
}: Props) {
  // Clamp 0..100
  const v = Math.max(0, Math.min(100, value));

  // Géométrie de la jauge
  // Arc demi-cercle de centre (cx, cy) avec rayon r, ouvert vers le bas.
  // On dessine de gauche (-180°) à droite (0°) en passant par le haut (-90°).
  const width = size;
  const height = Math.round(size / 2) + 60; // espace pour le label en bas
  const cx = width / 2;
  const cy = Math.round(size / 2) + 10; // arc abaissé pour laisser le score au-dessus
  const r = Math.round(size / 2) - 20;
  const stroke = Math.max(14, Math.round(size / 22));

  // Aiguille : -90° pour value=0 (gauche), 0° pour value=50 (haut), +90° pour value=100 (droite)
  // En SVG la rotation se fait depuis l'axe X positif (3h). On convertit :
  //   pour une aiguille verticale qui pointe vers le haut quand value=50,
  //   l'angle relatif au "haut" est -90 + (value/100)*180.
  const angleDeg = -90 + (v / 100) * 180;
  const angleRad = (angleDeg * Math.PI) / 180;

  // Tip de l'aiguille : on part du centre et on se projette sur un cercle
  // de rayon ~ r-12. On considère 0° = haut → composantes (sin, -cos).
  const needleR = r - 12;
  const tipX = cx + needleR * Math.sin(angleRad);
  const tipY = cy - needleR * Math.cos(angleRad);

  // Couleur principale selon la valeur (sert au texte central et à l'aiguille)
  const color = colorFor(v);

  // Path arc demi-cercle (de gauche à droite par le haut)
  const arcStart = `${cx - r},${cy}`;
  const arcEnd = `${cx + r},${cy}`;
  // A rx ry x-axis-rotation large-arc-flag sweep-flag x y
  const arcPath = `M ${arcStart} A ${r} ${r} 0 0 1 ${arcEnd}`;

  return (
    <div className="flex flex-col items-center">
      <svg
        role="img"
        aria-label={`Fear and Greed Index : ${v} sur 100, ${classification}`}
        viewBox={`0 0 ${width} ${height}`}
        width="100%"
        style={{ maxWidth: width }}
      >
        <defs>
          {/* Dégradé linéaire horizontal rouge → orange → jaune → vert */}
          <linearGradient id="fg-grad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#dc2626" /> {/* red-600 */}
            <stop offset="33%" stopColor="#f59e0b" /> {/* amber-500 */}
            <stop offset="66%" stopColor="#eab308" /> {/* yellow-500 */}
            <stop offset="100%" stopColor="#22c55e" /> {/* green-500 */}
          </linearGradient>
        </defs>

        {/* Arc gradient principal */}
        <path
          d={arcPath}
          fill="none"
          stroke="url(#fg-grad)"
          strokeWidth={stroke}
          strokeLinecap="round"
        />

        {/* Repères 0, 25, 50, 75, 100 */}
        {[0, 25, 50, 75, 100].map((tick) => {
          const tDeg = -90 + (tick / 100) * 180;
          const tRad = (tDeg * Math.PI) / 180;
          const tickInner = r - stroke / 2 - 6;
          const tickOuter = r + stroke / 2 + 4;
          const x1 = cx + tickInner * Math.sin(tRad);
          const y1 = cy - tickInner * Math.cos(tRad);
          const x2 = cx + tickOuter * Math.sin(tRad);
          const y2 = cy - tickOuter * Math.cos(tRad);
          const labelX = cx + (r + stroke / 2 + 18) * Math.sin(tRad);
          const labelY = cy - (r + stroke / 2 + 18) * Math.cos(tRad);
          return (
            <g key={tick}>
              <line
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke="currentColor"
                strokeOpacity="0.35"
                strokeWidth="2"
              />
              <text
                x={labelX}
                y={labelY}
                fontSize={12}
                fill="currentColor"
                fillOpacity="0.55"
                textAnchor="middle"
                dominantBaseline="middle"
              >
                {tick}
              </text>
            </g>
          );
        })}

        {/* Aiguille */}
        <line
          x1={cx}
          y1={cy}
          x2={tipX}
          y2={tipY}
          stroke={color}
          strokeWidth="4"
          strokeLinecap="round"
        />
        {/* Pivot central */}
        <circle cx={cx} cy={cy} r={8} fill={color} />
        <circle cx={cx} cy={cy} r={3} fill="#0a0a0a" />

        {/* Score affiché */}
        <text
          x={cx}
          y={cy - r / 2}
          textAnchor="middle"
          fontSize={Math.round(size / 7)}
          fontWeight="800"
          fill={color}
          style={{ fontFamily: "ui-monospace, SFMono-Regular, monospace" }}
        >
          {v}
          <tspan
            fontSize={Math.round(size / 18)}
            fill="currentColor"
            fillOpacity="0.55"
          >
            /100
          </tspan>
        </text>
      </svg>

      {/* Classification visuelle (en plus du SVG) */}
      <div
        className="mt-2 inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-semibold"
        style={{ color, borderColor: color + "55", backgroundColor: color + "12" }}
      >
        {classification}
      </div>
    </div>
  );
}

/** Couleur principale en fonction de la value (cohérent avec gradient). */
function colorFor(v: number): string {
  if (v <= 24) return "#dc2626"; // red-600 — Extreme Fear
  if (v <= 49) return "#f59e0b"; // amber-500 — Fear
  if (v <= 74) return "#eab308"; // yellow-500 — Neutral
  return "#22c55e"; // green-500 — Greed/Extreme Greed
}
