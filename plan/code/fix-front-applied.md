# FIX FRONT P0/P1 — Cryptoreflex (25 avril 2026)

Application des 8 fixes identifiés par `audit-front-live-final.md`.

## Critères qualité — résultat

- TypeScript : `npx tsc --noEmit` → 0 erreur
- Build : `npx next build` → Compiled successfully (480 routes générées)
- Pas de régression visuelle (aucun changement de design)

## Fixes appliqués

### Fix 1 — Double H1 sur les articles MDX
Suppression du `# Titre` en tête des **10 fichiers MDX** (`content/articles/*.mdx`).
Le H1 est désormais rendu uniquement par `app/blog/[slug]/page.tsx` (line 210). Vérification rebuild HTML : `bitcoin-guide-…html` n'a plus qu'un seul `<h1>`.

### Fix 2 — Tableaux comparatif `overflow-x-auto`
`app/comparatif/[slug]/page.tsx` line 344 : wrapper de table passé de `overflow-hidden` à `overflow-x-auto` + `<table>` reçoit `min-w-[640px]` pour forcer le scroll horizontal mobile. Vérifié : `binance-vs-coinbase.html` contient `overflow-x-auto rounded-xl border border-border"><table`.

### Fix 3 — Heatmap retry
- Nouvelle Server Action `app/marche/heatmap/actions.ts` (`revalidateHeatmap()`).
- Nouveau Client Component `app/marche/heatmap/HeatmapEmpty.tsx` avec bouton "Réessayer" + spinner via `useTransition`.
- `components/Heatmap.tsx` enrichi : si `liveCoins` vide après mount → skeleton (30 cellules animate-pulse) + auto-retry 3× espacé **5/15/30 s** (`window.location.reload()` après succès `/api/prices`).

### Fix 4 — `<noscript>` fallback
`app/layout.tsx` : bandeau `<noscript>` ajouté en haut de `<body>` avec lien d'aide `enable-javascript.com/fr/` + `mailto:contact@cryptoreflex.fr`. Cookie banner déjà géré (mounted state, pas de CLS visible — sheet bottom flottant).

### Fix 5 — MobileStickyCTA sur pages transactionnelles
Nouveau composant `components/MobileStickyCTA.tsx` (mono-CTA, mobile only, scroll>350 px, hidden au footer, tracking analytics). Intégré sur :
- `/avis/[slug]` → CTA = plateforme reviewée
- `/comparatif/[slug]` → CTA = winner par score global
- `/staking/[slug]` → CTA = best plateforme MiCA
- `/cryptos/[slug]` → CTA = 1re plateforme connue dans `whereToBuy`
- `/cryptos/[slug]/acheter-en-france` → CTA = `best` déjà calculé

### Fix 6 — `priority` excessif sur la home
`components/MarketTableClient.tsx` : `priority={idx<3}` (mobile) et `priority={idx<5}` (desktop) → `priority={false}`. `components/PriceCards.tsx` : `priority` → `loading="lazy"`. La home n'a plus aucun Image avec `priority` (Hero n'utilise pas Image).

### Fix 7 — Aria-label "Fil d'Ariane"
12 occurrences `aria-label="Fil d'ariane"` (minuscule) corrigées en `Fil d'Ariane` (majuscule, nom propre) dans `app/avis/page.tsx`, `app/comparatif/page.tsx`, `app/cryptos/[slug]/acheter-en-france/page.tsx`, `app/wizard/premier-achat/page.tsx`, `app/top/[slug]/page.tsx`, `app/quiz/{plateforme,crypto,page}.tsx`, `app/staking/[slug]/page.tsx`, `app/marche/page.tsx`, `components/comparison/ComparisonHero.tsx`.

### Fix 8 — Logo aria-label dédupliqué
`components/Logo.tsx` : SVGs en mode `decorative` (`aria-hidden`+`focusable=false`) quand wrappés. Mode `asLink={false}` → `<span aria-hidden>` (plus de label parasite). `components/Navbar.tsx` : Logo passé en `asLink={false}` (le parent `<Link>` portait déjà l'aria-label, double-link éliminé). `components/Footer.tsx` : Logo aussi en `asLink={false}` (lien Accueil déjà dans le footer-nav). HTML rebuilt vérifié : `a-propos.html` n'a plus qu'un seul `aria-label="Cryptoreflex — retour à l'accueil"` exposé.
