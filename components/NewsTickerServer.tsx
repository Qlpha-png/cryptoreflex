import { getAllArticleSummaries } from "@/lib/mdx";
import NewsTicker from "@/components/NewsTicker";

/**
 * Wrapper Server pour <NewsTicker />.
 *
 * Récupère les 5 derniers articles via `getAllArticleSummaries()` (cachée
 * par unstable_cache, tag "articles") puis passe l'array en props au
 * composant client <NewsTicker />.
 *
 * Garde la home Server-Component-friendly : aucun appel client n'est nécessaire,
 * les données sont injectées au build/ISR.
 */
export default async function NewsTickerServer() {
  const all = await getAllArticleSummaries();
  // Le tri par date desc est déjà fait dans lib/mdx.ts ; on slice les 5 plus récents.
  const latest = all.slice(0, 5);

  // Si aucun article publié (ex: dataset vide en dev), on ne rend rien plutôt
  // qu'un bandeau vide qui casserait le rythme visuel.
  if (latest.length === 0) return null;

  return <NewsTicker articles={latest} />;
}
