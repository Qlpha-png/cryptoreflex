# Audit gating Free vs Pro — date 2026-05-01

Périmètre : Next.js 14 App Router, Supabase auth (cookies SSR), Stripe (Payment Links + webhook), localStorage côté client pour portfolio/watchlist, KV Upstash pour alertes serveur. Source de vérité limites : `lib/limits.ts` (Free 10/3/10, Pro 500/100/200).

## Résumé exécutif
- Failles P0 (Free peut accéder à Pro côté serveur) : **0 critique**, **3 zones grises documentées** (portfolio + watchlist localStorage + glossaire 100% côté client)
- Frictions P1 (Pro bloqué injustement ou claim invendable) : **2** (claim "Glossaire 250+ Pro" sans implémentation, claim "accès anticipé features" non implémenté)
- Incohérences client / serveur : **3** (portfolio + watchlist non gatés serveur, "export CSV illimité" non gaté)
- Webhook Stripe : conforme (4 events traités), **2 events Stripe utiles non traités** (`invoice.payment_succeeded`, `customer.deleted`)
- Plan Free généreux mais utilisable : **OK** (3 alertes, 10 portfolio, 10 watchlist permettent de tester)

---

## P0 — Failles de gating (URGENT)

Aucune faille de sécurité financière (pas de bypass de paiement, pas de leak de données Pro). Les 3 points ci-dessous sont structurels et **explicitement documentés et acceptés** dans `lib/limits.ts` lignes 26-32, mais doivent figurer dans le rapport pour traçabilité.

### P0-1 : Portfolio entièrement client-side — pas de gate serveur (acceptée)
- **Route** : aucune. Tout vit dans `localStorage["cr:portfolio:v1"]` via `lib/portfolio.ts`.
- **Problème** : un user technique Free peut éditer son `localStorage` (DevTools) et stocker > 10 positions. La fonction `addHolding(input, maxHoldings)` reçoit `maxHoldings` du composant (`AddHoldingDialog` lit `useUserPlan()`), donc la limite est **UX uniquement**, pas crypto-sécurisée. Le `ABSOLUTE_MAX = 500` (PRO_LIMITS.portfolio) reste appliqué défensivement à la lecture (`portfolio.ts:34`).
- **Impact réel** : faible. Pas de fraude de revenu (rien à frauder), pas de fuite de données (les données restent dans le navigateur du user). Le « contournement » coûte de toute façon plus de temps qu'un abonnement à 2,99 €.
- **Fix suggéré** (si business veut un vrai gate) : migrer `cr:portfolio:v1` en table Supabase `portfolios(user_id, holdings_json, ...)` avec RLS ; route `POST /api/portfolio/holdings` qui lit le plan via `getUser()` et applique `getLimits(plan).portfolio`. Coût : ~1 j-dev.
- **Statut** : accepté, documenté, pas de criticité financière → pas d'action immédiate requise.

### P0-2 : Watchlist entièrement client-side — pas de gate serveur (acceptée)
- **Route** : aucune. `localStorage["cr:watchlist:v1"]` via `lib/watchlist.ts`.
- **Problème** : identique à P0-1. `addToWatchlist(id, maxWatchlist)` reçoit la limite du composant `WatchlistButton`. ABSOLUTE_MAX = 200 appliqué à la lecture.
- **Fix** : même approche que P0-1 si gate vrai requis.
- **Statut** : accepté.

### P0-3 : Glossaire — claim « 250+ termes Pro vs 100 Free » FAUX
- **Composant** : `components/Glossary.tsx`, page `app/outils/glossaire-crypto/page.tsx`.
- **Problème** : `Glossary.tsx` charge `GLOSSARY` depuis `lib/glossary.ts` qui retourne **TOUS** les termes (~210 dans `data/glossary.json`). Aucun filtre Free/Pro ; aucun appel à `useUserPlan` ; aucun overlay « Pro only ».
- En revanche, `components/account/FreeUserDashboard.tsx` annonce visuellement « Glossaire complet 250+ termes — Pro » avec « Free : 100 termes essentiels » (lignes 58-62). Et la page `/pro` vend cet avantage.
- **Conséquence** : un user Free a accès à 100% du glossaire — la promesse Pro est mensongère côté Pro (aucune feature débloquée), et il n'y a pas de leak Pro->Free puisque la feature n'existe pas. **C'est une fausse promesse marketing** plus qu'une faille de sécu.
- **Risque légal** (mineur) : article L121-2 Code de la consommation sur la pratique commerciale trompeuse — un user Pro qui paye et constate qu'il n'a rien de plus pourrait demander remboursement (la garantie 14 j résout déjà ce cas).
- **Fix suggéré (au choix)** :
  1. Aligner la com : retirer la mention « 250+ Pro / 100 Free » de `FreeUserDashboard.tsx` et de `/pro` (10 min).
  2. Implémenter le gating réel : ajouter un champ `tier: "free" | "pro"` dans `data/glossary.json`, splitter à 100 termes basics, filtrer dans `Glossary.tsx` via `useUserPlan().isPro`. Plus visible côté serveur via `/api/public/glossary`.

