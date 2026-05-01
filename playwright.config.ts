/**
 * Playwright config — E2E sur funnels critiques.
 *
 * Périmètre : checkout Stripe (redirect uniquement, sans paiement réel),
 * magic link login, génération Cerfa 2086, AskAI Pro gating, alertes prix,
 * newsletter Beehiiv. Voir tests/e2e/README ou ETUDE-AMELIORATIONS.
 *
 * Choix de design :
 *  - Workers = 1 : éviter les conflits localStorage (alertes manager
 *    persiste l'email en LS, push notifications partagent le permission
 *    state, etc.).
 *  - Chromium uniquement : la stack utilisateur cible est Chrome desktop
 *    + mobile Chrome/Safari (WebKit ajouterait du temps CI sans déloquer
 *    de bug supplémentaire à ce stade).
 *  - Matrix viewport : mobile-first (375x812 = iPhone X) ET desktop
 *    (1280x720) — la plupart des bugs UX viennent du switch responsive.
 *  - webServer : démarre `npm run dev` automatiquement et attend le port
 *    3000 prêt avant de lancer la suite.
 */

import { defineConfig, devices } from "@playwright/test";

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000";

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 30_000,
  expect: {
    timeout: 5_000,
  },
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: process.env.CI
    ? [["list"], ["html", { open: "never" }], ["github"]]
    : [["list"], ["html", { open: "never" }]],

  use: {
    baseURL: BASE_URL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    // Évite les bannières/consent au premier load — on simule un visiteur
    // qui a déjà accepté les cookies pour ne pas avoir à les click sur chaque test.
    storageState: undefined,
    actionTimeout: 10_000,
    navigationTimeout: 15_000,
  },

  projects: [
    {
      name: "chromium-desktop",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1280, height: 720 },
      },
    },
    {
      name: "chromium-mobile",
      use: {
        ...devices["Pixel 5"],
        viewport: { width: 375, height: 812 },
      },
    },
  ],

  webServer: {
    command: "npm run dev",
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    stdout: "ignore",
    stderr: "pipe",
  },
});
