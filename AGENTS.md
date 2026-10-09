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

## L'Usine (09/10/2026)
- Vue d'ensemble de tout ce qui tourne sans Kevin (robots, gardes-fous, agents IA) : `usine/README.md`.
- Tableau de bord : `/admin/usine` (admin seulement) ; ligne de commande : `npm run usine` (`--json` pour un agent).
- Registre unique des postes : `scripts/lib/usine-registre.mjs` (un nouveau robot ou une nouvelle tâche Vercel s'y ajoute,
  le test `tests/lib/usine.test.ts` vérifie la cohérence avec `lib/gardien.ts`, `vercel.json` et `.github/workflows/`).
- Agents IA (`.github/workflows/usine-*.yml`, consignes dans `usine/missions/`) : ils tournent à leurs horaires (variable
  de dépôt GitHub `USINE_IA` = `off` pour les couper), suivent un plan du jour calculé par le dépôt
  (`scripts/usine-plan.mjs`) et ne proposent que des pull requests étiquetées « prête » (aucun fait touché, contrôles et
  build au vert) ou « à relire » ; Kevin fusionne. Jamais rien sur `main` par un agent.
- Laboratoire R&D : `usine/rnd/` (idées de l'agent chercheur, statut à changer par Kevin, prototypes de l'agent prototypeur).
