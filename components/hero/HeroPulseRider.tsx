"use client";

import { useEffect, useRef } from "react";

/**
 * HeroPulseRider — la mascotte moto-cross de lumière, MOTEUR V2
 * (retours propriétaire 2026-06-12 : « collée à la ligne », « on dirait
 * qu'elle va sous la terre », « fais un truc qui pourrait faire réel »).
 *
 * Le moteur V1 ancrait UN point sur la courbe et tournait autour de lui :
 * géométriquement, le châssis balayait SOUS la ligne pendant le backflip,
 * et l'angle de pente ignorait le ratio réel de l'écran. V2 = physique de
 * jeu 2D propre :
 *
 *  1. TOUT EN PIXELS MESURÉS — la polyline (%) est convertie en px au
 *     mount et à chaque resize (ResizeObserver) : les angles sont VRAIS
 *     quel que soit l'écran.
 *  2. DEUX ROUES INDÉPENDANTES — le terrain est échantillonné sous la
 *     roue arrière ET la roue avant (interpolation yAtX) ; la moto est
 *     la corde entre les deux contacts : elle ÉPOUSE les bosses comme
 *     une vraie moto-cross, jamais en porte-à-faux.
 *  3. GARDE AU SOL — 3 px de clearance le long de la normale (la flèche
 *     d'arc entre les deux roues passe sous la corde sur une bosse :
 *     la suspension l'absorbe). Par construction, rien ne pénètre.
 *  4. BACKFLIP EN FENÊTRE HAUTE — la rotation ne s'effectue qu'entre
 *     22 % et 78 % du saut, quand la hauteur (≥ 0.64 × apex) dépasse le
 *     demi-encombrement de la moto : le flip se fait DANS LE CIEL. Aux
 *     bords du saut, l'angle interpole pente de décollage → pente
 *     d'atterrissage (lue à l'avance dans le terrain).
 *  5. ATTERRISSAGE — squash de suspension (scaleY bref) + gerbe
 *     d'étincelles au point de contact réel.
 *
 * Perf : 1 rAF, transforms only, pause hors-viewport/onglet caché,
 * reduced-motion désactive tout, monté uniquement sur données réelles.
 */

interface Props {
  /** Polyline de la courbe en % du conteneur ([xPct, yPct]…, ~48 pts). */
  points: Array<[number, number]>;
}

