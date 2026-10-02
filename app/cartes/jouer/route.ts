import { gameHtml } from "@/lib/reflex-cards/game";
import { isReflexCardsEnabled, seasonDay } from "@/lib/reflex-cards/data";

/**
 * /cartes/jouer — le jeu Reflex Cards (bêta sans compte : la partie est enregistrée dans le navigateur).
 * Page autonome (son propre en-tête, lien de retour vers le site), régénérée toutes les heures : chaque jour à minuit
 * (Paris) la saison avance et les nouvelles cartes sortent, sans intervention. Seules les cartes sorties sont envoyées.
 * Interrupteur coupé : next.config.js réécrit déjà /cartes/* vers une vraie 404.
 */
export const revalidate = 3600;

export function GET(): Response {
  if (!isReflexCardsEnabled()) return new Response("Page introuvable", { status: 404 });
  const day = seasonDay();
  /* avant le jour 1 (date de lancement absente) : la présentation du jeu */
  if (day < 1) return new Response(null, { status: 307, headers: { Location: "/cartes" } });
  return new Response(gameHtml(day), {
    headers: { "Content-Type": "text/html; charset=utf-8", "X-Robots-Tag": "noindex, follow" },
  });
}
