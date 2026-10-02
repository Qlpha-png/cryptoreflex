-- Migration : Reflex Cards, phase B1 — la partie de chaque joueur sur le serveur (plan validé par Kev le 02/10/2026).
--
-- Contrat :
--   - une partie par joueur : invité (jeton secret dans un cookie du navigateur, seule son empreinte SHA-256 est gardée)
--     ou compte du site (e-mail confirmé). Une partie invitée se rattache au compte quand le joueur s'inscrit ou se
--     connecte dans le même navigateur ; la partie d'un compte est effacée avec le compte (on delete cascade) ;
--   - les inscriptions publiques Supabase restent FERMÉES (audit 2026-10-01) : aucun compte « anonyme » Supabase ;
--   - AUCUN accès direct depuis le navigateur : RLS activé SANS politique, droits retirés à anon et authenticated ;
--     tout passe par les routes /api/cartes/* (service role) qui appliquent les règles du jeu
--     (lib/reflex-cards/engine.ts) puis appellent rc_apply() ;
--   - rc_apply() applique une action d'un seul coup (transaction unique) avec un numéro de version :
--     si la partie a changé entre la lecture et l'écriture (deux onglets, double clic), RIEN n'est écrit
--     (erreur rc_conflict) et le serveur recommence sur l'état à jour. Les soldes ne peuvent pas devenir négatifs,
--     une récompense ne se récupère qu'une fois (clé unique), un booster rejoué n'est compté qu'une fois.
-- Idempotent (if not exists / create or replace). Annulation : supabase/rollback-20261002-reflex-cards.sql (hors git).

create table if not exists public.rc_players (
  player_id uuid primary key default gen_random_uuid(),
  owner uuid unique references auth.users(id) on delete cascade,
  guest_hash text unique check (guest_hash ~ '^[0-9a-f]{64}$'),
  version int not null default 0,
  pseudo text not null default 'Joueur' check (char_length(pseudo) between 1 and 20),
  reflets int not null default 0 check (reflets >= 0),
  eclats int not null default 0 check (eclats >= 0),
  stock int not null default 10 check (stock between 0 and 60),
  stock_at timestamptz not null default now(),
  pity jsonb not null default '{"R":0,"SR":0,"UR":0,"opened":0,"gotSR":false,"gotUR":false}'::jsonb,
  opened int not null default 0 check (opened >= 0),
  theme text,
  first_day date not null default current_date,
  days jsonb not null default '[]'::jsonb,
  perso jsonb not null default '{}'::jsonb,
  recent jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.rc_cards (
  player_id uuid not null references public.rc_players(player_id) on delete cascade,
  card_id text not null,
  n int not null check (n >= 1),
  holo int not null default 0 check (holo >= 0),
  fins jsonb not null default '{"ag":[],"or":[],"onyx":[]}'::jsonb,
  first_at timestamptz not null default now(),
  primary key (player_id, card_id)
);

create table if not exists public.rc_editions (
  player_id uuid not null references public.rc_players(player_id) on delete cascade,
  ed text not null,
  card_id text not null,
  n int not null check (n >= 1),
  first_at timestamptz not null default now(),
  primary key (player_id, ed, card_id)
);

create table if not exists public.rc_cosmetics (
  player_id uuid not null references public.rc_players(player_id) on delete cascade,
  item_id text not null,
  no int,
  at timestamptz not null default now(),
  primary key (player_id, item_id)
);

/* récompenses et achats « une seule fois » : missions, semaine, défis, collections, services, Colporteur, fiches lues */
create table if not exists public.rc_claims (
  player_id uuid not null references public.rc_players(player_id) on delete cascade,
  key text not null,
  at timestamptz not null default now(),
  primary key (player_id, key)
);

/* compteurs de la journée (missions) et offres du Colporteur figées pour la journée */
create table if not exists public.rc_days (
  player_id uuid not null references public.rc_players(player_id) on delete cascade,
  day date not null,
  ev jsonb not null default '{}'::jsonb,
  colp jsonb,
  primary key (player_id, day)
);

create table if not exists public.rc_quiz (
  player_id uuid not null references public.rc_players(player_id) on delete cascade,
  card_id text not null,
  ok boolean not null,
  day date not null,
  primary key (player_id, card_id)
);

/* journal des boosters : preuve des tirages, idempotence (une demande = un booster), dernier booster (pioche, phase B2) */
create table if not exists public.rc_draws (
  id bigserial primary key,
  player_id uuid not null references public.rc_players(player_id) on delete cascade,
  req uuid not null,
  kind text not null,
  day int not null,
  cards jsonb not null,
  at timestamptz not null default now(),
  unique (player_id, req)
);
create index if not exists idx_rc_draws_player_at on public.rc_draws(player_id, at desc);

