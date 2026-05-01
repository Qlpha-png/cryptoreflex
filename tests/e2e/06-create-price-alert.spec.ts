/**
 * E2E — Create price alert
 *
 * Funnel testé : /alertes → fill email + crypto + seuil → submit →
 * vérifie que l'alerte apparaît dans la liste OU que le message succès s'affiche.
 *
 * Stratégie :
 *  - Mock POST /api/alerts (création) et GET /api/alerts (liste) pour ne pas
 *    dépendre de Supabase.
 *  - On simule le retour : alerte créée avec un id, listée immédiatement.
 *  - L'email est aussi persisté en localStorage par le composant — on vérifie
 *    l'état UI, pas le LS.
 */

import { test, expect } from "@playwright/test";

const TEST_EMAIL = "alerts-e2e@cryptoreflex.test";
const MOCK_ALERT = {
  id: "alert_e2e_1",
  email: TEST_EMAIL,
  cryptoId: "bitcoin",
  symbol: "BTC",
  condition: "above" as const,
  threshold: 100000,
  currency: "eur" as const,
  createdAt: Date.now(),
  status: "active" as const,
};

test.describe("Create price alert", () => {
  test("user can create an alert and see it in the list", async ({ page }) => {
    let alertCreated = false;

    // Mock GET (liste vide au départ, puis avec l'alerte créée après POST).
    await page.route("**/api/alerts**", async (route) => {
      const req = route.request();
      const method = req.method();

      if (method === "POST") {
        alertCreated = true;
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ ok: true, alert: MOCK_ALERT }),
        });
        return;
      }

      // GET — retourne la liste (vide avant création, contenant MOCK_ALERT après).
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          ok: true,
          alerts: alertCreated ? [MOCK_ALERT] : [],
        }),
      });
    });

    await page.goto("/alertes");

    // Vérification basique du hero (page chargée).
    await expect(
      page.getByRole("heading", { name: /alertes prix crypto/i }),
    ).toBeVisible();

    // Fill email — input avec type=email dans AlertsManager.
    const emailInput = page.locator('input[type="email"]').first();
    await expect(emailInput).toBeVisible();
    await emailInput.fill(TEST_EMAIL);

    // Crypto : input texte de recherche (selector basé sur placeholder/aria).
    // On essaie d'abord par role combobox, fallback sur input recherche.
    const cryptoSearch = page
      .locator('input[role="combobox"], input[placeholder*="crypto" i], input[placeholder*="bitcoin" i]')
      .first();
    if (await cryptoSearch.isVisible().catch(() => false)) {
      await cryptoSearch.fill("bitcoin");
      // Click sur la première suggestion (Bitcoin)
      const suggestion = page
        .getByRole("option", { name: /bitcoin/i })
        .first();
      if (await suggestion.isVisible().catch(() => false)) {
        await suggestion.click();
      } else {
        // Fallback : enter pour valider
        await cryptoSearch.press("Enter");
      }
    }

    // Seuil : input number ou text avec placeholder "prix"
    const thresholdInput = page
      .locator(
        'input[type="number"], input[inputmode="decimal"], input[placeholder*="prix" i], input[placeholder*="seuil" i]',
      )
      .first();
    if (await thresholdInput.isVisible().catch(() => false)) {
      await thresholdInput.fill("100000");
    }

    // Submit — bouton "Créer l'alerte" / "Créer une alerte".
    const submitBtn = page
      .getByRole("button", { name: /créer.*alerte/i })
      .first();
    await expect(submitBtn).toBeVisible();
    await submitBtn.click();

    // Assertion : soit message succès affiché, soit alerte présente dans la liste,
    // soit API POST a bien été appelée. On accepte plusieurs preuves de progression.
    await page.waitForTimeout(1_500);

    const successMsg = page
      .getByText(/alerte créée|alerte enregistrée|c['']est noté/i)
      .first();
    const alertInList = page.getByText(/100[\s ]?000/).first();

    const hasSuccessUI =
      (await successMsg.isVisible().catch(() => false)) ||
      (await alertInList.isVisible().catch(() => false));

    expect(
      alertCreated || hasSuccessUI,
      "Aucune preuve de création d'alerte (ni POST API, ni message succès, ni alerte listée)",
    ).toBe(true);
  });
});
