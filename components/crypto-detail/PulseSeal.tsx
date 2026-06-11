import { coilToRing } from "@/lib/pulse";

/**
 * PulseSeal — le sceau d'authenticité des fiches crypto (DA Pouls,
 * étape 8 du panel créatif).
 *
 * La sparkline 7 jours DU coin, enroulée en anneau lumineux or → glacier :
 * la même signature que la ligne de vie du hero, sous sa forme « sceau ».
 * 780 fiches, 780 anneaux uniques gravés par le marché — et chaque jour,
 * le sceau change parce que le cours a bougé.
 *
 * Server Component pur (SVG dans le HTML, zéro JS). Rendu UNIQUEMENT si
 * la sparkline est réelle : pas de sceau décoratif mensonger.
 * Compliance : pas d'axe ni d'échelle — un motif d'identité, pas un
 * graphique (le PriceChart interactif est juste en dessous sur la fiche).
 */

interface Props {
  /** Sparkline 7j du coin (168 points). Rien n'est rendu si absente. */
  sparkline?: number[];
  /** Diamètre en px. */
  size?: number;
  /** Nom du coin (label accessible). */
  coinName: string;
}

export default function PulseSeal({ sparkline, size = 56, coinName }: Props) {
  const ring = coilToRing(sparkline ?? [], size);
  if (!ring) return null;

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      role="img"
      aria-label={`Sceau Cryptoreflex : les 7 derniers jours du cours de ${coinName}, enroulés en anneau`}
      className="shrink-0"
    >
      <defs>
        <linearGradient id="seal-thermal" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#F5A524" />
          <stop offset="0.55" stopColor="#FFE9C2" />
          <stop offset="1" stopColor="#38BDF8" />
        </linearGradient>
      </defs>
      {/* 3 passes : glow large → glow serré → cœur (même langage que le hero) */}
      <path
        d={ring.path}
        fill="none"
        stroke="url(#seal-thermal)"
        strokeWidth={5}
        strokeOpacity={0.14}
        strokeLinecap="round"
      />
      <path
        d={ring.path}
        fill="none"
        stroke="url(#seal-thermal)"
        strokeWidth={2.2}
        strokeOpacity={0.45}
        strokeLinecap="round"
      />
      <path
        d={ring.path}
        fill="none"
        stroke="#FFE9C2"
        strokeWidth={1}
        strokeOpacity={0.9}
        strokeLinecap="round"
      />
      {/* La tête : « maintenant » */}
      <circle cx={ring.last[0]} cy={ring.last[1]} r={2} fill="#7DD3FC" />
    </svg>
  );
}
