/**
 * Reflex Cards — Univers (REFLEX_CARDS_UNIVERS=true) : 27 744 cartes, tirage équiprobable, garanties conservées,
 * identifiants du jeu actuel retrouvés, éditions par catégorie, recherche.
 */
import { describe, it, expect, vi } from "vitest";
import type { Pity, Rnd } from "@/lib/reflex-cards/engine";
import RULES_RAW from "@/data/reflex-cards-rules.json";

/* les fichiers de préparation de vitest importent déjà le moteur (sans la variable) : on la pose, on vide le registre des modules et
   on recharge le moteur pour qu'il lise l'Univers */
process.env.REFLEX_CARDS_UNIVERS = "true";
vi.resetModules();
const { CARD, RULES, UNIVERS, dayTables, drawPack, inClear } = await import("@/lib/reflex-cards/engine");
const { CATS, CAT_LABEL, searchUnivers, universById, universCards, universStats } = await import("@/lib/reflex-cards/univers");

const seeded = (seed: number): Rnd => {
  let a = seed;
  return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
};
const freshPity = (): Pity => ({ R: 0, SR: 0, UR: 0, opened: 0, gotSR: false, gotUR: false });
const RNK = (r: string) => RULES.rar.indexOf(r as "C");

describe("Univers — catalogue et règles", () => {
  it("l'interrupteur est lu et le catalogue chargé", () => {
    expect(UNIVERS).toBe(true);
    expect(RULES.equi).toBe(true);
    expect(universCards().length).toBeGreaterThan(25000);
    /* les 2 Fossiles du Musée (Terra, UST) sont aussi des cartes du catalogue : pas de doublon */
    expect(RULES.cards.length).toBe(universCards().length);
    expect(RULES.ed.fossil.list.every((id) => !!CARD.get(id))).toBe(true);
    expect(RULES.families).toEqual(CATS.map((c) => CAT_LABEL[c]));
  });
  it("toutes les cartes du jeu actuel existent avec le même identifiant et une rareté au moins égale", () => {
    const old = (RULES_RAW as { cards: { id: string; r: string; fossil?: 1 }[] }).cards;
    for (const c of old) {
      const u = CARD.get(c.id);
      expect(u, c.id).toBeTruthy();
      expect(RNK(u!.r)).toBeGreaterThanOrEqual(RNK(c.r));
    }
  });
  it("chaque catégorie a au moins 4 Légendaires, une pyramide et au moins 25 % de Communes", () => {
    const st = universStats();
    for (const cat of CATS) {
      const s = st[cat];
      expect(s.L, cat).toBeGreaterThanOrEqual(4);
      expect(s.C, cat).toBeGreaterThanOrEqual(s.total * 0.25);
      for (const [a, b] of [["L", "UR"], ["UR", "SR"], ["SR", "R"], ["R", "PC"], ["PC", "C"]]) expect(s[a], `${cat} ${a}≤${b}`).toBeLessThanOrEqual(s[b]);
    }
  });
  it("éditions : Mythiques, Icônes et Reliques de chaque catégorie, taux par carte inchangés", () => {
    const base = RULES_RAW as unknown as { ed: Record<string, { p: number; list: string[] }>; relics: string[] };
    expect(RULES.ed.myth.list.length).toBe(base.ed.myth.list.length + 7 * 3);
    expect(RULES.ed.icon.list.length).toBe(base.ed.icon.list.length + 7 * 5);
    expect(RULES.relics.length).toBe(base.relics.length + 7 * 3);
    expect(RULES.ed.myth.p / RULES.ed.myth.list.length).toBeCloseTo(base.ed.myth.p / base.ed.myth.list.length, 12);
    expect(RULES.ed.icon.p / RULES.ed.icon.list.length).toBeCloseTo(base.ed.icon.p / base.ed.icon.list.length, 12);
    for (const id of [...RULES.ed.myth.list, ...RULES.ed.icon.list]) expect(CARD.get(id), id).toBeTruthy();
    expect(RULES.ed.icon.list).toContain("wk_q6831501"); // Michael Saylor, Icône des Personnes
  });
  it("tout est sorti dès le jour 1 et tout est en clair", () => {
    const T = dayTables(1);
    expect(T.all.length).toBe(universCards().length);
    expect(inClear("pr_aave", 1)).toBe(true);
    expect(T.byFam.get("Personnes")!.length).toBe(universStats().personne.total);
  });
});

describe("Univers — tirage équiprobable, garanties conservées", () => {
  it("50 000 boosters : chaque palier au prorata de son effectif, Rare garantie au 6e booster", () => {
    const rnd = seeded(2026), ps = freshPity(), N = 50000;
    const seen = new Map<string, number>();
    let R = 0, worst = 0, since = 0, cards = 0;
    const byR: Record<string, number> = {};
    for (let i = 0; i < N; i++) {
      const p = drawPack(1, ps, null, rnd);
      let best = -1;
      for (const it of p) {
        if (it.ed) continue;
        cards++;
        const r = CARD.get(it.id)!.r;
        byR[r] = (byR[r] ?? 0) + 1;
        seen.set(it.id, (seen.get(it.id) ?? 0) + 1);
        best = Math.max(best, RNK(r));
      }
      const hasR = best >= 2;
      if (hasR) R++;
      since = hasR ? 0 : since + 1;
      worst = Math.max(worst, since);
    }
    expect(worst).toBeLessThan(RULES.pity.R);
    /* part des Communes tirées ≈ part des Communes du pool (71-72 %), à la garantie près */
    const total = universCards().length, nC = universCards().filter((c) => c.r === "C").length;
    expect(byR.C / cards).toBeGreaterThan(nC / total - 0.06);
    expect(byR.C / cards).toBeLessThan(nC / total + 0.01);
    /* 250 000 cartes tirées sur 27 744 : au moins 99 % des cartes vues au moins une fois (équiprobabilité) */
    expect(seen.size / total).toBeGreaterThan(0.99);
    expect(R / N).toBeGreaterThan(0.3);
  });
  it("booster thématique Personnes : que des Personnes", () => {
    const rnd = seeded(7), ps = freshPity();
    for (let i = 0; i < 2000; i++) for (const it of drawPack(1, ps, "Personnes", rnd)) if (!it.ed) expect(CARD.get(it.id)!.fam).toBe("Personnes");
  });
});

describe("Univers — recherche", () => {
  it("trouve Satoshi, Aave et le Pizza Day, les plus connus d'abord", () => {
    expect(searchUnivers("satoshi", null)[0].nom).toBe("Satoshi Nakamoto");
    expect(searchUnivers("aave", "protocole")[0].id).toBe("pr_aave");
    expect(searchUnivers("pizza", "evenement").some((c) => c.id === "ev_pizza-day-2010")).toBe(true);
    expect(searchUnivers("b", null)).toEqual([]);
    expect(universById("bitcoin")!.r).toBe("L");
  });
});
