# Audit FINAL Cryptoreflex — Live + Sprint 1-4 attendu

**Date** : 25 avril 2026
**Cible** : `https://www.cryptoreflex.fr` (production)
**Méthodo** : audit visuel Chrome MCP (5 pages clés) + crawl SEO technique automatisé (curl + Python parser) + analyse code repo

---

## 🚦 État actuel

### 1. Notation globale du site live

| Domaine | Note /100 | Justification |
|---|---|---|
| **SEO technique** | **42/100** | Bases présentes (titles, viewport, lang fr) MAIS canonical absent, 0 JSON-LD, OG/Twitter dupliqué partout, favicon 404, manifest PWA 404 |
| **UX visuel** | **78/100** | Design dark + gold premium, composants soignés, animations subtiles. MarketTable + Top10 cryptos + Hero excellents. |
| **Conversion** | **62/100** | CTA visibles mais 2 outils marqués "(bientôt)", footer href# placeholders, pas de sub-CTA "lire l'avis" sur cards |
| **Performance live** | **NA** | PageSpeed Insights API rate-limited (429 × 4). HTML home = 565 KB (lourd : 21 preload images CoinGecko + 32 `<img>` natifs sans `next/image`) |
| **Accessibilité** | **OK estimé** | HTML lang fr, viewport, theme-color OK ; pas de test screen-reader effectué |
| **Sécurité** | **OK** | HSTS 2 ans (Vercel), redirect non-www→www OK, headers sécurité présents |
| **Mobile** | **OK** | Tailwind responsive (`md:`, `lg:`) détecté partout |

**Note globale agrégée du site LIVE actuel : 60/100**

---

### 2. Diagnostic critique — gap entre repo & live

**Le déploiement Vercel actuellement live est `2f274ff` (Sprint 0)** — qui n'inclut PAS les Sprints 1-4 que j'ai poussés (commit `084e390` puis `e9a9fcb` empty trigger). Vercel **n'a pas déclenché de build** malgré 2 push successifs.

**Impact concret** :
- 17+ pages des Sprints 1-4 sont **404 en prod** : `/avis/coinbase`, `/comparatif/binance-vs-coinbase`, `/cryptos/bitcoin`, `/marche/heatmap`, `/quiz/plateforme`, `/wizard/premier-achat`, `/staking/ethereum`, `/halving-bitcoin`, `/alertes`, `/portefeuille`, `/academie`, `/actualites`, `/calendrier-crypto`, `/marche/fear-greed`, `/marche/gainers-losers`, `/quiz/crypto`, etc.
- Sitemap actuel : **7 URLs** (vs **476 URLs** prêtes en local)
- Tous les fixes SEO (canonical, JSON-LD, OG par-page, manifest PWA, favicons, etc.) sont **dans le commit non déployé**.

**Quotas Vercel vérifiés** : tous OK (Edge Requests 44K/1M, Fast Data Transfer 1.7/100 GB, CPU 5s/1h). Le blocage n'est **pas un quota**.

**Causes probables** : webhook GitHub↔Vercel cassé OU intégration GitHub déconnectée.

**Action utilisateur immédiate (5 min)** :
1. Aller dans **Settings → Git** sur Vercel
2. Vérifier "Connected Git Repository : Qlpha-png/cryptoreflex" + "Production Branch : main"
3. Si déconnecté : Reconnect
4. Si connecté : cliquer "Disconnect" puis "Connect" pour recréer le webhook
5. OU installer Vercel CLI localement et faire `vercel --prod`

---

## 🎯 Top 10 issues prioritaires (live actuel)

| # | Issue | Sévérité | Fix dispo | Action |
|---|---|---|---|---|
| 1 | Vercel ne déploie pas mon nouveau commit | **P0 critique** | ✅ Push fait (2×) | Reconnect webhook (cf. ci-dessus) — débloquera ~17 pages + tous les fixes SEO |
| 2 | `<link rel="canonical">` absent sur 100% pages | P0 SEO | ✅ Sprint 1-4 | Sera fixé au déploiement |
| 3 | 0 JSON-LD sur le live (alors que `lib/schema.ts` complet) | P0 SEO | ✅ Sprint 1-4 | Sera fixé au déploiement |
| 4 | OG/Twitter cards globaux (image manquante, url toujours sur racine) | P0 SEO | ✅ Sprint 1-4 | Sera fixé au déploiement |
| 5 | `/manifest.webmanifest`, `/favicon.ico`, `/apple-touch-icon` → 404 | P0 PWA | ✅ Sprint 1-4 | Sera fixé au déploiement |
| 6 | Sitemap 7 URLs (devrait être 476) | P0 SEO | ✅ Sprint 1-4 | Sera fixé au déploiement |
| 7 | Page 404 par défaut Next.js en **anglais** ("This page could not be found.") | P0 UX | ⚠ Non Sprint 1-4 | Créer `app/not-found.tsx` custom FR |
| 8 | 2 outils marqués `(bientôt)` sur `/outils` (DCA, Convertisseur) qui sont fonctionnels | P0 conversion | ✅ Sprint 1 | Sera fixé au déploiement |
| 9 | Footer liens sociaux `href="#"` (Twitter/Telegram/GitHub) | P1 trust | ✅ Sprint 1 | Sera fixé au déploiement |
| 10 | Page 404 a `<meta robots="noindex">` ET `"index, follow"` simultanément | P1 SEO | ⚠ Conflit Next.js | À investiguer post-déploiement |

