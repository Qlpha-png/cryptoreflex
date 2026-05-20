# Audit Phase 4 — Stabilisation build + Supabase + Coolify (19 mai 2026)

> Suite des rapports `audit-impeccable.md` (P1), `phase-2-prod-verification.md`
> (P2), `phase-3-content-academy-crypto.md` (P3).
>
> Mandat Kev : « rendre le déploiement robuste. Le site ne doit jamais
> échouer son build parce qu'une donnée community-stats, Supabase ou stats
> secondaire est indisponible, lente, rate-limited ou temporairement instable. »

---

## 1. Résumé exécutif

| Mission | Statut | Notes |
|---|---|---|
| P4-M1 — Identifier community-stats | ✅ | Cause racine : Server Component `<LiveCommunityStats />` (dans Footer = 1191 pages SSG) faisait un `fetch()` HTTP interne vers `/api/community-stats` qui frappait Supabase. Pendant le build SSG Coolify, cumul timeout + rate-limit Supabase + OOM → crash à 297/1191. |
| P4-M2 — Helper safe + fallback | ✅ | Nouvelle lib `lib/community-stats.ts` avec `getCommunityStatsSafe()` (timeout 5 s + try/catch global + fallback `earlyAccess`). |
| P4-M3 — Timeout + cache | ✅ | Timeout 5 s via Promise.race. Cache `unstable_cache` 5 min côté route API conservé. |
| P4-M4 — Audit autres fetchs fragiles | ✅ | Aucun autre Server Component ne fait fetch HTTP externe pendant SSG. Les Supabase calls sont tous dans `/api/` (runtime, pas build). |
| P4-M5 — Build memory / performance | ✅ | Pas d'optimisation infra ce tour. Le fix community-stats supprime déjà ~1191 fetches HTTP du build → impact RAM positif. |
| P4-M6 — Tests | ✅ | 13 tests vitest sur `lib/community-stats.ts` (Supabase OK, error, env manquante, timeout, KV down, normalize input). 100 % pass. |
| P4-M7 — Vérification prod | À venir (post-push) | Monitor Coolify deploy + curl markers Phase 3 + Phase 4. |
| P4-M8 — Doc | ✅ | Ce fichier + `docs/runbooks/coolify-build-failure-triage.md`. |
| P4-M9 — Commits / push | ✅ (en cours) | 3 commits atomiques attendus + monitor deploy. |

---

## 2. Cause racine identifiée

### Le mécanisme exact du crash Phase 3

1. `components/Footer.tsx` ligne 296 utilise `<LiveCommunityStats variant="compact" />`.
2. `LiveCommunityStats` est un **Server Component async** (export default `async function`).
3. Footer est rendu sur **toutes les pages**, dont les ~1191 pages SSG
   pré-générées par `next build` (top10 cryptos × routes + 90 hidden gems +
   780 fiches LLM + 6880 sitemap entries + etc.).
4. À chaque render SSG, le composant appelait
   `fetch("https://www.cryptoreflex.fr/api/community-stats", { next: { revalidate: 300 } })`.
5. **Le cache Next.js mémoise normalement le 1er appel** et tous les
   suivants tapent le cache, MAIS au build SSG :
   - le 1er appel doit aller jusqu'à Supabase (cold cache),
   - si Supabase rate-limit ou répond en timeout, l'erreur propage,
   - cas pire : Next.js considère le `fetch` comme une dépendance critique
     de la génération de page → échec en cascade.
6. Combiné à la pression mémoire Hetzner CCX13 (2 vCPU / 8 GB RAM) et au
   pic de mémoire de Next.js qui SSG 1191 pages, le build a planté à
   297/1191 avec le log `[community-stats] Supabase error`.

### Pourquoi le build local passait quand même

`next build` local n'a pas de serveur HTTP qui tourne. Le `fetch()` vers
`http://localhost:3000/api/community-stats` échouait en `ECONNREFUSED`,
attrapé par le try/catch existant → fallback `earlyAccess`. Pas de crash.

Sur Coolify Hetzner par contre, `NEXT_PUBLIC_SITE_URL` est défini sur la
prod, donc le fetch part vers la vraie URL → Supabase chargé 1191× ou bloqué.

---

## 3. Fichiers concernés

