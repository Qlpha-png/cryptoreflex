/**
 * Polices auto-hébergées (10/10/2026) — le build de production a échoué trois fois (08-10/10) parce que next/font/google
 * télécharge les polices chez Google PENDANT le build (« Cannot read properties of null (reading '1') » dans
 * @next/font/dist/google/loader.js). Garde-fou : plus aucun import de next/font/google dans le code du site, et chaque
 * famille chargée par next/font/local a ses fichiers et sa licence SIL OFL dans public/fonts/<famille>/.
 */
import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(__dirname, "../..");
const DIRS = ["app", "components", "lib"];
const EXT = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"]);

function sources(): string[] {
  const out: string[] = [];
  const walk = (rel: string) => {
    const abs = path.join(ROOT, rel);
    if (!fs.existsSync(abs)) return;
    for (const e of fs.readdirSync(abs, { withFileTypes: true })) {
      if (e.name === "node_modules" || e.name === ".next") continue;
      const r = `${rel}/${e.name}`;
      if (e.isDirectory()) walk(r);
      else if (EXT.has(path.extname(e.name))) out.push(r);
    }
  };
  DIRS.forEach(walk);
  return out.sort();
}

const lire = (rel: string) => fs.readFileSync(path.join(ROOT, rel), "utf8");

describe("polices auto-hébergées (aucun téléchargement Google au build)", () => {
  it("aucun import de next/font/google (ni @next/font/google) dans app/, components/ et lib/", () => {
    const fautifs = sources().filter((f) => /from\s+["']@?(next\/)?font\/google["']|require\(\s*["']@?(next\/)?font\/google["']\s*\)|import\(\s*["']@?(next\/)?font\/google["']\s*\)/.test(lire(f)));
    expect(fautifs).toEqual([]);
  });

  it("aucune feuille de style ni police Google dans les fichiers de mise en page (app/ et components/)", () => {
    const fautifs = sources()
      .filter((f) => /^(app|components)\//.test(f))
      .filter((f) => /fonts\.(googleapis|gstatic)\.com/.test(lire(f).replace(/^\s*\/\/.*$/gm, "").replace(/\/\*[\s\S]*?\*\//g, "")));
    expect(fautifs).toEqual([]);
  });

  it("les 4 familles sont chargées par next/font/local, avec les mêmes variables CSS qu'avant", () => {
    const layout = lire("app/layout.tsx");
    const cartes = lire("components/reflex-cards/fonts.ts");
    expect(layout).toMatch(/import localFont from "next\/font\/local"/);
    expect(cartes).toMatch(/import localFont from "next\/font\/local"/);
    for (const v of ["--font-mono", "--font-display"]) expect(layout).toContain(`variable: "${v}"`);
    for (const v of ["--rc-f-cond", "--rc-f-serif"]) expect(cartes).toContain(`variable: "${v}"`);
    expect(cartes).toContain("RC_FONT_VARS");
  });

  it("chaque police référencée existe dans public/fonts/<famille>/ avec sa licence SIL OFL", () => {
    const chemins = [...lire("app/layout.tsx").matchAll(/path:\s*"([^"]+\.woff2)"/g), ...lire("components/reflex-cards/fonts.ts").matchAll(/path:\s*"([^"]+\.woff2)"/g)].map((m) => m[1]);
    expect(chemins.length).toBeGreaterThanOrEqual(7);
    const dossiers = new Set<string>();
    for (const rel of chemins) {
      const fichier = path.resolve(ROOT, rel.startsWith("../../") ? "components/reflex-cards" : "app", rel);
      expect(fs.existsSync(fichier), rel).toBe(true);
      expect(fs.statSync(fichier).size, rel).toBeGreaterThan(10_000);
      // signature woff2
      expect(fs.readFileSync(fichier).subarray(0, 4).toString("latin1"), rel).toBe("wOF2");
      dossiers.add(path.dirname(fichier));
    }
    expect([...dossiers].map((d) => path.basename(d)).sort()).toEqual(["barlow-condensed", "cinzel", "jetbrains-mono", "space-grotesk"]);
    for (const d of dossiers) {
      const ofl = path.join(d, "OFL.txt");
      expect(fs.existsSync(ofl), ofl).toBe(true);
      expect(fs.readFileSync(ofl, "utf8")).toMatch(/SIL OPEN FONT LICENSE Version 1\.1/i);
    }
  });
});
