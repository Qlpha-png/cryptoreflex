"use client";

import { useEffect, useRef } from "react";

/**
 * HeroPulseRider — LA MASCOTTE (demande propriétaire 2026-06-12 : « une
 * vraie motocross avec une mascotte qui ride les bosses et fait des
 * figures »).
 *
 * Direction artistique : un RIDER DE LUMIÈRE — moto-cross + pilote en
 * line-art néon (traits or chaud + roues glacier), le même langage que
 * la ligne de vie qu'il chevauche. Pas de cartoon plat : une silhouette
 * de lumière, élégante de loin, détaillée de près.
 *
 * Physique (rAF unique, compositor-only) :
 *  - roule sur la VRAIE courbe BTC, s'incline selon la pente,
 *  - accélère dans les descentes, freine dans les montées,
 *  - DÉCOLLE aux sommets : trajectoire balistique + BACKFLIP complet,
 *  - atterrit dans une gerbe d'étincelles (système recyclé),
 *  - roues en rotation continue (CSS), suspension qui absorbe (squash
 *    léger à l'atterrissage).
 *
 * Perf : un seul rAF, transforms uniquement, 6 étincelles recyclées,
 * pause hors-viewport + onglet masqué. Désactivé en reduced-motion.
 * Compliance : élément décoratif aria-hidden, aucune promesse — le
 * rider tombe aussi dans les descentes que le marché.
 */

interface Props {
  /** Polyline de la courbe en % du conteneur ([xPct, yPct]…, ~48 pts). */
  points: Array<[number, number]>;
}

const SPARK_COUNT = 6;
const PAUSE_BETWEEN_RUNS_MS = 2600;
// FEEDBACK KEV — saut plus LONG et plus HAUT : la figure doit se LIRE.
const JUMP_MS = 1150;

