/**
 * Aucune carte ne doit porter de caractère invisible (espace de largeur nulle, BOM, tiret conditionnel…) : « ​​Stable » arrivait
 * de CoinGecko avec deux U+200B, invisibles à l'écran mais présents dans la recherche, le tri et les libellés d'accessibilité
 * (constaté le 05/10/2026). Les exports de Reflex-Cards les retirent ; ce test empêche leur retour.
 */
import { describe, it, expect } from "vitest";
import univers from "@/data/reflex-cards-univers.json";
import game from "@/data/reflex-cards-game.json";

const INVIS = /[​‌‎‏⁠-⁤﻿­]/;

describe("cartes sans caractère invisible", () => {
  it("noms et symboles de l'Univers", () => {
    const bad = (univers as unknown as { cards: string[][] }).cards
      .filter((r) => INVIS.test(r[1]) || INVIS.test(r[2]))
      .map((r) => r[0]);
    expect(bad).toEqual([]);
  });
  it("données du jeu", () => {
    const bad = (game as unknown as { cards: unknown[][] }).cards
      .filter((r) => r.some((v) => typeof v === "string" && INVIS.test(v)))
      .map((r) => r[0]);
    expect(bad).toEqual([]);
  });
});
