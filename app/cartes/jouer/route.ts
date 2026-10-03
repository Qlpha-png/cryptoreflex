import { gameHtml } from "@/lib/reflex-cards/game";
import { isReflexCardsEnabled, seasonDay } from "@/lib/reflex-cards/data";
import { applyReleases } from "@/lib/reflex-cards/releases";

/**
 * /cartes/jouer — le jeu Reflex Cards. Bêta : partie dans le navigateur ; avec REFLEX_CARDS_ACCOUNTS, partie tenue par le serveur
 * (routes /api/cartes/*, invité ou compte du site).
 * Page autonome (son propre en-tête, lien de retour vers le site), régénérée toutes les heures : chaque jour à minuit
 * (Paris) la saison avance et les nouvelles cartes sortent, sans intervention. Seules les cartes sorties sont envoyées.
 * Interrupteur coupé : next.config.js réécrit déjà /cartes/* vers une vraie 404.
 */
/* 5 min : la page suit vite les sorties de minuit (le serveur de jeu accepte aussi la page de la veille) */
export const revalidate = 300;

export async function GET(): Promise<Response> {
  if (!isReflexCardsEnabled()) return new Response("Page introuvable", { status: 404 });
  const day = seasonDay();
  /* avant le jour 1 (date de lancement absente) : la présentation du jeu */
  if (day < 1) return new Response(null, { status: 307, headers: { Location: "/cartes" } });
  /* sorties effectives (paliers de joueurs) : la page n'envoie que les cartes des parties sorties */
  const rel = await applyReleases();
  /* le jeu ne reçoit que l'index de la prochaine partie (jamais les paliers ni le nombre de joueurs) */
  const next = rel.next ? { part: rel.next.part, need: 0, have: null } : null;
  return new Response(gameHtml(day, next), {
    headers: { "Content-Type": "text/html; charset=utf-8", "X-Robots-Tag": "noindex, follow" },
  });
}
