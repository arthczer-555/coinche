-- Coinche : socle social (profils, amis, parties synchronisées, joueurs tagués, invités).
--
-- Principes :
-- - Une partie a un seul auteur (`owner_id`, celui qui compte les points). Lui seul la modifie.
-- - Les mènes sont stockées en JSON dans la partie (un seul écrivain, envoi atomique, simple hors ligne).
-- - Amis comme sur Facebook : une demande, et une fois acceptée chacun voit les parties de l'autre.
-- - Un joueur tagué confirme sa présence (`pending` -> `accepted`), sauf s'il est ami avec l'auteur.
--   Une partie acceptée apparaît sur son profil et dans ses stats.
-- - Un invité (sans compte) peut réclamer sa place via un lien : ses parties passent sur son compte.

-- ---------------------------------------------------------------------------
-- Profils
-- ---------------------------------------------------------------------------

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text not null unique check (username ~ '^[a-z0-9_.]{3,20}$'),
  display_name text not null check (char_length(display_name) between 1 and 40),
  avatar_url text,
  city text check (city is null or char_length(city) <= 40),
  bio text check (bio is null or char_length(bio) <= 160),
  -- Faux tant que le joueur n'a pas choisi son pseudo (écran d'accueil après la première connexion).
  onboarded boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Un profil est créé à l'inscription, avec un pseudo provisoire.
