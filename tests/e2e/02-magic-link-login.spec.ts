/**
 * E2E — Magic link login
 *
 * Funnel testé : /connexion → toggle "Lien magique" → fill email →
 * submit → écran de confirmation "Email envoyé".
 *
 * Stratégie de mock :
 *  - On intercepte POST /api/auth/login (magic link) et on retourne 200 + ok:true.
 *  - Pas de vrai Supabase requis : on vérifie que le formulaire bascule
 *    correctement en mode "sent".
 *  - On évite le mode password (qui demande une vraie session via reload).
 */

import { test, expect } from "@playwright/test";

test.describe("Magic link login", () => {
  test("sends magic link and shows confirmation screen", async ({ page }) => {
    // Intercept côté client AVANT le clic submit.
    await page.route("**/api/auth/login", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ ok: true }),
      });
    });

    await page.goto("/connexion");

    // Si Supabase n'est pas configuré, la page affiche un fallback CTA "Découvrir
    // Pro" sans formulaire — on log et on skip dans ce cas (CI sans envs).
    const fallback = page.getByRole("heading", {
      name: /Connexion bientôt disponible/i,
    });
    if (await fallback.isVisible().catch(() => false)) {
      test.skip(true, "Supabase non configuré — formulaire absent");
      return;
    }

    // Bascule en mode "Lien magique" via le tab.
    const magicTab = page.getByRole("tab", { name: /lien magique/i });
    await expect(magicTab).toBeVisible();
    await magicTab.click();

    // Le formulaire magic link n'a qu'un seul input email.
    const emailInput = page.locator('input[type="email"]');
    await expect(emailInput).toBeVisible();
    await emailInput.fill("e2e-magic@cryptoreflex.test");

    // CTA "Recevoir mon lien magique" — on cible le bouton submit visible.
    const submitBtn = page.getByRole("button", {
      name: /recevoir mon lien magique/i,
    });
    await expect(submitBtn).toBeEnabled();
    await submitBtn.click();

    // Assertion : écran de confirmation apparaît (heading "Email envoyé !").
    await expect(
      page.getByRole("heading", { name: /Email envoyé/i }),
    ).toBeVisible({ timeout: 10_000 });
  });

  test("displays error when API returns 400", async ({ page }) => {
    await page.route("**/api/auth/login", async (route) => {
      await route.fulfill({
        status: 400,
        contentType: "application/json",
        body: JSON.stringify({ error: "Email invalide côté serveur" }),
      });
    });

    await page.goto("/connexion");

    const fallback = page.getByRole("heading", {
      name: /Connexion bientôt disponible/i,
    });
    if (await fallback.isVisible().catch(() => false)) {
      test.skip(true, "Supabase non configuré — formulaire absent");
      return;
    }

    await page.getByRole("tab", { name: /lien magique/i }).click();
    await page.locator('input[type="email"]').fill("test@cryptoreflex.test");
    await page.getByRole("button", { name: /recevoir mon lien magique/i }).click();

    await expect(page.getByRole("alert")).toContainText(
      /Email invalide côté serveur/i,
      { timeout: 10_000 },
    );
  });
});
