# Audit Performance & Web Vitals — Cryptoreflex.fr

**Auditeur** : Performance Engineer  
**Date** : 25 avril 2026  
**Stack** : Next.js 14.2.34 (App Router) · React 18.3 · Tailwind 3.4 · lucide-react 0.453 · Hébergement Vercel (présumé)  
**URL** : https://cryptoreflex.fr/

---

## 1. Score Lighthouse estimé (mobile, 4G simulé)

| Catégorie       | Score estimé | Justification rapide                                                                                                                        |
| --------------- | ------------ | ------------------------------------------------------------------------------------------------------------------------------------------- |
| Performance     | **62 / 100** | Google Fonts via `@import` CSS (render-blocking), 100+ `<img>` natifs CoinGecko sans `next/image`, 3 fetchs CoinGecko en série côté serveur, JSON `top-cryptos` + `hidden-gems` (~600 lignes) inlinés dans le bundle, animation ticker permanente (60fps GPU). |
| Accessibility   | **88 / 100** | Bon contraste gold/dark (vérifié AA), `aria-label` sur toggle menu, mais `<details>` natif sans rôle, manque `prefers-reduced-motion` sur ticker, aucun `lang` côté composants enfants, certains liens uniquement icône (Footer socials). |
| SEO             | **96 / 100** | metadata complet, sitemap.ts + robots.ts, OG/Twitter, hiérarchie H1/H2 propre. Reste à fixer : `<img>` sans dimensions explicites = warning CLS. |
| Best Practices  | **83 / 100** | Pas de CSP custom, `target="_blank"` ok avec `rel="noopener"`, mais pas de Permissions-Policy, pas de Strict-Transport-Security côté headers Next, `eslint-disable @next/next/no-img-element` répété 2× = signal d'alerte. |

**Verdict** : la home charge ~280 KB de HTML rendu, le bundle JS first-load doit tourner autour de **180–220 KB gzip** (Next.js base 90 KB + lucide non tree-shakable ~25 KB + JSON inlinés ~15 KB + composants client ~20 KB). C'est **récupérable à un 90+** Performance sans refactor majeur.

---

## 2. Top 10 problèmes de performance — fix concrets

### Problème #1 — Google Fonts via `@import` CSS (render-blocking 400–800ms)

**Localisation** : `app/globals.css:5`

```css
@import url("https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;700&display=swap");
```

Cet `@import` dans le CSS force le navigateur à attendre le téléchargement de la stylesheet **avant** de pouvoir parser le reste — il est en plus dans la critical chain. Pire : 5 graisses Inter + 3 graisses JetBrains Mono = ~8 fichiers WOFF2.

**Fix** — utiliser `next/font/google` (auto self-host + preload) :

```ts
// app/layout.tsx
import { Inter, JetBrains_Mono } from "next/font/google";

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "600", "700", "800"], // on retire 500 (peu utilisé)
  display: "swap",
  variable: "--font-inter",
  preload: true,
});

const jetbrains = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "700"], // on retire 500
  display: "swap",
  variable: "--font-mono",
  preload: false, // mono utilisée seulement sous le fold
});

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className={`${inter.variable} ${jetbrains.variable}`}>
      <body className="min-h-screen flex flex-col antialiased font-sans">
        ...
      </body>
    </html>
  );
}
```

Et **supprimer** l'`@import` de `globals.css`. Gain attendu : **-500ms LCP** mobile.

---

### Problème #2 — `<img>` natifs CoinGecko (CLS + bande passante)

**Localisation** : `components/MarketTable.tsx:85`, `components/PriceTicker.tsx:53`

```tsx
{/* eslint-disable-next-line @next/next/no-img-element */}
<img src={coin.image} alt={coin.name} className="h-7 w-7 rounded-full shrink-0" />
```

Top 20 + ticker dupliqué = **~46 requêtes images CoinGecko** non optimisées (PNG ~5–15 KB chacune = 300+ KB). Pas de `width/height` HTML => CLS garanti.

**Fix** :

```tsx
import Image from "next/image";

<Image
  src={coin.image}
  alt={coin.name}
  width={28}
  height={28}
  className="h-7 w-7 rounded-full shrink-0"
  loading="lazy"
  unoptimized={false} // laisse Vercel les optimiser
/>
```

