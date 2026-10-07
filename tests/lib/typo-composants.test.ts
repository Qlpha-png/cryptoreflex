/**
 * Typographie française dans les composants (lot B1-bis) : le texte AFFICHÉ par les composants ne contient plus
 * d'espace ordinaire devant « : ; ? ! % € » », ni entre deux groupes de chiffres (« 1 000 », « 12 345 »).
 * Rend (renderToStaticMarkup) trois composants représentatifs : une FAQ, la page du calculateur de fiscalité (tableau
 * TMI) et la page des frais du comparatif (lignes de frais), puis inspecte le texte visible (balises et scripts exclus).
 */
import { createElement as h, type ReactElement, type ReactNode } from "react";
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import JSXStyle from "styled-jsx/style";
import FAQ from "@/components/mdx/FAQ";
import CalculateurFiscalitePage from "@/app/outils/calculateur-fiscalite/page";
import ComparatifFraisPage from "@/app/comparatif/frais/page";
import { typoNode, Typo, sansTypo } from "@/components/ui/Typo";
import { typoFr, typoHtml } from "@/lib/typo-fr";
import { fmtPct, fmtEur } from "@/lib/format-fr";

const NNBSP = String.fromCharCode(0x202f);
const NBSP = String.fromCharCode(0x00a0);

/** Texte visible d'un balisage : sans <script>/<style>/<pre>/<code>, sans balises, entités &nbsp; décodées en U+00A0. */
function texteVisible(html: string): string {
  return html
    .replace(/<(script|style|pre|code)[\s\S]*?<\/\1>/g, " ")
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, NBSP);
}

/** Défauts : espace ordinaire devant : ; ? ! % € » ou entre groupes de chiffres. */
function defauts(texte: string): string[] {
  const re = /(?<![\d,.])\d{1,3} (?=\d{3}(?!\d))| (?=[:;?!%€»])/g;
  const trouves: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(texte))) trouves.push(texte.slice(Math.max(0, m.index - 20), m.index + 10).replace(/\s+/g, "_"));
  return trouves;
}

describe("typographie française dans les composants", () => {
  it("FAQ : questions et réponses sans espace ordinaire devant : ? ! % €", () => {
    const html = renderToStaticMarkup(
      FAQ({
        items: [
          { question: "Quel est le seuil ?", answer: "Le seuil est de 305 € : au-delà de 1 000 € , le PFU de 31,4% s'applique !" },
          { question: "Et le DCA (Dollar Cost Averaging) ?", answer: "Il lisse l'achat : 50 % chaque mois." },
        ],
      }) as ReactElement,
    );
    expect(defauts(texteVisible(html))).toEqual([]);
    // le JSON-LD (script) reste celui des données, non transformé
    expect(html).toContain("Le seuil est de 305 € : au-delà de 1 000 €");
    expect(texteVisible(html)).toContain(`305${NBSP}€`);
    expect(texteVisible(html)).toContain(`31,4${NBSP}%`);
  });

  it("calculateur de fiscalité : tableau TMI, FAQ et intertitres", () => {
    const html = renderToStaticMarkup(CalculateurFiscalitePage({}) as ReactElement);
    expect(html).toContain("<table");
    expect(defauts(texteVisible(html))).toEqual([]);
  });

  it("comparatif des frais : lignes de frais", () => {
    const html = renderToStaticMarkup(ComparatifFraisPage({}) as ReactElement);
    expect(html).toContain("<table");
    expect(defauts(texteVisible(html))).toEqual([]);
  });
});

