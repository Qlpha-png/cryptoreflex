/**
 * Lot A5 — lib/theme/colors.ts : le repli legacy (rendu serveur et avant montage) doit rester IDENTIQUE aux valeurs de
 * app/styles/tokens.css, sinon le premier rendu diffère de la valeur lue après montage.
 */
import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { THEME_FALLBACK, toRgb, readThemeChannels, THEME_EVENT } from "@/lib/theme/colors";

const css = fs.readFileSync(path.resolve(__dirname, "../../app/styles/tokens.css"), "utf8");
const jetons: Record<string, string> = {};
for (const m of css.matchAll(/--c-([a-z0-9-]+):\s*([^;]+);/g)) jetons[m[1]] = m[2].trim();

describe("lib/theme/colors : repli = tokens.css", () => {
  for (const [nom, canaux] of Object.entries(THEME_FALLBACK))
    it(`--c-${nom} = ${canaux}`, () => {
      expect(jetons[nom], `--c-${nom} absent de tokens.css`).toBeDefined();
      expect(canaux).toBe(jetons[nom]);
    });

  it("toRgb : opaque et avec opacité", () => {
    expect(toRgb("245 165 36")).toBe("rgb(245 165 36)");
    expect(toRgb("0 0 0", 0.25)).toBe("rgb(0 0 0 / 0.25)");
  });

  it("hors navigateur : renvoie le repli, événement nommé cr-theme", () => {
    expect(readThemeChannels()).toEqual(THEME_FALLBACK);
    expect(THEME_EVENT).toBe("cr-theme");
  });
});
