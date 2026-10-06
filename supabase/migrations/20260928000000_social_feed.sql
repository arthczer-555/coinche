-- Coinche, phase 3 : fil des amis, bravos, commentaires, notifications,
-- récit de la partie (note, lieu, photo), avatars, blocage et signalement (exigence App Store 1.2).

-- ---------------------------------------------------------------------------
-- Filtre de contenu (commentaires, notes) : insultes et injures courantes.
-- Volontairement court : il bloque le pire, le signalement fait le reste.
-- ---------------------------------------------------------------------------

create function public.is_clean(content text) returns boolean
language sql immutable as $$
  select content is null or content !~* (
    '(^|[^[:alpha:]])('
    || 'connard|connasse|encul[eé]|enfoir[eé]|salope|pute|p[eé]d[eé]|tapette|n[eè]gre|bougnoule|youpin|'
    || 'nique ta|ntm|fdp|fils de pute|batard|bâtard|pd|'
    || 'fuck|motherfucker|faggot|nigger'
    || ')(e?s)?([^[:alpha:]]|$)'
  );
$$;

-- ---------------------------------------------------------------------------
-- Récit de la partie
-- ---------------------------------------------------------------------------

alter table public.games
  add column note text check (note is null or (char_length(note) <= 280 and public.is_clean(note))),
  add column location_name text check (location_name is null or (char_length(location_name) <= 60 and public.is_clean(location_name))),
  -- Chemin dans le bucket privé game-photos : "<game_id>/<fichier>".
  add column photo_path text check (photo_path is null or char_length(photo_path) <= 200);

-- ---------------------------------------------------------------------------
-- Blocage
-- ---------------------------------------------------------------------------

create table public.blocks (
  blocker_id uuid not null references public.profiles (id) on delete cascade,
  blocked_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);

create function public.is_blocked_between(a uuid, b uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.blocks
    where (blocker_id = a and blocked_id = b) or (blocker_id = b and blocked_id = a)
  );
$$;

-- Bloquer, c'est aussi ne plus être amis (et oublier une demande en cours).
create function public.blocks_after_insert() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  delete from public.friendships
    where (requester_id = new.blocker_id and addressee_id = new.blocked_id)
       or (requester_id = new.blocked_id and addressee_id = new.blocker_id);
  return new;
end;
$$;

create trigger blocks_after_insert
  after insert on public.blocks
  for each row execute function public.blocks_after_insert();

-- Les parties d'un joueur bloqué (dans un sens ou dans l'autre) disparaissent, sauf celles où je joue.
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
          )
        )
      )
  )
  or public.is_game_player(gid);
$$;

-- Pas de demande d'ami (ni d'acceptation) quand l'un a bloqué l'autre.
create function public.friendships_check_block() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if public.is_blocked_between(new.requester_id, new.addressee_id) then
    raise exception 'Impossible d''ajouter ce joueur';
  end if;
  return new;
end;
$$;

create trigger friendships_check_block
  before insert or update on public.friendships
  for each row execute function public.friendships_check_block();

-- ---------------------------------------------------------------------------
-- Bravos et commentaires
-- ---------------------------------------------------------------------------

create table public.kudos (
  game_id uuid not null references public.games (id) on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (game_id, profile_id)
);

create index kudos_profile_idx on public.kudos (profile_id);

create table public.comments (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references public.games (id) on delete cascade,
  author_id uuid not null references public.profiles (id) on delete cascade,
  body text not null check (char_length(trim(body)) between 1 and 500 and public.is_clean(body)),
  created_at timestamptz not null default now()
);

create index comments_game_idx on public.comments (game_id, created_at);