---

## P1 — Friction utilisateur

### P1-1 : Cap dur 5 alertes hérité dans la copy de la page `/alertes`
- **Page** : `app/alertes/page.tsx`, FAQ ligne 75 « Jusqu'à 5 alertes actives en simultané » + trust signal ligne 176 « 5 alertes max / email ».
- **Problème** : la limite Free est en réalité **3** (`FREE_LIMITS.alerts = 3` dans `lib/limits.ts:48`). La copy promet 5 → un user Free qui crée la 4e reçoit l'erreur serveur « Tu as déjà 3 alertes actives ». Confusion garantie. La constante `MAX_ALERTS_PER_EMAIL = 3` dans `lib/alerts.ts:93` confirme la valeur réelle.
- **Impact côté Pro** : la copy laisse penser que tout le monde est limité à 5 — un Pro qui crée la 6e ne voit aucun message « illimité » sur cette page.
- **Fix suggéré** : remplacer « 5 alertes » par « 3 alertes (10 fois plus en Pro) » + ajouter un badge dynamique `useUserPlan().limits.alerts` au lieu de la constante hardcodée 5.

### P1-2 : Claim « Accès anticipé aux nouvelles features » sans implémentation
- **Composant** : `FreeUserDashboard.tsx:69-74`, page `/pro`.
- **Problème** : feature listée comme « débloquée Pro » mais aucun code n'exploite le plan pour montrer/cacher du contenu en avant-première. Aucun feature flag conditionné sur `isPro`. C'est une promesse vide aujourd'hui.
- **Impact** : un Pro qui paye 28,99 € attend de voir des features avant les autres → ne voit rien → demande remboursement L221-18 (légitime).
- **Fix suggéré** : soit retirer la promesse, soit créer un mécanisme `isProEarlyAccess(featureKey)` qui bloque/débloque par flag, et l'utiliser sur 1-2 features réelles.

### P1-3 : Limite portfolio affichée à 30 dans la copy alors que Free = 10, Pro = 500
- **Page** : `app/portefeuille/page.tsx` metadata ligne 19 « jusqu'à 30 positions », hero ligne 70-71 « Jusqu'à 30 cryptos ».
- **Composant** : `PortfolioView.tsx:303-304` empty state « Ajoute jusqu'à 30 positions », StatCard ligne 384 « / 30 max ».
- **Problème** : la copy hardcode 30 alors que la limite réelle est 10 (Free) ou 500 (Pro). Un Free voit « 30 max » → tente la 11e → bloqué. Un Pro voit « 30 max » → croit être limité.
- **Fix suggéré** : remplacer les "30" hardcodés par `useUserPlan().limits.portfolio` côté composant (PortfolioView est déjà Client) ; retirer le chiffre absolu de la metadata Server Component (ou utiliser `FREE_LIMITS.portfolio`).

### P1-4 : Erreur d'upgrade hint trompeuse dans `lib/alerts.ts`
- **Fichier** : `lib/alerts.ts:262-271`.
- **Problème** : la condition `maxAlerts <= MAX_ALERTS_PER_EMAIL` (3) déclenche le hint « Passe en plan Soutien sur /pro pour des alertes illimitées ». Un user Pro avec maxAlerts=100 qui atteint son cap 100 ne verra PAS ce hint (correct), mais un user Pro avec un plan custom maxAlerts=3 (cas limite) verrait l'hint « passe Pro » alors qu'il l'est déjà. Cas exotique, à noter sans urgence.

---

## Incohérences client/serveur

