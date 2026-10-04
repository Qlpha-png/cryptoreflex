/**
 * Reflex Cards — ordre de prestige = rareté réelle (Kev 04/10 : « vérifie bien que chaque rareté est bien notée, le n° 1 plus rare
 * que le 2, l'Argent plus rare que l'Holo »). Utilisé pour l'ordre de révélation du booster (de la moins rare à la plus rare).
 */
import { describe, it, expect, vi } from "vitest";

process.env.REFLEX_CARDS_UNIVERS = "true";
process.env.NEXT_PUBLIC_REFLEX_CARDS_LAUNCH_DATE = "2026-10-02";
vi.resetModules();
const { prestigeOf, CARD } = await import("@/lib/reflex-cards/engine");

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
});
