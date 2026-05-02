# Plan optimisation perf + scaling — 2026-05-02

> Audit demandé par fondateur : *« expert à la recherche d'optimisation,
> d'idée scaling »*.

---

## Verdict global

**Perf : moyen-bon côté infra, médiocre côté payload HTML.**
TTFB excellent (75-210 ms, X-Vercel-Cache HIT partout, ISR fonctionne) —
Vercel Edge fait son job. Mais **la homepage pèse 1.07 MB HTML uncompressed
/ 121 KB gzipped** : 5-10× au-dessus d'une homepage SaaS médiane.

Causes principales :
- **31 `<img>` natifs avec srcset=0** (logos crypto via `assets.coingecko.com`
  non passés par `next/image`)
- 6 blocs JSON-LD inline
- `__next_f.push` payload énorme (tout le RSC stream)

`/cryptos/bitcoin` = 426 KB. `app/cryptos/[slug]/page.tsx` fait **1049 LOC**
avec 11 dynamic imports — page lourde côté composants client (**131 fichiers
`"use client"` sur 218 = 60%**, signal d'over-clientification).

**Scaling : sain à l'échelle actuelle, fragile à 10×.**
ISR bien réglé (granularité 60s→24h selon page). Mais les builds programmatic
(1870 URLs) ne sont pas blindés : aucun cache fetch partagé entre routes
parallèles (CoinGecko free ≈ 30 req/min), pas de `unstable_cache` visible
côté `lib/`, et le middleware Supabase tourne sur **toutes** les routes
(y compris programmatic SEO read-only).

---

## TOP 10 perf

| # | Optimisation                                                          | Problème (preuve)                                                                              | Impact                                       | Effort | Prio |
| - | --------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- | -------------------------------------------- | ------ | ---- |
| 1 | Migrer logos crypto vers `next/image`                                 | 31 `<img>` natifs sur `/`, 0 srcset → CoinGecko PNG 200KB+ servis en 32×32                      | LCP −300 à −800 ms, payload −400 KB          | M      | P0   |
| 2 | Découper `app/cryptos/[slug]/page.tsx` (1049 LOC)                     | 11 dynamic imports + RSC payload 426 KB sur fiche                                              | LCP −200 ms, JS −80 KB                       | M      | P0   |
| 3 | Réduire JSON-LD inline (6 blocs `/`)                                  | Triplication d'orgs/breadcrumb/itemList                                                        | HTML −15 à −40 KB                            | S      | P1   |
| 4 | Audit `"use client"` (131/218 = 60%)                                  | Sur-clientification : composants pure markup en client                                         | Bundle JS −50 à −150 KB                      | L      | P1   |
| 5 | Lazy-load TradingView, OnChainMetrics, AskAI sous IO                  | Déjà `dynamic` mais montés au scroll, pas via IntersectionObserver                             | TBT −150 ms sur fiche                        | S      | P1   |
| 6 | Préconnect `coin-images.coingecko.com`                                | Aucun preconnect → 2× DNS+TLS handshake observés                                               | LCP −100 à −200 ms mobile 4G                 | S      | **DONE 2026-05-02 commit 69f4b09** |
| 7 | Lever cache CDN sur HTML (`max-age=0, must-revalidate` actuel)        | Vercel cache HIT mais browser revalidate à chaque nav                                          | TTFB répété 0 ms, navigations instantanées   | S      | P1   |
| 8 | Sentry client : tunneler en lazy ou désactiver `widenClientFileUpload` | Sentry SDK = 30-50 KB sur tous les bundles                                                     | JS −40 KB                                    | S      | P2   |
| 9 | `motion` 25 KB pour animations marginales                             | Importé globalement, alternative CSS sur 80% des cas                                           | JS −20 KB                                    | M      | P2   |
| 10 | Compresser/épurer `__next_f.push` RSC stream homepage                 | RSC stream = ~70% du HTML compressé                                                            | TTI −150 ms                                  | M      | P2   |

---

## TOP 5 scaling

| # | Limite actuelle                                                          | Proposition                                                                                  | Impact 10× usage                                | Effort | Prio |
| - | ------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------- | ----------------------------------------------- | ------ | ---- |
| 1 | CoinGecko free ≈ 30 req/min, fan-out ISR sur 100 fiches simultané        | `unstable_cache` avec dédup + tag-based revalidation par coin                                | Évite 429 + −80% appels API en build           | M      | P0   |
| 2 | Middleware Supabase sur toutes les routes (incl. SEO programmatic)       | `matcher` = exclure `/cryptos|blog|comparer|vs|...` (read-only)                              | −60% invocations Edge, −60% coût               | S      | P0   |
| 3 | Build 1870 pages programmatic sur Vercel (cold)                          | Strict `generateStaticParams` (top 30 coins build, reste ISR on-demand)                      | Build time −70%, déploiements <2 min           | M      | P1   |
| 4 | Vercel cron 2 jobs + GitHub Actions 5 workflows mélangés                 | Centraliser sur Vercel cron (Pro tier) ou QStash, instrumenter Sentry                         | Observabilité unifiée, retries auto             | M      | P2   |
| 5 | Supabase queries dispersées, pas de connection pooling visible           | Activer Supavisor transaction mode + `cache: "force-cache"` sur reads pub                    | Tient 10× users sans upgrade DB                 | S      | P1   |

---

## 3 quick wins ce week-end (<1h chacun)

1. **Préconnect CDN images** ✅ DONE (commit 69f4b09 — preconnect `coin-images.coingecko.com`)
2. **Middleware matcher** (30 min) : ajouter à `middleware.ts` `export const config = { matcher: ["/((?!cryptos|blog|comparer|vs|comparatif|glossaire|_next|api/public).*)"] }`. Réduit drastiquement les invocations Edge facturées.
3. **Cache HTML SWR public** (15 min) : dans `next.config.js` headers, ajouter `Cache-Control: public, s-maxage=300, stale-while-revalidate=86400` sur `/((?!api|admin|mon-compte).*)`. Browser et CDN servent SWR au lieu de revalider à chaque hit.

---

## Fichiers clés inspectés

- `Y:/crypto-affiliate-site/next.config.js`
- `Y:/crypto-affiliate-site/package.json`
- `Y:/crypto-affiliate-site/app/page.tsx` (356 LOC)
- `Y:/crypto-affiliate-site/app/cryptos/[slug]/page.tsx` (1049 LOC, 11 dynamic imports)
- `Y:/crypto-affiliate-site/middleware.ts` (102 LOC, pas de matcher restrictif)
- `Y:/crypto-affiliate-site/vercel.json` (2 crons)

Note : la compression Brotli/gzip masque la sur-taille HTML (1.07 MB → 121 KB),
mais le DOM parsing/RSC hydration reste pénalisant sur mobile bas-de-gamme —
d'où la priorité P0 sur les `<img>` natifs et le découpage de la fiche crypto.
