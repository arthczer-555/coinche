-- Coinche : parties classées, choisies au lancement.
--
-- Avant, toute partie éligible comptait d'office pour la cote. Maintenant, l'auteur choisit
-- "Classée" au lancement, et l'app ne le permet que si la table compte 4 comptes (2 par équipe)
-- tous amis avec lui. La base revérifie à la fin de la partie (les joueurs ont pu changer) :
-- classée, terminée, 4 comptes, personne n'a dit "Pas moi", l'auteur ami avec les autres.
-- Les parties déjà classées (rated_at) gardent leur cote.
--
-- Nouvelle formule de la cote (même chose que features/stats/elo.ts côté app) :
-- - échelle de 800 points au lieu de 400 : la coinche laisse beaucoup de place à la chance, une échelle
--   standard tassait tout le monde autour de 1000 (simulé : l'écart type des cotes double à peu près) ;
-- - K = 96 sur les 10 premières parties classées, puis 64 ;
-- - l'écart de score compte : x0,5 pour une partie serrée, jusqu'à x1,5 pour une raclée (écart >= objectif) ;
-- - plancher à 100.

alter table public.games add column ranked boolean not null default false;

create or replace function public.try_rate_game(gid uuid) returns void
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
  new_elo integer;
  multiplier numeric;
begin
  select * into game from public.games where id = gid for update;
  if not found or not game.ranked or game.rated_at is not null or game.finished_at is null then
    return;
  end if;
  -- 4 comptes présents (personne n'a dit "Pas moi"), 2 par équipe.
  if (select count(*) from public.game_players p
      where p.game_id = gid and p.profile_id is not null and p.status = 'accepted') <> 4
    or (select count(*) from public.game_players p where p.game_id = gid) <> 4
    or (select count(*) from public.game_players p where p.game_id = gid and p.team = 'A') <> 2 then
    return;
  end if;
  -- Anti-triche : l'auteur est ami avec les autres joueurs.
  if exists (
    select 1 from public.game_players p
    where p.game_id = gid and p.profile_id <> game.owner_id and not public.are_friends(game.owner_id, p.profile_id)
  ) then
    return;
  end if;

  insert into public.ratings (profile_id)
    select p.profile_id from public.game_players p where p.game_id = gid
    on conflict (profile_id) do nothing;

  select avg(r.elo) into team_a from public.game_players p join public.ratings r on r.profile_id = p.profile_id
    where p.game_id = gid and p.team = 'A';
  select avg(r.elo) into team_b from public.game_players p join public.ratings r on r.profile_id = p.profile_id
    where p.game_id = gid and p.team = 'B';

  expected_a := 1 / (1 + power(10::numeric, (team_b - team_a) / 800));
  score_a := case game.winner when 'A' then 1 when 'B' then 0 else 0.5 end;
  multiplier := 0.5 + least(abs(game.score_a - game.score_b)::numeric / greatest(game.target_score, 1), 1);

  for seat in select p.profile_id, p.team from public.game_players p where p.game_id = gid loop
    select r.elo, case when r.games < 10 then 96 else 64 end into current_elo, k
      from public.ratings r where r.profile_id = seat.profile_id;
    new_elo := greatest(100, current_elo + round(k * multiplier * (case when seat.team = 'A' then score_a - expected_a else expected_a - score_a end)));
    update public.ratings
      set elo = new_elo,
          best_elo = greatest(best_elo, new_elo),
          games = games + 1,
          wins = wins + (case when game.winner = seat.team then 1 else 0 end),
          updated_at = now()
      where profile_id = seat.profile_id;
    insert into public.elo_history (profile_id, game_id, elo_before, elo_after)
      values (seat.profile_id, gid, current_elo, new_elo);
  end loop;

  update public.games set rated_at = now() where id = gid;
end;
$$;
