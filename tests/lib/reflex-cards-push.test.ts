/**
 * Reflex Cards — règles des notifications (lib/reflex-cards/push.ts) et fusion des sujets (lib/web-push.ts).
 */
import { describe, it, expect } from "vitest";
import { RULES } from "@/lib/reflex-cards/engine";
import {
  ACTIVE_DAYS, FULL_COOLDOWN_MS, MSG, PLAYING_MS, fullAt, isActive, isQuietHour, newReleases, planFull, quizWindow, type FullCandidate,
} from "@/lib/reflex-cards/push";
import { DEFAULT_PUSH_TOPICS, mergeTopics } from "@/lib/web-push";

const T0 = Date.parse("2026-10-03T10:00:00Z");
const iso = (ms: number) => new Date(ms).toISOString();
const TODAY = "2026-10-03";
const player = (o: Partial<FullCandidate> = {}): FullCandidate => ({
  player_id: "p1", owner: "u1", stock: 7, stock_at: iso(T0 - 60 * 60_000), updated_at: iso(T0 - 2 * 3_600_000), days: ["2026-10-02"], ...o,
});

describe("réserve pleine", () => {
  it("fullAt : stock_at + (10 − stock) × 15 min ; null si déjà pleine en base ou date illisible", () => {
    expect(RULES.maxs).toBe(10);
    expect(RULES.cycle).toBe(15 * 60_000);
    expect(fullAt(7, T0)).toBe(T0 + 45 * 60_000);
    expect(fullAt(0, iso(T0))).toBe(T0 + 150 * 60_000);
    expect(fullAt(10, T0)).toBeNull();
    expect(fullAt(3, "pas une date")).toBeNull();
  });

  it("planFull : réserve pleine, joueur actif, pas en train de jouer, jamais deux fois pour la même réserve ni en moins de 2 h 30", () => {
    expect(planFull(player(), null, T0, TODAY)).toBe(true);
    expect(planFull(player({ stock_at: iso(T0 - 10 * 60_000) }), null, T0, TODAY)).toBe(false); // 7 → 10 : 45 min, pas encore
    expect(planFull(player({ stock: 10 }), null, T0, TODAY)).toBe(false);
    expect(planFull(player({ days: ["2026-09-01"] }), null, T0, TODAY)).toBe(false); // inactif depuis plus de 14 jours
    expect(planFull(player({ updated_at: iso(T0 - PLAYING_MS + 1000) }), null, T0, TODAY)).toBe(false); // joue en ce moment
    expect(planFull(player({ updated_at: "n/a" }), null, T0, TODAY)).toBe(true); // horodatage illisible : on n'exclut pas
    const p = player();
    expect(planFull(p, { at: T0 - 3 * 3_600_000, stockAt: p.stock_at }, T0, TODAY)).toBe(false); // même réserve déjà annoncée
    expect(planFull(p, { at: T0 - 60 * 60_000, stockAt: "autre" }, T0, TODAY)).toBe(false); // moins de 2 h 30
    expect(planFull(p, { at: T0 - FULL_COOLDOWN_MS, stockAt: "autre" }, T0, TODAY)).toBe(true);
  });
});

