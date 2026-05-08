# Audit existant — API B2B Cryptoreflex

> Doc 01 — inventaire pré-MVP. Aucune migration n'est écrite avant validation
> de ce rapport. Règle d'or imposée par le PO : **« Si tables existent → l'API
> B2B LIT exclusivement depuis ces tables. Ne crée jamais de tables parallèles. »**

Date audit : 2026-05-08
Méthode : audit statique du repo (zero DB write) + script `scripts/audit-b2b-schema.mjs` prêt à confirmer en CI.

---

## TL;DR

L'audit statique du repo (Y:/crypto-affiliate-site) montre que **le schéma B2B est entièrement à construire**. Les tables `api_keys`, `webhooks`, `webhook_deliveries`, `user_trades`, `user_pmp`, `user_realized_pnl`, `user_2086_exports` **ne sont référencées nulle part dans le code**. La table `audit_log` existe (schema.sql) mais n'a aucun writer en code.

La règle « ne pas dupliquer » s'applique surtout pour `users`, `user_exchange_connections`, `cryptos`, `user_progress`, `user_push_subscriptions`, `stripe_webhook_events` — tables actives.

Côté domaine business :

- **Trades / PMP / cessions ne sont pas persistés.** Le client envoie ses transactions dans le body `POST /api/cerfa-2086`, le serveur calcule à la volée et stream le PDF. Aucun stockage, aucune table `user_trades`.
- **Alertes prix sont stockées dans Upstash KV (Redis), pas dans Postgres.** La table `user_alerts` n'existe pas.

→ Conséquence pour la spec B2B : `/me/portfolio`, `/me/trades`, `/me/pmp`, `/me/exports/2086` doivent être conçus en sachant qu'**il n'y a pas d'agrégat persisté**. Soit on persiste pour la première fois (création de tables nouvelles, pas parallèles), soit on calcule à la demande à partir de `user_exchange_connections.sync_state`.

---

## Tables référencées dans le code (= existent à coup sûr)

Audit fait via `grep` sur `\.from\(['"]<name>['"]\)` dans tout le repo.

