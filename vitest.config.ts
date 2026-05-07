import { defineConfig } from "vitest/config";
import path from "node:path";

/**
 * Bootstrap minimal Vitest — addresses P0 audit BACK (zéro tests = roulette
 * russe à chaque deploy sur les libs critiques).
 *
 * Stratégie : on commence par tester les libs PUREMENT déterministes et à
 * fort impact (scoring, auth bearer timing-safe, news rewriter heuristique
 * français/anglais). Les tests E2E / API peuvent venir dans une 2e itération.
 *
 * Run :
 *   pnpm vitest                  # watch mode
 *   pnpm vitest run              # single run (CI)
 *   pnpm vitest run --coverage   # avec coverage
 */
export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["tests/**/*.test.ts", "tests/**/*.spec.ts"],
    // FIX 2026-05-07 — séparer Vitest (unit) de Playwright (E2E).
    // Sans cet exclude, Vitest tentait de runner les 6 fichiers
    // tests/e2e/*.spec.ts qui utilisent l'API @playwright/test
    // (test.describe(), test()) → 6 erreurs systématiques en CI alors
    // que les 50 tests unit passaient. Maintenant Vitest = unit only,
    // Playwright = E2E only (lancé via `npm run test:e2e`).
    exclude: [
      "tests/e2e/**",
      "node_modules/**",
      ".next/**",
      "dist/**",
    ],
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      include: ["lib/**/*.ts"],
      exclude: [
        "lib/**/*.d.ts",
        "lib/email-series/**", // templates HTML, pas de logique
      ],
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./"),
    },
  },
});
