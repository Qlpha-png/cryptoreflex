/**
 * Binance ne sert plus la France depuis le 01/07/2026 (hors registre MiCA). Il ne doit plus
 * apparaître comme une plateforme « à choisir » dans les textes et images promotionnels du site.
 * Audit 03/10/2026 : il restait dans l'image de partage X, l'image du quiz, le titre Google de /avis,
 * les mots-clés du site et l'import de compte du portefeuille. Ce test bloque toute réapparition.
 * (Les avertissements du type « Binance n'est plus autorisée » restent possibles ailleurs.)
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = resolve(__dirname, "../..");
const read = (p: string) => readFileSync(resolve(ROOT, p), "utf8");

const PROMO_FILES = [
  "app/twitter-image.tsx",
  /* 07/10/2026 : app/quiz/trouve-ton-exchange/opengraph-image.tsx supprimée (page redirigée vers /quiz/plateforme). */
  "app/opengraph-image.tsx",
  "app/portefeuille/page.tsx",
  "components/Footer.tsx",
  /* Lot B3c : BurgerMenu et MobileBottomNav remplacés par la feuille de menu et la barre du bas. */
  "components/cplus/MenuFeuille.tsx",
  "components/cplus/BarreBas.tsx",
  "lib/nav-data.ts",
];

describe("Binance et Bitget absents des textes promotionnels", () => {
  for (const f of PROMO_FILES) {
    it(f, () => {
      const src = read(f).replace(/\/\*[\s\S]*?\*\/|\/\/[^\n]*/g, ""); // hors commentaires
      expect(src, `${f} cite Binance`).not.toMatch(/\bBinance\b/);
      expect(src, `${f} cite Bitget`).not.toMatch(/\bBitget\b/);
    });
  }

  it("titre, description et mots-clés de /avis", () => {
    const src = read("app/avis/page.tsx");
    const head = src.slice(0, src.indexOf("export default"));
    expect(head).not.toMatch(/\bBinance\b|\bBitget\b/);
  });

  it("mots-clés globaux du site (app/layout.tsx)", () => {
    const src = read("app/layout.tsx");
    const kw = src.slice(src.indexOf("keywords:"), src.indexOf("authors:"));
    expect(kw).not.toMatch(/\bBinance\b|\bBitget\b/);
  });
});
