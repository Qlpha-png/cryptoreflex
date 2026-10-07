/**
 * Typographie française au rendu (lot B1) : lib/typo-fr.ts et le plugin MDX lib/rehype-typo-fr.ts.
 * Les espaces ordinaires devant « : ; ? ! % € » » et entre groupes de chiffres deviennent insécables, pour qu'un signe ou
 * un groupe de chiffres ne passe jamais seul à la ligne. Le contenu source (MDX, data/*.json) n'est jamais modifié.
 */
import { describe, expect, it } from "vitest";
import { typoFr } from "@/lib/typo-fr";
import rehypeTypoFr from "@/lib/rehype-typo-fr";

const NNBSP = String.fromCharCode(0x202f);
const NBSP = String.fromCharCode(0x00a0);

describe("typoFr", () => {
  it("espace insécable devant : % €", () => {
    expect(typoFr("Note : 31,4 % soit 305 €")).toBe(`Note${NBSP}: 31,4${NBSP}% soit 305${NBSP}€`);
  });

  it("espace fine insécable devant ; ? ! » et après «", () => {
    expect(typoFr("« Vraiment ? » Oui ; enfin !")).toBe(`«${NNBSP}Vraiment${NNBSP}?${NNBSP}» Oui${NNBSP}; enfin${NNBSP}!`);
  });

  it("groupes de chiffres d'un nombre liés par une espace fine insécable", () => {
    expect(typoFr("1 000 € et 12 345 678 unités")).toBe(`1${NNBSP}000${NBSP}€ et 12${NNBSP}345${NNBSP}678 unités`);
  });

  it("ne lie pas deux nombres distincts ni une année", () => {
    expect(typoFr("en 2025 2026")).toBe("en 2025 2026");
    expect(typoFr("de 2,5 100 fois")).toBe("de 2,5 100 fois");
    expect(typoFr("les 12 1234")).toBe("les 12 1234");
  });

  it("ne touche ni les mots ni les adresses", () => {
    const t = "Voir https://www.cryptoreflex.fr/outils et l'article 150 VH bis du CGI";
    expect(typoFr(t)).toBe(t);
  });

  it("est idempotent", () => {
    const t = "Achat par carte de 1 000 € : frais de 1,5 % ? « Oui »";
    expect(typoFr(typoFr(t))).toBe(typoFr(t));
  });
});

describe("rehypeTypoFr", () => {
  it("traite le texte et laisse le code intact", () => {
    const arbre = {
      type: "root",
      children: [
        { type: "element", tagName: "p", children: [{ type: "text", value: "Taux : 30 %" }] },
        { type: "element", tagName: "code", children: [{ type: "text", value: "a : b %" }] },
        { type: "element", tagName: "pre", children: [{ type: "element", tagName: "span", children: [{ type: "text", value: "x ? y" }] }] },
      ],
    };
    rehypeTypoFr()(arbre);
    const [p, code, pre] = arbre.children as Array<{ children: Array<{ value?: string; children?: Array<{ value: string }> }> }>;
    expect(p.children[0].value).toBe(`Taux${NBSP}: 30${NBSP}%`);
    expect(code.children[0].value).toBe("a : b %");
    expect(pre.children[0].children?.[0].value).toBe("x ? y");
  });
});
