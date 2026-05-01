/**
 * E2E — Stripe checkout redirect
 *
 * Funnel testé : /pro → click sur le CTA "Devenir Soutien" du tier mensuel →
 * vérifie qu'on est redirigé vers checkout.stripe.com OU qu'on tombe sur
 * /connexion (cas user non authentifié sans bypass guest checkout).
 *
 * Important : on NE complète PAS le checkout réel. On s'arrête à la première
 * navigation hors localhost (Stripe-hosted page) ou à la redirection interne.
 *
 * Stratégie :
 *  - On intercepte la requête Stripe pour éviter d'ouvrir réellement la page
 *    hostée (lente, dépend du réseau, et expose la public key en log).
 *  - On vérifie l'URL de la requête XHR / navigation pour s'assurer qu'elle
 *    pointe bien vers `checkout.stripe.com`.
 */

import { test, expect } from "@playwright/test";

test.describe("Stripe checkout redirect", () => {
  test("clicking 'Devenir Soutien' triggers Stripe checkout creation", async ({
    page,
  }) => {
    let stripeCheckoutHit = false;
    let internalRedirect: string | null = null;

    // Intercept toute requête vers l'API checkout — on simule une réponse
    // Stripe-like sans réellement créer de session.
    await page.route("**/api/checkout/**", async (route) => {
      stripeCheckoutHit = true;
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          url: "https://checkout.stripe.com/c/pay/cs_test_e2e_mock_session",
        }),
      });
    });

    // Bloque la nav réelle vers stripe.com pour ne pas charger la page externe.
    await page.route("https://checkout.stripe.com/**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "text/html",
        body: "<html><body>Stripe checkout (mocked)</body></html>",
      });
    });

    await page.goto("/pro");

    // Le CTA mensuel est dans le composant TieredPricing OU GatedProTiers.
    // On cible un lien/bouton dont le label matche les variantes A/B
    // ("Devenir Soutien", "S'abonner", "Débloquer").
    const ctaCandidates = [
      page.getByRole("link", { name: /devenir soutien/i }).first(),
      page.getByRole("button", { name: /devenir soutien/i }).first(),
      page.getByRole("link", { name: /s['']?abonner/i }).first(),
      page.getByRole("button", { name: /s['']?abonner/i }).first(),
    ];

    let clicked = false;
    for (const cta of ctaCandidates) {
      if (await cta.isVisible().catch(() => false)) {
        // On capture la nav potentielle vers Stripe ou vers /connexion.
        const navPromise = page
          .waitForURL(/checkout\.stripe\.com|\/connexion|\/pro/, {
            timeout: 5_000,
          })
          .catch(() => null);
        await cta.scrollIntoViewIfNeeded();
        await cta.click();
        await navPromise;
        internalRedirect = page.url();
        clicked = true;
        break;
      }
    }

    expect(clicked, "Aucun CTA d'abonnement trouvé sur /pro").toBe(true);

    // Trois résultats acceptables :
    //  1. Hit sur l'API checkout (Stripe session créée) → stripeCheckoutHit=true
    //  2. Redirect vers Stripe-hosted page (mock fulfilled) → URL contient stripe.com
    //  3. Redirect vers /connexion car non authentifié et endpoint exige auth
    const okStripe = stripeCheckoutHit;
    const okStripeUrl =
      internalRedirect?.includes("checkout.stripe.com") ?? false;
    const okAuthRedirect =
      internalRedirect?.includes("/connexion") ?? false;

    expect(
      okStripe || okStripeUrl || okAuthRedirect,
      `Aucun comportement attendu détecté. URL finale: ${internalRedirect}, stripeHit: ${stripeCheckoutHit}`,
    ).toBe(true);
  });
});
