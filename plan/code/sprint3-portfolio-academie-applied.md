# Sprint 3 — Portfolio tracker + Académie V1 (applied)

**Date**: 25 avril 2026
**Statut**: tsc 0 erreur, `next build` vert (476 pages générées, +9 vs baseline 467).

## Chantier A — Portfolio tracker

### Fichiers créés
- `lib/portfolio.ts` : storage local (clé `cr:portfolio:v1`), API `getHoldings / addHolding / removeHolding / updateHolding / clearHoldings / totalCost / totalValue`. Validation runtime, gate SSR, event `portfolio:changed`. MAX 30 holdings. UUID via `crypto.randomUUID` + fallback.
- `app/api/portfolio-prices/route.ts` : prix EUR pour IDs CoinGecko arbitraires (jusqu'à 50 IDs / requête, sanitize regex, cache 60 s `unstable_cache` + tag `coingecko:portfolio`).
- `components/PortfolioView.tsx` : Client component. Empty state, toolbar, 4 stats cards (valeur, gain, perf %, positions), allocation pie chart, table desktop + cards mobile, polling 2 min gated visibility, export CSV (Blob local), reset confirmé.
- `components/AddHoldingDialog.tsx` : combobox crypto (recherche scoring sur ALL_CRYPTOS = top10 + hidden gems + 30 additional CoinGecko ids), inputs `quantity` (step 0.00001) + `avgBuyPriceEur` (step 0.01). Focus trap, escape, body scroll lock, aria-modal/labelledby/activedescendant.
- `components/EditHoldingDialog.tsx` : variant édition (préremplissage, pas de changement de crypto par design).
- `components/PortfolioPieChart.tsx` : SVG pur calculé à la main (sin/cos, large-arc-flag), donut hole pour lisibilité, palette gold-cohérente (5 + "Autres"), `role="img"` + `aria-label` détaillé.
- `app/portefeuille/page.tsx` : Server Component, `noindex, follow`, JSON-LD WebPage, hero rassurant RGPD (badges Lock + ShieldCheck), breadcrumb, footer pédagogique.

### Fichiers modifiés
- `components/Footer.tsx` : ajout `Mon portefeuille` + `Académie crypto` dans la nav.
- `components/Navbar.tsx` : ajout item `Académie` dans NAV principal + `Briefcase` icon discret (à côté de la Star Watchlist) sur desktop, item `Mon portefeuille` dans `MOBILE_EXTRA`.
- `app/sitemap.ts` : ajout `/portefeuille` (priority 0.5) et `/academie` (0.8).
- `app/watchlist/page.tsx` : encart cross-sell vers `/portefeuille`.

### Choix techniques notables
- **Pas de `/api/prices` réutilisé** : il renvoyait USD et restreignait à `DEFAULT_COINS`. Le portfolio a besoin d'EUR + IDs libres → route dédiée plus propre que de polluer l'API existante.
- **Pie chart inline SVG** : zéro dépendance, ~150 lignes. Le donut hole améliore la lisibilité quand les couleurs se ressemblent.
- **Hydration-safe** : `setHydrated(true)` + skeleton avant lecture localStorage (même pattern que WatchlistView).
- **Sync cross-component** : event `portfolio:changed` + `storage` event = sync cross-tab gratuite.
- **Export CSV blob local** : pas de roundtrip serveur, RGPD-strict.

## Chantier B — Académie V1

### Fichiers créés
- `data/academie.json` : 15 leçons (5/5/5), pointe vers contenus existants quand possible (blog, outils, glossaire). Quelques targetUrls pointaient vers des slugs glossaire inexistants (`stablecoin`, `altcoin`, `cryptomonnaie`) → remappés vers `mica`, `bitcoin`, `blockchain`.
- `lib/academie.ts` : types `AcademyLesson` + `AcademyLevel`, getters `getAcademyLessons / getLessonsByLevel / getLessonCounts`, `LEVEL_META` + `LEVELS_ORDER`. Validation runtime + tri stable.
- `app/academie/page.tsx` : Server Component, ISR 1j, `revalidate = 86400`. Hero + stats par niveau, 3 sections grid de cards, CTA bas. JSON-LD `Course` + `LearningResource[]` (hasPart) avec workload total ISO 8601.
- `content/articles/securiser-cryptos-wallet-2fa-2026.mdx` (~1100 mots, 5 H2, 2 Callout, FAQ inline 5 items)
- `content/articles/mica-regulation-europe-2026.mdx` (~1200 mots, 4 H2 principaux, table comparative, FAQ 6 items)
- `content/articles/trader-vs-dca-vs-hodl.mdx` (~1100 mots, 4 H2, table charge mentale, FAQ 5 items)

### Fichiers modifiés
- `app/cryptos/[slug]/page.tsx` : encart cross-link "Débutant ? Commence par notre académie" (Bitcoin uniquement, à côté de l'encart Halving existant).

### Choix techniques notables
- **Pas de route `/academie/[slug]` créée** : tous les targetUrl pointent vers contenus existants. Évite la complexité MDX router custom + zéro lien cassé.
- **Articles MDX safe** : pas de `{#anchor}` sur H2 (rehype-slug s'en charge), pas d'imports custom (Callout/FAQ injectés globalement par `MdxContent`), frontmatter standard.
- **Schema.org Course** vs LearningResource au top : meilleur support Google rich results pour Course.

## Vérifications
- `npx tsc --noEmit` → 0 erreur
- `npx next build` → ✓ Compiled successfully, 476 pages générées (vs 467 baseline)
- Routes ajoutées : `/portefeuille` (12 kB), `/academie` (221 B), `/api/portfolio-prices`, 3 nouvelles `/blog/*`
- A11y : focus trap dialogs, aria-modal/labelledby/activedescendant, `prefers-reduced-motion` respecté (héritage des classes globales)
- RGPD : portefeuille `noindex`, page rassure explicitement (2 badges Lock + ShieldCheck) avant la saisie

## Recommandations V2

### Portfolio tracker
- **Auth + sync cloud** : ajouter NextAuth (magic link beehiiv ou Resend) → sync portfolio entre devices via Vercel KV/Postgres. Garder le mode local en fallback (toggle "compte / local").
- **TradingView embed** : encart sparkline 7j par position (widget gratuit TV), améliore la visualisation sans surcharger.
- **Historique transactions** : passer du modèle "1 holding = 1 PRU agrégé" à "N transactions par crypto" → meilleur pour la fiscalité + recalcul PRU correct (FIFO/LIFO).
- **Multi-wallet** : permettre plusieurs portfolios (DCA / spéculation / cold storage) avec switch.
- **Alertes prix** : couplage avec watchlist + cron Vercel pour notifs email (déjà schéma `/alertes` esquissé dans le sitemap).

### Académie
- **Routes natives `/academie/[slug]`** : MDX dédiés avec composant `LessonNav` (précédent/suivant) + breadcrumb niveau. Permet d'enrichir les 15 leçons avec contenus pédagogiques uniques au lieu de redirects.
- **Progress tracker** : checkmarks par leçon en localStorage (pattern watchlist), barre de progression par niveau. Gamification douce.
- **Mini-quiz fin de leçon** : 3 QCM par leçon → score → badge "Niveau X validé". Forte rétention.
- **Module "parcours guidé"** : flow linéaire (next/prev) qui déroule les 15 leçons d'affilée pour les complétistes.
- **Expansion** : passer de 15 à 30-50 leçons (ajout DeFi avancé, NFT, fiscalité avancée, on-chain analysis, security audits…).
