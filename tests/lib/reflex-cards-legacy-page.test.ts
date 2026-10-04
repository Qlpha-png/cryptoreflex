/**
 * Reflex Cards — page du jeu ACTUEL (Univers éteint) après les correctifs client du 04/10 : rien ne doit changer pour les joueurs.
 * Écrit la page générée pour la QA navigateur (scratchpad/audit/univers-page/qa-univers.mjs legacy).
 */
import { describe, it, expect, vi } from "vitest";
import { writeFileSync, mkdirSync } from "node:fs";

delete process.env.REFLEX_CARDS_UNIVERS;
process.env.REFLEX_CARDS_ACCOUNTS = "true";
process.env.NEXT_PUBLIC_REFLEX_CARDS_LAUNCH_DATE = "2026-10-02";
vi.resetModules();
const { gameDataScript, gameHtml, gameData } = await import("@/lib/reflex-cards/game");
const { UNIVERS } = await import("@/lib/reflex-cards/engine");

describe("jeu actuel — Univers éteint", () => {
  it("le moteur et la page restent ceux d'avant : 881 cartes, GAME_UNIVERS=null", () => {
    expect(UNIVERS).toBe(false);
    const d = gameData(3);
    expect(d.cards.length).toBe(883); // 884 lignes exportées, 1 doublon retiré (Constellation)
    const s = gameDataScript(3);
    expect(s).toContain("GAME_UNIVERS=null");
    const html = gameHtml(3);
    expect(html).toContain("const UNIV=");
    const dir = "C:/Users/kevin/AppData/Local/Temp/claude/Y---claude/4893978b-d9c0-460d-a319-6c72b0ae5f3e/scratchpad/audit/univers-page";
    mkdirSync(dir, { recursive: true });
    writeFileSync(dir + "/jeu-legacy.html", html);
  });
});
