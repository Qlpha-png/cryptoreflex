/**
 * CompareSparkline — Server Component qui rend un mini-graphe SVG inline
 * pour le comparateur. Utilise sparkline7d (168 pts horaires) deja fetched
 * par fetchCoinDetail.
 *
 * BATCH 61 (2026-05-04) — Ajoute un visuel rapide "trend 7j" dans le
 * tableau side-by-side pour aider l'utilisateur a comparer les momentum
 * d'un coup d'oeil (sans avoir a interpreter +X.X% froid).
 *
 * Pas de dependance externe (pas Recharts -- overkill). Pure SVG path
 * normalisee aux dimensions container, color-coded selon trend (vert si
 * up, rose si down). Server rendered = 0 KB JS, instantane.
 */

interface Props {
  /** Donnees prix 7j (168 pts horaires). Si null/empty -> placeholder. */
  data: number[] | null | undefined;
  /** Variation 7d en %. Determine la couleur (positif=vert, negatif=rose). */
  change7d: number | null;
  /** Largeur SVG en pixels. */
  width?: number;
  /** Hauteur SVG en pixels. */
  height?: number;
}

export default function CompareSparkline({
  data,
  change7d,
  width = 100,
  height = 32,
}: Props) {
  if (!data || data.length < 2) {
    return (
      <span className="inline-block text-[10px] text-muted italic">
        Pas de donnees
      </span>
    );
  }

  // Calcule min/max pour normaliser les Y.
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1; // Eviter division par zero si plat.

  // Echantillonne max 50 points pour rester leger sur de grosses series.
  const step = Math.max(1, Math.floor(data.length / 50));
  const sampled: number[] = [];
  for (let i = 0; i < data.length; i += step) sampled.push(data[i]);
  if (sampled[sampled.length - 1] !== data[data.length - 1]) {
    sampled.push(data[data.length - 1]);
  }

  // Genere les coords SVG.
  const points = sampled.map((y, i) => {
    const x = (i / (sampled.length - 1)) * width;
    const ny = height - ((y - min) / range) * height;
    return `${x.toFixed(1)},${ny.toFixed(1)}`;
  });
  const path = `M${points.join(" L")}`;

  // Couleur selon trend.
  const isUp = change7d != null && change7d >= 0;
  const stroke = isUp ? "#22c55e" : "#f43f5e"; // accent-green vs accent-rose
  const fillOpacity = 0.12;

  // Path d'aire pour fond degrade (fermer en bas).
  const areaPath = `${path} L${width},${height} L0,${height} Z`;

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className="block overflow-visible"
      aria-label={`Evolution 7 jours : ${isUp ? "hausse" : "baisse"} ${
        change7d != null ? `${change7d.toFixed(1)}%` : ""
      }`}
    >
      <path d={areaPath} fill={stroke} fillOpacity={fillOpacity} />
      <path
        d={path}
        fill="none"
        stroke={stroke}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
