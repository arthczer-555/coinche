-- Coinche : parties "juste les points", comme la v1.0.
--
-- L'auteur compte les points sans taguer personne : il est seul à la table, la partie est privée
-- (visible de lui seul, donc seulement dans son fil), hors bande et amicale. L'app impose tout ça au
-- lancement ; la colonne garde le choix d'un téléphone à l'autre (pas de récit, de bravos ni de commentaires).
-- Les adversaires ne sont pas identifiés : la partie ne compte pas dans les classements.

alter table public.games add column simple boolean not null default false;

create or replace function public.leaderboard(scope text, since timestamptz default null)
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
      and not g.simple
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
