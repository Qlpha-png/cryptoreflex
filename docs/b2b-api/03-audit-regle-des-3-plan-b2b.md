# Audit règle des 3 — Plan API B2B Cryptoreflex

> Doc 03 — application de la règle des 3 (utilisée pour valider chaque fiche
> crypto T3) sur le PLAN d'API B2B avant de coder. Trois axes notés, verdict
> global, issues à fixer.
>
> Date : 2026-05-08. Cible : valider que le plan tient debout AVANT d'écrire la
> migration et le code MVP. Chaque issue détectée ci-dessous se transforme en
> ajustement de la doc 02 ou en TODO bloquant le commit.

---

## Méthodologie

Pour les fiches crypto, la règle des 3 = tutoiement (30 %) + personnalisation
(35 %) + profondeur (35 %). On adapte les axes au contexte API B2B :

| Axe                         | Poids | Question centrale                                                      |
| --------------------------- | ----- | ---------------------------------------------------------------------- |
| **Sécurité**                | 35 %  | Le plan résiste-t-il à un attaquant qui cherche à voler / abuser une clé ? |
| **DX (Developer Experience)** | 35 %  | Un dev solo (cas Kevin / quant) peut-il intégrer la clé sans frustration ? |
| **Conformité FR**           | 30 %  | Le plan respecte-t-il PSAN, RGPD, DAC8 et la jurisprudence française ?  |

Score par axe : 0–100. Pass ≥ 70 sur chaque axe + ≥ 75 global. Sinon → ajuster.

---

## Axe 1 — Sécurité (35 %)

### Critères

