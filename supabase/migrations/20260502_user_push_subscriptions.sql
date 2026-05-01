-- Migration : table des subscriptions Web Push (VAPID).
--
-- Une subscription = un couple navigateur+device pour un user donné. L'endpoint
-- est unique au monde (URL fournie par le push service Mozilla/Google), donc
-- on l'utilise comme clé d'unicité naturelle pour les upserts (cas re-subscribe
-- après changement de clé VAPID ou expiration côté navigateur).
--
-- topics (jsonb array de strings) permet à l'utilisateur de filtrer ce qu'il
-- veut recevoir : "alerts" (alertes prix), "brief" (brief quotidien), etc.
-- Par défaut on coche les 2.
--
-- last_seen_at : mis à jour à chaque envoi réussi. Utile pour pruner les subs
-- mortes (silence > N jours = candidat à GC).

create table if not exists public.user_push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  topics jsonb not null default '["alerts","brief"]'::jsonb,
  user_agent text,
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);

create index if not exists idx_user_push_subs_user on public.user_push_subscriptions(user_id);

alter table public.user_push_subscriptions enable row level security;

create policy "Users manage their own push subs" on public.user_push_subscriptions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