describe("heures et fenêtres (Paris)", () => {
  it("heures calmes de 22 h à 8 h, été comme hiver", () => {
    expect(isQuietHour(new Date("2026-10-03T20:00:00Z"))).toBe(true); // 22 h (UTC+2)
    expect(isQuietHour(new Date("2026-10-03T19:59:00Z"))).toBe(false); // 21 h 59
    expect(isQuietHour(new Date("2026-10-03T05:59:00Z"))).toBe(true); // 7 h 59
    expect(isQuietHour(new Date("2026-10-03T06:00:00Z"))).toBe(false); // 8 h
    expect(isQuietHour(new Date("2026-12-03T21:00:00Z"))).toBe(true); // hiver (UTC+1) : 22 h
    expect(isQuietHour(new Date("2026-12-03T07:00:00Z"))).toBe(false); // hiver : 8 h
  });
  it("fenêtre du quiz : 18 h 00-18 h 59", () => {
    expect(quizWindow(new Date("2026-10-03T16:00:00Z"))).toBe(true);
    expect(quizWindow(new Date("2026-10-03T16:59:00Z"))).toBe(true);
    expect(quizWindow(new Date("2026-10-03T17:00:00Z"))).toBe(false);
    expect(quizWindow(new Date("2026-10-03T15:59:00Z"))).toBe(false);
  });
  it("joueur actif : a joué l'un des 14 derniers jours", () => {
    expect(ACTIVE_DAYS).toBe(14);
    expect(isActive(["2026-09-19"], TODAY)).toBe(true);
    expect(isActive(["2026-09-18"], TODAY)).toBe(false);
    expect(isActive(["2026-09-01", TODAY], TODAY)).toBe(true);
    expect(isActive([], TODAY)).toBe(false);
  });
});

describe("nouvelles sorties", () => {
  const dates = ["2026-08-21", "2026-10-01", "2026-10-03", "2026-10-09", null];
  it("annonce les parties sorties (date ≤ aujourd'hui) pas encore annoncées, jamais la partie du lancement", () => {
    expect(newReleases(dates, [], TODAY)).toEqual([1, 2]);
    expect(newReleases(dates, ["2026-08-21", "2026-10-01"], TODAY)).toEqual([2]);
    expect(newReleases(dates, dates, TODAY)).toEqual([]);
    expect(newReleases(dates, ["2026-08-21", "2026-09-30"], TODAY)).toEqual([1, 2]); // date forcée différente : ré-annoncée
    expect(newReleases([null, null], [], TODAY)).toEqual([]);
  });
  it("messages : vouvoiement, lien vers le jeu, icône PNG, étiquette stable", () => {
    for (const m of [MSG.full, MSG.quiz, MSG.release(1), MSG.release(99)]) {
      expect(m.url.startsWith("/cartes/jouer")).toBe(true);
      expect(m.icon).toMatch(/\.png$/);
      expect(m.tag).toMatch(/^rc-/);
      expect(m.body).not.toMatch(/\b(tu|ton|ta|tes)\b/i);
      expect(m.title).toContain("Reflex Cards");
    }
    expect(MSG.full.body).toContain("10 boosters");
    expect(MSG.release(1).body).toContain(RULES.parts[1].collection);
    expect(MSG.release(1).tag).not.toBe(MSG.release(2).tag);
  });
});

describe("sujets des souscriptions (mergeTopics)", () => {
  it("remplacement par défaut, fusion avec merge, retrait, jamais vide", () => {
    expect(DEFAULT_PUSH_TOPICS).toEqual(["alerts", "brief"]);
    expect(mergeTopics(["alerts", "brief"], ["cartes"])).toEqual(["cartes"]);
    expect(mergeTopics(null, [])).toEqual(["alerts", "brief"]);
    expect(mergeTopics(["alerts", "brief"], ["cartes"], { merge: true })).toEqual(["alerts", "brief", "cartes"]);
    expect(mergeTopics(null, ["cartes"], { merge: true })).toEqual(["alerts", "brief", "cartes"]);
    expect(mergeTopics(["alerts", "brief", "cartes"], [], { merge: true, remove: ["cartes"] })).toEqual(["alerts", "brief"]);
    expect(mergeTopics(["cartes"], [], { merge: true, remove: ["cartes"] })).toEqual(["alerts", "brief"]);
    expect(mergeTopics(["cartes", "cartes"], ["cartes"], { merge: true })).toEqual(["cartes"]);
    expect(mergeTopics(["alerts"], [], { merge: true })).toEqual(["alerts"]); // /mon-compte (PushOptIn) : garde l'existant
  });
});
