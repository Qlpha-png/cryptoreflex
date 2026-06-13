"use client";

import { useEffect, useRef } from "react";

/**
 * HeroPulseRider — la mascotte moto-cross de lumière, MOTEUR V2.2
 * (retours propriétaire 2026-06-12 : « sauter depuis la bosse d'avant
 * au lieu d'escalader », « des capteurs qui détectent si la courbe
 * change car c'est du live »).
 *
 *  1. CAPTEUR DE COURBE — le terrain est échantillonné DIRECTEMENT sur
 *     le path SVG affiché (getPointAtLength sur le cœur du pouls) :
 *     fidélité parfaite au trait, quel que soit son lissage. Un
 *     MutationObserver surveille l'attribut `d` : si la courbe change
 *     (données live, re-render), le terrain ET le plan de sauts sont
 *     reconstruits — le rider s'adapte sans remount. ResizeObserver
 *     couvre les changements de géométrie. Fallback : polyline props.
 *  2. DEUX ROUES TANGENTES — le profil est échantillonné sous TOUTE la
 *     largeur de chaque pneu : le flanc ne mord jamais une paroi. La
 *     moto est la corde entre les deux contacts.
 *  3. SAUTS PLANIFIÉS — au rebuild du terrain, les segments
 *     infranchissables sont détectés : MUR montant (pente > ~51° sur
 *     ≥ 30 px) → décollage depuis l'épaule douce AVANT le pied,
 *     atterrissage après le sommet ; FALAISE descendante → décollage au
 *     bord, atterrissage au pied. La moto ne « grimpe » plus les murs :
 *     elle les saute, comme une vraie moto-cross. Les sommets restants
 *     donnent des sauts plaisir espacés.
 *  4. VOL BALISTIQUE PUR — pendant un saut, la trajectoire est une
 *     parabole décollage → atterrissage, INDÉPENDANTE du relief
 *     survolé (fini le « bond » en plein vol quand le terrain remonte).
 *     Backflip uniquement sur les gros sauts, en fenêtre haute, autour
 *     du centre de masse (pivot rampé sin(p·π)) ; petits sauts = pitch
 *     balistique léger, plus naturel. Le point d'atterrissage est relu
 *     chaque frame : si la courbe bouge en plein vol, le rider vise la
 *     nouvelle position.
 *  5. ANTI-SACCADE — angle amorti (τ 150 ms, borne 200 °/s) et vitesse
 *     lissée (EMA 200 ms, clamp 1.45×) : validé au banc télémétrique.
 *
 * Perf : 1 rAF, transforms only, échantillonnage du path uniquement au
 * rebuild (jamais dans la boucle), pause hors-viewport/onglet caché,
 * reduced-motion désactive tout, monté uniquement sur données réelles.
 */

interface Props {
  /** Polyline de la courbe en % du conteneur — FALLBACK si le path SVG
      n'est pas trouvable dans le DOM ([xPct, yPct]…, ~48 pts). */
  points: Array<[number, number]>;
}

type Jump = {
  takeoff: number;
  land: number;
  apex: number;
  flip: boolean;
  /** Sens de la figure : -360 backflip (murs), +360 frontflip (falaises,
      rotation avant naturelle en descente). Les sauts plaisir alternent. */
  spin: number;
  dur: number;
  kind: "gap" | "wall" | "cliff" | "fun";
};

const SPARK_COUNT = 10;
const PAUSE_BETWEEN_RUNS_MS = 2600;
/** Vitesse de croisière en px/s (modulée par la pente, lissée EMA). */
const CRUISE_PX_S = 95;
/** Demi-empattement en px (roues du SVG v3.1 à x=15/50, rendu 88px). */
const HALF_WHEELBASE_PX = 24;
/** Rayon de roue rendu (8 unités viewBox × 1.375). */
const WHEEL_R_PX = 11;
/** Garde au sol : avec les roues posées TANGENTES au terrain (géométrie
    exacte), 3.5 px suffisent pour que le pneu repose sur le bord du trait
    (cœur 1.75 px + glow) au lieu de baigner dedans. */
const CLEARANCE_PX = 3.5;

