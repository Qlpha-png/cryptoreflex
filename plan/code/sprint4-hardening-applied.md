# Sprint 4 — Hardening BACK P1 (applied)

> Date : 2026-04-25
> Périmètre : actions P1 du `audit-back-2026.md` non livrées (P1.2, P1.3, P1.4, P1.6, P1.8, P1.9, P1.10) + bonus robots.
> Build : `npx next build` → 475 pages OK ; `npx tsc --noEmit` → 0 erreur.

---

## 1. Rate limit + validation API (P1.2 + P1.3)

### Helpers factorisés

- **`lib/ip.ts`** (nouveau) — `getClientIp(req: Request)` : `x-forwarded-for[0]` → `x-real-ip` → `"unknown"`.
- **`lib/rate-limit.ts`** (nouveau) — `createRateLimiter({ limit, windowMs })` retourne une fonction `(ip) => { ok, retryAfter? }`. Store isolé par limiter (Map in-memory + GC opportuniste à 5000 entrées). Limites documentées : non-distribué, non-persistant, OK V1.

### Routes mises à jour

| Route | Limit | Validation ajoutée |
|---|---|---|
| `/api/convert` | 30 req/min | déjà OK (whitelist `from`/`to`) |
| `/api/prices` | 60 req/min | **strict** : split `?ids`, dedupe, reject si > 50, drop ids hors whitelist (DEFAULT_COINS ∪ COIN_IDS ∪ getAllCryptos.coingeckoId), 400 si tout invalide |
| `/api/historical` | 30 req/min | déjà OK (whitelist + clamp `days`) |

Toutes ajoutent `runtime = "nodejs"` + `dynamic = "force-dynamic"` + headers `Retry-After` / `X-RateLimit-*` sur 429 (P1.10).

### Routes existantes refactorées

`/api/analyze-whitepaper`, `/api/newsletter/subscribe`, `/api/alerts/create` → toutes utilisent maintenant `createRateLimiter` + `getClientIp` (suppression de ~120 lignes dupliquées). Limites inchangées (5/10/10 req/min). Les routes `/api/alerts/by-email` et `/api/alerts/[id]` n'étaient pas dans le périmètre — laissées à part pour Sprint 5.

### Tests manuels (simulation)

| Cas | Attendu | Comportement code |
|---|---|---|
| `/api/prices?ids=invalid` | 400 | `valid.length === 0` → 400 `{error:"Aucun identifiant valide."}` |
| `/api/prices?ids=bitcoin,ethereum` | 200 | les 2 ids sont dans `DEFAULT_COINS` ⊂ ALLOWED_IDS → fetchPrices |
| `/api/prices?ids=` (51 ids) | 400 | `raw.length > 50` → 400 `{error:"Trop d'identifiants (max 50)."}` |
| 61 req successives même IP | 429 | au 61e appel, `entry.count >= 60` → 429 `Retry-After:<n>` |
| `/api/prices?ids=bitcoin,foobar` | 200 (bitcoin seul) | drop silencieux de `foobar`, fetch sur `[bitcoin]` |

---

## 2. AffiliateLink détection auto (P1.4)

`components/MdxContent.tsx` : nouveau Set `AFFILIATE_HOSTNAMES` calculé une fois au boot depuis `getAllPlatforms().affiliateUrl`. Le `MdxLink` ajoute `sponsored` au `rel` quand le hostname matche. Commentaire JSDoc explicite : ce n'est qu'un filet de sécurité — préférer `<AffiliateLink>` pour les CTAs sponsorisés inline.

---

## 3. Validation env Zod-free (P1.6)

`lib/env.ts` (nouveau) :
- `validateEnv()` retourne `{ ok, errors[], warnings[] }`.
- Couvre `NEXT_PUBLIC_SITE_URL` (required), Beehiiv, KV, Resend, CRON_SECRET, ALERT_DELETE_SECRET, OPENROUTER_API_KEY, plus warnings de paire incomplète.
- Validation manuelle (URL, email, longueur secret), pas de Zod (~12 KB économisés).
- `logEnvValidationOnce()` idempotent via `globalThis` flag → un log par worker process (Next spawne ~1 worker par 30-50 pages).
- Wiré dans `app/layout.tsx` côté serveur uniquement (`if (typeof window === 'undefined')`).

---

## 4. Cleanup canonical frontmatter MDX (P1.8)

4 fichiers nettoyés (suppression de la ligne `canonical:`) :
- `content/articles/alternative-binance-france-post-mica.mdx`
- `content/articles/bitcoin-guide-complet-debutant-2026.mdx`
- `content/articles/formulaire-2086-3916-bis-crypto-2026.mdx`
- `content/articles/meilleure-plateforme-crypto-debutant-france-2026.mdx`

Aucun consommateur n'utilisait ce champ (`lib/mdx.ts` ne le lit pas). Le canonical correct est calculé dans `app/blog/[slug]/page.tsx` via `${BRAND.url}/blog/${slug}` (cf. `alternates.canonical`). Build conserve les 4 articles → MDX reste valide.

---

## 5. Twitter handles (P1.9)

`app/layout.tsx` : `twitter.site` et `twitter.creator` activés sur `"@cryptoreflex"`. Commentaire JSDoc indique que c'est un placeholder à confirmer.

**Action utilisateur post-Sprint** : confirmer/modifier le handle X officiel. Un seul endroit à changer (pas exposé dans `BRAND` actuellement).

---

## 6. Dynamic explicit (P1.10)

Couvert simultanément avec le chantier 1 (P1.2/P1.3). Les 3 routes ont `runtime = "nodejs"` + `dynamic = "force-dynamic"`. Documenté en commentaire d'en-tête de chaque fichier (raison : query string varie, pas de SSG, cache CDN piloté par `Cache-Control` ou `unstable_cache` côté lib).

---

## 7. Robots disallow (bonus)

`app/robots.ts` : `disallow` étendu à `["/api/", "/merci", "/offline", "/embed/", "/portefeuille", "/watchlist"]`. Conserve `allow: "/"` et `sitemap`. Doublon avec les `noindex` côté composant pour les pages perso (defense in depth).

---

## Recommandations Sprint 5

1. **Migration Zod** : si la matrice env grandit (10+ vars supplémentaires), basculer `lib/env.ts` sur `zod` (12 KB). Le code reste isomorphe — juste remplacer les regex manuelles par un schéma.
2. **Origin check newsletter** : ajouter le pattern `isOriginAllowed()` (déjà présent dans `/api/alerts/create`) à `/api/newsletter/subscribe` pour bloquer les inscriptions cross-origin (CSRF léger).
3. **sitemap-index** : 475 pages tient en un seul `sitemap.xml` (limite Google : 50 000 URLs / 50 MB), mais préparer un `sitemap-index.xml` qui chaîne plusieurs sitemaps shardés (par ex. `/sitemap-blog.xml`, `/sitemap-comparatif.xml`, `/sitemap-cryptos.xml`) facilitera le passage à 5 000+ pages programmatiques.
4. **Refactor by-email + [id]** : compléter la migration `createRateLimiter` sur `/api/alerts/by-email` et `/api/alerts/[id]` (laissés à part par scope).
5. **Upstash Redis** : si trafic > 100 req/s ou multi-région, migrer `lib/rate-limit.ts` vers `@upstash/ratelimit` (sliding window, distribué).
6. **scripts/check-env.mjs pre-build** : actuellement on log seulement ; un script dédié exécuté en `prebuild` pourrait `process.exit(1)` sur erreurs critiques (`NEXT_PUBLIC_SITE_URL` manquant en prod).
