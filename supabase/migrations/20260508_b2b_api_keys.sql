-- ============================================================================
-- B2B API — schéma initial (api_keys, webhook_subscriptions, webhook_deliveries)
-- ============================================================================
-- Migration unique pour le MVP de l'API B2B Cryptoreflex.
-- Doc de cadrage : docs/b2b-api/{01,02,03}*.md
-- Audit règle des 3 appliqué : 88/100 (S-1..S-5, D-1..D-3, C-1..C-5 intégrés).
--
-- Règle d'or PO : « Si tables existent → l'API B2B LIT exclusivement depuis
-- ces tables. Ne crée jamais de tables parallèles. » L'audit statique du repo
-- (lib/, app/api/*) confirme qu'aucune des tables ci-dessous n'est dupliquée.
-- ============================================================================

-- 1) FIX collatéral — `users.plan` CHECK contraint à 3 valeurs alors que le code
--    (lib/auth.ts) utilise déjà `pro_plus_*`. À fixer ici (sinon tout INSERT
--    Pro+ planterait à terme). Pas d'ajout de plans `b2b_*` : le tier B2B vit
--    sur `api_keys.tier`, pas sur `users.plan` (Q3 PO).

ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_plan_check;
ALTER TABLE public.users ADD CONSTRAINT users_plan_check CHECK (
  plan IN (
    'free',
    'pro_monthly',
    'pro_annual',
    'pro_plus_monthly',
    'pro_plus_annual'
  )
);


-- ============================================================================
-- 2) TABLE api_keys
-- ============================================================================
-- Clé B2B opaque type Stripe : `cr_sk_live_<keyId>_<secret>`. La partie publique
-- (`public_key = cr_pk_live_<keyId>`) sert au lookup O(1) ; le secret est hashé
-- bcrypt(12) + pepper env. Affiché en clair UNE SEULE FOIS au moment de la
-- création (modèle Stripe).

CREATE TABLE IF NOT EXISTS public.api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,

  -- Lookup O(1). Format : `cr_pk_live_<keyId>` (ou `cr_pk_test_<keyId>` sandbox).
  public_key TEXT UNIQUE NOT NULL,

  -- bcrypt(secret + pepper). NEVER stored in clear.
  secret_hash TEXT NOT NULL,

  -- Préfixe affiché en UI pour aider l'identification (ex `cr_sk_live_a3f9...`).
  -- Non sensible (16 chars max).
  secret_prefix TEXT NOT NULL,

  -- Label libre user (ex "Projet quant Kevin", "Sandbox"). Max 100 chars.
  label TEXT NOT NULL DEFAULT 'Clé sans nom',

  -- Tier B2B → drive le rate limit (Upstash KV bucket) et le scope par défaut.
  -- 'sandbox' : J+14 gratuit, scopes restreints, pas de Stripe (D-1).
  tier TEXT NOT NULL DEFAULT 'sandbox' CHECK (
    tier IN ('sandbox', 'b2b_starter', 'b2b_pro', 'b2b_enterprise')
  ),

  -- Liste des scopes. JSONB (array) pour permettre filtrage par scope sans
  -- table de jointure. 9 scopes documentés dans lib/api-keys/scopes.ts.
  scopes JSONB NOT NULL DEFAULT '[]'::jsonb,

  -- Lien vers l'abonnement Stripe (NULL pour sandbox). Le webhook Stripe met
  -- à jour `tier` quand le plan change.
  stripe_subscription_id TEXT,

  -- État.
  -- 'active'      : valide.
  -- 'deprecated'  : remplacée par rotation, encore valide jusqu'à `deprecated_until` (7 jours).
  -- 'revoked'     : invalidée définitivement.
  -- 'expired'     : `expires_at` dépassé.
  status TEXT NOT NULL DEFAULT 'active' CHECK (
    status IN ('active', 'deprecated', 'revoked', 'expired')
  ),
  deprecated_until TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,

  -- Tracking dernière utilisation (debug + détection anomalies).
  last_used_at TIMESTAMPTZ,
  last_used_ip INET,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Lookup user → ses clés (dashboard).
CREATE INDEX IF NOT EXISTS api_keys_user_id_idx ON public.api_keys(user_id);
-- Lookup status (purger les expirées via cron).
CREATE INDEX IF NOT EXISTS api_keys_status_idx ON public.api_keys(status);
-- Lookup expires_at (cron de transition active → expired).
CREATE INDEX IF NOT EXISTS api_keys_expires_at_idx ON public.api_keys(expires_at)
  WHERE expires_at IS NOT NULL;

-- Trigger updated_at (réutilise `handle_updated_at()` de schema.sql).
DROP TRIGGER IF EXISTS api_keys_updated_at ON public.api_keys;
CREATE TRIGGER api_keys_updated_at
  BEFORE UPDATE ON public.api_keys
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- RLS : un user voit ses propres clés. service_role bypass pour les routes B2B.
ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users peuvent voir leurs clés" ON public.api_keys;
CREATE POLICY "Users peuvent voir leurs clés"
  ON public.api_keys FOR SELECT
  USING (auth.uid() = user_id);

-- Pas de policy INSERT/UPDATE/DELETE depuis anon → tout passe par service_role
-- (routes Next.js qui valident les actions côté serveur).


-- ============================================================================
-- 3) TABLE webhook_subscriptions
-- ============================================================================
-- Endpoint webhook que le dev déclare dans son dashboard. URL HTTPS only.
-- Auto-disable après 50 échecs consécutifs (anti-DoS du dev).

CREATE TABLE IF NOT EXISTS public.webhook_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  api_key_id UUID NOT NULL REFERENCES public.api_keys(id) ON DELETE CASCADE,
  -- Denormalisé pour faciliter RLS user_id-based.
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,

  url TEXT NOT NULL CHECK (url LIKE 'https://%'),

  -- Secret HMAC affiché en clair UNE SEULE FOIS (S-3). Stocké hashé.
  secret_hash TEXT NOT NULL,
  secret_prefix TEXT NOT NULL,

  -- Liste des events souscrits (subset des events documentés en lib).
  events JSONB NOT NULL DEFAULT '[]'::jsonb,

  status TEXT NOT NULL DEFAULT 'active' CHECK (
    status IN ('active', 'paused', 'disabled_after_failures')
  ),
  consecutive_failures INTEGER NOT NULL DEFAULT 0,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS webhook_subscriptions_api_key_id_idx
  ON public.webhook_subscriptions(api_key_id);
CREATE INDEX IF NOT EXISTS webhook_subscriptions_user_id_idx
  ON public.webhook_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS webhook_subscriptions_status_idx
  ON public.webhook_subscriptions(status)
  WHERE status = 'active';

DROP TRIGGER IF EXISTS webhook_subscriptions_updated_at ON public.webhook_subscriptions;
CREATE TRIGGER webhook_subscriptions_updated_at
  BEFORE UPDATE ON public.webhook_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

ALTER TABLE public.webhook_subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users peuvent voir leurs webhooks" ON public.webhook_subscriptions;
CREATE POLICY "Users peuvent voir leurs webhooks"
  ON public.webhook_subscriptions FOR SELECT
  USING (auth.uid() = user_id);


-- ============================================================================
-- 4) TABLE webhook_deliveries
-- ============================================================================
-- Trace immuable des tentatives d'envoi. Sert au debug côté dev (`GET /webhooks/{id}/deliveries`)
-- et au cron de retry (1m / 5m / 30m).

CREATE TABLE IF NOT EXISTS public.webhook_deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  webhook_id UUID NOT NULL REFERENCES public.webhook_subscriptions(id) ON DELETE CASCADE,

  -- Idempotency. Format `evt_<nanoid>`. UNIQUE pour empêcher la double-livraison.
  event_id TEXT UNIQUE NOT NULL,
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL,

  attempt_count INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (
    status IN ('pending', 'delivered', 'failed', 'dead_letter')
  ),
  last_status_code INTEGER,
  last_error TEXT,
  next_retry_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS webhook_deliveries_webhook_id_idx
  ON public.webhook_deliveries(webhook_id);
-- Cron retry : `WHERE status='pending' AND next_retry_at < now()`.
CREATE INDEX IF NOT EXISTS webhook_deliveries_pending_retry_idx
  ON public.webhook_deliveries(next_retry_at)
  WHERE status = 'pending';

ALTER TABLE public.webhook_deliveries ENABLE ROW LEVEL SECURITY;

-- Lecture user via la jointure webhook_subscriptions (subselect plutôt que
-- denormalize user_id pour éviter de dupliquer).
DROP POLICY IF EXISTS "Users peuvent voir les deliveries de leurs webhooks" ON public.webhook_deliveries;
CREATE POLICY "Users peuvent voir les deliveries de leurs webhooks"
  ON public.webhook_deliveries FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.webhook_subscriptions ws
      WHERE ws.id = webhook_deliveries.webhook_id
        AND ws.user_id = auth.uid()
    )
  );


-- ============================================================================
-- 5) Index supplémentaires sur audit_log existant
-- ============================================================================
-- L'API B2B logue chaque appel (event = 'b2b.request'). Index nécessaire pour :
--   - dashboard /mon-compte/dev/[id]/audit (paginé par key_id)
--   - cron audit-log-purge (rétention 1 an)

-- Index pour requêtes "tous les events d'un user, ordonné par date".
CREATE INDEX IF NOT EXISTS audit_log_user_event_created_idx
  ON public.audit_log(user_id, event, created_at DESC);

-- Index partiel pour les events b2b.* (volume élevé attendu, isolement).
CREATE INDEX IF NOT EXISTS audit_log_b2b_events_idx
  ON public.audit_log(created_at DESC)
  WHERE event LIKE 'b2b.%';


-- ============================================================================
-- VERIFICATION
-- ============================================================================
-- Après migration, vérifier :
--   - 3 nouvelles tables : api_keys, webhook_subscriptions, webhook_deliveries
--   - users.plan accepte désormais pro_plus_monthly / pro_plus_annual
--   - 5 nouveaux index, 3 RLS, 3 policies SELECT, 2 triggers updated_at
--
-- Test minimal (à lancer dans SQL Editor Supabase) :
--   INSERT INTO public.api_keys (user_id, public_key, secret_hash, secret_prefix, label, tier, scopes)
--   VALUES (auth.uid(), 'cr_pk_live_TEST123', '$2b$12$dummyhash', 'cr_sk_live_TEST',
--           'Test', 'sandbox', '["public:read"]');
--   SELECT * FROM public.api_keys WHERE user_id = auth.uid();
--   DELETE FROM public.api_keys WHERE public_key = 'cr_pk_live_TEST123';
-- ============================================================================
