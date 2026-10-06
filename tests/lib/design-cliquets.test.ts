/**
 * Banc de design (lot A0) — CLIQUETS DE DETTE DE COULEUR (plan de migration §4.0-3) : chaque compte ne peut que BAISSER.
 * Comptés dans app/, components/, lib/ et data/emails/ (expressions de migration/mesure-code.mjs), hors zone du jeu
 * (lib/reflex-cards/game, CSS des cartes, rendu et image OG des cartes : invariance testée à part) et hors content/ (MDX :
 * aucune retouche prévue par les lots de design).
 *  - palette : classes de la palette Tailwind par défaut (text-slate-400, bg-emerald-500/20…)
 *  - blancNoir : text-white, bg-black/60, border-white/10… (dont textWhite et bgBlack, suivis à part)
 *  - hex : codes hexadécimaux en dur (#fff, #F5A524…)
 *
 * Un compte qui MONTE fait échouer le test : utiliser les jetons (text-fg, bg-background, border-border…).
 * Après un lot qui fait baisser la dette : BANC_MAJ_EMPREINTES=1 npx vitest run tests/lib/design-cliquets.test.ts
 * (la mise à jour n'abaisse que : un plafond ne remonte jamais automatiquement).
 */
import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(__dirname, "../..");
const REF = path.join(ROOT, "tests/fixtures/design/cliquets.json");
const MAJ = process.env.BANC_MAJ_EMPREINTES === "1";
const DIRS = ["app", "components", "lib", "data/emails"];
const EXT = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs", ".css"]);
const EXCLUS = [/^lib\/reflex-cards\/game\//, /^components\/reflex-cards\/[^/]+\.css$/, /^lib\/reflex-cards\/(render|og-card)\.ts$/, /\.test\./, /__tests__/];

const PFX = "(?:text|bg|border(?:-[trblxy])?|ring(?:-offset)?|from|via|to|divide|fill|stroke|outline|decoration|placeholder|caret|accent|shadow)";
const PAL = "(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)";
const SHADES = "(?:50|100|200|300|400|500|600|700|800|900|950)";
const B = "(?<![\\w-])";
const MOTIFS: Record<string, RegExp> = {
  palette: new RegExp(`${B}(?:[a-z-]+:)*${PFX}-${PAL}-${SHADES}(?:/\\d+)?(?![\\w-])`, "g"),
  blancNoir: new RegExp(`${B}(?:[a-z-]+:)*${PFX}-(?:white|black)(?:/\\d+)?(?![\\w-])`, "g"),
  textWhite: /(?<![\w-])(?:[a-z-]+:)*text-white(?:\/\d+)?(?![\w-])/g,
  bgBlack: /(?<![\w-])(?:[a-z-]+:)*bg-black(?:\/\d+)?(?![\w-])/g,
  hex: /#[0-9a-fA-F]{6}(?:[0-9a-fA-F]{2})?(?![\w-])|#[0-9a-fA-F]{3,4}(?![\w-])/g,
};

function fichiers(): string[] {
  const out: string[] = [];
  const walk = (rel: string) => {
    const abs = path.join(ROOT, rel);
    if (!fs.existsSync(abs)) return;
    for (const e of fs.readdirSync(abs, { withFileTypes: true })) {
      const r = `${rel}/${e.name}`;
      if (EXCLUS.some((x) => x.test(r)) || e.name === "node_modules") continue;
      if (e.isDirectory()) walk(r);
      else if (EXT.has(path.extname(e.name))) out.push(r);
    }
  };
  DIRS.forEach(walk);
  return out.sort();
}

describe("Banc design : la dette de couleur ne peut que baisser", () => {
  const comptes: Record<string, number> = {};
  const parFichier: Record<string, [string, number][]> = {};
  for (const k of Object.keys(MOTIFS)) { comptes[k] = 0; parFichier[k] = []; }
  for (const f of fichiers()) {
    const t = fs.readFileSync(path.join(ROOT, f), "utf8");
    for (const [k, rx] of Object.entries(MOTIFS)) {
      const n = (t.match(rx) || []).length;
      if (n) { comptes[k] += n; parFichier[k].push([f, n]); }
    }
  }
  if (MAJ || !fs.existsSync(REF)) {
    const ancien = fs.existsSync(REF) ? (JSON.parse(fs.readFileSync(REF, "utf8")) as { plafonds: Record<string, number> }).plafonds : {};
    const plafonds: Record<string, number> = {};
    for (const k of Object.keys(MOTIFS)) plafonds[k] = ancien[k] === undefined ? comptes[k] : Math.min(ancien[k], comptes[k]);
    fs.mkdirSync(path.dirname(REF), { recursive: true });
    fs.writeFileSync(REF, JSON.stringify({ _note: "Plafonds de dette de couleur (banc design, lot A0) : ne peuvent que baisser. Zone : app, components, lib, data/emails, hors jeu et hors content.", plafonds }, null, 1) + "\n");
  }
  const plafonds = (JSON.parse(fs.readFileSync(REF, "utf8")) as { plafonds: Record<string, number> }).plafonds;

  for (const k of Object.keys(MOTIFS))
    it(`${k} : ${comptes[k]} ≤ plafond ${plafonds[k]}`, () => {
      const top = parFichier[k].sort((a, b) => b[1] - a[1]).slice(0, 8).map(([f, n]) => `${n} ${f}`).join(" · ");
      expect(comptes[k], `${k} a augmenté (${comptes[k]} > ${plafonds[k]}) : utiliser les jetons du thème. Plus gros fichiers : ${top}`).toBeLessThanOrEqual(plafonds[k]);
    });
});
