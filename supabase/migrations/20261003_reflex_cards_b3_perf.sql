-- Migration : Reflex Cards, B3 — deux optimisations demandées par Kev le 03/10/2026 (audit du jour).
--
-- 1. rc_load(p_player, p_since) : toute la partie d'un joueur en UN appel et en UN instantané (une seule instruction SQL).
--    Avant : 7 requêtes PostgREST (plus de pages au-delà de 1 000 lignes), chacune avec son propre instantané.
--    Le serveur l'utilise dès qu'elle existe et revient seul à l'ancienne lecture tant qu'elle n'est pas passée.
-- 2. Garde « holo ≤ exemplaires non numérotés » dans rc_apply : quand on rend des doublons (Colporteur, défis), les
--    exemplaires ordinaires partent d'abord, puis les Holo. Avant, holo pouvait dépasser le nombre d'exemplaires restants.
--    rc_apply renvoie holo_cap = true : le serveur applique alors exactement la même règle en mémoire.
--    Les lignes déjà incohérentes sont remises d'aplomb une fois (même règle).
-- 3. Droits explicites à service_role sur les fonctions des amis (B2), comme pour B1 (audit : M13).
--
-- Idempotent (create or replace ; la normalisation ne touche que les lignes incohérentes).
-- Annulation : supabase/rollback-20261003-reflex-cards-b3.sql (hors git).

/* ---------- 1. lecture de la partie en un appel ---------- */
create or replace function public.rc_load(p_player uuid, p_since date)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select case when p.player_id is null then null else jsonb_build_object(
    'player', to_jsonb(p),
    'cards', coalesce((select jsonb_agg(jsonb_build_object('card_id', c.card_id, 'n', c.n, 'holo', c.holo, 'fins', c.fins, 'first_at', c.first_at) order by c.card_id)
                       from public.rc_cards c where c.player_id = p_player), '[]'::jsonb),
    'eds', coalesce((select jsonb_agg(jsonb_build_object('ed', e.ed, 'card_id', e.card_id, 'n', e.n, 'first_at', e.first_at) order by e.ed, e.card_id)
                     from public.rc_editions e where e.player_id = p_player), '[]'::jsonb),
    'cos', coalesce((select jsonb_agg(jsonb_build_object('item_id', x.item_id, 'no', x.no, 'at', x.at) order by x.item_id)
                     from public.rc_cosmetics x where x.player_id = p_player), '[]'::jsonb),
    'claims', coalesce((select jsonb_agg(jsonb_build_object('key', k.key) order by k.key)
                        from public.rc_claims k where k.player_id = p_player), '[]'::jsonb),
    'days', coalesce((select jsonb_agg(jsonb_build_object('day', d.day, 'ev', d.ev, 'colp', d.colp) order by d.day)
                      from public.rc_days d where d.player_id = p_player and d.day >= p_since), '[]'::jsonb),
    'quiz', coalesce((select jsonb_agg(jsonb_build_object('card_id', q.card_id, 'ok', q.ok, 'day', q.day) order by q.card_id)
                      from public.rc_quiz q where q.player_id = p_player), '[]'::jsonb)
  ) end
  from (select 1) one
  left join public.rc_players p on p.player_id = p_player
$$;

/* ---------- 2. rc_apply avec la garde holo (le reste est identique à B1) ---------- */
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
      /* on ne rend que des doublons : l'exemplaire de l'album et les numérotées restent ;
         holo ≤ exemplaires non numérotés : les exemplaires ordinaires partent d'abord, puis les Holo */
      update public.rc_cards
         set n = n + (c ->> 'dn')::int,
             holo = least(holo, n + (c ->> 'dn')::int - jsonb_array_length(fins -> 'ag') - jsonb_array_length(fins -> 'or') - jsonb_array_length(fins -> 'onyx'))
       where player_id = p_player and card_id = c ->> 'id'
         and n + (c ->> 'dn')::int >= 1 + jsonb_array_length(fins -> 'ag') + jsonb_array_length(fins -> 'or') + jsonb_array_length(fins -> 'onyx');
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

/* lignes déjà incohérentes (doublons rendus avant cette migration) : même règle, une fois */
update public.rc_cards
   set holo = greatest(0, n - jsonb_array_length(fins -> 'ag') - jsonb_array_length(fins -> 'or') - jsonb_array_length(fins -> 'onyx'))
 where holo > n - jsonb_array_length(fins -> 'ag') - jsonb_array_length(fins -> 'or') - jsonb_array_length(fins -> 'onyx');

/* ---------- 3. droits ---------- */
revoke all on function public.rc_load(uuid, date) from public, anon, authenticated;
revoke all on function public.rc_apply(uuid, int, jsonb) from public, anon, authenticated;
grant execute on function public.rc_load(uuid, date) to service_role;
grant execute on function public.rc_apply(uuid, int, jsonb) to service_role;
grant execute on function public.rc_friend_code(uuid) to service_role;
grant execute on function public.rc_friend_request(uuid, text) to service_role;
grant execute on function public.rc_friend_answer(uuid, text, boolean) to service_role;
grant execute on function public.rc_friend_remove(uuid, text) to service_role;
grant execute on function public.rc_friend_list(uuid) to service_role;
grant execute on function public.rc_friend_cards(uuid) to service_role;
