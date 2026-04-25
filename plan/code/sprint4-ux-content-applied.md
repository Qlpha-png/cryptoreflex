# Sprint 4 — UX/Content P1 audit-front — Applied Report

> Date : 2026-04-25.
> Périmètre : 6 chantiers P1 livrés sur les 7 listés (P1-3 et P1-4 ont été
> regroupés dans une seule itération comme prévu par le plan).

## Livrables

### Chantier 1 — [P1-2] Mini-graph 7j / 30j / 1an sur fiche `/cryptos/[slug]`

- **Nouveau** : `components/crypto-detail/PriceChart.tsx` (Client).
  - Fetch `/api/historical?coin=...&days=7|30|365` au mount (jamais en SSR).
  - SVG inline 300×120, gradient fill 16% → 0% sous courbe, ligne primary
    (positive) ou rose (négative), cercle hover.
  - Toggle période chips role=radiogroup, aria-checked + couleurs actives.
  - Tooltip pointer + clavier (←/→/Home/End/Esc), live region sr-only.
  - Skeleton pulsé (`motion-reduce:animate-none`), error state textuel,
    empty state dédié.
  - aria-label dynamique : « Graphique prix Bitcoin 7 derniers jours,
    prix actuel 56 720,00 € ».
- Intégré dans `app/cryptos/[slug]/page.tsx` juste après `CryptoStats`,
  avant le `TradingViewWidget` repliable existant.

### Chantier 2 — [P1-3 + P1-4] Filtres + tri + list view sur Top10CryptosSection

- **Nouveau** : `components/Top10CryptosClient.tsx` (Client).
- **Refactor** : `components/Top10CryptosSection.tsx` devient un wrapper Server
  qui passe la liste JSON au composant Client (pattern aligné `MarketTable` →
  `MarketTableClient`).
- Filtres chips role=radiogroup : Tous / Layer 1 / Smart Contract / DeFi /
  Stablecoins / Memecoins / Privacy / Other. Mapping `category` JSON →
  bucket fonctionnel via `categoryBucket()`. Compte par filtre, chips
  désactivés si bucket vide.
- Tri `<select>` natif : Rang (défaut) / Risque croissant / Beginner-friendly
  décroissant / Année création desc.
- Toggle Grid / List (icônes `Grid2X2` / `List`), `aria-pressed`. List view =
  ligne dense cliquable vers `/cryptos/[id]`.
- Hydration-safe : valeurs initiales identiques SSR/Client (filtre Tous, grid,
  tri rang) → pas de flash post-hydratation.
- ScrollReveal délais à 0 avant mount (évite cascade 80ms qui peut paraître
  laggy à la première peinture).

### Chantier 3 — [P1-7] Search Cmd+K visible dans header desktop

- `components/Navbar.tsx` : ajout d'une icône `Search` à gauche du cluster
  Watchlist / Portefeuille (md+ uniquement, mobile = couvert par sticky bar).
  - `aria-label="Ouvrir la recherche (Ctrl+K)"`, tooltip natif `title`.
  - Au clic, dispatch `window.dispatchEvent(new CustomEvent("cmdk:open"))` —
    pattern event-based pour éviter d'importer `CommandPalette` (et donc
    `lib/search` → `lib/mdx`, server-only) dans le bundle Navbar.