export default function HeroPulseRider({ points }: Props) {
  const riderRef = useRef<HTMLDivElement | null>(null);
  const flipRef = useRef<HTMLDivElement | null>(null);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const sparkRefs = useRef<Array<HTMLSpanElement | null>>([]);
  /** Traînée de vol : 2 échos de la moto, retardés de 70/140 ms. */
  const ghostRefs = useRef<Array<HTMLDivElement | null>>([]);

  useEffect(() => {
    if (points.length < 2) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const rider = riderRef.current;
    const flip = flipRef.current;
    const wrap = wrapRef.current;
    if (!rider || !flip || !wrap) return;
    // Le SVG du pouls est un sibling : on remonte à la bande commune.
    const band = wrap.parentElement;

    /* ── Terrain en pixels + plan de sauts (rebuild au resize/mutation) ── */
    let terrain: Array<[number, number]> = [];
    let bandW = 0;
    let bandH = 0;
    let jumps: Jump[] = [];
    let jumpIdx = 0;
    // ÉCHELLE MOBILE : le SVG est rendu 88 px desktop / 64 px mobile
    // (cf. CSS .hero-rider-svg). Le moteur scale TOUTES ses cotes moto
    // (empattement, rayon de roue, garde, apex, pivot) — sinon les roues
    // mobiles flottent à ~3 px au-dessus du trait.
    let S = 1;
    let halfWB = HALF_WHEELBASE_PX;
    let wheelR = WHEEL_R_PX;
    let clear = CLEARANCE_PX;
    let x = HALF_WHEELBASE_PX; // abscisse du centre en px

    /** CAPTEUR principal : échantillonne le path SVG réellement affiché
        (cœur du pouls). Coordonnées viewBox → px via le rect mesuré
        (preserveAspectRatio="none"). Renvoie null si indisponible. */
    const sampleDomPath = (rect: DOMRect): Array<[number, number]> | null => {
      if (!band) return null;
      const paths = band.querySelectorAll<SVGPathElement>("path.hero-pulse-path");
      const core = paths[paths.length - 1];
      const svg = core?.ownerSVGElement;
      if (!core || !svg) return null;
      const vb = svg.viewBox.baseVal;
      if (!vb || vb.width < 1 || vb.height < 1) return null;
      let total = 0;
      try {
        total = core.getTotalLength();
      } catch {
        return null;
      }
      if (!total || !Number.isFinite(total)) return null;
      const N = 220;
      const out: Array<[number, number]> = [];
      let prevX = -Infinity;
      for (let i = 0; i <= N; i++) {
        const pt = core.getPointAtLength((i / N) * total);
        const px = ((pt.x - vb.x) / vb.width) * rect.width;
        const py = ((pt.y - vb.y) / vb.height) * rect.height;
        if (px <= prevX + 0.05) continue; // garde la monotonie en x
        out.push([px, py]);
        prevX = px;
      }
      return out.length >= 16 ? out : null;
    };

    /** Fallback : densifie la polyline props sur la même courbe
        Catmull-Rom que le rendu (6 échantillons Bézier par segment). */
    const fallbackFromProps = (rect: DOMRect): Array<[number, number]> => {
      const raw: Array<[number, number]> = points.map(([xp, yp]) => [
        (xp / 100) * rect.width,
        (yp / 100) * rect.height,
      ]);
      const out: Array<[number, number]> = [];
      for (let i = 0; i < raw.length - 1; i++) {
        const p0 = raw[i - 1] ?? raw[i];
        const p1 = raw[i];
        const p2 = raw[i + 1];
        const p3 = raw[i + 2] ?? p2;
        const c1x = p1[0] + (p2[0] - p0[0]) / 6;
        const c1y = p1[1] + (p2[1] - p0[1]) / 6;
        const c2x = p2[0] - (p3[0] - p1[0]) / 6;
        const c2y = p2[1] - (p3[1] - p1[1]) / 6;
        for (let k = 0; k < 6; k++) {
          const u = k / 6;
          const v = 1 - u;
          out.push([
            v * v * v * p1[0] + 3 * v * v * u * c1x + 3 * v * u * u * c2x + u * u * u * p2[0],
            v * v * v * p1[1] + 3 * v * v * u * c1y + 3 * v * u * u * c2y + u * u * u * p2[1],
          ]);
        }
      }
      out.push(raw[raw.length - 1]);
      return out;
    };

    /** Hauteur du terrain sous x (interpolation linéaire, clamp aux bords). */
    const yAtX = (px: number): number => {
      if (terrain.length < 2) return 0;
      if (px <= terrain[0][0]) return terrain[0][1];
      for (let i = 0; i < terrain.length - 1; i++) {
        const [x1, y1] = terrain[i];
        const [x2, y2] = terrain[i + 1];
        if (px <= x2) {
          const f = (px - x1) / Math.max(0.001, x2 - x1);
          return y1 + (y2 - y1) * f;
        }
      }
      return terrain[terrain.length - 1][1];
    };

    /** Centre d'une roue (rayon R) : posée sur le terrain (bas du pneu sur
        le trait, centre R au-dessus). ANTI-JITTER — l'ancienne version
        prenait un min sur 9 échantillons tangents : le point contraignant
        basculait brusquement (centre↔bord) → kinks de courbure →
        tremblement vertical. Le terrain est désormais lissé et les creux
        nets sont SAUTÉS (plus roulés) : une pose directe suffit et reste
        C¹ → ride lisse, zéro lag. La pente est portée par la CORDE entre
        les 2 roues (cf. groundPose), pas par chaque roue. */
    const wheelCenterY = (wx: number): number => yAtX(wx) - wheelR;

    /** Pose au sol pour un x donné — 2 roues tangentes. L'origine du
        rider = MILIEU DES CENTRES DE ROUES (cf. ancrage CSS -50.9 px),
        remontée de la garde le long de la normale. */
    const groundPose = (px: number) => {
      const yr = wheelCenterY(px - halfWB);
      const yf = wheelCenterY(px + halfWB);
      const angle = Math.atan2(yf - yr, 2 * halfWB);
      const cy = (yr + yf) / 2 - Math.cos(angle) * clear;
      return { cy, angle };
    };

    /** Pente locale moyenne autour d'un index (fenêtre ±2 points). */
    const slopeAt = (i: number): number => {
      const lo = Math.max(0, i - 2);
      const hi = Math.min(terrain.length - 1, i + 2);
      return (
        (terrain[hi][1] - terrain[lo][1]) /
        Math.max(1, terrain[hi][0] - terrain[lo][0])
      );
    };

    /** PLAN DE SAUTS — murs et falaises d'abord (obligatoires : on ne
        grimpe pas une paroi, on la saute), sommets plaisir ensuite. */
    const planJumps = () => {
      jumps = [];
      const n = terrain.length;
      const W = bandW;
      const H = bandH || 1;
      if (n < 8 || W < 200) return;
      // Seuils NORMALISÉS : tout est exprimé en fraction de la largeur (W)
      // ou de la hauteur (H) de bande, et les pentes via sl() — sinon les
      // seuils en px écran donnaient un ride différent sur mobile (bande
      // ~3,7× plus étroite → creux non détectés, tout vu comme « mur »).
      // sl(norm) convertit une pente normalisée en pente écran px.
      const sl = (norm: number) => (norm * H) / W;

      // 0. GAPS — les creux étroits et profonds se SAUTENT bord à bord
      // avec l'élan (feedback : « c'est surtout les creux qu'il ne faut
      // pas qu'elle aille »). Une vraie moto ne plonge pas dans un trou.
      const tops: number[] = [];
      for (let t = 6; t < n - 6; t++) {
        if (
          terrain[t][1] < terrain[t - 6][1] &&
          terrain[t][1] < terrain[t + 6][1] &&
          terrain[t][1] <= terrain[t - 1][1] &&
          terrain[t][1] <= terrain[t + 1][1]
        ) {
          tops.push(t);
        }
      }
      const gaps: Jump[] = [];
      for (let g = 0; g < tops.length - 1; g++) {
        const a = tops[g];
        const b = tops[g + 1];
        const xg = terrain[a][0];
        const xd = terrain[b][0];
        const width = xd - xg;
        if (width < 0.041 * W || width > 0.171 * W) continue;
        let floor = -Infinity;
        for (let j = a; j <= b; j++) floor = Math.max(floor, terrain[j][1]);
        const depth = floor - Math.max(terrain[a][1], terrain[b][1]);
        // Vrai trou : profond ET parois raides (ratio normalisé ≥ 1.2 ≈
        // 31° de pente moyenne en espace données). Les cuvettes se roulent.
        if (depth < 0.076 * H || depth / width < 1.2 * (H / W)) continue;
        const takeoff = Math.max(0.02 * W, xg - 2);
        const land = Math.min(xd + 0.007 * W, W - 0.027 * W);
        if (land - takeoff < 0.034 * W) continue;
        gaps.push({
          takeoff,
          land,
          apex: 34 * S,
          flip: false,
          spin: 0,
          dur: Math.min(1400, Math.max(700, (width / W) * 6800)),
          kind: "gap",
        });
      }
      jumps.push(...gaps);
      const inGap = (px: number) =>
        gaps.some((gj) => px >= gj.takeoff - 0.008 * W && px <= gj.land + 0.008 * W);

      let i = 0;
      while (i < n - 1) {
        const dx = terrain[i + 1][0] - terrain[i][0];
        const s = (terrain[i + 1][1] - terrain[i][1]) / Math.max(0.2, dx);

        if (s < sl(-9.6)) {
          // MUR MONTANT quasi vertical (> ~66° en espace données) : la
          // moto GRIMPE tout ce qui est grimpable — seuls les vrais murs
          // se sautent.
          let k = i + 1;
          while (k < n - 1) {
            const ddx = terrain[k + 1][0] - terrain[k][0];
            const s2 = (terrain[k + 1][1] - terrain[k][1]) / Math.max(0.2, ddx);
            if (s2 < sl(-6.8)) k++;
            else break;
          }
          const rise = terrain[i][1] - terrain[k][1];
          if (rise >= 0.129 * H && !inGap(terrain[i][0])) {
            const footX = terrain[i][0];
            const topX = terrain[k][0];
            const topY = terrain[k][1];
            // Décollage : la dernière épaule douce avant le pied du mur.
            let takeoff = footX - 0.038 * W;
            for (let b = i; b >= 0; b--) {
              if (footX - terrain[b][0] > 0.157 * W) break;
              if (
                Math.abs(slopeAt(b)) < sl(1.92) &&
                footX - terrain[b][0] >= 0.025 * W
              ) {
                takeoff = terrain[b][0];
                break;
              }
            }
            // Atterrissage : première pente douce après le sommet.
            let landI = k;
            while (landI < n - 1 && terrain[landI][0] - topX < 0.041 * W) {
              if (Math.abs(slopeAt(landI)) > sl(3.4)) landI++;
              else break;
            }
            const land = Math.min(terrain[landI][0] + 0.018 * W, W - 0.027 * W);
            const range = land - takeoff;
            if (range >= 0.041 * W && range <= 0.294 * W && takeoff > 0.02 * W) {
              const apex = Math.min(
                150 * S,
                Math.max(80 * S, yAtX(takeoff) - topY + 46 * S),
              );
              const flip = apex >= 95 * S || range >= 0.109 * W;
              let dur = Math.min(1900, Math.max(1000, (range / W) * 7600));
              if (flip) dur = Math.max(dur, 1500);
              jumps.push({
                takeoff,
                land,
                apex,
                flip,
                spin: -360,
                dur,
                kind: "wall",
              });
            }
          }
          i = Math.max(k, i + 1);
        } else if (s > sl(9.6)) {
          // FALAISE quasi verticale : on décolle au bord, on retombe au
          // pied. Les descentes raides mais roulables se descendent.
          let k = i + 1;
          while (k < n - 1) {
            const ddx = terrain[k + 1][0] - terrain[k][0];
            const s2 = (terrain[k + 1][1] - terrain[k][1]) / Math.max(0.2, ddx);
            if (s2 > sl(6.8)) k++;
            else break;
          }
          const drop = terrain[k][1] - terrain[i][1];
          if (drop >= 0.152 * H && !inGap(terrain[i][0])) {
            const takeoff = Math.max(0.02 * W, terrain[i][0] - 0.003 * W);
            let landI = k;
            while (landI < n - 1 && terrain[landI][0] - terrain[k][0] < 0.034 * W) {
              if (Math.abs(slopeAt(landI)) > sl(3.4)) landI++;
              else break;
            }
            const land = Math.min(terrain[landI][0] + 0.015 * W, W - 0.027 * W);
            const range = land - takeoff;
            if (range >= 0.034 * W && range <= 0.294 * W) {
              const flip = drop >= 0.322 * H && range >= 0.103 * W;
              let dur = Math.min(1900, Math.max(850, (range / W) * 7600));
              if (flip) dur = Math.max(dur, 1500);
              jumps.push({
                takeoff,
                land,
                apex: 42 * S,
                flip,
                spin: 360,
                dur,
                kind: "cliff",
              });
            }
          }
          i = Math.max(k, i + 1);
        } else {
          i++;
        }
      }

      // Sauts plaisir sur les sommets restants (hors zones planifiées).
      for (let pp = 6; pp < n - 6; pp++) {
        if (
          terrain[pp][1] < terrain[pp - 6][1] - 0.011 * H &&
          terrain[pp][1] < terrain[pp + 6][1] - 0.011 * H &&
          terrain[pp][1] <= terrain[pp - 1][1] &&
          terrain[pp][1] <= terrain[pp + 1][1]
        ) {
          const px = terrain[pp][0];
          if (px < 0.041 * W || px > W - 0.096 * W) continue;
          if (jumps.some((j) => px > j.takeoff - 0.075 * W && px < j.land + 0.075 * W))
            continue;
          jumps.push({
            takeoff: px,
            land: Math.min(px + 0.066 * W, W - 0.027 * W),
            apex: 110 * S,
            flip: true,
            // Alternance backflip / frontflip d'un saut plaisir à l'autre.
            spin: jumps.filter((j) => j.kind === "fun").length % 2 ? 360 : -360,
            dur: 1600,
            kind: "fun",
          });
        }
      }

      jumps.sort((a, b) => a.takeoff - b.takeoff);
      // Respiration : un saut doit être un événement. Les sauts plaisir
      // trop proches du précédent sont retirés ; murs/falaises restent
      // (obligatoires) sauf chevauchement direct.
      const kept: Jump[] = [];
      for (const j of jumps) {
        const prev = kept[kept.length - 1];
        if (prev) {
          if (j.kind === "fun" && j.takeoff < prev.land + 0.205 * W) continue;
          if (j.takeoff < prev.land + 0.014 * W) continue;
        }
        kept.push(j);
      }
      jumps = kept;

      // Garde-fou wow — APRÈS le filtre d'espacement : si le plan FINAL
      // ne contient aucune figure (tout en gaps tendus), le plus large
      // gap devient LE gros saut du run.
      if (!jumps.some((j) => j.flip)) {
        let big: Jump | null = null;
        for (const j of jumps) {
          if (
            j.kind === "gap" &&
            (!big || j.land - j.takeoff > big.land - big.takeoff)
          ) {
            big = j;
          }
        }
        if (big) {
          big.flip = true;
          big.spin = -360;
          big.apex = 100 * S;
          big.dur = Math.max(big.dur, 1500);
        }
      }
    };

    const rebuildTerrain = () => {
      const rect = wrap.getBoundingClientRect();
      if (rect.width < 50 || rect.height < 50) return;
      bandW = rect.width;
      bandH = rect.height;
      // Échelle moto selon le breakpoint (cf. CSS .hero-rider-svg).
      S = window.matchMedia("(max-width: 640px)").matches ? 64 / 88 : 1;
      halfWB = HALF_WHEELBASE_PX * S;
      wheelR = WHEEL_R_PX * S;
      clear = CLEARANCE_PX * S;
      const dom = sampleDomPath(rect);
      terrain = dom ?? fallbackFromProps(rect);
      // ANTI-JITTER — lissage léger du profil (moyenne glissante ±2 pts
      // sur y, ~30 px). Le terrain échantillonné est interpolé
      // linéairement entre 220 points : chaque sommet crée un kink, et la
      // pose tangente des 2 roues amplifie ces ruptures → micro-tremblement
      // vertical de la moto (constaté au banc : ~15-25 % de frames qui
      // inversent le sens). On lisse À LA SOURCE (zéro lag runtime) : la
      // moto suit exactement ce profil adouci, qui reste à ~1 px de la
      // ligne (dans son halo). x inchangé, bords préservés.
      if (terrain.length > 8) {
        const ys = terrain.map((p) => p[1]);
        // Gaussienne 7 taps [1,2,3,4,3,2,1]/16 : amortit les wiggles plus
        // courts que l'empattement (que la moto ne peut PAS suivre
        // physiquement), tout en restant à ~1 px de la ligne affichée.
        for (let i = 3; i < terrain.length - 3; i++) {
          terrain[i][1] =
            (ys[i - 3] +
              2 * ys[i - 2] +
              3 * ys[i - 1] +
              4 * ys[i] +
              3 * ys[i + 1] +
              2 * ys[i + 2] +
              ys[i + 3]) /
            16;
        }
      }
      planJumps();
      // Re-synchronise le pointeur de saut sur la position courante.
      jumpIdx = jumps.findIndex((j) => j.takeoff >= x - 18);
      if (jumpIdx === -1) jumpIdx = jumps.length;
      // État de debug pour le banc de vérification (négligeable en prod).
      (window as unknown as Record<string, unknown>).__crxRider = {
        src: dom ? "dom" : "props",
        terrainPts: terrain.length,
        jumps: jumps.map((j) => ({ ...j })),
      };
    };

    rebuildTerrain();
    const ro = new ResizeObserver(rebuildTerrain);
    ro.observe(wrap);
    // CAPTEUR LIVE : si le path du pouls change (nouvelles données,
    // re-render serveur), on re-mesure terrain + plan de sauts.
    let moRaf = 0;
    const mo = new MutationObserver(() => {
      cancelAnimationFrame(moRaf);
      moRaf = requestAnimationFrame(rebuildTerrain);
    });
    if (band) {
      mo.observe(band, {
        subtree: true,
        childList: true,
        attributes: true,
        attributeFilter: ["d"],
      });
    }

    /* ── Boucle ─────────────────────────────────────────────────────── */
    let raf = 0;
    let running = true;
    let visible = true;
    let lastTs = 0;
    let pauseUntil = 0;
    let sparkIdx = 0;
    let jumpStart = 0;
    let jumpDur = 1600;
    let jumpLand = 0;
    let jumpApex = 110;
    let jumpFlip = true;
    let jumpSpin = -360;
    let jumpY0 = 0;
    let jumpFromAngle = 0;
    let landedFx = false;
    // SUSPENSION : à l'atterrissage le châssis encaisse — compression
    // amortie qui rebondit (ressort). landTs = instant de toucher,
    // landImpact = sévérité (proportionnelle à la hauteur du saut).
    let landTs = -9999;
    let landImpact = 0;
    let wasInJump = false;
    // PRÉLOAD : la suspension se charge (compression) juste avant un saut,
    // puis se détend d'un coup au décollage (« pop »). popTs = instant du
    // décollage.
    let popTs = -9999;
    // FILTRE ONE-EURO sur la hauteur (cy) au roulage — anti-jitter : lisse
    // fort quand la moto monte/descend lentement (tue le tremblement dû à
    // l'échantillonnage de la courbe BTC volatile), mais suit sans lag les
    // vraies pentes franches (le cutoff s'ouvre avec la vitesse verticale).
    let cyFilt = Number.NaN;
    let dCyFilt = 0;
    /** Roost : poussière de lumière éjectée par la roue arrière dans les
        montées — dernier tir (throttle ~300 ms). */
    let lastRoost = 0;
    /** Buffer circulaire d'états récents pour la traînée de vol. */
    const trail: Array<[number, number, number, number, number]> = [];
    const GHOST_DELAYS = [70, 140];
    let ghostsOn = false;
    /** Classe glow-vol togglée seulement au changement d'état. */
    let airClass = false;
    // Angle AMORTI au roulage (lissage exponentiel ≈ suspension de
    // châssis). NaN = pas encore initialisé.
    let smoothAngle = Number.NaN;
    // Vitesse lissée (EMA ~200 ms) : pas de sursaut mesurable au banc.
    let smoothSpeed = CRUISE_PX_S;

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

    /** Roost moto-cross : 2 poussières éjectées vers l'arrière-bas depuis
        la roue arrière (les montées creusent, comme sur terre battue). */
    function emitRoost(px: number, py: number) {
      const rect = wrap!.getBoundingClientRect();
      for (let k = 0; k < 2; k++) {
        const s = sparkRefs.current[(sparkIdx + k) % SPARK_COUNT];
        if (!s) continue;
        s.style.left = `${(px / rect.width) * 100}%`;
        s.style.top = `${(py / rect.height) * 100}%`;
        s.style.setProperty("--spark-angle", `${-148 - k * 22}deg`);
        s.classList.remove("hero-spark-fire");
        void s.offsetWidth;
        s.classList.add("hero-spark-fire");
      }
      sparkIdx = (sparkIdx + 2) % SPARK_COUNT;
    }

    /** Ease in-out cubique pour la rotation du flip. */
    const ease = (u: number) =>
      u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2;

    /** Filtre One-Euro (Casiez 2012) sur la hauteur cy au roulage. */
    const oneEuroAlpha = (cutoffHz: number, dtSec: number) => {
      const tau = 1 / (2 * Math.PI * cutoffHz);
      return 1 / (1 + tau / dtSec);
    };
    const ONE_EURO_MIN = 1.0; // Hz : lissage de base (jitter lent tué)
    const ONE_EURO_BETA = 0.018; // ouverture du cutoff avec la vitesse vy
    const ONE_EURO_DCUT = 1.2; // Hz : lissage de la dérivée

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

      const inJump = jumpStart > 0 && ts - jumpStart < jumpDur;

      if (inJump) {
        // VOL BALISTIQUE : vitesse horizontale constante = portée/durée.
        const flySpeed = ((jumpLand - x) / Math.max(1, jumpDur - (ts - jumpStart))) * 1000;
        smoothSpeed = Math.max(40, Math.min(420, flySpeed));
        x += (smoothSpeed * dt) / 1000;
      } else {
        // Pente locale pour la modulation de vitesse (descente = y monte).
        const slopePx =
          (yAtX(x + halfWB) - yAtX(x - halfWB)) / (2 * halfWB);
        const targetSpeed = Math.max(
          CRUISE_PX_S * 0.6,
          Math.min(CRUISE_PX_S * 1.45, CRUISE_PX_S * (1 + slopePx * 0.55)),
        );
        smoothSpeed += (targetSpeed - smoothSpeed) * Math.min(1, dt / 200);
        x += (smoothSpeed * dt) / 1000;
      }

      if (x >= bandW - halfWB) {
        x = halfWB;
        jumpStart = 0;
        jumpIdx = 0;
        pauseUntil = ts + PAUSE_BETWEEN_RUNS_MS;
        rider!.style.opacity = "0";
        return;
      }
      if (x < halfWB) x = halfWB;
      rider!.style.opacity = "1";

      let cy: number;
      let angleDeg: number;
      // Pivot de rotation : 0 = ligne des centres de roues, remonte au
      // CENTRE DE MASSE (-17 px) en vol via sin(p·π) — un vrai backflip
      // tourne autour du centre de masse, pas des roues. La rampe garantit
      // la continuité exacte au décollage et à l'atterrissage.
      let pivotY = 0;

      if (inJump) {
        const p = (ts - jumpStart) / jumpDur;
        const lift = Math.sin(p * Math.PI);
        // L'atterrissage est RELU chaque frame : si la courbe live bouge
        // en plein vol, le rider vise la nouvelle position du sol.
        const landPose = groundPose(jumpLand);
        cy = jumpY0 + (landPose.cy - jumpY0) * p - lift * jumpApex;
        pivotY = -17 * S * lift;
        const landDeg = (landPose.angle * 180) / Math.PI;
        const blend = jumpFromAngle + (landDeg - jumpFromAngle) * p;
        if (jumpFlip) {
          // Rotation en fenêtre haute [0.18, 0.86] (~1.1 s : le flip se
          // LIT), uniquement sur les gros sauts. Le SENS dépend du
          // contexte : backflip (-360) sur les murs, frontflip (+360)
          // sur les falaises, alternance sur les sauts plaisir.
          const w = Math.min(1, Math.max(0, (p - 0.18) / 0.68));
          angleDeg = blend + jumpSpin * ease(w);
        } else {
          // Petit saut : pitch balistique léger (nez qui se lève puis
          // replonge), pas de looping — c'est ça, le naturel.
          angleDeg = blend - 12 * lift;
        }
        // Resynchronise l'amortisseur MODULO 360 pour la sortie de saut.
        smoothAngle = ((angleDeg % 360) + 540) % 360 - 180;
        if (p > 0.93 && !landedFx) {
          landedFx = true;
          emitSparks(x, yAtX(x), jumpFlip);
        }
      } else {
        if (jumpStart > 0) jumpStart = 0;
        const pose = groundPose(x);
        cy = pose.cy;
        angleDeg = (pose.angle * 180) / Math.PI;

        // ANTI-JITTER (One-Euro) sur cy : tue le tremblement vertical dû à
        // la volatilité de la courbe BTC sans laguer les vraies pentes.
        if (Number.isNaN(cyFilt)) {
          cyFilt = cy;
          dCyFilt = 0;
        } else {
          const dtSec = Math.max(0.001, dt / 1000);
          const dRaw = (cy - cyFilt) / dtSec;
          dCyFilt = dCyFilt + oneEuroAlpha(ONE_EURO_DCUT, dtSec) * (dRaw - dCyFilt);
          const cutoff = ONE_EURO_MIN + ONE_EURO_BETA * Math.abs(dCyFilt);
          cyFilt = cyFilt + oneEuroAlpha(cutoff, dtSec) * (cy - cyFilt);
          cy = cyFilt;
        }
        // Amortissement : l'angle affiché rejoint l'angle du terrain avec
        // une constante de temps ~150 ms, borné à 200 °/s (banc : zéro
        // saccade au-dessus du seuil). Delta normalisé [-180, 180].
        if (Number.isNaN(smoothAngle)) smoothAngle = angleDeg;
        const k = Math.min(1, dt / 150);
        const delta = (((angleDeg - smoothAngle) % 360) + 540) % 360 - 180;
        const maxStep = (200 * dt) / 1000;
        smoothAngle += Math.max(-maxStep, Math.min(maxStep, delta * k));
        angleDeg = smoothAngle;

        // Roost : dans une montée franche, la roue arrière éjecte de la
        // poussière de lumière vers l'arrière (throttle ~300 ms).
        if (angleDeg < -16 && ts - lastRoost > 300) {
          lastRoost = ts;
          const rx = x - halfWB;
          emitRoost(rx, yAtX(rx));
        }

        // Déclenchement du prochain saut planifié.
        while (jumpIdx < jumps.length && jumps[jumpIdx].takeoff < x - 18)
          jumpIdx++;
        const j = jumps[jumpIdx];
        if (j && x >= j.takeoff) {
          jumpStart = ts;
          jumpDur = j.dur;
          jumpLand = j.land;
          jumpApex = j.apex;
          jumpFlip = j.flip;
          jumpSpin = j.spin;
          jumpY0 = cy;
          jumpFromAngle = angleDeg;
          landedFx = false;
          jumpIdx++;
          popTs = ts; // détente de suspension au décollage (« pop »)
          cyFilt = Number.NaN; // re-seed du filtre cy à l'atterrissage
          // Kick de poussière au décollage.
          const rx = x - halfWB;
          emitRoost(rx, yAtX(rx));
        }
      }

      // Glow renforcé en vol (or → glacier) — toggle au changement d'état.
      if (inJump !== airClass) {
        airClass = inJump;
        rider!.classList.toggle("hero-rider-air", inJump);
      }

      // ATTERRISSAGE — instant exact du toucher (sortie de saut) : on
      // arme la suspension, d'autant plus forte que le saut était haut.
      if (wasInJump && !inJump) {
        landTs = ts;
        landImpact = Math.min(1.1, Math.max(0.45, jumpApex / (110 * S)));
      }
      wasInJump = inJump;

      // SUSPENSION — cycle complet, scaleY ancré sur la ligne des roues
      // (origin 0,0) → le châssis travaille, les pneus restent plantés sur
      // le trait. `flex` > 0 = compression, < 0 = détente :
      //   1) PRÉLOAD : compression croissante à l'approche d'un saut
      //   2) POP : détente brève au décollage
      //   3) ENCAISSEMENT : ressort amorti à l'atterrissage (rebond léger)
      let suspSX = 1;
      let suspSY = 1;
      let flex = 0;
      // 1) Préload (au sol, juste avant le décollage).
      if (!inJump) {
        const nj = jumps[jumpIdx];
        if (nj) {
          const dist = nj.takeoff - x;
          const win = Math.max(18, smoothSpeed * 0.14);
          if (dist > 0 && dist < win) flex += 0.55 * (1 - dist / win);
        }
      }
      // 2) Pop de détente au décollage (extension qui retombe en ~180 ms).
      const tp = ts - popTs;
      if (tp >= 0 && tp < 180) flex -= 0.5 * Math.exp(-tp / 70);
      // 3) Encaissement amorti à l'atterrissage (au sol uniquement).
      const tl = ts - landTs;
      if (!inJump && tl >= 0 && tl < 360) {
        flex += landImpact * Math.exp(-tl / 130) * Math.cos((2 * Math.PI * tl) / 240);
      }
      flex = Math.max(-1, Math.min(1.1, flex));
      if (flex !== 0) {
        const comp = Math.max(0, flex);
        const ext = Math.max(0, -flex);
        suspSY = 1 - comp * 0.13 + ext * 0.06;
        suspSX = 1 + comp * 0.07 - ext * 0.03;
      }

      rider!.style.transform = `translate3d(${x}px, ${cy}px, 0)`;
      const squash =
        suspSX !== 1 || suspSY !== 1
          ? ` scale(${suspSX.toFixed(4)}, ${suspSY.toFixed(4)})`
          : "";
      flip!.style.transform = pivotY
        ? `translate(0px, ${pivotY}px) rotate(${angleDeg}deg) translate(0px, ${-pivotY}px)${squash}`
        : `rotate(${angleDeg}deg)${squash}`;

      // TRAÎNÉE DE VOL — on mémorise l'état courant et on pose chaque
      // écho sur l'état d'il y a 70/140 ms. Visible uniquement en l'air.
      trail.push([ts, x, cy, angleDeg, pivotY]);
      if (trail.length > 40) trail.shift();
      if (inJump !== ghostsOn) {
        ghostsOn = inJump;
        for (const g of ghostRefs.current)
          g?.classList.toggle("hero-rider-ghost-on", inJump);
      }
      if (inJump) {
        for (let gi = 0; gi < GHOST_DELAYS.length; gi++) {
          const g = ghostRefs.current[gi];
          if (!g) continue;
          const target = ts - GHOST_DELAYS[gi];
          let st = trail[0];
          for (let t = trail.length - 1; t >= 0; t--) {
            if (trail[t][0] <= target) {
              st = trail[t];
              break;
            }
          }
          const inner = g.firstElementChild as HTMLElement | null;
          g.style.transform = `translate3d(${st[1]}px, ${st[2]}px, 0)`;
          if (inner) {
            inner.style.transform = st[4]
              ? `translate(0px, ${st[4]}px) rotate(${st[3]}deg) translate(0px, ${-st[4]}px)`
              : `rotate(${st[3]}deg)`;
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
      cancelAnimationFrame(moRaf);
      io.disconnect();
      ro.disconnect();
      mo.disconnect();
    };
  }, [points]);

  return (
    <div ref={wrapRef} className="pointer-events-none absolute inset-0 z-[1]" aria-hidden="true">
      {[0, 1].map((i) => (
        <div
          key={`g${i}`}
          ref={(el) => {
            ghostRefs.current[i] = el;
          }}
          className="hero-rider hero-rider-ghost"
          data-ghost={i + 1}
        >
          <div className="hero-rider-flip">
            <RiderSvg />
          </div>
        </div>
      ))}
      <div ref={riderRef} className="hero-rider hero-rider-main">
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
 * La moto-cross + son pilote — dessin v3.1, VALIDÉ EN RENDU PNG (itération
 * visuelle Edge headless, feedback Kev « personnage difforme » corrigé) :
 * pilote en SILHOUETTE PLEINE, posture d'attaque (debout-penché, dos
 * arqué, jambe articulée avec botte, bras fléchi jusqu'au guidon), casque
 * cross d'un seul tenant (coque + mentonnière + écran glacier), corps de
 * moto continu (selle cross fusionnée au réservoir), garde-boue relevé.
 *
 * viewBox 64×48 — repères d'ancrage (cf. CSS .hero-rider-svg) :
 *   sol = bas des pneus y = 45 ; centre d'empattement x = 32.5 ;
 *   centres de roues y = 37 → ancrage rendu (44.7, 50.9).
 */
function RiderSvg() {
  return (
    <svg viewBox="0 0 64 48" fill="none" className="hero-rider-svg">
      <defs>
        <linearGradient id="rider-body" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#F5A524" />
          <stop offset="1" stopColor="#FFE9C2" />
        </linearGradient>
      </defs>

      <g stroke="#F5A524" strokeWidth="4" strokeOpacity="0.18" strokeLinecap="round" strokeLinejoin="round" fill="none">
        <circle cx="15" cy="37" r="8" />
        <circle cx="50" cy="37" r="8" />
        <path d="M15 37 L27 31 L38 31 M27 31 L25 24 L38 23 M38 31 L42 23 M44 19 L50 37" />
      </g>

      <g className="hero-rider-wheel" style={{ transformOrigin: "15px 37px" }}>
        <circle cx="15" cy="37" r="8" stroke="#7DD3FC" strokeWidth="1.8" />
        <circle cx="15" cy="37" r="5.6" stroke="#7DD3FC" strokeWidth="0.7" strokeOpacity="0.5" />
        <circle cx="15" cy="37" r="1.5" fill="#7DD3FC" />
        <path d="M15 31.4 L15 42.6 M9.4 37 L20.6 37 M11 33 L19 41 M11 41 L19 33" stroke="#7DD3FC" strokeWidth="0.8" strokeOpacity="0.65" />
      </g>
      <g className="hero-rider-wheel" style={{ transformOrigin: "50px 37px" }}>
        <circle cx="50" cy="37" r="8" stroke="#7DD3FC" strokeWidth="1.8" />
        <circle cx="50" cy="37" r="5.6" stroke="#7DD3FC" strokeWidth="0.7" strokeOpacity="0.5" />
        <circle cx="50" cy="37" r="1.5" fill="#7DD3FC" />
        <path d="M50 31.4 L50 42.6 M44.4 37 L55.6 37 M46 33 L54 41 M46 41 L54 33" stroke="#7DD3FC" strokeWidth="0.8" strokeOpacity="0.65" />
      </g>

      <path d="M15 37 L28 32" stroke="url(#rider-body)" strokeWidth="1.8" strokeLinecap="round" />
      <path
        d="M17.5 25 L24 25.8 L31 23.5 L40 22.5 L42.5 25 L38 28.5 L29 29.5 L23.5 28.6 L17.2 27 Z"
        fill="#16191F"
        stroke="url(#rider-body)"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
      <path d="M30 29.5 L31.5 33.5 M28 32 L31.5 33.5 L37 32.5" stroke="url(#rider-body)" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M43.5 21.5 L50 37 M45 21 L51.4 36.4" stroke="url(#rider-body)" strokeWidth="1.3" strokeLinecap="round" />
      <path d="M40.5 22.5 Q47 16.5 53.5 21" stroke="url(#rider-body)" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M43.5 21 L41.5 17.8 M40 17.2 L43.2 16" stroke="url(#rider-body)" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M27 30.5 L19.5 33" stroke="#FBBF24" strokeWidth="1.8" strokeOpacity="0.8" strokeLinecap="round" />

      <path
        d="M26.5 16.5 L24 21.5 L28.5 24.5 L31 30 L33 32.2 L36.8 33.4 L36.4 35 L31.8 33.6 L29.5 30.8 L31.5 22.5 L30 17.5 Z"
        fill="#10131A"
        stroke="#FFE9C2"
        strokeWidth="1.1"
        strokeLinejoin="round"
      />
      <path
        d="M25.5 17.5 Q26.5 12.5 30.5 10.5 L34 9.8 L36.5 12 L33.5 17 L28.5 18.5 Z"
        fill="#10131A"
        stroke="#FFE9C2"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
      <path
        d="M33 11.5 L37 13.2 L40.6 16.6 L39.6 18 L36 15.4 L32.5 14 Z"
        fill="#10131A"
        stroke="#FFE9C2"
        strokeWidth="1.1"
        strokeLinejoin="round"
      />
      <path
        d="M30.2 10.6 Q28.6 6.2 32.2 4.8 Q35.8 3.6 37.6 6 L39.8 8.2 Q40.4 9.2 39.4 9.9 L36.6 10.3 L33.8 10.8 Z"
        fill="#0E1116"
        stroke="#FFE9C2"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
      <path d="M31.2 5.4 L29.2 4.7" stroke="#FFE9C2" strokeWidth="1.2" strokeLinecap="round" />
      <path d="M34.6 6.2 Q36.4 6.6 37.6 7.8" stroke="#7DD3FC" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}
