import "server-only";
import { BRAND } from "@/lib/brand";
import type { ReflexCard } from "./types";
import { FAM, FOSSIL_COLOR, RAR_INDEX, RC, RPAT, corners, famIcon, filigree, h32, laurel, pattern, ring, rng, shade, type Ctx } from "./render";

/**
 * Carte de l'aperçu de lien (/cartes/[id]/opengraph-image), dessinée avec les MÊMES fonctions que les vraies cartes
 * du site (motif de rareté, filigranes, lunette du médaillon, lauriers, guillochis : voir render.ts) et les mêmes
 * cotes que le CSS (carte de 240 × 336, cadre de 4 px, médaillon de 108 px…). Kev 03/10 : « les cartes paraissent
 * lisses sans les détails des cartes du site ». Le moteur des images (Satori) ne lit pas le CSS : tout le décor est un
 * seul SVG ; les textes sont posés par-dessus dans opengraph-image.tsx (même grille, ×1,25).
 */

export type OgFont = { name: string; data: ArrayBuffer; weight: 400 | 500 | 600 | 700 | 800; style: "normal" };

/* ---------- polices des vraies cartes (Barlow Condensed, JetBrains Mono, Space Grotesk) ----------
   Le site les sert en WOFF2, que Satori ne lit pas : on prend les TTF de Google Fonts. Un échec ne casse rien :
   la carte retombe sur Inter (déjà chargée), jamais sur des cases vides. */
const CARD_FONTS = "family=Barlow+Condensed:wght@700;800&family=JetBrains+Mono:wght@600&family=Space+Grotesk:wght@400;700";
let fontsCache: Promise<OgFont[]> | null = null;
async function fetchCardFonts(): Promise<OgFont[]> {
  const css = await (await fetch(`https://fonts.googleapis.com/css2?${CARD_FONTS}`, { signal: AbortSignal.timeout(8000) })).text();
  const faces = [...css.matchAll(/font-family:\s*'([^']+)';[^}]*?font-weight:\s*(\d+);[^}]*?src:\s*url\(([^)]+)\)\s*format\('truetype'\)/g)];
  if (faces.length < 5) throw new Error("polices incomplètes");
  return Promise.all(
    faces.map(async ([, name, w, url]) => {
      const r = await fetch(url, { signal: AbortSignal.timeout(8000) });
      if (!r.ok) throw new Error(`police ${name} ${w} : ${r.status}`);
      return { name, data: await r.arrayBuffer(), weight: Number(w) as OgFont["weight"], style: "normal" as const };
    }),
  );
}
export function loadCardFonts(): Promise<OgFont[]> {
  if (!fontsCache)
    fontsCache = (async () => {
      /* deux essais : un premier appel lent ne doit pas figer une image en police de repli */
      for (let i = 0; i < 2; i++) {
        try {
          return await fetchCardFonts();
        } catch {
          /* essai suivant */
        }
      }
      fontsCache = null; /* nouvel essai à la prochaine image */
      return [];
    })();
  return fontsCache;
}

/* guillochis des Légendaires (#bkguil de /reflex-cards/guilloche.svg) */
let guilCache: Promise<string> | null = null;
export function loadGuilloche(): Promise<string> {
  if (!guilCache)
    guilCache = (async () => {
      try {
        const base = process.env.NEXT_PUBLIC_SITE_URL || BRAND.url;
        const svg = await (await fetch(`${base}/reflex-cards/guilloche.svg`, { signal: AbortSignal.timeout(8000) })).text();
        const m = /<g id="bkguil">([\s\S]*)<\/g><\/defs>/.exec(svg);
        if (!m) throw new Error("guillochis introuvable");
        return m[1];
      } catch {
        guilCache = null;
        return "";
      }
    })();
  return guilCache;
}

/* color-mix(in srgb, a t, b) du CSS */
const rgb = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
export function mix(a: string, b: string, t: number): string {
  const A = rgb(a), B = rgb(b);
  return "#" + A.map((v, i) => Math.round(v * t + B[i] * (1 - t)).toString(16).padStart(2, "0")).join("");
}

