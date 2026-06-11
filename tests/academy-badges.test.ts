import { describe, expect, it } from "vitest";
import {
  computeBadgesFromInputs,
  type BadgeInputs,
} from "@/lib/academy-badges";

const ZERO: BadgeInputs = {
  totalCompletedLessons: 0,
  startedTracks: 0,
  completedTracks: 0,
  totalTracks: 12,
  globalProgressPct: 0,
  quizzesPassed: 0,
  bestStreak: 0,
};

function earnedIds(inputs: BadgeInputs): string[] {
  return computeBadgesFromInputs(inputs)
    .filter((b) => b.earned)
    .map((b) => b.id);
}

describe("computeBadgesFromInputs", () => {
  it("ne décerne rien sur un état vierge", () => {
    expect(earnedIds(ZERO)).toEqual([]);
  });

  it("décerne premier-pas dès 1 leçon", () => {
    expect(earnedIds({ ...ZERO, totalCompletedLessons: 1 })).toEqual([
      "premier-pas",
    ]);
  });

  it("décerne explorateur à 3 parcours entamés, pas à 2", () => {
    expect(earnedIds({ ...ZERO, startedTracks: 2 })).not.toContain(
      "explorateur",
    );
    expect(earnedIds({ ...ZERO, startedTracks: 3 })).toContain("explorateur");
  });

  it("gère les paliers de streak (3 puis 7)", () => {
    expect(earnedIds({ ...ZERO, bestStreak: 3 })).toContain("serie-3");
    expect(earnedIds({ ...ZERO, bestStreak: 3 })).not.toContain("serie-7");
    expect(earnedIds({ ...ZERO, bestStreak: 7 })).toEqual(
      expect.arrayContaining(["serie-3", "serie-7"]),
    );
  });

  it("décerne maître uniquement si TOUS les parcours sont complets", () => {
    expect(
      earnedIds({ ...ZERO, completedTracks: 11, totalTracks: 12 }),
    ).not.toContain("maitre");
    expect(
      earnedIds({ ...ZERO, completedTracks: 12, totalTracks: 12 }),
    ).toContain("maitre");
  });

  it("ne décerne pas maître si totalTracks vaut 0 (division par zéro impossible)", () => {
    expect(
      earnedIds({ ...ZERO, totalTracks: 0, completedTracks: 0 }),
    ).not.toContain("maitre");
  });

  it("renvoie les 8 badges, earned ou non, dans un ordre stable", () => {
    const all = computeBadgesFromInputs(ZERO);
    expect(all).toHaveLength(8);
    expect(all.map((b) => b.id)).toEqual([
      "premier-pas",
      "explorateur",
      "serie-3",
      "quiz-valide",
      "premier-parcours",
      "mi-chemin",
      "serie-7",
      "maitre",
    ]);
  });
});
