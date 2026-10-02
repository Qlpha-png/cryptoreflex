/**
 * Reflex Cards — rendu HTML d'une carte (portage fidèle de `card()` de la maquette v8).
 *
 * Source unique : Reflex-Cards/src/maquette-v8.src.html. Ce fichier en reprend les
 * fonctions de dessin (motifs, médaillon, lauriers, cadre) À L'IDENTIQUE : le test
 * `tests/reflex-cards-render.test.ts` compare l'empreinte du HTML produit ici à celle
 * de la maquette, pour chacune des 883 cartes. Toute retouche visuelle se fait dans
 * la maquette, puis `node src/export-site.mjs` régénère données, CSS et empreintes.
 *
 * Les mesures typographiques (taille du nom, fait affiché sur 3 lignes, taille du
 * sous-titre) et la chance par carte sont calculées dans la maquette, avec les vraies
 * polices, puis exportées dans data/reflex-cards.json.
 *
 * Pur (pas de DOM) : utilisable côté serveur.
 */
import type { ReflexCard, Rarity } from "./types";

export const RAR: Rarity[] = ["C", "PC", "R", "SR", "UR", "L"];
export const RNAME: Record<Rarity, string> = { C: "Commune", PC: "Peu commune", R: "Rare", SR: "Super rare", UR: "Ultra rare", L: "Légendaire" };
export const PIPS: Record<Rarity, string> = { C: "◆", PC: "◆◆", R: "◆◆◆", SR: "★", UR: "★★", L: "★★★" };
export const RC: Record<Rarity, string> = { C: "#9aa3b2", PC: "#34d399", R: "#38bdf8", SR: "#a78bfa", UR: "#fb923c", L: "#f5b52a" };

/* familles : couleur, motif de fond (Commune), icône */
export const FAM: Record<string, { c: string; pat: string; i: string }> = {
  "Layer 1": { c: "#60a5fa", pat: "hex", i: '<path d="M8 1.5 14 5v6l-6 3.5L2 11V5z"/><path d="M2 5l6 3.5L14 5M8 8.5V14.5"/>' },
  "Layer 2": { c: "#818cf8", pat: "layers", i: '<path d="M8 2 14 5 8 8 2 5z"/><path d="M2 8l6 3 6-3M2 11l6 3 6-3"/>' },
  "DeFi": { c: "#34d399", pat: "rings", i: '<path d="M3 5h9l-2.5-2.5M13 11H4l2.5 2.5"/>' },
  "Oracle": { c: "#22d3ee", pat: "rays", i: '<path d="M1.5 8S4 3.5 8 3.5 14.5 8 14.5 8 12 12.5 8 12.5 1.5 8 1.5 8z"/><circle cx="8" cy="8" r="2"/>' },
  "Infrastructure": { c: "#94a3b8", pat: "hex", i: '<circle cx="3.5" cy="4" r="1.5"/><circle cx="12.5" cy="4" r="1.5"/><circle cx="8" cy="12.5" r="1.5"/><path d="M4.8 4.8 7 11.2M11.2 4.8 9 11.2M5 4h6"/>' },
  "IA": { c: "#f472b6", pat: "rays", i: '<rect x="4" y="4" width="8" height="8" rx="1.5"/><path d="M6.5 1.5v2.5M9.5 1.5v2.5M6.5 12v2.5M9.5 12v2.5M1.5 6.5H4M1.5 9.5H4M12 6.5h2.5M12 9.5h2.5"/>' },
  "Jeu": { c: "#fb7185", pat: "grid", i: '<path d="M4.5 5h7a3 3 0 0 1 3 3v1.5a2 2 0 0 1-3.5 1.3L10 9.5H6l-1 1.3A2 2 0 0 1 1.5 9.5V8a3 3 0 0 1 3-3z"/><path d="M4.5 6.8v2M3.5 7.8h2"/>' },
  "Vie privée": { c: "#cbd5e1", pat: "hex", i: '<path d="M8 1.5 13.5 3.5V8c0 3-2.5 5.5-5.5 6.5C5 13.5 2.5 11 2.5 8V3.5z"/><path d="M6 8.5h4v3H6zM7 8.5V7a1 1 0 0 1 2 0v1.5"/>' },
  "Plateforme": { c: "#fbbf24", pat: "rings", i: '<path d="M2 6 8 2.5 14 6M3.5 6.5v6M6.5 6.5v6M9.5 6.5v6M12.5 6.5v6M2 13.5h12"/>' },
  "Memecoin": { c: "#fb923c", pat: "confetti", i: '<circle cx="8" cy="8" r="6"/><path d="M5.5 9.5s1 1.5 2.5 1.5 2.5-1.5 2.5-1.5"/><circle cx="6" cy="6.5" r=".6"/><circle cx="10" cy="6.5" r=".6"/>' },
  "Stablecoin": { c: "#4ade80", pat: "grid", i: '<circle cx="8" cy="8" r="6"/><path d="M10 5.5H7a1.5 1.5 0 0 0 0 3h2a1.5 1.5 0 0 1 0 3H6M8 4v8"/>' },
  "Actifs réels": { c: "#c084fc", pat: "grid", i: '<path d="M2.5 7.5 8 3l5.5 4.5V14h-11z"/><path d="M6.5 14v-4h3v4"/>' },
};
export const famIcon = (f: string) =>
  `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round">${(FAM[f] || FAM["Layer 1"]).i}</svg>`;

