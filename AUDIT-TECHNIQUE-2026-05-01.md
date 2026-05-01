# Audit technique — 2026-05-01

## Résumé exécutif
- Bugs P0 (build cassé, sécu) : **2**
- Anti-patterns P1 : **6**
- Code smells P2 : **9**
- TypeScript strict : **OK** (`tsc --noEmit` exit 0, aucun `// @ts-ignore`)
- Build : **OK** (`next build` exit 0, seuls warnings = `Dynamic server usage` CoinGecko documentés/acceptés)
- Dépendances : **Issues** (`npm audit` → 4 vulnérabilités : 1 high, 3 moderate sur `next` + `uuid`/`svix` via `resend`)

Périmètre couvert : 44 routes API, ~110 composants, ~80 modules `lib/`, middleware, `next.config.js`. Tous les paths sont absolus.

---

## 🔴 P0 — Bugs / sécurité (URGENT)

### P0-1 — `next@14.2.35` : 5 advisories GitHub (1 high, 4 moderate)
**Fichier** : `Y:/crypto-affiliate-site/package.json:24`
**Détail** `npm audit` :
- **HIGH** GHSA-h25m-26qc-wcjf — DoS via deserialization RSC (range `>=13.0.0 <15.0.8`).
- GHSA-9g9p-9gw9-jx7f — DoS via Image Optimizer `remotePatterns` (CVSS 5.9).
- GHSA-ggv3-7p47-pfv8 — HTTP request smuggling dans `rewrites` (le projet en utilise 8 dans `next.config.js:57-149`).
- GHSA-3x4c-7xq6-9pq8 — `next/image` disk cache unbounded (le projet a `minimumCacheTTL: 31_536_000` et 200+ fiches qui passent par le pipeline image → exposition réelle).
- GHSA-q4gf-8mx6-v5v3 — DoS Server Components.

**Fix** : `npm i next@14.2.x` patché (la version 14 reçoit toujours des security backports — vérifier la dernière patch 14.2.x avant de bump). Migration `next@15` = breaking changes côté Route Handlers (`params` devient `Promise<>`), à planifier séparément.

