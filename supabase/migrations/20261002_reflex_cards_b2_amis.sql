-- Migration : Reflex Cards, phase B2 (1re partie) — les amis (plan validé par Kev le 02/10/2026).
--
-- Contrat :
--   - chaque partie de COMPTE reçoit un code ami (8 caractères, sans 0/O/1/I), créé à la première visite de l'onglet Amis ;
--   - une demande d'ami attend l'accord de l'autre joueur ; deux demandes croisées valent acceptation ;
--   - limites : 20 demandes envoyées par 24 h, 100 amis ou demandes au total ;
--   - AUCUN accès direct depuis le navigateur : RLS activé SANS politique, droits retirés à anon et authenticated ;
--     tout passe par /api/cartes/amis (service role) ;
--   - une partie supprimée (compte effacé) emporte ses liens d'amitié (on delete cascade).
-- Idempotent (if not exists / create or replace). Annulation : supabase/rollback-20261002-reflex-cards-b2.sql (hors git).

alter table public.rc_players add column if not exists friend_code text;
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'rc_players_friend_code_key') then
    alter table public.rc_players add constraint rc_players_friend_code_key unique (friend_code);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'rc_players_friend_code_check') then
    alter table public.rc_players add constraint rc_players_friend_code_check check (friend_code ~ '^[A-HJ-NP-Z2-9]{8}$');
  end if;
end $$;

create table if not exists public.rc_friends (
  a uuid not null references public.rc_players(player_id) on delete cascade,   -- qui a demandé
  b uuid not null references public.rc_players(player_id) on delete cascade,   -- qui a reçu la demande
  status text not null default 'pending' check (status in ('pending', 'accepted')),
  created_at timestamptz not null default now(),
  accepted_at timestamptz,
  primary key (a, b),
  check (a <> b)
);
create index if not exists rc_friends_b on public.rc_friends (b);
alter table public.rc_friends enable row level security;
revoke all on public.rc_friends from public, anon, authenticated;

/* code ami : créé une fois (parties de compte seulement), puis fixe */
create or replace function public.rc_friend_code(p_player uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  c text;
  alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  i int;
begin
  select friend_code into c from public.rc_players where player_id = p_player and owner is not null;
  if c is not null then return c; end if;
  if not exists (select 1 from public.rc_players where player_id = p_player and owner is not null) then return null; end if;
  for attempt in 1..20 loop
    c := '';
    for i in 1..8 loop c := c || substr(alphabet, 1 + floor(random() * 32)::int, 1); end loop;
    begin
      update public.rc_players set friend_code = c where player_id = p_player and friend_code is null;
      select friend_code into c from public.rc_players where player_id = p_player;
      return c;
    exception when unique_violation then
      -- code déjà pris par un autre joueur : on en tire un autre
    end;
  end loop;
  raise exception 'rc_code';
end;
$$;

/* demande d'ami par code : 'sent' | 'accepted' (demande croisée) | 'pending' | 'already' | 'self' | 'unknown' | 'limit_day' | 'limit_total' */
create or replace function public.rc_friend_request(p_from uuid, p_code text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  t uuid;
  n int;
begin
  select player_id into t from public.rc_players where friend_code = upper(p_code) and owner is not null;
  if t is null then return 'unknown'; end if;
  if t = p_from then return 'self'; end if;
  if exists (select 1 from public.rc_friends where ((a = p_from and b = t) or (a = t and b = p_from)) and status = 'accepted') then return 'already'; end if;
  update public.rc_friends set status = 'accepted', accepted_at = now() where a = t and b = p_from and status = 'pending';
  if found then return 'accepted'; end if;
  if exists (select 1 from public.rc_friends where a = p_from and b = t) then return 'pending'; end if;
  select count(*) into n from public.rc_friends where a = p_from and created_at > now() - interval '1 day';
  if n >= 20 then return 'limit_day'; end if;
  select count(*) into n from public.rc_friends where a = p_from or b = p_from;
  if n >= 100 then return 'limit_total'; end if;
  insert into public.rc_friends (a, b) values (p_from, t);
  return 'sent';
end;
$$;

/* réponse à une demande reçue : 'accepted' | 'declined' | 'gone' */
create or replace function public.rc_friend_answer(p_me uuid, p_code text, p_accept boolean)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  o uuid;
begin
  select player_id into o from public.rc_players where friend_code = upper(p_code);
  if o is null then return 'gone'; end if;
  if p_accept then
    update public.rc_friends set status = 'accepted', accepted_at = now() where a = o and b = p_me and status = 'pending';
    return case when found then 'accepted' else 'gone' end;
  end if;
  delete from public.rc_friends where a = o and b = p_me and status = 'pending';
  return case when found then 'declined' else 'gone' end;
end;
$$;

/* retirer un ami, ou annuler une demande envoyée : 'removed' | 'gone' */
create or replace function public.rc_friend_remove(p_me uuid, p_code text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  o uuid;
begin
  select player_id into o from public.rc_players where friend_code = upper(p_code);
  if o is null then return 'gone'; end if;
  delete from public.rc_friends where (a = p_me and b = o) or (a = o and b = p_me);
  return case when found then 'removed' else 'gone' end;
end;
$$;

/* amis et demandes d'une partie (identifiant de partie gardé côté serveur, jamais envoyé au navigateur) */
create or replace function public.rc_friend_list(p_me uuid)
returns table (pid uuid, code text, pseudo text, status text, outgoing boolean, since timestamptz)
language sql
security definer
set search_path = public
as $$
  select p.player_id, p.friend_code, p.pseudo, f.status, (f.a = p_me), coalesce(f.accepted_at, f.created_at)
  from public.rc_friends f
  join public.rc_players p on p.player_id = case when f.a = p_me then f.b else f.a end
  where f.a = p_me or f.b = p_me
  order by coalesce(f.accepted_at, f.created_at) desc
$$;

/* cartes des AMIS ACCEPTÉS d'une partie (et d'eux seuls) : de quoi afficher leur collection */
create or replace function public.rc_friend_cards(p_me uuid)
returns table (pid uuid, card_id text)
language sql
security definer
set search_path = public
as $$
  select c.player_id, c.card_id
  from public.rc_cards c
  where c.n > 0 and c.player_id in (
    select case when f.a = p_me then f.b else f.a end from public.rc_friends f
    where (f.a = p_me or f.b = p_me) and f.status = 'accepted'
  )
$$;

revoke all on function public.rc_friend_code(uuid) from public, anon, authenticated;
revoke all on function public.rc_friend_cards(uuid) from public, anon, authenticated;
revoke all on function public.rc_friend_request(uuid, text) from public, anon, authenticated;
revoke all on function public.rc_friend_answer(uuid, text, boolean) from public, anon, authenticated;
revoke all on function public.rc_friend_remove(uuid, text) from public, anon, authenticated;
revoke all on function public.rc_friend_list(uuid) from public, anon, authenticated;
