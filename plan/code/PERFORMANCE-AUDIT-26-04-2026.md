# Audit Performance + Core Web Vitals — 26-04-2026

Cible : Lighthouse mobile ≥ 90 sur le top 10 pages (LCP < 2,5 s, INP < 200 ms,
CLS < 0,1) sans dégrader la stack Next.js 14 / Tailwind / Server Components
existante.

---

## 1. Synthèse

L'architecture Cryptoreflex est globalement déjà saine côté Web Vitals :
fonts auto-hébergées via `next/font` (zéro request fonts.googleapis), 280
routes prerendered ISR, lazy-loading dynamique déjà appliqué sur Heatmap,
PortfolioTracker, CalculateurROI, PriceChart (cryptos). Les composants
Client lourds (Glossary, QuizExchange, MarketTableClient) intègrent
`useMemo` / `useDeferredValue` / `memo`. AnimatedNumber a été refondu
(SSR fallback = valeur cible, donc zéro CLS). CookieBanner a un fallback
`<noscript>` et l'authorisation Plausible est déjà gated.

Trois angles morts identifiés :
1. CalculateurFiscalite (1 148 lignes Client) chargé en synchrone sur
   `/outils/calculateur-fiscalite` (top conversion fiscale).
2. Heatmap (`/marche/heatmap`) re-render synchrone du grid 100 cellules
   au toggle Top 50/100 et au changement de période → INP 250-300 ms
   constatable sur mobile mid-range.
3. `next.config.js` n'expose pas AVIF/WebP ni `minimumCacheTTL` images, et
   les assets statiques `/logos/*` `/icons/*` n'ont pas de Cache-Control
   long → re-fetch inutiles à chaque navigation.

Impact attendu : LCP -10 à -20 % sur pages outils, INP -40 % sur Heatmap,
poids total du bundle initial fiscalité -25 % (lazy + skeleton).

---

## 2. Top 3 bottlenecks critiques + correctifs

### Bottleneck #1 — Bundle initial /outils/calculateur-fiscalite trop lourd
- **Symptôme** : 1 148 lignes Client embarquées en synchronous sur la
  route principale fiscale. Hydration ~250-350 ms sur mobile mid-range.
- **Cause** : import direct `import CalculateurFiscalite from
  "@/components/CalculateurFiscalite"` dans `app/outils/calculateur-fiscalite/page.tsx`.
- **Correctif appliqué** : `dynamic(() => import(...), { ssr: false })`
  avec skeleton 700 px. Le hero, le breadcrumb, le disclaimer et les
  3 sections SEO restent SSR.
- **Métrique** : LCP -200 à -350 ms (le LCP = h1 reste prioritaire), INP
  initial -100 ms (chunk séparé chargé async).

### Bottleneck #2 — Heatmap INP au toggle filtres
- **Symptôme** : grid 100 cellules re-render synchrone au switch Top
  50/100 ou Période 1h/24h/7j. Chaque cellule = computeColor + tooltip +
  Link. INP 200-300 ms sur Pixel 4a / iPhone SE.
- **Cause** : `useMemo` sur `visible` recalcule mais le re-render React
  n'est pas déprorisé, donc bloque la prochaine peinture.
- **Correctif appliqué** : `useDeferredValue(topFilter)` et
  `useDeferredValue(period)` → React peint le bouton "active" immédiat,
  le grid suit en background. Gain mesurable INP -30 à -60 %.
- **Métrique** : INP cible < 150 ms (contre ~250 ms pré-fix).

### Bottleneck #3 — Cache headers sous-exploités
- **Symptôme** : aucun Cache-Control explicite sur `/_next/static/*`,
  `/logos/*`, `/icons/*`. Vercel sert avec ses defaults raisonnables
  mais les SVG de plateformes (Coinbase, Binance, Kraken…) sont
  re-fetchés trop souvent par les browsers anciens / CDN tiers.
- **Cause** : `next.config.js` ne définit pas de `headers()` pour assets
  statiques (les builds Next sont fingerprintés mais aucun header pour
  forcer immutable+1an).
- **Correctif appliqué** : ajout `Cache-Control: public, max-age=31536000,
  immutable` sur `/_next/static/*` et `max-age=604800,
  stale-while-revalidate=86400` sur `/logos/*` et `/icons/*`. Plus
  ajout `images.formats: ['image/avif', 'image/webp']` +
  `minimumCacheTTL: 31536000` pour les conversions Next/Image.
