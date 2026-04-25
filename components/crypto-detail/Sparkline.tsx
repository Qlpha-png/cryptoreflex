/**
 * Sparkline 7j inline (SVG pur, zéro lib).
 * Usage : <Sparkline points={detail.sparkline7d} positive={detail.priceChange7d >= 0} />
 */
interface Props {
  points: number[];
  width?: number;
  height?: number;
  positive?: boolean;
  className?: string;
}

export default function Sparkline({
  points,
  width = 240,
  height = 60,
  positive = true,
  className = "",
}: Props) {
  if (!points?.length) {
    return (
      <div
        className={`flex items-center justify-center text-xs text-muted ${className}`}
        style={{ width, height }}
        aria-label="Sparkline indisponible"
      >
        —
      </div>
    );
  }

  const min = Math.min(...points);
  const max = Math.max(...points);
  const span = max - min || 1;
  const stepX = width / Math.max(points.length - 1, 1);

  const pathD = points
    .map((p, i) => {
      const x = i * stepX;
      const y = height - ((p - min) / span) * height;
      return `${i === 0 ? "M" : "L"}${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(" ");

  // Polygone fermé pour le "fill" sous la courbe.
  const fillD = `${pathD} L${width.toFixed(2)},${height} L0,${height} Z`;

  const stroke = positive ? "#22c55e" : "#f43f5e";
  const fill = positive ? "rgba(34,197,94,0.12)" : "rgba(244,63,94,0.12)";

  return (
    <svg
      role="img"
      aria-label="Évolution du prix sur 7 jours"
      viewBox={`0 0 ${width} ${height}`}
      width={width}
      height={height}
      className={className}
    >
      <path d={fillD} fill={fill} />
      <path d={pathD} fill="none" stroke={stroke} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