/** genre de carte dessinée : rareté, fossile, ou carte pas encore sortie (neutre, rien ne fuite) */
export type ArtKind = ReflexCard["r"] | "F" | "X";
/** couleur de rareté (--rc du CSS) */
export const artColor = (k: ArtKind) => (k === "F" ? FOSSIL_COLOR : k === "X" ? "#e9b949" : RC[k]);

/* métal du cadre (--m1 / --m2 du CSS ; Commune et Légendaire ont leur propre dégradé) */
const METAL: Record<ArtKind, string[]> = {
  C: ["#eef2f7", "#6b7584", "#d5dbe4", "#4b5462", "#eef2f7"],
  PC: ["#a7f3d0", "#0f5c40", "#a7f3d0", "#0f5c40", "#a7f3d0"],
  R: ["#bae6fd", "#0e4a70", "#bae6fd", "#0e4a70", "#bae6fd"],
  SR: ["#e4dcff", "#4a2f8f", "#e4dcff", "#4a2f8f", "#e4dcff"],
  UR: ["#ffdcb8", "#8a3d0c", "#ffdcb8", "#8a3d0c", "#ffdcb8"],
  L: ["#d49a1c", "#fde68a", "#fff7d6", "#b87d10", "#fde68a", "#e9b949", "#d49a1c"],
  F: ["#e0d2bd", "#4a3d30", "#e0d2bd", "#4a3d30", "#e0d2bd"],
  X: ["#fde68a", "#6b4a10", "#fde68a", "#6b4a10", "#fde68a"],
};

const F = (v: number) => (Math.round(v * 10) / 10).toString();
/* place un <svg> de render.ts (qui a son propre viewBox) dans la carte */
const at = (svg: string, x: number, y: number, w: number, h: number) => svg.replace(/^<svg /, `<svg x="${x}" y="${y}" width="${w}" height="${h}" `);

/* formes (cotes du CSS : carte 240 × 336, cadre 4 px, face clip 15/27, filet intérieur à 6 px, plaque à 189 px) */
const CARD = "M0 18 L18 0 H222 L240 18 V306 L120 336 L0 306 Z";
const FACE = "M4 19 L19 4 H221 L236 19 V305 L120 332 L4 305 Z";
const INNER = "M10 21 L21 10 H219 L230 21 V303 L120 326 L10 303 Z";
const PLATE = "M12 193 H228 V301 L120 326 L12 301 Z";
export const MEDAL = { cx: 120, cy: 84 };

export interface ArtInput {
  c: ReflexCard;
  kind: ArtKind;
  /** contenu du guillochis (Légendaires) */
  guil: string;
  /** nombre de colonnes de la rangée de chiffres (0 = pas de rangée) */
  cols: number;
}

