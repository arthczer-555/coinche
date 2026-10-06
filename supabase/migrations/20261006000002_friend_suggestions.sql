-- Coinche : "Tu les connais peut-être", suggestions d'amis par amis en commun.
--
-- Les amis de mes amis, sans moi, sans ceux avec qui j'ai déjà un lien (amis ou demande en cours,
-- dans un sens ou dans l'autre) et sans les joueurs bloqués (dans un sens ou dans l'autre).
-- Triés par nombre d'amis en commun. Les amitiés acceptées sont déjà lisibles de tous les comptes
-- (listes d'amis) : la fonction ne révèle rien de plus, elle évite juste un appel par ami.

create function public.friend_suggestions(lim int default 20)
returns table (
  id uuid,
  username text,
  display_name text,
  avatar_url text,
  city text,
  mutual bigint,
  mutual_names text[]
)
language sql stable security definer set search_path = '' as $$
  with via as (
    select fof.id as candidate, mine.id as friend
    from public.friends_of(auth.uid()) as mine(id)
    cross join lateral public.friends_of(mine.id) as fof(id)
  )
  select p.id, p.username, p.display_name, p.avatar_url, p.city,
    count(*) as mutual,
    -- Quelques noms pour "Ami de Léa et Paul" (le compte exact est dans mutual).
    (array_agg(f.display_name order by f.display_name))[1:3] as mutual_names
  from via
  join public.profiles p on p.id = via.candidate
  join public.profiles f on f.id = via.friend
  where via.candidate <> auth.uid()
    and not exists (
      select 1 from public.friendships l
      where (l.requester_id = auth.uid() and l.addressee_id = via.candidate)
         or (l.requester_id = via.candidate and l.addressee_id = auth.uid())
    )
    and not public.is_blocked_between(auth.uid(), via.candidate)
  group by p.id
  order by mutual desc, p.display_name
  limit least(greatest(coalesce(lim, 20), 1), 50);
$$;

revoke execute on function public.friend_suggestions from anon, public;
grant execute on function public.friend_suggestions to authenticated;
