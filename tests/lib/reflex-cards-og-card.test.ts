/**
 * Carte de l'aperçu de lien (lib/reflex-cards/og-card.ts) : le décor de CHAQUE carte se génère, dans chacun de ses états
 * (sa rareté, fossile, carte à venir), sans valeur manquante ; le « Le saviez-vous ? » est du texte propre partout.
 * Le rendu visuel lui-même est contrôlé à l'œil sur un échantillon par classe avant chaque mise en ligne.
 */
import { describe, expect, it } from "vitest";
import { allCards } from "@/lib/reflex-cards/data";
import { abParts, cardArtSvg, type ArtKind } from "@/lib/reflex-cards/og-card";

const cards = allCards();

describe("décor de la carte de l'aperçu de lien", () => {
  it("couvre toutes les cartes", () => {
    expect(cards.length).toBeGreaterThan(800);
  });

  it("se génère pour chaque carte et chaque état, sans « undefined » ni « NaN »", () => {
    const bad: string[] = [];
    for (const c of cards) {
      const kinds: ArtKind[] = [c.fossil ? "F" : c.r, "X"];
      for (const kind of kinds)
        for (const cols of [0, 2, 3]) {
          const svg = cardArtSvg({ c, kind, guil: kind === "L" ? '<circle cx="120" cy="148" r="60"/>' : "", cols });
          if (!svg.startsWith("<svg ") || !svg.endsWith("</svg>") || /undefined|NaN|\[object/.test(svg) || svg.length > 400_000) bad.push(`${c.id}/${kind}/${cols}`);
        }
    }
    expect(bad).toEqual([]);
  });

  it("les identifiants SVG ne se répètent pas dans une même carte (dégradés, filtres)", () => {
    const bad: string[] = [];
    for (const c of cards.slice(0, 120)) {
      const svg = cardArtSvg({ c, kind: c.fossil ? "F" : c.r, guil: "", cols: 3 });
      const ids = [...svg.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]);
      const dup = ids.filter((id, i) => ids.indexOf(id) !== i);
      if (dup.length) bad.push(`${c.id}: ${[...new Set(dup)].join(",")}`);
    }
    expect(bad).toEqual([]);
  });

  it("« Le saviez-vous ? » : partie en gras + suite, sans balise ni entité HTML restante", () => {
    const bad: string[] = [];
    for (const c of cards) {
      if (!c.ab) continue;
      const { b, t } = abParts(c.ab);
      if (!t || /[<>]|&[#a-z0-9]+;/i.test(b + t) || (c.ab.trim().startsWith("<b>") && !b)) bad.push(c.id);
    }
    expect(bad).toEqual([]);
    expect(abParts("<b>Le saviez-vous ?</b> L&#39;or numérique")).toEqual({ b: "Le saviez-vous ?", t: "L’or numérique" });
  });
});