describe("Typo / typoNode", () => {
  it("traite les textes imbriqués mais jamais les attributs, le code ni les champs de saisie", () => {
    const html = renderToStaticMarkup(
      h(
        Typo,
        null,
        h(
          "div",
          { title: "a : b", "data-x": "1 000 €" },
          h("p", null, "Score : 3,17% pour 1 000 €"),
          h("code", null, "a : b"),
          h("pre", null, "x ? y"),
          h("select", null, h("option", { value: "o : k" }, "Option : un")),
          h("textarea", { defaultValue: "v : w" }),
          h("a", { href: "/x?a=1 000" }, "Lien : ici"),
        ),
      ),
    );
    expect(html).toContain(`Score${NBSP}: 3,17${NBSP}% pour 1${NNBSP}000${NBSP}€`);
    expect(html).toContain('title="a : b"');
    expect(html).toContain('data-x="1 000 €"');
    expect(html).toContain("<code>a : b</code>");
    expect(html).toContain("<pre>x ? y</pre>");
    expect(html).toContain("Option : un");
    expect(html).toContain('value="o : k"');
    expect(html).toContain('href="/x?a=1 000"');
    expect(html).toContain(`Lien${NBSP}: ici`);
  });

  it("ne touche jamais au CSS d'un <style jsx> compilé (JSXStyle), ni au code rendu par un composant marqué sansTypo", () => {
    // `<style jsx>{`…`}</style>` compilé = jsx(JSXStyle, { id, children: "<css>" }) : le type est une FONCTION.
    const css = "@keyframes p{0%{width:0%}100%{width:100%}} .x{transform:translateY(120%)}";
    const style = h(JSXStyle, { id: "abc123", children: css });
    const traite = typoNode(h("div", null, "Total : 3%", style)) as ReactElement<{ children: ReactNode[] }>;
    const [texte, styleTraite] = traite.props.children as [string, ReactElement<{ children: string }>];
    expect(texte).toBe(`Total${NBSP}: 3${NBSP}%`);
    expect(styleTraite).toBe(style);
    expect(styleTraite.props.children).toBe(css);

    // `code` et `pre` de MdxContent remplacent les balises par des fonctions : marquées sansTypo.
    const CodeMdx = sansTypo((p: { children?: ReactNode }) => h("code", null, p.children));
    const PreMdx = sansTypo((p: { children?: ReactNode }) => h("pre", null, p.children));
    const html = renderToStaticMarkup(
      h(Typo, null, h("p", null, "Exemple : ", h(CodeMdx, null, "a ? b : c"), " puis ", h(PreMdx, null, "x = 50% ; y : 1 000 €"))),
    );
    expect(html).toContain(`Exemple${NBSP}: <code>a ? b : c</code>`);
    expect(html).toContain("<pre>x = 50% ; y : 1 000 €</pre>");
  });

  it("ne lit aucune propriété interdite d'une référence de composant client (proxy RSC, ex. next/image)", () => {
    // Même comportement que le proxy de react-server-dom-webpack : toute autre propriété lève une erreur.
    // On relève chaque propriété lue pendant typoNode. Les validations de React en mode développement (vitest) lisent
    // propTypes / PropTypes via cloneElement ; le build de production ne le fait pas : elles sont mises à part.
    const permises = new Set<string | symbol>(["$$typeof", "$$id", "$$async", "name", "displayName", "defaultProps", "toJSON"]);
    const validationsReactDev = new Set<string | symbol>(["propTypes", "PropTypes", "contextTypes", "getDefaultProps"]);
    const lues: (string | symbol)[] = [];
    let relever = false;
    const ref = new Proxy(function Image() {}, {
      get(cible, p) {
        if (relever) lues.push(p);
        if (p === "$$typeof") return Symbol.for("react.client.reference");
        return p === "name" ? "Image" : undefined;
      },
    });
    const arbre = h("div", null, h(ref as unknown as () => null, { alt: "a : b" }, "Légende : 3%"));
    relever = true;
    const traite = typoNode(arbre) as ReactElement<{
      children: ReactElement<{ alt: string; children: string }>;
    }>;
    relever = false;
    expect(lues.filter((p) => !permises.has(p) && !validationsReactDev.has(p)).map(String)).toEqual([]);
    expect(lues).toContain("$$typeof");
    expect(traite.props.children.props.alt).toBe("a : b");
    expect(traite.props.children.props.children).toBe(`Légende${NBSP}: 3${NBSP}%`);
  });

  it("MdxContent : les surcharges code et pre portent le marqueur sansTypo", async () => {
    const src = await import("node:fs").then((fs) => fs.readFileSync("components/MdxContent.tsx", "utf8"));
    expect(src).toMatch(/code: sansTypo\(/);
    expect(src).toMatch(/pre: sansTypo\(/);
  });

  it("est idempotent et laisse intacts les nœuds non textuels", () => {
    const noeud = typoNode(["a : b", 3, null, undefined, false]);
    expect(noeud).toEqual([`a${NBSP}: b`, 3, null, undefined, false]);
    expect(typoNode(typoNode("1 000 € ?"))).toBe(typoNode("1 000 € ?"));
  });
});

describe("typoHtml et formateurs partagés", () => {
  it("typoHtml traite le texte entre balises, pas les balises", () => {
    expect(typoHtml('<a href="/p?x=1 000" title="a : b">Voir : 305 €</a>')).toBe(`<a href="/p?x=1 000" title="a : b">Voir${NBSP}: 305${NBSP}€</a>`);
  });

  it("une seule convention de pourcentage et de montant : espace insécable", () => {
    expect(fmtPct(3.17)).toBe(`3,17${NBSP}%`);
    expect(fmtPct(1.68, 2, true)).toBe(`+1,68${NBSP}%`);
    expect(fmtPct(null)).toBe("—");
    expect(fmtEur(1000)).toBe(`1${NNBSP}000${NBSP}€`);
    expect(typoFr("3,17% et -0,23%")).toBe(`3,17${NBSP}% et -0,23${NBSP}%`);
    expect(typoFr("%20 et 50%off et 100%")).toBe(`%20 et 50%off et 100${NBSP}%`);
  });
});
