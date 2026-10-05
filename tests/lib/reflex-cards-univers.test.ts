/**
 * Reflex Cards — Univers (REFLEX_CARDS_UNIVERS=true) : 25 000+ cartes, rareté tirée d'abord (UNIV_W, 05/10), garanties conservées,
 * identifiants du jeu actuel retrouvés, éditions par catégorie, recherche.
 */
import { describe, it, expect, vi } from "vitest";
import type { Pity, Rnd } from "@/lib/reflex-cards/engine";
import RULES_RAW from "@/data/reflex-cards-rules.json";

/* les fichiers de préparation de vitest importent déjà le moteur (sans la variable) : on la pose, on vide le registre des modules et
   on recharge le moteur pour qu'il lise l'Univers */
process.env.REFLEX_CARDS_UNIVERS = "true";
vi.resetModules();
const { CARD, RULES, UNIVERS, dayTables, drawPack, inClear, universCardP } = await import("@/lib/reflex-cards/engine");
const { CATS, CAT_LABEL, UNIV_CAT_W, UNIV_W, searchUnivers, universById, universCards, universStats } = await import("@/lib/reflex-cards/univers");

const seeded = (seed: number): Rnd => {
  let a = seed;
  return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
};
const freshPity = (): Pity => ({ R: 0, SR: 0, UR: 0, opened: 0, gotSR: false, gotUR: false });
const RNK = (r: string) => RULES.rar.indexOf(r as "C");

