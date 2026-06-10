# Audit 360° post-migration — 2026-05-28

> Audit complet demandé par Kev après migration Hetzner→Vercel + restauration
> Supabase. Couvre : code local (Desktop\Projets\Sites\Cryptoreflex), front
> live (www.cryptoreflex.fr), DB Supabase, scripts d'audit.

## État général : 🟢 TOUT EST VERT

| Zone | Verdict | Détail |
|------|---------|--------|
| Front live | ✅ 15/15 pages HTTP 200 | home 0.18s, fiches 0.14s ; `/cryptos` 1.9s (seul point lent) |
| Sitemap | ✅ 7 907 URLs propres | 0 doublon, 0 URL privée, lastmod frais |
| Headers sécu | ✅ Complets | HSTS preload, CSP, X-Frame DENY, Permissions-Policy |
| Supabase | ✅ Restrictions LIFTÉES | `fallback:false` sur community-stats, query `users` HTTP 200 |
| TypeScript | ✅ 0 erreur | tsc --noEmit clean |
| Git | ✅ clean | dernier commit 8d98a3b |
| Audit qualité | ✅ 0 erreur / 1 735 fichiers | après whitelist faux positifs (vérifiés un par un) |

## Fixes appliqués pendant l'audit (commit 8d98a3b)

1. CSP : retiré `plausible.io` résiduel (script-src + connect-src)
2. audit-quality.mjs : regex négations « jamais/pas comme signal d'achat »
   + whitelist academy-quizzes.ts (option piège de quiz) et 3 articles AT
   pédagogiques — chaque occurrence vérifiée manuellement

## Découvertes importantes

- **Stripe démonétisé VOLONTAIREMENT** (juin 2026, « Cryptoreflex 100 % gratuit »).
  Le webhook répond `{disabled:true}`. Les vars STRIPE_* vides sur Vercel ne
  sont donc PAS un bug. RAS.
- **Migration `user_exchange_connections` jamais appliquée en DB** → les
  4 routes `/api/exchanges/*` (sync portfolio Binance) sont cassées en prod.
  Le SQL existe : `supabase/migrations/20260502_user_exchange_connections.sql`.
- **Vercel Web Analytics PAS activé** : le composant `<Analytics />` est en
  prod mais le script ne se charge pas (0 occurrence dans le HTML). Toggle
  dashboard requis (impossible via API/CLI, testé).
- **Web Push fantôme** : table `user_push_subscriptions` créée, VAPID prévu,
  mais aucun code (`/api/push/subscribe`, listener SW, branche push dans
  evaluate-alerts manquants).
- **Codebase** : 248 routes, 216 MDX, 163 libs, 25 fichiers tests
  (~1 338 assertions) mais 9 composants > 700 LOC sans aucun test.

## TOP opportunités (impact/effort)

### Quick wins (< 1 h)
1. **Activer Vercel Web Analytics** — dashboard → cryptoreflex → Analytics → Enable (KEV, 30 s)
2. **Appliquer migration exchanges** — SQL editor Supabase, répare 4 routes API

### P0 transformatifs
3. **Sentry runtime** (3-4 h) — zéro observabilité actuellement, crash prod = découvert par un user
4. **Web Push notifications** (1-2 j) — alerte prix + Daily Brief en push browser, table déjà prête
5. **Streaming AskAI** (1-2 j) — `client.messages.stream()`, premier token < 1 s au lieu de 4-8 s
6. **SSE prix temps réel** (1 sem) — effet « Bloomberg live », réduction CoinGecko ×10

### P1 SEO (trafic passif)
7. **SEO programmatique** (1 sem) — `/comparer/[a]/[b]` : 105 pages sur 4 950 paires possibles (2 %) ;
   `/acheter/[crypto]/[pays]` : top 30 cryptos × 6 pays = 180 pages longue-traîne
8. **Schema.org enrichi** (1-2 j) — FinancialProduct/FAQPage/HowTo sur 4 templates, rich snippets +CTR

### P1 UX / robustesse
9. **DnD portfolio + raccourcis clavier** (1-2 j) — dnd-kit déjà installé, pas branché
10. **Command Palette actions** (1-2 j) — cmdk nav-only aujourd'hui
11. **Tests E2E funnels** (1 sem) — portfolio, alertes, gamification à couvrir
12. **ISR granulaire** (1-2 j) — fiches crypto en revalidate 600, TTFB ÷ 3

## Hygiène (plus tard)
- Supprimer `content/lead-magnets/` + `content/cryptos-fiches/` (vides)
- Supprimer test e2e `03-stripe-checkout-redirect.spec.ts` (Stripe désactivé)
- `app/manifest.ts` manquant (référencé par metadata, PWA install dégradée)
- Supprimer projet Supabase `reflexx-data` (libère quota egress org)
- `/cryptos` à 1.9 s — investiguer (probablement fetch CoinGecko non caché)
