/**
 * lib/cache-scope.ts — portée des clés `unstable_cache` dont la SOURCE est le
 * code/contenu déployé (fichiers MDX du repo, JSON de data/…).
 *
 * Pourquoi : le Data Cache Vercel PERSISTE entre déploiements et la clé d'un
 * `unstable_cache` ne dépend que du code de la fonction + des keyParts. Sans
 * portée par build, un nouveau déploiement peut resservir l'ancien contenu
 * jusqu'à expiration du TTL — d'où les TTL à 60 s historiques (lib/mdx.ts,
 * lib/news-mdx.ts) qui, en Next 14, faisaient aussi tomber la revalidation
 * ISR des pages consommatrices (home incluse) à 60 s.
 *
 * Avec la portée par commit : chaque déploiement lit ses propres entrées
 * (contenu toujours frais après deploy), donc le TTL peut être long sans
 * risque de contenu périmé — le contenu ne change qu'au déploiement.
 *
 * Hors Vercel (dev / build local) : portée par process, pour qu'un rebuild
 * local ne relise jamais un .next/cache d'un contenu antérieur.
 */
export const DEPLOY_CACHE_SCOPE: string = (
  process.env.VERCEL_GIT_COMMIT_SHA ||
  process.env.VERCEL_DEPLOYMENT_ID ||
  `proc-${Date.now().toString(36)}`
).slice(0, 40);
