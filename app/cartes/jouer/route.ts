import { gameHtml } from "@/lib/reflex-cards/game";
import { isReflexCardsEnabled, seasonDay } from "@/lib/reflex-cards/data";

/**
 * /cartes/jouer — le jeu Reflex Cards. Bêta : partie dans le navigateur ; avec REFLEX_CARDS_ACCOUNTS, partie tenue par le serveur
 * (routes /api/cartes/*, invité ou compte du site).
 * Page autonome (son propre en-tête, lien de retour vers le site), régénérée toutes les heures : chaque jour à minuit
 * (Paris) la saison avance et les nouvelles cartes sortent, sans intervention. Seules les cartes sorties sont envoyées.
 * Interrupteur coupé : next.config.js réécrit déjà /cartes/* vers une vraie 404.
 */
/* 5 min : la page suit vite les sorties de minuit (le serveur de jeu accepte aussi la page de la veille) */
export const revalidate = 300;

export function GET(): Response {
  if (!isReflexCardsEnabled()) return new Response("Page introuvable", { status: 404 });
  const day = seasonDay();
  /* avant le jour 1 (date de lancement absente) : la présentation du jeu */
  if (day < 1) return new Response(null, { status: 307, headers: { Location: "/cartes" } });
  return new Response(gameHtml(day), {
    headers: { "Content-Type": "text/html; charset=utf-8", "X-Robots-Tag": "noindex, follow" },
  });
}
