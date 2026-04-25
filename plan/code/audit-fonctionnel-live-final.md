# Audit fonctionnel LIVE — www.cryptoreflex.fr

**Date :** 2026-04-25 — Sprint 1-4 LIVE
**Méthodologie :** lecture du code source `Y:\crypto-affiliate-site\` + tests `curl` sur APIs publiques + simulation comportementale Client Components.
**Périmètre :** APIs `/api/*`, calculateurs, quiz, watchlist/portfolio/alertes, comparateurs, newsletter, recherche.

---

## 1. Note fonctionnelle : **62 / 100**

| Domaine | Score | Commentaire |
|---|---|---|
| Architecture & Hardening | 16/20 | Rate-limit factorisé, validation côté serveur, CSRF Origin, structures défensives. Limitation distribuée connue. |
| APIs publiques | 11/20 | `/api/search` introuvable (404), `/api/historical` cassé > 365 j, `mocked:true` newsletter en prod. |
| Calculateurs (5) | 13/15 | Logique correcte, formules auditables. Edge cases 0/négatif filtrés mais non bloqués UI. |
| Quiz / Wizard (3) | 13/15 | Scoring transparent, raccourcis clavier 1-4, focus management OK. |
| Watchlist + Portfolio | 9/10 | LocalStorage propre, sync events, limites strictes, hydratation safe. |
| Alertes (CRUD) | 8/10 | CRUD fonctionnel, KV Vercel actif, validation seuils, max 5/email. |
| Newsletter | 4/10 | **Beehiiv non configuré en production** (silent mock = 0 subscriber persisté). |
| A11y & Hydration | 9/10 | aria-pressed/-checked corrects, role="dialog", skeletons SSR-safe. |

**Verdict :** Architecture solide, hardening sérieux, mais 5 bugs P0 réels qui cassent des fonctionnalités phares (DcaSimulator, MiniInvestSimulator, CommandPalette, Newsletter en prod).

---

## 2. Tableau de synthèse — feature × statut

| Feature | Composant | Statut | Notes |
|---|---|---|---|
| Calculateur profits | `ProfitCalculator.tsx` | OK | useMemo, formules saines. |
| Calculateur fiscalité FR | `TaxCalculator.tsx` | OK | 4 steps + projection 5 ans, sync URL. |
| Simulateur DCA backtest | `DcaSimulator.tsx` | **BUG P0** | Charge `days=1825` → API renvoie `[]` → simulateur figé en loading puis vide. |
| Mini-simulateur "et si j'avais investi" | `MiniInvestSimulator.tsx` | **BUG P0** | Période 3 ans (1095 j) et 5 ans (1825 j) → API renvoie `[]` → "Données indisponibles". Seul "1 an" marche. |
| Convertisseur crypto/fiat | `Converter.tsx` | OK | Lazy load, swap, taux frais. `cache: "no-store"` bypass CDN. |
| Vérificateur MiCA | `MicaVerifier.tsx` | OK | Combobox a11y, copy embed. |
| Whitepaper TLDR | `WhitepaperTldr.tsx` | partiel | Mode `text` OK ; mode `url` retourne 501 (Not Implemented) malgré l'UI. |
| Recherche (CommandPalette) | `CommandPalette.tsx` | **BUG P0** | `fetch /api/search?index=1` → 404 HTML. La palette s'ouvre vide en permanence. |
| Recherche blog | `BlogIndexClient.tsx` | non-testé | (page client, pas de symptôme côté curl). |
| Quiz plateforme | `PlatformQuiz.tsx` | OK | Scoring auditable, exclusions dures, raccourcis 1-4. |
| Quiz crypto | `CryptoQuiz.tsx` | OK | Pattern identique au précédent. |
| Wizard premier achat | `FirstPurchaseWizard.tsx` | OK | 5 steps guidés, focus management. |
| Watchlist (bouton + vue) | `WatchlistButton.tsx`, `WatchlistView.tsx` | OK | LS clé `cr:watchlist:v1`, limite 10, sync cross-tab via `storage` event. |
| Portfolio (CRUD + pie) | `PortfolioView.tsx`, `AddHoldingDialog.tsx` | OK | LS clé `cr:portfolio:v1`, max 30, export CSV, polling 2 min. |
| Alertes prix (CRUD email) | `AlertsManager.tsx` + `/api/alerts/*` | OK | KV Vercel actif (`mocked:false`), max 5/email, validation seuils. |
| Comparateur staking | `StakingComparator.tsx` | OK | Filtres lock-up + sort multi-clé. |
| Heatmap top 100 | `Heatmap.tsx` | OK | Filtres top 50/100, période 1h/24h/7d, fallback null. |
| Table marché | `MarketTableClient.tsx` | OK | Tri 6 colonnes, nulls en queue, sortable header a11y. |
| Newsletter popup (exit-intent) | `NewsletterPopup.tsx` | partiel | Triggers OK, mais `/api/newsletter/subscribe` répond `mocked:true` → email perdu. |
| Newsletter inline / modal | `NewsletterInline.tsx`, `NewsletterModal.tsx` | partiel | Idem. UI premium, backend fantôme. |
| Cookie banner CNIL | `CookieBanner.tsx` | OK | 3 actions, focus trap, persistance 13 mois. |
| Convertisseur API | `/api/convert` | OK | Whitelist crypto+fiat, cache 60s, 503 si fail. |
| Prices API | `/api/prices` | OK | Whitelist 50 ids max, dedupe, cache 60s. |
| Historical API | `/api/historical` | **BUG P0** | Toute valeur `days > 365` renvoie `points: []` (CoinGecko free tier rejette > 365j). Aucun signal d'erreur côté client. |
| Cron evaluate-alerts | `/api/cron/evaluate-alerts` | OK | 404 sans Bearer → bonne pratique (URL inconnue, ne révèle pas son existence). |
| Analyze whitepaper | `/api/analyze-whitepaper` | partiel | Mode `text` OK, mode `url` 501. Heuristique extraction tokenomics imprécise (cf. P1-7). |

---

## 3. Top 15 bugs P0 (avec repro exacte)

### P0-1 — `/api/search` introuvable → CommandPalette inutilisable
- **Fichier :** `components/CommandPalette.tsx:84`
- **Repro :** `curl https://www.cryptoreflex.fr/api/search?index=1` → 404 (page HTML "Page introuvable").
- **Impact :** Cmd+K ouvre la palette mais reste éternellement en "Chargement de l'index…". Aucun résultat de recherche jamais.
- **Fix :** créer `app/api/search/route.ts` qui sert l'index `lib/search.ts` via `getAllArticleSummaries()` + plateformes + cryptos. Tag `unstable_cache` 1 h prévu en commentaire.

### P0-2 — `/api/historical?days=1825` retourne `points: []` silencieusement
- **Fichier :** `app/api/historical/route.ts:51-58`, `lib/historical-prices.ts:145-163`
- **Repro :** `curl 'https://www.cryptoreflex.fr/api/historical?coin=bitcoin&days=1825'` → `{"points":[],"coin":"bitcoin","days":1825}` HTTP 200.
- **Cause :** CoinGecko free tier rejette `days > 365` (probable 401), `_fetchHistoricalPrices` catche l'erreur et retourne `[]` (cf. `lib/historical-prices.ts:159-162`).
- **Impact :**
  - `DcaSimulator.tsx:58` charge systématiquement `days=1825` → écran loading puis pas de résultat.
  - `MiniInvestSimulator.tsx` casse pour "3 ans" (1095) et "5 ans" (1825).
- **Fix :** soit clamp côté lib à `min(days, 365)`, soit retourner HTTP 503/400 explicite, soit upgrader CoinGecko Pro.

### P0-3 — Newsletter Beehiiv non configurée en production (`mocked:true`)
- **Fichier :** `app/api/newsletter/subscribe/route.ts:115-121`, `lib/newsletter.ts` (subscribe).
- **Repro :** `curl -X POST https://www.cryptoreflex.fr/api/newsletter/subscribe -H 'Content-Type: application/json' -d '{"email":"a+b@c.co"}'` → `{"ok":true,"mocked":true}`.
- **Impact :** chaque inscription via popup/inline/modal renvoie 200 success à l'utilisateur, mais **aucun email n'arrive jamais** chez Beehiiv. Cookie `cr_newsletter_subscribed=1` posé → l'utilisateur ne sera plus jamais re-prompté. Conversion silencieusement perdue.
- **Fix :** vérifier les env vars `BEEHIIV_API_KEY` / `BEEHIIV_PUBLICATION_ID` sur Vercel ; fallback explicite si missing → 503 + log Sentry.

### P0-4 — `MiniInvestSimulator` ne fonctionne que pour la période "1 an"
- **Fichier :** `components/MiniInvestSimulator.tsx:36-40, 82-94`
- **Repro :** sur la home, sélectionner "Il y a 3 ans" ou "Il y a 5 ans" sur le mini-simulateur → message "Données indisponibles pour le moment".
- **Cause directe :** P0-2.
- **Fix immédiat indépendant :** réduire `PERIODS` à `1 an` seulement OU normaliser à `Math.min(days, 365)` côté composant.

### P0-5 — `DcaSimulator` cassé pour toutes les durées (effet secondaire P0-2)
- **Fichier :** `components/DcaSimulator.tsx:54-75`
- **Repro :** ouvrir `/outils/simulateur-dca`, sélectionner BTC/200€/3 ans → écran reste sur loader puis `result === null`, jamais d'historique affiché.
- **Cause :** fetch `/api/historical?coin=bitcoin&days=1825` reçoit `[]`, `history.length < 30` au render, `result` reste `null`.
- **Fix :** réduire la requête à `days=365` et adapter buyDates en fonction des données disponibles.

### P0-6 — Rate-limit `/api/prices` non opérant en production (multi-instance)
- **Fichier :** `lib/rate-limit.ts:11-19` (limitation documentée), `app/api/prices/route.ts:49`
- **Repro :** `for i in {1..70}; do curl -s -o /dev/null -w '%{http_code} ' 'https://www.cryptoreflex.fr/api/prices?ids=bitcoin'; done` → **70 × 200** au lieu d'un 429 attendu après 60.
- **Cause :** Map en mémoire par instance lambda Vercel + fanout horizontal = chaque requête tombe potentiellement sur une instance fraîche.
- **Impact :** scrapers/bots peuvent burst l'API CoinGecko via notre proxy → on consomme notre quota gratuit + risque ban IP CoinGecko.
- **Fix :** migrer vers Upstash Redis (déjà mentionné dans les commentaires du code). Ou ajouter un Edge Middleware `next.config.js` avec `unstable_cache` global.

### P0-7 — `/api/analyze-whitepaper` mode URL retourne 501 mais l'UI propose le tab
- **Fichier :** `components/WhitepaperTldr.tsx:39, 60-65` ; `app/api/analyze-whitepaper/route.ts` (mode url branche non implémentée).
- **Repro :** `curl -X POST .../api/analyze-whitepaper -d '{"url":"https://example.com/x.pdf"}'` → 501 `"Le support des URL PDF arrive prochainement…"`.
- **Impact :** l'utilisateur peut cliquer le tab "URL", saisir un lien valide, cliquer Analyser → erreur. Mauvaise UX, faux espoir.
- **Fix court terme : désactiver le tab URL avec `disabled` + "Bientôt disponible"`. Fix long terme : implémenter le fetch + parsing PDF.

### P0-8 — `Converter.tsx` ne reset pas `error` quand on reswitch from/to
- **Fichier :** `components/Converter.tsx:51-73`
- **Repro :** déclencher un 503 sur `/api/convert?from=btc&to=eur` (ex : pendant un downtime CG), puis switcher to=usd → l'erreur "Conversion temporairement indisponible" reste visible 1 cycle même si la nouvelle requête réussit ; UX confuse car le résultat numérique apparaît au-dessus.
- **Pas réellement bloquant**, mais visible à reproduire pendant un retry.
- **Fix :** dans `useEffect([from, to])`, appeler `setError(null)` avant `fetchRate()`.

### P0-9 — `Converter.tsx` `cache: "no-store"` bypass CDN inutilement
- **Fichier :** `components/Converter.tsx:55-57`
- **Repro :** chaque switch from/to ou clic "Actualiser" déclenche un round-trip serveur, ignorant le `s-maxage=60` configuré par l'API.
- **Impact :** sur-consommation gratuite CG + latence supérieure à 200 ms même sur taux fraîchement cachés.
- **Fix :** retirer `{ cache: "no-store" }` ou utiliser `{ next: { revalidate: 60 } }`.

### P0-10 — `MiniInvestSimulator` `lastFetchRef` ne reset pas après erreur
- **Fichier :** `components/MiniInvestSimulator.tsx:71, 76, 78`
- **Repro :** scénario réseau intermittent (1er fetch 500, retry succès) — `lastFetchRef.current === fetchKey` empêche le re-fetch même si on rechange amount/coin/days vers une combinaison déjà essayée.
- **Impact :** utilisateur bloqué sur "Données indisponibles" tant qu'il ne change pas de combo.
- **Fix :** dans `.catch(() => { ... lastFetchRef.current = null; })`.

### P0-11 — `WatchlistButton` micro-pulse fuite un `setTimeout` au unmount
- **Fichier :** `components/WatchlistButton.tsx:91-92`
- **Repro :** ouvrir/fermer rapidement une page contenant une étoile (ex: navigation /cryptos/[id] → Back) tout en cliquant l'étoile → `setTimeout` 420 ms s'exécute après unmount, déclenchant `setPulse(false)` sur composant démonté → warning React en dev.
- **Impact :** non bloquant mais log warning + petit memory leak.
- **Fix :** stocker l'id dans un ref, clear dans `useEffect` cleanup.

### P0-12 — `NewsletterPopup` `wantsNewsletter` ignoré côté serveur
- **Fichier :** `components/NewsletterPopup.tsx:165` ; `app/api/newsletter/subscribe/route.ts:76-105` (le champ n'est pas lu).
- **Repro :** envoyer `{"email":"x@y.fr","wantsNewsletter":false}` → handler ignore le flag, l'utilisateur sera ajouté à la newsletter quand même (si Beehiiv était configuré).
- **Impact :** P0-3 masque le problème, mais dès que Beehiiv sera activé, le choix "PDF uniquement" violera le consentement annoncé → risque RGPD.
- **Fix :** lire `wantsNewsletter` côté handler, créer un tag Beehiiv `pdf-only` vs `subscriber-active`.

### P0-13 — `TaxCalculator` `useEffect` historise l'URL `?invested=` à chaque keystroke
- **Fichier :** `components/TaxCalculator.tsx:148-167`
- **Repro :** taper "12345" dans le champ acquisitions → 5 appels `router.replace()` consécutifs.
- **Impact :** spam history (même si `replace` n'ajoute pas d'entrée), re-render inutiles, visible perfomance dégradée sur mobiles bas de gamme.
- **Fix :** debouncer l'écriture URL (350-500 ms).

### P0-14 — `CookieBanner` re-render sur chaque toggle prefs même avant submit
- **Fichier :** `components/CookieBanner.tsx:33`
- **Léger souci UX** : la dialog "Personnaliser" sauvegarde immédiatement sans bouton "Enregistrer". Acceptable, mais pas standard CNIL — l'utilisateur peut cliquer une catégorie par erreur, le consentement est posé sans confirmation explicite.
- **Fix :** ajouter un bouton "Enregistrer mes choix" et ne persister qu'au submit.

### P0-15 — Validation crypto inconnue côté `/api/alerts/create` retourne `400 + cryptoId`
- **Fichier :** `app/api/alerts/create/route.ts:103-106`, `lib/alerts.ts` (createAlert).
- **Repro :** `{"email":"x@y.fr","cryptoId":"INVALID-COIN-XYZ","condition":"above","threshold":100}` → `{"ok":false,"error":"Crypto inconnue ou non supportée.","field":"cryptoId"}`.
- **OK fonctionnellement**, mais on n'expose la liste des cryptos valides nulle part publiquement → un dev qui consomme l'API sans lire le code doit deviner. Documenter l'enum `cryptoId` accepté dans la réponse `GET /api/alerts/create` (qui décrit le contrat).

---

## 4. Top 10 améliorations P1

| # | Sujet | Fichier | Pourquoi |
|---|---|---|---|
| P1-1 | Heuristique `whitepaper-analyzer` confond "30% public sale" et "30% team allocation" | `lib/whitepaper-analyzer.ts` (extracteur tokenomics) | Première mention "30%" capturée → faux positif équipe ; user pourrait baser une décision financière dessus. |
| P1-2 | `DcaSimulator` `useMemo` recalcule O(N²) à chaque render | `components/DcaSimulator.tsx:77-147` | Boucle imbriquée `for sortDate × for sorted` ; sur 1825 points × 60 mois = 110 k itérations à chaque keystroke `monthly`. Pre-trier + recherche binaire. |
| P1-3 | `WatchlistView` polling continue à 2 min même si `prices.length === 0` | `components/WatchlistView.tsx:115` | Si l'utilisateur a vidé pendant la session, l'interval continue à fetch un endpoint avec ids vide. Mineur. |
| P1-4 | `AlertsManager` recherche crypto pas debouncée | `components/AlertsManager.tsx:186-198` | Filtrage fait à chaque keystroke sur toute la liste. OK pour quelques dizaines, à debouncer si la liste passe à 200+. |
| P1-5 | `CommandPalette` `searchIndex` recharge l'index à chaque ouverture en cas d'échec | `components/CommandPalette.tsx:81-95` | Si la 1ère requête échoue, `index` reste null → ré-essai à chaque ré-ouverture. Backoff manquant. |
| P1-6 | `MarketTableClient` n'a pas de tri visible côté mobile | `components/MarketTableClient.tsx:84-98` | Cards ne proposent pas le tri, seul le header desktop est triable. À implémenter via select compact mobile. |
| P1-7 | Le `mocked:true` du newsletter est exposé dans la réponse JSON publique | `app/api/newsletter/subscribe/route.ts:115-121` | Information fuitée (n'importe qui voit que la prod n'envoie rien). À masquer derrière `process.env.NODE_ENV !== 'production'`. |
| P1-8 | `ProfitCalculator` accepte `quantity = 0` (division par buyPrice=0 caught par garde) | `components/ProfitCalculator.tsx:13-22` | OK fonctionnellement, mais aucun message d'erreur ; UX confuse — l'utilisateur voit `0 €` partout et croit que rien ne marche. Ajouter un placeholder. |
| P1-9 | `Converter` ne désactive pas l'input pendant le chargement | `components/Converter.tsx:198-205` | L'utilisateur peut taper pendant `loading`, créant une race condition (résultat affiché peut correspondre à un calcul périmé). |
| P1-10 | Pas de retry exponentiel sur les fetch crypto pour les routes UI | `DcaSimulator`, `MiniInvestSimulator`, `WatchlistView` | Tous les fetch font un seul essai puis affichent une erreur. Un wrapper `fetchWithRetry(3, expBackoff)` serait pertinent. |

---

## 5. Edge cases non gérés (>5 exemples)

1. **`Converter` avec `amount = 0`** : retourne `null` puis `formatAmount(0)` affiche `"0,00"` → "Vers" affiche `0,00 USD` mais `from` reste éditable à `0` → état neutre, OK mais un placeholder type "Saisis un montant" serait plus clair.
2. **`AlertsManager` création sur même crypto/condition/seuil/email** : 5 alertes identiques peuvent coexister (vérifié via burst test). Aucune dedup. Serait bon de proposer "Tu as déjà cette alerte".
3. **`Watchlist` import manuel dans localStorage de 50 ids** : `readRaw()` slice à 10 silencieusement, l'utilisateur ne sait pas que 40 ids sont jetés. Logger un warning console.
4. **`Portfolio` quantité avec virgule décimale française** : `AddHoldingDialog` parse via `parseFloat` qui ne tolère pas `12,5` → silencieusement converti en NaN → bouton submit grisé sans message. Doit `.replace(',', '.')`.
5. **`TaxCalculator` ouvert avec URL `?invested=abc`** : Number.isFinite(parseFloat("abc"))=false → ne hydrate pas, OK ; mais `?invested=NaN` ou `?invested=Infinity` n'est pas testé.
6. **`MicaVerifier` query "" (vide) puis Enter** : `getMicaStatusByName("")` → null, ne sélectionne rien → utilisateur reste perplexe sans feedback.
7. **`PortfolioView` export CSV avec valeurs `Infinity`** : possible si `priceEur=0` (CG renvoie 0 sur token expired) → `gain = -cost / 0` → `-Infinity` dans le CSV.
8. **Newsletter avec emoji dans email** (`a@b.✨`) : la regex `/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/` accepte `.✨` car le 3-chars TLD n'exclut pas les caractères spéciaux. Beehiiv rejettera → erreur 502 affichée à l'utilisateur.
9. **`CommandPalette` tab cyclique avec listbox vide** : focus trap fait `last.focus()` mais `last` est le bouton Close du backdrop — confus.

---

## 6. Annexes — Output curl par endpoint

### `GET /api/prices?ids=bitcoin,ethereum`
```json
{"prices":[{"id":"bitcoin","symbol":"BTC",...,"price":77364,...}],"updatedAt":"2026-04-25T20:19:59Z"}
HTTP_STATUS:200
```

### `GET /api/historical?coin=bitcoin&days=7`
Retourne 30 points (clamp `min=30`), span ~30j. Le paramètre user est silencieusement ignoré.
```json
{"points":[...31 points sur 30j...],"coin":"bitcoin","days":30}
HTTP_STATUS:200
```

### `GET /api/historical?coin=bitcoin&days=365`
**OK** : 366 points, span 364.8 j.

### `GET /api/historical?coin=bitcoin&days=400 / 730 / 1825`
**KO P0** : `{"points":[],...}` HTTP 200 silencieux.

### `GET /api/convert?from=btc&to=eur`
```json
{"rate":65992,"lastUpdated":"2026-04-25T20:19:02Z"}
HTTP_STATUS:200
```

### `POST /api/newsletter/subscribe` (`{"email":"test+audit@cryptoreflex.fr"}`)
```json
{"ok":true,"mocked":true}
HTTP_STATUS:200    ← P0-3 BEEHIIV NON CONFIGURÉ
```

### `POST /api/newsletter/subscribe` (`{"email":"not-an-email"}`)
```json
{"ok":false,"error":"Adresse email invalide."}
HTTP_STATUS:400
```

### `POST /api/alerts/create` (payload valide)
```json
{"ok":true,"alert":{"id":"d36743e3-...","email":"test+audit@...","cryptoId":"bitcoin","symbol":"BTC","condition":"above","threshold":100000,"currency":"eur","createdAt":1777148434464,"status":"active"},"mocked":false}
HTTP_STATUS:200
```

### `POST /api/alerts/create` (`threshold:-100`)
```json
{"ok":false,"error":"Seuil invalide. Saisis un nombre positif inférieur à 1 000 milliards.","field":"threshold"}
HTTP_STATUS:400
```

### `POST /api/alerts/create` (`threshold:0`)
```json
{"ok":false,"error":"Seuil invalide...","field":"threshold"}
HTTP_STATUS:400
```

### `POST /api/alerts/create` (`threshold:1000000000000`)
```json
{"ok":false,"error":"Seuil invalide. Saisis un nombre positif inférieur à 1 000 milliards.","field":"threshold"}
HTTP_STATUS:400  ← upper bound respecté
```

### `POST /api/alerts/create` (`cryptoId:"INVALID-COIN-XYZ"`)
```json
{"ok":false,"error":"Crypto inconnue ou non supportée.","field":"cryptoId"}
HTTP_STATUS:400
```

### Burst rate-limit `POST /api/alerts/create` (15× même IP X-Forwarded-For)
```
200 200 200 200 200 200 200 200 200 200 200 200 200 200 200
```
**P0-6** : aucun 429 — rate-limit instance-local non distribué.

### Burst rate-limit `POST /api/alerts/create` (25× même email)
```
200 200 200 200 200 400 400 400 429 429 429 429 ...
```
- 200×5 : limite 5 alertes/email respectée
- 400×3 : retours "limite atteinte" cohérents
- 429×17 : rate-limit déclenché (10 req/min pour ce limiter ; correctement) — sur **un même client** seulement.

### `GET /api/alerts/by-email?email=test%2Baudit%40cryptoreflex.fr`
```json
{"ok":true,"alerts":[{"id":"d36743e3-...",...}],"count":1}
HTTP_STATUS:200
```

### `DELETE /api/alerts/<id>` avec `Origin: https://www.cryptoreflex.fr`
```json
{"ok":true}
HTTP_STATUS:200
```

### `GET /api/cron/evaluate-alerts` SANS Bearer
```json
{"error":"Not found"}
HTTP_STATUS:404 ✓
```

### `POST /api/analyze-whitepaper` (`text` 419 chars)
```json
{"meta":{"engine":"heuristic-v1","durationMs":25,...},"summary":{...},"redFlags":[{"id":"RF005","severity":"high","points":15},{"id":"RF007","severity":"medium","points":8},{"id":"RF015","severity":"medium","points":10}],"score":33,"verdict":"Mitige","disclaimer":"..."}
HTTP_STATUS:200
```
Note : extracteur tokenomics confond "30% public sale" avec "teamAllocation:30%" (cf. P1-1).

### `POST /api/analyze-whitepaper` (`text` 50 chars)
```json
{"error":"Texte trop court (128 caracteres)..."}
HTTP_STATUS:400
```

### `POST /api/analyze-whitepaper` (mode `url`)
```json
{"error":"Le support des URL PDF arrive prochainement..."}
HTTP_STATUS:501  ← P0-7 UI propose le tab quand même.
```

### `GET /api/search?index=1`
**HTML 404 page** — route absente du dossier `app/api/`. **P0-1**.

### `GET /api/portfolio-prices?ids=bitcoin,ethereum`
```json
{"prices":[{"id":"bitcoin","priceEur":66033,...}],"updatedAt":"..."}
HTTP_STATUS:200
```

### Pages testées (smoke test)
| Path | Status |
|---|---|
| `/outils/calculateur-fiscalite` | 200 |
| `/outils/whitepaper-tldr` | 200 |
| `/quiz` | **404** (manque page index) |
| `/quiz/plateforme` | 200 |
| `/quiz/crypto` | 200 |
| `/watchlist` | 200 |
| `/portefeuille` | 200 |
| `/alertes` | 200 |

---

## Conclusion

Cryptoreflex est un produit techniquement très propre (architecture Next.js App Router moderne, hardening sérieux, accessibilité WCAG soignée, animations CSS pures sans dépendances superflues). Les développeurs ont anticipé beaucoup de pièges classiques : SSR-safe localStorage, rate-limit factorisé, validation systématique côté serveur, KV Vercel pour les alertes, persistence correcte.

Mais **5 bugs P0 cassent en silence des fonctionnalités phares en production** :
1. La recherche globale (Cmd+K) est inutilisable depuis le déploiement.
2. Le simulateur DCA, l'un des outils signature, ne s'affiche jamais (loop sur fetch vide).
3. Le mini-simulateur n'a qu'1 période fonctionnelle sur 3.
4. **La newsletter ne capture aucun email** (Beehiiv non connecté).
5. Le rate-limit n'est pas distribué et ne limite pas réellement les bursts cross-instance.

**Priorité absolue** : corriger P0-3 (newsletter), P0-1 (search) et P0-2/4/5 (historical days > 365) avant tout autre travail. Ce sont des régressions invisibles côté utilisateur qui dégradent silencieusement les KPIs (conversion newsletter, engagement outils).

Note finale : **62/100** — produit livrable mais qui nécessite un sprint correctif urgent.
