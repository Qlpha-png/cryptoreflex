# Sprint 2 — Heatmap top 100 + Halving countdown — Applied

**Date** : 2026-04-25
**Build** : 466 pages OK (vs 463 avant sprint), TypeScript 0 erreur, `next build` vert.

## Chantier A — Heatmap top 100 (`/marche/heatmap`)

### Fichiers créés / modifiés

- `app/marche/heatmap/page.tsx` (NEW) — Server Component, ISR `revalidate = 120`. Récupère le top 100 via `fetchTopMarket(100)`, slice à 100, fallback `EmptyState` si la donnée manque. Metadata complète (title FR optimisée, description, canonical, OG, twitter), Schema.org `WebPage` + `BreadcrumbList` chaînés via `graphSchema`. Section pédagogique « Comment lire cette heatmap ? » (4 sous-sections) sous la grille.
- `components/Heatmap.tsx` (NEW) — Client Component. Grid CSS responsive (3 / 5 / 10 cols selon breakpoint). 6 paliers de couleur emerald/rose selon `change24h` (≥+5/+2/0/-2/-5/<-5), texte adaptatif blanc sur paliers intenses. Filtres : Top 50 / Top 100, période 1 h / 24 h / 7 j (boutons désactivés si données absentes). Tooltip hover/focus avec nom + prix + market cap + variation. Cellule cliquable vers `/cryptos/${slug}` uniquement si `internalSlugs.has(coin.id)`. Accessibilité : `role="grid"` + `aria-label` + `role="gridcell"` + `tabIndex=0` + focus visible + live region `aria-live="polite"` recopiant le tooltip.
- `components/Navbar.tsx` (EDIT) — Item « Marché » repointé de `/#marche` vers `/marche/heatmap` (descriptor mis à jour : « Heatmap top 100 en temps réel »).

## Chantier B — Halving countdown (`/halving-bitcoin`)

### Fichiers créés / modifiés

- `app/halving-bitcoin/page.tsx` (NEW) — Server Component, ISR `revalidate = 3600`. Date cible `NEXT_HALVING_DATE = "2028-04-15T00:00:00Z"` (block 1 050 000). Sections : Hero + Countdown (carte gradient gold), « Qu'est-ce que le halving » (3 paragraphes), tableau historique 5 lignes (2012/2016/2020/2024/2028), « Impact historique sur le prix » (3 paragraphes avec mention stock-to-flow et méfiance), FAQ 5 Q/R (`details`/`summary` natif), cross-link vers `/cryptos/bitcoin` et `/marche/heatmap`, disclaimer AMF amber. JSON-LD : `Article` + `BreadcrumbList` + `FAQPage` chaînés via `graphSchema`.
- `components/HalvingCountdown.tsx` (NEW) — Client Component. Initial state `null` pour éviter mismatch SSR/CSR, démarrage du `setInterval` dans `useEffect`. Détection `prefers-reduced-motion` via `matchMedia` : tick toutes les 60 s en mode réduit, 1 s sinon. 4 cartes mono `tabular-nums` (jours/heures/min/sec). Si date passée : message « Halving terminé — voir le suivant ». Accessibilité : `role="timer"` + `aria-live="polite"` + `aria-atomic="true"` + `aria-label` complet.
- `app/cryptos/[slug]/page.tsx` (EDIT) — Ajout d'une section conditionnelle (`c.id === "bitcoin"`) après le verdict, avec callout amber renvoyant vers `/halving-bitcoin`.

## Sitemap & navigation

- `app/sitemap.ts` (EDIT) — 2 nouvelles entrées dans `staticRoutes` : `/marche/heatmap` (priority 0.7, daily) et `/halving-bitcoin` (priority 0.65, weekly).

## Qualité

- `npx tsc --noEmit` : 0 erreur.
- `npx next build` : `✓ Compiled successfully`, 466 pages générées (vs 463 baseline). Warnings préexistants `[historical-prices] simple/price failed` ignorés comme spécifié.
- Aucune dépendance externe ajoutée (pas de chart.js / recharts / framer-motion).
- Hydration safe : countdown démarre côté Client, pas de divergence Server/Client.
- Accessibilité : focus visible (ring primary) sur tous interactifs, ARIA roles complets, navigation clavier (Tab + Enter) sur la heatmap.

## Bundle impact

- `/marche/heatmap` : 3.62 kB / 122 kB First Load.
- `/halving-bitcoin` : 1.29 kB / 97.3 kB First Load.

## Pistes V2 (non scope)

- Heatmap : treemap-like avec aire proportionnelle à la market cap (lib `d3-treemap` ou layout custom flex-grow).
- Halving : récupération dynamique du blockheight courant via mempool.space pour affiner la date cible.
