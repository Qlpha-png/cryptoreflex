-- Migration : Reflex Cards, B4 — le social entre amis (lots 1 et 3 validés par Kev le 03/10/2026).
--
-- Lot 1 : échanges entre amis et cadeau du jour.
--   - une carte contre une carte, MÊME rareté (contrôlée par le serveur) et MÊME finition : ordinaire contre ordinaire,
--     Holo contre Holo, Argent contre Argent, Or contre Or, Onyx contre Onyx ; le numéro d'une numérotée suit la carte ;
--   - l'exemplaire de l'album (le plus beau) ne part jamais : seuls les doublons s'échangent (rc_copy_ok) ;
--   - la proposition attend l'accord de l'ami ; l'échange se fait d'UN SEUL COUP (une transaction, les deux parties
--     verrouillées dans un ordre fixe) : impossible de perdre une carte en route ; si l'un n'a plus sa carte, rien ne bouge ;
--   - 3 échanges par jour et par joueur (4 avec « Échange en plus » au Comptoir : le serveur passe le plafond) ;
--     10 propositions en attente au plus chez un même joueur ; une proposition expire après 3 jours ;
--   - un doublon ORDINAIRE offert par jour à un ami.
-- Lot 3 : pioche dans le dernier booster d'un ami (écrite par rc_apply côté serveur), parrainage, fil d'activité.
--   - parrainage : quand un joueur arrivé par le lien d'invitation d'un ami ouvre son premier booster, chacun reçoit
--     1 booster ; le parrain au plus 3 fois par 7 jours ;
--   - fil d'activité : belles cartes tirées, échanges, cadeaux, pioches, parrainages des amis (3 derniers jours) ;
--     réactions d'un geste (4 au choix), aucune discussion libre.
-- Corrige aussi rc_apply (B3) : une numérotée compte comme l'exemplaire de l'album (Colporteur et défis sur 1 ordinaire + 1 numérotée).
-- Toute fonction qui modifie la partie d'un joueur fait monter sa version : un geste calculé sur l'ancien état est refusé
-- par rc_apply (rc_conflict) et le serveur recommence sur l'état à jour.
-- AUCUN accès direct depuis le navigateur : RLS activé SANS politique, droits retirés à anon et authenticated ;
-- tout passe par /api/cartes/social (service role). Idempotent (if not exists / create or replace).
-- Annulation : supabase/rollback-20261003-reflex-cards-b4.sql (hors git).

/* ---------- tables ---------- */
create table if not exists public.rc_trades (
  id uuid primary key default gen_random_uuid(),
  a uuid not null references public.rc_players(player_id) on delete cascade,   -- qui propose
  b uuid not null references public.rc_players(player_id) on delete cascade,   -- l'ami qui accepte ou refuse
  give_id text not null,                                                        -- la carte que A donne
  get_id text not null,                                                         -- la carte que A reçoit
  fin text not null check (fin in ('ord', 'holo', 'ag', 'or', 'onyx')),
  give_serial int,
  get_serial int,
  status text not null default 'pending' check (status in ('pending', 'done', 'declined', 'cancelled', 'failed', 'expired')),
  a_day date not null,
  b_day date,
  created_at timestamptz not null default now(),
  done_at timestamptz,
  check (a <> b),
  check (give_id <> get_id),
  check ((fin in ('ord', 'holo')) = (give_serial is null and get_serial is null))
);
create index if not exists rc_trades_a on public.rc_trades (a, status);
create index if not exists rc_trades_b on public.rc_trades (b, status);

create table if not exists public.rc_events (
  id bigserial primary key,
  actor uuid not null references public.rc_players(player_id) on delete cascade,
  kind text not null check (kind in ('pull', 'trade', 'gift', 'pick', 'referral')),
  target uuid references public.rc_players(player_id) on delete cascade,
  card_id text,
  data jsonb not null default '{}'::jsonb,
  at timestamptz not null default now()
);
create index if not exists rc_events_actor on public.rc_events (actor, at desc);
create index if not exists rc_events_target on public.rc_events (target, at desc);

create table if not exists public.rc_reactions (
  event_id bigint not null references public.rc_events(id) on delete cascade,
  player_id uuid not null references public.rc_players(player_id) on delete cascade,
  emoji smallint not null check (emoji between 0 and 3),
  at timestamptz not null default now(),
  primary key (event_id, player_id)
);
create index if not exists rc_reactions_player on public.rc_reactions (player_id);

create table if not exists public.rc_referrals (
  referee uuid primary key references public.rc_players(player_id) on delete cascade,   -- le filleul
  referrer uuid not null references public.rc_players(player_id) on delete cascade,     -- le parrain
  created_at timestamptz not null default now(),
  rewarded_at timestamptz,
  referrer_paid boolean not null default false,
  check (referee <> referrer)
);
create index if not exists rc_referrals_referrer on public.rc_referrals (referrer, rewarded_at);

