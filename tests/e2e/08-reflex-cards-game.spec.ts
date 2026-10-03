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
    /* « Tout révéler » n'agit qu'une fois la main étalée (fin de l'animation d'ouverture) */
    await page.locator("#rv").waitFor({ timeout: 10_000 });
    await page.locator("#revealAll").click();
    await expect.poll(() => page.evaluate(() => Object.keys(JSON.parse(localStorage.getItem("rc9:col") || "{}")).length)).toBeGreaterThan(0);
    await expect(page.locator("#stockn")).toHaveText("9");
    /* le bilan du booster s'affiche (garde-fou du bilan différé : il ne doit pas l'empêcher) */
    await expect(page.locator(".bilan")).toBeVisible({ timeout: 15_000 });
    /* rien de simulé à l'écran en bêta : ni mur, ni amis, ni objectif mondial */
    await expect(page.locator('[data-xt="mur"]')).toBeHidden();
    await expect(page.locator("#world")).toBeHidden();
    expect(errors).toEqual([]);
  });

  test("jeu ouvert : la page est installable (manifest dédié, métas iPhone, icônes PNG, script PWA)", async ({ page, request }) => {
    test.skip(!LAUNCHED, "date de lancement absente");
    await page.goto("/cartes/jouer");
    await expect(page.locator('link[rel="manifest"]')).toHaveAttribute("href", "/cartes/manifest.webmanifest");
    await expect(page.locator('meta[name="apple-mobile-web-app-capable"]')).toHaveAttribute("content", "yes");
    await expect(page.locator('script[src^="/reflex-cards/pwa.js"]')).toHaveCount(1);
    const res = await request.get("/cartes/manifest.webmanifest");
    expect(res.status()).toBe(200);
    expect(res.headers()["content-type"]).toContain("application/manifest+json");
    const m = (await res.json()) as { start_url: string; icons: { src: string }[] };
    expect(m.start_url).toBe("/cartes/jouer");
    for (const i of m.icons) expect((await request.get(i.src)).status()).toBe(200);
    expect((await request.get("/reflex-cards/pwa.js")).status()).toBe(200);
  });
});
