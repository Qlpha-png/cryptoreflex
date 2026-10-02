/**
 * E2E — Reflex Cards (phase A : visibilité, sans comptes), état AVANT LANCEMENT
 * (REFLEX_CARDS_LAUNCH_DATE absente). Prérequis : build avec NEXT_PUBLIC_REFLEX_CARDS_ENABLED=true
 * (ou préproduction Vercel).
 *
 * Règle vérifiée (décision Kev 02/10) : rien ne fuite avant la sortie.
 *  - révélations officielles du jour 1 (ex. Bitcoin) : carte entière ;
 *  - fossiles : case vide du Musée, histoire publique ;
 *  - carte pas encore sortie (ex. XRP, jour 43) : page « à venir » neutre (noindex), image de partage neutre,
 *    dos de carte sur la fiche ; id inconnu : vrai 404.
 */
import { test, expect } from "@playwright/test";

test.describe("Reflex Cards — avant lancement", () => {
  test("hub /cartes : héros, raretés, calendrier sans têtes d'affiche futures, aucune liste", async ({ page }) => {
    await page.goto("/cartes");
    await expect(page.getByRole("heading", { level: 1, name: /Reflex Cards/i })).toBeVisible();
    await expect(page.locator(".rc-card").filter({ visible: true }).first()).toBeVisible();
    await expect(page.getByText(/Révélée le jour 43/)).toBeVisible();
    await expect(page.getByRole("link", { name: "XRP" })).toHaveCount(0);
    await expect(page.locator("details")).toHaveCount(0);
    await expect(page.getByText(/Prévenez-moi|prévenu du lancement/)).toHaveCount(0);
  });

  test("révélation officielle : /cartes/bitcoin montre la carte entière", async ({ page }) => {
    await page.goto("/cartes/bitcoin");
    await expect(page.getByRole("heading", { level: 1, name: /Bitcoin/ })).toBeVisible();
    await expect(page.locator(".rc-card")).toHaveClass(/rc-r-L/);
    await expect(page.locator(".rc-ph")).toHaveCount(0);
  });

  test("fossile : case vide du Musée et histoire publique", async ({ page }) => {
    await page.goto("/cartes/terra-luna");
    await expect(page.locator(".rc-ph.rc-fos")).toBeVisible();
    await expect(page.locator(".rc-card")).toHaveCount(0);
    await expect(page.getByRole("heading", { name: /Ce qui s'est passé/ })).toBeVisible();
  });

  test("carte pas encore sortie : page « à venir » neutre (noindex), image de partage neutre", async ({ page, request }) => {
    expect((await page.goto("/cartes/ripple"))?.status()).toBe(200);
    await expect(page.getByRole("heading", { level: 1, name: /XRP : carte Reflex à venir/ })).toBeVisible();
    await expect(page.locator(".rc-back")).toBeVisible();
    await expect(page.locator(".rc-card, .rc-ph")).toHaveCount(0);
    await expect(page.locator("main")).not.toContainText(/Légendaire|Ultra rare|Super rare|Peu commune|N° d'album|jour 43/);
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
    /* image de partage : neutre (« carte à venir », sans rareté) — non testable sur Windows (bug @vercel/og), vérifiée en préproduction */
    if (process.platform !== "win32") {
      const og = await request.get("/cartes/ripple/opengraph-image");
      expect(og.status()).toBe(200);
      expect(og.headers()["content-type"]).toContain("image/png");
    }
  });

  test("id inconnu : vrai 404", async ({ page }) => {
    expect((await page.goto("/cartes/carte-qui-n-existe-pas"))?.status()).toBe(404);
  });

  test("fiche XRP (slug ≠ id CoinGecko) : dos de carte, sans rareté", async ({ page }) => {
    await page.goto("/cryptos/xrp");
    const promo = page.getByRole("region", { name: /Carte Reflex XRP/ });
    await expect(promo).toBeVisible();
    await expect(promo.locator(".rc-back")).toBeVisible();
    await expect(promo).toContainText("XRP aura sa carte Reflex");
    await expect(promo).not.toContainText(/Légendaire|Ultra rare|Super rare|Commune|Rare/);
    await expect(promo.getByRole("link", { name: /Découvrir le jeu/ })).toHaveAttribute("href", "/cartes");
  });

  test("widget : carte révélée seulement", async ({ page }) => {
    await page.goto("/embed/carte/bitcoin");
    await expect(page.locator(".rc-card")).toBeVisible();
    expect((await page.goto("/embed/carte/ripple"))?.status()).toBe(404);
  });
});
