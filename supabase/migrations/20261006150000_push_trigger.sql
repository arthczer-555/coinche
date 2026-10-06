-- Coinche : envoi des notifications push, sans réglage dans le tableau de bord.
--
-- Chaque nouvelle ligne de public.notifications appelle la fonction Edge `push` (supabase/functions/push),
-- avec le même message qu'un Database Webhook. L'URL de la fonction et le secret partagé vivent dans
-- Vault (posés par supabase/setup.sh) : sans eux, rien n'est envoyé et tout le reste marche.

create extension if not exists pg_net with schema extensions;

create or replace function public.push_notification() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  push_url text;
  push_secret text;
begin
  select decrypted_secret into push_url from vault.decrypted_secrets where name = 'coinche_push_url';
  select decrypted_secret into push_secret from vault.decrypted_secrets where name = 'coinche_push_secret';
  if push_url is null or push_secret is null then
    return new;
  end if;
  -- Appel asynchrone (file de pg_net) : l'insertion n'attend pas l'envoi.
  perform net.http_post(
    url := push_url,
    body := jsonb_build_object(
      'type', 'INSERT', 'table', 'notifications', 'schema', 'public', 'record', to_jsonb(new), 'old_record', null
    ),
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-webhook-secret', push_secret)
  );
  return new;
exception when others then
  -- Un bravo, un commentaire ou un tag ne doit jamais échouer à cause du push.
  return new;
end $$;

revoke execute on function public.push_notification from anon, authenticated, public;

create trigger notifications_push
  after insert on public.notifications
  for each row execute function public.push_notification();
