# Sprint 1 — Dynamique front (applied)

Date d'exécution : 2026-04-25 — `npx tsc --noEmit` clean, `npx next build` vert (463 pages générées, route `/watchlist` = 4.84 kB / 106 kB First Load).

## Fichiers créés

- `lib/watchlist.ts` — utilitaires purs localStorage (clé `cr:watchlist:v1`, max 10), évènement custom `watchlist:changed`, gate SSR systématique sur `typeof window`.
- `components/WatchlistButton.tsx` — Client Component, étoile lucide-react, `aria-pressed` + `aria-label` dynamiques, micro-pulse CSS local désactivée en `prefers-reduced-motion`, feedback inline `role="status" aria-live="polite"` (toast 2.2 s, "Watchlist pleine (max 10)" si limite).
- `components/NewsTicker.tsx` — Client Component défilant (~60 s/cycle), liste dupliquée pour boucle infinie, pause au hover ET au focus-within, fallback grid statique en `prefers-reduced-motion`, formatage relatif FR ("il y a 2h" → "12 mars" au-delà de 7j).
- `components/NewsTickerServer.tsx` — wrapper Server qui `await getAllArticleSummaries()`, slice 5, no-op si vide.
- `components/WatchlistView.tsx` — Client Component de la page /watchlist : table desktop + cards mobile, polling `/api/prices?ids=…` toutes les 2 min (visibility-aware), actions remove/clear avec `confirm()` natif, skeletons aria-hidden.
- `app/watchlist/page.tsx` — Server page minimale (metadata + breadcrumb + `<WatchlistView />`), `robots: { index: false }`.

## Fichiers modifiés

- `app/globals.css` — ajout `@keyframes news-scroll` + `.news-ticker-track` + pause hover/focus-within + neutralisation `prefers-reduced-motion`.
- `app/page.tsx` — `<NewsTickerServer />` injecté entre `<PriceTicker />` et `<Hero />` (stack des bandeaux fins sans toucher au LCP du Hero).
- `components/MarketTableClient.tsx` — colonne `★` non triable la plus à gauche (desktop) + bouton injecté dans la card mobile (le `stopPropagation` interne au composant évite le déclenchement du `<Link>` parent).
- `components/crypto-detail/CryptoHero.tsx` — prop optionnelle `cryptoId`, bouton `size="md"` collé au `<h1>` dans un `flex flex-wrap`.
- `app/cryptos/[slug]/page.tsx` — passe `cryptoId={c.coingeckoId}` (alignement avec `MarketCoin.id`).
- `components/Footer.tsx` — entrée "Ma watchlist" dans la nav du footer.
- `components/Navbar.tsx` — icône Star discrète dans le cluster CTA desktop (évite de surcharger les 7 entrées de NAV) + entrée "Ma watchlist" full row dans l'overlay mobile via `MOBILE_EXTRA`.

## Choix techniques

- **Sync cross-component watchlist** : un évènement `CustomEvent('watchlist:changed', { detail })` dispatché sur `window` à chaque écriture. Chaque `WatchlistButton` et la page `/watchlist` s'abonnent dans un `useEffect` ; on écoute aussi `window.storage` pour la sync cross-onglet gratuite. Pas de Context, pas de store global — la source de vérité reste `localStorage`, le state React n'est qu'une projection.
- **Hydration safe** : tous les composants Client démarrent avec un état neutre (`active: false`, `ids: []`, `hydrated: false`) puis lisent `localStorage` dans un `useEffect`. Zéro `localStorage` au render initial → zéro mismatch SSR/CSR.
- **ID canonique** = CoinGecko id (cf. `MarketCoin.id`, `CoinDetail.id`, `coingeckoId` dans `lib/cryptos.ts`). C'est la seule clé qui permet à la page `/watchlist` de re-fetcher les prix via `/api/prices?ids=…` (route préexistante, aucune modif backend nécessaire).
- **Server/Client split NewsTicker** : le wrapper Server mutualise le cache `unstable_cache` de `getAllArticleSummaries()` (tag `articles`), aucun appel client.
- **`prefers-reduced-motion`** géré dans 3 endroits : keyframes news-scroll neutralisées dans `globals.css`, variante grid statique dans `NewsTicker` (toggle via media query CSS), pulse du `WatchlistButton` neutralisé via styled-jsx local.

## Recommandations pour la suite (alertes prix push web)

1. **Layer service worker** : étendre `public/sw.js` pour exposer `pushManager.subscribe({ applicationServerKey })`. Stocker l'endpoint + la liste de `cryptoId` ciblés côté backend léger (Edge Runtime + KV/Upstash, pas de DB lourde requise).
2. **Worker cron Vercel** (`/api/cron/check-watchlist-alerts` toutes les 5 min) : pour chaque user, comparer le prix CoinGecko courant vs threshold (±5 %) défini dans une nouvelle clé localStorage `cr:watchlist:thresholds:v1`. Push via VAPID si dépassé, debounce 1 h par crypto.
3. **UI threshold** : sur `/watchlist`, ajouter un input "+/- %" inline par row (sliders 1-25 %), avec persistance localStorage. Banner d'opt-in push web granulaire (catégorie cookies "Notifications").
4. **Migration potentielle vers compte** : si la traction est forte, basculer la watchlist vers Supabase (auth magic link) — le format JSON `string[]` actuel se transpose 1:1 dans une table `user_watchlists`.
