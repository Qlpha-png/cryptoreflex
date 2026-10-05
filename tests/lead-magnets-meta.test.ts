import fs from "node:fs";
import path from "node:path";
import { PDFDocument } from "pdf-lib";
import { describe, expect, it } from "vitest";

/**
 * /ressources annonçait « 30 pages » pour une Bible de 14 pages, « 1 page A4 » pour une checklist de 4 pages et
 * « 50 termes » pour un glossaire de 47 (audit du 05/10/2026). Ce test relie les chiffres affichés aux vrais fichiers.
 */
const root = process.cwd();
const FILES: Record<string, string> = {
  "bible-fiscalite": "bible-fiscalite-crypto-2026.pdf",
  checklist: "checklist-declaration-crypto-2026.pdf",
  glossaire: "glossaire-fiscal-crypto.pdf",
};

describe("guides PDF de /ressources", () => {
  const src = fs.readFileSync(path.join(root, "app/ressources/page.tsx"), "utf8");

  it.each(Object.entries(FILES))("%s : le nombre de pages affiché est celui du PDF", async (id, file) => {
    const block = src.slice(src.indexOf(`id: "${id}"`), src.indexOf("}", src.indexOf(`id: "${id}"`)));
    const shown = Number(/pages:\s*(\d+)/.exec(block)?.[1]);
    const pdf = await PDFDocument.load(fs.readFileSync(path.join(root, "public/lead-magnets", file)));
    expect(shown).toBe(pdf.getPageCount());
  });

  it("le nombre de termes du glossaire est celui du fichier source", () => {
    const md = fs.readFileSync(path.join(root, "content/lead-magnets/glossaire-fiscal-crypto.md"), "utf8");
    const terms = (md.match(/^### /gm) ?? []).length;
    expect(src).toContain(`${terms} termes`);
    expect(md).toContain(`${terms} termes`);
  });

  it("le nombre de points de la checklist est celui du fichier source", () => {
    const md = fs.readFileSync(path.join(root, "content/lead-magnets/checklist-declaration-crypto-2026.md"), "utf8");
    const points = (md.match(/^- \[ \]/gm) ?? []).length;
    expect(src).toContain(`${points} actions`);
  });
});
