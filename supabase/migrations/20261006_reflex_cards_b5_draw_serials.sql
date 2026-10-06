-- Migration : Reflex Cards, B5 — la pioche chez un ami montre la VRAIE finition et le VRAI numéro (06/10/2026).
--
-- Bug : planOpen (lib/reflex-cards/engine.ts) met dans patch.draw.cards les cartes du booster avec la finition PRÉVUE au tirage
-- et sans numéro. rc_apply (B4) insérait cette liste telle quelle dans rc_draws.cards, puis attribuait le numéro (rc_numbered) ou
-- changeait la carte en Holo (plafond du monde 99 / 25 / 1 atteint) sans jamais corriger rc_draws.cards. Or c'est ce journal
-- que voient les amis (rc_friend_draw, rc_friend_packs : pioche dans le dernier booster d'un ami) : le jeu affichait un numéro
-- inventé (« Argent 01/99 »), et une Argent devenue Holo restait affichée en Argent.
--
-- Après : rc_apply écrit dans rc_draws.cards, DANS LA MÊME TRANSACTION, la finition et le numéro qu'il vient d'attribuer
-- (Holo sans numéro si le plafond est atteint). Tout le reste de la fonction est identique à B4.
-- Les boosters déjà journalisés ne sont pas réécrits (le numéro d'origine ne peut pas être retrouvé sans ambiguïté) : le jeu les
-- montre sans numéro, et ils sont remplacés au prochain booster de l'ami.
-- Avant cette migration le site marche aussi (rien de nouveau n'est appelé) : la pioche montre alors la finition prévue, sans numéro.
--
-- À exécuter dans l'éditeur SQL Supabase (projet ovolnnnmsugfhsckhivh). Idempotent (create or replace).
-- Retour arrière : supabase/rollback-20261006-reflex-cards-b5.sql (hors git) = le rc_apply de B4.
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
  v_cards jsonb;
  v_i int;
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
    /* B5 : le booster journalisé (celui que voient les amis) porte la finition et le numéro attribués plus haut, pas ceux prévus
       au tirage. « i » = la place de la carte dans le booster (planOpen : patch.cards[].i = index dans draw.cards) */
    v_cards := p_patch -> 'draw' -> 'cards';
    if jsonb_typeof(v_cards) = 'array' then
      for c in select * from jsonb_array_elements(v_numbered) loop
        v_i := (c ->> 'i')::int;
        if v_i is not null and v_i >= 0 and v_i < jsonb_array_length(v_cards) and jsonb_typeof(v_cards -> v_i) = 'object' then
          v_cards := jsonb_set(v_cards, array[v_i::text], (v_cards -> v_i) || jsonb_build_object('fin', c ->> 'fin', 'serial', c -> 'serial'));
        end if;
      end loop;
    end if;
    insert into public.rc_draws (player_id, req, kind, day, cards)
    values (p_player, (p_patch -> 'draw' ->> 'req')::uuid, p_patch -> 'draw' ->> 'kind', (p_patch -> 'draw' ->> 'day')::int, v_cards);
  end if;

  /* holo_cap : la garde « holo ≤ exemplaires non numérotés » est appliquée (le serveur applique la même règle en mémoire) */
  return jsonb_build_object('version', v_version, 'numbered', v_numbered, 'holo_cap', true);
end;
$$;

revoke all on function public.rc_apply(uuid, int, jsonb) from public, anon, authenticated;
grant execute on function public.rc_apply(uuid, int, jsonb) to service_role;

-- Contrôle après application :
--   select position('v_cards' in pg_get_functiondef('public.rc_apply(uuid, int, jsonb)'::regprocedure)) > 0 as b5;   -- true
