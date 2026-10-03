/**
 * Reflex Cards — sorties par paliers de joueurs (décision Kev, 03/10/2026).
 */
import { describe, it, expect, afterEach } from "vitest";
import rules from "@/data/reflex-cards-rules.json";
import { computeReleases, manualReleases, toReleases, DEFAULT_PLAYERS, N_PARTS, releasePlayers } from "@/lib/reflex-cards/releases";
import { FAR, partDay, relDay, setPartDays, totyDay, seasonEndDay, dayTables, isOut, CARD } from "@/lib/reflex-cards/engine";
import { isSentInClear, gameData } from "@/lib/reflex-cards/game";

const R = rules as unknown as { parts: { jour: number }[]; totyFromDay: number };
const STATIC = R.parts.map((p) => p.jour);
const LAUNCH = "2026-10-02";
const T = DEFAULT_PLAYERS;
const none = () => Array.from({ length: N_PARTS }, () => null as string | null);

afterEach(() => setPartDays(STATIC, R.totyFromDay, 90));

describe("Reflex Cards — sorties par paliers de joueurs", () => {
  it("au lancement : seule la partie 1 est sortie, quel que soit le temps écoulé", () => {
    const { dates, changed } = computeReleases({ launch: LAUNCH, today: "2026-12-25", players: 3, stored: none(), thresholds: T });
    expect(dates[0]).toBe(LAUNCH);
    expect(dates.slice(1).every((d) => d === null)).toBe(true);
    expect(changed).toBe(false);
    const rel = toReleases(LAUNCH, dates, 3, T);
    expect(rel.days[0]).toBe(1);
    expect(rel.days.slice(1).every((d) => d === FAR)).toBe(true);
    expect(rel.next).toEqual({ part: 1, need: 20, have: 3 });
    expect(rel.totyDay).toBe(FAR);
    expect(rel.endDay).toBe(FAR);
  });
  it("palier atteint : la partie suivante sort aujourd'hui, une seule par jour, et ne recule jamais", () => {
    const a = computeReleases({ launch: LAUNCH, today: "2026-10-20", players: 45, stored: none(), thresholds: T });
    expect(a.changed).toBe(true);
    expect(a.dates[1]).toBe("2026-10-20");
    expect(a.dates[2]).toBeNull(); // 45 ≥ 40 aussi, mais pas le même jour
    const b = computeReleases({ launch: LAUNCH, today: "2026-10-20", players: 45, stored: a.dates, thresholds: T });
    expect(b.changed).toBe(false);
    const c = computeReleases({ launch: LAUNCH, today: "2026-10-21", players: 45, stored: a.dates, thresholds: T });
    expect(c.dates[2]).toBe("2026-10-21");
    /* les joueurs baissent (comptes supprimés) : rien ne se « dé-sort » */
    const d = computeReleases({ launch: LAUNCH, today: "2026-10-22", players: 2, stored: c.dates, thresholds: T });
    expect(d.dates.slice(0, 3)).toEqual([LAUNCH, "2026-10-20", "2026-10-21"]);
    expect(d.dates[3]).toBeNull();
    const rel = toReleases(LAUNCH, d.dates, 2, T);
    expect(rel.days.slice(0, 4)).toEqual([1, 19, 20, FAR]);
    expect(rel.next).toEqual({ part: 3, need: 70, have: 2 });
  });
  it("forçage à la main (variable serveur) : date imposée ou sortie retirée ; JSON illisible ignoré", () => {
    expect(manualReleases('{"1":"2026-10-09","2":null,"x":"2026-10-10","5":"pas une date"}')).toEqual([undefined, "2026-10-09", null]);
    expect(manualReleases('["2026-10-02","2026-10-09"]')[1]).toBe("2026-10-09");
    expect(manualReleases("{oups")).toEqual([]);
    const stored = none(); stored[1] = "2026-10-20"; stored[2] = "2026-10-21";
    const r = computeReleases({ launch: LAUNCH, today: "2026-10-25", players: 0, stored, thresholds: T, manual: [undefined, undefined, null, "2026-10-24"] });
    expect(r.dates.slice(0, 4)).toEqual([LAUNCH, "2026-10-20", null, "2026-10-24"]);
  });
  it("paliers : liste par défaut, variable serveur valide (11 nombres croissants) ou retour au défaut", () => {
    const prev = process.env.REFLEX_CARDS_RELEASE_PLAYERS;
    try {
      delete process.env.REFLEX_CARDS_RELEASE_PLAYERS;
      expect(releasePlayers()).toEqual(DEFAULT_PLAYERS);
      process.env.REFLEX_CARDS_RELEASE_PLAYERS = "10,20,30,40,50,60,70,80,90,100,110";
      expect(releasePlayers()).toEqual([10, 20, 30, 40, 50, 60, 70, 80, 90, 100, 110]);
      process.env.REFLEX_CARDS_RELEASE_PLAYERS = "10,5";
      expect(releasePlayers()).toEqual(DEFAULT_PLAYERS);
    } finally {
      if (prev === undefined) delete process.env.REFLEX_CARDS_RELEASE_PLAYERS; else process.env.REFLEX_CARDS_RELEASE_PLAYERS = prev;
    }
  });
  it("moteur : avec seule la partie 1 sortie, aucune carte des parties suivantes n'est tirable, visible ni fabricable, même au jour 200", () => {
    setPartDays([1], FAR, FAR);
    expect(partDay(1)).toBe(FAR);
    expect(totyDay()).toBe(FAR);
    expect(seasonEndDay()).toBe(FAR);
    /* révélations officielles (nommées dès le jour 1 quelle que soit leur partie) : hors du contrôle « rien ne fuit » */
    const PUBLICS = new Set(["bitcoin", "litecoin", "dogecoin", "monero", "ethereum", "chainlink", "aave"]);
    const later = [...CARD.values()].filter((c) => !c.fossil && (c.part as number) > 0 && !PUBLICS.has(c.id));
    expect(later.length).toBeGreaterThan(400);
    for (const c of later) { expect(relDay(c)).toBe(FAR); expect(isOut(c, 200)).toBe(false); expect(isSentInClear(c.id, 200)).toBe(false); }
    const t = dayTables(200);
    const drawable = Object.values(t.byRD).flat();
    expect(drawable.every((c) => (c.part as number) === 0)).toBe(true);
    expect(t.ed.toty.list).toEqual([]);
    const g = gameData(200);
    expect(g.paliers.parties[0].jour).toBe(1);
    expect(g.paliers.parties.slice(1).every((p) => p.jour === FAR)).toBe(true);
    expect(g.toty).toEqual([]);
    expect(g.masked).toBe(later.length);
    /* la partie 2 sort au jour 19 : ses cartes deviennent visibles au jour 19, pas avant */
    setPartDays([1, 19], FAR, FAR);
    const p2 = later.filter((c) => (c.part as number) === 1);
    expect(p2.every((c) => isOut(c, 18) === false && isOut(c, 19) === true)).toBe(true);
    expect(dayTables(19).byRD.C.some((c) => (c.part as number) === 1)).toBe(true);
  });
});