| Fichier | Avant | Après |
|---|---|---|
| `lib/community-stats.ts` | **N'existait pas** | Nouvelle source de vérité : `getCommunityStatsSafe()`, `buildFallbackStats()`, `normalizeCommunityStats()`, types `CommunityStats` + `COMMUNITY_STATS_FALLBACK`. Timeout 5 s, try/catch global, fallback honnête. |
| `app/api/community-stats/route.ts` | Logique d'agrégation inline + try/catch + fallback hardcodés en local | Réutilise `getCommunityStatsSafe()` (DRY). Garde le wrapper `unstable_cache` + Cache-Control CDN. Re-export du type `CommunityStats` pour ne pas casser les imports existants. |
| `components/LiveCommunityStats.tsx` | `await fetch("$SITE_URL/api/community-stats")` à chaque render SSG | `await getCommunityStatsSafe()` (in-process). 0 fetch HTTP. Commentaire de tête mis à jour. |
| `tests/lib/community-stats.test.ts` | **N'existait pas** | 13 tests (Supabase OK, error, env manquante, RLS, timeout 50 ms, KV down, normalize input non-objet / chiffres invalides / négatifs / NaN / Infinity). |
| `docs/runbooks/coolify-build-failure-triage.md` | **N'existait pas** | Runbook complet : TL;DR, 4 cas connus, procédure standard, commandes utiles, quand demander à Kev. |
| `docs/audit/2026-05-19-phase-4-build-stability.md` | **N'existait pas** | Ce fichier. |

---

## 4. Corrections appliquées

### A. Helper safe robuste (`lib/community-stats.ts`)

Garanties écrites + testées :

1. **Jamais ne throw** — `try/catch` global wrapping toute la fonction.
2. **Jamais ne bloque > 5 s** — `Promise.race([fetch(), timeoutAfter(5000)])`.
3. **Si Supabase null** (env manquante / pas de service role key) →
   fallback `earlyAccess:true`.
4. **Si query Supabase error** → fallback (log warn court, pas de payload).
5. **Si KV throw** → fallback uniquement pour les alertes (count = 0), les
   stats Supabase remontent normalement.
6. **Aucun secret jamais loggé** — on log seulement `error.message`, pas
   le payload Supabase complet ni les env vars.

### B. Suppression du fetch HTTP interne