### INC-1 : Portfolio — gating client présent, gating serveur **absent**
- Client : `AddHoldingDialog.tsx` utilise `useUserPlan()` → `maxHoldings` correct selon plan.
- Serveur : aucune route. Un user peut bypass via DevTools.
- **Risque** : faible (rien de financier), mais incohérent avec la promesse de pricing.

### INC-2 : Watchlist — idem portfolio
- Client : `WatchlistButton.tsx:57` utilise `useUserPlan()`.
- Serveur : aucune route → bypass possible via localStorage edit.

### INC-3 : Export CSV portfolio — annoncé « illimité Pro » mais pas gaté
- **Composant** : `PortfolioView.tsx:221-277` — fonction `handleExportCsv` 100% client, **aucun check `isPro`**.
- **Claim Pro** : `FreeUserDashboard.tsx:64-68` annonce « Export CSV illimité » Pro vs « Limité » Free.
- **Réalité** : tout user (Free ou non-authentifié) peut exporter le CSV de TOUTES ses positions. Pas de cap, pas de watermark, pas de check.
- **Impact** : faille marketing (Pro paye pour rien sur cet item). Pas de risque sécu, mais incohérence flagrante.
- **Fix** : soit retirer la promesse « Export CSV illimité Pro », soit implémenter un cap (ex: Free limité à 5 lignes ou exports/mois) côté composant.

### INC-4 : Bonne pratique respectée — Alertes
- Client : `AlertsManager.tsx` n'affiche pas explicitement « 3 max Free » mais l'erreur serveur remonte proprement avec hint upgrade Pro.
- Serveur : `app/api/alerts/create/route.ts:106-139` lookup le plan via `users.email` Supabase et applique la bonne limite.
- **Cohérent**. Seul reproche : la page `/alertes` affiche « 5 alertes max » dans la copy SEO (cf. P1-1) — décalage purement éditorial.

---

## Webhook Stripe — analyse `app/api/stripe/webhook/route.ts`

### Points conformes
1. **Vérification signature** HMAC SHA256 via `stripe.webhooks.constructEvent()` (ligne 64) — OK.
2. **Idempotency** via table `stripe_webhook_events` PK `event_id` (lignes 75-86) — OK.
3. **Service role** Supabase utilisé correctement (bypass RLS pour upsert). OK.
4. **4 events traités** :
   - `checkout.session.completed` → upsert plan + send welcome email + magic link (handleCheckoutCompleted).
   - `customer.subscription.created` / `customer.subscription.updated` → handleSubscriptionUpdate.
   - `customer.subscription.deleted` → handleSubscriptionDeleted (passe en `free` si `status === 'canceled'`, sinon laisse expirer naturellement).
   - `invoice.payment_failed` → handlePaymentFailed (grace period 7 j + email user).
5. **Détermination plan** robuste (ligne 152+) : utilise `priceIdToPlan(priceId, productId)`, fallback sur `recurring.interval`, fallback heuristique sur amount_total seulement en dernier recours. Bien pensé.

### Events Stripe utiles **non traités**
1. **`invoice.payment_succeeded`** — listé dans le commentaire (ligne 21) comme à activer côté Stripe Dashboard, mais **aucun case** dans le `switch`. Conséquence : pas de log de renouvellement réussi côté DB, pas de mise à jour de `plan_expires_at` après chaque renouv (heureusement compensé par `customer.subscription.updated` qui arrive aussi). Pas critique mais utile pour audit comptable.
2. **`customer.deleted`** — si l'admin supprime un customer côté Stripe Dashboard, la table `users` Supabase garde `stripe_customer_id` et `plan_expires_at` futur. Le user reste « Pro » jusqu'à expiration. Faible probabilité, mais à noter.
3. **`charge.refunded`** — un remboursement (cas garantie 14 j L221-18) ne déclenche aucun handler. Le plan reste « Pro » jusqu'à `plan_expires_at`. Si le user demande remboursement à J+5, il garde son accès Pro pendant 26 jours encore. À gérer si scaling. Workaround actuel : la résiliation côté Customer Portal déclenche `customer.subscription.deleted` qui couvre 90% des cas.