- `components/CommandPalette.tsx` : ajout des listeners `cmdk:open` /
  `cmdk:close` (en plus du singleton `setCommandPaletteOpen` pour les
  composants qui peuvent l'importer).

### Chantier 4 — [P1-8] Recherche client-side sur `/blog`

- **Nouveau** : `components/blog/BlogIndexClient.tsx` (Client).
- **Refactor** : `app/blog/page.tsx` devient Server wrapper minimal qui passe
  `articles` + `categories` (cache 1h via `unstable_cache` dans `lib/mdx.ts`)
  au composant Client.
- Filtrage : titre + description, accent-insensitive via
  `normalize("NFD").replace(/[combining-diacritics]/g, "")`. Multi-tokens AND.
- Debounce 250ms (setTimeout simple, no-lib).
- Empty state : « Aucun article trouvé pour "X" » + bouton « Réinitialiser ».
- Pagination recalculée sur la liste filtrée (boutons clientside, plus de
  query params `?page=`).
- Filtres catégorie convertis en boutons role=radiogroup.
- A11y : input `aria-label`, count `aria-live="polite"`, focus-visible ring.

### Chantier 5 — [P1-9] Newsletter inline + sidebar "Articles populaires"

- **Nouveau** : `components/blog/PopularArticles.tsx` (Server).
  - Lit `getAllArticleSummaries()` (déjà trié date desc) et exclut le slug
    courant. V1 = proxy par récence (5 plus récents).
  - Cards compactes titre + reading time + date, sticky `top-24` sur lg+.
- **Refactor** : `app/blog/[slug]/page.tsx` :
  - Layout 2-col grid (article 2/3 + sidebar 1/3) sur lg+, single col mobile.
  - Helper `splitContentForInlineCta(source, 0.6)` : coupe le markdown brut sur
    une frontière `\n\n` proche de 60% (jamais avant 30%, jamais après 90%) —
    rend le 1er bloc puis `<NewsletterInline>` puis le 2nd bloc. Fallback
    "tout-en-un" si l'article est trop court (<600 chars) ou structuré.
  - `NewsletterInline` réutilisé avec `source="blog-cta"` et copy contextuel
    (« Tu lis ? Garde une longueur d'avance »).

### Chantier 6 — [P1-10] Mini-calculateur 1-input dans `ToolsTeaser`

- **Nouveau** : `components/MiniInvestSimulator.tsx` (Client).
  - 3 inputs : montant € (number), crypto (BTC/ETH/SOL select), période (1/3/5
    ans select).
  - Au change : debounce 350ms → fetch `/api/historical?coin=...&days=365|1095|1825`
    + calcul valeur actuelle d'un single-shot effectué en début de période.
  - Fallback gracieux : si `points.length < 2` ou erreur, message neutre +
    lien `/outils/simulateur-dca`.
  - CTA bas du widget : « Simulateur DCA complet → ».
  - Live region `aria-live="polite"` pour le résultat dynamique.
- **Refactor** : `components/ToolsTeaser.tsx` (reste Server) embarque
  `<MiniInvestSimulator />` au-dessus du CTA primary, dans la colonne
  gauche du grid lg:2-col existant. Les 3 cards outils restent à droite.

## Vérifications

- `npx tsc --noEmit` → **0 erreur** (TS_OK).
- `npx next build` → 476/476 pages statiques générées sans erreur de
  prerender. Les warnings résiduels (CoinGecko 429 sur `/convertisseur/[pair]`
  et l'ENOENT au rename de `500.html`) sont pré-existants à ce sprint
  (rate-limit API + quirk Windows Next 14) et n'affectent pas l'output.
- Hydration-safe : tous les Client components initialisent leur state avec des
  valeurs déterministes (no `Date.now`, no `Math.random`, no `localStorage` au
  render). Le re-render Client après mount ne change rien d'observable tant
  que l'utilisateur n'interagit pas.
- A11y : focus-visible ring partout, role=radio sur les chips, aria-pressed
  sur les toggles, sr-only descriptions clavier sur PriceChart.
- `prefers-reduced-motion` : Skeletons portent `motion-reduce:animate-none`.
- Aucune lib externe ajoutée (pas de Recharts, Fuse.js, etc.) — bundle
  stable.

## Fichiers touchés

Créés :
- `components/crypto-detail/PriceChart.tsx`
- `components/Top10CryptosClient.tsx`
- `components/blog/BlogIndexClient.tsx`
- `components/blog/PopularArticles.tsx`
- `components/MiniInvestSimulator.tsx`

Modifiés :
- `app/cryptos/[slug]/page.tsx` (intégration PriceChart)
- `app/blog/page.tsx` (Server wrapper minimal)
- `app/blog/[slug]/page.tsx` (layout 2-col + split MDX + NewsletterInline)
- `components/Top10CryptosSection.tsx` (Server wrapper minimal)
- `components/ToolsTeaser.tsx` (intégration MiniInvestSimulator)
- `components/Navbar.tsx` (icône Search desktop)
- `components/CommandPalette.tsx` (listener `cmdk:open` / `cmdk:close`)
