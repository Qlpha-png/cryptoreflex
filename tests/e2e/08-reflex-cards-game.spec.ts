/**
 * E2E — Reflex Cards : la page du jeu /cartes/jouer (bêta sans compte, décision Kev 02/10/2026).
 * Prérequis : build avec NEXT_PUBLIC_REFLEX_CARDS_ENABLED=true. Avec NEXT_PUBLIC_REFLEX_CARDS_LAUNCH_DATE (jeu ouvert) :
 * la page joue ; sans date (avant lancement) : renvoi vers la présentation /cartes.
 */
import { test, expect } from "@playwright/test";

const LAUNCHED = !!process.env.NEXT_PUBLIC_REFLEX_CARDS_LAUNCH_DATE;

test.describe("Reflex Cards — page du jeu", () => {
  test("avant lancement : renvoi vers /cartes", async ({ page }) => {
    test.skip(LAUNCHED, "jeu ouvert dans ce build");
    await page.goto("/cartes/jouer");
    await expect(page).toHaveURL(/\/cartes$/);
  });

  test("jeu ouvert : partie neuve, un booster s'ouvre, aucune erreur", async ({ page }) => {
    test.skip(!LAUNCHED, "date de lancement absente");
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(String(e)));
    const res = await page.goto("/cartes/jouer");
    expect(res?.status()).toBe(200);
    expect(res?.headers()["x-robots-tag"]).toContain("noindex");
    await expect(page.getByRole("heading", { level: 1, name: "Reflex Cards" })).toBeVisible();
    await expect(page.locator("#stockn")).toHaveText("10");
    await page.goto("/cartes/jouer#booster");
    await page.locator("#pack").click();
    await page.locator("#revealAll").click();
    await expect.poll(() => page.evaluate(() => Object.keys(JSON.parse(localStorage.getItem("rc9:col") || "{}")).length)).toBeGreaterThan(0);
    await expect(page.locator("#stockn")).toHaveText("9");
    /* rien de simulé à l'écran en bêta : ni mur, ni amis, ni objectif mondial */
    await expect(page.locator('[data-xt="mur"]')).toBeHidden();
    await expect(page.locator("#world")).toBeHidden();
    expect(errors).toEqual([]);
  });
});
