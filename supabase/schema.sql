-- ============================================================================
-- Cryptoreflex Pro — Schema Supabase
-- ============================================================================
-- À exécuter UNE FOIS dans le SQL Editor de Supabase Dashboard après création
-- du projet. Ce schema crée :
--   - users : profils étendus (lié à auth.users via FK)
--   - stripe_webhook_events : idempotency Stripe webhook
--   - audit_log : trace immuable des actions sensibles (sécurité P1)
--
-- RLS (Row Level Security) :
--   - users : chaque user voit uniquement sa propre ligne (auth.uid() = id)
--   - stripe_webhook_events : aucun accès user (admin only via service_role)
--   - audit_log : INSERT only, jamais UPDATE/DELETE (immuable)
--
-- Référence : architecture conçue par agent expert SaaS, validée 27/04/2026.
-- ============================================================================


-- ============================================================================
-- 1. TABLE users (profils étendus)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  stripe_customer_id TEXT UNIQUE,
  plan TEXT NOT NULL DEFAULT 'free' CHECK (plan IN ('free', 'pro_monthly', 'pro_annual')),
  plan_expires_at TIMESTAMPTZ,
  unsubscribed_at TIMESTAMPTZ,  -- RGPD : désinscription newsletter (RFC 8058 List-Unsubscribe)
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index pour les lookups fréquents
CREATE INDEX IF NOT EXISTS users_stripe_customer_id_idx ON public.users(stripe_customer_id);
CREATE INDEX IF NOT EXISTS users_plan_expires_at_idx ON public.users(plan_expires_at);

-- RLS : un user ne peut voir et modifier que sa propre ligne
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users peuvent voir leur propre profil"
  ON public.users FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users peuvent modifier leur propre profil"
  ON public.users FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Trigger pour updated_at automatique
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER users_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();


-- ============================================================================
-- 2. TABLE stripe_webhook_events (idempotency)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.stripe_webhook_events (
  event_id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  received_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index pour purge automatique des vieux events (> 90 jours)
CREATE INDEX IF NOT EXISTS stripe_webhook_events_received_at_idx
  ON public.stripe_webhook_events(received_at);

-- RLS : aucun accès user, uniquement service_role peut lire/écrire
ALTER TABLE public.stripe_webhook_events ENABLE ROW LEVEL SECURITY;

-- (pas de policy = personne ne peut accéder via la clé anon, seul service_role
--  qui bypass RLS peut écrire dedans depuis le webhook)


-- ============================================================================
-- 3. TABLE audit_log (trace immuable des actions sensibles)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  event TEXT NOT NULL,
  ip INET,
  user_agent TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS audit_log_user_id_idx ON public.audit_log(user_id);
CREATE INDEX IF NOT EXISTS audit_log_created_at_idx ON public.audit_log(created_at);

-- RLS : INSERT only depuis service_role, lecture par le user concerné
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users peuvent voir leur propre historique"
  ON public.audit_log FOR SELECT
  USING (auth.uid() = user_id);

-- Pas de policy UPDATE / DELETE = audit_log immuable (sécurité)


-- ============================================================================
-- 4. FUNCTION : créer automatiquement le profil user à l'inscription
-- ============================================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, plan)
  VALUES (NEW.id, NEW.email, 'free')
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger : à chaque nouvel auth.users, on crée la ligne public.users
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();


-- ============================================================================
-- VÉRIFICATION
-- ============================================================================
-- Après exécution, vérifier dans Supabase Dashboard > Database :
--   - 3 tables créées : users, stripe_webhook_events, audit_log
--   - RLS activée sur les 3
--   - 4 policies sur users + audit_log
--   - Trigger handle_new_user attaché à auth.users
--
-- Tester :
--   1. Créer un user via Supabase Auth (ou par l'app)
--   2. Vérifier qu'une ligne apparaît dans public.users avec plan='free'
--   3. Tester un upsert via service_role :
--      UPDATE public.users SET plan='pro_monthly' WHERE email='test@example.com';
-- ============================================================================