alter table public.rc_trades enable row level security;
alter table public.rc_events enable row level security;
alter table public.rc_reactions enable row level security;
alter table public.rc_referrals enable row level security;
revoke all on public.rc_trades, public.rc_events, public.rc_reactions, public.rc_referrals from public, anon, authenticated;
revoke all on sequence public.rc_events_id_seq from public, anon, authenticated;

/* ---------- outils internes (jamais appelables de l'extérieur) ---------- */

/* l'ami accepté derrière un code ami (null sinon) */
create or replace function public.rc_friend_of(p_me uuid, p_code text)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select p.player_id from public.rc_players p
  where p.friend_code = upper(p_code) and p.owner is not null and p.player_id <> p_me
    and exists (select 1 from public.rc_friends f
                where ((f.a = p_me and f.b = p.player_id) or (f.a = p.player_id and f.b = p_me)) and f.status = 'accepted')
$$;

/* ce joueur peut-il céder cet exemplaire ? L'album garde toujours le plus bel exemplaire (numérotée, sinon Holo, sinon
   ordinaire) : ordinaire = un ordinaire en plus ; Holo = une Holo en plus (toutes si une numérotée est là) ; numérotée = ce
   numéro, et il reste une numérotée de finition au moins égale (Onyx > Or > Argent). Même règle que lib/reflex-cards/engine.ts */
create or replace function public.rc_copy_ok(p_player uuid, p_card text, p_fin text, p_serial int)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((
    select case p_fin
      when 'ord' then (x.n - x.holo - x.num) - (case when x.num = 0 and x.holo = 0 then 1 else 0 end) >= 1
      when 'holo' then least(x.holo, x.n - x.num) - (case when x.num = 0 then 1 else 0 end) >= 1
      when 'ag' then p_serial is not null and (x.fins -> 'ag') @> to_jsonb(p_serial) and (x.top > 1 or jsonb_array_length(x.fins -> 'ag') >= 2)
      when 'or' then p_serial is not null and (x.fins -> 'or') @> to_jsonb(p_serial) and (x.top > 2 or jsonb_array_length(x.fins -> 'or') >= 2)
      when 'onyx' then p_serial is not null and (x.fins -> 'onyx') @> to_jsonb(p_serial) and jsonb_array_length(x.fins -> 'onyx') >= 2
      else false end
    from (select c.n, c.holo, c.fins,
                 jsonb_array_length(c.fins -> 'ag') + jsonb_array_length(c.fins -> 'or') + jsonb_array_length(c.fins -> 'onyx') as num,
                 case when jsonb_array_length(c.fins -> 'onyx') > 0 then 3 when jsonb_array_length(c.fins -> 'or') > 0 then 2 else 1 end as top
          from public.rc_cards c where c.player_id = p_player and c.card_id = p_card) x
  ), false)
$$;

/* compteur du jour (missions : nouvelles cartes…) */
create or replace function public.rc_day_inc(p_player uuid, p_day date, p_key text, p_n int)
returns void
language sql
security definer
set search_path = public
as $$
  insert into public.rc_days (player_id, day, ev) values (p_player, p_day, jsonb_build_object(p_key, p_n))
  on conflict (player_id, day) do update
    set ev = jsonb_set(public.rc_days.ev, array[p_key], to_jsonb(coalesce((public.rc_days.ev ->> p_key)::int, 0) + p_n));
$$;

/* déplace UN exemplaire (finition, numéro) d'une partie à l'autre et fait monter les deux versions.
   À appeler seulement après rc_copy_ok, les deux parties verrouillées. Renvoie true si la carte est nouvelle pour celui qui reçoit. */
create or replace function public.rc_move_copy(p_from uuid, p_to uuid, p_card text, p_fin text, p_serial int)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_new boolean;
  v_num boolean := p_fin in ('ag', 'or', 'onyx');
begin
  update public.rc_cards
     set n = n - 1,
         holo = holo - (case when p_fin = 'holo' then 1 else 0 end),
         fins = case when v_num
                     then jsonb_set(fins, array[p_fin], (select coalesce(jsonb_agg(v), '[]'::jsonb) from jsonb_array_elements(fins -> p_fin) v where v <> to_jsonb(p_serial)))
                     else fins end
   where player_id = p_from and card_id = p_card and n >= 2;
  if not found then
    raise exception 'rc_no_dup' using errcode = 'P0001';
  end if;
  v_new := not exists (select 1 from public.rc_cards where player_id = p_to and card_id = p_card);
  insert into public.rc_cards (player_id, card_id, n, holo, fins)
  values (p_to, p_card, 1, case when p_fin = 'holo' then 1 else 0 end,
          case when v_num then jsonb_set('{"ag":[],"or":[],"onyx":[]}'::jsonb, array[p_fin], jsonb_build_array(p_serial)) else '{"ag":[],"or":[],"onyx":[]}'::jsonb end)
  on conflict (player_id, card_id) do update
    set n = public.rc_cards.n + 1,
        holo = public.rc_cards.holo + excluded.holo,
        fins = case when v_num then jsonb_set(public.rc_cards.fins, array[p_fin], (public.rc_cards.fins -> p_fin) || to_jsonb(p_serial)) else public.rc_cards.fins end;
  update public.rc_players set version = version + 1, updated_at = now() where player_id in (p_from, p_to);
  return v_new;
