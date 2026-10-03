/**
 * GET /cartes/manifest.webmanifest — le manifest de l'app « Reflex Cards » (PWA du jeu, lib/reflex-cards/pwa.ts).
 * Distinct du manifest du site (/manifest.webmanifest, app/manifest.ts) : son propre nom, sa propre icône, démarre sur le jeu.
 * Jeu coupé : 404 (next.config.js réécrit déjà /cartes/* vers une vraie 404). Hors middleware (préfixe /cartes exclu).
 */
import { isReflexCardsEnabled } from "@/lib/reflex-cards/flag";
import { gameManifest } from "@/lib/reflex-cards/pwa";

export const revalidate = 3600;

export function GET(): Response {
  if (!isReflexCardsEnabled()) return new Response("Page introuvable", { status: 404 });
  return new Response(JSON.stringify(gameManifest()), {
    headers: {
      "Content-Type": "application/manifest+json; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