/** décor complet de la carte (tout sauf les textes), en SVG 240 × 336 */
export function cardArtSvg({ c, kind, guil, cols }: ArtInput): string {
  const rc = artColor(kind), fossil = kind === "F", upcoming = kind === "X";
  const tier = fossil ? 5 : upcoming ? 0 : RAR_INDEX(kind as ReflexCard["r"]);
  const x: Ctx = { key: `og${h32(c.id)}`, n: 0 };
  const metal = METAL[kind];
  const defs: string[] = [];
  const g: string[] = [];

  /* cadre métal */
  defs.push(`<linearGradient id="mt" x1="0" y1="0" x2="1" y2="1">${metal.map((s, i) => `<stop offset="${F(i / (metal.length - 1))}" stop-color="${s}"/>`).join("")}</linearGradient>`);
  defs.push(`<clipPath id="face"><path d="${FACE}"/></clipPath>`);
  g.push(`<path d="${CARD}" fill="url(#mt)"/>`);

  /* fond de la face (.rc-face, .rc-tex) : dégradés, rayons en soleil et halos de chaque rareté, comme le CSS */
  const FULL = `x="4" y="4" width="232" height="328"`;
  const ellipse = (id: string, cx: number, cy: number, rx: number, ry: number, color: string, op: number, end: number) => {
    defs.push(`<radialGradient id="${id}" cx="${F(cx)}" cy="${F(cy)}" r="${F(rx)}" gradientUnits="userSpaceOnUse" gradientTransform="translate(${F(cx)} ${F(cy)}) scale(1 ${(ry / rx).toFixed(3)}) translate(${F(-cx)} ${F(-cy)})"><stop offset="0" stop-color="${color}" stop-opacity="${op}"/><stop offset="${end}" stop-color="${color}" stop-opacity="0"/></radialGradient>`);
    return `<rect ${FULL} fill="url(#${id})"/>`;
  };
  const lin = (id: string, stops: [number, string, number?][], x1 = ".37", x2 = ".63", y2 = "1") => {
    defs.push(`<linearGradient id="${id}" x1="${x1}" y1="0" x2="${x2}" y2="${y2}">${stops.map(([o, col, op]) => `<stop offset="${o}" stop-color="${col}"${op == null ? "" : ` stop-opacity="${op}"`}/>`).join("")}</linearGradient>`);
    return `<rect ${FULL} fill="url(#${id})"/>`;
  };
  /* repeating-conic-gradient(from 0deg at 50% 22%, couleur 0 `on`°, transparent jusqu'à `period`°) */
  const rays = (period: number, on: number, color: string, op: number) => {
    const ox = 120, oy = 76, L = 420;
    let d = "";
    for (let a = 0; a < 360; a += period) {
      const a0 = ((a - 90) * Math.PI) / 180, a1 = ((a + on - 90) * Math.PI) / 180;
      d += `M${ox} ${oy}L${F(ox + L * Math.cos(a0))} ${F(oy + L * Math.sin(a0))}L${F(ox + L * Math.cos(a1))} ${F(oy + L * Math.sin(a1))}Z`;
    }
    return `<path d="${d}" fill="${color}" fill-opacity="${op}"/>`;
  };
  /* repeating-linear-gradient de filets fins (angle CSS, pas, couleur) */
  const lines = (id: string, deg: number, step: number, color: string, op: number) => {
    defs.push(`<pattern id="${id}" width="${step}" height="${step}" patternUnits="userSpaceOnUse" patternTransform="rotate(${deg - 90})"><rect x="${step - 1}" width="1" height="${step}" fill="${color}" fill-opacity="${op}"/></pattern>`);
    return `<rect ${FULL} fill="url(#${id})"/>`;
  };
  const face: string[] = [];
  if (fossil) face.push(lin("fb", [[0, "#5b4d3d"], [0.55, "#3a3128"], [1, "#2a231c"]]), ellipse("fr", 73.6, 69.6, 209, 197, "#fff0d7", 0.18, 0.6));
  else if (kind === "C") {
    defs.push(`<pattern id="cs" width="2" height="10" patternUnits="userSpaceOnUse"><rect width="1" height="10" fill="#fff" fill-opacity=".04"/></pattern>`);
    face.push(lin("fb", [[0, "#2a313c"], [0.55, "#181d25"], [1, "#11151b"]], ".41", ".59"), ellipse("fr", 120, 4, 209, 164, "#ffffff", 0.1, 0.6), `<rect ${FULL} fill="url(#cs)"/>`);
    /* liseré du haut aux couleurs de la famille (.rc-r-C .rc-face::before) */
    face.push(`<rect x="4" y="4" width="232" height="3" fill="${(FAM[c.fam] || FAM["Layer 1"]).c}" opacity=".85"/>`);
  } else if (kind === "L") face.push(lin("fb", [[0, "#2a1d07"], [0.52, "#0d0d10"], [1, "#211706"]]), ellipse("fr", 120, 83, 162, 138, "#f5b52a", 0.38, 0.72));
  else face.push(lin("fb", [[0, mix(rc, "#0b0f17", 0.2)], [0.56, "#080b12"], [1, mix(rc, "#06080c", 0.12)]]), ellipse("fr", 120, 83, 162, 138, rc, 0.34, 0.72));
  if (kind === "PC") face.push(lines("p1", 60, 22, "#a7f3d0", 0.09), lines("p2", -60, 22, "#a7f3d0", 0.09), lin("p3", [[0, "#34d399", 0.12], [0.55, "#34d399", 0]], ".33", ".67"));
  if (kind === "R") face.push(rays(15, 5, "#7dd3fc", 0.11), lines("r1", 60, 26, "#bae6fd", 0.05));
  if (kind === "SR") face.push(ellipse("s1", 45.8, 240.2, 92.8, 98.4, "#ec4899", 0.24, 0.7), ellipse("s2", 203.5, 187.7, 104.4, 98.4, "#818cf8", 0.28, 0.7), rays(12, 4, "#c4b5fd", 0.08));
  if (kind === "UR") face.push(rays(10, 4, "#fdba74", 0.17), ellipse("u1", 120, 76.2, 139.2, 131.2, "#fb923c", 0.3, 0.7));
  if (kind === "L") face.push(rays(9, 3, "#fde68a", 0.22), ellipse("l1", 120, 76.2, 139.2, 131.2, "#f5b52a", 0.38, 0.7));
  /* guillochis des Légendaires (.rc-gl) */
  if (kind === "L" && guil) face.push(`<svg x="4" y="4" width="232" height="328" viewBox="0 0 240 336" preserveAspectRatio="none" opacity=".6"><g transform="translate(120 82) scale(.78) translate(-120 -148)">${guil}</g></svg>`);
  /* motif de la rareté (ou de la famille pour la Commune ; craquelures pour le fossile) à 42 % (.rc-pat) */
  const pat = fossil ? pattern(c, rc, "cracks") : upcoming ? pattern(c, rc, "rings") : pattern(c, rc, RPAT[kind as ReflexCard["r"]]);
  face.push(`<g opacity=".42">${at(pat, 4, 4, 232, 328)}</g>`);
  /* plaque sombre du bas (.rc-plate) */
  defs.push(`<linearGradient id="pl" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#000" stop-opacity=".42"/><stop offset=".7" stop-color="#000" stop-opacity=".22"/><stop offset="1" stop-color="#000" stop-opacity=".1"/></linearGradient>`);
  face.push(`<path d="${PLATE}" fill="url(#pl)"/><path d="M12 193.5 H228" stroke="${rc}" stroke-opacity=".45"/>`);
  /* ornements d'angle : filigrane à partir de la Super rare, sinon coins sobres (.rc-deco) */
  face.push(at(fossil ? corners("#6f6253") : tier >= 3 ? filigree(rc) : corners(rc), 4, 4, 232, 328));
  /* étincelles de l'Ultra rare et de la Légendaire (.rc-spark) */
  if (kind === "L" || kind === "UR") {
    const R = rng(h32(c.id + (kind === "L" ? "sp" : "ur"))), n = kind === "L" ? 8 : 7;
    defs.push(`<filter id="spk" x="-200%" y="-200%" width="500%" height="500%"><feGaussianBlur stdDeviation="2.5"/></filter>`);
    for (let i = 0; i < n; i++) {
      const sx = 4 + ((6 + R() * 86) / 100) * 232, sy = 4 + ((kind === "L" ? 4 + R() * 80 : 30 + R() * 60) / 100) * 328;
      R(); /* délai d'animation de la maquette : garde la même suite de tirages */
      const sk = kind === "L" ? "#fde68a" : ["#fdba74", "#fb923c", "#fed7aa"][i % 3];
      face.push(`<circle cx="${F(sx)}" cy="${F(sy)}" r="4" fill="${sk}" opacity=".7" filter="url(#spk)"/><circle cx="${F(sx)}" cy="${F(sy)}" r="1.5" fill="#fff"/>`);
    }
  }
  /* reflet de feuille métallisée en diagonale (Ultra rare, Légendaire) */
  if (kind === "L" || kind === "UR") {
    defs.push(`<linearGradient id="sh" x1="0" y1="0" x2="1" y2="1"><stop offset=".3" stop-color="#fff" stop-opacity="0"/><stop offset=".45" stop-color="#fff" stop-opacity=".09"/><stop offset=".5" stop-color="#fff" stop-opacity=".16"/><stop offset=".55" stop-color="#fff" stop-opacity=".09"/><stop offset=".7" stop-color="#fff" stop-opacity="0"/></linearGradient>`);
    face.push(`<rect x="4" y="4" width="232" height="328" fill="url(#sh)"/>`);
  }
  if (kind === "UR" || kind === "L") {
    defs.push(`<filter id="ig" x="-10%" y="-10%" width="120%" height="120%"><feGaussianBlur stdDeviation="${kind === "L" ? 16 : 13}"/></filter>`);
    face.push(`<path d="${FACE}" fill="none" stroke="${kind === "L" ? "#f5b52a" : "#fb923c"}" stroke-opacity=".26" stroke-width="${kind === "L" ? 40 : 32}" filter="url(#ig)"/>`);
  }
  g.push(`<g clip-path="url(#face)">${face.join("")}</g>`);
  /* filet intérieur (.rc-inner) */
  g.push(`<path d="${INNER}" fill="none" stroke="${rc}" stroke-opacity=".38"/>`);

  /* bandeau du nom (.rc-nm) : dégradé de la rareté ; la Commune a sa barre métal */
  if (kind === "C") {
    defs.push(`<linearGradient id="nb" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#2b323d"/><stop offset=".5" stop-color="#3a4350"/><stop offset="1" stop-color="#2b323d"/></linearGradient><linearGradient id="nb2" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".1"/><stop offset=".45" stop-color="#fff" stop-opacity=".02"/><stop offset="1" stop-color="#000" stop-opacity=".25"/></linearGradient>`);
    g.push(`<rect x="4" y="146" width="232" height="30" fill="url(#nb)"/><rect x="4" y="146" width="232" height="30" fill="url(#nb2)"/><path d="M4 146.5 H236" stroke="#fff" stroke-opacity=".18"/><path d="M4 175.5 H236" stroke="#000" stroke-opacity=".5"/>`);
  } else {
    const nc = kind === "L" ? "#e9b949" : rc;
    defs.push(`<linearGradient id="nb" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${nc}" stop-opacity="0"/><stop offset=".22" stop-color="${nc}" stop-opacity=".16"/><stop offset=".78" stop-color="${nc}" stop-opacity=".16"/><stop offset="1" stop-color="${nc}" stop-opacity="0"/></linearGradient>`);
    g.push(`<rect x="4" y="146" width="232" height="30" fill="url(#nb)"/>`);
  }
  /* rangée de chiffres (.rc-stats) : filets de la rareté, séparateurs */
  if (cols > 0) {
    defs.push(`<linearGradient id="st" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#000" stop-opacity=".18"/><stop offset="1" stop-color="#000" stop-opacity=".05"/></linearGradient>`);
    g.push(`<rect x="16" y="197" width="208" height="44" fill="url(#st)"/><path d="M16 197.5 H224 M16 240.5 H224" stroke="${rc}" stroke-opacity=".38"/>`);
    for (let i = 1; i < cols; i++) g.push(`<path d="M${F(16 + (208 * i) / cols)} 198 V240" stroke="#fff" stroke-opacity=".06"/>`);
  }

  /* médaillon (.rc-medal) : lauriers, halo, lunette, disque, logo, reflet du dôme */
  const { cx, cy } = MEDAL;
  if (kind === "L") g.push(`<g filter="url(#lsh)">${at(laurel(x), cx - 70, cy - 70, 140, 140)}</g>`), defs.push(`<filter id="lsh" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur in="SourceAlpha" stdDeviation="1.5"/><feOffset dy="2"/><feComponentTransfer><feFuncA type="linear" slope=".55"/></feComponentTransfer><feMerge><feMergeNode/><feMergeNode in="SourceGraphic"/></feMerge></filter>`);
  defs.push(`<radialGradient id="gl"><stop offset="0" stop-color="${rc}" stop-opacity=".45"/><stop offset=".68" stop-color="${rc}" stop-opacity="0"/></radialGradient>`);
  if (!fossil) g.push(`<circle cx="${cx}" cy="${cy}" r="62" fill="url(#gl)"/>`);
  g.push(at(ring(x, upcoming ? "C" : fossil ? "L" : (kind as ReflexCard["r"]), rc, fossil ? "fossil" : null), cx - 54, cy - 54, 108, 108));
  if (fossil) defs.push(`<radialGradient id="ds" cx=".38" cy=".3" r=".75"><stop offset="0" stop-color="#ffe2a0"/><stop offset=".26" stop-color="#e6a23c"/><stop offset=".6" stop-color="#b0680f"/><stop offset="1" stop-color="#4f2a05"/></radialGradient>`);
  else defs.push(`<radialGradient id="ds" cx=".35" cy=".3" r=".75"><stop offset="0" stop-color="${kind === "C" ? "#3a424f" : "#1c2433"}"/><stop offset=".7" stop-color="${kind === "C" ? "#0e1116" : "#07090e"}"/></radialGradient>`);
  g.push(`<circle cx="${cx}" cy="${cy}" r="40" fill="url(#ds)"/><circle cx="${cx}" cy="${cy}" r="39" fill="none" stroke="#000" stroke-opacity=".55" stroke-width="3"/><circle cx="${cx}" cy="${cy}" r="40.5" fill="none" stroke="${fossil ? "#6f6253" : "#fff"}" stroke-opacity="${fossil ? 1 : 0.08}" stroke-width="${fossil ? 2 : 1}"/>`);
  /* logo, teinte sépia du fossile et reflet du dôme : posés par-dessus en HTML (opengraph-image.tsx), le moteur ne rendant
     pas une image imbriquée dans ce SVG */

  /* pastille de famille sous le ticker (.rc-fic) et gemme de rareté (.rc-gem) */
  if (!upcoming && !fossil) {
    g.push(`<rect x="30.5" y="54.5" width="22" height="22" rx="6" fill="#000" fill-opacity=".3" stroke="${rc}" stroke-opacity=".45"/>`);
    g.push(at(famIcon(c.fam).replace(/currentColor/g, rc), 35, 59, 13, 13));
    defs.push(`<linearGradient id="gm" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff"/><stop offset=".4" stop-color="${rc}"/><stop offset="1" stop-color="${mix(rc, "#000000", 0.6)}"/></linearGradient>`);
    g.push(`<path d="M212 18 L224 30 L212 42 L200 30 Z" fill="url(#gm)"/>`);
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" width="300" height="420" viewBox="0 0 240 336"><defs>${defs.join("")}</defs>${g.join("")}</svg>`;
}
/* emblème de la série (.rc-set, l'écusson doré « R ») en data URI ; la lettre est posée en texte (le SVG d'une image n'a pas de police) */
export const EMB_SVG = `data:image/svg+xml;base64,${Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="40" height="56" viewBox="0 0 40 56"><path d="M4 0H36L40 4V49L20 56L0 49V4Z" fill="#e3b34c"/><path d="M6.2 3.2H33.8L36.8 6.2V47L20 52.6L3.2 47V6.2Z" fill="#141a26"/></svg>').toString("base64")}`;

/** « Le saviez-vous ? » de la carte : partie en gras + suite, texte brut (c.ab est du HTML échappé) */
export function abParts(ab: string): { b: string; t: string } {
  const dec = (s: string) => s.replace(/<[^>]+>/g, "").replace(/&#39;|'/g, "’").replace(/&quot;/g, '"').replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&").trim();
  const m = /^<b>([\s\S]*?)<\/b>\s*([\s\S]*)$/.exec(ab.trim());
  return m ? { b: dec(m[1]), t: dec(m[2]) } : { b: "", t: dec(ab) };
}

export { shade };
