-- Migration : user_progress (gamification XP / streak / badges)
-- Étude #16 ETUDE-2026-05-02 — proposition gamification pour rétention.
--
-- Contrat :
--   - 1 row par user (PK = user_id, cascade delete avec auth.users)
--   - xp : compteur cumulé (jamais décrémenté)
--   - level : dérivé de xp via lib/gamification.ts (level = floor(sqrt(xp/100)) + 1)
--   - streak_days : nb jours consécutifs avec daily_login
--   - last_seen_date : utilisé pour détecter break de streak
--   - best_streak : record personnel (jamais reset)
--   - badges : array d'IDs de badges débloqués (json string[])
--
-- RLS : chaque user ne voit / modifie que SON row. La service role bypass RLS
-- pour l'awardXp côté serveur (créations / updates depuis routes API).

create table if not exists public.user_progress (
  user_id uuid primary key references auth.users(id) on delete cascade,
  xp int not null default 0 check (xp >= 0),
  level int not null default 1 check (level >= 1),
  streak_days int not null default 0 check (streak_days >= 0),
  last_seen_date date not null default current_date,
  best_streak int not null default 0 check (best_streak >= 0),
  badges jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

-- Index implicite sur user_id (PK). Ajout d'un index sur best_streak pour
-- pouvoir requêter le leaderboard global sans full scan (V2 future).
create index if not exists idx_user_progress_best_streak
  on public.user_progress(best_streak desc);

alter table public.user_progress enable row level security;

-- Policies idempotentes : drop puis create (Supabase ne supporte pas
-- create policy if not exists en versions anciennes).
drop policy if exists "user_progress: select own" on public.user_progress;
create policy "user_progress: select own" on public.user_progress
  for select using (auth.uid() = user_id);

drop policy if exists "user_progress: insert own" on public.user_progress;
create policy "user_progress: insert own" on public.user_progress
  for insert with check (auth.uid() = user_id);

drop policy if exists "user_progress: update own" on public.user_progress;
create policy "user_progress: update own" on public.user_progress
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Trigger updated_at auto.
create or replace function public.touch_user_progress_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_user_progress_updated_at on public.user_progress;
create trigger trg_user_progress_updated_at
  before update on public.user_progress
  for each row execute function public.touch_user_progress_updated_at();
