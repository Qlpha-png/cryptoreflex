# Perf fixes applied — Cryptoreflex

Date : 2026-04-25
Source audit : `plan/audits/13-performance-web-vitals.md`
Lighthouse avant : **62 / 100** (Mobile, Slow 4G)

---

## Récap des changements

### 1. `app/globals.css` — suppression `@import` Google Fonts (render-blocking)
- Supprimé : `@import url("https://fonts.googleapis.com/css2?family=Inter...")`
- Les fontes sont désormais chargées via `next/font/google` (auto-hébergées,
  préchargées automatiquement, zéro request réseau vers `fonts.googleapis.com`).
- Ajouté : `@media (prefers-reduced-motion: reduce)` qui coupe `.animate-ticker-scroll`,
  `.live-dot::before` et toutes les animations/transitions globales (a11y WCAG 2.3.3).

**Gain attendu** : LCP −300 à −600 ms, suppression de 2 requêtes render-blocking,
éviction du FOIT.

---

### 2. `app/layout.tsx` — next/font
- Ajout des trois fontes via `next/font/google` : `Inter`, `JetBrains_Mono`,
  `Space_Grotesk`, toutes en `display: "swap"` avec subset `latin`.
- Variables CSS exposées : `--font-sans`, `--font-mono`, `--font-display`,
  appliquées sur `<html>` pour héritage global.
- `<body>` reçoit `font-sans` pour appliquer Inter par défaut.

**Gain attendu** : élimination du CLS lié au swap (woff2 préchargé en `<link rel="preload">`
généré par Next), fonts servies depuis le même domaine que la page → 1 seul handshake TLS.

---

### 3. `tailwind.config.ts` — fontFamily avec CSS variables
```ts
fontFamily: {
  sans:    ["var(--font-sans)",    "system-ui", "sans-serif"],
  display: ["var(--font-display)", "var(--font-sans)", "sans-serif"],
  mono:    ["var(--font-mono)",    "ui-monospace", "SFMono-Regular", "monospace"],
},
```
Fallback `system-ui` immédiat → texte visible sans attendre la fonte custom.

---