### Bug potentiel mineur
- `handleSubscriptionDeleted` (ligne 312+) : la condition `if (subscription.status === "canceled")` ne se déclenche que si Stripe envoie un statut **canceled** au moment du delete event. Or Stripe par défaut envoie `customer.subscription.deleted` à la fin de période (cancel_at_period_end). Le statut reste `active` ou passe à `canceled` selon la config. Le commentaire ligne 317-321 dit que c'est attendu — le code ne fait rien si `status !== 'canceled'`, ce qui est correct (l'expiration naturelle gérera la transition Free).

---

## Plan Free — équilibre

| Feature | Limite Free | Limite Pro | Verdict |
|---|---|---|---|
| Portfolio | 10 | 500 | Bon : 10 positions = retail médian, suffisant pour tester |
| Alertes | 3 | 100 | Serré mais utilisable (BTC seuil haut, BTC seuil bas, ETH par ex) |
| Watchlist | 10 | 200 | Cohérent |
| Glossaire | 100 (théorique) | 250+ (théorique) | **NON IMPLÉMENTÉ** — tout user voit tout (cf. P0-3) |
| CSV Export | "limité" (théorique) | illimité (théorique) | **NON IMPLÉMENTÉ** — tout user exporte tout (cf. INC-3) |
| Whitepaper TL;DR | rate-limit IP 5/min | idem | OK : c'est un outil gratuit pour TOUS, pas marketé Pro |
| Convertisseur, Calculateurs fiscalité, Halving, ROI | gratuits pour tous | idem | OK : pas de promesse Pro dessus |
| Radar 3916-bis | gratuit | mention « Version Pro à venir » | OK (version Pro pas encore livrée, pas de fausse promesse actuelle) |

**Verdict général** : le plan Free n'est pas trop serré. Un user peut tester l'ensemble du site, créer 1-3 alertes, suivre 10 cryptos, gérer 10 positions. Le 0,99 € en moins du « x,99 » trick est cohérent.

**Risque inverse — Free trop généreux** : avec watchlist/portfolio non gatés serveur et glossaire complet, beaucoup de users n'ont aucune raison rationnelle de payer Pro. La conversion va dépendre du sentiment « soutien éditeur indépendant », plus qu'un déblocage technique. C'est un choix business assumé (`/pro` page commentaires lignes 71-86).

---

## Gating correct (fonctionne déjà bien)

1. **`/api/me`** — retourne `plan + isPro + limits` proprement, fallback Free pour non-auth (UX douce, pas 401). `Cache-Control: no-store` correct.
2. **`/api/alerts/create`** — gate serveur via lookup email→plan dans Supabase, applique bonne limite, refuse insertion au-delà. C'est **le seul vrai gate de tout le site**.
3. **`/api/stripe/portal`** — `requireAuth()` + check `stripe_customer_id` + 503 graceful si Stripe non configuré.
4. **`/api/account/delete`** — auth check + body `{confirm: "DELETE"}` + cleanup Stripe + cascade Supabase. Conforme RGPD art. 17.
5. **`ProGate` Server Component** — propre, sépare `authOnly` vs `pro` vs `fallback`. Utilisé peu mais correctement.
6. **`useUserPlan()` hook client** — cache TTL 30s (fix du 01/05/2026 pour éviter le freeze post-login), inflight dedup, fallback Free en cas d'erreur réseau. Bon pattern.
7. **Webhook Stripe** — signature, idempotency, dispatch propre, robustesse à priceId/productId, fallback recurring.interval. Largement au-dessus de la moyenne.
8. **`/mon-compte`** — redirect `/connexion` si pas auth, conditional `<FreeUserDashboard />` vs KPI Pro selon `isPro`. UX claire.
9. **`createAlert(input, maxAlerts)`** — accepte la limite en paramètre depuis la route serveur, pas hardcodée. Refacto propre du 30/04/2026.
10. **Plan expiration check** — `lib/auth.ts:133-139` retombe à `free` si `plan_expires_at < now()`, double sécurité même si webhook foire.

---

## Recommandations (par priorité)