| Critère                                               | Note  | Notes                                                                                       |
| ----------------------------------------------------- | ----- | ------------------------------------------------------------------------------------------- |
| 1.1 Stockage clé hashé + pepper                       | 100   | bcrypt(12) + pepper env. Solid. `API_KEY_PEPPER` doit être en Vercel ENV chiffré.           |
| 1.2 Lookup clé sans timing attack                     | 90    | `public_key` UNIQUE → SELECT direct, pas de scan O(N). `bcrypt.compare` est constant-time. Manque : ne pas exposer `404` vs `401` (fuite "ce keyId existe vs n'existe pas") — toujours répondre `401 invalid_credentials` quel que soit le cas. |
| 1.3 Affichage clé une seule fois                      | 100   | Pattern Stripe. UI `/mon-compte/dev/nouvelle` montre `cr_sk_...` une fois puis le hash.     |
| 1.4 Rotation 7j grace                                 | 95    | Bien. À documenter : pendant les 7j, la même requête peut matcher l'ancienne OU la nouvelle clé — choix : matcher la nouvelle en priorité. |
| 1.5 Audit log immuable                                | 100   | `audit_log` existante avec INSERT-only RLS. Réutilisé. Ajout index `(user_id, event, created_at DESC)`. |
| 1.6 Rate limit anti-DoS                               | 85    | Upstash KV token bucket. **Faille potentielle** : un attaquant qui ne connaît pas la clé bombarde l'endpoint avec des `cr_sk_...` random — chaque appel coûte 1 bcrypt (~50ms). À 100 r/s c'est 5s CPU. → **Mitigation** : rate limit IP-based AVANT le bcrypt (ex 30 r/min/IP par défaut sur les routes `/api/v1/*`), bypass si IP whitelist client B2B Pro. |
| 1.7 HMAC webhook signing                              | 95    | Modèle Stripe `t=<ts>,v1=<sig>`. Ajout : refus de delivery si `ts` est plus vieux que 5 min (replay protection côté receiver — à documenter dans la doc dev mais c'est au receiver d'implémenter). |
| 1.8 Webhook auto-disable après 50 échecs              | 100   | Anti-DoS du dev (s'il oublie un endpoint cassé). |
| 1.9 Détection anomalies (volume soudain x10)          | 60    | Mentionné dans la spec (V2). Manquant en MVP. **Issue** : ajouter un alerting basique en V1 plutôt que V2 (cron quotidien qui compare le 7j avg vs aujourd'hui). |
| 1.10 Cohérence with audit règle des 3 fiches          | 80    | L'audit B2B doit aussi loguer le `request_id` pour debugging cross-system. Ajouter `metadata.request_id = nanoid(12)` à chaque entry. |
| 1.11 Pas de leak de PII en query string               | 90    | URL params : pas de email, pas de keyId. **Issue mineure** : `?since=YYYY-MM-DD` est OK. Mais le `cr_sk_...` ne doit JAMAIS apparaître en query string (rappel doc dev) — uniquement en Authorization header. |
| 1.12 Cookie / session split                           | 100   | Web user = cookies Supabase. API B2B = Bearer token. Pas de mix. |
| 1.13 RLS sur tables nouvelles                         | 85    | `api_keys` : RLS user_id = auth.uid() côté lecture user, service_role pour les routes B2B. **Issue** : RLS sur `webhook_subscriptions` et `webhook_deliveries` doit aussi protéger. |
| 1.14 Pas de stockage en clair des secrets webhook     | 70    | La spec dit "secret HMAC propre à chaque webhook". On le stocke comment ? **Issue** : doit être hashé en DB (ou chiffré si on doit ré-afficher pour copy/paste — mais alors comment le user le récupère ?). Décision : afficher une seule fois à la création (modèle Stripe), stocker le hash. Si user perd → rotation = nouveau secret. |

### Sous-total Sécurité

Moyenne pondérée des 14 critères : **89/100**.

Issues bloquantes : aucune. Issues à fixer dans doc 02 (revisions) :

- **S-1** : Ajouter rate limit IP-based pré-bcrypt (~30 r/min/IP) sur toutes les routes `/api/v1/me/*` et `/api/v1/webhooks/*`. → Nouveau fichier `lib/api-keys/ip-pre-rl.ts`.
- **S-2** : Toujours répondre `401 invalid_credentials` (pas `404`) pour ne pas fuir l'existence d'un keyId.
- **S-3** : Webhook secret affiché une seule fois + hashé en DB. UI claire.
- **S-4** : Détection anomalies basique en V1 (cron `app/api/cron/anomaly-detect`), pas V2.
- **S-5** : `metadata.request_id` (nanoid 12) dans chaque audit entry.

---

## Axe 2 — DX (Developer Experience) (35 %)

### Critères

| Critère                                                          | Note | Notes                                                                                       |
| ---------------------------------------------------------------- | ---- | ------------------------------------------------------------------------------------------- |
| 2.1 Format de clé reconnaissable                                  | 100  | `cr_sk_live_<keyId>_<secret>` parle. Préfixe permet aussi de détecter une fuite via secret-scanning (GitHub a un détecteur pour préfixes communs ; on documente le pattern). |
| 2.2 Quantité d'étapes pour premier appel                          | 95   | (1) souscrire → (2) copier la clé → (3) `setx CRYPTOREFLEX_API_KEY ...` → (4) `curl /api/v1/me`. Quatre étapes, dont une (souscription) reportable en sandbox 14j gratuit.  |
| 2.3 Sandbox / trial                                               | 80   | Brief = trial 14j. **Issue** : doit être dispo dès MVP pour que Kevin puisse intégrer son projet quant tout de suite, sinon Stripe Checkout devient un blocker. → Ajout en MVP plutôt que V1.1. Implémentation : clé `tier=sandbox` créée sans Stripe, expire à J+14, scopes restreints (`public:read` + `user:portfolio:read`). |
| 2.4 Erreurs claires                                               | 90   | Format réponse error : `{ ok: false, error: { code, message, hint? } }` cohérent avec routes existantes (`app/api/cerfa-2086`). À documenter en doc dev. |
| 2.5 Headers rate limit standards                                  | 100  | `X-RateLimit-*` + `Retry-After`. Standard. |
| 2.6 OpenAPI 3.1 + Swagger UI                                      | 70   | Generation dynamique = ambitieux. **Issue** : MVP peut shipper avec un OpenAPI manuel statique (`docs/b2b-api/openapi.yaml`), génération dynamique en V1. Risque de scope creep. |
| 2.7 Alias de l'API publique existante (compat)                    | 100  | Le brief précise : `/api/v1/psan-registry` doit rester compatible avec `/api/public/psan-registry` pour le client quant Kevin. → On fait un alias / réutilise la même handler. |
| 2.8 Pagination cohérente                                          | 90   | `?page=N&per_page=M` avec `_meta.pagination = { total, page, per_page, has_next }`. Standard. |
| 2.9 Doc dev en français                                           | 100  | Cohérent avec ligne éditoriale Cryptoreflex. À écrire au fil du code, pas en V2. |
| 2.10 Postman collection / Hurl                                    | 70   | V1.1 dans le brief. Hurl gratuit + déjà utilisable côté MVP. → On commence avec un fichier `tests/e2e/b2b-api.hurl` minimal en MVP, étoffé en V1.1. |
| 2.11 Gestion des erreurs réseau / retry côté client              | 100  | Hors scope serveur, mais la doc dev recommandera explicit retry-with-backoff pour 5xx + 429.  |
| 2.12 Discoverability des endpoints                                | 100  | `GET /api/v1/` retourne un index des endpoints disponibles avec lien vers OpenAPI. |
| 2.13 Sentry tag `b2b_api_key_id` pour debug user-side            | 80   | Pas évident. **Issue** : ajouter `Sentry.setTag('b2b_api_key_id', key.id)` dans le middleware → quand Kevin debug son projet quant, je peux retrouver les erreurs côté serveur via Sentry. |
| 2.14 SDK Python / TS fournis                                      | 50   | Out of scope MVP/V1. **Pas une issue** : la simplicité du Bearer + JSON suffit pour 95% des intégrations. Mais on garde en tête pour V2 si traction. |

### Sous-total DX

Moyenne pondérée : **86/100**.

Issues à fixer :

- **D-1** : Sandbox key (tier=sandbox, expire J+14, sans Stripe) en MVP, pas V1.1.
- **D-2** : OpenAPI MVP = YAML statique manuel. Génération dynamique reportée V1.
- **D-3** : Sentry tag `b2b_api_key_id` dans le middleware auth.

---

## Axe 3 — Conformité FR (30 %)

### Critères

| Critère                                                          | Note | Notes                                                                                       |
| ---------------------------------------------------------------- | ---- | ------------------------------------------------------------------------------------------- |
| 3.1 PSAN / MiCA — pas de conseil en investissement                | 95   | Endpoints purement informationnels. Schémas réponse interdisent `recommendation`, `signal`, `forecast`. **À acter en lib** : validateur Zod schema en sortie qui drop ces champs. |
| 3.2 RGPD — droit à l'effacement                                   | 90   | `DELETE /api/v1/me` cascade : `api_keys` revoke, `webhook_subscriptions` delete, `audit_log` redaction (event garde, metadata redactée — RGPD exception "obligation légale" = audit). À documenter. |
| 3.3 RGPD — droit à la portabilité                                 | 100  | `GET /api/v1/me/export` → ZIP JSON + CSV. |
| 3.4 DAC8 — endpoint conforme UE                                   | 70   | Spec 2026, finalisation Q1. **Issue** : on prévoit le endpoint `/api/v1/me/dac8/{year}` mais on ne livre pas les champs DAC8 tant que le format officiel n'est pas publié — on stub un 501 Not Implemented avec lien vers la roadmap. |
| 3.5 RGPD — durée de conservation audit_log                        | 100  | Brief = 1 an. À implémenter via cron de purge `app/api/cron/audit-log-purge` (suppression > 365j). |
| 3.6 RGPD — consentement données fiscales                          | 90   | L'utilisateur a déjà consenti via les CGU Cryptoreflex. **Issue mineure** : ajouter clause CGU spécifique B2B API quand un user crée sa première clé (modal d'acceptation). |
| 3.7 Mentions licence dans chaque réponse                          | 100  | `_meta.license` : `CC-BY-4.0` pour public, `Cryptoreflex B2B API Subscription` pour me/*. |
| 3.8 Pas de transfert hors UE non documenté                        | 85   | Vercel = US. Supabase EU. Upstash EU. Stripe Ireland. Tout est OK MAIS Vercel routing peut router via US edge → à documenter dans la PA Cryptoreflex. **Issue** : forcer `runtime = 'nodejs'` + `preferredRegion = ['fra1']` (Frankfurt) sur les routes `/api/v1/me/*`. |
| 3.9 LCB-FT (lutte contre blanchiment)                             | 80   | Hors scope direct (pas un PSAN agréé). Mais si on voit des patterns de fraude (volume soudain, IPs suspectes) on alerte. Couvert par S-4 (détection anomalies). |
| 3.10 ANSSI — recommandations clés API                             | 95   | Token long (≥ 64 bits entropie), hash bcrypt, transmis Bearer header (pas query string), revocable. Conforme guide ANSSI. |

### Sous-total Conformité

Moyenne : **91/100**.

Issues à fixer :

- **C-1** : Validateur Zod schemas sortie qui interdit `recommendation`, `signal`, `forecast` (compliance PSAN).
- **C-2** : `/api/v1/me/dac8/{year}` MVP = stub 501 avec lien roadmap.
- **C-3** : Cron `audit-log-purge` quotidien (rétention 1 an).
- **C-4** : Modal CGU B2B API à la création de la première clé.
- **C-5** : `runtime = 'nodejs'` + `preferredRegion = ['fra1']` sur tous les `/api/v1/me/*`.

---

## Synthèse

| Axe          | Score   | Pass (≥70) |
| ------------ | ------- | ---------- |
| Sécurité     | 89/100  | ✅          |
| DX           | 86/100  | ✅          |
| Conformité   | 91/100  | ✅          |
| **Global**   | **88/100** | ✅       |

→ Le plan tient debout. **GO pour le code MVP** avec les ajustements ci-dessous intégrés.

### Ajustements à appliquer à la doc 02 (avant migration SQL)

| ID    | Description                                                                            | Impact                                              |
| ----- | -------------------------------------------------------------------------------------- | --------------------------------------------------- |
| S-1   | Rate limit IP-based pré-bcrypt sur `/api/v1/me/*` et `/api/v1/webhooks/*`              | +1 fichier `lib/api-keys/ip-pre-rl.ts`              |
| S-2   | `401 invalid_credentials` uniforme (pas `404` sur keyId inconnu)                       | Logique du middleware                               |
| S-3   | Webhook secret affiché 1×, hashé en DB                                                 | Schema `webhook_subscriptions.secret_hash` (pas `secret`) |
| S-4   | Détection anomalies V1 (pas V2)                                                        | +1 cron `app/api/cron/anomaly-detect`               |
| S-5   | `metadata.request_id` (nanoid 12) dans audit                                            | Helper `lib/api-keys/audit.ts`                      |
| D-1   | Sandbox key MVP (tier=sandbox, J+14, sans Stripe)                                      | Logique route `POST /mon-compte/dev/nouvelle?sandbox=1` |
| D-2   | OpenAPI MVP = YAML manuel statique                                                     | -1 route dynamique, +1 fichier `docs/openapi.yaml`  |
| D-3   | Sentry tag `b2b_api_key_id`                                                            | Middleware auth                                     |
| C-1   | Validator Zod sortie : interdit `recommendation`/`signal`/`forecast`                   | +1 fichier `lib/api-keys/output-guard.ts`           |
| C-2   | `/me/dac8/{year}` = stub 501                                                           | Route stub                                          |
| C-3   | Cron `audit-log-purge` quotidien                                                       | +1 cron                                             |
| C-4   | Modal CGU B2B API à 1ère clé                                                           | UI dashboard                                        |
| C-5   | `runtime='nodejs'` + `preferredRegion=['fra1']` sur `/api/v1/me/*`                     | Header chaque route                                 |

Total : **+3 fichiers MVP** (`ip-pre-rl.ts`, `output-guard.ts`, cron `anomaly-detect`), **-1 fichier MVP** (génération OpenAPI dynamique reportée), **+1 modal UI**, **+1 fichier docs/openapi.yaml**.

Effort revu MVP : 9 j → **10 j** (cohérent avec la complexité ajoutée).

---

## Tableau de bord MVP — sprint plan

| Jour | Livrables                                                                                              |
| ---- | ------------------------------------------------------------------------------------------------------ |
| J1   | Migration `20260508_b2b_api_keys.sql` + extension `users.plan` CHECK + index `audit_log` + lib/api-keys (format, hash, scopes, types) |
| J2   | `lib/api-keys/auth.ts` middleware + `lib/api-keys/audit.ts` (avec `request_id` S-5) + `lib/api-keys/ip-pre-rl.ts` (S-1) + tests unitaires |
| J3   | `lib/api-keys/rate-limit.ts` Upstash + `lib/api-keys/output-guard.ts` (C-1) + intégration dans middleware |
| J4   | Routes `/api/v1/me`, `/api/v1/me/portfolio`, `/api/v1/me/portfolio/positions` (LIT depuis `user_exchange_connections.sync_state`) |
| J5   | Routes `/api/v1/platforms`, `/api/v1/psan-registry`, `/api/v1/decentralization-scores`, `/api/v1/top-cryptos`, `/api/v1/fiscal-tools` (alias des publics + extra params) |
| J6   | Route `/api/v1/me/fiscal/2086` (JSON, réutilise `lib/cerfa-2086.ts`) + `/api/v1/me/dac8/{year}` stub (C-2) |
| J7   | Dashboard dev MVP : `/mon-compte/dev` (lister) + `/mon-compte/dev/nouvelle` (créer + sandbox D-1) + modal CGU (C-4) |
| J8   | Stripe Products `b2b_starter`/`b2b_pro` création + webhook handler extension (`metadata.tier=b2b_*`) |
| J9   | OpenAPI YAML manuel (D-2) + UI Swagger (Redoc statique) + page `/dev/api/docs` |
| J10  | Pricing page `/pro/api` + crons `audit-log-purge` (C-3) + `anomaly-detect` (S-4) + tests E2E Hurl |

---

## Ce qui reste hors MVP

- Webhooks (V1)
- Rotation de clé via dashboard (V1)
- Stripe billing automatisé fin (V1, MVP = checkout statique avec metadata.tier)
- IP whitelist Pro (V2)
- DAC8 réel (V2 quand spec officielle UE publiée)
- SDK Python/TS (V2 si traction)

---

## Verdict

**88/100** — plan solide, prêt pour implémentation. Treize ajustements mineurs intégrés au sprint plan ci-dessus. **GO**.
