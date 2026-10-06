-- Coinche, phase 5 : bandes (clubs de joueurs) et parties en direct.

-- ---------------------------------------------------------------------------
-- Bandes : la bande du bistrot, la famille, l'asso. On y entre avec un code ou un lien.
-- ---------------------------------------------------------------------------

create table public.groups (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) between 2 and 40 and public.is_clean(name)),
  description text check (description is null or (char_length(description) <= 160 and public.is_clean(description))),
  city text check (city is null or char_length(city) <= 40),
  -- Code d'invitation court (6 caractères, chiffres 2-9 et lettres A-F : se lit à voix haute sans confusion).
  invite_code text not null unique default upper(substr(translate(md5(gen_random_uuid()::text), '01', ''), 1, 6)),
  created_by uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now()
);

create table public.group_members (
  group_id uuid not null references public.groups (id) on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  role text not null default 'member' check (role in ('admin', 'member')),
  joined_at timestamptz not null default now(),
  primary key (group_id, profile_id)
);

create index group_members_profile_idx on public.group_members (profile_id);

alter table public.games add column group_id uuid references public.groups (id) on delete set null;
create index games_group_idx on public.games (group_id, created_at desc);

create function public.is_group_member(gid uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.group_members m where m.group_id = gid and m.profile_id = auth.uid());
$$;

create function public.is_group_admin(gid uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.group_members m where m.group_id = gid and m.profile_id = auth.uid() and m.role = 'admin'
  );
$$;

-- Le créateur devient admin.
create function public.groups_after_insert() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.group_members (group_id, profile_id, role) values (new.id, new.created_by, 'admin');
  return new;
end;
$$;

create trigger groups_after_insert
  after insert on public.groups
  for each row execute function public.groups_after_insert();

-- Aperçu d'une bande depuis son code (avant d'y entrer).
create function public.group_preview(code text)
returns table (id uuid, name text, description text, city text, members bigint, already_member boolean)
language sql stable security definer set search_path = '' as $$
  select g.id, g.name, g.description, g.city,
    (select count(*) from public.group_members m where m.group_id = g.id),
    exists (select 1 from public.group_members m where m.group_id = g.id and m.profile_id = auth.uid())
  from public.groups g
  where g.invite_code = upper(trim(code));
$$;

create function public.join_group(code text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  gid uuid;
begin
  if auth.uid() is null then
    raise exception 'Connexion requise';
  end if;
  select g.id into gid from public.groups g where g.invite_code = upper(trim(code));
  if gid is null then
    raise exception 'Code inconnu';
  end if;
  insert into public.group_members (group_id, profile_id) values (gid, auth.uid()) on conflict do nothing;
  return gid;
end;
$$;

-- Classement d'une bande : cote, parties et victoires des membres (victoires sur la période).
create function public.group_leaderboard(gid uuid, since timestamptz default null)
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
  with members as (
    select p.* from public.group_members m join public.profiles p on p.id = m.profile_id
    where m.group_id = gid and public.is_group_member(gid)
  ),
  played as (
    select gp.profile_id, count(*) as games, count(*) filter (where g.winner = gp.team) as wins
    from public.game_players gp
    join public.games g on g.id = gp.game_id
    where g.group_id = gid and gp.status = 'accepted' and g.finished_at is not null
      and (since is null or g.finished_at >= since)
    group by gp.profile_id
  )
  select members.id, members.username, members.display_name, members.avatar_url, members.city,
    coalesce(r.elo, 1000), coalesce(r.games, 0), coalesce(played.games, 0), coalesce(played.wins, 0)
  from members
  left join public.ratings r on r.profile_id = members.id
  left join played on played.profile_id = members.id
  order by coalesce(played.wins, 0) desc, coalesce(r.elo, 1000) desc;
$$;

-- Fil d'une bande.
create function public.group_feed(gid uuid, before timestamptz default null, lim integer default 20)
returns setof public.games
language sql stable security invoker set search_path = '' as $$
  select g.* from public.games g
  where g.group_id = gid
    and public.is_group_member(gid)
    and (before is null or g.created_at < before)
  order by g.created_at desc
  limit least(greatest(lim, 1), 50);
$$;

-- Les parties d'une bande sont visibles de ses membres (même en visibilité "amis").
drop policy "Parties visibles selon leur visibilité" on public.games;
create policy "Parties visibles selon leur visibilité" on public.games
  for select to authenticated using (
    owner_id = auth.uid()
    or public.is_game_player(id)
    or (
      not public.is_blocked_between(auth.uid(), owner_id)
      and (
        visibility = 'public'
        or (visibility = 'friends' and public.are_friends(auth.uid(), owner_id))
        or (visibility <> 'private' and group_id is not null and public.is_group_member(group_id))
      )
    )
  );

create or replace function public.can_view_game(gid uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.games g
    where g.id = gid
      and (
        g.owner_id = auth.uid()
        or (
          not public.is_blocked_between(auth.uid(), g.owner_id)
          and (
            g.visibility = 'public'
            or (g.visibility = 'friends' and public.are_friends(auth.uid(), g.owner_id))
            or (g.visibility <> 'private' and g.group_id is not null and public.is_group_member(g.group_id))
          )
        )
      )
  )
  or public.is_game_player(gid);
$$;

-- On ne range une partie que dans une bande dont on est membre.
create function public.games_check_group() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.group_id is not null and new.group_id is distinct from old.group_id
    and not exists (select 1 from public.group_members m where m.group_id = new.group_id and m.profile_id = new.owner_id) then
    raise exception 'Tu n''es pas membre de cette bande';
  end if;
  return new;
end;
$$;

create trigger games_check_group_insert
  before insert on public.games
  for each row execute function public.games_check_group();
create trigger games_check_group_update
  before update of group_id on public.games
  for each row execute function public.games_check_group();

alter table public.groups enable row level security;
alter table public.group_members enable row level security;

-- created_by : la bande est lisible par son créateur dès l'insertion (avant que le trigger l'inscrive).
create policy "Bandes visibles de leurs membres" on public.groups
  for select to authenticated using (created_by = auth.uid() or public.is_group_member(id));
create policy "Je crée une bande" on public.groups
  for insert to authenticated with check (created_by = auth.uid());
create policy "Les admins modifient la bande" on public.groups
  for update to authenticated using (public.is_group_admin(id)) with check (public.is_group_admin(id));
create policy "Les admins suppriment la bande" on public.groups
  for delete to authenticated using (public.is_group_admin(id));

create policy "Membres visibles des membres" on public.group_members
  for select to authenticated using (public.is_group_member(group_id));
create policy "Je quitte une bande, un admin retire un membre" on public.group_members
  for delete to authenticated using (profile_id = auth.uid() or public.is_group_admin(group_id));

revoke insert, update on public.groups from authenticated;
grant insert (name, description, city, created_by) on public.groups to authenticated;
grant update (name, description, city) on public.groups to authenticated;
revoke insert, update on public.group_members from authenticated;
revoke all on public.groups, public.group_members from anon;
revoke execute on function public.join_group, public.group_leaderboard, public.group_feed, public.group_preview from anon, public;
grant execute on function public.join_group, public.group_leaderboard, public.group_feed, public.group_preview to authenticated;

-- ---------------------------------------------------------------------------
-- Parties en direct : les modifications de parties sont diffusées (Supabase Realtime, filtré par RLS).
-- ---------------------------------------------------------------------------

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.games;
  end if;
end;
$$;