| Table                       | Migrations / Schema source                                | Usage code                                          |
| --------------------------- | --------------------------------------------------------- | --------------------------------------------------- |
| `users`                     | `supabase/schema.sql`                                     | `lib/auth.ts`, `lib/alerts.ts`, `app/api/stripe/webhook`, `app/api/community-stats`, `app/api/account/delete`, `app/api/auth/login`, `app/api/admin/set-password`, `app/api/email/unsubscribe`, `app/api/alerts/create` |
| `stripe_webhook_events`     | `supabase/schema.sql`                                     | `app/api/stripe/webhook` (idempotency)              |
| `audit_log`                 | `supabase/schema.sql`                                     | **Aucun writer** — table dormante (à utiliser pour l'audit B2B) |
| `cryptos`                   | `supabase/migrations/20260508_cryptos_fiches.sql`         | `lib/cryptos-db.ts`, `scripts/batch-generate-fiches.mjs`, `scripts/migrate-cryptos-to-db.mjs` |
| `user_progress`             | `supabase/migrations/20260502_user_progress.sql`          | `lib/gamification.ts`, `app/api/cron/streak-reminders` |
| `user_push_subscriptions`   | `supabase/migrations/20260502_user_push_subscriptions.sql`| `lib/web-push.ts`, `app/api/push/subscribe`, `app/api/push/unsubscribe` |
| `user_exchange_connections` | `supabase/migrations/20260502_user_exchange_connections.sql` | `app/api/exchanges/*` (4 routes : connect / disconnect / status / sync) |

Sept tables actives. C'est tout.

### Schéma critique : `users` (B2B touchera ce CHECK)

```sql
CREATE TABLE public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  stripe_customer_id TEXT UNIQUE,
  plan TEXT NOT NULL DEFAULT 'free' CHECK (plan IN ('free', 'pro_monthly', 'pro_annual')),
  plan_expires_at TIMESTAMPTZ,
  unsubscribed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

⚠️ Le CHECK contraint `plan` à 3 valeurs. Le code (`lib/auth.ts` Plan type) ajoute déjà `pro_plus_monthly` / `pro_plus_annual` mais **la contrainte SQL n'a pas été mise à jour**. Détecté à corriger même hors B2B.

Pour B2B, deux options :
1. **Étendre le CHECK** avec `b2b_starter_*`, `b2b_pro_*`, `b2b_enterprise_*` → 9+ valeurs. Lourd.
2. **Stocker le tier B2B sur `api_keys.tier`** (1 user peut avoir plusieurs clés de tiers différents : sandbox + prod ; ou différents projets) et garder `users.plan` côté humain pour le dashboard /pro.

Recommandation : **option 2**. `users.plan` reste pour le tier humain (Pro/Pro+), `api_keys.tier` pour le tier B2B. Une organisation peut être en `users.plan='free'` mais avoir une clé `api_keys.tier='b2b_pro'`.

### `audit_log` existante — réutilisable ✅

```sql
CREATE TABLE public.audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  event TEXT NOT NULL,
  ip INET,
  user_agent TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

Schéma suffisant pour l'audit B2B. Ajout possible d'un index `(user_id, event, created_at DESC)` si la spec exige `GET /me/audit`. Pas besoin de table parallèle `b2b_audit_log`.

→ La spec parle de log « actions sensibles ». On colle `event = 'b2b.api_key.created'`, `event = 'b2b.webhook.delivered'`, etc. Le `metadata JSONB` absorbe le reste (clé id, scope, statut HTTP, request id).

### `user_exchange_connections` existante — base potentielle pour `/me/portfolio`

```sql
-- (Lu depuis la migration 20260502_user_exchange_connections.sql)
-- Champs typiques : user_id, exchange (binance), api_key_encrypted, api_secret_encrypted,
-- iv, tag, last_sync_at, sync_state JSONB (?), status, created_at, updated_at
```

À confirmer par CI mais le code dans `app/api/exchanges/sync/route.ts` y écrit le state de sync. Si `sync_state JSONB` contient un snapshot des holdings/transactions, **c'est notre source pour `GET /me/portfolio` du B2B** (pas de table parallèle).

---

## Tables qui n'existent pas (vérifié par grep)

| Table candidate                | Référencée dans le code ?     | Verdict                             |
| ------------------------------ | ----------------------------- | ----------------------------------- |
| `api_keys`                     | ❌ Aucune occurrence          | À créer (table B2B nouvelle)        |
| `api_key_scopes`               | ❌                            | À créer ou inliner dans `api_keys.scopes JSONB` |
| `webhooks` / `webhook_subscriptions` | ❌                      | À créer (table B2B nouvelle)        |
| `webhook_deliveries`           | ❌                            | À créer                             |
| `rate_limit_buckets`           | ❌                            | Probablement Redis Upstash, pas Postgres |
| `user_trades`                  | ❌                            | À décider — pas persisté actuellement |
| `user_portfolio_positions`     | ❌                            | À décider — pas persisté actuellement |
| `user_pmp`                     | ❌                            | À décider — pas persisté actuellement |
| `user_realized_pnl`            | ❌                            | À décider — pas persisté actuellement |
| `user_2086_exports`            | ❌                            | À créer si on veut tracer les exports B2B |
| `user_alerts`                  | ❌ (les alertes sont en KV)   | À ne pas créer — coller à Upstash KV |
| `newsletter_subscribers`       | ❌                            | Externe (Beehiiv API), pas Postgres |

**Conclusion** : la « règle des tables parallèles » s'applique à **zéro** des tables B2B prévues, parce qu'elles n'existent pas encore. La règle reste pertinente pour `users`, `user_exchange_connections`, `audit_log` qu'on ne dupliquera pas.

---

## Stockages non-Postgres à respecter

- **Upstash KV (Redis)** : alertes prix (`lib/alerts.ts`). Schéma : keys `alert:by-id:<id>`, `alert:fired:<id>`, etc. Si la spec B2B veut exposer `/me/alerts` → on lit depuis KV, on ne réplique pas en Postgres.
- **Beehiiv API** : newsletter (envoi + désinscription). Pas de table mirror.
- **Stripe** : source de vérité pour les abonnements humains (Pro). Le webhook syncro `users.plan`. Pour B2B, même approche : Stripe garde la vérité, une métadonnée `metadata.tier=b2b_pro` mappe vers `api_keys.tier`.

---

## Autres findings notables

1. **Plans Pro+ déjà code-split mais non-CHECK-allowed.** Type `Plan` inclut `pro_plus_*` mais le CHECK SQL n'est pas mis à jour → tout INSERT/UPDATE avec `pro_plus_*` planterait actuellement. À fixer dans la migration B2B (ajout des plans Pro+ et B2B simultanément).
2. **`user_progress` est utilisé pour la gamification (XP, streaks).** Hors scope B2B mais hors scope = on n'y touche pas.
3. **Rate-limit existant** : `lib/rate-limit.ts` (Upstash KV token bucket). Réutilisable pour les buckets par clé API (préfixe `rl:apikey:<id>`).
4. **`createSupabaseServiceRoleClient()`** est exposé dans `lib/supabase/server.ts` — pattern à utiliser pour les routes B2B authentifiées par clé API (qui s'exécutent hors session humaine, donc service role ou client anon dépend du flow).

---

## Étapes suivantes

1. **Confirmer en CI** : déclencher `.github/workflows/audit-b2b-schema.yml` pour confirmer que les tables candidates manquantes n'existent pas réellement et lister les colonnes exactes des tables actives. Le rapport JSON de l'artifact remplacera ce fichier comme source de vérité.
2. **Doc 02 — schéma B2B cible** : avec ce qu'on sait, écrire la migration unique `20260508_b2b_api.sql` qui crée `api_keys`, `api_key_audit`, `webhooks`, `webhook_deliveries`, étend `users.plan` CHECK et ajoute les index sur `audit_log`. Pas de table dupliquant l'existant.
3. **Doc 03 — MVP API plan** : route map `app/api/v1/*` avec auth middleware par clé API, premier endpoint public `/v1/cryptos`, premier endpoint authentifié `/v1/me/account`.

---

## Annexe — script d'audit

`scripts/audit-b2b-schema.mjs` + `.github/workflows/audit-b2b-schema.yml` sont prêts. Un run via GitHub UI > Actions > "Audit B2B schema" produit `audits/b2b-schema-report.json` (artifact 30j) avec, pour chaque table candidate :

- `exists`: bool
- `columns`: liste des colonnes (extraite d'une row sample)
- `rows`: count exact
- `sample`: première row anonymisée (hash/key/secret redacted)

Sortie attendue : confirme l'inventaire ci-dessus + liste précise des colonnes d'`audit_log`, `users`, `user_exchange_connections` pour la doc 02.