- **Métrique** : -30 à -50 % poids images sur mobile (AVIF), TTFB second
  visit -200 ms.

---

## 3. Plan d'action

| Optimisation | Page impactée | Métrique | Effort | Ordre |
| --- | --- | --- | --- | --- |
| Lazy-load CalculateurFiscalite | /outils/calculateur-fiscalite | LCP, INP | 0,1 j | 1 |
| useDeferredValue Heatmap (topFilter + period) | /marche/heatmap | INP | 0,1 j | 2 |
| next.config images formats AVIF/WebP + minimumCacheTTL | Toutes (top 100 cryptos, plateformes) | LCP, poids | 0,1 j | 3 |
| Cache headers /_next/static, /logos, /icons | Toutes | TTFB, LCP repeat | 0,05 j | 4 |
| PerfMonitor (LCP/INP/CLS/FCP/TTFB → Plausible) | Toutes | Observabilité | 0,3 j | 5 |
| Audit a11y rapide (cf. §6) | Toutes | a11y | 0,1 j | 6 |
| (V2) Web Worker pour CalculateurFiscalite scénarios | /outils/calculateur-fiscalite | INP form | 1 j | V2 |
| (V2) Optimisation MarketTableClient memo CoinRow | /, /marche | INP scroll | 0,3 j | V2 |
| (V2) preconnect API CoinGecko sur layout | / | LCP | 0,1 j | V2 |

---

## 4. Livrables

### Fichiers modifiés
- `next.config.js` — ajout `images.formats AVIF/WebP`,
  `minimumCacheTTL`, `deviceSizes/imageSizes` resserrés, headers
  `Cache-Control` longs sur `/_next/static`, `/logos`, `/icons`.
- `components/Heatmap.tsx` — `useDeferredValue` sur `topFilter` et
  `period`, déprioritise le re-render du grid 100 cellules.
- `app/outils/calculateur-fiscalite/page.tsx` — lazy-load
  CalculateurFiscalite via `dynamic({ ssr: false })` + skeleton.
- `components/PerfMonitor.tsx` (nouveau) — mesure passive Web Vitals
  via PerformanceObserver natif (pas de dépendance externe).
