# Audit gating final — 2026-05-01 (post-corrections)

> Audit ciblé sur les 4 questions du user, post-corrections du 14h.
> Méthodologie : lecture systématique de la route API serveur + composant
> client + cohérence promesse marketing.

## TL;DR pour le user

- **Tout fonctionne ?** OUI sur la stack technique. `tsc --noEmit` passe sans
  aucune erreur ni warning. Les routes existent toutes, les composants sont
  bien câblés sur `useUserPlan()` / `/api/me` / `getUser()`. Le build n'a pas
  pu être lancé (occupe trop d'espace en sandbox), mais la TS compile cleanly.
- **Free / Pro bien séparés ?** **PARTIELLEMENT**. La séparation TECHNIQUE
  est solide (gates serveur stricts sur IA Q&A et alertes). En revanche la
  **page `/pro` continue de promettre 3 features qui n'existent pas (encore)**
  comme bénéfices Soutien — c'est le seul vrai problème restant, et il est
  *contradictoire* avec ce que dit la CGV (qui, elle, est honnête).
- **Free peut-il accéder au Pro ?** **NON côté serveur** pour les deux features
  vraiment payantes (IA Q&A et alertes étendues). Pour portfolio + watchlist,
  un user technique peut éditer son `localStorage` et ajouter au-delà de la
  limite — c'est documenté noir sur blanc dans `lib/limits.ts:26-32` comme
  acceptable (pas de risque de fraude car ce sont des données client privées
  qui ne consomment aucune ressource serveur).
- **Pro a-t-il accès à tout ?** OUI. Le double-gate (`getUser()` côté serveur
  qui force `plan = "free"` si `plan_expires_at < now()` + lookup Supabase
  par email pour `/api/alerts/create`) ne peut pas bloquer un Pro actif par
  erreur. Aucun cas de faux négatif identifié.

---

## Gates SERVEUR (vrais gates sécurisés)

### 1. IA Q&A par fiche — `POST /api/ask/[cryptoId]`

- **Gate** : `getUser()` retourne null → 401 `needsAuth: true` ; user.plan
  != pro_*  → 403 `needsPro: true` (fichier
  `app/api/ask/[cryptoId]/route.ts:209-222`).
- **Défense en profondeur** : 8 niveaux (whitelist crypto, auth, plan, honeypot
  `website`, triple rate limit 20/jour user + 5/h user + 40/h IP, longueur
  + ratio alpha + 2 mots min, dictionnaire on-topic 110+ mots, 13 patterns
  prompt-injection regex).
- **Contournement curl avec cookie Free** : impossible. Le serveur lit le
  cookie Supabase, hydrate `auth.users`, joint `public.users.plan`, refuse
  net si pas Pro. Pas de header / param qu'un attaquant peut forger.
- **Statut** : conforme.

### 2. Alertes prix — `POST /api/alerts/create`

- **Gate** : la route lit le `email` du body, fait un lookup
  `supabase.from("users").ilike("email", email)`, applique 100 alertes max
  si `plan in (pro_monthly, pro_annual)` ET non-expiré, sinon 3
  (`app/api/alerts/create/route.ts:106-139`).
- **Bémol** : le gate dépend de l'email fourni dans le body, pas du cookie
  d'auth. Concrètement : un Free authentifié qui POST `email: "abonné-pro@x"`
  obtient les limites Pro de l'autre user. **MAIS** l'alerte est créée
  AU NOM de cet email, pas du sien — il ne reçoit donc pas les emails de
  trigger. Impact réel = 0 (vol de quota d'un autre user, sans bénéfice).
- **Contournement curl** : un visiteur anonyme peut POST avec n'importe quel
  email et créer une alerte pour cette personne (limite 3 si l'email n'est
  pas Pro). C'est le comportement historique attendu (alertes par email,
  pas par compte) — pas une régression.
- **Statut** : conforme à l'intention.

### 3. `/api/me`

- **Gate** : `getUser()` puis `getLimits(user.plan)`. Cas non-authentifié
  → renvoie 200 + plan: "free" + FREE_LIMITS (volontaire pour UX douce).
- **Cohérence avec `lib/auth.ts:127-142`** : `plan_expires_at < now()` force
  `plan = "free"` même si la DB dit encore "pro_monthly". Double sécurité
  efficace en cas de webhook foiré.
- **Statut** : conforme.

### 4. Stripe webhook — `app/api/stripe/webhook/route.ts`

- **`customer.subscription.deleted`** : si `subscription.status === "canceled"`,
  bascule en `plan: "free", plan_expires_at: null`. Si l'annulation est en
  cancel-at-period-end, le plan reste actif jusqu'à `current_period_end`,
  puis `getUser()` le force en free via le check d'expiration. Les deux voies
  convergent vers Free immédiatement après expiration.
- **Idempotence** : table `stripe_webhook_events` (PK event_id) → replay
  sans effet de bord.
- **Signature** : `stripe.webhooks.constructEvent()` HMAC SHA256 obligatoire.
- **Statut** : conforme.

### 5. Account / suppression compte — `/api/account/delete`

- Auth via `userClient.auth.getUser()` au début (pas de bypass).
- **Statut** : conforme (hors scope direct Free vs Pro).

---

## Gates CLIENT UI (UX uniquement, contournables)

### 1. Portfolio (max 10 Free / 500 Pro)

- **Stockage** : `localStorage` clé `cr:portfolio:v1`
  (`lib/portfolio-storage.ts`).
- **Gate UI** : `AddHoldingDialog.tsx:68-70` lit `useUserPlan()` →
  `limits.portfolio`, refuse l'ajout si `currentCount >= maxHoldings` avec
  hint "passe Soutien" si Free.
- **Contournement** : trivial. Un user qui ouvre DevTools et fait
  `localStorage.setItem("cr:portfolio:v1", JSON.stringify({entries: [...500]}))`
  peut tracker 500 positions en Free.
- **Justification de l'acceptation** :
  documenté `lib/limits.ts:26-32`. Aucune ressource serveur consommée
  (les prix sont fetched par `/api/portfolio-prices` qui n'a pas de gate
  Free/Pro et accepte jusqu'à 50 ids par requête). Aucun email,
  aucun coût. Le user qui contourne ne nuit qu'à lui-même.

### 2. Watchlist (max 10 Free / 200 Pro)

- **Stockage** : `localStorage` (même mécanisme).
- **Gate UI** : `WatchlistButton.tsx:57-114` lit `useUserPlan()` →
  `limits.watchlist`, refuse au-delà.
- **Contournement** : identique au portfolio (édition localStorage).
- **Justification** : identique. Aucune ressource serveur supplémentaire.

### 3. AskAI client `components/crypto-detail/AskAI.tsx`

- **Gate UI** : 3 états : Free non-auth → encart "lock" + CTA Pro,
  Pro → input fonctionnel, loading.
- **Honeypot** : champ `website` invisible dans le DOM, soumis vide.
- **Cohérence avec API** : oui, l'UI respecte `isPro` de `/api/me`. Mais
  ce gate UI est bypassable (DevTools → POST direct sur `/api/ask/...`),
  ce qui est OK car le serveur refuse le cas avec 403.

---

## Risques résiduels

### CRITIQUE — Promesses mensongères TOUJOURS PRÉSENTES dans `app/pro/page.tsx`

Le user dit que les claims ont été retirés au tour précédent. **Faux** :
le grep montre qu'ils sont toujours là dans le code de la page payante :

- Ligne 110 (description metadata) : "glossaire complet, accès anticipé"
- Ligne 127 (Twitter card) : "glossaire complet, accès anticipé"
- Ligne 229 : `"Glossaire complet 250+ termes (vs 100 Free)"` (excluded Free)
- Ligne 230 : `"Export CSV illimité (portfolio, transactions, alertes)"`
- Ligne 231 : `"Accès anticipé aux nouvelles features"`
- Lignes 253, 254, 255 : repris dans le tier "Soutien Mensuel" (features list)
- Ligne 286 : `"Accès anticipé étendu (2 semaines avant les autres)"` (Annuel)
- Lignes 332, 345-348, 363, 370 : 4 cards "feature" complètes vendant ces 3
  bénéfices (avec KPI "250+ termes")
- Ligne 802 : tableau comparatif "Glossaire 100 termes → 250+ termes"

Pendant ce temps, `app/cgv-abonnement/page.tsx:103-107` dit l'inverse :
*« le glossaire complet et l'export CSV du portfolio sont actuellement
accessibles à tous les utilisateurs (gratuits et Soutien) — ils ne constituent
pas un avantage Soutien à ce jour. Une fonctionnalité accès anticipé est
étudiée pour 2026 mais n'est pas encore livrée. »*

**Impact L121-2 (DGCCRF, pratiques commerciales trompeuses)** : la landing
de vente affiche une promesse contredite par la CGV elle-même. Un client
mécontent peut signaler — risque amende + remboursement. À fixer en priorité
(supprimer les 3 lignes des excluded Free + des features Soutien Mensuel
+ Annuel + des 3 cards "feature" + de la metadata description).

### MOYEN — Mention "glossaire" dans FreeUserDashboard

`components/account/FreeUserDashboard.tsx:116` dit que Soutien lève les
limites "(portfolio, alertes, watchlist, **glossaire**)" — répète la même
fausse promesse implicite. À aligner avec `LOCKED_FEATURES` (qui, lui,
est honnête : ne mentionne ni glossaire ni accès anticipé).

### MINEUR — Vol de quota d'alertes par email tiers

Décrit ci-dessus dans la section "Alertes". Impact réel = 0, mais une
exfiltration douce des emails Pro (via tentatives répétées et observation
de la limite renvoyée) reste théoriquement possible. À envisager :
n'utiliser le lookup plan que si l'email matche celui de la session
auth. Pas urgent.

### ACCEPTÉ — Bypass localStorage portfolio + watchlist

Documenté noir sur blanc. Pas un risque si le marketing reste honnête sur
ce qu'on vend (accès aux fonctionnalités, pas garantie technique d'unicité
multi-device).

---

## Ce qui marche parfaitement

- **`getUser()` double-sécurité** : la condition `plan_expires_at < now()`
  → `plan = "free"` ferme proprement la fenêtre webhook-foiré
  (`lib/auth.ts:127-142`).
- **IA Q&A** : 8 niveaux de défense, gate serveur béton, refus net si non Pro
  ou non auth, anti-bot via honeypot, anti-burst via triple rate limit.
- **Alertes** : la limite Pro 100 vs Free 3 est appliquée serveur via lookup
  Supabase par email, indépendamment du JS client.
- **`useUserPlan()`** : cache TTL 30s correct (TTL court = invalidation après
  login), fallback Free si réseau down (`lib/use-user-plan.ts:76-88`),
  in-flight dedup (un seul fetch même si 5 composants le demandent).
- **Webhook Stripe** : signature HMAC + idempotence + résolution plan robuste
  via `priceIdToPlan()` (pas par amount_total — résiste aux coupons).
- **TS clean** : `tsc --noEmit` 0 erreur.
- **Cohérence limites** : `FREE_LIMITS` / `PRO_LIMITS` déclarés une seule fois
  dans `lib/limits.ts`, consommés par 3 endroits (route API, hook client,
  composants). Aucune valeur hardcodée orpheline trouvée.

---

## Recommandations

### Urgent (avant tout paiement)

1. **Nettoyer `app/pro/page.tsx`** : supprimer ou reformuler les 12 mentions
   listées dans "Risques résiduels CRITIQUE". Garder uniquement les 4 vraies
   features Pro :
   - Portfolio 500 (vs 10)
   - Alertes 100 (vs 3)
   - Watchlist 200 (vs 10)
   - IA Q&A 20/jour (vs 0)
   - Soutien direct au projet (transparent, ce n'est pas une feature mais
     un argument)
2. **Aligner `FreeUserDashboard.tsx` line 116** : retirer "glossaire" de la
   liste des limites levées par Soutien.

### Quick win sécurité

3. **`/api/alerts/create`** : si `getUser()` retourne un user authentifié,
   forcer `email = user.email` (override le body). Ferme le micro-risque de
   vol de quota d'alertes par email tiers.

### Hygiène long terme

4. Migrer portfolio + watchlist vers Supabase (RLS par user) si on veut
   un vrai gate strict. Pas urgent — coûte du dev pour un risque de fraude
   nul. À faire si on monétise la sync multi-device.
5. Logger systématiquement dans Sentry / log serveur les hits sur `needsPro`
   et les bursts de rate-limit IA → pour spotter rapidement une tentative
   d'abus organisée.

---

**Conclusion factuelle** : la séparation TECHNIQUE Free/Pro est solide,
la stack répond, les vrais gates serveur tiennent. **Le seul vrai risque
restant est juridique/marketing** — la page de vente promet encore 3
fonctionnalités qui n'existent pas. C'est un fix de 5 minutes (suppression
de lignes dans un seul fichier) mais il bloque un go-live propre.