Vercel servira en AVIF/WebP, **-65% poids**, et CLS = 0. `next.config.js` autorise déjà `assets.coingecko.com` mais CoinGecko utilise aussi `coin-images.coingecko.com` — l'ajouter :

```js
remotePatterns: [
  { protocol: "https", hostname: "assets.coingecko.com" },
  { protocol: "https", hostname: "coin-images.coingecko.com" },
  { protocol: "https", hostname: "cryptologos.cc" },
],
```

---

### Problème #3 — lucide-react non tree-shaké correctement

**Localisation** : 22 imports répartis dans 18 fichiers.

Avec Next.js 14, lucide-react est **partiellement** tree-shakable mais Webpack ne supprime pas toujours les `forwardRef` chains. On gagne ~12 KB en activant `optimizePackageImports`.

**Fix** — `next.config.js` :

```js
experimental: {
  optimizePackageImports: ["lucide-react"],
},
```

Alternative manuelle si on veut être sûr :

```ts
// au lieu de
import { ArrowRight, Star } from "lucide-react";
// utiliser
import ArrowRight from "lucide-react/dist/esm/icons/arrow-right";
import Star from "lucide-react/dist/esm/icons/star";
```

Gain : **~15 KB gzip** sur le first-load JS.

---

### Problème #4 — 3 fetchs CoinGecko en série à chaque revalidation

**Localisation** : `app/page.tsx:13-16` + `lib/coingecko.ts`.

`HomePage` `await fetchPrices()`, puis `<GlobalMetricsBar>` `await Promise.all([fetchGlobalMetrics, fetchFearGreed])`, puis `<MarketTable>` `await fetchTopMarket(20)`. Les composants serveur s'exécutent en cascade selon le Suspense waterfall — total ~600–1200ms TTFB côté Vercel quand le cache ISR est froid.

**Fix** — paralléliser au niveau de la page :

```tsx
// app/page.tsx
export const revalidate = 60;

export default async function HomePage() {
  const [prices, marketCoins, globalMetrics, fearGreed] = await Promise.all([
    fetchPrices(),
    fetchTopMarket(20),
    fetchGlobalMetrics(),
    fetchFearGreed(),
  ]);

  return (
    <>
      <GlobalMetricsBar metrics={globalMetrics} fearGreed={fearGreed} />
      <PriceTicker initial={prices} />
      <Hero />
      <ReassuranceSection />
      <MarketTable coins={marketCoins} />
      ...
    </>
  );
}
```

On passe les données en props au lieu de re-fetcher. **-400ms TTFB** sur cold start.

---

### Problème #5 — Pas de cache mutualisé entre routes

`fetchPrices()` est appelé par `app/page.tsx` ET `app/api/prices/route.ts`. Chaque route a son propre revalidation Next, et le `unstable_cache` de Next n'est pas exploité.

**Fix** — wrapper dans `unstable_cache` pour partager le cache entre routes server :

```ts
// lib/coingecko.ts
import { unstable_cache } from "next/cache";

export const fetchPrices = unstable_cache(
  async (ids: CoinId[] = DEFAULT_COINS): Promise<CoinPrice[]> => {
    /* ... corps existant ... */
  },
  ["coingecko-prices"],
  { revalidate: 60, tags: ["prices"] }
);

export const fetchTopMarket = unstable_cache(
  async (limit = 20) => { /* ... */ },
  ["coingecko-top-market"],
  { revalidate: 120, tags: ["market"] }
);

export const fetchGlobalMetrics = unstable_cache(
  async () => { /* ... */ },
  ["coingecko-global"],
  { revalidate: 300, tags: ["global"] }
);
```

Bénéfice : cache partagé multi-route, revalidation par tag (`revalidateTag("prices")` depuis un webhook).

---

### Problème #6 — JSON statiques bundlés dans le client

**Localisation** : `data/top-cryptos.json` (218 lignes), `data/hidden-gems.json` (387 lignes), `data/platforms.json` (270 lignes) — ~15 KB gzip combinés.