end;
$$;

/* +1 booster dans la réserve, exactement comme le serveur (refill puis +1, plafond 60) ; fait monter la version */
create or replace function public.rc_plus_one(p_player uuid, p_max int, p_cycle_ms bigint)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  s int;
  v_at timestamptz;
  g bigint;
begin
  select stock, stock_at into s, v_at from public.rc_players where player_id = p_player for update;
  if not found then return; end if;
  if s >= p_max then
    v_at := now();
  else
    g := floor(extract(epoch from (now() - v_at)) * 1000 / p_cycle_ms);
    if g > 0 then
      s := least(p_max, s + g);
      v_at := case when s >= p_max then now() else v_at + (g * p_cycle_ms) * interval '1 millisecond' end;
    end if;
  end if;
  update public.rc_players set stock = least(60, s + 1), stock_at = v_at, version = version + 1, updated_at = now() where player_id = p_player;
end;
$$;

/* propositions de plus de 3 jours : expirées */
create or replace function public.rc_trades_expire(p_me uuid)
returns void
language sql
security definer
set search_path = public
as $$
  update public.rc_trades set status = 'expired', done_at = now()
   where status = 'pending' and created_at < now() - interval '3 days' and (a = p_me or b = p_me);
$$;

/* échanges comptés pour ce joueur ce jour-là : ses propositions du jour (en attente ou faites) + ce qu'il a accepté ce jour-là */
create or replace function public.rc_trades_today(p_me uuid, p_day date)
returns int
language sql
stable
security definer
set search_path = public
as $$
  select count(*)::int from public.rc_trades
   where (a = p_me and a_day = p_day and status in ('pending', 'done'))
      or (b = p_me and b_day = p_day and status = 'done')
$$;

create or replace function public.rc_event_add(p_actor uuid, p_kind text, p_target uuid, p_card text, p_data jsonb)
returns void
language sql
security definer
set search_path = public
as $$
  delete from public.rc_events where actor = p_actor and at < now() - interval '14 days';
  insert into public.rc_events (actor, kind, target, card_id, data) values (p_actor, p_kind, p_target, p_card, coalesce(p_data, '{}'::jsonb));
$$;

