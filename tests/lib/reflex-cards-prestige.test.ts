/**
 * Reflex Cards — ordre de prestige = rareté réelle (Kev 04/10 : « vérifie bien que chaque rareté est bien notée, le n° 1 plus rare
 * que le 2, l'Argent plus rare que l'Holo »). Utilisé pour l'ordre de révélation du booster (de la moins rare à la plus rare).
 */
import { describe, it, expect, vi } from "vitest";

process.env.REFLEX_CARDS_UNIVERS = "true";
process.env.NEXT_PUBLIC_REFLEX_CARDS_LAUNCH_DATE = "2026-10-02";
vi.resetModules();
const { prestigeOf, CARD, RULES, RAR } = await import("@/lib/reflex-cards/engine");
const { GAME_TEMPLATE } = await import("@/lib/reflex-cards/game/template");

const one = (r: string) => [...CARD.values()].find((c) => c.r === r && !c.fossil)!.id;
const item = (id: string, ed: string | null = null, fin: string | null = null, serial: number | null = null) => ({ id, ed, fin, serial }) as Parameters<typeof prestigeOf>[0];

describe("Reflex Cards — prestige", () => {
  it("éditions : Relique > Mythique > Équipe > Icône > Légendaire ordinaire", () => {
    const L = one("L");
    expect(prestigeOf(item("wk_q13382352", "relic"))).toBeGreaterThan(prestigeOf(item("bitcoin", "myth")));
    expect(prestigeOf(item("bitcoin", "myth"))).toBeGreaterThan(prestigeOf(item("bitcoin", "toty")));
    expect(prestigeOf(item("bitcoin", "toty"))).toBeGreaterThan(prestigeOf(item("ethereum", "icon")));
    expect(prestigeOf(item("ethereum", "icon"))).toBeGreaterThan(prestigeOf(item(L)));
  });
  it("raretés de base dans l'ordre, et les finitions : Onyx > Or > Argent > Holo > ordinaire", () => {
    const ids = ["C", "PC", "R", "SR", "UR", "L"].map(one);
    for (let i = 1; i < ids.length; i++) expect(prestigeOf(item(ids[i])), ids[i]).toBeGreaterThan(prestigeOf(item(ids[i - 1])));
    const sr = one("SR");
    const [o, g, a, h, n] = [item(sr, null, "onyx", 1), item(sr, null, "or", 3), item(sr, null, "ag", 3), item(sr, null, "holo"), item(sr)].map(prestigeOf);
    expect(o).toBeGreaterThan(g); expect(g).toBeGreaterThan(a); expect(a).toBeGreaterThan(h); expect(h).toBeGreaterThan(n);
  });
  it("une Commune Onyx 1/1 passe devant une Légendaire ordinaire ; le n° 1 devant le n° 2", () => {
    expect(prestigeOf(item(one("C"), null, "onyx", 1))).toBeGreaterThan(prestigeOf(item(one("L"))));
    const ur = one("UR");
    expect(prestigeOf(item(ur, null, "ag", 1))).toBeGreaterThan(prestigeOf(item(ur, null, "ag", 2)));
    expect(prestigeOf(item(ur, null, "or", 25))).toBeGreaterThan(prestigeOf(item(ur, null, "ag", 1)));
  });
  it("la Holo ne fait jamais passer une carte devant le palier au-dessus (Kev 06/10 : une Légendaire avant toute Holo)", () => {
    const ids = RAR.map(one);
    for (let i = 0; i < RAR.length; i++) {
      const holo = prestigeOf(item(ids[i], null, "holo"));
      expect(holo, `${RAR[i]} Holo > ${RAR[i]} ordinaire`).toBeGreaterThan(prestigeOf(item(ids[i])));
      if (i < RAR.length - 1) expect(holo, `${RAR[i]} Holo < ${RAR[i + 1]} ordinaire`).toBeLessThan(prestigeOf(item(ids[i + 1])));
    }
    const L = prestigeOf(item(one("L")));
    expect(L).toBeGreaterThan(prestigeOf(item(one("UR"), null, "holo")));
    expect(L).toBeGreaterThan(prestigeOf(item(one("SR"), null, "holo")));
    /* la Légendaire Holo garde sa rareté réelle (pas de palier au-dessus ; la tasser la ferait passer sous des Argent plus courantes) */
    expect(prestigeOf(item(one("L"), null, "holo"))).toBeCloseTo(-Math.log10(RULES.wRar.L * RULES.fin.holo.p), 9);
  });
  it("Argent, Or et Onyx gardent leur rareté réelle (−log10 part × chance, le n° départage)", () => {
    for (const r of RAR) for (const [fin, serial] of [["ag", 7], ["or", 3], ["onyx", 1]] as const) {
      const want = -Math.log10(RULES.wRar[r] * RULES.fin[fin].p) - serial / 1e4;
      expect(prestigeOf(item(one(r), null, fin, serial)), `${r} ${fin}`).toBeCloseTo(want, 9);
    }
  });
  it("le jeu (PRESTIGE du gabarit) et le serveur (prestigeOf) donnent la même valeur pour chaque rareté × finition et chaque édition", () => {
    const src = GAME_TEMPLATE.match(/const PRESTIGE=it=>\{[\s\S]*?\};\n/)?.[0];
    expect(src, "PRESTIGE introuvable dans le gabarit").toBeTruthy();
    const P = new Function("W_RAR", "RAR", "RNK", "FIN", "ED", "discoveryNo", `${src}return PRESTIGE;`)(
      RULES.wRar, RAR, (r: string) => RAR.indexOf(r as (typeof RAR)[number]), RULES.fin, RULES.ed, () => 0) as (it: unknown) => number;
    for (const r of RAR) for (const [fin, serial] of [[null, null], ["holo", null], ["ag", 7], ["or", 3], ["onyx", 1]] as const) {
      const id = one(r);
      expect(P({ c: { id, r }, ed: null, fin, serial }), `${r} ${fin ?? "ordinaire"}`).toBeCloseTo(prestigeOf(item(id, null, fin, serial)), 9);
    }
    for (const ed of new Set([...Object.keys(RULES.ed), "relic", "trophy"])) {
      expect(P({ c: { id: "bitcoin", r: "L" }, ed, fin: null, serial: null }), `édition ${ed}`).toBeCloseTo(prestigeOf(item("bitcoin", ed)), 9);
    }
  });
});
