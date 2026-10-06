-- Coinche : accès de l'API (supabase-js) aux objets du schéma public. À appliquer AVANT tout le reste.
--
-- Depuis mai 2026, un nouveau projet Supabase n'expose plus automatiquement ses nouvelles tables à l'API
-- (https://supabase.com/changelog/45329) : sans GRANT, l'app reçoit "permission denied" partout.
-- Les migrations suivantes reposent sur l'ancien comportement (droits donnés par défaut aux rôles de l'API,
-- puis retirés finement par des revoke et des grant par colonne) : on le rétablit ici, avant de créer
-- quoi que ce soit. La sécurité reste assurée par RLS (activé sur chaque table) et par ces revoke.
--
-- Le 30 octobre 2026, Supabase appliquera le nouveau comportement aux projets existants : les tables déjà
-- créées gardent leurs droits, mais toute NOUVELLE table devra porter ses propres grant dans sa migration.

alter default privileges for role postgres in schema public
  grant select, insert, update, delete on tables to anon, authenticated, service_role;

alter default privileges for role postgres in schema public
  grant usage, select on sequences to anon, authenticated, service_role;

alter default privileges for role postgres in schema public
  grant execute on functions to anon, authenticated, service_role;