const SPARK_COUNT = 6;
const PAUSE_BETWEEN_RUNS_MS = 2600;
const JUMP_MS = 1250;
/** Vitesse de croisière en px/s (modulée par la pente). */
const CRUISE_PX_S = 115;
/** Demi-empattement en px (roues du SVG à x=14/50 sur 64, rendu 88px). */
const HALF_WHEELBASE_PX = 25;
/** Garde au sol (suspension) en px. */
const CLEARANCE_PX = 3;
/** Hauteur d'apex du saut en px. */
const JUMP_APEX_PX = 96;

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

    /* ── Terrain en pixels (recalculé au resize) ────────────────────── */
    let terrain: Array<[number, number]> = [];
    let bandW = 0;
    let peakXs: number[] = [];

    const rebuildTerrain = () => {
      const rect = wrap.getBoundingClientRect();
      if (rect.width < 50 || rect.height < 50) return;
      bandW = rect.width;
      terrain = points.map(([xp, yp]) => [
        (xp / 100) * rect.width,
        (yp / 100) * rect.height,
      ]);
      // Sommets locaux marqués (en px maintenant) → points de saut.
      peakXs = [];
      for (let i = 2; i < terrain.length - 2; i++) {
        if (
          terrain[i][1] < terrain[i - 1][1] - 2 &&
          terrain[i][1] < terrain[i + 1][1] - 2
        ) {
          peakXs.push(terrain[i][0]);
        }
      }
    };

    /** Hauteur du terrain sous x (interpolation linéaire, clamp aux bords). */
    const yAtX = (x: number): number => {
      if (terrain.length < 2) return 0;
      if (x <= terrain[0][0]) return terrain[0][1];
      for (let i = 0; i < terrain.length - 1; i++) {
        const [x1, y1] = terrain[i];
        const [x2, y2] = terrain[i + 1];
        if (x <= x2) {
          const f = (x - x1) / Math.max(0.001, x2 - x1);
          return y1 + (y2 - y1) * f;
        }
      }
      return terrain[terrain.length - 1][1];
    };

    /** Pose au sol pour un x donné : centre, angle (rad) — 2 roues. */
    const groundPose = (x: number) => {
      const xr = x - HALF_WHEELBASE_PX;
      const xf = x + HALF_WHEELBASE_PX;
      const yr = yAtX(xr);
      const yf = yAtX(xf);
      const angle = Math.atan2(yf - yr, xf - xr);
      // Garde au sol le long de la normale (vers le haut de l'écran).
      const cx = x - Math.sin(angle) * -CLEARANCE_PX * 0; // x quasi inchangé
      const cy = (yr + yf) / 2 - Math.cos(angle) * CLEARANCE_PX;
      return { cx, cy, angle };
    };

    rebuildTerrain();
    const ro = new ResizeObserver(rebuildTerrain);
    ro.observe(wrap);

    /* ── Boucle ─────────────────────────────────────────────────────── */
    let raf = 0;
    let running = true;
    let visible = true;
    let x = 0; // abscisse du centre en px
    let lastTs = 0;
    let pauseUntil = 0;
    let sparkIdx = 0;
    let lastPeakX = -1;
    let jumpStart = 0;
    let jumpFromAngle = 0;
    let jumpLandAngle = 0;
    let landedFx = false;
    let squashUntil = 0;

    function emitSparks(px: number, py: number, wide = false) {
      const count = wide ? 4 : 3;
      const rect = wrap!.getBoundingClientRect();
      for (let k = 0; k < count; k++) {
        const s = sparkRefs.current[(sparkIdx + k) % SPARK_COUNT];
        if (!s) continue;
        const angle = -90 + (k - (count - 1) / 2) * (wide ? 42 : 55);
        s.style.left = `${(px / rect.width) * 100}%`;
        s.style.top = `${(py / rect.height) * 100}%`;
        s.style.setProperty("--spark-angle", `${angle}deg`);
        s.classList.remove("hero-spark-fire");
        void s.offsetWidth;
        s.classList.add("hero-spark-fire");
      }
      sparkIdx = (sparkIdx + count) % SPARK_COUNT;
    }

    /** Ease in-out cubique pour la rotation du flip. */
    const ease = (u: number) =>
      u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2;

    function frame(ts: number) {
      if (!running) return;
      raf = requestAnimationFrame(frame);
      if (!visible || document.hidden || terrain.length < 2) {
        lastTs = ts;
        return;
      }
      if (!lastTs) lastTs = ts;
      const dt = Math.min(64, ts - lastTs);
      lastTs = ts;
      if (ts < pauseUntil) return;

      const inJump = jumpStart > 0 && ts - jumpStart < JUMP_MS;

      // Pente locale pour la modulation de vitesse (descente = y monte).
      const slopePx =
        (yAtX(x + HALF_WHEELBASE_PX) - yAtX(x - HALF_WHEELBASE_PX)) /
        (2 * HALF_WHEELBASE_PX);
      const speed = inJump
        ? CRUISE_PX_S * 0.62
        : CRUISE_PX_S * (1 + slopePx * 0.9);
      x += (Math.max(CRUISE_PX_S * 0.45, Math.min(CRUISE_PX_S * 1.8, speed)) * dt) / 1000;

      if (x >= bandW - HALF_WHEELBASE_PX) {
        x = HALF_WHEELBASE_PX;
        lastPeakX = -1;
        jumpStart = 0;
        pauseUntil = ts + PAUSE_BETWEEN_RUNS_MS;
        rider!.style.opacity = "0";
        return;
      }
      if (x < HALF_WHEELBASE_PX) x = HALF_WHEELBASE_PX;
      rider!.style.opacity = "1";

      const pose = groundPose(x);
      let cy = pose.cy;
      let angleDeg = (pose.angle * 180) / Math.PI;

      if (inJump) {
        const p = (ts - jumpStart) / JUMP_MS;
        cy -= Math.sin(p * Math.PI) * JUMP_APEX_PX;
        // Rotation UNIQUEMENT dans la fenêtre haute [0.22, 0.78] : à
        // sin(0.22π)=0.64 × 96px ≈ 61px de garde, le flip se fait dans
        // le ciel — la moto ne peut géométriquement pas toucher la ligne.
        const w = Math.min(1, Math.max(0, (p - 0.22) / 0.56));
        const blend = jumpFromAngle + (jumpLandAngle - jumpFromAngle) * p;
        angleDeg = blend - 360 * ease(w);
        if (p > 0.94 && !landedFx) {
          landedFx = true;
          squashUntil = ts + 140;
          emitSparks(x, yAtX(x));
        }
      } else if (jumpStart > 0) {
        jumpStart = 0;
      }

      rider!.style.transform = `translate3d(${x}px, ${cy}px, 0)`;
      const squash = ts < squashUntil ? " scale(1.06, 0.9)" : "";
      flip!.style.transform = `rotate(${angleDeg}deg)${squash}`;

      // Décollage : on franchit un sommet (et pas déjà en l'air).
      if (!inJump) {
        for (const px of peakXs) {
          if (px > lastPeakX && x >= px && x - px < 14) {
            lastPeakX = px;
            jumpStart = ts;
            landedFx = false;
            jumpFromAngle = angleDeg;
            // Pente d'atterrissage anticipée (vitesse moyenne × durée).
            const landX = Math.min(
              bandW - HALF_WHEELBASE_PX,
              x + (CRUISE_PX_S * 0.62 * JUMP_MS) / 1000,
            );
            jumpLandAngle = (groundPose(landX).angle * 180) / Math.PI;
            break;
          }
        }
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
      ro.disconnect();
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
 * La moto-cross + rider en line-art néon, profil droit (viewBox 64×44).
 * Rendu 88×60.5 px desktop (calibré : lisible sans dominer le hero),
 * 64×44 px mobile via CSS. 2 couches : glow or diffus + traits nets.
 * Le point (32, 41.5) du viewBox = centre de l'empattement AU SOL —
 * c'est l'origine du système (cf. translate dans .hero-rider-svg).
 */
function RiderSvg() {
  return (
    <svg
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

      <g stroke="#F5A524" strokeWidth="4.5" strokeOpacity="0.22" strokeLinecap="round" strokeLinejoin="round" fill="none">
        <circle cx="14" cy="33" r="8.5" />
        <circle cx="50" cy="33" r="8.5" />
        <path d="M14 33 L26 26 L36 26 M26 26 L23 18 L36 17 L42 14 M36 26 L40 17" />
        <path d="M42 13 L50 33" />
        <path d="M30 7 L37 11 L44 12 M36 11 L31 17 L33 23" />
      </g>

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

      <g stroke="url(#rider-body)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none">
        <path d="M14 33 L26 26 L36 26" />
        <path d="M26 26 L23 18 L36 17 L42 14" />
        <path d="M36 26 L40 17" />
        <path d="M42 13 L50 33" />
        <path d="M43 24 Q50 20 57 24" />
        <path d="M41 13 L46 10" />
        <path d="M23 17 L31 16" />
      </g>

      <g stroke="#FFE9C2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none">
        <path d="M30 8 L37 12" />
        <path d="M33 10 L45 10.5" />
        <path d="M37 12 L32 18 L34 24" />
      </g>
      <circle cx="29" cy="6.5" r="3.4" fill="#0E1116" stroke="#FFE9C2" strokeWidth="2" />
      <path d="M31.5 5.5 L34.5 6.5" stroke="#7DD3FC" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}