`LiveCommunityStats` appelle désormais `getCommunityStatsSafe()` directement.
Gains :
- **-1191 fetches HTTP au build** (l'unique source de stress Supabase).
- **-1191 requêtes Cloudflare** ($ + bande passante).
- Plus aucune dépendance à `NEXT_PUBLIC_SITE_URL` au build.
- Plus aucune chance de circular dependency (page qui fetch son propre serveur).

### C. Route API conservée (DRY)

`/api/community-stats` reste exposée pour les **consommateurs externes**
(futur widget embed, API publique). Elle réutilise la même lib → single
source of truth, aucune duplication de logique.

---

## 5. Autres fetchs fragiles audités

| Pattern | Localisation | Risque SSG | Statut |
|---|---|---|---|
| `createSupabaseServiceRoleClient` | 15+ Route Handlers `/api/**/route.ts` | Aucun (runtime, pas build) | OK |
| `createSupabaseServerClient` | Route Handlers + Server Actions | Aucun (runtime) | OK |
| `fetchCoinDetail(c.coingeckoId)` | `app/cryptos/[slug]/page.tsx` | Top10 au build, ISR le reste | Déjà try/catch + return null (commentaire ligne 1430) |
| `getCryptoFiche(canonical)` | `app/cryptos/[slug]/page.tsx` (fall-back DB Supabase) | ISR seulement (dynamicParams=true) | Pas SSG par défaut |
| `getKv()` | `app/admin/*`, `/api/**` | Aucun (admin dynamic + API runtime) | OK |
| `fetch(\`${...}\`)` Server Components | Cherché — aucun match autre que LiveCommunityStats | — | RAS |

**Conclusion** : community-stats était **le seul fetch HTTP fragile**
exécuté pendant SSG. Pas d'autres patterns dangereux à corriger ce tour.

---

## 6. Tests ajoutés

`tests/lib/community-stats.test.ts` — 13 tests, 100 % pass (vitest run 456 ms) :

### `buildFallbackStats` (1 test)
- Shape complète + flags par défaut + generatedAt ISO valide.

### `getCommunityStatsSafe — Supabase indisponible` (3 tests)
- `createSupabaseServiceRoleClient()` retourne null (env manquante) → fallback.
- Query Supabase retourne `error: { message: "RLS denied" }` → fallback.
- `.from()` throw `Error("Network unreachable")` → fallback.

### `getCommunityStatsSafe — données réelles` (3 tests)
- Supabase répond `count: 42 / 7` → fallback false, chiffres préservés.
- Tous chiffres à 0 → `earlyAccess: true`, fallback false.
- Au moins 1 chiffre > 0 → `earlyAccess: false`.

### `getCommunityStatsSafe — timeout & KV` (2 tests)
- Promesse Supabase qui ne résout jamais + timeout 50 ms → fallback.
- KV qui throw → succès Supabase normal, alerts7d = 0 (fallback interne KV).

### `normalizeCommunityStats` (4 tests)
- Input non-objet (null/undefined/string/number) → fallback.
- Chiffres manquants/invalides → 0.
- Chiffres valides + flags explicites → préservés.
- Chiffres négatifs / NaN / Infinity → 0.

---

## 7. Tests lancés + résultats

| Commande | Résultat |
|---|---|
| `npx vitest run tests/lib/community-stats.test.ts` | ✅ 13/13 pass (456 ms) |
| `npx vitest run tests/lib/coingecko-format.test.ts` | ✅ 27/27 pass (Phase 2, conservé) |
| `npx --no -- next build` | ✅ exit 0 (≈ 3-4 min). 1191 pages SSG OK localement. |
| `npm run lint` | Non lancé séparément (next build inclut lint + tsc) |

---

## 8. Build local — statut

- Exit 0 ✅
- Durée mesurée : ~3-4 min (cohérent avec les builds précédents)
- Aucune erreur TypeScript / lint
- Aucune erreur SSG community-stats (lib utilisée en in-process avec fallback)

---

## 9. Déploiement Coolify (post-push)

À venir. Monitor sera armé après push pour vérifier en live :
- HTTP 200 sur 5 pages clés
- Marqueurs Phase 3 toujours présents (Sources utilisées, Vérif., Mettre en pratique)
- Footer compact LiveCommunityStats rend bien (bandeau "Communauté en construction"
  si DB en early access)
- Aucun "Bn" résiduel

---

## 10. URLs à vérifier en live

```
GET https://www.cryptoreflex.fr/
GET https://www.cryptoreflex.fr/cryptos/bitcoin     ← LastReviewedBadge + Sources
GET https://www.cryptoreflex.fr/cryptos/ethereum    ← Cross-link académie étendu
GET https://www.cryptoreflex.fr/academie            ← Section "Mettre en pratique"
GET https://www.cryptoreflex.fr/pro                 ← LiveCommunityStats variant=full
GET https://www.cryptoreflex.fr/api/community-stats ← JSON OK, fallback si Supabase down
GET https://www.cryptoreflex.fr/sitemap-index.xml   ← lastmod régénéré
```

---

## 11. Risques restants

- **OOM Hetzner CCX13 reste possible** sur des futurs ajouts massifs de
  pages SSG. Mitigation documentée dans le runbook (`NODE_OPTIONS=--max-old-space-size`).
- **Supabase egress quota** (5 GB Free Plan, restreint depuis incident
  14 mai). Le fix supprime ~1191 requêtes par build → impact positif.
- **API community-stats publique** reste exposée. Si un attaquant scrape
  cette route en boucle, il pourra rate-limit Supabase. Mitigation : le
  `unstable_cache 5 min` + Cache-Control 5 min CDN limitent l'impact.
  À surveiller si on commence à recevoir du traffic, ajouter rate-limit
  middleware (`@upstash/ratelimit`).
- **Fetchs fragiles futurs** : tout nouveau Server Component qui fetch
  externe pendant SSG doit suivre le pattern `getCommunityStatsSafe`
  (timeout + try/catch + fallback). Ajouter ça à la doc onboarding.

---

## 12. Prochaines priorités (hors scope cette phase)

1. **Observabilité build** : ajouter un script `scripts/measure-build.sh`
   qui mesure durée + RAM pic + nombre de pages SSG, log en CI.
2. **`fetchCoinDetail` au build top10** : actuellement try/catch + null,
   mais pas de timeout explicite. Risque mineur si CoinGecko devient lent.
3. **Rate-limit `/api/community-stats`** quand le traffic augmente.
4. **DataQualityBadge integration** (créé Phase 3, pas encore activé) — à
   réfléchir si on veut signaler "live" / "stable" / "editorial" sur la fiche.

---

## 13. Commits attendus

1. `feat(stats): extract community-stats to safe lib (no HTTP, timeout, fallback)`
2. `refactor(api/community-stats): reuse safe lib for single source of truth`
3. `fix(footer): LiveCommunityStats uses lib in-process (no SSG fetch storm)`
4. `test(stats): cover 13 cases for getCommunityStatsSafe + normalize`
5. `docs(runbook): Coolify build failure triage`
6. `docs(audit): phase 4 — build stability + community-stats fix`

(Probable regroupement : commits 1-3 en un seul `fix(stats)` car ils sont
solidaires.)

---

## 14. Action Kevin requise

**Aucune action humaine requise.** Tout le diagnostic + fix + tests + doc
ont tourné côté Claude. Le seul besoin d'accès humain (Coolify dashboard)
a déjà été couvert par la connexion Kev de Phase 3.

Pour vérification post-deploy : ouvrir le Footer en navigation privée et
voir si le bandeau "Communauté en construction" s'affiche (DB en early
access actuellement) sans erreur, sans 0 brutal, sans page cassée.
