# Sprint 2 — C.18 Comparateur staking dynamique (applied)

Date d'exécution : 2026-04-25 — `npx tsc --noEmit` clean, `npx next build` vert (`/staking` = 15 kB / 111 kB First Load, 464 pages prerendered).

## Fichiers modifiés / créés

- `components/StakingComparator.tsx` — **nouveau** Client Component (`"use client"`).
- `app/staking/page.tsx` — refondu en Server wrapper minimal (hero + metadata + `<StakingComparator pairs={STAKING_PAIRS} />`).

## Filtres & UI

- **Range APY** dual-slider HTML natif `<input type="range">` × 2 superposés, range gold/success en track + thumbs primaires (style local `styled-jsx`, pas de lib). Bornes [0, 20]% step 0.5, contrainte `min ≤ max` appliquée à la saisie.
- **Lock-up** : 4 chips radio (`Tous` / `Liquid only` / `≤ 7j` / `≤ 30j`).
- **Risque max** : chips radio 1–5.
- **Plateformes** : multi-select dérivé dynamiquement de `availableOn` aplati + dédupliqué (inclut `okx` qui n'est pas dans `platforms.json`, fallback `platformLabel()` = uppercase pour les ids ≤ 4 chars).
- **Tri** : `<select>` 5 options (APY desc/asc, lock-up asc, risque asc, nom A→Z), défaut APY desc.
- **Stats récap** : 4 pills (affichées / APY moyen / APY max / nb plateformes) recalculées par `useMemo`.
- **Bouton "Réinitialiser"** + count "X / 20 cryptos affichées" sticky.
- **Empty state** quand `filtered.length === 0` avec CTA reset.
- **Cards** : grid 1 col / 2 cols desktop ; chaque card affiche symbole + nom, badge APY range, `ApyBar` gradient success projetée sur 0–20 %, badge lock-up (success-tinted si liquid), 5 cercles risque colorés (success/warning/danger), badges plateforme (max 4 + "+X"), 2 CTA (`Voir détail` ghost → `/staking/${cryptoId}` + `Staker sur [meilleure]` primary via `<AffiliateLink>` avec `placement="staking-comparator"`).

## Style & accessibilité

- Filtres : `glass` + `backdrop-blur-xl` + `sticky top-0 z-30`.
- Cards : `glass` + `glow-border` + `hover-lift` (cohérent avec `PlatformCard`).
- `role="region" aria-label="Comparateur de staking"` sur le wrapper, `aria-live="polite"` sur les stats + le compteur.
- `<fieldset>/<legend>` pour chaque groupe de filtres. Chips chip = `role="radio"` (mono-select lock-up/risque) ou `aria-pressed` (multi-select plateformes). `<label htmlFor>` explicite sur le `<select>` de tri. Range sliders : `aria-label` dynamique avec valeur courante, navigables clavier nativement (flèches, Home/End, PgUp/PgDn).
- Focus rings primary visible sur tous les contrôles.
- `prefers-reduced-motion` : transitions des thumbs neutralisées localement, `hover-lift` déjà désactivé globalement, pas d'animation framer-motion.

## Hydration

Le composant démarre toujours sur `apyMin=0, apyMax=20, lockFilter=all, maxRisk=5, selectedPlatforms=[], sort=apyDesc` — état neutre identique au SSR. Un `useEffect(() => setHydrated(true))` flag bascule juste l'opacité (95 → 100) pour éviter tout mismatch ; tout le re-filtrage se fait par `useMemo` côté client après mount sur les mêmes valeurs initiales (ce qui produit exactement le même HTML qu'au SSR).

## Choix techniques

- Pas de lib externe : range slider 100 % CSS via `styled-jsx` scoped.
- URL state skipped (V1.5 selon brief), pure local state.
- `getPlatformById` fallback gracieux pour `okx` (CTA dégrade en chip "bientôt" non-cliquable plutôt que crash).