-- ---------------------------------------------------------------------------
-- Signalements (lus par l'équipe dans le dashboard, jamais par les joueurs)
-- ---------------------------------------------------------------------------

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  target_type text not null check (target_type in ('profile', 'game', 'comment')),
  target_id uuid not null,
  reason text check (reason is null or char_length(reason) <= 500),
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

-- ---------------------------------------------------------------------------
-- Notifications (écran dans l'app + push via la fonction Edge `push`)
-- ---------------------------------------------------------------------------

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references public.profiles (id) on delete cascade,
  actor_id uuid references public.profiles (id) on delete cascade,
  type text not null check (type in ('tag', 'tag_accepted', 'kudos', 'comment', 'friend_request', 'friend_accepted')),
  game_id uuid references public.games (id) on delete cascade,
  comment_id uuid references public.comments (id) on delete cascade,
  created_at timestamptz not null default now(),
  read_at timestamptz
);

create index notifications_recipient_idx on public.notifications (recipient_id, created_at desc);

create table public.push_tokens (
  token text primary key,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  platform text not null check (platform in ('ios', 'android')),
  updated_at timestamptz not null default now()
);

create index push_tokens_profile_idx on public.push_tokens (profile_id);

create function public.notify(recipient uuid, actor uuid, kind text, gid uuid default null, cid uuid default null)
returns void
language plpgsql security definer set search_path = '' as $$
begin
  if recipient is null or recipient = actor or public.is_blocked_between(recipient, actor) then
    return;
  end if;
  insert into public.notifications (recipient_id, actor_id, type, game_id, comment_id)
  values (recipient, actor, kind, gid, cid);
end;
$$;

-- Tag : le joueur ajouté à une partie est prévenu (une fois par partie).
create function public.game_players_notify() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  game_owner uuid;
begin
  select owner_id into game_owner from public.games where id = new.game_id;
  if tg_op = 'INSERT' then
    if new.profile_id is not null and new.profile_id <> game_owner and not exists (
      select 1 from public.notifications n
      where n.recipient_id = new.profile_id and n.game_id = new.game_id and n.type = 'tag'
    ) then
      perform public.notify(new.profile_id, game_owner, 'tag', new.game_id);
    end if;
  elsif new.status = 'accepted' and old.status is distinct from 'accepted'
    and new.profile_id is not null and new.profile_id = old.profile_id then
    perform public.notify(game_owner, new.profile_id, 'tag_accepted', new.game_id);
  end if;
  return new;
end;
$$;

create trigger game_players_notify
  after insert or update on public.game_players
  for each row execute function public.game_players_notify();

-- Bravo : l'auteur de la partie est prévenu (pas de doublon si on retire puis remet son bravo).
create function public.kudos_notify() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  game_owner uuid;
begin
  select owner_id into game_owner from public.games where id = new.game_id;
  if not exists (
    select 1 from public.notifications n
    where n.recipient_id = game_owner and n.actor_id = new.profile_id and n.game_id = new.game_id and n.type = 'kudos'
  ) then
    perform public.notify(game_owner, new.profile_id, 'kudos', new.game_id);
  end if;
  return new;
end;
$$;

create trigger kudos_notify
  after insert on public.kudos
  for each row execute function public.kudos_notify();

-- Commentaire : l'auteur de la partie et les joueurs (confirmés) sont prévenus.
create function public.comments_notify() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  recipient uuid;
begin
  for recipient in
    select owner_id from public.games where id = new.game_id
    union
    select profile_id from public.game_players where game_id = new.game_id and status = 'accepted' and profile_id is not null
  loop
    perform public.notify(recipient, new.author_id, 'comment', new.game_id, new.id);
  end loop;
  return new;
end;
$$;

create trigger comments_notify
  after insert on public.comments
  for each row execute function public.comments_notify();

-- Demande d'ami : le destinataire est prévenu (une fois tant qu'il n'a pas lu). Acceptée : le demandeur l'est.
create function public.friendships_notify() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' and new.status = 'pending' then
    if not exists (
      select 1 from public.notifications n
      where n.recipient_id = new.addressee_id and n.actor_id = new.requester_id
        and n.type = 'friend_request' and n.read_at is null
    ) then
      perform public.notify(new.addressee_id, new.requester_id, 'friend_request');
    end if;
  elsif tg_op = 'UPDATE' and new.status = 'accepted' and old.status = 'pending' then
    perform public.notify(new.requester_id, new.addressee_id, 'friend_accepted');
  end if;
  return new;
end;
$$;

create trigger friendships_notify
  after insert or update on public.friendships
  for each row execute function public.friendships_notify();

-- ---------------------------------------------------------------------------
-- Fil : mes parties et celles de mes amis (auteur ou joueur confirmé).
-- security invoker : les règles de visibilité (RLS) s'appliquent.
-- ---------------------------------------------------------------------------

create function public.feed(before timestamptz default null, lim integer default 20)
returns setof public.games
language sql stable security invoker set search_path = '' as $$
  with circle as (
    select auth.uid() as id
    union
    select public.friends_of(auth.uid())
  )
  select g.* from public.games g
  where (before is null or g.created_at < before)
    and (
      g.owner_id in (select id from circle)
      or exists (
        select 1 from public.game_players p
        where p.game_id = g.id and p.status = 'accepted' and p.profile_id in (select id from circle)
      )
    )
    and not public.is_blocked_between(auth.uid(), g.owner_id)
  order by g.created_at desc
  limit least(greatest(lim, 1), 50);
$$;

-- ---------------------------------------------------------------------------
-- Sécurité (RLS)
-- ---------------------------------------------------------------------------

alter table public.blocks enable row level security;
alter table public.kudos enable row level security;
alter table public.comments enable row level security;
alter table public.reports enable row level security;
alter table public.notifications enable row level security;
alter table public.push_tokens enable row level security;

create policy "Mes blocages" on public.blocks
  for select to authenticated using (blocker_id = auth.uid());
create policy "Je bloque" on public.blocks
  for insert to authenticated with check (blocker_id = auth.uid());
create policy "Je débloque" on public.blocks
  for delete to authenticated using (blocker_id = auth.uid());

create policy "Bravos visibles avec la partie" on public.kudos
  for select to authenticated using (public.can_view_game(game_id));
create policy "Je donne un bravo" on public.kudos
  for insert to authenticated with check (profile_id = auth.uid() and public.can_view_game(game_id));
create policy "Je retire mon bravo" on public.kudos
  for delete to authenticated using (profile_id = auth.uid());

create policy "Commentaires visibles avec la partie" on public.comments
  for select to authenticated using (
    public.can_view_game(game_id) and not public.is_blocked_between(auth.uid(), author_id)
  );
create policy "Je commente" on public.comments
  for insert to authenticated with check (author_id = auth.uid() and public.can_view_game(game_id));
create policy "Je supprime mon commentaire, l'auteur de la partie aussi" on public.comments
  for delete to authenticated using (author_id = auth.uid() or public.is_game_owner(game_id));

create policy "Je signale" on public.reports
  for insert to authenticated with check (reporter_id = auth.uid());

create policy "Mes notifications" on public.notifications
  for select to authenticated using (recipient_id = auth.uid());
create policy "Je lis mes notifications" on public.notifications
  for update to authenticated using (recipient_id = auth.uid()) with check (recipient_id = auth.uid());

create policy "Mes jetons push" on public.push_tokens
  for all to authenticated using (profile_id = auth.uid()) with check (profile_id = auth.uid());

-- Colonnes modifiables.
revoke insert, update on public.comments from authenticated;
grant insert (game_id, author_id, body) on public.comments to authenticated;
revoke insert, update, delete on public.notifications from authenticated;
grant update (read_at) on public.notifications to authenticated;
revoke all on public.reports from authenticated;
grant insert (target_type, target_id, reason) on public.reports to authenticated;

revoke all on public.blocks, public.kudos, public.comments, public.reports, public.notifications, public.push_tokens from anon;
-- notify n'est appelée que par les triggers : personne ne fabrique de notification.
revoke execute on function public.notify from anon, authenticated, public;
revoke execute on function public.feed from anon, public;
grant execute on function public.feed to authenticated;

-- ---------------------------------------------------------------------------
-- Stockage : avatars (public) et photos de parties (privé, suit la visibilité de la partie)
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('avatars', 'avatars', true, 2097152, array['image/jpeg', 'image/png', 'image/webp']),
  ('game-photos', 'game-photos', false, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

create policy "Avatar : j'écris dans mon dossier" on storage.objects
  for insert to authenticated with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "Avatar : je remplace le mien" on storage.objects
  for update to authenticated using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "Avatar : je supprime le mien" on storage.objects
  for delete to authenticated using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "Photo de partie : visible avec la partie" on storage.objects
  for select to authenticated using (
    bucket_id = 'game-photos' and public.can_view_game(((storage.foldername(name))[1])::uuid)
  );
create policy "Photo de partie : l'auteur l'ajoute" on storage.objects
  for insert to authenticated with check (
    bucket_id = 'game-photos' and public.is_game_owner(((storage.foldername(name))[1])::uuid)
  );
create policy "Photo de partie : l'auteur la remplace" on storage.objects
  for update to authenticated using (
    bucket_id = 'game-photos' and public.is_game_owner(((storage.foldername(name))[1])::uuid)
  );
create policy "Photo de partie : l'auteur la supprime" on storage.objects
  for delete to authenticated using (
    bucket_id = 'game-photos' and public.is_game_owner(((storage.foldername(name))[1])::uuid)
  );
