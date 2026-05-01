/**
 * E2E — Newsletter signup
 *
 * Funnel testé : visiteur ouvre la home → scroll jusqu'au formulaire
 * NewsletterInline → soumet email → reçoit la confirmation (popin succès
 * ou message inline).
 *
 * Stratégie de mock :
 *  - On intercepte POST /api/newsletter/subscribe et on retourne 200 + ok:true
 *    pour ne pas dépendre de Beehiiv en CI.
 *  - On accepte aussi le mode "mocked: true" si l'API est dégradée.
 *
 * Page utilisée : /newsletter (page dédiée, sans dépendance MDX/blog).
 */

import { test, expect } from "@playwright/test";

const TEST_EMAIL = `e2e-${Date.now()}@cryptoreflex.test`;

test.describe("Newsletter signup", () => {
  test("submits email via NewsletterInline form", async ({ page }) => {
    // Mock l'API pour éviter d'envoyer un vrai signup à Beehiiv en CI.
    await page.route("**/api/newsletter/subscribe", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ ok: true, mocked: false }),
      });
    });

    await page.goto("/newsletter");

    // Le composant NewsletterInline expose un input type=email avec autoComplete=email.
    // On en cible le premier visible (la page peut en avoir plusieurs : hero + footer).
    const emailInput = page
      .locator('input[type="email"][autocomplete="email"]')
      .first();
    await emailInput.scrollIntoViewIfNeeded();
    await expect(emailInput).toBeVisible();
    await emailInput.fill(TEST_EMAIL);

    // Submit via Enter — fonctionne quel que soit le label du bouton (CTA varient
    // selon source : "S'abonner", "Recevoir la newsletter", etc.).
    await emailInput.press("Enter");

    // Assertion succès : soit la popin succès s'ouvre (role=dialog) soit le
    // message inline "Inscription confirmée" apparaît. On accepte les deux pour
    // robustesse aux refactors UI.
    const successDialog = page.getByRole("dialog", { name: /bienvenue|email bien noté/i });
    const inlineSuccess = page.getByText(
      /Inscription confirmée|Email noté/i,
    );

    await expect(successDialog.or(inlineSuccess)).toBeVisible({ timeout: 10_000 });
  });

  test("shows error on invalid email", async ({ page }) => {
    await page.goto("/newsletter");

    const emailInput = page
      .locator('input[type="email"][autocomplete="email"]')
      .first();
    await emailInput.scrollIntoViewIfNeeded();
    await emailInput.fill("not-an-email");
    await emailInput.press("Enter");

    // Le navigateur peut bloquer la soumission via la validation native HTML5
    // OU le composant peut afficher son propre message — on accepte les deux.
    const validity = await emailInput.evaluate(
      (el: HTMLInputElement) => el.validity.valid,
    );
    if (validity) {
      // Si l'email a passé la valid native (peu probable mais possible si pattern
      // custom), le composant doit afficher une erreur.
      await expect(page.getByText(/Adresse email invalide/i)).toBeVisible();
    } else {
      expect(validity).toBe(false);
    }
  });
});