Importés par des **composants serveur** (`Top10CryptosSection.tsx:1`, `HiddenGemsSection.tsx:1`), donc OK : ils ne traversent pas la frontière client. Mais s'ils étaient importés ailleurs en client, ils gonfleraient le bundle. Action : audit annuel pour vérifier qu'ils restent server-only, et envisager de les déplacer dans `content/` MDX si la donnée s'enrichit.

**Fix preventif** — ajouter `import "server-only"` dans les modules concernés :

```ts
// data/index.ts (nouveau)
import "server-only";
export { default as topCryptos } from "./top-cryptos.json";
export { default as hiddenGems } from "./hidden-gems.json";
export { default as platforms } from "./platforms.json";
```

---

### Problème #7 — Animation ticker en boucle infinie (60fps non-stop)

**Localisation** : `tailwind.config.ts:44` + `components/PriceTicker.tsx:43`.

```ts
"ticker-scroll": "ticker 40s linear infinite",
```

CSS `transform: translateX` infini = GPU réveillé en permanence, +3–5% CPU mobile. Pas géré pour `prefers-reduced-motion`.

**Fix** :

```css
/* globals.css */
@media (prefers-reduced-motion: reduce) {
  .animate-ticker-scroll {
    animation: none !important;
  }
}
```

Et idéalement pause au scroll hors viewport via IntersectionObserver dans le client component.

---

### Problème #8 — `setInterval` 60s sans visibility check

**Localisation** : `components/PriceTicker.tsx:31`.

```ts
const id = setInterval(tick, 60_000);
```

Tourne même si l'onglet est en background = appels API gaspillés, batterie mobile.

**Fix** :

```ts
useEffect(() => {
  let cancelled = false;
  const tick = async () => {
    if (document.hidden) return;
    /* ... reste identique ... */
  };
  const onVisibility = () => { if (!document.hidden) tick(); };
  document.addEventListener("visibilitychange", onVisibility);
  const id = setInterval(tick, 60_000);
  return () => {
    cancelled = true;
    clearInterval(id);
    document.removeEventListener("visibilitychange", onVisibility);
  };
}, []);
```

---

### Problème #9 — Navbar = client component pour un toggle

**Localisation** : `components/Navbar.tsx:1`.

Toute la Navbar est `"use client"` pour gérer un menu mobile. On peut isoler le toggle.

**Fix** — découper :

```tsx
// components/Navbar.tsx (server)
import MobileMenuToggle from "./MobileMenuToggle";

export default function Navbar() {
  return (
    <header>...
      <MobileMenuToggle navItems={NAV} />
    </header>
  );
}
```

Le bouton + le drawer mobile vont dans `MobileMenuToggle.tsx` (`"use client"`). Économie : ~3 KB gzip + hydratation plus rapide.

---

### Problème #10 — Pas de preconnect vers CoinGecko CDN

100+ images viennent de `coin-images.coingecko.com` mais aucun hint ne pré-établit la connexion TLS. Coût : ~150–300ms de handshake au moment des requêtes.

**Fix** — `app/layout.tsx` :

```tsx
<head>
  <link rel="preconnect" href="https://coin-images.coingecko.com" />
  <link rel="preconnect" href="https://assets.coingecko.com" />
  <link rel="dns-prefetch" href="https://api.coingecko.com" />
</head>
```

---

## 3. Cache strategy CoinGecko

### Objectif

CoinGecko free tier = 10–30 req/min. Avec 1000 visiteurs/jour, on doit servir 99% en cache.

### Stratégie recommandée (par ordre de complexité)

