# Cryptoreflex — contexte projet (pour Hermes)

Site **cryptoreflex.fr** : contenu et SEO crypto. Stack : Next.js 14 (App Router), TypeScript,
Tailwind, Supabase, déployé sur Vercel, monitoring Sentry, tests Vitest + Playwright.

## Emplacement
Repo local (git) : `C:\Users\kevin\Desktop\Projets\Sites\Cryptoreflex`.

## Commandes utiles
- `npm run dev` — serveur de dev local
- `npm run build` / `npm start` — build et prod
- `npm run lint` — lint
- `npm test` / `npm run test:e2e` — tests unitaires (Vitest) / e2e (Playwright)
- `npm run generate:daily`, `npm run refresh:events`, `npm run ping:search-engines` — contenu / SEO
- `npm run audit:quality`, `npm run audit:sitemap`, `npm run audit:all` — audits

## Logs
- `.codex-next-start.out.log` / `.codex-next-start.err.log` — serveur Next lancé en arrière-plan
- `.next_vercel.log` — build / déploiement Vercel
- `.git/logs` — historique git

## Règles de travail (importantes)
- NE PAS lire, afficher, logguer ni committer les secrets : `.env.local`, `.env.vercel-current`
  (clés Supabase / Vercel / Sentry). Si une tâche en a besoin, demander à Kevin.
- Travailler sur une BRANCHE et proposer les changements ; ne pas pousser sur `main` ni déployer
  sans validation explicite de Kevin.
- Contenu crypto : tout chiffre, date ou point de réglementation doit être vérifié (recherche web)
  avant publication — la réputation de Kev est en jeu.
- Avant une modification massive de fichiers : faire une sauvegarde.
