-- Migration : verrouillage des écritures directes côté client (audit sécurité 2026-10-01)
--
-- Constat : les policies RLS « insert/update own » permettaient à tout
-- utilisateur connecté d'écrire SA ligne directement via la clé anon publique :
--   - user_progress : s'attribuer n'importe quel XP / niveau / badges ;
--   - users         : modifier plan, plan_expires_at, stripe_customer_id, email ;
--   - user_exchange_connections : écrire des champs « chiffrés » arbitraires.
--
-- Aucune écriture légitime ne passe par le client : toutes les routes API
-- écrivent avec la service role (qui ignore RLS). On supprime donc ces
-- policies. Les policies SELECT (lecture de sa propre ligne) sont conservées.
-- Idempotent (drop if exists).

drop policy if exists "user_progress: insert own" on public.user_progress;
drop policy if exists "user_progress: update own" on public.user_progress;

drop policy if exists "Users peuvent modifier leur propre profil" on public.users;

drop policy if exists "uec: insert own" on public.user_exchange_connections;
drop policy if exists "uec: update own" on public.user_exchange_connections;

-- user_push_subscriptions : la policy « for all » laissait insérer n'importe
-- quel endpoint via PostgREST (contourne le contrôle https:// de
-- /api/push/subscribe → le serveur web-push POSTait vers une URL arbitraire).
-- On ne garde que lecture + suppression de ses propres abonnements.
drop policy if exists "Users manage their own push subs" on public.user_push_subscriptions;
drop policy if exists "push subs: select own" on public.user_push_subscriptions;
create policy "push subs: select own" on public.user_push_subscriptions
  for select using (auth.uid() = user_id);
drop policy if exists "push subs: delete own" on public.user_push_subscriptions;
create policy "push subs: delete own" on public.user_push_subscriptions
  for delete using (auth.uid() = user_id);

-- Contrôle après application (attendu : uniquement SELECT, + DELETE pour
-- user_exchange_connections et user_push_subscriptions) :
--   select tablename, policyname, cmd from pg_policies where schemaname = 'public'
--   and tablename in ('users','user_progress','user_exchange_connections','user_push_subscriptions');