describe("Univers — catalogue et règles", () => {
  it("l'interrupteur est lu et le catalogue chargé", () => {
    expect(UNIVERS).toBe(true);
    expect(RULES.univ).toBe(true);
    expect(RULES.wRar).toEqual(UNIV_W);
    expect(Object.values(UNIV_W).reduce((a, b) => a + b, 0)).toBeCloseTo(1, 9);
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
  it("éditions : Mythiques (chance totale ×2), Icônes (×3), Reliques (1 sur 1 milliard inchangé) de chaque catégorie", () => {
    const base = RULES_RAW as unknown as { ed: Record<string, { p: number; list: string[] }>; relics: string[]; relicP: number };
    expect(RULES.ed.myth.list.length).toBe(base.ed.myth.list.length + 7 * 3);
    expect(RULES.ed.icon.list.length).toBe(base.ed.icon.list.length + 7 * 5);
    expect(RULES.relics.length).toBe(base.relics.length + 7 * 3);
    expect(RULES.ed.myth.p).toBeCloseTo(base.ed.myth.p * 2, 12);
    expect(RULES.ed.icon.p).toBeCloseTo(base.ed.icon.p * 3, 12);
    expect(RULES.relicP * RULES.relics.length).toBeCloseTo(base.relicP * base.relics.length, 15);
    /* une Icône précise reste plus rare qu'une Légendaire précise */
    expect(RULES.ed.icon.p / RULES.ed.icon.list.length).toBeLessThan(1 / universCards().length);
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

describe("Univers — rareté tirée d'abord (UNIV_W), garanties conservées", () => {
  it("50 000 boosters : chaque rareté à sa part UNIV_W, Rare garantie au 6e booster", () => {
    const rnd = seeded(2026), ps = freshPity(), N = 50000;
    const seen = new Map<string, number>();
    let R = 0, worst = 0, since = 0, cards = 0;
    const byR: Record<string, number> = {}, byF: Record<string, number> = {};
    for (let i = 0; i < N; i++) {
      const p = drawPack(1, ps, null, rnd);
      let best = -1;
      for (const it of p) {
        if (it.ed) continue;
        cards++;
        const r = CARD.get(it.id)!.r;
        byR[r] = (byR[r] ?? 0) + 1;
        const f = CARD.get(it.id)!.fam;
        byF[f] = (byF[f] ?? 0) + 1;
        seen.set(it.id, (seen.get(it.id) ?? 0) + 1);
        best = Math.max(best, RNK(r));
      }
      const hasR = best >= 2;
      if (hasR) R++;
      since = hasR ? 0 : since + 1;
      worst = Math.max(worst, since);
    }
    expect(worst).toBeLessThan(RULES.pity.R);
    /* part de chaque rareté tirée ≈ UNIV_W (les garanties remontent un peu R et SR, baissent un peu C) */
    const total = universCards().length;
    expect(byR.C / cards).toBeGreaterThan(UNIV_W.C - 0.04);
    expect(byR.C / cards).toBeLessThan(UNIV_W.C + 0.005);
    expect(byR.L / cards).toBeGreaterThan(UNIV_W.L * 0.8);
    expect(byR.L / cards).toBeLessThan(UNIV_W.L * 1.2);
    expect(byR.UR / cards).toBeGreaterThan(UNIV_W.UR * 0.9);
    expect(byR.UR / cards).toBeLessThan(UNIV_W.UR * 1.15);
    /* part de chaque catégorie ≈ UNIV_CAT_W (05/10 au soir : la catégorie est tirée après la rareté) */
    for (const c of CATS) {
      const share = (byF[CAT_LABEL[c]] ?? 0) / cards;
      expect(share, c).toBeGreaterThan(UNIV_CAT_W[c] * 0.95);
      expect(share, c).toBeLessThan(UNIV_CAT_W[c] * 1.05);
    }
    /* cartes « hors crypto » (personnes, événements, entreprises, concepts, plateformes) : ~1,6 par booster (0,27 avant) */
    const autres = ["Personnes", "Événements", "Entreprises", "Concepts", "Plateformes"].reduce((s, f) => s + (byF[f] ?? 0), 0);
    expect(autres / N).toBeGreaterThan(1.5);
    /* toutes les cartes restent atteignables : 250 000 cartes tirées, au moins 97 % vues au moins une fois (les cryptos, désormais
       35 % des tirages pour 61 % du catalogue, sortent un peu moins : leurs Ultra rares et Légendaires ne sont pas toutes vues) ;
       la chance de CHAQUE carte est strictement positive (test suivant) */
    expect(seen.size / total).toBeGreaterThan(0.97);
    expect(R / N).toBeGreaterThan(0.55);
  });
  it("tirage par catégorie : parts UNIV_CAT_W, chaque carte atteignable, une Légendaire jamais plus probable qu'une Commune", () => {
    expect(Object.values(UNIV_CAT_W).reduce((a, b) => a + b, 0)).toBeCloseTo(1, 9);
    expect(RULES.wFam).toEqual(Object.fromEntries(CATS.map((c) => [CAT_LABEL[c], UNIV_CAT_W[c]])));
    const T = dayTables(1);
    /* somme des chances de toutes les cartes de base = part hors éditions et reliques (≈ 1) */
    let sum = 0;
    for (const r of RULES.rar) for (const c of T.byRD[r]) {
      const p = universCardP(1, r, c.fam);
      expect(p, c.id).toBeGreaterThan(0);
      sum += p;
    }
    expect(sum).toBeGreaterThan(0.99);
    expect(sum).toBeLessThanOrEqual(1 + 1e-12);
    /* une Légendaire précise, quelle que soit sa catégorie, n'est jamais plus facile à obtenir qu'une Commune précise */
    const labels = CATS.map((c) => CAT_LABEL[c]);
    const minC = Math.min(...labels.map((f) => universCardP(1, "C", f)));
    for (const f of labels) expect(universCardP(1, "L", f), f).toBeLessThanOrEqual(minC);
    /* dans une même catégorie, l'ordre des raretés est respecté */
    const order = ["L", "UR", "SR", "R", "PC", "C"] as const;
    for (const f of labels) for (let i = 0; i < order.length - 1; i++) {
      expect(universCardP(1, order[i], f), f + " " + order[i]).toBeLessThanOrEqual(universCardP(1, order[i + 1], f));
    }
  });
  it("la chance d'une carte précise dépend de sa rareté : Légendaire < Ultra rare < … < Commune", () => {
    const order = ["L", "UR", "SR", "R", "PC", "C"] as const;
    for (let i = 0; i < order.length - 1; i++) expect(universCardP(1, order[i]), order[i]).toBeLessThan(universCardP(1, order[i + 1]));
    /* somme sur toutes les cartes de base = part hors éditions et reliques (≈ 1) */
    const T = dayTables(1);
    const sum = RULES.rar.reduce((s, r) => s + universCardP(1, r) * T.byRD[r].length, 0);
    expect(sum).toBeGreaterThan(0.99);
    expect(sum).toBeLessThanOrEqual(1);
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
