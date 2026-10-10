/**
 * Passe finale B4 (10/10/2026, jury ronde 2) : titre de la FAQ rétabli, une phrase par carte « Allez plus loin », polices
 * (replis à métriques ajustées, préchargement), libellés français.
 */
import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { avecTitreFaq } from "@/lib/mdx-faq";
import { DESCRIPTIONS_LIENS } from "@/lib/liens-description";
import { CLUSTERS } from "@/lib/internal-link-graph";

const racine = process.cwd();

describe("FAQ d'un article : titre « Questions fréquentes » sauf si un titre FAQ la précède", () => {
  const faq = '<FAQ items={[{ question: "Q ?", answer: "R." }]} />';
  it("rien ne la précède (Cerfa 3916-bis) : le titre est ajouté", () => {
    expect(avecTitreFaq(`## 9. Pour aller plus loin\n\n- [lien](/x)\n\n${faq}`)).toContain('<FAQ title="Questions fréquentes" items=');
  });
  it("un titre « FAQ » ou « questions » la précède : aucun double titre", () => {
    expect(avecTitreFaq(`## FAQ\n\n${faq}`)).toBe(`## FAQ\n\n${faq}`);
    expect(avecTitreFaq(`## 7. Questions fréquentes\n\n${faq}`)).toBe(`## 7. Questions fréquentes\n\n${faq}`);
  });
  it("un titre explicite est respecté", () => {
    const t = '<FAQ title="Vos questions" items={[]} />';
    expect(avecTitreFaq(t)).toBe(t);
  });
});

describe("cartes « Allez plus loin » : une phrase utile par page du graphe, en français", () => {
  const chemins = new Set<string>();
  for (const c of CLUSTERS) {
    for (const n of c.nodes) chemins.add(n.path);
  }
  it("chaque page du graphe a une description (propre ou de lib/liens-description.ts)", () => {
    const sans = [...chemins].filter((p) => !DESCRIPTIONS_LIENS[p]);
    // les pages à description propre ne comptent pas : la liste du graphe n'en porte aucune, toutes sont donc couvertes
    expect(sans).toEqual([]);
  });
  it("aucun anglicisme de libellé, aucun tutoiement, aucun montant ni taux", () => {
    for (const [p, d] of Object.entries(DESCRIPTIONS_LIENS)) {
      expect(d, p).not.toMatch(/wizard|lead magnet|\b(tu|ton|ta|tes|toi)\b/i);
      expect(d, p).not.toMatch(/[€%$]/); // aucun montant ni taux : rien qui vieillisse
      expect(d.length, p).toBeGreaterThan(25);
    }
    const graphe = fs.readFileSync(path.join(racine, "lib/internal-link-graph.ts"), "utf8");
    expect(graphe).not.toContain('label: "Wizard premier achat"');
  });
});

describe("polices : préchargement et replis à métriques ajustées", () => {
  const css = fs.readFileSync(path.join(racine, "app/styles/tokens.css"), "utf8");
  const layout = fs.readFileSync(path.join(racine, "app/layout.tsx"), "utf8");
  it("Inter et Newsreader préchargés (crossOrigin), sans autre police", () => {
    expect(layout).toMatch(/rel="preload" href="\/fonts\/cplus-v1\/inter-latin\.woff2" as="font" type="font\/woff2" crossOrigin="anonymous"/);
    expect(layout).toMatch(/rel="preload" href="\/fonts\/cplus-v1\/newsreader-latin\.woff2" as="font" type="font\/woff2" crossOrigin="anonymous"/);
  });
  it("Georgia ajustée en premier repli de Newsreader, Times ensuite ; Arial ajusté pour Inter", () => {
    expect(css).toContain('font-family: "Newsreader Fallback G"');
    expect(css).toMatch(/--font-serif:[^;]*"Newsreader Fallback G", "Newsreader Fallback", Georgia/);
    expect(css).toMatch(/--font-sans:[^;]*"Inter Fallback"/);
    expect(css.match(/size-adjust:/g)?.length ?? 0).toBeGreaterThanOrEqual(15);
  });
  it("font-display « fallback » pour Inter et Newsreader (les replis sont ajustés, la police du site s'affiche à froid)", () => {
    for (const f of ["inter-latin.woff2", "newsreader-latin.woff2", "newsreader-italic-latin.woff2"]) {
      const i = css.indexOf(f);
      const bloc = css.slice(i, css.indexOf("}", i));
      expect(bloc, f).toContain("font-display: fallback");
    }
  });
});
