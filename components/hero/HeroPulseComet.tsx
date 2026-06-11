"use client";

import { useEffect, useRef } from "react";

/**
 * HeroPulseComet — LA COMÈTE qui ride la courbe (DA Pouls, sur idée
 * propriétaire 2026-06-12 : « un pilote qui prend les bosses » — version
 * lumière, cohérente avec la marque, zéro mascotte cartoon).
 *
 * Une tête de lumière parcourt la VRAIE courbe BTC en continu avec une
 * physique simple : elle ACCÉLÈRE dans les descentes, FREINE dans les
 * montées (la pente du marché devient une sensation), et émet une gerbe
 * d'étincelles au passage des sommets locaux (les « bosses »).
 *
 * Perf : un seul rAF, positionnement par transform (compositor-only),
 * 5 étincelles recyclées (pas d'allocation par frame). Pause complète
 * quand le hero sort du viewport (IntersectionObserver) ou que l'onglet
 * est masqué. Désactivée en prefers-reduced-motion. ~2.5 KB gzip.
 */

interface Props {
  /** Polyline de la courbe en % du conteneur ([xPct, yPct]…, ~96 pts). */
  points: Array<[number, number]>;
}

const SPARK_COUNT = 5;
const PAUSE_BETWEEN_RUNS_MS = 1800;

export default function HeroPulseComet({ points }: Props) {
  const cometRef = useRef<HTMLSpanElement | null>(null);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const sparkRefs = useRef<Array<HTMLSpanElement | null>>([]);

  useEffect(() => {
    if (points.length < 2) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const comet = cometRef.current;
    const wrap = wrapRef.current;
    if (!comet || !wrap) return;

    // Sommets locaux (les « bosses ») : y plus haut (valeur plus petite)
    // que les deux voisins, avec un seuil pour ignorer le bruit.
    const peaks = new Set<number>();
    for (let i = 1; i < points.length - 1; i++) {
      if (
        points[i][1] < points[i - 1][1] - 0.15 &&
        points[i][1] < points[i + 1][1] - 0.15
      ) {
        peaks.add(i);
      }
    }

    let raf = 0;
    let running = true;
    let visible = true;
    let t = 0; // position fractionnaire le long de la polyline [0, n-1]
    let lastTs = 0;
    let pauseUntil = 0;
    let sparkIdx = 0;
    let lastPeakFired = -1;

    function emitSparks(xPct: number, yPct: number) {
      // 3 étincelles recyclées par bosse, directions variées par index.
      for (let k = 0; k < 3; k++) {
        const s = sparkRefs.current[(sparkIdx + k) % SPARK_COUNT];
        if (!s) continue;
        const angle = -90 + (k - 1) * 55 + (sparkIdx % 2 ? 12 : -12);
        s.style.left = `${xPct}%`;
        s.style.top = `${yPct}%`;
        s.style.setProperty("--spark-angle", `${angle}deg`);
        // Redéclenche l'animation CSS (recyclage propre)
        s.classList.remove("hero-spark-fire");
        void s.offsetWidth;
        s.classList.add("hero-spark-fire");
      }
      sparkIdx = (sparkIdx + 3) % SPARK_COUNT;
    }

    function frame(ts: number) {
      if (!running) return;
      raf = requestAnimationFrame(frame);
      if (!visible || document.hidden) {
        lastTs = ts;
        return;
      }
      if (!lastTs) lastTs = ts;
      const dt = Math.min(64, ts - lastTs);
      lastTs = ts;
      if (ts < pauseUntil) return;

      const i = Math.min(points.length - 2, Math.floor(t));
      const frac = t - i;
      const [x1, y1] = points[i];
      const [x2, y2] = points[i + 1];

      // Physique : pente descendante (y augmente) → accélère ; montée →
      // freine. Vitesse en « points de polyline par seconde ».
      const slope = (y2 - y1) / Math.max(0.2, x2 - x1); // >0 = descente
      const speed = 11 + slope * 5.5; // base 11 pts/s, modulation ±
      t += (Math.max(5.5, Math.min(22, speed)) * dt) / 1000;

      if (t >= points.length - 1) {
        t = 0;
        lastPeakFired = -1;
        pauseUntil = ts + PAUSE_BETWEEN_RUNS_MS;
        comet!.style.opacity = "0";
        return;
      }
      comet!.style.opacity = "1";

      const x = x1 + (x2 - x1) * frac;
      const y = y1 + (y2 - y1) * frac;
      comet!.style.left = `${x}%`;
      comet!.style.top = `${y}%`;
      // La traînée s'oriente selon la pente (rotation du pseudo-élément)
      const angle = Math.atan2(y2 - y1, (x2 - x1) * 2.6) * (180 / Math.PI);
      comet!.style.setProperty("--comet-angle", `${angle}deg`);

      // Bosse franchie → étincelles (une fois par sommet et par passage)
      if (peaks.has(i) && i !== lastPeakFired && frac > 0.5) {
        lastPeakFired = i;
        emitSparks(points[i][0], points[i][1]);
      }
    }

    const io = new IntersectionObserver(
      (entries) => {
        visible = entries[0]?.isIntersecting ?? true;
      },
      { threshold: 0 },
    );
    io.observe(wrap);

    raf = requestAnimationFrame(frame);
    return () => {
      running = false;
      cancelAnimationFrame(raf);
      io.disconnect();
    };
  }, [points]);

  return (
    <div ref={wrapRef} className="pointer-events-none absolute inset-0" aria-hidden="true">
      <span ref={cometRef} className="hero-pulse-comet" />
      {Array.from({ length: SPARK_COUNT }, (_, i) => (
        <span
          key={i}
          ref={(el) => {
            sparkRefs.current[i] = el;
          }}
          className="hero-spark"
        />
      ))}
    </div>
  );
}