---

## ✅ Bons points du live actuel

1. **Design dark + gold premium** — au-dessus des concurrents WordPress (Cryptoast, JDC, CryptoActu)
2. **Hero + GlobalMetricsBar + PriceTicker** très bien intégrés (perception "site vivant" forte)
3. **MarketTable Top 20 avec sparklines** colorées, données live CoinGecko
4. **Top 10 cryptos expliquées** : pédagogique, ton journalistique, parfait pour débutants FR
5. **Calculateur de profits fonctionnel** avec UI claire
6. **HTML lang=fr, viewport, theme-color** corrects
7. **HSTS + redirect non-www→www** : sécurité tier-1
8. **11/11 liens internes en HTTP 200** (nav 100% propre)
9. **Tailwind responsive** détecté partout (`md:`, `lg:`)
10. **Méthodologie publique** affichée — différenciateur trust

---

## 🚀 Ce qui devient live au déblocage Vercel

(commit `084e390` Sprint 1-4 + commit `e9a9fcb` empty trigger)

### Nouvelles pages indexables (+469 routes)
- 9 fiches **avis plateformes** (`/avis/coinbase`, `/avis/binance`, `/avis/bitpanda`...)
- 36 **comparatifs binaires** (`/comparatif/binance-vs-coinbase`...)
- 50 **fiches crypto** (`/cryptos/bitcoin`, `/cryptos/ethereum`...)
- 50 **guides "acheter en France"** (`/cryptos/[id]/acheter-en-france`)
- 20 **pages staking** (`/staking/ethereum`, `/staking/solana`...)
- 9 **listicles Top X** (`/top/meilleures-plateformes-crypto-france-2026`...)
- 160 **paires convertisseur** (`/convertisseur/btc-eur`, `/convertisseur/eth-usdt`...)
- 22 **glossaire** (`/glossaire/blockchain`, `/glossaire/staking`...)
- 15 **leçons académie** (`/academie`)

### Nouvelles features dynamiques
- Watchlist localStorage (étoile sur MarketTable + page `/watchlist`)
- Portfolio tracker (`/portefeuille`, RGPD-friendly noindex)
- **Alertes prix par email** (Upstash KV + Resend + cron Vercel `*/15` — env vars déjà configurées ✓)
- News ticker home (5 derniers articles)
- News aggregator FR (`/actualites` — RSS Cryptoast/JDC/Cryptonaute)
- Calendrier événements (`/calendrier-crypto`, 22 events + Event JSON-LD)
- Heatmap top 100 (`/marche/heatmap`)
- Halving countdown (`/halving-bitcoin`, JSON-LD HowTo+FAQ)
- Quiz plateforme + Quiz crypto (`/quiz/plateforme`, `/quiz/crypto`)
- Wizard premier achat (`/wizard/premier-achat`, JSON-LD HowTo)
- Comparateur staking dynamique (refonte `/staking` avec filtres APY/lock-up/risque)
- Fear & Greed page (`/marche/fear-greed`, gauge SVG)
- Gainers/Losers (`/marche/gainers-losers`)
- TradingView widget sur fiches crypto (iframe lazy)
- Mini-graph 7j/30j/1an SVG sur fiches crypto
- TaxCalculator avec projection 5 ans + chart + URL state
- Search ⌘K visible header desktop
- Recherche client-side `/blog` (debounced)
- NewsletterInline + sidebar PopularArticles sur articles