### Quick wins (< 1 h)
1. **P1-3** : remplacer les « 30 positions max » hardcodés dans `app/portefeuille/page.tsx` et `PortfolioView.tsx` par `FREE_LIMITS.portfolio` ou `useUserPlan().limits.portfolio`. (~10 min)
2. **P1-1** : corriger « 5 alertes max / email » → « 3 alertes en Free, 100 en Pro » dans `app/alertes/page.tsx` lignes 75 et 176. (~5 min)
3. **P0-3 (option A)** : retirer la mention « Glossaire complet 250+ vs 100 Free » de `FreeUserDashboard.tsx:58-62` et de la table COMPARISON ligne 81. Aligne marketing sur réalité tech. (~10 min)
4. **INC-3** : retirer « Export CSV illimité Pro » de `FreeUserDashboard.tsx:64-68` OU ajouter un cap CSV Free (ex: première colonne toujours, lignes 6-10 floutées). (~15 min ou 1 h selon option)
5. **P1-2** : retirer « Accès anticipé aux nouvelles features » du dashboard Free et de `/pro` tant qu'aucune feature n'est livrée en avant-première. (~5 min)

### Medium (1-3 j)
6. Ajouter handler `invoice.payment_succeeded` dans le webhook pour persister la dernière `paid_at` en DB (utile pour stats churn). (~30 min)
7. Ajouter handler `charge.refunded` pour basculer le user en Free immédiatement après refund (sécurité contre l'abus). (~30 min)
8. Implémenter un **vrai gate serveur** pour le portfolio + watchlist via Supabase (cf. P0-1 / P0-2). Remplace le contournement DevTools, ouvre la voie multi-device sync, justifie un peu plus le pricing Pro. (~1 j)

### Long terme (semaines)
9. Implémenter le glossaire Pro réel : tagger les termes Free/Pro dans `data/glossary.json`, filtrer côté serveur via `/api/public/glossary?tier=`, gater le composant `Glossary.tsx`. (~3 j)
10. Implémenter un mécanisme de feature flags Pro (`isProEarlyAccess(key)`) pour tenir la promesse « accès anticipé ». (~2 j)
11. Ajouter une suite de tests `vitest` qui simule un user Free essayant de POST `/api/alerts/create` 5 fois → vérifie 4e refusée. Idem Pro qui doit pouvoir aller à 100. Et test webhook : event factice → vérifie upsert plan. (~1 j)

---

## Fichiers analysés (références)

- `lib/limits.ts` (source de vérité Free/Pro)
- `lib/auth.ts` (getUser, isPro, requireAuth, requirePro)
- `lib/use-user-plan.ts` (hook client + cache TTL 30s)
- `lib/supabase/server.ts` (client RLS + service role)
- `lib/stripe.ts` (priceIdToPlan, planToExpirationDate)
- `lib/alerts.ts` (createAlert avec maxAlerts paramétré)
- `lib/portfolio.ts`, `lib/watchlist.ts` (localStorage + ABSOLUTE_MAX)
- `lib/glossary.ts` (pas de filtrage tier)
- `app/api/me/route.ts` ✅
- `app/api/alerts/create/route.ts` ✅ seul vrai gate
- `app/api/alerts/by-email/route.ts` (lecture publique avec rate-limit IP)
- `app/api/alerts/[id]/route.ts` (DELETE same-origin OU token)
- `app/api/stripe/webhook/route.ts` ✅
- `app/api/stripe/portal/route.ts` ✅
- `app/api/account/delete/route.ts` ✅
- `app/portefeuille/page.tsx` (hardcode "30 positions")
- `app/watchlist/page.tsx` (hardcode "10 max" qui matche Free, mais pas dynamique pour Pro)
- `app/alertes/page.tsx` (FAQ + trust hardcodés à "5 max")
- `app/outils/glossaire-crypto/page.tsx`
- `app/mon-compte/page.tsx` ✅ (sépare KPI Pro vs FreeUserDashboard)
- `app/pro/page.tsx`
- `components/PortfolioView.tsx` (hardcode "30 max")
- `components/AddHoldingDialog.tsx` ✅ (utilise useUserPlan)
- `components/WatchlistButton.tsx` ✅ (utilise useUserPlan)
- `components/AlertsManager.tsx` (pas de useUserPlan, mais l'erreur serveur fait le job)
- `components/Glossary.tsx` (aucun filtre tier)
- `components/account/FreeUserDashboard.tsx` (claim "250+ glossaire" + "Export CSV illimité" + "Accès anticipé" non gatés)
- `components/ProGate.tsx` ✅
- `components/TaxResult.tsx` (gratuit, pas marketé Pro — bouton PDF disabled "bientôt")

Fin du rapport.