export default function HeroPulseRider({ points }: Props) {
  const riderRef = useRef<HTMLDivElement | null>(null);
  const flipRef = useRef<HTMLDivElement | null>(null);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const sparkRefs = useRef<Array<HTMLSpanElement | null>>([]);

  useEffect(() => {
    if (points.length < 2) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const rider = riderRef.current;
    const flip = flipRef.current;
    const wrap = wrapRef.current;
    if (!rider || !flip || !wrap) return;

    // Sommets « sautables » : maximum local marqué (en %, y inversé).
    const peaks = new Set<number>();
    for (let i = 2; i < points.length - 2; i++) {
      if (
        points[i][1] < points[i - 1][1] - 0.3 &&
        points[i][1] < points[i + 1][1] - 0.3
      ) {
        peaks.add(i);
      }
    }

    let raf = 0;
    let running = true;
    let visible = true;
    let t = 0;
    let lastTs = 0;
    let pauseUntil = 0;
    let sparkIdx = 0;
    let lastPeak = -1;
    // État de saut
    let jumpStart = 0;
    let jumpFromAngle = 0;

    function emitSparks(xPct: number, yPct: number, wide = false) {
      const count = wide ? 4 : 3;
      for (let k = 0; k < count; k++) {
        const s = sparkRefs.current[(sparkIdx + k) % SPARK_COUNT];
        if (!s) continue;
        const angle = -90 + (k - (count - 1) / 2) * (wide ? 42 : 55);
        s.style.left = `${xPct}%`;
        s.style.top = `${yPct}%`;
        s.style.setProperty("--spark-angle", `${angle}deg`);
        s.classList.remove("hero-spark-fire");
        void s.offsetWidth;
        s.classList.add("hero-spark-fire");
      }
      sparkIdx = (sparkIdx + count) % SPARK_COUNT;
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

      const slope = (y2 - y1) / Math.max(0.2, x2 - x1);
      const inJump = jumpStart > 0 && ts - jumpStart < JUMP_MS;

      // FEEDBACK KEV (« trop vite ») — vitesse ÷2.2 : traversée ~11 s,
      // les inclinaisons et le freinage en montée deviennent lisibles.
      const speed = inJump ? 5.5 : 4.5 + slope * 2.5;
      t += (Math.max(2.4, Math.min(9, speed)) * dt) / 1000;

      if (t >= points.length - 1) {
        t = 0;
        lastPeak = -1;
        jumpStart = 0;
        pauseUntil = ts + PAUSE_BETWEEN_RUNS_MS;
        rider!.style.opacity = "0";
        return;
      }
      rider!.style.opacity = "1";

      const x = x1 + (x2 - x1) * frac;
      let y = y1 + (y2 - y1) * frac;
      const groundAngle = Math.atan2(y2 - y1, (x2 - x1) * 2.4) * (180 / Math.PI);

      let angle = groundAngle;
      if (inJump) {
        const p = (ts - jumpStart) / JUMP_MS;
        // Cloche balistique HAUTE (le saut doit se voir) + BACKFLIP -360°
        y -= Math.sin(p * Math.PI) * 26;
        angle = jumpFromAngle - p * 360;
        if (p > 0.92 && flip!.dataset.landed !== "1") {
          flip!.dataset.landed = "1";
          emitSparks(x, y1 + (y2 - y1) * frac, true);
        }
      } else if (jumpStart > 0) {
        jumpStart = 0;
        flip!.dataset.landed = "0";
      }

      rider!.style.left = `${x}%`;
      rider!.style.top = `${y}%`;
      flip!.style.transform = `rotate(${angle}deg)`;

      // Décollage : sommet franchi → saut + figure (1 fois par sommet)
      if (!inJump && peaks.has(i) && i !== lastPeak && frac > 0.4) {
        lastPeak = i;
        jumpStart = ts;
        jumpFromAngle = groundAngle;
        flip!.dataset.landed = "0";
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
      <div ref={riderRef} className="hero-rider">
        <div ref={flipRef} className="hero-rider-flip">
          <RiderSvg />
        </div>
      </div>
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

/**
 * La moto-cross + rider en line-art néon, profil droit.
 * 2 couches : glow or diffus dessous, traits nets dessus.
 * Roues : jantes glacier avec rayons en rotation (CSS .hero-rider-wheel).
 */
function RiderSvg() {
  return (
    <svg
      width="72"
      height="50"
      viewBox="0 0 64 44"
      fill="none"
      className="hero-rider-svg"
    >
      <defs>
        <linearGradient id="rider-body" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#F5A524" />
          <stop offset="1" stopColor="#FFE9C2" />
        </linearGradient>
      </defs>

      {/* ── COUCHE GLOW (mêmes formes, diffuses) ── */}
      <g stroke="#F5A524" strokeWidth="4.5" strokeOpacity="0.22" strokeLinecap="round" strokeLinejoin="round" fill="none">
        <circle cx="14" cy="33" r="8.5" />
        <circle cx="50" cy="33" r="8.5" />
        <path d="M14 33 L26 26 L36 26 M26 26 L23 18 L36 17 L42 14 M36 26 L40 17" />
        <path d="M42 13 L50 33" />
        <path d="M30 7 L37 11 L44 12 M36 11 L31 17 L33 23" />
      </g>

      {/* ── ROUES — jantes glacier, rayons en rotation ── */}
      <g className="hero-rider-wheel" style={{ transformOrigin: "14px 33px" }}>
        <circle cx="14" cy="33" r="8.5" stroke="#7DD3FC" strokeWidth="2" />
        <circle cx="14" cy="33" r="1.6" fill="#7DD3FC" />
        <path d="M14 25.5 L14 40.5 M6.6 33 L21.4 33 M8.8 27.8 L19.2 38.2" stroke="#7DD3FC" strokeWidth="1" strokeOpacity="0.7" />
      </g>
      <g className="hero-rider-wheel" style={{ transformOrigin: "50px 33px" }}>
        <circle cx="50" cy="33" r="8.5" stroke="#7DD3FC" strokeWidth="2" />
        <circle cx="50" cy="33" r="1.6" fill="#7DD3FC" />
        <path d="M50 25.5 L50 40.5 M42.6 33 L57.4 33 M44.8 27.8 L55.2 38.2" stroke="#7DD3FC" strokeWidth="1" strokeOpacity="0.7" />
      </g>

      {/* ── CHÂSSIS MOTO — or chaud ── */}
      <g stroke="url(#rider-body)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none">
        {/* bras oscillant + cadre bas */}
        <path d="M14 33 L26 26 L36 26" />
        {/* cadre : pivot → réservoir → colonne de direction */}
        <path d="M26 26 L23 18 L36 17 L42 14" />
        {/* amortisseur arrière */}
        <path d="M36 26 L40 17" />
        {/* fourche avant */}
        <path d="M42 13 L50 33" />
        {/* garde-boue avant */}
        <path d="M43 24 Q50 20 57 24" />
        {/* guidon */}
        <path d="M41 13 L46 10" />
        {/* selle */}
        <path d="M23 17 L31 16" />
      </g>

      {/* ── RIDER — penché attaque, blanc chaud ── */}
      <g stroke="#FFE9C2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none">
        {/* torse penché vers l'avant */}
        <path d="M30 8 L37 12" />
        {/* bras vers le guidon */}
        <path d="M33 10 L45 10.5" />
        {/* jambe pliée vers le repose-pied */}
        <path d="M37 12 L32 18 L34 24" />
      </g>
      {/* casque */}
      <circle cx="29" cy="6.5" r="3.4" fill="#0E1116" stroke="#FFE9C2" strokeWidth="2" />
      {/* visière glacier */}
      <path d="M31.5 5.5 L34.5 6.5" stroke="#7DD3FC" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}
