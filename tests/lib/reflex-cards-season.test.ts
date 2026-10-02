/**
 * Reflex Cards — calendrier et règle « rien ne fuite avant la sortie » (décision Kev 02/10).
 */
import { describe, it, expect, afterEach } from "vitest";
import { seasonDay } from "@/lib/reflex-cards/season";
import { odds } from "@/lib/reflex-cards/render";
import { HERO_CARDS, SHOWCASE_CARDS, REFLEX_PARTS, allCards, isReleased, isRevealed, isVisible, isPartNamed, todayChance, rarityInfo } from "@/lib/reflex-cards/data";

const KEY = "NEXT_PUBLIC_REFLEX_CARDS_LAUNCH_DATE";
afterEach(() => {
  delete process.env[KEY];
  delete process.env.REFLEX_CARDS_LAUNCH_DATE;
});

describe("Reflex Cards — jour de saison", () => {
  it("avant-lancement sans date : jour 0", () => {
    delete process.env[KEY];
    expect(seasonDay(new Date("2026-10-20T12:00:00Z"))).toBe(0);
  });
  it("date invalide : jour 0 (format, ou date inexistante comme le 31 février)", () => {
    for (const v of ["15/10/2026", "2026-02-31", "2026-13-01", "demain"]) {
      process.env[KEY] = v;
      expect(seasonDay(new Date("2026-10-20T12:00:00Z"))).toBe(0);
    }
  });
  it("ancienne variable serveur encore lue si la publique est absente", () => {
    process.env.REFLEX_CARDS_LAUNCH_DATE = "2026-10-15";
    expect(seasonDay(new Date("2026-10-16T12:00:00Z"))).toBe(2);
  });
  it("jour 1 = date de lancement à Paris, minuit compris", () => {
    process.env[KEY] = "2026-10-15";
    expect(seasonDay(new Date("2026-10-14T21:59:00Z"))).toBe(0); // 23 h 59 à Paris la veille
    expect(seasonDay(new Date("2026-10-14T22:00:00Z"))).toBe(1); // minuit à Paris
    expect(seasonDay(new Date("2026-10-21T12:00:00Z"))).toBe(7);
    expect(seasonDay(new Date("2026-10-22T12:00:00Z"))).toBe(8);
    expect(seasonDay(new Date("2027-06-01T12:00:00Z"))).toBe(90);
  });
});

describe("Reflex Cards — rien ne fuite avant la sortie", () => {
  it("les révélations officielles sont toutes des cartes du jour 1", () => {
    const rev = allCards().filter(isRevealed);
    expect(rev.length).toBeGreaterThan(0);
    for (const c of rev) expect(c.sortie?.jour).toBe(1);
    for (const c of [...HERO_CARDS, ...SHOWCASE_CARDS]) expect(isRevealed(c)).toBe(true);
  });
  it("avant le lancement : seules les révélations et les fossiles ont une page", () => {
    const vis = allCards().filter((c) => isVisible(c, 0));
    for (const c of vis) expect(isRevealed(c) || c.fossil).toBe(true);
    expect(allCards().filter((c) => isReleased(c, 0))).toEqual([]);
  });
  it("au jour N, aucune carte d'une partie future n'est visible (hors révélations)", () => {
    for (const day of [1, 7, 8, 22, 43, 77, 78, 90]) {
      for (const c of allCards()) {
        if (c.fossil || isRevealed(c)) continue;
        expect(isVisible(c, day)).toBe(c.sortie!.jour <= day);
      }
    }
  });
  it("les têtes d'affiche d'une partie future restent anonymes", () => {
    for (const p of REFLEX_PARTS) {
      expect(isPartNamed(p.jour, 0)).toBe(p.jour === 1);
      expect(isPartNamed(p.jour, p.jour)).toBe(true);
      if (p.jour > 1) expect(isPartNamed(p.jour, p.jour - 1)).toBe(false);
    }
  });
  it("chance imprimée sur la carte : même formatage que la maquette, et au jour 90 exactement sa valeur", () => {
    for (const c of allCards()) {
      expect("1/" + odds(c.chanceP)).toBe(c.chance);
      expect("1/" + odds(todayChance(c, 90))).toBe(c.chance);
    }
  });
  it("chance du jour : partage la chance de la rareté entre les cartes déjà sorties", () => {
    const c = allCards().find((x) => !x.fossil && x.r === "L" && x.sortie?.jour === 1)!;
    const sortiesJ1 = allCards().filter((x) => !x.fossil && x.r === "L" && x.sortie?.jour === 1).length;
    const toutes = allCards().filter((x) => !x.fossil && x.r === "L").length;
    expect(todayChance(c, 1)).toBeCloseTo(rarityInfo("L").chance / sortiesJ1, 12);
    expect(todayChance(c, 90)).toBeCloseTo(rarityInfo("L").chance / toutes, 12);
    expect(todayChance(c, 0)).toBe(todayChance(c, 1));
  });
});
