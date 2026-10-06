-- Coinche : comptes pseudo + mot de passe, sans e-mail.
--
-- Supabase Auth exige un e-mail : l'app en invente un, interne et jamais utilisé ("<uuid>@coinche.invalid",
-- domaine réservé qui n'existe pas, voir features/auth/credentials.ts). Le joueur ne voit que son pseudo.
-- - À l'inscription, le prénom + nom et le pseudo arrivent dans les métadonnées : le profil est créé avec,
--   et l'écran d'accueil est sauté (onboarded). Pseudo invalide ou déjà pris : pseudo provisoire, comme avant.
-- - À la connexion, login_email() retrouve l'adresse interne à partir du pseudo (le pseudo peut changer,
--   l'adresse jamais). Elle ne renvoie que ces adresses internes : jamais l'e-mail d'un compte Apple.
-- - Mot de passe oublié : pas d'e-mail de récupération. Réinitialisation à la main, voir le README.

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  wanted text;
  chosen boolean;
begin
  wanted := lower(trim(coalesce(new.raw_user_meta_data ->> 'username', '')));
  chosen := wanted ~ '^[a-z0-9_.]{3,20}$' and not exists (select 1 from public.profiles where username = wanted);
  insert into public.profiles (id, username, display_name, onboarded)
  values (
    new.id,
    case when chosen then wanted else 'joueur' || substr(replace(new.id::text, '-', ''), 1, 8) end,
    left(coalesce(nullif(new.raw_user_meta_data ->> 'full_name', ''), nullif(split_part(coalesce(new.email, ''), '@', 1), ''), 'Joueur'), 40),
    chosen
  );
  return new;
end;
$$;

-- Pseudo libre ? Appelée avant l'inscription, donc sans compte.
create function public.is_username_free(name text) returns boolean
language sql stable security definer set search_path = '' as $$
  select not exists (select 1 from public.profiles where username = ltrim(lower(trim(name)), '@'));
$$;

-- Adresse interne du compte qui porte ce pseudo (null si aucun compte pseudo + mot de passe).
create function public.login_email(login text) returns text
language sql stable security definer set search_path = '' as $$
  select u.email
  from auth.users u
  join public.profiles p on p.id = u.id
  where p.username = ltrim(lower(trim(login)), '@')
    and u.email like '%@coinche.invalid';
$$;

revoke execute on function public.is_username_free, public.login_email from public;
grant execute on function public.is_username_free, public.login_email to anon, authenticated;