/* numérotées : plafond MONDIAL par carte et par finition (Argent /99, Or /25, Onyx 1/1), numéros dans l'ordre d'obtention */
create table if not exists public.rc_numbered (
  card_id text not null,
  fin text not null check (fin in ('ag', 'or', 'onyx')),
  issued int not null default 0 check (issued >= 0),
  primary key (card_id, fin)
);

/* verrouillage : aucune lecture ni écriture directe depuis le navigateur */
alter table public.rc_players enable row level security;
alter table public.rc_cards enable row level security;
alter table public.rc_editions enable row level security;
alter table public.rc_cosmetics enable row level security;
alter table public.rc_claims enable row level security;
alter table public.rc_days enable row level security;
alter table public.rc_quiz enable row level security;
alter table public.rc_draws enable row level security;
alter table public.rc_numbered enable row level security;
revoke all on public.rc_players, public.rc_cards, public.rc_editions, public.rc_cosmetics, public.rc_claims,
  public.rc_days, public.rc_quiz, public.rc_draws, public.rc_numbered from anon, authenticated;
revoke all on sequence public.rc_draws_id_seq from anon, authenticated;

/* partie invitée : créée au premier booster, retrouvée par l'empreinte du jeton du navigateur */
create or replace function public.rc_guest(p_hash text, p_day date)
returns uuid
language sql
security definer
set search_path = public
as $$
  insert into public.rc_players (guest_hash, first_day) values (p_hash, p_day)
  on conflict (guest_hash) do update set updated_at = now()
  returning player_id;
$$;

/* partie d'un compte : retrouvée, ou créée à la première visite */
create or replace function public.rc_account(p_owner uuid, p_day date)
returns uuid
language sql
security definer
set search_path = public
as $$
  insert into public.rc_players (owner, first_day) values (p_owner, p_day)
  on conflict (owner) do update set updated_at = now()
  returning player_id;
$$;

/* rattache la partie invitée au compte, si le compte n'a pas encore de partie ; le jeton invité est alors oublié.
   Renvoie la partie du compte (rattachée ou déjà existante), ou null si l'invité est introuvable. */
create or replace function public.rc_claim(p_hash text, p_owner uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v uuid;
begin
  select player_id into v from public.rc_players where owner = p_owner;
  if found then
    return v;
  end if;
  update public.rc_players set owner = p_owner, guest_hash = null, updated_at = now()
   where guest_hash = p_hash and owner is null
  returning player_id into v;
  return v;
exception when unique_violation then
  /* le compte a obtenu une partie entre-temps (autre onglet) : on garde celle-là */
  select player_id into v from public.rc_players where owner = p_owner;
  return v;
end;
$$;

/*
  rc_apply(joueur, version lue, patch) — applique une action validée par le serveur.
  patch = {
    "player":  { "reflets": +/-n, "eclats": +/-n, "opened": +n, "stock": n, "stock_at": ts, "pity": {}, "theme": txt|null,
                 "perso": {}, "recent": [], "days": [], "pseudo": txt },
    "cards":   [ { "i": index, "id": carte, "dn": +/-n, "dholo": n, "fin": "ag"|"or"|"onyx" } ],   (dn < 0 : rendre des doublons)
    "eds":     [ { "ed": édition, "id": carte, "dn": +n } ],
    "cos":     [ { "id": objet, "no": n|null } ],
    "claims":  [ clé, ... ],
    "day":     { "day": date, "inc": { compteur: +n }, "colp": {} },
    "quiz":    { "id": carte, "ok": bool, "day": date },
    "draw":    { "req": uuid, "kind": txt, "day": n, "cards": [] }
  }
  Retour : { "version": n, "numbered": [ { "i": index, "fin": "ag"|"or"|"onyx"|"holo", "serial": n|null } ] }
*/
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
      /* on ne rend que des doublons : l'exemplaire de l'album et les numérotées restent */
      update public.rc_cards
         set n = n + (c ->> 'dn')::int
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

  return jsonb_build_object('version', v_version, 'numbered', v_numbered);
end;
$$;

revoke all on function public.rc_guest(text, date) from public, anon, authenticated;
revoke all on function public.rc_account(uuid, date) from public, anon, authenticated;
revoke all on function public.rc_claim(text, uuid) from public, anon, authenticated;
revoke all on function public.rc_apply(uuid, int, jsonb) from public, anon, authenticated;
grant execute on function public.rc_guest(text, date) to service_role;
grant execute on function public.rc_account(uuid, date) to service_role;
grant execute on function public.rc_claim(text, uuid) to service_role;
grant execute on function public.rc_apply(uuid, int, jsonb) to service_role;

-- Contrôle après application (attendu : 9 tables rc_*, RLS actif, aucune politique) :
--   select tablename, rowsecurity from pg_tables where schemaname = 'public' and tablename like 'rc\_%';
--   select count(*) from pg_policies where schemaname = 'public' and tablename like 'rc\_%';   -- 0