/* événement qui vise un ami accepté, désigné par son code (pioche dans son booster) ; rien si ce n'est pas un ami */
create or replace function public.rc_event_friend(p_actor uuid, p_kind text, p_code text, p_card text, p_data jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_t uuid;
begin
  v_t := public.rc_friend_of(p_actor, p_code);
  if v_t is not null then perform public.rc_event_add(p_actor, p_kind, v_t, p_card, p_data); end if;
end;
$$;

/* ---------- lot 1 : échanges ---------- */

/* proposer : 'sent' | 'not_friend' | 'limit_day' | 'limit_in' | 'dup' | 'no_give' | 'no_get' */
create or replace function public.rc_trade_propose(p_a uuid, p_code text, p_give text, p_get text, p_fin text, p_give_serial int, p_get_serial int, p_day date, p_max int)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_b uuid;
  n int;
begin
  v_b := public.rc_friend_of(p_a, p_code);
  if v_b is null then return 'not_friend'; end if;
  /* les deux joueurs verrouillés (ordre fixe) AVANT de compter : deux gestes simultanés ne dépassent jamais les plafonds */
  perform 1 from public.rc_players where player_id in (p_a, v_b) order by player_id for update;
  perform public.rc_trades_expire(p_a);
  perform public.rc_trades_expire(v_b);
  if public.rc_trades_today(p_a, p_day) >= p_max then return 'limit_day'; end if;
  select count(*) into n from public.rc_trades t where t.b = v_b and t.status = 'pending';
  if n >= 10 then return 'limit_in'; end if;
  if exists (select 1 from public.rc_trades t where t.a = p_a and t.b = v_b and t.status = 'pending' and t.give_id = p_give and t.get_id = p_get
             and t.fin = p_fin and t.give_serial is not distinct from p_give_serial and t.get_serial is not distinct from p_get_serial) then
    return 'dup';
  end if;
  if not public.rc_copy_ok(p_a, p_give, p_fin, p_give_serial) then return 'no_give'; end if;
  if not public.rc_copy_ok(v_b, p_get, p_fin, p_get_serial) then return 'no_get'; end if;
  insert into public.rc_trades (a, b, give_id, get_id, fin, give_serial, get_serial, a_day)
  values (p_a, v_b, p_give, p_get, p_fin, p_give_serial, p_get_serial, p_day);
  return 'sent';
end;
$$;

/* répondre (l'ami qui a reçu la proposition) : 'done' | 'declined' | 'gone' | 'limit_day' | 'no_give' | 'no_get' */
create or replace function public.rc_trade_answer(p_me uuid, p_id uuid, p_accept boolean, p_day date, p_max int)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  t public.rc_trades%rowtype;
  v_new_a boolean;
  v_new_b boolean;
begin
  select * into t from public.rc_trades where id = p_id and b = p_me for update;
  if not found or t.status <> 'pending' then return 'gone'; end if;
  if t.created_at < now() - interval '3 days' then
    update public.rc_trades set status = 'expired', done_at = now() where id = p_id;
    return 'gone';
  end if;
  if not p_accept then
    update public.rc_trades set status = 'declined', done_at = now() where id = p_id;
    return 'declined';
  end if;
  if not exists (select 1 from public.rc_friends f where ((f.a = t.a and f.b = t.b) or (f.a = t.b and f.b = t.a)) and f.status = 'accepted') then
    update public.rc_trades set status = 'failed', done_at = now() where id = p_id;
    return 'gone';
  end if;
  /* les deux parties verrouillées dans un ordre fixe (pas d'interblocage entre deux échanges croisés), PUIS le plafond du jour :
     deux acceptations simultanées ne dépassent jamais le plafond */
  perform 1 from public.rc_players where player_id in (t.a, t.b) order by player_id for update;
  if public.rc_trades_today(p_me, p_day) >= p_max then return 'limit_day'; end if;
  if not public.rc_copy_ok(t.a, t.give_id, t.fin, t.give_serial) then
    update public.rc_trades set status = 'failed', done_at = now() where id = p_id;
    return 'no_give';
  end if;
  if not public.rc_copy_ok(t.b, t.get_id, t.fin, t.get_serial) then
    update public.rc_trades set status = 'failed', done_at = now() where id = p_id;
    return 'no_get';
  end if;
  v_new_b := public.rc_move_copy(t.a, t.b, t.give_id, t.fin, t.give_serial);
  v_new_a := public.rc_move_copy(t.b, t.a, t.get_id, t.fin, t.get_serial);
  if v_new_a then perform public.rc_day_inc(t.a, p_day, 'newc', 1); end if;
  if v_new_b then perform public.rc_day_inc(t.b, p_day, 'newc', 1); end if;
  update public.rc_trades set status = 'done', done_at = now(), b_day = p_day where id = p_id;
  perform public.rc_event_add(t.b, 'trade', t.a, t.give_id, jsonb_build_object('give', t.get_id, 'get', t.give_id, 'fin', t.fin));
  return 'done';
end;
$$;

/* annuler sa proposition : 'cancelled' | 'gone' */
create or replace function public.rc_trade_cancel(p_me uuid, p_id uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.rc_trades set status = 'cancelled', done_at = now() where id = p_id and a = p_me and status = 'pending';
  return case when found then 'cancelled' else 'gone' end;
end;
$$;

/* mes échanges : en attente (reçus et envoyés), et ceux des 3 derniers jours ; le navigateur ne voit que des codes amis */
create or replace function public.rc_trade_list(p_me uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  r jsonb;
begin
  perform public.rc_trades_expire(p_me);
  select coalesce(jsonb_agg(jsonb_build_object(
           'id', t.id, 'mine', t.a = p_me, 'code', o.friend_code, 'pseudo', o.pseudo,
           'give', t.give_id, 'get', t.get_id, 'fin', t.fin, 'gs', t.give_serial, 'ts', t.get_serial,
           'status', t.status, 'at', t.created_at, 'done', t.done_at) order by t.created_at desc), '[]'::jsonb)
    into r
    from (select * from public.rc_trades
           where (a = p_me or b = p_me) and (status = 'pending' or coalesce(done_at, created_at) > now() - interval '3 days')
           order by created_at desc limit 40) t
    join public.rc_players o on o.player_id = case when t.a = p_me then t.b else t.a end;
  return r;
end;
$$;

/* les cartes d'un ami accepté qui peuvent avoir des doublons (pour choisir quoi lui demander) ; null si ce n'est pas un ami */
create or replace function public.rc_friend_dups(p_me uuid, p_code text)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select case when f.pid is null then null else coalesce((
    select jsonb_agg(jsonb_build_object('card_id', c.card_id, 'n', c.n, 'holo', c.holo, 'fins', c.fins) order by c.card_id)
    from public.rc_cards c where c.player_id = f.pid and c.n >= 2), '[]'::jsonb) end
  from (select public.rc_friend_of(p_me, p_code) as pid) f
$$;

/* offrir un doublon ORDINAIRE, un par jour : 'done' | 'not_friend' | 'already' | 'no_dup' */
create or replace function public.rc_gift(p_from uuid, p_code text, p_card text, p_day date)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_to uuid;
begin
  v_to := public.rc_friend_of(p_from, p_code);
  if v_to is null then return 'not_friend'; end if;
  perform 1 from public.rc_players where player_id in (p_from, v_to) order by player_id for update;
  if exists (select 1 from public.rc_claims where player_id = p_from and key = 'gift|' || p_day) then return 'already'; end if;
  if not public.rc_copy_ok(p_from, p_card, 'ord', null) then return 'no_dup'; end if;
  insert into public.rc_claims (player_id, key) values (p_from, 'gift|' || p_day);
  if public.rc_move_copy(p_from, v_to, p_card, 'ord', null) then perform public.rc_day_inc(v_to, p_day, 'newc', 1); end if;
  perform public.rc_event_add(p_from, 'gift', v_to, p_card, '{}'::jsonb);
  return 'done';
end;
$$;

/* ---------- lot 3 : pioche, parrainage, fil d'activité ---------- */

/* le dernier booster d'un ami accepté (null sinon) */
create or replace function public.rc_friend_draw(p_me uuid, p_code text)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object('id', d.id, 'cards', d.cards, 'at', d.at)
  from public.rc_draws d
  where d.player_id = public.rc_friend_of(p_me, p_code)
  order by d.at desc, d.id desc
  limit 1
$$;

/* le dernier booster de chacun de mes amis acceptés (de quoi choisir chez qui piocher) */
create or replace function public.rc_friend_packs(p_me uuid)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(jsonb_agg(jsonb_build_object('code', p.friend_code, 'id', d.id, 'cards', d.cards, 'at', d.at) order by d.at desc), '[]'::jsonb)
  from public.rc_friends f
  join public.rc_players p on p.player_id = case when f.a = p_me then f.b else f.a end
  cross join lateral (select x.id, x.cards, x.at from public.rc_draws x where x.player_id = p.player_id order by x.at desc, x.id desc limit 1) d
  where (f.a = p_me or f.b = p_me) and f.status = 'accepted'
$$;

/* filleul : enregistré à l'acceptation d'un lien d'invitation, s'il n'a encore ouvert aucun booster.
   'ok' | 'not_new' | 'already' */
create or replace function public.rc_referral_new(p_referee uuid, p_referrer uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_referee = p_referrer then return 'already'; end if;
  /* un filleul arrive : il n'a encore parrainé personne (sinon deux joueurs se parraineraient l'un l'autre, 4 boosters au lieu de 2) */
  if exists (select 1 from public.rc_referrals where referrer = p_referee) then return 'already'; end if;
  if not exists (select 1 from public.rc_players where player_id = p_referee and opened = 0 and owner is not null) then return 'not_new'; end if;
  insert into public.rc_referrals (referee, referrer) values (p_referee, p_referrer) on conflict (referee) do nothing;
  return case when found then 'ok' else 'already' end;
end;
$$;

/* premier booster du filleul : 1 booster chacun (le parrain au plus 3 fois par 7 jours).
   Renvoie null (rien à payer) ou { referee: true, referrer: bool } */
create or replace function public.rc_referral_reward(p_referee uuid, p_max int, p_cycle_ms bigint)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  r public.rc_referrals%rowtype;
  n int;
  v_paid boolean;
begin
  select * into r from public.rc_referrals where referee = p_referee and rewarded_at is null for update;
  if not found then return null; end if;
  if not exists (select 1 from public.rc_players where player_id = p_referee and opened >= 1) then return null; end if;
  /* parrain et filleul verrouillés AVANT de compter. Les parrainages payés sont comptés dans le registre du PARRAIN (jalons « rf| »
     dans rc_claims) : supprimer le compte d'un filleul ne remet pas le plafond à zéro */
  perform 1 from public.rc_players where player_id in (r.referee, r.referrer) order by player_id for update;
  select count(*) into n from public.rc_claims where player_id = r.referrer and key like 'rf|%' and at > now() - interval '7 days';
  v_paid := n < 3;
  perform public.rc_plus_one(r.referee, p_max, p_cycle_ms);
  if v_paid then
    perform public.rc_plus_one(r.referrer, p_max, p_cycle_ms);
    insert into public.rc_claims (player_id, key)
    values (r.referrer, 'rf|' || to_char(clock_timestamp() at time zone 'UTC', 'YYYYMMDDHH24MISSUS') || '|' || left(md5(r.referee::text), 12));
  end if;
  update public.rc_referrals set rewarded_at = now(), referrer_paid = v_paid where referee = p_referee;
  perform public.rc_event_add(r.referee, 'referral', r.referrer, null, jsonb_build_object('paid', v_paid));
  return jsonb_build_object('referee', true, 'referrer', v_paid);
end;
$$;

/* parrainages payés au parrain sur 7 jours (affichage « x / 3 cette semaine ») */
create or replace function public.rc_referral_week(p_me uuid)
returns int
language sql
stable
security definer
set search_path = public
as $$
  select count(*)::int from public.rc_claims where player_id = p_me and key like 'rf|%' and at > now() - interval '7 days'
$$;

/* fil d'activité : mes événements, ceux de mes amis acceptés et ceux qui me concernent, 3 derniers jours, 40 au plus.
   Un tiers qui n'est pas mon ami n'est jamais nommé. */
create or replace function public.rc_feed(p_me uuid)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  with fr as (
    select case when f.a = p_me then f.b else f.a end as pid
    from public.rc_friends f where (f.a = p_me or f.b = p_me) and f.status = 'accepted'
  ), ev as (
    select e.* from public.rc_events e
    where e.at > now() - interval '3 days' and (e.actor = p_me or e.target = p_me or e.actor in (select pid from fr))
    order by e.at desc, e.id desc limit 40
  )
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', ev.id, 'kind', ev.kind, 'card', ev.card_id, 'data', ev.data, 'at', ev.at,
    'me', ev.actor = p_me,
    'actor', case when ev.actor = p_me then null else pa.pseudo end,
    'code', case when ev.actor = p_me then null else pa.friend_code end,
    'target', case when ev.target is null then null when ev.target = p_me then 'me'
                   when ev.target in (select pid from fr) then pt.pseudo else '' end,
    'rx', (select jsonb_build_array(count(*) filter (where r.emoji = 0), count(*) filter (where r.emoji = 1),
                                    count(*) filter (where r.emoji = 2), count(*) filter (where r.emoji = 3))
           from public.rc_reactions r where r.event_id = ev.id),
    'mine', (select r.emoji from public.rc_reactions r where r.event_id = ev.id and r.player_id = p_me)
  ) order by ev.at desc, ev.id desc), '[]'::jsonb)
  from ev
  join public.rc_players pa on pa.player_id = ev.actor
  left join public.rc_players pt on pt.player_id = ev.target
$$;

/* réagir d'un geste (0 à 3) à un événement d'un ami ; même geste une 2e fois = retiré. 'set' | 'removed' | 'gone' */
create or replace function public.rc_react(p_me uuid, p_event bigint, p_emoji int)
returns text
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_emoji < 0 or p_emoji > 3 then return 'gone'; end if;
  if not exists (
    select 1 from public.rc_events e
    where e.id = p_event and e.actor <> p_me and e.at > now() - interval '3 days'
      and (e.target = p_me or exists (select 1 from public.rc_friends f
                                      where ((f.a = p_me and f.b = e.actor) or (f.a = e.actor and f.b = p_me)) and f.status = 'accepted'))
  ) then
    return 'gone';
  end if;
  delete from public.rc_reactions where event_id = p_event and player_id = p_me and emoji = p_emoji;
  if found then return 'removed'; end if;
  insert into public.rc_reactions (event_id, player_id, emoji) values (p_event, p_me, p_emoji)
  on conflict (event_id, player_id) do update set emoji = excluded.emoji, at = now();
  return 'set';
end;
$$;

/* ---------- rc_apply (B3) : garde des doublons alignée sur « l'album garde le plus bel exemplaire » ----------
   Avant : rc_apply gardait toujours un exemplaire NON numéroté en plus des numérotées. Une carte en 1 ordinaire + 1 Argent
   était donc proposée au Colporteur ou aux défis (tradeN = 1), puis refusée à chaque essai (« Ce doublon n'est plus disponible »).
   Tout le reste de la fonction est identique à B3. */
create or replace function public.rc_apply(p_player uuid, p_version int, p_patch jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_version int;
  pl jsonb := coalesce(p_patch -> 'player', '{}'::jsonb);
  c jsonb;
  k text;
  v_serial int;
  v_cap int;
  v_numbered jsonb := '[]'::jsonb;
  v_day date;
begin
  update public.rc_players
     set version = version + 1, updated_at = now()
   where player_id = p_player and version = p_version
  returning version into v_version;
  if not found then
    raise exception 'rc_conflict' using errcode = 'P0001';
  end if;

  update public.rc_players set
    reflets  = reflets + coalesce((pl ->> 'reflets')::int, 0),
    eclats   = eclats + coalesce((pl ->> 'eclats')::int, 0),
    opened   = opened + coalesce((pl ->> 'opened')::int, 0),
    stock    = coalesce((pl ->> 'stock')::int, stock),
    stock_at = coalesce((pl ->> 'stock_at')::timestamptz, stock_at),
    pity     = coalesce(pl -> 'pity', pity),
    theme    = case when pl ? 'theme' then pl ->> 'theme' else theme end,
    perso    = coalesce(pl -> 'perso', perso),
    recent   = coalesce(pl -> 'recent', recent),
    days     = coalesce(pl -> 'days', days),
    pseudo   = coalesce(pl ->> 'pseudo', pseudo)
  where player_id = p_player;

  for c in select * from jsonb_array_elements(coalesce(p_patch -> 'cards', '[]'::jsonb)) loop
    if (c ->> 'dn')::int > 0 then
      insert into public.rc_cards (player_id, card_id, n, holo)
      values (p_player, c ->> 'id', (c ->> 'dn')::int, coalesce((c ->> 'dholo')::int, 0))
      on conflict (player_id, card_id)
      do update set n = public.rc_cards.n + excluded.n, holo = public.rc_cards.holo + excluded.holo;
    elsif (c ->> 'dn')::int < 0 then
      /* on ne rend que des doublons : les numérotées restent toujours, et au moins un exemplaire. Une numérotée EST l'exemplaire
         de l'album (le plus beau) : ses exemplaires ordinaires peuvent tous partir (même règle que tradeN / copyOk, B4) ;
         holo ≤ exemplaires non numérotés : les exemplaires ordinaires partent d'abord, puis les Holo */
      update public.rc_cards
         set n = n + (c ->> 'dn')::int,
             holo = least(holo, n + (c ->> 'dn')::int - jsonb_array_length(fins -> 'ag') - jsonb_array_length(fins -> 'or') - jsonb_array_length(fins -> 'onyx'))
       where player_id = p_player and card_id = c ->> 'id'
         and n + (c ->> 'dn')::int >= greatest(1, jsonb_array_length(fins -> 'ag') + jsonb_array_length(fins -> 'or') + jsonb_array_length(fins -> 'onyx'));
      if not found then
        raise exception 'rc_no_dup' using errcode = 'P0001';
      end if;
    end if;
    if c ? 'fin' then
      v_cap := case c ->> 'fin' when 'ag' then 99 when 'or' then 25 when 'onyx' then 1 end;
      insert into public.rc_numbered (card_id, fin) values (c ->> 'id', c ->> 'fin') on conflict do nothing;
      update public.rc_numbered set issued = issued + 1
       where card_id = c ->> 'id' and fin = c ->> 'fin' and issued < v_cap
      returning issued into v_serial;
      if found then
        update public.rc_cards set fins = jsonb_set(fins, array[c ->> 'fin'], (fins -> (c ->> 'fin')) || to_jsonb(v_serial))
         where player_id = p_player and card_id = c ->> 'id';
        v_numbered := v_numbered || jsonb_build_object('i', c -> 'i', 'fin', c ->> 'fin', 'serial', v_serial);
      else
        /* plafond atteint : le tirage devient Holo (règle publiée) */
        update public.rc_cards set holo = holo + 1 where player_id = p_player and card_id = c ->> 'id';
        v_numbered := v_numbered || jsonb_build_object('i', c -> 'i', 'fin', 'holo', 'serial', null);
      end if;
    end if;
  end loop;

  for c in select * from jsonb_array_elements(coalesce(p_patch -> 'eds', '[]'::jsonb)) loop
    insert into public.rc_editions (player_id, ed, card_id, n)
    values (p_player, c ->> 'ed', c ->> 'id', (c ->> 'dn')::int)
    on conflict (player_id, ed, card_id) do update set n = public.rc_editions.n + excluded.n;
  end loop;

  for c in select * from jsonb_array_elements(coalesce(p_patch -> 'cos', '[]'::jsonb)) loop
    insert into public.rc_cosmetics (player_id, item_id, no) values (p_player, c ->> 'id', (c ->> 'no')::int);
  end loop;

  for k in select * from jsonb_array_elements_text(coalesce(p_patch -> 'claims', '[]'::jsonb)) loop
    insert into public.rc_claims (player_id, key) values (p_player, k);
  end loop;

  if p_patch ? 'day' then
    v_day := (p_patch -> 'day' ->> 'day')::date;
    insert into public.rc_days (player_id, day) values (p_player, v_day) on conflict do nothing;
    for k in select * from jsonb_object_keys(coalesce(p_patch -> 'day' -> 'inc', '{}'::jsonb)) loop
      update public.rc_days
         set ev = jsonb_set(ev, array[k], to_jsonb(coalesce((ev ->> k)::int, 0) + (p_patch -> 'day' -> 'inc' ->> k)::int))
       where player_id = p_player and day = v_day;
    end loop;
    if p_patch -> 'day' ? 'colp' then
      update public.rc_days set colp = p_patch -> 'day' -> 'colp' where player_id = p_player and day = v_day;
    end if;
  end if;

  if p_patch ? 'quiz' then
    insert into public.rc_quiz (player_id, card_id, ok, day)
    values (p_player, p_patch -> 'quiz' ->> 'id', (p_patch -> 'quiz' ->> 'ok')::boolean, (p_patch -> 'quiz' ->> 'day')::date)
    on conflict (player_id, card_id) do update set ok = excluded.ok, day = excluded.day
    where public.rc_quiz.ok = false;
  end if;

  if p_patch ? 'draw' then
    insert into public.rc_draws (player_id, req, kind, day, cards)
    values (p_player, (p_patch -> 'draw' ->> 'req')::uuid, p_patch -> 'draw' ->> 'kind', (p_patch -> 'draw' ->> 'day')::int, p_patch -> 'draw' -> 'cards');
  end if;

  /* holo_cap : la garde « holo ≤ exemplaires non numérotés » est appliquée (le serveur applique la même règle en mémoire) */
  return jsonb_build_object('version', v_version, 'numbered', v_numbered, 'holo_cap', true);
end;
$$;

revoke all on function public.rc_apply(uuid, int, jsonb) from public, anon, authenticated;
grant execute on function public.rc_apply(uuid, int, jsonb) to service_role;

/* ---------- droits : service_role seulement ; les outils internes ne sont appelables par personne d'autre ---------- */
revoke all on function public.rc_friend_of(uuid, text) from public, anon, authenticated, service_role;
revoke all on function public.rc_copy_ok(uuid, text, text, int) from public, anon, authenticated, service_role;
revoke all on function public.rc_day_inc(uuid, date, text, int) from public, anon, authenticated, service_role;
revoke all on function public.rc_move_copy(uuid, uuid, text, text, int) from public, anon, authenticated, service_role;
revoke all on function public.rc_plus_one(uuid, int, bigint) from public, anon, authenticated, service_role;
revoke all on function public.rc_trades_expire(uuid) from public, anon, authenticated, service_role;
revoke all on function public.rc_trades_today(uuid, date) from public, anon, authenticated;
revoke all on function public.rc_event_add(uuid, text, uuid, text, jsonb) from public, anon, authenticated;
revoke all on function public.rc_event_friend(uuid, text, text, text, jsonb) from public, anon, authenticated;
revoke all on function public.rc_trade_propose(uuid, text, text, text, text, int, int, date, int) from public, anon, authenticated;
revoke all on function public.rc_trade_answer(uuid, uuid, boolean, date, int) from public, anon, authenticated;
revoke all on function public.rc_trade_cancel(uuid, uuid) from public, anon, authenticated;
revoke all on function public.rc_trade_list(uuid) from public, anon, authenticated;
revoke all on function public.rc_friend_dups(uuid, text) from public, anon, authenticated;
revoke all on function public.rc_gift(uuid, text, text, date) from public, anon, authenticated;
revoke all on function public.rc_friend_draw(uuid, text) from public, anon, authenticated;
revoke all on function public.rc_friend_packs(uuid) from public, anon, authenticated;
revoke all on function public.rc_referral_new(uuid, uuid) from public, anon, authenticated;
revoke all on function public.rc_referral_reward(uuid, int, bigint) from public, anon, authenticated;
revoke all on function public.rc_referral_week(uuid) from public, anon, authenticated;
revoke all on function public.rc_feed(uuid) from public, anon, authenticated;
revoke all on function public.rc_react(uuid, bigint, int) from public, anon, authenticated;
grant execute on function public.rc_trades_today(uuid, date) to service_role;
grant execute on function public.rc_event_add(uuid, text, uuid, text, jsonb) to service_role;
grant execute on function public.rc_event_friend(uuid, text, text, text, jsonb) to service_role;
grant execute on function public.rc_trade_propose(uuid, text, text, text, text, int, int, date, int) to service_role;
grant execute on function public.rc_trade_answer(uuid, uuid, boolean, date, int) to service_role;
grant execute on function public.rc_trade_cancel(uuid, uuid) to service_role;
grant execute on function public.rc_trade_list(uuid) to service_role;
grant execute on function public.rc_friend_dups(uuid, text) to service_role;
grant execute on function public.rc_gift(uuid, text, text, date) to service_role;
grant execute on function public.rc_friend_draw(uuid, text) to service_role;
grant execute on function public.rc_friend_packs(uuid) to service_role;
grant execute on function public.rc_referral_new(uuid, uuid) to service_role;
grant execute on function public.rc_referral_reward(uuid, int, bigint) to service_role;
grant execute on function public.rc_referral_week(uuid) to service_role;
grant execute on function public.rc_feed(uuid) to service_role;
grant execute on function public.rc_react(uuid, bigint, int) to service_role;

-- Contrôle après application (attendu : 4 nouvelles tables, RLS actif, aucune politique) :
--   select tablename, rowsecurity from pg_tables where schemaname = 'public' and tablename in ('rc_trades','rc_events','rc_reactions','rc_referrals');
--   select count(*) from pg_policies where schemaname = 'public' and tablename like 'rc\_%';   -- 0