/* Fossile : seule édition affichée par le site pour l'instant (Musée des Fossiles) */
const FOSSIL_COLOR = "#a8927a";
/* motif de fond par rareté : la matière dit la rareté (la Commune garde le motif de sa famille) */
const RPAT: Partial<Record<Rarity, string>> = { PC: "hex", R: "facets", SR: "crystals", UR: "embers", L: "rays" };
const RAR_INDEX = (r: Rarity) => RAR.indexOf(r);

export const esc = (s: unknown) =>
  String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] as string);
export const IMG = (p: string, size = "large") => "https://coin-images.coingecko.com/coins/images/" + p.replace("/", "/" + size + "/");
const f1 = (v: number) => v.toFixed(1);
function h32(s: string) {
  let h = 2166136261;
  for (const c of s) {
    h ^= c.charCodeAt(0);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
function rng(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export function shade(hex: string, a: number) {
  const n = parseInt(hex.slice(1), 16), r = n >> 16, g = (n >> 8) & 255, b = n & 255, t = a < 0 ? 0 : 255, p = Math.abs(a);
  return "#" + [r, g, b].map((v) => Math.round(v + (t - v) * p).toString(16).padStart(2, "0")).join("");
}

/* identifiants SVG uniques dans la page : mg_<instance>_<n> (médaillon), lr_<instance>_<n> (lauriers) */
interface Ctx { key: string; n: number }
const uid = (x: Ctx, p: "mg" | "lr") => `${p}_${x.key}_${++x.n}`;

/* ---------- motifs ---------- */
function pattern(c: { id: string; fam: string }, col: string, kind?: string) {
  const R = rng(h32(c.id + "pat"));
  let g = "";
  switch (kind || FAM[c.fam].pat) {
    case "hex": {
      const r = 16, dx = r * Math.sqrt(3), dy = r * 1.5;
      for (let row = -1; row < 18; row++)
        for (let k = -1; k < 9; k++) {
          const cx = k * dx + (row % 2 ? dx / 2 : 0), cy = row * dy;
          let p = "";
          for (let i = 0; i < 6; i++) {
            const a = (Math.PI / 180) * (60 * i - 30);
            p += f1(cx + r * Math.cos(a)) + "," + f1(cy + r * Math.sin(a)) + " ";
          }
          g += `<polygon points="${p}" fill="none" stroke="${col}" stroke-opacity="${(0.05 + R() * 0.2).toFixed(2)}"/>`;
        }
      break;
    }
    case "layers":
      for (let i = 0; i < 16; i++) {
        const y = i * 22 + R() * 6;
        g += `<path d="M-10 ${f1(y)} L250 ${f1(y - 60)}" stroke="${col}" stroke-opacity="${(0.08 + R() * 0.18).toFixed(2)}" stroke-width="${f1(1 + R() * 5)}"/>`;
      }
      break;
    case "rings":
      for (let i = 1; i <= 9; i++)
        g += `<circle cx="120" cy="80" r="${i * 22}" fill="none" stroke="${col}" stroke-opacity="${(0.26 - i * 0.024).toFixed(2)}" stroke-dasharray="${Math.round(3 + R() * 14)} ${Math.round(3 + R() * 10)}"/>`;
      break;
    case "rays":
      for (let i = 0; i < 44; i++) {
        const a = (i / 44) * 6.283;
        g += `<line x1="120" y1="80" x2="${f1(120 + 320 * Math.cos(a))}" y2="${f1(80 + 320 * Math.sin(a))}" stroke="${col}" stroke-opacity="${(0.04 + R() * 0.14).toFixed(2)}"/>`;
      }
      break;
    case "grid":
      for (let i = 0; i < 26; i++) {
        g += `<line x1="0" y1="${i * 14}" x2="240" y2="${i * 14}" stroke="${col}" stroke-opacity=".07"/>`;
        if (i < 18) g += `<line x1="${i * 14}" y1="0" x2="${i * 14}" y2="340" stroke="${col}" stroke-opacity=".05"/>`;
      }
      break;
    case "confetti": {
      const pal = ["#fb923c", "#f472b6", "#facc15", "#34d399", "#38bdf8", "#a78bfa"];
      for (let i = 0; i < 40; i++) {
        const x = R() * 240, y = R() * 340, s = 2 + R() * 6, cl = pal[Math.floor(R() * 6)];
        g += R() < 0.5
          ? `<circle cx="${f1(x)}" cy="${f1(y)}" r="${f1(s / 2)}" fill="${cl}" opacity=".4"/>`
          : `<rect x="${f1(x)}" y="${f1(y)}" width="${f1(s)}" height="${f1(s / 2.5)}" fill="${cl}" opacity=".4" transform="rotate(${Math.round(R() * 180)} ${f1(x)} ${f1(y)})"/>`;
      }
      break;
    }
    case "embers": {
      for (let i = 0; i < 70; i++) {
        const x = R() * 240, y = R() * 340, s = R(), c2 = ["#ff3b2f", "#ffb347", "#c1121f", "#7a0a16"][Math.floor(R() * 4)];
        g += `<circle cx="${f1(x)}" cy="${f1(y)}" r="${f1(0.4 + s * 1.4)}" fill="${c2}" opacity="${(0.18 + s * 0.55).toFixed(2)}"/>`;
      }
      for (let k = 0; k < 6; k++) {
        let d = `M${f1(20 + k * 40)} 345`;
        for (let y = 330; y >= -10; y -= 20) d += ` Q${f1(20 + k * 40 + Math.sin(y / 30 + k) * 18)} ${y + 10} ${f1(20 + k * 40 + Math.sin(y / 22 + k * 2) * 10)} ${y}`;
        g += `<path d="${d}" fill="none" stroke="#c1121f" stroke-opacity="${(0.05 + R() * 0.07).toFixed(2)}" stroke-width="${f1(6 + R() * 10)}"/>`;
      }
      break;
    }
    case "facets": {
      /* saphir taillé : treillis de losanges */
      for (let y = -20; y < 360; y += 26)
        for (let x = -20; x < 260; x += 30) {
          const o = (y / 26) % 2 ? 15 : 0;
          g += `<path d="M${x + o} ${y}l15 13-15 13-15-13z" fill="${col}" fill-opacity="${(0.02 + R() * 0.06).toFixed(3)}" stroke="#bae6fd" stroke-opacity="${(0.08 + R() * 0.16).toFixed(2)}" stroke-width=".6"/>`;
        }
      break;
    }
    case "crystals": {
      /* améthyste : éclats de cristal */
      for (let i = 0; i < 18; i++) {
        const x = R() * 240, y = 60 + R() * 280, w = 10 + R() * 26, h = 24 + R() * 60, a = R() * 50 - 25;
        g += `<path d="M${f1(x)} ${f1(y - h / 2)}L${f1(x + w / 2)} ${f1(y)}L${f1(x)} ${f1(y + h / 2)}L${f1(x - w / 2)} ${f1(y)}Z" transform="rotate(${f1(a)} ${f1(x)} ${f1(y)})" fill="#c4b5fd" fill-opacity="${(0.03 + R() * 0.08).toFixed(3)}" stroke="#ede9fe" stroke-opacity="${(0.12 + R() * 0.25).toFixed(2)}" stroke-width=".6"/><path d="M${f1(x)} ${f1(y - h / 2)}L${f1(x)} ${f1(y + h / 2)}" transform="rotate(${f1(a)} ${f1(x)} ${f1(y)})" stroke="#ede9fe" stroke-opacity=".18" stroke-width=".5"/>`;
      }
      break;
    }
    case "cracks":
      g = `<path d="M150 0 L140 40 L160 70 L135 120 L150 160" stroke="#000" stroke-opacity=".45" fill="none" stroke-width="1.3"/><path d="M0 210 L40 200 L60 225 L100 215" stroke="#000" stroke-opacity=".4" fill="none"/><path d="M240 250 L205 262 L190 300 L200 340" stroke="#000" stroke-opacity=".4" fill="none"/>`;
      break;
    default:
      throw new Error("motif inconnu : " + kind);
  }
  return `<svg viewBox="0 0 240 340" preserveAspectRatio="xMidYMid slice" aria-hidden="true">${g}</svg>`;
}
/* ornements d'angle sobres pour Commune / Peu commune / Rare */
function corners(col: string) {
  const c = `<path d="M10 30 V15 L15 10 H30" fill="none" stroke="${col}" stroke-width="1.3" stroke-opacity=".7"/><circle cx="30" cy="10" r="1.5" fill="${col}" fill-opacity=".8"/><circle cx="10" cy="30" r="1.5" fill="${col}" fill-opacity=".8"/>`;
  return `<svg viewBox="0 0 232 328" preserveAspectRatio="none" aria-hidden="true"><g>${c}</g><g transform="translate(232 0) scale(-1 1)">${c}</g></svg>`;
}
function filigree(col: string) {
  const c = `<path d="M4 34 C4 16 16 4 34 4" fill="none" stroke="${col}" stroke-width="1.2" opacity=".75"/><path d="M9 34 C9 20 20 9 34 9" fill="none" stroke="${col}" stroke-width=".7" opacity=".55"/><circle cx="34" cy="4" r="1.8" fill="${col}"/><circle cx="4" cy="34" r="1.8" fill="${col}"/><path d="M14 14 l4 -6 l4 6 l-4 6z" fill="${col}" opacity=".7"/>`;
  return `<svg viewBox="0 0 232 328" preserveAspectRatio="none" aria-hidden="true"><g>${c}</g><g transform="translate(232 0) scale(-1 1)">${c}</g></svg>`;
}
/* lunette du médaillon : métal dégradé (reflets clairs/sombres) + ornements selon la rareté */
function ring(x: Ctx, r: Rarity, col: string, ed: string | null) {
  const id = uid(x, "mg"), tier = ed ? 5 : RAR_INDEX(r);
  let g = `<defs><linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${shade(col, 0.65)}"/><stop offset=".35" stop-color="${col}"/><stop offset=".6" stop-color="${shade(col, -0.45)}"/><stop offset="1" stop-color="${shade(col, 0.4)}"/></linearGradient></defs>
    <circle cx="54" cy="54" r="44" fill="none" stroke="url(#${id})" stroke-width="4"/>`;
  if (tier >= 1) g += `<circle cx="54" cy="54" r="50" fill="none" stroke="${col}" stroke-opacity=".4" stroke-width="1"/>`;
  if (tier >= 2)
    for (let i = 0; i < 36; i++) {
      const a = (i / 36) * 6.283, r1 = i % 3 ? 48 : 46.5;
      g += `<line x1="${f1(54 + r1 * Math.cos(a))}" y1="${f1(54 + r1 * Math.sin(a))}" x2="${f1(54 + 51.5 * Math.cos(a))}" y2="${f1(54 + 51.5 * Math.sin(a))}" stroke="${col}" stroke-opacity=".55"/>`;
    }
  if (tier >= 3)
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * 6.283 - 1.5708, cx = 54 + 50 * Math.cos(a), cy = 54 + 50 * Math.sin(a);
      g += `<rect x="${f1(cx - 3.2)}" y="${f1(cy - 3.2)}" width="6.4" height="6.4" fill="url(#${id})" stroke="${shade(col, 0.7)}" stroke-width=".6" transform="rotate(45 ${f1(cx)} ${f1(cy)})"/>`;
    }
  if (tier >= 5)
    for (const s of [-1, 1])
      for (let i = 0; i < 7; i++) {
        const a = ((100 + i * 18) * Math.PI) / 180, cx = 54 + s * 47 * Math.cos(a), cy = 54 + 47 * Math.sin(a);
        g += `<ellipse cx="${f1(cx)}" cy="${f1(cy)}" rx="5.5" ry="2.4" fill="url(#${id})" transform="rotate(${f1(s * (i * 18 + 10))} ${f1(cx)} ${f1(cy)})"/>`;
      }
  return `<svg class="ring" viewBox="0 0 108 108" aria-hidden="true">${g}</svg>`;
}
/* couronne de lauriers dorée autour du médaillon : la signature de la Légendaire */
function laurel(x: Ctx) {
  const u = uid(x, "lr");
  let lv = "";
  /* berceau de lauriers sous le médaillon (ne touche ni la note ni la gemme) : θ de 96° à 150° de chaque côté */
  const A0 = 96, STEP = 7.5, N = 8, r = 58;
  for (const sd of [-1, 1])
    for (let i = 0; i < N; i++) {
      const th = ((A0 + i * STEP) * Math.PI) / 180, cx = 70 - sd * r * Math.cos(th), cy = 70 + r * Math.sin(th),
        tan = ((Math.atan2(r * Math.cos(th), -r * Math.sin(th)) * 180) / Math.PI) * (sd < 0 ? 1 : -1);
      for (const k of [-1, 1]) {
        const ox = cx - sd * k * Math.cos(th) * 4, oy = cy + k * Math.sin(th) * 4;
        lv += `<ellipse cx="${f1(ox)}" cy="${f1(oy)}" rx="6" ry="2.3" transform="rotate(${f1(tan + k * sd * 30)} ${f1(ox)} ${f1(oy)})" fill="url(#${u})"/>`;
      }
    }
  const arc = (sd: number) => {
    let d = "";
    for (let i = 0; i < N; i++) {
      const th = ((A0 + i * STEP) * Math.PI) / 180;
      d += (d ? "L" : "M") + f1(70 - sd * r * Math.cos(th)) + " " + f1(70 + r * Math.sin(th));
    }
    return d;
  };
  return `<svg class="laurel" viewBox="0 0 140 140" aria-hidden="true"><defs><linearGradient id="${u}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff2c6"/><stop offset=".45" stop-color="#e9b949"/><stop offset="1" stop-color="#8c6414"/></linearGradient></defs>
    <path d="${arc(-1)}" fill="none" stroke="url(#${u})" stroke-width="1.2"/><path d="${arc(1)}" fill="none" stroke="url(#${u})" stroke-width="1.2"/>${lv}
    <path d="M70 123l4.4 5-4.4 5-4.4-5z" fill="url(#${u})" stroke="#5a3d0a" stroke-width=".5"/></svg>`;
}
const logoTag = (c: ReflexCard, size = "large", cls = "lg") =>
  `<img class="${cls}" src="${IMG(c.img, size)}" alt="" loading="lazy" decoding="async" referrerpolicy="no-referrer" onerror="this.style.visibility='hidden'">`;

export interface CardEnv {
  /** nombre de cartes de l'album (pied de carte « S1 · 004/881 ») */
  ncards: number;
  /** emblème miniature de la série (SVG) */
  emb: string;
}

/**
 * HTML de la carte tel que la maquette le produit (classes non préfixées, guilloché en `#bkguil`).
 * `key` rend les identifiants SVG uniques quand une même carte apparaît deux fois dans la page.
 */
export function cardHTMLRaw(c: ReflexCard, env: CardEnv, key: string = c.id, chanceText: string = c.chance): string {
  const x: Ctx = { key: key.replace(/[^A-Za-z0-9-]/g, "-"), n: 0 };
  const ed = c.fossil ? "fossil" : null;
  const col = ed ? FOSSIL_COLOR : RC[c.r];
  let tag = "", rarTag = false, bg: string, deco = "", extra = "";
  if (ed === "fossil") {
    tag = "Fossile";
    bg = pattern(c, col, "cracks");
    extra = `<div class="stamp">HORS CIRCULATION</div>`;
  } else {
    bg = pattern(c, col, RPAT[c.r]);
    if (c.r === "L") deco = `<svg class="gl" viewBox="0 0 240 336" preserveAspectRatio="none" aria-hidden="true"><use href="#bkguil" transform="translate(120 82) scale(.78) translate(-120 -148)"/></svg>`;
    tag = RNAME[c.r];
    rarTag = true;
  }
  const ab = c.ab;
  const tier = ed ? 6 : RAR_INDEX(c.r), glam = !ed && c.r === "L", foil = glam;
  let sp = "";
  if (!glam && !ed && c.r === "UR") {
    const R = rng(h32(c.id + "ur"));
    for (let i = 0; i < 7; i++)
      sp += `<i class="spark" style="--sk:${["#fdba74", "#fb923c", "#fed7aa"][i % 3]};left:${Math.round(6 + R() * 86)}%;top:${Math.round(30 + R() * 60)}%;animation-delay:${f1(R() * 2.8)}s"></i>`;
  }
  if (glam) {
    const R = rng(h32(c.id + "sp")), n = 8;
    for (let i = 0; i < n; i++)
      sp += `<i class="spark" style="--sk:#fde68a;left:${Math.round(6 + R() * 86)}%;top:${Math.round(4 + R() * 80)}%;animation-delay:${f1(R() * 2.8)}s"></i>`;
  }
  const fil = ed === "fossil"
    ? `<div class="deco">${corners("#6f6253")}</div>`
    : tier >= 3 ? `<div class="deco">${filigree(col)}</div>` : `<div class="deco">${corners(col)}</div>`;
  const rarLabel = ed ? "Fossile" : RNAME[c.r], subTxt = c.sub + (c.year ? " · " + c.year : ""), n = c.nm;
  /* 3 faits toujours renseignés : (score Cryptoreflex | année | n° d'album), notoriété, chance de tirer CETTE carte */
  const score = c.score, f1c: [string, string | number] = score != null ? ["SCORE CR", score] : c.year ? ["LANCÉ", c.year] : ["N° ALBUM", String(c.num).padStart(3, "0")];
  const chance = chanceText;
  return `<div style="--fc:${ed === "fossil" ? FOSSIL_COLOR : (FAM[c.fam] || FAM["Layer 1"]).c}" class="card r-${c.r}${ed ? " ed-" + ed : ""}" data-tilt data-id="${c.id}" data-ed="${ed || ""}" data-fin="" data-serial=""><div class="card-in"><div class="face">
    ${deco}<img class="amb" src="${IMG(c.img, "small")}" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.remove()"><div class="tex"></div><div class="pat">${bg}</div><div class="plate"></div><div class="grain"></div>${fil}<div class="inner"></div>${sp}${extra}
    <div class="c-top">${tag ? `<div class="edtag${rarTag ? " rar" : ""}">${esc(tag)}</div>` : ""}
      <div class="ovr" title="Indice de notoriété durable (Wikipédia + abonnés CoinGecko, jamais le prix)"><b>${c.ovr}</b><small>${esc(c.sym)}</small><span class="fic" title="${esc(c.fam)}">${famIcon(c.fam)}</span></div>
      <div class="gem" title="${esc(rarLabel)}">${ed ? "★" : c.r}</div>
      <div class="medal">${!ed && c.r === "L" ? laurel(x) : ""}<div class="glow"></div>${ring(x, c.r, col, ed)}<div class="disc"></div>${logoTag(c)}<div class="dome"></div></div>
    </div>
    <div class="nm${foil ? " foil" : ""}${n.two ? " two" : ""}" style="font-size:${n.size}px" title="${esc(c.name)}">${n.html}</div>
    <div class="sub" style="font-size:${c.subSize}px" title="${esc(rarLabel)} · ${esc(subTxt)}">${esc(subTxt)}</div>
    <div class="stats"><div title="${f1c[0] === "SCORE CR" ? "Score Cryptoreflex : note globale du projet sur 100 (décentralisation, maturité, communauté, conformité)" : f1c[0] === "LANCÉ" ? "Année de lancement" : "Numéro de la carte dans l'album"}"><span>${f1c[0]}</span><b>${f1c[1]}</b></div><div><span>NOTORIÉTÉ</span><b>${c.fossil ? "—" : "#" + c.noto}</b></div><div title="Chance qu'une carte tirée soit celle-ci"><span>CHANCE</span><b>${chance}</b></div></div>
    <div class="ab">${ab}</div>
    <div class="ft">${ed ? "FOSSILE · S1" : `<i class="set">${env.emb}</i>S1 · ${String(c.num).padStart(3, "0")}/${env.ncards}<i class="pips" style="--g:${RC[c.r]}" title="${RNAME[c.r]}">${PIPS[c.r]}</i>`}</div>
  </div><div class="shine"></div><div class="glare"></div><div class="sweep"></div></div></div>`;
}

/* nombres et pourcentages à la française (espace insécable), comme fr() et pct() de la maquette */
const frN = (n: number) => n.toLocaleString("fr-FR").replace(/ /g, " ");
export const pct = (p: number, d = 2) => (p * 100).toLocaleString("fr-FR", { maximumFractionDigits: d }).replace(/ /g, " ") + " %";
/** « 1 sur N » compact et insécable de la carte (odds() de la maquette) : 438 · 2 877 · 20 k · 6 M · 1 Md */
export function odds(p: number): string {
  const NB = " ", x = 1 / p, d1 = (v: number) => (Math.round(v * 10) / 10).toLocaleString("fr-FR", { maximumFractionDigits: 1 });
  const s = x < 1e4 ? frN(Math.round(x)) : x < 1e5 ? d1(x / 1e3) + NB + "k" : x < 1e6 ? frN(Math.round(x / 1e3)) + NB + "k" : x < 1e9 ? d1(x / 1e6) + NB + "M" : d1(x / 1e9) + NB + "Md";
  return s.replace(/\s/g, NB);
}

/**
 * Case vide de l'album (placeholder() de la maquette, carte sortie, ni mystère ni proche) :
 * numéro, logo grisé, nom, rareté, chance. C'est ce que voit quelqu'un qui n'a pas la carte.
 * `odd` = « 0,0018 % par carte » selon le nombre de cartes sorties ce jour-là (voir data.ts).
 */
export function slotHTMLRaw(c: ReflexCard, odd: string): string {
  const n = c.ph;
  return `<div class="ph r-${c.r}" data-ph data-id="${c.id}" style="--rc:${RC[c.r]}">
    <svg class="shape" viewBox="0 0 240 336" aria-hidden="true"><path d="M1 19 L19 1 H221 L239 19 V306 L120 335 L1 306 Z" fill="rgba(255,255,255,.028)" stroke="rgba(233,185,73,.42)" stroke-width="1.6" stroke-dasharray="5 4"/><path d="M9 23 L23 9 H217 L231 23 V302 L120 327 L9 302 Z" fill="none" stroke="${RC[c.r]}" stroke-opacity=".22"/></svg>
    <div class="ph-num">${String(c.num).padStart(3, "0")}</div>
    <div class="ph-ring"></div>${logoTag(c, "small", "ph-logo")}
    <div class="ph-name${n.two ? " two" : ""}" style="font-size:${n.size}px">${n.html}</div>
    <div class="ph-rar"><i></i>${RNAME[c.r]}</div>
    <div class="ph-odds">${odd}</div>
  </div>`;
}
/** case vide du Musée des Fossiles (fossilSlot() de la maquette) : l'histoire est publique, le nom reste visible */
export function fossilSlotHTMLRaw(c: ReflexCard, fossilP: number): string {
  const n = c.ph;
  return `<div class="ph fos" data-ph data-ed="fossil" data-id="${c.id}" style="--rc:#a8927a">
    <svg class="shape" viewBox="0 0 240 336" aria-hidden="true"><path d="M1 19 L19 1 H221 L239 19 V306 L120 335 L1 306 Z" fill="rgba(168,146,122,.06)" stroke="rgba(168,146,122,.55)" stroke-width="1.6" stroke-dasharray="5 4"/><path d="M9 23 L23 9 H217 L231 23 V302 L120 327 L9 302 Z" fill="none" stroke="#a8927a" stroke-opacity=".25"/></svg>
    <div class="ph-num">${c.num}</div><div class="ph-ring"></div>${logoTag(c, "small", "ph-logo")}
    <div class="ph-name${n.two ? " two" : ""}" style="font-size:${n.size}px">${n.html}</div>
    <div class="ph-rar"><i></i>Fossile</div>
    <div class="ph-odds">1 sur ${frN(Math.round(1 / fossilP))} · en booster</div></div>`;
}
/** dos de carte (cardBackSVG() de la maquette, exporté tel quel) : pour une carte pas encore sortie */
export function backHTMLRaw(env: CardEnv & { back: string }, key = "x"): string {
  const k = key.replace(/[^A-Za-z0-9-]/g, "-");
  return `<div class="back" style="width:240px;height:336px">${env.back.replace(/\{U\}/g, k)}</div>`;
}

/** Guilloché des Légendaires : un seul fichier statique, mis en cache par le navigateur. */
export const GUILLOCHE_HREF = "/reflex-cards/guilloche.svg#bkguil";

/**
 * HTML final pour le site : classes préfixées « rc- » (le CSS du site, Tailwind compris,
 * ne peut pas toucher la carte) et guilloché servi en fichier statique.
 */
export function forSite(raw: string): string {
  return raw
    .replace(/ class="([^"]*)"/g, (_, v: string) => ` class="${v.split(/\s+/).filter(Boolean).map((t) => "rc-" + t).join(" ")}"`)
    .replace(/href="#bkguil"/g, `href="${GUILLOCHE_HREF}"`);
}
/** `chanceText` : « 1/12 k » selon les cartes sorties ce jour-là (voir data.ts) ; défaut = saison complète */
export function cardHTML(c: ReflexCard, env: CardEnv, key?: string, chanceText?: string): string {
  return forSite(cardHTMLRaw(c, env, key, chanceText ?? c.chance));
}
