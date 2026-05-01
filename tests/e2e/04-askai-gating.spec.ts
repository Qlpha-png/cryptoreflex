/**
 * E2E — AskAI Pro gating
 *
 * Funnel testé : visiteur Free arrive sur /cryptos/bitcoin → scroll jusqu'à
 * la section AskAI → vérifie l'encart "Réservé aux abonnés Soutien" + le CTA
 * vers /pro.
 *
 * Stratégie :
 *  - On force le statut Free via mock de /api/me (retourne plan free).
 *  - On vérifie le verrou visuel (Lock icon + heading "Réservé") et le CTA
 *    qui pointe vers /pro (avec ou sans hash #plans selon variante A/B).
 *  - Click sur le CTA → assertion qu'on atterit sur /pro.
 */

import { test, expect } from "@playwright/test";

test.describe("AskAI Pro gating", () => {
  test("free user sees lock and CTA → /pro", async ({ page }) => {
    // Mock /api/me pour garantir le statut "free" sans dépendre de cookies/Supabase.
    await page.route("**/api/me", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          plan: "free",
          isPro: false,
          isAuthenticated: false,
        }),
      });
    });

    await page.goto("/cryptos/bitcoin");

    // Le composant AskAI se charge dynamically. On attend que le heading apparaisse.
    // Le titre exact est "Réservé aux abonnés Soutien" — robuste à la casse.
    const lockHeading = page.getByRole("heading", {
      name: /réservé aux abonnés soutien/i,
    });

    // Scroll jusqu'à la section AskAI (peut être loin dans la page).
    await lockHeading.scrollIntoViewIfNeeded();
    await expect(lockHeading).toBeVisible({ timeout: 10_000 });

    // CTA "Devenir Soutien" / "Débloquer" / "Essayer gratuitement 7j" selon variante A/B.
    const ctaPattern = /devenir soutien|débloquer|essayer gratuitement/i;
    const cta = page.getByRole("link", { name: ctaPattern }).first();
    await expect(cta).toBeVisible();

    // Vérifie que le href pointe vers /pro (avec hash #plans ou query trial=1).
    const href = await cta.getAttribute("href");
    expect(href, `href du CTA: ${href}`).toMatch(/\/pro/);

    // Click + vérification de la nav vers /pro.
    await cta.click();
    await page.waitForURL(/\/pro/, { timeout: 10_000 });
    expect(page.url()).toContain("/pro");
  });
});
