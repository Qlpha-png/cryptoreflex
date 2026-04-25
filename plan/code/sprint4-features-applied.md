# Sprint 4 — Features dynamiques restantes (C.8, C.11, C.14, C.17, C.21)

**Date :** 2026-04-25
**Stack :** Next.js 14 App Router · TypeScript · Tailwind
**Build :** vert (476 pages générées) · `tsc --noEmit` 0 erreur

---

## Fichiers créés

- `app/marche/fear-greed/page.tsx` — page dédiée Fear & Greed (ISR 1h)
- `app/marche/gainers-losers/page.tsx` — top gainers / losers 24h (ISR 5min)
- `app/quiz/crypto/page.tsx` — page Quiz crypto
- `components/FearGreedGauge.tsx` — jauge SVG demi-cercle (Server Component)
- `components/CryptoQuiz.tsx` — quiz interactif client (6 questions)
- `components/GainerLoserList.tsx` — liste compacte gainers/losers (Server)
- `components/crypto-detail/TradingViewWidget.tsx` — iframe TradingView lazy

## Fichiers modifiés

- `components/TaxCalculator.tsx` — projection 5 ans + chart SVG + URL state (`?invested=&perf=`) + toggle simple/projection
- `components/GlobalMetricsBar.tsx` — Fear & Greed désormais lien vers `/marche/fear-greed`
- `components/Footer.tsx` — ajout lien "Quiz : quelle crypto pour toi ?"
- `app/cryptos/[slug]/page.tsx` — ajout `<TradingViewWidget />` après `PriceChart` (replié par défaut)
- `app/outils/calculateur-fiscalite/page.tsx` — Suspense boundary autour de `<TaxCalculator />` (requis par `useSearchParams`)
- `app/sitemap.ts` — +3 URLs (fear-greed, gainers-losers, quiz/crypto)
- `next.config.js` — CSP : ajout `frame-src https://s.tradingview.com https://www.tradingview.com`

---

## Décision CSP TradingView

`frame-ancestors 'none'` interdit qu'on **soit embarqués** ailleurs ; cela n'empêche PAS d'embarquer **nous-mêmes** un iframe tiers. La directive correcte pour autoriser TradingView est `frame-src`. J'ai donc :

- **Conservé** `frame-ancestors 'none'` (anti-clickjacking, pas d'impact négatif).
- **Ajouté** `frame-src https://s.tradingview.com https://www.tradingview.com`.
- Header `X-Frame-Options: DENY` conservé (idem, sens inverse).
- Aucun script TradingView injecté : pure iframe lazy + `sandbox="allow-scripts allow-same-origin allow-popups"`.
- Fallback gracieux : message + lien externe TradingView visible derrière l'iframe (l'iframe le masque quand elle charge ; reste visible si bloquée par adblock).
- Build vert, pas de régression CSP sur les autres pages.

---

## Matrice scoring `CryptoQuiz`

**Base** : Top10 = 50, Hidden-gem = 30.

| Q | Réponse              | Bonus principaux                                                                 |
|---|----------------------|-----------------------------------------------------------------------------------|
| 1 | Risque très faible   | Top10 risque ≤ Faible +25 ; **exclut** hidden-gems & memecoins                    |
| 1 | Modéré               | Top10 risque ≤ Modéré +15 ; memecoins -8                                          |
| 1 | Élevé                | +5 base, hidden-gems +10                                                          |
| 1 | Très élevé           | hidden-gems +20 ; memecoins +10 ; BTC/ETH -5                                      |
| 2 | < 1 an               | memecoins +10                                                                     |
| 2 | 1-3 ans              | Top10 +8                                                                          |
| 2 | 3-10 ans             | BTC/ETH/SOL +12                                                                   |
| 2 | 10+ ans              | BTC +20 ; ETH +12 ; hidden-gem -5                                                 |
| 3 | Réserve de valeur    | **BTC +30** ; stablecoin chains +5                                                |
| 3 | Smart contracts/DeFi | **ETH +30** ; SOL +25 ; AVAX +18 ; ADA +15 ; LINK +15                             |
| 3 | Paiements rapides    | **XRP +30** ; TRON +20 ; DOGE +10                                                 |
| 3 | Memecoins            | **DOGE +30** ; -5 sur tout non-meme                                               |
| 4 | Pas du tout          | BTC +15 ; ETH +10 ; **exclut** hidden-gems                                        |
| 4 | Bases                | Top10 +8 ; hidden-gem -5                                                          |
| 4 | Bien                 | hidden-gem +5                                                                     |
| 4 | Expert               | hidden-gem +12                                                                    |
| 5 | < 100 €              | memecoins +5 ; hidden-gem -3                                                      |
| 5 | 100-1000 €           | Top10 +5                                                                          |
| 5 | 1000-10000 €         | BTC/ETH +5                                                                        |
| 5 | 10000+ €             | BTC +15 ; ETH +10 ; memecoins/gems -10                                            |
| 6 | Diversifier          | hidden-gem +5                                                                     |
| 6 | Concentrer           | BTC/ETH +10                                                                       |
| 6 | Pas d'avis           | neutre                                                                            |

**Pénalité résiduelle** : BNB/TRON/LINK -3 si Q3 ≠ smart_contracts/payments (sinon ils gagnent par défaut faute de signal fort).

**Résultat** : top 1 (highlight) + 2 backups, ou écran "aucune crypto ne matche" si exclusions trop strictes.

---

## Notes techniques

- **Fear & Greed gauge** : SVG pur Server Component, dégradé linéaire rouge→orange→jaune→vert, aiguille colorée par zone, 5 ticks (0/25/50/75/100). Aucune anim → conforme `prefers-reduced-motion` par construction.
- **TaxCalculator projection** : itératif sur 5 ans, PFU 30 % appliqué chaque année (hypothèse pessimiste explicitée), mini-chart SVG 2 barres/année (brut + net), tableau 6 lignes (Aujourd'hui + N+1..5). URL state via `useSearchParams` + `router.replace` (pas push, préserve le back/forward).
- **TradingView** : iframe `loading="lazy"` + `sandbox`, repliée par défaut (`defaultOpen={false}`) pour ne pas péser sur le 1er affichage côté `PriceChart` natif déjà présent.
- **Gainers/Losers** : tri serveur sur `priceChange24h`, top 10 par sens, lien vers fiche interne uniquement si slug présent dans `getCryptoSlugs()`.
- **A11y** : tous les composants suivent le pattern existant (focus auto, `aria-current`, `aria-checked`, raccourcis 1-4, `role="progressbar"`, live regions).

## Vérifications

- `npx tsc --noEmit` → 0 erreur.
- `npx next build` → 476 pages OK, nouvelles routes statiques (`/marche/fear-greed` 96.3 kB FLJS, `/marche/gainers-losers` 101 kB, `/quiz/crypto` 103 kB).
- Sitemap mis à jour (+3 URLs).
- CSP modifié sans régression : seul `frame-src` ajouté, pas de relâchement.