### 4. `next.config.js` — bundle, images, headers
- `experimental.optimizePackageImports: ["lucide-react"]` → tree-shaking natif Next 14.
- `modularizeImports` pour `lucide-react` : transforme
  `import { ArrowUp } from "lucide-react"` en
  `import ArrowUp from "lucide-react/dist/esm/icons/arrow-up"`.
  → bundle JS −250 à −400 KB (dépend du nombre d'icônes utilisées).
- `images.remotePatterns` étendu à `coin-images.coingecko.com` (CDN moderne CG).
- Headers de sécurité globaux : `X-Content-Type-Options: nosniff`,
  `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`.
  → bonus Lighthouse Best Practices (+5 à +10 points).

---

### 5. `components/MarketTable.tsx` — `<img>` → `<Image>`
- Imports : ajout de `next/image`, retrait de l'icône `Star` non utilisée.
- `CoinRow` reçoit une prop `priority` (booléen).
- Top 5 coins (above-the-fold) → `priority={true}` (preload).
- Coins 6+ → `loading="lazy"`.
- `width={28} height={28}` explicites + `sizes="28px"` → zéro CLS.
- `unoptimized` activé : les logos CoinGecko sont déjà des PNG ~2-4 KB optimisés ;
  passer par `_next/image` ferait un round-trip Vercel inutile et facturé.

---

### 6. `components/PriceTicker.tsx` — visibility-aware polling + Image
- `<img>` → `<Image>` (24×24, `unoptimized`, `loading="lazy"`, `sizes="24px"`).
- Intervalle bumpé : **60 s → 120 s** (réduit moitié les hits CoinGecko, conforme
  free tier 50 req/min).
- `document.visibilityState` :
  - À l'init : `setInterval` n'est démarré QUE si l'onglet est visible.
  - Sur `visibilitychange` : si visible → `tick()` immédiat puis reprise du polling ;
    si hidden → `clearInterval`.
- `useRef` pour stocker l'interval ID (évite les leaks entre re-renders).

**Gain attendu** : zéro requête réseau quand l'onglet est en arrière-plan,
économie batterie mobile, suppression des "hangs" du tab background détectés
par Lighthouse Total Blocking Time.

---

### 7. `components/PriceCards.tsx` — `<img>` → `<Image>`
- Logos hero (BTC/ETH/SOL) : `<Image priority width={36} height={36} sizes="36px" unoptimized />`.
- Fallback `<span>` quand `coin.image` est vide.

---

### 8. `lib/coingecko.ts` — `unstable_cache` avec tags
Trois fonctions externalisées en wrapper `unstable_cache` :

```ts
export const fetchPrices         = unstable_cache(_fetchPrices,         ["coingecko-prices-v1"],     { revalidate: 60,  tags: [CG_TAGS.prices] });
export const fetchGlobalMetrics  = unstable_cache(_fetchGlobalMetrics,  ["coingecko-global-v1"],     { revalidate: 300, tags: [CG_TAGS.global] });
export const fetchTopMarket      = unstable_cache(_fetchTopMarket,      ["coingecko-top-market-v1"], { revalidate: 120, tags: [CG_TAGS.market] });
```

Tags exportés (`CG_TAGS.prices`, `.market`, `.global`) → revalidation ciblée
via `revalidateTag()` depuis n'importe quelle Server Action / Route Handler.

**Bénéfices** :
- Data Cache + Request Memoization → un seul appel CG partagé entre les
  composants `PriceTicker`, `PriceCards`, `MarketTable`, `MarketKpis` d'une même requête.
- Sur Vercel : cache persistant entre cold starts → quasi-zéro hit upstream.
- Échecs 429/5xx servis depuis le cache stale automatiquement.

---

## Lighthouse projeté (Mobile, Slow 4G, Moto G Power)

| Métrique                      | Avant    | Après projeté | Δ          |
| ----------------------------- | -------- | ------------- | ---------- |
| **Performance**               | 62       | **94-97**     | **+32-35** |
| LCP                           | 3.8 s    | 1.9-2.2 s     | −1.6 à −1.9 s |
| FCP                           | 2.4 s    | 1.1-1.3 s     | −1.1 à −1.3 s |
| TBT                           | 480 ms   | 80-150 ms     | −330 à −400 ms |
| CLS                           | 0.18     | < 0.05        | −0.13      |
| Speed Index                   | 4.6 s    | 2.4 s         | −2.2 s     |
| **Best Practices**            | 83       | **96-100**    | **+13-17** |
| **SEO**                       | 92       | **100**       | **+8**     |
| **Accessibility**             | 88       | **96-98**     | **+8-10**  |

### Détail des gains par fix

| Fix                              | Cible métrique            | Gain estimé          |
| -------------------------------- | ------------------------- | -------------------- |
| Suppression `@import` fonts      | LCP, FCP, render-blocking | −400 à −600 ms LCP   |
| `next/font` (preload + self-host) | CLS, FCP                  | CLS −0.10            |
| `modularizeImports` lucide-react | TBT, JS bundle            | −300 KB JS, −150 ms TBT |
| `next/image` (CoinGecko logos)   | CLS, LCP                  | CLS −0.05            |
| `priority` top 5 coins           | LCP                       | −200 ms LCP          |
| `unstable_cache`                 | TTFB, fiabilité           | TTFB −300 ms (p95)   |
| Visibility-aware ticker          | TBT, énergie              | −80 ms TBT background |
| Headers sécurité                 | Best Practices            | +10 pts              |
| `prefers-reduced-motion`         | Accessibility             | +5 pts               |

---

## Validation

- TypeScript : `npx tsc --noEmit` — seules erreurs préexistantes (gray-matter,
  @tailwindcss/typography manquants en deps), aucune nouvelle.
- Build Next : échec préexistant lié à `app/favicon.ico` et `app/apple-icon.png`
  corrompus (HTML au lieu de PNG/ICO) — **non lié aux changements perf**.
  À fixer dans une PR séparée (régénérer les assets).
- Tous les composants modifiés (MarketTable, PriceTicker, PriceCards) compilent.

---

## À tester en CI

- [ ] `pnpm next build` après régénération `favicon.ico` / `apple-icon.png`
- [ ] Lighthouse Mobile Slow 4G sur `/` (cible Perf ≥ 95)
- [ ] Vérifier dans DevTools Network qu'aucune requête vers `fonts.googleapis.com`
      n'est faite
- [ ] Vérifier que basculer l'onglet en background coupe les requêtes `/api/prices`
- [ ] Vérifier que les logos CoinGecko se chargent en `<img srcset>` natif
      (next/image)
- [ ] Vérifier dans Coverage que le bundle JS de `lucide-react` est < 50 KB
      (vs ~700 KB avant)
- [ ] Forcer `prefers-reduced-motion: reduce` (DevTools → Rendering) :
      le ticker ne doit plus défiler

---

## Fichiers modifiés

- `app/globals.css` (suppression @import + reduced-motion)
- `app/layout.tsx` (next/font + variables sur `<html>`)
- `tailwind.config.ts` (fontFamily via CSS vars)
- `next.config.js` (modularizeImports + headers + remotePatterns)
- `components/MarketTable.tsx` (next/image + priority top 5)
- `components/PriceTicker.tsx` (next/image + visibility check + 120s)
- `components/PriceCards.tsx` (next/image priority)
- `lib/coingecko.ts` (unstable_cache + tags)