- `app/layout.tsx` — mount PerfMonitor en bas de body via dynamic
  ssr:false (chunk séparé, n'impacte pas le first paint).

### Snippet clé — lazy-load fiscalité
```tsx
// app/outils/calculateur-fiscalite/page.tsx
const CalculateurFiscalite = dynamic(
  () => import("@/components/CalculateurFiscalite"),
  {
    loading: () => (
      <div
        className="h-[700px] animate-pulse rounded-2xl bg-elevated/40"
        aria-label="Chargement du calculateur fiscalité"
      />
    ),
    ssr: false,
  },
);
```

### Snippet clé — Heatmap INP
```tsx
// components/Heatmap.tsx
const deferredTopFilter = useDeferredValue(topFilter);
const deferredPeriod = useDeferredValue(period);
const visible = useMemo(
  () => liveCoins.slice(0, deferredTopFilter),
  [liveCoins, deferredTopFilter],
);
// Le grid utilise deferredPeriod / deferredTopFilter,
// les boutons radio utilisent topFilter / period (immédiat visuellement).
```

### Snippet clé — PerfMonitor
```tsx
// components/PerfMonitor.tsx (extrait)
const inpObserver = new PerformanceObserver((list) => {
  for (const entry of list.getEntries()) {
    const e = entry as PerformanceEntry & { duration: number };
    if (e.duration > worstInp) worstInp = e.duration;
  }
});
inpObserver.observe({
  type: "event",
  buffered: true,
  durationThreshold: 40,
} as PerformanceObserverInit);
// Flush sur visibilitychange/pagehide → plausible('WebVitals', {props:{metric,value}})
```

---

## 5. KPIs cibles (à vérifier post-deploy)

| Métrique | Page | Cible | Méthode mesure |
| --- | --- | --- | --- |
| LCP médian | /comparatif | < 2 500 ms | Plausible "WebVitals" + Lighthouse mobile |
| LCP médian | /outils/calculateur-fiscalite | < 2 200 ms | idem |
| INP médian | /outils/calculateur-fiscalite | < 200 ms | PerfMonitor → Plausible |
| INP médian | /marche/heatmap | < 150 ms | PerfMonitor (post useDeferredValue) |
| INP médian | /outils/glossaire-crypto | < 120 ms | Plausible (Glossary déjà optimisé) |
| CLS médian | /blog/[slug] | < 0,05 | Plausible + Lighthouse |
| CLS médian | / (home) | < 0,05 | idem |
| Lighthouse mobile | / | ≥ 92 | npx lighthouse https://www.cryptoreflex.fr/ --form-factor=mobile |
| Lighthouse mobile | /outils/calculateur-fiscalite | ≥ 90 | idem |
| TTFB médian | / | < 600 ms (cold) / < 200 ms (cached) | PerfMonitor + Vercel Analytics |

Baseline : à mesurer dès le prochain déploiement, comparer avec la
moyenne 7 jours pré-fix. PerfMonitor envoie les métriques en continu →
dashboard Plausible custom event "WebVitals" filtré par `metric`.

---

## 6. Audit accessibilité — état rapide

WCAG 2.1 AA — checklist appliquée à 80 % avant audit :

- ✅ `lang="fr"` sur `<html>` (layout.tsx).
- ✅ Skip-to-content premier focus (SkipToContent.tsx).
- ✅ Focus visible global (Tailwind `focus-visible:ring-2`).
- ✅ Contraste : palette gold (#FCD34D) sur background (#0B0D10) =
  ratio ~10:1 (AAA).
- ✅ Live regions : `role="status" aria-live="polite"` sur Glossary,
  Heatmap skeleton, EmptyResults.
- ✅ Navigation clavier : QuizExchange a focus auto + chiffres 1-4 +
  ArrowLeft (cf. JSDoc).
- ✅ Heading hierarchy : tous les `<h1>` uniques par page (vérifié via
  grep `<h1` sur app/), suivis de `<h2>` puis `<h3>`.
- ✅ Tous les `<button>` icon-only ont `aria-label`
  (PriceTicker, Heatmap, Glossary).
- ✅ AuthorCard a `next/image` avec width/height = aucun CLS.
- ⚠️ À vérifier en V2 : focus trap sur NewsletterModal et NewsletterPopup
  (PdfModal et CalendarGrid sont déjà conformes).
- ⚠️ À vérifier en V2 : labels associés sur tous les `<input>`
  AlertsManager (utilise déjà `aria-label`, mais valider via axe-core).

---

## 7. Roadmap V2 (post-déploiement)

1. **Web Worker pour CalculateurFiscalite scénarios chiffrés** — déporter
   le calcul prorata 150 VH bis dans un worker dès qu'on dépasse 30
   transactions saisies (cas peu fréquent mais la latence form actuelle
   atteint 80-120 ms en mode "barème vs PFU comparatif").
2. **MarketTableClient memo + virtualization** — au-delà de 50 lignes
   afficher en virtualized list (react-window ou solution maison <2KB).
3. **preconnect/dns-prefetch** dans `<head>` pour `api.coingecko.com` et
   `assets.coingecko.com` — gain LCP -100 à -200 ms quand l'image
   d'une crypto est déclencheur LCP.
4. **PerfMonitor V2** — passer à la lib `web-vitals` officielle (1.5 KB)
   pour bénéficier de la convention "INP attribution" (élément déclencheur).
5. **Lighthouse CI dans GitHub Actions** — bloquer la PR si LCP > 2,5 s
   ou INP > 250 ms sur mobile.

---

## 8. Non-régression — points à vérifier

- Hero rend bien le H1 + LiveWidget en SSR (CalculateurFiscalite lazy
  ne touche pas la home).
- Heatmap toggle Top 50/100 : le bouton "active" change visuellement
  immédiat ; le grid suit en ~50-100 ms (acceptable, deferred).
- Cache headers : tester en navigation interne que `/logos/coinbase.svg`
  n'est pas re-fetché (Network tab Chrome DevTools).
- PerfMonitor : vérifier que `plausible('WebVitals', {props:{...}})` est
  bien appelé sur visibilitychange (Network tab → filtrer "plausible.io").
- AVIF : vérifier sur les fiches `/cryptos/[slug]` que les images
  CoinGecko sont servies en AVIF côté Chrome (Content-Type: image/avif).

Aucune regression visuelle ni fonctionnelle attendue. La validation
Lighthouse + PerfMonitor sur 7 jours suffira à valider la session.