create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, username, display_name)
  values (
    new.id,
    'joueur' || substr(replace(new.id::text, '-', ''), 1, 8),
    left(coalesce(nullif(new.raw_user_meta_data ->> 'full_name', ''), nullif(split_part(coalesce(new.email, ''), '@', 1), ''), 'Joueur'), 40)
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Amis (lien réciproque : demande envoyée, puis acceptée par l'autre)
-- ---------------------------------------------------------------------------

create table public.friendships (
  requester_id uuid not null references public.profiles (id) on delete cascade,
  addressee_id uuid not null references public.profiles (id) on delete cascade,
  -- pending : demande en attente de réponse. accepted : amis. Refuser ou retirer un ami supprime la ligne.
  status text not null default 'pending' check (status in ('pending', 'accepted')),
  created_at timestamptz not null default now(),
  accepted_at timestamptz,
  primary key (requester_id, addressee_id),
  check (requester_id <> addressee_id)
);

-- Une seule relation par paire de joueurs, quel que soit celui qui a demandé.
create unique index friendships_pair_idx
  on public.friendships (least(requester_id, addressee_id), greatest(requester_id, addressee_id));
create index friendships_addressee_idx on public.friendships (addressee_id);

-- ---------------------------------------------------------------------------
-- Parties
-- ---------------------------------------------------------------------------

create table public.games (
  -- UUID généré sur le téléphone : la partie existe avant d'être envoyée.
  id uuid primary key,
  owner_id uuid not null references public.profiles (id) on delete cascade,
  team_a_name text not null check (char_length(team_a_name) between 1 and 60),
  team_b_name text not null check (char_length(team_b_name) between 1 and 60),
  target_score integer not null check (target_score between 1 and 100000),
  -- Tableau de mènes au format de l'app (src/features/coinche/types.ts > Round).
  rounds jsonb not null default '[]'::jsonb check (jsonb_typeof(rounds) = 'array'),
  -- Score final dénormalisé (fil, classements) : calculé par l'app à chaque envoi.
  score_a integer not null default 0,
  score_b integer not null default 0,
  winner text check (winner in ('A', 'B')),
  visibility text not null default 'friends' check (visibility in ('public', 'friends', 'private')),
  created_at timestamptz not null,
  updated_at timestamptz not null,
  finished_at timestamptz
);

create index games_owner_idx on public.games (owner_id, created_at desc);
create index games_created_idx on public.games (created_at desc);

-- Invités : joueurs sans compte, créés par l'auteur d'une partie. L'id sert de lien de réclamation.
create table public.guest_players (
  id uuid primary key,
  owner_id uuid not null references public.profiles (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 40),
  claimed_by uuid references public.profiles (id) on delete set null,
  claimed_at timestamptz,
  created_at timestamptz not null default now()
);

create index guest_players_owner_idx on public.guest_players (owner_id);

-- Places à la table : 0-1 équipe A, 2-3 équipe B. Soit un compte, soit un invité.
create table public.game_players (
  game_id uuid not null references public.games (id) on delete cascade,
  seat smallint not null check (seat between 0 and 3),
  team text not null check (team in ('A', 'B')),
  profile_id uuid references public.profiles (id) on delete cascade,
  guest_id uuid references public.guest_players (id) on delete cascade,
  -- Prénom de l'invité, dénormalisé pour que tout le monde puisse l'afficher.
  guest_name text check (guest_name is null or char_length(guest_name) between 1 and 40),
  -- Calculé par trigger : l'auteur ne peut pas confirmer à la place du joueur.
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined')),
  responded_at timestamptz,
  created_at timestamptz not null default now(),
  primary key (game_id, seat),
  check ((profile_id is null) <> (guest_id is null)),
  check (team = case when seat < 2 then 'A' else 'B' end),
  unique (game_id, profile_id),
  unique (game_id, guest_id)
);

create index game_players_profile_idx on public.game_players (profile_id, status);
create index game_players_guest_idx on public.game_players (guest_id);

-- ---------------------------------------------------------------------------
-- Fonctions d'accès (security definer : évitent la récursion entre politiques RLS)
-- ---------------------------------------------------------------------------

create function public.are_friends(a uuid, b uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.friendships f
    where f.status = 'accepted'
      and ((f.requester_id = a and f.addressee_id = b) or (f.requester_id = b and f.addressee_id = a))
  );
$$;

-- Les amis d'un joueur (fil, classement entre amis).
create function public.friends_of(p uuid) returns setof uuid
language sql stable security definer set search_path = '' as $$
  select case when f.requester_id = p then f.addressee_id else f.requester_id end
  from public.friendships f
  where f.status = 'accepted' and (f.requester_id = p or f.addressee_id = p);
$$;

create function public.is_game_owner(gid uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.games g where g.id = gid and g.owner_id = auth.uid());
$$;

create function public.is_game_player(gid uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.game_players p
    where p.game_id = gid and p.profile_id = auth.uid() and p.status <> 'declined'
  );
$$;

create function public.can_view_game(gid uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.games g
    where g.id = gid
      and (
        g.owner_id = auth.uid()
        or g.visibility = 'public'
        or (g.visibility = 'friends' and public.are_friends(auth.uid(), g.owner_id))
      )
  )
  or public.is_game_player(gid);
$$;

-- ---------------------------------------------------------------------------
-- Statut des joueurs tagués
-- ---------------------------------------------------------------------------

create function public.game_players_before_write() returns trigger
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

  -- Même joueur à la même place : l'auteur ne peut pas changer son statut.
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
  if new.profile_id = game_owner or public.are_friends(game_owner, new.profile_id) then
    new.status := 'accepted';
    new.responded_at := now();
  else
    new.status := 'pending';
    new.responded_at := null;
  end if;
  return new;
end;
$$;

create trigger game_players_before_write
  before insert or update on public.game_players
  for each row execute function public.game_players_before_write();

-- Le joueur tagué accepte (la partie va sur son profil) ou refuse (elle disparaît de chez lui).
create function public.respond_to_game(gid uuid, accept boolean) returns void
language plpgsql security definer set search_path = '' as $$
begin
  perform set_config('coinche.trusted', 'on', true);
  update public.game_players
    set status = case when accept then 'accepted' else 'declined' end,
        responded_at = now()
    where game_id = gid and profile_id = auth.uid();
  perform set_config('coinche.trusted', 'off', true);
end;
$$;

-- ---------------------------------------------------------------------------
-- Demandes d'amis
-- ---------------------------------------------------------------------------

-- Demande d'ami, ou acceptation si l'autre m'avait déjà demandé. Renvoie l'état obtenu ('pending' ou 'accepted').
-- Refuser une demande, l'annuler ou retirer un ami : suppression de la ligne (politique RLS).
create function public.add_friend(target uuid) returns text
language plpgsql security definer set search_path = '' as $$
declare
  me uuid := auth.uid();
  result text;
begin
  if me is null then
    raise exception 'Connexion requise';
  end if;
  update public.friendships
    set status = 'accepted', accepted_at = now()
    where requester_id = target and addressee_id = me and status = 'pending';
  if found then
    return 'accepted';
  end if;
  insert into public.friendships (requester_id, addressee_id) values (me, target) on conflict do nothing;
  select f.status into result from public.friendships f
    where (f.requester_id = me and f.addressee_id = target) or (f.requester_id = target and f.addressee_id = me);
  return result;
end;
$$;

-- ---------------------------------------------------------------------------
-- Invitations d'invités
-- ---------------------------------------------------------------------------

-- Aperçu d'une invitation, lisible avant même d'avoir un compte.
create function public.guest_invite(gid uuid)
returns table (guest_name text, owner_name text, owner_username text, games bigint, claimed boolean)
language sql stable security definer set search_path = '' as $$
  select g.name, o.display_name, o.username,
    (select count(*) from public.game_players p where p.guest_id = g.id),
    g.claimed_by is not null
  from public.guest_players g
  join public.profiles o on o.id = g.owner_id
  where g.id = gid;
$$;

-- Réclame la place d'un invité : ses parties passent sur mon compte, déjà acceptées.
create function public.claim_guest(gid uuid) returns integer
language plpgsql security definer set search_path = '' as $$
declare
  me uuid := auth.uid();
  guest public.guest_players;
  moved_games uuid[];
begin
  if me is null then
    raise exception 'Connexion requise';
  end if;
  select * into guest from public.guest_players where id = gid for update;
  if not found then
    raise exception 'Invitation introuvable';
  end if;
  if guest.claimed_by is not null and guest.claimed_by <> me then
    raise exception 'Invitation déjà utilisée';
  end if;
  if guest.owner_id = me then
    raise exception 'Tu ne peux pas réclamer ton propre invité';
  end if;

  update public.guest_players set claimed_by = me, claimed_at = now() where id = gid;

  -- Parties où je suis déjà assis sous mon compte : on laisse la place d'invité telle quelle.
  select coalesce(array_agg(p.game_id), '{}') into moved_games
    from public.game_players p
    where p.guest_id = gid
      and not exists (select 1 from public.game_players q where q.game_id = p.game_id and q.profile_id = me);

  perform set_config('coinche.trusted', 'on', true);
  update public.game_players
    set profile_id = me, guest_id = null, guest_name = null, status = 'accepted', responded_at = now()
    where guest_id = gid and game_id = any (moved_games);
  perform set_config('coinche.trusted', 'off', true);

  -- Le preneur des mènes suit, et la date de modif change pour que l'auteur récupère la mise à jour.
  update public.games g
    set rounds = coalesce((
          select jsonb_agg(
            case when r ->> 'takerId' = gid::text then jsonb_set(r, '{takerId}', to_jsonb(me::text)) else r end
            order by ord)
          from jsonb_array_elements(g.rounds) with ordinality as t (r, ord)
        ), '[]'::jsonb),
        updated_at = now()
    where g.id = any (moved_games);

  return cardinality(moved_games);
end;
$$;

-- ---------------------------------------------------------------------------
-- Recherche et compte
-- ---------------------------------------------------------------------------

create function public.search_profiles(q text)
returns setof public.profiles
language sql stable security definer set search_path = '' as $$
  select * from public.profiles p
  where char_length(trim(q)) >= 2
    and p.id <> coalesce(auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid)
    and (p.username ilike '%' || trim(q) || '%' or p.display_name ilike '%' || trim(q) || '%')
  order by (p.username ilike trim(q) || '%') desc, p.display_name
  limit 20;
$$;

-- Suppression du compte depuis l'app (exigence App Store 5.1.1(v)). Tout part en cascade.
create function public.delete_my_account() returns void
language plpgsql security definer set search_path = '' as $$
begin
  delete from auth.users where id = auth.uid();
end;
$$;

-- ---------------------------------------------------------------------------
-- Sécurité (RLS)
-- ---------------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.friendships enable row level security;
alter table public.games enable row level security;
alter table public.guest_players enable row level security;
alter table public.game_players enable row level security;

create policy "Profils visibles des joueurs connectés" on public.profiles
  for select to authenticated using (true);
create policy "Je modifie mon profil" on public.profiles
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

-- Les amitiés sont visibles de tous (listes d'amis), une demande seulement des deux joueurs concernés.
create policy "Amis visibles, demandes entre les intéressés" on public.friendships
  for select to authenticated using (
    status = 'accepted' or requester_id = auth.uid() or addressee_id = auth.uid()
  );
-- Les demandes passent par add_friend. Chacun peut refuser, annuler ou retirer un ami.
create policy "Je refuse, j'annule ou je retire un ami" on public.friendships
  for delete to authenticated using (requester_id = auth.uid() or addressee_id = auth.uid());

-- Colonnes de la ligne lues directement (pas can_view_game) : un upsert vérifie aussi la ligne pas encore insérée.
create policy "Parties visibles selon leur visibilité" on public.games
  for select to authenticated using (
    owner_id = auth.uid()
    or visibility = 'public'
    or (visibility = 'friends' and public.are_friends(auth.uid(), owner_id))
    or public.is_game_player(id)
  );
create policy "Je crée mes parties" on public.games
  for insert to authenticated with check (owner_id = auth.uid());
create policy "Je modifie mes parties" on public.games
  for update to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "Je supprime mes parties" on public.games
  for delete to authenticated using (owner_id = auth.uid());

create policy "Mes invités" on public.guest_players
  for select to authenticated using (owner_id = auth.uid() or claimed_by = auth.uid());
create policy "Je crée mes invités" on public.guest_players
  for insert to authenticated with check (owner_id = auth.uid() and claimed_by is null);
create policy "Je renomme mes invités" on public.guest_players
  for update to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());

create policy "Joueurs visibles avec la partie" on public.game_players
  for select to authenticated using (public.can_view_game(game_id));
create policy "L'auteur place les joueurs" on public.game_players
  for insert to authenticated with check (
    public.is_game_owner(game_id)
    and (guest_id is null or exists (select 1 from public.guest_players g where g.id = guest_id and g.owner_id = auth.uid()))
  );
create policy "L'auteur change les joueurs" on public.game_players
  for update to authenticated using (public.is_game_owner(game_id)) with check (
    public.is_game_owner(game_id)
    and (guest_id is null or exists (select 1 from public.guest_players g where g.id = guest_id and g.owner_id = auth.uid()))
  );
create policy "L'auteur retire les joueurs" on public.game_players
  for delete to authenticated using (public.is_game_owner(game_id));

-- Colonnes sensibles : seules les fonctions ci-dessus les modifient.
revoke insert, update on public.guest_players from authenticated;
grant insert (id, owner_id, name) on public.guest_players to authenticated;
grant update (name) on public.guest_players to authenticated;

revoke update on public.profiles from authenticated;
grant update (username, display_name, avatar_url, city, bio, onboarded, updated_at) on public.profiles to authenticated;

-- Rien n'est lisible sans compte, sauf l'aperçu d'une invitation.
revoke all on public.profiles, public.friendships, public.games, public.guest_players, public.game_players from anon;
revoke insert, update on public.friendships from authenticated;
revoke execute on function public.respond_to_game, public.claim_guest, public.search_profiles, public.delete_my_account,
  public.add_friend, public.are_friends, public.friends_of from anon, public;
grant execute on function public.respond_to_game, public.claim_guest, public.search_profiles, public.delete_my_account,
  public.add_friend, public.are_friends, public.friends_of to authenticated;
grant execute on function public.guest_invite to anon, authenticated;
