-- Coinche : plus de validation des parties.
--
-- Un joueur tagué, ami ou pas, voit la partie arriver directement sur son profil et dans ses stats,
-- avec une notification 'tag'. Il peut s'en retirer après coup ("Pas moi" : respond_to_game(gid, false)).
--
-- - Statut d'une place : 'accepted' d'office, 'declined' quand le joueur s'est retiré. 'pending' n'est plus produit.
-- - Un joueur bloqué (dans un sens ou dans l'autre) ne peut pas être tagué : sa place est posée en 'declined'
--   (hors de son profil, sans notification).
-- - Cote Elo : la confirmation des 4 joueurs était l'anti-triche. Sans elle, une partie n'est classée que si
--   l'auteur est ami avec tous les autres comptes de la table, sinon n'importe qui pourrait faire perdre
--   des points à un inconnu avec une fausse partie.

-- ---------------------------------------------------------------------------
-- Statut des joueurs tagués
-- ---------------------------------------------------------------------------

create or replace function public.game_players_before_write() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  game_owner uuid;
  claimed uuid;
begin
  -- Changement fait par respond_to_game ou claim_guest : le statut qu'elles posent fait foi.
  if coalesce(current_setting('coinche.trusted', true), '') = 'on' then
    return new;
  end if;

  -- Invité déjà réclamé : la place revient directement à son compte.
  if new.guest_id is not null then
    select g.claimed_by into claimed from public.guest_players g where g.id = new.guest_id;
    if claimed is not null and not exists (
      select 1 from public.game_players p
      where p.game_id = new.game_id and p.profile_id = claimed and p.seat <> new.seat
    ) then
      new.profile_id := claimed;
      new.guest_id := null;
      new.guest_name := null;
      new.status := 'accepted';
      new.responded_at := coalesce(new.responded_at, now());
      return new;
    end if;
  end if;

  -- Même joueur à la même place : l'auteur ne peut pas changer son statut (un "Pas moi" reste un "Pas moi").
  if tg_op = 'UPDATE' and new.profile_id is not distinct from old.profile_id and new.guest_id is not distinct from old.guest_id then
    new.status := old.status;
    new.responded_at := old.responded_at;
    return new;
  end if;

  if new.profile_id is null then
    -- Un invité n'a rien à confirmer.
    new.status := 'accepted';
    new.responded_at := null;
    return new;
  end if;

  select g.owner_id into game_owner from public.games g where g.id = new.game_id;
  if new.profile_id <> game_owner and public.is_blocked_between(game_owner, new.profile_id) then
    new.status := 'declined';
  else
    new.status := 'accepted';
  end if;
  new.responded_at := now();
  return new;
end;
$$;

alter table public.game_players alter column status set default 'accepted';

-- ---------------------------------------------------------------------------
-- Cote Elo : partie classée = terminée, 4 comptes, 2 par équipe, aucun "Pas moi",
-- et l'auteur ami avec tous les autres comptes de la table.
-- ---------------------------------------------------------------------------

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
  delta integer;
begin
  select * into game from public.games where id = gid for update;
  if not found or game.rated_at is not null or game.finished_at is null then
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

-- ---------------------------------------------------------------------------
-- Places encore en attente : acceptées, sans notifier les auteurs en rafale ('tag_accepted').
-- ---------------------------------------------------------------------------

alter table public.game_players disable trigger game_players_notify;
select set_config('coinche.trusted', 'on', false);
update public.game_players set status = 'accepted', responded_at = coalesce(responded_at, now()) where status = 'pending';
select set_config('coinche.trusted', 'off', false);
alter table public.game_players enable trigger game_players_notify;
