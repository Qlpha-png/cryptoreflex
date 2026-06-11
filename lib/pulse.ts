/**
 * lib/pulse — géométrie de la « ligne de vie » du marché (DA Pouls
 * Incandescent, panel créatif 2026-06-11).
 *
 * Fonctions PURES, server-safe : transforment une sparkline (points de
 * prix horaires CoinGecko/Binance) en path SVG lissé prêt à être rendu
 * en 4 passes de lumière (bloom → halo → glow → cœur).
 *
 * Réutilise l'algorithme Catmull-Rom → Bézier de HeroPriceChart
 * (extrait ici pour servir aussi le hero, la navbar et les sceaux de
 * fiches sans dupliquer le code).
 */

export interface PulseGeometry {
  /** Path SVG de la ligne lissée. */
  line: string;
  /** Path fermé (ligne + base) pour l'aplat dégradé sous la courbe. */
  area: string;
  /** Coordonnées [x, y] du dernier point (ancrage de la tête pulsante). */
  last: [number, number];
  /** Coordonnées [x, y] du premier point. */
  first: [number, number];
}

/** Catmull-Rom → cubic Bézier pour une courbe douce (tension 1). */
export function smoothPath(pts: Array<[number, number]>): string {
  if (pts.length < 2) return "";
  let d = `M${pts[0][0].toFixed(2)},${pts[0][1].toFixed(2)}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] ?? p2;
    const c1x = p1[0] + (p2[0] - p0[0]) / 6;
    const c1y = p1[1] + (p2[1] - p0[1]) / 6;
    const c2x = p2[0] - (p3[0] - p1[0]) / 6;
    const c2y = p2[1] - (p3[1] - p1[1]) / 6;
    d += ` C${c1x.toFixed(2)},${c1y.toFixed(2)} ${c2x.toFixed(2)},${c2y.toFixed(2)} ${p2[0].toFixed(2)},${p2[1].toFixed(2)}`;
  }
  return d;
}

/**
 * Réduit une série à `target` points (moyenne par buckets) — une ligne
 * monumentale n'a pas besoin des 168 points bruts, et moins de points =
 * un path plus court à parser et une courbe plus calme.
 */
export function downsample(points: number[], target: number): number[] {
  if (points.length <= target) return points;
  const bucket = points.length / target;
  const out: number[] = [];
  for (let i = 0; i < target; i++) {
    const start = Math.floor(i * bucket);
    const end = Math.max(start + 1, Math.floor((i + 1) * bucket));
    let sum = 0;
    for (let j = start; j < end; j++) sum += points[j];
    out.push(sum / (end - start));
  }
  // Préserver la valeur EXACTE du dernier point (c'est « maintenant »,
  // là où la tête pulse — une moyenne mentirait sur le prix courant).
  out[out.length - 1] = points[points.length - 1];
  return out;
}

/**
 * Construit la géométrie de la ligne dans un viewBox arbitraire.
 * `padTop`/`padBottom` réservent l'amplitude verticale utile.
 */
export function buildPulseGeometry(
  points: number[],
  viewW: number,
  viewH: number,
  padTop: number,
  padBottom: number,
): PulseGeometry | null {
  if (!points || points.length < 2) return null;
  const min = Math.min(...points);
  const max = Math.max(...points);
  const span = max - min || 1;
  const innerH = viewH - padTop - padBottom;
  const step = viewW / (points.length - 1);

  const coords: Array<[number, number]> = points.map((v, i) => [
    i * step,
    padTop + innerH - ((v - min) / span) * innerH,
  ]);

  const line = smoothPath(coords);
  const area = `${line} L${viewW},${viewH} L0,${viewH} Z`;

  return {
    line,
    area,
    last: coords[coords.length - 1],
    first: coords[0],
  };
}

/**
 * Sparkline de secours déterministe (API down) : ondulation douce,
 * AUCUNE donnée interactive ne doit s'y brancher (ni chip prix, ni
 * scrub) — c'est un décor honnête, pas une donnée.
 */
export function fallbackSpark(n = 96): number[] {
  const out: number[] = [];
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1);
    out.push(
      Math.sin(t * Math.PI * 2.2) * 0.5 +
        Math.sin(t * Math.PI * 5.7 + 1.3) * 0.22 +
        t * 0.6,
    );
  }
  return out;
}

/**
 * coilToRing — LE SCEAU (panel créatif, étape 8) : la même sparkline 7j,
 * ENROULÉE en anneau. Une signature, deux formes : déroulée = pouls
 * monumental du hero, enroulée = sceau d'authenticité des fiches.
 *
 * Géométrie polaire : l'angle parcourt 360° moins un `gap` (anneau
 * ouvert, l'ouverture pointe en haut — la fin du tracé = « maintenant »),
 * le rayon module avec le prix normalisé. Path lissé Catmull-Rom.
 */
export function coilToRing(
  points: number[],
  size: number,
  gapDeg = 24,
): { path: string; last: [number, number] } | null {
  if (!points || points.length < 8) return null;
  const pts = downsample(points, 48);
  const min = Math.min(...pts);
  const max = Math.max(...pts);
  const span = max - min || 1;

  const cx = size / 2;
  const cy = size / 2;
  const innerR = size * 0.3;
  const amp = size * 0.13;
  const startAngle = -90 + gapDeg / 2;
  const sweep = 360 - gapDeg;

  const coords: Array<[number, number]> = pts.map((v, i) => {
    const t = i / (pts.length - 1);
    const a = ((startAngle + t * sweep) * Math.PI) / 180;
    const r = innerR + ((v - min) / span) * amp;
    return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
  });

  return { path: smoothPath(coords), last: coords[coords.length - 1] };
}

/**
 * Position du stop « or » du gradient thermique selon le Fear & Greed
 * (0-100). Greed → l'or s'étend ; Fear → le glacier remonte. Jamais de
 * vert/rouge : la température n'est PAS un signal d'achat.
 */
export function thermalGoldStop(fearGreed: number | null | undefined): number {
  if (typeof fearGreed !== "number" || !Number.isFinite(fearGreed)) return 0.45;
  const t = Math.min(1, Math.max(0, (fearGreed - 25) / 50));
  return 0.35 + 0.25 * t;
}