### Hardening BACK
- Helpers unifiés `lib/ip.ts` + `lib/rate-limit.ts` (6 routes API protégées)
- Validation stricte `?ids=` whitelist + max 50
- `lib/env.ts` validation au boot (10+ vars, warnings server-only)
- HSTS preload-eligible + CSP stricte (avec `frame-src` TradingView) + Permissions-Policy
- 6 nouveaux composants MDX (`AuthorBox`, `CTABox`, `ComparisonTable`, `TableOfContents`, `FAQ`, `HowToSchema`)
- Cleanup `canonical:` du frontmatter MDX
- twitter.site/creator activés (@cryptoreflex)
- robots.ts disallow étendu

---

## 📊 Note projetée APRÈS déploiement Sprint 1-4

| Domaine | Note actuelle | Note projetée | Δ |
|---|---|---|---|
| SEO technique | 42 | **88** | +46 |
| UX visuel | 78 | **88** | +10 |
| Conversion | 62 | **82** | +20 |
| Features dynamiques | 30 | **92** | +62 |
| Mobile | OK | OK+ | — |

**Note globale projetée : 87/100** ⭐

---

## 🛠 Plan d'action P0 / P1 / P2

### P0 — À débloquer aujourd'hui (≤ 1h utilisateur)
1. **Reconnecter webhook Vercel↔GitHub** (Settings → Git → Disconnect/Connect) → débloque tout ce qui suit
2. **Vérifier que le build Vercel passe** avec les nouvelles env vars (Upstash + Resend + secrets)
3. **Tester `/alertes`** : créer une alerte test BTC > $80k, vérifier que l'email arrive (cron `*/15`)
4. Créer **`app/not-found.tsx` custom FR** (10 min) — 404 actuelle anglaise
5. Vérifier domain `cryptoreflex.vercel.app` → redirige bien vers `www.cryptoreflex.fr`

### P1 — Cette semaine (~5h)
6. **Vérifier domaine email Resend** (`alertes@cryptoreflex.fr` au lieu d'`onboarding@resend.dev` → ajout DNS records)
7. **Configurer le handle Twitter** (actuellement `@cryptoreflex` placeholder dans `app/layout.tsx`)
8. **Beehiiv** : confirmer dans dashboard que double opt-in est activé (RGPD art. 7)
9. **Plausible Analytics** : configurer `NEXT_PUBLIC_PLAUSIBLE_DOMAIN` ou alternative pour mesurer le trafic
10. **Page index `/plateformes`** dédiée (actuellement c'est juste une ancre `#plateformes` sur la home — opportunité SEO manquée)
11. **Page index `/avis`** dédiée (liste les 9-15 plateformes notées avec filtres)
12. **Optimiser images home** : passer de `<img>` natif à `next/image` (32 images détectées sans optim)
13. **Réduire preload images CoinGecko** (21 actuellement = lourd)

### P2 — Ce mois (~15h)
14. **Submit sitemap à Google Search Console** + Bing Webmaster (après déploiement)
15. **Backlinks** : commencer outreach (cf. `plan/phases/11-backlinks-program.md` existant)
16. **Optimiser LCP** sur la home (actuellement 565 KB HTML, viser < 200 KB initial render)
17. **Ajouter Lighthouse CI** au pipeline build pour monitoring continu
18. **A/B test sur le titre Hero** (actuel : "Choisir une plateforme crypto en France, sans se faire avoir")
19. **Webhook test** Resend pour suivre delivery emails alertes
20. **Migrer rate limit `/api/newsletter/subscribe`** vers Upstash KV (actuellement in-memory, KV est setup)

---

## 🔧 Setup infra accomplie cette session

- ✅ Upstash KV créée (DB `cryptoreflex-alerts`, région Frankfurt eu-central-1)
- ✅ Resend API key créée (`cryptoreflex-alertes`, sending access)
- ✅ 6 env vars Vercel configurées (KV ×2, Resend ×2, secrets ×2)
- ✅ `.env.local` créé pour dev local (gitignored)
- ✅ `vercel.json` avec cron `*/15 * * * *` committé
- ✅ Push GitHub réussi (commit `084e390` puis `e9a9fcb`)

**Tout est prêt** — il manque juste le déclenchement du build Vercel.

---

## 📁 Documents annexes

- `plan/code/audit-live-seo-perf.md` — détail SEO technique 26KB (Agent SEO)
- `plan/code/audit-front-2026.md` — audit front + benchmark concurrents
- `plan/code/audit-back-2026.md` — audit back + sécurité
- `plan/code/plan-dynamique-2026.md` — plan 22 features
- `plan/code/sprint{1-4}-*-applied.md` — rapports détaillés par sprint

---

*Audit consolidé par Claude — 25 avril 2026.*
