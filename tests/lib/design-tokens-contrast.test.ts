/**
 * Lot B2 — CONTRASTE DES JETONS, dans les DEUX thèmes (Encre = :root par défaut, Papier = :root[data-theme="light"]).
 *
 * Couples de la spec C+ (cplus/systeme/tokens.source.mjs, « pré-contrôle des couples texte / fond ») : 119 par thème,
 * 238 en tout. Les valeurs sont lues dans app/styles/tokens.css, c'est-à-dire ce que le site sert vraiment (et non
 * dans la source) : un jeton retouché à la main ou mal généré fait échouer le test. 0 échec exigé.
 *  - texte (21 couleurs) sur les 4 fonds (background, surface, elevated, sunken) : ≥ 4,5:1 ;
 *  - couleurs d'état et encre sur leurs fonds doux, textes des boutons et de l'or : ≥ 4,5:1 ;
 *  - éléments non textuels (contour de champ, soulignement de lien, focus, ligne de référence) : ≥ 3:1 (WCAG 1.4.11) ;
 *  - option inversée d'un sélecteur segmenté (fg sur sunken) et « reflex » du logo (logo-accent) : ≥ 3:1.
 */
import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

const css = fs.readFileSync(path.resolve(__dirname, "../../app/styles/tokens.css"), "utf8");

function bloc(re: RegExp, nom: string): Record<string, string> {
  const m = re.exec(css);
  if (!m) throw new Error(`bloc ${nom} introuvable dans tokens.css`);
  const out: Record<string, string> = {};
  for (const j of m[1].matchAll(/--c-([a-z0-9-]+):\s*([^;]+);/g)) out[j[1]] = j[2].trim();
  return out;
}
const THEMES: Record<string, Record<string, string>> = {
  encre: bloc(/\n:root \{([\s\S]*?)\n\}/, ":root (Encre)"),
  papier: bloc(/\n:root\[data-theme="light"\] \{([\s\S]*?)\n\}/, ':root[data-theme="light"] (Papier)'),
};

/** « R G B » ou « rgba(R, G, B, 1) » → [r, g, b] (les couleurs complètes du kit sont opaques). */
function canaux(v: string, nom: string): number[] {
  const m = /^(\d{1,3}) (\d{1,3}) (\d{1,3})$/.exec(v) ?? /^rgba\((\d{1,3}), (\d{1,3}), (\d{1,3}), 1\)$/.exec(v);
  if (!m) throw new Error(`--c-${nom} : valeur non opaque ou illisible « ${v} »`);
  return [m[1], m[2], m[3]].map(Number);
}
const lin = (c: number) => { const s = c / 255; return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4); };
const lum = ([r, g, b]: number[]) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
const ratio = (a: number[], b: number[]) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };

// ---- Couples de la spec (recopiés du kit C+ figé, même ordre) ----
const FONDS = ["background", "surface", "elevated", "sunken"];
const COUPLES: [string, string, number][] = [];
for (const fg of ["fg", "fg-2", "muted", "fg-4", "primary", "link", "success", "warning", "danger", "info", "up", "down", "r-c-text", "r-pc-text", "r-r-text", "r-sr-text", "r-ur-text", "r-l-text", "ed-icon", "ed-myth", "ed-relic"])
  for (const bg of FONDS) COUPLES.push([fg, bg, 4.5]);
for (const [fg, bg] of [["success", "success-soft"], ["warning", "warning-soft"], ["danger", "danger-soft"], ["info", "info-soft"], ["fg", "success-soft"], ["fg", "warning-soft"], ["fg", "danger-soft"], ["fg", "info-soft"], ["fg-2", "info-soft"], ["primary", "gold-soft"], ["fg", "gold-soft"], ["on-action", "action"], ["on-action", "action-hover"], ["on-action-chip", "action-chip"], ["on-gold", "gold"]])
  COUPLES.push([fg, bg, 4.5]);
for (const fg of ["border-input", "link-line", "focus", "chart-ref"]) for (const bg of FONDS) COUPLES.push([fg, bg, 3]);
// Le kit ajoute ce couple une fois par thème dans sa boucle : on garde ses 2 occurrences pour retrouver ses 119 couples.
COUPLES.push(["fg", "sunken", 3], ["fg", "sunken", 3]);
for (const bg of ["background", "surface"]) COUPLES.push(["logo-accent", bg, 3]);

describe("Jetons C+ : contrastes de la spec dans les deux thèmes (lot B2)", () => {
  it("119 couples par thème, 238 en tout", () => {
    expect(COUPLES.length).toBe(119);
    expect(Object.keys(THEMES)).toEqual(["encre", "papier"]);
  });

  for (const [theme, jetons] of Object.entries(THEMES))
    it(`${theme} : 0 couple sous son seuil`, () => {
      const echecs: string[] = [];
      for (const [fg, bg, seuil] of COUPLES) {
        expect(jetons[fg], `--c-${fg} absent du thème ${theme}`).toBeDefined();
        expect(jetons[bg], `--c-${bg} absent du thème ${theme}`).toBeDefined();
        const r = ratio(canaux(jetons[fg], fg), canaux(jetons[bg], bg));
        if (r < seuil) echecs.push(`${fg} sur ${bg} : ${r.toFixed(2)} < ${seuil}`);
      }
      expect(echecs).toEqual([]);
    });

  it("les noms hérités lus en texte (primary-soft, primary-glow, ice-fg, *-fg) passent 4,5:1 sur les 4 fonds", () => {
    const echecs: string[] = [];
    for (const [theme, jetons] of Object.entries(THEMES))
      for (const fg of ["primary-soft", "primary-glow", "accent-cyan", "ice", "ice-fg", "success-fg", "warning-fg", "danger-fg", "info-fg", "fg-max"])
        for (const bg of FONDS) {
          const r = ratio(canaux(jetons[fg], fg), canaux(jetons[bg], bg));
          if (r < 4.5) echecs.push(`${theme} ${fg} sur ${bg} : ${r.toFixed(2)}`);
        }
    expect(echecs).toEqual([]);
  });
});
