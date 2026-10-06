-- Coinche : taguer n'importe quel joueur, ami ou pas, et le retrouver par son nom ou son @pseudo.
--
-- Rappel (socle) : un joueur tagué qui n'est pas ami avec l'auteur reçoit une notification 'tag'
-- et confirme sa place (pending -> accepted / declined). Un ami est accepté d'office.
--
-- Ici, la recherche :
-- - insensible à la casse et aux accents ("lea" trouve "Léa"), "@pseudo" accepté ;
-- - le pseudo exact d'abord, puis les amis, puis les débuts de mot ("mar" trouve "Léa Martin") ;
-- - un joueur bloqué (dans un sens ou dans l'autre) n'apparaît plus, on ne peut donc plus le taguer.

-- Minuscules sans accents, pour comparer des noms. Même règle que fold() côté app (features/players/search.ts).
create function public.fold(value text) returns text
language sql immutable parallel safe set search_path = '' as $$
  select translate(
    replace(replace(replace(replace(lower(value), 'œ', 'oe'), 'Œ', 'oe'), 'æ', 'ae'), 'Æ', 'ae'),
    'àáâãäåçèéêëìíîïñòóôõöùúûüýÿÀÁÂÃÄÅÇÈÉÊËÌÍÎÏÑÒÓÔÕÖÙÚÛÜÝ',
    'aaaaaaceeeeiiiinooooouuuuyyaaaaaaceeeeiiiinooooouuuuy'
  );
$$;

-- Les pseudos sont déjà en minuscules ASCII (contrainte de profiles.username) : pas besoin de les plier.
create or replace function public.search_profiles(q text)
returns setof public.profiles
language sql stable security definer set search_path = '' as $$
  with term as (select public.fold(ltrim(trim(q), '@')) as t)
  select p.* from public.profiles p, term
  where char_length(term.t) >= 2
    and p.id <> coalesce(auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid)
    and not public.is_blocked_between(auth.uid(), p.id)
    and (strpos(p.username, term.t) > 0 or strpos(public.fold(p.display_name), term.t) > 0)
  order by
    p.username = term.t desc,
    public.are_friends(auth.uid(), p.id) desc,
    (strpos(p.username, term.t) = 1 or strpos(' ' || public.fold(p.display_name), ' ' || term.t) > 0) desc,
    p.display_name
  limit 20;
$$;
