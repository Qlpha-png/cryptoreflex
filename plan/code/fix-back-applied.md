# FIX BACK/API P0 — Cryptoreflex (rapport)

Source : `plan/code/audit-fonctionnel-live-final.md`
Date : 2026-04-25
Build : `npx next build` → exit 0 · `npx tsc --noEmit` → exit 0

---

## Fix 1 — Création `/api/search` (CommandPalette ⌘K)

Fichier : `app/api/search/route.ts` (nouveau).

- Runtime **`nodejs`** (la spec demandait edge mais `getSearchIndex()` traverse `lib/mdx.ts` qui utilise `node:fs.readdir` ; edge plante au premier appel).
- Rate-limit 60 req/min/IP via `createRateLimiter({ key: "search" })`.
- Deux modes :
  - `?index=1` → `{ items, total }` (consommé par `<CommandPalette/>` qui filtre côté client).
  - `?q=...&limit=20` → `{ results, total, query }` (validation : 1..80 chars, limit clampé 1..50).
- Cache CDN : `s-maxage=60, stale-while-revalidate=300` (300/3600 sur le mode index).
- Catch global → 500 + `console.error`.
- `CommandPalette.tsx` appelait déjà `/api/search?index=1` : aucun changement nécessaire.

**Test** : `curl /api/search?q=binance&limit=5` → 200 (Binance + 4 comparatifs). `curl /api/search?index=1` → 200 (full index). `curl /api/search?q=` → 400 `{"error":"Paramètre q requis..."}`.

---

## Fix 2 — Clamp CoinGecko + multi-fetch 90j

Fichiers : `lib/historical-prices.ts`, `app/api/historical/route.ts`, `components/DcaSimulator.tsx`, `components/MiniInvestSimulator.tsx`.

- `_fetchHistoricalPrices(coinId, days)` : si `days <= 365` → ancien chemin `market_chart?days=N` ; sinon **chunks de 90j en `Promise.all`** via `market_chart_range` (timestamps unix from/to). Concaténation triée + dédup par timestamp. Cache `unstable_cache` 1h inchangé. Pour 1825j (5 ans) = 21 chunks parallèles.
- `/api/historical` ajoute `clamped: boolean` au body + headers `X-Days-Requested`, `X-Days-Returned`, `X-Days-Clamped` (heuristique : `points.length < expected * 0.75` → clamped).
- `DcaSimulator` : lit `data.clamped`, désactive les boutons de durée > données reçues, affiche un disclaimer ambré "Données limitées à X mois (CoinGecko free tier)", auto-rétrograde la sélection si l'utilisateur avait choisi 5 ans.
- `MiniInvestSimulator` : note `<p>` ambrée sous le résultat quand clamped.

---

## Fix 3 — Newsletter mocked honest UX

Fichiers : `components/NewsletterPopup.tsx`, `NewsletterModal.tsx`, `NewsletterInline.tsx`, `NewsletterCapture.tsx`.

`lib/newsletter.ts` retournait déjà `{ ok: true, mocked: true }` et `app/api/newsletter/subscribe/route.ts` propageait déjà `mocked` dans la réponse. Les composants client ne le lisaient pas → cookie posé + message "Bienvenue !" trompeur.

Changements appliqués aux 4 composants :
- Lecture de `data.mocked` dans la réponse JSON.
- **Si `mocked` : pas de cookie `cr_newsletter_subscribed`** (l'utilisateur pourra se ré-inscrire quand Beehiiv sera branché) + copy honnête ("Email bien noté — newsletter en cours de configuration, on te recontactera dès que c'est prêt") + `track("Newsletter Signup Mocked", { source })` via `lib/analytics.ts`.
- `NewsletterCapture.tsx` était un mock pur (`setTimeout 800ms`). Branché sur le vrai `POST /api/newsletter/subscribe`.

---

## Fix 4 — Rate-limit distribué KV + namespace

Fichier : `lib/rate-limit.ts` réécrit. 6 routes API mises à jour (`convert`, `prices`, `historical`, `analyze-whitepaper`, `newsletter/subscribe`, `alerts/create`).

- API : `createRateLimiter({ limit, windowMs, key? })` retourne `(ip) => Promise<RateLimitResult>` (**breaking : passe d'sync à async**).
- Backend : si `getKv().mocked` → fallback in-memory (Map par namespace, GC opportuniste à 5000 entrées). Sinon → `kv.get(rl:{ns}:{ip})` puis `kv.set(..., { ex: ttlSec })`. Sur erreur KV : fail-open + `console.warn`.
- Pas de lib externe (pas de `@upstash/redis`) — réutilise le wrapper `lib/kv.ts` existant (fetch only).
- Namespaces appliqués : `convert`, `prices`, `historical`, `analyze-whitepaper`, `newsletter-subscribe`, `alerts-create`, `search`. Évite la pénalisation croisée d'un user honnête.

**Test burst** (build prod, KV mocked → fallback in-memory) :
```
3 warmups → 200/200/200
70 burst → 200=57 / 429=13
Total succès = 60 ✓ (= limit configuré)
HTTP/1.1 429 Too Many Requests + Retry-After header présent
```

---

## Fichiers touchés

Créés :
- `app/api/search/route.ts`

Modifiés :
- `lib/rate-limit.ts` (réécrit, async + KV)
- `lib/historical-prices.ts` (multi-fetch chunked)
- `app/api/convert/route.ts`, `app/api/prices/route.ts`, `app/api/historical/route.ts`, `app/api/analyze-whitepaper/route.ts`, `app/api/newsletter/subscribe/route.ts`, `app/api/alerts/create/route.ts` (await + namespace)
- `components/DcaSimulator.tsx`, `components/MiniInvestSimulator.tsx` (disclaimer clamped)
- `components/NewsletterPopup.tsx`, `NewsletterModal.tsx`, `NewsletterInline.tsx`, `NewsletterCapture.tsx` (mocked-aware)

Tous les diff portent un commentaire `// FIX P0 audit-fonctionnel-live-final #N` pour traçabilité.
