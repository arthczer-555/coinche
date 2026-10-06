-- Coinche, phase 4 : cote Elo et classements.
--
-- Une partie compte pour la cote quand elle est "classée" : terminée, 4 comptes à la table,
-- et les 4 ont confirmé leur présence (l'auteur d'office, les autres par confirmation ou parce qu'ils sont amis).
-- C'est l'anti-triche : on ne peut pas gonfler sa cote avec des invités ou des joueurs qui n'étaient pas là.
-- Une fois appliquée, la cote d'une partie est définitive (même si la partie est rouverte ou supprimée).

create table public.ratings (
  profile_id uuid primary key references public.profiles (id) on delete cascade,
  elo integer not null default 1000,
  games integer not null default 0,
  wins integer not null default 0,
  best_elo integer not null default 1000,
  updated_at timestamptz not null default now()
);

create index ratings_elo_idx on public.ratings (elo desc);

create table public.elo_history (
  profile_id uuid not null references public.profiles (id) on delete cascade,
  game_id uuid not null references public.games (id) on delete cascade,
  elo_before integer not null,
  elo_after integer not null,
  created_at timestamptz not null default now(),
  primary key (profile_id, game_id)
);

create index elo_history_profile_idx on public.elo_history (profile_id, created_at);

alter table public.games add column rated_at timestamptz;

-- K = 32 ; les nouveaux joueurs (moins de 10 parties classées) bougent plus vite (K = 48).
create function public.try_rate_game(gid uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare
  game public.games;
  seat record;
  team_a numeric;
  team_b numeric;
  expected_a numeric;
  score_a numeric;
  k integer;
  current_elo integer;
  delta integer;
begin
  select * into game from public.games where id = gid for update;
  if not found or game.rated_at is not null or game.finished_at is null then
    return;
  end if;
  -- 4 comptes confirmés, 2 par équipe.
  if (select count(*) from public.game_players p
      where p.game_id = gid and p.profile_id is not null and p.status = 'accepted') <> 4
    or (select count(*) from public.game_players p where p.game_id = gid) <> 4
    or (select count(*) from public.game_players p where p.game_id = gid and p.team = 'A') <> 2 then
    return;
  end if;

  insert into public.ratings (profile_id)
    select p.profile_id from public.game_players p where p.game_id = gid
    on conflict (profile_id) do nothing;

  select avg(r.elo) into team_a from public.game_players p join public.ratings r on r.profile_id = p.profile_id
    where p.game_id = gid and p.team = 'A';
  select avg(r.elo) into team_b from public.game_players p join public.ratings r on r.profile_id = p.profile_id
    where p.game_id = gid and p.team = 'B';

  expected_a := 1 / (1 + power(10::numeric, (team_b - team_a) / 400));
  score_a := case game.winner when 'A' then 1 when 'B' then 0 else 0.5 end;

  for seat in select p.profile_id, p.team from public.game_players p where p.game_id = gid loop
    select r.elo, case when r.games < 10 then 48 else 32 end into current_elo, k
      from public.ratings r where r.profile_id = seat.profile_id;
    delta := round(k * (case when seat.team = 'A' then score_a - expected_a else (1 - score_a) - (1 - expected_a) end));
    update public.ratings
      set elo = current_elo + delta,
          best_elo = greatest(best_elo, current_elo + delta),
          games = games + 1,
          wins = wins + (case when game.winner = seat.team then 1 else 0 end),
          updated_at = now()
      where profile_id = seat.profile_id;
    insert into public.elo_history (profile_id, game_id, elo_before, elo_after)
      values (seat.profile_id, gid, current_elo, current_elo + delta);
  end loop;

  update public.games set rated_at = now() where id = gid;
end;
$$;

-- Partie terminée, ou joueur qui confirme : on tente le classement (la fonction sort tout de suite si ce n'est pas prêt).
create function public.games_after_finish() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  perform public.try_rate_game(new.id);
  return new;
end;
$$;

create trigger games_after_finish
  after update of finished_at on public.games
  for each row when (old.finished_at is null and new.finished_at is not null)
  execute function public.games_after_finish();

create function public.game_players_after_write() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  perform public.try_rate_game(new.game_id);
  return new;
end;
$$;

create trigger game_players_after_write
  after insert or update on public.game_players
  for each row execute function public.game_players_after_write();

-- ---------------------------------------------------------------------------
-- Classements
-- scope : 'friends' (moi + mes amis), 'city' (ma ville), 'all'.
-- since : début de la période pour les victoires (null = depuis toujours).
-- ---------------------------------------------------------------------------

create function public.leaderboard(scope text, since timestamptz default null)
returns table (
  profile_id uuid,
  username text,
  display_name text,
  avatar_url text,
  city text,
  elo integer,
  rated_games integer,
  games bigint,
  wins bigint
)
language sql stable security definer set search_path = '' as $$
  with me as (
    select auth.uid() as id, (select p.city from public.profiles p where p.id = auth.uid()) as city
  ),
  pool as (
    select p.* from public.profiles p, me
    where case scope
        when 'friends' then p.id = me.id or public.are_friends(me.id, p.id)
        when 'city' then me.city is not null and lower(trim(p.city)) = lower(trim(me.city))
        else true
      end
      and not public.is_blocked_between(me.id, p.id)
  ),
  played as (
    select gp.profile_id, count(*) as games, count(*) filter (where g.winner = gp.team) as wins
    from public.game_players gp
    join public.games g on g.id = gp.game_id
    where gp.status = 'accepted'
      and g.finished_at is not null
      and (since is null or g.finished_at >= since)
      and gp.profile_id in (select id from pool)
    group by gp.profile_id
  )
  select pool.id, pool.username, pool.display_name, pool.avatar_url, pool.city,
    coalesce(r.elo, 1000), coalesce(r.games, 0), coalesce(played.games, 0), coalesce(played.wins, 0)
  from pool
  left join public.ratings r on r.profile_id = pool.id
  left join played on played.profile_id = pool.id
  where auth.uid() is not null and (coalesce(played.games, 0) > 0 or coalesce(r.games, 0) > 0)
  order by coalesce(r.elo, 1000) desc, coalesce(played.wins, 0) desc
  limit 200;
$$;

alter table public.ratings enable row level security;
alter table public.elo_history enable row level security;

create policy "Cotes visibles des joueurs connectés" on public.ratings
  for select to authenticated using (true);
create policy "Historique des cotes visible des joueurs connectés" on public.elo_history
  for select to authenticated using (true);

revoke insert, update, delete on public.ratings, public.elo_history from authenticated;
revoke all on public.ratings, public.elo_history from anon;
revoke execute on function public.try_rate_game from anon, authenticated, public;
revoke execute on function public.leaderboard from anon, public;
grant execute on function public.leaderboard to authenticated;