### P0-2 — `resend@6.12.2` traîne `uuid<14` vulnérable
**Fichier** : `Y:/crypto-affiliate-site/package.json:31`
GHSA-w5hq-g745-h8pq (uuid : missing buffer bounds check). Chaîne : `resend → svix → uuid`.
**Fix** : attendre `resend@6.12.x+1` ou downgrader à `resend@6.1.3` (breaking → vérifier changelog). Pas critique côté exploitation (uuid n'est pas appelé sur du buffer user-controlled dans le code projet), mais bloque `npm audit` clean.

---

## 🟠 P1 — Anti-patterns / perf

### P1-1 — Doublons `lib/email*` jamais nettoyés (dead code + risque divergence)
- `lib/email.ts` (1 export `sendEmail`, ancien wrapper) ET `lib/email/client.ts` (nouveau wrapper, refonte 27/04 documentée pour fix double-wrap HTML).
- Même problème côté templates : `lib/email-templates.ts` (legacy, 22 KB) ET `lib/email/templates.ts` (nouveau).
- Routes encore sur l'ancien chemin (à migrer) : `app/api/cron/email-series-fiscalite/route.ts:45`, `app/api/calculateur-pdf-lead/route.ts:35`, `app/api/newsletter/unsubscribe/route.ts:35`, `lib/alerts.ts:28`, `lib/partnership-forms.ts:21`.
- Routes sur le nouveau chemin : `app/api/stripe/webhook/route.ts:33-34`, `app/api/auth/login/route.ts:25`, `app/api/auth/reset-password/route.ts:19`.
- **Risque** : double-wrap HTML déjà identifié comme déclencheur Gmail spam dans le commentaire de `lib/email/client.ts:5-11`. Les 5 routes encore sur `lib/email.ts` peuvent émettre des emails HTML structurellement invalides selon le template appelé.
- **Fix** : migrer les 5 imports vers `@/lib/email/client` + supprimer `lib/email.ts`, `lib/email-templates.ts`, `lib/email-drip-templates.ts` (déjà documenté dans `AUDIT-DOUBLONS.md`).

### P1-2 — Fichiers orphelins (jamais consommés)
Vérifié par `grep -rl <name> --include="*.{ts,tsx}"`, en excluant les self-imports :
- `Y:/crypto-affiliate-site/lib/email-series/premier-achat-series.ts` — uniquement référencé par lui-même (tests + import auto-circulaire). Aucune route/page ne l'importe.
- `Y:/crypto-affiliate-site/lib/newsletter-daily-template.ts` — aucun import ailleurs (les newsletters tournent via `lib/email-renderer.ts` + `lib/email-series/fiscalite-crypto-series.ts`).
- `Y:/crypto-affiliate-site/lib/email-drip-templates.ts` — utilisé seulement par `lib/email-renderer.ts:16` (qui pourrait importer directement `lib/email-series/`). À fusionner ou supprimer.
- **Fix** : supprimer ces 3 fichiers (gain : ~30 KB de code mort à maintenir). Vérifier en CI via `next build` qu'aucune page MDX n'importe ces modules.

### P1-3 — Rate-limit incohérent : 2 routes encore sur le store legacy in-memory
- `Y:/crypto-affiliate-site/app/api/alerts/[id]/route.ts:32-46` et `Y:/crypto-affiliate-site/app/api/alerts/by-email/route.ts:20-34` — chacune réimplémente son propre `RL_STORE = new Map()` au lieu d'utiliser `createRateLimiter()` (helper unifié KV-backed dans `lib/rate-limit.ts`).
- Conséquence : compteurs non distribués (chaque pod Vercel a son propre Map → bypass trivial en saturant plusieurs régions), pas de namespace KV, pas de retryAfter cohérent.
- **Fix** : remplacer par `const limiter = createRateLimiter({ limit: 30, windowMs: 60_000, key: "alerts-by-email" });` puis `await limiter(getClientIp(req))`.

### P1-4 — Open-redirect résiduel à durcir : `next` param normalisé partiellement
**Fichier** : `Y:/crypto-affiliate-site/app/api/auth/callback/route.ts:74-81`
La whitelist refuse `//`, `/\\`, `/%2f`, `/%5c`. Bonne base, mais elle ne couvre pas :
- `/\t` (TAB), `/\r`, `/\n` — Chrome/Firefox les normalisent dans certains chemins, certains anciens UA aussi.
- `/?` ou `/#` suivi d'une URL absolue (rare mais a déjà été exploité historiquement sur Next).
- **Fix** plus robuste :
  ```ts
  const isSafePath =
    rawNext.length < 200 &&
    /^\/[a-zA-Z0-9_\-/?&=.,%]*$/.test(rawNext) &&
    !rawNext.startsWith("//");
  ```
  Whitelist > blacklist pour ce genre de validation.

### P1-5 — `next/image` formats : `Image Optimizer` exposé à GHSA-9g9p
**Fichier** : `Y:/crypto-affiliate-site/next.config.js:24-41`
3 hostnames whitelistés (`assets.coingecko.com`, `coin-images.coingecko.com`, `cryptologos.cc`). L'advisory exploite la quantité de variantes (`deviceSizes` = 8, `imageSizes` = 8 → 64 variantes par image distante × ~150 logos crypto = ~9600 transformations possibles à provoquer). Avec `minimumCacheTTL: 31_536_000`, un attaquant peut remplir le disk cache.
**Fix** : reduire `deviceSizes` à 4 valeurs critiques (`[640, 1080, 1920]`), ajouter un `images.minimumCacheTTL` réduit pour les domaines distants si possible, ou bloquer/rate-limiter `/_next/image` côté middleware (`req.nextUrl.pathname.startsWith("/_next/image")`).

### P1-6 — `app/api/historical/route.ts:316` : `as any` cast type-unsafe sur réponse externe
```ts
return (await res.json()) as any;
```
Cast via `any` au lieu d'une interface `CoinGeckoSimplePriceResponse`. Toute évolution du schéma CoinGecko passera silencieusement. Présent aussi sur `lib/historical-prices.ts:316` (même fichier).
**Fix** : déclarer une interface explicite et retourner `as CoinGeckoSimplePriceResponse`. Idem pour les 3 `(window as any)` de `components/embeds/EmbedSnippet.tsx:44-45` (mineur, devrait être `Window & { plausible?: ... }`).

---

## 🟡 P2 — Code smells

### P2-1 — Fichiers >700 lignes qui méritent refactor
Mesurés via `wc -l` :
- `lib/seo-keyword-targets.ts` — **1453 lignes** (configuration plate ; OK si data, à isoler dans `data/seo/*.json`).
- `components/CalculateurFiscalite.tsx` — **1148 lignes** : extraire les sous-formes (Régime Pro, Régime Particulier, Pertes reportées) en sous-composants ; logique fiscale à déplacer dans `lib/tax-fr.ts` ou `lib/fiscal-tools.ts`.
- `components/QuizExchange.tsx` (946), `components/PlatformQuiz.tsx` (940), `components/FirstPurchaseWizard.tsx` (911), `components/PortfolioView.tsx` (806), `components/CryptoQuiz.tsx` (802), `components/Radar3916Bis.tsx` (795), `components/TaxCalculator.tsx` (753), `components/crypto-detail/ROISimulator.tsx` (745), `components/StakingComparator.tsx` (741) — tous dépassent 700 lignes. Refactor par étape : extraire les schemas Zod-like + helpers + sub-components.

### P2-2 — Composants animés sans `prefers-reduced-motion`
**Recensés** : `components/Hero.tsx`, `components/HeroLiveWidget.tsx`, `components/HeroLiveWidgetMobile.tsx`, `components/MarketTable.tsx`, `components/PriceTicker.tsx`, `components/Heatmap.tsx`. Le grep retourne 10 fichiers respectant `prefers-reduced-motion` mais beaucoup d'animations (`animate-pulse`, `transition-transform`, etc.) sont posées sans wrapping `@media (prefers-reduced-motion: reduce)`.
**Fix** : ajouter dans `app/globals.css` :
```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { animation-duration: 0.01ms !important; transition-duration: 0.01ms !important; animation-iteration-count: 1 !important; }
}
```
(simple à ajouter, gain accessibilité immédiat).

### P2-3 — `<img>` brut au lieu de `next/image` (4 occurrences hors MDX)
- `app/actualites/[slug]/page.tsx:235`
- `app/analyses-techniques/[slug]/page.tsx:174` (couverture article)
- `app/analyses-techniques/[slug]/page.tsx:305` (avatar oracle, 32×32 — acceptable car icône)
- `components/lead-magnet/LeadMagnetCard.tsx:125`
Les 4 sont sur des images Cryptoreflex internes ou contrôlées (pas un risque sécu), mais perdent les optims AVIF/WebP de la pipeline `next/image`.
**Fix** : remplacer par `<Image src={...} width={...} height={...} alt={...} />` quand la dimension est connue. `MdxContent.tsx:234` a un `eslint-disable` justifié (props arbitraires depuis MDX) — OK à garder.

### P2-4 — `process.env.NEXT_PUBLIC_SITE_URL || "https://www.cryptoreflex.fr"` répété 6+ fois
Recensé dans `app/api/auth/callback`, `app/api/auth/login`, `app/api/auth/reset-password`, `app/api/stripe/webhook` (3 occurrences), `app/api/account/delete`. Magic string, risque de drift.
**Fix** : exposer `BRAND.url` (qui existe déjà dans `lib/brand.ts`) et l'utiliser partout. Bonus : valide l'env au boot via `lib/env.ts` qui le check déjà.

### P2-5 — Magic numbers dans la heuristique plan Stripe
**Fichier** : `app/api/stripe/webhook/route.ts:183, 191`
`(session.amount_total ?? 0) >= 897 ? "pro_annual" : "pro_monthly"` — le seuil 897 est documenté en commentaire mais c'est un magic number coupant le comportement. Si le pricing change (ex : passage à 4€/mois), il faudra deviner où le retoucher.
**Fix** : extraire `const ANNUAL_THRESHOLD_CENTS = MONTHLY_CENTS * 3;` en constante en haut du fichier, ou idéalement supprimer ce fallback en s'appuyant uniquement sur `priceIdToPlan()` + `interval` (les 2 autres branches sont déjà robustes).

### P2-6 — `force-dynamic` sur `/api/cron/*` qui pourraient être SSR cachée
Tous les crons sont `dynamic = "force-dynamic"`. C'est OK pour les vrais crons, mais `/api/me` aussi est `force-dynamic` + `Cache-Control: no-store` même quand l'user est anonyme : on pourrait cacher `{ plan: "free", isPro: false }` côté CDN pendant 30s pour les requêtes anonymes (réduit la pression sur Supabase).
**Fix** : dans `app/api/me/route.ts:39-52`, retourner `Cache-Control: public, s-maxage=30, stale-while-revalidate=60` quand `!user` — gain perceptible si trafic anonyme massif.

### P2-7 — `try/catch` qui swallow proprement mais sans contexte structuré
Patterns recensés :
- `app/api/portfolio-prices/route.ts:76-79` — `catch { return []; }` (pas de log ; OK car le fallback est silencieux côté UI, mais utile en debug Vercel).
- `lib/historical-prices.ts:317-320` — log via `console.warn` mais sans `coin`/`vs` dans le message (rend l'investigation pénible).
- `lib/auth-tokens.ts:91-93` — silent catch sur `timingSafeEqual`. Acceptable (length différentes). 
**Fix** : ajouter `console.warn("[portfolio-prices] CoinGecko fetch failed", { ids })` pour tracer.

### P2-8 — `console.log` en production dans handlers chauds
- `app/api/auth/login/route.ts:147` — log l'email + Resend ID à chaque envoi magic link (PII en clair dans Vercel logs).
- `app/api/auth/reset-password/route.ts:88, 127` — log l'email en clair.
- `app/api/account/delete/route.ts:174-177` — déjà bien : utilise `maskEmail()`. Bon pattern à propager.
**Fix** : appliquer `maskEmail()` partout où on log un email côté `auth/*`.

### P2-9 — Chaîne `try { return ...as unknown as T }` éparpillée dans `lib/kv.ts`
**Fichier** : `lib/kv.ts:119, 143, 231`
3 cast `as unknown as T` consécutifs sur le retour Upstash. Pattern OK, mais gagnerait à être centralisé dans un helper `parseKvValue<T>(raw: unknown): T | null` typé.

---

## ✅ Bonnes pratiques respectées

1. **TypeScript strict** : `"strict": true` dans `tsconfig.json:7`, `tsc --noEmit` passe sans aucune erreur. Aucun `// @ts-ignore` ni `@ts-expect-error` détecté. Seulement 16 `any` documentés (la plupart `as unknown as T` sur des JSON externes).
2. **Auth Bearer timing-safe** : `lib/auth.ts:45-64` — `timingSafeEqual` correctement implémenté + refus strict en prod si `CRON_SECRET` absent (audit P1 ancien déjà fixé).
3. **Stripe webhook** : signature HMAC vérifiée via `stripe.webhooks.constructEvent`, idempotency via PK `stripe_webhook_events.event_id`, cookies non touchés (route exclue du middleware via `matcher` dans `middleware.ts:65`). Conforme.
4. **Open-redirect callback auth** : `app/api/auth/callback/route.ts:74-81` whitelist défensive (commentée P0 OPEN REDIRECT FIX 30/04, durci 01/05). Bon pattern à garder.
5. **HMAC unsubscribe tokens** : `lib/auth-tokens.ts` — HMAC SHA-256 + base64url + `timingSafeEqual`, namespace par usage (`"unsubscribe"`). Pattern correct, fallback dev sécurisé.
6. **Rate-limiters factorisés** : 25+ routes utilisent `createRateLimiter()` avec namespace KV dédié. Pattern consistant et distribué (Upstash REST). Reste 2 routes legacy à migrer (P1-3).
7. **Validation body cohérente** : pattern `try { payload = await req.json() } catch { return 400 }` puis cast `as { x?: unknown }` puis `typeof x === "string"`. Présent sur ~15 routes. Pas de Zod (justifié dans `lib/env.ts:6-9` — matrice d'env petite) mais le pattern manuel est rigoureux.
8. **Whitelist stricte sur les paramètres dynamiques** : `/api/whales/[coingeckoId]`, `/api/onchain/[coingeckoId]`, `/api/news/[coingeckoId]`, `/api/ask/[cryptoId]`, `/api/lead-magnet/[id]` ont tous des `Set` whitelist construits au boot du module + 404 strict. Empêche la route d'être détournée en proxy CoinGecko/CryptoPanic générique.
9. **Cache CDN cohérent** : `s-maxage=300/3600` + `stale-while-revalidate` posés à bon escient (`/api/whales` 5min, `/api/onchain` 1h, `/api/news` 15min, `/api/historical` 1h). Pas de cache long sur du dynamique user-specific (`/api/me`).
10. **CSP stricte** : `next.config.js:163-200` — CSP différenciée `cspDefault` vs `cspEmbed` (frame-ancestors `none` vs `*`), Permissions-Policy lockdown, HSTS preload. Très propre.
11. **RGPD** : `/api/account/delete` complet (cascade Supabase + Stripe + cleanup cookies chunked v2), `/api/email/unsubscribe` HMAC + RFC 8058 one-click. Conforme.
12. **Lazy-loading Client Components lourds** : `dynamic(() => import(...), { ssr: false })` utilisé sur `AskAI`, `WhaleWatcher`, `OnChainMetricsLive`, `Heatmap`, `Glossary` (69 KB), `Converter`, `DcaSimulator`, `CommandPalette`, `PerfMonitor`. Bon découpage.
13. **`next/headers` jamais importé dans un Client Component** : 3 imports recensés, tous Server (`app/api/stripe/webhook`, `lib/supabase/server.ts`, `lib/partnership-forms.ts`).
14. **CORS** : `*` uniquement sur les 2 endpoints open data CC-BY 4.0 (`/api/public/glossary`, `/api/public/platforms`) — intentionnel et documenté.

---

## Synthèse des actions recommandées (par ordre)

| Priorité | Action | Effort |
|---------|--------|--------|
| P0 | `npm i next@<dernière 14.2.x>` + redéploiement | 15 min |
| P0 | Surveiller Resend release `>6.12.2` ou downgrade ; à défaut, `npm audit fix` après bump Next | 30 min |
| P1 | Migrer les 5 imports `@/lib/email` → `@/lib/email/client` puis supprimer doublons | 1 h |
| P1 | Supprimer `lib/email-series/premier-achat-series.ts`, `lib/newsletter-daily-template.ts`, `lib/email-drip-templates.ts` | 30 min |
| P1 | Migrer `app/api/alerts/[id]` + `/by-email` vers `createRateLimiter()` | 30 min |
| P1 | Durcir whitelist `next` param dans `/api/auth/callback` (regex unique) | 15 min |
| P1 | Réduire `deviceSizes`/`imageSizes` dans `next.config.js` | 10 min |
| P2 | Ajouter `prefers-reduced-motion` reset global dans `globals.css` | 5 min |
| P2 | Mask emails dans logs `auth/login`, `auth/reset-password` | 10 min |
| P2 | Cacher `/api/me` anon (s-maxage=30) | 10 min |
| P2 | Refactor `CalculateurFiscalite.tsx` (1148 LOC → split) | 4 h |

**Total estimé** : ~3h pour tout P0+P1, +6h pour le P2 le plus impactant.