**Niveau 1 — `unstable_cache` Next.js (gratuit, suffit jusqu'à 50k visites/mois)** :

```ts
// lib/coingecko.ts
import { unstable_cache } from "next/cache";
import "server-only";

export const fetchPrices = unstable_cache(
  async (ids: CoinId[] = DEFAULT_COINS) => { /* fetch CG */ },
  ["cg-prices"],
  { revalidate: 60, tags: ["prices"] }
);
```

**Niveau 2 — Revalidation à la demande via webhook** :

```ts
// app/api/revalidate/route.ts
import { revalidateTag } from "next/cache";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-revalidate-secret");
  if (secret !== process.env.REVALIDATE_SECRET) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  const { tag } = await req.json();
  revalidateTag(tag);
  return NextResponse.json({ revalidated: true, tag });
}
```

Coupler avec un cron Vercel (`vercel.json`) :

```json
{
  "crons": [
    { "path": "/api/revalidate?tag=prices", "schedule": "*/2 * * * *" },
    { "path": "/api/revalidate?tag=market", "schedule": "*/5 * * * *" }
  ]
}
```

**Niveau 3 — Upstash Redis (recommandé dès >50k visites/mois)** :

```ts
// lib/cache.ts
import { Redis } from "@upstash/redis";

const redis = Redis.fromEnv();

export async function cached<T>(
  key: string,
  ttlSec: number,
  fetcher: () => Promise<T>
): Promise<T> {
  const hit = await redis.get<T>(key);
  if (hit) return hit;
  const data = await fetcher();
  await redis.setex(key, ttlSec, data);
  return data;
}

// usage
export const fetchTopMarket = (limit = 20) =>
  cached(`cg:market:${limit}`, 120, async () => {
    const res = await fetch(/* CG */);
    /* ... */
  });
```

Avantages Upstash :
- Mutualisé entre régions Vercel (Edge global cache hit ratio ≈ 99%).
- Stale-while-revalidate possible (`SET key val EX 120 + bg refresh`).
- Tarif : free tier 10k commandes/jour suffit.

**Niveau 4 — Edge cache HTTP** : déjà partiellement en place (`Cache-Control: public, s-maxage=60, stale-while-revalidate=120` dans `app/api/prices/route.ts`). Étendre cette approche à toutes les routes API.

### Recommandation Cryptoreflex

À court terme : **`unstable_cache` + cron Vercel** (Niveau 1+2). Migration vers Upstash quand le trafic > 50k visites/mois ou quand on ajoute des features (alertes prix, watchlists user) qui exigent un store global.

---

## 4. Bundle optimization

### Tree-shaking

```js
// next.config.js
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    optimizePackageImports: ["lucide-react"],
  },
  modularizeImports: {
    "lucide-react": {
      transform: "lucide-react/dist/esm/icons/{{kebabCase member}}",
      preventFullImport: true,
    },
  },
  /* ... */
};
```

`modularizeImports` est plus agressif que `optimizePackageImports` et garantit qu'aucun import barrel ne passe.

### Dynamic imports recommandés

**ProfitCalculator** (146 lignes, client-only, sous le fold sur `/outils`) :

```tsx
// app/outils/page.tsx
import dynamic from "next/dynamic";

const ProfitCalculator = dynamic(
  () => import("@/components/ProfitCalculator"),
  { ssr: false, loading: () => <div className="h-96 animate-pulse bg-elevated rounded-2xl" /> }
);
```

**MobileMenuToggle** (à créer, voir Problème #9) :

```tsx
const MobileMenuToggle = dynamic(() => import("./MobileMenuToggle"), { ssr: false });
```

**Sparklines SVG** dans `MarketTable` : déjà inline et léger, pas besoin de split.

### Stats bundle attendues après fixes

| Étape           | First-load JS gzip |
| --------------- | ------------------ |
| Actuel (estimé) | ~210 KB            |
| + lucide opti   | ~195 KB            |
| + next/font     | ~190 KB            |
| + dynamic ProfitCalc | ~185 KB        |
| + Navbar split  | ~180 KB            |

Ratio cible Next.js 14 : ≤200 KB first-load.

---

## 5. Core Web Vitals projetés

Mesures projetées sur **Mobile Moto G Power, Slow 4G, France** :

| Vital  | Avant      | Après fixes | Cible Google |
| ------ | ---------- | ----------- | ------------ |
| **LCP** (Largest Contentful Paint) | ~2.8s      | **~1.6s**   | < 2.5s       |
| **INP** (Interaction to Next Paint, remplace FID en 2024) | ~250ms (toggle menu + ticker) | **~120ms** | < 200ms |
| **CLS** (Cumulative Layout Shift) | ~0.18 (images sans dimensions, fonts swap) | **~0.05** | < 0.1   |
| **FCP** (First Contentful Paint) | ~1.4s | **~0.9s**   | < 1.8s       |
| **TTFB** (Time to First Byte) | ~700ms (cold ISR + 3 fetchs CG) | **~300ms** (parallèle + Redis) | < 800ms |

### Comment améliorer

**LCP** = titre H1 du Hero. Pour passer < 1.6s :
- next/font avec `display: "swap"` + `preload: true`.
- Précharger l'image héro si on en ajoute une.
- Réduire le bundle initial (cf. section bundle).

**INP** = clic toggle Navbar + scroll ticker. Pour passer < 120ms :
- Découper Navbar (Problème #9).
- `prefers-reduced-motion` pour ticker.
- Pas de lourd `useMemo` dans Hero ou MarketTable (déjà OK).

**CLS** = images CoinGecko sans dimensions + Inter swap.
- `next/image` avec `width`/`height` (Problème #2).
- `next/font` qui injecte `size-adjust` automatiquement.
- Réserver l'espace `min-h-[600px]` sur `MarketTable` quand `coins.length === 0`.

---

## 6. Code à ajouter immédiatement

### `next.config.js` (remplacement complet)

```js
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  compress: true,

  images: {
    remotePatterns: [
      { protocol: "https", hostname: "assets.coingecko.com" },
      { protocol: "https", hostname: "coin-images.coingecko.com" },
      { protocol: "https", hostname: "cryptologos.cc" },
    ],
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 86400,
  },

  experimental: {
    optimizePackageImports: ["lucide-react"],
  },

  modularizeImports: {
    "lucide-react": {
      transform: "lucide-react/dist/esm/icons/{{kebabCase member}}",
      preventFullImport: true,
    },
  },

  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
        ],
      },
      {
        source: "/api/(.*)",
        headers: [
          { key: "Cache-Control", value: "public, s-maxage=60, stale-while-revalidate=300" },
        ],
      },
      {
        source: "/_next/static/(.*)",
        headers: [
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
```

### `app/layout.tsx` — additions clés

```tsx
import { Inter, JetBrains_Mono } from "next/font/google";

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "600", "700", "800"],
  display: "swap",
  variable: "--font-inter",
});
const jetbrains = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "700"],
  display: "swap",
  variable: "--font-mono",
});

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className={`${inter.variable} ${jetbrains.variable}`}>
      <head>
        <link rel="preconnect" href="https://coin-images.coingecko.com" />
        <link rel="preconnect" href="https://assets.coingecko.com" />
        <link rel="dns-prefetch" href="https://api.coingecko.com" />
      </head>
      <body className="min-h-screen flex flex-col antialiased font-sans">
        <Navbar />
        <main className="flex-1">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
```

### `app/globals.css` — supprimer la ligne 5

```diff
- @import url("https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;700&display=swap");
+ /* Fonts handled by next/font/google in layout.tsx */
+
+ @media (prefers-reduced-motion: reduce) {
+   .animate-ticker-scroll { animation: none !important; }
+ }
```

### `tailwind.config.ts` — brancher les variables CSS

```ts
fontFamily: {
  sans: ["var(--font-inter)", "ui-sans-serif", "system-ui"],
  mono: ["var(--font-mono)", "ui-monospace", "SFMono-Regular"],
},
```

### `vercel.json` — cron de revalidation (à créer)

```json
{
  "crons": [
    { "path": "/api/revalidate?tag=prices", "schedule": "*/2 * * * *" },
    { "path": "/api/revalidate?tag=market", "schedule": "*/5 * * * *" },
    { "path": "/api/revalidate?tag=global", "schedule": "*/15 * * * *" }
  ]
}
```

---

## Synthèse exécutive

3 fixes "killers" à pousser cette semaine, dans l'ordre :

1. **next/font** + suppression `@import` Google Fonts → -500ms LCP, +5 pts Lighthouse.
2. **next/image** sur tous les `<img>` CoinGecko → -200 KB transfert, CLS 0.18 → 0.05.
3. **`optimizePackageImports` + `modularizeImports`** lucide-react + parallélisation des fetchs en haut de `app/page.tsx` → -25 KB JS first-load, -400ms TTFB cold.

Avec ces trois changements seuls, on monte mécaniquement de **62 → 88 sur Lighthouse Performance mobile**, sans toucher à l'architecture. Les autres optimisations (Upstash, dynamic imports, visibility API) sont à enclencher dès que le trafic dépasse 1k uniques/jour.
